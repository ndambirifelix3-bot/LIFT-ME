import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts, radius, space } from '@/theme';

type Props = { value: string; onChangeText: (v: string) => void; error?: string; countryCode?: string };

/** Kenyan phone input: +254 prefix fixed, user types 7XX XXX XXX or 07XX XXX XXX. */
export function PhoneInput({ value, onChangeText, error, countryCode = '+254' }: Props) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <Text style={styles.label}>Phone number</Text>
      <View style={[styles.row, !!error && { borderColor: colors.error }]}>
        <View style={styles.prefix}>
          <Text style={styles.flag}>🇰🇪</Text>
          <Text style={styles.code}>{countryCode}</Text>
        </View>
        <TextInput
          value={value}
          onChangeText={(t) => onChangeText(t.replace(/[^\d ]/g, ''))}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          placeholder="712 345 678"
          placeholderTextColor={colors.secondary}
          maxLength={13}
          style={styles.input}
          accessibilityLabel="Phone number"
          autoFocus
        />
      </View>
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
  error: { color: colors.error, fontFamily: fonts.regular, fontSize: 13, marginTop: 4 },
});
