# Mobile Port — Expo (React Native) Implementation Plan

> **For the target AI:** This is a **self-contained** plan. It describes how to build a personal finance + health dashboard mobile app in Expo (React Native) from scratch. You do **not** need access to any other source code. All data shapes, seed values, color palettes, copy text, and behavior specs are embedded in this document.
>
> Build it phase by phase. Each phase delivers a working slice. Run the app on iOS Simulator / Android Emulator / Expo Go after each phase to verify before moving on.

---

## 0. Goal

Port a single-page Svelte web dashboard to a native mobile app using Expo + React Native. The dashboard tracks personal finance (bank accounts, loans, credit cards, money owed, monthly spends) and physical health (food log with calorie/macro tracking, water/weight, charts).

Data is **local-only**, stored on the device via AsyncStorage. No backend, no auth, no cloud sync.

---

## 1. Tech stack

| Layer | Choice |
|---|---|
| Runtime | Expo SDK 51+ (managed workflow) |
| Language | TypeScript (strict) |
| Navigation | Expo Router (file-based, tab + stack) |
| Storage | `@react-native-async-storage/async-storage` |
| State | React `useState`/`useReducer` + a single `AppDataProvider` context (no Redux/Zustand needed) |
| Charts | `react-native-svg` (drawn with primitives — `<Rect>`, `<Path>`, `<Line>`, `<Circle>`, `<Text>`) |
| Modals | `react-native` built-in `<Modal>` (full-screen sheet style) |
| Gradients | `expo-linear-gradient` |
| Date/time | Built-in `Date` + small helpers in `lib/date.ts` |
| Icons | `@expo/vector-icons` (Ionicons family) |
| Clipboard | `expo-clipboard` (for "Copy as JSON snippet" feature) |
| Lint/format | ESLint + Prettier (Expo defaults) |

**No** chart libraries (Victory, Recharts) — we draw all charts ourselves with `react-native-svg` to match the Svelte version's look and keep dependencies thin.

---

## 2. Project bootstrap

```bash
npx create-expo-app@latest finance-health-mobile -t expo-template-blank-typescript
cd finance-health-mobile

# Install Expo Router + supporting libs
npx expo install expo-router expo-linking expo-constants expo-status-bar expo-linear-gradient expo-clipboard
npx expo install react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-reanimated
npx expo install react-native-svg
npx expo install @react-native-async-storage/async-storage
npx expo install @expo/vector-icons

# Dev deps
pnpm add -D @types/react @types/react-native
```

In `package.json` set `"main": "expo-router/entry"`.

In `app.json`:

```json
{
  "expo": {
    "name": "Finance & Health",
    "slug": "finance-health-mobile",
    "scheme": "financehealth",
    "version": "0.1.0",
    "orientation": "portrait",
    "userInterfaceStyle": "light",
    "ios": { "supportsTablet": false, "bundleIdentifier": "in.airaai.financehealth" },
    "android": { "package": "in.airaai.financehealth" },
    "plugins": ["expo-router"],
    "experiments": { "typedRoutes": true }
  }
}
```

Update `tsconfig.json` to extend `expo/tsconfig.base` and enable `"strict": true`.

---

## 3. Folder structure

```
finance-health-mobile/
├── app/                          # Expo Router screens
│   ├── _layout.tsx               # Root layout: AppDataProvider + theme + status bar
│   ├── (tabs)/                   # Tab navigator
│   │   ├── _layout.tsx           # Tab bar config
│   │   ├── index.tsx             # Home / Dashboard (default tab)
│   │   ├── spends.tsx            # Monthly Spends
│   │   └── health.tsx            # Physical Health
│   ├── loan/[id].tsx             # Loan detail screen (stack push from Home)
│   └── +not-found.tsx
├── src/
│   ├── data/
│   │   ├── seed.ts               # Built-in seed data (ribbons, foods, etc.)
│   │   ├── storage.ts            # AsyncStorage read/write/migrate helpers
│   │   ├── types.ts              # TypeScript interfaces
│   │   └── AppDataProvider.tsx   # Context: { data, dispatch, hydrated }
│   ├── theme/
│   │   ├── colors.ts             # Palette
│   │   ├── spacing.ts            # 4-pt scale
│   │   └── typography.ts         # Font sizes / weights
│   ├── lib/
│   │   ├── currency.ts           # ₹ formatting
│   │   ├── date.ts               # ISO/month-key helpers
│   │   ├── physical-health.ts    # Pure macro derivation (slugify, itemMacros, dayMacros, migrateDailyEntry, mergeFoods, findFoodById)
│   │   └── monthly-spends.ts     # Spend log helpers (mergeSpendEntries, monthKeyFromDate, etc.)
│   ├── components/
│   │   ├── Card.tsx              # Generic gradient card
│   │   ├── Ribbon.tsx            # Bank ribbon row
│   │   ├── LoanGauge.tsx         # Half-circle gauge SVG
│   │   ├── BarChart.tsx          # Bar chart for macros
│   │   ├── LineChart.tsx         # Smooth line chart for weight
│   │   ├── AreaLineChart.tsx     # Combined area+line for finance
│   │   ├── PieSlice.tsx          # Single pie slice path
│   │   ├── Tape.tsx              # Earned vs spent stacked horizontal bar
│   │   ├── StatTile.tsx          # Calorie/protein/carbs/fats tile
│   │   ├── MealCard.tsx          # One meal in physical health
│   │   ├── FoodPickerModal.tsx   # Picker bottom sheet
│   │   ├── CustomFoodForm.tsx    # Inline form inside picker
│   │   ├── MonthPickerSheet.tsx  # Month/year picker for spends
│   │   ├── SectionHeader.tsx     # Reusable section title
│   │   └── Pressable.tsx         # Wrapped Pressable with feedback opacity
│   └── tests/
│       ├── physical-health.test.ts
│       └── monthly-spends.test.ts
├── jest.config.js                # ts-jest (Expo template)
└── ...
```

**Rule:** any function not tied to React goes into `src/lib/`. Components stay under 250 lines each — split if growing.

---

## 4. Theme

Reproduce the web app's pastel-on-grid look with React Native equivalents.

### 4.1 `src/theme/colors.ts`

```ts
export const palette = {
  // Backgrounds
  bgGradientStart: '#fef3f6',
  bgGradientEnd: '#e0e7ff',
  surface: '#ffffff',
  surfaceMuted: '#f9fafb',
  surfaceTinted: '#f5f3ff',

  // Borders
  border: '#e5e7eb',
  borderTinted: '#e0d7ff',

  // Text
  text: '#0f172a',
  textMuted: '#6b7280',
  textTintedDark: '#312e81',
  textTintedAccent: '#6366f1',
  textOnDark: '#ffffff',

  // Brand-ish
  primary: '#4338ca',
  primaryDark: '#1f2937',
  danger: '#ef4444',
  earned: '#10b981',
  spent: '#f97316',
  warning: '#f59e0b',

  // Chart palettes
  chartEarned: ['#86efac', '#67e8f9', '#a7f3d0', '#93c5fd', '#bef264', '#6ee7b7', '#7dd3fc', '#bbf7d0'],
  chartSpent: ['#93c5fd', '#60a5fa', '#fb923c', '#fcd34d', '#94a3b8', '#fca5a5', '#c4b5fd', '#fdba74'],
  chartPie: ['#2563eb', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316'],
}
```

### 4.2 `src/theme/spacing.ts`

```ts
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 }
export const radius = { sm: 6, md: 10, lg: 14, xl: 18, pill: 999 }
```

