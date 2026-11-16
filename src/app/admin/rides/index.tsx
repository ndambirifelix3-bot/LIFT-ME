import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Chip, ErrorMessage, Loading, Pill, toneForStatus } from '@/components';
import { AdminPage, Table } from '@/features/admin/AdminPage';
import { formatDateTime, formatMoney, RIDE_STATUS_LABEL } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { space } from '@/theme';

const FILTERS = ['all', 'active', 'completed', 'cancelled', 'no_driver_found'] as const;

export default function AdminRides() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const q = useQuery({
    queryKey: ['admin-rides', filter],
    refetchInterval: 20_000,
    queryFn: async () => {
      let query = supabase
        .from('rides')
        .select('id, status, fare, currency, requested_at, pickup_address, dropoff_address, payment_method, passenger:profiles!rides_passenger_id_fkey(full_name), driver:profiles!rides_driver_id_fkey(full_name), payments(status)')
        .order('requested_at', { ascending: false })
        .limit(200);
      if (filter === 'active') query = query.in('status', ['searching', 'accepted', 'arrived', 'in_progress']);
      else if (filter !== 'all') query = query.eq('status', filter);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
  const rows = q.data ?? [];

  return (
    <AdminPage title="Rides" subtitle="Latest 200 rides" onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => <Chip key={f} label={f === 'all' ? 'All' : f === 'active' ? 'Active' : RIDE_STATUS_LABEL[f]} selected={filter === f} onPress={() => setFilter(f)} />)}
      </View>
      {q.isLoading ? <Loading /> : null}
      <ErrorMessage error={q.error} onRetry={() => q.refetch()} />
      <Table
        headers={['Requested', 'Passenger', 'Driver', 'Route', 'Fare', 'Status', 'Payment']}
        rows={rows.map((r) => {
          const pay = Array.isArray(r.payments) ? r.payments[0] : r.payments;
          return [
            formatDateTime(r.requested_at),
            r.passenger?.full_name ?? '—',
            r.driver?.full_name ?? '—',
            `${r.pickup_address.split(',')[0]} → ${r.dropoff_address.split(',')[0]}`,
            formatMoney(r.fare, r.currency),
            <Pill key="s" text={RIDE_STATUS_LABEL[r.status]} tone={toneForStatus(r.status)} />,
            `${r.payment_method === 'mpesa' ? 'M-Pesa' : 'Cash'}${pay ? ` · ${pay.status}` : ''}`,
          ];
        })}
        onRowPress={(i) => router.push(`/admin/rides/${rows[i].id}`)}
      />
    </AdminPage>
  );
}
