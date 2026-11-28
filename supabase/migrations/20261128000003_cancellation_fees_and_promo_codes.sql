-- Lift Me — cancellation fees and promo codes.
--
-- CANCELLATION FEES (per market; 0 = off):
--  * A passenger who cancels after the free period (cancellation_free_seconds after a driver accepted),
--    or once the driver has arrived, owes markets.cancellation_fee.
--  * A driver who has waited at the pickup for no_show_wait_seconds can end the ride as "Passenger did
--    not show up" (driver_report_no_show): the passenger owes the same fee.
--  * The fee is a payment on the cancelled ride, paid by card (charged automatically) or M-Pesa — never
--    cash. The driver gets it minus the usual commission (in Driver money, once paid).
--  * Until it's paid, the passenger can't book again (unpaid_cancellation_fee). Admins can waive it.
--
-- PROMO CODES (admin-made, per market): percent off a ride, optional cap, first ride only, total and
-- per-passenger limits, start/end dates. Lift Me pays the discount: the driver still earns their share
-- of the FULL fare (on cash trips Lift Me owes them the difference).

-- ---------------------------------------------------------------------------
-- Settings and columns
-- ---------------------------------------------------------------------------
alter table public.markets
  add column cancellation_fee integer not null default 0 check (cancellation_fee >= 0),
  add column cancellation_free_seconds integer not null default 120 check (cancellation_free_seconds between 0 and 3600),
  add column no_show_wait_seconds integer not null default 300 check (no_show_wait_seconds between 60 and 3600);
comment on column public.markets.cancellation_fee is 'Fee (smallest unit) when a passenger cancels late or does not show up. 0 = no fee.';

alter table public.rides
  add column cancellation_fee integer not null default 0 check (cancellation_fee >= 0),
  add column promo_code text,
  add column promo_discount integer not null default 0 check (promo_discount >= 0);

