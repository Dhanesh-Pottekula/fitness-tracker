import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableOpacity } from '@/src/components/ui';
import { useAppData } from '@/src/data';
import type { Food, MealItem } from '@/src/data/types';
import { formatHHMM, suggestMealLabel } from '@/src/lib/date';
import {
  defaultQuantity,
  foodsById,
  gramsToQuantity,
  itemMacros,
  perServingMacros,
  quantityToGrams,
  quantityUnit,
  servingLabel,
  slugify,
} from '@/src/lib/physical-health';
import { colors, radius, spacing, typography } from '@/src/theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = Math.min(SCREEN_HEIGHT * 0.92, SCREEN_HEIGHT - 40);

const PRESET_LABELS = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];

type DraftItem = MealItem;

export function FoodPickerSheet({
  visible,
  date,
  mealIndex,
  onClose,
}: {
  visible: boolean;
  date: string;
  mealIndex: number | null;
  onClose: () => void;
}) {
  const { data, setData } = useAppData();
  const isEditing = mealIndex !== null;

  const foods = data.physicalHealth.foods;
  const foodsByIdMap = useMemo(() => foodsById(foods), [foods]);

  const existingMeal =
    isEditing && mealIndex !== null ? data.physicalHealth.daily[date]?.meals[mealIndex] : null;

  const [time, setTime] = useState<string>(formatHHMM());
  const [label, setLabel] = useState<string>(suggestMealLabel());
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<DraftItem[]>([]);
  const [qtyByFood, setQtyByFood] = useState<Record<string, string>>({});
  const [customOpen, setCustomOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState({ name: '', kcal: '', protein: '', carbs: '', fats: '' });

  useEffect(() => {
    if (!visible) return;
    if (existingMeal) {
      setTime(existingMeal.time || formatHHMM());
      setLabel(existingMeal.label || suggestMealLabel());
      setCart(existingMeal.items.map((item) => ({ foodId: item.foodId, grams: item.grams })));
    } else {
      setTime(formatHHMM());
      setLabel(suggestMealLabel());
      setCart([]);
    }
    setSearch('');
    setCustomOpen(false);
    setCustomDraft({ name: '', kcal: '', protein: '', carbs: '', fats: '' });
    setQtyByFood({});
  }, [visible, existingMeal]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = [...foods].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return all;
    return all
      .filter((f) => f.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
        const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return a.name.localeCompare(b.name);
      });
  }, [foods, search]);

  const cartTotals = useMemo(
    () =>
      cart.reduce(
        (acc, item) => {
          const m = itemMacros(item, foodsByIdMap);
          return {
            kcal: acc.kcal + m.kcal,
            protein: acc.protein + m.protein,
            carbs: acc.carbs + m.carbs,
            fats: acc.fats + m.fats,
          };
        },
        { kcal: 0, protein: 0, carbs: 0, fats: 0 },
      ),
    [cart, foodsByIdMap],
  );

  function qtyFor(food: Food) {
    return qtyByFood[food.id] ?? String(defaultQuantity(food));
  }

  function addToCart(food: Food) {
    const qty = Number(qtyFor(food));
    if (!Number.isFinite(qty) || qty <= 0) return;
    const grams = quantityToGrams(qty, food);
    if (grams <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    setCart((prev) => {
      const existing = prev.findIndex((c) => c.foodId === food.id);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = { ...next[existing], grams: next[existing].grams + grams };
        return next;
      }
      return [...prev, { foodId: food.id, grams }];
    });
  }

  function updateCartQuantity(idx: number, value: string) {
    const qty = Number(value);
    setCart((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const food = foodsByIdMap[item.foodId];
        if (!food) return item;
        if (!Number.isFinite(qty) || qty <= 0) return { ...item, grams: 0 };
        return { ...item, grams: quantityToGrams(qty, food) };
      }),
    );
  }

  function removeFromCart(idx: number) {
    Haptics.selectionAsync().catch(() => undefined);
    setCart((prev) => prev.filter((_, i) => i !== idx));
  }

  function saveCustomFood() {
    const name = customDraft.name.trim();
    if (!name) return;
    const baseSlug = slugify(name);
    if (!baseSlug) return;
    const kcal = Number(customDraft.kcal) || 0;
    const protein = Number(customDraft.protein) || 0;
    const carbs = Number(customDraft.carbs) || 0;
    const fats = Number(customDraft.fats) || 0;

    let id = baseSlug;
    let counter = 2;
    const existingIds = new Set(foods.map((f) => f.id));
    while (existingIds.has(id)) id = `${baseSlug}-${counter++}`;

    const newFood: Food = { id, name, kcal, protein, carbs, fats, custom: true };
    setData((prev) => ({
      ...prev,
      physicalHealth: {
        ...prev.physicalHealth,
        foods: [...prev.physicalHealth.foods, newFood],
      },
    }));
    addToCart(newFood);
    setCustomOpen(false);
    setCustomDraft({ name: '', kcal: '', protein: '', carbs: '', fats: '' });
  }

  function saveMeal() {
    const cleaned = cart.filter((item) => Number(item.grams) > 0);
    if (cleaned.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    const items: MealItem[] = cleaned.map(({ foodId, grams }) => ({ foodId, grams }));
    setData((prev) => {
      const existing = prev.physicalHealth.daily[date] ?? { water: 0, weight: 0, meals: [] };
      const meals = [...existing.meals];
      if (isEditing && mealIndex !== null) {
        meals[mealIndex] = { time, label, items };
      } else {
        meals.push({ time, label, items });
      }
      return {
        ...prev,
        physicalHealth: {
          ...prev.physicalHealth,
          daily: {
            ...prev.physicalHealth.daily,
            [date]: { ...existing, meals },
          },
        },
      };
    });
    onClose();
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <SafeAreaView edges={['bottom']} style={styles.safe}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.flex}>
              <View style={styles.handle} />

              <View style={styles.head}>
                <View>
                  <Text style={styles.eyebrow}>{isEditing ? 'EDIT MEAL' : 'NEW MEAL'}</Text>
                  <Text style={styles.title}>{label}</Text>
                </View>
                <PressableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color={colors.inkMuted} />
                </PressableOpacity>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaCell}>
                  <Text style={styles.metaLabel}>TIME</Text>
                  <TextInput
                    value={time}
                    onChangeText={setTime}
                    style={styles.metaInput}
                    placeholder="08:00"
                    placeholderTextColor={colors.inkMuted}
                    maxLength={5}
                  />
                </View>
                <View style={[styles.metaCell, styles.metaGrow]}>
                  <Text style={styles.metaLabel}>LABEL</Text>
                  <View style={styles.chipsRow}>
                    {PRESET_LABELS.map((preset) => {
                      const active = label === preset;
                      return (
                        <PressableOpacity
                          key={preset}
                          onPress={() => setLabel(preset)}
                          style={[styles.chip, active && styles.chipActive]}>
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>{preset}</Text>
                        </PressableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              <View style={styles.searchWrap}>
                <Ionicons name="search" size={16} color={colors.inkMuted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search foods…"
                  placeholderTextColor={colors.inkMuted}
                  style={styles.search}
                />
                {search ? (
                  <PressableOpacity onPress={() => setSearch('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color={colors.inkMuted} />
                  </PressableOpacity>
                ) : null}
              </View>

              <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={
                  <CartPreview
                    cart={cart}
                    foodsByIdMap={foodsByIdMap}
                    totals={cartTotals}
                    onChangeQuantity={updateCartQuantity}
                    onRemove={removeFromCart}
                  />
                }
                ListFooterComponent={
                  <CustomFoodFooter
                    open={customOpen}
                    draft={customDraft}
                    onToggle={() => setCustomOpen((v) => !v)}
                    onChange={(patch) => setCustomDraft((d) => ({ ...d, ...patch }))}
                    onSave={saveCustomFood}
                  />
                }
                ListEmptyComponent={
                  <Text style={styles.empty}>No foods match &ldquo;{search}&rdquo;</Text>
                }
                renderItem={({ item }) => (
                  <FoodRow
                    food={item}
                    quantity={qtyFor(item)}
                    onChangeQuantity={(q) => setQtyByFood((prev) => ({ ...prev, [item.id]: q }))}
                    onAdd={() => addToCart(item)}
                  />
                )}
                ItemSeparatorComponent={() => <View style={styles.sep} />}
              />

              <View style={styles.footer}>
                <View style={styles.footerInfo}>
                  <Text style={styles.footerCount}>
                    {cart.length} {cart.length === 1 ? 'item' : 'items'} · {Math.round(cartTotals.kcal)} kcal
                  </Text>
                </View>
                <PressableOpacity
                  onPress={saveMeal}
                  disabled={cart.length === 0}
                  style={[styles.saveBtn, cart.length === 0 && styles.saveBtnDisabled]}>
                  <Text style={styles.saveText}>{isEditing ? 'Update Meal' : 'Save Meal'}</Text>
                </PressableOpacity>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CartPreview({
  cart,
  foodsByIdMap,
  totals,
  onChangeQuantity,
  onRemove,
}: {
  cart: DraftItem[];
  foodsByIdMap: Record<string, Food>;
  totals: { kcal: number; protein: number; carbs: number; fats: number };
  onChangeQuantity: (idx: number, value: string) => void;
  onRemove: (idx: number) => void;
}) {
  if (cart.length === 0) {
    return (
      <View style={cartStyles.empty}>
        <Text style={cartStyles.emptyText}>Tap + on a food to add it to this meal</Text>
      </View>
    );
  }

  return (
    <View style={cartStyles.card}>
      <View style={cartStyles.head}>
        <Text style={cartStyles.eyebrow}>IN THIS MEAL · {cart.length}</Text>
        <Text style={cartStyles.kcal}>{Math.round(totals.kcal)} kcal</Text>
      </View>
      <View style={cartStyles.macroLine}>
        <Text style={cartStyles.macroPart}>P {Math.round(totals.protein)}</Text>
        <Text style={cartStyles.macroPart}>C {Math.round(totals.carbs)}</Text>
        <Text style={cartStyles.macroPart}>F {Math.round(totals.fats)}</Text>
      </View>
      <View style={cartStyles.items}>
        {cart.map((item, idx) => {
          const food = foodsByIdMap[item.foodId];
          const qty = food ? gramsToQuantity(item.grams, food) : item.grams;
          const unitLabel = food ? quantityUnit(food) : 'g';
          return (
            <View key={`${item.foodId}-${idx}`} style={cartStyles.row}>
              <Text style={cartStyles.name} numberOfLines={1}>
                {food?.name ?? item.foodId}
              </Text>
              <View style={cartStyles.rowRight}>
                <TextInput
                  value={String(qty)}
                  onChangeText={(v) => onChangeQuantity(idx, v)}
                  keyboardType="decimal-pad"
                  style={cartStyles.gramsInput}
                  selectTextOnFocus
                />
                <Text style={cartStyles.unit}>{unitLabel}</Text>
                <PressableOpacity onPress={() => onRemove(idx)} hitSlop={8} style={cartStyles.removeBtn}>
                  <Ionicons name="close" size={16} color={colors.inkMuted} />
                </PressableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function FoodRow({
  food,
  quantity,
  onChangeQuantity,
  onAdd,
}: {
  food: Food;
  quantity: string;
  onChangeQuantity: (value: string) => void;
  onAdd: () => void;
}) {
  const serving = perServingMacros(food);
  const unitLabel = quantityUnit(food);
  const round = (n: number) => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10);

  return (
    <View style={foodStyles.row}>
      <View style={foodStyles.left}>
        <Text style={foodStyles.name}>{food.name}</Text>
        <Text style={foodStyles.macros}>
          {round(serving.kcal)} kcal · {round(serving.protein)}P · {round(serving.carbs)}C · {round(serving.fats)}F {servingLabel(food)}
        </Text>
      </View>
      <View style={foodStyles.right}>
        <View style={foodStyles.gramsWrap}>
          <TextInput
            value={quantity}
            onChangeText={onChangeQuantity}
            keyboardType="decimal-pad"
            style={foodStyles.gramsInput}
            selectTextOnFocus
          />
          <Text style={foodStyles.unit}>{unitLabel}</Text>
        </View>
        <PressableOpacity onPress={onAdd} style={foodStyles.addBtn}>
          <Ionicons name="add" size={18} color={colors.paperRaised} />
        </PressableOpacity>
      </View>
    </View>
  );
}

function CustomFoodFooter({
  open,
  draft,
  onToggle,
  onChange,
  onSave,
}: {
  open: boolean;
  draft: { name: string; kcal: string; protein: string; carbs: string; fats: string };
  onToggle: () => void;
  onChange: (patch: Partial<typeof draft>) => void;
  onSave: () => void;
}) {
  return (
    <View style={customStyles.wrap}>
      <PressableOpacity onPress={onToggle} style={customStyles.toggle}>
        <Ionicons name={open ? 'remove' : 'add'} size={16} color={colors.clay} />
        <Text style={customStyles.toggleText}>Add custom food</Text>
      </PressableOpacity>
      {open ? (
        <View style={customStyles.form}>
          <TextInput
            value={draft.name}
            onChangeText={(name) => onChange({ name })}
            placeholder="Food name"
            placeholderTextColor={colors.inkMuted}
            style={customStyles.nameInput}
          />
          <View style={customStyles.macroGrid}>
            <CustomField label="kcal" value={draft.kcal} onChange={(kcal) => onChange({ kcal })} />
            <CustomField label="P" value={draft.protein} onChange={(protein) => onChange({ protein })} />
            <CustomField label="C" value={draft.carbs} onChange={(carbs) => onChange({ carbs })} />
            <CustomField label="F" value={draft.fats} onChange={(fats) => onChange({ fats })} />
          </View>
          <Text style={customStyles.hint}>per 100g · saved permanently</Text>
          <PressableOpacity onPress={onSave} style={customStyles.saveBtn}>
            <Text style={customStyles.saveText}>Save & Add</Text>
          </PressableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function CustomField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={customStyles.field}>
      <Text style={customStyles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        style={customStyles.fieldInput}
        placeholder="0"
        placeholderTextColor={colors.inkMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(29,29,31,0.36)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    overflow: 'hidden',
  },
  safe: { flex: 1 },
  flex: { flex: 1 },
  handle: {
    alignSelf: 'center',
    height: 4,
    width: 40,
    borderRadius: 999,
    backgroundColor: colors.rule,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  eyebrow: { ...typography.kicker, color: colors.inkMuted },
  title: { ...typography.heading, color: colors.ink, marginTop: 2 },
  closeBtn: {
    minHeight: 36,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    alignItems: 'flex-end',
  },
  metaCell: { gap: 4 },
  metaGrow: { flex: 1 },
  metaLabel: { ...typography.kicker, color: colors.inkMuted },
  metaInput: {
    ...typography.metric,
    fontSize: 18,
    color: colors.ink,
    borderBottomColor: colors.rule,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minWidth: 60,
    paddingVertical: 4,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  chipText: { ...typography.caption, color: colors.inkSoft, fontSize: 12, fontWeight: '500' },
  chipTextActive: { color: colors.paperRaised },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.paperRecessed,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.lg,
    height: 40,
    marginBottom: spacing.xs,
  },
  search: {
    ...typography.body,
    flex: 1,
    color: colors.ink,
    paddingVertical: 0,
  },
  list: { flex: 1, marginTop: spacing.xs },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.rule },
  empty: {
    ...typography.body,
    color: colors.inkMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopColor: colors.rule,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  footerInfo: { flex: 1 },
  footerCount: { ...typography.caption, color: colors.inkMuted },
  saveBtn: {
    backgroundColor: colors.clay,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
    minWidth: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { backgroundColor: colors.rule },
  saveText: { ...typography.subhead, color: colors.paperRaised },
});

const cartStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceTint,
    borderRadius: radius.card,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  empty: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  emptyText: { ...typography.caption, color: colors.inkMuted },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  eyebrow: { ...typography.kicker, color: colors.clay },
  kcal: { ...typography.metric, fontSize: 18, color: colors.clay },
  macroLine: { flexDirection: 'row', gap: spacing.md },
  macroPart: { ...typography.caption, color: colors.inkSoft, fontVariant: ['tabular-nums'] },
  items: { gap: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
    borderTopColor: colors.rule,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
  },
  name: { ...typography.body, color: colors.ink, flex: 1, paddingRight: spacing.xs },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gramsInput: {
    ...typography.metricSm,
    color: colors.ink,
    minWidth: 44,
    textAlign: 'right',
    paddingVertical: 0,
  },
  unit: { ...typography.caption, color: colors.inkMuted },
  removeBtn: {
    minHeight: 32,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const foodStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  left: { flex: 1, gap: 2 },
  name: { ...typography.subhead, color: colors.ink, fontSize: 15 },
  macros: { ...typography.caption, color: colors.inkMuted, fontVariant: ['tabular-nums'] },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  gramsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.paperRecessed,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    height: 34,
    minWidth: 60,
  },
  gramsInput: {
    ...typography.metricSm,
    color: colors.ink,
    textAlign: 'right',
    minWidth: 30,
    paddingVertical: 0,
  },
  unit: { ...typography.caption, color: colors.inkMuted },
  addBtn: {
    height: 34,
    width: 34,
    borderRadius: 999,
    backgroundColor: colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const customStyles = StyleSheet.create({
  wrap: { paddingTop: spacing.sm, gap: spacing.sm },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36 },
  toggleText: { ...typography.subhead, fontSize: 14, color: colors.clay },
  form: {
    backgroundColor: colors.paperRaised,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  nameInput: {
    ...typography.subhead,
    color: colors.ink,
    borderBottomColor: colors.rule,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.xs,
  },
  macroGrid: { flexDirection: 'row', gap: spacing.xs },
  field: { flex: 1, gap: 2 },
  fieldLabel: { ...typography.kicker, color: colors.inkMuted, fontSize: 10 },
  fieldInput: {
    ...typography.metricSm,
    color: colors.ink,
    borderBottomColor: colors.rule,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
  },
  hint: { ...typography.caption, color: colors.inkMuted, fontSize: 11 },
  saveBtn: {
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.md,
  },
  saveText: { ...typography.subhead, fontSize: 13, color: colors.paperRaised },
});

