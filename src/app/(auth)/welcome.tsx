import { Link, Redirect, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Logo } from '@/components';
import { homeForProfile, useAuth } from '@/features/auth/AuthProvider';
import { InstallApp } from '@/features/pwa/InstallApp';
import { colors, fonts, space } from '@/theme';

/**
 * Phone login needs a paid SMS service. Set EXPO_PUBLIC_PHONE_LOGIN=off (Cloudflare build variable)
 * to hide the phone option from real users until SMS is connected; test numbers still work at /phone.
 */
const PHONE_LOGIN = process.env.EXPO_PUBLIC_PHONE_LOGIN !== 'off';

export default function Welcome() {
  const { session, profile } = useAuth();
  if (session && profile) return <Redirect href={homeForProfile(profile)} />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <Logo width={280} />
        <Text style={styles.copy}>Safe, reliable rides in your city. Book in seconds and track your driver live.</Text>
      </View>
      <View style={styles.bottom}>
        <Button title="Continue with email" onPress={() => router.push('/email')} />
        {PHONE_LOGIN ? (
          <Text style={styles.alt} onPress={() => router.push('/phone')} accessibilityRole="button">
            Use my phone number instead
          </Text>
        ) : null}
        <InstallApp tone="dark" />
        <Text style={styles.legal}>
          By continuing you agree to the Lift Me <Link href="/terms" style={styles.legalLink}>Terms of Use</Link> and{' '}
          <Link href="/privacy" style={styles.legalLink}>Privacy Policy</Link>.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.black, padding: space.xl, justifyContent: 'space-between' },
  top: { flex: 1, justifyContent: 'center', alignItems: 'center', maxWidth: 480, width: '100%', alignSelf: 'center' },
  copy: { fontFamily: fonts.regular, fontSize: 16, color: colors.ivory, marginTop: space.xl, lineHeight: 23, opacity: 0.85, textAlign: 'center' },
  bottom: { gap: space.md, maxWidth: 480, width: '100%', alignSelf: 'center' },
  alt: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white, textAlign: 'center', textDecorationLine: 'underline', paddingVertical: space.xs },
  legal: { fontFamily: fonts.regular, fontSize: 12, color: colors.ivory, opacity: 0.75, textAlign: 'center', lineHeight: 18 },
  legalLink: { textDecorationLine: 'underline', fontFamily: fonts.semibold },
});
