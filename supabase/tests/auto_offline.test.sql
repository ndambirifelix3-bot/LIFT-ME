-- Lift Me — drivers whose app goes quiet are set offline (not during a trip). Runs after the other SQL tests.
\set ON_ERROR_STOP 1
\pset footer off
reset role;
update public.rides set status = 'cancelled' where status in ('searching', 'accepted', 'arrived', 'in_progress');
update public.drivers set is_online = true, last_seen = now() - interval '10 minutes'
 where id in ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2');
-- d1: app quiet for 10 minutes. d2: sent a location just now.
update public.driver_locations set updated_at = now() - interval '10 minutes' where driver_id = '00000000-0000-0000-0000-0000000000d1';
update public.driver_locations set updated_at = now() where driver_id = '00000000-0000-0000-0000-0000000000d2';

select t.ok(public.auto_offline_quiet_drivers() >= 1, 'quiet drivers switched off');
select t.ok(not (select is_online from public.drivers where id = '00000000-0000-0000-0000-0000000000d1'), 'd1 (quiet) is offline');
select t.ok((select is_online from public.drivers where id = '00000000-0000-0000-0000-0000000000d2'), 'd2 (sending location) stays online');
select t.ok((select title from public.push_outbox where user_id = '00000000-0000-0000-0000-0000000000d1' order by id desc limit 1) = 'You''re now offline',
            'd1 is told why');

-- Just went online: no location yet, but last_seen is fresh -> not switched off.
update public.drivers set is_online = true, last_seen = now() where id = '00000000-0000-0000-0000-0000000000d1';
select public.auto_offline_quiet_drivers();
select t.ok((select is_online from public.drivers where id = '00000000-0000-0000-0000-0000000000d1'), 'a driver who just went online is left alone');

-- On a trip: never switched off, even if quiet.
update public.drivers set last_seen = now() - interval '10 minutes' where id = '00000000-0000-0000-0000-0000000000d1';
create temp table q as
  select * from public.create_quote('00000000-0000-0000-0000-0000000000a1', -1.2864, 36.8172, 'CBD', null, -1.30, 36.79, 'Kilimani', 4000, 600, null);
update public.driver_locations set updated_at = now() where driver_id = '00000000-0000-0000-0000-0000000000d1';
grant select on q to authenticated;
set role authenticated;
select t.as_user('00000000-0000-0000-0000-0000000000a1');
create temp table r as select * from public.request_ride((select id from q), 'lift', 'cash');
select t.as_user('00000000-0000-0000-0000-0000000000d1');
select public.accept_ride((select id from r));
reset role;
update public.driver_locations set updated_at = now() - interval '10 minutes' where driver_id = '00000000-0000-0000-0000-0000000000d1';
select public.auto_offline_quiet_drivers();
select t.ok((select is_online from public.drivers where id = '00000000-0000-0000-0000-0000000000d1'), 'a driver on a trip is never switched off');
update public.rides set status = 'cancelled' where id = (select id from r);

\warn 'auto_offline.test.sql: ALL PASSED'
