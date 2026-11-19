import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Image, Linking, StyleSheet, Text, View } from 'react-native';
import { Button, Card, ErrorMessage, Input, Notice, Pill, Row, Stars, toneForStatus } from '@/components';
import { formatDateTime, formatDistance, formatDuration, formatMoney, RIDE_STATUS_LABEL } from '@/lib/format';
import { callFunction, supabase } from '@/lib/supabase';
import { colors, fonts, radius, space, type } from '@/theme';
import { useSignedPhoto } from './hooks';
import type { RideDetails } from './types';

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
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.sm }}>
        <Text style={type.h3}>Receipt</Text>
        <Pill text={RIDE_STATUS_LABEL[r.status] ?? r.status} tone={toneForStatus(r.status)} />
      </View>
      <Row label="Date" value={formatDateTime(r.completed_at ?? r.requested_at)} />
      <Row label="From" value={r.pickup_address} />
      <Row label="To" value={r.dropoff_address} />
      <Row label="Distance" value={`${formatDistance(r.distance_m)} · ${formatDuration(r.duration_s)}`} />
      <Row label="Ride type" value={r.ride_type === 'lift_premium' ? 'Lift Premium' : 'Lift'} />
      {details.driver ? <Row label="Driver" value={details.driver.full_name} /> : null}
      <View style={styles.divider} />
      <Row label="Total" value={formatMoney(r.fare, r.currency)} bold />
      <Row label="Payment" value={p ? `${p.method === 'mpesa' ? 'M-Pesa' : 'Cash'} · ${p.status}` : r.payment_method === 'mpesa' ? 'M-Pesa' : 'Cash'} />
      {p?.mpesa_receipt ? <Row label="M-Pesa receipt" value={p.mpesa_receipt} /> : null}
    </Card>
  );
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
  if (p.status === 'paid') return <Notice tone="success" text={`Paid ${formatMoney(p.amount, p.currency)}${p.mpesa_receipt ? ` · ${p.mpesa_receipt}` : ''}. Thank you!`} />;
  if (p.method === 'cash') return <Notice text={`Please pay your driver ${formatMoney(p.amount, p.currency)} in cash.`} />;

  return (
    <Card>
      <Text style={type.h3}>Pay {formatMoney(p.amount, p.currency)} with M-Pesa</Text>
      {p.status === 'failed' ? <Notice tone="error" text={`Payment did not go through${p.result_desc ? `: ${p.result_desc}` : ''}. You can try again.`} /> : null}
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
      <Button title="I'll pay cash instead" variant="ghost" onPress={() => toCash.mutate()} loading={toCash.isPending} style={{ marginTop: space.sm }} />
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