create table public.promo_codes (
  code text primary key check (code ~ '^[A-Z0-9]{3,20}$'),
  market_code text not null references public.markets (code) on delete cascade,
  description text not null default '',
  percent_off integer not null check (percent_off between 1 and 100),
  max_discount integer check (max_discount > 0),           -- smallest unit; null = no cap
  first_ride_only boolean not null default false,
  max_uses integer check (max_uses > 0),                   -- all passengers together; null = no limit
  uses_per_passenger integer not null default 1 check (uses_per_passenger > 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);
alter table public.rides add constraint rides_promo_code_fkey foreign key (promo_code) references public.promo_codes (code);
create index rides_promo_code_idx on public.rides (promo_code) where promo_code is not null;
alter table public.promo_codes enable row level security;
revoke all on public.promo_codes from anon, authenticated;
grant select, insert, update on public.promo_codes to authenticated;  -- admins only (RLS)
grant all on public.promo_codes to service_role;
create policy promo_codes_admin_select on public.promo_codes for select to authenticated using ((select public.is_admin()));
create policy promo_codes_admin_insert on public.promo_codes for insert to authenticated with check ((select public.is_admin()));
create policy promo_codes_admin_update on public.promo_codes for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
-- Passengers never list codes (some are private); they check one with preview_promo.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
/** Commission % for a ride: its ride type's rate (or the market's); 0 during the driver's welcome offer. */
create or replace function public.ride_commission_percent(p_ride public.rides)
returns integer
language sql stable security definer set search_path = public, pg_temp
as $$
  select case
    when p_ride.driver_id is not null
         and coalesce((public.driver_launch_offer(p_ride.driver_id, p_ride.market_code) ->> 'active')::boolean, false) then 0
    else coalesce((select coalesce(mp.commission_percent, m.commission_percent)
                     from public.markets m left join public.market_prices mp on mp.market_code = m.code and mp.ride_type = p_ride.ride_type
                    where m.code = p_ride.market_code), 0)
  end
$$;

/** Unpaid cancellation fee of a passenger (the ride id), or null. */
create or replace function public.unpaid_cancellation_fee_ride(p_passenger_id uuid)
returns uuid
language sql stable security definer set search_path = public, pg_temp
as $$
  select r.id from public.rides r join public.payments p on p.ride_id = r.id
   where r.passenger_id = p_passenger_id and r.status = 'cancelled' and r.cancellation_fee > 0 and p.status <> 'paid'
   order by r.cancelled_at desc limit 1
$$;

/** Discount (smallest unit) a code gives this passenger on this fare. Raises a promo_* error if it can't be used. */
create or replace function public.promo_discount_for(p_passenger_id uuid, p_market_code text, p_code text, p_fare integer)
returns integer
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare c public.promo_codes; v_used integer; v_mine integer; v_disc integer;
begin
  select * into c from public.promo_codes where code = upper(trim(p_code));
  if c.code is null or not c.is_active then raise exception 'promo_not_found'; end if;
  if now() < c.starts_at or (c.ends_at is not null and now() >= c.ends_at) then raise exception 'promo_expired'; end if;
  if c.market_code <> p_market_code then raise exception 'promo_other_country'; end if;
  -- Rides that were cancelled or found no driver give the code back.
  select count(*), count(*) filter (where passenger_id = p_passenger_id) into v_used, v_mine
    from public.rides where promo_code = c.code and status not in ('cancelled', 'no_driver_found');
  if c.max_uses is not null and v_used >= c.max_uses then raise exception 'promo_used_up'; end if;
  if v_mine >= c.uses_per_passenger then raise exception 'promo_already_used'; end if;
  if c.first_ride_only and exists (select 1 from public.rides where passenger_id = p_passenger_id and status = 'completed') then
    raise exception 'promo_first_ride_only';
  end if;
  v_disc := round(p_fare * c.percent_off / 100.0)::integer;
  if c.max_discount is not null then v_disc := least(v_disc, c.max_discount); end if;
  return greatest(least(v_disc, p_fare), 0);
end $$;

/** Passenger: check a code against their price quote. Returns the discount for each ride type. */
create or replace function public.preview_promo(p_quote_id uuid, p_code text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare q public.quotes; v_profile public.profiles; c public.promo_codes; v_options jsonb;
begin
  v_profile := public.assert_active_user();
  select * into q from public.quotes where id = p_quote_id and passenger_id = v_profile.id;
  if q.id is null then raise exception 'quote_not_found'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'ride_type', o ->> 'ride_type',
           'discount', public.promo_discount_for(v_profile.id, q.market_code, p_code, (o ->> 'fare')::integer))), '[]'::jsonb)
    into v_options from jsonb_array_elements(q.options) o;
  select * into c from public.promo_codes where code = upper(trim(p_code));
  return jsonb_build_object('code', c.code, 'description', c.description, 'percent_off', c.percent_off,
                            'max_discount', c.max_discount, 'options', v_options);
end $$;

