import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

/**
 * Driver location sharing.
 * - Only runs while the driver is ONLINE (and therefore also during trips).
 * - Uses background location when the driver allowed it ("Allow all the time" on Android,
 *   "Always" on iOS) and the app is a development/production build; otherwise it falls back
 *   to foreground updates while the app is open.
 */
export const DRIVER_LOCATION_TASK = 'lift-me-driver-location';

async function send(loc: Location.LocationObject) {
  const { error } = await supabase.rpc('update_driver_location', {
    p_lat: loc.coords.latitude,
    p_lng: loc.coords.longitude,
    p_heading: loc.coords.heading ?? undefined,
  });
  if (error) console.warn('location update failed', error.message);
}

if (Platform.OS !== 'web') {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(DRIVER_LOCATION_TASK, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    await send(data.locations[data.locations.length - 1]);
  });
}

let foregroundSub: Location.LocationSubscription | null = null;

/**
 * Web only: keep the screen on while the driver is online. A browser can't send location with the
 * screen off, so without this the phone would go to sleep and the driver would silently stop
 * getting requests. Browsers drop the lock when the tab is hidden, so take it again on return.
 */
type WakeLock = { release: () => Promise<void> };
let wakeLock: WakeLock | null = null;
let wantWakeLock = false;

async function takeWakeLock() {
  const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLock> } };
  if (!wantWakeLock || wakeLock || !nav.wakeLock || document.visibilityState !== 'visible') return;
  try {
    wakeLock = await nav.wakeLock.request('screen');
    (wakeLock as unknown as EventTarget).addEventListener?.('release', () => {
      wakeLock = null;
    });
  } catch {
    // Not allowed right now (e.g. battery saver). Tracking still works while the screen is on.
  }
}

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => void takeWakeLock());
}

export type TrackingMode = 'background' | 'foreground';

export async function startDriverTracking(intervalSeconds: number): Promise<TrackingMode> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) throw new Error('Location permission is needed to go online.');

  // Send one position straight away so matching can start.
  const now = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  await send(now);

  const interval = Math.max(3, intervalSeconds) * 1000;
  if (Platform.OS !== 'web' && (await TaskManager.isAvailableAsync())) {
    try {
      const bg = await Location.requestBackgroundPermissionsAsync();
      if (bg.granted) {
        await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK, {
          accuracy: Location.Accuracy.High,
          timeInterval: interval,
          distanceInterval: 15,
          pausesUpdatesAutomatically: false,
          showsBackgroundLocationIndicator: true,
          activityType: Location.ActivityType.AutomotiveNavigation,
          foregroundService: {
            notificationTitle: 'Lift Me — you are online',
            notificationBody: 'Sharing your location so passengers nearby can book you.',
            notificationColor: '#FFC107',
          },
        });
        return 'background';
      }
    } catch (err) {
      console.warn('background location unavailable, using foreground', err);
    }
  }

  if (Platform.OS === 'web') {
    wantWakeLock = true;
    await takeWakeLock();
  }

  foregroundSub?.remove();
  foregroundSub = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, timeInterval: interval, distanceInterval: 15 },
    (loc) => void send(loc),
  );
  return 'foreground';
}

export async function stopDriverTracking() {
  foregroundSub?.remove();
  foregroundSub = null;
  wantWakeLock = false;
  await wakeLock?.release().catch(() => undefined);
  wakeLock = null;
  if (Platform.OS !== 'web') {
    try {
      if (await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK)) {
        await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
      }
    } catch {
      // nothing running
    }
  }
}
