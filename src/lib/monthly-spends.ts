import type { FinanceTransaction, MonthlySpends, SpendEntry } from '@/src/data/types';
import { monthKeyFromDate } from './date';

export const SPEND_CATEGORIES = ['Food', 'Rent', 'Gym', 'Transport', 'Shopping', 'Bills', 'Other'];
export const EARNING_CATEGORIES = ['Salary', 'Freelance', 'Investments', 'Gifts', 'Other'];

export type TxnType = 'earning' | 'spend';

export function entryIsoDate(entry: SpendEntry): string | null {
  const t = entry.details?.transaction;
  if (!t?.date) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t.date)) return t.date;
  const parsed = new Date(t.date);
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

export function entrySignedAmount(entry: SpendEntry): number {
  const txn = entry.details?.transaction;
  if (txn && Number.isFinite(txn.amount)) return txn.amount;
  return -Math.abs(entry.amount);
}

export function isEarning(entry: SpendEntry): boolean {
  return entrySignedAmount(entry) > 0;
}

export function isSpend(entry: SpendEntry): boolean {
  return entrySignedAmount(entry) < 0;
}

function monthKeysBetween(startMonth: string, endMonth: string): string[] {
  const [sy, sm] = startMonth.split('-').map(Number);
  const [ey, em] = endMonth.split('-').map(Number);
  const out: string[] = [];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

export function entriesInRange(monthlySpends: MonthlySpends, startIso: string, endIso: string): SpendEntry[] {
  const months = monthKeysBetween(startIso.slice(0, 7), endIso.slice(0, 7));
  return months.flatMap((mk) => monthlySpends[mk] ?? []).filter((e) => {
    const iso = entryIsoDate(e);
    return iso !== null && iso >= startIso && iso <= endIso;
  });
}

export function dailyTotals(
  entries: SpendEntry[],
  isos: string[],
  type: 'earning' | 'spend' | 'net',
): number[] {
  const map: Record<string, { earn: number; spend: number }> = {};
  for (const entry of entries) {
    const iso = entryIsoDate(entry);
    if (!iso) continue;
    const signed = entrySignedAmount(entry);
    if (!map[iso]) map[iso] = { earn: 0, spend: 0 };
    if (signed > 0) map[iso].earn += signed;
    else map[iso].spend += Math.abs(signed);
  }
  return isos.map((iso) => {
    const v = map[iso] ?? { earn: 0, spend: 0 };
    if (type === 'earning') return v.earn;
    if (type === 'spend') return v.spend;
    return v.earn - v.spend;
  });
}

export interface FriendBalance {
  name: string;
  balance: number;
  count: number;
}

export function getFriendBalances(monthlySpends: MonthlySpends): FriendBalance[] {
  const map = new Map<string, { balance: number; count: number }>();
  for (const entries of Object.values(monthlySpends)) {
    for (const entry of entries) {
      const friend = entry.details?.transaction?.friend?.trim();
      if (!friend) continue;
      const signed = entrySignedAmount(entry);
      const delta = -signed;
      const current = map.get(friend) ?? { balance: 0, count: 0 };
      map.set(friend, {
        balance: current.balance + delta,
        count: current.count + 1,
      });
    }
  }
  return Array.from(map.entries())
    .map(([name, v]) => ({ name, balance: v.balance, count: v.count }))
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance) || a.name.localeCompare(b.name));
}

