import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { withMonitoring } from '@/lib/monitoring'; // error alerts: starts before anything else runs
import '@/features/driver/tracking'; // registers the background location task at startup
import '@/features/pwa/pwa'; // web only: service worker + install prompt, must start early
import { ExitGuard } from '@/features/pwa/ExitGuard';
import { UpdateBanner } from '@/features/pwa/UpdateBanner';
import '@/features/pwa/updates'; // web only: recover from old cached versions, offer updates
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 2, staleTime: 15_000, refetchOnWindowFocus: true },
          mutations: { retry: 0 },
        },
      }),
  );

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded, fontError]);

  // On the web, show the app straight away; text switches to Inter as soon as it arrives.
  if (!fontsLoaded && !fontError && Platform.OS !== 'web') return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          <ExitGuard />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ivory } }} />
          <UpdateBanner />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

// A crashed screen shows "Something went wrong / Try again" (or updates itself) instead of going blank.
export { AppErrorScreen as ErrorBoundary } from '@/features/pwa/AppErrorScreen';

// Reports crashes in any screen to Sentry (does nothing until a Sentry DSN is set).
export default withMonitoring(RootLayout);
