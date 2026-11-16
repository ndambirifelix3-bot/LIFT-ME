import { Stack } from 'expo-router';
import { RoleGate } from '@/features/auth/RoleGate';
import { colors } from '@/theme';

export default function PassengerLayout() {
  return (
    <RoleGate role="passenger">
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ivory } }} />
    </RoleGate>
  );
}
