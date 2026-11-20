import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text } from 'react-native';
import { Button, ErrorMessage, Header, PhoneInput, Screen } from '@/components';
import type { PhoneCountry } from '@/components/PhoneInput';
import { useMutation } from '@tanstack/react-query';
import { phoneCountries, useMarkets } from '@/features/markets';
import { normalizePhone, phonePlaceholder } from '@/lib/phone';
import { supabase } from '@/lib/supabase';
import { type } from '@/theme';

// Used only until the list of markets has loaded (or if it can't load).
const FALLBACK: PhoneCountry = { dialCode: '+254', countryIso: 'ke' };

export default function PhoneLogin() {
  const markets = useMarkets();
  const countries = useMemo(() => phoneCountries(markets.data ?? []), [markets.data]);
  const [picked, setPicked] = useState<PhoneCountry | null>(null);
  const country = picked ?? countries[0] ?? FALLBACK;
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | undefined>();

  const send = useMutation({
    mutationFn: async (e164: string) => {
      const { error: e } = await supabase.auth.signInWithOtp({ phone: e164 });
      if (e) throw e;
      return e164;
    },
    onSuccess: (e164) => router.push({ pathname: '/otp', params: { phone: e164 } }),
  });

  const onSubmit = () => {
    const e164 = normalizePhone(phone, country.dialCode);
    if (!e164) {
      setError(`Enter a valid mobile number, e.g. ${phonePlaceholder(country.dialCode)}`);
      return;
    }
    setError(undefined);
    send.mutate(e164);
  };

  return (
    <Screen footer={<Button title="Send code" onPress={onSubmit} loading={send.isPending} />}>
      <Header title="Your phone number" subtitle="We'll text you a 6-digit code to log in." back />
      <PhoneInput
        value={phone}
        onChangeText={(v) => {
          setPhone(v);
          if (error) setError(undefined);
        }}
        error={error}
        country={country}
        countries={countries}
        onChangeCountry={(c) => {
          setPicked(c);
          setError(undefined);
        }}
      />
      <ErrorMessage error={send.error} />
      <Text style={type.small}>Standard SMS rates may apply.</Text>
    </Screen>
  );
}