### 4.3 `src/theme/typography.ts`

```ts
export const typography = {
  kicker:   { fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  title:    { fontSize: 22, fontWeight: '700' },
  heading:  { fontSize: 18, fontWeight: '700' },
  subhead:  { fontSize: 15, fontWeight: '600' },
  body:     { fontSize: 14, fontWeight: '400' },
  caption:  { fontSize: 12, fontWeight: '400' },
  numeric:  { fontVariant: ['tabular-nums'] as const },
} as const
```

### 4.4 Background

Wrap each screen's root view with an `expo-linear-gradient` from `bgGradientStart` to `bgGradientEnd` at angle 135°. Add a subtle 32×32-px grid pattern via a tiled `<Svg>` background (8% opacity gray lines) — implement once in `<Card>` parent.

---

## 5. Data layer

### 5.1 `src/data/types.ts` — full schema

```ts
export interface RibbonColors {
  bg: string
  bgEnd: string
  text: string
  muted: string
  icon: string
  stripe: string
  border: string
}

export interface Ribbon extends RibbonColors {
  bank: string
  account: string      // '0000' or 'Cash'
  amount: string       // stringified number, e.g. '24752' (no commas; format on display)
}

export interface CreditCard {
  name: string
  amount: number
  note: string
}

export interface LoanTrackerItem {
  id: string
  title: string
  lender: string
  progress: number          // 0..1
  amountLeftValue: number
  progressLabel: string
  headline: string
  amountLeft: string        // pre-formatted '₹1,20,000'
  support: string           // 'Monthly EMI ₹20,000'
  detailRows: { label: string; value: string }[]
  schedule: string[]
}

export interface Person {
  name: string
  amount: number
}

export interface FinanceTransaction {
  date: string              // 'May 5, 2026'
  time: string              // 'HH:MM'
  category: string          // 'Salary' | 'Rent' | 'Gold Loan' | 'Gym' | ...
  subCategory: string       // 'Monthly' | 'PG' | ...
  note: string
  amount: number            // signed: positive = earned, negative = spent
}

export interface Food {
  id: string
  name: string
  kcal: number              // per 100g (or per 100ml)
  protein: number
  carbs: number
  fats: number
  custom?: boolean
}

export interface MealItem {
  foodId: string
  grams: number
}

export interface Meal {
  time: string              // 'HH:MM'
  label: string             // 'Breakfast' (free text)
  items: MealItem[]
}

export interface DailyEntry {
  water: number             // ml
  weight: number            // kg
  meals: Meal[]
}

export interface PhysicalHealth {
  targets: {
    calories: number
    protein: number
    carbs: number
    fats: number
    water: number
    weight: number
  }
  foods: Food[]
  daily: Record<string /* ISO YYYY-MM-DD */, DailyEntry>
}

export interface SpendEntry {
  id: string                // 'spend-{ts}-{rand}' or 'seed-finance-{date}-{idx}'
  name: string
  amount: number            // absolute value
  recurring: boolean
  managed?: boolean
  details?: {
    date?: string
    transaction?: FinanceTransaction
  }
}

export type MonthlySpends = Record<string /* 'YYYY-MM' */, SpendEntry[]>

export interface AppData {
  ribbons: Ribbon[]
  creditCards: CreditCard[]
  loanTrackerItems: LoanTrackerItem[]
  peopleToGiveMoney: Person[]
  financeTransactions: FinanceTransaction[]
  physicalHealth: PhysicalHealth
  monthlySpends: MonthlySpends
}
```

### 5.2 `src/data/seed.ts` — full seed data

```ts
import type { AppData } from './types'

export const SEED: AppData = {
  ribbons: [
    { bank: 'Primary Bank',   account: '0000', amount: '0', bg: '#ffe8ec', bgEnd: '#c4dcff', text: '#173f7a', muted: '#5a6473',          icon: '#1f4b8f', stripe: '#e31e2f', border: '#bfd0eb' },
    { bank: 'Salary Account', account: '0000', amount: '0', bg: '#0f4f99', bgEnd: '#3474be', text: '#ffffff', muted: 'rgba(255,255,255,0.78)', icon: '#ffffff', stripe: '#e31b23', border: '#0d4f93' },
    { bank: 'Savings',        account: '0000', amount: '0', bg: '#f5f3ff', bgEnd: '#ddd6fe', text: '#312e81', muted: '#6366f1',          icon: '#4338ca', stripe: '#7c3aed', border: '#c4b5fd' },
    { bank: 'Wallet',         account: 'Cash', amount: '0', bg: '#f5ede3', bgEnd: '#caa27c', text: '#4b2e1f', muted: '#7a553c',          icon: '#6b4226', stripe: '#8b5e3c', border: '#b08968' },
  ],

  creditCards: [{ name: 'Credit Card', amount: 0, note: 'Sample card' }],

  loanTrackerItems: [
    {
      id: 'loan-a', title: 'Loan A', lender: 'Sample loan',
      progress: 6 / 12, amountLeftValue: 120000,
      progressLabel: '6 months left', headline: '6 months left',
      amountLeft: '₹1,20,000', support: 'Monthly EMI ₹20,000',
      detailRows: [
        { label: 'Original amount', value: '₹2,40,000' },
        { label: 'Monthly EMI',     value: '₹20,000' },
        { label: 'Next due',        value: 'Sample date' },
      ],
      schedule: ['Month 1 - ₹20,000', 'Month 2 - ₹20,000', 'Month 3 - ₹20,000'],
    },
    {
      id: 'loan-b', title: 'Loan B', lender: 'Sample device plan',
      progress: 3 / 10, amountLeftValue: 35000,
      progressLabel: '7 months left', headline: '7 months left',
      amountLeft: '₹35,000', support: 'Monthly EMI ₹5,000',
      detailRows: [
        { label: 'Original amount', value: '₹50,000' },
        { label: 'Monthly EMI',     value: '₹5,000' },
        { label: 'Next due',        value: 'Sample date' },
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
      { id: 'egg',             name: 'Egg (whole)',     kcal: 155, protein: 13,   carbs:  1.1, fats: 11   },
      { id: 'idli',            name: 'Idli',            kcal:  39, protein:  2,   carbs:  8,   fats:  0.2 },
      { id: 'dosa-plain',      name: 'Dosa (plain)',    kcal: 168, protein:  4,   carbs: 29,   fats:  5   },
      { id: 'coconut-chutney', name: 'Coconut chutney', kcal: 200, protein:  2,   carbs:  6,   fats: 19   },
      { id: 'sambar',          name: 'Sambar',          kcal:  57, protein:  3,   carbs:  8,   fats:  1.5 },
      { id: 'milk-whole',      name: 'Milk (whole)',    kcal:  61, protein:  3.2, carbs:  4.8, fats:  3.3 },
      { id: 'milk-toned',      name: 'Milk (toned)',    kcal:  50, protein:  3,   carbs:  5,   fats:  1.5 },
      { id: 'curd-whole',      name: 'Curd (whole)',    kcal:  60, protein:  3,   carbs:  5,   fats:  3   },
      { id: 'chicken-cooked',  name: 'Chicken (cooked)',kcal: 165, protein: 31,   carbs:  0,   fats:  3.6 },
      { id: 'chicken-curry',   name: 'Chicken curry',   kcal: 200, protein: 20,   carbs:  4,   fats: 12   },
      { id: 'roti',            name: 'Roti / Chapati',  kcal: 310, protein: 11,   carbs: 56,   fats:  4   },
      { id: 'rice-cooked',     name: 'Rice (cooked)',   kcal: 130, protein:  2.7, carbs: 28,   fats:  0.3 },
      { id: 'carrot',          name: 'Carrot',          kcal:  41, protein:  0.9, carbs: 10,   fats:  0.2 },
      { id: 'cucumber',        name: 'Cucumber',        kcal:  16, protein:  0.7, carbs:  4,   fats:  0.1 },
      { id: 'banana',          name: 'Banana',          kcal:  89, protein:  1.1, carbs: 23,   fats:  0.3 },
      { id: 'apple',           name: 'Apple',           kcal:  52, protein:  0.3, carbs: 14,   fats:  0.2 },
      { id: 'peanut',          name: 'Peanut',          kcal: 567, protein: 26,   carbs: 16,   fats: 49   },
      { id: 'oats-dry',        name: 'Oats (dry)',      kcal: 389, protein: 17,   carbs: 66,   fats:  7   },
      { id: 'paneer',          name: 'Paneer',          kcal: 265, protein: 18,   carbs:  1.2, fats: 21   },
      { id: 'almond',          name: 'Almond',          kcal: 579, protein: 21,   carbs: 22,   fats: 50   },
    ],
    daily: {},
  },

  monthlySpends: {},
}
```

