// Small Stripe REST client (no SDK needed). Secret: STRIPE_SECRET_KEY (Supabase → Edge Functions → Secrets).
// Test keys (sk_test_…) only move pretend money; swap for the client's live key at launch.
import { requireEnv } from './common.ts';

const API = 'https://api.stripe.com/v1';

export type StripeError = { type?: string; code?: string; decline_code?: string; message?: string; payment_intent?: { id: string; status: string } };
export class StripeRequestError extends Error {
  constructor(public status: number, public error: StripeError) {
    super(error.message ?? `stripe ${status}`);
  }
}

/** Flattens {a: {b: 1}, c: ['x']} into Stripe's form style: a[b]=1&c[0]=x */
function form(params: Record<string, unknown>, prefix = '', out = new URLSearchParams()): URLSearchParams {
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => (typeof item === 'object' ? form(item, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(item))));
    else if (typeof v === 'object') form(v as Record<string, unknown>, key, out);
    else out.append(key, String(v));
  }
  return out;
}

// deno-lint-ignore no-explicit-any
export async function stripe<T = any>(method: 'GET' | 'POST' | 'DELETE', path: string, params: Record<string, unknown> = {}, idempotencyKey?: string): Promise<T> {
  const headers: Record<string, string> = { Authorization: `Bearer ${requireEnv('STRIPE_SECRET_KEY')}`, 'Stripe-Version': '2024-06-20' };
  let url = `${API}${path}`;
  let body: string | undefined;
  const encoded = form(params).toString();
  if (method === 'GET') {
    if (encoded) url += `?${encoded}`;
  } else {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = encoded;
  }
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const res = await fetch(url, { method, headers, body, signal: AbortSignal.timeout(20000) });
  const data = await res.json();
  if (!res.ok) throw new StripeRequestError(res.status, data.error ?? {});
  return data as T;
}

/** Checks a webhook's Stripe-Signature header (HMAC-SHA256 of "timestamp.body"), allowing 5 minutes of clock drift. */
export async function verifyWebhook(rawBody: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const parts = header.split(',').map((p) => p.split('=') as [string, string]);
  const t = parts.find(([k]) => k === 't')?.[1];
  const sigs = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${rawBody}`)));
  const expected = Array.from(mac, (b) => b.toString(16).padStart(2, '0')).join('');
  return sigs.some((s) => s.length === expected.length && timingSafeEqual(s, expected));
}

function timingSafeEqual(a: string, b: string): boolean {
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** "visa" → "Visa", "amex" → "American Express" … */
export function brandName(brand: string | null | undefined): string {
  const names: Record<string, string> = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express', discover: 'Discover', diners: 'Diners Club', jcb: 'JCB', unionpay: 'UnionPay' };
  return names[String(brand)] ?? 'Card';
}
