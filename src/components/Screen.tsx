import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, space } from '@/theme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  style?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
};

/** Standard page: safe area, ivory background, max width on big screens. */
export function Screen({ children, scroll = true, footer, onRefresh, refreshing = false, style, edges = ['top', 'left', 'right'] }: Props) {
  const content = <View style={[styles.inner, style]}>{children}</View>;
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.black} /> : undefined}
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ivory },
  scroll: { flexGrow: 1 },
  inner: { flex: 1, padding: space.lg, width: '100%', maxWidth: 640, alignSelf: 'center' },
  footer: {
    padding: space.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white,
    width: '100%', maxWidth: 640, alignSelf: 'center',
  },
});
