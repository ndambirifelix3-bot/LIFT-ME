import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, Slot, usePathname } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '@/components';
import { RoleGate } from '@/features/auth/RoleGate';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors, fonts, space } from '@/theme';

const NAV = [
  { href: '/admin', label: 'Overview', icon: 'grid-outline' },
  { href: '/admin/drivers', label: 'Drivers', icon: 'car-outline' },
  { href: '/admin/money', label: 'Driver money', icon: 'wallet-outline' },
  { href: '/admin/rides', label: 'Rides', icon: 'navigate-outline' },
  { href: '/admin/pricing', label: 'Pricing', icon: 'pricetag-outline' },
  { href: '/admin/markets', label: 'Markets', icon: 'globe-outline' },
  { href: '/admin/users', label: 'Users', icon: 'people-outline' },
  { href: '/admin/reports', label: 'Reports', icon: 'chatbubbles-outline' },
] as const;

/** Admin dashboard (built for the web browser): sidebar on wide screens, top bar on narrow ones. */
export default function AdminLayout() {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const path = usePathname();
  const { signOut } = useAuth();

  const links = NAV.map((n) => {
    const active = n.href === '/admin' ? path === '/admin' : path.startsWith(n.href);
    return (
      <Link key={n.href} href={n.href} asChild>
        {/* Link asChild hands this style to a browser <a> on web, which crashes on a style array — flatten it. */}
        <Pressable style={StyleSheet.flatten([styles.link, active && styles.linkActive, !wide && styles.linkNarrow])} accessibilityRole="link">
          <Ionicons name={n.icon} size={18} color={active ? colors.black : colors.ivory} />
          <Text style={[styles.linkText, active && { color: colors.black }]}>{n.label}</Text>
        </Pressable>
      </Link>
    );
  });

  return (
    <RoleGate role="admin">
      <SafeAreaView style={[styles.wrap, { flexDirection: wide ? 'row' : 'column' }]} edges={['top', 'left', 'right']}>
        <View style={[styles.side, wide ? styles.sideWide : styles.sideNarrow]}>
          <View style={styles.brandRow}>
            <Logo variant="mark" width={34} />
            <Text style={styles.brand}>Lift Me <Text style={{ color: colors.ivory, fontFamily: fonts.regular }}>Admin</Text></Text>
          </View>
          {wide ? (
            <View style={{ gap: 4, marginTop: space.xl, flex: 1 }}>{links}</View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>{links}</ScrollView>
          )}
          <Pressable onPress={signOut} style={[styles.link, !wide && styles.linkNarrow]} accessibilityRole="button">
            <Ionicons name="log-out-outline" size={18} color={colors.ivory} />
            <Text style={styles.linkText}>Log out</Text>
          </Pressable>
        </View>
        <View style={{ flex: 1 }}>
          <Slot />
        </View>
      </SafeAreaView>
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.ivory },
  side: { backgroundColor: colors.black, padding: space.lg },
  sideWide: { width: 230 },
  sideNarrow: { gap: space.sm, paddingVertical: space.md },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  brand: { fontFamily: fonts.bold, fontSize: 20, color: colors.brand },
  link: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  linkNarrow: { paddingVertical: 8 },
  linkActive: { backgroundColor: colors.brand },
  linkText: { fontFamily: fonts.medium, fontSize: 14, color: colors.ivory },
});
