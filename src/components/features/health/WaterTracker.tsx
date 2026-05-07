import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, View } from 'react-native';

import { PressableOpacity } from '@/src/components/ui';
import { colors, radius, spacing, typography } from '@/src/theme';

const QUICK = [250, 500];

export function WaterTracker({
  value,
  target,
  onChange,
}: {
  value: number;
  target: number;
  onChange: (next: number) => void;
}) {
  const progress = target > 0 ? Math.min(value / target, 1) : 0;

  function bump(delta: number) {
    Haptics.selectionAsync().catch(() => undefined);
    onChange(Math.max(0, value + delta));
  }

  function reset() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onChange(0);
  }

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View>
          <Text style={styles.label}>WATER</Text>
          <View style={styles.valueRow}>
            <Text style={styles.value}>{value.toLocaleString('en-IN')}</Text>
            <Text style={styles.target}>/ {target.toLocaleString('en-IN')} ml</Text>
          </View>
        </View>
        <Text style={styles.percent}>{Math.round(progress * 100)}%</Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.actions}>
        {QUICK.map((amount) => (
          <PressableOpacity key={amount} onPress={() => bump(amount)} style={styles.chip}>
            <Text style={styles.chipText}>+{amount} ml</Text>
          </PressableOpacity>
        ))}
        <PressableOpacity onPress={() => bump(-250)} style={styles.chipGhost}>
          <Text style={styles.chipGhostText}>−250</Text>
        </PressableOpacity>
        <PressableOpacity onPress={reset} style={styles.chipGhost}>
          <Text style={styles.chipGhostText}>Reset</Text>
        </PressableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.paperRaised,
    borderColor: colors.rule,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  label: {
    ...typography.kicker,
    color: colors.inkMuted,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  value: {
    ...typography.metric,
    color: colors.water,
  },
  target: {
    ...typography.caption,
    color: colors.inkMuted,
  },
  percent: {
    ...typography.metricSm,
    color: colors.water,
  },
  track: {
    height: 6,
    backgroundColor: colors.paperRecessed,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.water,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: colors.water,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipText: {
    ...typography.subhead,
    fontSize: 13,
    color: colors.paperRaised,
  },
  chipGhost: {
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipGhostText: {
    ...typography.subhead,
    fontSize: 13,
    color: colors.inkSoft,
  },
});
