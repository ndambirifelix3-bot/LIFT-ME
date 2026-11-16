import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Linking, Text, View } from 'react-native';
import { z } from 'zod';
import { Button, Card, Chip, ErrorMessage, Input, ListItem, Notice, Pill, SectionTitle, toneForStatus } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { useSettings } from '@/features/settings';
import { formatDateTime } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { colors, space, type } from '@/theme';

const CATEGORIES = [
  { key: 'safety', label: 'Safety' },
  { key: 'payment', label: 'Payment' },
  { key: 'driver', label: 'Driver' },
  { key: 'passenger', label: 'Passenger' },
  { key: 'lost_item', label: 'Lost item' },
  { key: 'app', label: 'App problem' },
  { key: 'other', label: 'Other' },
] as const;

const schema = z.object({
  category: z.enum(['safety', 'payment', 'driver', 'passenger', 'lost_item', 'app', 'other']),
  message: z.string().trim().min(5, 'Please describe what happened').max(2000),
});

/** Emergency numbers + "report a problem" form, shared by passengers and drivers. */
export function HelpContent({ rideId }: { rideId?: string }) {
  const { session } = useAuth();
  const settings = useSettings();
  const { control, handleSubmit, formState, reset, setValue } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'safety', message: '' },
  });

  const reports = useQuery({
    queryKey: ['my-reports', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.from('support_reports').select('*').order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });

  const send = useMutation({
    mutationFn: async (v: z.infer<typeof schema>) => {
      const { error } = await supabase.from('support_reports').insert({
        user_id: session!.user.id, ride_id: rideId ?? null, category: v.category, message: v.message,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      reset();
      reports.refetch();
    },
  });

  const numbers = settings.data?.emergency_numbers ?? ['999', '112'];
  const supportPhone = settings.data?.support_phone;
  const category = useWatch({ control, name: 'category' });

  return (
    <>
      <Card style={{ backgroundColor: colors.errorBg, borderColor: colors.errorBg }}>
        <Text style={[type.h3, { color: colors.error }]}>In danger? Call emergency services now.</Text>
        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
          {numbers.map((n) => (
            <Button key={n} title={`Call ${n}`} variant="danger" style={{ flex: 1, backgroundColor: colors.white }} onPress={() => Linking.openURL(`tel:${n}`)} />
          ))}
        </View>
        {supportPhone ? (
          <Button title={`Call Lift Me support (${supportPhone})`} variant="ghost" onPress={() => Linking.openURL(`tel:${supportPhone}`)} />
        ) : null}
      </Card>

      <SectionTitle>Report a problem</SectionTitle>
      {rideId ? <Notice text="This report will be linked to your trip." /> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md }}>
        {CATEGORIES.map((c) => (
          <Chip key={c.key} label={c.label} selected={category === c.key} onPress={() => setValue('category', c.key)} />
        ))}
      </View>
      <Controller
        control={control}
        name="message"
        render={({ field }) => (
          <Input label="What happened?" multiline value={field.value} onChangeText={field.onChange} error={formState.errors.message?.message} maxLength={2000} />
        )}
      />
      <ErrorMessage error={send.error} />
      {send.isSuccess ? <Notice tone="success" text="Thanks — our team will look into it and contact you." /> : null}
      <Button title="Send report" variant="dark" onPress={handleSubmit((v) => send.mutate(v))} loading={send.isPending} />

      {reports.data?.length ? <SectionTitle>Your reports</SectionTitle> : null}
      {reports.data?.map((r) => (
        <ListItem
          key={r.id}
          title={r.message}
          subtitle={`${formatDateTime(r.created_at)}${r.admin_note ? ` · Reply: ${r.admin_note}` : ''}`}
          right={<Pill text={r.status} tone={toneForStatus(r.status)} />}
        />
      ))}
    </>
  );
}
