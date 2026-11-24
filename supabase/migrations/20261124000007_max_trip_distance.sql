-- Lift Me — longest trip per country (Kenya 150 km, USA 100 miles; editable in Admin -> Markets).
-- Someone priced a 1,755-mile trip across the USA: a mistake, and a risk for drivers. The quote function
-- refuses trips longer than the limit (first by straight line, then by road distance) with a clear
-- message; create_quote checks it again here.
alter table public.markets
  add column max_trip_distance_m integer check (max_trip_distance_m is null or max_trip_distance_m > 0);
comment on column public.markets.max_trip_distance_m is 'Longest trip allowed (metres). Null = no limit.';
update public.markets set max_trip_distance_m = 150000 where code = 'nairobi';       -- 150 km
update public.markets set max_trip_distance_m = 160934 where code = 'indianapolis';  -- 100 miles

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
  if m.max_trip_distance_m is not null and p_distance_m > m.max_trip_distance_m then
    raise exception 'trip_too_long';
  end if;

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
