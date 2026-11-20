-- Lift Me — markets: run the same app in several cities / countries (e.g. Nairobi and a US city).
--
-- A market owns everything that differs by place: service area, currency, how money is stored,
-- time zone, km or miles, phone country code, emergency numbers, payment methods, commission and prices.
-- A ride belongs to the market of its pickup point. A driver belongs to one market.
--
-- MONEY RULE (replaces "always whole KES"): every amount is an INTEGER in the market's smallest unit
-- we charge in. `currency_decimals` says how to show it: KES 0 → 1050 means KES 1,050;
-- USD 2 → 1250 means $12.50. Never floats.

-- ---------------------------------------------------------------------------
-- markets
-- ---------------------------------------------------------------------------
create table public.markets (
  code text primary key check (code ~ '^[a-z0-9_]+$'),
  name text not null check (char_length(name) between 1 and 60),
  country_iso text not null check (country_iso ~ '^[a-z]{2}$'),             -- 'ke', 'us'
  currency text not null check (currency ~ '^[A-Z]{3}$'),                   -- 'KES', 'USD'
  currency_decimals integer not null default 0 check (currency_decimals between 0 and 3),
  timezone text not null,                                                    -- 'Africa/Nairobi'
  distance_unit text not null default 'km' check (distance_unit in ('km', 'mi')),
  phone_country_code text not null check (phone_country_code ~ '^\+[0-9]{1,4}$'),
  emergency_numbers jsonb not null default '[]'::jsonb,
  support_phone text not null default '',
  payment_methods public.payment_method[] not null default '{cash}' check (cardinality(payment_methods) > 0),
  commission_percent integer not null default 0 check (commission_percent between 0 and 100),
  prices_are_placeholder boolean not null default true,
  is_active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reject unknown time zones (a typo would break "today" / "this week" totals).
create or replace function public.check_market_timezone()
returns trigger
language plpgsql set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from pg_timezone_names where name = new.timezone) then
    raise exception 'unknown_timezone: %', new.timezone;
  end if;
  return new;
end $$;
create trigger markets_check_timezone before insert or update of timezone on public.markets
  for each row execute function public.check_market_timezone();

-- The first market is built from the current Nairobi settings, so nothing changes for the pilot.
insert into public.markets (code, name, country_iso, currency, currency_decimals, timezone, distance_unit,
                            phone_country_code, emergency_numbers, support_phone, payment_methods,
                            commission_percent, prices_are_placeholder, is_active, sort_order)
