import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Chip, ErrorMessage, Input, Loading, Pill, toneForStatus } from '@/components';
import { AdminPage } from '@/features/admin/AdminPage';
import { formatDateTime } from '@/lib/format';
import { formatPhoneForDisplay } from '@/lib/phone';
import { supabase } from '@/lib/supabase';
import { space, type } from '@/theme';

export default function AdminReports() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'open' | 'resolved'>('open');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const q = useQuery({
    queryKey: ['admin-reports', filter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_reports')
        .select('*, user:profiles!support_reports_user_id_fkey(full_name, phone, role)')
        .eq('status', filter)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
  const resolve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('admin_resolve_report', { p_report_id: id, p_note: notes[id] || undefined });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-reports'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
    },
  });

  return (
    <AdminPage title="Support reports" subtitle="Problems reported by passengers and drivers. Safety reports first.">
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Chip label="Open" selected={filter === 'open'} onPress={() => setFilter('open')} />
        <Chip label="Resolved" selected={filter === 'resolved'} onPress={() => setFilter('resolved')} />
      </View>
      {q.isLoading ? <Loading /> : null}
      <ErrorMessage error={q.error ?? resolve.error} />
      {q.data?.length === 0 ? <Text style={type.small}>No {filter} reports.</Text> : null}
      {[...(q.data ?? [])].sort((a, b) => Number(b.category === 'safety') - Number(a.category === 'safety')).map((r) => (
        <Card key={r.id}>
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center', marginBottom: space.sm, flexWrap: 'wrap' }}>
            <Pill text={r.category.replace('_', ' ')} tone={r.category === 'safety' ? 'bad' : 'wait'} />
            <Pill text={r.status} tone={toneForStatus(r.status)} />
            <Text style={type.small}>{formatDateTime(r.created_at)} · {r.user?.full_name} ({r.user?.role}) · {formatPhoneForDisplay(r.user?.phone)}</Text>
          </View>
          <Text style={type.body}>{r.message}</Text>
          {r.ride_id ? <Button small variant="outline" title="Open ride" style={{ alignSelf: 'flex-start', marginTop: space.sm }} onPress={() => router.push(`/admin/rides/${r.ride_id}`)} /> : null}
          {r.status === 'open' ? (
            <View style={{ marginTop: space.md }}>
              <Input label="Note to the user (optional)" value={notes[r.id] ?? ''} onChangeText={(x) => setNotes((n) => ({ ...n, [r.id]: x }))} />
              <Button small variant="dark" title="Mark resolved" style={{ alignSelf: 'flex-start' }} loading={resolve.isPending && resolve.variables === r.id} onPress={() => resolve.mutate(r.id)} />
            </View>
          ) : r.admin_note ? (
            <Text style={[type.small, { marginTop: space.sm }]}>Note: {r.admin_note}</Text>
          ) : null}
        </Card>
      ))}
    </AdminPage>
  );
}
