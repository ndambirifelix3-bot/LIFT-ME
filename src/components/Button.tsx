import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { colors, fonts, radius } from '@/theme';

type Variant = 'primary' | 'dark' | 'outline' | 'ghost' | 'danger';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  small?: boolean;
  accessibilityHint?: string;
};

export function Button({ title, onPress, variant = 'primary', loading, disabled, style, small, accessibilityHint }: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        variantStyles[variant].box,
        pressed && variant === 'primary' && { backgroundColor: colors.brandPressed },
        pressed && variant !== 'primary' && { opacity: 0.8 },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles[variant].text.color} />
      ) : (
        <Text style={[styles.text, small && styles.smallText, variantStyles[variant].text]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  small: { minHeight: 38, paddingHorizontal: 14, borderRadius: radius.sm },
  text: { fontFamily: fonts.semibold, fontSize: 16 },
  smallText: { fontSize: 14 },
  disabled: { opacity: 0.5 },
});

const variantStyles: Record<Variant, { box: ViewStyle; text: { color: string } }> = {
  primary: { box: { backgroundColor: colors.brand }, text: { color: colors.black } },
  dark: { box: { backgroundColor: colors.black }, text: { color: colors.white } },
  outline: { box: { borderWidth: 1, borderColor: colors.black, backgroundColor: 'transparent' }, text: { color: colors.black } },
  ghost: { box: { backgroundColor: 'transparent' }, text: { color: colors.text } },
  danger: { box: { borderWidth: 1, borderColor: colors.error, backgroundColor: 'transparent' }, text: { color: colors.error } },
};
