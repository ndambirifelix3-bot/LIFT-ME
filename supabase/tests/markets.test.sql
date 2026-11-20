-- Lift Me — multi-market tests (runs after rls_and_rides.test.sql, on the same database).
-- Sets up a second market (a US city, dollars with cents, miles) and checks that markets never mix.
\set ON_ERROR_STOP 1
\pset footer off

reset role;
insert into auth.users (id, phone) values
  ('00000000-0000-0000-0000-0000000000b1', '15551230001'),   -- US passenger
  ('00000000-0000-0000-0000-0000000000b2', '15551230002'),   -- US driver
  ('00000000-0000-0000-0000-0000000000b3', '447700900001');  -- UK number: no market

-- ===================== READING MARKETS =====================
set role anon;
select t.as_user(null);
select t.ok((select count(*) from public.markets) = 2, 'anyone (even logged out) can read markets for the phone screen');
select t.expect_error($$select count(*) from public.market_prices$$, '%permission denied%');

-- ===================== ADMIN CREATES A US MARKET =====================
set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.expect_error($$insert into public.markets (code, name, country_iso, currency, timezone, phone_country_code) values ('x', 'X', 'us', 'USD', 'UTC', '+1')$$, '%row-level security%');

select t.as_user('00000000-0000-0000-0000-0000000000ad');
select t.expect_error($$insert into public.markets (code, name, country_iso, currency, timezone, phone_country_code) values ('bad', 'Bad', 'us', 'USD', 'America/Nowhere', '+1')$$, '%unknown_timezone%');
insert into public.markets (code, name, country_iso, currency, currency_decimals, timezone, distance_unit, phone_country_code,
                            emergency_numbers, payment_methods, commission_percent, prices_are_placeholder, is_active, sort_order)
values ('nyc', 'New York City', 'us', 'USD', 2, 'America/New_York', 'mi', '+1', '["911"]', '{cash}', 20, false, true, 2);
-- Indianapolis (also +1) exists from the migrations; switch it off so +1 test users land in NYC here.
update public.markets set is_active = false where code = 'indianapolis';
-- Prices in cents, per MILE: $2.50 base, $1.75/mi, $0.35/min, $8.00 minimum.
insert into public.market_prices (market_code, ride_type, base_fare, per_distance, per_minute, minimum_fare)
values ('nyc', 'lift', 250, 175, 35, 800);
-- Rough Manhattan box (longitude latitude).
insert into public.service_area (name, market_code, area)
values ('Manhattan (test)', 'nyc', extensions.st_geogfromtext(
  'SRID=4326;MULTIPOLYGON(((-74.03 40.68, -73.90 40.68, -73.90 40.88, -74.03 40.88, -74.03 40.68)))'));
-- US document types come from the Indianapolis migration; this test needs only the licence.
update public.document_types set required = false where country_iso = 'us' and code <> 'us_drivers_license';
update public.markets set commission_percent = 20 where code = 'nyc';
select t.ok((select count(*) from public.admin_actions where action = 'config_updated' and target_type = 'markets') = 2, 'market edits are audited');
select t.ok(public.market_at_point(40.758, -73.9855) = 'nyc', 'Times Square is in the NYC market');
select t.ok(public.market_at_point(-1.2864, 36.8172) = 'nairobi', 'Nairobi CBD is in the Nairobi market');
select t.ok(public.market_at_point(51.5, -0.12) is null, 'London is not served');
reset role;

-- ===================== FARES IN CENTS AND MILES =====================
-- 2 miles (3219 m) + 10 min = 250 + 175*2 + 35*10 = 950 cents = $9.50
select t.ok(public.calculate_fare('nyc', 'lift', 3219, 600) = 950, 'US fare: $2.50 + 2 mi x $1.75 + 10 min x $0.35 = $9.50');
select t.ok(public.calculate_fare('nyc', 'lift', 100, 30) = 800, 'US minimum fare $8.00');
select t.expect_error($$select public.calculate_fare('nyc', 'lift_premium', 1000, 60)$$, '%unknown_ride_type%');

-- ===================== US USERS =====================
set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000b1');
select public.choose_role('passenger');
update public.profiles set full_name = 'Ursula US' where id = auth.uid();

select t.as_user('00000000-0000-0000-0000-0000000000b2');
select public.choose_role('driver');
select t.ok((select market_code from public.drivers where id = auth.uid()) = 'nyc', '+1 driver is placed in the US market');
update public.profiles set full_name = 'Uma Driver' where id = auth.uid();
update public.drivers set id_number = 'X1', licence_number = 'NY123', photo_path = '00000000-0000-0000-0000-0000000000b2/photo-1.jpg' where id = auth.uid();
insert into public.vehicles (driver_id, make, model, year, colour, plate) values (auth.uid(), 'Toyota', 'Camry', 2020, 'Black', 'NYC1234');
insert into public.driver_documents (driver_id, doc_type, file_path, mime_type)
values (auth.uid(), 'us_drivers_license', auth.uid() || '/us_drivers_license-1.jpg', 'image/jpeg');
select public.submit_driver_application();  -- Kenyan documents are NOT required in the US
select t.ok((select submitted_at from public.drivers where id = auth.uid()) is not null, 'US driver submits with only US documents');

select t.as_user('00000000-0000-0000-0000-0000000000b3');
select public.choose_role('driver');
select t.ok((select market_code from public.drivers where id = auth.uid()) is null, 'driver from an unserved country has no market yet');

