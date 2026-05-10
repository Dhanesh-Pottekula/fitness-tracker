import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Kicker, PressableOpacity } from '@/src/components/ui';
import { useAppData } from '@/src/data';
import { applyPeriodRange, predictedPeriodDates } from '@/src/lib/cycle';
import { todayIso } from '@/src/lib/date';
import { colors, radius, spacing, typography } from '@/src/theme';

import { CycleLogSheet } from './CycleLogSheet';
import { CycleMonthModal } from './CycleMonthModal';
import { PeriodRangeModal } from './PeriodRangeModal';
import { WeekStrip } from './WeekStrip';

export function CycleSection() {
  const { data, setData } = useAppData();
  const today = todayIso();
  const [logDate, setLogDate] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);

  const predicted = useMemo(
    () => predictedPeriodDates(data.cycle.daily, data.cycle.settings, 2),
    [data.cycle.daily, data.cycle.settings],
  );

  function openLogToday() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    setLogDate(today);
  }

  function openCalendar() {
    Haptics.selectionAsync().catch(() => undefined);
    setCalendarOpen(true);
  }

  function openRange() {
    Haptics.selectionAsync().catch(() => undefined);
    setRangeOpen(true);
  }

  function handleDayPress(iso: string) {
    setLogDate(iso);
  }

  function handleCalendarDayPress(iso: string) {
    setCalendarOpen(false);
    setLogDate(iso);
  }

  function handleSaveRange(start: string, end: string) {
    setData((prev) => ({
      ...prev,
      cycle: {
        ...prev.cycle,
        daily: applyPeriodRange(prev.cycle.daily, null, { start, end }),
      },
    }));
    setRangeOpen(false);
  }

  return (
    <View style={styles.wrapper}>
      <Kicker>Cycle</Kicker>

      <WeekStrip
        today={today}
        daily={data.cycle.daily}
        predictedDates={predicted}
        onDayPress={handleDayPress}
      />

      <View style={styles.actions}>
        <PressableOpacity onPress={openLogToday} style={styles.logBtn}>
          <Ionicons name="add" size={18} color={colors.paperRaised} />
          <Text style={styles.logBtnText}>Log today</Text>
        </PressableOpacity>
        <PressableOpacity onPress={openRange} style={styles.rangeBtn}>
          <Ionicons name="calendar-outline" size={16} color={colors.bloom} />
          <Text style={styles.rangeBtnText}>Set period range</Text>
        </PressableOpacity>
      </View>

      <PressableOpacity onPress={openCalendar} style={styles.calLink} hitSlop={8}>
        <Text style={styles.calLinkText}>View calendar</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.inkMuted} />
      </PressableOpacity>

      <CycleLogSheet
        visible={logDate !== null}
        date={logDate ?? today}
        onClose={() => setLogDate(null)}
      />

      <CycleMonthModal
        visible={calendarOpen}
        today={today}
        daily={data.cycle.daily}
        predictedDates={predicted}
        onClose={() => setCalendarOpen(false)}
        onDayPress={handleCalendarDayPress}
      />

      <PeriodRangeModal
        visible={rangeOpen}
        onClose={() => setRangeOpen(false)}
        onSave={handleSaveRange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  logBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.bloom,
  },
  logBtnText: {
    ...typography.subhead,
    fontSize: 13,
    color: colors.paperRaised,
  },
  rangeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.bloom,
    backgroundColor: colors.bloomTint,
  },
  rangeBtnText: {
    ...typography.subhead,
    fontSize: 13,
    color: colors.bloom,
  },
  calLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingVertical: 8,
  },
  calLinkText: {
    ...typography.caption,
    color: colors.inkMuted,
  },
});
