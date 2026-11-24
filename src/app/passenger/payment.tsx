import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, ErrorMessage, Header, Loading, Notice, Screen } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { CardSetupForm } from '@/features/payments/CardSetupForm';
import { cardLabel, type SavedCard, useSavedCard } from '@/features/payments/cards';
import { confirm } from '@/lib/confirm';
import { goBack } from '@/lib/nav';
import { callFunction } from '@/lib/supabase';
import { colors, space, type } from '@/theme';

/** Passenger: the card used for card trips (add, replace, remove). */
export default function PaymentMethods() {
  const qc = useQueryClient();
  const { session } = useAuth();
  // from=options: came from booking — go straight back once the card is saved.
  // setup_intent: Stripe sent the passenger back here after a bank check (rare).
  const { from, setup_intent: returnedIntent, redirect_status } = useLocalSearchParams<{ from?: string; setup_intent?: string; redirect_status?: string }>();
  const card = useSavedCard();
  const [adding, setAdding] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const setCard = (c: SavedCard | null) => qc.setQueryData(['saved-card', session?.user.id], c);

  const onSaved = (c: SavedCard) => {
    setCard(c);
    setAdding(false);
    setJustSaved(true);
    if (from === 'options') goBack('/passenger/options');
  };

  const finishReturn = useMutation({
    mutationFn: () => callFunction<{ card: { brand: string; last4: string; exp_month: number; exp_year: number } }>('stripe-card', { action: 'save', setup_intent_id: returnedIntent }),
    onSuccess: (res) => {
      onSaved({ brand: res.card.brand, last4: res.card.last4, expMonth: res.card.exp_month, expYear: res.card.exp_year });
      router.setParams({ setup_intent: undefined, setup_intent_client_secret: undefined, redirect_status: undefined });
    },
  });
  useEffect(() => {
    if (returnedIntent && redirect_status === 'succeeded' && finishReturn.isIdle) finishReturn.mutate();
  }, [returnedIntent, redirect_status, finishReturn]);

  const remove = useMutation({
    mutationFn: () => callFunction('stripe-card', { action: 'remove' }),
    onSuccess: () => {
      setCard(null);
      setJustSaved(false);
    },
  });

  const askRemove = () => confirm('Remove this card?', 'You can add a card again at any time.', () => remove.mutate());

  if (card.isLoading || finishReturn.isPending) return <Loading />;
  const saved = card.data;
  const showForm = adding || !saved;

  return (
    <Screen>
      <Header title="Payment" subtitle="Pay for trips by card (USA)" back />
      <ErrorMessage error={card.error ?? finishReturn.error ?? remove.error} onRetry={card.error ? () => card.refetch() : undefined} />
      {justSaved ? <Notice tone="success" text="Card saved. Choose Card when you book a ride." /> : null}

      {saved && !adding ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Ionicons name="card-outline" size={28} color={colors.text} />
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>{cardLabel(saved.brand, saved.last4)}</Text>
              {saved.expMonth && saved.expYear ? (
                <Text style={type.small}>Expires {String(saved.expMonth).padStart(2, '0')}/{String(saved.expYear).slice(-2)}</Text>
              ) : null}
            </View>
          </View>
          <Text style={[type.small, { marginTop: space.md }]}>
            When you choose Card, this card is charged automatically at the end of each trip. You get a receipt in your trip history.
          </Text>
          <View style={{ height: space.md }} />
          <Button title="Replace card" variant="outline" onPress={() => { setJustSaved(false); setAdding(true); }} />
          <Button title="Remove card" variant="ghost" onPress={askRemove} loading={remove.isPending} style={{ marginTop: space.sm }} />
        </Card>
      ) : null}

      {showForm ? (
        <Card>
          <Text style={[type.h3, { marginBottom: space.md }]}>{saved ? 'New card' : 'Add a card'}</Text>
          <CardSetupForm onSaved={onSaved} onCancel={saved ? () => setAdding(false) : undefined} />
        </Card>
      ) : null}
    </Screen>
  );
}
