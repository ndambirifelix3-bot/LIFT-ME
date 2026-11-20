import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { flagEmoji, phonePlaceholder } from '@/lib/phone';
import { colors, fonts, radius, space } from '@/theme';

export type PhoneCountry = { dialCode: string; countryIso: string };

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  /** The selected country code, e.g. '+254'. */
  country: PhoneCountry;
  /** Countries people can pick from (only those where Lift Me runs). One entry = no picker. */
  countries?: PhoneCountry[];
  onChangeCountry?: (c: PhoneCountry) => void;
};

/** Phone number box with the country code in front; tap the code to switch country. */
export function PhoneInput({ value, onChangeText, error, country, countries = [], onChangeCountry }: Props) {
  const [open, setOpen] = useState(false);
  const canPick = countries.length > 1 && !!onChangeCountry;

  return (
    <View style={{ marginBottom: space.lg }}>
      <Text style={styles.label}>Phone number</Text>
      <View style={[styles.row, !!error && { borderColor: colors.error }]}>
        <Pressable
          onPress={() => canPick && setOpen((o) => !o)}
          disabled={!canPick}
          style={styles.prefix}
          accessibilityRole={canPick ? 'button' : undefined}
          accessibilityLabel={canPick ? `Country code ${country.dialCode}. Tap to change` : `Country code ${country.dialCode}`}
        >
          <Text style={styles.flag}>{flagEmoji(country.countryIso)}</Text>
          <Text style={styles.code}>{country.dialCode}</Text>
          {canPick ? <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.secondary} /> : null}
        </Pressable>
        <TextInput
          value={value}
          onChangeText={(t) => onChangeText(t.replace(/[^\d ()+-]/g, ''))}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          placeholder={phonePlaceholder(country.dialCode)}
          placeholderTextColor={colors.secondary}
          maxLength={18}
          style={styles.input}
          accessibilityLabel="Phone number"
          autoFocus
        />
      </View>
      {open ? (
        <View style={styles.menu} accessibilityRole="menu">
          {countries.map((c) => (
            <Pressable
              key={c.dialCode}
              onPress={() => {
                onChangeCountry?.(c);
                setOpen(false);
              }}
              style={({ pressed }) => [styles.option, c.dialCode === country.dialCode && styles.optionOn, pressed && { opacity: 0.7 }]}
              accessibilityRole="menuitem"
            >
              <Text style={styles.flag}>{flagEmoji(c.countryIso)}</Text>
              <Text style={styles.code}>{c.dialCode}</Text>
              {c.dialCode === country.dialCode ? <Ionicons name="checkmark" size={18} color={colors.text} style={{ marginLeft: 'auto' }} /> : null}
            </Pressable>
          ))}
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.secondary, marginBottom: 6 },
  row: { flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.white, overflow: 'hidden' },
  prefix: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, paddingHorizontal: 12, borderRightWidth: 1, borderRightColor: colors.border, gap: 6 },
  flag: { fontSize: 18 },
  code: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  input: { flex: 1, minWidth: 0, outlineWidth: 0, minHeight: 52, paddingHorizontal: 14, fontFamily: fonts.medium, fontSize: 18, color: colors.text, letterSpacing: 0.5 },
  menu: { marginTop: 6, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.white, overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: 14, minHeight: 48 },
  optionOn: { backgroundColor: colors.brandBg },
  error: { color: colors.error, fontFamily: fonts.regular, fontSize: 13, marginTop: 4 },
});
