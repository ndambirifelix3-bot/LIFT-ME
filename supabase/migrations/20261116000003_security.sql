-- Lift Me — grants + Row Level Security on EVERY table.
-- Rule: users see only their own data; drivers see rides offered/assigned to them; admins see everything.
-- Clients never write ride status, payments, quotes or approvals directly: those go through RPCs.

-- ---------------------------------------------------------------------------
-- Start from zero: Supabase grants everything to anon/authenticated by default.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Enable RLS on every table.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Table privileges for signed-in users (rows are still filtered by RLS).
-- ---------------------------------------------------------------------------
grant select on public.profiles, public.settings, public.service_area, public.pricing, public.drivers,
                public.driver_locations, public.vehicles, public.document_types, public.driver_documents,
                public.quotes, public.rides, public.ride_events, public.ride_offers, public.payments,
                public.ratings, public.support_reports, public.admin_actions, public.mpesa_callbacks
  to authenticated;

grant update (full_name) on public.profiles to authenticated;
grant update (id_number, licence_number, email, photo_path) on public.drivers to authenticated;
grant insert (driver_id, make, model, year, colour, plate) on public.vehicles to authenticated;
grant update (make, model, year, colour, plate) on public.vehicles to authenticated;
grant insert (driver_id, doc_type, file_path, mime_type) on public.driver_documents to authenticated;
grant update (file_path, mime_type, uploaded_at) on public.driver_documents to authenticated;
grant delete on public.driver_documents to authenticated;
grant insert (user_id, ride_id, category, message) on public.support_reports to authenticated;
-- admin-only config (RLS restricts these to admins)
grant insert, update on public.pricing to authenticated;
grant update (value) on public.settings to authenticated;
grant insert, update, delete on public.service_area to authenticated;
grant insert, update on public.document_types to authenticated;

-- ---------------------------------------------------------------------------
-- RPCs callable by signed-in users (each checks the caller inside).
-- ---------------------------------------------------------------------------
grant execute on function
  public.is_admin(),
  public.driver_can_edit_application(),
  public.current_user_role(),
  public.choose_role(public.user_role),
  public.request_account_deletion(),
  public.submit_driver_application(),
  public.admin_review_driver(uuid, boolean, text, text),
  public.admin_set_driver_suspended(uuid, boolean, text),
  public.admin_set_user_suspended(uuid, boolean, text),
  public.admin_set_role(uuid, public.user_role),
  public.admin_resolve_report(uuid, text),
  public.admin_overview(),
  public.admin_list_drivers(public.driver_status),
  public.request_ride(uuid, text, public.payment_method),
  public.accept_ride(uuid),
  public.decline_ride(uuid),
  public.driver_arrived(uuid),
  public.start_trip(uuid),
  public.complete_trip(uuid),
  public.cancel_ride(uuid, text),
  public.expire_searching_rides(),
  public.set_driver_online(boolean),
  public.update_driver_location(double precision, double precision, real),
  public.confirm_cash_payment(uuid),
  public.change_payment_method(uuid, public.payment_method),
  public.rate_ride(uuid, integer, text),
  public.get_ride_details(uuid),
  public.get_driver_earnings(),
  public.point_in_service_area(double precision, double precision)
to authenticated;

-- Public share-trip link works without login (returns limited info for active trips only).
grant execute on function public.get_shared_trip(uuid) to anon, authenticated;

-- NOT granted to clients: create_quote, calculate_fare, dispatch_ride, driver_step,
-- log_ride_event, log_admin_action, setting_* helpers. Only the server (service role) can call them.

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------
-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- settings / pricing / service_area / document_types: everyone signed in reads, admins edit
create policy settings_select on public.settings for select to authenticated using (true);
create policy settings_admin_update on public.settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy pricing_select on public.pricing for select to authenticated using (true);
create policy pricing_admin_insert on public.pricing for insert to authenticated with check ((select public.is_admin()));
create policy pricing_admin_update on public.pricing for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy service_area_select on public.service_area for select to authenticated using (true);
create policy service_area_admin_all on public.service_area for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy document_types_select on public.document_types for select to authenticated using (true);
create policy document_types_admin_insert on public.document_types for insert to authenticated with check ((select public.is_admin()));
create policy document_types_admin_update on public.document_types for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- drivers
create policy drivers_select on public.drivers for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy drivers_update_own_application on public.drivers for update to authenticated
  using (id = (select auth.uid()) and status in ('pending', 'rejected'))
  with check (id = (select auth.uid()) and status in ('pending', 'rejected'));

