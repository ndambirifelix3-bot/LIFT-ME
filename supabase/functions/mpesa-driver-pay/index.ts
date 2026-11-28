// mpesa-driver-pay — a driver pays what they owe Lift Me (commission on cash trips) with M-Pesa.
// Sends the M-Pesa PIN prompt to the driver's phone. Like trip payments, this NEVER marks anything
// paid: only mpesa-callback / mpesa-reconcile do, after M-Pesa confirms. Then the balance clears itself.
//   { amount?, phone? } → amount defaults to everything owed; phone defaults to the driver's number.
import { adminClient, errorResponse, getUser, json, requireEnv, serve } from '../_shared/common.ts';
import { accessToken, assertSandbox, darajaTimestamp, stkPassword, toMsisdn } from '../_shared/mpesa.ts';

serve(async (req) => {
  const user = await getUser(req);
  if (!user) return errorResponse('not_signed_in', 401);

  const db = adminClient();
  const { data: profile } = await db.from('profiles').select('role, phone, is_suspended').eq('id', user.id).single();
  if (!profile || profile.role !== 'driver') return errorResponse('drivers_only', 403);
  const { data: driver } = await db.from('drivers').select('id, wallet_balance, market_code').eq('id', user.id).single();
  if (!driver) return errorResponse('drivers_only', 403);
  const { data: market } = await db.from('markets').select('currency, payment_methods').eq('code', driver.market_code).maybeSingle();
  if (market?.currency !== 'KES' || !market.payment_methods?.includes('mpesa')) {
    return errorResponse('payment_method_not_available', 409, 'M-Pesa is not available in your country.');
  }

  const owed = Math.max(-driver.wallet_balance, 0);
  if (owed <= 0) return errorResponse('nothing_owed', 409, 'You don’t owe Lift Me anything right now.');
  const body = await req.json().catch(() => ({}));
  const amount = body.amount == null || body.amount === '' ? owed : Number(body.amount);
  if (!Number.isInteger(amount) || amount < 1 || amount > owed) {
    return errorResponse('bad_amount', 400, `Enter a whole amount from 1 to ${owed}.`);
  }
  const msisdn = toMsisdn(String(body.phone || profile.phone || ''));
  if (!msisdn) return errorResponse('bad_phone', 400, 'Enter a valid Safaricom number.');

  // One prompt at a time: wait for the last one to finish (or 90 seconds) before sending another.
  const { data: recent } = await db.from('driver_mpesa_payments').select('id')
    .eq('driver_id', driver.id).eq('status', 'pending').gt('created_at', new Date(Date.now() - 90_000).toISOString()).limit(1);
  if (recent?.length) return errorResponse('payment_in_progress', 409, 'A payment prompt was just sent. Check your phone, or try again in a minute.');

  const base = assertSandbox();
  const token = await accessToken();
  const timestamp = darajaTimestamp();
  const shortcode = requireEnv('MPESA_SHORTCODE');
  const callbackUrl = `${requireEnv('SUPABASE_URL')}/functions/v1/mpesa-callback?secret=${encodeURIComponent(requireEnv('MPESA_CALLBACK_SECRET'))}`;

  const res = await fetch(`${base}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: stkPassword(timestamp),
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: msisdn,
      PartyB: shortcode,
      PhoneNumber: msisdn,
      CallBackURL: callbackUrl,
      AccountReference: 'LiftMeDriver',
      TransactionDesc: 'Lift Me balance',
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || String(data.ResponseCode) !== '0') {
    console.error('driver stk push failed', res.status, data);
    return errorResponse('mpesa_request_failed', 502, data.errorMessage ?? data.ResponseDescription ?? 'M-Pesa request failed.');
  }

  const { data: row, error } = await db.from('driver_mpesa_payments').insert({
    driver_id: driver.id, amount, currency: 'KES', phone: msisdn,
    checkout_request_id: data.CheckoutRequestID, merchant_request_id: data.MerchantRequestID,
  }).select('id').single();
  if (error) throw error;
  return json({ ok: true, id: row.id, amount, message: 'Check your phone and enter your M-Pesa PIN.' });
});