-- ---------------------------------------------------------------------------
-- Booking: promo code + unpaid fee check. (New optional parameter → replace the function.)
-- ---------------------------------------------------------------------------
drop function public.request_ride(uuid, text, public.payment_method);
create function public.request_ride(p_quote_id uuid, p_ride_type text, p_payment_method public.payment_method, p_promo_code text default null)
returns public.rides
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare q public.quotes; v_profile public.profiles; v_fare integer; v_disc integer := 0; v_code text; r public.rides;
begin
  v_profile := public.assert_active_user();
  if v_profile.role <> 'passenger' then raise exception 'passengers_only' using errcode = '42501'; end if;

  select * into q from public.quotes where id = p_quote_id and passenger_id = v_profile.id for update;
  if q.id is null then raise exception 'quote_not_found'; end if;
  if q.used_at is not null then raise exception 'quote_already_used'; end if;
  if q.expires_at <= now() then raise exception 'quote_expired'; end if;

  if public.unpaid_cancellation_fee_ride(v_profile.id) is not null then raise exception 'unpaid_cancellation_fee'; end if;

  if not exists (select 1 from public.markets where code = q.market_code and p_payment_method = any (payment_methods)) then
    raise exception 'payment_method_not_available';
  end if;
  if p_payment_method = 'card' and not exists (select 1 from public.stripe_customers where user_id = v_profile.id and payment_method_id is not null) then
    raise exception 'no_card';
  end if;

  select (o ->> 'fare')::integer into v_fare
    from jsonb_array_elements(q.options) o where o ->> 'ride_type' = p_ride_type;
  if v_fare is null then raise exception 'ride_type_not_in_quote'; end if;

  if nullif(trim(p_promo_code), '') is not null then
    v_code := upper(trim(p_promo_code));
    v_disc := public.promo_discount_for(v_profile.id, q.market_code, v_code, v_fare);
  end if;

  if exists (select 1 from public.rides where passenger_id = v_profile.id
             and status in ('searching', 'accepted', 'arrived', 'in_progress')) then
    raise exception 'active_ride_exists';
  end if;

  update public.quotes set used_at = now() where id = q.id;

  insert into public.rides (passenger_id, market_code, quote_id, ride_type, status, pickup, pickup_lat, pickup_lng, pickup_address, pickup_note,
                            dropoff, dropoff_lat, dropoff_lng, dropoff_address, distance_m, duration_s, polyline,
                            fare, currency, payment_method, search_expires_at, promo_code, promo_discount)
  values (v_profile.id, q.market_code, q.id, p_ride_type, 'searching', q.pickup,
          extensions.st_y(q.pickup::extensions.geometry), extensions.st_x(q.pickup::extensions.geometry), q.pickup_address, q.pickup_note,
          q.dropoff, extensions.st_y(q.dropoff::extensions.geometry), extensions.st_x(q.dropoff::extensions.geometry), q.dropoff_address,
          q.distance_m, q.duration_s, q.polyline, v_fare - v_disc, q.currency, p_payment_method,
          now() + make_interval(secs => coalesce(public.setting_int('search_timeout_seconds'), 120)),
          v_code, v_disc)
  returning * into r;

  perform public.log_ride_event(r.id, null, 'searching', 'passenger');
  perform public.dispatch_ride(r.id);
  return r;
