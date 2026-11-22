-- Lift Me — database security + ride flow tests.
-- Runs as superuser, impersonating users with `set role authenticated` + a JWT subject,
-- the same way Supabase evaluates RLS for real requests.
\set ON_ERROR_STOP 1
\pset footer off

create schema if not exists t;
grant usage on schema t to authenticated, anon;

create or replace function t.as_user(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), false);
end $$;

-- Runs SQL and asserts it FAILS with a message matching p_like.
create or replace function t.expect_error(p_sql text, p_like text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm not ilike p_like then
      raise exception 'expected error like "%" but got "%" for: %', p_like, sqlerrm, p_sql;
    end if;
    raise notice 'OK (blocked: %) %', sqlerrm, left(p_sql, 70);
    return;
  end;
  raise exception 'expected an error like "%" but statement succeeded: %', p_like, p_sql;
end $$;

create or replace function t.ok(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'ASSERTION FAILED: %', p_msg; end if;
  raise notice 'OK %', p_msg;
end $$;

grant execute on all functions in schema t to authenticated, anon;

-- Fixed test users
insert into auth.users (id, phone) values
  ('00000000-0000-0000-0000-0000000000a1', '254700000001'),  -- passenger 1
  ('00000000-0000-0000-0000-0000000000a2', '254700000002'),  -- passenger 2
  ('00000000-0000-0000-0000-0000000000d1', '254700000011'),  -- driver 1
  ('00000000-0000-0000-0000-0000000000d2', '254700000012'),  -- driver 2
  ('00000000-0000-0000-0000-0000000000d3', '254700000013'),  -- driver 3 (never approved)
  ('00000000-0000-0000-0000-0000000000ad', '254700000099');  -- admin

select t.ok((select phone from public.profiles where id = '00000000-0000-0000-0000-0000000000a1') = '+254700000001',
            'profile auto-created with +254 phone');

-- The one-time "make me admin" SQL from the README (run by the owner in the dashboard).
update public.profiles set role = 'admin', role_chosen = true, full_name = 'Admin'
 where id = '00000000-0000-0000-0000-0000000000ad';

-- ===================== ROLES =====================
set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.expect_error($$select public.choose_role('admin')$$, '%role_not_allowed%');
select public.choose_role('passenger');
select t.expect_error($$select public.choose_role('driver')$$, '%role_already_chosen%');
select t.expect_error($$update public.profiles set role = 'admin' where id = auth.uid()$$, '%permission denied%');
select t.expect_error($$update public.profiles set is_suspended = false where id = auth.uid()$$, '%permission denied%');
update public.profiles set full_name = 'Pat Passenger' where id = auth.uid();
select t.ok((select count(*) from public.profiles) = 1, 'passenger sees only own profile');
select t.ok((select count(*) from public.admin_actions) = 0, 'passenger cannot read admin log');
select t.expect_error($$select public.admin_overview()$$, '%admin_only%');
select t.expect_error($$select public.admin_set_role('00000000-0000-0000-0000-0000000000a1', 'admin')$$, '%admin_only%');
update public.market_prices set base_fare = 1;  -- RLS filters this to 0 rows
select t.ok((select base_fare from public.market_prices where market_code = 'nairobi' and ride_type = 'lift') = 100, 'passenger cannot change prices');
update public.markets set commission_percent = 0;  -- RLS filters this to 0 rows
select t.ok((select commission_percent from public.markets where code = 'nairobi') = 15, 'passenger cannot change the market');
select t.expect_error($$insert into public.settings (key, value) values ('x', '1')$$, '%permission denied%');

select t.as_user('00000000-0000-0000-0000-0000000000a2');
select public.choose_role('passenger');
update public.profiles set full_name = 'Paula Two' where id = auth.uid();

-- ===================== DRIVER ONBOARDING =====================
select t.as_user('00000000-0000-0000-0000-0000000000d1');
select public.choose_role('driver');
update public.profiles set full_name = 'Dan Driver' where id = auth.uid();
select t.expect_error($$select public.submit_driver_application()$$, '%missing_personal_details%');
update public.drivers set id_number = '12345678', licence_number = 'DL123', photo_path = '00000000-0000-0000-0000-0000000000d1/photo-1.jpg' where id = auth.uid();
insert into public.vehicles (driver_id, make, model, year, colour, plate) values (auth.uid(), 'Toyota', 'Axio', 2016, 'Silver', 'KDA 123A');
insert into public.driver_documents (driver_id, doc_type, file_path, mime_type)
select auth.uid(), code, auth.uid() || '/' || code || '-1.jpg', 'image/jpeg' from public.document_types where country_iso = 'ke' and code <> 'insurance';
select t.expect_error($$select public.submit_driver_application()$$, '%missing_documents: Insurance%');
insert into public.driver_documents (driver_id, doc_type, file_path, mime_type)
values (auth.uid(), 'insurance', auth.uid() || '/insurance-1.pdf', 'application/pdf');
select public.submit_driver_application();
select t.expect_error($$update public.drivers set status = 'approved' where id = auth.uid()$$, '%permission denied%');
select t.expect_error($$update public.drivers set is_online = true where id = auth.uid()$$, '%permission denied%');
select t.expect_error($$select public.admin_review_driver(auth.uid(), true)$$, '%admin_only%');
select t.expect_error($$select public.set_driver_online(true)$$, '%driver_not_approved%');
-- Storage: own folder ok, another driver's folder blocked
insert into storage.objects (bucket_id, name) values ('driver-documents', '00000000-0000-0000-0000-0000000000d1/photo-1.jpg');

-- a fully-prepared second driver
select t.as_user('00000000-0000-0000-0000-0000000000d2');
select public.choose_role('driver');
update public.profiles set full_name = 'Dora Driver' where id = auth.uid();
update public.drivers set id_number = '87654321', licence_number = 'DL999', photo_path = '00000000-0000-0000-0000-0000000000d2/photo-1.jpg' where id = auth.uid();
insert into public.vehicles (driver_id, make, model, year, colour, plate) values (auth.uid(), 'Mazda', 'Demio', 2017, 'Blue', 'KDB 456B');
insert into public.driver_documents (driver_id, doc_type, file_path, mime_type)
select auth.uid(), code, auth.uid() || '/' || code || '-1.jpg', 'image/jpeg' from public.document_types where country_iso = 'ke';
select public.submit_driver_application();
select t.ok((select count(*) from public.driver_documents) = 5, 'driver 2 sees only own 5 documents');
select t.ok((select count(*) from public.drivers) = 1, 'driver 2 sees only own driver row');
select t.ok((select count(*) from public.vehicles) = 1, 'driver 2 sees only own vehicle');
select t.ok((select count(*) from storage.objects) = 0, 'driver 2 cannot list driver 1 files');
select t.expect_error($$insert into storage.objects (bucket_id, name) values ('driver-documents', '00000000-0000-0000-0000-0000000000d1/national_id-2.jpg')$$, '%row-level security%');
update public.driver_documents set file_path = 'x' where driver_id = '00000000-0000-0000-0000-0000000000d1';  -- RLS: 0 rows
reset role;
select t.ok((select file_path from public.driver_documents where driver_id = '00000000-0000-0000-0000-0000000000d1' and doc_type = 'national_id') not like 'x', 'driver 2 could not change driver 1 docs');
set role authenticated;

select t.as_user('00000000-0000-0000-0000-0000000000d3');
select public.choose_role('driver');

-- ===================== ADMIN APPROVAL =====================
select t.as_user('00000000-0000-0000-0000-0000000000ad');
select t.ok((select count(*) from public.driver_documents) = 10, 'admin sees all documents');
select t.ok((select count(*) from storage.objects) = 1, 'admin can read driver files');
select t.expect_error($$select public.admin_review_driver('00000000-0000-0000-0000-0000000000d2', false, '')$$, '%reason_required%');
select t.expect_error($$select public.admin_review_driver('00000000-0000-0000-0000-0000000000d3', true)$$, '%application_not_submitted%');
select public.admin_review_driver('00000000-0000-0000-0000-0000000000d1', true);
select public.admin_review_driver('00000000-0000-0000-0000-0000000000d2', true);
select t.ok((select count(*) from public.admin_actions where action = 'driver_approved') = 2, 'approvals logged with who + when');
select t.ok((select reviewed_by from public.drivers where id = '00000000-0000-0000-0000-0000000000d1') = '00000000-0000-0000-0000-0000000000ad', 'reviewed_by recorded');

-- approved driver can no longer edit their application
select t.as_user('00000000-0000-0000-0000-0000000000d1');
update public.vehicles set plate = 'HACKED' where driver_id = auth.uid();
reset role;
select t.ok((select plate from public.vehicles where driver_id = '00000000-0000-0000-0000-0000000000d1') = 'KDA 123A', 'approved driver cannot silently change plate');
set role authenticated;

-- ===================== QUOTES (server only) =====================
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.expect_error($$select public.create_quote(auth.uid(), -1.2864, 36.8172, 'CBD', null, -1.3, 36.78, 'Westlands', 5000, 900, null)$$, '%permission denied%');
select t.expect_error($$select public.calculate_fare('nairobi', 'lift', 1000, 60)$$, '%permission denied%');
select t.expect_error($$insert into public.quotes (passenger_id, pickup, pickup_address, dropoff, dropoff_address, distance_m, duration_s, options, currency, expires_at) values (auth.uid(), public.make_point(0,0), 'a', public.make_point(0,0), 'b', 1, 1, '[{"ride_type":"lift","fare":1}]', 'KES', now() + interval '1 hour')$$, '%permission denied%');
reset role;

-- what the get-quote Edge Function does (service role):
select t.ok(public.calculate_fare('nairobi', 'lift', 5000, 900) = 360, 'fare = 100 + 40*5km + 4*15min = 360');
select t.ok(public.calculate_fare('nairobi', 'lift', 500, 60) = 200, 'minimum fare applies');
select t.ok(pg_typeof(public.calculate_fare('nairobi', 'lift_premium', 12345, 1234))::text = 'integer', 'fares are integers');
select t.expect_error($$select public.create_quote('00000000-0000-0000-0000-0000000000a1', -6.7924, 39.2083, 'Dar es Salaam (Tanzania)', null, -1.3, 36.78, 'X', 1, 1, null)$$, '%pickup_outside_service_area%');
create temp table q as
  select * from public.create_quote('00000000-0000-0000-0000-0000000000a1', -1.2864, 36.8172, 'Kenyatta Ave, CBD', 'Near the Shell station',
                                    -1.2676, 36.8108, 'Westlands', 5000, 900, null);
grant select on q to authenticated;

-- ===================== REQUEST + MATCHING =====================
set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000a2');
select t.expect_error($$select public.request_ride((select id from q), 'lift', 'cash')$$, '%quote_not_found%');

select t.as_user('00000000-0000-0000-0000-0000000000a1');
create temp table r1 as select * from public.request_ride((select id from q), 'lift', 'cash');
select t.ok((select status from r1) = 'searching' and (select fare from r1) = 360, 'ride created at quoted price, searching');
select t.expect_error($$select public.request_ride((select id from q), 'lift', 'cash')$$, '%quote_already_used%');
select t.expect_error($$update public.rides set status = 'completed'$$, '%permission denied%');
select t.expect_error($$insert into public.payments (ride_id, method, amount, currency, status) values ((select id from r1), 'mpesa', 1, 'KES', 'paid')$$, '%permission denied%');

-- passenger 2 sees nothing of passenger 1
select t.as_user('00000000-0000-0000-0000-0000000000a2');
select t.ok((select count(*) from public.rides) = 0, 'other passenger cannot see the ride');
select t.ok((select count(*) from public.quotes) = 0, 'other passenger cannot see the quote');
select t.expect_error($$select public.get_ride_details((select id from r1))$$, '%not_your_ride%');

-- drivers go online near the pickup -> get the offer
select t.as_user('00000000-0000-0000-0000-0000000000d1');
select t.ok((select count(*) from public.rides) = 0, 'offline driver sees no rides');
select public.set_driver_online(true);
select public.update_driver_location(-1.2870, 36.8180, 0);
select t.ok((select count(*) from public.rides) = 1, 'online nearby driver 1 sees the offered ride');
select t.as_user('00000000-0000-0000-0000-0000000000d2');
select public.set_driver_online(true);
select public.update_driver_location(-1.2900, 36.8200, 0);
select t.ok((select count(*) from public.ride_offers) = 1, 'driver 2 got an offer too');

-- driver 3 (not approved) cannot accept
select t.as_user('00000000-0000-0000-0000-0000000000d3');
select t.expect_error($$select public.accept_ride((select id from r1))$$, '%driver_not_approved%');
select t.expect_error($$select public.update_driver_location(-1.28, 36.81, 0)$$, '%driver_not_approved%');

-- passenger cannot move the ride forward
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.expect_error($$select public.driver_arrived((select id from r1))$$, '%transition_not_allowed%');
select t.expect_error($$select public.accept_ride((select id from r1))$$, '%driver_not_approved%');

-- ===================== ACCEPT (sequential double-accept) =====================
select t.as_user('00000000-0000-0000-0000-0000000000d1');
select public.accept_ride((select id from r1));
select t.as_user('00000000-0000-0000-0000-0000000000d2');
select t.expect_error($$select public.accept_ride((select id from r1))$$, '%no_offer_for_this_ride%');
select t.ok((select count(*) from public.rides) = 0, 'losing driver no longer sees the ride');

-- passenger sees driver + live location
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.ok((public.get_ride_details((select id from r1)) -> 'driver' ->> 'full_name') = 'Dan Driver', 'passenger sees assigned driver name');
select t.ok((public.get_ride_details((select id from r1)) -> 'driver' -> 'vehicle' ->> 'plate') = 'KDA 123A', 'passenger sees plate');
select t.ok((select count(*) from public.driver_locations) = 1, 'passenger can follow only their driver location');
select t.ok((select count(*) from public.drivers) = 0, 'passenger cannot read driver application rows');
select t.ok((select count(*) from storage.objects) = 1, 'passenger can see their driver photo during the trip');

-- ===================== TRIP =====================
select t.as_user('00000000-0000-0000-0000-0000000000d1');
select t.expect_error($$select public.complete_trip((select id from r1))$$, '%transition_not_allowed%');
select public.driver_arrived((select id from r1));
select t.expect_error($$select public.driver_arrived((select id from r1))$$, '%transition_not_allowed%');
select public.start_trip((select id from r1));
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.expect_error($$select public.cancel_ride((select id from r1), 'changed mind')$$, '%cannot_cancel_during_trip%');
select t.as_user('00000000-0000-0000-0000-0000000000d1');
select public.complete_trip((select id from r1));
reset role;
select t.ok((select platform_commission from public.rides where id = (select id from r1)) = 54, 'commission 15% of 360 = 54');
select t.ok((select driver_earnings from public.rides where id = (select id from r1)) = 306, 'driver earns 306');
select t.ok((select status from public.payments where ride_id = (select id from r1)) = 'pending', 'payment pending at completion');
select t.ok((select string_agg(to_status::text, '>' order by id) from public.ride_events where ride_id = (select id from r1))
             = 'searching>accepted>arrived>in_progress>completed', 'every status change recorded in ride_events');
set role authenticated;

-- only the assigned driver confirms cash
select t.as_user('00000000-0000-0000-0000-0000000000d2');
select t.expect_error($$select public.confirm_cash_payment((select id from r1))$$, '%not_your_ride%');
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.expect_error($$select public.confirm_cash_payment((select id from r1))$$, '%not_your_ride%');
select t.as_user('00000000-0000-0000-0000-0000000000d1');
select public.confirm_cash_payment((select id from r1));
select t.ok((select status from public.payments where ride_id = (select id from r1)) = 'paid', 'cash marked paid by driver');
select t.ok((public.get_driver_earnings() ->> 'total')::int = 306, 'driver earnings come from the database');

-- ratings
select public.rate_ride((select id from r1), 5, 'Lovely passenger');
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.expect_error($$select public.rate_ride((select id from r1), 6, null)$$, '%check constraint%');
select public.rate_ride((select id from r1), 4, 'Good');
select t.as_user('00000000-0000-0000-0000-0000000000a2');
select t.expect_error($$select public.rate_ride((select id from r1), 1, 'spam')$$, '%not_your_ride%');

-- after the trip the passenger can no longer see the driver location or photo
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.ok((select count(*) from public.driver_locations) = 0, 'driver location hidden after trip');
select t.ok((select count(*) from storage.objects) = 0, 'driver photo hidden after trip');

-- support report: only for own rides
insert into public.support_reports (user_id, ride_id, category, message) values (auth.uid(), (select id from r1), 'other', 'Left my umbrella');
select t.as_user('00000000-0000-0000-0000-0000000000a2');
select t.expect_error($$insert into public.support_reports (user_id, ride_id, category, message) values ('00000000-0000-0000-0000-0000000000a1', null, 'other', 'fake')$$, '%row-level security%');
select t.ok((select count(*) from public.support_reports) = 0, 'cannot read others'' reports');

-- ===================== TIMEOUT + CANCEL =====================
reset role;
create temp table q2 as
  select * from public.create_quote('00000000-0000-0000-0000-0000000000a2', -1.2864, 36.8172, 'CBD', null, -1.30, 36.79, 'Kilimani', 4000, 600, null);
grant select on q2 to authenticated;
set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000a2');
create temp table r2 as select * from public.request_ride((select id from q2), 'lift_premium', 'mpesa');
reset role;
-- driver 1 (tier 1 vehicle) must NOT get a premium offer
select t.ok((select count(*) from public.ride_offers where ride_id = (select id from r2)) = 0, 'premium ride not offered to regular-tier car');
update public.rides set search_expires_at = now() - interval '1 second' where id = (select id from r2);
set role authenticated;
select t.ok(public.expire_searching_rides() = 1, 'expired search');
reset role;
select t.ok((select status from public.rides where id = (select id from r2)) = 'no_driver_found', 'ride becomes no_driver_found');

create temp table q3 as
  select * from public.create_quote('00000000-0000-0000-0000-0000000000a2', -1.2864, 36.8172, 'CBD', null, -1.30, 36.79, 'Kilimani', 4000, 600, null);
grant select on q3 to authenticated;
set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000a2');
create temp table r3 as select * from public.request_ride((select id from q3), 'lift', 'cash');
select public.cancel_ride((select id from r3), 'Plans changed');
select t.ok((select status from public.rides where id = (select id from r3)) = 'cancelled', 'cancel while searching');

-- ===================== ADMIN =====================
select t.as_user('00000000-0000-0000-0000-0000000000ad');
select t.ok((select count(*) from public.rides) = 3, 'admin sees all rides');
select t.ok((public.admin_overview() ->> 'collected_total')::int = 360, 'admin overview uses real payments');
update public.market_prices set base_fare = 150 where market_code = 'nairobi' and ride_type = 'lift';
select t.ok((select count(*) from public.admin_actions where action = 'config_updated' and admin_id = auth.uid()) = 1, 'price change is audited (with who made it)');
select public.admin_set_user_suspended('00000000-0000-0000-0000-0000000000a2', true, 'test');
select t.expect_error($$select public.admin_set_role(auth.uid(), 'passenger')$$, '%cannot_change_own_role%');
select t.as_user('00000000-0000-0000-0000-0000000000a2');
select t.expect_error($$select public.choose_role('driver')$$, '%account_suspended%');

-- ===================== ANON =====================
reset role;
grant select on r1 to anon;
set role anon;
select t.as_user(null);
select t.expect_error($$select count(*) from public.profiles$$, '%permission denied%');
select t.expect_error($$select count(*) from public.rides$$, '%permission denied%');
select t.ok(public.get_shared_trip((select share_token from r1)) is null, 'share link shows nothing once the trip is over');

reset role;
\warn 'rls_and_rides.test.sql: ALL PASSED'
