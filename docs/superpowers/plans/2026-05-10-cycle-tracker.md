# Cycle Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a frictionless period + symptoms/mood tracker to the existing Health tab, with a one-line cycle status strip on Home.

**Architecture:** New types in `src/data/types.ts`; pure derivation logic in `src/lib/cycle.ts`; six new React Native components under `src/components/features/cycle/`; integration into [app/(tabs)/health.tsx](app/(tabs)/health.tsx) and [app/(tabs)/index.tsx](app/(tabs)/index.tsx). Storage flows through the existing `AppDataProvider`/`storage.ts` with a defensive merge for the new top-level `cycle` key.

**Tech Stack:** React Native (Expo SDK 54), TypeScript strict, expo-haptics, expo-router, AsyncStorage, react-native-reanimated (already installed). **No test framework is installed in this codebase**, so each task verifies via `npx tsc --noEmit` and a brief manual simulator check rather than automated tests — this matches the established pattern.

**Reference spec:** [docs/superpowers/specs/2026-05-10-cycle-tracker-design.md](docs/superpowers/specs/2026-05-10-cycle-tracker-design.md)

---

## File Map

**Create:**
- `src/lib/cycle.ts` — pure derivation logic (cycle extraction, predictions, status, color/label helpers).
- `src/components/features/cycle/WeekStrip.tsx` — horizontal 14-day strip.
- `src/components/features/cycle/CycleLogSheet.tsx` — bottom sheet for daily logging.
- `src/components/features/cycle/CycleMonthModal.tsx` — full-screen month calendar modal.
- `src/components/features/cycle/CycleStatusStrip.tsx` — one-line status strip used in both tabs.
- `src/components/features/cycle/CycleSection.tsx` — composes WeekStrip + CTAs + sheet/modal hosting.
- `src/components/features/cycle/index.ts` — barrel exports.

**Modify:**
- `src/theme/colors.ts` — add `bloom` family.
- `src/data/types.ts` — add cycle types and extend `AppData`.
- `src/data/seed.ts` — add `cycle` field to `SEED`.
- `src/data/storage.ts` — extend `mergeWithSeed` for the new `cycle` key.
- `app/(tabs)/health.tsx` — render `CycleStatusStrip` (after date row) + `CycleSection` (between Meals and Trends).
- `app/(tabs)/index.tsx` — render `CycleStatusStrip` above the first pulse card.

---

## Task 1: Theme — bloom palette

**Files:**
- Modify: `src/theme/colors.ts`

- [ ] **Step 1: Add bloom + flow ramp colors**

Open `src/theme/colors.ts` and append the new entries inside the `colors` object, after `dangerTint`. Final file should read:

```ts
export const colors = {
  paper: '#faf6ef',
  paperRaised: '#fdfaf3',
  paperRecessed: '#f1ebde',
  ink: '#1d1d1f',
  inkSoft: '#3a3835',
  inkMuted: '#7a766f',
  rule: '#e6dfcf',
  clay: '#b6432a',
  clayDeep: '#7e2c1a',
  sage: '#6e7a5a',
  ochre: '#c08a2e',
  slate: '#3e4a5a',
  target: '#a99070',
  water: '#5b8aa3',
  surfaceTint: 'rgba(182,67,42,0.06)',
  success: '#2f8a4a',
  danger: '#c83a3a',
  successTint: 'rgba(47,138,74,0.08)',
  dangerTint: 'rgba(200,58,58,0.08)',
  bloom: '#c8526b',
  bloomDeep: '#9d3f56',
  bloomTint: 'rgba(200, 82, 107, 0.10)',
  flowSpotting: '#e8b9c4',
  flowLight: '#d88498',
  flowMedium: '#c8526b',
  flowHeavy: '#9d3f56',
};

export const chartCycle = [colors.clay, colors.sage, colors.ochre, colors.slate, '#8a7a9c'];
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (no new errors).

- [ ] **Step 3: Commit**

```bash
git add src/theme/colors.ts
git commit -m "theme: add bloom rose palette for cycle feature"
```

---

## Task 2: Types — cycle data shapes

**Files:**
- Modify: `src/data/types.ts`

- [ ] **Step 1: Append cycle types and extend AppData**

Open `src/data/types.ts`. After the existing `MonthlySpends` type and before `AppData`, add:

```ts
export type FlowLevel = 'spotting' | 'light' | 'medium' | 'heavy';

export type Mood = 'happy' | 'calm' | 'low' | 'irritable' | 'tired';

export type Symptom =
  | 'cramps'
  | 'headache'
  | 'bloating'
  | 'fatigue'
  | 'breastTender'
  | 'acne'
  | 'backPain'
  | 'nausea';

export interface CycleDayEntry {
  flow?: FlowLevel;
  mood?: Mood;
  symptoms?: Symptom[];
  note?: string;
}

export interface CycleSettings {
  cycleLengthHint: number;
  periodLengthHint: number;
}

