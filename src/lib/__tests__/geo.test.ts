import { describe, expect, it } from '@jest/globals';
import { geoJsonToMultiPolygon } from '../geo';

const square = [[[-74.03, 40.68], [-73.9, 40.68], [-73.9, 40.88], [-74.03, 40.88], [-74.03, 40.68]]];

describe('geoJsonToMultiPolygon', () => {
  it('converts a geojson.io FeatureCollection', () => {
    const fc = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: square } }] };
    expect(geoJsonToMultiPolygon(JSON.stringify(fc))).toBe(
      'SRID=4326;MULTIPOLYGON(((-74.03 40.68, -73.9 40.68, -73.9 40.88, -74.03 40.88, -74.03 40.68)))',
    );
  });

  it('closes an open ring and keeps several areas', () => {
    const open = [[[0, 0], [1, 0], [1, 1], [0, 1]]];
    const mp = { type: 'MultiPolygon', coordinates: [open, square] };
    expect(geoJsonToMultiPolygon(JSON.stringify(mp))).toBe(
      'SRID=4326;MULTIPOLYGON(((0 0, 1 0, 1 1, 0 1, 0 0)), ((-74.03 40.68, -73.9 40.68, -73.9 40.88, -74.03 40.88, -74.03 40.68)))',
    );
  });

  it('explains what is wrong', () => {
    expect(() => geoJsonToMultiPolygon('not json')).toThrow('not valid GeoJSON');
    expect(() => geoJsonToMultiPolygon(JSON.stringify({ type: 'Point', coordinates: [1, 2] }))).toThrow('polygon');
    expect(() => geoJsonToMultiPolygon(JSON.stringify({ type: 'Polygon', coordinates: [[[0, 0], [1, 1]]] }))).toThrow('3 corners');
    expect(() => geoJsonToMultiPolygon(JSON.stringify({ type: 'Polygon', coordinates: [[[0, 0], [200, 0], [1, 1], [0, 0]]] }))).toThrow('invalid');
  });
});
