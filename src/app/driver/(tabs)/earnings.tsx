import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Card, EmptyState, ErrorMessage, Header, ListItem, Loading, Pill, Screen, SectionTitle, toneForStatus } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { useEarnings } from '@/features/driver/hooks';
import { useRideHistory } from '@/features/rides/hooks';
import { formatDateTime, formatMoney, RIDE_STATUS_LABEL } from '@/lib/format';
import { colors, fonts, space, type } from '@/theme';

export default function DriverEarnings() {
  const { session } = useAuth();
  const earnings = useEarnings();
  const trips = useRideHistory(session?.user.id, 'driver');
  const e = earnings.data;

  return (
    <Screen onRefresh={() => { earnings.refetch(); trips.refetch(); }} refreshing={earnings.isRefetching}>
      <Header title="Earnings" subtitle="Your share after Lift Me commission" />
      {earnings.isLoading ? <Loading /> : null}
      <ErrorMessage error={earnings.error} onRetry={() => earnings.refetch()} />
      {e ? (
        <>
          <Card style={{ backgroundColor: colors.black, borderColor: colors.black }}>
            <Text style={[type.label, { color: colors.ivory }]}>Today</Text>
            <Text style={styles.big}>{formatMoney(e.today, e.currency, e.currency_decimals)}</Text>
            <Text style={[type.small, { color: colors.ivory }]}>{e.today_trips} trips</Text>
          </Card>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Card style={{ flex: 1 }}>
              <Text style={type.label}>This week</Text>
              <Text style={styles.mid}>{formatMoney(e.week, e.currency, e.currency_decimals)}</Text>
              <Text style={type.small}>{e.week_trips} trips</Text>
            </Card>
            <Card style={{ flex: 1 }}>
              <Text style={type.label}>All time</Text>
              <Text style={styles.mid}>{formatMoney(e.total, e.currency, e.currency_decimals)}</Text>
              <Text style={type.small}>{e.total_trips} trips · {e.rating ? `★ ${e.rating}` : 'No ratings yet'}</Text>
            </Card>
          </View>
        </>
      ) : null}
      <SectionTitle>Trip history</SectionTitle>
      {trips.data?.length === 0 ? <EmptyState icon="car-outline" title="No trips yet" /> : null}
      {trips.data?.map((r) => (
        <ListItem
          key={r.id}
          title={r.dropoff_address}
          subtitle={`${formatDateTime(r.requested_at)} · ${r.driver_earnings != null ? `You earned ${formatMoney(r.driver_earnings, r.currency)}` : formatMoney(r.fare, r.currency)}`}
          right={<Pill text={RIDE_STATUS_LABEL[r.status]} tone={toneForStatus(r.status)} />}
          onPress={() => (['accepted', 'arrived', 'in_progress'].includes(r.status) ? router.push('/driver') : router.push(`/driver/ride/${r.id}`))}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  big: { fontFamily: fonts.bold, fontSize: 34, color: colors.brand, marginVertical: 4 },
  mid: { fontFamily: fonts.bold, fontSize: 20, color: colors.text, marginVertical: 4 },
});
