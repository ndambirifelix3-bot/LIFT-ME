-- Lift Me — drivers paying their balance with M-Pesa.
\set ON_ERROR_STOP 1
\pset footer off
reset role;
create temp table b0 as select wallet_balance as v from public.drivers where id = '00000000-0000-0000-0000-0000000000d1';
insert into public.driver_mpesa_payments (id, driver_id, amount, phone, checkout_request_id)
values ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-0000000000d1', 200, '254700000011', 'ws_CO_DRIVER_1');

set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000d1');
select t.ok((select count(*) from public.driver_mpesa_payments) = 1, 'driver sees their own M-Pesa payment');
select t.expect_error($$update public.driver_mpesa_payments set status = 'paid'$$, '%permission denied%');
select t.ok((public.get_my_wallet() ->> 'can_pay_mpesa')::boolean, 'Kenya driver can pay by M-Pesa');
select t.as_user('00000000-0000-0000-0000-0000000000d2');
select t.ok((select count(*) from public.driver_mpesa_payments) = 0, 'other drivers cannot see it');
reset role;

update public.driver_mpesa_payments set updated_at = now() - interval '3 minutes' where id = '00000000-0000-0000-0000-00000000aa01';
select t.ok(exists (select 1 from public.driver_mpesa_to_recheck()), 'waiting driver payment gets re-checked');

update public.driver_mpesa_payments set status = 'paid', mpesa_receipt = 'TESTDRV001', paid_at = now() where id = '00000000-0000-0000-0000-00000000aa01';
select t.ok((select wallet_balance from public.drivers where id = '00000000-0000-0000-0000-0000000000d1') = (select v from b0) + 200,
            'paid: balance goes up by 200');
select t.ok((select reference from public.driver_ledger where driver_id = '00000000-0000-0000-0000-0000000000d1' order by id desc limit 1) = 'TESTDRV001',
            'ledger entry carries the M-Pesa receipt');
update public.driver_mpesa_payments set status = 'paid', updated_at = now() where id = '00000000-0000-0000-0000-00000000aa01';
select t.ok((select wallet_balance from public.drivers where id = '00000000-0000-0000-0000-0000000000d1') = (select v from b0) + 200, 'credited only once');
select t.ok(not exists (select 1 from public.driver_mpesa_to_recheck()), 'paid: no more re-checks');
select public.mpesa_recheck_dispatch();
\warn 'driver_mpesa.test.sql: ALL PASSED'
