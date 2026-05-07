import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/src/theme';

export function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.rule} />
      <Text style={styles.text}>{children}</Text>
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  rule: {
    backgroundColor: colors.rule,
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  text: {
    ...typography.kicker,
    color: colors.inkMuted,
  },
});
