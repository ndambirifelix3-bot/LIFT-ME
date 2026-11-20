/**
 * Money is stored as whole numbers in each currency's smallest unit we charge in:
 * KES has 0 decimals (1050 = KES 1,050), USD has 2 (1250 = $12.50). Never floats.
 * Keep in sync with markets.currency_decimals in the database.
 */
export const CURRENCY_DECIMALS: Record<string, number> = { KES: 0, UGX: 0, TZS: 0, RWF: 0, USD: 2, EUR: 2, GBP: 2, CAD: 2 };
const CURRENCY_SYMBOL: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', CAD: 'CA$' };

export function currencyDecimals(currency: string, decimals?: number | null): number {
  return decimals ?? CURRENCY_DECIMALS[currency] ?? 2;
}

function groupThousands(n: string): string {
  const [whole, frac] = n.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${grouped}.${frac}` : grouped;
}

/** 1050 KES -> "KES 1,050"; 1250 USD -> "$12.50". */
export function formatMoney(amount: number | null | undefined, currency = 'KES', decimals?: number | null): string {
  if (amount == null) return '—';
  const d = currencyDecimals(currency, decimals);
  const value = groupThousands((Math.abs(Math.round(amount)) / 10 ** d).toFixed(d));
  const sign = amount < 0 ? '-' : '';
  const symbol = CURRENCY_SYMBOL[currency];
  return symbol ? `${sign}${symbol}${value}` : `${sign}${currency} ${value}`;
}

/** Stored amount -> what a person types: 250 (USD) -> "2.50", 100 (KES) -> "100". */
export function toMoneyInput(amount: number, decimals: number): string {
  return (amount / 10 ** decimals).toFixed(decimals);
}

/** What a person typed -> stored amount: "2.5" (USD) -> 250. Null when not a valid amount. */
export function fromMoneyInput(text: string, decimals: number): number | null {
  const t = text.trim();
  const pattern = decimals > 0 ? new RegExp(`^\\d{1,7}(\\.\\d{1,${decimals}})?$`) : /^\d{1,7}$/;
  if (!pattern.test(t)) return null;
  return Math.round(Number(t) * 10 ** decimals);
}

export type DistanceUnit = 'km' | 'mi';

/** Distances in the market's unit: "850 m" / "12.3 km", or "500 ft" / "7.7 mi". */
export function formatDistance(meters: number | null | undefined, unit: DistanceUnit | string = 'km'): string {
  if (meters == null) return '—';
  if (unit === 'mi') {
    const miles = meters / 1609.344;
    return miles < 0.1 ? `${Math.round(meters * 3.28084)} ft` : `${miles.toFixed(1)} mi`;
  }
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
  // The phone's own language/region decides the date style (e.g. 20 Nov vs Nov 20).
  return new Date(iso).toLocaleString(undefined, {
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