### 5.3 `src/data/storage.ts`

Single AsyncStorage key holds the entire `AppData` blob. Versioned. Migration runs on read.

```ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { AppData } from './types'
import { SEED } from './seed'
import { migrateDailyEntry, mergeFoods } from '@/lib/physical-health'

const KEY = 'finance-health-app-data-v1'

export async function loadAppData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (!raw) return structuredClone(SEED)
    const stored = JSON.parse(raw) as Partial<AppData>
    return mergeWithSeed(stored)
  } catch (err) {
    console.warn('loadAppData failed, falling back to seed', err)
    return structuredClone(SEED)
  }
}

export async function saveAppData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data))
}

function mergeWithSeed(stored: Partial<AppData>): AppData {
  // File-seed wins on conflict for foods (so seeded macros stay correct after update),
  // but localStorage wins for daily logs (user-entered data).
  const ph = stored.physicalHealth ?? ({} as AppData['physicalHealth'])
  const seedPh = SEED.physicalHealth
  const dailyMigrated: Record<string, ReturnType<typeof migrateDailyEntry>> = {}
  for (const [date, entry] of Object.entries(ph.daily ?? {})) {
    dailyMigrated[date] = migrateDailyEntry(entry)
  }
  return {
    ribbons:           stored.ribbons           ?? SEED.ribbons,
    creditCards:       stored.creditCards       ?? SEED.creditCards,
    loanTrackerItems:  stored.loanTrackerItems  ?? SEED.loanTrackerItems,
    peopleToGiveMoney: stored.peopleToGiveMoney ?? SEED.peopleToGiveMoney,
    financeTransactions: stored.financeTransactions ?? SEED.financeTransactions,
    physicalHealth: {
      targets: { ...seedPh.targets, ...(ph.targets ?? {}) },
      foods:   mergeFoods(ph.foods, seedPh.foods),     // file wins on conflict
      daily:   dailyMigrated,
    },
    monthlySpends: stored.monthlySpends ?? {},
  }
}
```

### 5.4 `src/lib/physical-health.ts`

Identical logic to web. Pure functions, fully testable.

```ts
import type { Food, DailyEntry, MealItem } from '@/data/types'

export const slugify = (input: string): string =>
  String(input ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

export const itemMacros = (item: MealItem, foodsById: Record<string, Food>) => {
  const food = foodsById[item.foodId]
  const grams = Number(item.grams)
  if (!food || !Number.isFinite(grams) || grams <= 0) return { kcal: 0, protein: 0, carbs: 0, fats: 0 }
  const f = grams / 100
  return { kcal: food.kcal * f, protein: food.protein * f, carbs: food.carbs * f, fats: food.fats * f }
}

export const dayMacros = (entry: DailyEntry | undefined | null, foodsById: Record<string, Food>) => {
  const empty = { kcal: 0, protein: 0, carbs: 0, fats: 0 }
  if (!entry?.meals) return empty
  return entry.meals.reduce((acc, meal) => {
    if (!Array.isArray(meal.items)) return acc
    return meal.items.reduce((inner, item) => {
      const m = itemMacros(item, foodsById)
      return {
        kcal:    inner.kcal    + m.kcal,
        protein: inner.protein + m.protein,
        carbs:   inner.carbs   + m.carbs,
        fats:    inner.fats    + m.fats,
      }
    }, acc)
  }, empty)
}

export const migrateDailyEntry = (entry: any): DailyEntry => {
  if (!entry || typeof entry !== 'object') return { water: 0, weight: 0, meals: [] }
  const meals = Array.isArray(entry.meals)
    ? entry.meals.map((m: any) => Array.isArray(m.items)
        ? { time: m.time ?? '00:00', label: m.label ?? '', items: m.items }
        : { time: m.time ?? '00:00', label: m.text ?? m.label ?? '', items: [] })
    : []
  return { water: Number(entry.water) || 0, weight: Number(entry.weight) || 0, meals }
}

export const findFoodById = (foods: Food[] | undefined, id: string) =>
  foods?.find((f) => f.id === id)

export const mergeFoods = (base?: Food[], overrides?: Food[]): Food[] => {
  const map = new Map<string, Food>()
  for (const f of base ?? []) map.set(f.id, f)
  for (const f of overrides ?? []) map.set(f.id, f)
  return Array.from(map.values())
}

export const todayIso = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
```

### 5.5 `src/lib/date.ts`

```ts
export const monthKeyFromDate = (d: Date = new Date()): string => {
  const local = new Date(d)
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset())
  return local.toISOString().slice(0, 7) // 'YYYY-MM'
}

export const formatLongDate = (iso: string): string => {
  const [y, m, dd] = iso.split('-').map(Number)
  return new Date(y, m - 1, dd).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export const dateRange = (scale: 'week' | 'month' | 'year'): string[] => {
  const today = new Date()
  if (scale === 'week') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() - (6 - i)); return d.toISOString().slice(0, 10)
    })
  }
  if (scale === 'month') {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() - (29 - i)); return d.toISOString().slice(0, 10)
    })
  }
  // year: 52 weeks (Mondays)
  const monday = new Date(today)
  const dow = (monday.getDay() + 6) % 7
  monday.setDate(monday.getDate() - dow)
  return Array.from({ length: 52 }, (_, i) => {
    const d = new Date(monday); d.setDate(d.getDate() - (51 - i) * 7); return d.toISOString().slice(0, 10)
  })
}
```

### 5.6 `src/lib/currency.ts`

```ts
export const formatINR = (n: number, opts: { compact?: boolean; signed?: boolean } = {}): string => {
  const sign = opts.signed && n > 0 ? '+' : ''
  if (opts.compact) {
    if (Math.abs(n) >= 100000) return `${sign}₹${(n / 100000).toFixed(1)}L`
    if (Math.abs(n) >= 1000)   return `${sign}₹${(n / 1000).toFixed(1)}K`
  }
  return `${sign}₹${Math.round(n).toLocaleString('en-IN')}`
}
```

### 5.7 `src/data/AppDataProvider.tsx`

```tsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import type { AppData } from './types'
import { loadAppData, saveAppData } from './storage'
import { SEED } from './seed'

interface Ctx {
  data: AppData
  hydrated: boolean
  setData: (next: AppData | ((prev: AppData) => AppData)) => void
}
const AppDataCtx = createContext<Ctx | null>(null)

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setDataState] = useState<AppData>(SEED)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    loadAppData().then((d) => { setDataState(d); setHydrated(true) })
  }, [])

  useEffect(() => {
    if (hydrated) saveAppData(data).catch((e) => console.warn('save failed', e))
  }, [data, hydrated])

  const setData = (next: AppData | ((prev: AppData) => AppData)) =>
    setDataState((prev) => (typeof next === 'function' ? (next as (p: AppData) => AppData)(prev) : next))

  return <AppDataCtx.Provider value={{ data, hydrated, setData }}>{children}</AppDataCtx.Provider>
}

export const useAppData = () => {
  const ctx = useContext(AppDataCtx)
  if (!ctx) throw new Error('useAppData must be inside AppDataProvider')
  return ctx
}
```

---

## 6. Navigation skeleton

### 6.1 `app/_layout.tsx`

```tsx
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AppDataProvider } from '@/src/data/AppDataProvider'

export default function RootLayout() {
  return (
    <AppDataProvider>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="loan/[id]" options={{ presentation: 'modal' }} />
        </Stack>
      </SafeAreaProvider>
    </AppDataProvider>
  )
}
```

### 6.2 `app/(tabs)/_layout.tsx`

```tsx
import { Tabs } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { palette } from '@/src/theme/colors'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="spends"
        options={{ title: 'Spends', tabBarIcon: ({ color, size }) => <Ionicons name="cash-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="health"
        options={{ title: 'Health', tabBarIcon: ({ color, size }) => <Ionicons name="fitness-outline" color={color} size={size} /> }}
      />
    </Tabs>
  )
}
```

---

## 7. Phases

Each phase ends in a runnable build. Test on simulator/device after each.

### Phase 1 — Bootstrap, theme, data layer ✅ verifiable

**Deliverable:** Tab navigator with three placeholder screens. Theme tokens loaded. AsyncStorage seeded. Dev menu + reload work.

**Tasks:**
1. Run the bootstrap commands in §2.
2. Create the folders in §3.
3. Implement §4 theme files.
4. Implement §5.1, §5.2, §5.3, §5.4, §5.5, §5.6, §5.7.
5. Implement `app/_layout.tsx` and `app/(tabs)/_layout.tsx` from §6.
6. Each tab screen renders just `<SafeAreaView><Text>{tabName}</Text></SafeAreaView>` with a gradient background.
7. Add `console.log(data)` inside one screen using `useAppData()` to confirm hydration.

**Verify:** App boots, three tabs work, AsyncStorage clears on reset (use Expo dev menu → "Clear AsyncStorage" via a debug button if needed).

**Tests:** Add Jest + RNTL.

```ts
// src/tests/physical-health.test.ts
import { slugify, itemMacros, dayMacros, migrateDailyEntry, mergeFoods } from '@/lib/physical-health'

test('slugify lowercases and hyphenates', () => { expect(slugify('Brown Bread')).toBe('brown-bread') })
test('slugify strips punctuation', () => { expect(slugify('Milk (whole)')).toBe('milk-whole') })
test('itemMacros scales by grams/100', () => {
  const foods = { egg: { id: 'egg', name: 'Egg', kcal: 155, protein: 13, carbs: 1.1, fats: 11 } }
  expect(itemMacros({ foodId: 'egg', grams: 350 }, foods)).toEqual({
    kcal: 155 * 3.5, protein: 13 * 3.5, carbs: 1.1 * 3.5, fats: 11 * 3.5,
  })
})
test('dayMacros sums across meals', () => {
  const foods = { egg: { id: 'egg', name: 'Egg', kcal: 100, protein: 10, carbs: 0, fats: 5 } }
  const entry = { water: 0, weight: 0, meals: [
    { time: '08:00', label: '', items: [{ foodId: 'egg', grams: 100 }] },
    { time: '13:00', label: '', items: [{ foodId: 'egg', grams: 200 }] },
  ]}
  expect(dayMacros(entry, foods)).toEqual({ kcal: 300, protein: 30, carbs: 0, fats: 15 })
})
test('migrateDailyEntry converts legacy text meals', () => {
  expect(migrateDailyEntry({ meals: [{ time: '08:00', text: 'B' }] })).toEqual({
    water: 0, weight: 0, meals: [{ time: '08:00', label: 'B', items: [] }],
  })
})
test('mergeFoods overrides win on conflict', () => {
  const base = [{ id: 'egg', name: 'Egg', kcal: 155, protein: 13, carbs: 1.1, fats: 11 }]
  const over = [{ id: 'egg', name: 'Egg2', kcal: 160, protein: 13, carbs: 1.1, fats: 11 }]
  expect(mergeFoods(base, over)[0].kcal).toBe(160)
})
```

Run `pnpm jest` — must pass.

**Commit:** `feat: bootstrap expo project + data layer + theme`

---

### Phase 2 — Home / Dashboard: ribbons + people + cards

**Deliverable:** Home tab shows the bank ribbons stack, total ribbon, credit cards, and people-to-give-money, all from seed data, all visually polished.

**Components to build:**

#### `src/components/Card.tsx`

```tsx
import { View, ViewProps } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { palette, spacing, radius } from '@/src/theme'

export function Card({ children, style, ...rest }: ViewProps) {
  return (
    <LinearGradient
      colors={['#ffffffc7', '#f1f5f99e']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[{
        borderRadius: radius.xl,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: '#e0e7ff38',
        marginBottom: spacing.md,
      }, style]}
      {...(rest as any)}
    >
      {children}
    </LinearGradient>
  )
}
```

#### `src/components/Ribbon.tsx`

A horizontal "card" with a bank logo, name, account, amount. The `bg → bgEnd` gradient + a `stripe`-colored vertical line at left.

Layout (RTL of left to right):
- 4-px wide stripe
- Padding 16
- Column: bank name (uppercase, 11px, color = muted), account (12px, color = muted), amount (24px bold, color = text)
- Right-aligned circle icon (30px) with bank initial

```tsx
import { View, Text } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ribbon as RibbonT } from '@/src/data/types'
import { formatINR } from '@/src/lib/currency'

export function Ribbon({ r }: { r: RibbonT }) {
  return (
    <View style={{ flexDirection: 'row', borderRadius: 14, overflow: 'hidden', marginBottom: 8, borderWidth: 1, borderColor: r.border }}>
      <View style={{ width: 4, backgroundColor: r.stripe }} />
      <LinearGradient
        colors={[r.bg, r.bgEnd]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{ flex: 1, padding: 14, flexDirection: 'row', alignItems: 'center' }}
      >
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#ffffff44', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Text style={{ color: r.icon, fontSize: 16, fontWeight: '700' }}>{r.bank[0]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: r.muted, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '600' }}>
            {r.bank}
          </Text>
          <Text style={{ color: r.muted, fontSize: 12 }}>•••• {r.account}</Text>
        </View>
        <Text style={{ color: r.text, fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
          {formatINR(Number(r.amount.replace(/,/g, '')) || 0)}
        </Text>
      </LinearGradient>
    </View>
  )
}
```

#### Home screen render

`app/(tabs)/index.tsx`:

