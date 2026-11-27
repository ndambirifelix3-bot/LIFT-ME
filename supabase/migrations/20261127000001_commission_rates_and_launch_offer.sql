-- Lift Me — commission per ride type, and a launch offer for new drivers.
--
--  * market_prices.commission_percent: this ride type's commission in this market (e.g. bodas 10%,
--    cars 12%). Empty = the market's commission_percent.
--  * Launch offer: a newly approved driver pays no commission for their first N days and/or first N
--    trips (markets.new_driver_free_days / new_driver_free_trips; 0 = not used; both set = it ends
--    at whichever comes first). The clock starts the first time the driver is approved.
--  * rides.commission_waived marks trips covered by the offer, so drivers and admins can see why.

alter table public.market_prices
  add column commission_percent integer check (commission_percent between 0 and 100);
comment on column public.market_prices.commission_percent is 'Commission % for this ride type in this market. Null = the market''s commission_percent.';

alter table public.markets
  add column new_driver_free_days integer not null default 0 check (new_driver_free_days between 0 and 365),
  add column new_driver_free_trips integer not null default 0 check (new_driver_free_trips between 0 and 10000);
comment on column public.markets.new_driver_free_days is 'Launch offer: days after first approval with no commission (0 = off).';
comment on column public.markets.new_driver_free_trips is 'Launch offer: first N trips with no commission (0 = off). With days too: ends at whichever comes first.';

alter table public.drivers add column first_approved_at timestamptz;
update public.drivers set first_approved_at = coalesce(reviewed_at, now()) where status = 'approved';

create or replace function public.drivers_set_first_approved()
returns trigger
language plpgsql set search_path = public, pg_temp
as $$
begin
  if new.status = 'approved' and new.first_approved_at is null then new.first_approved_at := now(); end if;
  return new;
end $$;
create trigger drivers_first_approved before insert or update of status on public.drivers
  for each row execute function public.drivers_set_first_approved();

alter table public.rides add column commission_waived boolean not null default false;

/** A driver's launch offer in a market: is it running, when does it end, how many free trips are left. */
create or replace function public.driver_launch_offer(p_driver_id uuid, p_market_code text)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare m public.markets; d public.drivers; v_trips integer; v_ends timestamptz; v_left integer; v_active boolean;
begin
  select * into m from public.markets where code = p_market_code;
  select * into d from public.drivers where id = p_driver_id;
  if m.code is null or d.id is null or d.first_approved_at is null
     or (m.new_driver_free_days = 0 and m.new_driver_free_trips = 0) then
    return jsonb_build_object('active', false);
  end if;
  if m.new_driver_free_days > 0 then v_ends := d.first_approved_at + make_interval(days => m.new_driver_free_days); end if;
  if m.new_driver_free_trips > 0 then
    select count(*) into v_trips from public.rides where driver_id = d.id and status = 'completed';
    v_left := greatest(m.new_driver_free_trips - v_trips, 0);
  end if;
  v_active := (v_ends is null or now() < v_ends) and (v_left is null or v_left > 0);
  return jsonb_build_object('active', v_active, 'ends_at', v_ends, 'trips_left', v_left);
end $$;

-- Commission: the ride type's rate (or the market's), nothing during the driver's launch offer.
create or replace function public.complete_trip(p_ride_id uuid)
returns public.rides
language plpgsql security definer set search_path = public, pg_temp
as $$
declare r public.rides; rd public.rides; v_pct integer; v_waived boolean := false; v_commission integer;
begin
  perform public.assert_active_user();
  select * into rd from public.rides where id = p_ride_id and driver_id = auth.uid() and status = 'in_progress' for update;
  if rd.id is null then raise exception 'transition_not_allowed'; end if;

  select coalesce(mp.commission_percent, m.commission_percent) into v_pct
    from public.markets m left join public.market_prices mp on mp.market_code = m.code and mp.ride_type = rd.ride_type
   where m.code = rd.market_code;
  -- Checked before this trip counts as completed.
  if coalesce((public.driver_launch_offer(rd.driver_id, rd.market_code) ->> 'active')::boolean, false) then
    v_pct := 0;
    v_waived := true;
  end if;
  v_commission := round(rd.fare * coalesce(v_pct, 0) / 100.0)::integer;

  update public.rides
     set status = 'completed', completed_at = now(),
         commission_percent = coalesce(v_pct, 0),
         commission_waived = v_waived,
         platform_commission = v_commission,
         driver_earnings = fare - v_commission
   where id = rd.id
  returning * into r;

  insert into public.payments (ride_id, method, amount, currency, status)
  values (r.id, r.payment_method, r.fare, r.currency, 'pending')
  on conflict (ride_id) do nothing;

  perform public.log_ride_event(r.id, 'in_progress', 'completed', 'driver');
  return r;
end $$;

-- Driver money screen: also shows the launch offer.
create or replace function public.get_my_wallet()
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare d public.drivers; m public.markets;
begin
  perform public.assert_active_user();
  select * into d from public.drivers where id = auth.uid();
  if d.id is null then raise exception 'not_a_driver' using errcode = '42501'; end if;
  select * into m from public.markets where code = d.market_code;
  return jsonb_build_object(
    'balance', d.wallet_balance,
    'currency', coalesce(m.currency, 'KES'),
    'currency_decimals', coalesce(m.currency_decimals, 0),
    'debt_limit', m.driver_debt_limit,
    'over_limit', coalesce(d.wallet_balance < -m.driver_debt_limit, false),
    'payment_instructions', coalesce(m.driver_payment_instructions, ''),
    'launch_offer', public.driver_launch_offer(d.id, d.market_code),
    'entries', coalesce((
      select jsonb_agg(to_jsonb(e) - 'driver_id' - 'created_by' order by e.id desc)
        from (select * from public.driver_ledger where driver_id = d.id order by id desc limit 50) e), '[]'::jsonb));
end $$;

revoke all on function public.driver_launch_offer(uuid, text), public.drivers_set_first_approved() from public, anon, authenticated;
