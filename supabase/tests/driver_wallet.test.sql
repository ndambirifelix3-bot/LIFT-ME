-- Lift Me — driver money (wallet / ledger). Runs after the other SQL tests.
-- Uses passenger a1, drivers d1/d2 and admin "ad" from rls_and_rides.test.sql. Nairobi debt limit: KES 1,000.
\set ON_ERROR_STOP 1
\pset footer off

reset role;
-- Clean slate: no trips in progress; only d1 online (a "lift" car next to the CBD).
update public.rides set status = 'cancelled' where status in ('searching', 'accepted', 'arrived', 'in_progress');
update public.vehicles set ride_type = 'lift' where driver_id = '00000000-0000-0000-0000-0000000000d1';
update public.drivers set is_online = (id = '00000000-0000-0000-0000-0000000000d1');
update public.driver_locations set location = public.make_point(-1.2870, 36.8180), updated_at = now()
 where driver_id = '00000000-0000-0000-0000-0000000000d1';

create or replace function t.d1_balance() returns integer language sql security definer as
  $$ select wallet_balance from public.drivers where id = '00000000-0000-0000-0000-0000000000d1' $$;
grant execute on function t.d1_balance() to authenticated;

-- Earlier tests' cash trip (KES 360, 15%) was charged automatically when it completed.
select t.ok((select amount from public.driver_ledger where driver_id = '00000000-0000-0000-0000-0000000000d1'
              and kind = 'cash_commission' order by id limit 1) = -54, 'cash trip: driver owes the 54 commission');
select t.ok(not exists (select 1 from public.drivers d
                         where d.wallet_balance <> coalesce((select sum(amount) from public.driver_ledger l where l.driver_id = d.id), 0)),
            'every balance equals the sum of its entries');

-- Helper: a full trip by d1 for passenger a1. Returns the ride id.
create or replace function t.trip(p_method text) returns uuid language plpgsql as $$
declare q public.quotes; r public.rides;
begin
  reset role;
  q := public.create_quote('00000000-0000-0000-0000-0000000000a1', -1.2864, 36.8172, 'CBD', null, -1.30, 36.79, 'Kilimani', 5000, 900, null);
  set role authenticated;
  perform t.as_user('00000000-0000-0000-0000-0000000000a1');
  r := public.request_ride(q.id, 'lift', p_method::public.payment_method);
  perform t.as_user('00000000-0000-0000-0000-0000000000d1');
  perform public.accept_ride(r.id);
  perform public.driver_arrived(r.id);
  perform public.start_trip(r.id);
  perform public.complete_trip(r.id);
  reset role;
  return r.id;
end $$;

-- ===================== M-PESA TRIP: Lift Me owes the driver their share =====================
create temp table b0 as select t.d1_balance() as v;
create temp table m1 as select t.trip('mpesa') as id;
grant select on m1 to authenticated;
select t.ok(not exists (select 1 from public.driver_ledger where ride_id = (select id from m1)),
            'M-Pesa trip not paid yet: no entry');
update public.payments set status = 'paid', mpesa_receipt = 'TESTWALLET1', paid_at = now() where ride_id = (select id from m1);
select t.ok(t.d1_balance() = (select v from b0) + (select driver_earnings from public.rides where id = (select id from m1)),
            'M-Pesa paid: driver share added to their balance');
update public.payments set status = 'paid' where ride_id = (select id from m1);
select t.ok((select count(*) from public.driver_ledger where ride_id = (select id from m1)) = 1, 'no double entry');

-- ===================== CASH TRIP: commission owed at completion =====================
create temp table b1 as select t.d1_balance() as v;
create temp table c1 as select t.trip('cash') as id;
grant select on c1 to authenticated;
select t.ok(t.d1_balance() = (select v from b1) - (select platform_commission from public.rides where id = (select id from c1)),
            'cash trip: commission charged as soon as the trip completes (even before "cash received")');
set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000d1');
select public.confirm_cash_payment((select id from c1));
reset role;
select t.ok((select count(*) from public.driver_ledger where ride_id = (select id from c1)) = 1, 'confirming cash does not charge twice');

-- ===================== WHO CAN SEE / WRITE =====================
set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000d1');
select t.ok((select count(*) from public.driver_ledger) >= 3, 'driver sees their own entries');
select t.ok((public.get_my_wallet() ->> 'balance')::int = t.d1_balance(), 'driver wallet shows their balance');
select t.ok((public.get_my_wallet() ->> 'currency') = 'KES' and (public.get_my_wallet() ->> 'debt_limit')::int = 1000, 'wallet has currency and limit');
select t.expect_error($$insert into public.driver_ledger (driver_id, kind, amount, currency, note) values (auth.uid(), 'adjustment', 99999, 'KES', 'free money')$$, '%permission denied%');
select t.expect_error($$update public.drivers set wallet_balance = 99999 where id = auth.uid()$$, '%permission denied%');
select t.expect_error($$select public.admin_record_driver_money(auth.uid(), 'adjustment', 99999, null, 'free money')$$, '%admin_only%');
select t.as_user('00000000-0000-0000-0000-0000000000d2');
select t.ok((select count(*) from public.driver_ledger where driver_id = '00000000-0000-0000-0000-0000000000d1') = 0, 'other drivers cannot see it');
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.ok((select count(*) from public.driver_ledger) = 0, 'passengers cannot see it');
select t.expect_error($$select public.get_my_wallet()$$, '%not_a_driver%');