export function knownFriendNames(monthlySpends: MonthlySpends): string[] {
  const set = new Set<string>();
  for (const entries of Object.values(monthlySpends)) {
    for (const entry of entries) {
      const friend = entry.details?.transaction?.friend?.trim();
      if (friend) set.add(friend);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function findEntryById(monthlySpends: MonthlySpends, id: string): SpendEntry | null {
  for (const entries of Object.values(monthlySpends)) {
    for (const entry of entries) {
      if (entry.id === id) return entry;
    }
  }
  return null;
}

export function removeEntryFromMonthlySpends(
  monthlySpends: MonthlySpends,
  id: string,
): MonthlySpends {
  const out: MonthlySpends = {};
  for (const [mk, entries] of Object.entries(monthlySpends)) {
    out[mk] = entries.filter((e) => e.id !== id);
  }
  return out;
}

export function monthlyTotals(
  monthlySpends: MonthlySpends,
  monthKeys: string[],
  type: 'earning' | 'spend' | 'net',
): number[] {
  return monthKeys.map((mk) => {
    const entries = monthlySpends[mk] ?? [];
    let earn = 0;
    let spend = 0;
    for (const e of entries) {
      const signed = entrySignedAmount(e);
      if (signed > 0) earn += signed;
      else spend += Math.abs(signed);
    }
    if (type === 'earning') return earn;
    if (type === 'spend') return spend;
    return earn - spend;
  });
}

export function normalizeSpendName(value = '') {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export function createSpendId() {
  return `spend-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeSpendEntry(rawEntry: Partial<SpendEntry> = {}): SpendEntry {
  const amount = Number(rawEntry.amount);
  return {
    id: rawEntry.id ?? createSpendId(),
    name: normalizeSpendName(rawEntry.name ?? ''),
    amount: Number.isFinite(amount) ? amount : 0,
    recurring: rawEntry.recurring ?? false,
    managed: rawEntry.managed ?? false,
    details: rawEntry.details ?? null,
  };
}

export function getSpendDisplayAmount(entry: SpendEntry) {
  return entry.details?.transaction ? entry.details.transaction.amount : entry.amount;
}

export function getSpendTotalValue(entry: SpendEntry) {
  if (entry.details?.transaction) return entry.details.transaction.amount < 0 ? entry.amount : 0;
  return entry.amount;
}

export function sortSpendEntries(entries: SpendEntry[] = []) {
  return entries
    .map(normalizeSpendEntry)
    .filter((entry) => entry.name)
    .sort((left, right) => {
      const leftTime = parseTransactionDateTime(left);
      const rightTime = parseTransactionDateTime(right);
      return leftTime - rightTime || Number(right.recurring) - Number(left.recurring) || left.name.localeCompare(right.name);
    });
}

export function getMoneyMovement(entries: SpendEntry[] = []) {
  return entries.reduce(
    (summary, entry) => {
      const amount = getSpendDisplayAmount(entry);
      return amount > 0
        ? { ...summary, came: summary.came + amount }
        : { ...summary, spent: summary.spent + Math.abs(amount) };
    },
    { came: 0, spent: 0 },
  );
}

export function summarizeSpendEntries(entries: SpendEntry[], keyGetter: (entry: SpendEntry) => string) {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    const key = keyGetter(entry) || 'Other';
    totals.set(key, (totals.get(key) ?? 0) + Math.abs(getSpendDisplayAmount(entry)));
  }
  return Array.from(totals.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((left, right) => right.amount - left.amount || left.name.localeCompare(right.name));
}

export function transactionsToSpendEntries(transactions: FinanceTransaction[]): Record<string, SpendEntry[]> {
  return transactions.reduce<Record<string, SpendEntry[]>>((months, transaction, index) => {
    const date = new Date(transaction.date);
    const monthKey = Number.isFinite(date.getTime()) ? monthKeyFromDate(date) : monthKeyFromDate();
    const entry: SpendEntry = {
      id: `seed-finance-${monthKey}-${index}`,
      name: transaction.category,
      amount: Math.abs(transaction.amount),
      recurring: false,
      managed: true,
      details: { date: transaction.date, transaction },
    };
    months[monthKey] = [...(months[monthKey] ?? []), entry];
    return months;
  }, {});
}

function parseTransactionDateTime(entry: SpendEntry) {
  const transaction = entry.details?.transaction;
  if (!transaction?.date || !transaction?.time) return 0;
  const parsedDate = Date.parse(`${transaction.date} ${transaction.time}`);
  return Number.isFinite(parsedDate) ? parsedDate : 0;
}
