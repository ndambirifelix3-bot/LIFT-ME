import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Button, ErrorMessage, Loading, Notice } from '@/components';
import { AdminPage, Stat } from '@/features/admin/AdminPage';
import { AdminMarketSwitcher, useAdminMarket } from '@/features/admin/market';
import { formatMoney } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { space } from '@/theme';

type Overview = {
  market_code: string; currency: string; currency_decimals: number; prices_are_placeholder: boolean; rides_today: number; completed_today: number; active_rides: number; online_drivers: number;
  pending_drivers: number; collected_today: number; collected_total: number; commission_total: number; open_reports: number;
};

export default function AdminOverview() {
  const market = useAdminMarket();
  const q = useQuery({
    queryKey: ['admin-overview', market?.code],
    enabled: !!market,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_overview', { p_market_code: market!.code });
      if (error) throw error;
      return data as unknown as Overview;
    },
  });
  const o = q.data;
  const money = (n: number) => formatMoney(n, o?.currency, o?.currency_decimals);

  return (
    <AdminPage
      title={market ? `Overview · ${market.name}` : 'Overview'}
      subtitle="Live numbers from the database. Updates every 30 seconds."
      onRefresh={() => q.refetch()}
      refreshing={q.isRefetching}
    >
      <AdminMarketSwitcher />
      {o?.prices_are_placeholder ? (
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
          <Stat label="Collected today" value={money(o.collected_today)} hint="All paid trips in this market" />
          <Stat label="Collected all time" value={money(o.collected_total)} />
          <Stat label="Lift Me commission (paid rides)" value={money(o.commission_total)} />
          <Stat label="Open support reports" value={o.open_reports} />
        </View>
      ) : null}
    </AdminPage>
  );
}
