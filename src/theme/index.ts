// Lift Me brand. Gold is an accent for main buttons and highlights only.
export const colors = {
  black: '#101010', // Midnight Black
  gold: '#D6B45B', // Champagne Gold
  goldPressed: '#B9953F',
  white: '#FFFFFF',
  ivory: '#F4F4F1', // Warm Ivory (backgrounds)
  text: '#171717',
  secondary: '#666666',
  border: '#E5E5E0',
  success: '#237A50',
  error: '#B3261E',
  successBg: '#E8F3EC',
  errorBg: '#F9E9E8',
  goldBg: '#F8F1DE',
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
