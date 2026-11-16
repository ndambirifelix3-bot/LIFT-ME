-- Lift Me — helper functions, auth trigger and business RPCs.
-- Every SECURITY DEFINER function pins search_path and checks the caller itself.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and not is_suspended
  );
$$;

create or replace function public.setting_int(p_key text)
returns integer
language sql stable security definer set search_path = public, pg_temp
as $$ select (value #>> '{}')::integer from public.settings where key = p_key; $$;

create or replace function public.setting_text(p_key text)
returns text
language sql stable security definer set search_path = public, pg_temp
as $$ select value #>> '{}' from public.settings where key = p_key; $$;

create or replace function public.make_point(p_lat double precision, p_lng double precision)
returns extensions.geography
language sql immutable set search_path = public, extensions, pg_temp
as $$ select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography; $$;

create or replace function public.point_in_service_area(p_lat double precision, p_lng double precision)
returns boolean
language sql stable security definer set search_path = public, extensions, pg_temp
as $$
  select exists (
    select 1 from public.service_area
    where is_active
      and extensions.st_covers(area, public.make_point(p_lat, p_lng))
  );
$$;

create or replace function public.ride_type_tier(p_ride_type text)
returns integer
language sql stable security definer set search_path = public, pg_temp
as $$ select tier from public.pricing where ride_type = p_ride_type; $$;

create or replace function public.current_user_role()
returns public.user_role
language sql stable security definer set search_path = public, pg_temp
as $$ select role from public.profiles where id = auth.uid(); $$;

create or replace function public.assert_active_user()
returns public.profiles
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare v public.profiles;
begin
  select * into v from public.profiles where id = auth.uid();
  if v.id is null then raise exception 'not_signed_in' using errcode = '28000'; end if;
  if v.is_suspended then raise exception 'account_suspended' using errcode = '42501'; end if;
  return v;
end $$;

create or replace function public.log_admin_action(p_action text, p_target_type text, p_target_id text, p_details jsonb default '{}'::jsonb)
returns void
language sql security definer set search_path = public, pg_temp
as $$
  insert into public.admin_actions (admin_id, action, target_type, target_id, details)
  values (auth.uid(), p_action, p_target_type, p_target_id, coalesce(p_details, '{}'::jsonb));
$$;

-- Fare formula — the ONLY place fares are calculated.
-- fare = max(minimum, base + per_km * km + per_minute * minutes), rounded to whole KES.
create or replace function public.calculate_fare(p_ride_type text, p_distance_m integer, p_duration_s integer)
returns integer
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare p public.pricing;
begin
  select * into p from public.pricing where ride_type = p_ride_type and is_active;
  if p.ride_type is null then raise exception 'unknown_ride_type'; end if;
  return greatest(
    p.minimum_fare,
    round(p.base_fare + p.per_km * (p_distance_m::numeric / 1000) + p.per_minute * (p_duration_s::numeric / 60))::integer
  );
end $$;

-- ---------------------------------------------------------------------------
-- New auth user -> profile row (role passenger until they choose once).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, phone)
  values (new.id, case when new.phone is null or new.phone = '' then null
                       when left(new.phone, 1) = '+' then new.phone
                       else '+' || new.phone end)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Role choice: once, passenger or driver only.
-- ---------------------------------------------------------------------------
create or replace function public.choose_role(p_role public.user_role)
returns public.profiles
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v public.profiles;
begin
  v := public.assert_active_user();
  if p_role not in ('passenger', 'driver') then
    raise exception 'role_not_allowed' using errcode = '42501';
  end if;
  if v.role_chosen then
    raise exception 'role_already_chosen' using errcode = '42501';
  end if;
  update public.profiles set role = p_role, role_chosen = true
  where id = v.id returning * into v;
  if p_role = 'driver' then
    insert into public.drivers (id) values (v.id) on conflict (id) do nothing;
  end if;
  return v;
end $$;

-- Block self-service changes to protected profile columns even if grants change later.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  -- Changes made through SECURITY DEFINER functions (owner) or service role are allowed.
  if current_user in ('authenticated', 'anon') then
    if new.role is distinct from old.role
       or new.role_chosen is distinct from old.role_chosen
       or new.is_suspended is distinct from old.is_suspended
       or new.phone is distinct from old.phone
       or new.id is distinct from old.id then
      raise exception 'protected_column' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_columns();

create or replace function public.request_account_deletion()
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.assert_active_user();
  update public.profiles set delete_requested_at = now() where id = auth.uid();
end $$;

