import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, ErrorMessage, Header, Notice, Screen } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius, space } from '@/theme';

type Choice = 'passenger' | 'driver';

export default function ChooseRole() {
  const { session, profile, refreshProfile } = useAuth();
  const [choice, setChoice] = useState<Choice | null>(null);

  const save = useMutation({
    mutationFn: async (role: Choice) => {
      // Server-side function: allows passenger/driver ONCE; never admin.
      const { error } = await supabase.rpc('choose_role', { p_role: role });
      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshProfile();
      router.replace('/');
    },
  });

  if (!session) return <Redirect href="/welcome" />;
  if (profile?.role_chosen) return <Redirect href="/" />;

  const option = (value: Choice, icon: keyof typeof Ionicons.glyphMap, title: string, text: string) => (
    <Pressable
      onPress={() => setChoice(value)}
      accessibilityRole="radio"
      accessibilityState={{ checked: choice === value }}
      style={[styles.option, choice === value && styles.selected]}
    >
      <Ionicons name={icon} size={28} color={choice === value ? colors.brand : colors.text} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.optTitle, choice === value && { color: colors.white }]}>{title}</Text>
        <Text style={[styles.optText, choice === value && { color: colors.ivory }]}>{text}</Text>
      </View>
    </Pressable>
  );

  return (
    <Screen
      footer={<Button title="Continue" disabled={!choice} loading={save.isPending} onPress={() => choice && save.mutate(choice)} />}
    >
      <Header title="How will you use Lift Me?" />
      {option('passenger', 'person-outline', 'I need rides', 'Book rides, track your driver live and pay easily.')}
      {option('driver', 'car-sport-outline', 'I want to drive', 'Apply to drive with Lift Me and earn on your schedule.')}
      <Notice text="You can only choose once. Contact support if you need to change it later." />
      <ErrorMessage error={save.error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.lg, borderRadius: radius.lg,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, marginBottom: space.md,
  },
  selected: { backgroundColor: colors.black, borderColor: colors.black },
  optTitle: { fontFamily: fonts.semibold, fontSize: 17, color: colors.text },
  optText: { fontFamily: fonts.regular, fontSize: 14, color: colors.secondary, marginTop: 4, lineHeight: 19 },
});
