import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { PressableOpacity } from '@/src/components/ui';
import type { MonthlySpends } from '@/src/data/types';
import {
  dayOfMonth,
  formatDayShort,
  formatMonthAbbrev,
  formatMonthAbbrevYear,
  formatWeekdayDay,
  lastNDaysIso,
  lastNMonthsKeys,
} from '@/src/lib/date';
import { dailyTotals, entriesInRange, monthlyTotals } from '@/src/lib/monthly-spends';
import { formatINR } from '@/src/lib/currency';
import { colors, radius, spacing, typography } from '@/src/theme';

export type Metric = 'net' | 'earning' | 'spend';
export type Range = 'week' | 'month' | 'year';

const METRICS: { id: Metric; label: string; color: string }[] = [
  { id: 'net', label: 'Net', color: colors.ink },
  { id: 'earning', label: 'Earnings', color: colors.success },
  { id: 'spend', label: 'Spends', color: colors.danger },
];

const RANGES: { id: Range; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

const CHART_HEIGHT = 160;
const LABEL_ROW_HEIGHT = 22;
const TOOLTIP_WIDTH = 150;
const TOOLTIP_HEIGHT = 52;

type Bar = {
  key: string;
  iso: string;
  value: number;
  label: string;
  fullLabel: string;
};

export function TransactionChart({
  metric,
  onMetricChange,
  range,
  onRangeChange,
  monthlySpends,
  width,
}: {
  metric: Metric;
  onMetricChange: (m: Metric) => void;
  range: Range;
  onRangeChange: (r: Range) => void;
  monthlySpends: MonthlySpends;
  width: number;
}) {
  const [pressedIdx, setPressedIdx] = useState<number | null>(null);

  const bars: Bar[] = useMemo(() => {
    if (range === 'year') {
      const months = lastNMonthsKeys(12);
      const totals = monthlyTotals(monthlySpends, months, metric);
      return months.map((mk, i) => ({
        key: mk,
        iso: `${mk}-01`,
        value: totals[i],
        label: formatMonthAbbrev(mk),
        fullLabel: formatMonthAbbrevYear(mk),
      }));
    }
    const days = lastNDaysIso(range === 'week' ? 7 : 30);
    const inRange = entriesInRange(monthlySpends, days[0], days[days.length - 1]);
    const totals = dailyTotals(inRange, days, metric);
    return days.map((iso, i) => ({
      key: iso,
      iso,
      value: totals[i],
      label: range === 'week' ? formatDayShort(iso) : String(dayOfMonth(iso)),
      fullLabel: formatWeekdayDay(iso),
    }));
  }, [range, metric, monthlySpends]);

  const sum = bars.reduce((a, b) => a + b.value, 0);
  const avg = sum / bars.length;
  const latest = bars[bars.length - 1]?.value ?? 0;
  const maxAbs = Math.max(...bars.map((b) => Math.abs(b.value)), 1);

  const padX = 16;
  const padTop = 16;
  const barGap = range === 'week' ? 8 : range === 'year' ? 8 : 3;
  const chartW = width - padX * 2;
  const barW = (chartW - barGap * (bars.length - 1)) / bars.length;

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

  const config = METRICS.find((m) => m.id === metric)!;
  const summaryColor = metric === 'net' ? (latest >= 0 ? colors.success : colors.danger) : config.color;

  let tooltipLeft = 0;
  let tooltipBarTop = 0;
  if (pressedIdx !== null) {
    const barX = padX + pressedIdx * (barW + barGap);
    const barCenter = barX + barW / 2;
    tooltipLeft = Math.max(8, Math.min(barCenter - TOOLTIP_WIDTH / 2, width - TOOLTIP_WIDTH - 8));
    const v = Math.abs(bars[pressedIdx].value);
    const h = maxAbs > 0 ? Math.max((CHART_HEIGHT - padTop) * (v / maxAbs), v > 0 ? 4 : 0) : 0;
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
          <Text style={[styles.metricValue, { color: summaryColor }]} numberOfLines={1}>
            {formatINR(latest, { compact: true, signed: metric === 'net' })}
          </Text>
        </View>
        <View style={styles.summaryRight}>
          <SummaryStat label={summaryLabels.avg} value={formatINR(avg, { compact: true })} />
          <SummaryStat label="TOTAL" value={formatINR(sum, { compact: true })} />
        </View>
      </View>

      <View style={[styles.chartArea, { width }]}>
        <View style={[styles.barsRow, { paddingHorizontal: padX, height: CHART_HEIGHT }]}>
          {bars.map((b, i) => {
            const v = Math.abs(b.value);
            const h = maxAbs > 0 ? Math.max((CHART_HEIGHT - padTop) * (v / maxAbs), v > 0 ? 4 : 0) : 0;
            const isLatest = i === bars.length - 1;
            const isPressed = pressedIdx === i;
            const baseColor =
              metric === 'net' ? (b.value >= 0 ? colors.success : colors.danger) : config.color;
            const fillColor = isLatest || isPressed ? baseColor : `${baseColor}77`;

            return (
              <Pressable
                key={b.key}
                onPress={() => {}}
                onLongPress={() => handleLongPress(i)}
                onPressOut={handleRelease}
                delayLongPress={140}
                style={[styles.barCell, { width: barW, marginLeft: i === 0 ? 0 : barGap }]}>
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
            const isLatest = i === bars.length - 1;
            return (
              <View
                key={b.key}
                style={{ width: barW, marginLeft: i === 0 ? padX : barGap, alignItems: 'center' }}>
                {showLabel ? (
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.label,
                      isLatest && styles.labelStrong,
                      { fontSize: range === 'month' ? 9 : 11 },
                    ]}>
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
            <Text style={styles.tooltipValue} numberOfLines={1}>
              {formatINR(bars[pressedIdx].value, { signed: metric === 'net' })}
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
  return i === 0 || i === total - 1 || i % 5 === 0;
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.kicker}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  tabText: { ...typography.caption, fontSize: 12, fontWeight: '600', color: colors.inkSoft },
  tabTextActive: { color: colors.paperRaised },
  rangeRow: {
    flexDirection: 'row',
    backgroundColor: colors.paperRecessed,
    borderRadius: 999,
    padding: 3,
    alignSelf: 'flex-start',
  },
  rangePill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999, minWidth: 64, alignItems: 'center' },
  rangePillActive: { backgroundColor: colors.paperRaised },
  rangeText: { ...typography.caption, fontSize: 12, fontWeight: '600', color: colors.inkMuted },
  rangeTextActive: { color: colors.ink },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.xxs,
  },
  summaryRight: { flexDirection: 'row', gap: spacing.md },
  stat: { alignItems: 'flex-end', gap: 2 },
  kicker: { ...typography.kicker, color: colors.inkMuted, fontSize: 10 },
  metricValue: { ...typography.metric, fontSize: 24 },
  statValue: { ...typography.metricSm, color: colors.ink },
  chartArea: {
    backgroundColor: colors.paperRaised,
    borderRadius: 12,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.xs,
    position: 'relative',
  },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end' },
  barCell: { height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%' },
  labelRow: { flexDirection: 'row', height: LABEL_ROW_HEIGHT, alignItems: 'center' },
  label: { ...typography.caption, fontSize: 11, color: colors.inkMuted },
  labelStrong: { color: colors.ink, fontWeight: '600' },
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
  tooltipValue: { ...typography.metric, fontSize: 18, color: colors.paperRaised },
  tooltipSub: { ...typography.caption, fontSize: 11, color: colors.paperRaised, opacity: 0.7, marginTop: 1 },
});
