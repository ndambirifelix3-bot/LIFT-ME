-- Lift Me — cancellation fees and promo codes. Runs after driver_wallet (uses its setup: passenger a1, driver d1, admin ad).
\set ON_ERROR_STOP 1
\pset footer off
reset role;
update public.rides set status = 'cancelled' where status in ('searching', 'accepted', 'arrived', 'in_progress');
update public.drivers set is_online = (id = '00000000-0000-0000-0000-0000000000d1'), first_approved_at = now() - interval '1 year';
update public.driver_locations set location = public.make_point(-1.2870, 36.8180), updated_at = now()
 where driver_id = '00000000-0000-0000-0000-0000000000d1';
update public.markets set commission_percent = 15, new_driver_free_days = 0, new_driver_free_trips = 0,
       cancellation_fee = 100, cancellation_free_seconds = 120, no_show_wait_seconds = 300
 where code = 'nairobi';
update public.market_prices set commission_percent = null where market_code = 'nairobi';

-- Helper: passenger a1 books a 'lift' (optionally with a promo code); d1 accepts. Returns the ride id.
create or replace function t.book(p_method text, p_promo text default null, p_accept boolean default true) returns uuid language plpgsql as $$
declare q public.quotes; r public.rides;
begin
  reset role;
  q := public.create_quote('00000000-0000-0000-0000-0000000000a1', -1.2864, 36.8172, 'CBD', null, -1.30, 36.79, 'Kilimani', 5000, 900, null);
  set role authenticated;
  perform t.as_user('00000000-0000-0000-0000-0000000000a1');
  r := public.request_ride(q.id, 'lift', p_method::public.payment_method, p_promo);
  if p_accept then
    perform t.as_user('00000000-0000-0000-0000-0000000000d1');
    perform public.accept_ride(r.id);
  end if;
  reset role;
  return r.id;
end $$;
create or replace function t.as_passenger() returns void language plpgsql as $$
begin set role authenticated; perform t.as_user('00000000-0000-0000-0000-0000000000a1'); end $$;
create or replace function t.as_driver() returns void language plpgsql as $$
begin set role authenticated; perform t.as_user('00000000-0000-0000-0000-0000000000d1'); end $$;

-- ===================== CANCELLATION FEES =====================
-- Cancel within the free period: no fee.
create temp table f1 as select t.book('cash') as id; grant select on f1 to authenticated;
select t.as_passenger();
select public.cancel_ride((select id from f1), 'changed my mind');
reset role;
select t.ok((select cancellation_fee from public.rides where id = (select id from f1)) = 0, 'cancel within 2 minutes: free');
select t.ok(not exists (select 1 from public.payments where ride_id = (select id from f1)), 'no payment for a free cancel');

-- Cancel after the driver has been on the way for 5 minutes: fee (by M-Pesa, the ride was cash).
create temp table f2 as select t.book('cash') as id; grant select on f2 to authenticated;
update public.rides set accepted_at = now() - interval '5 minutes' where id = (select id from f2);
select t.as_passenger();
select public.cancel_ride((select id from f2), 'too slow');
reset role;
select t.ok((select cancellation_fee = 100 and driver_earnings = 85 and platform_commission = 15 from public.rides where id = (select id from f2)),
            'late cancel: KES 100 fee, driver gets 85');
select t.ok((select method::text || '/' || status::text || '/' || amount from public.payments where ride_id = (select id from f2)) = 'mpesa/pending/100',
            'fee is an M-Pesa payment (never cash)');

-- Unpaid fee: no new bookings; can't switch the fee to cash.
select t.expect_error($$select t.book('cash')$$, '%unpaid_cancellation_fee%');
select t.as_passenger();
select t.expect_error($$select public.change_payment_method((select id from f2), 'cash')$$, '%fee_not_cash%');
reset role;

-- Paid: the driver's share lands in Driver money; booking works again.
create temp table bal as select wallet_balance as v from public.drivers where id = '00000000-0000-0000-0000-0000000000d1';
update public.payments set status = 'paid', mpesa_receipt = 'FEE0001', paid_at = now() where ride_id = (select id from f2);
select t.ok((select wallet_balance from public.drivers where id = '00000000-0000-0000-0000-0000000000d1') = (select v from bal) + 85,
            'paid fee: driver credited 85');
create temp table f3 as select t.book('cash') as id; grant select on f3 to authenticated;
select t.ok((select status from public.rides where id = (select id from f3)) = 'accepted', 'can book again once the fee is paid');

-- Driver no-show: only after waiting 5 minutes at the pickup.
select t.as_driver();
select public.driver_arrived((select id from f3));
select t.expect_error($$select public.driver_report_no_show((select id from f3))$$, '%wait_longer%');
reset role;
update public.rides set arrived_at = now() - interval '6 minutes' where id = (select id from f3);
select t.as_driver();
select public.driver_report_no_show((select id from f3));
reset role;
select t.ok((select status = 'cancelled' and cancelled_by = 'driver' and cancellation_fee = 100 from public.rides where id = (select id from f3)),
            'no-show: cancelled by the driver, passenger owes the fee');

-- Admin waives it.
set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.expect_error($$select public.admin_waive_cancellation_fee((select id from f3), 'x')$$, '%admin_only%');
select t.as_user('00000000-0000-0000-0000-0000000000ad');
select public.admin_waive_cancellation_fee((select id from f3), 'Passenger called: driver was at the wrong gate');
reset role;
select t.ok((select cancellation_fee from public.rides where id = (select id from f3)) = 0
            and not exists (select 1 from public.payments where ride_id = (select id from f3)), 'waived: no fee, no payment');

