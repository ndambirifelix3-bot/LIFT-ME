import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Share, StyleSheet, Text, View } from 'react-native';
import { Button, Card, EmptyState, ErrorMessage, Loading, Notice, Pill, Row, Screen, toneForStatus } from '@/components';
import { Map } from '@/components/Map';
import type { MapProps } from '@/components/Map.types';
import { DriverCard, PassengerPayment, RatePanel, Receipt } from '@/features/rides/components';
import { useRideAction, useRideDetails, useRideRealtime } from '@/features/rides/hooks';
import { NotificationsCard } from '@/features/pwa/NotificationsCard';
import { formatCountdown, formatMoney, RIDE_STATUS_LABEL, secondsUntil } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { colors, space, type } from '@/theme';
import { methodLabel } from '@/features/payments/cards';

function confirmAsync(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'No', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Yes', style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

export default function PassengerTrip() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Realtime pushes changes; polling every 15s is a safety net for weak connections.
  const details = useRideDetails(id, { poll: 15_000 });
  const ride = details.data?.ride;
  useRideRealtime(id, details.data?.driver?.id);
  const [left, setLeft] = useState(0);

  const cancel = useRideAction((reason: string) => supabase.rpc('cancel_ride', { p_ride_id: id!, p_reason: reason }));
  const expire = useRideAction(() => supabase.rpc('expire_searching_rides'));

  // Searching countdown; when it ends the SERVER decides if the search timed out.
  useEffect(() => {
    if (ride?.status !== 'searching') return;
    const tick = () => {
      const s = secondsUntil(ride.search_expires_at);
      setLeft(s);
      if (s === 0 && !expire.isPending) expire.mutate(undefined);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride?.status, ride?.search_expires_at]);

  if (details.isLoading) return <Loading label="Loading your ride…" />;
  if (details.error || !details.data || !ride) {
    return (
      <Screen>
        <ErrorMessage error={details.error ?? 'Ride not found'} onRetry={() => details.refetch()} />
        <Button title="Back to home" variant="outline" onPress={() => router.replace('/passenger')} />
      </Screen>
    );
  }

  const d = details.data;
  const driverLoc = d.driver?.location;
  const markers: NonNullable<MapProps['markers']> = [
    { id: 'pickup', kind: 'pickup', position: { lat: ride.pickup_lat, lng: ride.pickup_lng }, title: 'Pickup' },
    { id: 'dropoff', kind: 'dropoff', position: { lat: ride.dropoff_lat, lng: ride.dropoff_lng }, title: 'Destination' },
  ];
  if (driverLoc) markers.push({ id: 'driver', kind: 'driver', position: { lat: driverLoc.lat, lng: driverLoc.lng }, title: 'Your driver' });
  const center = driverLoc ?? { lat: ride.pickup_lat, lng: ride.pickup_lng };

  const doCancel = async () => {
    const msg = ride.status === 'searching' ? 'Stop looking for a driver?' : 'Your driver is already on the way.';
    if (await confirmAsync('Cancel this ride?', msg)) cancel.mutate('Cancelled by passenger');
  };

  const shareTrip = async () => {
    // On the website, the site's own address is always right; the phone apps need EXPO_PUBLIC_WEB_URL.
    const base = Platform.OS === 'web' ? window.location.origin : (process.env.EXPO_PUBLIC_WEB_URL ?? '');
    const url = `${base}/share/${ride.share_token}`;
    const message = `I'm on a Lift Me ride${d.driver?.vehicle ? ` in a ${d.driver.vehicle.colour} ${d.driver.vehicle.make} ${d.driver.vehicle.plate}` : ''}. Follow my trip: ${url}`;
    if (Platform.OS === 'web') {
      // Phone browsers: open the normal Share sheet (WhatsApp, SMS…). Otherwise copy the link.
      if (navigator.share) {
        await navigator.share({ text: message }).catch(() => undefined); // closing the sheet is not an error
        return;
      }
      await navigator.clipboard?.writeText(message);
      window.alert('Trip link copied.');
    } else {
      await Share.share({ message });
    }
  };

  const status = ride.status;
  const headline: Record<string, string> = {
    searching: 'Finding your driver…',
    accepted: 'Your driver is on the way',
    arrived: 'Your driver has arrived',
    in_progress: `Heading to ${ride.dropoff_address.split(',')[0]}`,
    completed: 'You have arrived',
    cancelled: 'Ride cancelled',
    no_driver_found: 'No driver found',
  };

  return (
    <Screen onRefresh={() => details.refetch()} refreshing={details.isRefetching}>
      <View style={styles.head}>
        <Text style={type.title}>{headline[status]}</Text>
        <Pill text={RIDE_STATUS_LABEL[status]} tone={toneForStatus(status)} />
      </View>

      {['accepted', 'arrived', 'in_progress', 'searching'].includes(status) ? (
        <View style={styles.map}>
          <Map center={center} markers={markers} polyline={status === 'in_progress' || status === 'searching' ? ride.polyline : undefined} height={280} followKey={`${status}-${driverLoc?.updated_at ?? ''}`} />
        </View>
      ) : null}

      {['searching', 'accepted', 'arrived'].includes(status) ? <NotificationsCard role="passenger" compact /> : null}

      {status === 'searching' ? (
        <Card>
          <Text style={type.body}>We are asking drivers near you. This can take up to {formatCountdown(left)}.</Text>
          <Row label="Fare" value={formatMoney(ride.fare, ride.currency)} />
          <Button title="Cancel request" variant="danger" onPress={doCancel} loading={cancel.isPending} style={{ marginTop: space.md }} />
        </Card>
      ) : null}

      {['accepted', 'arrived', 'in_progress'].includes(status) ? (
        <>
          {status === 'arrived' ? <Notice text="Meet your driver at the pickup point. Check the number plate before you get in." /> : null}
          <DriverCard details={d} />
          <Card>
            <Row label="Pickup" value={ride.pickup_address} />
            {ride.pickup_note ? <Row label="Note" value={ride.pickup_note} /> : null}
            <Row label="Destination" value={ride.dropoff_address} />
            <Row label="Fare" value={`${formatMoney(ride.fare, ride.currency)} · ${methodLabel(ride.payment_method)}`} />
          </Card>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button title="Share trip" variant="outline" onPress={shareTrip} style={{ flex: 1 }} />
            <Button title="Help / SOS" variant="danger" onPress={() => router.push({ pathname: '/passenger/help', params: { rideId: ride.id } })} style={{ flex: 1 }} />
          </View>
          {status !== 'in_progress' ? (
            <Button title="Cancel ride" variant="ghost" onPress={doCancel} loading={cancel.isPending} style={{ marginTop: space.sm }} />
          ) : null}
        </>
      ) : null}

      {status === 'completed' ? (
        <>
          <PassengerPayment details={d} />
          <Receipt details={d} />
          <RatePanel details={d} who="driver" />
          <Button title="Done" variant="dark" onPress={() => router.replace('/passenger')} />
        </>
      ) : null}

      {status === 'cancelled' || status === 'no_driver_found' ? (
        <EmptyState
          icon={status === 'cancelled' ? 'close-circle-outline' : 'sad-outline'}
          title={status === 'cancelled' ? `Cancelled${ride.cancelled_by && ride.cancelled_by !== 'passenger' ? ` by the ${ride.cancelled_by}` : ''}` : 'No drivers were available'}
          message={status === 'no_driver_found' ? 'All nearby drivers are busy right now. Please try again in a few minutes.' : ride.cancel_reason ?? undefined}
          action="Back to home"
          onAction={() => router.replace('/passenger')}
        />
      ) : null}

      <ErrorMessage error={cancel.error} />
      {status === 'searching' ? (
        <View style={styles.searching}>
          <Ionicons name="radio-outline" size={18} color={colors.secondary} />
          <Text style={type.small}>Keep the app open. You will see your driver here as soon as they accept.</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: space.sm, marginVertical: space.md },
  map: { borderRadius: 16, overflow: 'hidden', marginBottom: space.md },
  searching: { flexDirection: 'row', gap: space.sm, alignItems: 'center', marginTop: space.md },
});
