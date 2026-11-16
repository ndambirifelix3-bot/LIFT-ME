import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { Button, Card, ErrorMessage, Header, Loading, Notice, Row, Screen } from '@/components';
import { RatePanel, Receipt } from '@/features/rides/components';
import { useRideAction, useRideDetails, useRideRealtime } from '@/features/rides/hooks';
import { formatMoney } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { space, type } from '@/theme';

/** Trip summary for the driver: collect cash, see M-Pesa status, rate the passenger. */
export default function DriverRideDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const details = useRideDetails(id);
  useRideRealtime(id, null);
  const cash = useRideAction(() => supabase.rpc('confirm_cash_payment', { p_ride_id: id! }));

  if (details.isLoading) return <Loading />;
  const d = details.data;
  const r = d?.ride;
  const p = d?.payment;

  return (
    <Screen onRefresh={() => details.refetch()} refreshing={details.isRefetching}>
      <Header title="Trip summary" back />
      <ErrorMessage error={details.error} onRetry={() => details.refetch()} />
      {d && r ? (
        <>
          {r.status === 'completed' ? (
            <Card>
              <Text style={type.h3}>Your earnings</Text>
              <Row label="Fare" value={formatMoney(r.fare, r.currency)} />
              <Row label={`Lift Me commission (${r.commission_percent ?? 0}%)`} value={`− ${formatMoney(r.platform_commission, r.currency)}`} />
              <Row label="You earn" value={formatMoney(r.driver_earnings, r.currency)} bold />
            </Card>
          ) : null}
          {p && p.status !== 'paid' ? (
            <Card>
              {p.method === 'cash' ? (
                <Text style={[type.h3, { marginBottom: space.md }]}>Collect {formatMoney(p.amount, p.currency)} cash</Text>
              ) : (
                <Notice text={`Waiting for the passenger's M-Pesa payment (${p.status}). If they pay you cash instead, tap below.`} />
              )}
              <ErrorMessage error={cash.error} />
              <Button title="Cash received" onPress={() => cash.mutate(undefined)} loading={cash.isPending} />
            </Card>
          ) : null}
          {p?.status === 'paid' ? <Notice tone="success" text={`Paid · ${p.method === 'mpesa' ? `M-Pesa ${p.mpesa_receipt ?? ''}` : 'Cash'}`} /> : null}
          <Receipt details={d} />
          <RatePanel details={d} who="passenger" />
          <Button title="Back to home" variant="dark" onPress={() => router.replace('/driver')} />
        </>
      ) : null}
    </Screen>
  );
}
