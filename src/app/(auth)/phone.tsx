import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Text } from 'react-native';
import { z } from 'zod';
import { Button, ErrorMessage, Header, PhoneInput, Screen } from '@/components';
import { useMutation } from '@tanstack/react-query';
import { normalizeKenyanPhone } from '@/lib/phone';
import { supabase } from '@/lib/supabase';
import { type } from '@/theme';

const schema = z.object({
  phone: z.string().refine((v) => normalizeKenyanPhone(v) !== null, 'Enter a valid Kenyan mobile number, e.g. 712 345 678'),
});

export default function PhoneLogin() {
  const { control, handleSubmit, formState } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '' },
  });

  const send = useMutation({
    mutationFn: async (phone: string) => {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      return phone;
    },
    onSuccess: (phone) => router.push({ pathname: '/otp', params: { phone } }),
  });

  const onSubmit = handleSubmit(({ phone }) => send.mutate(normalizeKenyanPhone(phone)!));

  return (
    <Screen footer={<Button title="Send code" onPress={onSubmit} loading={send.isPending} />}>
      <Header title="Your phone number" subtitle="We'll text you a 6-digit code to log in." back />
      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <PhoneInput value={field.value} onChangeText={field.onChange} error={formState.errors.phone?.message} />
        )}
      />
      <ErrorMessage error={send.error} />
      <Text style={type.small}>Standard SMS rates may apply.</Text>
    </Screen>
  );
}
