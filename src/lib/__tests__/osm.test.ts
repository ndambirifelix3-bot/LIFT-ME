import { describe, expect, it } from '@jest/globals';
import { decodeOsmPlaceId, encodeOsmPlaceId } from '@/features/places/osm';

describe('free place ids', () => {
  it('round-trip the place (incl. accents)', () => {
    const place = { name: 'Café Ñandú', address: 'Café Ñandú, Westlands, Nairobi', lat: -1.260934, lng: 36.802411 };
    const id = encodeOsmPlaceId(place);
    expect(id).toMatch(/^osm-[A-Za-z0-9_-]+$/);
    expect(decodeOsmPlaceId(id)).toEqual(place);
  });
  it('ignore Google ids and junk', () => {
    expect(decodeOsmPlaceId('ChIJN1t_tDeuEmsRUsoyG83frY4')).toBeNull();
    expect(decodeOsmPlaceId('osm-%%%')).toBeNull();
  });
});