select 'nairobi', 'Nairobi',
       coalesce((select value #>> '{}' from public.settings where key = 'country_iso'), 'ke'),
       coalesce((select value #>> '{}' from public.settings where key = 'currency'), 'KES'),
       0,
       coalesce((select value #>> '{}' from public.settings where key = 'timezone'), 'Africa/Nairobi'),
       'km',
       coalesce((select value #>> '{}' from public.settings where key = 'country_code'), '+254'),
       coalesce((select value from public.settings where key = 'emergency_numbers'), '["999", "112"]'::jsonb),
       coalesce((select value #>> '{}' from public.settings where key = 'support_phone'), ''),
       '{mpesa,cash}',
       coalesce((select (value #>> '{}')::integer from public.settings where key = 'commission_percent'), 15),
       coalesce((select (value #>> '{}')::boolean from public.settings where key = 'pricing_is_placeholder'), true),
       true, 1;

-- These now live on each market.
delete from public.settings
 where key in ('currency', 'timezone', 'country_code', 'country_iso', 'emergency_numbers',
               'support_phone', 'commission_percent', 'pricing_is_placeholder');

-- ---------------------------------------------------------------------------
-- Service areas belong to a market.
-- ---------------------------------------------------------------------------
alter table public.service_area add column market_code text references public.markets (code);
update public.service_area set market_code = 'nairobi';
alter table public.service_area alter column market_code set not null;
create index service_area_gix on public.service_area using gist (area);

-- ---------------------------------------------------------------------------
-- Prices per market. `pricing` stays as the list of ride types (name, seats, tier).
-- per_distance is per km or per mile, following the market's distance_unit.
-- ---------------------------------------------------------------------------
create table public.market_prices (
  market_code text not null references public.markets (code) on delete cascade,
  ride_type text not null references public.pricing (ride_type) on delete cascade,
  base_fare integer not null check (base_fare >= 0),
  per_distance integer not null check (per_distance >= 0),
  per_minute integer not null check (per_minute >= 0),
  minimum_fare integer not null check (minimum_fare >= 0),
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (market_code, ride_type)
);

insert into public.market_prices (market_code, ride_type, base_fare, per_distance, per_minute, minimum_fare, is_active)
select 'nairobi', ride_type, base_fare, per_km, per_minute, minimum_fare, true from public.pricing;

alter table public.pricing
  drop column base_fare, drop column per_km, drop column per_minute, drop column minimum_fare, drop column currency;

-- ---------------------------------------------------------------------------
-- Quotes, rides and drivers carry their market.
-- ---------------------------------------------------------------------------
alter table public.quotes add column market_code text references public.markets (code);
update public.quotes set market_code = 'nairobi';
alter table public.quotes alter column market_code set not null;

alter table public.rides add column market_code text references public.markets (code);
update public.rides set market_code = 'nairobi';
alter table public.rides alter column market_code set not null;
create index rides_market_idx on public.rides (market_code, requested_at desc);

-- Null = not decided yet (set from the phone number when they sign up, or by an admin).
alter table public.drivers add column market_code text references public.markets (code);
update public.drivers set market_code = 'nairobi';

-- Required documents differ by country. Null country = required everywhere.
alter table public.document_types add column country_iso text check (country_iso ~ '^[a-z]{2}$');
update public.document_types set country_iso = 'ke';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- The active market whose active service area covers this point (null = we don't operate there).
create or replace function public.market_at_point(p_lat double precision, p_lng double precision)
returns text
language sql stable security definer set search_path = public, extensions, pg_temp
as $$
  select m.code
    from public.service_area a join public.markets m on m.code = a.market_code
   where a.is_active and m.is_active
     and extensions.st_covers(a.area, public.make_point(p_lat, p_lng))
   order by m.sort_order, m.code
   limit 1;
$$;

create or replace function public.point_in_service_area(p_lat double precision, p_lng double precision)
returns boolean
language sql stable security definer set search_path = public, extensions, pg_temp
as $$ select public.market_at_point(p_lat, p_lng) is not null; $$;

-- Market for a phone number, by country code (used to place new drivers).
create or replace function public.market_for_phone(p_phone text)
returns text
language sql stable security definer set search_path = public, pg_temp
as $$
  select code from public.markets
   where is_active and p_phone like phone_country_code || '%'
   order by length(phone_country_code) desc, sort_order, code
   limit 1;
$$;

-- fare = max(minimum, base + per_distance * distance + per_minute * minutes), rounded to a whole unit.
drop function public.calculate_fare(text, integer, integer);
create or replace function public.calculate_fare(p_market_code text, p_ride_type text, p_distance_m integer, p_duration_s integer)
returns integer
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare p public.market_prices; v_unit_m numeric;
begin
  select mp.* into p
    from public.market_prices mp join public.pricing t on t.ride_type = mp.ride_type
   where mp.market_code = p_market_code and mp.ride_type = p_ride_type and mp.is_active and t.is_active;
  if p.ride_type is null then raise exception 'unknown_ride_type'; end if;
  v_unit_m := case (select distance_unit from public.markets where code = p_market_code) when 'mi' then 1609.344 else 1000 end;
  return greatest(
    p.minimum_fare,
    round(p.base_fare + p.per_distance * (p_distance_m::numeric / v_unit_m) + p.per_minute * (p_duration_s::numeric / 60))::integer
  );
end $$;

-- ---------------------------------------------------------------------------
-- Quotes: market comes from the pickup; the drop-off must be in the same market.
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
declare q public.quotes; v_options jsonb; m public.markets; v_market text;
begin
  v_market := public.market_at_point(p_pickup_lat, p_pickup_lng);
  if v_market is null then raise exception 'pickup_outside_service_area'; end if;
  if public.market_at_point(p_dropoff_lat, p_dropoff_lng) is distinct from v_market then
    raise exception 'dropoff_outside_service_area';
  end if;
  select * into m from public.markets where code = v_market;

  select coalesce(jsonb_agg(jsonb_build_object(
           'ride_type', t.ride_type,
           'display_name', t.display_name,
           'description', t.description,
           'seats', t.seats,
           'fare', public.calculate_fare(m.code, t.ride_type, p_distance_m, p_duration_s),
           'currency', m.currency) order by t.sort_order), '[]'::jsonb)
    into v_options
    from public.pricing t join public.market_prices mp on mp.ride_type = t.ride_type and mp.market_code = m.code
   where t.is_active and mp.is_active;

  insert into public.quotes (passenger_id, market_code, pickup, pickup_address, pickup_note, dropoff, dropoff_address,
                             distance_m, duration_s, polyline, options, currency, expires_at)
  values (p_passenger_id, m.code, public.make_point(p_pickup_lat, p_pickup_lng), p_pickup_address, nullif(trim(p_pickup_note), ''),
          public.make_point(p_dropoff_lat, p_dropoff_lng), p_dropoff_address,
          p_distance_m, p_duration_s, p_polyline, v_options, m.currency,
          now() + make_interval(mins => coalesce(public.setting_int('quote_valid_minutes'), 10)))
  returning * into q;
  return q;
end $$;

-- ---------------------------------------------------------------------------
-- Requesting: the payment method must be offered in the ride's market.
-- ---------------------------------------------------------------------------
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

  if not exists (select 1 from public.markets where code = q.market_code and p_payment_method = any (payment_methods)) then
    raise exception 'payment_method_not_available';
  end if;

  select (o ->> 'fare')::integer into v_fare
    from jsonb_array_elements(q.options) o where o ->> 'ride_type' = p_ride_type;
  if v_fare is null then raise exception 'ride_type_not_in_quote'; end if;

  if exists (select 1 from public.rides where passenger_id = v_profile.id
             and status in ('searching', 'accepted', 'arrived', 'in_progress')) then
    raise exception 'active_ride_exists';
  end if;

  update public.quotes set used_at = now() where id = q.id;

  insert into public.rides (passenger_id, market_code, quote_id, ride_type, status, pickup, pickup_lat, pickup_lng, pickup_address, pickup_note,
                            dropoff, dropoff_lat, dropoff_lng, dropoff_address, distance_m, duration_s, polyline,
                            fare, currency, payment_method, search_expires_at)
  values (v_profile.id, q.market_code, q.id, p_ride_type, 'searching', q.pickup,
          extensions.st_y(q.pickup::extensions.geometry), extensions.st_x(q.pickup::extensions.geometry), q.pickup_address, q.pickup_note,
          q.dropoff, extensions.st_y(q.dropoff::extensions.geometry), extensions.st_x(q.dropoff::extensions.geometry), q.dropoff_address,
          q.distance_m, q.duration_s, q.polyline, v_fare, q.currency, p_payment_method,
          now() + make_interval(secs => coalesce(public.setting_int('search_timeout_seconds'), 120)))
  returning * into r;

  perform public.log_ride_event(r.id, null, 'searching', 'passenger');
  perform public.dispatch_ride(r.id);
  return r;
end $$;

-- Offers go only to drivers of the ride's market (on top of the distance and tier rules).
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
     and d.market_code = r.market_code
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

-- Commission comes from the ride's market.
create or replace function public.complete_trip(p_ride_id uuid)
returns public.rides
language plpgsql security definer set search_path = public, pg_temp
as $$
declare r public.rides; v_pct integer; v_commission integer;
begin
  perform public.assert_active_user();
  select m.commission_percent, round(rd.fare * m.commission_percent / 100.0)::integer
    into v_pct, v_commission
    from public.rides rd join public.markets m on m.code = rd.market_code
   where rd.id = p_ride_id;

  update public.rides
     set status = 'completed', completed_at = now(),
         commission_percent = coalesce(v_pct, 0),
         platform_commission = coalesce(v_commission, 0),
         driver_earnings = fare - coalesce(v_commission, 0)
   where id = p_ride_id and driver_id = auth.uid() and status = 'in_progress'
  returning * into r;
  if r.id is null then raise exception 'transition_not_allowed'; end if;

  insert into public.payments (ride_id, method, amount, currency, status)
  values (r.id, r.payment_method, r.fare, r.currency, 'pending')
  on conflict (ride_id) do nothing;

  perform public.log_ride_event(r.id, 'in_progress', 'completed', 'driver');
  return r;
end $$;

-- Switching payment method: only to one the market offers.
create or replace function public.change_payment_method(p_ride_id uuid, p_method public.payment_method)
returns public.payments
language plpgsql security definer set search_path = public, pg_temp
as $$
declare p public.payments; r public.rides;
begin
  perform public.assert_active_user();
  select * into r from public.rides where id = p_ride_id and passenger_id = auth.uid();
  if r.id is null then raise exception 'not_your_ride' using errcode = '42501'; end if;
  if not exists (select 1 from public.markets where code = r.market_code and p_method = any (payment_methods)) then
    raise exception 'payment_method_not_available';
  end if;
  update public.payments set method = p_method, status = 'pending', updated_at = now()
   where ride_id = p_ride_id and status <> 'paid' returning * into p;
  if p.id is null then raise exception 'payment_not_changeable'; end if;
  update public.rides set payment_method = p_method where id = p_ride_id;
  return p;
end $$;

-- ---------------------------------------------------------------------------
-- Drivers: placed in a market from their phone number; must have one to be approved.
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
    insert into public.drivers (id, market_code) values (v.id, public.market_for_phone(v.phone)) on conflict (id) do nothing;
  end if;
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
  if p_role = 'driver' then
    insert into public.drivers (id, market_code) values (p_user_id, public.market_for_phone(v.phone)) on conflict do nothing;
  end if;
  perform public.log_admin_action('role_changed', 'profile', p_user_id::text, jsonb_build_object('role', p_role));
  return v;
end $$;

-- Documents required for this driver = active required ones for everywhere or for the driver's country.
create or replace function public.required_document_types_for(p_driver_id uuid)
returns setof public.document_types
language sql stable security definer set search_path = public, pg_temp
as $$
  select t.* from public.document_types t
   where t.required and t.is_active
     and (t.country_iso is null
          or t.country_iso = (select m.country_iso from public.drivers d join public.markets m on m.code = d.market_code
                               where d.id = p_driver_id));
$$;

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
    from public.required_document_types_for(d.id) t
   where not exists (select 1 from public.driver_documents dd where dd.driver_id = d.id and dd.doc_type = t.code);
  if v_missing is not null then raise exception 'missing_documents: %', v_missing; end if;

  update public.drivers
     set status = 'pending', submitted_at = now(), reject_reason = null, reviewed_by = null, reviewed_at = null
   where id = d.id returning * into d;
  return d;
end $$;

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
  if p_approve and d.market_code is null then raise exception 'driver_market_required'; end if;

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

-- Move a driver to another market (e.g. their phone number didn't match one). Takes them offline.
create or replace function public.admin_set_driver_market(p_driver_id uuid, p_market_code text)
returns public.drivers
language plpgsql security definer set search_path = public, pg_temp
as $$
declare d public.drivers;
begin
  if not public.is_admin() then raise exception 'admin_only' using errcode = '42501'; end if;
  if not exists (select 1 from public.markets where code = p_market_code) then raise exception 'market_not_found'; end if;
  if exists (select 1 from public.rides where driver_id = p_driver_id and status in ('accepted', 'arrived', 'in_progress')) then
    raise exception 'driver_has_active_ride';
  end if;
  update public.drivers set market_code = p_market_code, is_online = false where id = p_driver_id returning * into d;
  if d.id is null then raise exception 'driver_not_found'; end if;
  perform public.log_admin_action('driver_market_changed', 'driver', p_driver_id::text, jsonb_build_object('market', p_market_code));
  return d;
end $$;

drop function public.admin_list_drivers(public.driver_status);
create or replace function public.admin_list_drivers(p_status public.driver_status default null)
returns table (
  id uuid, full_name text, phone text, status public.driver_status, submitted_at timestamptz,
  reviewed_at timestamptz, is_online boolean, plate text, ride_type text, market_code text, created_at timestamptz
)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then raise exception 'admin_only' using errcode = '42501'; end if;
  return query
    select d.id, p.full_name, p.phone, d.status, d.submitted_at, d.reviewed_at, d.is_online, v.plate, v.ride_type,
           d.market_code, d.created_at
      from public.drivers d join public.profiles p on p.id = d.id
      left join public.vehicles v on v.driver_id = d.id
     where p_status is null or d.status = p_status
     order by d.submitted_at desc nulls last, d.created_at desc;
end $$;

-- ---------------------------------------------------------------------------
-- Totals use the market's time zone and currency, and never add KES to USD.
-- ---------------------------------------------------------------------------
create or replace function public.get_driver_earnings()
returns jsonb
language sql stable security definer set search_path = public, pg_temp
as $$
  with m as (
    select mk.* from public.drivers d join public.markets mk on mk.code = d.market_code where d.id = auth.uid()
  ),
  done as (
    select r.*, (r.completed_at at time zone (select timezone from m)) as local_done
      from public.rides r
     where r.driver_id = auth.uid() and r.status = 'completed' and r.market_code = (select code from m)
  ),
  bounds as (
    select date_trunc('day', now() at time zone (select timezone from m)) as today,
           date_trunc('week', now() at time zone (select timezone from m)) as week
  )
  select jsonb_build_object(
    'market_code', (select code from m),
    'currency', (select currency from m),
    'currency_decimals', (select currency_decimals from m),
    'today', coalesce((select sum(driver_earnings) from done, bounds where local_done >= bounds.today), 0),
    'today_trips', (select count(*) from done, bounds where local_done >= bounds.today),
    'week', coalesce((select sum(driver_earnings) from done, bounds where local_done >= bounds.week), 0),
    'week_trips', (select count(*) from done, bounds where local_done >= bounds.week),
    'total', coalesce((select sum(driver_earnings) from done), 0),
    'total_trips', (select count(*) from done),
    'rating', public.average_rating(auth.uid())
  );
$$;

drop function public.admin_overview();
create or replace function public.admin_overview(p_market_code text default null)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare m public.markets; v_today timestamptz;
begin
  if not public.is_admin() then raise exception 'admin_only' using errcode = '42501'; end if;
  select * into m from public.markets
   where code = coalesce(p_market_code, (select code from public.markets order by sort_order, code limit 1));
  if m.code is null then raise exception 'market_not_found'; end if;
  v_today := date_trunc('day', now() at time zone m.timezone) at time zone m.timezone;
  return jsonb_build_object(
    'market_code', m.code,
    'currency', m.currency,
    'currency_decimals', m.currency_decimals,
    'prices_are_placeholder', m.prices_are_placeholder,
    'rides_today', (select count(*) from public.rides where market_code = m.code and requested_at >= v_today),
    'completed_today', (select count(*) from public.rides where market_code = m.code and status = 'completed' and completed_at >= v_today),
    'active_rides', (select count(*) from public.rides where market_code = m.code
                      and status in ('searching', 'accepted', 'arrived', 'in_progress')),
    'online_drivers', (select count(*) from public.drivers d join public.driver_locations l on l.driver_id = d.id
                        where d.market_code = m.code and d.is_online and d.status = 'approved'
                          and l.updated_at > now() - make_interval(secs => coalesce(public.setting_int('location_fresh_seconds'), 120))),
    -- Drivers with no market yet show up in every market so they are never missed.
    'pending_drivers', (select count(*) from public.drivers where status = 'pending' and submitted_at is not null
                         and (market_code = m.code or market_code is null)),
    'collected_today', coalesce((select sum(p.amount) from public.payments p join public.rides r on r.id = p.ride_id
                                  where r.market_code = m.code and p.status = 'paid' and p.paid_at >= v_today), 0),
    'collected_total', coalesce((select sum(p.amount) from public.payments p join public.rides r on r.id = p.ride_id
                                  where r.market_code = m.code and p.status = 'paid'), 0),
    'commission_total', coalesce((select sum(r.platform_commission) from public.rides r
                                    join public.payments p on p.ride_id = r.id
                                   where r.market_code = m.code and p.status = 'paid'), 0),
    'open_reports', (select count(*) from public.support_reports where status = 'open')
  );
end $$;

-- Ride details also carry the market (currency, decimals, units, emergency numbers) for display.
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
    'market', (select to_jsonb(m) - 'created_at' - 'updated_at' from public.markets m where m.code = r.market_code),
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

-- ---------------------------------------------------------------------------
-- Audit: market and price edits are logged like other config changes.
-- ---------------------------------------------------------------------------
create or replace function public.audit_config_change()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_new jsonb := to_jsonb(new);
begin
  new.updated_at := now();
  insert into public.admin_actions (admin_id, action, target_type, target_id, details)
  values (auth.uid(), 'config_updated', tg_table_name,
          coalesce(v_new ->> 'key',
                   case when v_new ? 'market_code' and v_new ? 'ride_type' then (v_new ->> 'market_code') || ':' || (v_new ->> 'ride_type') end,
                   v_new ->> 'ride_type', v_new ->> 'code'),
          jsonb_build_object('before', to_jsonb(old), 'after', v_new));
  return new;
end $$;

create trigger markets_audit before update on public.markets
  for each row execute function public.audit_config_change();
create trigger market_prices_audit before update on public.market_prices
  for each row execute function public.audit_config_change();

-- ---------------------------------------------------------------------------
-- Security
-- ---------------------------------------------------------------------------
alter table public.markets enable row level security;
alter table public.market_prices enable row level security;

revoke all on public.markets, public.market_prices from anon, authenticated;
grant all on public.markets, public.market_prices to service_role;

-- Markets are public information (the phone-number screen needs them before login).
grant select on public.markets to anon, authenticated;
grant insert, update on public.markets to authenticated;          -- admins only (RLS)
grant select on public.market_prices to authenticated;
grant insert, update on public.market_prices to authenticated;    -- admins only (RLS)

create policy markets_select on public.markets for select to anon, authenticated using (true);
create policy markets_admin_insert on public.markets for insert to authenticated with check ((select public.is_admin()));
create policy markets_admin_update on public.markets for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy market_prices_select on public.market_prices for select to authenticated using (true);
create policy market_prices_admin_insert on public.market_prices for insert to authenticated with check ((select public.is_admin()));
create policy market_prices_admin_update on public.market_prices for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- New functions start locked; grant exactly what clients may call.
revoke all on function public.market_at_point(double precision, double precision),
                       public.market_for_phone(text),
                       public.calculate_fare(text, text, integer, integer),
                       public.required_document_types_for(uuid),
                       public.admin_set_driver_market(uuid, text),
                       public.admin_list_drivers(public.driver_status),
                       public.admin_overview(text),
                       public.check_market_timezone()
  from public, anon, authenticated;

grant execute on function
  public.market_at_point(double precision, double precision),
  public.admin_set_driver_market(uuid, text),
  public.admin_list_drivers(public.driver_status),
  public.admin_overview(text)
to authenticated;

grant execute on all functions in schema public to service_role;
