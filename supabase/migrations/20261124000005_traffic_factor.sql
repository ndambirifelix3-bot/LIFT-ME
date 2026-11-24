-- Lift Me — realistic trip times with the free route service (OSRM).
-- OSRM gives the time on EMPTY roads. Until now we never assumed faster than 20 km/h, which fits
-- Nairobi city traffic but made highway trips far too slow (an 11.6-mile South Bend airport trip was
-- priced as 57 minutes; Uber said 13). Now: trip time = OSRM time × the market's traffic allowance.
-- (With a Google key, Google's live-traffic times are used instead and this isn't needed.)
alter table public.markets
  add column traffic_factor numeric(3, 2) not null default 1.30 check (traffic_factor between 1 and 3);
comment on column public.markets.traffic_factor is
  'Real trips take this many times longer than empty-road time (free route service only). Kenya 1.8, USA 1.0 (US prices lean on distance instead).';
update public.markets set traffic_factor = 1.80 where code = 'nairobi';
update public.markets set traffic_factor = 1.00 where code = 'indianapolis';
