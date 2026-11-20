-- Lift Me — push notifications (web push for the installable web app).
--
-- How it works:
--  1. A phone that allows notifications saves its "push subscription" with save_push_subscription().
--  2. Triggers on rides / ride_offers / payments / drivers write a row to push_outbox
--     ("tell user X: title, body, link").
--  3. A trigger on push_outbox calls the Edge Function `push-send` (via pg_net), which encrypts and
--     delivers the message to all of that user's devices. The VAPID keys used for this are created
--     by the function itself and stored in push_config, which only the server can read.
-- Notifications are best effort: a failure here never blocks a ride, accept or payment.

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Server-only settings (one row). Never readable by the app.
create table public.push_config (
  id boolean primary key default true check (id),
  function_url text,                 -- https://<project>.supabase.co/functions/v1/push-send
  trigger_secret text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  vapid_public_key text,             -- created by push-send on first use
  vapid_private_key text,
  updated_at timestamptz not null default now()
);
insert into public.push_config (id) values (true) on conflict do nothing;

-- Every notification we tried to send (kept 14 days; useful to see what went out).
create table public.push_outbox (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  url text not null default '/',
  tag text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  devices integer,
  error text
);
create index push_outbox_user_idx on public.push_outbox (user_id, created_at desc);

alter table public.push_subscriptions enable row level security;
alter table public.push_config enable row level security;
alter table public.push_outbox enable row level security;
revoke all on public.push_subscriptions, public.push_config, public.push_outbox from anon, authenticated;
grant all on public.push_subscriptions, public.push_config, public.push_outbox to service_role;
grant select on public.push_subscriptions to authenticated;   -- own rows only (RLS)
grant select on public.push_outbox to authenticated;          -- admins only (RLS)

create policy push_subscriptions_select_own on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy push_outbox_admin_select on public.push_outbox for select to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Saving / removing this device's subscription (the endpoint moves to whoever is signed in on it).
-- ---------------------------------------------------------------------------
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.assert_active_user();
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, created_at = now();
end $$;

create or replace function public.remove_push_subscription(p_endpoint text)
returns void
language sql security definer set search_path = public, pg_temp
as $$ delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid(); $$;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
-- Same money style as the app: KES 1,050 / $12.50.
create or replace function public.format_money(p_amount integer, p_currency text, p_decimals integer)
returns text
language sql immutable set search_path = public, pg_temp
as $$
  select case
    when p_amount is null then ''
    when p_currency = 'USD' then '$' || to_char(p_amount / 100.0, 'FM999,999,990.00')
    when coalesce(p_decimals, 0) = 0 then p_currency || ' ' || to_char(p_amount, 'FM999,999,999,990')
    else p_currency || ' ' || to_char(p_amount / power(10, p_decimals), 'FM999,999,990.' || repeat('0', p_decimals))
  end;
$$;

create or replace function public.ride_money(r public.rides)
returns text
language sql stable security definer set search_path = public, pg_temp
as $$ select public.format_money(r.fare, r.currency, (select currency_decimals from public.markets where code = r.market_code)); $$;

-- Queue a notification for one user. Never raises: a notification must not break a ride.
create or replace function public.push_notify(p_user_id uuid, p_title text, p_body text, p_url text default '/', p_tag text default null)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if p_user_id is null then return; end if;
  insert into public.push_outbox (user_id, title, body, url, tag)
  values (p_user_id, left(p_title, 120), left(coalesce(p_body, ''), 300), coalesce(p_url, '/'), p_tag);
exception when others then
  raise warning 'push_notify failed: %', sqlerrm;
end $$;

-- Hand each new outbox row to the push-send function (only where pg_net exists, i.e. on Supabase).
create or replace function public.push_outbox_dispatch()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare cfg public.push_config;
begin
  select * into cfg from public.push_config where id;
  if cfg.function_url is null or to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then
    return new;
  end if;
  -- Only someone with a subscription can receive anything; skip the call otherwise.
  if not exists (select 1 from public.push_subscriptions where user_id = new.user_id) then
    update public.push_outbox set error = 'no_device' where id = new.id;
    return new;
  end if;
  perform net.http_post(
    url := cfg.function_url,
    body := jsonb_build_object('outbox_id', new.id),
    params := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', cfg.trigger_secret),
    timeout_milliseconds := 10000
  );
  return new;
exception when others then
  raise warning 'push dispatch failed: %', sqlerrm;
  return new;
end $$;

create trigger push_outbox_dispatch after insert on public.push_outbox
  for each row execute function public.push_outbox_dispatch();

-- ---------------------------------------------------------------------------
-- What triggers a notification
-- ---------------------------------------------------------------------------

-- Driver: a new ride request was offered.
create or replace function public.push_on_offer()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare r public.rides;
begin
  select * into r from public.rides where id = new.ride_id;
  perform public.push_notify(new.driver_id, 'New ride request 🚗',
    public.ride_money(r) || ' · Pickup: ' || r.pickup_address, '/driver', 'offer-' || r.id);
  return new;