select t.as_user('00000000-0000-0000-0000-0000000000ad');
select public.admin_review_driver('00000000-0000-0000-0000-0000000000b2', true);
select t.expect_error($$update public.drivers set submitted_at = now() where id = '00000000-0000-0000-0000-0000000000b3'$$, '%permission denied%');
reset role;  -- test shortcut: pretend driver 3 submitted
update public.drivers set submitted_at = now() where id = '00000000-0000-0000-0000-0000000000b3';
set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000ad');
select t.expect_error($$select public.admin_review_driver('00000000-0000-0000-0000-0000000000b3', true)$$, '%driver_market_required%');
select public.admin_set_driver_market('00000000-0000-0000-0000-0000000000b3', 'nyc');
select t.ok((select market_code from public.drivers where id = '00000000-0000-0000-0000-0000000000b3') = 'nyc', 'admin can place a driver in a market');

-- ===================== US QUOTE + RIDE =====================
reset role;
select t.expect_error($$select public.create_quote('00000000-0000-0000-0000-0000000000b1', 40.758, -73.9855, 'Times Sq', null, -1.30, 36.79, 'Nairobi', 1, 1, null)$$, '%dropoff_outside_service_area%');
create temp table uq as
  select * from public.create_quote('00000000-0000-0000-0000-0000000000b1', 40.758, -73.9855, 'Times Square', null,
                                    40.7484, -73.9857, 'Empire State Building', 3219, 600, null);
select t.ok((select market_code from uq) = 'nyc' and (select currency from uq) = 'USD', 'quote is in the NYC market, in USD');
select t.ok((select (options -> 0 ->> 'fare')::int from uq) = 950, 'quoted $9.50 (950 cents)');
select t.ok(jsonb_array_length((select options from uq)) = 1, 'only ride types priced in NYC are offered');
grant select on uq to authenticated;

-- A Nairobi driver standing right at the US pickup must still NOT get the US ride.
set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000d1');
select public.update_driver_location(40.7581, -73.9856, 0);

select t.as_user('00000000-0000-0000-0000-0000000000b1');
select t.expect_error($$select public.request_ride((select id from uq), 'lift', 'mpesa')$$, '%payment_method_not_available%');
create temp table ur as select * from public.request_ride((select id from uq), 'lift', 'cash');
select t.ok((select market_code from ur) = 'nyc' and (select fare from ur) = 950, 'US ride created at $9.50');

select t.as_user('00000000-0000-0000-0000-0000000000d1');
select t.ok((select count(*) from public.ride_offers where ride_id = (select id from ur)) = 0, 'Nairobi driver gets no offer for a US ride');
select public.update_driver_location(-1.2870, 36.8180, 0);  -- back home

select t.as_user('00000000-0000-0000-0000-0000000000b2');
select public.set_driver_online(true);
select public.update_driver_location(40.7590, -73.9850, 0);
select t.ok((select count(*) from public.ride_offers where ride_id = (select id from ur)) = 1, 'US driver gets the US ride');
select public.accept_ride((select id from ur));
select t.as_user('00000000-0000-0000-0000-0000000000ad');
select t.expect_error($$select public.admin_set_driver_market('00000000-0000-0000-0000-0000000000b2', 'nairobi')$$, '%driver_has_active_ride%');
select t.as_user('00000000-0000-0000-0000-0000000000b2');
select public.driver_arrived((select id from ur));
select public.start_trip((select id from ur));
select public.complete_trip((select id from ur));
reset role;
select t.ok((select platform_commission from public.rides where id = (select id from ur)) = 190, 'NYC commission 20% of 950 = 190');
select t.ok((select driver_earnings from public.rides where id = (select id from ur)) = 760, 'US driver earns 760 cents');
select t.ok((select currency from public.payments where ride_id = (select id from ur)) = 'USD', 'US payment is in USD');
set role authenticated;

select t.as_user('00000000-0000-0000-0000-0000000000b1');
select t.expect_error($$select public.change_payment_method((select id from ur), 'mpesa')$$, '%payment_method_not_available%');
select t.ok((public.get_ride_details((select id from ur)) -> 'market' ->> 'distance_unit') = 'mi', 'ride details include the market (miles)');

select t.as_user('00000000-0000-0000-0000-0000000000b2');
select public.confirm_cash_payment((select id from ur));
select t.ok((public.get_driver_earnings() ->> 'currency') = 'USD', 'US driver earnings shown in USD');
select t.ok((public.get_driver_earnings() ->> 'currency_decimals')::int = 2, 'US earnings have 2 decimals');
select t.ok((public.get_driver_earnings() ->> 'total')::int = 760, 'US driver total = 760 cents');

select t.as_user('00000000-0000-0000-0000-0000000000d1');
select t.ok((public.get_driver_earnings() ->> 'currency') = 'KES', 'Nairobi driver earnings stay in KES');
select t.ok((public.get_driver_earnings() ->> 'total')::int = 306, 'Nairobi driver total unchanged');

-- ===================== ADMIN TOTALS NEVER MIX CURRENCIES =====================
select t.as_user('00000000-0000-0000-0000-0000000000ad');
select t.ok((public.admin_overview('nyc') ->> 'collected_total')::int = 950, 'NYC overview: 950 cents collected');
select t.ok((public.admin_overview('nyc') ->> 'currency') = 'USD', 'NYC overview in USD');
select t.ok((public.admin_overview('nairobi') ->> 'collected_total')::int = 360, 'Nairobi overview: KES 360, no dollars mixed in');
select t.ok((public.admin_overview() ->> 'market_code') = 'nairobi', 'overview defaults to the first market');
update public.market_prices set per_distance = 180 where market_code = 'nyc' and ride_type = 'lift';
select t.ok((select target_id from public.admin_actions where target_type = 'market_prices' order by id desc limit 1) = 'nyc:lift', 'price edit audited as nyc:lift');

reset role;
\warn 'markets.test.sql: ALL PASSED'
