-- Lift Me — more ride types: bodas (electric + fuel motorbikes) and car sizes.
--
-- `pricing` is the catalogue of ride types (prices themselves are per market in market_prices).
-- New per-type facts:
--   vehicle_kind  'car' or 'motorcycle'
--   is_electric   electric vehicle (shown with ⚡; electric bodas are usually cheaper)
--   can_take      which ride types a driver whose vehicle is THIS type may be offered.
--                 Replaces the old single "tier" number, which couldn't keep cars away from boda
--                 requests. Always includes the type itself.

alter table public.pricing
  add column vehicle_kind text not null default 'car' check (vehicle_kind in ('car', 'motorcycle')),
  add column is_electric boolean not null default false,
  add column can_take text[] not null default '{}';

-- Kenyan line-up. Sort order = cheapest first in the app.
insert into public.pricing (ride_type, display_name, description, seats, tier, sort_order, vehicle_kind, is_electric, can_take) values
  ('boda_electric', 'Boda Electric', 'Electric motorbike · quiet and cheapest', 1, 1, 1, 'motorcycle', true, '{boda_electric,boda}'),
  ('boda',          'Boda',          'Motorbike · beats the traffic',           1, 1, 2, 'motorcycle', false, '{boda}'),
  ('lift_mini',     'Lift Mini',     'Small car · great value',                 3, 1, 3, 'car', false, '{lift_mini}'),
  ('lift_xl',       'Lift XL',       '7-seater or van · groups and luggage',    6, 2, 5, 'car', false, '{lift_xl,lift,lift_mini}')
on conflict (ride_type) do nothing;

update public.pricing set sort_order = 4, description = 'Everyday comfortable car', can_take = '{lift,lift_mini}' where ride_type = 'lift';
update public.pricing set sort_order = 6, can_take = '{lift_premium,lift,lift_mini}' where ride_type = 'lift_premium';
update public.pricing set can_take = array[ride_type] where cardinality(can_take) = 0;

alter table public.pricing add constraint pricing_can_take_self check (ride_type = any (can_take));
comment on column public.pricing.tier is 'Unused since 2026-11-21 (replaced by can_take).';

-- PLACEHOLDER Nairobi prices (whole KES). Change them in Admin → Pricing.
insert into public.market_prices (market_code, ride_type, base_fare, per_distance, per_minute, minimum_fare)
select 'nairobi', v.ride_type, v.base, v.per_km, v.per_min, v.min
  from (values ('boda_electric', 50, 20, 2, 80),
               ('boda',          60, 25, 2, 100),
               ('lift_mini',     80, 35, 3, 180),
               ('lift_xl',      150, 55, 5, 300)) as v(ride_type, base, per_km, per_min, min)
 where exists (select 1 from public.markets where code = 'nairobi')
on conflict (market_code, ride_type) do nothing;

-- ---------------------------------------------------------------------------
-- Matching: offer a ride only to drivers whose vehicle type can take it.
-- ---------------------------------------------------------------------------
create or replace function public.vehicle_can_take(p_vehicle_type text, p_ride_type text)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$ select coalesce((select p_ride_type = any (can_take) from public.pricing where ride_type = p_vehicle_type), false); $$;

create or replace function public.dispatch_ride(p_ride_id uuid)
returns integer
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare r public.rides; v_count integer;
begin
  select * into r from public.rides where id = p_ride_id;
  if r.status <> 'searching' or r.search_expires_at <= now() then return 0; end if;

  insert into public.ride_offers (ride_id, driver_id, expires_at)
  select r.id, d.id, r.search_expires_at
    from public.drivers d
    join public.driver_locations l on l.driver_id = d.id
    join public.vehicles v on v.driver_id = d.id
    join public.profiles p on p.id = d.id
   where d.status = 'approved' and d.is_online and not p.is_suspended
     and d.market_code = r.market_code
     and d.id <> r.passenger_id
     and l.updated_at > now() - make_interval(secs => coalesce(public.setting_int('location_fresh_seconds'), 120))
     and extensions.st_dwithin(l.location, r.pickup, coalesce(public.setting_int('match_radius_km'), 5) * 1000)
     and public.vehicle_can_take(v.ride_type, r.ride_type)
     and not exists (select 1 from public.rides a where a.driver_id = d.id
                     and a.status in ('accepted', 'arrived', 'in_progress'))
  on conflict (ride_id, driver_id) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- Quote options also say what kind of vehicle it is, so the app can show the right icon.
create or replace function public.create_quote(
  p_passenger_id uuid,
  p_pickup_lat double precision, p_pickup_lng double precision, p_pickup_address text, p_pickup_note text,
  p_dropoff_lat double precision, p_dropoff_lng double precision, p_dropoff_address text,
  p_distance_m integer, p_duration_s integer, p_polyline text
)
returns public.quotes
language plpgsql security definer set search_path = public, pg_temp
as $$
declare q public.quotes; v_options jsonb; m public.markets; v_market text;
begin
  v_market := public.market_at_point(p_pickup_lat, p_pickup_lng);
  if v_market is null then raise exception 'pickup_outside_service_area'; end if;
  if public.market_at_point(p_dropoff_lat, p_dropoff_lng) is distinct from v_market then
    raise exception 'dropoff_outside_service_area';
  end if;
  select * into m from public.markets where code = v_market;

  select coalesce(jsonb_agg(jsonb_build_object(
           'ride_type', t.ride_type,
           'display_name', t.display_name,
           'description', t.description,
           'seats', t.seats,
           'vehicle_kind', t.vehicle_kind,
           'is_electric', t.is_electric,
           'fare', public.calculate_fare(m.code, t.ride_type, p_distance_m, p_duration_s),
           'currency', m.currency) order by t.sort_order), '[]'::jsonb)
    into v_options
    from public.pricing t join public.market_prices mp on mp.ride_type = t.ride_type and mp.market_code = m.code
   where t.is_active and mp.is_active;

  insert into public.quotes (passenger_id, market_code, pickup, pickup_address, pickup_note, dropoff, dropoff_address,
                             distance_m, duration_s, polyline, options, currency, expires_at)
  values (p_passenger_id, m.code, public.make_point(p_pickup_lat, p_pickup_lng), p_pickup_address, nullif(trim(p_pickup_note), ''),
          public.make_point(p_dropoff_lat, p_dropoff_lng), p_dropoff_address,
          p_distance_m, p_duration_s, p_polyline, v_options, m.currency,
          now() + make_interval(mins => coalesce(public.setting_int('quote_valid_minutes'), 10)))
  returning * into q;
  return q;
end $$;

-- Driver alert names the ride type (a boda rider should know it's a boda request at a glance).
create or replace function public.push_on_offer()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare r public.rides; t public.pricing;
begin
  select * into r from public.rides where id = new.ride_id;
  select * into t from public.pricing where ride_type = r.ride_type;
  perform public.push_notify(new.driver_id,
    case when t.vehicle_kind = 'motorcycle' then 'New boda request 🏍️' else 'New ride request 🚗' end,
    coalesce(t.display_name, r.ride_type) || ' · ' || public.ride_money(r) || ' · Pickup: ' || r.pickup_address,
    '/driver', 'offer-' || r.id);
  return new;
end $$;

-- Drivers say what they drive while applying (an admin confirms or changes it when approving).
grant insert (ride_type), update (ride_type) on public.vehicles to authenticated;

revoke all on function public.vehicle_can_take(text, text) from public, anon, authenticated;
grant execute on function public.vehicle_can_take(text, text) to service_role;
