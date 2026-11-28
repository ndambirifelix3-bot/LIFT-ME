-- Lift Me — M-Pesa payments never stay "waiting" forever.
--
-- Normally Safaricom calls mpesa-callback within seconds. If that call never comes (phone off, network
-- trouble, Safaricom delays), a job every minute hands such payments to the Edge Function
-- `mpesa-reconcile`, which asks M-Pesa directly (status query): paid → marked paid; failed or
-- cancelled → marked failed (the passenger can try again or pay cash); still no answer after
-- 15 minutes → marked failed with "No answer from M-Pesa".

alter table public.payments add column mpesa_checked_at timestamptz;

/** M-Pesa payments waiting for over 90 seconds, not checked in the last minute (oldest first). */
create or replace function public.mpesa_payments_to_recheck(p_limit integer default 10)
returns setof public.payments
language sql stable security definer set search_path = public, pg_temp
as $$
  select * from public.payments
   where method = 'mpesa' and status = 'pending' and mpesa_checkout_request_id is not null
     and updated_at < now() - interval '90 seconds'
     and updated_at > now() - interval '2 days'
     and (mpesa_checked_at is null or mpesa_checked_at < now() - interval '60 seconds')
   order by updated_at
   limit p_limit
$$;

create or replace function public.mpesa_recheck_dispatch()
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare cfg public.push_config;
begin
  if not exists (select 1 from public.mpesa_payments_to_recheck(1)) then return; end if;
  select * into cfg from public.push_config where id;
  if cfg.function_url is null or to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then return; end if;
  perform net.http_post(
    url := regexp_replace(cfg.function_url, '/push-send/?$', '/mpesa-reconcile'),
    body := '{}'::jsonb,
    params := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', cfg.trigger_secret),
    timeout_milliseconds := 30000
  );
exception when others then
  raise warning 'mpesa recheck dispatch failed: %', sqlerrm;
end $$;

revoke all on function public.mpesa_payments_to_recheck(integer), public.mpesa_recheck_dispatch() from public, anon, authenticated;
grant execute on function public.mpesa_payments_to_recheck(integer), public.mpesa_recheck_dispatch() to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('lift-me-mpesa-recheck', '* * * * *', 'select public.mpesa_recheck_dispatch()');
  end if;
end $$;