```tsx
import { ScrollView, View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAppData } from '@/src/data/AppDataProvider'
import { Ribbon } from '@/src/components/Ribbon'
import { Card } from '@/src/components/Card'
import { ScreenBackground } from '@/src/components/ScreenBackground' // gradient + grid
import { formatINR } from '@/src/lib/currency'

export default function Home() {
  const { data } = useAppData()
  const total = data.ribbons.reduce((s, r) => s + (Number(r.amount.replace(/,/g, '')) || 0), 0)

  return (
    <ScreenBackground>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <Text style={{ fontSize: 28, fontWeight: '700', marginBottom: 16 }}>Dashboard</Text>

          {/* Bank ribbons */}
          {[...data.ribbons]
            .sort((a, b) => Number(b.amount.replace(/,/g, '')) - Number(a.amount.replace(/,/g, '')))
            .map((r) => <Ribbon key={r.bank + r.account} r={r} />)}

          {/* Total */}
          <Card>
            <Text style={{ fontSize: 11, letterSpacing: 1, color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>Total</Text>
            <Text style={{ fontSize: 32, fontWeight: '700', marginTop: 4 }}>{formatINR(total)}</Text>
          </Card>

          {/* Credit cards */}
          <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 }}>Credit Cards</Text>
          {data.creditCards.map((c) => (
            <Card key={c.name} style={{ marginBottom: 8 }}>
              <Text style={{ fontWeight: '600' }}>{c.name}</Text>
              <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>{c.note}</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', marginTop: 8 }}>{formatINR(c.amount)}</Text>
            </Card>
          ))}

          {/* People to give money */}
          <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 }}>People to give money</Text>
          <Card>
            {data.peopleToGiveMoney.map((p, i) => (
              <View key={p.name} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: i < data.peopleToGiveMoney.length - 1 ? 1 : 0, borderBottomColor: '#e5e7eb' }}>
                <Text>{p.name}</Text>
                <Text style={{ fontWeight: '600' }}>{formatINR(p.amount)}</Text>
              </View>
            ))}
          </Card>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  )
}
```

**Verify:** Home tab shows all 4 ribbons, a total card, the credit card placeholder, and 3 people. Visually polished with gradients and borders.

**Commit:** `feat(home): ribbons + people + credit cards section`

---

### Phase 3 — Loan tracker with gauge + detail screen

**Components:**

#### `src/components/LoanGauge.tsx`

Half-circle SVG gauge. Track is a gray semicircle; progress arc fills clockwise; needle rotates.

```tsx
import Svg, { Path, Line, Circle, Defs, LinearGradient as Grad, Stop } from 'react-native-svg'

export function LoanGauge({ progress, size = 120 }: { progress: number; size?: number }) {
  const w = size, h = size * 0.62
  const cx = w / 2, cy = h * 0.94, r = w * 0.42
  // Semicircle path: M (cx - r) cy A r r 0 0 1 (cx + r) cy
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`
  const angle = -90 + progress * 180   // -90° = 9 o'clock, +90° = 3 o'clock
  const rad = (angle * Math.PI) / 180
  const nx = cx + Math.cos(rad) * (r * 0.9)
  const ny = cy + Math.sin(rad) * (r * 0.9)

  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Defs>
        <Grad id="loan-grad" x1="0" x2="1">
          <Stop offset="0" stopColor="#06b6d4" />
          <Stop offset="0.5" stopColor="#f59e0b" />
          <Stop offset="1" stopColor="#ef4444" />
        </Grad>
      </Defs>
      <Path d={arc} stroke="#e5e7eb" strokeWidth={10} fill="none" strokeLinecap="round" />
      <Path
        d={arc}
        stroke="url(#loan-grad)"
        strokeWidth={10}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${progress * Math.PI * r}, ${Math.PI * r}`}
      />
      <Line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#0f172a" strokeWidth={3} strokeLinecap="round" />
      <Circle cx={cx} cy={cy} r={5} fill="#0f172a" />
    </Svg>
  )
}
```

#### Home: loan card grid

Below the people section, render a 2-column grid (`flexDirection: 'row', flexWrap: 'wrap'`, each card `width: '48%'`). Each card:
- Gauge centered
- Title (16px bold), lender (12px muted)
- "Amount left" + value
- Support line ("Monthly EMI ₹20,000")
- Pressable wrapping → `router.push('/loan/' + id)`

#### `app/loan/[id].tsx`

Modal-presented stack screen showing big gauge + detail rows + schedule list.

```tsx
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ScrollView, View, Text, Pressable } from 'react-native'
import { useAppData } from '@/src/data/AppDataProvider'
import { LoanGauge } from '@/src/components/LoanGauge'

export default function LoanDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data } = useAppData()
  const loan = data.loanTrackerItems.find((l) => l.id === id)

  if (!loan) return <Text>Not found</Text>

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ padding: 20 }}>
      <Pressable onPress={() => router.back()} style={{ alignSelf: 'flex-end', padding: 8 }}>
        <Text style={{ fontSize: 22 }}>×</Text>
      </Pressable>
      <Text style={{ fontSize: 14, color: '#6b7280' }}>{loan.lender}</Text>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>{loan.title}</Text>
      <Text style={{ fontSize: 13, marginTop: 4, color: '#6b7280' }}>{loan.support}</Text>
      <View style={{ alignItems: 'center', marginVertical: 24 }}>
        <LoanGauge progress={loan.progress} size={200} />
        <Text style={{ fontSize: 28, fontWeight: '700', marginTop: 8 }}>{loan.amountLeft}</Text>
        <Text style={{ color: '#6b7280' }}>{loan.headline}</Text>
      </View>

      {loan.detailRows.map((row) => (
        <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
          <Text style={{ color: '#6b7280' }}>{row.label}</Text>
          <Text style={{ fontWeight: '600' }}>{row.value}</Text>
        </View>
      ))}

      <Text style={{ fontSize: 14, fontWeight: '600', marginTop: 20, marginBottom: 8 }}>Schedule</Text>
      {loan.schedule.map((s, i) => (
        <Text key={i} style={{ paddingVertical: 4, color: '#374151' }}>• {s}</Text>
      ))}
    </ScrollView>
  )
}
```

**Verify:** Home shows two loan cards. Tap one → modal slides up showing details.

**Commit:** `feat(loans): tracker grid + detail modal screen`

---

### Phase 4 — Monthly Spends screen

**Deliverable:** A second tab "Spends" with month selector, totals tape, category breakdown, transaction list, and a form to add/edit/remove a custom spend entry.

Use the same `MonthlySpends` shape from §5.1: `{ [monthKey]: SpendEntry[] }`.

**Section 1 — Month picker bar**
- Horizontally scrollable strip of months (12 around current, FlatList with `horizontal`).
- Selected month is highlighted (filled chip); past unselected (outline); future (disabled, gray).
- Tap → updates `selectedMonth` state.

**Section 2 — Totals tape**
A horizontal stacked bar: red = spent, green = earned. Below: two stat cards, side-by-side, showing absolute values + % of total.

**Section 3 — Category breakdown list**
- For the selected month's entries, group by category (use `entry.details?.transaction?.category` if present, else 'Custom'); sum amount.
- Each row: colored bar (width ∝ % of total), category label, amount.
- Tap row → expand to show sub-categories (use `entry.details?.transaction?.subCategory`).

**Section 4 — Transactions list**
- All entries in the selected month, newest first.
- Each row: name, sub-category chip, amount on right.
- Long-press → action sheet (Edit / Delete).

**Section 5 — Add new spend FAB**
- Floating "+" button bottom-right.
- Tap → bottom sheet with: name (text), amount (number), recurring (switch), category (picker), sub-category (text).
- Save → push to `data.monthlySpends[currentMonthKey]`.

**State management**

