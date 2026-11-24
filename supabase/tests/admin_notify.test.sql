-- Lift Me — admin emails for new driver applications and help reports. Runs after the other SQL tests.
\set ON_ERROR_STOP 1
\pset footer off
reset role;
delete from public.admin_email_outbox;

-- A driver (re)submits: simulate the submit step directly.
update public.drivers set submitted_at = null where id = '00000000-0000-0000-0000-0000000000e2';
update public.drivers set submitted_at = now() where id = '00000000-0000-0000-0000-0000000000e2';
select t.ok((select count(*) from public.admin_email_outbox where kind = 'driver_application') = 1, 'driver application -> one admin email');
select t.ok((select payload ->> 'ride_type' from public.admin_email_outbox where kind = 'driver_application') = 'Boda',
            'the email names the vehicle type');
select t.ok((select payload ->> 'market' from public.admin_email_outbox where kind = 'driver_application') = 'Kenya', 'and the country');
-- Saving other fields doesn't send another one.
update public.drivers set licence_number = 'A2' where id = '00000000-0000-0000-0000-0000000000e2';
select t.ok((select count(*) from public.admin_email_outbox where kind = 'driver_application') = 1, 'no duplicate email for other edits');

-- A help report.
set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000a1');
insert into public.support_reports (user_id, category, message) values (auth.uid(), 'safety', 'Driver was speeding');
select t.ok((select count(*) from public.admin_email_outbox) = 0, 'passengers see none of the admin emails');
reset role;
select t.ok((select payload ->> 'category' from public.admin_email_outbox where kind = 'support_report') = 'safety', 'help report -> admin email');

-- Only admins can read the outbox and send a test.
set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.expect_error($$select public.admin_send_test_email()$$, '%admin_only%');
select t.as_user('00000000-0000-0000-0000-0000000000ad');
select public.admin_send_test_email();
select t.ok((select count(*) from public.admin_email_outbox) = 3, 'admin sees all admin emails (incl. the test)');
reset role;
select t.ok((select value ->> 0 from public.settings where key = 'admin_notify_emails') = 'support@rideliftme.com', 'default recipient');

\warn 'admin_notify.test.sql: ALL PASSED'
