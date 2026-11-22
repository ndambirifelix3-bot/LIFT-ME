/**
 * Error alerts (Sentry) — website version. Same purpose and privacy rules as monitoring.ts, but instead
 * of the full phone-app library (~390 KB) the website loads a small errors-only file (/sentry.js, ~28 KB,
 * built by scripts/build-sentry-web.mjs) from our own domain, after the app has started, so it never
 * slows down the first screen. Errors that happen before it arrives are kept and sent once it's ready.
 * Switched on only when EXPO_PUBLIC_SENTRY_DSN is set at build time.
 */
import type { ComponentType } from 'react';
import { scrubBreadcrumb, scrubEvent } from './monitoringScrub';

type SentryLite = {
  init: (options: Record<string, unknown>) => void;
  captureException: (error: unknown, hint?: Record<string, unknown>) => void;
  setUser: (user: { id: string } | null) => void;
  setTag: (key: string, value: string) => void;
};
declare global {
  interface Window { LiftMeSentry?: SentryLite }
}

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
export const monitoringEnabled = !!DSN && typeof window !== 'undefined';
const SCRIPT_URL = '/sentry.js?v=10.75.2';

let sentry: SentryLite | null = null;
const queue: ((s: SentryLite) => void)[] = [];

function run(fn: (s: SentryLite) => void) {
  if (!monitoringEnabled) return;
  if (sentry) fn(sentry);
  else if (queue.length < 50) queue.push(fn);
}

function environment(): string {
  const host = window.location.hostname;
  return host === 'rideliftme.com' || host === 'www.rideliftme.com' ? 'production' : 'preview';
}

function start() {
  // Keep errors that happen before /sentry.js has loaded.
  const early = (e: ErrorEvent) => run((s) => s.captureException(e.error ?? new Error(e.message)));
  const earlyRejection = (e: PromiseRejectionEvent) => run((s) => s.captureException(e.reason));
  window.addEventListener('error', early);
  window.addEventListener('unhandledrejection', earlyRejection);

  const load = () => {
    const tag = document.createElement('script');
    tag.src = SCRIPT_URL;
    tag.async = true;
    tag.onload = () => {
      const s = window.LiftMeSentry;
      if (!s) return;
      window.removeEventListener('error', early);
      window.removeEventListener('unhandledrejection', earlyRejection);
      s.init({
        dsn: DSN,
        environment: environment(),
        sendDefaultPii: false,
        ignoreErrors: [
          'Network request failed', 'Failed to fetch', 'Load failed', 'A network error occurred',
          'NetworkError when attempting to fetch resource', 'ResizeObserver loop',
        ],
        beforeBreadcrumb: scrubBreadcrumb,
        beforeSend: scrubEvent,
      });
      sentry = s;
      queue.splice(0).forEach((fn) => fn(s));
    };
    document.head.appendChild(tag);
  };
  // After the app's own start-up work.
  if (document.readyState === 'complete') setTimeout(load, 1500);
  else window.addEventListener('load', () => setTimeout(load, 1500), { once: true });
}

if (monitoringEnabled) start();

/** Attach the signed-in account (anonymous id only) to future error reports. */
export function setMonitoringUser(id: string | null, role?: string | null) {
  run((s) => {
    s.setUser(id ? { id } : null);
    s.setTag('role', role ?? 'none');
  });
}

/** Report an error we caught ourselves but still want to know about. */
export function reportError(error: unknown, context?: Record<string, unknown>) {
  run((s) => s.captureException(error, context ? { extra: context } : undefined));
}

/** On the web, React reports crashes in screens as browser errors, which Sentry already catches. */
export function withMonitoring<P extends object>(Component: ComponentType<P>): ComponentType<P> {
  return Component;
}