-- ---------------------------------------------------------------------------
-- Driver onboarding
-- ---------------------------------------------------------------------------
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
  if d.id_number is null or d.licence_number is null then raise exception 'missing_personal_details'; end if;
  if d.photo_path is null then raise exception 'missing_photo'; end if;
  if not exists (select 1 from public.vehicles where driver_id = d.id) then raise exception 'missing_vehicle'; end if;
  select string_agg(t.name, ', ' order by t.sort_order) into v_missing
  from public.document_types t
  where t.required and t.is_active
    and not exists (select 1 from public.driver_documents dd where dd.driver_id = d.id and dd.doc_type = t.code);
  if v_missing is not null then raise exception 'missing_documents: %', v_missing; end if;

  update public.drivers
     set status = 'pending', submitted_at = now(), reject_reason = null, reviewed_by = null, reviewed_at = null
   where id = d.id returning * into d;
  return d;
end $$;

-- Lock driver application fields once approved/suspended (only admin can then edit).
create or replace function public.protect_driver_columns()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if old.status not in ('pending', 'rejected') then
      raise exception 'application_locked' using errcode = '42501';
    end if;
    -- Editing after submitting re-opens the application.
    if old.submitted_at is not null and old.status = 'pending' then
      new.submitted_at := null;
    end if;
  end if;
  return new;
end $$;

create trigger drivers_protect before update on public.drivers
  for each row execute function public.protect_driver_columns();

create or replace function public.driver_can_edit_application()
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (select 1 from public.drivers where id = auth.uid() and status in ('pending', 'rejected'));
$$;

-- ---------------------------------------------------------------------------
-- Admin tools (all audited)
-- ---------------------------------------------------------------------------
create or replace function public.admin_review_driver(
  p_driver_id uuid, p_approve boolean, p_reason text default null, p_ride_type text default null
)
returns public.drivers
language plpgsql security definer set search_path = public, pg_temp
as $$
declare d public.drivers;
begin
  if not public.is_admin() then raise exception 'admin_only' using errcode = '42501'; end if;
  if p_driver_id = auth.uid() then raise exception 'cannot_review_self' using errcode = '42501'; end if;
  select * into d from public.drivers where id = p_driver_id for update;
  if d.id is null then raise exception 'driver_not_found'; end if;
  if not p_approve and coalesce(trim(p_reason), '') = '' then raise exception 'reason_required'; end if;
  if p_approve and d.submitted_at is null then raise exception 'application_not_submitted'; end if;

  if p_ride_type is not null then
    update public.vehicles set ride_type = p_ride_type, updated_at = now() where driver_id = p_driver_id;
  end if;

  update public.drivers
     set status = case when p_approve then 'approved'::public.driver_status else 'rejected'::public.driver_status end,
         reject_reason = case when p_approve then null else trim(p_reason) end,
         reviewed_by = auth.uid(), reviewed_at = now(),
         is_online = case when p_approve then is_online else false end
   where id = p_driver_id returning * into d;

  perform public.log_admin_action(case when p_approve then 'driver_approved' else 'driver_rejected' end,
    'driver', p_driver_id::text, jsonb_build_object('reason', p_reason, 'ride_type', p_ride_type));
  return d;
end $$;

create or replace function public.admin_set_driver_suspended(p_driver_id uuid, p_suspended boolean, p_reason text default null)
returns public.drivers
language plpgsql security definer set search_path = public, pg_temp
as $$
declare d public.drivers;
begin
  if not public.is_admin() then raise exception 'admin_only' using errcode = '42501'; end if;
  update public.drivers
     set status = case when p_suspended then 'suspended'::public.driver_status else 'approved'::public.driver_status end,
         is_online = case when p_suspended then false else is_online end,
         reject_reason = case when p_suspended then p_reason else null end,
         reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_driver_id returning * into d;
  if d.id is null then raise exception 'driver_not_found'; end if;
  perform public.log_admin_action(case when p_suspended then 'driver_suspended' else 'driver_unsuspended' end,
    'driver', p_driver_id::text, jsonb_build_object('reason', p_reason));
  return d;
end $$;

create or replace function public.admin_set_user_suspended(p_user_id uuid, p_suspended boolean, p_reason text default null)
returns public.profiles
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v public.profiles;
begin
  if not public.is_admin() then raise exception 'admin_only' using errcode = '42501'; end if;
  if p_user_id = auth.uid() then raise exception 'cannot_suspend_self'; end if;
  update public.profiles set is_suspended = p_suspended where id = p_user_id returning * into v;
  if v.id is null then raise exception 'user_not_found'; end if;
  if p_suspended then
    update public.drivers set is_online = false where id = p_user_id;
  end if;
  perform public.log_admin_action(case when p_suspended then 'user_suspended' else 'user_unsuspended' end,
    'profile', p_user_id::text, jsonb_build_object('reason', p_reason));
  return v;
