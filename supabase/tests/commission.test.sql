-- Lift Me — commission per ride type + launch offer for new drivers. Runs after driver_wallet (uses t.trip).
\set ON_ERROR_STOP 1
\pset footer off
reset role;
update public.rides set status = 'cancelled' where status in ('searching', 'accepted', 'arrived', 'in_progress');
update public.drivers set is_online = (id = '00000000-0000-0000-0000-0000000000d1'), wallet_balance = wallet_balance;
update public.driver_locations set location = public.make_point(-1.2870, 36.8180), updated_at = now()
 where driver_id = '00000000-0000-0000-0000-0000000000d1';
update public.markets set commission_percent = 15, new_driver_free_days = 0, new_driver_free_trips = 0 where code = 'nairobi';

-- Ride type rate beats the market rate.
update public.market_prices set commission_percent = 12 where market_code = 'nairobi' and ride_type = 'lift';
create temp table c1 as select t.trip('cash') as id;
select t.ok((select commission_percent from public.rides where id = (select id from c1)) = 12, 'lift uses its own 12%');
select t.ok((select platform_commission from public.rides where id = (select id from c1))
            = round((select fare from public.rides where id = (select id from c1)) * 0.12), 'commission = 12% of the fare');
update public.market_prices set commission_percent = null where market_code = 'nairobi' and ride_type = 'lift';
create temp table c2 as select t.trip('cash') as id;
select t.ok((select commission_percent from public.rides where id = (select id from c2)) = 15, 'empty = market 15%');

-- Launch offer by trips: the next trip is free, the one after is charged.
update public.markets set new_driver_free_trips =
  (select count(*) from public.rides where driver_id = '00000000-0000-0000-0000-0000000000d1' and status = 'completed') + 1
 where code = 'nairobi';
create temp table w1 as select t.trip('cash') as id;
select t.ok((select commission_waived and platform_commission = 0 and driver_earnings = fare from public.rides where id = (select id from w1)),
            'launch offer: no commission, driver keeps the whole fare');
select t.ok(not exists (select 1 from public.driver_ledger where ride_id = (select id from w1)), 'nothing owed for the free cash trip');
create temp table w2 as select t.trip('cash') as id;
select t.ok((select not commission_waived and platform_commission > 0 from public.rides where id = (select id from w2)), 'offer used up: charged again');

-- Launch offer by days.
update public.markets set new_driver_free_trips = 0, new_driver_free_days = 30 where code = 'nairobi';
update public.drivers set first_approved_at = now() - interval '5 days' where id = '00000000-0000-0000-0000-0000000000d1';
create temp table w3 as select t.trip('cash') as id;
select t.ok((select commission_waived from public.rides where id = (select id from w3)), 'day 5 of 30: free');
update public.drivers set first_approved_at = now() - interval '31 days' where id = '00000000-0000-0000-0000-0000000000d1';
create temp table w4 as select t.trip('cash') as id;
select t.ok((select not commission_waived from public.rides where id = (select id from w4)), 'day 31: charged');

-- The driver sees the offer.
update public.drivers set first_approved_at = now() where id = '00000000-0000-0000-0000-0000000000d1';
set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000d1');
select t.ok((public.get_my_wallet() -> 'launch_offer' ->> 'active')::boolean, 'wallet shows the launch offer');
select t.expect_error($$select public.driver_launch_offer(auth.uid(), 'nairobi')$$, '%permission denied%');
reset role;

-- First approval is remembered; re-approval doesn't restart the offer.
update public.drivers set first_approved_at = null, status = 'pending' where id = '00000000-0000-0000-0000-0000000000d2';
update public.drivers set status = 'approved' where id = '00000000-0000-0000-0000-0000000000d2';
select t.ok((select first_approved_at is not null from public.drivers where id = '00000000-0000-0000-0000-0000000000d2'), 'approval starts the clock');
update public.drivers set first_approved_at = now() - interval '40 days' where id = '00000000-0000-0000-0000-0000000000d2';
update public.drivers set status = 'suspended' where id = '00000000-0000-0000-0000-0000000000d2';
update public.drivers set status = 'approved' where id = '00000000-0000-0000-0000-0000000000d2';
select t.ok((select first_approved_at < now() - interval '39 days' from public.drivers where id = '00000000-0000-0000-0000-0000000000d2'), 're-approval keeps the date');

update public.markets set commission_percent = 15, new_driver_free_days = 0, new_driver_free_trips = 0 where code = 'nairobi';
\warn 'commission.test.sql: ALL PASSED'
