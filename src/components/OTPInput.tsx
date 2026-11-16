import { useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';
import { colors, fonts, radius } from '@/theme';

type Props = { value: string; onChange: (v: string) => void; length?: number; error?: boolean };

/** One hidden input + boxes; supports paste and SMS autofill. */
export function OTPInput({ value, onChange, length = 6, error }: Props) {
  const ref = useRef<TextInputInstance>(null);
  return (
    <Pressable onPress={() => ref.current?.focus()} accessibilityLabel="Verification code">
      <View style={styles.row}>
        {Array.from({ length }).map((_, i) => {
          const active = i === Math.min(value.length, length - 1);
          return (
            <View key={i} style={[styles.box, active && styles.active, error && styles.error]}>
              <Text style={styles.digit}>{value[i] ?? ''}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        autoFocus
        style={styles.hidden}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  box: {
    flex: 1, aspectRatio: 0.85, maxWidth: 56, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white,
  },
  active: { borderColor: colors.gold, borderWidth: 2 },
  error: { borderColor: colors.error },
  digit: { fontFamily: fonts.semibold, fontSize: 22, color: colors.text },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
});
