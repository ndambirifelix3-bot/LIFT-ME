import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, ErrorMessage, Input, Notice } from '@/components';
import { looksLikeEmail } from '@/lib/email';
import { formatDateTime } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { colors, space, type } from '@/theme';

const KIND: Record<string, string> = { driver_application: 'Driver application', support_report: 'Help report', test: 'Test' };

/** Admin emails: who gets them, a test button, and the last few that were sent (or failed). */
export function AdminEmailsCard() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['admin-emails'],
    refetchInterval: 15_000,
    queryFn: async () => {
      const [setting, outbox] = await Promise.all([
        supabase.from('settings').select('value').eq('key', 'admin_notify_emails').maybeSingle(),
        supabase.from('admin_email_outbox').select('id, kind, created_at, sent_at, error').order('id', { ascending: false }).limit(5),
      ]);
      if (setting.error) throw setting.error;
      if (outbox.error) throw outbox.error;
      return { to: (Array.isArray(setting.data?.value) ? setting.data!.value : []) as string[], recent: outbox.data ?? [] };
    },
  });
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? (q.data?.to ?? []).join(', ');

  const save = useMutation({
    mutationFn: async () => {
      const list = value.split(/[,\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (!list.length || list.some((e) => !looksLikeEmail(e))) throw new Error('Enter one or more emails, separated by commas.');
      const { error } = await supabase.from('settings').update({ value: list }).eq('key', 'admin_notify_emails');
      if (error) throw error;
    },
    onSuccess: () => { setDraft(null); qc.invalidateQueries({ queryKey: ['admin-emails'] }); },
  });
  const test = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('admin_send_test_email');
      if (error) throw error;
    },
    onSuccess: () => setTimeout(() => qc.invalidateQueries({ queryKey: ['admin-emails'] }), 3000),
  });

  return (
    <Card>
      <Text style={type.h3}>Admin emails</Text>
      <Text style={[type.small, { marginVertical: space.sm }]}>
        An email goes here when a driver submits an application or someone sends a help report (safety reports are marked URGENT).
      </Text>
      <Input label="Send to (separate several with commas)" value={value} onChangeText={setDraft} autoCapitalize="none" keyboardType="email-address" />
      <ErrorMessage error={save.error ?? test.error ?? q.error} />
      {save.isSuccess ? <Notice tone="success" text="Saved." /> : null}
      {test.isSuccess ? <Notice tone="success" text="Test email sent. Check the inbox (and spam) in a minute." /> : null}
      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
        <Button title="Save" small variant="dark" disabled={draft === null} loading={save.isPending} onPress={() => save.mutate()} />
        <Button title="Send a test email" small variant="outline" loading={test.isPending} onPress={() => test.mutate()} />
      </View>
      {q.data?.recent.length ? (
        <View style={{ marginTop: space.md }}>
          <Text style={[type.label, { marginBottom: 4 }]}>Recent</Text>
          {q.data.recent.map((r) => (
            <Text key={r.id} style={[type.small, r.error ? { color: colors.error } : null]}>
              {formatDateTime(r.created_at)} · {KIND[r.kind] ?? r.kind} · {r.sent_at ? 'sent' : r.error ? `not sent: ${r.error}` : 'sending…'}
            </Text>
          ))}
        </View>
      ) : null}
    </Card>
  );
}
