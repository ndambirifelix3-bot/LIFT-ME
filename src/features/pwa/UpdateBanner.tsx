import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, space } from '@/theme';
import { useUpdateReady } from './updates';

/** "A new version of Lift Me is ready — Update" (website only). Tapping reloads the app. */
export function UpdateBanner() {
  const ready = useUpdateReady();
  const insets = useSafeAreaInsets();
  if (!ready) return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + space.sm }]}>
      <View style={styles.banner} accessibilityRole="alert">
        <Text style={styles.text}>A new version of Lift Me is ready.</Text>
        <Pressable onPress={() => window.location.reload()} accessibilityRole="button" style={styles.button}>
          <Text style={styles.buttonText}>Update</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 1000, paddingHorizontal: space.lg },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.black,
    paddingVertical: space.sm, paddingLeft: space.lg, paddingRight: space.sm, borderRadius: radius.pill, maxWidth: 480,
  },
  text: { fontFamily: fonts.medium, fontSize: 14, color: colors.white, flexShrink: 1 },
  button: { backgroundColor: colors.brand, borderRadius: radius.pill, paddingHorizontal: space.lg, paddingVertical: 8 },
  buttonText: { fontFamily: fonts.bold, fontSize: 14, color: colors.black },
});
