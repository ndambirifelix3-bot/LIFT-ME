import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Text } from 'react-native';
import { Card, ErrorMessage, Loading, Pill } from '@/components';
import { AdminMarketSwitcher, useAdminMarket } from '@/features/admin/market';
import { AdminPage, Table } from '@/features/admin/AdminPage';
import { formatDateTime, formatMoney } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { colors, space, type } from '@/theme';

/** Every driver with money to settle in the selected city: who owes Lift Me, and who Lift Me owes. */
export default function AdminMoney() {
  const market = useAdminMarket();
  const q = useQuery({
    queryKey: ['admin-money', market?.code],
    enabled: !!market,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_driver_balances', { p_market_code: market!.code });
      if (error) throw error;
      return data;
    },
  });
  const rows = q.data ?? [];
  const money = (n: number) => formatMoney(n, market?.currency, market?.currency_decimals);
  const owedToUs = rows.filter((r) => r.balance < 0).reduce((s, r) => s - r.balance, 0);
  const weOwe = rows.filter((r) => r.balance > 0).reduce((s, r) => s + r.balance, 0);

  return (
    <AdminPage title="Driver money" subtitle="Commission drivers owe on cash trips, and payouts Lift Me owes drivers." onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <AdminMarketSwitcher />
      {q.isLoading ? <Loading /> : null}
      <ErrorMessage error={q.error} onRetry={() => q.refetch()} />
      {market ? (
        <Card>
          <Text style={type.body}>Drivers owe Lift Me: <Text style={{ color: colors.error }}>{money(owedToUs)}</Text></Text>
          <Text style={[type.body, { marginTop: space.xs }]}>Lift Me owes drivers: <Text style={{ color: colors.success }}>{money(weOwe)}</Text></Text>
          <Text style={[type.small, { marginTop: space.sm }]}>
            Limit before a driver is stopped: {market.driver_debt_limit == null ? 'no limit' : money(market.driver_debt_limit)} (change it in Markets).
          </Text>
        </Card>
      ) : null}
      {q.data && rows.length === 0 ? <Text style={type.small}>No driver money in {market?.name} yet.</Text> : null}
      {rows.length ? (
        <Table
          headers={['Driver', 'Phone', 'Balance', 'Status', 'Last change']}
          rows={rows.map((r) => [
            r.full_name || '—',
            r.phone ?? '—',
            <Text key="b" style={[type.body, { color: r.balance < 0 ? colors.error : r.balance > 0 ? colors.success : colors.text }]}>
              {r.balance < 0 ? `Owes ${money(-r.balance)}` : r.balance > 0 ? `Owed ${money(r.balance)}` : 'Settled'}
            </Text>,
            <Pill key="s" text={r.over_limit ? 'Over limit' : r.is_online ? 'Online' : 'Offline'} tone={r.over_limit ? 'bad' : r.is_online ? 'good' : 'neutral'} />,
            r.last_entry_at ? formatDateTime(r.last_entry_at) : '—',
          ])}
          onRowPress={(i) => router.push(`/admin/money/${rows[i].driver_id}`)}
        />
      ) : null}
    </AdminPage>
  );
}
