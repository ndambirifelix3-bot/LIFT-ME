import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

/**
 * Website only: keeping the app up to date after a new version is published.
 *
 * Each release renames the app's code files. A phone still running an older copy can then ask for a
 * file that no longer exists, and the screen would go blank. So:
 *  1. If loading part of the app fails like that, reload once to get the new version (never in a loop).
 *  2. When the app comes back to the screen (and every 15 minutes), check whether a newer version is
 *     published; if so, offer "Update" (see UpdateBanner).
 */
const isWeb = Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined';
const CODE = /\/_expo\/static\/js\/web\/[^"'\s]+\.js/;
const RELOAD_KEY = 'liftme.reloadedForUpdate';

let updateReady = false;
const listeners = new Set<() => void>();

/** Main code file of the running app, e.g. /_expo/static/js/web/entry-abc123.js */
function runningVersion(): string | null {
  if (!isWeb) return null;
  const script = [...document.querySelectorAll('script[src]')].map((s) => (s as HTMLScriptElement).src).find((src) => CODE.test(src));
  return script ? (script.match(CODE)?.[0] ?? null) : null;
}

/** Reloads to fetch the newest version — at most once a minute, so a real outage can't cause a loop. */
export function reloadForUpdate(): boolean {
  if (!isWeb) return false;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // storage blocked: still reload once
  }
  window.location.reload();
  return true;
}

/** True for "a part of the app could not be loaded" errors (old version asking for a removed file). */
export function isStaleCodeError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? err ?? '');
  return /Loading (chunk|module|bundle)|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unexpected token '<'|expected expression, got '<'|Requiring unknown module/i.test(msg);
}

async function checkForUpdate() {
  const running = runningVersion();
  if (!running || updateReady) return;
  try {
    const res = await fetch('/', { cache: 'no-store' });
    const latest = (await res.text()).match(CODE)?.[0];
    if (latest && latest !== running) {
      updateReady = true;
      listeners.forEach((l) => l());
    }
  } catch {
    // offline: try again later
  }
}

if (isWeb && process.env.NODE_ENV === 'production') {
  // A script tag of the app failed to load (file removed by a newer release).
  window.addEventListener(
    'error',
    (e) => {
      const target = e.target as HTMLScriptElement | null;
      if (target?.tagName === 'SCRIPT' && CODE.test(target.src || '')) reloadForUpdate();
      else if (isStaleCodeError(e.error ?? e.message)) reloadForUpdate();
    },
    true,
  );
  window.addEventListener('unhandledrejection', (e) => {
    if (isStaleCodeError(e.reason)) reloadForUpdate();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
  });
  setInterval(checkForUpdate, 15 * 60 * 1000);
  setTimeout(checkForUpdate, 20_000);
}

/** True when a newer version of the website has been published since this copy loaded. */
export function useUpdateReady(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => updateReady,
    () => false,
  );
}
