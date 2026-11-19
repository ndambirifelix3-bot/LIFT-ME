import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

/**
 * Installable web app (PWA) support. Does nothing in the Android / iPhone apps.
 * Imported once by the root layout so it runs at startup: the browser's "you can install this"
 * event often fires before any screen has mounted, so we must be listening from the very start.
 */

// Chrome / Edge / Samsung Internet fire this when the site can be installed. Not in TS's DOM types yet.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (isWeb) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // we show our own "Install" button instead of the browser's mini-bar
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installed = true;
    notify();
  });

  // Only in the real website build: during development a service worker would serve stale code.
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    const register = () =>
      navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('Service worker not registered', err));
    // This code can load after the page's `load` event has already fired; then register right away.
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }
}

/** True when opened from the home-screen icon (not in a normal browser tab). */
function isStandalone(): boolean {
  if (!isWeb) return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

function isIos(): boolean {
  if (!isWeb) return false;
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac, but Macs have no touch screen.
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export type InstallState =
  | { kind: 'none' } // not on the web, already installed, or the browser can't install
  | { kind: 'prompt'; install: () => Promise<boolean> } // show an "Install" button
  | { kind: 'ios' }; // iPhone/iPad: explain Share → Add to Home Screen

function snapshot(): InstallState {
  if (!isWeb || installed || isStandalone()) return NONE;
  if (deferredPrompt) return PROMPT;
  if (isIos()) return IOS;
  return NONE;
}

async function install(): Promise<boolean> {
  const event = deferredPrompt;
  if (!event) return false;
  await event.prompt();
  const { outcome } = await event.userChoice;
  deferredPrompt = null; // the browser only lets us show it once
  notify();
  return outcome === 'accepted';
}

// Stable objects so useSyncExternalStore doesn't re-render forever.
const NONE: InstallState = { kind: 'none' };
const PROMPT: InstallState = { kind: 'prompt', install };
const IOS: InstallState = { kind: 'ios' };

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** What (if anything) to show for installing the app on this device. */
export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, snapshot, () => NONE);
}
