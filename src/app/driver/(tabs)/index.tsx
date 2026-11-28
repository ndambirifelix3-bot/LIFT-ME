import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, Switch, Text, View } from 'react-native';
import { Button, Card, EmptyState, ErrorMessage, Header, Loading, Notice, Pill, Row, Screen, toneForStatus } from '@/components';
import { Map } from '@/components/Map';
import { useAuth } from '@/features/auth/AuthProvider';
import { useMyDriver, useOffers } from '@/features/driver/hooks';
import { useWallet } from '@/features/driver/wallet';
import { BalanceDueCard, LaunchOfferNotice } from '@/features/driver/WalletCard';
import { startDriverTracking, stopDriverTracking, type TrackingMode } from '@/features/driver/tracking';
import { useActiveRide, useRideAction, useRideDetails, useRideRealtime } from '@/features/rides/hooks';
import { fallbackName, RideTypeIcon, useRideTypes } from '@/features/rides/rideTypes';
import type { Ride } from '@/features/rides/types';
import { useMarkets } from '@/features/markets';
import { NotificationsCard } from '@/features/pwa/NotificationsCard';
import { useSettings } from '@/features/settings';
import { formatCountdown, formatDistance, formatDuration, formatMoney, RIDE_STATUS_LABEL, secondsUntil } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { colors, fonts, space, switchColors, type } from '@/theme';
import { methodLabel } from '@/features/payments/cards';
import { noShowSecondsLeft } from '@/features/rides/fees';

