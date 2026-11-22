// Builds dist/sentry.js (errors-only Sentry for the website). Runs after `expo export -p web`.
import { build } from 'esbuild';

const outDir = process.argv[2] ?? 'dist';
await build({
  entryPoints: ['scripts/sentry-web.js'],
  outfile: `${outDir}/sentry.js`,
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020', 'safari15', 'chrome90'],
  legalComments: 'none',
  define: { __SENTRY_DEBUG__: 'false', __SENTRY_TRACING__: 'false', __RRWEB_EXCLUDE_IFRAME__: 'true', __RRWEB_EXCLUDE_SHADOW_DOM__: 'true' },
});
console.log(`sentry: wrote ${outDir}/sentry.js`);
