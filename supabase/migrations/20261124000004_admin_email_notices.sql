-- Lift Me — email the admin team when something needs attention:
--   * a driver submits (or re-submits) an application
--   * a passenger or driver sends a help report (safety reports are marked URGENT)
--
-- Like push notifications: a trigger writes a row to admin_email_outbox, and the database hands it to
-- the Edge Function `admin-notify` (pg_net), which sends it through Resend (secret RESEND_API_KEY).
-- Who receives them: setting `admin_notify_emails` (default support@rideliftme.com, which forwards to
-- the team's inbox). Emails never block the app: if sending fails, it's recorded in the outbox.

insert into public.settings (key, value, description) values
  ('admin_notify_emails', '["support@rideliftme.com"]', 'Who gets admin emails (new driver applications, help reports). A list of addresses.')
on conflict (key) do nothing;

create table public.admin_email_outbox (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('driver_application', 'support_report', 'test')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  recipients text[],
  error text
);
alter table public.admin_email_outbox enable row level security;
revoke all on public.admin_email_outbox from anon, authenticated;
grant select on public.admin_email_outbox to authenticated;
grant all on public.admin_email_outbox to service_role;
create policy admin_email_outbox_admin_read on public.admin_email_outbox for select to authenticated
  using ((select public.is_admin()));

/** Queue an admin email. Never raises: a notice must not break an application or a report. */
create or replace function public.admin_notify(p_kind text, p_payload jsonb)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  insert into public.admin_email_outbox (kind, payload) values (p_kind, coalesce(p_payload, '{}'::jsonb));
exception when others then
  raise warning 'admin_notify failed: %', sqlerrm;
end $$;

-- Hand each new row to the admin-notify function (same address as push-send, same secret).
create or replace function public.admin_email_dispatch()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare cfg public.push_config;
begin
  select * into cfg from public.push_config where id;
  if cfg.function_url is null or to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then
    return new;
  end if;
  perform net.http_post(
    url := regexp_replace(cfg.function_url, '/push-send/?$', '/admin-notify'),
    body := jsonb_build_object('outbox_id', new.id),
    params := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', cfg.trigger_secret),
    timeout_milliseconds := 10000
  );
  return new;
exception when others then
  raise warning 'admin email dispatch failed: %', sqlerrm;
  return new;
end $$;
create trigger admin_email_dispatch after insert on public.admin_email_outbox
  for each row execute function public.admin_email_dispatch();

-- ---------------------------------------------------------------------------
-- New driver application
-- ---------------------------------------------------------------------------
create or replace function public.notify_driver_application()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare p public.profiles; v public.vehicles; m public.markets; t public.pricing;
begin
  if new.submitted_at is null or old.submitted_at is not distinct from new.submitted_at then return new; end if;
  select * into p from public.profiles where id = new.id;
  select * into v from public.vehicles where driver_id = new.id;
  select * into m from public.markets where code = new.market_code;
  select * into t from public.pricing where ride_type = v.ride_type;
  perform public.admin_notify('driver_application', jsonb_build_object(
    'driver_id', new.id,
    'name', p.full_name,
    'phone', p.phone,
    'email', p.email,
    'market', coalesce(m.name, new.market_code),
    'vehicle', nullif(trim(concat_ws(' ', v.colour, v.make, v.model, case when v.year is not null then '(' || v.year || ')' end)), ''),
    'plate', v.plate,
    'ride_type', coalesce(t.display_name, v.ride_type),
    'resubmitted', old.reject_reason is not null or old.reviewed_at is not null));
  return new;
end $$;
create trigger notify_driver_application after update of submitted_at on public.drivers
  for each row execute function public.notify_driver_application();

-- ---------------------------------------------------------------------------
-- New help report
-- ---------------------------------------------------------------------------
create or replace function public.notify_support_report()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = new.user_id;
  perform public.admin_notify('support_report', jsonb_build_object(
    'report_id', new.id,
    'category', new.category,
    'message', left(new.message, 1000),
    'ride_id', new.ride_id,
    'name', p.full_name,
    'role', p.role,
    'phone', p.phone,
    'email', p.email));
  return new;
end $$;
create trigger notify_support_report after insert on public.support_reports
  for each row execute function public.notify_support_report();

/** Admin dashboard: send a test email to the admin addresses. */
create or replace function public.admin_send_test_email()
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then raise exception 'admin_only' using errcode = '42501'; end if;
  perform public.admin_notify('test', jsonb_build_object('requested_by', (select full_name from public.profiles where id = auth.uid())));
end $$;

revoke all on function public.admin_notify(text, jsonb), public.admin_email_dispatch(), public.notify_driver_application(),
  public.notify_support_report() from public, anon, authenticated;
revoke all on function public.admin_send_test_email() from public, anon;
grant execute on function public.admin_send_test_email() to authenticated;
