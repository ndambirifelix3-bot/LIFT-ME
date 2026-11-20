import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, space } from '@/theme';
import { friendlyError } from '@/lib/errors';
import { Button } from './Button';

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityLabel={label ?? 'Loading'}>
      <ActivityIndicator size="large" color={colors.black} />
      {label ? <Text style={styles.muted}>{label}</Text> : null}
    </View>
  );
}

export function EmptyState({ icon = 'car-outline', title, message, action, onAction }: {
  icon?: keyof typeof Ionicons.glyphMap; title: string; message?: string; action?: string; onAction?: () => void;
}) {
  return (
    <View style={styles.center}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={32} color={colors.black} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={[styles.muted, { textAlign: 'center' }]}>{message}</Text> : null}
      {action && onAction ? <Button title={action} onPress={onAction} style={{ marginTop: space.lg, alignSelf: 'stretch' }} /> : null}
    </View>
  );
}

export function ErrorMessage({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (!error) return null;
  return (
    <View style={styles.error} accessibilityRole="alert">
      <Ionicons name="alert-circle" size={18} color={colors.error} />
      <Text style={styles.errorText}>{friendlyError(error)}</Text>
      {onRetry ? <Text onPress={onRetry} style={styles.retry} accessibilityRole="button">Retry</Text> : null}
    </View>
  );
}

export function Notice({ text, tone = 'brand' }: { text: string; tone?: 'brand' | 'success' | 'error' }) {
  const bg = tone === 'brand' ? colors.brandBg : tone === 'success' ? colors.successBg : colors.errorBg;
  const fg = tone === 'brand' ? colors.text : tone === 'success' ? colors.success : colors.error;
  return (
    <View style={[styles.notice, { backgroundColor: bg }]}>
      <Text style={[styles.noticeText, { color: fg }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.sm, minHeight: 200 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.semibold, fontSize: 17, color: colors.text, marginTop: space.sm },
  muted: { fontFamily: fonts.regular, fontSize: 14, color: colors.secondary },
  error: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.errorBg,
    padding: space.md, borderRadius: radius.md, marginBottom: space.md,
  },
  errorText: { flex: 1, color: colors.error, fontFamily: fonts.medium, fontSize: 14 },
  retry: { color: colors.error, fontFamily: fonts.semibold, textDecorationLine: 'underline' },
  notice: { padding: space.md, borderRadius: radius.md, marginBottom: space.md },
  noticeText: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
});
