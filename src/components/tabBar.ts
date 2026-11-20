import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '@/theme';

/**
 * Bottom tab bar options shared by the passenger and driver apps.
 * Gives the icon + label a fixed, roomy height (the default was too short on the web, which cut the
 * labels off) and adds the phone's bottom safe area (the iPhone home bar) underneath.
 */
export function useTabBarOptions() {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8);
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.black,
    tabBarInactiveTintColor: colors.secondary,
    tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, flexShrink: 0 },
    tabBarItemStyle: { paddingVertical: 4 },
    tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.white, height: 62 + bottom, paddingBottom: bottom },
  } as const;
}
