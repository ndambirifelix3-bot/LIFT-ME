import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Chip, ErrorMessage, Loading, Pill, toneForStatus } from '@/components';
import { AdminPage, Table } from '@/features/admin/AdminPage';
import { formatDateTime } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { space } from '@/theme';

type Status = Database['public']['Enums']['driver_status'];
const FILTERS: { key: Status | 'all'; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'all', label: 'All' },
];

export default function AdminDrivers() {
  const [filter, setFilter] = useState<Status | 'all'>('pending');
  const q = useQuery({
    queryKey: ['admin-drivers', filter],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_list_drivers', filter === 'all' ? {} : { p_status: filter });
      if (error) throw error;
      return data;
    },
  });
  const rows = q.data ?? [];

  return (
    <AdminPage title="Drivers" subtitle="Review applications, approve or reject, suspend." onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />)}
      </View>
      {q.isLoading ? <Loading /> : null}
      <ErrorMessage error={q.error} onRetry={() => q.refetch()} />
      <Table
        headers={['Name', 'Phone', 'Status', 'Plate', 'Submitted', 'Online']}
        rows={rows.map((d) => [
          d.full_name || '—',
          d.phone ?? '—',
          <Pill key="s" text={d.status === 'pending' && !d.submitted_at ? 'incomplete' : d.status} tone={d.submitted_at || d.status !== 'pending' ? toneForStatus(d.status) : 'neutral'} />,
          d.plate ?? '—',
          d.submitted_at ? formatDateTime(d.submitted_at) : 'Not yet',
          d.is_online ? 'Yes' : 'No',
        ])}
        onRowPress={(i) => router.push(`/admin/drivers/${rows[i].id}`)}
      />
    </AdminPage>
  );
}
