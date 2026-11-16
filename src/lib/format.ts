/** Money is whole currency units (integers), e.g. KES. */
export function formatMoney(amount: number | null | undefined, currency = 'KES'): string {
  if (amount == null) return '—';
  return `${currency} ${Math.round(amount).toLocaleString('en-KE')}`;
}

export function formatDistance(meters: number | null | undefined): string {
  if (meters == null) return '—';
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—';
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-KE', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function secondsUntil(iso: string | null | undefined, now = Date.now()): number {
  if (!iso) return 0;
  return Math.max(0, Math.round((new Date(iso).getTime() - now) / 1000));
}

export function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const RIDE_STATUS_LABEL: Record<string, string> = {
  searching: 'Finding a driver',
  accepted: 'Driver on the way',
  arrived: 'Driver arrived',
  in_progress: 'On trip',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_driver_found: 'No driver found',
};

/** Decodes a Google encoded polyline into coordinates. */
export function decodePolyline(encoded: string | null | undefined): { latitude: number; longitude: number }[] {
  if (!encoded) return [];
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}
