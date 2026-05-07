import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { PressableOpacity } from '@/src/components/ui';
import type { Food, Meal } from '@/src/data/types';
import { gramsToQuantity, itemMacros, quantityUnit } from '@/src/lib/physical-health';
import { colors, radius, spacing, typography } from '@/src/theme';

export function MealCard({
  meal,
  index,
  foodsById,
  onAddItems,
  onDelete,
  onSaveAsTemplate,
}: {
  meal: Meal;
  index: number;
  foodsById: Record<string, Food>;
  onAddItems: (mealIndex: number) => void;
  onDelete: (mealIndex: number) => void;
  onSaveAsTemplate: (mealIndex: number, name: string) => void;
}) {
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  const totals = meal.items.reduce(
    (acc, item) => {
      const m = itemMacros(item, foodsById);
      return {
        kcal: acc.kcal + m.kcal,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fats: acc.fats + m.fats,
      };
    },
    { kcal: 0, protein: 0, carbs: 0, fats: 0 },
  );

  function openTemplateForm() {
    Haptics.selectionAsync().catch(() => undefined);
    setTemplateName(meal.label || '');
    setTemplateOpen(true);
  }

  function cancelTemplate() {
    setTemplateOpen(false);
    setTemplateName('');
  }

  function commitTemplate() {
    const trimmed = templateName.trim();
    if (!trimmed || meal.items.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    onSaveAsTemplate(index, trimmed);
    setTemplateOpen(false);
    setTemplateName('');
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
  }

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <Text style={styles.time}>{meal.time}</Text>
          <Text style={styles.label}>{(meal.label || 'MEAL').toUpperCase()}</Text>
        </View>
        <View style={styles.headActions}>
          <PressableOpacity
            onPress={openTemplateForm}
            style={styles.iconBtn}
            hitSlop={6}
            disabled={templateOpen || meal.items.length === 0}>
            <Ionicons
              name={justSaved ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={
                justSaved
                  ? colors.sage
                  : meal.items.length === 0
                  ? colors.rule
                  : colors.clay
              }
            />
          </PressableOpacity>
          <PressableOpacity onPress={() => onDelete(index)} style={styles.iconBtn} hitSlop={6}>
            <Ionicons name="close" size={18} color={colors.inkMuted} />
          </PressableOpacity>
        </View>
      </View>

      {templateOpen ? (
        <View style={styles.templateForm}>
          <TextInput
            autoFocus
            value={templateName}
            onChangeText={setTemplateName}
            placeholder="Template name"
            placeholderTextColor={colors.inkMuted}
            style={styles.templateInput}
            returnKeyType="done"
            onSubmitEditing={commitTemplate}
          />
          <PressableOpacity onPress={cancelTemplate} style={styles.templateCancel} hitSlop={6}>
            <Text style={styles.templateCancelText}>Cancel</Text>
          </PressableOpacity>
          <PressableOpacity
            onPress={commitTemplate}
            disabled={!templateName.trim()}
            style={[styles.templateSave, !templateName.trim() && styles.templateSaveDisabled]}>
            <Text style={styles.templateSaveText}>Save</Text>
          </PressableOpacity>
        </View>
      ) : justSaved ? (
        <View style={styles.savedBanner}>
          <Ionicons name="checkmark-circle" size={14} color={colors.sage} />
          <Text style={styles.savedBannerText}>Saved as template</Text>
        </View>
      ) : null}

      <View style={styles.kcalRow}>
        <Text style={styles.kcal}>{Math.round(totals.kcal)} kcal</Text>
        <Text style={styles.macroLine}>
          P {Math.round(totals.protein)} · C {Math.round(totals.carbs)} · F {Math.round(totals.fats)}
        </Text>
      </View>

      <View style={styles.items}>
        {meal.items.length === 0 ? (
          <Text style={styles.empty}>No items yet</Text>
        ) : (
          meal.items.map((item, itemIndex) => {
            const food = foodsById[item.foodId];
            const m = itemMacros(item, foodsById);
            const qty = food ? gramsToQuantity(item.grams, food) : item.grams;
            const unit = food ? quantityUnit(food) : 'g';
            return (
              <View key={`${item.foodId}-${itemIndex}`} style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <Text style={styles.itemName}>{food?.name ?? item.foodId}</Text>
                  <Text style={styles.itemMeta}>{Math.round(m.kcal)} kcal</Text>
                </View>
                <Text style={styles.itemAmount}>
                  {qty}
                  {unit === '×' ? ' ×' : 'g'}
                </Text>
              </View>
            );
          })
        )}
      </View>

      <PressableOpacity onPress={() => onAddItems(index)} style={styles.addRow} hitSlop={8}>
        <Ionicons name="add" size={18} color={colors.clay} />
        <Text style={styles.addText}>Add items</Text>
      </PressableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.paperRaised,
    borderColor: colors.rule,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headLeft: {
    flex: 1,
    gap: 2,
  },
  headActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  time: {
    ...typography.metricSm,
    color: colors.inkMuted,
  },
  label: {
    ...typography.subhead,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  iconBtn: {
    minHeight: 32,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateForm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    borderTopColor: colors.rule,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  templateInput: {
    ...typography.body,
    flex: 1,
    color: colors.ink,
    borderBottomColor: colors.rule,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
  },
  templateCancel: {
    minHeight: 36,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  templateCancelText: {
    ...typography.caption,
    fontSize: 13,
    color: colors.inkMuted,
  },
  templateSave: {
    backgroundColor: colors.clay,
    borderRadius: 999,
    paddingHorizontal: 14,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateSaveDisabled: {
    backgroundColor: colors.rule,
  },
  templateSaveText: {
    ...typography.subhead,
    fontSize: 13,
    color: colors.paperRaised,
  },
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: spacing.xs,
    borderTopColor: colors.rule,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  savedBannerText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.sage,
    fontWeight: '600',
  },
  kcalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  kcal: {
    ...typography.metric,
    fontSize: 22,
    color: colors.clay,
  },
  macroLine: {
    ...typography.caption,
    color: colors.inkMuted,
    fontVariant: ['tabular-nums'],
  },
  items: {
    borderTopColor: colors.rule,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
    paddingVertical: 4,
  },
  itemLeft: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    ...typography.body,
    color: colors.ink,
  },
  itemMeta: {
    ...typography.caption,
    color: colors.inkMuted,
  },
  itemAmount: {
    ...typography.metricSm,
    color: colors.inkSoft,
  },
  empty: {
    ...typography.caption,
    color: colors.inkMuted,
    paddingVertical: spacing.xs,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
  },
  addText: {
    ...typography.subhead,
    fontSize: 14,
    color: colors.clay,
  },
});
