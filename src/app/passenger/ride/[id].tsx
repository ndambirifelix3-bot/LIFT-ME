import { router, useLocalSearchParams } from 'expo-router';
import { Button, ErrorMessage, Header, Loading, Screen } from '@/components';
import { PassengerPayment, RatePanel, Receipt } from '@/features/rides/components';
import { useRideDetails, useRideRealtime } from '@/features/rides/hooks';

export default function PassengerRideDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const details = useRideDetails(id);
  useRideRealtime(id, null);

  return (
    <Screen onRefresh={() => details.refetch()} refreshing={details.isRefetching}>
      <Header title="Trip details" back />
      {details.isLoading ? <Loading /> : null}
      <ErrorMessage error={details.error} onRetry={() => details.refetch()} />
      {details.data ? (
        <>
          {details.data.ride.status === 'completed' ? <PassengerPayment details={details.data} /> : null}
          <Receipt details={details.data} />
          <RatePanel details={details.data} who="driver" />
          <Button title="Report a problem with this trip" variant="outline" onPress={() => router.push({ pathname: '/passenger/help', params: { rideId: id } })} />
        </>
      ) : null}
    </Screen>
  );
}
