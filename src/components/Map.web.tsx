import 'maplibre-gl/dist/maplibre-gl.css';
import { Ionicons } from '@expo/vector-icons';
import type { GeoJSONSource, Map as MlMap, Marker as MlMarker } from 'maplibre-gl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { decodePolyline } from '@/lib/format';
import { colors, fonts, radius } from '@/theme';
import type { MapMarkerKind, MapProps } from './Map.types';

/**
 * Web map: MapLibre (open-source map engine) with OpenFreeMap tiles (free OpenStreetMap maps:
 * no API key, no usage fees, commercial use allowed; the © OpenStreetMap credit must stay visible).
 * Same props and behaviour as the phone-app map in Map.tsx.
 * The map library (~1 MB) is only downloaded when a map is actually on screen.
 */
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

type MapLibre = typeof import('maplibre-gl');

const LOOK: Record<MapMarkerKind, { bg: string; fg: string; ring: string; size: number }> = {
  pickup: { bg: colors.black, fg: colors.white, ring: colors.white, size: 30 },
  dropoff: { bg: colors.brand, fg: colors.black, ring: colors.white, size: 30 },
  driver: { bg: colors.black, fg: colors.brand, ring: colors.brand, size: 36 },
  me: { bg: colors.brand, fg: colors.black, ring: colors.white, size: 22 },
};

const ICON: Record<MapMarkerKind, string> = {
  pickup: '<circle cx="12" cy="12" r="5"/>',
  me: '<circle cx="12" cy="12" r="4"/>',
  dropoff: '<path d="M6 3h2v18H6z"/><path d="M8 4h11l-2.5 4L19 12H8z"/>',
  driver:
    '<path d="M5 11.5 6.6 6.8A2.5 2.5 0 0 1 9 5h6a2.5 2.5 0 0 1 2.4 1.8l1.6 4.7V18a1 1 0 0 1-1 1h-1.2a1 1 0 0 1-1-1v-1H8.2v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/>' +
    '<circle cx="8" cy="13.5" r="1.3" fill="currentBG"/><circle cx="16" cy="13.5" r="1.3" fill="currentBG"/><path d="M7 11h10l-1.2-3.6a1 1 0 0 0-1-.7H9.2a1 1 0 0 0-1 .7z" fill="currentBG"/>',
};

