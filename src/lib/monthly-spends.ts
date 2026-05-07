import type { FinanceTransaction, SpendEntry } from '@/src/data/types';
import { monthKeyFromDate } from './date';

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
