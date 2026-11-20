/**
 * Turns a shape drawn on geojson.io (pasted as GeoJSON) into the text the database stores for a
 * service area: 'SRID=4326;MULTIPOLYGON(((lng lat, …)))'. Accepts a FeatureCollection, a Feature,
 * a Polygon or a MultiPolygon. Throws a plain-English Error when the shape can't be used.
 */
type Ring = number[][];
type PolygonCoords = Ring[];

function polygonsOf(geo: unknown): PolygonCoords[] {
  const g = geo as { type?: string; features?: unknown[]; geometry?: unknown; coordinates?: unknown };
  switch (g?.type) {
    case 'FeatureCollection':
      return (g.features ?? []).flatMap(polygonsOf);
    case 'Feature':
      return polygonsOf(g.geometry);
    case 'Polygon':
      return [g.coordinates as PolygonCoords];
    case 'MultiPolygon':
      return g.coordinates as PolygonCoords[];
    default:
      throw new Error('Draw an area (a polygon) on geojson.io, not a point or a line.');
  }
}

function ringToText(ring: Ring): string {
  if (!Array.isArray(ring) || ring.length < 4) throw new Error('Each area needs at least 3 corners.');
  for (const p of ring) {
    const [lng, lat] = p ?? [];
    if (typeof lng !== 'number' || typeof lat !== 'number' || Math.abs(lng) > 180 || Math.abs(lat) > 90) {
      throw new Error('The shape has a point with invalid coordinates.');
    }
  }
  const [first, last] = [ring[0], ring[ring.length - 1]];
  const closed = first[0] === last[0] && first[1] === last[1] ? ring : [...ring, first];
  return `(${closed.map(([lng, lat]) => `${lng} ${lat}`).join(', ')})`;
}

export function geoJsonToMultiPolygon(text: string): string {
  let geo: unknown;
  try {
    geo = JSON.parse(text);
  } catch {
    throw new Error('That is not valid GeoJSON. Copy everything from the right-hand panel on geojson.io.');
  }
  const polygons = polygonsOf(geo);
  if (!polygons.length) throw new Error('No area found. Draw a polygon on geojson.io first.');
  const body = polygons.map((rings) => `(${rings.map(ringToText).join(', ')})`).join(', ');
  return `SRID=4326;MULTIPOLYGON(${body})`;
}
