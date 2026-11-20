-- Centre point of each active market's service area. Used by the `places` Edge Function to bias
-- address search towards the cities Lift Me serves when the phone's location isn't known.
create or replace function public.market_centers()
returns table (code text, country_iso text, lat double precision, lng double precision)
language sql stable security definer set search_path = public, extensions, pg_temp
as $$
  select m.code, m.country_iso,
         extensions.st_y(extensions.st_centroid(extensions.st_collect(a.area::extensions.geometry))),
         extensions.st_x(extensions.st_centroid(extensions.st_collect(a.area::extensions.geometry)))
    from public.markets m join public.service_area a on a.market_code = m.code and a.is_active
   where m.is_active
   group by m.code, m.country_iso, m.sort_order
   order by m.sort_order, m.code;
$$;

revoke all on function public.market_centers() from public, anon, authenticated;
grant execute on function public.market_centers() to service_role;
