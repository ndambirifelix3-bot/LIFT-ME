-- Lift Me — driver money: a balance (wallet) per driver, kept as a ledger of entries.
--
-- balance > 0  Lift Me owes the driver (their share of M-Pesa / card trips, not yet paid out)
-- balance < 0  the driver owes Lift Me (commission on cash trips, where the driver kept the cash)
--
-- Entries (amounts in the smallest unit of the driver's currency, like every other amount):
--   cash_commission  −commission   cash trip completed (the driver collected the whole fare)
--   trip_earnings    +driver share M-Pesa / card trip paid to Lift Me
--   payout           −amount       admin paid the driver (e.g. M-Pesa transfer)
--   driver_payment   +amount       the driver paid what they owed
--   adjustment       ±amount       admin correction (a note is required)
-- Entries are never edited or deleted; mistakes are fixed with an adjustment.
-- A driver who owes more than their city's limit can't go online or get requests until they pay.

-- ---------------------------------------------------------------------------
-- Per-city settings (editable in Admin → Markets)
-- ---------------------------------------------------------------------------
alter table public.markets
  add column driver_debt_limit integer check (driver_debt_limit is null or driver_debt_limit >= 0),
  add column driver_payment_instructions text not null default '';
comment on column public.markets.driver_debt_limit is
  'Most a driver may owe (smallest currency unit) before they can''t go online. Null = no limit.';

update public.markets set driver_debt_limit = 1000,
  driver_payment_instructions = 'Pay your balance by M-Pesa to the Lift Me Paybill (details from the Lift Me office). Use your phone number as the account number.'
 where code = 'nairobi';
update public.markets set driver_debt_limit = 5000,
  driver_payment_instructions = 'Contact the Lift Me office to pay your balance.'
 where code = 'indianapolis';

-- ---------------------------------------------------------------------------
-- Ledger + cached balance
-- ---------------------------------------------------------------------------
alter table public.drivers add column wallet_balance integer not null default 0;

create table public.driver_ledger (
  id bigint generated always as identity primary key,
  driver_id uuid not null references public.drivers (id) on delete cascade,
  kind text not null check (kind in ('cash_commission', 'trip_earnings', 'payout', 'driver_payment', 'adjustment')),
  amount integer not null check (amount <> 0),
  currency text not null,
  ride_id uuid references public.rides (id) on delete set null,
  reference text,           -- e.g. M-Pesa transaction code of a payout
  note text,
  balance_after integer not null default 0,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  check (kind not in ('cash_commission', 'trip_earnings') or ride_id is not null),
  check (kind <> 'adjustment' or coalesce(trim(note), '') <> '')
);
-- At most one commission OR earnings entry per trip (a safety net; the functions below check first).
create unique index driver_ledger_one_per_ride on public.driver_ledger (ride_id) where kind in ('cash_commission', 'trip_earnings');
create index driver_ledger_driver on public.driver_ledger (driver_id, id desc);

alter table public.driver_ledger enable row level security;
revoke all on public.driver_ledger from anon, authenticated;
grant select on public.driver_ledger to authenticated;
grant all on public.driver_ledger to service_role;
create policy driver_ledger_select on public.driver_ledger for select to authenticated
  using (driver_id = (select auth.uid()) or (select public.is_admin()));
-- No insert/update/delete policies: entries are only written by the functions below.

/** The limit that applies to a driver (null = none). */
create or replace function public.driver_debt_limit(p_driver_id uuid)
returns integer
language sql stable security definer set search_path = public, pg_temp
as $$ select m.driver_debt_limit from public.drivers d join public.markets m on m.code = d.market_code where d.id = p_driver_id; $$;

/** True when the driver owes more than their city allows. */
create or replace function public.driver_over_debt_limit(p_driver_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select coalesce(d.wallet_balance < -m.driver_debt_limit, false)
    from public.drivers d left join public.markets m on m.code = d.market_code
   where d.id = p_driver_id;
$$;

/** Keeps drivers.wallet_balance in step, records the running balance, blocks/alerts over the limit. */
create or replace function public.driver_ledger_apply()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_before integer; v_after integer; v_limit integer; v_decimals integer;
begin
  update public.drivers set wallet_balance = wallet_balance + new.amount
   where id = new.driver_id
  returning wallet_balance into v_after;
  v_before := v_after - new.amount;
  new.balance_after := v_after;

  select m.driver_debt_limit, m.currency_decimals into v_limit, v_decimals
    from public.drivers d join public.markets m on m.code = d.market_code where d.id = new.driver_id;

  -- Just went over the limit: stop new requests and tell the driver how to fix it.
  if v_limit is not null and v_after < -v_limit and v_before >= -v_limit then
    update public.drivers set is_online = false where id = new.driver_id;
    perform public.push_notify(new.driver_id, 'Please pay your Lift Me balance',
      'You owe ' || public.format_money(-v_after, new.currency, coalesce(v_decimals, 0)) ||
      '. Pay it to go online again. Details in Earnings.', '/driver/earnings', 'wallet');
  end if;
  return new;
end $$;

create trigger driver_ledger_apply before insert on public.driver_ledger
  for each row execute function public.driver_ledger_apply();

-- Entries are permanent.
create or replace function public.driver_ledger_immutable()
returns trigger
language plpgsql set search_path = public, pg_temp
as $$ begin raise exception 'ledger_entries_are_permanent'; end $$;
create trigger driver_ledger_no_update before update or delete on public.driver_ledger
  for each row execute function public.driver_ledger_immutable();

-- ---------------------------------------------------------------------------
-- Automatic entries from trips
-- ---------------------------------------------------------------------------
/** Commission owed on a cash trip (driver kept the cash). Safe to call twice. */
create or replace function public.ledger_cash_commission(p_ride_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare r public.rides;
begin
  -- Lock the trip so two events for it (trip completed, cash confirmed) are handled one at a time.
  select * into r from public.rides where id = p_ride_id for update;
  if r.driver_id is null or r.status <> 'completed' or coalesce(r.platform_commission, 0) = 0 then return; end if;
  -- Already charged, or already credited as M-Pesa earnings: nothing to do. (Checked first, because
  -- the balance changes as soon as an entry is attempted.)
  if exists (select 1 from public.driver_ledger where ride_id = r.id and kind in ('cash_commission', 'trip_earnings')) then return; end if;
  insert into public.driver_ledger (driver_id, kind, amount, currency, ride_id, note)
  values (r.driver_id, 'cash_commission', -r.platform_commission, r.currency, r.id,
          'Commission ' || r.commission_percent || '% on a cash trip');
end $$;

/** The driver's share of a trip paid to Lift Me (M-Pesa / card). Safe to call twice. */
create or replace function public.ledger_trip_earnings(p_ride_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare r public.rides;
begin
  select * into r from public.rides where id = p_ride_id for update;
  if r.driver_id is null or r.status <> 'completed' or coalesce(r.driver_earnings, 0) = 0 then return; end if;
  if exists (select 1 from public.driver_ledger where ride_id = r.id and kind in ('cash_commission', 'trip_earnings')) then return; end if;
  insert into public.driver_ledger (driver_id, kind, amount, currency, ride_id, note)
  values (r.driver_id, 'trip_earnings', r.driver_earnings, r.currency, r.id, 'Your share of a trip paid to Lift Me');
end $$;

-- Cash trips: charge commission as soon as the trip is completed (not only when the driver taps
-- "cash received"), so forgetting to confirm doesn't skip the commission.
create or replace function public.ledger_on_ride_completed()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' and new.payment_method = 'cash' then
    perform public.ledger_cash_commission(new.id);
  end if;
  return new;
end $$;
create trigger ledger_on_ride_completed after update of status on public.rides
  for each row execute function public.ledger_on_ride_completed();

-- Payments: M-Pesa paid → driver earns their share; switched to cash (M-Pesa failed, driver took
-- cash) → commission.
create or replace function public.ledger_on_payment_paid()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    if new.method = 'cash' then perform public.ledger_cash_commission(new.ride_id);
    else perform public.ledger_trip_earnings(new.ride_id);
    end if;
  end if;
  return new;
end $$;
create trigger ledger_on_payment_paid after insert or update of status on public.payments
  for each row execute function public.ledger_on_payment_paid();

-- ---------------------------------------------------------------------------
-- Matching and going online respect the limit
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
  if p_online and public.driver_over_debt_limit(d.id) then raise exception 'balance_due' using errcode = '42501'; end if;
  update public.drivers set is_online = p_online, last_seen = now() where id = d.id returning * into d;
  return d;
end $$;

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
    join public.markets m on m.code = d.market_code
   where d.status = 'approved' and d.is_online and not p.is_suspended
     and d.market_code = r.market_code
     and d.id <> r.passenger_id
     and (m.driver_debt_limit is null or d.wallet_balance >= -m.driver_debt_limit)
     and l.updated_at > now() - make_interval(secs => coalesce(public.setting_int('location_fresh_seconds'), 120))
     and extensions.st_dwithin(l.location, r.pickup, coalesce(public.setting_int('match_radius_km'), 5) * 1000)
     and public.vehicle_can_take(v.ride_type, r.ride_type)
     and not exists (select 1 from public.rides a where a.driver_id = d.id
                     and a.status in ('accepted', 'arrived', 'in_progress'))
  on conflict (ride_id, driver_id) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- ---------------------------------------------------------------------------
-- Driver: my wallet
-- ---------------------------------------------------------------------------
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
    'entries', coalesce((
      select jsonb_agg(to_jsonb(e) - 'driver_id' - 'created_by' order by e.id desc)
        from (select * from public.driver_ledger where driver_id = d.id order by id desc limit 50) e), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------------------
-- Admin: balances and recording money
-- ---------------------------------------------------------------------------
create or replace function public.admin_driver_balances(p_market_code text)
returns table (driver_id uuid, full_name text, phone text, balance integer, currency text, currency_decimals integer,
               over_limit boolean, is_online boolean, last_entry_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then raise exception 'admin_only' using errcode = '42501'; end if;
  return query
    select d.id, p.full_name, p.phone, d.wallet_balance, m.currency, m.currency_decimals,
           coalesce(d.wallet_balance < -m.driver_debt_limit, false), d.is_online,
           (select max(created_at) from public.driver_ledger l where l.driver_id = d.id)
      from public.drivers d
      join public.profiles p on p.id = d.id
      join public.markets m on m.code = d.market_code
     where d.market_code = p_market_code
       and (d.wallet_balance <> 0 or exists (select 1 from public.driver_ledger l where l.driver_id = d.id))
     order by d.wallet_balance asc, p.full_name;
end $$;

/**
 * Admin records money that moved outside the app:
 *   payout          Lift Me paid the driver   (p_amount > 0, at most what Lift Me owes)
 *   driver_payment  the driver paid Lift Me   (p_amount > 0, at most what the driver owes)
 *   adjustment      correction, ± p_amount, note required
 */
create or replace function public.admin_record_driver_money(
  p_driver_id uuid, p_kind text, p_amount integer, p_reference text default null, p_note text default null)
returns public.driver_ledger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare d public.drivers; m public.markets; e public.driver_ledger; v_amount integer;
begin
  if not public.is_admin() then raise exception 'admin_only' using errcode = '42501'; end if;
  select * into d from public.drivers where id = p_driver_id for update;
  if d.id is null then raise exception 'driver_not_found'; end if;
  select * into m from public.markets where code = d.market_code;
  if m.code is null then raise exception 'driver_market_required'; end if;
  if coalesce(p_amount, 0) = 0 then raise exception 'amount_required'; end if;

  if p_kind = 'payout' then
    if p_amount < 0 or p_amount > greatest(d.wallet_balance, 0) then raise exception 'payout_more_than_owed'; end if;
    v_amount := -p_amount;
  elsif p_kind = 'driver_payment' then
    if p_amount < 0 or p_amount > greatest(-d.wallet_balance, 0) then raise exception 'payment_more_than_owed'; end if;
    v_amount := p_amount;
  elsif p_kind = 'adjustment' then
    if coalesce(trim(p_note), '') = '' then raise exception 'reason_required'; end if;
    v_amount := p_amount;
  else
    raise exception 'unknown_kind';
  end if;

  insert into public.driver_ledger (driver_id, kind, amount, currency, reference, note, created_by)
  values (d.id, p_kind, v_amount, m.currency, nullif(trim(p_reference), ''), nullif(trim(p_note), ''), auth.uid())
  returning * into e;

  perform public.log_admin_action('driver_money_' || p_kind, 'driver', d.id::text,
    jsonb_build_object('amount', v_amount, 'currency', m.currency, 'reference', p_reference, 'note', p_note,
                       'balance_after', e.balance_after));

  if p_kind = 'payout' then
    perform public.push_notify(d.id, 'Payout sent 💸',
      public.format_money(p_amount, m.currency, m.currency_decimals) || ' was sent to you' ||
      coalesce(' (ref ' || nullif(trim(p_reference), '') || ')', '') || '.', '/driver/earnings', 'wallet');
  elsif p_kind = 'driver_payment' then
    perform public.push_notify(d.id, 'Payment received ✅',
      'Thanks! We received ' || public.format_money(p_amount, m.currency, m.currency_decimals) ||
      case when e.balance_after >= -coalesce(m.driver_debt_limit, 0) and d.wallet_balance < -coalesce(m.driver_debt_limit, 0)
           then '. You can go online again.' else '.' end, '/driver/earnings', 'wallet');
  end if;
  return e;
end $$;

-- ---------------------------------------------------------------------------
-- Existing completed trips (test data so far): add their entries once.
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in select rd.id, rd.payment_method, p.status pay_status
             from public.rides rd left join public.payments p on p.ride_id = rd.id
            where rd.status = 'completed' and rd.driver_id is not null
            order by rd.completed_at
  loop
    if r.payment_method = 'cash' then perform public.ledger_cash_commission(r.id);
    elsif r.pay_status = 'paid' then perform public.ledger_trip_earnings(r.id);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
revoke all on function public.driver_debt_limit(uuid), public.driver_over_debt_limit(uuid),
  public.ledger_cash_commission(uuid), public.ledger_trip_earnings(uuid),
  public.driver_ledger_apply(), public.driver_ledger_immutable(),
  public.ledger_on_ride_completed(), public.ledger_on_payment_paid() from public, anon, authenticated;
revoke all on function public.get_my_wallet(), public.admin_driver_balances(text),
  public.admin_record_driver_money(uuid, text, integer, text, text) from public, anon;
grant execute on function public.get_my_wallet(), public.admin_driver_balances(text),
  public.admin_record_driver_money(uuid, text, integer, text, text) to authenticated;
