import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, ErrorMessage, Input, ListItem, Notice, Row } from '@/components';
import { confirm } from '@/lib/confirm';
import { formatPhoneForDisplay } from '@/lib/phone';
import { supabase } from '@/lib/supabase';
import { space, type } from '@/theme';
import { InstallApp } from '@/features/pwa/InstallApp';
import { NotificationsCard } from '@/features/pwa/NotificationsCard';
import { useAuth } from './AuthProvider';


/** Name, phone, logout and delete-account request — shared by passenger and driver. */
export function AccountBasics() {
  const { profile, refreshProfile, signOut } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? '');

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('profiles').update({ full_name: name.trim() }).eq('id', profile!.id);
      if (error) throw error;
    },
    onSuccess: () => refreshProfile(),
  });
  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('request_account_deletion');
      if (error) throw error;
    },
    onSuccess: () => refreshProfile(),
  });

  if (!profile) return null;
  return (
    <>
      <Card>
        <Input label="Full name" value={name} onChangeText={setName} autoCapitalize="words" maxLength={100} />
        <Row label="Phone" value={formatPhoneForDisplay(profile.phone)} />
        <Text style={[type.small, { marginBottom: space.md }]}>To change your phone number, contact support.</Text>
        <ErrorMessage error={save.error} />
        {save.isSuccess ? <Notice tone="success" text="Saved." /> : null}
        <Button title="Save" variant="dark" small disabled={name.trim().length < 3 || name.trim() === profile.full_name} loading={save.isPending} onPress={() => save.mutate()} />
      </Card>
      <NotificationsCard role={profile.role === 'driver' ? 'driver' : 'passenger'} />
      <InstallApp />
      <Card>
        <ListItem icon="shield-checkmark-outline" title="Privacy Policy" onPress={() => router.push('/privacy')} />
        <ListItem icon="document-text-outline" title="Terms of Use" onPress={() => router.push('/terms')} />
      </Card>
      <Button title="Log out" variant="outline" onPress={() => confirm('Log out?', 'You will need a new SMS code to log in again.', signOut)} />
      <ErrorMessage error={del.error} />
      {profile.delete_requested_at ? (
        <Notice text="Your account deletion request has been received. Our team will contact you to complete it." />
      ) : (
        <Button
          title="Request account deletion"
          variant="ghost"
          style={{ marginTop: space.sm }}
          onPress={() => confirm('Delete your account?', 'We will delete your account and personal data, except records we must keep by law (e.g. payments).', () => del.mutate())}
        />
      )}
    </>
  );
}
