import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, ErrorMessage, Header, Input, Loading, Screen } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';

const schema = z.object({
  full_name: z.string().trim().min(3, 'Please enter your full name').max(100),
});

export default function CompleteProfile() {
  const { session, profile, refreshProfile } = useAuth();
  const { control, handleSubmit, formState } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    values: { full_name: profile?.full_name ?? '' },
  });

  const save = useMutation({
    mutationFn: async (full_name: string) => {
      const { error } = await supabase.from('profiles').update({ full_name }).eq('id', session!.user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshProfile();
      router.replace('/');
    },
  });

  if (!session) return <Redirect href="/welcome" />;
  if (!profile) return <Loading />;

  return (
    <Screen footer={<Button title="Continue" onPress={handleSubmit((v) => save.mutate(v.full_name))} loading={save.isPending} />}>
      <Header title="Complete your profile" subtitle="This is how drivers and passengers will see you." />
      <Controller
        control={control}
        name="full_name"
        render={({ field }) => (
          <Input
            label="Full name"
            placeholder="e.g. Wanjiru Kamau"
            autoCapitalize="words"
            autoComplete="name"
            value={field.value}
            onChangeText={field.onChange}
            error={formState.errors.full_name?.message}
            autoFocus
          />
        )}
      />
      <ErrorMessage error={save.error} />
    </Screen>
  );
}
