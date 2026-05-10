import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableOpacity } from '@/src/components/ui';
import { isValidRange, rangeLength } from '@/src/lib/cycle';
import {
  formatMonthLabel,
  isoDatesInMonth,
  monthKeyFromDate,
  nextMonthKey,
  previousMonthKey,
  todayIso,
} from '@/src/lib/date';
import { colors, radius, spacing, typography } from '@/src/theme';

const WEEKDAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type Slot = 'start' | 'end';

export function PeriodRangeModal({
  visible,
  initialStart,
  initialEnd,
  title = 'Set period range',
  onClose,
  onSave,
}: {
  visible: boolean;
  initialStart?: string | null;
  initialEnd?: string | null;
  title?: string;
  onClose: () => void;
  onSave: (start: string, end: string) => void;
}) {
  const today = todayIso();
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [ongoing, setOngoing] = useState(false);
  const [focused, setFocused] = useState<Slot>('start');
  const [monthKey, setMonthKey] = useState(monthKeyFromDate());

  useEffect(() => {
    if (!visible) return;
    setStart(initialStart ?? null);
    const initEnd = initialEnd ?? null;
    setOngoing(initEnd === today);
    setEnd(initEnd);
    setFocused(initialStart ? 'end' : 'start');
    if (initialStart) {
      setMonthKey(initialStart.slice(0, 7));
    } else {
      setMonthKey(monthKeyFromDate());
    }
  }, [visible, initialStart, initialEnd, today]);

  const cells = useMemo(() => buildMonthCells(monthKey), [monthKey]);

  const effectiveEnd = ongoing ? today : end;
  const valid =
    start !== null &&
    effectiveEnd !== null &&
    isValidRange(start, effectiveEnd) &&
    effectiveEnd <= today;

  function handleCellPress(iso: string, isFuture: boolean) {
    if (isFuture) {
      Haptics.selectionAsync().catch(() => undefined);
      return;
    }
    Haptics.selectionAsync().catch(() => undefined);
    if (focused === 'start') {
      setStart(iso);
      if (end && iso > end) setEnd(null);
      setFocused('end');
    } else {
      if (start && iso < start) {
        setEnd(start);
        setStart(iso);
      } else {
        setEnd(iso);
        setOngoing(false);
      }
    }
  }

  function toggleOngoing(value: boolean) {
    Haptics.selectionAsync().catch(() => undefined);
    setOngoing(value);
    if (value) {
      setEnd(today);
    } else if (end === today) {
      setEnd(null);
    }
  }

  function go(delta: number) {
    Haptics.selectionAsync().catch(() => undefined);
    setMonthKey((prev) => (delta > 0 ? nextMonthKey(prev) : previousMonthKey(prev)));
  }

  function handleSave() {
    if (!valid || !start || !effectiveEnd) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    onSave(start, effectiveEnd);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.head}>
            <Text style={styles.title}>{title.toUpperCase()}</Text>
            <PressableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>Cancel</Text>
            </PressableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.slotsRow}>
              <SlotChip
                label="START"
                value={start}
                active={focused === 'start'}
                onPress={() => setFocused('start')}
              />
              <View style={styles.dash} />
              <SlotChip
                label="END"
                value={ongoing ? 'Today' : end}
                active={!ongoing && focused === 'end'}
                disabled={ongoing}
                onPress={() => {
                  if (ongoing) return;
                  setFocused('end');
                }}
              />
            </View>

            <View style={styles.ongoingRow}>
              <Text style={styles.ongoingLabel}>Period is still ongoing</Text>
              <Switch
                value={ongoing}
                onValueChange={toggleOngoing}
                trackColor={{ false: colors.rule, true: colors.bloom }}
                thumbColor={colors.paperRaised}
              />
            </View>

            {start && effectiveEnd && isValidRange(start, effectiveEnd) ? (
              <Text style={styles.lengthLine}>
                {rangeLength(start, effectiveEnd)}{' '}
                {rangeLength(start, effectiveEnd) === 1 ? 'day' : 'days'}
              </Text>
            ) : (
              <Text style={styles.lengthLineDim}>Tap a date to set the {focused}</Text>
            )}

            <View style={styles.calendarHeader}>
              <PressableOpacity onPress={() => go(-1)} style={styles.navBtn} hitSlop={8}>
                <Ionicons name="chevron-back" size={18} color={colors.ink} />
              </PressableOpacity>
              <Text style={styles.monthLabel}>{formatMonthLabel(monthKey)}</Text>
              <PressableOpacity onPress={() => go(1)} style={styles.navBtn} hitSlop={8}>
                <Ionicons name="chevron-forward" size={18} color={colors.ink} />
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
                if (!cell) return <View key={`blank-${idx}`} style={styles.cellBlank} />;
                const isFuture = cell.iso > today;
                const isStart = start === cell.iso;
                const isEnd = effectiveEnd === cell.iso;
                const inRange =
                  start !== null &&
                  effectiveEnd !== null &&
                  cell.iso > start &&
                  cell.iso < effectiveEnd;
                const isToday = cell.iso === today;
                return (
                  <Pressable
                    key={cell.iso}
                    onPress={() => handleCellPress(cell.iso, isFuture)}
                    style={({ pressed }) => [
                      styles.cell,
                      inRange && styles.cellInRange,
                      (isStart || isEnd) && styles.cellEdge,
                      isFuture && styles.cellFuture,
                      pressed && !isFuture && { opacity: 0.6 },
                    ]}>
                    <Text
                      style={[
                        styles.cellNumber,
                        isToday && styles.cellNumberToday,
                        (isStart || isEnd) && styles.cellNumberEdge,
                      ]}>
                      {cell.day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <PressableOpacity
              onPress={handleSave}
              disabled={!valid}
              style={[styles.saveBtn, !valid && { opacity: 0.4 }]}>
              <Text style={styles.saveBtnText}>Save</Text>
            </PressableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function SlotChip({
  label,
  value,
  active,
  disabled,
  onPress,
}: {
  label: string;
  value: string | null;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <PressableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        slotStyles.chip,
        active && slotStyles.chipActive,
        disabled && slotStyles.chipDisabled,
      ]}>
      <Text style={slotStyles.label}>{label}</Text>
      <Text style={[slotStyles.value, !value && slotStyles.valuePlaceholder]}>
        {value ? formatChipDate(value) : 'Tap to set'}
      </Text>
    </PressableOpacity>
  );
}

