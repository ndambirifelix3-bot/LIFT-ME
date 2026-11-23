import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Text } from 'react-native';
import { Button, ErrorMessage, Input, Loading, Pill } from '@/components';
import { AdminPage, Table } from '@/features/admin/AdminPage';
import { useAuth } from '@/features/auth/AuthProvider';
import { formatDateTime } from '@/lib/format';
import { formatPhoneForDisplay } from '@/lib/phone';
import { supabase } from '@/lib/supabase';
import { type } from '@/theme';
import { confirm } from '@/lib/confirm';

export default function AdminUsers() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const q = useQuery({
    queryKey: ['admin-users', search],
    queryFn: async () => {
      let query = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(200);
      const s = search.trim().replace(/[%,()]/g, '');
      if (s) query = query.or(`full_name.ilike.%${s}%,phone.ilike.%${s.replace(/^0/, '')}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
  const suspend = useMutation({
    mutationFn: async ({ id, on }: { id: string; on: boolean }) => {
      const { error } = await supabase.rpc('admin_set_user_suspended', { p_user_id: id, p_suspended: on });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
  const rows = q.data ?? [];

  return (
    <AdminPage title="Users" subtitle="Passengers, drivers and admins. Suspended users cannot book or drive.">
      <Input placeholder="Search by name or phone" value={search} onChangeText={setSearch} />
      {q.isLoading ? <Loading /> : null}
      <ErrorMessage error={q.error ?? suspend.error} />
      <Table
        headers={['Name', 'Phone', 'Role', 'Joined', 'Status', '']}
        rows={rows.map((u) => [
          u.full_name || '—',
          formatPhoneForDisplay(u.phone),
          u.role,
          formatDateTime(u.created_at),
          u.is_suspended ? <Pill key="s" text="Suspended" tone="bad" /> : u.delete_requested_at ? <Pill key="s" text="Deletion requested" tone="wait" /> : <Pill key="s" text="Active" tone="good" />,
          u.id === session?.user.id ? (
            <Text key="a" style={type.small}>You</Text>
          ) : (
            <Button
              key="a"
              small
              variant={u.is_suspended ? 'dark' : 'danger'}
              title={u.is_suspended ? 'Unsuspend' : 'Suspend'}
              loading={suspend.isPending && suspend.variables?.id === u.id}
              onPress={() => {
                const who = `${u.full_name || 'this user'} (${formatPhoneForDisplay(u.phone)})`;
                if (u.is_suspended) suspend.mutate({ id: u.id, on: false });
                else confirm(`Suspend ${who}?`, 'They will not be able to book rides, drive or use their account until you unsuspend them.', () => suspend.mutate({ id: u.id, on: true }));
              }}
            />
          ),
        ])}
      />
      <Text style={type.small}>Account deletions: remove the user in Supabase → Authentication → Users after settling any open payments.</Text>
    </AdminPage>
  );
}
