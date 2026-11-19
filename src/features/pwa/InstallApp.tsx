import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ListItem } from '@/components';
import { colors, fonts, radius, space } from '@/theme';
import { useInstallState } from './pwa';

/**
 * "Install the Lift Me app" — only appears in a web browser that can install it, and disappears
 * once installed. Android / desktop get a one-tap install; iPhone gets Share → Add to Home Screen steps.
 *
 * - `tone="dark"`: a slim link for black screens (welcome).
 * - `tone="light"`: a list row for normal screens (Account tab).
 */
export function InstallApp({ tone = 'light' }: { tone?: 'dark' | 'light' }) {
  const state = useInstallState();
  const [showIosSteps, setShowIosSteps] = useState(false);
  if (state.kind === 'none') return null;

  const onPress = () => (state.kind === 'prompt' ? void state.install() : setShowIosSteps((v) => !v));
  const steps = showIosSteps ? <IosSteps tone={tone} /> : null;

  if (tone === 'dark') {
    return (
      <View>
        <Pressable onPress={onPress} style={({ pressed }) => [styles.darkLink, pressed && { opacity: 0.7 }]} accessibilityRole="button">
          <Ionicons name="download-outline" size={18} color={colors.brand} />
          <Text style={styles.darkText}>Install the Lift Me app</Text>
        </Pressable>
        {steps}
      </View>
    );
  }

  return (
    <View>
      <ListItem icon="download-outline" title="Install the Lift Me app" subtitle="Open Lift Me from your home screen, like any app" onPress={onPress} />
      {steps}
    </View>
  );
}

function IosSteps({ tone }: { tone: 'dark' | 'light' }) {
  const fg = tone === 'dark' ? colors.white : colors.text;
  return (
    <View style={[styles.steps, tone === 'dark' ? styles.stepsDark : styles.stepsLight]}>
      <Step n={1} fg={fg}>
        Tap the <Text style={styles.bold}>Share</Text> button <Ionicons name="share-outline" size={15} color={fg} /> in your browser&apos;s toolbar.
      </Step>
      <Step n={2} fg={fg}>
        Scroll down and tap <Text style={styles.bold}>Add to Home Screen</Text>.
      </Step>
      <Step n={3} fg={fg}>
        Tap <Text style={styles.bold}>Add</Text>. Lift Me now opens from your home screen.
      </Step>
    </View>
  );
}

function Step({ n, fg, children }: { n: number; fg: string; children: React.ReactNode }) {
  return (
    <View style={styles.step}>
      <View style={styles.badge}><Text style={styles.badgeText}>{n}</Text></View>
      <Text style={[styles.stepText, { color: fg }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  darkLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingVertical: space.sm },
  darkText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.brand },
  steps: { gap: space.sm, padding: space.md, borderRadius: radius.md, marginTop: space.sm },
  stepsDark: { backgroundColor: '#1d1d1d' },
  stepsLight: { backgroundColor: colors.brandBg },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  badge: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: fonts.bold, fontSize: 12, color: colors.black },
  stepText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  bold: { fontFamily: fonts.semibold },
});
