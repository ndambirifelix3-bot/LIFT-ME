import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import { colors, fonts, radius, space } from '@/theme';

export type InputProps = TextInputProps & { label?: string; error?: string; hint?: string };

export const Input = forwardRef<TextInputInstance, InputProps>(function Input({ label, error, hint, style, ...rest }, ref) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.secondary}
        accessibilityLabel={label}
        style={[styles.input, !!error && styles.inputError, rest.multiline && styles.multiline, style]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { marginBottom: space.lg },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.secondary, marginBottom: 6 },
  input: {
    minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.white,
    paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 16, color: colors.text, outlineWidth: 0,
  },
  multiline: { minHeight: 90, paddingTop: 12, textAlignVertical: 'top' },
  inputError: { borderColor: colors.error },
  error: { color: colors.error, fontFamily: fonts.regular, fontSize: 13, marginTop: 4 },
  hint: { color: colors.secondary, fontFamily: fonts.regular, fontSize: 13, marginTop: 4 },
});
