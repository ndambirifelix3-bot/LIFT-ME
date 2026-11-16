import { callFunction } from '@/lib/supabase';
import type { LatLng } from '@/components/Map.types';
import type { Quote } from '@/features/rides/types';

export type Suggestion = { placeId: string; title: string; subtitle: string };

// All Google calls go through Edge Functions so the server key never ships in the app.
export async function searchPlaces(input: string, sessionToken: string, near?: LatLng | null) {
  const res = await callFunction<{ suggestions: Suggestion[] }>('places', {
    action: 'autocomplete', input, sessionToken, near: near ?? undefined,
  });
  return res.suggestions;
}

export async function placeDetails(placeId: string, sessionToken: string) {
  const res = await callFunction<{ place: { address: string; name: string; lat: number; lng: number } }>('places', {
    action: 'details', placeId, sessionToken,
  });
  return res.place;
}

export async function reverseGeocode(point: LatLng): Promise<string | null> {
  const res = await callFunction<{ address: string | null }>('places', { action: 'reverse', lat: point.lat, lng: point.lng });
  return res.address;
}

export async function getQuote(input: {
  pickup: LatLng & { address: string; note?: string };
  dropoff: LatLng & { address: string };
}) {
  const res = await callFunction<{ quote: Quote }>('get-quote', input);
  return res.quote;
}

export function newSessionToken(): string {
  // Google session tokens just need to be unique per search session.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
