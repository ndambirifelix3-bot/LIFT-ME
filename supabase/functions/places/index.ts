// places — address search for the app, keeping the Google server key secret.
// Actions:
//   { action: 'autocomplete', input, sessionToken, near?: {lat,lng} }
//   { action: 'details', placeId, sessionToken }
//   { action: 'reverse', lat, lng }            (address for a dragged pin)
import { adminClient, errorResponse, getSetting, getUser, isLatLng, json, requireEnv, serve } from '../_shared/common.ts';

const PLACES = 'https://places.googleapis.com/v1';

serve(async (req) => {
  const user = await getUser(req);
  if (!user) return errorResponse('not_signed_in', 401);

  const body = await req.json().catch(() => ({}));
  const key = requireEnv('GOOGLE_MAPS_SERVER_KEY');

  if (body.action === 'autocomplete') {
    const input = String(body.input ?? '').trim().slice(0, 120);
    if (input.length < 2) return json({ suggestions: [] });
    const region = await getSetting<string>(adminClient(), 'country_iso', 'ke');
    const payload: Record<string, unknown> = {
      input,
      sessionToken: String(body.sessionToken ?? ''),
      includedRegionCodes: [region],
    };
    if (isLatLng(body.near)) {
      payload.locationBias = {
        circle: { center: { latitude: body.near.lat, longitude: body.near.lng }, radius: 30000 },
      };
    }
    const res = await fetch(`${PLACES}/places:autocomplete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('autocomplete', res.status, await res.text());
      return errorResponse('maps_unavailable', 502, 'Address search is unavailable right now.');
    }
    const data = await res.json();
    // deno-lint-ignore no-explicit-any
    const suggestions = (data.suggestions ?? []).flatMap((s: any) =>
      s.placePrediction
        ? [{
            placeId: s.placePrediction.placeId,
            title: s.placePrediction.structuredFormat?.mainText?.text ?? s.placePrediction.text?.text,
            subtitle: s.placePrediction.structuredFormat?.secondaryText?.text ?? '',
          }]
        : [],
    );
    return json({ suggestions });
  }

  if (body.action === 'details') {
    const placeId = String(body.placeId ?? '');
    if (!/^[A-Za-z0-9_-]{10,300}$/.test(placeId)) return errorResponse('bad_place_id');
    const url = `${PLACES}/places/${placeId}?sessionToken=${encodeURIComponent(String(body.sessionToken ?? ''))}`;
    const res = await fetch(url, {
      headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'id,displayName,formattedAddress,location' },
    });
    if (!res.ok) {
      console.error('details', res.status, await res.text());
      return errorResponse('maps_unavailable', 502, 'Address search is unavailable right now.');
    }
    const p = await res.json();
    return json({
      place: {
        placeId: p.id,
        name: p.displayName?.text ?? '',
        address: p.formattedAddress ?? p.displayName?.text ?? '',
        lat: p.location?.latitude,
        lng: p.location?.longitude,
      },
    });
  }

  if (body.action === 'reverse') {
    if (!isLatLng(body)) return errorResponse('bad_coordinates');
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${body.lat},${body.lng}&key=${key}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || (data.status !== 'OK' && data.status !== 'ZERO_RESULTS')) {
      console.error('reverse', data.status, data.error_message);
      return errorResponse('maps_unavailable', 502, 'Could not look up this address.');
    }
    const first = data.results?.[0];
    return json({ address: first?.formatted_address ?? null });
  }

  return errorResponse('unknown_action');
});
