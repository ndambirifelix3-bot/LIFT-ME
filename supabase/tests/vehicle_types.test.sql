-- Lift Me — ride types: bodas (electric + fuel) and car sizes. Runs after the other SQL tests.
-- Drivers d1, d2 (Nairobi, "lift" cars, online near the CBD) come from rls_and_rides.test.sql.
\set ON_ERROR_STOP 1
\pset footer off

reset role;
insert into auth.users (id, phone) values
  ('00000000-0000-0000-0000-0000000000e1', '254700000021'),  -- electric boda rider
  ('00000000-0000-0000-0000-0000000000e2', '254700000022'),  -- fuel boda rider
  ('00000000-0000-0000-0000-0000000000a3', '254700000003');  -- passenger

-- ===================== CATALOGUE =====================
select t.ok((select string_agg(ride_type, ',' order by sort_order) from public.pricing)
            = 'boda_electric,boda,lift_mini,lift,lift_xl,lift_premium', 'six ride types, cheapest first');
select t.ok((select vehicle_kind from public.pricing where ride_type = 'boda_electric') = 'motorcycle'
            and (select is_electric from public.pricing where ride_type = 'boda_electric'), 'Boda Electric is an electric motorbike');
select t.expect_error($$update public.pricing set can_take = '{boda}' where ride_type = 'lift'$$, '%pricing_can_take_self%');
select t.ok(public.calculate_fare('nairobi', 'boda_electric', 5000, 900) < public.calculate_fare('nairobi', 'boda', 5000, 900)
            and public.calculate_fare('nairobi', 'boda', 5000, 900) < public.calculate_fare('nairobi', 'lift_mini', 5000, 900)
            and public.calculate_fare('nairobi', 'lift_mini', 5000, 900) < public.calculate_fare('nairobi', 'lift', 5000, 900)
            and public.calculate_fare('nairobi', 'lift', 5000, 900) < public.calculate_fare('nairobi', 'lift_xl', 5000, 900),
            'electric boda < fuel boda < Mini < Lift < XL');

-- ===================== RIDERS SIGN UP (they pick their vehicle type) =====================
set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000e1');
select public.choose_role('driver');
insert into public.vehicles (driver_id, make, model, year, colour, plate, ride_type)
values (auth.uid(), 'Roam', 'Air', 2024, 'Green', 'KMGA 001E', 'boda_electric');
select t.ok((select ride_type from public.vehicles where driver_id = auth.uid()) = 'boda_electric', 'rider chose Boda Electric while applying');

select t.as_user('00000000-0000-0000-0000-0000000000e2');
select public.choose_role('driver');
insert into public.vehicles (driver_id, make, model, year, colour, plate, ride_type)
values (auth.uid(), 'Bajaj', 'Boxer', 2022, 'Red', 'KMGB 002F', 'boda');

select t.as_user('00000000-0000-0000-0000-0000000000a3');
select public.choose_role('passenger');
update public.profiles set full_name = 'Ann Three' where id = auth.uid();

-- Test shortcut: approve both riders directly and put them online near Nairobi CBD.
reset role;
update public.profiles set full_name = 'Rider ' || right(id::text, 2) where id in ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e2');
update public.drivers set status = 'approved', submitted_at = now(), id_number = '1', licence_number = 'A1'
 where id in ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e2');
-- (Approved riders can't change their vehicle type themselves: RLS filters the row, so nothing changes.)
set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000e1');
update public.vehicles set ride_type = 'lift_premium' where driver_id = auth.uid();
reset role;
select t.ok((select ride_type from public.vehicles where driver_id = '00000000-0000-0000-0000-0000000000e1') = 'boda_electric',
            'approved rider cannot switch to another ride type');
set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000e1');
select public.set_driver_online(true);
select public.update_driver_location(-1.2868, 36.8176, 0);
select t.as_user('00000000-0000-0000-0000-0000000000e2');
select public.set_driver_online(true);
select public.update_driver_location(-1.2866, 36.8170, 0);
reset role;
-- Make sure the two car drivers are online and nearby too.
update public.drivers set is_online = true where id in ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2');
update public.driver_locations set location = public.make_point(-1.2870, 36.8180), updated_at = now()
 where driver_id in ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2');

-- ===================== WHO GETS WHICH REQUEST =====================
create temp table vq as
  select * from public.create_quote('00000000-0000-0000-0000-0000000000a3', -1.2864, 36.8172, 'CBD', null, -1.30, 36.79, 'Kilimani', 4000, 600, null);
select t.ok((select count(*) from jsonb_array_elements((select options from vq))) = 6, 'Nairobi quote offers all six ride types');
select t.ok((select o ->> 'vehicle_kind' from jsonb_array_elements((select options from vq)) o where o ->> 'ride_type' = 'boda') = 'motorcycle',
            'quote options say which are motorbikes');
grant select on vq to authenticated;

create or replace function t.offered_to(p_ride uuid) returns text language sql as $$
  select coalesce(string_agg(right(driver_id::text, 2), ',' order by driver_id), '') from public.ride_offers where ride_id = p_ride;
$$;
grant execute on function t.offered_to(uuid) to authenticated;

set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000a3');
create temp table v1 as select * from public.request_ride((select id from vq), 'boda_electric', 'cash');
reset role;
select t.ok(t.offered_to((select id from v1)) = 'e1', 'Boda Electric request goes only to the electric boda (not fuel bodas, not cars)');
select t.ok((select body from public.push_outbox where user_id = '00000000-0000-0000-0000-0000000000e1' order by id desc limit 1) like 'Boda Electric · KES %',
            'rider alert names the ride type');
select t.ok((select title from public.push_outbox where user_id = '00000000-0000-0000-0000-0000000000e1' order by id desc limit 1) = 'New boda request 🏍️',
            'boda alert has a boda title');
set role authenticated;
select public.cancel_ride((select id from v1), 'test');
reset role;

create temp table vq2 as
  select * from public.create_quote('00000000-0000-0000-0000-0000000000a3', -1.2864, 36.8172, 'CBD', null, -1.30, 36.79, 'Kilimani', 4000, 600, null);
grant select on vq2 to authenticated;
set role authenticated;
create temp table v2 as select * from public.request_ride((select id from vq2), 'boda', 'cash');
reset role;
select t.ok(t.offered_to((select id from v2)) = 'e1,e2', 'fuel Boda request goes to both bodas (electric can take it), no cars');
set role authenticated;
select public.cancel_ride((select id from v2), 'test');
reset role;

create temp table vq3 as
  select * from public.create_quote('00000000-0000-0000-0000-0000000000a3', -1.2864, 36.8172, 'CBD', null, -1.30, 36.79, 'Kilimani', 4000, 600, null);
grant select on vq3 to authenticated;
set role authenticated;
create temp table v3 as select * from public.request_ride((select id from vq3), 'lift_mini', 'cash');
reset role;
select t.ok(t.offered_to((select id from v3)) = 'd1,d2', 'Lift Mini request goes to standard cars, never to bodas');
set role authenticated;
select public.cancel_ride((select id from v3), 'test');
reset role;

create temp table vq4 as
  select * from public.create_quote('00000000-0000-0000-0000-0000000000a3', -1.2864, 36.8172, 'CBD', null, -1.30, 36.79, 'Kilimani', 4000, 600, null);
grant select on vq4 to authenticated;
set role authenticated;
create temp table v4 as select * from public.request_ride((select id from vq4), 'lift_xl', 'cash');
reset role;
select t.ok(t.offered_to((select id from v4)) = '', 'Lift XL request is not offered to standard cars (too small)');

\warn 'vehicle_types.test.sql: ALL PASSED'
