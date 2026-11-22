import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { forgetThisDeviceForPush } from '@/features/pwa/push';
import type { Tables } from '@/types/database';
import { setMonitoringUser } from '@/lib/monitoring';

export type Profile = Tables<'profiles'>;

type AuthState = {
  session: Session | null;
  initializing: boolean;
  profile: Profile | null | undefined;
  profileLoading: boolean;
  refreshProfile: () => Promise<unknown>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

/**
 * Website only: keep the last profile on the device so the app can open the right home screen
 * straight away, instead of waiting for the server on every start. It's refreshed in the background
 * right after, so a change (new role, suspension) still applies within a second or two.
 */
const PROFILE_KEY = 'liftme.profile';
function savedProfile(userId: string | undefined): Profile | undefined {
  if (!userId || Platform.OS !== 'web') return undefined;
  try {
    const p = JSON.parse(window.localStorage.getItem(PROFILE_KEY) ?? 'null') as Profile | null;
    return p && p.id === userId ? p : undefined;
  } catch {
    return undefined;
  }
}
function saveProfile(p: Profile | null | undefined) {
  if (Platform.OS !== 'web') return;
  try {
    if (p) window.localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    else window.localStorage.removeItem(PROFILE_KEY);
  } catch {
    // Private mode / storage full: just start without the saved copy.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitializing(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) queryClient.clear();
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const userId = session?.user.id;
  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId!).maybeSingle();
      if (error) throw error;
      saveProfile(data);
      return data;
    },
    // Start from the copy saved on this device (if any); `initialDataUpdatedAt: 0` makes it refresh at once.
    initialData: () => savedProfile(userId),
    initialDataUpdatedAt: 0,
  });

  // Error reports carry the anonymous account id and role (never the name or phone number).
  useEffect(() => setMonitoringUser(userId ?? null, profileQuery.data?.role), [userId, profileQuery.data?.role]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      initializing,
      profile: userId ? profileQuery.data : null,
      profileLoading: !!userId && profileQuery.isLoading,
      // invalidate (not refetch): it skips the request while nobody is signed in yet — e.g. just after
      // the SMS code is verified, before the new session has reached this component.
      refreshProfile: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
      signOut: async () => {
        await forgetThisDeviceForPush(); // the next person on this phone must not get your alerts
        saveProfile(null);
        await supabase.auth.signOut();
        queryClient.clear();
      },
    }),
    [session, initializing, userId, profileQuery, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** Where a signed-in user belongs. Role comes from the database, never from the app. */
export function homeForProfile(profile: Profile | null | undefined): string {
  if (!profile) return '/welcome';
  if (!profile.full_name) return '/complete-profile';
  if (!profile.role_chosen) return '/choose-role';
  if (profile.role === 'admin') return '/admin';
  if (profile.role === 'driver') return '/driver';
  return '/passenger';
}
