-- Lift Me — core schema
-- Money is always stored as whole KES (integer). Never floats.

create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('passenger', 'driver', 'admin');
create type public.driver_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type public.ride_status as enum (
  'searching', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled', 'no_driver_found'
);
create type public.payment_method as enum ('cash', 'mpesa');
create type public.payment_status as enum ('pending', 'paid', 'failed');
create type public.offer_response as enum ('pending', 'accepted', 'declined', 'expired');

-- ---------------------------------------------------------------------------
-- profiles: one row per user. role can only change via admin RPC / database.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 100),
  phone text,
  role public.user_role not null default 'passenger',
  role_chosen boolean not null default false,
  is_suspended boolean not null default false,
  delete_requested_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- settings: key/value config so nothing is hard-coded in the app.
-- ---------------------------------------------------------------------------
create table public.settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- service_area: the pilot polygon(s).
-- ---------------------------------------------------------------------------
create table public.service_area (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  area extensions.geography(MultiPolygon, 4326) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- pricing: one row per ride type. All money in whole KES.
-- tier: a driver whose vehicle is tier N can take ride types with tier <= N.
-- ---------------------------------------------------------------------------
create table public.pricing (
  ride_type text primary key check (ride_type ~ '^[a-z_]+$'),
  display_name text not null,
  description text not null default '',
  base_fare integer not null check (base_fare >= 0),
  per_km integer not null check (per_km >= 0),
  per_minute integer not null check (per_minute >= 0),
  minimum_fare integer not null check (minimum_fare >= 0),
  currency text not null default 'KES',
  seats integer not null default 4,
  tier integer not null default 1,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- drivers: driver application + online state.
-- submitted_at null = application not yet submitted (incomplete).
-- ---------------------------------------------------------------------------
create table public.drivers (
  id uuid primary key references public.profiles (id) on delete cascade,
  status public.driver_status not null default 'pending',
  id_number text check (char_length(id_number) <= 30),
  licence_number text check (char_length(licence_number) <= 30),
  email text check (char_length(email) <= 200),
  photo_path text,
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  reject_reason text,
  is_online boolean not null default false,
  last_seen timestamptz,
  created_at timestamptz not null default now()
);

-- Live location kept in its own small table so passengers can follow
-- their driver without seeing the driver's private application data.
create table public.driver_locations (
  driver_id uuid primary key references public.drivers (id) on delete cascade,
  location extensions.geography(Point, 4326) not null,
  heading real,
  updated_at timestamptz not null default now()
);
create index driver_locations_gix on public.driver_locations using gist (location);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null unique references public.drivers (id) on delete cascade,
  make text not null check (char_length(make) between 1 and 40),
  model text not null check (char_length(model) between 1 and 40),
  year integer not null check (year between 1980 and 2100),
  colour text not null check (char_length(colour) between 1 and 30),
  plate text not null unique check (char_length(plate) between 3 and 12),
  ride_type text not null default 'lift' references public.pricing (ride_type),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Editable list of required documents.
create table public.document_types (
  code text primary key check (code ~ '^[a-z_]+$'),
  name text not null,
  description text not null default '',
  required boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0
);

create table public.driver_documents (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers (id) on delete cascade,
  doc_type text not null references public.document_types (code),
  file_path text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  uploaded_at timestamptz not null default now(),
  unique (driver_id, doc_type)
);

-- ---------------------------------------------------------------------------
-- quotes: created ONLY by the get-quote Edge Function (service role).
-- options = [{ride_type, display_name, fare, currency}]
-- ---------------------------------------------------------------------------
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references public.profiles (id) on delete cascade,
  pickup extensions.geography(Point, 4326) not null,
  pickup_address text not null,
  pickup_note text,
  dropoff extensions.geography(Point, 4326) not null,
  dropoff_address text not null,
  distance_m integer not null check (distance_m >= 0),
  duration_s integer not null check (duration_s >= 0),
  polyline text,
  options jsonb not null,
  currency text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- rides
-- ---------------------------------------------------------------------------
create table public.rides (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references public.profiles (id),
  driver_id uuid references public.profiles (id),
  quote_id uuid references public.quotes (id),
  ride_type text not null references public.pricing (ride_type),
  status public.ride_status not null default 'searching',
  pickup extensions.geography(Point, 4326) not null,
  pickup_lat double precision not null,
  pickup_lng double precision not null,
  pickup_address text not null,
  pickup_note text,
  dropoff extensions.geography(Point, 4326) not null,
  dropoff_lat double precision not null,
  dropoff_lng double precision not null,
  dropoff_address text not null,
  distance_m integer not null,
  duration_s integer not null,
  polyline text,
  fare integer not null check (fare >= 0),
  currency text not null,
  payment_method public.payment_method not null,
  commission_percent integer,
  platform_commission integer,
  driver_earnings integer,
  search_expires_at timestamptz not null,
  share_token uuid not null default gen_random_uuid() unique,
  requested_at timestamptz not null default now(),
  accepted_at timestamptz,
  arrived_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by public.user_role,
  cancel_reason text
);
create index rides_passenger_idx on public.rides (passenger_id, requested_at desc);
create index rides_driver_idx on public.rides (driver_id, requested_at desc);
create index rides_status_idx on public.rides (status);
create index rides_pickup_gix on public.rides using gist (pickup);
-- A passenger can have at most one active ride; same for a driver.
create unique index rides_one_active_passenger on public.rides (passenger_id)
  where status in ('searching', 'accepted', 'arrived', 'in_progress');
create unique index rides_one_active_driver on public.rides (driver_id)
  where status in ('accepted', 'arrived', 'in_progress');

create table public.ride_events (
  id bigint generated always as identity primary key,
  ride_id uuid not null references public.rides (id) on delete cascade,
  from_status public.ride_status,
  to_status public.ride_status not null,
  actor_id uuid,
  actor_role text not null,
  note text,
  created_at timestamptz not null default now()
);
create index ride_events_ride_idx on public.ride_events (ride_id, created_at);

-- Which drivers were shown a request.
create table public.ride_offers (
  ride_id uuid not null references public.rides (id) on delete cascade,
  driver_id uuid not null references public.drivers (id) on delete cascade,
  response public.offer_response not null default 'pending',
  offered_at timestamptz not null default now(),
  expires_at timestamptz not null,
  responded_at timestamptz,
  primary key (ride_id, driver_id)
);
create index ride_offers_driver_idx on public.ride_offers (driver_id, response);

-- ---------------------------------------------------------------------------
-- payments: one per completed ride. Only RPCs / Edge Functions write here.
-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null unique references public.rides (id) on delete cascade,
  method public.payment_method not null,
  amount integer not null check (amount >= 0),
  currency text not null,
  status public.payment_status not null default 'pending',
  mpesa_phone text,
  mpesa_checkout_request_id text unique,
  mpesa_merchant_request_id text,
  mpesa_receipt text unique,
  result_code text,
  result_desc text,
  confirmed_by uuid references public.profiles (id),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Raw M-Pesa callbacks kept for audit / duplicate detection (service role only).
create table public.mpesa_callbacks (
  id bigint generated always as identity primary key,
  checkout_request_id text,
  payload jsonb not null,
  received_at timestamptz not null default now()
);
create index mpesa_callbacks_checkout_idx on public.mpesa_callbacks (checkout_request_id);

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides (id) on delete cascade,
  rater_id uuid not null references public.profiles (id),
  ratee_id uuid not null references public.profiles (id),
  stars integer not null check (stars between 1 and 5),
  comment text check (char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  unique (ride_id, rater_id)
);
create index ratings_ratee_idx on public.ratings (ratee_id);

create table public.support_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  ride_id uuid references public.rides (id) on delete set null,
  category text not null check (category in ('safety', 'payment', 'driver', 'passenger', 'app', 'lost_item', 'other')),
  message text not null check (char_length(message) between 1 and 2000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  admin_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- Audit log of admin actions.
create table public.admin_actions (
  id bigint generated always as identity primary key,
  admin_id uuid,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
