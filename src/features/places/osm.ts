/**
 * Free address search on the phone itself, used while no Google key is set.
 * Photon (photon.komoot.io) is OpenStreetMap search made for search-as-you-type. It refuses requests
 * from cloud servers, so the app calls it directly; the server still decides which countries to
 * search and where to centre results, and prices are still only calculated on the server.
 * Shared "fair use" service: fine for testing and a small pilot. Switch to Google for launch.
 */
import type { LatLng } from '@/components/Map.types';
import type { Suggestion } from './api';

const PHOTON = 'https://photon.komoot.io';

type PhotonProps = {
  name?: string; housenumber?: string; street?: string; district?: string; locality?: string;
  suburb?: string; city?: string; county?: string; state?: string; countrycode?: string;
};
type PhotonFeature = { geometry?: { coordinates?: [number, number] }; properties?: PhotonProps };

function title(p: PhotonProps): string {
  const street = [p.street, p.housenumber].filter(Boolean).join(' ');
  return p.name || street || p.district || p.locality || p.city || p.county || 'Unnamed place';
}

function subtitle(p: PhotonProps, t: string): string {
  const street = [p.street, p.housenumber].filter(Boolean).join(' ');
  const parts = [street !== t ? street : '', p.district || p.suburb || p.locality, p.city, p.countrycode === 'US' ? p.state : '']
    .filter((x): x is string => !!x && x !== t);
  return [...new Set(parts)].join(', ');
}

/** Our place ids carry the place itself (osm-<base64 JSON>), so picking one needs no extra request. */
export function encodeOsmPlaceId(place: { name: string; address: string; lat: number; lng: number }): string {
  const json = JSON.stringify({ n: place.name.slice(0, 80), a: place.address.slice(0, 120), y: +place.lat.toFixed(6), x: +place.lng.toFixed(6) });
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `osm-${b64}`;
}

export function decodeOsmPlaceId(placeId: string): { name: string; address: string; lat: number; lng: number } | null {
  if (!placeId.startsWith('osm-')) return null;
  try {
    const b64 = placeId.slice(4).replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0));
    const o = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof o.y !== 'number' || typeof o.x !== 'number') return null;
    return { name: String(o.n ?? ''), address: String(o.a ?? o.n ?? ''), lat: o.y, lng: o.x };
  } catch {
    return null;
  }
}

async function getJson(url: string): Promise<{ features?: PhotonFeature[] }> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Address search is unavailable right now. Please try again.');
  return res.json();
}

/** Up to 6 suggestions in the given countries (e.g. ['ke']), closest to `bias` first. */
export async function osmSearch(input: string, bias: LatLng | null, countries: string[]): Promise<Suggestion[]> {
  const params = new URLSearchParams({ q: input, limit: '15', lang: 'en' });
  if (bias) {
    params.set('lat', String(bias.lat));
    params.set('lon', String(bias.lng));
  }
  const data = await getJson(`${PHOTON}/api/?${params}`);
  const allowed = new Set(countries.map((c) => c.toUpperCase()));
  const out: Suggestion[] = [];
  const seen = new Set<string>();
  for (const f of data.features ?? []) {
    const p = f.properties ?? {};
    if (allowed.size && !allowed.has((p.countrycode ?? '').toUpperCase())) continue;
    const [lng, lat] = f.geometry?.coordinates ?? [];
    if (typeof lat !== 'number' || typeof lng !== 'number') continue;
    const t = title(p);
    const s = subtitle(p, t);
    if (seen.has(`${t}|${s}`)) continue;
    seen.add(`${t}|${s}`);
    out.push({ placeId: encodeOsmPlaceId({ name: t, address: [t, s].filter(Boolean).join(', '), lat, lng }), title: t, subtitle: s });
    if (out.length >= 6) break;
  }
  return out;
}

/** Address of a point (e.g. where the pickup pin was dropped). */
export async function osmReverse(point: LatLng): Promise<string | null> {
  const params = new URLSearchParams({ lat: String(point.lat), lon: String(point.lng), lang: 'en', limit: '1' });
  const p = (await getJson(`${PHOTON}/reverse?${params}`)).features?.[0]?.properties;
  if (!p) return null;
  const t = title(p);
  return [t, subtitle(p, t)].filter(Boolean).join(', ');
}
