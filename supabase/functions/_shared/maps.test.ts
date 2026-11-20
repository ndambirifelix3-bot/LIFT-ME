// Run: npx deno test supabase/functions
import { assertEquals } from 'jsr:@std/assert@1';
import { decodeOsmPlaceId, encodePlaceId, freeRoute } from './maps.ts';

Deno.test('free place ids carry the place and round-trip (incl. non-English names)', () => {
  const id = encodePlaceId({ name: 'Sarit Centre', address: 'Sarit Centre, Westlands, Nairobi', lat: -1.260934, lng: 36.802411 });
  assertEquals(/^[A-Za-z0-9_-]{10,300}$/.test(id), true);
  const back = decodeOsmPlaceId(id)!;
  assertEquals([back.name, back.address, back.lat, back.lng], ['Sarit Centre', 'Sarit Centre, Westlands, Nairobi', -1.260934, 36.802411]);
  const accents = decodeOsmPlaceId(encodePlaceId({ name: 'Café Ñandú', address: 'Café Ñandú, Indianapolis', lat: 39.77, lng: -86.16 }))!;
  assertEquals(accents.name, 'Café Ñandú');
});

Deno.test('bad or foreign place ids are refused', () => {
  assertEquals(decodeOsmPlaceId('ChIJN1t_tDeuEmsRUsoyG83frY4'), null); // a Google id
  assertEquals(decodeOsmPlaceId('osm-%%%'), null);
  assertEquals(decodeOsmPlaceId(encodePlaceId({ name: 'x', address: 'x', lat: 95, lng: 0 })), null);
});

Deno.test('route falls back to an estimate when the route service is unreachable', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = () => Promise.reject(new Error('offline'));
  try {
    const r = await freeRoute({ lat: -1.2864, lng: 36.8172 }, { lat: -1.2676, lng: 36.8108 }); // CBD → Westlands, ~2.2 km straight
    assertEquals(r.estimated, true);
    assertEquals(r.polyline, null);
    assertEquals(r.distanceM > 2500 && r.distanceM < 3500, true);
    assertEquals(r.durationS >= 60, true);
  } finally {
    globalThis.fetch = realFetch;
  }
});
