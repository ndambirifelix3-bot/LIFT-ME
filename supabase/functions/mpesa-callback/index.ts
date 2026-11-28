// mpesa-callback — Safaricom calls this with the STK Push result, for both:
//   * passengers paying a trip (table payments, sent by mpesa-stk-push)
//   * drivers paying what they owe (table driver_mpesa_payments, sent by mpesa-driver-pay)
// Safe against duplicates and fakes:
//   * shared secret in the URL
//   * every callback is logged
//   * a SUCCESS is re-checked with M-Pesa's status query before marking paid (retrying while
//     M-Pesa is still processing); a FAILURE is recorded as reported — a fake failure moves no
//     money, the person can simply pay again
//   * the paid update is conditional (status <> 'paid') and the receipt number is UNIQUE,
//     so a repeated callback can never record the payment twice.
import { adminClient, json, requireEnv } from '../_shared/common.ts';
import { stkQueryUntilFinal } from '../_shared/mpesa.ts';

const ACK = () => json({ ResultCode: 0, ResultDesc: 'Accepted' });

/** Where a payment request lives: trip payments or driver payments. */
const TABLES = [
  { table: 'payments', checkout: 'mpesa_checkout_request_id' },
  { table: 'driver_mpesa_payments', checkout: 'checkout_request_id' },
] as const;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const url = new URL(req.url);
  if (url.searchParams.get('secret') !== requireEnv('MPESA_CALLBACK_SECRET')) {
    return new Response('forbidden', { status: 403 });
  }

  const payload = await req.json().catch(() => null);
  const cb = payload?.Body?.stkCallback;
  const db = adminClient();
  await db.from('mpesa_callbacks').insert({ checkout_request_id: cb?.CheckoutRequestID ?? null, payload: payload ?? {} });
  if (!cb?.CheckoutRequestID) return ACK();

  try {
    let found: { table: string; checkout: string; row: { id: string; status: string; amount: number } } | null = null;
    for (const t of TABLES) {
      const { data } = await db.from(t.table).select('id, status, amount').eq(t.checkout, cb.CheckoutRequestID).maybeSingle();
      if (data) {
        found = { ...t, row: data };
        break;
      }
    }
    if (!found || found.row.status === 'paid') return ACK(); // unknown or duplicate
    const { table, checkout, row } = found;
    const now = () => new Date().toISOString();

    const callbackCode = String(cb.ResultCode);
    // deno-lint-ignore no-explicit-any
    const items: { Name: string; Value?: any }[] = cb.CallbackMetadata?.Item ?? [];
    const item = (name: string) => items.find((i) => i.Name === name)?.Value;

    // Safaricom says it failed (cancelled, wrong PIN, phone unreachable…): record its reason.
    if (callbackCode !== '0') {
      await db.from(table).update({ status: 'failed', result_code: callbackCode, result_desc: cb.ResultDesc ?? null, updated_at: now() })
        .eq('id', row.id).eq('status', 'pending').eq(checkout, cb.CheckoutRequestID);
      return ACK();
    }

    // Safaricom says it was paid. Never trust the callback alone: ask M-Pesa directly
    // (several times if it's still processing).
    const check = await stkQueryUntilFinal(cb.CheckoutRequestID);

    if (check.ok) {
      const amount = Math.round(Number(item('Amount') ?? 0));
      const receipt = item('MpesaReceiptNumber') ? String(item('MpesaReceiptNumber')) : null;
      if (amount < row.amount || !receipt) {
        await db.from(table).update({ status: 'failed', result_code: 'amount_mismatch', result_desc: `Expected ${row.amount}, got ${amount}`, updated_at: now() })
          .eq('id', row.id).neq('status', 'paid');
        return ACK();
      }
      const { error } = await db.from(table).update({
        status: 'paid', mpesa_receipt: receipt, result_code: callbackCode, result_desc: cb.ResultDesc ?? null, paid_at: now(), updated_at: now(),
      }).eq('id', row.id).neq('status', 'paid');
      if (error) console.error('mark paid failed (duplicate receipt?)', error);
    } else if (!check.pending) {
      // The callback said paid but M-Pesa itself says no: trust M-Pesa.
      await db.from(table).update({ status: 'failed', result_code: check.resultCode, result_desc: check.resultDesc, updated_at: now() })
        .eq('id', row.id).eq('status', 'pending').eq(checkout, cb.CheckoutRequestID);
    } else {
      // Still processing after several checks: leave it pending (the every-minute re-check finishes it).
      console.warn('mpesa still processing after retries', cb.CheckoutRequestID);
    }
  } catch (err) {
    console.error('mpesa-callback error', err);
  }
  return ACK();
});
