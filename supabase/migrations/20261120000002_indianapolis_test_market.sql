-- Indianapolis test market, requested by the client (based in Indiana). Safe to re-run.
-- Prices are PLACEHOLDERS (prices_are_placeholder = true); cash only until card payments exist.

insert into public.markets (code, name, country_iso, currency, currency_decimals, timezone, distance_unit, phone_country_code,
                            emergency_numbers, support_phone, payment_methods, commission_percent, prices_are_placeholder, is_active, sort_order)
values ('indianapolis', 'Indianapolis', 'us', 'USD', 2, 'America/Indiana/Indianapolis', 'mi', '+1',
        '["911"]', '', '{cash}', 15, true, true, 2)
on conflict (code) do nothing;

-- Roughly Marion County (all of Indianapolis, incl. downtown and the airport). Longitude latitude.
insert into public.service_area (name, market_code, area)
select 'Indianapolis (Marion County, test)', 'indianapolis', extensions.st_geogfromtext(
  'SRID=4326;MULTIPOLYGON(((-86.33 39.63, -85.94 39.63, -85.94 39.93, -86.33 39.93, -86.33 39.63)))')
where not exists (select 1 from public.service_area where market_code = 'indianapolis');

-- PLACEHOLDER prices in cents, per mile.
insert into public.market_prices (market_code, ride_type, base_fare, per_distance, per_minute, minimum_fare) values
  ('indianapolis', 'lift',         250, 150, 30,  700),   -- $2.50 + $1.50/mi + $0.30/min, min $7.00
  ('indianapolis', 'lift_premium', 450, 250, 45, 1200)    -- $4.50 + $2.50/mi + $0.45/min, min $12.00
on conflict (market_code, ride_type) do nothing;

-- Documents US drivers upload (only required for drivers in US markets).
insert into public.document_types (code, name, description, required, country_iso, sort_order) values
  ('us_drivers_license',      'Driver''s License',    'Front of your valid US driver''s license',            true, 'us', 11),
  ('us_vehicle_registration', 'Vehicle Registration', 'Current registration for the vehicle you will drive', true, 'us', 12),
  ('us_insurance',            'Proof of Insurance',   'Insurance card or policy page for the vehicle',        true, 'us', 13)
on conflict (code) do nothing;
