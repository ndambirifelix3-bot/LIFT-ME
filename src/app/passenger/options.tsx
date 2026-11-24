import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, ErrorMessage, Header, Notice, Row, Screen, SectionTitle } from '@/components';
import { useBooking } from '@/features/booking/store';
import { useMarket } from '@/features/markets';
import { cardLabel, useSavedCard } from '@/features/payments/cards';
import { RideTypeIcon } from '@/features/rides/rideTypes';
import type { Ride } from '@/features/rides/types';
import { formatCountdown, formatDistance, formatDuration, formatMoney, secondsUntil } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { goBack } from '@/lib/nav';
import { colors, fonts, radius, space, type } from '@/theme';

type Method = Ride['payment_method'];

const METHOD_LABEL: Record<Method, { label: string; icon: 'cash-outline' | 'phone-portrait-outline' | 'card-outline'; hint: string }> = {
  mpesa: { label: 'M-Pesa', icon: 'phone-portrait-outline', hint: 'You will get an M-Pesa prompt on your phone at the end of the trip.' },
  cash: { label: 'Cash', icon: 'cash-outline', hint: 'Pay your driver in cash at the end of the trip.' },
  card: { label: 'Card', icon: 'card-outline', hint: 'Add a card to pay automatically at the end of the trip.' },
};

export default function RideOptions() {
  const { quote, pickup, dropoff, pickupNote, reset } = useBooking();
  const [rideType, setRideType] = useState<string | null>(quote?.options[0]?.ride_type ?? null);
  const market = useMarket(quote?.market_code);
  // Only the payment methods this city offers, in the order the market lists them.
  const methods = (market?.payment_methods ?? ['cash']) as Method[];
  const savedCard = useSavedCard();
  const [picked, setPicked] = useState<Method | null>(null);
  // A passenger with a saved card pays by card unless they pick something else.
  const preferred: Method = savedCard.data && methods.includes('card') ? 'card' : methods[0];
  const method: Method = picked && methods.includes(picked) ? picked : preferred;
  const needsCard = method === 'card' && !savedCard.data;
  const [left, setLeft] = useState(secondsUntil(quote?.expires_at));

  useEffect(() => {
    const t = setInterval(() => setLeft(secondsUntil(quote?.expires_at)), 1000);
    return () => clearInterval(t);
  }, [quote?.expires_at]);

  const request = useMutation({
    mutationFn: async () => {
      // The server re-reads the saved quote: the price comes from the database, not from this screen.
      const { data, error } = await supabase.rpc('request_ride', {
        p_quote_id: quote!.id,
        p_ride_type: rideType!,
        p_payment_method: method,
      });
      if (error) throw error;
      return data as unknown as Ride;
    },
    onSuccess: (ride) => {
      reset();
      if (router.canDismiss()) router.dismissAll();
      router.replace(`/passenger/trip/${ride.id}`);
    },
  });

  if (!quote || !pickup || !dropoff) return <Redirect href="/passenger" />;
  const expired = left <= 0;

  return (
    <Screen
      footer={
        expired ? (
          <Button title="Price expired — get a new price" variant="dark" onPress={() => goBack('/passenger/where-to')} />
        ) : needsCard ? (
          <Button title="Add a card" onPress={() => router.push('/passenger/payment?from=options')} loading={savedCard.isLoading} />
        ) : (
          <Button title={`Request ${quote.options.find((o) => o.ride_type === rideType)?.display_name ?? "ride"}`} onPress={() => request.mutate()} loading={request.isPending} disabled={!rideType} />
        )
      }
    >
      <Header title="Choose your ride" subtitle={`${formatDistance(quote.distance_m, market?.distance_unit)} · about ${formatDuration(quote.duration_s)}`} back />
      <Card>
        <Row label="From" value={pickup.address} />
        {pickupNote ? <Row label="Note" value={pickupNote} /> : null}
        <Row label="To" value={dropoff.address} />
      </Card>

      {quote.options.map((o) => {
        const selected = o.ride_type === rideType;
        return (
          <Pressable
            key={o.ride_type}
            onPress={() => setRideType(o.ride_type)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            style={[styles.option, selected && styles.optionSelected]}
          >
            <RideTypeIcon type={o} color={selected ? colors.brand : colors.text} />
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Text style={[styles.optTitle, selected && { color: colors.white }]}>{o.display_name}</Text>
                {o.is_electric ? <Text style={styles.electric}>⚡ Electric</Text> : null}
              </View>
              <Text style={[styles.optSub, selected && { color: colors.ivory }]}>
                {o.description} · {o.seats === 1 ? '1 passenger' : `${o.seats} seats`}
              </Text>
            </View>
            <Text style={[styles.price, selected && { color: colors.brand }]}>{formatMoney(o.fare, o.currency, market?.currency_decimals)}</Text>
          </Pressable>
        );
      })}

      {quote.options.find((o) => o.ride_type === rideType)?.vehicle_kind === 'motorcycle' ? (
        <Notice text="Boda: one passenger, light luggage only. Your rider will give you a helmet — please wear it." />
      ) : null}

      <SectionTitle>Payment</SectionTitle>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        {methods.map((m) => (
          <Pressable
            key={m}
            onPress={() => setPicked(m)}
            accessibilityRole="radio"
            accessibilityState={{ checked: method === m }}
            style={[styles.pay, method === m && styles.paySelected]}
          >
            <Ionicons name={METHOD_LABEL[m].icon} size={22} color={colors.text} />
            <Text style={styles.payText}>{METHOD_LABEL[m].label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[type.small, { marginTop: space.sm }]}>
        {method === 'card' && savedCard.data
          ? `Your ${cardLabel(savedCard.data.brand, savedCard.data.last4)} is charged automatically at the end of the trip.`
          : METHOD_LABEL[method].hint}
      </Text>

      <View style={{ height: space.lg }} />
      {!expired ? <Notice text={`This price is held for ${formatCountdown(left)}.`} /> : null}
      <ErrorMessage error={request.error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  electric: { fontFamily: fonts.bold, fontSize: 11, color: colors.success, backgroundColor: colors.successBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, marginBottom: space.sm,
  },
  optionSelected: { backgroundColor: colors.black, borderColor: colors.black },
  optTitle: { fontFamily: fonts.semibold, fontSize: 17, color: colors.text },
  optSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.secondary, marginTop: 2 },
  price: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  pay: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
  },
  paySelected: { borderColor: colors.brand, borderWidth: 2, backgroundColor: colors.brandBg },
  payText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
});
