import { router } from 'expo-router';
import { EmptyState, ErrorMessage, Header, ListItem, Loading, Pill, Screen, toneForStatus } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { useRideHistory } from '@/features/rides/hooks';
import { formatDateTime, formatMoney, RIDE_STATUS_LABEL } from '@/lib/format';

export default function PassengerRides() {
  const { session } = useAuth();
  const rides = useRideHistory(session?.user.id, 'passenger');

  return (
    <Screen onRefresh={() => rides.refetch()} refreshing={rides.isRefetching}>
      <Header title="Your rides" />
      {rides.isLoading ? <Loading /> : null}
      <ErrorMessage error={rides.error} onRetry={() => rides.refetch()} />
      {rides.data?.length === 0 ? <EmptyState icon="time-outline" title="No rides yet" message="Your trips and receipts will appear here." /> : null}
      {rides.data?.map((r) => (
        <ListItem
          key={r.id}
          title={r.dropoff_address}
          subtitle={`${formatDateTime(r.requested_at)} · ${formatMoney(r.fare, r.currency)}`}
          right={<Pill text={RIDE_STATUS_LABEL[r.status]} tone={toneForStatus(r.status)} />}
          onPress={() =>
            router.push(['searching', 'accepted', 'arrived', 'in_progress'].includes(r.status) ? `/passenger/trip/${r.id}` : `/passenger/ride/${r.id}`)
          }
        />
      ))}
    </Screen>
  );
}
