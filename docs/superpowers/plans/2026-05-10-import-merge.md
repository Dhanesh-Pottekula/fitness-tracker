# Idempotent Merge Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace destructive import with idempotent additive merge.

**Architecture:** New pure-logic module `src/lib/merge.ts` provides `mergeAppData(local, incoming)` and `summarizeMerge(local, incoming)`. `ImportRow` calls these instead of `setData(parsed.data)`.

**Tech Stack:** TypeScript, no new deps. Verification via `npx tsc --noEmit` (no test framework installed).

**Reference spec:** [docs/superpowers/specs/2026-05-10-import-merge-design.md](docs/superpowers/specs/2026-05-10-import-merge-design.md)

---

## File Map

**Create:**
- `src/lib/merge.ts` — `mergeAppData`, `summarizeMerge`, all union/field-merge helpers.

**Modify:**
- `src/components/features/settings/ImportRow.tsx` — call `mergeAppData`, update second-confirm message.

---

## Task 1: Create `src/lib/merge.ts`

**Files:**
- Create: `src/lib/merge.ts`

- [ ] **Step 1: Write the file**

Create `src/lib/merge.ts`:

```ts
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/merge.ts
git commit -m "lib: add idempotent additive merge for AppData"
```

---

## Task 2: Update `ImportRow` to use merge

**Files:**
- Modify: `src/components/features/settings/ImportRow.tsx`

- [ ] **Step 1: Replace the import logic**

Update `src/components/features/settings/ImportRow.tsx` so the entire file reads:

```tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { PressableOpacity } from '@/src/components/ui';
import { useAppData } from '@/src/data';
import { parseBackup } from '@/src/lib/backup';
import { mergeAppData, summarizeMerge } from '@/src/lib/merge';
import type { MergeStats } from '@/src/lib/merge';
import { colors, radius, spacing, typography } from '@/src/theme';

export function ImportRow() {
  const { data, setData } = useAppData();

  async function handleImport() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);

    const proceed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Import a backup?',
        'It will be merged with your current data. Nothing will be deleted.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Continue', onPress: () => resolve(true) },
        ],
      );
    });
    if (!proceed) return;

    let pickerResult;
    try {
      pickerResult = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
    } catch (error) {
      console.warn('Document picker failed', error);
      Alert.alert('Could not open file picker', String(error instanceof Error ? error.message : error));
      return;
    }

    if (pickerResult.canceled) return;
    const asset = pickerResult.assets?.[0];
    if (!asset) return;

    let text: string;
    try {
      text = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } catch (error) {
      Alert.alert('Could not read file', String(error instanceof Error ? error.message : error));
      return;
    }

    const result = parseBackup(text);
    if (!result.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      Alert.alert('Invalid backup', result.error);
      return;
    }

    const stats = summarizeMerge(data, result.envelope.data);
    const exportedDateLabel = result.envelope._exportedAt
      ? new Intl.DateTimeFormat('en-IN', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }).format(new Date(result.envelope._exportedAt))
      : 'Unknown date';
    const summaryMessage = formatMergeSummary(exportedDateLabel, stats);

    const confirmMerge = await new Promise<boolean>((resolve) => {
      Alert.alert('Merge backup?', summaryMessage, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Merge', onPress: () => resolve(true) },
      ]);
    });
    if (!confirmMerge) return;

    setData((prev) => mergeAppData(prev, result.envelope.data));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    Alert.alert('Backup merged', 'Your backup has been merged with your data.');
  }

  return (
    <PressableOpacity onPress={handleImport} style={styles.row}>
      <View style={[styles.icon, { backgroundColor: colors.bloomTint }]}>
        <Ionicons name="arrow-down-circle-outline" size={22} color={colors.bloom} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Import data</Text>
        <Text style={styles.subtitle}>
          Merge a backup file with your current data. Nothing is deleted.
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
    </PressableOpacity>
  );
}

function formatMergeSummary(dateLabel: string, stats: MergeStats): string {
  const addParts: string[] = [];
  if (stats.added.transactions > 0) {
    addParts.push(
      `${stats.added.transactions} ${stats.added.transactions === 1 ? 'transaction' : 'transactions'}`,
    );
  }
  if (stats.added.cycleDays > 0) {
    addParts.push(`${stats.added.cycleDays} cycle ${stats.added.cycleDays === 1 ? 'day' : 'days'}`);
  }
  if (stats.added.meals > 0) {
    addParts.push(`${stats.added.meals} ${stats.added.meals === 1 ? 'meal' : 'meals'}`);
  }
  if (stats.added.foods > 0) {
    addParts.push(`${stats.added.foods} ${stats.added.foods === 1 ? 'food' : 'foods'}`);
  }
  if (stats.added.loans > 0) {
    addParts.push(`${stats.added.loans} ${stats.added.loans === 1 ? 'loan' : 'loans'}`);
  }
  if (stats.added.mealTemplates > 0) {
    addParts.push(
      `${stats.added.mealTemplates} ${stats.added.mealTemplates === 1 ? 'meal template' : 'meal templates'}`,
    );
  }

  const existingParts: string[] = [];
  if (stats.existing.transactions > 0) {
    existingParts.push(
      `${stats.existing.transactions} ${stats.existing.transactions === 1 ? 'transaction' : 'transactions'}`,
    );
  }
  if (stats.existing.cycleDays > 0) {
    existingParts.push(
      `${stats.existing.cycleDays} cycle ${stats.existing.cycleDays === 1 ? 'day' : 'days'}`,
    );
  }
  if (stats.existing.meals > 0) {
    existingParts.push(
      `${stats.existing.meals} ${stats.existing.meals === 1 ? 'meal' : 'meals'}`,
    );
  }

  const lines: string[] = [`From ${dateLabel}`];
  lines.push(addParts.length > 0 ? `Will add: ${addParts.join(' · ')}` : 'Nothing new to add.');
  if (existingParts.length > 0) {
    lines.push(`Already present: ${existingParts.join(' · ')}`);
  }
  lines.push('Nothing will be deleted.');
  return lines.join('\n\n');
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 64,
    borderTopColor: colors.rule,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.subhead,
    color: colors.ink,
  },
  subtitle: {
    ...typography.caption,
    color: colors.inkMuted,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/features/settings/ImportRow.tsx
git commit -m "settings: switch ImportRow from replace to idempotent merge"
```

---

## Final verification

- [ ] **Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Lint**

Run: `npm run lint`
Expected: 0 errors. Pre-existing warnings only.

- [ ] **Bundle**

Run: `npx expo export --platform ios --output-dir /tmp/expo-bundle-merge`
Expected: clean bundle.

- [ ] **Manual flow**

Run `npx expo start --ios`, then:

1. Add a few transactions, log a cycle day with mood + symptoms.
2. Settings → Export. Save the file.
3. Edit a transaction (change its amount). Add another cycle day.
4. Settings → Import → pick the same file.
5. Confirm dialogs show: existing transactions counted as "Already present"; new items only those that aren't in local.
6. Tap Merge. Verify:
   - Edited transaction keeps your local edit (NOT the backup's older value).
   - The new local cycle day is still there.
   - The cycle symptoms from backup got unioned with any local additions.
   - Tap Import again with the same file. Confirm "0 new" / all "already present" — idempotent.

---

## Notes

- Local-wins applies to every "id-based union" and every per-field merge for cycle days.
- Symptoms accumulate via set union — known and accepted.
- Meals are content-hashed; editing grams creates a new hash, so both versions survive (also accepted).
- No tombstones — deletions don't propagate.