```ts
const { data, setData } = useAppData()
const [month, setMonth] = useState(monthKeyFromDate())
const entries = data.monthlySpends[month] ?? []

const addSpend = (entry: SpendEntry) => setData((prev) => ({
  ...prev,
  monthlySpends: { ...prev.monthlySpends, [month]: [...(prev.monthlySpends[month] ?? []), entry] },
}))

const removeSpend = (id: string) => setData((prev) => ({
  ...prev,
  monthlySpends: { ...prev.monthlySpends, [month]: (prev.monthlySpends[month] ?? []).filter((e) => e.id !== id) },
}))
```

**ID generation**: `'spend-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)`.

**Verify:** Add a spend, kill app, reopen — entry persists. Switch months, totals match.

**Commit:** `feat(spends): monthly spends screen with categories and CRUD`

---

### Phase 5 — Physical Health: stat tiles + manual inputs + meal cards (read-only)

**Deliverable:** Health tab shows the day's macro tiles, water/weight inputs, and the day's meal list (cards with item rows). No add/edit yet.

**Layout:**

```
─── Physical Health ──────────────────
  [Cal 0/2200] [P 0/150]
  [C   0/250 ] [F 0/70]

  Water  [ ___ ] / 3000 ml
  Weight [ ___ ] / 70 kg

  ── Meals ──
  ┌──────────────────────────┐
  │ 08:00  Breakfast      ✕  │
  │  • Egg (whole)   350 g   │
  │  • Idli          150 g   │
  │  ...                     │
  │  [+ Add items]           │
  └──────────────────────────┘
  ...
  [+ Add meal]
```

**Date navigation header:** "Today" or formatted date (`formatLongDate`); a "← Prev" + "Next →" pair when on a non-today date.

**Implementation outline:**

```tsx
const { data, setData } = useAppData()
const [editDate, setEditDate] = useState<string | null>(null)
const date = editDate ?? todayIso()
const entry = data.physicalHealth.daily[date] ?? { water: 0, weight: 0, meals: [] }
const foodsById = useMemo(() => Object.fromEntries(data.physicalHealth.foods.map((f) => [f.id, f])), [data.physicalHealth.foods])
const macros = useMemo(() => dayMacros(entry, foodsById), [entry, foodsById])
```

Helpers (define inside the screen):

```ts
const updateEntry = (patch: Partial<DailyEntry>) =>
  setData((prev) => ({
    ...prev,
    physicalHealth: {
      ...prev.physicalHealth,
      daily: { ...prev.physicalHealth.daily, [date]: { ...entry, ...patch } },
    },
  }))

const updateMealField = (mealIdx: number, field: 'time' | 'label', value: string) =>
  updateEntry({ meals: entry.meals.map((m, i) => (i === mealIdx ? { ...m, [field]: value } : m)) })

const updateItemGrams = (mealIdx: number, itemIdx: number, grams: number) =>
  updateEntry({
    meals: entry.meals.map((m, i) =>
      i === mealIdx ? { ...m, items: m.items.map((it, j) => (j === itemIdx ? { ...it, grams } : it)) } : m,
    ),
  })

const removeItem = (mealIdx: number, itemIdx: number) =>
  updateEntry({
    meals: entry.meals.map((m, i) => (i === mealIdx ? { ...m, items: m.items.filter((_, j) => j !== itemIdx) } : m)),
  })

const removeMeal = (mealIdx: number) =>
  updateEntry({ meals: entry.meals.filter((_, i) => i !== mealIdx) })

const addMeal = () => {
  const now = new Date()
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  updateEntry({ meals: [...entry.meals, { time, label: '', items: [] }] })
  return entry.meals.length // index of the newly added meal
}
```

**StatTile component:**

```tsx
export function StatTile({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  return (
    <View style={{
      flex: 1, padding: 14, borderRadius: 14,
      backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#e0d7ff',
      gap: 4,
    }}>
      <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: '#6366f1' }}>{label}</Text>
      <Text style={{ fontSize: 24, fontWeight: '700', color: '#312e81' }}>
        {Math.round(value)}<Text style={{ fontSize: 14, color: '#6b7280', fontWeight: '500' }}> {unit}</Text>
      </Text>
      <Text style={{ fontSize: 12, color: '#6b7280' }}>/ {target}{unit}</Text>
    </View>
  )
}
```

Render four tiles in a 2×2 grid:

```tsx
<View style={{ gap: 8 }}>
  <View style={{ flexDirection: 'row', gap: 8 }}>
    <StatTile label="Calories" value={macros.kcal}    target={data.physicalHealth.targets.calories} unit="kcal" />
    <StatTile label="Protein"  value={macros.protein} target={data.physicalHealth.targets.protein}  unit="g"    />
  </View>
  <View style={{ flexDirection: 'row', gap: 8 }}>
    <StatTile label="Carbs" value={macros.carbs} target={data.physicalHealth.targets.carbs} unit="g" />
    <StatTile label="Fats"  value={macros.fats}  target={data.physicalHealth.targets.fats}  unit="g" />
  </View>
</View>
```

**Manual inputs row** — two `TextInput`s, `keyboardType="numeric"`. On `onEndEditing`, call `updateEntry({ water: Number(e.nativeEvent.text) })`.

**Meal cards** — for each `meal`, render a `<Card>` with:
- Top row: `<TextInput type="text" value={meal.time}>` + label TextInput + delete button (✕).
- For each `item`, a row: food name (look up via `foodsById[item.foodId]?.name ?? item.foodId`), grams TextInput, "g" unit, ✕ button.
- Footer button: `+ Add items to this meal` — calls `setPickerOpenForMeal(mealIdx)` (state is wired in Phase 6).

**Verify:** Health tab shows tiles (all zero). Add a fake meal/item via dev menu (or skip until Phase 6). Time input changes persist after reload.

**Commit:** `feat(health): stat tiles + manual inputs + meal card rendering`

---

### Phase 6 — Food Picker modal

**Deliverable:** Tap "+ Add meal" or "+ Add items to this meal" → bottom-sheet modal with search, food list, in-this-meal cart, and an "Add custom food" form.

#### `src/components/FoodPickerModal.tsx`

Props: `{ visible: boolean; mealIdx: number | null; onClose: () => void; }`

