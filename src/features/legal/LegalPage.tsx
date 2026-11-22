import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Header, Notice, Screen } from '@/components';
import { colors, fonts, space, type } from '@/theme';
import { LEGAL, LEGAL_IS_DRAFT, LEGAL_UPDATED, type Section } from './content';

/** A legal page (Privacy Policy, Terms of Use): public, no login needed. */
export function LegalPage({ title, sections, other }: { title: string; sections: Section[]; other: { href: '/privacy' | '/terms'; label: string } }) {
  return (
    <Screen>
      <Header title={title} subtitle={`Last updated ${LEGAL_UPDATED}`} back />
      {LEGAL_IS_DRAFT ? <Notice text="Draft: this text is being reviewed by our lawyers and may change before launch." /> : null}
      {sections.map((s, i) => (
        <View key={s.title} nativeID={s.id} style={{ marginTop: space.lg }}>
          <Text style={styles.h} accessibilityRole="header">{i + 1}. {s.title}</Text>
          {s.body.map((b, j) =>
            typeof b === 'string' ? (
              <Text key={j} style={styles.p}>{b}</Text>
            ) : (
              <View key={j} style={{ marginBottom: space.sm }}>
                {b.list.map((item) => (
                  <View key={item} style={styles.li}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={[styles.p, { flex: 1, marginBottom: 0 }]}>{item}</Text>
                  </View>
                ))}
              </View>
            ),
          )}
        </View>
      ))}
      <View style={styles.footer}>
        <Text style={type.small}>Questions? {LEGAL.email}</Text>
        <Link href={other.href} style={styles.link}>{other.label}</Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h: { fontFamily: fonts.semibold, fontSize: 17, color: colors.text, marginBottom: space.sm },
  p: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.text, marginBottom: space.sm },
  li: { flexDirection: 'row', gap: space.sm, marginBottom: 6, paddingLeft: space.xs },
  bullet: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 22, color: colors.text },
  footer: { marginTop: space.xl, paddingTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, gap: space.sm, marginBottom: space.xl },
  link: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text, textDecorationLine: 'underline' },
});