-- driver_locations: the driver, admins, and the passenger on an active ride with that driver
create policy driver_locations_select on public.driver_locations for select to authenticated
  using (
    driver_id = (select auth.uid())
    or (select public.is_admin())
    or exists (select 1 from public.rides r
               where r.driver_id = driver_locations.driver_id
                 and r.passenger_id = (select auth.uid())
                 and r.status in ('accepted', 'arrived', 'in_progress'))
  );

-- vehicles
create policy vehicles_select on public.vehicles for select to authenticated
  using (driver_id = (select auth.uid()) or (select public.is_admin()));
create policy vehicles_insert_own on public.vehicles for insert to authenticated
  with check (driver_id = (select auth.uid()) and (select public.driver_can_edit_application()));
create policy vehicles_update_own on public.vehicles for update to authenticated
  using (driver_id = (select auth.uid()) and (select public.driver_can_edit_application()))
  with check (driver_id = (select auth.uid()));

-- driver_documents
create policy driver_documents_select on public.driver_documents for select to authenticated
  using (driver_id = (select auth.uid()) or (select public.is_admin()));
create policy driver_documents_insert_own on public.driver_documents for insert to authenticated
  with check (driver_id = (select auth.uid()) and (select public.driver_can_edit_application()));
create policy driver_documents_update_own on public.driver_documents for update to authenticated
  using (driver_id = (select auth.uid()) and (select public.driver_can_edit_application()))
  with check (driver_id = (select auth.uid()));
create policy driver_documents_delete_own on public.driver_documents for delete to authenticated
  using (driver_id = (select auth.uid()) and (select public.driver_can_edit_application()));

-- quotes
create policy quotes_select_own on public.quotes for select to authenticated
  using (passenger_id = (select auth.uid()) or (select public.is_admin()));

-- rides: passenger, assigned driver, drivers with a pending offer, admins
create policy rides_select on public.rides for select to authenticated
  using (
    passenger_id = (select auth.uid())
    or driver_id = (select auth.uid())
    or (select public.is_admin())
    or exists (select 1 from public.ride_offers o
               where o.ride_id = rides.id and o.driver_id = (select auth.uid()) and o.response = 'pending')
  );

create policy ride_events_select on public.ride_events for select to authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.rides r where r.id = ride_events.ride_id
               and (r.passenger_id = (select auth.uid()) or r.driver_id = (select auth.uid())))
  );

create policy ride_offers_select on public.ride_offers for select to authenticated
  using (driver_id = (select auth.uid()) or (select public.is_admin()));

create policy payments_select on public.payments for select to authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.rides r where r.id = payments.ride_id
               and (r.passenger_id = (select auth.uid()) or r.driver_id = (select auth.uid())))
  );

create policy mpesa_callbacks_admin on public.mpesa_callbacks for select to authenticated
  using ((select public.is_admin()));

create policy ratings_select on public.ratings for select to authenticated
  using (rater_id = (select auth.uid()) or ratee_id = (select auth.uid()) or (select public.is_admin()));

create policy support_reports_select on public.support_reports for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy support_reports_insert_own on public.support_reports for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (ride_id is null or exists (select 1 from public.rides r where r.id = ride_id
         and (r.passenger_id = (select auth.uid()) or r.driver_id = (select auth.uid()))))
  );

create policy admin_actions_select on public.admin_actions for select to authenticated
  using ((select public.is_admin()));
