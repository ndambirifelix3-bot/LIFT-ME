import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, ErrorMessage, Header, Input, Loading, Screen } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { useMyDriver } from '@/features/driver/hooks';
import { supabase } from '@/lib/supabase';

const schema = z.object({
  full_name: z.string().trim().min(3, 'Enter your full name as on your ID').max(100),
  id_number: z.string().trim().regex(/^\d{6,10}$/, 'Enter your National ID number (digits only)'),
  licence_number: z.string().trim().min(4, 'Enter your driving licence number').max(30),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email or leave empty')]),
});
type Form = z.infer<typeof schema>;

export default function DriverDetails() {
  const { session, profile, refreshProfile } = useAuth();
  const me = useMyDriver(session?.user.id);
  const qc = useQueryClient();
  const d = me.data?.driver;
  const { control, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(schema),
    values: { full_name: profile?.full_name ?? '', id_number: d?.id_number ?? '', licence_number: d?.licence_number ?? '', email: d?.email ?? '' },
  });

  const save = useMutation({
    mutationFn: async (v: Form) => {
      const uid = session!.user.id;
      const a = await supabase.from('profiles').update({ full_name: v.full_name }).eq('id', uid);
      if (a.error) throw a.error;
      const b = await supabase.from('drivers').update({ id_number: v.id_number, licence_number: v.licence_number.toUpperCase(), email: v.email || null }).eq('id', uid);
      if (b.error) throw b.error;
    },
    onSuccess: async () => {
      await refreshProfile();
      await qc.invalidateQueries({ queryKey: ['my-driver'] });
      router.back();
    },
  });

  if (me.isLoading) return <Loading />;
  const field = (name: keyof Form, label: string, extra: object = {}) => (
    <Controller
      control={control}
      name={name}
      render={({ field: f }) => <Input label={label} value={f.value} onChangeText={f.onChange} error={formState.errors[name]?.message} {...extra} />}
    />
  );

  return (
    <Screen footer={<Button title="Save" onPress={handleSubmit((v) => save.mutate(v))} loading={save.isPending} />}>
      <Header title="Personal details" back />
      {field('full_name', 'Full name (as on your ID)', { autoCapitalize: 'words' })}
      {field('id_number', 'National ID number', { keyboardType: 'number-pad', maxLength: 10 })}
      {field('licence_number', 'Driving licence number', { autoCapitalize: 'characters', maxLength: 30 })}
      {field('email', 'Email (optional)', { keyboardType: 'email-address', autoCapitalize: 'none' })}
      <ErrorMessage error={save.error} />
    </Screen>
  );
}
