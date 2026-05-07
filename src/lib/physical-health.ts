import type { DailyEntry, Food, MealItem } from '@/src/data/types';

export const slugify = (input: string): string =>
  String(input ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export function itemMacros(item: MealItem, foodsById: Record<string, Food>) {
  const food = foodsById[item.foodId];
  const grams = Number(item.grams);
  if (!food || !Number.isFinite(grams) || grams <= 0) {
    return { kcal: 0, protein: 0, carbs: 0, fats: 0 };
  }

  const factor = grams / 100;
  return {
    kcal: food.kcal * factor,
    protein: food.protein * factor,
    carbs: food.carbs * factor,
    fats: food.fats * factor,
  };
}

export function dayMacros(entry: DailyEntry | undefined | null, foodsById: Record<string, Food>) {
  const empty = { kcal: 0, protein: 0, carbs: 0, fats: 0 };
  if (!entry || !Array.isArray(entry.meals)) return empty;

  return entry.meals.reduce((acc, meal) => {
    if (!Array.isArray(meal.items)) return acc;
    return meal.items.reduce((inner, item) => {
      const macros = itemMacros(item, foodsById);
      return {
        kcal: inner.kcal + macros.kcal,
        protein: inner.protein + macros.protein,
        carbs: inner.carbs + macros.carbs,
        fats: inner.fats + macros.fats,
      };
    }, acc);
  }, empty);
}

export function migrateDailyEntry(entry: unknown): DailyEntry {
  if (!entry || typeof entry !== 'object') {
    return { water: 0, weight: 0, meals: [] };
  }

  const candidate = entry as {
    water?: unknown;
    weight?: unknown;
    meals?: {
      time?: string;
      label?: string;
      text?: string;
      items?: MealItem[];
    }[];
  };

  const meals = Array.isArray(candidate.meals)
    ? candidate.meals.map((meal) =>
        Array.isArray(meal.items)
          ? { time: meal.time ?? '00:00', label: meal.label ?? '', items: meal.items }
          : { time: meal.time ?? '00:00', label: meal.text ?? meal.label ?? '', items: [] },
      )
    : [];

  return {
    water: Number(candidate.water) || 0,
    weight: Number(candidate.weight) || 0,
    meals,
  };
}

export function findFoodById(foods: Food[] | undefined, id: string) {
  return foods?.find((food) => food.id === id);
}

export function mergeFoods(base?: Food[], overrides?: Food[]): Food[] {
  const map = new Map<string, Food>();
  for (const food of base ?? []) map.set(food.id, food);
  for (const food of overrides ?? []) map.set(food.id, food);
  return Array.from(map.values());
}

export function foodsById(foods: Food[]): Record<string, Food> {
  return Object.fromEntries(foods.map((food) => [food.id, food]));
}

export function defaultQuantity(food: Food): number {
  return food.unit === 'piece' ? 1 : 100;
}

export function quantityUnit(food: Food): string {
  return food.unit === 'piece' ? '×' : 'g';
}

export function quantityToGrams(quantity: number, food: Food): number {
  if (food.unit === 'piece' && food.gramsPerPiece) {
    return quantity * food.gramsPerPiece;
  }
  return quantity;
}

export function gramsToQuantity(grams: number, food: Food): number {
  if (food.unit === 'piece' && food.gramsPerPiece) {
    const value = grams / food.gramsPerPiece;
    return Math.round(value * 10) / 10;
  }
  return grams;
}

export function perServingMacros(food: Food) {
  if (food.unit === 'piece' && food.gramsPerPiece) {
    const factor = food.gramsPerPiece / 100;
    return {
      kcal: food.kcal * factor,
      protein: food.protein * factor,
      carbs: food.carbs * factor,
      fats: food.fats * factor,
    };
  }
  return { kcal: food.kcal, protein: food.protein, carbs: food.carbs, fats: food.fats };
}

export function servingLabel(food: Food): string {
  if (food.unit === 'piece' && food.gramsPerPiece) {
    return `per piece (${food.gramsPerPiece}g)`;
  }
  return 'per 100g';
}
