import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { Button, ErrorMessage, Header, Input, Screen } from '@/components';
import { looksLikeEmail } from '@/lib/email';
import { supabase } from '@/lib/supabase';
import { space, type } from '@/theme';

/**
 * Log in with email: we email a 6-digit code. An existing account with this email is opened;
 * otherwise a new account is created (the person then chooses passenger or driver).
 */
export default function EmailLogin() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();

  const send = useMutation({
    mutationFn: async (address: string) => {
      const { error: e } = await supabase.auth.signInWithOtp({ email: address, options: { shouldCreateUser: true } });
      if (e) throw e;
      return address;
    },
    onSuccess: (address) => router.push({ pathname: '/otp', params: { email: address } }),
  });

  const onSubmit = () => {
    const address = email.trim().toLowerCase();
    if (!looksLikeEmail(address)) {
      setError('Enter a valid email, e.g. name@gmail.com');
      return;
    }
    setError(undefined);
    send.mutate(address);
  };

  return (
    <Screen footer={<Button title="Send code" onPress={onSubmit} loading={send.isPending} />}>
      <Header title="Your email" subtitle="We'll email you a 6-digit code to log in." back />
      <Input
        label="Email address"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (error) setError(undefined);
        }}
        error={error}
        placeholder="name@gmail.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        autoFocus
        onSubmitEditing={onSubmit}
      />
      <ErrorMessage error={send.error} />
      <Text style={[type.small, { marginTop: space.sm }]}>
        {'Already have a Lift Me account with this email? You\'ll go straight to it. New here? We\'ll set up your account.'}
      </Text>
    </Screen>
  );
}
