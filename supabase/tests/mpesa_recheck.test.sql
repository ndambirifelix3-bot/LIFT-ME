-- Lift Me — M-Pesa payments left waiting get re-checked.
\set ON_ERROR_STOP 1
\pset footer off
reset role;
create temp table mp as select t.trip('mpesa') as id;
update public.payments set mpesa_checkout_request_id = 'ws_CO_TEST_1', updated_at = now() where ride_id = (select id from mp);
select t.ok(not exists (select 1 from public.mpesa_payments_to_recheck() where ride_id = (select id from mp)), 'just sent: give Safaricom time');
update public.payments set updated_at = now() - interval '3 minutes' where ride_id = (select id from mp);
select t.ok(exists (select 1 from public.mpesa_payments_to_recheck() where ride_id = (select id from mp)), 'waiting 3 minutes: re-check');
update public.payments set mpesa_checked_at = now() where ride_id = (select id from mp);
select t.ok(not exists (select 1 from public.mpesa_payments_to_recheck() where ride_id = (select id from mp)), 'checked a moment ago: wait a minute');
update public.payments set mpesa_checked_at = now() - interval '2 minutes', status = 'paid' where ride_id = (select id from mp);
select t.ok(not exists (select 1 from public.mpesa_payments_to_recheck() where ride_id = (select id from mp)), 'paid: never re-checked');
select public.mpesa_recheck_dispatch();  -- no pg_net locally: must not fail
set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.expect_error($$select * from public.mpesa_payments_to_recheck()$$, '%permission denied%');
reset role;
\warn 'mpesa_recheck.test.sql: ALL PASSED'
