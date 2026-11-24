import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Button, ErrorMessage, Header, OTPInput, Screen } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { formatPhoneForDisplay } from '@/lib/phone';
import { supabase } from '@/lib/supabase';
import { colors, fonts, space, type } from '@/theme';

const RESEND_SECONDS = 60;

export default function Otp() {
  // Either a phone (code by SMS) or an email (code by email).
  const { phone, email } = useLocalSearchParams<{ phone?: string; email?: string }>();
  const { refreshProfile } = useAuth();
  const [code, setCode] = useState('');
  const [wait, setWait] = useState(RESEND_SECONDS);

  useEffect(() => {
    const t = setInterval(() => setWait((w) => Math.max(0, w - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const verify = useMutation({
    mutationFn: async () => {
      const { error } = email
        ? await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
        : await supabase.auth.verifyOtp({ phone: phone!, token: code, type: 'sms' });
      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshProfile();
      router.replace('/');
    },
  });

  const resend = useMutation({
    mutationFn: async () => {
      const { error } = email
        ? await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
        : await supabase.auth.signInWithOtp({ phone: phone! });
      if (error) throw error;
    },
    onSuccess: () => setWait(RESEND_SECONDS),
  });

  useEffect(() => {
    if (code.length === 6 && !verify.isPending) verify.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <Screen footer={<Button title="Verify" onPress={() => verify.mutate()} loading={verify.isPending} disabled={code.length !== 6} />}>
      <Header title="Enter the code" subtitle={email ? `Sent to ${email}. Check your inbox (and spam).` : `Sent to ${formatPhoneForDisplay(phone)}`} back />
      <OTPInput value={code} onChange={setCode} error={!!verify.error} />
      <ErrorMessage error={verify.error ? `That code is not right or has expired. Check the ${email ? 'email' : 'SMS'} and try again.` : resend.error} />
      <Text
        style={[type.body, { marginTop: space.xl, textAlign: 'center', fontFamily: fonts.medium, color: wait ? colors.secondary : colors.text }]}
        onPress={wait || resend.isPending ? undefined : () => resend.mutate()}
        accessibilityRole="button"
      >
        {wait ? `Resend code in ${wait}s` : resend.isPending ? 'Sending…' : 'Resend code'}
      </Text>
    </Screen>
  );
}
