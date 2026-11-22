-- Lift Me — set drivers offline automatically when their app stops sending location.
--
-- The web app can't send location while it's closed, locked or in the background (especially on
-- iPhone). A driver who leaves Lift Me while "Online" would silently miss every request, and the
-- online-driver count would be wrong. Every minute, online drivers with no active trip whose app has
-- been quiet for `auto_offline_seconds` (default 150 s ≈ 2½ minutes) are switched offline and told why.
-- Drivers on a trip are left alone.

insert into public.settings (key, value, description) values
  ('auto_offline_seconds', '150', 'Online drivers whose app sends no location for this long (and are not on a trip) are set offline')
on conflict (key) do nothing;

create or replace function public.auto_offline_quiet_drivers()
returns integer
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_id uuid; v_count integer := 0;
  v_quiet interval := make_interval(secs => coalesce(public.setting_int('auto_offline_seconds'), 150));
begin
  for v_id in
    update public.drivers d set is_online = false
     where d.is_online
       -- "Going online" counts as a sign of life too (last_seen), so a driver isn't switched off before
       -- their first location arrives.
       and greatest(d.last_seen, (select l.updated_at from public.driver_locations l where l.driver_id = d.id))
           < now() - v_quiet
       and not exists (select 1 from public.rides r where r.driver_id = d.id
                        and r.status in ('accepted', 'arrived', 'in_progress'))
    returning d.id
  loop
    v_count := v_count + 1;
    perform public.push_notify(v_id, 'You''re now offline',
      'Lift Me was closed, so we stopped sending you requests. Open Lift Me to go online again.',
      '/driver', 'online-status');
  end loop;
  return v_count;
end $$;

revoke all on function public.auto_offline_quiet_drivers() from public, anon, authenticated;
grant execute on function public.auto_offline_quiet_drivers() to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('lift-me-auto-offline-quiet-drivers', '* * * * *', 'select public.auto_offline_quiet_drivers()');
  end if;
end $$;
