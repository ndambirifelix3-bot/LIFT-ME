import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '@/theme';
import type { MapProps } from './Map.types';

/**
 * react-native-maps does not run in a web browser. The web build (used mainly for the
 * admin dashboard) shows this simple panel instead of a live map.
 */
export function Map({ markers = [], height = 220 }: MapProps) {
  return (
    <View style={[styles.box, { height: typeof height === 'number' ? Math.min(height, 260) : 220 }]}>
      <Ionicons name="map-outline" size={32} color={colors.black} />
      <Text style={styles.text}>The live map is available in the Lift Me phone app.</Text>
      {markers.map((m) => (
        <Text key={m.id} style={styles.small}>
          {m.title ?? m.kind}: {m.position.lat.toFixed(5)}, {m.position.lng.toFixed(5)}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.white,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16,
  },
  text: { fontFamily: fonts.medium, fontSize: 14, color: colors.text, textAlign: 'center' },
  small: { fontFamily: fonts.regular, fontSize: 12, color: colors.secondary },
});
