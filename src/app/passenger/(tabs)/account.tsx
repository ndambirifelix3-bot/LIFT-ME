import { router } from 'expo-router';
import { Header, ListItem, Screen, SectionTitle } from '@/components';
import { AccountBasics } from '@/features/auth/AccountActions';
import { useAuth } from '@/features/auth/AuthProvider';
import { marketForPhone, useMarkets } from '@/features/markets';
import { cardLabel, useSavedCard } from '@/features/payments/cards';

export default function PassengerAccount() {
  const { profile } = useAuth();
  const markets = useMarkets().data ?? [];
  // Card payments: shown when a market offers them, unless the passenger's phone is from a market without cards.
  const home = marketForPhone(markets, profile?.phone);
  const cardsOffered = home ? home.payment_methods.includes('card') : markets.some((m) => m.is_active && m.payment_methods.includes('card'));
  const card = useSavedCard();
  return (
    <Screen>
      <Header title="Account" />
      <AccountBasics />
      {cardsOffered ? (
        <>
          <SectionTitle>Payment</SectionTitle>
          <ListItem
            icon="card-outline"
            title={card.data ? cardLabel(card.data.brand, card.data.last4) : 'Add a card'}
            subtitle={card.data ? 'Charged automatically when you pay by card' : 'Pay for trips by card (USA)'}
            onPress={() => router.push('/passenger/payment')}
          />
        </>
      ) : null}
      <SectionTitle>Support</SectionTitle>
      <ListItem icon="help-buoy-outline" title="Help & safety" subtitle="Report a problem, emergency numbers" onPress={() => router.push('/passenger/help')} />
    </Screen>
  );
}
