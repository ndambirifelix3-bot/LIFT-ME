-- Lift Me — card payments with Stripe (USA). Step 2.
--
-- How it works:
--  * A passenger adds a card once (Stripe's secure form; the card number goes straight to Stripe — we
--    only keep Stripe's reference and "Visa •••• 4242"): table stripe_customers.
--  * They choose Card when booking (only where the market offers it, and only with a saved card).
--  * When the trip completes, a pending card payment is handed to the Edge Function `stripe-charge`
--    (pg_net, same secret as push notifications), which charges the saved card and records the result.
--  * If it fails, the passenger updates the card and taps "Try again" (change_payment_method -> 'card'
--    sets the payment back to pending, which charges again) or switches to cash.
--  * Paid card trips credit the driver's share in Driver money (like M-Pesa).

alter table public.payments
  add column stripe_payment_intent_id text unique,
  add column card_brand text,
  add column card_last4 text,
  add column charge_attempts integer not null default 0;

create table public.stripe_customers (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  customer_id text not null unique,
  payment_method_id text,
  card_brand text,
  card_last4 text,
  card_exp_month integer,
  card_exp_year integer,
  updated_at timestamptz not null default now()
);
alter table public.stripe_customers enable row level security;
revoke all on public.stripe_customers from anon, authenticated;
grant select on public.stripe_customers to authenticated;
grant all on public.stripe_customers to service_role;
create policy stripe_customers_own on public.stripe_customers for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
-- Written only by the stripe-card Edge Function (service role).

-- Card for the US market (cash stays available).
update public.markets set payment_methods = array['cash', 'card']::public.payment_method[] where code = 'indianapolis';

create or replace function public.request_ride(p_quote_id uuid, p_ride_type text, p_payment_method public.payment_method)
returns public.rides
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare q public.quotes; v_profile public.profiles; v_fare integer; r public.rides;
begin
  v_profile := public.assert_active_user();
  if v_profile.role <> 'passenger' then raise exception 'passengers_only' using errcode = '42501'; end if;

  select * into q from public.quotes where id = p_quote_id and passenger_id = v_profile.id for update;
  if q.id is null then raise exception 'quote_not_found'; end if;
  if q.used_at is not null then raise exception 'quote_already_used'; end if;
  if q.expires_at <= now() then raise exception 'quote_expired'; end if;

  if not exists (select 1 from public.markets where code = q.market_code and p_payment_method = any (payment_methods)) then
    raise exception 'payment_method_not_available';
  end if;

  if p_payment_method = 'card' and not exists (select 1 from public.stripe_customers where user_id = v_profile.id and payment_method_id is not null) then
    raise exception 'no_card';
  end if;

  select (o ->> 'fare')::integer into v_fare
    from jsonb_array_elements(q.options) o where o ->> 'ride_type' = p_ride_type;
  if v_fare is null then raise exception 'ride_type_not_in_quote'; end if;

  if exists (select 1 from public.rides where passenger_id = v_profile.id
             and status in ('searching', 'accepted', 'arrived', 'in_progress')) then
    raise exception 'active_ride_exists';
  end if;

  update public.quotes set used_at = now() where id = q.id;

  insert into public.rides (passenger_id, market_code, quote_id, ride_type, status, pickup, pickup_lat, pickup_lng, pickup_address, pickup_note,
                            dropoff, dropoff_lat, dropoff_lng, dropoff_address, distance_m, duration_s, polyline,
                            fare, currency, payment_method, search_expires_at)
  values (v_profile.id, q.market_code, q.id, p_ride_type, 'searching', q.pickup,
          extensions.st_y(q.pickup::extensions.geometry), extensions.st_x(q.pickup::extensions.geometry), q.pickup_address, q.pickup_note,
          q.dropoff, extensions.st_y(q.dropoff::extensions.geometry), extensions.st_x(q.dropoff::extensions.geometry), q.dropoff_address,
          q.distance_m, q.duration_s, q.polyline, v_fare, q.currency, p_payment_method,
          now() + make_interval(secs => coalesce(public.setting_int('search_timeout_seconds'), 120)))
  returning * into r;

  perform public.log_ride_event(r.id, null, 'searching', 'passenger');
  perform public.dispatch_ride(r.id);
  return r;
end $$;

create or replace function public.change_payment_method(p_ride_id uuid, p_method public.payment_method)
returns public.payments
language plpgsql security definer set search_path = public, pg_temp
as $$
declare p public.payments; r public.rides;
begin
  perform public.assert_active_user();
  select * into r from public.rides where id = p_ride_id and passenger_id = auth.uid();
  if r.id is null then raise exception 'not_your_ride' using errcode = '42501'; end if;
  if not exists (select 1 from public.markets where code = r.market_code and p_method = any (payment_methods)) then
    raise exception 'payment_method_not_available';
  end if;
  if p_method = 'card' and not exists (select 1 from public.stripe_customers where user_id = r.passenger_id and payment_method_id is not null) then
    raise exception 'no_card';
  end if;
  update public.payments set method = p_method, status = 'pending', updated_at = now()
   where ride_id = p_ride_id and status <> 'paid' returning * into p;
  if p.id is null then raise exception 'payment_not_changeable'; end if;
  update public.rides set payment_method = p_method where id = p_ride_id;
  return p;
end $$;

-- Hand pending card payments to stripe-charge.
create or replace function public.card_payment_dispatch()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare cfg public.push_config;
begin
  if new.method <> 'card' or new.status <> 'pending' then return new; end if;
  if tg_op = 'UPDATE' and old.method = 'card' and old.status = 'pending' then return new; end if;
  select * into cfg from public.push_config where id;
  if cfg.function_url is null or to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then
    return new;
  end if;
  perform net.http_post(
    url := regexp_replace(cfg.function_url, '/push-send/?$', '/stripe-charge'),
    body := jsonb_build_object('payment_id', new.id),
    params := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', cfg.trigger_secret),
    timeout_milliseconds := 15000
  );
  return new;
exception when others then
  raise warning 'card payment dispatch failed: %', sqlerrm;
  return new;
end $$;
create trigger card_payment_dispatch after insert or update of method, status on public.payments
  for each row execute function public.card_payment_dispatch();

revoke all on function public.card_payment_dispatch() from public, anon, authenticated;
