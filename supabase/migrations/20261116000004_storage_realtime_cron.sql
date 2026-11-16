-- Lift Me — private document storage, realtime and scheduled jobs.

-- ---------------------------------------------------------------------------
-- PRIVATE bucket for driver documents and photos. 10 MB, images/PDF only.
-- Path layout: <driver_id>/<doc_type>-<timestamp>.<ext>  and  <driver_id>/photo-<timestamp>.jpg
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('driver-documents', 'driver-documents', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy driver_docs_insert_own on storage.objects for insert to authenticated
  with check (
    bucket_id = 'driver-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.driver_can_edit_application())
  );

create policy driver_docs_update_own on storage.objects for update to authenticated
  using (
    bucket_id = 'driver-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.driver_can_edit_application())
  );

create policy driver_docs_delete_own on storage.objects for delete to authenticated
  using (
    bucket_id = 'driver-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.driver_can_edit_application())
  );

-- Read: the driver themself, admins, and (photo only) the passenger on an active ride with that driver.
create policy driver_docs_select on storage.objects for select to authenticated
  using (
    bucket_id = 'driver-documents'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_admin())
      or (
        storage.filename(name) like 'photo-%'
        and exists (
          select 1 from public.rides r
          where r.driver_id::text = (storage.foldername(name))[1]
            and r.passenger_id = (select auth.uid())
            and r.status in ('accepted', 'arrived', 'in_progress')
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime: live ride updates (Realtime respects the RLS policies above).
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.rides, public.ride_offers, public.driver_locations, public.payments;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Scheduled job: mark overdue searches as no_driver_found every minute.
-- (Apps also call expire_searching_rides() when their countdown ends, so
--  passengers see the result within seconds; the job is the safety net.)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('lift-me-expire-searching-rides', '* * * * *', 'select public.expire_searching_rides()');
  end if;
end $$;
