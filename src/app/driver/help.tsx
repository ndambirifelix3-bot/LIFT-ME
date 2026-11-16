import { useLocalSearchParams } from 'expo-router';
import { Header, Screen } from '@/components';
import { HelpContent } from '@/features/support/HelpContent';

export default function DriverHelp() {
  const { rideId } = useLocalSearchParams<{ rideId?: string }>();
  return (
    <Screen>
      <Header title="Help & safety" back />
      <HelpContent rideId={rideId} />
    </Screen>
  );
}
