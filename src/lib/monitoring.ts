/**
 * Error alerts (Sentry). When the app crashes or a screen breaks for someone, Sentry records what
 * happened and emails us. Only switched on when EXPO_PUBLIC_SENTRY_DSN is set (Cloudflare build
 * variable for the website), so local development sends nothing.
 *
 * Privacy: no names, phone numbers, IP addresses or typed text are sent — only the error, the screen,
 * the device/browser type and the user's anonymous account id.
 */
import * as Sentry from '@sentry/react-native';
import type { ComponentType } from 'react';
import { Platform } from 'react-native';
import { scrubBreadcrumb, scrubEvent } from './monitoringScrub';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
export const monitoringEnabled = !!DSN;

function environment(): string {
  if (Platform.OS !== 'web') return __DEV__ ? 'development' : 'production';
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  return host === 'rideliftme.com' || host === 'www.rideliftme.com' ? 'production' : 'preview';
}

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: environment(),
    sendDefaultPii: false,
    // Errors only (no performance tracing) to stay well inside the free plan.
    tracesSampleRate: 0,
    // Phones losing signal are normal, not bugs.
    ignoreErrors: [
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      'A network error occurred',
      'NetworkError when attempting to fetch resource',
      'ResizeObserver loop',
    ],
    beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb),
    beforeSend: (event) => scrubEvent(event as Parameters<typeof scrubEvent>[0]) as typeof event,
  });
}

/** Attach the signed-in account (anonymous id only) to future error reports. */
export function setMonitoringUser(id: string | null, role?: string | null) {
  if (!DSN) return;
  Sentry.setUser(id ? { id } : null);
  Sentry.setTag('role', role ?? 'none');
}

/** Report an error we caught ourselves but still want to know about. */
export function reportError(error: unknown, context?: Record<string, unknown>) {
  if (!DSN) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

/** Reports crashes in any screen of the phone apps. */
export function withMonitoring<P extends object>(Component: ComponentType<P>): ComponentType<P> {
  return DSN ? (Sentry.wrap(Component as ComponentType<Record<string, unknown>>) as unknown as ComponentType<P>) : Component;
}
