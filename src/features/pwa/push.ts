import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { callFunction, supabase } from '@/lib/supabase';

/**
 * Web push for the installable web app. (The Android/iPhone store apps will use Expo push later.)
 *
 * States shown to people:
 *  - 'unsupported'  this browser can't do push
 *  - 'needs-install' iPhone/iPad: only works after "Add to Home Screen" (iOS 16.4+)
 *  - 'blocked'      they said no; only the browser/phone settings can undo that
 *  - 'off' / 'on'
 */
export type PushState = 'unsupported' | 'needs-install' | 'blocked' | 'off' | 'on';

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}
function supported(): boolean {
  return isWeb && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!supported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

async function readState(): Promise<PushState> {
  if (!isWeb) return 'unsupported';
  if (!supported()) return isIos() && !isStandalone() ? 'needs-install' : 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  if (Notification.permission === 'granted' && (await currentSubscription())) return 'on';
  return 'off';
}

/** The server's public key, as the bytes PushManager wants. */
function keyBytes(base64url: string): Uint8Array {
  const padded = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

async function saveSubscription(sub: PushSubscription) {
  const j = sub.toJSON();
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: sub.endpoint,
    p_p256dh: j.keys?.p256dh ?? '',
    p_auth: j.keys?.auth ?? '',
    p_user_agent: navigator.userAgent.slice(0, 300),
  });
  if (error) throw error;
}

/** Must be called from a tap: browsers only show the permission question after one. */
async function turnOn(): Promise<void> {
  if (!supported()) throw new Error('This browser cannot show notifications.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications were not allowed.');
  const { publicKey } = await callFunction<{ publicKey: string }>('push-send', { action: 'public-key' });
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const sub = existing ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) as BufferSource }));
  await saveSubscription(sub);
}

async function turnOff(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await supabase.rpc('remove_push_subscription', { p_endpoint: sub.endpoint });
  await sub.unsubscribe();
}

/** Call before signing out, so the next person on this phone doesn't get your alerts. */
export async function forgetThisDeviceForPush(): Promise<void> {
  try {
    const sub = await currentSubscription();
    if (sub) await supabase.rpc('remove_push_subscription', { p_endpoint: sub.endpoint });
  } catch {
    // signing out must never fail because of this
  }
}

export function usePush(userId: string | undefined) {
  const qc = useQueryClient();
  const state = useQuery({ queryKey: ['push-state', userId], queryFn: readState, enabled: isWeb });
  const refresh = () => qc.invalidateQueries({ queryKey: ['push-state'] });

  // Already allowed on this phone (e.g. someone else used it before): link it to whoever is signed in now.
  useEffect(() => {
    if (!userId || state.data !== 'on') return;
    currentSubscription().then((s) => (s ? saveSubscription(s) : undefined)).catch(() => undefined);
  }, [userId, state.data]);

  const on = useMutation({ mutationFn: turnOn, onSettled: refresh });
  const off = useMutation({ mutationFn: turnOff, onSettled: refresh });
  const test = useMutation({ mutationFn: () => callFunction<{ sent: number }>('push-send', { action: 'test' }) });
  return { state: state.data ?? (isWeb ? undefined : 'unsupported'), on, off, test };
}
