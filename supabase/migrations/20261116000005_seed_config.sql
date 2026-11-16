-- Lift Me — starting configuration for the Nairobi pilot.
-- Everything here is editable later (admin dashboard → Pricing & settings, or SQL).

insert into public.settings (key, value, description) values
  ('currency',               '"KES"',              'Currency code for all prices'),
  ('timezone',               '"Africa/Nairobi"',   'Timezone used for "today" / "this week"'),
  ('country_code',           '"+254"',             'Default phone country code'),
  ('commission_percent',     '15',                 'PLACEHOLDER — platform commission % per completed ride'),
  ('match_radius_km',        '5',                  'Offer requests to drivers within this many km of the pickup'),
  ('search_timeout_seconds', '120',                'If nobody accepts in this time → no_driver_found'),
  ('location_fresh_seconds', '120',                'Drivers must have sent a location within this many seconds'),
  ('quote_valid_minutes',    '10',                 'How long a fare quote is valid'),
  ('location_interval_seconds', '5',               'How often online drivers send their location'),
  ('emergency_numbers',      '["999", "112"]',     'Shown on the Help page'),
  ('support_phone',          '""',                 'Your support line (shown on the Help page when set)'),
  ('pricing_is_placeholder', 'true',               'Set to false once you have entered your real prices')
on conflict (key) do nothing;

-- !!! PLACEHOLDER PRICES — change these before the pilot (admin dashboard → Pricing). !!!
insert into public.pricing (ride_type, display_name, description, base_fare, per_km, per_minute, minimum_fare, currency, seats, tier, sort_order) values
  ('lift',         'Lift',         'Everyday affordable rides',      100, 40, 4, 200, 'KES', 4, 1, 1),
  ('lift_premium', 'Lift Premium', 'Newer cars, top-rated drivers',  200, 70, 6, 400, 'KES', 4, 2, 2)
on conflict (ride_type) do nothing;

insert into public.document_types (code, name, description, required, sort_order) values
  ('national_id',     'National ID',          'Front of your Kenyan National ID',             true, 1),
  ('driving_licence', 'Driving Licence',      'Valid NTSA driving licence',                   true, 2),
  ('psv_badge',       'PSV Badge',            'Valid PSV badge',                              true, 3),
  ('vehicle_logbook', 'Vehicle Logbook',      'Logbook for the vehicle you will drive',       true, 4),
  ('insurance',       'Insurance Certificate','Valid PSV / commercial insurance certificate', true, 5)
on conflict (code) do nothing;

-- SAMPLE Nairobi pilot area — a rough outline of Nairobi. Edit to match your real pilot zone.
-- Coordinates are (longitude latitude).
insert into public.service_area (name, area)
select 'Nairobi pilot (sample)', extensions.st_geogfromtext(
  'SRID=4326;MULTIPOLYGON(((36.66 -1.16, 36.90 -1.15, 37.05 -1.20, 37.10 -1.30, 37.00 -1.40, 36.85 -1.44, 36.70 -1.40, 36.64 -1.30, 36.66 -1.16)))')
where not exists (select 1 from public.service_area);
