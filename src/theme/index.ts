// Lift Me brand: taxi yellow + black + white.
// Yellow is for fills (buttons, badges, plates) with BLACK text on top, and for accents on black.
// Never use yellow for text, thin borders or small icons on white: it is too hard to read there.
// Use `colors.black` for those instead.
export const colors = {
  black: '#101010', // Midnight Black
  brand: '#FFC107', // Lift Yellow
  brandPressed: '#E0A800',
  brandBg: '#FFF4CC', // pale yellow tint for highlighted cards / notices
  white: '#FFFFFF',
  ivory: '#F5F5F5', // light grey page background
  text: '#171717',
  secondary: '#666666',
  border: '#E5E5E5',
  success: '#237A50',
  error: '#B3261E',
  successBg: '#E8F3EC',
  errorBg: '#F9E9E8',
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const type = {
  title: { fontFamily: fonts.bold, fontSize: 26, color: colors.text, letterSpacing: -0.3 },
  h2: { fontFamily: fonts.semibold, fontSize: 20, color: colors.text },
  h3: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 15, color: colors.text, lineHeight: 21 },
  small: { fontFamily: fonts.regular, fontSize: 13, color: colors.secondary, lineHeight: 18 },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.secondary },
} as const;

// Spread onto every <Switch>. `activeThumbColor` is the web's name for the "on" knob colour
// (without it the browser shows a teal knob).
export const switchColors = {
  trackColor: { true: colors.brand, false: colors.border },
  thumbColor: colors.white,
  activeThumbColor: colors.white,
} as const;
