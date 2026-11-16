// mpesa-callback — Safaricom calls this with the STK Push result.
// Safe against duplicates and fakes:
//   * shared secret in the URL (set in mpesa-stk-push)
//   * every callback is logged
//   * the result is re-checked with M-Pesa's status query before marking paid
//   * the paid update is conditional (status <> 'paid') and the receipt number is UNIQUE,
//     so a repeated callback can never record the payment twice.
import { adminClient, json, requireEnv } from '../_shared/common.ts';
import { stkQuery } from '../_shared/mpesa.ts';

const ACK = () => json({ ResultCode: 0, ResultDesc: 'Accepted' });

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
    const { data: payment } = await db
      .from('payments')
      .select('*')
      .eq('mpesa_checkout_request_id', cb.CheckoutRequestID)
      .maybeSingle();
    if (!payment || payment.status === 'paid') return ACK(); // unknown or duplicate

    const callbackCode = String(cb.ResultCode);
    // deno-lint-ignore no-explicit-any
    const items: { Name: string; Value?: any }[] = cb.CallbackMetadata?.Item ?? [];
    const item = (name: string) => items.find((i) => i.Name === name)?.Value;

    // Never trust the callback alone: ask M-Pesa directly.
    const check = await stkQuery(cb.CheckoutRequestID);

    if (callbackCode === '0' && check.ok) {
      const amount = Math.round(Number(item('Amount') ?? 0));
      const receipt = item('MpesaReceiptNumber') ? String(item('MpesaReceiptNumber')) : null;
      if (amount < payment.amount || !receipt) {
        await db.from('payments').update({
          status: 'failed',
          result_code: 'amount_mismatch',
          result_desc: `Expected ${payment.amount}, got ${amount}`,
          updated_at: new Date().toISOString(),
        }).eq('id', payment.id).neq('status', 'paid');
        return ACK();
      }
      const { error } = await db.from('payments').update({
        status: 'paid',
        mpesa_receipt: receipt,
        result_code: callbackCode,
        result_desc: cb.ResultDesc ?? null,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', payment.id).neq('status', 'paid');
      if (error) console.error('mark paid failed (duplicate receipt?)', error);
    } else if (!check.pending) {
      await db.from('payments').update({
        status: 'failed',
        result_code: check.resultCode ?? callbackCode,
        result_desc: check.resultDesc ?? cb.ResultDesc ?? null,
        updated_at: new Date().toISOString(),
      }).eq('id', payment.id).eq('status', 'pending').eq('mpesa_checkout_request_id', cb.CheckoutRequestID);
    }
  } catch (err) {
    console.error('mpesa-callback error', err);
  }
  return ACK();
});
