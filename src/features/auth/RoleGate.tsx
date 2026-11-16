import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { EmptyState, Loading } from '@/components';
import { homeForProfile, useAuth } from './AuthProvider';
import type { Profile } from './AuthProvider';

/**
 * Sends users who don't belong here to their own dashboard. This only keeps the UI tidy:
 * the REAL protection is Row Level Security in the database.
 */
export function RoleGate({ role, children }: { role: Profile['role']; children: ReactNode }) {
  const { session, initializing, profile, profileLoading, signOut } = useAuth();
  if (initializing || profileLoading) return <Loading />;
  if (!session) return <Redirect href="/welcome" />;
  if (profile?.is_suspended) {
    return (
      <EmptyState
        icon="lock-closed-outline"
        title="Account suspended"
        message="Your account has been suspended. Please contact Lift Me support."
        action="Log out"
        onAction={signOut}
      />
    );
  }
  if (!profile || !profile.role_chosen || profile.role !== role) return <Redirect href={homeForProfile(profile)} />;
  return <>{children}</>;
}
