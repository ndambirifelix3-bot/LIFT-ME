import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, ErrorMessage, Input, Notice, OTPInput, PhoneInput, Row } from '@/components';
import type { PhoneCountry } from '@/components/PhoneInput';
import { phoneCountries, useMarkets } from '@/features/markets';
import { looksLikeEmail } from '@/lib/email';
import { formatPhoneForDisplay, normalizePhone, phonePlaceholder } from '@/lib/phone';
import { supabase } from '@/lib/supabase';
import { space, type } from '@/theme';
import { useAuth } from './AuthProvider';

/**
 * Email and phone on the Account screen.
 * - Email: add or change it with a 6-digit code, so the same account can be opened with the email.
 * - Phone: people who log in with a phone see it (it can't be changed here). People who log in by email
 *   can add a contact phone so drivers / passengers can call them.
 */
export function ContactDetails() {
  const { session, profile, refreshProfile } = useAuth();
  const loginPhone = session?.user.phone;
  const [editing, setEditing] = useState<'email' | 'phone' | null>(null);
  if (!profile) return null;

  const done = async () => {
    setEditing(null);
    await supabase.auth.refreshSession();
    await refreshProfile();
  };

  return (
    <Card>
      <Row label="Email" value={profile.email ?? 'Not added'} />
      {editing === 'email' ? (
        <EmailForm current={profile.email} onDone={done} onCancel={() => setEditing(null)} />
      ) : (
        <Button
          title={profile.email ? 'Change email' : 'Add email'}
          variant="outline"
          small
          style={{ alignSelf: 'flex-start', marginBottom: space.md }}
          onPress={() => setEditing('email')}
        />
      )}
      <Row label="Phone" value={profile.phone ? formatPhoneForDisplay(profile.phone) : 'Not added'} />
      {loginPhone ? (
        <Text style={type.small}>This is the number you log in with. To change it, contact support.</Text>
      ) : editing === 'phone' ? (
        <ContactPhoneForm onDone={done} onCancel={() => setEditing(null)} />
      ) : (
        <>
          <Text style={[type.small, { marginBottom: space.sm }]}>So your driver or passenger can call you during a trip.</Text>
          <Button
            title={profile.phone ? 'Change phone' : 'Add phone'}
            variant="outline"
            small
            style={{ alignSelf: 'flex-start' }}
            onPress={() => setEditing('phone')}
          />
        </>
      )}
    </Card>
  );
}

/** New email -> code sent to it -> type the code -> the email now opens this account. */
function EmailForm({ current, onDone, onCancel }: { current: string | null; onDone: () => void; onCancel: () => void }) {
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();

  const send = useMutation({
    mutationFn: async () => {
      const address = email.trim().toLowerCase();
      if (!looksLikeEmail(address)) throw new Error('Enter a valid email, e.g. name@gmail.com');
      if (address === current) throw new Error('That is already your email.');
      const { error: e } = await supabase.auth.updateUser({ email: address });
      if (e) throw e;
      return address;
    },
    onSuccess: (address) => setSentTo(address),
  });

  const verify = useMutation({
    mutationFn: async () => {
      const { error: e } = await supabase.auth.verifyOtp({ email: sentTo!, token: code, type: 'email_change' });
      if (e) throw e;
    },
    onSuccess: onDone,
    onError: () => setError('That code is not right or has expired. Check the email and try again.'),
  });

  if (sentTo) {
    return (
      <View style={{ marginBottom: space.md }}>
        <Text style={[type.small, { marginBottom: space.sm }]}>We emailed a 6-digit code to {sentTo}. Enter it here:</Text>
        <OTPInput value={code} onChange={(v) => { setCode(v); setError(undefined); }} error={!!error} />
        <ErrorMessage error={error} />
        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
          <Button title="Confirm" small variant="dark" disabled={code.length !== 6} loading={verify.isPending} onPress={() => verify.mutate()} />
          <Button title="Cancel" small variant="ghost" onPress={onCancel} />
        </View>
      </View>
    );
  }
  return (
    <View style={{ marginBottom: space.md }}>
      <Input label="Email address" value={email} onChangeText={setEmail} placeholder="name@gmail.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
      <ErrorMessage error={send.error} />
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Button title="Send code" small variant="dark" loading={send.isPending} onPress={() => send.mutate()} />
        <Button title="Cancel" small variant="ghost" onPress={onCancel} />
      </View>
    </View>
  );
}

/** Contact phone for people who log in by email (for drivers it also sets their country). */
export function ContactPhoneForm({ onDone, onCancel, submitTitle = 'Save phone' }: { onDone: () => void; onCancel?: () => void; submitTitle?: string }) {
  const markets = useMarkets();
  const countries = useMemo(() => phoneCountries(markets.data ?? []), [markets.data]);
  const [picked, setPicked] = useState<PhoneCountry | null>(null);
  const country = picked ?? countries[0] ?? { dialCode: '+254', countryIso: 'ke' };
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string>();

  const save = useMutation({
    mutationFn: async () => {
      const e164 = normalizePhone(phone, country.dialCode);
      if (!e164) throw new Error(`Enter a valid number, e.g. ${phonePlaceholder(country.dialCode)}`);
      const { error: e } = await supabase.rpc('set_my_contact_phone', { p_phone: e164 });
      if (e) throw e;
    },
    onSuccess: onDone,
  });

  return (
    <View>
      <PhoneInput
        value={phone}
        onChangeText={(v) => { setPhone(v); setError(undefined); }}
        error={error}
        country={country}
        countries={countries}
        onChangeCountry={(c) => { setPicked(c); setPhone(''); }}
        autoFocus={false}
      />
      <ErrorMessage error={save.error} />
      {save.isSuccess ? <Notice tone="success" text="Saved." /> : null}
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Button title={submitTitle} small variant="dark" loading={save.isPending} onPress={() => save.mutate()} />
        {onCancel ? <Button title="Cancel" small variant="ghost" onPress={onCancel} /> : null}
      </View>
    </View>
  );
}
