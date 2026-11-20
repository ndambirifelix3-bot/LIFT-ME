import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Button, Card, ErrorMessage, Notice } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors, space, type } from '@/theme';
import { InstallApp } from './InstallApp';
import { usePush } from './push';

const WHY = {
  driver: 'Get new ride requests and payment alerts, even when Lift Me is in the background.',
  passenger: 'Know the moment your driver accepts and arrives, even when Lift Me is in the background.',
} as const;

/**
 * Notification settings for this phone.
 * - `compact`: only shows something when there's an action to take (for home / trip screens).
 * - full (Account tab): also shows "on" with Send a test / Turn off.
 */
export function NotificationsCard({ role, compact = false }: { role: 'driver' | 'passenger'; compact?: boolean }) {
  const { session } = useAuth();
  const { state, on, off, test } = usePush(session?.user.id);

  if (!state) return null;
  if (state === 'unsupported') {
    return compact ? null : (
      <Notice text="This browser can't show notifications. Use Chrome on Android, or add Lift Me to your iPhone Home Screen." />
    );
  }
  if (state === 'needs-install') {
    return (
      <Card>
        <Header />
        <Text style={[type.small, { marginBottom: space.sm }]}>
          On iPhone, notifications work once Lift Me is on your Home Screen. Add it, open Lift Me from the Home Screen, then turn notifications on here.
        </Text>
        <InstallApp />
      </Card>
    );
  }
  if (state === 'blocked') {
    return (
      <Notice
        tone="error"
        text="Notifications are blocked for Lift Me. Allow them in your browser or phone settings (Site settings → Notifications), then come back."
      />
    );
  }
  if (state === 'off') {
    return (
      <Card style={{ borderColor: colors.brand, borderWidth: 2 }}>
        <Header />
        <Text style={[type.small, { marginBottom: space.md }]}>{WHY[role]}</Text>
        <ErrorMessage error={on.error} />
        <Button title="Turn on notifications" onPress={() => on.mutate()} loading={on.isPending} />
      </Card>
    );
  }
  if (compact) return null;
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm }}>
        <Ionicons name="notifications" size={20} color={colors.success} />
        <Text style={type.h3}>Notifications are on</Text>
      </View>
      <Text style={[type.small, { marginBottom: space.md }]}>{WHY[role]}</Text>
      <ErrorMessage error={test.error ?? off.error} />
      {test.isSuccess ? <Notice tone="success" text="Test sent — it should appear on this phone in a few seconds." /> : null}
      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
        <Button title="Send a test" small variant="dark" onPress={() => test.mutate()} loading={test.isPending} />
        <Button title="Turn off" small variant="outline" onPress={() => off.mutate()} loading={off.isPending} />
      </View>
    </Card>
  );
}

function Header() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm }}>
      <Ionicons name="notifications-outline" size={20} color={colors.text} />
      <Text style={type.h3}>Turn on notifications</Text>
    </View>
  );
}