Reads/writes via `useAppData()` directly (so it can mutate the day's meal). Internal state:
- `search: string`
- `customOpen: boolean`
- `customDraft: { name, kcal, protein, carbs, fats }` (all strings, parsed on save)
- `gramsByFood: Record<string, string>` (keep per-food gram inputs as strings; default '100')

UI structure (top to bottom):
1. Drag handle + close button
2. `<TextInput placeholder="Search foods…" value={search} onChangeText={setSearch} />`
3. Filtered list (FlatList): each row has name, macros line ("155 kcal · 13P · 1.1C · 11F / 100g"), grams TextInput (default 100), `[Add]` button.
4. Empty state: "No foods match '{search}'"
5. "In this meal" section showing current meal's items with ✕ buttons.
6. "+ Add custom food" → expands inline form with 5 fields and Save/Cancel.
7. Done button at bottom — closes modal.

**Behavior:**

```ts
const filtered = useMemo(() => {
  const q = search.trim().toLowerCase()
  const all = data.physicalHealth.foods
  return q
    ? all.filter((f) => f.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name))
    : [...all].sort((a, b) => a.name.localeCompare(b.name))
}, [data.physicalHealth.foods, search])

const addToCurrentMeal = (foodId: string, gramsStr: string) => {
  const grams = Number(gramsStr)
  if (!Number.isFinite(grams) || grams <= 0 || mealIdx === null) return
  setData((prev) => {
    const day = prev.physicalHealth.daily[date] ?? { water: 0, weight: 0, meals: [] }
    const nextMeals = day.meals.map((m, i) =>
      i === mealIdx ? { ...m, items: [...m.items, { foodId, grams }] } : m
    )
    return { ...prev, physicalHealth: { ...prev.physicalHealth, daily: { ...prev.physicalHealth.daily, [date]: { ...day, meals: nextMeals } } } }
  })
  setSearch('')
}

const saveCustomFood = () => {
  const name = customDraft.name.trim()
  const kcal    = Number(customDraft.kcal)
  const protein = Number(customDraft.protein)
  const carbs   = Number(customDraft.carbs)
  const fats    = Number(customDraft.fats)
  if (!name || ![kcal, protein, carbs, fats].every((n) => Number.isFinite(n) && n >= 0)) return
  let id = slugify(name)
  if (!id) return
  const ids = new Set(data.physicalHealth.foods.map((f) => f.id))
  let unique = id, n = 2
  while (ids.has(unique)) unique = `${id}-${n++}`
  setData((prev) => ({
    ...prev,
    physicalHealth: { ...prev.physicalHealth, foods: [...prev.physicalHealth.foods, { id: unique, name, kcal, protein, carbs, fats, custom: true }] },
  }))
  addToCurrentMeal(unique, '100')
  resetCustomDraft()
}
```

**Modal presentation:**

```tsx
<Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
  <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      {/* contents */}
    </KeyboardAvoidingView>
  </SafeAreaView>
</Modal>
```

Wire it in the Health screen:

```tsx
const [pickerMeal, setPickerMeal] = useState<number | null>(null)

// On "+ Add meal":
const onAddMeal = () => {
  const newIdx = entry.meals.length
  addMeal()
  setPickerMeal(newIdx)
}

// On "+ Add items to this meal":
const onAddItems = (mealIdx: number) => setPickerMeal(mealIdx)

<FoodPickerModal visible={pickerMeal !== null} mealIdx={pickerMeal} onClose={() => setPickerMeal(null)} />
```

**Copy snippet** (inside picker, only on `food.custom`):

```tsx
import * as Clipboard from 'expo-clipboard'
const copySnippet = async (food: Food) => {
  const snippet = `      { id: '${food.id}', name: '${food.name.replace(/'/g, "\\'")}', kcal: ${food.kcal}, protein: ${food.protein}, carbs: ${food.carbs}, fats: ${food.fats} },`
  await Clipboard.setStringAsync(snippet)
}
```

**Verify:**
- Tap Add meal → picker opens. Type "egg" → "Egg (whole)" appears. Set grams 350, tap Add → item appears in meal. Picker still open with item visible in "In this meal" list.
- Add custom food "Test bar" 400/20/40/15 → appears in food list with custom flag → tap "Copy snippet" → paste into a notes app to confirm.
- Reload app → custom food still present (AsyncStorage).

**Commit:** `feat(health): food picker modal with search, add, custom food form, copy snippet`

---

### Phase 7 — Charts

Six chart cards: Calories, Protein, Carbs, Fats, Water, Weight. Bar charts for the first five; smooth line chart for Weight. Scale toggle: Week / Month / Year.

#### `src/components/BarChart.tsx`

Props: `{ points: { date: string; label: string; value: number; clickDate: string }[]; target: number; maxValue: number; unit: string; onPointPress?: (date: string) => void }`

Rendering:
- `<Svg viewBox="0 0 100 50" width="100%" preserveAspectRatio="none">`
- For each point: `<Rect x={(i / (points.length - 1)) * 95 + 1} y={50 - (value / maxValue) * 46} width={3} height={(value / maxValue) * 46} fill={color} rx={1} />`
- Color: `#22c55e` if `value >= target`, `#9ca3af` if `value === 0`, else `#6366f1`.
- Target line: `<Line x1={0} y1={50 - (target / maxValue) * 46} x2={100} y2={...} stroke="#ef4444" strokeWidth={0.4} strokeDasharray="2,2" />`
- Below SVG: row of `<Pressable>` overlays (one per point) for tap detection. Width = chart_width / points.length.

Below the chart card: `[Wk] [Mo] [Yr]` segmented control to switch scale.

#### `src/components/LineChart.tsx`

For weight only. Points like above, but render a smooth path:

```ts
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1], p1 = points[i]
    const cpx1 = p0.x + (p1.x - p0.x) * 0.5
    const cpx2 = p1.x - (p1.x - p0.x) * 0.5
    d += ` C ${cpx1} ${p0.y} ${cpx2} ${p1.y} ${p1.x} ${p1.y}`
  }
  return d
}
```

Skip points with `value === 0`.

**Wiring in Health screen:**

```tsx
const [scale, setScale] = useState<'week' | 'month' | 'year'>('month')

const charts = useMemo(() => {
  const range = dateRange(scale)
  const lookup = (iso: string) => {
    const e = data.physicalHealth.daily[iso]
    if (!e) return { kcal: 0, protein: 0, carbs: 0, fats: 0, water: 0, weight: 0 }
    const m = dayMacros(e, foodsById)
    return { ...m, water: e.water, weight: e.weight }
  }
  const metrics: { key: 'kcal'|'protein'|'carbs'|'fats'|'water'|'weight'; label: string; unit: string; target: number; style: 'bar'|'line' }[] = [
    { key: 'kcal',    label: 'Calories', unit: 'kcal', target: data.physicalHealth.targets.calories, style: 'bar' },
    { key: 'protein', label: 'Protein',  unit: 'g',    target: data.physicalHealth.targets.protein,  style: 'bar' },
    { key: 'carbs',   label: 'Carbs',    unit: 'g',    target: data.physicalHealth.targets.carbs,    style: 'bar' },
    { key: 'fats',    label: 'Fats',     unit: 'g',    target: data.physicalHealth.targets.fats,     style: 'bar' },
    { key: 'water',   label: 'Water',    unit: 'ml',   target: data.physicalHealth.targets.water,    style: 'bar' },
    { key: 'weight',  label: 'Weight',   unit: 'kg',   target: data.physicalHealth.targets.weight,   style: 'line' },
  ]
  return metrics.map((m) => {
    const points = range.map((iso) => {
      const v = lookup(iso)[m.key]
      return { date: iso, label: new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), value: v, clickDate: iso }
    })
    const maxValue = Math.max(...points.map((p) => p.value), m.target, 1)
    return { ...m, points, maxValue }
  })
}, [data.physicalHealth, scale, foodsById])
```

For year scale, average weekly values: replace `range.map(iso => …)` with the 52-Monday array, and for each Monday sum 7 days' values (skip 0s) and divide by count.

**Tap a chart point** → `setEditDate(point.clickDate)` to load that day in the form. If the user taps a Monday in year scale, jump to that Monday's date.

**Verify:** All six charts render. Add data on multiple days, toggle scale, see bars update. Tap a past day's bar → form switches to that day. "Back to today" link returns to today.

**Commit:** `feat(health): charts for calories/macros/water/weight at week/month/year scales`

---

### Phase 8 — Polish

