/**
 * "Exit Lift Me?" — web app only.
 * On Android, the phone's Back button on a home screen closes the installed web app straight away.
 * On the main screens (passenger home, driver home, admin, welcome) we keep one extra history step,
 * so Back first asks. "Cancel" keeps the app open; "OK" leaves.
 * The phone apps (iOS/Android builds) don't use this.
 */
import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

const HOME_SCREENS = new Set(['/', '/welcome', '/passenger', '/driver', '/admin']);
const GUARD = 'liftmeExitGuard';

function exitMessage(path: string): string {
  if (path.startsWith('/driver')) return 'Exit Lift Me?\n\nWhile Lift Me is closed you won\'t get ride requests.';
  return 'Exit Lift Me?';
}

export function ExitGuard() {
  const path = usePathname();
  const isHome = HOME_SCREENS.has(path);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isHome || typeof window === 'undefined') return;
    const addGuard = () => window.history.pushState({ ...(window.history.state ?? {}), [GUARD]: true }, '', window.location.href);
    if (!window.history.state?.[GUARD]) addGuard();

    const onBack = () => {
      // Back took us off the extra step but we're still on this screen: ask before leaving.
      if (window.location.pathname !== path || window.history.state?.[GUARD]) return;
      if (window.confirm(exitMessage(path))) {
        window.removeEventListener('popstate', onBack);
        window.history.back();
      } else {
        addGuard();
      }
    };
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, [isHome, path]);

  return null;
}
