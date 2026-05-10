import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppData } from '@/src/data';
import { PressableOpacity } from '@/src/components/ui';
import type { CycleDayEntry } from '@/src/data/types';
import { cycleStats, extractPeriods, flowColor, monthPeriodSpans } from '@/src/lib/cycle';
import {
  formatMonthLabel,
  isoDatesInMonth,
  monthKeyFromDate,
  nextMonthKey,
  previousMonthKey,
} from '@/src/lib/date';
import { colors, radius, spacing, typography } from '@/src/theme';

import { CalendarSummary } from './CalendarSummary';
import { DayPreviewPanel } from './DayPreviewPanel';

const WEEKDAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function CycleMonthModal({
  visible,
  today,
  daily,
  predictedDates,
  onClose,
  onDayPress,
}: {
  visible: boolean;
  today: string;
  daily: Record<string, CycleDayEntry>;
  predictedDates: string[];
  onClose: () => void;
  onDayPress: (iso: string) => void;
}) {
  const { data } = useAppData();
  const [monthKey, setMonthKey] = useState(monthKeyFromDate());
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const predictedSet = useMemo(() => new Set(predictedDates), [predictedDates]);
  const wasVisible = useRef(false);

  useEffect(() => {
    if (visible && !wasVisible.current) {
      setSelectedIso(null);
      const periods = extractPeriods(daily);
      const lastPeriodStart = periods.length > 0 ? periods[periods.length - 1].start : null;
      setMonthKey(lastPeriodStart ? lastPeriodStart.slice(0, 7) : monthKeyFromDate());
    }
    wasVisible.current = visible;
  }, [visible, daily]);

  const cells = useMemo(() => buildMonthCells(monthKey), [monthKey]);
  const stats = useMemo(
    () => cycleStats(daily, data.cycle.settings),
    [daily, data.cycle.settings],
  );
  const monthPeriods = useMemo(() => monthPeriodSpans(daily, monthKey), [daily, monthKey]);
  const monthSummaryText = useMemo(
    () => buildMonthSummary(monthKey, monthPeriods),
    [monthKey, monthPeriods],
  );

  const selectedEntry = selectedIso ? daily[selectedIso] : null;

  function go(delta: number) {
    Haptics.selectionAsync().catch(() => undefined);
    setMonthKey((prev) => (delta > 0 ? nextMonthKey(prev) : previousMonthKey(prev)));
    setSelectedIso(null);
  }

  function handleCellPress(iso: string, isFuture: boolean) {
    if (isFuture) {
      Haptics.selectionAsync().catch(() => undefined);
      return;
    }
    Haptics.selectionAsync().catch(() => undefined);
    const entry = daily[iso];
    const hasData =
      entry &&
      (entry.flow ||
        entry.mood ||
        (entry.symptoms && entry.symptoms.length > 0) ||
        entry.note);
    if (hasData) {
      setSelectedIso((prev) => (prev === iso ? null : iso));
    } else {
      onDayPress(iso);
    }
  }

  function openEditFromPreview() {
    if (!selectedIso) return;
    onDayPress(selectedIso);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <PressableOpacity onPress={() => go(-1)} style={styles.navBtn} hitSlop={8}>
              <Ionicons name="chevron-back" size={20} color={colors.ink} />
            </PressableOpacity>
            <Text style={styles.headerTitle}>{formatMonthLabel(monthKey)}</Text>
            <PressableOpacity onPress={() => go(1)} style={styles.navBtn} hitSlop={8}>
              <Ionicons name="chevron-forward" size={20} color={colors.ink} />
            </PressableOpacity>
          </View>

          <CalendarSummary stats={stats} />

          {monthSummaryText ? (
            <Text style={styles.monthSummary}>{monthSummaryText}</Text>
          ) : null}

          <View style={styles.weekHeaderRow}>
            {WEEKDAY_HEADERS.map((label, idx) => (
              <Text key={`${label}-${idx}`} style={styles.weekHeader}>
                {label}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((cell, idx) => {
              if (!cell) return <View key={`blank-${idx}`} style={styles.cellBlank} />;
              const entry = daily[cell.iso];
              const isPredicted = predictedSet.has(cell.iso) && cell.isFuture;
              const isToday = cell.iso === today;
              const isSelected = selectedIso === cell.iso;
              const dotColor = entry?.flow ? flowColor(entry.flow) : null;
              return (
                <Pressable
                  key={cell.iso}
                  onPress={() => handleCellPress(cell.iso, cell.isFuture)}
                  style={({ pressed }) => [
                    styles.cell,
                    isToday && styles.cellToday,
                    isSelected && styles.cellSelected,
                    cell.isFuture && styles.cellFuture,
                    pressed && !cell.isFuture && { opacity: 0.6 },
                  ]}>
                  <Text style={[styles.cellNumber, isToday && styles.cellNumberToday]}>
                    {cell.day}
                  </Text>
                  <View style={styles.dotWrap}>
                    {dotColor ? (
                      <View style={[styles.dotSolid, { backgroundColor: dotColor }]} />
                    ) : isPredicted ? (
                      <View style={styles.dotPredicted} />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.legend}>
            <LegendItem
              swatch={<View style={[styles.dotSolid, { backgroundColor: colors.bloom }]} />}
              label="Period"
            />
            <LegendItem swatch={<View style={styles.dotPredicted} />} label="Predicted" />
            <LegendItem swatch={<View style={styles.legendTodayBox} />} label="Today" />
          </View>

          {selectedIso && selectedEntry ? (
            <DayPreviewPanel
              iso={selectedIso}
              entry={selectedEntry}
              onEdit={openEditFromPreview}
            />
          ) : (
            <Text style={styles.hint}>Tap a logged day to see details · tap an empty day to log</Text>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <PressableOpacity onPress={onClose} style={styles.doneBtn}>
            <Text style={styles.doneBtnText}>Done</Text>
          </PressableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function LegendItem({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <View style={styles.legendItem}>
      {swatch}
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

interface Cell {
  iso: string;
  day: number;
  isFuture: boolean;
}

function buildMonthCells(monthKey: string): (Cell | null)[] {
  const dates = isoDatesInMonth(monthKey);
  if (dates.length === 0) return [];
  const [y, m] = monthKey.split('-').map(Number);
  const firstWeekday = new Date(y, m - 1, 1).getDay();
  const leading = (firstWeekday + 6) % 7;
  const todayDate = new Date();
  const todayY = todayDate.getFullYear();
  const todayM = String(todayDate.getMonth() + 1).padStart(2, '0');
  const todayD = String(todayDate.getDate()).padStart(2, '0');
  const todayIso = `${todayY}-${todayM}-${todayD}`;

  const cells: (Cell | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (const iso of dates) {
    const day = Number(iso.split('-')[2]);
    cells.push({ iso, day, isFuture: iso > todayIso });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function buildMonthSummary(
  monthKey: string,
  periods: { start: string; end: string }[],
): string | null {
  if (periods.length === 0) return null;
  const totalDays = periods.reduce((acc, p) => {
    const [ys, ms, ds] = p.start.split('-').map(Number);
    const [ye, me, de] = p.end.split('-').map(Number);
    const days =
      Math.round(
        (new Date(ye, me - 1, de).getTime() - new Date(ys, ms - 1, ds).getTime()) / 86_400_000,
      ) + 1;
    return acc + days;
  }, 0);
  const periodsLabel = periods.length === 1 ? '1 period' : `${periods.length} periods`;
  const daysLabel = totalDays === 1 ? '1 day' : `${totalDays} days`;
  const monthName = formatMonthLabel(monthKey).split(' ')[0];
  const firstStart = periods[0].start;
  const [y, m, d] = firstStart.split('-').map(Number);
  const startedLabel = new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric' }).format(
    new Date(y, m - 1, d),
  );
  return `${monthName}: ${periodsLabel} · ${daysLabel} · started ${startedLabel}`;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  scroll: {
    paddingBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paperRaised,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    ...typography.heading,
    color: colors.ink,
  },
  monthSummary: {
    ...typography.caption,
    color: colors.inkMuted,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    textAlign: 'center',
  },
  weekHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  weekHeader: {
    ...typography.kicker,
    color: colors.inkMuted,
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
  },
  cell: {
    width: `${100 / 7}%`,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 56,
    gap: 4,
  },
  cellToday: {
    backgroundColor: colors.paperRaised,
    borderRadius: radius.card,
  },
  cellSelected: {
    backgroundColor: colors.bloomTint,
    borderRadius: radius.card,
  },
  cellFuture: {
    opacity: 0.55,
  },
  cellBlank: {
    width: `${100 / 7}%`,
    minHeight: 56,
  },
  cellNumber: {
    ...typography.subhead,
    fontSize: 15,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  cellNumberToday: {
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
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendLabel: {
    ...typography.caption,
    color: colors.inkMuted,
  },
  legendTodayBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: colors.paperRaised,
    borderColor: colors.rule,
    borderWidth: 1,
  },
  hint: {
    ...typography.caption,
    color: colors.inkMuted,
    textAlign: 'center',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopColor: colors.rule,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  doneBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
  },
  doneBtnText: {
    ...typography.subhead,
    color: colors.paperRaised,
  },
});
