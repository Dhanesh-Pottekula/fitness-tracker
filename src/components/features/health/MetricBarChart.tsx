import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

import { PressableOpacity } from '@/src/components/ui';
import type { PhysicalHealth } from '@/src/data/types';
import { formatDayShort, lastNDaysIso } from '@/src/lib/date';
import { dayMacros, foodsById } from '@/src/lib/physical-health';
import { colors, spacing, typography } from '@/src/theme';

export type Metric = 'kcal' | 'protein' | 'carbs' | 'fats' | 'water';

const METRICS: { id: Metric; label: string; unit: string; color: string }[] = [
  { id: 'kcal', label: 'Calories', unit: 'kcal', color: colors.clay },
  { id: 'protein', label: 'Protein', unit: 'g', color: colors.sage },
  { id: 'carbs', label: 'Carbs', unit: 'g', color: colors.ochre },
  { id: 'fats', label: 'Fats', unit: 'g', color: colors.slate },
  { id: 'water', label: 'Water', unit: 'ml', color: colors.water },
];

const CHART_HEIGHT = 160;
const BAR_COUNT = 7;
const BAR_GAP = 8;

export function MetricBarChart({
  metric,
  onMetricChange,
  physicalHealth,
  selectedDate,
  onSelectDate,
  width,
}: {
  metric: Metric;
  onMetricChange: (m: Metric) => void;
  physicalHealth: PhysicalHealth;
  selectedDate: string;
  onSelectDate: (iso: string) => void;
  width: number;
}) {
  const days = useMemo(() => lastNDaysIso(BAR_COUNT), []);
  const foodsByIdMap = useMemo(() => foodsById(physicalHealth.foods), [physicalHealth.foods]);

  const config = METRICS.find((m) => m.id === metric)!;

  const values = useMemo(() => {
    return days.map((iso) => {
      const entry = physicalHealth.daily[iso];
      if (!entry) return 0;
      if (metric === 'water') return entry.water || 0;
      const macros = dayMacros(entry, foodsByIdMap);
      return macros[metric === 'kcal' ? 'kcal' : metric] || 0;
    });
  }, [days, physicalHealth.daily, metric, foodsByIdMap]);

  const target = useMemo(() => {
    const targets = physicalHealth.targets;
    if (metric === 'kcal') return targets.calories;
    if (metric === 'water') return targets.water;
    return targets[metric];
  }, [physicalHealth.targets, metric]);

  const max = Math.max(...values, target) * 1.15 || 1;
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / BAR_COUNT;
  const todayValue = values[BAR_COUNT - 1];

  const padX = 16;
  const padTop = 16;
  const chartW = width - padX * 2;
  const barW = (chartW - BAR_GAP * (BAR_COUNT - 1)) / BAR_COUNT;
  const targetY = padTop + (CHART_HEIGHT - padTop) * (1 - target / max);

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

      <View style={styles.summary}>
        <View>
          <Text style={styles.kicker}>TODAY</Text>
          <Text style={[styles.metricValue, { color: config.color }]}>
            {Math.round(todayValue).toLocaleString('en-IN')}
            <Text style={styles.metricUnit}> {config.unit}</Text>
          </Text>
        </View>
        <View style={styles.summaryRight}>
          <SummaryStat label="7-DAY AVG" value={`${Math.round(avg).toLocaleString('en-IN')}`} unit={config.unit} />
          <SummaryStat label="TARGET" value={`${Math.round(target).toLocaleString('en-IN')}`} unit={config.unit} />
        </View>
      </View>

      <View style={styles.chartArea}>
        <Svg width={width} height={CHART_HEIGHT + 24}>
          {target > 0 && targetY > padTop ? (
            <>
              <Line
                x1={padX}
                x2={width - padX}
                y1={targetY}
                y2={targetY}
                stroke={colors.target}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <SvgText
                x={width - padX}
                y={targetY - 4}
                fill={colors.target}
                fontSize={10}
                fontWeight="600"
                textAnchor="end">
                target
              </SvgText>
            </>
          ) : null}

          {days.map((iso, i) => {
            const v = values[i];
            const h = max > 0 ? Math.max((CHART_HEIGHT - padTop) * (v / max), v > 0 ? 3 : 0) : 0;
            const x = padX + i * (barW + BAR_GAP);
            const y = padTop + (CHART_HEIGHT - padTop) - h;
            const isSelected = iso === selectedDate;
            const isToday = i === BAR_COUNT - 1;
            const fillColor = isSelected || isToday ? config.color : `${config.color}66`;

            return (
              <Rect
                key={iso}
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={4}
                fill={fillColor}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => undefined);
                  onSelectDate(iso);
                }}
              />
            );
          })}
        </Svg>

        <View style={styles.labelRow}>
          {days.map((iso, i) => {
            const isSelected = iso === selectedDate;
            const isToday = i === BAR_COUNT - 1;
            return (
              <PressableOpacity
                key={iso}
                onPress={() => onSelectDate(iso)}
                style={[styles.labelCell, { width: barW, marginLeft: i === 0 ? padX : BAR_GAP }]}>
                <Text
                  style={[
                    styles.label,
                    (isSelected || isToday) && styles.labelStrong,
                    isSelected && { color: config.color },
                  ]}>
                  {formatDayShort(iso)}
                </Text>
              </PressableOpacity>
            );
          })}
        </View>
      </View>
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
    gap: spacing.md,
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
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
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
  },
  labelRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  labelCell: {
    alignItems: 'center',
    minHeight: 28,
    justifyContent: 'center',
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
});
