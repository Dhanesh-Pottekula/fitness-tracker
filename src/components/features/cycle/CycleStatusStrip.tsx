import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppData } from '@/src/data';
import { currentCycleStatus, flowColor, flowLabel } from '@/src/lib/cycle';
import { todayIso } from '@/src/lib/date';
import { colors, radius, spacing, typography } from '@/src/theme';

export function CycleStatusStrip({ style }: { style?: object }) {
  const { data } = useAppData();
  const today = todayIso();

  const status = useMemo(
    () => currentCycleStatus(today, data.cycle.daily, data.cycle.settings),
    [today, data.cycle.daily, data.cycle.settings],
  );

  if (!status.hasData) return null;

  const dotColor = status.isPeriodDay ? flowColor(status.flow) : colors.bloom;

  let primary: string;
  let secondary: string;
  if (status.isPeriodDay) {
    primary = `Day ${status.cycleDay} of period`;
    secondary = status.flow ? flowLabel(status.flow) : '';
  } else if (status.daysToNext != null) {
    primary = `Day ${status.cycleDay}`;
    const dayWord = status.daysToNext === 1 ? 'day' : 'days';
    const prefix = status.estimateOnly ? '~' : '';
    secondary = `${prefix}${status.daysToNext} ${dayWord} to next period`;
  } else {
    primary = `Day ${status.cycleDay}`;
    secondary = 'Log a few cycles for predictions';
  }

  return (
    <View style={[styles.strip, style]}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={styles.primary} numberOfLines={1}>
        {primary}
      </Text>
      {secondary ? (
        <>
          <Text style={styles.sep}>·</Text>
          <Text style={styles.secondary} numberOfLines={1}>
            {secondary}
          </Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.card,
    backgroundColor: colors.bloomTint,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  primary: {
    ...typography.subhead,
    fontSize: 14,
    color: colors.ink,
  },
  sep: {
    ...typography.caption,
    color: colors.inkMuted,
  },
  secondary: {
    ...typography.caption,
    color: colors.inkMuted,
    flexShrink: 1,
  },
});
