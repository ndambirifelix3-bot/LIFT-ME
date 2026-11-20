import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, space } from '@/theme';

type Props = { title: string; subtitle?: string; back?: boolean; right?: ReactNode };

export function Header({ title, subtitle, back, right }: Props) {
  return (
    <View style={styles.wrap}>
      {back ? (
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md, marginBottom: space.sm, gap: space.sm },
  back: { marginLeft: -6, padding: 4 },
  title: { fontFamily: fonts.bold, fontSize: 24, color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, color: colors.secondary, marginTop: 2 },
});
