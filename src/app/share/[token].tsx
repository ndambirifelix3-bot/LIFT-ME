import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { Card, EmptyState, Header, Loading, Pill, Row, Screen, toneForStatus } from '@/components';
import { Map } from '@/components/Map';
import { formatDateTime, RIDE_STATUS_LABEL } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { type } from '@/theme';

type Shared = {
  status: string; pickup_address: string; dropoff_address: string; driver_first_name: string;
  vehicle: { make: string; model: string; colour: string; plate: string } | null;
  driver_location: { lat: number; lng: number; updated_at: string } | null;
};

/** Public "follow my trip" page. Works without logging in; shows data only while the trip is active. */
export default function SharedTrip() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const q = useQuery({
    queryKey: ['shared', token],
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_shared_trip', { p_token: token! });
      if (error) throw error;
      return data as unknown as Shared | null;
    },
  });

  if (q.isLoading) return <Loading />;
  const t = q.data;
  return (
    <Screen>
      <Header title="Lift Me trip" subtitle="Move with confidence." />
      {!t ? (
        <EmptyState icon="checkmark-done-outline" title="This trip has ended" message="Live sharing stops when the trip is finished or cancelled." />
      ) : (
        <>
          <Pill text={RIDE_STATUS_LABEL[t.status] ?? t.status} tone={toneForStatus(t.status)} />
          <Card style={{ marginTop: 12 }}>
            <Row label="From" value={t.pickup_address} />
            <Row label="To" value={t.dropoff_address} />
            <Row label="Driver" value={t.driver_first_name} />
            {t.vehicle ? <Row label="Car" value={`${t.vehicle.colour} ${t.vehicle.make} ${t.vehicle.model} · ${t.vehicle.plate}`} /> : null}
          </Card>
          {t.driver_location ? (
            <>
              <Map center={t.driver_location} height={280} markers={[{ id: 'd', kind: 'driver', position: t.driver_location, title: 'Car' }]} followKey={t.driver_location.updated_at} />
              <Text style={[type.small, { marginTop: 8 }]}>Last update {formatDateTime(t.driver_location.updated_at)}</Text>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}
