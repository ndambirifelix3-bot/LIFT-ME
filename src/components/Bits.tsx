import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, space } from '@/theme';

export function Row({ label, value, bold }: { label: string; value: ReactNode; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text style={[styles.rowValue, bold && { fontFamily: fonts.bold }]}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

const PILL: Record<string, { bg: string; fg: string }> = {
  good: { bg: colors.successBg, fg: colors.success },
  bad: { bg: colors.errorBg, fg: colors.error },
  wait: { bg: colors.goldBg, fg: colors.text },
  neutral: { bg: colors.ivory, fg: colors.secondary },
};

export function Pill({ text, tone = 'neutral' }: { text: string; tone?: keyof typeof PILL }) {
  return (
    <View style={[styles.pill, { backgroundColor: PILL[tone].bg }]}>
      <Text style={[styles.pillText, { color: PILL[tone].fg }]}>{text}</Text>
    </View>
  );
}

export function toneForStatus(status: string): keyof typeof PILL {
  if (['completed', 'approved', 'paid', 'resolved'].includes(status)) return 'good';
  if (['cancelled', 'rejected', 'failed', 'suspended', 'no_driver_found'].includes(status)) return 'bad';
  if (['searching', 'pending', 'accepted', 'arrived', 'in_progress', 'open'].includes(status)) return 'wait';
  return 'neutral';
}

export function Stars({ value, onChange, size = 30 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange?.(n)} disabled={!onChange} accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`} hitSlop={4}>
          <Ionicons name={n <= value ? 'star' : 'star-outline'} size={size} color={colors.gold} />
        </Pressable>
      ))}
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

export function ListItem({ title, subtitle, right, onPress, icon }: {
  title: string; subtitle?: string; right?: ReactNode; onPress?: () => void; icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]} accessibilityRole={onPress ? 'button' : undefined}>
      {icon ? <Ionicons name={icon} size={22} color={colors.text} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.itemSub} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {right}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.secondary} /> : null}
    </Pressable>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.section}>{children}</Text>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, gap: space.md },
  rowLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.secondary },
  rowValue: { fontFamily: fonts.medium, fontSize: 15, color: colors.text, flexShrink: 1, textAlign: 'right' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  pillText: { fontFamily: fonts.semibold, fontSize: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  chipSelected: { backgroundColor: colors.black, borderColor: colors.black },
  chipText: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  itemTitle: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  itemSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.secondary, marginTop: 2 },
  section: {
    fontFamily: fonts.semibold, fontSize: 13, color: colors.secondary, textTransform: 'uppercase',
    letterSpacing: 0.6, marginTop: space.lg, marginBottom: space.sm,
  },
});
