import { StyleSheet, Text, View } from 'react-native';

import type { CycleStats } from '@/src/lib/cycle';
import { colors, radius, spacing, typography } from '@/src/theme';

export function CalendarSummary({ stats }: { stats: CycleStats }) {
  const chips = [
    {
      label: 'AVG CYCLE',
      value: stats.avgCycleLength != null ? `${stats.avgCycleLength}d` : '—',
    },
    {
      label: 'AVG PERIOD',
      value: stats.avgPeriodLength != null ? `${stats.avgPeriodLength}d` : '—',
    },
    {
      label: 'CYCLES',
      value: String(stats.cyclesLogged),
    },
  ];

  return (
    <View style={styles.row}>
      {chips.map((chip) => (
        <View key={chip.label} style={styles.chip}>
          <Text style={styles.chipLabel}>{chip.label}</Text>
          <Text style={styles.chipValue}>{chip.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  chip: {
    flex: 1,
    backgroundColor: colors.paperRaised,
    borderRadius: radius.card,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  chipLabel: {
    ...typography.kicker,
    fontSize: 9,
    color: colors.inkMuted,
  },
  chipValue: {
    ...typography.metric,
    fontSize: 18,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
});
