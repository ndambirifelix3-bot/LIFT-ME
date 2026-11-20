import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { colors } from '@/theme';
import { decodePolyline } from '@/lib/format';
import type { MapMarkerKind, MapProps } from './Map.types';

const PIN_COLOR: Record<MapMarkerKind, string> = {
  pickup: colors.black,
  dropoff: colors.brand,
  driver: colors.black,
  me: colors.brand,
};

/** Native map (react-native-maps). Google Maps on Android; Apple Maps on iOS in Expo Go. */
export function Map({ center, markers = [], polyline, centerPin, onCenterChange, showsUserLocation, height = '100%', followKey }: MapProps) {
  const ref = useRef<MapView>(null);
  const route = useMemo(() => decodePolyline(polyline), [polyline]);
  const initialRegion: Region = { latitude: center.lat, longitude: center.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 };

  useEffect(() => {
    if (route.length > 1) {
      ref.current?.fitToCoordinates(route, { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true });
    } else {
      ref.current?.animateCamera({ center: { latitude: center.lat, longitude: center.lng } }, { duration: 400 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followKey, route.length]);

  return (
    <View style={{ height, width: '100%' }}>
      <MapView
        ref={ref}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={initialRegion}
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        onRegionChangeComplete={(r) => onCenterChange?.({ lat: r.latitude, lng: r.longitude })}
      >
        {markers.map((m) => (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.position.lat, longitude: m.position.lng }}
            title={m.title}
            tracksViewChanges={false}
          >
            <View style={[styles.marker, { backgroundColor: PIN_COLOR[m.kind] }]}>
              <Ionicons name={m.kind === 'driver' ? 'car' : m.kind === 'dropoff' ? 'flag' : 'ellipse'} size={m.kind === 'driver' ? 16 : 10} color={colors.white} />
            </View>
          </Marker>
        ))}
        {route.length > 1 ? <Polyline coordinates={route} strokeColor={colors.black} strokeWidth={4} /> : null}
      </MapView>
      {centerPin ? (
        <View pointerEvents="none" style={styles.centerPin}>
          <Ionicons name="location-sharp" size={44} color={colors.black} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  marker: {
    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.white,
  },
  centerPin: { position: 'absolute', left: '50%', top: '50%', marginLeft: -22, marginTop: -44 },
});
