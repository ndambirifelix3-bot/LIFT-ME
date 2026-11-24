import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, ErrorMessage, Notice } from '@/components';
import { callFunction } from '@/lib/supabase';
import { colors, space, type } from '@/theme';
import { STRIPE_PUBLISHABLE_KEY, type SavedCard } from './cards';

// Stripe's own secure card form (Payment Element). It runs inside Stripe's frame: the card number goes
// straight to Stripe and never passes through Lift Me. Stripe.js must be loaded from js.stripe.com.

type StripeJs = {
  elements: (o: object) => { create: (kind: 'payment', o?: object) => { mount: (el: HTMLElement) => void; destroy: () => void; on: (e: string, cb: (ev: { complete?: boolean }) => void) => void } };
  confirmSetup: (o: object) => Promise<{ error?: { message?: string }; setupIntent?: { id: string; status: string } }>;
};
type StripeFactory = (key: string) => StripeJs;

let loader: Promise<StripeFactory> | null = null;
function loadStripe(): Promise<StripeFactory> {
  const w = window as unknown as { Stripe?: StripeFactory };
  if (w.Stripe) return Promise.resolve(w.Stripe);
  loader ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://js.stripe.com/v3/';
    s.async = true;
    s.onload = () => (w.Stripe ? resolve(w.Stripe) : reject(new Error('Stripe did not load')));
    s.onerror = () => {
      loader = null;
      reject(new Error('Could not load the card form. Check your connection and try again.'));
    };
    document.head.appendChild(s);
  });
  return loader;
}

/** Saves a card for later trips. Calls onSaved with the card once Stripe and our server have confirmed it. */
export function CardSetupForm({ onSaved, onCancel }: { onSaved: (card: SavedCard) => void; onCancel?: () => void }) {
  const box = useRef<HTMLElement | null>(null);
  const stripeRef = useRef<StripeJs | null>(null);
  const elementsRef = useRef<ReturnType<StripeJs['elements']> | null>(null);
  const [ready, setReady] = useState(false);
  const [complete, setComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!STRIPE_PUBLISHABLE_KEY) return;
    let cancelled = false;
    let element: { destroy: () => void } | null = null;
    (async () => {
      try {
        const [factory, setup] = await Promise.all([
          loadStripe(),
          callFunction<{ client_secret: string }>('stripe-card', { action: 'setup' }),
        ]);
        if (cancelled) return;
        const stripe = factory(STRIPE_PUBLISHABLE_KEY);
        const elements = stripe.elements({
          clientSecret: setup.client_secret,
          appearance: {
            theme: 'stripe',
            variables: { colorPrimary: colors.black, colorText: colors.text, colorDanger: colors.error, borderRadius: '12px', fontSizeBase: '16px' },
          },
        });
        const payment = elements.create('payment', { layout: 'tabs', wallets: { applePay: 'never', googlePay: 'never', link: 'never' } });
        payment.on('change', (ev) => setComplete(!!ev.complete));
        payment.on('ready', () => setReady(true));
        payment.mount(box.current!);
        stripeRef.current = stripe;
        elementsRef.current = elements;
        element = payment;
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      }
    })();
    return () => {
      cancelled = true;
      element?.destroy();
    };
  }, [attempt]);

  async function save() {
    if (!stripeRef.current || !elementsRef.current) return;
    setSaving(true);
    setError(null);
    try {
      const { error: stripeError, setupIntent } = await stripeRef.current.confirmSetup({
        elements: elementsRef.current,
        redirect: 'if_required',
        // Only used if the bank needs a full-page check: Stripe brings the passenger back here.
        confirmParams: { return_url: `${window.location.origin}/passenger/payment` },
      });
      if (stripeError) throw new Error(stripeError.message ?? 'Your card could not be saved.');
      if (!setupIntent) throw new Error('Your card could not be saved.');
      const res = await callFunction<{ card: { brand: string; last4: string; exp_month: number; exp_year: number } }>('stripe-card', {
        action: 'save',
        setup_intent_id: setupIntent.id,
      });
      onSaved({ brand: res.card.brand, last4: res.card.last4, expMonth: res.card.exp_month, expYear: res.card.exp_year });
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setSaving(false);
    }
  }

  if (!STRIPE_PUBLISHABLE_KEY) return <Notice tone="error" text="Card payments are not set up yet." />;

  return (
    <View>
      <View ref={(el) => { box.current = el as unknown as HTMLElement | null; }} style={{ minHeight: ready ? undefined : 180, marginBottom: space.md }} />
      {!ready && !error ? <Text style={[type.small, { marginBottom: space.md }]}>Loading the secure card form…</Text> : null}
      <ErrorMessage error={error} onRetry={ready ? undefined : () => { setError(null); setAttempt((n) => n + 1); }} />
      <Button title="Save card" onPress={save} loading={saving} disabled={!ready || !complete} />
      {onCancel ? <Button title="Cancel" variant="ghost" onPress={onCancel} style={{ marginTop: space.sm }} /> : null}
      <Text style={[type.small, { marginTop: space.md, textAlign: 'center' }]}>
        🔒 Your card details go straight to Stripe, our payment provider. Lift Me never sees or stores your card number.
      </Text>
    </View>
  );
}