- **Empty states**: "No meals logged yet — tap '+ Add meal' to start."
- **Skeleton during hydration**: Show a centered spinner while `!hydrated`.
- **Pull-to-refresh** on each tab to force re-load from AsyncStorage (mainly useful for testing).
- **Date header on Health**: "Today" if today, formatted date otherwise + "Back to today" link.
- **Confirm dialogs**: Long-press a meal → "Remove this meal?" `Alert.alert`.
- **Focus management**: Auto-focus the search field when the picker opens (use `inputRef.current?.focus()` in `useEffect` on `visible`).
- **Numeric input UX**: Use `keyboardType="numeric"` everywhere; `selectTextOnFocus` for grams fields so users can quickly retype.
- **Accessibility**: `accessibilityLabel` on all icon-only buttons (✕, +, ←).
- **Status bar**: Light theme, dark text (`<StatusBar style="dark" />`). Already wired in `_layout.tsx`.

**Commit:** `chore: polish + a11y + empty states`

---

### Phase 9 — App icon, splash, and EAS build

- Generate icons with `npx expo install expo-app-loading` and run `npx expo prebuild` (only if you need a bare workflow).
- Use `app.json` `"icon": "./assets/icon.png"` and `"splash"` properties.
- For internal distribution: `eas build --profile preview --platform ios` (requires Apple ID + EAS account) and `--platform android` for an APK.

Beyond scope of this plan but documented for completeness.

**Commit:** `chore: app metadata + build config`

---

## 8. Testing strategy

### 8.1 Unit (Jest)
- All pure functions in `src/lib/` get unit tests. See Phase 1 examples.
- Run: `pnpm jest --watch` while developing.

### 8.2 Component (React Native Testing Library)
- One test per component verifying its render with mocked props.
- Example for `<Ribbon>`:

```tsx
import { render } from '@testing-library/react-native'
import { Ribbon } from '@/src/components/Ribbon'

test('renders bank name and amount', () => {
  const r = { bank: 'Primary', account: '0000', amount: '24752', bg:'#fff', bgEnd:'#fff', text:'#000', muted:'#000', icon:'#000', stripe:'#f00', border:'#ccc' }
  const { getByText } = render(<Ribbon r={r} />)
  expect(getByText('Primary')).toBeTruthy()
  expect(getByText(/24,752/)).toBeTruthy()
})
```

### 8.3 Manual / smoke
After each phase, run on iOS Simulator and Android Emulator. Confirm:
- Tab navigation works.
- Data persists across app restarts.
- No keyboard overlap with inputs.
- Modal animations smooth.

---

## 9. Subtle behaviors to preserve from the web app

These are non-obvious requirements baked into the original logic.

1. **Foods conflict resolution.** When the user adds a custom food whose slug collides with an existing food, append `-2`, `-3`, etc. until unique.
2. **File seed wins for foods.** Hard-coded foods in `SEED.physicalHealth.foods` always overwrite stored foods on the same `id`. This lets you fix a typo in the seed and the user sees it on next launch — but custom user foods (those with `custom: true` and unique IDs) are preserved.
3. **Daily entry migration.** Legacy entries with `meals: [{ time, text }]` (no `items`) get converted to `{ time, label: text, items: [] }` on load. Old `protein/carbs/fats` numeric fields are dropped — they're now derived.
4. **Targets default zero.** If a target field is missing on load, fall back to `0` (don't crash). Helper `mergeWithSeed` already handles this with `{ ...seedTargets, ...storedTargets }`.
5. **Macro derivation is deterministic.** Same items + grams + foodsById → same output. No floating-point drift acceptable beyond IEEE 754 limits.
6. **Day switching does not modify data.** Switching to view a past day is read-only state in the screen (`editDate`); writing to that day's entry uses the same `updateEntry` path.
7. **Custom-food slug must be non-empty.** If `slugify(name) === ''` (e.g., name was all punctuation), refuse to save.
8. **Negative grams are not allowed.** Treat `grams <= 0` as "skip this item" in macro calc; refuse to save in the UI.
9. **Items reference foods by id only.** If a food is removed (manually editing seed or dev tools), historical items show "Unknown (foodId)" and contribute zero macros.
10. **Currency formatting.** Indian locale (en-IN), e.g., 1,20,000 not 120,000. Use `Number.toLocaleString('en-IN')`.

---

## 10. Reference appendix

### 10.1 Final `package.json` (post-phase-1)

```json
{
  "name": "finance-health-mobile",
  "main": "expo-router/entry",
  "version": "0.1.0",
  "scripts": {
    "start": "expo start",
    "ios": "expo start --ios",
    "android": "expo start --android",
    "web": "expo start --web",
    "test": "jest",
    "lint": "expo lint"
  },
  "dependencies": {
    "expo": "~51.0.0",
    "expo-router": "~3.5.0",
    "expo-status-bar": "~1.12.0",
    "expo-linking": "~6.3.0",
    "expo-constants": "~16.0.0",
    "expo-linear-gradient": "~13.0.0",
    "expo-clipboard": "~6.0.0",
    "react": "18.2.0",
    "react-native": "0.74.0",
    "react-native-svg": "15.2.0",
    "react-native-screens": "3.31.0",
    "react-native-safe-area-context": "4.10.0",
    "react-native-gesture-handler": "~2.16.0",
    "react-native-reanimated": "~3.10.0",
    "@react-native-async-storage/async-storage": "1.23.0",
    "@expo/vector-icons": "^14.0.0"
  },
  "devDependencies": {
    "@types/react": "~18.2.0",
    "typescript": "~5.3.0",
    "jest": "^29.0.0",
    "jest-expo": "~51.0.0",
    "@testing-library/react-native": "^12.0.0"
  }
}
```

### 10.2 `tsconfig.json`

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"]
}
```

(Use `@/src/components/...` style imports throughout.)

### 10.3 Web app data file (FYI; the SEED above is what to use)

The web app keeps a private file `src/data.private.js` with the user's actual numbers (`amount: '24752'` etc.) and dated daily entries. The mobile app should ship with the SEED above (which mirrors the public-safe `data.public.js`). Real numbers stay only on the user's web localStorage / mobile AsyncStorage.

### 10.4 Color palette quick-reference

| Token | Hex | Use |
|---|---|---|
| primary | `#4338ca` | Tab active, picker Add button |
| primaryDark | `#1f2937` | Picker "Done" button |
| earned | `#10b981` | Earned bars, hit-target indicator |
| spent | `#f97316` | Spent bars |
| danger | `#ef4444` | Delete buttons, target line on charts |
| surfaceTinted | `#f5f3ff` | Stat tile backgrounds |
| textTintedDark | `#312e81` | Stat tile values |
| textMuted | `#6b7280` | Captions, units |

### 10.5 What to NOT build

- Cloud sync. Local-only is the spec.
- Authentication. Single user device.
- Recipe nesting (a food made of other foods).
- Per-meal targets.
- Photo capture / barcode scan.
- Cross-day analytics beyond the six built-in charts.
- Light/dark theme toggle (light only).

---

## 11. Acceptance checklist (read this when "done")

- [ ] All three tabs render and persist state across reloads.
- [ ] `pnpm test` passes (>= 5 unit tests on physical-health helpers).
- [ ] Add a meal, add 3 items, change grams, remove an item — stat tiles update live.
- [ ] Switch to past day via chart tap — values reflect that day.
- [ ] Add a custom food → search finds it → "Copy snippet" puts text on clipboard.
- [ ] Switch chart scale Week / Month / Year — bars/lines redraw.
- [ ] Bank ribbons sort by amount descending; total card sums correctly.
- [ ] Loan card → modal → see schedule + detail rows.
- [ ] Add a monthly spend → reflected in tape, category breakdown, and transactions list.
- [ ] AsyncStorage cleared → app boots with SEED data only.
- [ ] No crash on iOS Simulator (latest) or Android Emulator (API 34).

---

**End of plan.**
