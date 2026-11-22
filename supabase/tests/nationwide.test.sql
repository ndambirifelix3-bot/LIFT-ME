-- Lift Me — whole-country markets (Kenya, United States) and bodas in Kenya only. Runs after the other SQL tests.
\set ON_ERROR_STOP 1
\pset footer off
reset role;
-- markets.test.sql adds a test "nyc" market and switches the US off; restore the real setup.
update public.markets set is_active = (code <> 'nyc');

select t.ok(public.market_at_point(-4.0435, 39.6682) = 'nairobi', 'Mombasa is served (Kenya)');
select t.ok(public.market_at_point(-0.0917, 34.7680) = 'nairobi', 'Kisumu is served (Kenya)');
select t.ok(public.market_at_point(0.5143, 35.2698) = 'nairobi', 'Eldoret is served (Kenya)');
select t.ok(public.market_at_point(3.1191, 35.5973) = 'nairobi', 'Lodwar (far north) is served (Kenya)');
select t.ok(public.market_at_point(-6.7924, 39.2083) is null, 'Dar es Salaam (Tanzania) is not served');
select t.ok(public.market_at_point(0.3476, 32.5825) is null, 'Kampala (Uganda) is not served');

select t.ok(public.market_at_point(41.6764, -86.2520) = 'indianapolis', 'South Bend, Indiana is served (US)');
select t.ok(public.market_at_point(34.0522, -118.2437) = 'indianapolis', 'Los Angeles is served (US)');
select t.ok(public.market_at_point(25.7617, -80.1918) = 'indianapolis', 'Miami is served (US)');
select t.ok(public.market_at_point(61.2181, -149.9003) = 'indianapolis', 'Anchorage, Alaska is served (US)');
select t.ok(public.market_at_point(21.3069, -157.8583) = 'indianapolis', 'Honolulu, Hawaii is served (US)');
select t.ok(public.market_at_point(43.6532, -79.3832) is null, 'Toronto (Canada) is not served');
select t.ok(public.market_at_point(19.4326, -99.1332) is null, 'Mexico City is not served');

-- Bodas: Kenya only.
select t.expect_error($$insert into public.market_prices (market_code, ride_type, base_fare, per_distance, per_minute, minimum_fare)
                        values ('indianapolis', 'boda', 100, 100, 10, 300)$$, '%ride_type_not_available_in_country%');
create temp table usq as
  select * from public.create_quote('00000000-0000-0000-0000-0000000000a1', 41.6764, -86.2520, 'Downtown South Bend', null,
                                    41.7056, -86.2353, 'University of Notre Dame', 4000, 600, null);
select t.ok((select string_agg(o ->> 'ride_type', ',' order by (o ->> 'fare')::int) from jsonb_array_elements((select options from usq)) o)
            = 'lift_mini,lift,lift_xl,lift_premium', 'South Bend quote: cars only, Mini < Lift < XL < Premium');
select t.ok((select currency from usq) = 'USD', 'US prices in dollars');
select t.ok((select count(*) from jsonb_array_elements((select options from (
              select * from public.create_quote('00000000-0000-0000-0000-0000000000a1', -4.0435, 39.6682, 'Mombasa', null, -4.06, 39.67, 'Nyali', 4000, 600, null)) k)) o
              where o ->> 'vehicle_kind' = 'motorcycle') = 2, 'Mombasa quote includes both bodas');

\warn 'nationwide.test.sql: ALL PASSED'
