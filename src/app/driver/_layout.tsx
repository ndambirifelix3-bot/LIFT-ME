import { Stack } from 'expo-router';
import { RoleGate } from '@/features/auth/RoleGate';
import { colors } from '@/theme';

export default function DriverLayout() {
  return (
    <RoleGate role="driver">
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ivory } }} />
    </RoleGate>
  );
}
