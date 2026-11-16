import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, ErrorMessage, Input, Loading, Pill, Row, SectionTitle, toneForStatus } from '@/components';
import { AdminPage } from '@/features/admin/AdminPage';
import { Receipt } from '@/features/rides/components';
import { useRideAction, useRideDetails } from '@/features/rides/hooks';
import { formatDateTime, formatMoney, RIDE_STATUS_LABEL } from '@/lib/format';
import { formatPhoneForDisplay } from '@/lib/phone';
import { supabase } from '@/lib/supabase';
import { space, type } from '@/theme';

export default function AdminRideDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const details = useRideDetails(id, { poll: 15_000 });
  const [reason, setReason] = useState('');
  const cancel = useRideAction(() => supabase.rpc('cancel_ride', { p_ride_id: id!, p_reason: reason || 'Cancelled by admin' }));

  if (details.isLoading) return <Loading />;
  const d = details.data;
  if (!d) return <AdminPage title="Ride"><ErrorMessage error={details.error} /></AdminPage>;
  const r = d.ride;
  const active = ['searching', 'accepted', 'arrived', 'in_progress'].includes(r.status);

  return (
    <AdminPage
      title={`Ride ${r.id.slice(0, 8)}`}
      subtitle={formatDateTime(r.requested_at)}
      actions={<Button small variant="outline" title="Back" onPress={() => router.push('/admin/rides')} />}
      onRefresh={() => details.refetch()}
      refreshing={details.isRefetching}
    >
      <View style={{ flexDirection: 'row', gap: space.md, flexWrap: 'wrap' }}>
        <Card style={{ flexGrow: 1, flexBasis: 320 }}>
          <Text style={type.h3}>Passenger</Text>
          <Row label="Name" value={d.passenger?.full_name ?? '—'} />
          <Row label="Phone" value={formatPhoneForDisplay(d.passenger?.phone)} />
        </Card>
        <Card style={{ flexGrow: 1, flexBasis: 320 }}>
          <Text style={type.h3}>Driver</Text>
          <Row label="Name" value={d.driver?.full_name ?? 'Not assigned'} />
          <Row label="Phone" value={formatPhoneForDisplay(d.driver?.phone)} />
          <Row label="Vehicle" value={d.driver?.vehicle ? `${d.driver.vehicle.make} ${d.driver.vehicle.model} · ${d.driver.vehicle.plate}` : '—'} />
        </Card>
      </View>
      <Receipt details={d} />
      {r.status === 'completed' ? (
        <Card>
          <Row label="Commission" value={`${formatMoney(r.platform_commission, r.currency)} (${r.commission_percent ?? 0}%)`} />
          <Row label="Driver earnings" value={formatMoney(r.driver_earnings, r.currency)} />
        </Card>
      ) : null}

      <SectionTitle>Status history</SectionTitle>
      <Card>
        {(d.events ?? []).map((e) => (
          <Row
            key={e.id}
            label={formatDateTime(e.created_at)}
            value={
              <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
                <Pill text={RIDE_STATUS_LABEL[e.to_status]} tone={toneForStatus(e.to_status)} />
                <Text style={type.small}>by {e.actor_role}{e.note ? ` — ${e.note}` : ''}</Text>
              </View>
            }
          />
        ))}
      </Card>

      {active ? (
        <>
          <SectionTitle>Admin action</SectionTitle>
          <Card>
            <Input label="Cancel reason" value={reason} onChangeText={setReason} />
            <ErrorMessage error={cancel.error} />
            <Button title="Cancel this ride" variant="danger" onPress={() => cancel.mutate(undefined)} loading={cancel.isPending} />
          </Card>
        </>
      ) : null}
    </AdminPage>
  );
}
