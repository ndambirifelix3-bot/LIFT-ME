-- Lift Me — drivers pay what they owe with M-Pesa from the app ("Pay now with M-Pesa").
--
-- The driver taps Pay, gets the M-Pesa prompt, enters their PIN. Safaricom confirms (mpesa-callback,
-- or the every-minute re-check), the payment is marked paid, and a 'driver_payment' entry clears their
-- balance automatically — no admin needed. Written only by the Edge Functions (service role).

create table public.driver_mpesa_payments (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers (id) on delete cascade,
  amount integer not null check (amount > 0),
  currency text not null default 'KES',
  phone text not null,
  checkout_request_id text unique,
  merchant_request_id text,
  status public.payment_status not null default 'pending',
  mpesa_receipt text unique,
  result_code text,
  result_desc text,
  mpesa_checked_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index driver_mpesa_payments_driver_idx on public.driver_mpesa_payments (driver_id, created_at desc);
alter table public.driver_mpesa_payments enable row level security;
revoke all on public.driver_mpesa_payments from anon, authenticated;
grant select on public.driver_mpesa_payments to authenticated;
grant all on public.driver_mpesa_payments to service_role;
create policy driver_mpesa_payments_read on public.driver_mpesa_payments for select to authenticated
  using (driver_id = (select auth.uid()) or (select public.is_admin()));

-- Paid → credit the driver's balance once.
create or replace function public.driver_mpesa_payment_paid()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_decimals integer;
begin
  if new.status <> 'paid' or old.status = 'paid' then return new; end if;
  insert into public.driver_ledger (driver_id, kind, amount, currency, reference, note)
  values (new.driver_id, 'driver_payment', new.amount, new.currency, coalesce(new.mpesa_receipt, 'M-Pesa'), 'Paid with M-Pesa in the app');
  select m.currency_decimals into v_decimals from public.drivers d join public.markets m on m.code = d.market_code where d.id = new.driver_id;
  perform public.push_notify(new.driver_id, 'Payment received ✅',
    public.format_money(new.amount, new.currency, coalesce(v_decimals, 0)) || ' received by M-Pesa. Thank you!', '/driver/earnings', 'wallet');
  return new;
end $$;
create trigger driver_mpesa_payment_paid after update of status on public.driver_mpesa_payments
  for each row execute function public.driver_mpesa_payment_paid();

/** Driver M-Pesa payments waiting over 90 seconds, not checked in the last minute. */
create or replace function public.driver_mpesa_to_recheck(p_limit integer default 10)
returns setof public.driver_mpesa_payments
language sql stable security definer set search_path = public, pg_temp
as $$
  select * from public.driver_mpesa_payments
   where status = 'pending' and checkout_request_id is not null
     and updated_at < now() - interval '90 seconds'
     and updated_at > now() - interval '2 days'
     and (mpesa_checked_at is null or mpesa_checked_at < now() - interval '60 seconds')
   order by updated_at
   limit p_limit
$$;

-- The every-minute re-check also covers driver payments.
create or replace function public.mpesa_recheck_dispatch()
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare cfg public.push_config;
begin
  if not exists (select 1 from public.mpesa_payments_to_recheck(1))
     and not exists (select 1 from public.driver_mpesa_to_recheck(1)) then return; end if;
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

-- Driver money screen: can this driver pay by M-Pesa?
create or replace function public.get_my_wallet()
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare d public.drivers; m public.markets;
begin
  perform public.assert_active_user();
  select * into d from public.drivers where id = auth.uid();
  if d.id is null then raise exception 'not_a_driver' using errcode = '42501'; end if;
  select * into m from public.markets where code = d.market_code;
  return jsonb_build_object(
    'balance', d.wallet_balance,
    'currency', coalesce(m.currency, 'KES'),
    'currency_decimals', coalesce(m.currency_decimals, 0),
    'debt_limit', m.driver_debt_limit,
    'over_limit', coalesce(d.wallet_balance < -m.driver_debt_limit, false),
    'payment_instructions', coalesce(m.driver_payment_instructions, ''),
    'launch_offer', public.driver_launch_offer(d.id, d.market_code),
    'can_pay_mpesa', coalesce(m.currency = 'KES' and 'mpesa' = any (m.payment_methods), false),
    'entries', coalesce((
      select jsonb_agg(to_jsonb(e) - 'driver_id' - 'created_by' order by e.id desc)
        from (select * from public.driver_ledger where driver_id = d.id order by id desc limit 50) e), '[]'::jsonb));
end $$;

revoke all on function public.driver_mpesa_payment_paid(), public.driver_mpesa_to_recheck(integer) from public, anon, authenticated;
grant execute on function public.driver_mpesa_to_recheck(integer) to service_role;
