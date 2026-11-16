// M-Pesa (Daraja) helpers. SANDBOX ONLY — live M-Pesa stays OFF until the owner
// deliberately changes assertSandbox() after getting a production Paybill/Till.
import { requireEnv } from './common.ts';

const SANDBOX_BASE = 'https://sandbox.safaricom.co.ke';

export function assertSandbox(): string {
  const env = Deno.env.get('MPESA_ENV') ?? 'sandbox';
  if (env !== 'sandbox') throw new Error('Live M-Pesa is disabled in this build (MPESA_ENV must be "sandbox").');
  return SANDBOX_BASE;
}

/** Daraja wants YYYYMMDDHHmmss in Kenyan time. */
export function darajaTimestamp(date = new Date()): string {
  const eat = new Date(date.getTime() + 3 * 60 * 60 * 1000); // Africa/Nairobi is UTC+3, no DST
  const p = (n: number) => String(n).padStart(2, '0');
  return `${eat.getUTCFullYear()}${p(eat.getUTCMonth() + 1)}${p(eat.getUTCDate())}${p(eat.getUTCHours())}${p(eat.getUTCMinutes())}${p(eat.getUTCSeconds())}`;
}

export function stkPassword(timestamp: string): string {
  return btoa(`${requireEnv('MPESA_SHORTCODE')}${requireEnv('MPESA_PASSKEY')}${timestamp}`);
}

/** +254712345678 / 0712345678 / 254712345678 -> 254712345678 */
export function toMsisdn(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`;
  return null;
}

export async function accessToken(): Promise<string> {
  const base = assertSandbox();
  const auth = btoa(`${requireEnv('MPESA_CONSUMER_KEY')}:${requireEnv('MPESA_CONSUMER_SECRET')}`);
  const res = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`Daraja auth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token as string;
}

export type StkQueryResult = { ok: boolean; resultCode: string | null; resultDesc: string | null; pending: boolean };

/** Asks M-Pesa directly what happened to a payment request. */
export async function stkQuery(checkoutRequestId: string): Promise<StkQueryResult> {
  const base = assertSandbox();
  const token = await accessToken();
  const timestamp = darajaTimestamp();
  const res = await fetch(`${base}/mpesa/stkpushquery/v1/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: requireEnv('MPESA_SHORTCODE'),
      Password: stkPassword(timestamp),
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
  });
  const data = await res.json().catch(() => ({}));
  // While the customer hasn't answered yet Daraja returns an errorCode such as 500.001.1001.
  if (data.errorCode) return { ok: false, resultCode: null, resultDesc: data.errorMessage ?? null, pending: true };
  const resultCode = data.ResultCode != null ? String(data.ResultCode) : null;
  return { ok: resultCode === '0', resultCode, resultDesc: data.ResultDesc ?? null, pending: false };
}