end $$;

create or replace function public.admin_set_role(p_user_id uuid, p_role public.user_role)
returns public.profiles
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v public.profiles;
begin
  if not public.is_admin() then raise exception 'admin_only' using errcode = '42501'; end if;
  if p_user_id = auth.uid() then raise exception 'cannot_change_own_role'; end if;
  update public.profiles set role = p_role, role_chosen = true where id = p_user_id returning * into v;
  if v.id is null then raise exception 'user_not_found'; end if;
  if p_role = 'driver' then insert into public.drivers (id) values (p_user_id) on conflict do nothing; end if;
  perform public.log_admin_action('role_changed', 'profile', p_user_id::text, jsonb_build_object('role', p_role));
  return v;
end $$;

create or replace function public.admin_resolve_report(p_report_id uuid, p_note text default null)
returns public.support_reports
language plpgsql security definer set search_path = public, pg_temp
as $$
declare r public.support_reports;
begin
  if not public.is_admin() then raise exception 'admin_only' using errcode = '42501'; end if;
  update public.support_reports set status = 'resolved', resolved_at = now(), admin_note = p_note
   where id = p_report_id returning * into r;
  perform public.log_admin_action('report_resolved', 'support_report', p_report_id::text, jsonb_build_object('note', p_note));
  return r;
end $$;

-- Audit pricing / settings edits made by admins through the table API.
create or replace function public.audit_config_change()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  insert into public.admin_actions (admin_id, action, target_type, target_id, details)
  values (auth.uid(), 'config_updated', tg_table_name,
          coalesce(to_jsonb(new) ->> 'ride_type', to_jsonb(new) ->> 'key'),
          jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new)));
  return new;
end $$;

create trigger pricing_audit before update on public.pricing
  for each row execute function public.audit_config_change();
create trigger settings_audit before update on public.settings
  for each row execute function public.audit_config_change();

-- ---------------------------------------------------------------------------
-- Quotes (called ONLY by the get-quote Edge Function with the service role)
-- ---------------------------------------------------------------------------
create or replace function public.create_quote(
  p_passenger_id uuid,
  p_pickup_lat double precision, p_pickup_lng double precision, p_pickup_address text, p_pickup_note text,
  p_dropoff_lat double precision, p_dropoff_lng double precision, p_dropoff_address text,
  p_distance_m integer, p_duration_s integer, p_polyline text
)
returns public.quotes
language plpgsql security definer set search_path = public, pg_temp
as $$
declare q public.quotes; v_options jsonb; v_currency text;
begin
  if not public.point_in_service_area(p_pickup_lat, p_pickup_lng) then
    raise exception 'pickup_outside_service_area';
  end if;
  if not public.point_in_service_area(p_dropoff_lat, p_dropoff_lng) then
    raise exception 'dropoff_outside_service_area';
  end if;
  v_currency := coalesce(public.setting_text('currency'), 'KES');

  select coalesce(jsonb_agg(jsonb_build_object(
           'ride_type', p.ride_type,
           'display_name', p.display_name,
           'description', p.description,
           'seats', p.seats,
           'fare', public.calculate_fare(p.ride_type, p_distance_m, p_duration_s),
           'currency', p.currency) order by p.sort_order), '[]'::jsonb)
    into v_options
    from public.pricing p where p.is_active;

  insert into public.quotes (passenger_id, pickup, pickup_address, pickup_note, dropoff, dropoff_address,
                             distance_m, duration_s, polyline, options, currency, expires_at)
  values (p_passenger_id, public.make_point(p_pickup_lat, p_pickup_lng), p_pickup_address, nullif(trim(p_pickup_note), ''),
          public.make_point(p_dropoff_lat, p_dropoff_lng), p_dropoff_address,
          p_distance_m, p_duration_s, p_polyline, v_options, v_currency,
          now() + make_interval(mins => coalesce(public.setting_int('quote_valid_minutes'), 10)))
  returning * into q;
  return q;
end $$;

-- ---------------------------------------------------------------------------
-- Ride state machine
-- ---------------------------------------------------------------------------
create or replace function public.ride_transition_allowed(p_from public.ride_status, p_to public.ride_status)
returns boolean
language sql immutable
as $$
  select (p_from, p_to) in (
    ('searching'::public.ride_status, 'accepted'::public.ride_status),
    ('searching', 'cancelled'),
    ('searching', 'no_driver_found'),
    ('accepted', 'arrived'),
    ('accepted', 'cancelled'),
    ('arrived', 'in_progress'),
    ('arrived', 'cancelled'),
    ('in_progress', 'completed'),
    ('in_progress', 'cancelled')   -- admin only, enforced in cancel_ride
  );
