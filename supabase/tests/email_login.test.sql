-- Lift Me — email logins, contact phone, and a driver's country from it. Runs after the other SQL tests.
\set ON_ERROR_STOP 1
\pset footer off
reset role;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'Rider.One@Example.com'),   -- passenger by email
  ('00000000-0000-0000-0000-0000000000f2', 'driver.two@example.com');  -- driver by email

select t.ok((select email from public.profiles where id = '00000000-0000-0000-0000-0000000000f1') = 'rider.one@example.com',
            'email login creates a profile with the (lower-case) email');
select t.ok((select phone from public.profiles where id = '00000000-0000-0000-0000-0000000000f1') is null, 'no phone yet');

set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000f2');
select public.choose_role('driver');
select t.ok((select market_code from public.drivers where id = auth.uid()) is null, 'email driver has no country yet');
select t.expect_error($$select public.set_my_contact_phone('0712345678')$$, '%invalid_phone%');
select t.expect_error($$select public.set_my_contact_phone('+447700900123')$$, '%phone_country_not_served%');
select public.set_my_contact_phone('+254712345001');
select t.ok((select phone from public.profiles where id = auth.uid()) = '+254712345001', 'contact phone saved');
select t.ok((select market_code from public.drivers where id = auth.uid()) = 'nairobi', 'driver country set from the phone (Kenya)');
-- Can't change your own profile phone directly.
select t.expect_error($$update public.profiles set phone = '+15745550199' where id = auth.uid()$$, '%permission denied%');

-- Someone who logs in with a phone can't replace it with a contact phone.
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.expect_error($$select public.set_my_contact_phone('+254712345002')$$, '%phone_is_login_phone%');

-- Adding an email to a phone account (and changing it) updates the profile.
reset role;
update auth.users set email = 'Passenger.A1@example.com' where id = '00000000-0000-0000-0000-0000000000a1';
select t.ok((select email from public.profiles where id = '00000000-0000-0000-0000-0000000000a1') = 'passenger.a1@example.com',
            'adding an email to a phone account is mirrored on the profile');
select t.ok((select phone from public.profiles where id = '00000000-0000-0000-0000-0000000000a1') is not null, 'the login phone is kept');

\warn 'email_login.test.sql: ALL PASSED'
