import { Redirect, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Logo } from '@/components';
import { homeForProfile, useAuth } from '@/features/auth/AuthProvider';
import { colors, fonts, space } from '@/theme';

export default function Welcome() {
  const { session, profile } = useAuth();
  if (session && profile) return <Redirect href={homeForProfile(profile)} />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <Logo width={280} />
        <Text style={styles.copy}>Safe, reliable rides across Nairobi. Pay with M-Pesa or cash.</Text>
      </View>
      <View style={styles.bottom}>
        <Button title="Get started" onPress={() => router.push('/phone')} />
        <Text style={styles.legal}>By continuing you agree to the Lift Me Terms and Privacy Policy.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.black, padding: space.xl, justifyContent: 'space-between' },
  top: { flex: 1, justifyContent: 'center', alignItems: 'center', maxWidth: 480, width: '100%', alignSelf: 'center' },
  copy: { fontFamily: fonts.regular, fontSize: 16, color: colors.ivory, marginTop: space.xl, lineHeight: 23, opacity: 0.85, textAlign: 'center' },
  bottom: { gap: space.md, maxWidth: 480, width: '100%', alignSelf: 'center' },
  legal: { fontFamily: fonts.regular, fontSize: 12, color: colors.ivory, opacity: 0.6, textAlign: 'center' },
});
