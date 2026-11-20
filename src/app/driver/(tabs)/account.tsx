import { router } from 'expo-router';
import { Card, Header, ListItem, Loading, Pill, Row, Screen, SectionTitle, toneForStatus } from '@/components';
import { AccountBasics } from '@/features/auth/AccountActions';
import { useAuth } from '@/features/auth/AuthProvider';
import { useMyDriver } from '@/features/driver/hooks';
import { useRideTypeName } from '@/features/rides/rideTypes';

export default function DriverAccount() {
  const { session } = useAuth();
  const me = useMyDriver(session?.user.id);
  const d = me.data;
  const category = useRideTypeName(d?.vehicle?.ride_type);

  return (
    <Screen onRefresh={() => me.refetch()} refreshing={me.isRefetching}>
      <Header title="Account" />
      <AccountBasics />
      {me.isLoading ? <Loading /> : null}
      {d ? (
        <>
          <SectionTitle>Driver status</SectionTitle>
          <Card>
            <Row label="Application" value={<Pill text={d.driver?.submitted_at || d.driver?.status !== 'pending' ? d.driver?.status ?? '—' : 'incomplete'} tone={toneForStatus(d.driver?.status ?? '')} />} />
            {d.vehicle ? (
              <>
                <Row label="Vehicle" value={`${d.vehicle.colour} ${d.vehicle.make} ${d.vehicle.model} (${d.vehicle.year})`} />
                <Row label="Plate" value={d.vehicle.plate} />
                <Row label="Category" value={category} />
              </>
            ) : (
              <Row label="Vehicle" value="Not added" />
            )}
          </Card>
          <SectionTitle>Documents</SectionTitle>
          <Card>
            {d.documentTypes.map((t) => {
              const has = d.documents.some((x) => x.doc_type === t.code);
              return <Row key={t.code} label={t.name} value={<Pill text={has ? 'Uploaded' : 'Missing'} tone={has ? 'good' : 'bad'} />} />;
            })}
          </Card>
          {d.driver?.status === 'pending' || d.driver?.status === 'rejected' ? (
            <ListItem icon="document-text-outline" title="Update my application" onPress={() => router.push('/driver/onboarding')} />
          ) : null}
        </>
      ) : null}
      <SectionTitle>Support</SectionTitle>
      <ListItem icon="help-buoy-outline" title="Help & safety" subtitle="Report a problem, emergency numbers" onPress={() => router.push('/driver/help')} />
    </Screen>
  );
}
