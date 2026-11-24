import { supabase } from '@/lib/supabase';

export type AuthMode = 'login' | 'signup';

/** Does this email or phone (E.164) already have a Lift Me account? */
export async function accountExists(who: { email?: string; phone?: string }): Promise<boolean> {
  const { data, error } = await supabase.rpc('account_exists', { p_email: who.email, p_phone: who.phone });
  if (error) throw error;
  return !!data;
}

export const MODE_TEXT = {
  login: {
    title: 'Log in',
    wrongMode: 'There\'s no Lift Me account with this',
    switchTo: 'Sign up instead',
  },
  signup: {
    title: 'Create your account',
    wrongMode: 'You already have a Lift Me account with this',
    switchTo: 'Log in instead',
  },
} as const;
