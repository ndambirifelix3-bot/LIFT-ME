import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import type { Database } from '@/types/database';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

// Only the public URL + anon key live in the app. RLS protects the data.
// The service role key must NEVER be put here.
export const supabase = createClient<Database>(url ?? 'http://localhost:54321', anonKey ?? 'missing-anon-key', {
  auth: {
    // "Stay logged in": the session is kept on the device and refreshed automatically.
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// Refresh tokens only while the app is in the foreground (recommended for React Native).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Calls an Edge Function and turns its JSON error into a thrown Error with our code. */
export async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let code = error.message;
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const payload = await ctx.json();
        code = payload?.message ?? payload?.error ?? code;
      } catch {
        // keep the default message
      }
    }
    throw new Error(code);
  }
  return data as T;
}
