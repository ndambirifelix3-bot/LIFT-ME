import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, ErrorMessage, Header, Input, Notice, Screen } from '@/components';
import { accountExists, type AuthMode, MODE_TEXT } from '@/features/auth/accountCheck';
import { looksLikeEmail } from '@/lib/email';
import { supabase } from '@/lib/supabase';
import { colors, fonts, space } from '@/theme';

const PHONE_LOGIN = process.env.EXPO_PUBLIC_PHONE_LOGIN !== 'off';

/**
 * Log in or sign up with email. We first check whether the email already has an account:
 * - Log in + no account  -> "no account with this email" + Sign up instead
 * - Sign up + account    -> "you already have an account" + Log in instead
 * Otherwise a 6-digit code is emailed.
 */
export default function EmailLogin() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<AuthMode>(params.mode === 'signup' ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [wrongMode, setWrongMode] = useState(false);
  const text = MODE_TEXT[mode];

  const send = useMutation({
    mutationFn: async ({ address, as, checked }: { address: string; as: AuthMode; checked: boolean }) => {
      if (!checked) {
        const exists = await accountExists({ email: address });
        if ((as === 'login' && !exists) || (as === 'signup' && exists)) return { address, wrong: true };
      }
      const { error: e } = await supabase.auth.signInWithOtp({ email: address, options: { shouldCreateUser: as === 'signup' } });
      if (e) throw e;
      return { address, wrong: false };
    },
    onSuccess: ({ address, wrong }) => {
      if (wrong) setWrongMode(true);
      else router.push({ pathname: '/otp', params: { email: address } });
    },
  });

  const address = email.trim().toLowerCase();
  const submit = () => {
    if (!looksLikeEmail(address)) {
      setError('Enter a valid email, e.g. name@gmail.com');
      return;
    }
    setError(undefined);
    setWrongMode(false);
    send.mutate({ address, as: mode, checked: false });
  };
  // "Log in instead" / "Sign up instead": switch and send the code straight away (we already know the answer).
  const switchMode = () => {
    const next: AuthMode = mode === 'login' ? 'signup' : 'login';
    setMode(next);
    setWrongMode(false);
    send.mutate({ address, as: next, checked: true });
  };

  return (
    <Screen footer={<Button title="Send code" onPress={submit} loading={send.isPending} />}>
      <Header title={text.title} subtitle="We'll email you a 6-digit code." back />
      <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.lg }}>
        {(['login', 'signup'] as const).map((m) => (
          <Text
            key={m}
            onPress={() => { setMode(m); setWrongMode(false); }}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === m }}
            style={[styles.tab, mode === m && styles.tabOn]}
          >
            {m === 'login' ? 'Log in' : 'Sign up'}
          </Text>
        ))}
      </View>
      <Input
        label="Email address"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (error) setError(undefined);
          if (wrongMode) setWrongMode(false);
        }}
        error={error}
        placeholder="name@gmail.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        autoFocus
        onSubmitEditing={submit}
      />
      {wrongMode ? (
        <View style={{ gap: space.sm, marginBottom: space.md }}>
          <Notice text={`${text.wrongMode} email.`} />
          <Button title={text.switchTo} variant="dark" small onPress={switchMode} loading={send.isPending} style={{ alignSelf: 'flex-start' }} />
        </View>
      ) : null}
      <ErrorMessage error={send.error} />
      {PHONE_LOGIN ? (
        <Text style={styles.alt} onPress={() => router.replace({ pathname: '/phone', params: { mode } })} accessibilityRole="button">
          Use my phone number instead
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = {
  tab: { fontFamily: fonts.semibold, fontSize: 15, color: colors.secondary, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' as const },
  tabOn: { color: colors.white, backgroundColor: colors.black, borderColor: colors.black },
  alt: { fontFamily: fonts.medium, fontSize: 15, color: colors.text, textDecorationLine: 'underline' as const, marginTop: space.lg },
};
