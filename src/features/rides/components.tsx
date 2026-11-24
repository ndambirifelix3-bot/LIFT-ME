import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Linking, StyleSheet, Text, View } from 'react-native';
import { Button, Card, ErrorMessage, Input, Notice, Pill, Row, Stars, toneForStatus } from '@/components';
import { formatDateTime, formatDistance, formatDuration, formatMoney, RIDE_STATUS_LABEL } from '@/lib/format';
import { methodLabel, paymentLabel } from '@/features/payments/cards';
import { callFunction, supabase } from '@/lib/supabase';
import { colors, fonts, radius, space, type } from '@/theme';
import { useSignedPhoto } from './hooks';
import type { RideDetails } from './types';
import { useRideTypeName } from './rideTypes';

export function DriverCard({ details }: { details: RideDetails }) {
  const d = details.driver;
  const photo = useSignedPhoto(d?.photo_path);
  if (!d) return null;
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        {photo.data ? (
          <Image source={{ uri: photo.data }} style={styles.avatar} accessibilityLabel={`Photo of ${d.full_name}`} />
        ) : (
          <View style={[styles.avatar, styles.avatarEmpty]}><Ionicons name="person" size={26} color={colors.secondary} /></View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={type.h3}>{d.full_name}</Text>
          <Text style={type.small}>{d.rating ? `★ ${d.rating}` : 'New driver'}</Text>
        </View>
        {d.phone ? (
          <Button title="Call" small variant="outline" onPress={() => Linking.openURL(`tel:${d.phone}`)} />
        ) : null}
      </View>
      {d.vehicle ? (
        <View style={styles.plateRow}>
          <Text style={type.body}>{d.vehicle.colour} {d.vehicle.make} {d.vehicle.model}</Text>
          <View style={styles.plate}><Text style={styles.plateText}>{d.vehicle.plate}</Text></View>
        </View>
      ) : null}
    </Card>
  );
}

export function Receipt({ details }: { details: RideDetails }) {
  const r = details.ride;
  const p = details.payment;
  const rideTypeName = useRideTypeName(r.ride_type);
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.sm }}>
        <Text style={type.h3}>Receipt</Text>
        <Pill text={RIDE_STATUS_LABEL[r.status] ?? r.status} tone={toneForStatus(r.status)} />
      </View>
      <Row label="Date" value={formatDateTime(r.completed_at ?? r.requested_at)} />
      <Row label="From" value={r.pickup_address} />
      <Row label="To" value={r.dropoff_address} />
      <Row label="Distance" value={`${formatDistance(r.distance_m, details.market?.distance_unit)} · ${formatDuration(r.duration_s)}`} />
      <Row label="Ride type" value={rideTypeName} />
      {details.driver ? <Row label="Driver" value={details.driver.full_name} /> : null}
      <View style={styles.divider} />
      <Row label="Total" value={formatMoney(r.fare, r.currency, details.market?.currency_decimals)} bold />
      <Row label="Payment" value={p ? `${paymentLabel(p)} · ${p.status}` : methodLabel(r.payment_method)} />
      {p?.method === 'mpesa' && p.mpesa_receipt ? <Row label="M-Pesa receipt" value={p.mpesa_receipt} /> : null}
    </Card>
  );
}

/** Plain-English reason for a failed M-Pesa payment (Daraja result codes). */
export function mpesaFailureReason(code: string | null | undefined, desc: string | null | undefined): string {
  switch (code) {
    case '1': return 'There isn\'t enough money in your M-Pesa account.';
    case '1032': return 'The M-Pesa prompt was cancelled.';
    case '1037': return 'Your phone couldn\'t be reached. Make sure it\'s on, unlocked and has signal, then try again.';
    case '2001': return 'The M-Pesa PIN was wrong.';
    case '1025':
    case '9999': return 'M-Pesa had a problem sending the prompt. Please try again.';
    default: return desc ? `M-Pesa said: ${desc}` : 'Please try again.';
  }
}

