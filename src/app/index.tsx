import { Redirect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { ErrorMessage } from '@/components';
import { homeForProfile, useAuth } from '@/features/auth/AuthProvider';
import { isSupabaseConfigured } from '@/lib/supabase';
import { colors, fonts } from '@/theme';

/** Splash: decides where each user goes based on their session and role. */
export default function Splash() {
  const { session, initializing, profile, profileLoading } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.logo}>Lift Me</Text>
        <View style={{ padding: 24 }}>
          <ErrorMessage error="App not configured: copy .env.example to .env and add your Supabase URL and anon key, then restart." />
        </View>
      </View>
    );
  }

  if (initializing || (session && profileLoading)) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.logo}>Lift Me</Text>
        <Text style={styles.tag}>Move with confidence.</Text>
      </View>
    );
  }

  if (!session) return <Redirect href="/welcome" />;
  return <Redirect href={homeForProfile(profile)} />;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  logo: { fontFamily: fonts.bold, fontSize: 40, color: colors.gold, letterSpacing: -1 },
  tag: { fontFamily: fonts.regular, fontSize: 15, color: colors.ivory, marginTop: 8 },
});
