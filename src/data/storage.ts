import AsyncStorage from '@react-native-async-storage/async-storage';

import { monthKeyFromDate } from '@/src/lib/date';
import { mergeFoods, migrateDailyEntry } from '@/src/lib/physical-health';

import { SEED } from './seed';
import type { AppData, MonthlySpends, SpendEntry } from './types';

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