$$;

create or replace function public.log_ride_event(p_ride_id uuid, p_from public.ride_status, p_to public.ride_status, p_actor_role text, p_note text default null)
returns void
language sql security definer set search_path = public, pg_temp
as $$
  insert into public.ride_events (ride_id, from_status, to_status, actor_id, actor_role, note)
  values (p_ride_id, p_from, p_to, auth.uid(), p_actor_role, p_note);
$$;

-- Offer a searching ride to eligible nearby drivers who haven't seen it yet.
create or replace function public.dispatch_ride(p_ride_id uuid)
returns integer
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare r public.rides; v_count integer;
begin
  select * into r from public.rides where id = p_ride_id;
  if r.status <> 'searching' or r.search_expires_at <= now() then return 0; end if;

  insert into public.ride_offers (ride_id, driver_id, expires_at)
  select r.id, d.id, r.search_expires_at
    from public.drivers d
    join public.driver_locations l on l.driver_id = d.id
    join public.vehicles v on v.driver_id = d.id
    join public.profiles p on p.id = d.id
   where d.status = 'approved' and d.is_online and not p.is_suspended
     and d.id <> r.passenger_id
     and l.updated_at > now() - make_interval(secs => coalesce(public.setting_int('location_fresh_seconds'), 120))
     and extensions.st_dwithin(l.location, r.pickup, coalesce(public.setting_int('match_radius_km'), 5) * 1000)
     and public.ride_type_tier(v.ride_type) >= public.ride_type_tier(r.ride_type)
     and not exists (select 1 from public.rides a where a.driver_id = d.id
                     and a.status in ('accepted', 'arrived', 'in_progress'))
  on conflict (ride_id, driver_id) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

create or replace function public.request_ride(p_quote_id uuid, p_ride_type text, p_payment_method public.payment_method)
returns public.rides
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare q public.quotes; v_profile public.profiles; v_fare integer; r public.rides;
begin
  v_profile := public.assert_active_user();
  if v_profile.role <> 'passenger' then raise exception 'passengers_only' using errcode = '42501'; end if;

  select * into q from public.quotes where id = p_quote_id and passenger_id = v_profile.id for update;
  if q.id is null then raise exception 'quote_not_found'; end if;
  if q.used_at is not null then raise exception 'quote_already_used'; end if;
  if q.expires_at <= now() then raise exception 'quote_expired'; end if;

  select (o ->> 'fare')::integer into v_fare
    from jsonb_array_elements(q.options) o where o ->> 'ride_type' = p_ride_type;
  if v_fare is null then raise exception 'ride_type_not_in_quote'; end if;

  if exists (select 1 from public.rides where passenger_id = v_profile.id
             and status in ('searching', 'accepted', 'arrived', 'in_progress')) then
    raise exception 'active_ride_exists';
  end if;

  update public.quotes set used_at = now() where id = q.id;

  insert into public.rides (passenger_id, quote_id, ride_type, status, pickup, pickup_lat, pickup_lng, pickup_address, pickup_note,
                            dropoff, dropoff_lat, dropoff_lng, dropoff_address, distance_m, duration_s, polyline,
                            fare, currency, payment_method, search_expires_at)
  values (v_profile.id, q.id, p_ride_type, 'searching', q.pickup,
          extensions.st_y(q.pickup::extensions.geometry), extensions.st_x(q.pickup::extensions.geometry), q.pickup_address, q.pickup_note,
          q.dropoff, extensions.st_y(q.dropoff::extensions.geometry), extensions.st_x(q.dropoff::extensions.geometry), q.dropoff_address,
          q.distance_m, q.duration_s, q.polyline, v_fare, q.currency, p_payment_method,
          now() + make_interval(secs => coalesce(public.setting_int('search_timeout_seconds'), 120)))
  returning * into r;

  perform public.log_ride_event(r.id, null, 'searching', 'passenger');
  perform public.dispatch_ride(r.id);
  return r;
end $$;

