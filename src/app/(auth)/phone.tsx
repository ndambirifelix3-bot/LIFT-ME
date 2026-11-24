import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, ErrorMessage, Header, Notice, PhoneInput, Screen } from '@/components';
import { accountExists, type AuthMode, MODE_TEXT } from '@/features/auth/accountCheck';
import type { PhoneCountry } from '@/components/PhoneInput';
import { useMutation } from '@tanstack/react-query';
import { phoneCountries, useMarkets } from '@/features/markets';
import { normalizePhone, phonePlaceholder } from '@/lib/phone';
import { supabase } from '@/lib/supabase';
import { colors, fonts, space, type } from '@/theme';

// Used only until the list of markets has loaded (or if it can't load).
const FALLBACK: PhoneCountry = { dialCode: '+254', countryIso: 'ke' };

export default function PhoneLogin() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<AuthMode>(params.mode === 'signup' ? 'signup' : 'login');
  const [wrongMode, setWrongMode] = useState(false);
  const text = MODE_TEXT[mode];
  const markets = useMarkets();
  const countries = useMemo(() => phoneCountries(markets.data ?? []), [markets.data]);
  const [picked, setPicked] = useState<PhoneCountry | null>(null);
  const country = picked ?? countries[0] ?? FALLBACK;
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | undefined>();

  // Same rule as email: log in only with an existing account, sign up only with a new number.
  const send = useMutation({
    mutationFn: async ({ e164, as, checked }: { e164: string; as: AuthMode; checked: boolean }) => {
      if (!checked) {
        const exists = await accountExists({ phone: e164 });
        if ((as === 'login' && !exists) || (as === 'signup' && exists)) return { e164, wrong: true };
      }
      const { error: e } = await supabase.auth.signInWithOtp({ phone: e164, options: { shouldCreateUser: as === 'signup' } });
      if (e) throw e;
      return { e164, wrong: false };
    },
    onSuccess: ({ e164, wrong }) => {
      if (wrong) setWrongMode(true);
      else router.push({ pathname: '/otp', params: { phone: e164 } });
    },
  });
  const switchMode = () => {
    const e164 = normalizePhone(phone, country.dialCode);
    if (!e164) return;
    const next: AuthMode = mode === 'login' ? 'signup' : 'login';
    setMode(next);
    setWrongMode(false);
    send.mutate({ e164, as: next, checked: true });
  };

  const onSubmit = () => {
    const e164 = normalizePhone(phone, country.dialCode);
    if (!e164) {
      setError(`Enter a valid mobile number, e.g. ${phonePlaceholder(country.dialCode)}`);
      return;
    }
    setError(undefined);
    setWrongMode(false);
    send.mutate({ e164, as: mode, checked: false });
  };

  return (
    <Screen footer={<Button title="Send code" onPress={onSubmit} loading={send.isPending} />}>
      <Header title={text.title} subtitle="We'll text you a 6-digit code." back />
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
      <PhoneInput
        value={phone}
        onChangeText={(v) => {
          setPhone(v);
          if (error) setError(undefined);
          if (wrongMode) setWrongMode(false);
        }}
        error={error}
        country={country}
        countries={countries}
        onChangeCountry={(c) => {
          setPicked(c);
          setError(undefined);
        }}
      />
      {wrongMode ? (
        <View style={{ gap: space.sm, marginBottom: space.md }}>
          <Notice text={`${text.wrongMode} phone number.`} />
          <Button title={text.switchTo} variant="dark" small onPress={switchMode} loading={send.isPending} style={{ alignSelf: 'flex-start' }} />
        </View>
      ) : null}
      <ErrorMessage error={send.error} />
      <Text style={type.small}>Standard SMS rates may apply.</Text>
      <Text style={styles.alt} onPress={() => router.replace({ pathname: '/email', params: { mode } })} accessibilityRole="button">
        Use my email instead
      </Text>
    </Screen>
  );
}

const styles = {
  tab: { fontFamily: fonts.semibold, fontSize: 15, color: colors.secondary, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' as const },
  tabOn: { color: colors.white, backgroundColor: colors.black, borderColor: colors.black },
  alt: { fontFamily: fonts.medium, fontSize: 15, color: colors.text, textDecorationLine: 'underline' as const, marginTop: space.lg },
};
