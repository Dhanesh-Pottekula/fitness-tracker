import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeOut,
  LinearTransition,
  SlideInRight,
  interpolate,
  interpolateColor,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableOpacity } from '@/src/components/ui';
import { useAppData } from '@/src/data';
import type { Food, MealItem, MealTemplate } from '@/src/data/types';
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
  const saving = useSharedValue(0);
  const sheetY = useSharedValue(0);
  const cartScrollRef = useRef<ScrollView>(null);
  const [templateNameDraft, setTemplateNameDraft] = useState('');
  const [templateInputOpen, setTemplateInputOpen] = useState(false);
  const templates = data.physicalHealth.mealTemplates ?? [];

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
    setTemplateInputOpen(false);
    setTemplateNameDraft('');
    saving.value = 0;
    sheetY.value = 0;
  }, [visible, existingMeal, saving, sheetY]);

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
    requestAnimationFrame(() => {
      cartScrollRef.current?.scrollToEnd({ animated: true });
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

  function applyTemplate(template: MealTemplate) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    setLabel(template.label || label);
    setCart((prev) => {
      const merged = [...prev];
      template.items.forEach((it) => {
        const existing = merged.findIndex((c) => c.foodId === it.foodId);
        if (existing >= 0) merged[existing] = { ...merged[existing], grams: merged[existing].grams + it.grams };
        else merged.push({ foodId: it.foodId, grams: it.grams });
      });
      return merged;
    });
    requestAnimationFrame(() => {
      cartScrollRef.current?.scrollToEnd({ animated: true });
    });
  }

  function saveAsTemplate() {
    const name = templateNameDraft.trim();
    if (!name) return;
    const cleaned = cart.filter((item) => Number(item.grams) > 0);
    if (cleaned.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    const newTemplate: MealTemplate = {
      id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      label,
      items: cleaned.map(({ foodId, grams }) => ({ foodId, grams })),
      createdAt: new Date().toISOString(),
    };
    setData((prev) => ({
      ...prev,
      physicalHealth: {
        ...prev.physicalHealth,
        mealTemplates: [...(prev.physicalHealth.mealTemplates ?? []), newTemplate],
      },
    }));
    setTemplateInputOpen(false);
    setTemplateNameDraft('');
  }

  function confirmDeleteTemplate(template: MealTemplate) {
    Alert.alert(template.name, 'Remove this template?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setData((prev) => ({
            ...prev,
            physicalHealth: {
              ...prev.physicalHealth,
              mealTemplates: (prev.physicalHealth.mealTemplates ?? []).filter((t) => t.id !== template.id),
            },
          }));
        },
      },
    ]);
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
    if (saving.value > 0) return;
    const cleaned = cart.filter((item) => Number(item.grams) > 0);
    if (cleaned.length === 0) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);

    saving.value = withSequence(
      withTiming(0.5, { duration: 180 }),
      withTiming(1, { duration: 280, easing: Easing.bezier(0.34, 1.56, 0.64, 1) }),
    );

    const items: MealItem[] = cleaned.map(({ foodId, grams }) => ({ foodId, grams }));

    setTimeout(() => {
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
    }, 240);

    setTimeout(onClose, 760);
  }

  const dismissThreshold = SHEET_HEIGHT * 0.22;

  const dragGesture = Gesture.Pan()
    .activeOffsetY(8)
    .failOffsetY(-8)
    .onUpdate((e) => {
      sheetY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > dismissThreshold || e.velocityY > 900) {
        sheetY.value = withTiming(SHEET_HEIGHT, { duration: 220 }, (finished) => {
          if (finished) scheduleOnRN(onClose);
        });
      } else {
        sheetY.value = withSpring(0, { damping: 22, stiffness: 240, mass: 0.6 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: 1 - sheetY.value / SHEET_HEIGHT,
  }));

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={styles.backdropTap} onPress={onClose} />
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <SafeAreaView edges={['bottom']} style={styles.safe}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.flex}>
              <GestureDetector gesture={dragGesture}>
                <View collapsable={false}>
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
                </View>
              </GestureDetector>

              {templates.length > 0 ? (
                <View style={styles.templateStrip}>
                  <Text style={styles.templateStripLabel}>TEMPLATES</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.templateScroll}>
                    {templates.map((tpl) => (
                      <TemplateChip
                        key={tpl.id}
                        template={tpl}
                        foodsByIdMap={foodsByIdMap}
                        onApply={() => applyTemplate(tpl)}
                        onLongPress={() => confirmDeleteTemplate(tpl)}
                      />
                    ))}
                  </ScrollView>
                </View>
              ) : null}

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
                  <View>
                    <CartPreview
                      cart={cart}
                      foodsByIdMap={foodsByIdMap}
                      totals={cartTotals}
                      scrollRef={cartScrollRef}
                      onChangeQuantity={updateCartQuantity}
                      onRemove={removeFromCart}
                    />
                    {cart.length > 0 ? (
                      <SaveAsTemplateRow
                        open={templateInputOpen}
                        name={templateNameDraft}
                        onToggle={() => setTemplateInputOpen((v) => !v)}
                        onChangeName={setTemplateNameDraft}
                        onSave={saveAsTemplate}
                      />
                    ) : null}
                  </View>
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
                <AnimatedSaveButton
                  saving={saving}
                  label={isEditing ? 'Update Meal' : 'Save Meal'}
                  disabled={cart.length === 0}
                  onPress={saveMeal}
                />
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function CartPreview({
  cart,
  foodsByIdMap,
  totals,
  scrollRef,
  onChangeQuantity,
  onRemove,
}: {
  cart: DraftItem[];
  foodsByIdMap: Record<string, Food>;
  totals: { kcal: number; protein: number; carbs: number; fats: number };
  scrollRef: React.RefObject<ScrollView | null>;
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
    <Animated.View style={cartStyles.card} layout={LinearTransition.duration(220)}>
      <View style={cartStyles.head}>
        <Text style={cartStyles.eyebrow}>IN THIS MEAL · {cart.length}</Text>
        <Text style={cartStyles.kcal}>{Math.round(totals.kcal)} kcal</Text>
      </View>
      <View style={cartStyles.macroLine}>
        <Text style={cartStyles.macroPart}>P {Math.round(totals.protein)}</Text>
        <Text style={cartStyles.macroPart}>C {Math.round(totals.carbs)}</Text>
        <Text style={cartStyles.macroPart}>F {Math.round(totals.fats)}</Text>
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={cartStyles.scrollContent}>
        {cart.map((item, idx) => {
          const food = foodsByIdMap[item.foodId];
          return (
            <CartChip
              key={`${item.foodId}-${idx}`}
              item={item}
              food={food}
              onChangeQuantity={(v) => onChangeQuantity(idx, v)}
              onRemove={() => onRemove(idx)}
            />
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

function CartChip({
  item,
  food,
  onChangeQuantity,
  onRemove,
}: {
  item: DraftItem;
  food: Food | undefined;
  onChangeQuantity: (value: string) => void;
  onRemove: () => void;
}) {
  const qty = food ? gramsToQuantity(item.grams, food) : item.grams;
  const unit = food ? quantityUnit(food) : 'g';
  const m = food ? itemMacros(item, { [item.foodId]: food }) : { kcal: 0 };

  return (
    <Animated.View
      entering={SlideInRight.duration(280).easing(Easing.out(Easing.cubic))}
      exiting={FadeOut.duration(160)}
      layout={LinearTransition.duration(220)}
      style={chipStyles.chip}>
      <View style={chipStyles.top}>
        <Text style={chipStyles.name} numberOfLines={1}>
          {food?.name ?? item.foodId}
        </Text>
        <PressableOpacity onPress={onRemove} hitSlop={6} style={chipStyles.close}>
          <Ionicons name="close" size={12} color={colors.inkMuted} />
        </PressableOpacity>
      </View>
      <View style={chipStyles.qtyRow}>
        <TextInput
          value={String(qty)}
          onChangeText={onChangeQuantity}
          keyboardType="decimal-pad"
          style={chipStyles.qtyInput}
          selectTextOnFocus
        />
        <Text style={chipStyles.unit}>{unit}</Text>
      </View>
      <Text style={chipStyles.kcal}>{Math.round(m.kcal)} kcal</Text>
    </Animated.View>
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
        <AnimatedAddButton onPress={onAdd} />
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
  backdropTap: {
    flex: 1,
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
  templateStrip: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    gap: 6,
  },
  templateStripLabel: {
    ...typography.kicker,
    color: colors.inkMuted,
    fontSize: 10,
  },
  templateScroll: {
    gap: 8,
    paddingRight: spacing.lg,
  },
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
  macroLine: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xs },
  macroPart: { ...typography.caption, color: colors.inkSoft, fontVariant: ['tabular-nums'] },
  scrollContent: {
    paddingTop: 6,
    gap: 8,
    paddingRight: spacing.xs,
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

// =============================================================
// Templates
// =============================================================

function TemplateChip({
  template,
  foodsByIdMap,
  onApply,
  onLongPress,
}: {
  template: MealTemplate;
  foodsByIdMap: Record<string, Food>;
  onApply: () => void;
  onLongPress: () => void;
}) {
  const totals = template.items.reduce(
    (acc, item) => {
      const m = itemMacros(item, foodsByIdMap);
      return { kcal: acc.kcal + m.kcal };
    },
    { kcal: 0 },
  );
  return (
    <Pressable onPress={onApply} onLongPress={onLongPress} delayLongPress={350}>
      <View style={tplStyles.chip}>
        <View style={tplStyles.row}>
          <Ionicons name="bookmark" size={11} color={colors.clay} />
          <Text style={tplStyles.label}>{(template.label || 'MEAL').toUpperCase()}</Text>
        </View>
        <Text style={tplStyles.name} numberOfLines={1}>
          {template.name}
        </Text>
        <Text style={tplStyles.meta} numberOfLines={1}>
          {template.items.length} {template.items.length === 1 ? 'item' : 'items'} ·{' '}
          {Math.round(totals.kcal)} kcal
        </Text>
      </View>
    </Pressable>
  );
}

function SaveAsTemplateRow({
  open,
  name,
  onToggle,
  onChangeName,
  onSave,
}: {
  open: boolean;
  name: string;
  onToggle: () => void;
  onChangeName: (value: string) => void;
  onSave: () => void;
}) {
  if (!open) {
    return (
      <PressableOpacity onPress={onToggle} style={tplStyles.openRow} hitSlop={6}>
        <Ionicons name="bookmark-outline" size={14} color={colors.clay} />
        <Text style={tplStyles.openText}>Save this as a template</Text>
      </PressableOpacity>
    );
  }
  return (
    <View style={tplStyles.formRow}>
      <TextInput
        autoFocus
        value={name}
        onChangeText={onChangeName}
        placeholder="Template name"
        placeholderTextColor={colors.inkMuted}
        style={tplStyles.formInput}
        returnKeyType="done"
        onSubmitEditing={onSave}
      />
      <PressableOpacity onPress={onToggle} style={tplStyles.formCancel} hitSlop={6}>
        <Text style={tplStyles.formCancelText}>Cancel</Text>
      </PressableOpacity>
      <PressableOpacity
        onPress={onSave}
        disabled={!name.trim()}
        style={[tplStyles.formSave, !name.trim() && tplStyles.formSaveDisabled]}>
        <Text style={tplStyles.formSaveText}>Save</Text>
      </PressableOpacity>
    </View>
  );
}

const tplStyles = StyleSheet.create({
  chip: {
    width: 156,
    minHeight: 70,
    backgroundColor: colors.paperRaised,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    ...typography.kicker,
    color: colors.clay,
    fontSize: 9,
  },
  name: {
    ...typography.subhead,
    fontSize: 14,
    color: colors.ink,
  },
  meta: {
    ...typography.caption,
    color: colors.inkMuted,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    marginTop: 4,
    marginBottom: spacing.xs,
  },
  openText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: colors.clay,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: spacing.xs,
  },
  formInput: {
    ...typography.body,
    flex: 1,
    color: colors.ink,
    borderBottomColor: colors.rule,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
  },
  formCancel: {
    minHeight: 36,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  formCancelText: {
    ...typography.caption,
    fontSize: 13,
    color: colors.inkMuted,
  },
  formSave: {
    backgroundColor: colors.clay,
    borderRadius: 999,
    paddingHorizontal: 14,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSaveDisabled: {
    backgroundColor: colors.rule,
  },
  formSaveText: {
    ...typography.subhead,
    fontSize: 13,
    color: colors.paperRaised,
  },
});

// =============================================================
// Animated subcomponents
// =============================================================

function AnimatedAddButton({ onPress }: { onPress: () => void }) {
  const success = useSharedValue(0);
  const ripple = useSharedValue(0);

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onPress();
    success.value = withSequence(
      withTiming(1, { duration: 220, easing: Easing.bezier(0.34, 1.56, 0.64, 1) }),
      withDelay(360, withTiming(0, { duration: 240 })),
    );
    ripple.value = 0;
    ripple.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.quad) });
  }

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + success.value * 0.18 }],
    backgroundColor: interpolateColor(success.value, [0, 1], [colors.clay, colors.sage]),
  }));

  const plusStyle = useAnimatedStyle(() => ({
    opacity: 1 - success.value,
    transform: [{ scale: 1 - success.value * 0.4 }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: success.value,
    transform: [{ scale: 0.5 + success.value * 0.5 }],
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - ripple.value),
    transform: [{ scale: 0.6 + ripple.value * 1.3 }],
  }));

  return (
    <Pressable onPress={handlePress} hitSlop={6}>
      <View style={addBtnStyles.wrap}>
        <Animated.View style={[addBtnStyles.ripple, rippleStyle]} pointerEvents="none" />
        <Animated.View style={[addBtnStyles.btn, buttonStyle]}>
          <Animated.View style={[addBtnStyles.iconLayer, plusStyle]} pointerEvents="none">
            <Ionicons name="add" size={18} color={colors.paperRaised} />
          </Animated.View>
          <Animated.View style={[addBtnStyles.iconLayer, checkStyle]} pointerEvents="none">
            <Ionicons name="checkmark" size={18} color={colors.paperRaised} />
          </Animated.View>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const SAVE_WIDTH = 144;
const SAVE_COLLAPSED = 56;

function AnimatedSaveButton({
  saving,
  label,
  disabled,
  onPress,
}: {
  saving: SharedValue<number>;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const buttonStyle = useAnimatedStyle(() => ({
    width: interpolate(saving.value, [0, 0.5, 1], [SAVE_WIDTH, SAVE_WIDTH, SAVE_COLLAPSED]),
    backgroundColor: interpolateColor(
      saving.value,
      [0, 0.5, 1],
      [disabled ? colors.rule : colors.clay, disabled ? colors.rule : colors.clay, colors.sage],
    ),
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(saving.value, [0, 0.5], [1, 0], 'clamp'),
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(saving.value, [0.5, 1], [0, 1], 'clamp'),
    transform: [{ scale: interpolate(saving.value, [0.5, 1], [0.4, 1], 'clamp') }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(saving.value, [0.5, 0.9, 1], [0, 0.45, 0]),
    transform: [{ scale: interpolate(saving.value, [0.5, 1], [0.6, 1.7]) }],
  }));

  return (
    <View style={saveBtnStyles.wrap}>
      <Particles trigger={saving} />
      <Pressable onPress={onPress} disabled={disabled}>
        <Animated.View style={[saveBtnStyles.glow, glowStyle]} pointerEvents="none" />
        <Animated.View style={[saveBtnStyles.btn, buttonStyle]}>
          <Animated.Text style={[saveBtnStyles.text, textStyle]} numberOfLines={1}>
            {label}
          </Animated.Text>
          <Animated.View style={[saveBtnStyles.checkLayer, checkStyle]} pointerEvents="none">
            <Ionicons name="checkmark" size={26} color={colors.paperRaised} />
          </Animated.View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

function Particles({ trigger }: { trigger: SharedValue<number> }) {
  const count = 10;
  return (
    <View style={particleStyles.field} pointerEvents="none">
      {Array.from({ length: count }, (_, i) => (
        <Particle key={i} index={i} total={count} trigger={trigger} />
      ))}
    </View>
  );
}

const PARTICLE_COLORS = [colors.clay, colors.sage, colors.ochre];

function Particle({
  index,
  total,
  trigger,
}: {
  index: number;
  total: number;
  trigger: SharedValue<number>;
}) {
  const angle = (index / total) * Math.PI * 2 + (index % 2 ? 0 : Math.PI / total);
  const distance = 36 + (index % 3) * 14;
  const dx = Math.cos(angle) * distance;
  const dy = Math.sin(angle) * distance;
  const size = 5 + (index % 3);
  const color = PARTICLE_COLORS[index % PARTICLE_COLORS.length];

  const style = useAnimatedStyle(() => {
    const t = interpolate(trigger.value, [0.5, 1], [0, 1], 'clamp');
    return {
      transform: [
        { translateX: t * dx },
        { translateY: t * dy },
        { scale: 1 - t * 0.5 },
      ],
      opacity: 1 - t,
    };
  });

  return (
    <Animated.View
      style={[
        particleStyles.dot,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

const addBtnStyles = StyleSheet.create({
  wrap: {
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: {
    height: 34,
    width: 34,
    borderRadius: 999,
    backgroundColor: colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    height: 34,
    width: 34,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.sage,
  },
});

const chipStyles = StyleSheet.create({
  chip: {
    width: 132,
    minHeight: 76,
    backgroundColor: colors.paperRaised,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 4,
  },
  name: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
    flex: 1,
  },
  close: {
    height: 18,
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -2,
    marginTop: -2,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  qtyInput: {
    ...typography.metric,
    fontSize: 18,
    color: colors.clay,
    paddingVertical: 0,
    minWidth: 30,
  },
  unit: {
    ...typography.caption,
    color: colors.inkMuted,
    fontSize: 11,
  },
  kcal: {
    ...typography.caption,
    color: colors.inkMuted,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
});

const saveBtnStyles = StyleSheet.create({
  wrap: {
    width: SAVE_WIDTH,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  btn: {
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: {
    ...typography.subhead,
    color: colors.paperRaised,
  },
  checkLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    right: 0,
    height: 56,
    width: 56,
    borderRadius: 999,
    backgroundColor: colors.sage,
    alignSelf: 'flex-end',
    top: -6,
  },
});

const particleStyles = StyleSheet.create({
  field: {
    position: 'absolute',
    right: SAVE_COLLAPSED / 2 - 3,
    top: 22 - 3,
    height: 6,
    width: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
  },
});