-- ATOMIC: the conditional UPDATE means only one driver can ever win.
create or replace function public.accept_ride(p_ride_id uuid)
returns public.rides
language plpgsql security definer set search_path = public, pg_temp
as $$
declare d public.drivers; r public.rides; v_uid uuid := auth.uid();
begin
  perform public.assert_active_user();
  select * into d from public.drivers where id = v_uid;
  if d.id is null or d.status <> 'approved' then raise exception 'driver_not_approved' using errcode = '42501'; end if;
  if not d.is_online then raise exception 'driver_offline'; end if;
  if not exists (select 1 from public.ride_offers where ride_id = p_ride_id and driver_id = v_uid and response = 'pending') then
    raise exception 'no_offer_for_this_ride' using errcode = '42501';
  end if;
  if exists (select 1 from public.rides where driver_id = v_uid and status in ('accepted', 'arrived', 'in_progress')) then
    raise exception 'driver_has_active_ride';
  end if;

  update public.rides
     set status = 'accepted', driver_id = v_uid, accepted_at = now()
   where id = p_ride_id
     and status = 'searching'
     and driver_id is null
     and search_expires_at > now()
  returning * into r;

  if r.id is null then
    update public.ride_offers set response = 'expired', responded_at = now()
     where ride_id = p_ride_id and driver_id = v_uid and response = 'pending';
    raise exception 'ride_no_longer_available';
  end if;

  update public.ride_offers
     set response = case when driver_id = v_uid then 'accepted'::public.offer_response else 'expired'::public.offer_response end,
         responded_at = now()
   where ride_id = p_ride_id and response = 'pending';

  perform public.log_ride_event(r.id, 'searching', 'accepted', 'driver');
  return r;
end $$;

