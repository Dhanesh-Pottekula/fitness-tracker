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

export function findPeriodContaining(
  periods: PeriodSpan[],
  iso: string,
): PeriodSpan | null {
  for (const period of periods) {
    if (iso >= period.start && iso <= period.end) return period;
  }
  return null;
}

export interface CycleStats {
  avgCycleLength: number | null;
  avgPeriodLength: number | null;
  cyclesLogged: number;
  lastPeriodStart: string | null;
}

export function cycleStats(
  daily: Record<string, CycleDayEntry>,
  settings: CycleSettings,
): CycleStats {
  const periods = extractPeriods(daily);
  const cycles = extractCycles(daily);
  const closed = periods.slice(0, Math.max(0, periods.length - 1));

  const avgCycle = cycles.length >= 2
    ? avgCycleLength(cycles, settings.cycleLengthHint)
    : null;

  const avgPeriod = closed.length > 0
    ? avgPeriodLength(daily, settings.periodLengthHint)
    : null;

  return {
    avgCycleLength: avgCycle,
    avgPeriodLength: avgPeriod,
    cyclesLogged: cycles.length,
    lastPeriodStart: periods.length > 0 ? periods[periods.length - 1].start : null,
  };
}

export function monthPeriodSpans(
  daily: Record<string, CycleDayEntry>,
  monthKey: string,
): PeriodSpan[] {
  const periods = extractPeriods(daily);
  const monthStart = `${monthKey}-01`;
  const [y, m] = monthKey.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const monthEnd = `${monthKey}-${String(lastDay).padStart(2, '0')}`;

  const out: PeriodSpan[] = [];
  for (const period of periods) {
    if (period.end < monthStart) continue;
    if (period.start > monthEnd) break;
    out.push({
      start: period.start < monthStart ? monthStart : period.start,
      end: period.end > monthEnd ? monthEnd : period.end,
    });
  }
  return out;
}

export function applyPeriodRange(
  daily: Record<string, CycleDayEntry>,
  oldRange: { start: string; end: string } | null,
  newRange: { start: string; end: string },
  defaultFlow: FlowLevel = 'medium',
): Record<string, CycleDayEntry> {
  const next: Record<string, CycleDayEntry> = { ...daily };

  if (oldRange) {
    let cursor = oldRange.start;
    while (cursor <= oldRange.end) {
      const inNew = cursor >= newRange.start && cursor <= newRange.end;
      if (!inNew) {
        const existing = next[cursor];
        if (existing) {
          const { flow: _flow, ...rest } = existing;
          if (Object.keys(rest).length > 0) {
            next[cursor] = rest;
          } else {
            delete next[cursor];
          }
        }
      }
      cursor = addDays(cursor, 1);
    }
  }

  let cursor = newRange.start;
  while (cursor <= newRange.end) {
    const existing = next[cursor];
    if (!existing?.flow) {
      next[cursor] = { ...(existing ?? {}), flow: existing?.flow ?? defaultFlow };
    }
    cursor = addDays(cursor, 1);
  }

  return next;
}

export function isValidRange(start: string, end: string): boolean {
  return start <= end;
}

export function rangeLength(start: string, end: string): number {
  return diffDays(start, end) + 1;
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