-- Cancelling a search (no driver yet) is always free.
create temp table f4 as select t.book('cash', null, false) as id; grant select on f4 to authenticated;
select t.as_passenger();
select public.cancel_ride((select id from f4), null);
reset role;
select t.ok((select cancellation_fee from public.rides where id = (select id from f4)) = 0, 'cancel while searching: free');

-- ===================== PROMO CODES =====================
set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000ad');
insert into public.promo_codes (code, market_code, description, percent_off, max_discount) values ('HALF', 'nairobi', 'Half price', 50, 100);
insert into public.promo_codes (code, market_code, description, percent_off, max_uses) values ('ONCE', 'nairobi', 'One use only', 10, 1);
insert into public.promo_codes (code, market_code, description, percent_off) values ('FREE', 'nairobi', 'Free ride', 100);
insert into public.promo_codes (code, market_code, description, percent_off, first_ride_only) values ('NEWBIE', 'nairobi', 'First ride', 20, true);
insert into public.promo_codes (code, market_code, description, percent_off) values ('USONLY', 'nyc', 'US code', 20);
insert into public.promo_codes (code, market_code, description, percent_off, ends_at) values ('OLD', 'nairobi', 'Expired', 20, now() - interval '1 day');
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.ok((select count(*) from public.promo_codes) = 0, 'passengers cannot list promo codes');
select t.expect_error($$insert into public.promo_codes (code, market_code, percent_off) values ('HACK', 'nairobi', 100)$$, '%row-level security%');
reset role;

-- Preview + book with a code (lower case works); Lift Me pays the discount.
reset role;
create temp table pq as select (public.create_quote('00000000-0000-0000-0000-0000000000a1', -1.2864, 36.8172, 'CBD', null, -1.30, 36.79, 'Kilimani', 5000, 900, null)).id as id;
grant select on pq to authenticated;
select t.as_passenger();
select t.ok((select (o ->> 'discount')::int from jsonb_array_elements(public.preview_promo((select id from pq), 'half') -> 'options') o
              where o ->> 'ride_type' = 'lift') > 0, 'preview shows the lift discount');
select t.expect_error($$select public.preview_promo((select id from pq), 'NOPE')$$, '%promo_not_found%');
select t.expect_error($$select public.preview_promo((select id from pq), 'OLD')$$, '%promo_expired%');
select t.expect_error($$select public.preview_promo((select id from pq), 'USONLY')$$, '%promo_other_country%');
select t.expect_error($$select public.preview_promo((select id from pq), 'NEWBIE')$$, '%promo_first_ride_only%');
reset role;

create temp table p1 as select t.book('cash', 'half') as id; grant select on p1 to authenticated;
select t.ok((select promo_code = 'HALF' and promo_discount > 0 and promo_discount <= 100 from public.rides where id = (select id from p1)), 'promo applied, capped at 100');
select t.as_driver();
select public.driver_arrived((select id from p1));
select public.start_trip((select id from p1));
select public.complete_trip((select id from p1));
reset role;
select t.ok((select driver_earnings = (fare + promo_discount) - round((fare + promo_discount) * 0.15)
              and platform_commission = round((fare + promo_discount) * 0.15) - promo_discount
             from public.rides where id = (select id from p1)), 'driver earns on the full fare; Lift Me pays the discount');
select t.ok((select amount from public.payments where ride_id = (select id from p1)) = (select fare from public.rides where id = (select id from p1)),
            'passenger pays the discounted fare');
select t.ok((select amount from public.driver_ledger where ride_id = (select id from p1)) = -(select platform_commission from public.rides where id = (select id from p1)),
            'cash trip: ledger settles commission minus discount');
select t.expect_error($$select t.book('cash', 'HALF')$$, '%promo_already_used%');

-- A cancelled ride gives the code back.
create temp table p2 as select t.book('cash', 'ONCE', false) as id; grant select on p2 to authenticated;
select t.as_passenger();
select public.cancel_ride((select id from p2), null);
reset role;
create temp table p3 as select t.book('cash', 'ONCE', false) as id;
grant select on p3 to authenticated;
select t.ok((select promo_code from public.rides where id = (select id from p3)) = 'ONCE', 'cancelled ride frees the code');
select t.as_passenger();
select public.cancel_ride((select id from p3), null);
reset role;

-- 100% off: nothing to collect.
create temp table p4 as select t.book('mpesa', 'FREE') as id; grant select on p4 to authenticated;
select t.as_driver();
select public.driver_arrived((select id from p4));
select public.start_trip((select id from p4));
select public.complete_trip((select id from p4));
reset role;
select t.ok((select fare from public.rides where id = (select id from p4)) = 0, 'free ride: fare 0');
select t.ok((select status from public.payments where ride_id = (select id from p4)) = 'paid', 'free ride: already paid');
select t.ok((select amount from public.driver_ledger where ride_id = (select id from p4)) = (select driver_earnings from public.rides where id = (select id from p4)),
            'free ride: driver still credited their share');

update public.markets set cancellation_fee = 0 where code = 'nairobi';
\warn 'fees_and_promos.test.sql: ALL PASSED'