create or replace function public.decline_ride(p_ride_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  update public.ride_offers set response = 'declined', responded_at = now()
   where ride_id = p_ride_id and driver_id = auth.uid() and response = 'pending';
end $$;

-- Shared driver-side step: accepted->arrived, arrived->in_progress.
create or replace function public.driver_step(p_ride_id uuid, p_from public.ride_status, p_to public.ride_status)
returns public.rides
language plpgsql security definer set search_path = public, pg_temp
as $$
declare r public.rides;
begin
  perform public.assert_active_user();
  if not public.ride_transition_allowed(p_from, p_to) then raise exception 'transition_not_allowed'; end if;
  update public.rides
     set status = p_to,
         arrived_at = case when p_to = 'arrived' then now() else arrived_at end,
         started_at = case when p_to = 'in_progress' then now() else started_at end
   where id = p_ride_id and driver_id = auth.uid() and status = p_from
  returning * into r;
  if r.id is null then raise exception 'transition_not_allowed'; end if;
  perform public.log_ride_event(r.id, p_from, p_to, 'driver');
  return r;
end $$;

create or replace function public.driver_arrived(p_ride_id uuid)
returns public.rides language sql security definer set search_path = public, pg_temp
as $$ select public.driver_step(p_ride_id, 'accepted', 'arrived'); $$;

create or replace function public.start_trip(p_ride_id uuid)
returns public.rides language sql security definer set search_path = public, pg_temp
as $$ select public.driver_step(p_ride_id, 'arrived', 'in_progress'); $$;

create or replace function public.complete_trip(p_ride_id uuid)
returns public.rides
language plpgsql security definer set search_path = public, pg_temp
as $$
declare r public.rides; v_pct integer; v_commission integer;
begin
  perform public.assert_active_user();
  v_pct := coalesce(public.setting_int('commission_percent'), 0);
  select fare into v_commission from public.rides where id = p_ride_id;
  v_commission := round(coalesce(v_commission, 0) * v_pct / 100.0)::integer;

  update public.rides
     set status = 'completed', completed_at = now(),
         commission_percent = v_pct,
         platform_commission = v_commission,
         driver_earnings = fare - v_commission
   where id = p_ride_id and driver_id = auth.uid() and status = 'in_progress'
  returning * into r;
  if r.id is null then raise exception 'transition_not_allowed'; end if;

  insert into public.payments (ride_id, method, amount, currency, status)
  values (r.id, r.payment_method, r.fare, r.currency, 'pending')
  on conflict (ride_id) do nothing;

  perform public.log_ride_event(r.id, 'in_progress', 'completed', 'driver');
  return r;
end $$;

create or replace function public.cancel_ride(p_ride_id uuid, p_reason text default null)
returns public.rides
language plpgsql security definer set search_path = public, pg_temp
as $$
declare r public.rides; v_role text; v_uid uuid := auth.uid(); v_from public.ride_status;
begin
  perform public.assert_active_user();
  select * into r from public.rides where id = p_ride_id for update;
  if r.id is null then raise exception 'ride_not_found'; end if;

  if r.passenger_id = v_uid then v_role := 'passenger';
  elsif r.driver_id = v_uid then v_role := 'driver';
  elsif public.is_admin() then v_role := 'admin';
  else raise exception 'not_your_ride' using errcode = '42501';
  end if;

  if not public.ride_transition_allowed(r.status, 'cancelled') then raise exception 'cannot_cancel_now'; end if;
  if r.status = 'in_progress' and v_role <> 'admin' then raise exception 'cannot_cancel_during_trip'; end if;
  v_from := r.status;

  update public.rides
     set status = 'cancelled', cancelled_at = now(), cancelled_by = v_role::public.user_role,
         cancel_reason = nullif(trim(p_reason), '')
   where id = r.id returning * into r;
  update public.ride_offers set response = 'expired', responded_at = now()
   where ride_id = r.id and response = 'pending';

  perform public.log_ride_event(r.id, v_from, 'cancelled', v_role, p_reason);
  if v_role = 'admin' then
    perform public.log_admin_action('ride_cancelled', 'ride', r.id::text, jsonb_build_object('reason', p_reason));
  end if;
  return r;
end $$;

-- Marks overdue searches as no_driver_found. Safe for anyone to call: it only
-- acts on rides whose server-side deadline has passed. Also run by pg_cron.
create or replace function public.expire_searching_rides()
returns integer
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_count integer := 0; r record;
begin
  for r in
    update public.rides set status = 'no_driver_found'
     where status = 'searching' and search_expires_at <= now()
    returning id
  loop
    insert into public.ride_events (ride_id, from_status, to_status, actor_id, actor_role)
    values (r.id, 'searching', 'no_driver_found', null, 'system');
    update public.ride_offers set response = 'expired', responded_at = now()
     where ride_id = r.id and response = 'pending';
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

-- ---------------------------------------------------------------------------
-- Driver presence
-- ---------------------------------------------------------------------------
create or replace function public.set_driver_online(p_online boolean)
returns public.drivers
language plpgsql security definer set search_path = public, pg_temp
as $$
declare d public.drivers;
begin
  perform public.assert_active_user();
  select * into d from public.drivers where id = auth.uid();
  if d.id is null then raise exception 'not_a_driver' using errcode = '42501'; end if;
  if p_online and d.status <> 'approved' then raise exception 'driver_not_approved' using errcode = '42501'; end if;
  update public.drivers set is_online = p_online, last_seen = now() where id = d.id returning * into d;
  return d;
end $$;

create or replace function public.update_driver_location(p_lat double precision, p_lng double precision, p_heading real default null)
returns integer
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare d public.drivers; v_offers integer := 0; r record;
begin
  perform public.assert_active_user();
  if p_lat not between -90 and 90 or p_lng not between -180 and 180 then raise exception 'bad_coordinates'; end if;
  select * into d from public.drivers where id = auth.uid();
  if d.id is null or d.status <> 'approved' then raise exception 'driver_not_approved' using errcode = '42501'; end if;

  insert into public.driver_locations (driver_id, location, heading, updated_at)
  values (d.id, public.make_point(p_lat, p_lng), p_heading, now())
  on conflict (driver_id) do update set location = excluded.location, heading = excluded.heading, updated_at = now();
  update public.drivers set last_seen = now() where id = d.id;

  -- A driver who just came online (or moved closer) also gets current nearby requests.
  if d.is_online then
    for r in
      select id from public.rides
       where status = 'searching' and search_expires_at > now()
         and extensions.st_dwithin(pickup, public.make_point(p_lat, p_lng), coalesce(public.setting_int('match_radius_km'), 5) * 1000)
         and not exists (select 1 from public.ride_offers o where o.ride_id = rides.id and o.driver_id = d.id)
    loop
      v_offers := v_offers + public.dispatch_ride(r.id);
    end loop;
  end if;
  return v_offers;
end $$;

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------
create or replace function public.confirm_cash_payment(p_ride_id uuid)
returns public.payments
language plpgsql security definer set search_path = public, pg_temp
as $$
declare r public.rides; p public.payments;
begin
  perform public.assert_active_user();
  select * into r from public.rides where id = p_ride_id;
  if r.id is null or r.driver_id is distinct from auth.uid() then raise exception 'not_your_ride' using errcode = '42501'; end if;
  if r.status <> 'completed' then raise exception 'ride_not_completed'; end if;

  update public.payments
     set status = 'paid', method = 'cash', paid_at = now(), confirmed_by = auth.uid(), updated_at = now()
   where ride_id = r.id and status <> 'paid'
  returning * into p;
  if p.id is null then
    select * into p from public.payments where ride_id = r.id;
  end if;
  if r.payment_method <> 'cash' then
    update public.rides set payment_method = 'cash' where id = r.id;
  end if;
  return p;
end $$;

-- Passenger picks M-Pesa again after a failed attempt, or switches to cash.
create or replace function public.change_payment_method(p_ride_id uuid, p_method public.payment_method)
returns public.payments
language plpgsql security definer set search_path = public, pg_temp
as $$
declare p public.payments;
begin
  perform public.assert_active_user();
  if not exists (select 1 from public.rides where id = p_ride_id and passenger_id = auth.uid()) then
    raise exception 'not_your_ride' using errcode = '42501';
  end if;
  update public.payments set method = p_method, status = 'pending', updated_at = now()
   where ride_id = p_ride_id and status <> 'paid' returning * into p;
  if p.id is null then raise exception 'payment_not_changeable'; end if;
  update public.rides set payment_method = p_method where id = p_ride_id;
  return p;
end $$;

-- ---------------------------------------------------------------------------
-- Ratings & support
-- ---------------------------------------------------------------------------
create or replace function public.rate_ride(p_ride_id uuid, p_stars integer, p_comment text default null)
returns public.ratings
language plpgsql security definer set search_path = public, pg_temp
as $$
declare r public.rides; v_ratee uuid; v public.ratings;
begin
  perform public.assert_active_user();
  select * into r from public.rides where id = p_ride_id;
  if r.id is null or r.status <> 'completed' then raise exception 'ride_not_completed'; end if;
  if r.passenger_id = auth.uid() then v_ratee := r.driver_id;
  elsif r.driver_id = auth.uid() then v_ratee := r.passenger_id;
  else raise exception 'not_your_ride' using errcode = '42501';
  end if;
  insert into public.ratings (ride_id, rater_id, ratee_id, stars, comment)
  values (r.id, auth.uid(), v_ratee, p_stars, nullif(trim(p_comment), ''))
  on conflict (ride_id, rater_id) do update set stars = excluded.stars, comment = excluded.comment
  returning * into v;
  return v;
end $$;

create or replace function public.average_rating(p_user_id uuid)
returns numeric
language sql stable security definer set search_path = public, pg_temp
as $$ select round(avg(stars)::numeric, 1) from public.ratings where ratee_id = p_user_id; $$;

-- ---------------------------------------------------------------------------
-- Read helpers (return only what each side needs)
-- ---------------------------------------------------------------------------
create or replace function public.get_ride_details(p_ride_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, extensions, pg_temp
as $$
declare r public.rides; v_uid uuid := auth.uid(); v_result jsonb;
begin
  select * into r from public.rides where id = p_ride_id;
  if r.id is null then raise exception 'ride_not_found'; end if;
  if not (r.passenger_id = v_uid or coalesce(r.driver_id = v_uid, false) or public.is_admin()) then
    raise exception 'not_your_ride' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'ride', to_jsonb(r) - 'pickup' - 'dropoff',
    'driver', case when r.driver_id is null then null else (
      select jsonb_build_object(
        'id', p.id, 'full_name', p.full_name,
        'phone', case when r.status in ('accepted', 'arrived', 'in_progress') or public.is_admin() then p.phone end,
        'photo_path', d.photo_path,
        'rating', public.average_rating(p.id),
        'vehicle', (select jsonb_build_object('make', v.make, 'model', v.model, 'colour', v.colour, 'plate', v.plate, 'year', v.year)
                      from public.vehicles v where v.driver_id = p.id),
        'location', (select jsonb_build_object('lat', extensions.st_y(l.location::extensions.geometry),
                                               'lng', extensions.st_x(l.location::extensions.geometry),
                                               'heading', l.heading, 'updated_at', l.updated_at)
                       from public.driver_locations l where l.driver_id = p.id
                        and r.status in ('accepted', 'arrived', 'in_progress'))
      ) from public.profiles p join public.drivers d on d.id = p.id where p.id = r.driver_id) end,
    'passenger', (select jsonb_build_object(
        'id', p.id, 'full_name', p.full_name,
        'phone', case when r.status in ('accepted', 'arrived', 'in_progress') or public.is_admin() then p.phone end,
        'rating', public.average_rating(p.id))
      from public.profiles p where p.id = r.passenger_id),
    'payment', (select to_jsonb(pay) - 'mpesa_merchant_request_id' from public.payments pay where pay.ride_id = r.id),
    'my_rating', (select to_jsonb(rt) from public.ratings rt where rt.ride_id = r.id and rt.rater_id = v_uid),
    'events', case when public.is_admin() then
        (select jsonb_agg(to_jsonb(e) order by e.id) from public.ride_events e where e.ride_id = r.id) end
  ) into v_result;
  return v_result;
end $$;

-- Public "share my trip" link. Limited info, only while the trip is active.
create or replace function public.get_shared_trip(p_token uuid)
returns jsonb
language sql stable security definer set search_path = public, extensions, pg_temp
as $$
  select jsonb_build_object(
    'status', r.status,
    'pickup_address', r.pickup_address,
    'dropoff_address', r.dropoff_address,
    'driver_first_name', split_part(p.full_name, ' ', 1),
    'vehicle', (select jsonb_build_object('make', v.make, 'model', v.model, 'colour', v.colour, 'plate', v.plate)
                  from public.vehicles v where v.driver_id = r.driver_id),
    'driver_location', (select jsonb_build_object('lat', extensions.st_y(l.location::extensions.geometry),
                                                  'lng', extensions.st_x(l.location::extensions.geometry),
                                                  'updated_at', l.updated_at)
                          from public.driver_locations l where l.driver_id = r.driver_id)
  )
  from public.rides r left join public.profiles p on p.id = r.driver_id
  where r.share_token = p_token and r.status in ('accepted', 'arrived', 'in_progress');
$$;

create or replace function public.get_driver_earnings()
returns jsonb
language sql stable security definer set search_path = public, pg_temp
as $$
  with tz as (select coalesce(public.setting_text('timezone'), 'Africa/Nairobi') as name),
  done as (
    select r.*, (r.completed_at at time zone (select name from tz)) as local_done
      from public.rides r where r.driver_id = auth.uid() and r.status = 'completed'
  ),
  bounds as (
    select date_trunc('day', now() at time zone (select name from tz)) as today,
           date_trunc('week', now() at time zone (select name from tz)) as week
  )
  select jsonb_build_object(
    'currency', coalesce(public.setting_text('currency'), 'KES'),
    'today', coalesce((select sum(driver_earnings) from done, bounds where local_done >= bounds.today), 0),
    'today_trips', (select count(*) from done, bounds where local_done >= bounds.today),
    'week', coalesce((select sum(driver_earnings) from done, bounds where local_done >= bounds.week), 0),
    'week_trips', (select count(*) from done, bounds where local_done >= bounds.week),
    'total', coalesce((select sum(driver_earnings) from done), 0),
    'total_trips', (select count(*) from done),
    'rating', public.average_rating(auth.uid())
  );
$$;

create or replace function public.admin_overview()
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare v_tz text := coalesce(public.setting_text('timezone'), 'Africa/Nairobi'); v_today timestamptz;
begin
  if not public.is_admin() then raise exception 'admin_only' using errcode = '42501'; end if;
  v_today := date_trunc('day', now() at time zone v_tz) at time zone v_tz;
  return jsonb_build_object(
    'currency', coalesce(public.setting_text('currency'), 'KES'),
    'rides_today', (select count(*) from public.rides where requested_at >= v_today),
    'completed_today', (select count(*) from public.rides where status = 'completed' and completed_at >= v_today),
    'active_rides', (select count(*) from public.rides where status in ('searching', 'accepted', 'arrived', 'in_progress')),
    'online_drivers', (select count(*) from public.drivers d join public.driver_locations l on l.driver_id = d.id
                        where d.is_online and d.status = 'approved'
                          and l.updated_at > now() - make_interval(secs => coalesce(public.setting_int('location_fresh_seconds'), 120))),
    'pending_drivers', (select count(*) from public.drivers where status = 'pending' and submitted_at is not null),
    'collected_today', coalesce((select sum(amount) from public.payments where status = 'paid' and paid_at >= v_today), 0),
    'collected_total', coalesce((select sum(amount) from public.payments where status = 'paid'), 0),
    'commission_total', coalesce((select sum(r.platform_commission) from public.rides r
                                    join public.payments p on p.ride_id = r.id where p.status = 'paid'), 0),
    'open_reports', (select count(*) from public.support_reports where status = 'open')
  );
end $$;

-- Admin view of drivers including name/phone (admin only).
create or replace function public.admin_list_drivers(p_status public.driver_status default null)
returns table (
  id uuid, full_name text, phone text, status public.driver_status, submitted_at timestamptz,
  reviewed_at timestamptz, is_online boolean, plate text, ride_type text, created_at timestamptz
)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then raise exception 'admin_only' using errcode = '42501'; end if;
  return query
    select d.id, p.full_name, p.phone, d.status, d.submitted_at, d.reviewed_at, d.is_online, v.plate, v.ride_type, d.created_at
      from public.drivers d join public.profiles p on p.id = d.id
      left join public.vehicles v on v.driver_id = d.id
     where p_status is null or d.status = p_status
     order by d.submitted_at desc nulls last, d.created_at desc;
end $$;
