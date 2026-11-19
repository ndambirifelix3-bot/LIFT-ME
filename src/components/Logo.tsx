import { Image, type ImageStyle, type StyleProp } from 'react-native';

// Built from assets/brand/logo-source.png by scripts/make-brand-assets.py. Transparent background,
// gold + white artwork: only place it on dark (black / navy) backgrounds.
const FULL = require('../../assets/brand/logo-full.png');
const MARK = require('../../assets/brand/logo-mark.png');
const FULL_RATIO = 800 / 637; // width / height of logo-full.png

/**
 * The Lift Me logo.
 * - `full`: pin + "LIFTME" + "Move smarter." tagline
 * - `mark`: the pin only (square)
 */
export function Logo({ variant = 'full', width = 260, style }: {
  variant?: 'full' | 'mark'; width?: number; style?: StyleProp<ImageStyle>;
}) {
  const full = variant === 'full';
  return (
    <Image
      source={full ? FULL : MARK}
      style={[{ width, height: full ? width / FULL_RATIO : width }, style]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="Lift Me — Move smarter."
    />
  );
}
