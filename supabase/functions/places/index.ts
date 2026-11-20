// places — address search for the app. Uses Google when GOOGLE_MAPS_SERVER_KEY is set (keys never
// reach the app). Without a key the free OpenStreetMap search (Photon) is used, but Photon refuses
// requests from cloud servers, so the server answers { provider: 'device', countries, bias } and the
// app runs the search itself with those settings (src/features/places/osm.ts).
// Actions:
//   { action: 'autocomplete', input, sessionToken, near?: {lat,lng}, market?: code }
//   { action: 'details', placeId, sessionToken }
//   { action: 'reverse', lat, lng }            (address for a dragged pin)
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { adminClient, errorResponse, getUser, isLatLng, json, serve } from '../_shared/common.ts';
import { decodeOsmPlaceId, googleAutocomplete, googleDetails, googleKey, googleReverse } from '../_shared/maps.ts';

type Center = { code: string; country_iso: string; lat: number; lng: number };

/**
 * Where to search: the market at the user's position (or the market the app names); otherwise every
 * country Lift Me serves. Also a point to bias results towards when the phone's position is unknown.
 */
async function searchArea(db: SupabaseClient, near: unknown, market: unknown) {
  let code: string | null = null;
  if (isLatLng(near)) {
    const { data } = await db.rpc('market_at_point', { p_lat: near.lat, p_lng: near.lng });
    code = (data as string | null) ?? null;
  }
  if (!code && typeof market === 'string' && /^[a-z0-9_]{1,40}$/.test(market)) code = market;
  const { data } = await db.rpc('market_centers');
  const centers = (data ?? []) as Center[];
  const chosen = code ? centers.filter((c) => c.code === code) : centers;
  const countries = [...new Set((chosen.length ? chosen : centers).map((c) => c.country_iso))];
  const bias = isLatLng(near) ? near : chosen.length === 1 ? { lat: chosen[0].lat, lng: chosen[0].lng } : null;
  return { countries: countries.length ? countries : ['ke'], bias };
}

serve(async (req) => {
  const user = await getUser(req);
  if (!user) return errorResponse('not_signed_in', 401);

  const body = await req.json().catch(() => ({}));
  const key = googleKey();
  const unavailable = (what: string, err: unknown) => {
    console.error(what, err);
    return errorResponse('maps_unavailable', 502, 'Address search is unavailable right now. Please try again.');
  };

  if (body.action === 'autocomplete') {
    const input = String(body.input ?? '').trim().slice(0, 120);
    if (input.length < 2) return json({ suggestions: [] });
    const { countries, bias } = await searchArea(adminClient(), body.near, body.market);
    if (!key) return json({ suggestions: [], provider: 'device', countries, bias });
    try {
      return json({ suggestions: await googleAutocomplete(key, input, String(body.sessionToken ?? ''), bias, countries), provider: 'google' });
    } catch (err) {
      return unavailable('autocomplete', err);
    }
  }

  if (body.action === 'details') {
    const placeId = String(body.placeId ?? '');
    const free = decodeOsmPlaceId(placeId);
    if (free) return json({ place: free });
    if (!/^[A-Za-z0-9_-]{10,300}$/.test(placeId) || !key) return errorResponse('bad_place_id');
    try {
      return json({ place: await googleDetails(key, placeId, String(body.sessionToken ?? '')) });
    } catch (err) {
      return unavailable('details', err);
    }
  }

  if (body.action === 'reverse') {
    if (!isLatLng(body)) return errorResponse('bad_coordinates');
    if (!key) return json({ address: null, provider: 'device' });
    try {
      return json({ address: await googleReverse(key, body), provider: 'google' });
    } catch (err) {
      console.error('reverse', err);
      return errorResponse('maps_unavailable', 502, 'Could not look up this address.');
    }
  }

  return errorResponse('unknown_action');
});
