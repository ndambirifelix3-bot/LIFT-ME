import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { Button, Card, ErrorMessage, Header, Loading, Notice, Row, Screen } from '@/components';
import { RatePanel, Receipt } from '@/features/rides/components';
import { useRideAction, useRideDetails, useRideRealtime } from '@/features/rides/hooks';
import { paymentLabel } from '@/features/payments/cards';
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
              <Row
                label={r.commission_waived ? 'Lift Me commission (welcome offer)' : `Lift Me commission (${r.commission_percent ?? 0}%)`}
                value={r.commission_waived ? 'None' : `− ${formatMoney(r.platform_commission, r.currency)}`}
              />
              <Row label="You earn" value={formatMoney(r.driver_earnings, r.currency)} bold />
            </Card>
          ) : null}
          {p && p.method === 'card' && p.status === 'pending' ? (
            <Notice text="The passenger's card is being charged automatically. No cash needed." />
          ) : null}
          {p && p.status !== 'paid' && !(p.method === 'card' && p.status === 'pending') ? (
            <Card>
              {p.method === 'card' ? (
                <Notice tone="error" text="The passenger's card payment failed. They can try again in their app. If they pay you cash instead, tap below." />
              ) : p.method === 'cash' ? (
                <Text style={[type.h3, { marginBottom: space.md }]}>Collect {formatMoney(p.amount, p.currency)} cash</Text>
              ) : (
                <Notice text={`Waiting for the passenger's M-Pesa payment (${p.status}). If they pay you cash instead, tap below.`} />
              )}
              <ErrorMessage error={cash.error} />
              <Button title="Cash received" onPress={() => cash.mutate(undefined)} loading={cash.isPending} />
            </Card>
          ) : null}
          {p?.status === 'paid' ? <Notice tone="success" text={`Paid · ${paymentLabel(p)}`} /> : null}
          <Receipt details={d} />
          <RatePanel details={d} who="passenger" />
          <Button title="Back to home" variant="dark" onPress={() => router.replace('/driver')} />
        </>
      ) : null}
    </Screen>
  );
}
