import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PressableOpacity } from '@/src/components/ui';
import type { CycleDayEntry } from '@/src/data/types';
import { addDays, flowColor, isoToDate } from '@/src/lib/cycle';
import { colors, radius, spacing, typography } from '@/src/theme';

const CELL_WIDTH = 44;
const CELL_GAP = 6;
const PAST_DAYS = 7;
const FUTURE_DAYS = 6;

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function WeekStrip({
  today,
  daily,
  predictedDates,
  onDayPress,
}: {
  today: string;
  daily: Record<string, CycleDayEntry>;
  predictedDates: string[];
  onDayPress: (iso: string) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const predictedSet = useMemo(() => new Set(predictedDates), [predictedDates]);

  const days = useMemo(() => {
    const out: { iso: string; weekday: string; date: number; isToday: boolean; isFuture: boolean }[] = [];
    for (let offset = -PAST_DAYS; offset <= FUTURE_DAYS; offset++) {
      const iso = addDays(today, offset);
      const date = isoToDate(iso);
      out.push({
        iso,
        weekday: WEEKDAY_LETTERS[date.getDay()],
        date: date.getDate(),
        isToday: iso === today,
        isFuture: iso > today,
      });
    }
    return out;
  }, [today]);

  useEffect(() => {
    const todayIndex = days.findIndex((d) => d.isToday);
    if (todayIndex < 0) return;
    const x = Math.max(0, todayIndex * (CELL_WIDTH + CELL_GAP) - CELL_WIDTH * 2);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x, animated: false });
    });
  }, [days]);

  function handlePress(iso: string, isFuture: boolean) {
    if (isFuture) {
      Haptics.selectionAsync().catch(() => undefined);
      return;
    }
    Haptics.selectionAsync().catch(() => undefined);
    onDayPress(iso);
  }

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}>
      {days.map((day) => {
        const entry = daily[day.iso];
        const isPredicted = predictedSet.has(day.iso) && day.isFuture;
        const dotColor = entry?.flow ? flowColor(entry.flow) : null;
        return (
          <PressableOpacity
            key={day.iso}
            onPress={() => handlePress(day.iso, day.isFuture)}
            style={[
              styles.cell,
              day.isToday && styles.cellToday,
              day.isFuture && styles.cellFuture,
            ]}>
            <Text style={[styles.weekday, day.isToday && styles.weekdayToday]}>{day.weekday}</Text>
            <Text style={[styles.date, day.isToday && styles.dateToday]}>{day.date}</Text>
            <View style={styles.dotWrap}>
              {dotColor ? (
                <View style={[styles.dotSolid, { backgroundColor: dotColor }]} />
              ) : isPredicted ? (
                <View style={styles.dotPredicted} />
              ) : (
                <View style={styles.dotEmpty} />
              )}
            </View>
          </PressableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: CELL_GAP,
    paddingVertical: spacing.xs,
    paddingHorizontal: 2,
  },
  cell: {
    width: CELL_WIDTH,
    paddingVertical: spacing.xs,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cellToday: {
    borderColor: colors.ink,
    backgroundColor: colors.paperRaised,
  },
  cellFuture: {
    opacity: 0.6,
  },
  weekday: {
    ...typography.kicker,
    fontSize: 10,
    color: colors.inkMuted,
    letterSpacing: 0.6,
  },
  weekdayToday: {
    color: colors.ink,
  },
  date: {
    ...typography.subhead,
    fontSize: 17,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  dateToday: {
    fontWeight: '700',
  },
  dotWrap: {
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotSolid: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotPredicted: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.bloom,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  dotEmpty: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.rule,
  },
});
