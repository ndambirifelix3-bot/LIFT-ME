// Draws the Lift Me placeholder logo and renders every app icon size from it.
// Run: node scripts/make-icons.mjs   (needs Playwright + Chromium installed)
// Replace this when the client supplies a real logo.
import { createRequire } from 'node:module';

// require() also finds a globally installed Playwright; an ESM import would not.
const { chromium } = createRequire(import.meta.url)('playwright');

const YELLOW = '#FFC107';
const BLACK = '#101010';

// A location pin with an upward "lift" chevron cut into it. Drawn on a 100x100 grid.
// arrow: a colour, or 'cut' to punch the arrow out of the pin (see-through).
function logo({ pin, arrow }) {
  const arrowPaths = (colour) => `
    <path d="M35 49 L50 32 L65 49" fill="none" stroke="${colour}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M50 34 L50 58" stroke="${colour}" stroke-width="8" stroke-linecap="round"/>`;
  const pinPath = (attrs) =>
    `<path d="M50 8 C31 8 17 22.5 17 41 C17 63 50 92 50 92 C50 92 83 63 83 41 C83 22.5 69 8 50 8 Z" ${attrs}/>`;
  if (arrow === 'cut') {
    return `<mask id="cut"><rect width="100" height="100" fill="white"/>${arrowPaths('black')}</mask>
      ${pinPath(`fill="${pin}" mask="url(#cut)"`)}`;
  }
  return pinPath(`fill="${pin}"`) + arrowPaths(arrow);
}

// scale = how much of the canvas the logo fills (Android/maskable icons need a safe margin).
function svg({ size, bg, pin, arrow, scale }) {
  const s = (size * scale) / 100;
  const offset = (size - 100 * s) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ''}
    <g transform="translate(${offset} ${offset}) scale(${s})">${logo({ pin, arrow })}</g>
  </svg>`;
}

const onYellow = { bg: YELLOW, pin: BLACK, arrow: YELLOW };
const transparentOnYellowBg = { bg: null, pin: BLACK, arrow: YELLOW };

const files = [
  // Main app icon (iOS rounds the corners itself).
  ['assets/icon.png', { size: 1024, scale: 0.7, ...onYellow }],
  // Android adaptive icon: yellow background layer + logo foreground layer (logo inside the safe zone).
  ['assets/android-icon-background.png', { size: 512, scale: 0, bg: YELLOW, pin: YELLOW, arrow: YELLOW }],
  ['assets/android-icon-foreground.png', { size: 512, scale: 0.5, ...transparentOnYellowBg }],
  // Android 13+ themed icon: single colour silhouette, the system recolours it.
  ['assets/android-icon-monochrome.png', { size: 432, scale: 0.5, bg: null, pin: BLACK, arrow: 'cut' }],
  // Splash screen shows on black (#101010): yellow pin with black arrow.
  ['assets/splash-icon.png', { size: 1024, scale: 0.9, bg: null, pin: YELLOW, arrow: BLACK }],
  ['assets/favicon.png', { size: 48, scale: 0.9, ...onYellow }],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [path, opts] of files) {
  await page.setViewportSize({ width: opts.size, height: opts.size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg(opts)}</body></html>`);
  await page.locator('svg').screenshot({ path, omitBackground: true });
  console.log('wrote', path);
}
await browser.close();
