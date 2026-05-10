import type {
  AppData,
  AppMeta,
  CycleData,
  CycleDayEntry,
  DailyEntry,
  FinanceTransaction,
  Food,
  Meal,
  MealItem,
  MealTemplate,
  MonthlySpends,
  PhysicalHealth,
  SpendEntry,
  Symptom,
} from '@/src/data/types';

// ─── Public API ─────────────────────────────────────────────────────────────

export function mergeAppData(local: AppData, incoming: AppData): AppData {
  return {
    ribbons: mergeArrayByKey(local.ribbons, incoming.ribbons, (r) => `${r.bank}::${r.account}`),
    creditCards: mergeArrayByKey(local.creditCards, incoming.creditCards, (c) => c.name),
    loanTrackerItems: mergeArrayById(local.loanTrackerItems, incoming.loanTrackerItems),
    peopleToGiveMoney: mergeArrayByKey(
      local.peopleToGiveMoney,
      incoming.peopleToGiveMoney,
      (p) => p.name,
    ),
    financeTransactions: mergeArrayByKey(
      local.financeTransactions,
      incoming.financeTransactions,
      txnHash,
    ),
    physicalHealth: mergePhysicalHealth(local.physicalHealth, incoming.physicalHealth),
    monthlySpends: mergeMonthlySpends(local.monthlySpends, incoming.monthlySpends),
    cycle: mergeCycle(local.cycle, incoming.cycle),
    meta: mergeMeta(local.meta, incoming.meta),
  };
}

export interface MergeStats {
  added: {
    transactions: number;
    cycleDays: number;
    meals: number;
    foods: number;
    loans: number;
    mealTemplates: number;
  };
  existing: {
    transactions: number;
    cycleDays: number;
    meals: number;
  };
}

export function summarizeMerge(local: AppData, incoming: AppData): MergeStats {
  const localTxnIds = collectTxnIds(local.monthlySpends);
  const incomingTxnIds = collectTxnIds(incoming.monthlySpends);
  const txnAdded = countMissing(incomingTxnIds, localTxnIds);
  const txnExisting = countPresent(incomingTxnIds, localTxnIds);

  const localCycleDays = new Set(Object.keys(local.cycle?.daily ?? {}));
  const incomingCycleDays = new Set(Object.keys(incoming.cycle?.daily ?? {}));
  const cycleDaysAdded = countMissing(incomingCycleDays, localCycleDays);
  const cycleDaysExisting = countPresent(incomingCycleDays, localCycleDays);

  const localMealHashes = collectMealHashes(local.physicalHealth);
  const incomingMealHashes = collectMealHashes(incoming.physicalHealth);
  const mealsAdded = countMissing(incomingMealHashes, localMealHashes);
  const mealsExisting = countPresent(incomingMealHashes, localMealHashes);

  const localFoodIds = new Set((local.physicalHealth?.foods ?? []).map((f) => f.id));
  const incomingFoodIds = new Set((incoming.physicalHealth?.foods ?? []).map((f) => f.id));
  const foodsAdded = countMissing(incomingFoodIds, localFoodIds);

  const localLoanIds = new Set((local.loanTrackerItems ?? []).map((l) => l.id));
  const incomingLoanIds = new Set((incoming.loanTrackerItems ?? []).map((l) => l.id));
  const loansAdded = countMissing(incomingLoanIds, localLoanIds);

  const localTemplateIds = new Set(
    (local.physicalHealth?.mealTemplates ?? []).map((t) => t.id),
  );
  const incomingTemplateIds = new Set(
    (incoming.physicalHealth?.mealTemplates ?? []).map((t) => t.id),
  );
  const templatesAdded = countMissing(incomingTemplateIds, localTemplateIds);

  return {
    added: {
      transactions: txnAdded,
      cycleDays: cycleDaysAdded,
      meals: mealsAdded,
      foods: foodsAdded,
      loans: loansAdded,
      mealTemplates: templatesAdded,
    },
    existing: {
      transactions: txnExisting,
      cycleDays: cycleDaysExisting,
      meals: mealsExisting,
    },
  };
}

// ─── Array union helpers ────────────────────────────────────────────────────

function mergeArrayById<T extends { id: string }>(local: T[], incoming: T[]): T[] {
  return mergeArrayByKey(local, incoming, (item) => item.id);
}

function mergeArrayByKey<T>(
  local: T[],
  incoming: T[],
  key: (item: T) => string,
): T[] {
  const map = new Map<string, T>();
  for (const item of incoming) map.set(key(item), item);
  for (const item of local) map.set(key(item), item); // local wins
  return Array.from(map.values());
}

function txnHash(t: FinanceTransaction): string {
  return [
    t.date ?? '',
    t.time ?? '',
    t.category ?? '',
    t.subCategory ?? '',
    String(t.amount ?? ''),
    t.note ?? '',
  ].join('::');
}

function mealHash(meal: Meal): string {
  const items = [...(meal.items ?? [])].sort((a, b) => a.foodId.localeCompare(b.foodId));
  const itemPart = items.map((i: MealItem) => `${i.foodId}:${i.grams}`).join('|');
  return `${meal.time ?? ''}::${meal.label ?? ''}::${itemPart}`;
}