export interface CycleData {
  daily: Record<string, CycleDayEntry>;
  settings: CycleSettings;
}
```

Then update the `AppData` interface to include the new `cycle` field:

```ts
export interface AppData {
  ribbons: Ribbon[];
  creditCards: CreditCard[];
  loanTrackerItems: LoanTrackerItem[];
  peopleToGiveMoney: Person[];
  financeTransactions: FinanceTransaction[];
  physicalHealth: PhysicalHealth;
  monthlySpends: MonthlySpends;
  cycle: CycleData;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: FAIL — `seed.ts` will now report missing `cycle` field on the `SEED` literal. That's the next task.

- [ ] **Step 3: Do not commit yet**

Hold the commit until Task 3 fixes the seed (otherwise the repo would be in a non-compiling state). Continue to Task 3.

---

## Task 3: Seed — add cycle defaults

**Files:**
- Modify: `src/data/seed.ts`

- [ ] **Step 1: Add cycle to SEED**

Open `src/data/seed.ts`. Add a `cycle` field to the `SEED` object after `monthlySpends`. The final file should read:

```ts
import type { AppData } from './types';

export const SEED: AppData = {
  ribbons: [
    { bank: 'Primary Bank', account: '0000', amount: '0', bg: '#ffe8ec', bgEnd: '#c4dcff', text: '#173f7a', muted: '#5a6473', icon: '#1f4b8f', stripe: '#e31e2f', border: '#bfd0eb' },
    { bank: 'Salary Account', account: '0000', amount: '0', bg: '#0f4f99', bgEnd: '#3474be', text: '#ffffff', muted: 'rgba(255,255,255,0.78)', icon: '#ffffff', stripe: '#e31b23', border: '#0d4f93' },
    { bank: 'Savings', account: '0000', amount: '0', bg: '#f5f3ff', bgEnd: '#ddd6fe', text: '#312e81', muted: '#6366f1', icon: '#4338ca', stripe: '#7c3aed', border: '#c4b5fd' },
    { bank: 'Wallet', account: 'Cash', amount: '0', bg: '#f5ede3', bgEnd: '#caa27c', text: '#4b2e1f', muted: '#7a553c', icon: '#6b4226', stripe: '#8b5e3c', border: '#b08968' },
  ],
  creditCards: [{ name: 'Credit Card', amount: 0, note: 'Sample card' }],
  loanTrackerItems: [
    {
      id: 'loan-a',
      title: 'Loan A',
      lender: 'Sample loan',
      progress: 6 / 12,
      amountLeftValue: 120000,
      progressLabel: '6 months left',
      headline: '6 months left',
      amountLeft: '₹1,20,000',
      support: 'Monthly EMI ₹20,000',
      detailRows: [
        { label: 'Original amount', value: '₹2,40,000' },
        { label: 'Monthly EMI', value: '₹20,000' },
        { label: 'Next due', value: 'Sample date' },
      ],
      schedule: ['Month 1 - ₹20,000', 'Month 2 - ₹20,000', 'Month 3 - ₹20,000'],
    },
    {
      id: 'loan-b',
      title: 'Loan B',
      lender: 'Sample device plan',
      progress: 3 / 10,
      amountLeftValue: 35000,
      progressLabel: '7 months left',
      headline: '7 months left',
      amountLeft: '₹35,000',
      support: 'Monthly EMI ₹5,000',
      detailRows: [
        { label: 'Original amount', value: '₹50,000' },
        { label: 'Monthly EMI', value: '₹5,000' },
        { label: 'Next due', value: 'Sample date' },
      ],
      schedule: ['Month 1 - ₹5,000', 'Month 2 - ₹5,000', 'Month 3 - ₹5,000'],
    },
  ],
  peopleToGiveMoney: [
    { name: 'Person A', amount: 0 },
    { name: 'Person B', amount: 0 },
    { name: 'Person C', amount: 0 },
  ],
  financeTransactions: [],
  physicalHealth: {
    targets: { calories: 2200, protein: 150, carbs: 250, fats: 70, water: 3000, weight: 70 },
    foods: [
      { id: 'egg', name: 'Egg (whole)', kcal: 155, protein: 13, carbs: 1.1, fats: 11, unit: 'piece', gramsPerPiece: 50 },
      { id: 'idli', name: 'Idli', kcal: 39, protein: 2, carbs: 8, fats: 0.2, unit: 'piece', gramsPerPiece: 40 },
      { id: 'dosa-plain', name: 'Dosa (plain)', kcal: 168, protein: 4, carbs: 29, fats: 5, unit: 'piece', gramsPerPiece: 100 },
      { id: 'roti', name: 'Roti / Chapati', kcal: 310, protein: 11, carbs: 56, fats: 4, unit: 'piece', gramsPerPiece: 45 },
      { id: 'banana', name: 'Banana', kcal: 89, protein: 1.1, carbs: 23, fats: 0.3, unit: 'piece', gramsPerPiece: 118 },
      { id: 'apple', name: 'Apple', kcal: 52, protein: 0.3, carbs: 14, fats: 0.2, unit: 'piece', gramsPerPiece: 180 },
      { id: 'almond', name: 'Almond', kcal: 579, protein: 21, carbs: 22, fats: 50, unit: 'piece', gramsPerPiece: 1.2 },
      { id: 'coconut-chutney', name: 'Coconut chutney', kcal: 200, protein: 2, carbs: 6, fats: 19 },
      { id: 'sambar', name: 'Sambar', kcal: 57, protein: 3, carbs: 8, fats: 1.5 },
      { id: 'milk-whole', name: 'Milk (whole)', kcal: 61, protein: 3.2, carbs: 4.8, fats: 3.3 },
      { id: 'milk-toned', name: 'Milk (toned)', kcal: 50, protein: 3, carbs: 5, fats: 1.5 },
      { id: 'curd-whole', name: 'Curd (whole)', kcal: 60, protein: 3, carbs: 5, fats: 3 },
      { id: 'chicken-cooked', name: 'Chicken (cooked)', kcal: 165, protein: 31, carbs: 0, fats: 3.6 },
      { id: 'chicken-curry', name: 'Chicken curry', kcal: 200, protein: 20, carbs: 4, fats: 12 },
      { id: 'rice-cooked', name: 'Rice (cooked)', kcal: 130, protein: 2.7, carbs: 28, fats: 0.3 },
      { id: 'carrot', name: 'Carrot', kcal: 41, protein: 0.9, carbs: 10, fats: 0.2 },
      { id: 'cucumber', name: 'Cucumber', kcal: 16, protein: 0.7, carbs: 4, fats: 0.1 },
      { id: 'peanut', name: 'Peanut', kcal: 567, protein: 26, carbs: 16, fats: 49 },
      { id: 'oats-dry', name: 'Oats (dry)', kcal: 389, protein: 17, carbs: 66, fats: 7 },
      { id: 'paneer', name: 'Paneer', kcal: 265, protein: 18, carbs: 1.2, fats: 21 },
    ],
    daily: {},
    mealTemplates: [],
  },
  monthlySpends: {},
  cycle: {
    daily: {},
    settings: { cycleLengthHint: 28, periodLengthHint: 5 },
  },
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: FAIL — `storage.ts` will now report missing `cycle` field in the `mergeWithSeed` return object. That's the next task.

- [ ] **Step 3: Do not commit yet**

Continue to Task 4 to keep the repo compiling between commits.

---

## Task 4: Storage — extend mergeWithSeed for cycle

**Files:**
- Modify: `src/data/storage.ts`

- [ ] **Step 1: Update imports and merge function**

Open `src/data/storage.ts`. Add `CycleData` to the type import and add cycle merge handling. Final file should read:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

import { monthKeyFromDate } from '@/src/lib/date';
import { mergeFoods, migrateDailyEntry } from '@/src/lib/physical-health';

import { SEED } from './seed';
import type { AppData, CycleData, MonthlySpends, SpendEntry } from './types';

const KEY = 'finance-health-app-data-v1';

export async function loadAppData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return cloneSeed();
    return mergeWithSeed(JSON.parse(raw) as Partial<AppData>);
  } catch (error) {
    console.warn('loadAppData failed, falling back to seed', error);
    return cloneSeed();
  }
}

export async function saveAppData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}

export async function resetAppData(): Promise<AppData> {
  const seed = cloneSeed();
  await saveAppData(seed);
  return seed;
}

function cloneSeed(): AppData {
  return JSON.parse(JSON.stringify(SEED)) as AppData;
}

function mergeWithSeed(stored: Partial<AppData>): AppData {
  const seed = cloneSeed();
  const physicalHealth = stored.physicalHealth ?? seed.physicalHealth;
  const daily = Object.fromEntries(
    Object.entries(physicalHealth.daily ?? {}).map(([date, entry]) => [date, migrateDailyEntry(entry)]),
  );

  return {
    ribbons: stored.ribbons ?? seed.ribbons,
    creditCards: stored.creditCards ?? seed.creditCards,
    loanTrackerItems: stored.loanTrackerItems ?? seed.loanTrackerItems,
    peopleToGiveMoney: stored.peopleToGiveMoney ?? seed.peopleToGiveMoney,
    financeTransactions: stored.financeTransactions ?? seed.financeTransactions,
    physicalHealth: {
      targets: { ...seed.physicalHealth.targets, ...(physicalHealth.targets ?? {}) },
      foods: mergeFoods(physicalHealth.foods, seed.physicalHealth.foods),
      daily,
      mealTemplates: physicalHealth.mealTemplates ?? [],
    },
    monthlySpends: mergeMonthlySpends(stored.monthlySpends),
    cycle: mergeCycle(stored.cycle, seed.cycle),
  };
}

function mergeCycle(stored: CycleData | undefined, seed: CycleData): CycleData {
  return {
    daily: stored?.daily ?? {},
    settings: {
      cycleLengthHint: stored?.settings?.cycleLengthHint ?? seed.settings.cycleLengthHint,
      periodLengthHint: stored?.settings?.periodLengthHint ?? seed.settings.periodLengthHint,
    },
  };
}

function mergeMonthlySpends(monthlySpends: MonthlySpends | undefined): MonthlySpends {
  const currentMonth = monthKeyFromDate();
  return {
    ...(monthlySpends ?? {}),
    [currentMonth]: normalizeMonthEntries(monthlySpends?.[currentMonth] ?? []),
  };
}

function normalizeMonthEntries(entries: SpendEntry[]): SpendEntry[] {
  return entries.map((entry) => ({
    ...entry,
    amount: Number(entry.amount) || 0,
    recurring: Boolean(entry.recurring),
  }));
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS — repo compiles again.

- [ ] **Step 3: Commit Tasks 2–4 together**

```bash
git add src/data/types.ts src/data/seed.ts src/data/storage.ts
git commit -m "data: add cycle types, seed defaults, and storage merge"
```

---

## Task 5: Cycle helpers (`src/lib/cycle.ts`)

**Files:**
- Create: `src/lib/cycle.ts`

- [ ] **Step 1: Create the helper module**

Create `src/lib/cycle.ts` with the following content:

```ts
import { colors } from '@/src/theme';

import type { CycleDayEntry, CycleSettings, FlowLevel, Mood, Symptom } from '@/src/data/types';

export interface CycleRecord {
  start: string;
  end: string;
  length: number;
}

export interface PeriodSpan {
  start: string;
  end: string;
}

export interface CycleStatus {
  hasData: boolean;
  cycleDay: number;
  isPeriodDay: boolean;
  flow?: FlowLevel;
  daysToNext?: number;
  predictedNextStart?: string;
  estimateOnly: boolean;
}

const MS_PER_DAY = 86_400_000;

export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function dateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(iso: string, days: number): string {
  const date = isoToDate(iso);
  date.setDate(date.getDate() + days);
  return dateToIso(date);
}

export function diffDays(fromIso: string, toIso: string): number {
  return Math.round((isoToDate(toIso).getTime() - isoToDate(fromIso).getTime()) / MS_PER_DAY);
}

export function isFlowDay(entry: CycleDayEntry | undefined): boolean {
  return Boolean(entry?.flow);
}

export function extractPeriods(daily: Record<string, CycleDayEntry>): PeriodSpan[] {
  const flowDates = Object.entries(daily)
    .filter(([, entry]) => isFlowDay(entry))
    .map(([iso]) => iso)
    .sort();
  if (flowDates.length === 0) return [];

  const periods: PeriodSpan[] = [];
  let runStart = flowDates[0];
  let runEnd = flowDates[0];
  for (let i = 1; i < flowDates.length; i++) {
    const prev = flowDates[i - 1];
    const cur = flowDates[i];
    if (diffDays(prev, cur) === 1) {
      runEnd = cur;
    } else {
      periods.push({ start: runStart, end: runEnd });
      runStart = cur;
      runEnd = cur;
    }
  }
  periods.push({ start: runStart, end: runEnd });
  return periods;
}

export function extractCycles(daily: Record<string, CycleDayEntry>): CycleRecord[] {
  const periods = extractPeriods(daily);
  const cycles: CycleRecord[] = [];
  for (let i = 0; i < periods.length - 1; i++) {
    const start = periods[i].start;
    const next = periods[i + 1].start;
    cycles.push({ start, end: addDays(next, -1), length: diffDays(start, next) });
  }
  return cycles;
}

export function avgCycleLength(cycles: CycleRecord[], fallback: number): number {
  if (cycles.length < 2) return fallback;
  const recent = cycles.slice(-6);
  const sum = recent.reduce((acc, c) => acc + c.length, 0);
  return Math.round(sum / recent.length);
}

export function avgPeriodLength(daily: Record<string, CycleDayEntry>, fallback: number): number {
  const periods = extractPeriods(daily);
  // Exclude the most recent period if it might still be ongoing (the user may add more days)
  const closed = periods.slice(0, Math.max(0, periods.length - 1));
  if (closed.length === 0) return fallback;
  const recent = closed.slice(-6);
  const sum = recent.reduce((acc, p) => acc + (diffDays(p.start, p.end) + 1), 0);
  return Math.max(1, Math.round(sum / recent.length));
}

export function predictNextPeriodStarts(
  daily: Record<string, CycleDayEntry>,
  settings: CycleSettings,
  count = 2,
): string[] {
  const periods = extractPeriods(daily);
  if (periods.length === 0) return [];
  const cycles = extractCycles(daily);
  const cycleLen = avgCycleLength(cycles, settings.cycleLengthHint);
  const lastPeriodStart = periods[periods.length - 1].start;
  const out: string[] = [];
  let cursor = lastPeriodStart;
  for (let i = 0; i < count; i++) {
    cursor = addDays(cursor, cycleLen);
    out.push(cursor);
  }
  return out;
}

export function predictedPeriodDates(
  daily: Record<string, CycleDayEntry>,
  settings: CycleSettings,
  count = 2,
): string[] {
  const starts = predictNextPeriodStarts(daily, settings, count);
  const periodLen = avgPeriodLength(daily, settings.periodLengthHint);
  const out: string[] = [];
  for (const start of starts) {
    for (let i = 0; i < periodLen; i++) {
      out.push(addDays(start, i));
    }
  }
  return out;
}

export function currentCycleStatus(
  today: string,
  daily: Record<string, CycleDayEntry>,
  settings: CycleSettings,
): CycleStatus {
  const periods = extractPeriods(daily);
  if (periods.length === 0) {
    return {
      hasData: false,
      cycleDay: 0,
      isPeriodDay: false,
      estimateOnly: true,
    };
  }

  const lastPeriod = periods[periods.length - 1];
  const todayEntry = daily[today];
  const isPeriodDay = isFlowDay(todayEntry);

  const cycles = extractCycles(daily);
  const cycleLen = avgCycleLength(cycles, settings.cycleLengthHint);
  const estimateOnly = cycles.length < 2;

  // The current cycle starts at the most recent period start that is on or before today.
  // If today is during a period, that's lastPeriod.start. If today is after the last period
  // ended but before the predicted next start, the current cycle still anchors at lastPeriod.start.
  const baseStart = isPeriodDay
    ? findContainingPeriodStart(periods, today) ?? lastPeriod.start
    : lastPeriod.start;

  const cycleDay = diffDays(baseStart, today) + 1;

  if (isPeriodDay) {
    const periodStart = findContainingPeriodStart(periods, today) ?? lastPeriod.start;
    const dayOfPeriod = diffDays(periodStart, today) + 1;
    return {
      hasData: true,
      cycleDay: dayOfPeriod,
      isPeriodDay: true,
      flow: todayEntry?.flow,
      estimateOnly,
    };
  }

  const predictedNextStart = addDays(lastPeriod.start, cycleLen);
  const daysToNext = diffDays(today, predictedNextStart);

  return {
    hasData: true,
    cycleDay: Math.max(1, cycleDay),
    isPeriodDay: false,
    daysToNext: daysToNext >= 0 ? daysToNext : undefined,
    predictedNextStart,
    estimateOnly,
  };
}

function findContainingPeriodStart(periods: PeriodSpan[], iso: string): string | undefined {
  for (const period of periods) {
    if (iso >= period.start && iso <= period.end) return period.start;
  }
  return undefined;
}

// ─── Display helpers ────────────────────────────────────────────────────────

export function flowColor(level: FlowLevel | undefined): string {
  switch (level) {
    case 'spotting':
      return colors.flowSpotting;
    case 'light':
      return colors.flowLight;
    case 'medium':
      return colors.flowMedium;
    case 'heavy':
      return colors.flowHeavy;
    default:
      return colors.bloom;
  }
}

export function flowLabel(level: FlowLevel | undefined): string {
  switch (level) {
    case 'spotting':
      return 'Spotting';
    case 'light':
      return 'Light';
    case 'medium':
      return 'Medium';
    case 'heavy':
      return 'Heavy';
    default:
      return '';
  }
}

export const FLOW_LEVELS: FlowLevel[] = ['spotting', 'light', 'medium', 'heavy'];

export const MOOD_OPTIONS: { value: Mood; emoji: string; label: string }[] = [
  { value: 'happy', emoji: '😊', label: 'Happy' },
  { value: 'calm', emoji: '😌', label: 'Calm' },
  { value: 'low', emoji: '😢', label: 'Low' },
  { value: 'irritable', emoji: '😤', label: 'Irritable' },
  { value: 'tired', emoji: '😴', label: 'Tired' },
];

export const SYMPTOM_OPTIONS: { value: Symptom; label: string }[] = [
  { value: 'cramps', label: 'Cramps' },
  { value: 'headache', label: 'Headache' },
  { value: 'bloating', label: 'Bloating' },
  { value: 'fatigue', label: 'Fatigue' },
  { value: 'breastTender', label: 'Breast tender' },
  { value: 'acne', label: 'Acne' },
  { value: 'backPain', label: 'Back pain' },
  { value: 'nausea', label: 'Nausea' },
];
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/cycle.ts
git commit -m "lib: add cycle derivation helpers (periods, predictions, status)"
```

---

## Task 6: WeekStrip component

**Files:**
- Create: `src/components/features/cycle/WeekStrip.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/features/cycle/WeekStrip.tsx`:

```tsx
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PressableOpacity } from '@/src/components/ui';
import type { CycleDayEntry } from '@/src/data/types';
import { addDays, flowColor, isoToDate } from '@/src/lib/cycle';
import { colors, radius, spacing, typography } from '@/src/theme';

