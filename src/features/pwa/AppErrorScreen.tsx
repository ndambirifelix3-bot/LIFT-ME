import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { Platform, Text, View } from 'react-native';
import { Button } from '@/components';
import { reportError } from '@/lib/monitoring';
import { colors, space, type } from '@/theme';
import { isStaleCodeError, reloadForUpdate } from './updates';

/**
 * Shown instead of a blank screen when a screen crashes. If the cause is an old copy of the website
 * asking for a file a newer release removed, it reloads straight away to get the new version.
 */
export function AppErrorScreen({ error, retry }: ErrorBoundaryProps) {
  const stale = Platform.OS === 'web' && isStaleCodeError(error);
  useEffect(() => {
    if (stale && reloadForUpdate()) return;
    reportError(error);
  }, [error, stale]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, backgroundColor: colors.ivory }}>
      <Text style={[type.h2, { textAlign: 'center', marginBottom: space.sm }]}>{stale ? 'Updating Lift Me…' : 'Something went wrong'}</Text>
      <Text style={[type.body, { textAlign: 'center', marginBottom: space.xl }]}>
        {stale ? 'A new version is available. One moment.' : 'Please try again. If it keeps happening, close and reopen the app.'}
      </Text>
      <Button title="Try again" onPress={() => (Platform.OS === 'web' ? window.location.reload() : retry())} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}
