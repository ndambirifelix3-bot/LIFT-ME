import type { ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, space } from '@/theme';

export function AdminPage({ title, subtitle, children, onRefresh, refreshing = false, actions }: {
  title: string; subtitle?: string; children: ReactNode; onRefresh?: () => void; refreshing?: boolean; actions?: ReactNode;
}) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
    >
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} accessibilityRole="header">{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {actions}
      </View>
      {children}
    </ScrollView>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </View>
  );
}

export function Table({ headers, rows, onRowPress }: { headers: string[]; rows: ReactNode[][]; onRowPress?: (i: number) => void }) {
  return (
    <ScrollView horizontal style={styles.table} contentContainerStyle={{ minWidth: '100%' }}>
      <View style={{ flex: 1, minWidth: 720 }}>
        <View style={[styles.tr, styles.th]}>
          {headers.map((h) => <Text key={h} style={[styles.td, styles.thText]}>{h}</Text>)}
        </View>
        {rows.map((cells, i) => (
          <Pressable
            key={i}
            onPress={onRowPress ? () => onRowPress(i) : undefined}
            disabled={!onRowPress}
            style={({ pressed }) => [styles.tr, styles.rowWrap, pressed && { backgroundColor: colors.ivory }]}
            accessibilityRole={onRowPress ? 'link' : undefined}
          >
            {cells.map((c, j) => (
              <View key={j} style={styles.td}>{typeof c === 'string' || typeof c === 'number' ? <Text style={styles.tdText}>{c}</Text> : c}</View>
            ))}
          </Pressable>
        ))}
        {rows.length === 0 ? <Text style={[styles.tdText, { padding: space.lg, color: colors.secondary }]}>Nothing here yet.</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.md, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm, flexWrap: 'wrap' },
  title: { fontFamily: fonts.bold, fontSize: 26, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, color: colors.secondary, marginTop: 4 },
  stat: { flexGrow: 1, flexBasis: 200, backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: space.lg },
  statLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.secondary },
  statValue: { fontFamily: fonts.bold, fontSize: 28, color: colors.text, marginTop: 6 },
  statHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.secondary, marginTop: 4 },
  table: { backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  rowWrap: { borderTopWidth: 1, borderTopColor: colors.border },
  tr: { flexDirection: 'row', alignItems: 'center' },
  th: { backgroundColor: colors.ivory },
  td: { flex: 1, paddingVertical: 12, paddingHorizontal: 12 },
  thText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.secondary, textTransform: 'uppercase' },
  tdText: { fontFamily: fonts.regular, fontSize: 14, color: colors.text },
});