/** Passenger: pay with M-Pesa (STK push) or switch to cash. Success only ever comes from the server. */
export function PassengerPayment({ details }: { details: RideDetails }) {
  const qc = useQueryClient();
  const p = details.payment;
  const [phone, setPhone] = useState('');
  const refresh = () => qc.invalidateQueries({ queryKey: ['ride', details.ride.id] });

  const push = useMutation({
    mutationFn: () => callFunction<{ message: string }>('mpesa-stk-push', { ride_id: details.ride.id, phone: phone || undefined }),
    onSettled: refresh,
  });
  const toCash = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('change_payment_method', { p_ride_id: details.ride.id, p_method: 'cash' });
      if (error) throw error;
    },
    onSettled: refresh,
  });

  if (!p) return null;
  const cashAllowed = details.market?.payment_methods?.includes('cash') ?? true;
  if (p.status === 'paid') return <Notice tone="success" text={`Paid ${formatMoney(p.amount, p.currency)} · ${paymentLabel(p)}. Thank you!`} />;
  if (p.method === 'cash') return <Notice text={`Please pay your driver ${formatMoney(p.amount, p.currency)} in cash.`} />;
  if (p.method === 'card') return <CardPayment details={details} cashAllowed={cashAllowed} onCash={() => toCash.mutate()} cashPending={toCash.isPending} cashError={toCash.error} />;

  return (
    <Card>
      <Text style={type.h3}>Pay {formatMoney(p.amount, p.currency)} with M-Pesa</Text>
      {p.status === 'failed' ? <Notice tone="error" text={`Payment did not go through. ${mpesaFailureReason(p.result_code, p.result_desc)}`} /> : null}
      {push.isSuccess && p.status === 'pending' ? (
        <Notice text="Check your phone and enter your M-Pesa PIN. This screen updates when M-Pesa confirms." />
      ) : null}
      <Input
        label="M-Pesa number (leave empty to use your account number)"
        placeholder="07XX XXX XXX"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      <ErrorMessage error={push.error ?? toCash.error} />
      <Button title={push.isSuccess ? 'Send the prompt again' : 'Pay with M-Pesa'} onPress={() => push.mutate()} loading={push.isPending} />
      {cashAllowed ? (
        <Button title="I'll pay cash instead" variant="ghost" onPress={() => toCash.mutate()} loading={toCash.isPending} style={{ marginTop: space.sm }} />
      ) : null}
    </Card>
  );
}

/** Card trips: the saved card is charged automatically when the trip ends. If it fails: try again, change card, or pay cash. */
function CardPayment({ details, cashAllowed, onCash, cashPending, cashError }: {
  details: RideDetails; cashAllowed: boolean; onCash: () => void; cashPending: boolean; cashError: unknown;
}) {
  const qc = useQueryClient();
  const p = details.payment!;
  const retry = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('change_payment_method', { p_ride_id: details.ride.id, p_method: 'card' });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['ride', details.ride.id] }),
  });
  if (p.status === 'pending') {
    return <Notice text={`Charging ${formatMoney(p.amount, p.currency)} to your card… This updates in a moment.`} />;
  }
  return (
    <Card>
      <Text style={type.h3}>Card payment of {formatMoney(p.amount, p.currency)} did not go through</Text>
      <Notice tone="error" text={p.result_desc || 'Your card was declined.'} />
      <ErrorMessage error={retry.error ?? cashError} />
      <Button title="Try again" onPress={() => retry.mutate()} loading={retry.isPending} />
      <Button title="Use a different card" variant="outline" onPress={() => router.push('/passenger/payment')} style={{ marginTop: space.sm }} />
      {cashAllowed ? (
        <Button title="I'll pay cash instead" variant="ghost" onPress={onCash} loading={cashPending} style={{ marginTop: space.sm }} />
      ) : null}
    </Card>
  );
}

export function RatePanel({ details, who }: { details: RideDetails; who: 'driver' | 'passenger' }) {
  const qc = useQueryClient();
  const [stars, setStars] = useState(details.my_rating?.stars ?? 0);
  const [comment, setComment] = useState(details.my_rating?.comment ?? '');
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('rate_ride', { p_ride_id: details.ride.id, p_stars: stars, p_comment: comment || undefined });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ride', details.ride.id] }),
  });
  if (details.ride.status !== 'completed') return null;
  return (
    <Card>
      <Text style={[type.h3, { marginBottom: space.md }]}>{details.my_rating ? 'Your rating' : `Rate your ${who}`}</Text>
      <Stars value={stars} onChange={setStars} />
      <View style={{ height: space.md }} />
      <Input placeholder="Add a comment (optional)" value={comment} onChangeText={setComment} maxLength={500} multiline />
      <ErrorMessage error={save.error} />
      {save.isSuccess ? <Notice tone="success" text="Thanks for your rating!" /> : null}
      <Button title={details.my_rating ? 'Update rating' : 'Submit rating'} variant="dark" disabled={!stars} loading={save.isPending} onPress={() => save.mutate()} />
    </Card>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarEmpty: { backgroundColor: colors.ivory, alignItems: 'center', justifyContent: 'center' },
  plateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.md },
  plate: { backgroundColor: colors.brand, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4 },
  plateText: { fontFamily: fonts.bold, fontSize: 15, color: colors.black, letterSpacing: 1 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: space.sm },
});
