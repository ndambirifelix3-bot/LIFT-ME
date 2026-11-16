import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Button, ErrorMessage, Loading, Notice } from '@/components';
import { AdminPage, Stat } from '@/features/admin/AdminPage';
import { useSettings } from '@/features/settings';
import { formatMoney } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { space } from '@/theme';

type Overview = {
  currency: string; rides_today: number; completed_today: number; active_rides: number; online_drivers: number;
  pending_drivers: number; collected_today: number; collected_total: number; commission_total: number; open_reports: number;
};

export default function AdminOverview() {
  const settings = useSettings();
  const q = useQuery({
    queryKey: ['admin-overview'],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_overview');
      if (error) throw error;
      return data as unknown as Overview;
    },
  });
  const o = q.data;

  return (
    <AdminPage title="Overview" subtitle="Live numbers from the database. Updates every 30 seconds." onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      {settings.data?.pricing_is_placeholder ? (
        <View>
          <Notice tone="error" text="Prices are still the PLACEHOLDER values. Set your real prices before the pilot." />
          <Button title="Go to pricing" small variant="dark" onPress={() => router.push('/admin/pricing')} style={{ alignSelf: 'flex-start' }} />
        </View>
      ) : null}
      {q.isLoading ? <Loading /> : null}
      <ErrorMessage error={q.error} onRetry={() => q.refetch()} />
      {o ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
          <Stat label="Rides today" value={o.rides_today} hint={`${o.completed_today} completed`} />
          <Stat label="Active rides now" value={o.active_rides} />
          <Stat label="Drivers online" value={o.online_drivers} hint="Sent location in the last 2 minutes" />
          <Stat label="Drivers waiting for approval" value={o.pending_drivers} />
          <Stat label="Collected today" value={formatMoney(o.collected_today, o.currency)} hint="Paid cash + M-Pesa" />
          <Stat label="Collected all time" value={formatMoney(o.collected_total, o.currency)} />
          <Stat label="Lift Me commission (paid rides)" value={formatMoney(o.commission_total, o.currency)} />
          <Stat label="Open support reports" value={o.open_reports} />
        </View>
      ) : null}
    </AdminPage>
  );
}
