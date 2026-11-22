// Entry for the website's error-reporting file (public URL /sentry.js), built by scripts/build-sentry-web.mjs.
// Only Sentry's error reporting (no tracing, replay or feedback), so it stays small (~25-30 KB gzipped).
// The app loads it after start-up and calls window.LiftMeSentry.init(...) — see src/lib/monitoring.web.ts.
import { captureException, init, setTag, setUser } from '@sentry/browser';

window.LiftMeSentry = { init, captureException, setTag, setUser };
