import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, ErrorMessage, Header, Notice, Row, Screen, SectionTitle } from '@/components';
import { useBooking } from '@/features/booking/store';
import type { Ride } from '@/features/rides/types';
import { formatCountdown, formatDistance, formatDuration, formatMoney, secondsUntil } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius, space, type } from '@/theme';

type Method = 'cash' | 'mpesa';

export default function RideOptions() {
  const { quote, pickup, dropoff, pickupNote, reset } = useBooking();
  const [rideType, setRideType] = useState<string | null>(quote?.options[0]?.ride_type ?? null);
  const [method, setMethod] = useState<Method>('mpesa');
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
          <Button title="Price expired — get a new price" variant="dark" onPress={() => router.back()} />
        ) : (
          <Button title="Request Lift" onPress={() => request.mutate()} loading={request.isPending} disabled={!rideType} />
        )
      }
    >
      <Header title="Choose your ride" subtitle={`${formatDistance(quote.distance_m)} · about ${formatDuration(quote.duration_s)}`} back />
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
            <Ionicons name={o.ride_type.includes('premium') ? 'car-sport' : 'car'} size={30} color={selected ? colors.brand : colors.text} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.optTitle, selected && { color: colors.white }]}>{o.display_name}</Text>
              <Text style={[styles.optSub, selected && { color: colors.ivory }]}>{o.description} · {o.seats} seats</Text>
            </View>
            <Text style={[styles.price, selected && { color: colors.brand }]}>{formatMoney(o.fare, o.currency)}</Text>
          </Pressable>
        );
      })}

      <SectionTitle>Payment</SectionTitle>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        {(['mpesa', 'cash'] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMethod(m)}
            accessibilityRole="radio"
            accessibilityState={{ checked: method === m }}
            style={[styles.pay, method === m && styles.paySelected]}
          >
            <Ionicons name={m === 'cash' ? 'cash-outline' : 'phone-portrait-outline'} size={22} color={colors.text} />
            <Text style={styles.payText}>{m === 'cash' ? 'Cash' : 'M-Pesa'}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[type.small, { marginTop: space.sm }]}>
        {method === 'mpesa' ? 'You will get an M-Pesa prompt on your phone at the end of the trip.' : 'Pay your driver in cash at the end of the trip.'}
      </Text>

      <View style={{ height: space.lg }} />
      {!expired ? <Notice text={`This price is held for ${formatCountdown(left)}.`} /> : null}
      <ErrorMessage error={request.error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