-- ===================== OVER THE LIMIT =====================
select t.as_user('00000000-0000-0000-0000-0000000000ad');
select t.expect_error($$select public.admin_record_driver_money('00000000-0000-0000-0000-0000000000d1', 'adjustment', -100, null, '  ')$$, '%reason_required%');
select public.admin_record_driver_money('00000000-0000-0000-0000-0000000000d1', 'adjustment', -(t.d1_balance() + 1500), null, 'Test: unpaid commission');
reset role;
select t.ok(t.d1_balance() = -1500, 'driver now owes KES 1,500 (limit 1,000)');
select t.ok(not (select is_online from public.drivers where id = '00000000-0000-0000-0000-0000000000d1'), 'over the limit: taken offline');
select t.ok((select title from public.push_outbox where user_id = '00000000-0000-0000-0000-0000000000d1' order by id desc limit 1)
            = 'Please pay your Lift Me balance', 'driver is told to pay');
set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000d1');
select t.expect_error($$select public.set_driver_online(true)$$, '%balance_due%');
select t.ok((public.get_my_wallet() ->> 'over_limit')::boolean, 'wallet says over the limit');
-- Even if they were online somehow, they get no requests.
reset role;
update public.drivers set is_online = true where id = '00000000-0000-0000-0000-0000000000d1';
create temp table q9 as
  select * from public.create_quote('00000000-0000-0000-0000-0000000000a1', -1.2864, 36.8172, 'CBD', null, -1.30, 36.79, 'Kilimani', 4000, 600, null);
grant select on q9 to authenticated;
set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000a1');
create temp table r9 as select * from public.request_ride((select id from q9), 'lift', 'cash');
reset role;
select t.ok(not exists (select 1 from public.ride_offers where ride_id = (select id from r9)), 'over the limit: no ride offers');
update public.rides set status = 'cancelled' where id = (select id from r9);

-- ===================== DRIVER PAYS =====================
set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000ad');
select t.expect_error($$select public.admin_record_driver_money('00000000-0000-0000-0000-0000000000d1', 'driver_payment', 2000, 'QX1', null)$$, '%payment_more_than_owed%');
select t.expect_error($$select public.admin_record_driver_money('00000000-0000-0000-0000-0000000000d1', 'payout', 100, null, null)$$, '%payout_more_than_owed%');
select public.admin_record_driver_money('00000000-0000-0000-0000-0000000000d1', 'driver_payment', 1500, 'QX12345', 'Paid by M-Pesa');
reset role;
select t.ok(t.d1_balance() = 0, 'paid in full: balance 0');
select t.ok((select body from public.push_outbox where user_id = '00000000-0000-0000-0000-0000000000d1' order by id desc limit 1)
            like '%You can go online again.', 'driver told they can go online again');
set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000d1');
select public.set_driver_online(true);

-- ===================== PAYOUT =====================
select t.as_user('00000000-0000-0000-0000-0000000000ad');
select public.admin_record_driver_money('00000000-0000-0000-0000-0000000000d1', 'adjustment', 500, null, 'Test: weekly bonus');
select t.expect_error($$select public.admin_record_driver_money('00000000-0000-0000-0000-0000000000d1', 'payout', 600, null, null)$$, '%payout_more_than_owed%');
select public.admin_record_driver_money('00000000-0000-0000-0000-0000000000d1', 'payout', 500, 'QP777', null);
select t.ok((select balance from public.admin_driver_balances('nairobi') where driver_id = '00000000-0000-0000-0000-0000000000d1') = 0,
            'admin list shows the driver settled');
select t.ok((select count(*) from public.admin_actions where action like 'driver_money_%' and admin_id = auth.uid()) = 4, 'every successful money action logged (failed attempts are not)');
reset role;
select t.ok((select title from public.push_outbox where user_id = '00000000-0000-0000-0000-0000000000d1' order by id desc limit 1) = 'Payout sent 💸',
            'driver told about the payout');
select t.ok((select balance_after from public.driver_ledger where driver_id = '00000000-0000-0000-0000-0000000000d1' order by id desc limit 1) = 0,
            'each entry keeps the running balance');
select t.expect_error($$update public.driver_ledger set amount = 1 where id = (select max(id) from public.driver_ledger)$$, '%ledger_entries_are_permanent%');
select t.expect_error($$delete from public.driver_ledger$$, '%ledger_entries_are_permanent%');
select t.ok(not exists (select 1 from public.drivers d
                         where d.wallet_balance <> coalesce((select sum(amount) from public.driver_ledger l where l.driver_id = d.id), 0)),
            'balances still equal the sum of entries');

\warn 'driver_wallet.test.sql: ALL PASSED'
