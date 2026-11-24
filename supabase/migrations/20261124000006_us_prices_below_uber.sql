-- Lift Me — US prices set ~10% below UberX in South Bend (client comparison, 2026-11-24:
-- Orkney Drive -> South Bend airport, 11.6 mi: UberX $19.95, Lift Me now Lift $18.12, Lift Mini $15.36).
-- Priced mostly by distance with a small per-minute charge, so a slow time estimate doesn't inflate fares.
-- Cents; per mile. Still editable in Admin -> Pricing.
update public.market_prices mp set base_fare = v.base, per_distance = v.per_mi, per_minute = v.per_min, minimum_fare = v.min
  from (values ('lift_mini',    125,  95, 12,  550),
               ('lift',         150, 110, 15,  650),
               ('lift_xl',      250, 155, 22,  900),
               ('lift_premium', 350, 200, 30, 1200)) as v(ride_type, base, per_mi, per_min, min)
 where mp.market_code = 'indianapolis' and mp.ride_type = v.ride_type;
