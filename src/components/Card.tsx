import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors, radius, space } from '@/theme';

export function Card({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white, borderRadius: radius.lg, padding: space.lg,
    borderWidth: 1, borderColor: colors.border, marginBottom: space.md,
  },
});
