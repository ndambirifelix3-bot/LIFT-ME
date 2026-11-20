// get-quote — the ONLY way a fare is produced.
// 1. checks the caller is a signed-in passenger
// 2. checks pickup + drop-off are inside the same active market's service area
// 3. gets real driving distance/time from Google Routes
// 4. calls the database function create_quote, which prices every ride type
//    with the market's prices and currency, and saves the quote (valid ~10 minutes)
import { adminClient, errorResponse, getUser, isLatLng, json, requireEnv, serve } from '../_shared/common.ts';

type Stop = { lat: number; lng: number; address: string; note?: string };

function readStop(v: unknown): Stop | null {
  if (!isLatLng(v)) return null;
  const o = v as Stop;
  const address = String(o.address ?? '').trim().slice(0, 300);
  if (!address) return null;
  return { lat: o.lat, lng: o.lng, address, note: o.note ? String(o.note).trim().slice(0, 200) : undefined };
}

serve(async (req) => {
  const user = await getUser(req);
  if (!user) return errorResponse('not_signed_in', 401);

  const db = adminClient();
  const { data: profile } = await db.from('profiles').select('role, is_suspended').eq('id', user.id).single();
  if (!profile || profile.role !== 'passenger') return errorResponse('passengers_only', 403);
  if (profile.is_suspended) return errorResponse('account_suspended', 403);

  const body = await req.json().catch(() => ({}));
  const pickup = readStop(body.pickup);
  const dropoff = readStop(body.dropoff);
  if (!pickup || !dropoff) return errorResponse('bad_request', 400, 'Pickup and destination are required.');

  // Check the service area before paying for a Google call. A trip must stay within one market.
  const [{ data: pickupMarket }, { data: dropoffMarket }] = await Promise.all([
    db.rpc('market_at_point', { p_lat: pickup.lat, p_lng: pickup.lng }),
    db.rpc('market_at_point', { p_lat: dropoff.lat, p_lng: dropoff.lng }),
  ]);
  if (!pickupMarket) return errorResponse('pickup_outside_service_area', 422, 'Sorry, Lift Me is not available at this pickup point yet.');
  if (dropoffMarket !== pickupMarket) return errorResponse('dropoff_outside_service_area', 422, 'Sorry, this destination is outside our service area.');

  const routeRes = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': requireEnv('GOOGLE_MAPS_SERVER_KEY'),
      'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: pickup.lat, longitude: pickup.lng } } },
      destination: { location: { latLng: { latitude: dropoff.lat, longitude: dropoff.lng } } },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
    }),
  });
  if (!routeRes.ok) {
    console.error('routes', routeRes.status, await routeRes.text());
    return errorResponse('maps_unavailable', 502, 'We could not calculate the route. Please try again.');
  }
  const routeData = await routeRes.json();
  const route = routeData.routes?.[0];
  if (!route) return errorResponse('no_route', 422, 'No driving route found between these points.');

  const distanceM = Math.max(0, Math.round(Number(route.distanceMeters ?? 0)));
  const durationS = Math.max(0, Math.round(parseFloat(String(route.duration ?? '0s'))));

  const { data: quote, error } = await db.rpc('create_quote', {
    p_passenger_id: user.id,
    p_pickup_lat: pickup.lat,
    p_pickup_lng: pickup.lng,
    p_pickup_address: pickup.address,
    p_pickup_note: pickup.note ?? null,
    p_dropoff_lat: dropoff.lat,
    p_dropoff_lng: dropoff.lng,
    p_dropoff_address: dropoff.address,
    p_distance_m: distanceM,
    p_duration_s: durationS,
    p_polyline: route.polyline?.encodedPolyline ?? null,
  });
  if (error || !quote) {
    console.error('create_quote', error);
    return errorResponse('quote_failed', 500, 'Could not create a price quote.');
  }

  return json({
    quote: {
      id: quote.id,
      market_code: quote.market_code,
      options: quote.options,
      currency: quote.currency,
      distance_m: quote.distance_m,
      duration_s: quote.duration_s,
      polyline: quote.polyline,
      expires_at: quote.expires_at,
    },
  });
});