end $$;
create trigger push_on_offer after insert on public.ride_offers
  for each row when (new.response = 'pending') execute function public.push_on_offer();

-- Passenger / driver: the ride moved to a new status.
create or replace function public.push_on_ride_status()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_driver text; v_car text; v_trip text := '/passenger/trip/' || new.id;
begin
  select split_part(p.full_name, ' ', 1),
         trim(concat_ws(' ', v.colour, v.make, v.model)) || coalesce(' · ' || v.plate, '')
    into v_driver, v_car
    from public.profiles p left join public.vehicles v on v.driver_id = p.id
   where p.id = new.driver_id;

  case new.status
    when 'accepted' then
      perform public.push_notify(new.passenger_id, 'Your driver is on the way',
        coalesce(v_driver, 'Your driver') || coalesce(' · ' || v_car, ''), v_trip, 'ride-' || new.id);
    when 'arrived' then
      perform public.push_notify(new.passenger_id, 'Your driver has arrived',
        'Look for ' || coalesce(v_car, 'your Lift Me car') || '.', v_trip, 'ride-' || new.id);
    when 'completed' then
      perform public.push_notify(new.passenger_id, 'You have arrived ✅',
        'Trip total ' || public.ride_money(new) || '. Tap to pay or rate your driver.', v_trip, 'ride-' || new.id);
    when 'no_driver_found' then
      perform public.push_notify(new.passenger_id, 'No driver found',
        'All drivers nearby are busy right now. Please try again in a few minutes.', '/passenger', 'ride-' || new.id);
    when 'cancelled' then
      if new.cancelled_by is distinct from 'passenger' then
        perform public.push_notify(new.passenger_id, 'Your ride was cancelled',
          case when new.cancelled_by = 'driver' then 'Your driver cancelled. Request again to find another driver.'
               else 'Lift Me cancelled this ride. Request again or contact support.' end,
          '/passenger', 'ride-' || new.id);
      end if;
      if new.driver_id is not null and new.cancelled_by is distinct from 'driver' then
        perform public.push_notify(new.driver_id, 'Ride cancelled',
          case when new.cancelled_by = 'passenger' then 'The passenger cancelled the ride.' else 'Lift Me cancelled this ride.' end,
          '/driver', 'ride-' || new.id);
      end if;
    else
      null;
  end case;
  return new;
end $$;
create trigger push_on_ride_status after update of status on public.rides
  for each row when (new.status is distinct from old.status) execute function public.push_on_ride_status();

-- Driver: an M-Pesa payment came in.
create or replace function public.push_on_payment()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare r public.rides;
begin
  select * into r from public.rides where id = new.ride_id;
  if new.method = 'mpesa' then
    perform public.push_notify(r.driver_id, 'Payment received 💰',
      public.format_money(new.amount, new.currency, (select currency_decimals from public.markets where code = r.market_code))
        || ' by M-Pesa' || coalesce(' · ' || new.mpesa_receipt, ''),
      '/driver/ride/' || r.id, 'pay-' || r.id);
  end if;
  return new;
end $$;
create trigger push_on_payment after update of status on public.payments
  for each row when (new.status = 'paid' and old.status is distinct from 'paid') execute function public.push_on_payment();

-- Driver: their application was reviewed.
create or replace function public.push_on_driver_status()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  case new.status
    when 'approved' then
      perform public.push_notify(new.id, 'You''re approved! 🎉', 'You can now go online and start earning with Lift Me.', '/driver', 'driver-status');
    when 'rejected' then
      perform public.push_notify(new.id, 'Your application needs changes', coalesce(new.reject_reason, 'Open Lift Me to see what to fix.'), '/driver/onboarding', 'driver-status');
    when 'suspended' then
      perform public.push_notify(new.id, 'Your driver account is suspended', 'Contact Lift Me support for details.', '/driver', 'driver-status');
    else
      null;
  end case;
  return new;
end $$;
create trigger push_on_driver_status after update of status on public.drivers
  for each row when (new.status is distinct from old.status) execute function public.push_on_driver_status();

-- ---------------------------------------------------------------------------
-- Permissions + housekeeping
-- ---------------------------------------------------------------------------
revoke all on function public.save_push_subscription(text, text, text, text),
                       public.remove_push_subscription(text),
                       public.format_money(integer, text, integer),
                       public.ride_money(public.rides),
                       public.push_notify(uuid, text, text, text, text),
                       public.push_outbox_dispatch(),
                       public.push_on_offer(),
                       public.push_on_ride_status(),
                       public.push_on_payment(),
                       public.push_on_driver_status()
  from public, anon, authenticated;
grant execute on function public.save_push_subscription(text, text, text, text), public.remove_push_subscription(text) to authenticated;
grant execute on all functions in schema public to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('lift-me-clean-push-outbox', '17 3 * * *', $c$delete from public.push_outbox where created_at < now() - interval '14 days'$c$);
  end if;
end $$;
