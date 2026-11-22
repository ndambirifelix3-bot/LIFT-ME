-- Lift Me — push notification tests (runs after rls_and_rides.test.sql and markets.test.sql).
-- Those tests already played rides through; here we check which notifications they queued,
-- plus device subscriptions and who can read what.
\set ON_ERROR_STOP 1
\pset footer off

reset role;

-- ===================== MONEY TEXT =====================
select t.ok(public.format_money(1050, 'KES', 0) = 'KES 1,050', 'KES money text');
select t.ok(public.format_money(950, 'USD', 2) = '$9.50', 'USD money text');
select t.ok(public.format_money(123456, 'USD', 2) = '$1,234.56', 'USD thousands');

-- ===================== QUEUED BY THE EARLIER RIDES =====================
select t.ok((select count(*) from public.push_outbox where user_id = '00000000-0000-0000-0000-0000000000d1'
             and title = 'New ride request 🚗' and body like 'Lift · KES 360 · Pickup: Kenyatta Ave, CBD%') >= 1,
            'driver 1 was told about the new request: ride type, fare and pickup');
select t.ok((select count(*) from public.push_outbox where user_id = '00000000-0000-0000-0000-0000000000d2' and title = 'New ride request 🚗') >= 1,
            'driver 2 was told too');
select t.ok((select body from public.push_outbox where user_id = '00000000-0000-0000-0000-0000000000a1'
             and title = 'Your driver is on the way' order by id limit 1) = 'Dan · Silver Toyota Axio · KDA 123A',
            'passenger told who is coming: name, car and plate');
select t.ok(exists (select 1 from public.push_outbox where user_id = '00000000-0000-0000-0000-0000000000a1' and title = 'Your driver has arrived'),
            'passenger told the driver arrived');
select t.ok((select body from public.push_outbox where user_id = '00000000-0000-0000-0000-0000000000a1' and title = 'You have arrived ✅' order by id limit 1)
             like 'Trip total KES 360.%', 'passenger told the trip total in KES');
select t.ok(exists (select 1 from public.push_outbox where user_id = '00000000-0000-0000-0000-0000000000a2' and title = 'No driver found'),
            'passenger told when no driver was found');
select t.ok((select count(*) from public.push_outbox where title = 'You''re approved! 🎉'
             and user_id in ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2')) = 2,
            'both approved drivers were told');
select t.ok((select body from public.push_outbox where user_id = '00000000-0000-0000-0000-0000000000b1' and title = 'You have arrived ✅' order by id limit 1)
             like 'Trip total $9.50.%', 'US passenger told the total in dollars');
select t.ok(not exists (select 1 from public.push_outbox where title = 'Ride cancelled' or title = 'Your ride was cancelled'),
            'a passenger cancelling a search (no driver yet) notifies nobody');
select t.ok(not exists (select 1 from public.push_outbox where title like 'Payment received%'), 'cash confirmations send no payment push');

-- An M-Pesa payment arriving tells the driver.
update public.rides set payment_method = 'mpesa' where id = (select ride_id from public.payments order by created_at limit 1);
update public.payments set method = 'mpesa', status = 'pending' where id = (select id from public.payments order by created_at limit 1);
update public.payments set status = 'paid', mpesa_receipt = 'TEST123ABC', paid_at = now() where id = (select id from public.payments order by created_at limit 1);
select t.ok((select body from public.push_outbox where title = 'Payment received 💰' order by id desc limit 1) = 'KES 360 by M-Pesa · TEST123ABC',
            'driver told about the M-Pesa payment');

-- Without the send function configured (local test), rows are only queued, never sent.
select t.ok((select count(*) from public.push_outbox where sent_at is not null) = 0, 'nothing marked sent without the send function');

-- ===================== DEVICES =====================
set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select public.save_push_subscription('https://push.example.com/device-1', 'key-1', 'auth-1', 'Test phone');
select public.save_push_subscription('https://push.example.com/device-1', 'key-1b', 'auth-1b', 'Test phone');
select t.ok((select count(*) from public.push_subscriptions) = 1 and (select p256dh from public.push_subscriptions) = 'key-1b',
            'saving the same device again updates it');
select t.expect_error($$insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values (auth.uid(), 'https://x.example/2', 'k', 'a')$$, '%permission denied%');
select t.expect_error($$select public.save_push_subscription('http://not-https.example', 'k', 'a', null)$$, '%check constraint%');
select t.ok((select count(*) from public.push_outbox) = 0, 'a passenger cannot read the notification log');
select t.expect_error($$select * from public.push_config$$, '%permission denied%');
select t.expect_error($$select public.push_notify(auth.uid(), 'x', 'y')$$, '%permission denied%');

-- Another person signs in on the same phone: the device moves to them.
select t.as_user('00000000-0000-0000-0000-0000000000d1');
select t.ok((select count(*) from public.push_subscriptions) = 0, 'cannot see other people''s devices');
select public.remove_push_subscription('https://push.example.com/device-1');  -- not theirs: does nothing
reset role;
select t.ok((select count(*) from public.push_subscriptions) = 1, 'cannot remove someone else''s device');
set role authenticated;
select public.save_push_subscription('https://push.example.com/device-1', 'key-2', 'auth-2', 'Test phone');
reset role;
select t.ok((select user_id from public.push_subscriptions where endpoint = 'https://push.example.com/device-1') = '00000000-0000-0000-0000-0000000000d1',
            'device now belongs to whoever signed in on it');
set role authenticated;
select public.remove_push_subscription('https://push.example.com/device-1');
reset role;
select t.ok((select count(*) from public.push_subscriptions) = 0, 'owner can turn notifications off');

set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000ad');
select t.ok((select count(*) from public.push_outbox) > 5, 'admin can read the notification log');
reset role;

-- ===================== MARKET CENTRES (address search bias) =====================
reset role;
select t.ok((select round(lat::numeric, 1) from public.market_centers() where code = 'nairobi') = -1.3
            and (select round(lng::numeric, 1) from public.market_centers() where code = 'nairobi') = 36.8, 'Kenya search centre is Nairobi');
-- (markets.test.sql switches the US market off, so check its stored centre directly.)
select t.ok((select round(center_lat::numeric, 1) from public.markets where code = 'indianapolis') = 41.7
            and (select round(center_lng::numeric, 1) from public.markets where code = 'indianapolis') = -86.3, 'US search centre is South Bend, Indiana');
set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.expect_error($$select * from public.market_centers()$$, '%permission denied%');
reset role;
\warn 'push.test.sql: ALL PASSED'