// ─── Composite merges ───────────────────────────────────────────────────────

function mergeMonthlySpends(local: MonthlySpends, incoming: MonthlySpends): MonthlySpends {
  const result: MonthlySpends = {};
  const months = new Set([...Object.keys(local ?? {}), ...Object.keys(incoming ?? {})]);
  for (const month of months) {
    const localEntries: SpendEntry[] = local?.[month] ?? [];
    const incomingEntries: SpendEntry[] = incoming?.[month] ?? [];
    result[month] = mergeArrayById(localEntries, incomingEntries);
  }
  return result;
}

function mergePhysicalHealth(local: PhysicalHealth, incoming: PhysicalHealth): PhysicalHealth {
  const localFoods = local?.foods ?? [];
  const incomingFoods = incoming?.foods ?? [];
  const localTemplates = local?.mealTemplates ?? [];
  const incomingTemplates = incoming?.mealTemplates ?? [];
  return {
    targets: mergeTargets(local?.targets, incoming?.targets),
    foods: mergeArrayById<Food>(localFoods, incomingFoods),
    daily: mergeDailyRecord(local?.daily ?? {}, incoming?.daily ?? {}, mergeDailyEntry),
    mealTemplates: mergeArrayById<MealTemplate>(localTemplates, incomingTemplates),
  };
}

function mergeTargets(
  local: PhysicalHealth['targets'] | undefined,
  incoming: PhysicalHealth['targets'] | undefined,
): PhysicalHealth['targets'] {
  const l = local ?? ({} as PhysicalHealth['targets']);
  const i = incoming ?? ({} as PhysicalHealth['targets']);
  return {
    calories: l.calories || i.calories || 0,
    protein: l.protein || i.protein || 0,
    carbs: l.carbs || i.carbs || 0,
    fats: l.fats || i.fats || 0,
    water: l.water || i.water || 0,
    weight: l.weight || i.weight || 0,
  };
}

function mergeDailyEntry(local: DailyEntry, incoming: DailyEntry): DailyEntry {
  return {
    water: Math.max(Number(local?.water) || 0, Number(incoming?.water) || 0),
    weight: Number(local?.weight) || Number(incoming?.weight) || 0,
    meals: mergeArrayByKey<Meal>(local?.meals ?? [], incoming?.meals ?? [], mealHash),
  };
}

function mergeDailyRecord<T>(
  local: Record<string, T>,
  incoming: Record<string, T>,
  mergeEntry: (local: T, incoming: T) => T,
): Record<string, T> {
  const result: Record<string, T> = { ...local };
  for (const [key, incomingEntry] of Object.entries(incoming)) {
    if (key in result) {
      result[key] = mergeEntry(result[key], incomingEntry);
    } else {
      result[key] = incomingEntry;
    }
  }
  return result;
}

function mergeCycle(local: CycleData, incoming: CycleData): CycleData {
  return {
    daily: mergeDailyRecord(
      local?.daily ?? {},
      incoming?.daily ?? {},
      mergeCycleDayEntry,
    ),
    settings: {
      cycleLengthHint: local?.settings?.cycleLengthHint || incoming?.settings?.cycleLengthHint || 28,
      periodLengthHint: local?.settings?.periodLengthHint || incoming?.settings?.periodLengthHint || 5,
    },
  };
}

function mergeCycleDayEntry(local: CycleDayEntry, incoming: CycleDayEntry): CycleDayEntry {
  const out: CycleDayEntry = {};
  const flow = local?.flow ?? incoming?.flow;
  if (flow) out.flow = flow;
  const mood = local?.mood ?? incoming?.mood;
  if (mood) out.mood = mood;
  const symptomsSet = new Set<Symptom>([
    ...(local?.symptoms ?? []),
    ...(incoming?.symptoms ?? []),
  ]);
  if (symptomsSet.size > 0) out.symptoms = Array.from(symptomsSet);
  const note = local?.note ?? incoming?.note;
  if (note) out.note = note;
  return out;
}

function mergeMeta(local: AppMeta, incoming: AppMeta): AppMeta {
  return {
    schemaVersion: Math.max(local?.schemaVersion ?? 1, incoming?.schemaVersion ?? 1),
    lastBackupAt: maxIso(local?.lastBackupAt ?? null, incoming?.lastBackupAt ?? null),
  };
}

function maxIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

// ─── Summary helpers ────────────────────────────────────────────────────────

function collectTxnIds(monthlySpends: MonthlySpends | undefined): Set<string> {
  const ids = new Set<string>();
  for (const entries of Object.values(monthlySpends ?? {})) {
    for (const entry of entries) ids.add(entry.id);
  }
  return ids;
}

function collectMealHashes(health: PhysicalHealth | undefined): Set<string> {
  const set = new Set<string>();
  for (const day of Object.values(health?.daily ?? {})) {
    for (const meal of day?.meals ?? []) set.add(mealHash(meal));
  }
  return set;
}

function countMissing(incoming: Set<string>, local: Set<string>): number {
  let count = 0;
  for (const id of incoming) if (!local.has(id)) count++;
  return count;
}

function countPresent(incoming: Set<string>, local: Set<string>): number {
  let count = 0;
  for (const id of incoming) if (local.has(id)) count++;
  return count;
}
