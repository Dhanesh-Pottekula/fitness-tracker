import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { PressableOpacity } from '@/src/components/ui';
import type { PhysicalHealth } from '@/src/data/types';
import {
  dayOfMonth,
  formatDayShort,
  formatMonthAbbrev,
  formatMonthAbbrevYear,
  formatWeekdayDay,
  isoDatesInMonth,
  lastNDaysIso,
  lastNMonthsKeys,
} from '@/src/lib/date';
import { dayMacros, foodsById } from '@/src/lib/physical-health';
import { colors, radius, spacing, typography } from '@/src/theme';

export type Metric = 'kcal' | 'protein' | 'carbs' | 'fats' | 'water';
export type Range = 'week' | 'month' | 'year';

const METRICS: { id: Metric; label: string; unit: string; color: string }[] = [
  { id: 'kcal', label: 'Calories', unit: 'kcal', color: colors.clay },
  { id: 'protein', label: 'Protein', unit: 'g', color: colors.sage },
  { id: 'carbs', label: 'Carbs', unit: 'g', color: colors.ochre },
  { id: 'fats', label: 'Fats', unit: 'g', color: colors.slate },
  { id: 'water', label: 'Water', unit: 'ml', color: colors.water },
];

const RANGES: { id: Range; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

const CHART_HEIGHT = 160;
const LABEL_ROW_HEIGHT = 22;
const TOOLTIP_WIDTH = 130;
const TOOLTIP_HEIGHT = 52;

type Bar = {
  key: string;
  iso: string;
  value: number;
  label: string;
  fullLabel: string;
};

export function MetricBarChart({
  metric,
  onMetricChange,
  range,
  onRangeChange,
  physicalHealth,
  selectedDate,
  onSelectDate,
  width,
}: {
  metric: Metric;
  onMetricChange: (m: Metric) => void;
  range: Range;
  onRangeChange: (r: Range) => void;
  physicalHealth: PhysicalHealth;
  selectedDate: string;
  onSelectDate: (iso: string) => void;
  width: number;
}) {
  const [pressedIdx, setPressedIdx] = useState<number | null>(null);
  const config = METRICS.find((m) => m.id === metric)!;
  const foodsByIdMap = useMemo(() => foodsById(physicalHealth.foods), [physicalHealth.foods]);

  const target = useMemo(() => {
    const t = physicalHealth.targets;
    if (metric === 'kcal') return t.calories;
    if (metric === 'water') return t.water;
    return t[metric];
  }, [physicalHealth.targets, metric]);

  function valueForDay(iso: string): number {
    const entry = physicalHealth.daily[iso];
    if (!entry) return 0;
    if (metric === 'water') return entry.water || 0;
    const m = dayMacros(entry, foodsByIdMap);
    return m[metric === 'kcal' ? 'kcal' : metric] || 0;
  }

  const bars: Bar[] = useMemo(() => {
    if (range === 'week') {
      const days = lastNDaysIso(7);
      return days.map((iso) => ({
        key: iso,
        iso,
        value: valueForDay(iso),
        label: formatDayShort(iso),
        fullLabel: formatWeekdayDay(iso),
      }));
    }
    if (range === 'month') {
      const days = lastNDaysIso(30);
      return days.map((iso) => ({
        key: iso,
        iso,
        value: valueForDay(iso),
        label: String(dayOfMonth(iso)),
        fullLabel: formatWeekdayDay(iso),
      }));
    }
    const months = lastNMonthsKeys(12);
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentDay = now.getDate();
    return months.map((mk) => {
      const isos = isoDatesInMonth(mk);
      const daysCounted = mk === currentMonthKey ? currentDay : isos.length;
      const slice = isos.slice(0, daysCounted);
      const sum = slice.reduce((acc, iso) => acc + valueForDay(iso), 0);
      const avg = daysCounted > 0 ? sum / daysCounted : 0;
      return {
        key: mk,
        iso: isos[Math.max(0, daysCounted - 1)],
        value: avg,
        label: formatMonthAbbrev(mk),
        fullLabel: formatMonthAbbrevYear(mk),
      };
    });
  }, [range, metric, physicalHealth.daily, physicalHealth.foods]); // eslint-disable-line react-hooks/exhaustive-deps

  const max = Math.max(...bars.map((b) => b.value), target) * 1.15 || 1;
  const sum = bars.reduce((a, b) => a + b.value, 0);
  const avg = sum / bars.length;
  const latest = bars[bars.length - 1]?.value ?? 0;

  const padX = 16;
  const padTop = 16;
  const chartW = width - padX * 2;
  const barGap = range === 'year' ? 8 : range === 'week' ? 8 : 3;
  const barW = (chartW - barGap * (bars.length - 1)) / bars.length;
  const targetY = padTop + (CHART_HEIGHT - padTop) * (1 - target / max);

  function handleLongPress(idx: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    setPressedIdx(idx);
  }

  function handleRelease() {
    setPressedIdx(null);
  }

  const summaryLabels = {
    week: { latest: 'TODAY', avg: '7-DAY AVG' },
    month: { latest: 'TODAY', avg: '30-DAY AVG' },
    year: { latest: 'THIS MONTH', avg: '12-MO AVG' },
  }[range];

  const round = (n: number) => Math.round(n).toLocaleString('en-IN');

  // Tooltip placement
  let tooltipLeft = 0;
  let tooltipBarTop = 0;
  if (pressedIdx !== null) {
    const barX = padX + pressedIdx * (barW + barGap);
    const barCenter = barX + barW / 2;
    tooltipLeft = Math.max(8, Math.min(barCenter - TOOLTIP_WIDTH / 2, width - TOOLTIP_WIDTH - 8));
    const v = bars[pressedIdx].value;
    const h = max > 0 ? Math.max((CHART_HEIGHT - padTop) * (v / max), v > 0 ? 4 : 0) : 0;
    tooltipBarTop = padTop + (CHART_HEIGHT - padTop) - h;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.tabs}>
        {METRICS.map((m) => {
          const active = m.id === metric;
          return (
            <PressableOpacity
              key={m.id}
              onPress={() => {
                Haptics.selectionAsync().catch(() => undefined);
                onMetricChange(m.id);
              }}
              style={[styles.tab, active && styles.tabActive]}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{m.label}</Text>
            </PressableOpacity>
          );
        })}
      </View>

      <View style={styles.rangeRow}>
        {RANGES.map((r) => {
          const active = r.id === range;
          return (
            <PressableOpacity
              key={r.id}
              onPress={() => {
                Haptics.selectionAsync().catch(() => undefined);
                onRangeChange(r.id);
                setPressedIdx(null);
              }}
              style={[styles.rangePill, active && styles.rangePillActive]}>
              <Text style={[styles.rangeText, active && styles.rangeTextActive]}>{r.label}</Text>
            </PressableOpacity>
          );
        })}
      </View>

      <View style={styles.summary}>
        <View>
          <Text style={styles.kicker}>{summaryLabels.latest}</Text>
          <Text style={[styles.metricValue, { color: config.color }]}>
            {round(latest)}
            <Text style={styles.metricUnit}> {config.unit}</Text>
          </Text>
        </View>
        <View style={styles.summaryRight}>
          <SummaryStat label={summaryLabels.avg} value={round(avg)} unit={config.unit} />
          <SummaryStat label="TARGET" value={round(target)} unit={config.unit} />
        </View>
      </View>

      <View style={[styles.chartArea, { width }]}>
        {target > 0 ? (
          <View
            pointerEvents="none"
            style={[
              styles.targetLine,
              { top: targetY, left: padX, right: padX },
            ]}>
            <DashedLine color={colors.target} />
            <Text style={styles.targetTag}>target</Text>
          </View>
        ) : null}

        <View style={[styles.barsRow, { paddingHorizontal: padX, height: CHART_HEIGHT }]}>
          {bars.map((b, i) => {
            const v = b.value;
            const h = max > 0 ? Math.max((CHART_HEIGHT - padTop) * (v / max), v > 0 ? 4 : 0) : 0;
            const reached = target > 0 && v >= target;
            const baseColor = reached ? colors.sage : config.color;
            const isHighlighted = b.iso === selectedDate || i === bars.length - 1 || pressedIdx === i;
            const fillColor = isHighlighted ? baseColor : `${baseColor}77`;

            return (
              <Pressable
                key={b.key}
                onPress={() => onSelectDate(b.iso)}
                onLongPress={() => handleLongPress(i)}
                onPressOut={handleRelease}
                delayLongPress={140}
                style={[
                  styles.barCell,
                  { width: barW, marginLeft: i === 0 ? 0 : barGap },
                ]}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: h,
                      backgroundColor: fillColor,
                      borderRadius: range === 'year' ? 4 : 3,
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.labelRow}>
          {bars.map((b, i) => {
            const showLabel = shouldShowLabel(i, bars.length, range);
            const isHighlighted = b.iso === selectedDate || i === bars.length - 1;
            return (
              <View
                key={b.key}
                style={{ width: barW, marginLeft: i === 0 ? padX : barGap, alignItems: 'center' }}>
                {showLabel ? (
                  <Text
                    numberOfLines={1}
                    style={[styles.label, isHighlighted && styles.labelStrong, { fontSize: range === 'month' ? 9 : 11 }]}>
                    {b.label}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>

        {pressedIdx !== null ? (
          <Animated.View
            entering={FadeIn.duration(120)}
            exiting={FadeOut.duration(100)}
            style={[
              styles.tooltip,
              {
                left: tooltipLeft,
                top: Math.max(0, tooltipBarTop - TOOLTIP_HEIGHT - 8),
                width: TOOLTIP_WIDTH,
              },
            ]}
            pointerEvents="none">
            <Text style={styles.tooltipValue}>
              {round(bars[pressedIdx].value)}
              <Text style={styles.tooltipUnit}> {config.unit}</Text>
            </Text>
            <Text style={styles.tooltipSub}>{bars[pressedIdx].fullLabel}</Text>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

function shouldShowLabel(i: number, total: number, range: Range): boolean {
  if (range === 'week') return true;
  if (range === 'year') return true;
  // month: first, last, and every 5th
  return i === 0 || i === total - 1 || i % 5 === 0;
}

function DashedLine({ color }: { color: string }) {
  const dashes = Array.from({ length: 40 }, (_, i) => i);
  return (
    <View style={styles.dashedRow} pointerEvents="none">
      {dashes.map((i) => (
        <View key={i} style={[styles.dash, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

function SummaryStat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.kicker}>{label}</Text>
      <Text style={styles.statValue}>
        {value}
        <Text style={styles.statUnit}> {unit}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  tabText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkSoft,
  },
  tabTextActive: {
    color: colors.paperRaised,
  },
  rangeRow: {
    flexDirection: 'row',
    backgroundColor: colors.paperRecessed,
    borderRadius: 999,
    padding: 3,
    alignSelf: 'flex-start',
  },
  rangePill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    minWidth: 64,
    alignItems: 'center',
  },
  rangePillActive: {
    backgroundColor: colors.paperRaised,
  },
  rangeText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkMuted,
  },
  rangeTextActive: {
    color: colors.ink,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.xxs,
  },
  summaryRight: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stat: {
    alignItems: 'flex-end',
    gap: 2,
  },
  kicker: {
    ...typography.kicker,
    color: colors.inkMuted,
    fontSize: 10,
  },
  metricValue: {
    ...typography.metric,
    fontSize: 26,
  },
  metricUnit: {
    ...typography.caption,
    color: colors.inkMuted,
  },
  statValue: {
    ...typography.metricSm,
    color: colors.ink,
  },
  statUnit: {
    ...typography.caption,
    color: colors.inkMuted,
  },
  chartArea: {
    backgroundColor: colors.paperRaised,
    borderRadius: 12,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.xs,
    position: 'relative',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  barCell: {
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    height: LABEL_ROW_HEIGHT,
    alignItems: 'center',
  },
  label: {
    ...typography.caption,
    fontSize: 11,
    color: colors.inkMuted,
  },
  labelStrong: {
    color: colors.ink,
    fontWeight: '600',
  },
  targetLine: {
    position: 'absolute',
    height: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetTag: {
    position: 'absolute',
    right: 0,
    top: -14,
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
    color: colors.target,
    letterSpacing: 0.6,
  },
  dashedRow: {
    flexDirection: 'row',
    flex: 1,
    gap: 4,
    overflow: 'hidden',
  },
  dash: {
    width: 4,
    height: 1,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: colors.ink,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: TOOLTIP_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.ink,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  tooltipValue: {
    ...typography.metric,
    fontSize: 18,
    color: colors.paperRaised,
  },
  tooltipUnit: {
    ...typography.caption,
    color: colors.paperRaised,
    opacity: 0.7,
  },
  tooltipSub: {
    ...typography.caption,
    fontSize: 11,
    color: colors.paperRaised,
    opacity: 0.7,
    marginTop: 1,
  },
});