end $$;
revoke all on function public.request_ride(uuid, text, public.payment_method, text) from public, anon;
grant execute on function public.request_ride(uuid, text, public.payment_method, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Completing a trip: commission on the FULL fare; Lift Me pays any promo discount.
-- ---------------------------------------------------------------------------
create or replace function public.complete_trip(p_ride_id uuid)
returns public.rides
language plpgsql security definer set search_path = public, pg_temp
as $$
declare r public.rides; rd public.rides; v_pct integer; v_waived boolean; v_full integer; v_commission integer;
begin
  perform public.assert_active_user();
  select * into rd from public.rides where id = p_ride_id and driver_id = auth.uid() and status = 'in_progress' for update;
  if rd.id is null then raise exception 'transition_not_allowed'; end if;

  -- Both checked before this trip counts as completed.
  v_waived := coalesce((public.driver_launch_offer(rd.driver_id, rd.market_code) ->> 'active')::boolean, false);
  v_pct := public.ride_commission_percent(rd);
  v_full := rd.fare + rd.promo_discount;
  v_commission := round(v_full * v_pct / 100.0)::integer;

  update public.rides
     set status = 'completed', completed_at = now(),
         commission_percent = v_pct,
         commission_waived = v_waived,
         platform_commission = v_commission - rd.promo_discount,   -- negative when the promo costs more than the commission
         driver_earnings = v_full - v_commission
   where id = rd.id
  returning * into r;

  -- A fully free ride (100% promo) has nothing to collect.
  insert into public.payments (ride_id, method, amount, currency, status, paid_at)
  values (r.id, r.payment_method, r.fare, r.currency, case when r.fare = 0 then 'paid' else 'pending' end::public.payment_status,
          case when r.fare = 0 then now() end)
  on conflict (ride_id) do nothing;

  perform public.log_ride_event(r.id, 'in_progress', 'completed', 'driver');
  return r;
end $$;

-- Cash trips: the driver kept the (discounted) cash. Owes the commission, or is owed the promo difference.
create or replace function public.ledger_cash_commission(p_ride_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare r public.rides;
begin
  select * into r from public.rides where id = p_ride_id for update;
  if r.driver_id is null or r.status <> 'completed' or coalesce(r.platform_commission, 0) = 0 then return; end if;
  if exists (select 1 from public.driver_ledger where ride_id = r.id and kind in ('cash_commission', 'trip_earnings')) then return; end if;
  insert into public.driver_ledger (driver_id, kind, amount, currency, ride_id, note)
  values (r.driver_id, 'cash_commission', -r.platform_commission, r.currency, r.id,
          case when r.platform_commission < 0 then 'Promo discount on a cash trip, paid to you by Lift Me'
               else 'Commission ' || r.commission_percent || '% on a cash trip' end);
end $$;

-- Paid trips (card / M-Pesa) and paid cancellation fees: the driver's share.
create or replace function public.ledger_trip_earnings(p_ride_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare r public.rides;
begin
  select * into r from public.rides where id = p_ride_id for update;
  if r.driver_id is null or coalesce(r.driver_earnings, 0) = 0 then return; end if;
  if not (r.status = 'completed' or (r.status = 'cancelled' and r.cancellation_fee > 0)) then return; end if;
  if exists (select 1 from public.driver_ledger where ride_id = r.id and kind in ('cash_commission', 'trip_earnings')) then return; end if;
  insert into public.driver_ledger (driver_id, kind, amount, currency, ride_id, note)
  values (r.driver_id, 'trip_earnings', r.driver_earnings, r.currency, r.id,
          case when r.status = 'cancelled' then 'Your share of a cancellation fee' else 'Your share of a trip paid to Lift Me' end);
end $$;

-- ---------------------------------------------------------------------------
-- Cancelling: fee when late; driver no-show
-- ---------------------------------------------------------------------------
/** Puts a cancellation fee on a cancelled ride (card or M-Pesa, never cash). Returns the fee (0 if none). */
create or replace function public.charge_cancellation_fee(p_ride_id uuid)
returns integer
language plpgsql security definer set search_path = public, pg_temp
as $$
declare r public.rides; m public.markets; v_method public.payment_method; v_pct integer; v_commission integer;
begin
  select * into r from public.rides where id = p_ride_id for update;
  select * into m from public.markets where code = r.market_code;
  if r.status <> 'cancelled' or m.cancellation_fee <= 0 or r.driver_id is null then return 0; end if;
  v_method := case
    when r.payment_method <> 'cash' then r.payment_method
    when 'mpesa' = any (m.payment_methods) and m.currency = 'KES' then 'mpesa'::public.payment_method
    when 'card' = any (m.payment_methods) then 'card'::public.payment_method
  end;
  if v_method is null then return 0; end if;
  v_pct := public.ride_commission_percent(r);
  v_commission := round(m.cancellation_fee * v_pct / 100.0)::integer;
  update public.rides
     set cancellation_fee = m.cancellation_fee, commission_percent = v_pct,
         platform_commission = v_commission, driver_earnings = m.cancellation_fee - v_commission
   where id = r.id;
  insert into public.payments (ride_id, method, amount, currency, status)
  values (r.id, v_method, m.cancellation_fee, r.currency, 'pending')
  on conflict (ride_id) do nothing;
  perform public.push_notify(r.passenger_id, 'Cancellation fee',
    'A ' || public.format_money(m.cancellation_fee, r.currency, m.currency_decimals) || ' cancellation fee applies to your last ride.',
    '/passenger/ride/' || r.id, 'ride-' || r.id);
  return m.cancellation_fee;
end $$;

create or replace function public.cancel_ride(p_ride_id uuid, p_reason text default null)
returns public.rides
language plpgsql security definer set search_path = public, pg_temp
as $$
declare r public.rides; m public.markets; v_role text; v_uid uuid := auth.uid(); v_from public.ride_status; v_late boolean;
begin
  perform public.assert_active_user();
  select * into r from public.rides where id = p_ride_id for update;
  if r.id is null then raise exception 'ride_not_found'; end if;

  if r.passenger_id = v_uid then v_role := 'passenger';
  elsif r.driver_id = v_uid then v_role := 'driver';
  elsif public.is_admin() then v_role := 'admin';
  else raise exception 'not_your_ride' using errcode = '42501';
  end if;

  if not public.ride_transition_allowed(r.status, 'cancelled') then raise exception 'cannot_cancel_now'; end if;
  if r.status = 'in_progress' and v_role <> 'admin' then raise exception 'cannot_cancel_during_trip'; end if;
  v_from := r.status;
  select * into m from public.markets where code = r.market_code;
  -- Late: the driver has arrived, or was on the way for longer than the free period.
  v_late := v_role = 'passenger' and (r.status = 'arrived'
            or (r.status = 'accepted' and r.accepted_at < now() - make_interval(secs => m.cancellation_free_seconds)));

  update public.rides
     set status = 'cancelled', cancelled_at = now(), cancelled_by = v_role::public.user_role,
         cancel_reason = nullif(trim(p_reason), '')
   where id = r.id returning * into r;
  update public.ride_offers set response = 'expired', responded_at = now()
   where ride_id = r.id and response = 'pending';

  perform public.log_ride_event(r.id, v_from, 'cancelled', v_role, p_reason);
  if v_role = 'admin' then
    perform public.log_admin_action('ride_cancelled', 'ride', r.id::text, jsonb_build_object('reason', p_reason));
  end if;
  if v_late then perform public.charge_cancellation_fee(r.id); end if;
  select * into r from public.rides where id = r.id;
  return r;
end $$;

/** Driver: the passenger didn't come out. Allowed after waiting no_show_wait_seconds at the pickup. */
create or replace function public.driver_report_no_show(p_ride_id uuid)
returns public.rides
language plpgsql security definer set search_path = public, pg_temp
as $$
declare r public.rides; m public.markets;
begin
  perform public.assert_active_user();
  select * into r from public.rides where id = p_ride_id for update;
  if r.id is null or r.driver_id is distinct from auth.uid() then raise exception 'not_your_ride' using errcode = '42501'; end if;
  if r.status <> 'arrived' then raise exception 'cannot_cancel_now'; end if;
  select * into m from public.markets where code = r.market_code;
  if r.arrived_at > now() - make_interval(secs => m.no_show_wait_seconds) then raise exception 'wait_longer'; end if;

  update public.rides
     set status = 'cancelled', cancelled_at = now(), cancelled_by = 'driver', cancel_reason = 'Passenger did not show up'
   where id = r.id;
  update public.ride_offers set response = 'expired', responded_at = now() where ride_id = r.id and response = 'pending';
  perform public.log_ride_event(r.id, 'arrived', 'cancelled', 'driver', 'no_show');
  perform public.charge_cancellation_fee(r.id);
  select * into r from public.rides where id = r.id;
  return r;
end $$;

/** Admin: drop a cancellation fee (e.g. after a complaint). Only while unpaid. */
create or replace function public.admin_waive_cancellation_fee(p_ride_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare r public.rides;
begin
  if not public.is_admin() then raise exception 'admin_only' using errcode = '42501'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'reason_required'; end if;
  select * into r from public.rides where id = p_ride_id for update;
  if r.id is null or r.cancellation_fee = 0 then raise exception 'no_fee'; end if;
  if exists (select 1 from public.payments where ride_id = r.id and status = 'paid') then raise exception 'fee_already_paid'; end if;
  delete from public.payments where ride_id = r.id;
  update public.rides set cancellation_fee = 0, platform_commission = null, driver_earnings = null, commission_percent = null where id = r.id;
  perform public.log_admin_action('cancellation_fee_waived', 'ride', r.id::text, jsonb_build_object('reason', p_reason));
end $$;

-- The fee is never paid in cash (the driver isn't there to collect it).
create or replace function public.change_payment_method(p_ride_id uuid, p_method public.payment_method)
returns public.payments
language plpgsql security definer set search_path = public, pg_temp
as $$
declare p public.payments; r public.rides;
begin
  perform public.assert_active_user();
  select * into r from public.rides where id = p_ride_id and passenger_id = auth.uid();
  if r.id is null then raise exception 'not_your_ride' using errcode = '42501'; end if;
  if r.status = 'cancelled' and p_method = 'cash' then raise exception 'fee_not_cash'; end if;
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

revoke all on function public.ride_commission_percent(public.rides), public.unpaid_cancellation_fee_ride(uuid),
  public.promo_discount_for(uuid, text, text, integer), public.charge_cancellation_fee(uuid) from public, anon, authenticated;
revoke all on function public.preview_promo(uuid, text), public.driver_report_no_show(uuid),
  public.admin_waive_cancellation_fee(uuid, text) from public, anon;
grant execute on function public.preview_promo(uuid, text), public.driver_report_no_show(uuid),
  public.admin_waive_cancellation_fee(uuid, text) to authenticated;
