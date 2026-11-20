import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

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
      return data;
    },
  });

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
