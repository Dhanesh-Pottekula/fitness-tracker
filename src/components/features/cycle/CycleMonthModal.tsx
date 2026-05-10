import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableOpacity } from '@/src/components/ui';
import type { CycleDayEntry } from '@/src/data/types';
import { flowColor } from '@/src/lib/cycle';
import {
  formatMonthLabel,
  isoDatesInMonth,
  monthKeyFromDate,
  nextMonthKey,
  previousMonthKey,
} from '@/src/lib/date';
import { colors, radius, spacing, typography } from '@/src/theme';

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
  const [monthKey, setMonthKey] = useState(monthKeyFromDate());
  const predictedSet = useMemo(() => new Set(predictedDates), [predictedDates]);

  const cells = useMemo(() => buildMonthCells(monthKey), [monthKey]);

  function go(delta: number) {
    Haptics.selectionAsync().catch(() => undefined);
    setMonthKey((prev) => (delta > 0 ? nextMonthKey(prev) : previousMonthKey(prev)));
  }

  function handleCellPress(iso: string, isFuture: boolean) {
    if (isFuture) {
      Haptics.selectionAsync().catch(() => undefined);
      return;
    }
    Haptics.selectionAsync().catch(() => undefined);
    onDayPress(iso);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safe}>
        <View style={styles.header}>
          <PressableOpacity onPress={() => go(-1)} style={styles.navBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={colors.ink} />
          </PressableOpacity>
          <Text style={styles.headerTitle}>{formatMonthLabel(monthKey)}</Text>
          <PressableOpacity onPress={() => go(1)} style={styles.navBtn} hitSlop={8}>
            <Ionicons name="chevron-forward" size={20} color={colors.ink} />
          </PressableOpacity>
        </View>

        <View style={styles.weekHeaderRow}>
          {WEEKDAY_HEADERS.map((label, idx) => (
            <Text key={`${label}-${idx}`} style={styles.weekHeader}>
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((cell, idx) => {
            if (!cell) {
              return <View key={`blank-${idx}`} style={styles.cellBlank} />;
            }
            const entry = daily[cell.iso];
            const isPredicted = predictedSet.has(cell.iso) && cell.isFuture;
            const isToday = cell.iso === today;
            const dotColor = entry?.flow ? flowColor(entry.flow) : null;
            return (
              <Pressable
                key={cell.iso}
                onPress={() => handleCellPress(cell.iso, cell.isFuture)}
                style={({ pressed }) => [
                  styles.cell,
                  isToday && styles.cellToday,
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
          <LegendItem swatch={<View style={[styles.dotSolid, { backgroundColor: colors.bloom }]} />} label="Period" />
          <LegendItem swatch={<View style={styles.dotPredicted} />} label="Predicted" />
          <LegendItem swatch={<View style={styles.legendTodayBox} />} label="Today" />
        </View>

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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.paper,
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
  weekHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
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
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
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
