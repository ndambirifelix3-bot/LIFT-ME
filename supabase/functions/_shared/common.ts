// Shared helpers for Lift Me Edge Functions (Deno).
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(code: string, status = 400, message?: string): Response {
  return json({ error: code, message: message ?? code }, status);
}

export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing secret ${name}`);
  return value;
}

/** Service-role client. Bypasses RLS — only use after checking the caller yourself. */
export function adminClient(): SupabaseClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Returns the signed-in user from the request's Authorization header, or null. */
export async function getUser(req: Request): Promise<User | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function getSetting<T>(db: SupabaseClient, key: string, fallback: T): Promise<T> {
  const { data } = await db.from('settings').select('value').eq('key', key).maybeSingle();
  return (data?.value as T | undefined) ?? fallback;
}

/** Wraps a handler with CORS + POST-only + crash protection. */
export function serve(handler: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return errorResponse('method_not_allowed', 405);
    try {
      return await handler(req);
    } catch (err) {
      console.error(err);
      return errorResponse('server_error', 500, 'Something went wrong. Please try again.');
    }
  });
}

export function isLatLng(v: unknown): v is { lat: number; lng: number } {
  const o = v as { lat?: unknown; lng?: unknown } | null;
  return (
    !!o &&
    typeof o.lat === 'number' &&
    typeof o.lng === 'number' &&
    Math.abs(o.lat) <= 90 &&
    Math.abs(o.lng) <= 180
  );
}
