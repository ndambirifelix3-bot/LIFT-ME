// mpesa-stk-push — sends the M-Pesa PIN prompt to the passenger's phone.
// This NEVER marks a payment as paid; only mpesa-callback can do that, after
// confirming with M-Pesa's status query.
import { adminClient, errorResponse, getUser, json, requireEnv, serve } from '../_shared/common.ts';
import { accessToken, assertSandbox, darajaTimestamp, stkPassword, toMsisdn } from '../_shared/mpesa.ts';

serve(async (req) => {
  const user = await getUser(req);
  if (!user) return errorResponse('not_signed_in', 401);

  const body = await req.json().catch(() => ({}));
  const rideId = String(body.ride_id ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(rideId)) return errorResponse('bad_request');

  const db = adminClient();
  const { data: ride } = await db
    .from('rides')
    .select('id, passenger_id, status, fare, currency')
    .eq('id', rideId)
    .maybeSingle();
  if (!ride || ride.passenger_id !== user.id) return errorResponse('not_your_ride', 403);
  if (ride.status !== 'completed') return errorResponse('ride_not_completed', 409, 'You can pay once the trip is complete.');

  const { data: payment } = await db.from('payments').select('*').eq('ride_id', ride.id).maybeSingle();
  if (!payment) return errorResponse('payment_not_found', 404);
  if (payment.status === 'paid') return errorResponse('already_paid', 409, 'This trip is already paid.');

  const { data: profile } = await db.from('profiles').select('phone').eq('id', user.id).single();
  const msisdn = toMsisdn(String(body.phone ?? profile?.phone ?? ''));
  if (!msisdn) return errorResponse('bad_phone', 400, 'Enter a valid Safaricom number.');

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
      Amount: payment.amount, // whole KES
      PartyA: msisdn,
      PartyB: shortcode,
      PhoneNumber: msisdn,
      CallBackURL: callbackUrl,
      AccountReference: 'LiftMe',
      TransactionDesc: `Ride ${ride.id.slice(0, 8)}`,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || String(data.ResponseCode) !== '0') {
    console.error('stk push failed', res.status, data);
    return errorResponse('mpesa_request_failed', 502, data.errorMessage ?? data.ResponseDescription ?? 'M-Pesa request failed.');
  }

  await db
    .from('payments')
    .update({
      method: 'mpesa',
      status: 'pending',
      mpesa_phone: msisdn,
      mpesa_checkout_request_id: data.CheckoutRequestID,
      mpesa_merchant_request_id: data.MerchantRequestID,
      result_code: null,
      result_desc: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.id)
    .neq('status', 'paid');
  await db.from('rides').update({ payment_method: 'mpesa' }).eq('id', ride.id);

  return json({ ok: true, message: 'Check your phone and enter your M-Pesa PIN.' });
});
