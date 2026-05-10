import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/src/theme';

export function SettingsCard({
  kicker,
  children,
}: {
  kicker?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.wrapper}>
      {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  kicker: {
    ...typography.kicker,
    color: colors.inkMuted,
  },
  card: {
    backgroundColor: colors.paperRaised,
    borderRadius: radius.card,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
