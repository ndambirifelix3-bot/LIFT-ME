export type LatLng = { lat: number; lng: number };

export type MapMarkerKind = 'pickup' | 'dropoff' | 'driver' | 'me';

export type MapProps = {
  center: LatLng;
  markers?: { id: string; kind: MapMarkerKind; position: LatLng; title?: string }[];
  /** Google encoded polyline for the route */
  polyline?: string | null;
  /** Shows a fixed pin in the middle; the user drags the map underneath it. */
  centerPin?: boolean;
  onCenterChange?: (center: LatLng) => void;
  showsUserLocation?: boolean;
  height?: number | `${number}%`;
  /** Re-center when this key changes */
  followKey?: string;
};
