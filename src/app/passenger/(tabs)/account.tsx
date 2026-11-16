import { router } from 'expo-router';
import { Header, ListItem, Screen, SectionTitle } from '@/components';
import { AccountBasics } from '@/features/auth/AccountActions';

export default function PassengerAccount() {
  return (
    <Screen>
      <Header title="Account" />
      <AccountBasics />
      <SectionTitle>Support</SectionTitle>
      <ListItem icon="help-buoy-outline" title="Help & safety" subtitle="Report a problem, emergency numbers" onPress={() => router.push('/passenger/help')} />
    </Screen>
  );
}
