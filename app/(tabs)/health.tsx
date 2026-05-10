import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CycleSection, CycleStatusStrip } from '@/src/components/features/cycle';
import {
  CalorieRing,
  FoodPickerSheet,
  MacroMiniRing,
  MealCard,
  type Metric,
  MetricBarChart,
  type Range,
  WaterTracker,
} from '@/src/components/features/health';
import { Fab, Kicker, PressableOpacity } from '@/src/components/ui';
import { useAppData } from '@/src/data';
import { formatDayHeading, todayIso } from '@/src/lib/date';
import { dayMacros, foodsById } from '@/src/lib/physical-health';
import { colors, radius, spacing, typography } from '@/src/theme';

export default function HealthScreen() {
  const { data, setData } = useAppData();
  const today = todayIso();
  const [date, setDate] = useState<string>(today);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMealIndex, setPickerMealIndex] = useState<number | null>(null);
  const [metric, setMetric] = useState<Metric>('kcal');
  const [range, setRange] = useState<Range>('week');

  const { width } = useWindowDimensions();
  const chartWidth = width - spacing.lg * 2;

  const targets = data.physicalHealth.targets;
  const entry = data.physicalHealth.daily[date] ?? { water: 0, weight: 0, meals: [] };
  const foodsByIdMap = useMemo(() => foodsById(data.physicalHealth.foods), [data.physicalHealth.foods]);
  const macros = useMemo(() => dayMacros(entry, foodsByIdMap), [entry, foodsByIdMap]);

  const isToday = date === today;

  function shiftDate(deltaDays: number) {
    const [y, m, d] = date.split('-').map(Number);
    const next = new Date(y, m - 1, d + deltaDays);
    const iso = todayIso(next);
    if (iso > today) return;
    Haptics.selectionAsync().catch(() => undefined);
    setDate(iso);
  }

  function updateEntry(patch: Partial<typeof entry>) {
    setData((prev) => ({
      ...prev,
      physicalHealth: {
        ...prev.physicalHealth,
        daily: {
          ...prev.physicalHealth.daily,
          [date]: { ...entry, ...patch },
        },
      },
    }));
  }

  function deleteMeal(index: number) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    updateEntry({ meals: entry.meals.filter((_, i) => i !== index) });
  }

  function saveMealAsTemplate(mealIndex: number, name: string) {
    const meal = entry.meals[mealIndex];
    if (!meal || meal.items.length === 0) return;
    setData((prev) => ({
      ...prev,
      physicalHealth: {
        ...prev.physicalHealth,
        mealTemplates: [
          ...(prev.physicalHealth.mealTemplates ?? []),
          {
            id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name,
            label: meal.label,
            items: meal.items.map(({ foodId, grams }) => ({ foodId, grams })),
            createdAt: new Date().toISOString(),
          },
        ],
      },
    }));
  }

  function openNewMeal() {
    setPickerMealIndex(null);
    setPickerOpen(true);
  }

  function openAddItems(mealIndex: number) {
    setPickerMealIndex(mealIndex);
    setPickerOpen(true);
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.pageKicker}>PHYSICAL HEALTH</Text>
          <View style={styles.dateRow}>
            <PressableOpacity onPress={() => shiftDate(-1)} style={styles.dateBtn} hitSlop={8}>
              <Ionicons name="chevron-back" size={20} color={colors.ink} />
            </PressableOpacity>
            <View style={styles.dateLabel}>
              <Text style={styles.heading}>{isToday ? 'Today' : formatDayHeading(date).split(',')[0]}</Text>
              {!isToday ? <Text style={styles.dateSub}>{formatDayHeading(date)}</Text> : null}
            </View>
            <PressableOpacity
              onPress={() => shiftDate(1)}
              style={[styles.dateBtn, isToday && styles.dateBtnDisabled]}
              hitSlop={8}
              disabled={isToday}>
              <Ionicons name="chevron-forward" size={20} color={isToday ? colors.rule : colors.ink} />
            </PressableOpacity>
          </View>
        </View>

        <CycleStatusStrip style={styles.cycleStrip} />

        <CalorieRing value={macros.kcal} target={targets.calories} />

        <View style={styles.macroRow}>
          <MacroMiniRing label="PROTEIN" value={macros.protein} target={targets.protein} color={colors.sage} />
          <MacroMiniRing label="CARBS" value={macros.carbs} target={targets.carbs} color={colors.ochre} />
          <MacroMiniRing label="FATS" value={macros.fats} target={targets.fats} color={colors.slate} />
        </View>

        <Kicker>Water</Kicker>
        <WaterTracker
          value={entry.water}
          target={targets.water}
          onChange={(next) => updateEntry({ water: next })}
        />

        <View style={styles.mealsHeader}>
          <Kicker>Meals · {entry.meals.length}</Kicker>
        </View>
        {entry.meals.length === 0 ? (
          <PressableOpacity onPress={openNewMeal} style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={28} color={colors.inkMuted} />
            <Text style={styles.emptyTitle}>No meals yet</Text>
            <Text style={styles.emptySub}>Tap + to log what you ate</Text>
          </PressableOpacity>
        ) : (
          <View style={styles.mealList}>
            {entry.meals.map((meal, index) => (
              <MealCard
                key={`${meal.time}-${index}`}
                meal={meal}
                index={index}
                foodsById={foodsByIdMap}
                onAddItems={openAddItems}
                onDelete={deleteMeal}
                onSaveAsTemplate={saveMealAsTemplate}
              />
            ))}
          </View>
        )}

        <CycleSection />

        <Kicker>Trends</Kicker>
        <MetricBarChart
          metric={metric}
          onMetricChange={setMetric}
          range={range}
          onRangeChange={setRange}
          physicalHealth={data.physicalHealth}
          selectedDate={date}
          onSelectDate={setDate}
          width={chartWidth}
        />

        <View style={styles.bottomPad} />
      </ScrollView>

      <Fab onPress={openNewMeal} />

      <FoodPickerSheet
        visible={pickerOpen}
        date={date}
        mealIndex={pickerMealIndex}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  header: {
    gap: spacing.xs,
  },
  pageKicker: {
    ...typography.kicker,
    color: colors.inkMuted,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paperRaised,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dateBtnDisabled: {
    opacity: 0.4,
  },
  dateLabel: {
    flex: 1,
    gap: 2,
  },
  heading: {
    ...typography.heading,
    color: colors.ink,
  },
  dateSub: {
    ...typography.caption,
    color: colors.inkMuted,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  mealsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emptyState: {
    backgroundColor: colors.paperRaised,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyTitle: {
    ...typography.subhead,
    color: colors.ink,
  },
  emptySub: {
    ...typography.caption,
    color: colors.inkMuted,
  },
  mealList: {
    gap: spacing.sm,
  },
  bottomPad: {
    height: 96,
  },
  cycleStrip: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
});
