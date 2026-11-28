// mpesa-reconcile — M-Pesa payments (trips and drivers' balance payments) still "waiting" because Safaricom's callback never arrived.
//
// Called only by the DATABASE every minute (mpesa_recheck_dispatch, header x-push-secret), and only
// when such payments exist. For each one it asks M-Pesa directly (status query):
//   paid      → marked paid (the status answer has no receipt number; it says so in result_desc)
//   failed    → marked failed with M-Pesa's reason (the passenger can try again or pay cash)
//   no answer → left waiting; after 15 minutes marked failed ("No answer from M-Pesa").
import { adminClient, errorResponse, json, serve } from '../_shared/common.ts';
import { stkQuery } from '../_shared/mpesa.ts';

const GIVE_UP_MS = 15 * 60 * 1000;

serve(async (req) => {
  const db = adminClient();
  const { data: cfg } = await db.from('push_config').select('trigger_secret').eq('id', true).single();
  if (!cfg || req.headers.get('x-push-secret') !== cfg.trigger_secret) return errorResponse('forbidden', 403);

  const results: Record<string, string> = {};
  // Trip payments and driver payments: same check, different table and column names.
  const jobs = [
    { fn: 'mpesa_payments_to_recheck', table: 'payments', checkout: 'mpesa_checkout_request_id' },
    { fn: 'driver_mpesa_to_recheck', table: 'driver_mpesa_payments', checkout: 'checkout_request_id' },
  ];
  for (const job of jobs) {
    const { data: rows, error } = await db.rpc(job.fn, { p_limit: 10 });
    if (error) throw error;
    for (const p of rows ?? []) {
      const checkout = p[job.checkout] as string;
      await db.from(job.table).update({ mpesa_checked_at: new Date().toISOString() }).eq('id', p.id);

      let check;
      try {
        check = await stkQuery(checkout);
      } catch (err) {
        console.warn('stk query failed', p.id, err);
        results[p.id] = 'query_error';
        continue;
      }
      const now = new Date().toISOString();
      // Each update only applies if the row is still this same waiting request.
      const stillWaiting = (u: Record<string, unknown>) =>
        db.from(job.table).update(u).eq('id', p.id).eq('status', 'pending').eq(job.checkout, checkout);
      if (check.ok) {
        await stillWaiting({
          status: 'paid', paid_at: now, updated_at: now, result_code: '0',
          result_desc: 'Confirmed by M-Pesa status check (no receipt number in this answer)',
        });
        results[p.id] = 'paid';
      } else if (!check.pending) {
        await stillWaiting({ status: 'failed', updated_at: now, result_code: check.resultCode, result_desc: check.resultDesc });
        results[p.id] = 'failed';
      } else if (Date.now() - new Date(p.updated_at).getTime() > GIVE_UP_MS) {
        await stillWaiting({ status: 'failed', updated_at: now, result_code: 'timeout', result_desc: 'No answer from M-Pesa. Please try again or pay cash.' });
        results[p.id] = 'timeout';
      } else {
        results[p.id] = 'still_waiting';
      }
    }
  }
  return json({ ok: true, checked: Object.keys(results).length, results });
});
