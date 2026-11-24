-- Lift Me — card payments (Stripe). Runs after driver_wallet.test.sql (uses its t.trip helper).
\set ON_ERROR_STOP 1
\pset footer off
reset role;
update public.rides set status = 'cancelled' where status in ('searching', 'accepted', 'arrived', 'in_progress');
update public.drivers set is_online = (id = '00000000-0000-0000-0000-0000000000d1');
update public.driver_locations set location = public.make_point(-1.2870, 36.8180), updated_at = now()
 where driver_id = '00000000-0000-0000-0000-0000000000d1';
-- Turn card on for the test market (live: only the US market has it).
update public.markets set payment_methods = array['cash', 'mpesa', 'card']::public.payment_method[] where code = 'nairobi';

-- No saved card: can't book with card.
select t.expect_error($$select t.trip('card')$$, '%no_card%');

-- Saved cards: only the owner (and admins) can see them; nobody can write them from the app.
insert into public.stripe_customers (user_id, customer_id, payment_method_id, card_brand, card_last4, card_exp_month, card_exp_year)
values ('00000000-0000-0000-0000-0000000000a1', 'cus_TEST1', 'pm_TEST1', 'visa', '4242', 12, 2030);
set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.ok((select card_last4 from public.stripe_customers) = '4242', 'passenger sees their own card');
select t.expect_error($$update public.stripe_customers set card_last4 = '0000'$$, '%permission denied%');
select t.expect_error($$insert into public.stripe_customers (user_id, customer_id) values (auth.uid(), 'cus_X')$$, '%permission denied%');
select t.as_user('00000000-0000-0000-0000-0000000000d1');
select t.ok((select count(*) from public.stripe_customers) = 0, 'others cannot see it');
reset role;

-- A card trip: pending card payment at completion, nothing in the driver's wallet until it's paid.
create temp table bal0 as select wallet_balance as v from public.drivers where id = '00000000-0000-0000-0000-0000000000d1';
create temp table k1 as select t.trip('card') as id;
grant select on k1 to authenticated;
select t.ok((select method::text || '/' || status::text from public.payments where ride_id = (select id from k1)) = 'card/pending',
            'card trip: pending card payment created');
select t.ok(not exists (select 1 from public.driver_ledger where ride_id = (select id from k1)), 'no wallet entry before the charge');
update public.payments set status = 'paid', card_brand = 'visa', card_last4 = '4242', stripe_payment_intent_id = 'pi_TEST1', paid_at = now()
 where ride_id = (select id from k1);
select t.ok((select wallet_balance from public.drivers where id = '00000000-0000-0000-0000-0000000000d1')
            = (select v from bal0) + (select driver_earnings from public.rides where id = (select id from k1)),
            'card paid: driver share added to their balance');

-- Retry after a failed charge, or switch to cash.
create temp table k2 as select t.trip('card') as id;
grant select on k2 to authenticated;
update public.payments set status = 'failed', result_desc = 'Your card was declined.' where ride_id = (select id from k2);
set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.ok((public.change_payment_method((select id from k2), 'card')).status = 'pending', 'try again: back to pending');
select t.ok((public.change_payment_method((select id from k2), 'cash')).method = 'cash', 'or switch to cash');
-- A passenger without a card can't switch to card.
reset role;
delete from public.stripe_customers;
set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.expect_error($$select public.change_payment_method((select id from k2), 'card')$$, '%no_card%');
reset role;
update public.markets set payment_methods = array['cash', 'mpesa']::public.payment_method[] where code = 'nairobi';

\warn 'card_payments.test.sql: ALL PASSED'
