// Shrinks the web build's font files (runs after `expo export -p web`).
//
// * Inter (text): keeps Latin letters, accents, digits, punctuation and symbols we use (KES, $, ·, →, —, ...)
//   — about 5–10× smaller than the full font, which also covers Greek, Cyrillic, Vietnamese, etc.
// * Icon fonts (Ionicons, MaterialCommunityIcons): keeps only the icons the app actually uses. The icon
//   names are found by looking for every quoted word in src/ that is an icon name.
//
// The files keep their names (.ttf) but are saved as WOFF2, the compact web font format; browsers
// recognise it from the file content (expo-font gives no format hint). Native apps are not affected.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import subsetFont from 'subset-font';

const require = createRequire(import.meta.url);
const DIST = process.argv[2] ?? 'dist';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// Every quoted word in the app's source code.
const words = new Set();
for (const file of walk('src').filter((f) => /\.(tsx?|jsx?)$/.test(f))) {
  for (const m of readFileSync(file, 'utf8').matchAll(/['"`]([a-z0-9-]+)['"`]/g)) words.add(m[1]);
}

const glyphMaps = {
  Ionicons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json'),
  MaterialCommunityIcons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json'),
};

function iconText(map) {
  const used = [...words].filter((w) => w in map);
  return { used, text: used.map((w) => String.fromCodePoint(map[w])).join('') };
}

// Basic Latin, Latin-1 (é, ñ, ü, ...), Latin Extended-A, plus punctuation and symbols used in the app.
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => String.fromCodePoint(a + i)).join('');
const LATIN = range(0x20, 0x7e) + range(0xa0, 0xff) + range(0x100, 0x17f) + '–—‘’‚“”„•…‰′″‹›€₹™←↑→↓↗⚡✓✔✕✗·°×÷−≈≤≥';

const fonts = walk(DIST).filter((f) => f.endsWith('.ttf'));
let before = 0, after = 0;
for (const file of fonts) {
  const name = file.split('/').pop();
  let text = null;
  if (name.startsWith('Inter_')) text = LATIN;
  else if (name.startsWith('Ionicons.')) text = iconText(glyphMaps.Ionicons).text;
  else if (name.startsWith('MaterialCommunityIcons.')) text = iconText(glyphMaps.MaterialCommunityIcons).text;
  if (!text) continue; // fonts the app never loads: leave them alone
  const input = readFileSync(file);
  const output = await subsetFont(input, text, { targetFormat: 'woff2' });
  writeFileSync(file, output);
  before += input.length;
  after += output.length;
  console.log(`  ${name.split('.')[0].padEnd(24)} ${(input.length / 1024).toFixed(0).padStart(5)} KB -> ${(output.length / 1024).toFixed(0).padStart(4)} KB`);
}
console.log(`fonts: ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB`);
console.log(`icons kept: Ionicons ${iconText(glyphMaps.Ionicons).used.length}, MaterialCommunityIcons ${iconText(glyphMaps.MaterialCommunityIcons).used.length}`);
