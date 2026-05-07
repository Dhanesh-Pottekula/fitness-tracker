import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/src/theme';

export function Hero({
  value,
  label,
  tone = 'neutral',
}: {
  value: string;
  label?: string;
  tone?: 'neutral' | 'positive' | 'negative';
}) {
  return (
    <View style={styles.wrap}>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.value}>
        {value}
      </Text>
      {label ? <Text style={[styles.label, toneStyles[tone]]}>{label}</Text> : null}
    </View>
  );
}

const toneStyles = StyleSheet.create({
  neutral: { color: colors.inkMuted },
  positive: { color: colors.sage },
  negative: { color: colors.slate },
});

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
  value: {
    ...typography.hero,
    color: colors.ink,
  },
  label: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
