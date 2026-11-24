// stripe-charge — charges the passenger's saved card for a completed trip.
//
// Called only by the DATABASE (trigger card_payment_dispatch on payments, header x-push-secret):
//   { payment_id } → if that payment is a pending card payment, charge it once and record the result.
// Each attempt has its own idempotency key, so a repeated call never charges twice. If the trip was
// marked "paid in cash" while the charge was running, the card charge is refunded straight away.
import { adminClient, errorResponse, json, serve } from '../_shared/common.ts';
import { brandName, stripe, StripeRequestError } from '../_shared/stripe.ts';

const ZERO_DECIMAL = new Set(['jpy', 'krw', 'vnd', 'clp', 'pyg', 'ugx', 'rwf', 'xaf', 'xof']);

serve(async (req) => {
  const db = adminClient();
  const { data: cfg } = await db.from('push_config').select('trigger_secret').eq('id', true).single();
  if (!cfg || req.headers.get('x-push-secret') !== cfg.trigger_secret) return errorResponse('forbidden', 403);

  const body = await req.json().catch(() => ({}));
  const paymentId = String(body.payment_id ?? '');
  const { data: payment } = await db.from('payments').select('*').eq('id', paymentId).maybeSingle();
  if (!payment || payment.method !== 'card' || payment.status !== 'pending') return json({ ok: true, skipped: true });

  // Claim this attempt (if two calls race, only one wins).
  const attempt = payment.charge_attempts + 1;
  const { data: claimed } = await db.from('payments')
    .update({ charge_attempts: attempt, result_desc: null, result_code: null, updated_at: new Date().toISOString() })
    .eq('id', payment.id).eq('charge_attempts', payment.charge_attempts).eq('status', 'pending').eq('method', 'card')
    .select('id').maybeSingle();
  if (!claimed) return json({ ok: true, skipped: true });

  const fail = async (code: string, desc: string) => {
    await db.from('payments').update({ status: 'failed', result_code: code, result_desc: desc, updated_at: new Date().toISOString() })
      .eq('id', payment.id).eq('status', 'pending').eq('method', 'card');
    return json({ ok: false, error: code });
  };

  const { data: ride } = await db.from('rides').select('id, passenger_id, pickup_address, dropoff_address').eq('id', payment.ride_id).single();
  const { data: card } = await db.from('stripe_customers').select('*').eq('user_id', ride!.passenger_id).maybeSingle();
  if (!card?.payment_method_id) return fail('no_card', 'No saved card. Please add a card or pay cash.');

  const currency = String(payment.currency).toLowerCase();
  if (!ZERO_DECIMAL.has(currency) && currency !== 'usd' && currency !== 'kes') return fail('currency', `Card payments are not available in ${payment.currency}.`);
  // KES amounts are stored in whole shillings; Stripe wants cents for KES too.
  const amount = currency === 'kes' ? payment.amount * 100 : payment.amount;

  let intent;
  try {
    intent = await stripe('POST', '/payment_intents', {
      amount,
      currency,
      customer: card.customer_id,
      payment_method: card.payment_method_id,
      payment_method_types: ['card'],
      off_session: true,
      confirm: true,
      description: 'Lift Me trip',
      metadata: { ride_id: ride!.id, payment_id: payment.id, attempt },
    }, `pay-${payment.id}-${attempt}`);
  } catch (err) {
    if (!(err instanceof StripeRequestError)) throw err;
    const e = err.error;
    console.warn('card charge failed', err.status, e.code, e.decline_code);
    if (e.payment_intent?.id) await db.from('payments').update({ stripe_payment_intent_id: e.payment_intent.id }).eq('id', payment.id);
    if (e.code === 'authentication_required') {
      return fail('authentication_required', 'Your bank needs to approve this payment. Please add your card again (to approve it) or pay cash.');
    }
    if (err.status >= 500 || e.type === 'api_error' || e.code === 'rate_limit') return fail('card_service_error', 'The card service is busy. Please tap Try again.');
    return fail(e.decline_code ?? e.code ?? 'card_declined', e.message ?? 'Your card was declined.');
  }

  if (intent.status !== 'succeeded') {
    return fail(intent.status, 'The payment was not completed. Please try again or pay cash.');
  }

  const { data: paid } = await db.from('payments').update({
    status: 'paid',
    stripe_payment_intent_id: intent.id,
    card_brand: card.card_brand,
    card_last4: card.card_last4,
    paid_at: new Date().toISOString(),
    result_code: 'succeeded',
    result_desc: `${brandName(card.card_brand)} •••• ${card.card_last4}`,
    updated_at: new Date().toISOString(),
  }).eq('id', payment.id).eq('status', 'pending').eq('method', 'card').select('id').maybeSingle();

  if (!paid) {
    // Paid another way while we were charging (e.g. driver confirmed cash): give the money back.
    console.warn('payment no longer pending, refunding', payment.id);
    await stripe('POST', '/refunds', { payment_intent: intent.id, reason: 'duplicate' }, `refund-${intent.id}`);
    return json({ ok: true, refunded: true });
  }
  return json({ ok: true });
});