function markerElement(kind: MapMarkerKind, title?: string): HTMLDivElement {
  const look = LOOK[kind];
  const el = document.createElement('div');
  el.title = title ?? '';
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', title ?? kind);
  Object.assign(el.style, {
    width: `${look.size}px`, height: `${look.size}px`, borderRadius: '50%', background: look.bg,
    border: `2px solid ${look.ring}`, boxShadow: '0 2px 6px rgba(0,0,0,0.35)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  });
  const icon = Math.round(look.size * 0.62);
  el.innerHTML = `<svg width="${icon}" height="${icon}" viewBox="0 0 24 24" fill="${look.fg}">${ICON[kind].replace(/currentBG/g, look.bg)}</svg>`;
  return el;
}

export function Map({ center, markers = [], polyline, centerPin, onCenterChange, showsUserLocation, height = '100%', followKey }: MapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const libRef = useRef<MapLibre | null>(null);
  const markerRefs = useRef<Record<string, MlMarker>>({});
  const onCenterRef = useRef(onCenterChange);
  useEffect(() => {
    onCenterRef.current = onCenterChange;
  }, [onCenterChange]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const route = useMemo(() => decodePolyline(polyline).map((p) => [p.longitude, p.latitude] as [number, number]), [polyline]);

  // Create the map once (loading the library on demand).
  useEffect(() => {
    let cancelled = false;
    import('maplibre-gl')
      .then((mod) => {
        const ml = ((mod as unknown as { default?: MapLibre }).default ?? mod) as MapLibre;
        if (cancelled || !container.current) return;
        libRef.current = ml;
        const map = new ml.Map({
          container: container.current,
          style: STYLE_URL,
          center: [center.lng, center.lat],
          zoom: 14,
          attributionControl: false, // added below, top-right, where bottom sheets can't cover it
          dragRotate: false,
          pitchWithRotate: false,
        });
        map.touchZoomRotate.disableRotation();
        // The © OpenStreetMap / OpenFreeMap credit is required by the map licence: keep it visible.
        map.addControl(new ml.AttributionControl({ compact: true }), 'top-right');
        map.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
        if (showsUserLocation) {
          const geo = new ml.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false, showAccuracyCircle: false });
          map.addControl(geo, 'top-right');
          map.on('load', () => geo.trigger());
        }
        map.on('load', () => {
          // Start the credit folded into its (i) button so it doesn't cover the map; tap to read it.
          container.current?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
          setReady(true);
        });
        map.on('moveend', () => {
          const c = map.getCenter();
          onCenterRef.current?.({ lat: c.lat, lng: c.lng });
        });
        mapRef.current = map;
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRefs.current = {};
    };
    // Created once; later prop changes are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Markers: add, move (e.g. the driver's car) and remove by id.
  const markerKey = JSON.stringify(markers);
  useEffect(() => {
    const map = mapRef.current;
    const ml = libRef.current;
    if (!map || !ml || !ready) return;
    const seen = new Set<string>();
    for (const m of markers) {
      seen.add(m.id);
      const existing = markerRefs.current[m.id];
      if (existing) existing.setLngLat([m.position.lng, m.position.lat]);
      else markerRefs.current[m.id] = new ml.Marker({ element: markerElement(m.kind, m.title) }).setLngLat([m.position.lng, m.position.lat]).addTo(map);
    }
    for (const id of Object.keys(markerRefs.current)) {
      if (!seen.has(id)) {
        markerRefs.current[id].remove();
        delete markerRefs.current[id];
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markerKey, ready]);

  // Route line (a white casing under a black line, so it reads on any street colour).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const data = { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: route } };
    const source = map.getSource('route') as GeoJSONSource | undefined;
    if (source) source.setData(data);
    else {
      map.addSource('route', { type: 'geojson', data });
      map.addLayer({ id: 'route-casing', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 8 } });
      map.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': colors.black, 'line-width': 4 } });
    }
  }, [route, ready]);

  // Re-frame when the screen asks (followKey): the whole route, or the centre point.
  useEffect(() => {
    const map = mapRef.current;
    const ml = libRef.current;
    if (!map || !ml || !ready) return;
    // Frame the whole route, or every pin (e.g. the driver's car and the pickup), so nothing is off-screen.
    const points: [number, number][] = [...route, ...markers.map((m) => [m.position.lng, m.position.lat] as [number, number])];
    if (points.length > 1) {
      const bounds = new ml.LngLatBounds(points[0], points[0]);
      for (const p of points) bounds.extend(p);
      map.fitBounds(bounds, { padding: { top: 70, bottom: 50, left: 50, right: 70 }, maxZoom: 16, duration: 600 });
    } else {
      map.easeTo({ center: [center.lng, center.lat], duration: 600 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followKey, route.length, ready]);

  if (failed) {
    return (
      <View style={[styles.fallback, { height: typeof height === 'number' ? Math.min(height, 260) : 220 }]}>
        <Ionicons name="map-outline" size={32} color={colors.black} />
        <Text style={styles.fallbackText}>The map couldn&apos;t load on this device.</Text>
      </View>
    );
  }

  return (
    // Rounded like a card when it's a fixed-size map inside a screen; square when it fills the screen.
    <View style={{ height, width: '100%', borderRadius: typeof height === 'number' ? radius.lg : 0, overflow: 'hidden', backgroundColor: '#e8eaed' }}>
      <div ref={container} style={{ position: 'absolute', inset: 0 }} />
      {centerPin ? (
        <View pointerEvents="none" style={styles.centerPin}>
          <Ionicons name="location-sharp" size={44} color={colors.black} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centerPin: { position: 'absolute', left: '50%', top: '50%', marginLeft: -22, marginTop: -44 },
  fallback: {
    width: '100%', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.white,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16,
  },
  fallbackText: { fontFamily: fonts.medium, fontSize: 14, color: colors.text, textAlign: 'center' },
});
