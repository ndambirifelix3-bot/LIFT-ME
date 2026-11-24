// stripe-card — a passenger's saved card (signed-in passengers only).
//   { action: 'setup' }                     → { client_secret } for Stripe's secure card form (SetupIntent)
//   { action: 'save', setup_intent_id }     → checks the form succeeded and saves "Visa •••• 4242"
//   { action: 'remove' }                    → removes the saved card
// The card number never touches Lift Me: the form sends it straight to Stripe. We keep only Stripe's
// reference (pm_…), the brand, last 4 digits and expiry (table stripe_customers).
import { adminClient, errorResponse, getUser, json, serve } from '../_shared/common.ts';
import { stripe, StripeRequestError } from '../_shared/stripe.ts';

serve(async (req) => {
  const user = await getUser(req);
  if (!user) return errorResponse('not_signed_in', 401);
  const db = adminClient();
  const { data: profile } = await db.from('profiles').select('role, is_suspended').eq('id', user.id).single();
  if (!profile || profile.role !== 'passenger') return errorResponse('passengers_only', 403);
  if (profile.is_suspended) return errorResponse('account_suspended', 403);

  const body = await req.json().catch(() => ({}));
  const { data: row } = await db.from('stripe_customers').select('*').eq('user_id', user.id).maybeSingle();

  try {
    if (body.action === 'setup') {
      let customerId = row?.customer_id as string | undefined;
      if (!customerId) {
        // Only an internal id goes to Stripe — no name, phone or email.
        const customer = await stripe('POST', '/customers', { metadata: { lift_me_user: user.id } }, `customer-${user.id}`);
        customerId = customer.id as string;
        const { error } = await db.from('stripe_customers').insert({ user_id: user.id, customer_id: customerId });
        if (error) {
          // Two taps at once: use the row the other one saved.
          const { data: again } = await db.from('stripe_customers').select('customer_id').eq('user_id', user.id).single();
          customerId = again!.customer_id;
        }
      }
      const intent = await stripe('POST', '/setup_intents', {
        customer: customerId,
        usage: 'off_session',
        payment_method_types: ['card'],
        metadata: { lift_me_user: user.id },
      });
      return json({ client_secret: intent.client_secret });
    }

    if (body.action === 'save') {
      if (!row) return errorResponse('no_card', 400);
      const id = String(body.setup_intent_id ?? '');
      if (!/^seti_[A-Za-z0-9]+$/.test(id)) return errorResponse('bad_request', 400);
      const intent = await stripe('GET', `/setup_intents/${id}`, { expand: ['payment_method'] });
      if (intent.customer !== row.customer_id) return errorResponse('forbidden', 403);
      if (intent.status !== 'succeeded' || !intent.payment_method?.card) {
        return errorResponse('card_not_saved', 400, 'Your card could not be saved. Please try again.');
      }
      const pm = intent.payment_method;
      await stripe('POST', `/customers/${row.customer_id}`, { invoice_settings: { default_payment_method: pm.id } });
      if (row.payment_method_id && row.payment_method_id !== pm.id) {
        await stripe('POST', `/payment_methods/${row.payment_method_id}/detach`).catch((e) => console.warn('detach old card', e));
      }
      const card = {
        payment_method_id: pm.id,
        card_brand: pm.card.brand,
        card_last4: pm.card.last4,
        card_exp_month: pm.card.exp_month,
        card_exp_year: pm.card.exp_year,
        updated_at: new Date().toISOString(),
      };
      await db.from('stripe_customers').update(card).eq('user_id', user.id);
      return json({ card: { brand: card.card_brand, last4: card.card_last4, exp_month: card.card_exp_month, exp_year: card.card_exp_year } });
    }

    if (body.action === 'remove') {
      if (row?.payment_method_id) {
        await stripe('POST', `/payment_methods/${row.payment_method_id}/detach`).catch((e) => console.warn('detach', e));
        await db.from('stripe_customers').update({
          payment_method_id: null, card_brand: null, card_last4: null, card_exp_month: null, card_exp_year: null, updated_at: new Date().toISOString(),
        }).eq('user_id', user.id);
      }
      return json({ ok: true });
    }
  } catch (err) {
    if (err instanceof StripeRequestError) {
      console.error('stripe', err.status, err.error);
      return errorResponse('card_service_error', 502, err.error.message ?? 'The card service is not available. Please try again.');
    }
    throw err;
  }
  return errorResponse('bad_request', 400);
});
