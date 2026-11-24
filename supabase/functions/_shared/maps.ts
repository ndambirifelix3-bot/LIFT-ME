// Address search and driving routes for Lift Me, with two providers:
//  * Google (Places, Geocoding, Routes) when the GOOGLE_MAPS_SERVER_KEY secret is set — best for launch.
//  * Free OpenStreetMap services otherwise — OSRM (router.project-osrm.org) for routes, called here,
//    and Photon (photon.komoot.io) for search, which refuses cloud servers and so runs on the phone
//    (src/features/places/osm.ts). Both are shared "fair use" services: fine for testing and a small
//    pilot, not for heavy production traffic.
// The app never knows which one is used: the Edge Functions return the same shapes either way.

export type Suggestion = { placeId: string; title: string; subtitle: string };
export type Place = { placeId: string; name: string; address: string; lat: number; lng: number };
export type Route = { distanceM: number; durationS: number; polyline: string | null; estimated: boolean };
type Point = { lat: number; lng: number };

const USER_AGENT = 'LiftMe/1.0 (+https://rideliftme.com)';
const OSRM = 'https://router.project-osrm.org';
// When the route service is down: assume ~35 km/h on empty roads (the traffic allowance is added on top).
const FALLBACK_SPEED_MPS = 9.7;

export function googleKey(): string | null {
  return Deno.env.get('GOOGLE_MAPS_SERVER_KEY') || null;
}

// ---------------------------------------------------------------------------
// Free provider: OSRM routes here; Photon search runs on the phone (place ids shared with it)
// ---------------------------------------------------------------------------
/** The free provider's place id carries the place itself, so "details" needs no second call. */
export function encodePlaceId(place: Omit<Place, 'placeId'>): string {
  const json = JSON.stringify({ n: place.name.slice(0, 80), a: place.address.slice(0, 120), y: +place.lat.toFixed(6), x: +place.lng.toFixed(6) });
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `osm-${b64}`;
}

export function decodeOsmPlaceId(placeId: string): Place | null {
  if (!placeId.startsWith('osm-')) return null;
  try {
    const b64 = placeId.slice(4).replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0));
    const o = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof o.y !== 'number' || typeof o.x !== 'number' || Math.abs(o.y) > 90 || Math.abs(o.x) > 180) return null;
    return { placeId, name: String(o.n ?? ''), address: String(o.a ?? o.n ?? ''), lat: o.y, lng: o.x };
  } catch {
    return null;
  }
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}`);
  return res.json();
}

/** Straight-line distance in metres. */
function haversine(a: Point, b: Point): number {
  const r = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

/**
 * Road route from OSRM; if it's unavailable, a cautious estimate so booking still works.
 * `trafficFactor`: OSRM times assume empty roads, so they're multiplied by the market's traffic allowance
 * (e.g. 1.8 for Nairobi, 1.15 for the USA). Google's times already include live traffic.
 */
export async function freeRoute(from: Point, to: Point, trafficFactor = 1.3): Promise<Route> {
  try {
    const url = `${OSRM}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=polyline`;
    const data = (await getJson(url)) as { code?: string; routes?: { distance: number; duration: number; geometry: string }[] };
    const r = data.code === 'Ok' ? data.routes?.[0] : undefined;
    if (r) {
      const durationS = Math.max(60, Math.round(r.duration * trafficFactor));
      return { distanceM: Math.round(r.distance), durationS, polyline: r.geometry ?? null, estimated: false };
    }
  } catch (err) {
    console.warn('osrm unavailable, estimating', err);
  }
  // Roads are rarely straight: ~1.35× the straight line.
  const distanceM = Math.round(haversine(from, to) * 1.35);
  return { distanceM, durationS: Math.max(60, Math.round((distanceM / FALLBACK_SPEED_MPS) * trafficFactor)), polyline: null, estimated: true };
}

// ---------------------------------------------------------------------------
// Google provider
// ---------------------------------------------------------------------------
const PLACES = 'https://places.googleapis.com/v1';

export async function googleAutocomplete(key: string, input: string, sessionToken: string, near: Point | null, countries: string[]): Promise<Suggestion[]> {
  const payload: Record<string, unknown> = { input, sessionToken, includedRegionCodes: countries.slice(0, 15) };
  if (near) payload.locationBias = { circle: { center: { latitude: near.lat, longitude: near.lng }, radius: 30000 } };
  const res = await fetch(`${PLACES}/places:autocomplete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`google autocomplete ${res.status}: ${await res.text()}`);
  const data = await res.json();
  // deno-lint-ignore no-explicit-any
  return (data.suggestions ?? []).flatMap((s: any) =>
    s.placePrediction
      ? [{
          placeId: s.placePrediction.placeId,
          title: s.placePrediction.structuredFormat?.mainText?.text ?? s.placePrediction.text?.text,
          subtitle: s.placePrediction.structuredFormat?.secondaryText?.text ?? '',
        }]
      : [],
  );
}

export async function googleDetails(key: string, placeId: string, sessionToken: string): Promise<Place> {
  const res = await fetch(`${PLACES}/places/${placeId}?sessionToken=${encodeURIComponent(sessionToken)}`, {
    headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'id,displayName,formattedAddress,location' },
  });
  if (!res.ok) throw new Error(`google details ${res.status}: ${await res.text()}`);
  const p = await res.json();
  return {
    placeId: p.id,
    name: p.displayName?.text ?? '',
    address: p.formattedAddress ?? p.displayName?.text ?? '',
    lat: p.location?.latitude,
    lng: p.location?.longitude,
  };
}

export async function googleReverse(key: string, point: Point): Promise<string | null> {
  const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${point.lat},${point.lng}&key=${key}`);
  const data = await res.json();
  if (!res.ok || (data.status !== 'OK' && data.status !== 'ZERO_RESULTS')) throw new Error(`google geocode ${data.status}: ${data.error_message}`);
  return data.results?.[0]?.formatted_address ?? null;
}

export async function googleRoute(key: string, from: Point, to: Point): Promise<Route | null> {
  const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: from.lat, longitude: from.lng } } },
      destination: { location: { latLng: { latitude: to.lat, longitude: to.lng } } },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
    }),
  });
  if (!res.ok) throw new Error(`google routes ${res.status}: ${await res.text()}`);
  const route = (await res.json()).routes?.[0];
  if (!route) return null;
  return {
    distanceM: Math.max(0, Math.round(Number(route.distanceMeters ?? 0))),
    durationS: Math.max(0, Math.round(parseFloat(String(route.duration ?? '0s')))),
    polyline: route.polyline?.encodedPolyline ?? null,
    estimated: false,
  };
}
