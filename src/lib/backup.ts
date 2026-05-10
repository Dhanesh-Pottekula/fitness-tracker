import type { AppData } from '@/src/data/types';

export const CURRENT_SCHEMA_VERSION = 1;

export interface BackupEnvelope {
  _schemaVersion: number;
  _exportedAt: string;
  _appVersion: string;
  data: AppData;
}

export interface BackupSummary {
  exportedAt: string;
  cycleDays: number;
  transactions: number;
  meals: number;
  periods: number;
}

export function serializeBackup(data: AppData, appVersion = '1.0.0'): string {
  const envelope: BackupEnvelope = {
    _schemaVersion: CURRENT_SCHEMA_VERSION,
    _exportedAt: new Date().toISOString(),
    _appVersion: appVersion,
    data,
  };
  return JSON.stringify(envelope, null, 2);
}

export type ParseResult =
  | { ok: true; envelope: BackupEnvelope }
  | { ok: false; error: string };

export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file isn't valid JSON." };
  }

  if (!isPlainObject(raw)) {
    return { ok: false, error: "This file doesn't look like a backup." };
  }

  const candidate = raw as Partial<BackupEnvelope>;

  if (typeof candidate._schemaVersion !== 'number') {
    return { ok: false, error: 'Backup is missing a schema version.' };
  }

  if (candidate._schemaVersion > CURRENT_SCHEMA_VERSION) {
    return {
      ok: false,
      error: 'This backup was made on a newer version of the app. Please update the app and try again.',
    };
  }

  if (!isPlainObject(candidate.data)) {
    return { ok: false, error: 'Backup file is missing data.' };
  }

  return {
    ok: true,
    envelope: {
      _schemaVersion: candidate._schemaVersion,
      _exportedAt: typeof candidate._exportedAt === 'string' ? candidate._exportedAt : '',
      _appVersion: typeof candidate._appVersion === 'string' ? candidate._appVersion : '',
      data: candidate.data as AppData,
    },
  };
}

export function summarizeData(data: AppData): BackupSummary {
  const cycleDays = Object.keys(data.cycle?.daily ?? {}).length;
  const transactions = Object.values(data.monthlySpends ?? {}).reduce(
    (acc, entries) => acc + entries.length,
    0,
  );
  const meals = Object.values(data.physicalHealth?.daily ?? {}).reduce(
    (acc, day) => acc + (day?.meals?.length ?? 0),
    0,
  );
  const periods = countPeriods(data.cycle?.daily ?? {});
  return {
    exportedAt: '',
    cycleDays,
    transactions,
    meals,
    periods,
  };
}

export function summarizeEnvelope(envelope: BackupEnvelope): BackupSummary {
  return {
    ...summarizeData(envelope.data),
    exportedAt: envelope._exportedAt,
  };
}

export function defaultBackupFileName(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `fitness-tracker-backup-${y}-${m}-${d}.json`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function countPeriods(daily: Record<string, { flow?: unknown }>): number {
  const flowDates = Object.entries(daily)
    .filter(([, entry]) => Boolean(entry?.flow))
    .map(([iso]) => iso)
    .sort();
  if (flowDates.length === 0) return 0;
  let count = 1;
  for (let i = 1; i < flowDates.length; i++) {
    const prev = isoToDate(flowDates[i - 1]);
    const cur = isoToDate(flowDates[i]);
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86_400_000);
    if (diff > 1) count++;
  }
  return count;
}

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