function formatChipDate(iso: string): string {
  if (iso === 'Today') return 'Today';
  if (iso === todayIso()) return 'Today';
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric' }).format(
    new Date(y, m - 1, d),
  );
}

interface Cell {
  iso: string;
  day: number;
}

function buildMonthCells(monthKey: string): (Cell | null)[] {
  const dates = isoDatesInMonth(monthKey);
  if (dates.length === 0) return [];
  const [y, m] = monthKey.split('-').map(Number);
  const firstWeekday = new Date(y, m - 1, 1).getDay();
  const leading = (firstWeekday + 6) % 7;

  const cells: (Cell | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (const iso of dates) {
    const day = Number(iso.split('-')[2]);
    cells.push({ iso, day });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(29,29,31,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.paperRaised,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: spacing.md,
    maxHeight: '90%',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.rule,
    marginBottom: spacing.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.kicker,
    color: colors.inkMuted,
  },
  closeBtn: {
    minHeight: 44,
    justifyContent: 'center',
  },
  closeText: {
    ...typography.subhead,
    color: colors.clay,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  slotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dash: {
    width: 12,
    height: 1,
    backgroundColor: colors.rule,
  },
  ongoingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  ongoingLabel: {
    ...typography.body,
    fontSize: 14,
    color: colors.inkSoft,
  },
  lengthLine: {
    ...typography.subhead,
    fontSize: 13,
    color: colors.bloom,
    textAlign: 'center',
    paddingVertical: spacing.xs,
  },
  lengthLineDim: {
    ...typography.caption,
    color: colors.inkMuted,
    textAlign: 'center',
    paddingVertical: spacing.xs,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paperRecessed,
  },
  monthLabel: {
    ...typography.subhead,
    color: colors.ink,
  },
  weekHeaderRow: {
    flexDirection: 'row',
  },
  weekHeader: {
    ...typography.kicker,
    fontSize: 10,
    color: colors.inkMuted,
    flex: 1,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    paddingVertical: 8,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  cellBlank: {
    width: `${100 / 7}%`,
    minHeight: 40,
  },
  cellInRange: {
    backgroundColor: colors.bloomTint,
  },
  cellEdge: {
    backgroundColor: colors.bloom,
  },
  cellFuture: {
    opacity: 0.35,
  },
  cellNumber: {
    ...typography.subhead,
    fontSize: 14,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  cellNumberToday: {
    fontWeight: '700',
  },
  cellNumberEdge: {
    color: colors.paperRaised,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopColor: colors.rule,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.bloom,
    alignItems: 'center',
  },
  saveBtnText: {
    ...typography.subhead,
    color: colors.paperRaised,
  },
});

const slotStyles = StyleSheet.create({
  chip: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.rule,
    backgroundColor: colors.paperRecessed,
    gap: 2,
  },
  chipActive: {
    borderColor: colors.bloom,
    backgroundColor: colors.bloomTint,
  },
  chipDisabled: {
    opacity: 0.6,
  },
  label: {
    ...typography.kicker,
    fontSize: 9,
    color: colors.inkMuted,
  },
  value: {
    ...typography.subhead,
    fontSize: 14,
    color: colors.ink,
  },
  valuePlaceholder: {
    color: colors.inkMuted,
    fontWeight: '400',
  },
});
