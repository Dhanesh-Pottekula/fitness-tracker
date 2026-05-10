import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Kicker, PressableOpacity } from '@/src/components/ui';
import { useAppData } from '@/src/data';
import { predictedPeriodDates } from '@/src/lib/cycle';
import { todayIso } from '@/src/lib/date';
import { colors, radius, spacing, typography } from '@/src/theme';

import { CycleLogSheet } from './CycleLogSheet';
import { CycleMonthModal } from './CycleMonthModal';
import { WeekStrip } from './WeekStrip';

export function CycleSection() {
  const { data } = useAppData();
  const today = todayIso();
  const [logDate, setLogDate] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

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

  function handleDayPress(iso: string) {
    setLogDate(iso);
  }

  function handleCalendarDayPress(iso: string) {
    setCalendarOpen(false);
    setLogDate(iso);
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
        <PressableOpacity onPress={openCalendar} style={styles.calLink} hitSlop={8}>
          <Text style={styles.calLinkText}>View calendar</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.inkMuted} />
        </PressableOpacity>
      </View>

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
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
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
  calLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  calLinkText: {
    ...typography.caption,
    color: colors.inkMuted,
  },
});
