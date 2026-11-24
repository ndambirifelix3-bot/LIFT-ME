// stripe-webhook — Stripe tells us the final result of a card payment (backup to stripe-charge's own
// result, e.g. if the function timed out). Secret: STRIPE_WEBHOOK_SECRET (whsec_…, from the Stripe
// dashboard → Developers → Webhooks). Events: payment_intent.succeeded, payment_intent.payment_failed.
import { adminClient, errorResponse, json } from '../_shared/common.ts';
import { brandName, verifyWebhook } from '../_shared/stripe.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return errorResponse('method_not_allowed', 405);
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secret) {
    console.error('STRIPE_WEBHOOK_SECRET not set');
    return errorResponse('not_configured', 500);
  }
  const raw = await req.text();
  if (!(await verifyWebhook(raw, req.headers.get('Stripe-Signature'), secret))) return errorResponse('bad_signature', 400);

  const event = JSON.parse(raw);
  const pi = event.data?.object;
  const paymentId = pi?.metadata?.payment_id;
  if (!paymentId || !['payment_intent.succeeded', 'payment_intent.payment_failed'].includes(event.type)) return json({ received: true });

  const db = adminClient();
  const now = new Date().toISOString();
  if (event.type === 'payment_intent.succeeded') {
    const card = pi.payment_method_details?.card ?? null;
    const { data: row } = await db.from('payments').select('status, method, card_brand, card_last4').eq('id', paymentId).maybeSingle();
    if (row && row.status !== 'paid' && row.method === 'card') {
      await db.from('payments').update({
        status: 'paid', stripe_payment_intent_id: pi.id, paid_at: now, result_code: 'succeeded',
        card_brand: row.card_brand ?? card?.brand ?? null, card_last4: row.card_last4 ?? card?.last4 ?? null,
        result_desc: card ? `${brandName(card.brand)} •••• ${card.last4}` : 'Card', updated_at: now,
      }).eq('id', paymentId).neq('status', 'paid');
    }
  } else {
    // Only mark the current attempt as failed (a newer retry may already be running).
    const err = pi.last_payment_error ?? {};
    await db.from('payments').update({
      status: 'failed', result_code: err.decline_code ?? err.code ?? 'card_declined', result_desc: err.message ?? 'Your card was declined.', updated_at: now,
    }).eq('id', paymentId).eq('status', 'pending').eq('stripe_payment_intent_id', pi.id);
  }
  return json({ received: true });
});