const CELL_WIDTH = 44;
const CELL_GAP = 6;
const PAST_DAYS = 7;
const FUTURE_DAYS = 6;

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function WeekStrip({
  today,
  daily,
  predictedDates,
  onDayPress,
}: {
  today: string;
  daily: Record<string, CycleDayEntry>;
  predictedDates: string[];
  onDayPress: (iso: string) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const predictedSet = useMemo(() => new Set(predictedDates), [predictedDates]);

  const days = useMemo(() => {
    const out: { iso: string; weekday: string; date: number; isToday: boolean; isFuture: boolean }[] = [];
    for (let offset = -PAST_DAYS; offset <= FUTURE_DAYS; offset++) {
      const iso = addDays(today, offset);
      const date = isoToDate(iso);
      out.push({
        iso,
        weekday: WEEKDAY_LETTERS[date.getDay()],
        date: date.getDate(),
        isToday: iso === today,
        isFuture: iso > today,
      });
    }
    return out;
  }, [today]);

  useEffect(() => {
    const todayIndex = days.findIndex((d) => d.isToday);
    if (todayIndex < 0) return;
    const x = Math.max(0, todayIndex * (CELL_WIDTH + CELL_GAP) - CELL_WIDTH * 2);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x, animated: false });
    });
  }, [days]);

  function handlePress(iso: string, isFuture: boolean) {
    if (isFuture) {
      Haptics.selectionAsync().catch(() => undefined);
      return;
    }
    Haptics.selectionAsync().catch(() => undefined);
    onDayPress(iso);
  }

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}>
      {days.map((day) => {
        const entry = daily[day.iso];
        const isPredicted = predictedSet.has(day.iso) && day.isFuture;
        const dotColor = entry?.flow ? flowColor(entry.flow) : null;
        return (
          <PressableOpacity
            key={day.iso}
            onPress={() => handlePress(day.iso, day.isFuture)}
            style={[
              styles.cell,
              day.isToday && styles.cellToday,
              day.isFuture && styles.cellFuture,
            ]}>
            <Text style={[styles.weekday, day.isToday && styles.weekdayToday]}>{day.weekday}</Text>
            <Text style={[styles.date, day.isToday && styles.dateToday]}>{day.date}</Text>
            <View style={styles.dotWrap}>
              {dotColor ? (
                <View style={[styles.dotSolid, { backgroundColor: dotColor }]} />
              ) : isPredicted ? (
                <View style={styles.dotPredicted} />
              ) : (
                <View style={styles.dotEmpty} />
              )}
            </View>
          </PressableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: CELL_GAP,
    paddingVertical: spacing.xs,
    paddingHorizontal: 2,
  },
  cell: {
    width: CELL_WIDTH,
    paddingVertical: spacing.xs,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cellToday: {
    borderColor: colors.ink,
    backgroundColor: colors.paperRaised,
  },
  cellFuture: {
    opacity: 0.6,
  },
  weekday: {
    ...typography.kicker,
    fontSize: 10,
    color: colors.inkMuted,
    letterSpacing: 0.6,
  },
  weekdayToday: {
    color: colors.ink,
  },
  date: {
    ...typography.subhead,
    fontSize: 17,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  dateToday: {
    fontWeight: '700',
  },
  dotWrap: {
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotSolid: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotPredicted: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.bloom,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  dotEmpty: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.rule,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/features/cycle/WeekStrip.tsx
git commit -m "cycle: add WeekStrip component"
```

---

## Task 7: CycleLogSheet component

**Files:**
- Create: `src/components/features/cycle/CycleLogSheet.tsx`

This is the daily logging sheet. Auto-saves on every interaction (no Save button); the close button just dismisses.

- [ ] **Step 1: Create the component**

Create `src/components/features/cycle/CycleLogSheet.tsx`:

```tsx
import * as Haptics from 'expo-haptics';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet, PressableOpacity } from '@/src/components/ui';
import { useAppData } from '@/src/data';
import type { CycleDayEntry, FlowLevel, Mood, Symptom } from '@/src/data/types';
import {
  FLOW_LEVELS,
  MOOD_OPTIONS,
  SYMPTOM_OPTIONS,
  flowColor,
  flowLabel,
} from '@/src/lib/cycle';
import { colors, radius, spacing, typography } from '@/src/theme';

export function CycleLogSheet({
  visible,
  date,
  onClose,
}: {
  visible: boolean;
  date: string;
  onClose: () => void;
}) {
  const { data, setData } = useAppData();
  const entry: CycleDayEntry = data.cycle.daily[date] ?? {};
  const isPeriod = Boolean(entry.flow);

  function writeEntry(next: CycleDayEntry) {
    const cleaned: CycleDayEntry = {};
    if (next.flow) cleaned.flow = next.flow;
    if (next.mood) cleaned.mood = next.mood;
    if (next.symptoms && next.symptoms.length > 0) cleaned.symptoms = next.symptoms;
    if (next.note && next.note.trim().length > 0) cleaned.note = next.note.trim();

    const isEmpty = Object.keys(cleaned).length === 0;

    setData((prev) => {
      const dailyNext = { ...prev.cycle.daily };
      if (isEmpty) {
        delete dailyNext[date];
      } else {
        dailyNext[date] = cleaned;
      }
      return {
        ...prev,
        cycle: {
          ...prev.cycle,
          daily: dailyNext,
        },
      };
    });
  }

  function findYesterdayFlow(): FlowLevel | undefined {
    const [y, m, d] = date.split('-').map(Number);
    const prev = new Date(y, m - 1, d - 1);
    const py = prev.getFullYear();
    const pm = String(prev.getMonth() + 1).padStart(2, '0');
    const pd = String(prev.getDate()).padStart(2, '0');
    const isoPrev = `${py}-${pm}-${pd}`;
    return data.cycle.daily[isoPrev]?.flow;
  }

  function togglePeriod() {
    Haptics.selectionAsync().catch(() => undefined);
    if (isPeriod) {
      writeEntry({ ...entry, flow: undefined });
    } else {
      const fallback: FlowLevel = findYesterdayFlow() ?? 'medium';
      writeEntry({ ...entry, flow: fallback });
    }
  }

  function setFlow(level: FlowLevel) {
    Haptics.selectionAsync().catch(() => undefined);
    writeEntry({ ...entry, flow: level });
  }

  function setMood(mood: Mood) {
    Haptics.selectionAsync().catch(() => undefined);
    const next = entry.mood === mood ? undefined : mood;
    writeEntry({ ...entry, mood: next });
  }

  function toggleSymptom(symptom: Symptom) {
    Haptics.selectionAsync().catch(() => undefined);
    const current = entry.symptoms ?? [];
    const next = current.includes(symptom)
      ? current.filter((s) => s !== symptom)
      : [...current, symptom];
    writeEntry({ ...entry, symptoms: next });
  }

  function setNote(note: string) {
    writeEntry({ ...entry, note });
  }

  function clearDay() {
    Alert.alert('Clear all data for this day?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
          writeEntry({});
        },
      },
    ]);
  }

  return (
    <BottomSheet visible={visible} title={formatDateLabel(date)} onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>PERIOD</Text>
        <PressableOpacity
          onPress={togglePeriod}
          style={[
            styles.periodToggle,
            isPeriod && { backgroundColor: colors.bloom, borderColor: colors.bloom },
          ]}>
          <View
            style={[
              styles.periodCheck,
              isPeriod && { borderColor: colors.paperRaised, backgroundColor: colors.paperRaised },
            ]}>
            {isPeriod ? <View style={[styles.periodCheckDot, { backgroundColor: colors.bloom }]} /> : null}
          </View>
          <Text style={[styles.periodToggleText, isPeriod && { color: colors.paperRaised }]}>
            {isPeriod ? 'Period today' : 'Mark as period day'}
          </Text>
        </PressableOpacity>

        {isPeriod ? (
          <View style={styles.flowRow}>
            {FLOW_LEVELS.map((level) => {
              const selected = entry.flow === level;
              return (
                <PressableOpacity
                  key={level}
                  onPress={() => setFlow(level)}
                  style={[
                    styles.flowChip,
                    selected && { backgroundColor: flowColor(level), borderColor: flowColor(level) },
                  ]}>
                  <Text style={[styles.flowChipText, selected && { color: colors.paperRaised }]}>
                    {flowLabel(level)}
                  </Text>
                </PressableOpacity>
              );
            })}
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>MOOD</Text>
        <View style={styles.moodRow}>
          {MOOD_OPTIONS.map((option) => {
            const selected = entry.mood === option.value;
            return (
              <PressableOpacity
                key={option.value}
                onPress={() => setMood(option.value)}
                style={[
                  styles.moodChip,
                  selected && { backgroundColor: colors.sage, borderColor: colors.sage },
                ]}>
                <Text style={styles.moodEmoji}>{option.emoji}</Text>
                <Text style={[styles.moodLabel, selected && { color: colors.paperRaised }]}>
                  {option.label}
                </Text>
              </PressableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>SYMPTOMS</Text>
        <View style={styles.symptomGrid}>
          {SYMPTOM_OPTIONS.map((option) => {
            const selected = entry.symptoms?.includes(option.value) ?? false;
            return (
              <PressableOpacity
                key={option.value}
                onPress={() => toggleSymptom(option.value)}
                style={[
                  styles.symptomChip,
                  selected && { backgroundColor: colors.slate, borderColor: colors.slate },
                ]}>
                <Text style={[styles.symptomChipText, selected && { color: colors.paperRaised }]}>
                  {option.label}
                </Text>
              </PressableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>NOTE</Text>
        <TextInput
          value={entry.note ?? ''}
          onChangeText={setNote}
          placeholder="Anything to remember?"
          placeholderTextColor={colors.inkMuted}
          style={styles.noteInput}
          maxLength={200}
        />

        <View style={styles.footer}>
          <PressableOpacity onPress={clearDay} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Clear day</Text>
          </PressableOpacity>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

function formatDateLabel(iso: string): string {
  const todayDate = new Date();
  const todayY = todayDate.getFullYear();
  const todayM = String(todayDate.getMonth() + 1).padStart(2, '0');
  const todayD = String(todayDate.getDate()).padStart(2, '0');
  const todayIsoLocal = `${todayY}-${todayM}-${todayD}`;
  if (iso === todayIsoLocal) return 'TODAY';

  const [y, m, d] = iso.split('-').map(Number);
  const yesterday = new Date(todayY, todayDate.getMonth(), todayDate.getDate() - 1);
  const yIso = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  if (iso === yIso) return 'YESTERDAY';

  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
    .format(new Date(y, m - 1, d))
    .toUpperCase();
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.kicker,
    color: colors.inkMuted,
    marginTop: spacing.sm,
  },
  periodToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.rule,
    backgroundColor: colors.paperRecessed,
  },
  periodCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.bloom,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodCheckDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  periodToggleText: {
    ...typography.subhead,
    color: colors.ink,
  },
  flowRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  flowChip: {
    paddingHorizontal: spacing.md,
    minHeight: 44,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.rule,
    backgroundColor: colors.paperRecessed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowChipText: {
    ...typography.subhead,
    fontSize: 13,
    color: colors.inkSoft,
  },
  moodRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  moodChip: {
    paddingHorizontal: spacing.sm,
    minHeight: 56,
    minWidth: 64,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.rule,
    backgroundColor: colors.paperRecessed,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  moodEmoji: {
    fontSize: 22,
  },
  moodLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.inkSoft,
  },
  symptomGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  symptomChip: {
    paddingHorizontal: spacing.md,
    minHeight: 44,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.rule,
    backgroundColor: colors.paperRecessed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symptomChipText: {
    ...typography.subhead,
    fontSize: 13,
    color: colors.inkSoft,
  },
  noteInput: {
    ...typography.body,
    color: colors.ink,
    backgroundColor: colors.paperRecessed,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.rule,
  },
  footer: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  clearBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  clearBtnText: {
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
git add src/components/features/cycle/CycleLogSheet.tsx
git commit -m "cycle: add CycleLogSheet bottom sheet (auto-save logging)"
```

---

## Task 8: CycleMonthModal component

**Files:**
- Create: `src/components/features/cycle/CycleMonthModal.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/features/cycle/CycleMonthModal.tsx`:

```tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableOpacity } from '@/src/components/ui';
import type { CycleDayEntry } from '@/src/data/types';
import {
  formatMonthLabel,
  isoDatesInMonth,
  monthKeyFromDate,
  nextMonthKey,
  previousMonthKey,
} from '@/src/lib/date';
import { flowColor } from '@/src/lib/cycle';
import { colors, radius, spacing, typography } from '@/src/theme';

const WEEKDAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function CycleMonthModal({
  visible,
  today,
  daily,
  predictedDates,
  onClose,
  onDayPress,
}: {
  visible: boolean;
  today: string;
  daily: Record<string, CycleDayEntry>;
  predictedDates: string[];
  onClose: () => void;
  onDayPress: (iso: string) => void;
}) {
  const [monthKey, setMonthKey] = useState(monthKeyFromDate());
  const predictedSet = useMemo(() => new Set(predictedDates), [predictedDates]);

  const cells = useMemo(() => buildMonthCells(monthKey), [monthKey]);

  function go(delta: number) {
    Haptics.selectionAsync().catch(() => undefined);
    setMonthKey((prev) => (delta > 0 ? nextMonthKey(prev) : previousMonthKey(prev)));
  }

  function handleCellPress(iso: string, isFuture: boolean) {
    if (isFuture) {
      Haptics.selectionAsync().catch(() => undefined);
      return;
    }
    Haptics.selectionAsync().catch(() => undefined);
    onDayPress(iso);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safe}>
        <View style={styles.header}>
          <PressableOpacity onPress={() => go(-1)} style={styles.navBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={colors.ink} />
          </PressableOpacity>
          <Text style={styles.headerTitle}>{formatMonthLabel(monthKey)}</Text>
          <PressableOpacity onPress={() => go(1)} style={styles.navBtn} hitSlop={8}>
            <Ionicons name="chevron-forward" size={20} color={colors.ink} />
          </PressableOpacity>
        </View>

        <View style={styles.weekHeaderRow}>
          {WEEKDAY_HEADERS.map((label, idx) => (
            <Text key={`${label}-${idx}`} style={styles.weekHeader}>
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((cell, idx) => {
            if (!cell) {
              return <View key={`blank-${idx}`} style={styles.cellBlank} />;
            }
            const entry = daily[cell.iso];
            const isPredicted = predictedSet.has(cell.iso) && cell.isFuture;
            const isToday = cell.iso === today;
            const dotColor = entry?.flow ? flowColor(entry.flow) : null;
            return (
              <Pressable
                key={cell.iso}
                onPress={() => handleCellPress(cell.iso, cell.isFuture)}
                style={({ pressed }) => [
                  styles.cell,
                  isToday && styles.cellToday,
                  cell.isFuture && styles.cellFuture,
                  pressed && !cell.isFuture && { opacity: 0.6 },
                ]}>
                <Text style={[styles.cellNumber, isToday && styles.cellNumberToday]}>
                  {cell.day}
                </Text>
                <View style={styles.dotWrap}>
                  {dotColor ? (
                    <View style={[styles.dotSolid, { backgroundColor: dotColor }]} />
                  ) : isPredicted ? (
                    <View style={styles.dotPredicted} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.legend}>
          <LegendItem swatch={<View style={[styles.dotSolid, { backgroundColor: colors.bloom }]} />} label="Period" />
          <LegendItem swatch={<View style={styles.dotPredicted} />} label="Predicted" />
          <LegendItem
            swatch={<View style={[styles.legendTodayBox]} />}
            label="Today"
          />
        </View>

        <View style={styles.footer}>
          <PressableOpacity onPress={onClose} style={styles.doneBtn}>
            <Text style={styles.doneBtnText}>Done</Text>
          </PressableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function LegendItem({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <View style={styles.legendItem}>
      {swatch}
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

interface Cell {
  iso: string;
  day: number;
  isFuture: boolean;
}

function buildMonthCells(monthKey: string): (Cell | null)[] {
  const dates = isoDatesInMonth(monthKey);
  if (dates.length === 0) return [];
  const [y, m] = monthKey.split('-').map(Number);
  const firstWeekday = new Date(y, m - 1, 1).getDay(); // 0=Sun..6=Sat
  // Convert to Mon-first: Sun=0 -> 6, Mon=1 -> 0, ..., Sat=6 -> 5
  const leading = (firstWeekday + 6) % 7;
  const todayDate = new Date();
  const todayY = todayDate.getFullYear();
  const todayM = String(todayDate.getMonth() + 1).padStart(2, '0');
  const todayD = String(todayDate.getDate()).padStart(2, '0');
  const todayIso = `${todayY}-${todayM}-${todayD}`;

  const cells: (Cell | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (const iso of dates) {
    const day = Number(iso.split('-')[2]);
    cells.push({ iso, day, isFuture: iso > todayIso });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paperRaised,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    ...typography.heading,
    color: colors.ink,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  weekHeader: {
    ...typography.kicker,
    color: colors.inkMuted,
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
  },
  cell: {
    width: `${100 / 7}%`,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 56,
    gap: 4,
  },
  cellToday: {
    backgroundColor: colors.paperRaised,
    borderRadius: radius.card,
  },
  cellFuture: {
    opacity: 0.55,
  },
  cellBlank: {
    width: `${100 / 7}%`,
    minHeight: 56,
  },
  cellNumber: {
    ...typography.subhead,
    fontSize: 15,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  cellNumberToday: {
    fontWeight: '700',
  },
  dotWrap: {
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotSolid: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotPredicted: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.bloom,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendLabel: {
    ...typography.caption,
    color: colors.inkMuted,
  },
  legendTodayBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: colors.paperRaised,
    borderColor: colors.rule,
    borderWidth: 1,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  doneBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
  },
  doneBtnText: {
    ...typography.subhead,
    color: colors.paperRaised,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/features/cycle/CycleMonthModal.tsx
git commit -m "cycle: add CycleMonthModal full-screen calendar"
```

---

## Task 9: CycleStatusStrip component

**Files:**
- Create: `src/components/features/cycle/CycleStatusStrip.tsx`

This component is reused both in Health tab (top) and Home (above first pulse card). It hides itself when there's no data and the user has never logged a period.

- [ ] **Step 1: Create the component**

Create `src/components/features/cycle/CycleStatusStrip.tsx`:

```tsx
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppData } from '@/src/data';
import { currentCycleStatus, flowColor, flowLabel } from '@/src/lib/cycle';
import { todayIso } from '@/src/lib/date';
import { colors, radius, spacing, typography } from '@/src/theme';

export function CycleStatusStrip({ style }: { style?: object }) {
  const { data } = useAppData();
  const today = todayIso();

  const status = useMemo(
    () => currentCycleStatus(today, data.cycle.daily, data.cycle.settings),
    [today, data.cycle.daily, data.cycle.settings],
  );

  if (!status.hasData) return null;

  const dotColor = status.isPeriodDay ? flowColor(status.flow) : colors.bloom;

  let primary: string;
  let secondary: string;
  if (status.isPeriodDay) {
    primary = `Day ${status.cycleDay} of period`;
    secondary = status.flow ? flowLabel(status.flow) : '';
  } else if (status.daysToNext != null) {
    primary = `Day ${status.cycleDay}`;
    const dayWord = status.daysToNext === 1 ? 'day' : 'days';
    const prefix = status.estimateOnly ? '~' : '';
    secondary = `${prefix}${status.daysToNext} ${dayWord} to next period`;
  } else {
    primary = `Day ${status.cycleDay}`;
    secondary = 'Log a few cycles for predictions';
  }

  return (
    <View style={[styles.strip, style]}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={styles.primary} numberOfLines={1}>
        {primary}
      </Text>
      {secondary ? (
        <>
          <Text style={styles.sep}>·</Text>
          <Text style={styles.secondary} numberOfLines={1}>
            {secondary}
          </Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.card,
    backgroundColor: colors.bloomTint,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  primary: {
    ...typography.subhead,
    fontSize: 14,
    color: colors.ink,
  },
  sep: {
    ...typography.caption,
    color: colors.inkMuted,
  },
  secondary: {
    ...typography.caption,
    color: colors.inkMuted,
    flexShrink: 1,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/features/cycle/CycleStatusStrip.tsx
git commit -m "cycle: add CycleStatusStrip one-line status"
```

---

## Task 10: CycleSection component

**Files:**
- Create: `src/components/features/cycle/CycleSection.tsx`

This is the main composition: WeekStrip + "Log today" button + "View calendar" link, and it owns the visibility state for the log sheet and month modal.

- [ ] **Step 1: Create the component**

Create `src/components/features/cycle/CycleSection.tsx`:

```tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Kicker, PressableOpacity } from '@/src/components/ui';
import { useAppData } from '@/src/data';
import { predictedPeriodDates } from '@/src/lib/cycle';
import { todayIso } from '@/src/lib/date';
import { colors, radius, spacing, typography } from '@/src/theme';

import { CycleLogSheet } from './CycleLogSheet';
import { CycleMonthModal } from './CycleMonthModal';
import { WeekStrip } from './WeekStrip';

export function CycleSection() {
  const { data } = useAppData();
  const today = todayIso();
  const [logDate, setLogDate] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const predicted = useMemo(
    () => predictedPeriodDates(data.cycle.daily, data.cycle.settings, 2),
    [data.cycle.daily, data.cycle.settings],
  );

  function openLogToday() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    setLogDate(today);
  }

  function openCalendar() {
    Haptics.selectionAsync().catch(() => undefined);
    setCalendarOpen(true);
  }

  function handleDayPress(iso: string) {
    setLogDate(iso);
  }

  function handleCalendarDayPress(iso: string) {
    setCalendarOpen(false);
    setLogDate(iso);
  }

  return (
    <View style={styles.wrapper}>
      <Kicker>Cycle</Kicker>

      <WeekStrip
        today={today}
        daily={data.cycle.daily}
        predictedDates={predicted}
        onDayPress={handleDayPress}
      />

      <View style={styles.actions}>
        <PressableOpacity onPress={openLogToday} style={styles.logBtn}>
          <Ionicons name="add" size={18} color={colors.paperRaised} />
          <Text style={styles.logBtnText}>Log today</Text>
        </PressableOpacity>
        <PressableOpacity onPress={openCalendar} style={styles.calLink} hitSlop={8}>
          <Text style={styles.calLinkText}>View calendar</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.inkMuted} />
        </PressableOpacity>
      </View>

      <CycleLogSheet
        visible={logDate !== null}
        date={logDate ?? today}
        onClose={() => setLogDate(null)}
      />

      <CycleMonthModal
        visible={calendarOpen}
        today={today}
        daily={data.cycle.daily}
        predictedDates={predicted}
        onClose={() => setCalendarOpen(false)}
        onDayPress={handleCalendarDayPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.bloom,
  },
  logBtnText: {
    ...typography.subhead,
    fontSize: 13,
    color: colors.paperRaised,
  },
  calLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  calLinkText: {
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
git add src/components/features/cycle/CycleSection.tsx
git commit -m "cycle: add CycleSection composing strip, log, and calendar"
```

---

## Task 11: cycle barrel exports

**Files:**
- Create: `src/components/features/cycle/index.ts`

- [ ] **Step 1: Create the barrel**

Create `src/components/features/cycle/index.ts`:

```ts
export * from './CycleLogSheet';
export * from './CycleMonthModal';
export * from './CycleSection';
export * from './CycleStatusStrip';
export * from './WeekStrip';
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/features/cycle/index.ts
git commit -m "cycle: add barrel exports"
```

---

## Task 12: Wire into Health tab

**Files:**
- Modify: `app/(tabs)/health.tsx`

- [ ] **Step 1: Add imports**

Open `app/(tabs)/health.tsx`. Add these two imports at the top with the other `@/src/components/...` imports (after the existing health feature import block):

```ts
import { CycleSection, CycleStatusStrip } from '@/src/components/features/cycle';
```

- [ ] **Step 2: Render `CycleStatusStrip` after the date row**

Find the JSX block in the return value:

```tsx
<View style={styles.header}>
  <Text style={styles.pageKicker}>PHYSICAL HEALTH</Text>
  <View style={styles.dateRow}>
    {/* ...existing chevrons + date label... */}
  </View>
</View>

<CalorieRing value={macros.kcal} target={targets.calories} />
```

Insert the `CycleStatusStrip` between the closing `</View>` of `styles.header` and the `CalorieRing`:

```tsx
<View style={styles.header}>
  <Text style={styles.pageKicker}>PHYSICAL HEALTH</Text>
  <View style={styles.dateRow}>
    {/* ...existing chevrons + date label... */}
  </View>
</View>

<CycleStatusStrip style={styles.cycleStrip} />

<CalorieRing value={macros.kcal} target={targets.calories} />
```

- [ ] **Step 3: Render `CycleSection` between Meals and Trends**

Find the meals block (it ends with `</View>` after the `entry.meals.length === 0` ternary, just before `<Kicker>Trends</Kicker>`). Insert the new section between them:

```tsx
        {/* ...existing meals block... */}
        {entry.meals.length === 0 ? (
          <PressableOpacity onPress={openNewMeal} style={styles.emptyState}>
            {/* ...existing empty state... */}
          </PressableOpacity>
        ) : (
          <View style={styles.mealList}>
            {/* ...existing meal list... */}
          </View>
        )}

        <CycleSection />

        <Kicker>Trends</Kicker>
        {/* ...existing chart... */}
```

- [ ] **Step 4: Add `cycleStrip` style**

Inside the `StyleSheet.create({...})` at the bottom of the file, add:

```ts
  cycleStrip: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Manual smoke test on simulator**

Run: `npx expo start --ios` (or `--android`).

Verify:
- Health tab loads without crashing.
- The status strip is hidden initially (no cycle data).
- Tapping "Log today" opens the bottom sheet.
- Toggling "Mark as period day" shows flow chips.
- Selecting "Heavy" turns the bottom-sheet-period-toggle into the bloom color.
- After dismissing the sheet, the status strip appears showing "Day 1 of period · Heavy" and the WeekStrip shows a solid bloom dot under today.
- Tapping "View calendar" opens the month modal; today has a bold border and a solid dot.

If anything renders wrong, fix it before committing. Common issues to check: missing import, wrong style key, prediction set not updating because `useMemo` deps are off.

- [ ] **Step 7: Commit**

```bash
git add 'app/(tabs)/health.tsx'
git commit -m "health: render cycle status strip and section"
```

---

## Task 13: Wire into Home tab

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Add import**

Open `app/(tabs)/index.tsx`. Add to the imports:

```ts
import { CycleStatusStrip } from '@/src/components/features/cycle';
```

- [ ] **Step 2: Render the strip above the first pulse card**

Find this section in the JSX:

```tsx
<Text style={styles.greeting}>{greeting.toUpperCase()}</Text>
<Text style={styles.heading}>{formatDayHeading(today)}</Text>

{/* ───────────── Health pulse card ───────────── */}
<View style={styles.pulseCard}>
```

Insert the strip between the heading and the comment marker for the Health pulse card:

```tsx
<Text style={styles.greeting}>{greeting.toUpperCase()}</Text>
<Text style={styles.heading}>{formatDayHeading(today)}</Text>

<CycleStatusStrip style={styles.cycleStrip} />

{/* ───────────── Health pulse card ───────────── */}
<View style={styles.pulseCard}>
```

- [ ] **Step 3: Add `cycleStrip` style**

Inside the `StyleSheet.create({...})` at the bottom, add:

```ts
  cycleStrip: {
    marginBottom: spacing.sm,
  },
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Manual smoke test**

Run the app. Verify:
- Home tab loads cleanly.
- If you logged a period day in Task 12, the strip is visible above the calorie pulse card.
- If you clear all cycle data (use the "Clear day" button on every logged day), the strip disappears.
- The strip text wraps gracefully on narrow widths (try iPhone SE viewport).

- [ ] **Step 6: Commit**

```bash
git add 'app/(tabs)/index.tsx'
git commit -m "home: render cycle status strip above pulse cards"
```

---

## Final verification

- [ ] **Run full type-check**

Run: `npx tsc --noEmit`
Expected: PASS, no errors.

- [ ] **Run lint**

Run: `npm run lint`
Expected: PASS, or only pre-existing warnings unrelated to the new files.

- [ ] **Manual end-to-end test**

Run the app and walk through the spec's "Interaction Flows" (section 8 of the spec):
1. **First-ever period log:** tap "Log today" → toggle period → close. Strip appears.
2. **Daily log during period:** tap strip → change flow level → tap mood → tap two symptoms → close.
3. **Period ends:** stop logging. Status flips from "Day N of period" to "Day N · X days to next period" the day after the last flow day.
4. **Looking up next period:** "View calendar" → see dashed rings on predicted future period.
5. **Editing a past day:** open calendar → tap a past day → change flow.
6. **Removing an entry:** open log sheet → "Clear day" → confirm.

- [ ] **Reset & migration test**

If you've been logging on a development build, manually verify backwards compatibility:
1. Use a debugger or temporary code to remove the `cycle` field from AsyncStorage.
2. Reload the app.
3. Confirm no crash; the cycle area shows the empty state.

---

## Notes for the implementing agent

- **Fast feedback:** the Metro bundler hot-reloads each file save. After most steps, you do not need to fully restart the simulator.
- **Reanimated isn't required for v1** even though it's installed. The interactions use plain state + haptics; this matches the codebase's WaterTracker pattern.
- **No new dependencies** are required. All imports use packages already in `package.json`.
- **The seed already includes the new `cycle` field** so a clean install yields no period data, consistent with the spec.
- **If you see `mergeWithSeed` produce duplicate dates** after editing across midnight, the cause is usually `new Date(iso)` on a `'YYYY-MM-DD'` string interpreting it as UTC. Use `isoToDate()` (in `cycle.ts`) which constructs the date in local time.
