-- Lift Me — a driver application needs a phone number (passengers call the driver; it also sets the
-- driver's country). Drivers who log in by email add it as their contact phone.
create or replace function public.submit_driver_application()
returns public.drivers
language plpgsql security definer set search_path = public, pg_temp
as $$
declare d public.drivers; v_missing text;
begin
  perform public.assert_active_user();
  select * into d from public.drivers where id = auth.uid() for update;
  if d.id is null then raise exception 'not_a_driver' using errcode = '42501'; end if;
  if d.status not in ('pending', 'rejected') then raise exception 'cannot_submit_in_status_%', d.status; end if;
  if coalesce((select full_name from public.profiles where id = d.id), '') = '' then raise exception 'missing_name'; end if;
  if coalesce((select phone from public.profiles where id = d.id), '') = '' then raise exception 'missing_phone'; end if;
  if d.market_code is null then raise exception 'driver_market_required'; end if;
  if d.id_number is null or d.licence_number is null then raise exception 'missing_personal_details'; end if;
  if d.photo_path is null then raise exception 'missing_photo'; end if;
  if not exists (select 1 from public.vehicles where driver_id = d.id) then raise exception 'missing_vehicle'; end if;
  select string_agg(t.name, ', ' order by t.sort_order) into v_missing
    from public.required_document_types_for(d.id) t
   where not exists (select 1 from public.driver_documents dd where dd.driver_id = d.id and dd.doc_type = t.code);
  if v_missing is not null then raise exception 'missing_documents: %', v_missing; end if;

  update public.drivers
     set status = 'pending', submitted_at = now(), reject_reason = null, reviewed_by = null, reviewed_at = null
   where id = d.id returning * into d;
  return d;
end $$;