function navigate(lat: number, lng: number) {
  // Opens Google Maps turn-by-turn (app if installed, otherwise browser).
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`);
}

function ask(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'No', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Yes', onPress: () => resolve(true) },
    ]),
  );
}

export default function DriverHome() {
  const { session, profile } = useAuth();
  const uid = session?.user.id;
  const me = useMyDriver(uid);
  const settings = useSettings();
  const driver = me.data?.driver;
  const approved = driver?.status === 'approved';
  const active = useActiveRide(uid, 'driver');
  const wallet = useWallet(approved);

  if (me.isLoading || active.isLoading) return <Loading />;
  if (me.error) return <Screen><ErrorMessage error={me.error} onRetry={() => me.refetch()} /></Screen>;

  return (
    <Screen onRefresh={() => { me.refetch(); active.refetch(); wallet.refetch(); }} refreshing={me.isRefetching}>
      <Header title={`Hi ${profile?.full_name.split(' ')[0] ?? ''}`} subtitle="Lift Me Driver" />
      {!approved ? <ApplicationStatus status={driver?.status} submitted={!!driver?.submitted_at} reason={driver?.reject_reason} /> : null}
      {approved && driver ? (
        <>
          {wallet.data ? <BalanceDueCard wallet={wallet.data} /> : null}
          {wallet.data ? <LaunchOfferNotice wallet={wallet.data} /> : null}
          <OnlineSwitch online={driver.is_online} intervalSeconds={settings.data?.location_interval_seconds ?? 5} hasActiveRide={!!active.data} />
          <NotificationsCard role="driver" compact />
          {active.data ? <ActiveRide ride={active.data} /> : driver.is_online ? <Offers uid={uid!} /> : (
            <EmptyState icon="moon-outline" title="You're offline" message="Go online to start receiving ride requests near you." />
          )}
        </>
      ) : null}
    </Screen>
  );
}

function ApplicationStatus({ status, submitted, reason }: { status?: string; submitted: boolean; reason?: string | null }) {
  const view =
    status === 'rejected'
      ? { title: 'Application not approved', text: reason ? `Reason: ${reason}` : 'Please update your details and submit again.', tone: 'bad' as const, pill: 'Rejected' }
      : status === 'suspended'
        ? { title: 'Account suspended', text: reason ?? 'Please contact Lift Me support.', tone: 'bad' as const, pill: 'Suspended' }
        : submitted
          ? { title: 'Application under review', text: 'We are checking your documents. This usually takes 1–2 working days.', tone: 'wait' as const, pill: 'Pending' }
          : { title: 'Finish your application', text: 'Add your details, photo, documents and vehicle to start driving.', tone: 'neutral' as const, pill: 'Incomplete' };
  return (
    <Card>
      <Pill text={view.pill} tone={view.tone} />
      <Text style={[type.h2, { marginTop: space.sm }]}>{view.title}</Text>
      <Text style={[type.body, { color: colors.secondary, marginVertical: space.sm }]}>{view.text}</Text>
      {status !== 'suspended' ? (
        <Button title={submitted && status === 'pending' ? 'View my application' : 'Continue application'} onPress={() => router.push('/driver/onboarding')} />
      ) : null}
    </Card>
  );
}

function OnlineSwitch({ online, intervalSeconds, hasActiveRide }: { online: boolean; intervalSeconds: number; hasActiveRide: boolean }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<TrackingMode | null>(null);
  const toggle = useMutation({
    mutationFn: async (next: boolean) => {
      if (next) {
        const { error } = await supabase.rpc('set_driver_online', { p_online: true });
        if (error) throw error;
        try {
          setMode(await startDriverTracking(intervalSeconds));
        } catch (e) {
          await supabase.rpc('set_driver_online', { p_online: false });
          throw e;
        }
      } else {
        await stopDriverTracking();
        setMode(null);
        const { error } = await supabase.rpc('set_driver_online', { p_online: false });
        if (error) throw error;
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['my-driver'] }),
  });

  // App reopened while online → resume sharing location.
  useEffect(() => {
    if (online && !mode) startDriverTracking(intervalSeconds).then(setMode).catch(() => setMode(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  return (
    <Card style={[styles.online, online && { backgroundColor: colors.black, borderColor: colors.black }]}>
      <View style={{ flex: 1 }}>
        <Text style={[type.h2, online && { color: colors.white }]}>{online ? "You're online" : "You're offline"}</Text>
        <Text style={[type.small, online && { color: colors.ivory }]}>
          {online
            ? mode === 'foreground'
              ? Platform.OS === 'web'
                ? 'Keep Lift Me open on screen and your phone plugged in. To stop, switch Offline. If Lift Me is closed for about 2 minutes, you are set offline.'
                : 'Keep Lift Me open to receive requests.'
              : 'Receiving requests nearby.'
            : 'Go online to receive requests.'}
        </Text>
        <ErrorMessage error={toggle.error} />
      </View>
      <Switch
        value={online}
        disabled={toggle.isPending || (online && hasActiveRide)}
        onValueChange={async (v) => {
          // "Prominent disclosure" required by Google Play / Apple before background location.
          if (v && Platform.OS !== 'web') {
            const ok = await ask(
              'Location while you are online',
              'Lift Me collects your location to match you with nearby passengers and show your car on their map, even when the app is closed or not in use, while you are online or on a trip. It stops when you go offline.',
            );
            if (!ok) return;
          }
          toggle.mutate(v);
        }}
        {...switchColors}
        accessibilityLabel={online ? 'Go offline' : 'Go online'}
      />
    </Card>
  );
}

function Offers({ uid }: { uid: string }) {
  const rideTypes = useRideTypes();
  const offers = useOffers(uid, true);
  const markets = useMarkets().data;
  const unitFor = (code: string) => markets?.find((m) => m.code === code)?.distance_unit;
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const accept = useRideAction((rideId: string) => supabase.rpc('accept_ride', { p_ride_id: rideId }));
  const decline = useRideAction((rideId: string) => supabase.rpc('decline_ride', { p_ride_id: rideId }));

  const list = (offers.data ?? []).filter((o) => secondsUntil(o.expires_at) > 0);
  if (!list.length) {
    return (
      <>
        <ErrorMessage error={accept.error} />
        <EmptyState icon="radio-outline" title="Looking for requests…" message="New ride requests near you will appear here." />
      </>
    );
  }
  return (
    <>
      <ErrorMessage error={accept.error ?? decline.error} />
      {list.map((o) => {
        const r = o.ride as Ride;
        const t = rideTypes.data?.find((x) => x.ride_type === r.ride_type);
        return (
          <Card key={o.ride_id} style={{ borderColor: colors.brand, borderWidth: 2 }}>
            <View style={styles.offerHead}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <RideTypeIcon type={t ?? { ride_type: r.ride_type }} size={26} color={colors.text} />
                <Text style={type.h2}>{formatMoney(r.fare, r.currency)}</Text>
              </View>
              <Pill text={formatCountdown(secondsUntil(o.expires_at))} tone="wait" />
            </View>
            <Text style={type.small}>{t?.display_name ?? fallbackName(r.ride_type)} · {formatDistance(r.distance_m, unitFor(r.market_code))} · {formatDuration(r.duration_s)} · {methodLabel(r.payment_method)}</Text>
            <View style={{ marginVertical: space.md, gap: 6 }}>
              <Text style={type.body}><Text style={{ fontFamily: fonts.semibold }}>Pickup: </Text>{r.pickup_address}</Text>
              {r.pickup_note ? <Text style={type.small}>Note: {r.pickup_note}</Text> : null}
              <Text style={type.body}><Text style={{ fontFamily: fonts.semibold }}>To: </Text>{r.dropoff_address}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button title="Decline" variant="outline" style={{ flex: 1 }} onPress={() => decline.mutate(r.id)} disabled={accept.isPending} />
              <Button title="Accept" style={{ flex: 2 }} onPress={() => accept.mutate(r.id)} loading={accept.isPending && accept.variables === r.id} />
            </View>
          </Card>
        );
      })}
    </>
  );
}

function ActiveRide({ ride }: { ride: Ride }) {
  const details = useRideDetails(ride.id, { poll: 20_000 });
  useRideRealtime(ride.id, null);
  const arrived = useRideAction(() => supabase.rpc('driver_arrived', { p_ride_id: ride.id }));
  const start = useRideAction(() => supabase.rpc('start_trip', { p_ride_id: ride.id }));
  const complete = useRideAction(() => supabase.rpc('complete_trip', { p_ride_id: ride.id }));
  const cancel = useRideAction((reason: string) => supabase.rpc('cancel_ride', { p_ride_id: ride.id, p_reason: reason }));

  const r = details.data?.ride ?? ride;
  const passenger = details.data?.passenger;
  const toPickup = r.status === 'accepted' || r.status === 'arrived';
  const target = toPickup ? { lat: r.pickup_lat, lng: r.pickup_lng } : { lat: r.dropoff_lat, lng: r.dropoff_lng };
  const error = arrived.error ?? start.error ?? complete.error ?? cancel.error;

  return (
    <>
      <Card>
        <View style={styles.offerHead}>
          <Text style={type.h2}>{RIDE_STATUS_LABEL[r.status]}</Text>
          <Pill text={formatMoney(r.fare, r.currency)} tone={toneForStatus(r.status)} />
        </View>
        {passenger ? (
          <View style={styles.passenger}>
            <Ionicons name="person-circle-outline" size={36} color={colors.text} />
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>{passenger.full_name}</Text>
              <Text style={type.small}>{passenger.rating ? `★ ${passenger.rating}` : 'New passenger'}</Text>
            </View>
            {passenger.phone ? <Button small variant="outline" title="Call" onPress={() => Linking.openURL(`tel:${passenger.phone}`)} /> : null}
          </View>
        ) : null}
        <Row label="Pickup" value={r.pickup_address} />
        {r.pickup_note ? <Row label="Note" value={r.pickup_note} /> : null}
        <Row label="Drop-off" value={r.dropoff_address} />
        <Row label="Payment" value={methodLabel(r.payment_method)} />
      </Card>
      <View style={{ borderRadius: 16, overflow: 'hidden', marginBottom: space.md }}>
        <Map
          center={target}
          height={220}
          markers={[{ id: 't', kind: toPickup ? 'pickup' : 'dropoff', position: target, title: toPickup ? 'Pickup' : 'Drop-off' }]}
          polyline={toPickup ? undefined : r.polyline}
          showsUserLocation
          followKey={r.status}
        />
      </View>
      <ErrorMessage error={error} />
      <Button title={toPickup ? 'Navigate to pickup' : 'Navigate to drop-off'} variant="dark" onPress={() => navigate(target.lat, target.lng)} style={{ marginBottom: space.sm }} />
      {r.status === 'accepted' ? <Button title="I've arrived" onPress={() => arrived.mutate(undefined)} loading={arrived.isPending} /> : null}
      {r.status === 'arrived' ? <Button title="Start trip" onPress={() => start.mutate(undefined)} loading={start.isPending} /> : null}
      {r.status === 'arrived' ? <NoShowButton ride={r} market={details.data?.market ?? null} /> : null}
      {r.status === 'in_progress' ? (
        <Button
          title="Complete trip"
          loading={complete.isPending}
          onPress={async () => {
            if (await ask('Complete this trip?', 'Only complete when the passenger has reached their destination.')) {
              complete.mutate(undefined, { onSuccess: () => router.push(`/driver/ride/${ride.id}`) });
            }
          }}
        />
      ) : null}
      {toPickup ? (
        <Button
          title="Cancel ride"
          variant="ghost"
          style={{ marginTop: space.sm }}
          onPress={async () => {
            if (await ask('Cancel this ride?', 'Frequent cancellations affect your account.')) cancel.mutate('Cancelled by driver');
          }}
        />
      ) : null}
      {r.status === 'in_progress' ? <Notice text="Drive safely. Use Help in your Account tab if anything goes wrong." /> : null}
    </>
  );
}

/** After waiting at the pickup (5 minutes by default), the driver can end the ride; the passenger pays the cancellation fee. */
function NoShowButton({ ride, market }: { ride: Pick<Ride, 'id' | 'status' | 'accepted_at' | 'arrived_at' | 'currency'>; market: Parameters<typeof noShowSecondsLeft>[1] }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);
  const noShow = useRideAction(() => supabase.rpc('driver_report_no_show', { p_ride_id: ride.id }));
  const left = noShowSecondsLeft(ride, market);
  if (left > 0) {
    return <Text style={[type.small, { textAlign: 'center', marginTop: space.sm }]}>Passenger not here? You can end the ride in {Math.ceil(left / 60)} min.</Text>;
  }
  const fee = market?.cancellation_fee ? ` They will be charged ${formatMoney(market.cancellation_fee, ride.currency)}, and you get your share.` : '';
  return (
    <>
      <ErrorMessage error={noShow.error} />
      <Button
        title="Passenger didn't show up"
        variant="outline"
        loading={noShow.isPending}
        style={{ marginTop: space.sm }}
        onPress={async () => {
          if (await ask('End this ride?', `Only if you waited at the pickup and couldn't reach the passenger.${fee}`)) {
            noShow.mutate(undefined, { onSuccess: () => router.push(`/driver/ride/${ride.id}`) });
          }
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  online: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  offerHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.xs },
  passenger: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginVertical: space.md },
});
