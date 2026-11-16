import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import type { LatLng } from '@/components/Map.types';

export type PermissionState = 'unknown' | 'granted' | 'denied';

/** Foreground location for the passenger map. Never asks without the user tapping a button first. */
export function useMyLocation() {
  const [permission, setPermission] = useState<PermissionState>('unknown');
  const [position, setPosition] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);

  const locate = useCallback(async () => {
    try {
      const last = await Location.getLastKnownPositionAsync();
      if (last) setPosition({ lat: last.coords.latitude, lng: last.coords.longitude });
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setError(null);
    } catch {
      setError('We could not find your location. Turn on location (GPS) or pick your pickup on the map.');
    }
  }, []);

  useEffect(() => {
    Location.getForegroundPermissionsAsync()
      .then((res) => {
        if (res.granted) {
          setPermission('granted');
          locate();
        } else if (!res.canAskAgain) setPermission('denied');
      })
      .catch(() => setPermission('denied'));
  }, [locate]);

  const request = useCallback(async () => {
    const res = await Location.requestForegroundPermissionsAsync();
    setPermission(res.granted ? 'granted' : 'denied');
    if (res.granted) await locate();
    return res.granted;
  }, [locate]);

  return { permission, position, error, request, refresh: locate };
}
