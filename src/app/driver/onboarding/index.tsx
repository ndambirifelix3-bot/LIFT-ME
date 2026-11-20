import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, Card, ErrorMessage, Header, ListItem, Loading, Notice, Screen } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { useMyDriver } from '@/features/driver/hooks';
import { supabase } from '@/lib/supabase';
import { colors, space, type } from '@/theme';

export default function Onboarding() {
  const { session, profile } = useAuth();
  const me = useMyDriver(session?.user.id);
  const qc = useQueryClient();

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('submit_driver_application');
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-driver'] });
      router.replace('/driver');
    },
  });

  if (me.isLoading || !me.data) return <Loading />;
  const { driver, vehicle, documents, documentTypes } = me.data;
  const required = documentTypes.filter((t) => t.required);
  const docsDone = required.every((t) => documents.some((d) => d.doc_type === t.code));
  const steps = [
    { key: 'details', title: 'Personal details', done: !!(profile?.full_name && driver?.id_number && driver?.licence_number) },
    { key: 'photo', title: 'Profile photo', done: !!driver?.photo_path },
    { key: 'documents', title: `Documents (${documents.length}/${required.length})`, done: docsDone },
    { key: 'vehicle', title: 'Vehicle details', done: !!vehicle },
  ] as const;
  const allDone = steps.every((s) => s.done);
  const locked = driver?.status === 'approved' || driver?.status === 'suspended';
  const submitted = !!driver?.submitted_at && driver?.status === 'pending';

  return (
    <Screen
      footer={
        locked ? undefined : (
          <Button
            title={submitted ? 'Application submitted' : driver?.status === 'rejected' ? 'Resubmit application' : 'Submit application'}
            disabled={!allDone || submitted}
            loading={submit.isPending}
            onPress={() => submit.mutate()}
          />
        )
      }
    >
      <Header title="Driver application" subtitle="Complete each step, then submit for review." back />
      {driver?.status === 'rejected' ? <Notice tone="error" text={`Not approved: ${driver.reject_reason ?? ''}. Fix the issue and resubmit.`} /> : null}
      {submitted ? <Notice text="Submitted — we'll review it soon. If you change anything you'll need to submit again." /> : null}
      {locked ? <Notice tone="success" text="Your application is approved. Contact support to change your details." /> : null}
      <Card>
        {steps.map((s) => (
          <ListItem
            key={s.key}
            title={s.title}
            right={<Ionicons name={s.done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={s.done ? colors.success : colors.secondary} />}
            onPress={locked ? undefined : () => router.push(`/driver/onboarding/${s.key}`)}
          />
        ))}
      </Card>
      <ErrorMessage error={submit.error} />
      <View style={{ marginTop: space.sm }}>
        <Text style={type.small}>Your documents are stored privately. Only you and the Lift Me review team can see them.</Text>
      </View>
    </Screen>
  );
}
