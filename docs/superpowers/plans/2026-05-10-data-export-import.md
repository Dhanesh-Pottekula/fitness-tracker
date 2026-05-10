# Data Export & Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add manual data export/import to the app so the user can save a JSON backup file (Files / iCloud Drive / Drive / etc.) and restore it later, surviving uninstall and device migration.

**Architecture:** A new stacked Settings screen (`app/settings.tsx`) holds Export and Import actions. Pure logic for serialize/parse/validate lives in `src/lib/backup.ts`. Three new Expo modules (`expo-file-system`, `expo-sharing`, `expo-document-picker`) handle the OS interactions. `AppData` gets a `meta` field tracking schema version + last-backup timestamp. Existing `AppDataProvider`/`storage.ts` stay the source of truth — import just calls `setData(merged)`.

**Tech Stack:** React Native (Expo SDK 54), TypeScript strict, expo-router (file-based), expo-file-system, expo-sharing, expo-document-picker, expo-haptics. **No test framework installed** — verification is `npx tsc --noEmit` + manual simulator pass per task.

**Reference spec:** [docs/superpowers/specs/2026-05-10-data-export-import-design.md](docs/superpowers/specs/2026-05-10-data-export-import-design.md)

---

## File Map

**Create:**
- `app/settings.tsx` — Settings screen (route `/settings`).
- `src/lib/backup.ts` — pure serialize/parse/validate/summary helpers.
- `src/components/features/settings/SettingsCard.tsx` — visual card wrapper.
- `src/components/features/settings/BackupStatusRow.tsx` — last-backup time row.
- `src/components/features/settings/ExportRow.tsx` — export action row + handler.
- `src/components/features/settings/ImportRow.tsx` — import action row + two-step confirm.
- `src/components/features/settings/StaleBackupChip.tsx` — Home nudge.
- `src/components/features/settings/index.ts` — barrel.

**Modify:**
- `package.json` — add three Expo modules.
- `src/data/types.ts` — add `AppMeta` and `meta: AppMeta` to `AppData`.
- `src/data/seed.ts` — add default `meta` to `SEED`.
- `src/data/storage.ts` — `mergeMeta()` helper, called from `mergeWithSeed`.
- `app/(tabs)/index.tsx` — gear icon next to heading; `StaleBackupChip` above the first pulse card.

---

## Task 1: Install Expo modules

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install dependencies**

Run: `npx expo install expo-file-system expo-sharing expo-document-picker`

Expected output: each package installed with the version compatible with Expo SDK 54.

- [ ] **Step 2: Verify package.json**

Run: `grep -E 'expo-file-system|expo-sharing|expo-document-picker' package.json`
Expected: three lines listing the modules with version specifiers.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add expo-file-system, expo-sharing, expo-document-picker for backup feature"
```

---

## Task 2: Add `meta` to types, seed, and storage merge

**Files:**
- Modify: `src/data/types.ts`
- Modify: `src/data/seed.ts`
- Modify: `src/data/storage.ts`

These three files commit together so the repo stays compiling.

- [ ] **Step 1: Add `AppMeta` and extend `AppData` in types.ts**

Open `src/data/types.ts`. After the `CycleData` interface and before the `AppData` interface, add:

```ts
export interface AppMeta {
  schemaVersion: number;
  lastBackupAt: string | null;
}
```

Then extend `AppData`:

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
  meta: AppMeta;
}
```

- [ ] **Step 2: Add `meta` to SEED in seed.ts**

Open `src/data/seed.ts`. After the `cycle` field in `SEED`, add:

```ts
  meta: {
    schemaVersion: 1,
    lastBackupAt: null,
  },
```

The full closing of `SEED` should look like:

```ts
  monthlySpends: {},
  cycle: {
    daily: {},
    settings: { cycleLengthHint: 28, periodLengthHint: 5 },
  },
  meta: {
    schemaVersion: 1,
    lastBackupAt: null,
  },
};
```

- [ ] **Step 3: Add `mergeMeta` and use it in `mergeWithSeed` in storage.ts**

Open `src/data/storage.ts`. Update the type imports:

```ts
import type { AppData, AppMeta, CycleData, MonthlySpends, SpendEntry } from './types';
```

In the `mergeWithSeed` function, change the return statement to include `meta`:

```ts
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
    meta: mergeMeta(stored.meta, seed.meta),
  };
}
```

After `mergeCycle()` definition (and before `mergeMonthlySpends`), add:

```ts
function mergeMeta(stored: AppMeta | undefined, seed: AppMeta): AppMeta {
  return {
    schemaVersion: stored?.schemaVersion ?? seed.schemaVersion,
    lastBackupAt: stored?.lastBackupAt ?? seed.lastBackupAt,
  };
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS — repo compiles with the new field.

- [ ] **Step 5: Commit**

```bash
git add src/data/types.ts src/data/seed.ts src/data/storage.ts
git commit -m "data: add AppMeta with schemaVersion and lastBackupAt"
```

---

## Task 3: Create `src/lib/backup.ts` (pure logic)

**Files:**
- Create: `src/lib/backup.ts`

- [ ] **Step 1: Create the helper module**

Create `src/lib/backup.ts` with:

```ts
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/backup.ts
git commit -m "lib: add backup serialize/parse/validate/summary helpers"
```

---

## Task 4: Create `SettingsCard` component

**Files:**
- Create: `src/components/features/settings/SettingsCard.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/features/settings/SettingsCard.tsx`:

```tsx
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/src/theme';

export function SettingsCard({
  kicker,
  children,
}: {
  kicker?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.wrapper}>
      {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  kicker: {
    ...typography.kicker,
    color: colors.inkMuted,
  },
  card: {
    backgroundColor: colors.paperRaised,
    borderRadius: radius.card,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/features/settings/SettingsCard.tsx
git commit -m "settings: add SettingsCard wrapper component"
```

---

## Task 5: Create `BackupStatusRow` component

**Files:**
- Create: `src/components/features/settings/BackupStatusRow.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/features/settings/BackupStatusRow.tsx`:

```tsx
import { StyleSheet, Text, View } from 'react-native';

import { useAppData } from '@/src/data';
import { colors, spacing, typography } from '@/src/theme';

export function BackupStatusRow() {
  const { data } = useAppData();
  const lastBackupAt = data.meta?.lastBackupAt ?? null;

  const { primary, secondary } = formatStatus(lastBackupAt);

  return (
    <View style={styles.row}>
      <Text style={styles.label}>LAST BACKUP</Text>
      <Text style={styles.primary}>{primary}</Text>
      {secondary ? <Text style={styles.secondary}>{secondary}</Text> : null}
    </View>
  );
}

function formatStatus(iso: string | null): { primary: string; secondary: string } {
  if (!iso) {
    return { primary: 'Never', secondary: 'Tap "Export data" to make your first backup' };
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { primary: 'Unknown', secondary: '' };
  }
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.round(diff / 60_000);
  const hours = Math.round(diff / 3_600_000);
  const days = Math.round(diff / 86_400_000);

  let primary: string;
  if (minutes < 1) primary = 'Just now';
  else if (minutes < 60) primary = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  else if (hours < 24) primary = `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  else if (days < 7) primary = `${days} ${days === 1 ? 'day' : 'days'} ago`;
  else primary = `${days} days ago`;

  const absolute = new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);

  return { primary, secondary: absolute };
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 4,
  },
  label: {
    ...typography.kicker,
    fontSize: 9,
    color: colors.inkMuted,
  },
  primary: {
    ...typography.subhead,
    color: colors.ink,
  },
  secondary: {
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
git add src/components/features/settings/BackupStatusRow.tsx
git commit -m "settings: add BackupStatusRow showing last backup time"
```

---

## Task 6: Create `ExportRow` component

**Files:**
- Create: `src/components/features/settings/ExportRow.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/features/settings/ExportRow.tsx`:

```tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { PressableOpacity } from '@/src/components/ui';
import { useAppData } from '@/src/data';
import { defaultBackupFileName, serializeBackup } from '@/src/lib/backup';
import { colors, radius, spacing, typography } from '@/src/theme';

export function ExportRow() {
  const { data, setData } = useAppData();

  async function handleExport() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);

    try {
      const json = serializeBackup(data);
      const fileName = defaultBackupFileName();
      const uri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(uri, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing not available', `Your backup is saved at:\n${uri}`);
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/json',
        dialogTitle: 'Save backup',
        UTI: 'public.json',
      });

      setData((prev) => ({
        ...prev,
        meta: {
          ...prev.meta,
          lastBackupAt: new Date().toISOString(),
        },
      }));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } catch (error) {
      console.warn('Export failed', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      Alert.alert('Export failed', String(error instanceof Error ? error.message : error));
    }
  }

  return (
    <PressableOpacity onPress={handleExport} style={styles.row}>
      <View style={[styles.icon, { backgroundColor: colors.successTint }]}>
        <Ionicons name="arrow-up-circle-outline" size={22} color={colors.success} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Export data</Text>
        <Text style={styles.subtitle}>
          Save a backup file. Share to Files, iCloud Drive, or any cloud storage.
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
    </PressableOpacity>
  );
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
git add src/components/features/settings/ExportRow.tsx
git commit -m "settings: add ExportRow with share-sheet flow"
```

---

## Task 7: Create `ImportRow` component

**Files:**
- Create: `src/components/features/settings/ImportRow.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/features/settings/ImportRow.tsx`:

```tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { PressableOpacity } from '@/src/components/ui';
import { useAppData } from '@/src/data';
import { parseBackup, summarizeEnvelope } from '@/src/lib/backup';
import type { BackupSummary } from '@/src/lib/backup';
import { colors, radius, spacing, typography } from '@/src/theme';

export function ImportRow() {
  const { setData } = useAppData();

  async function handleImport() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);

    const proceed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Import a backup?',
        'This will replace all current data. You cannot undo this.',
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

    const summary = summarizeEnvelope(result.envelope);
    const summaryLine = formatSummary(summary);

    const confirmReplace = await new Promise<boolean>((resolve) => {
      Alert.alert('Replace current data?', summaryLine, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Replace', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
    if (!confirmReplace) return;

    setData(result.envelope.data);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    Alert.alert('Data imported', 'Your backup has been restored.');
  }

  return (
    <PressableOpacity onPress={handleImport} style={styles.row}>
      <View style={[styles.icon, { backgroundColor: colors.bloomTint }]}>
        <Ionicons name="arrow-down-circle-outline" size={22} color={colors.bloom} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Import data</Text>
        <Text style={styles.subtitle}>Replace current data with a backup file.</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
    </PressableOpacity>
  );
}

function formatSummary(summary: BackupSummary): string {
  const dateLabel = summary.exportedAt
    ? new Intl.DateTimeFormat('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(summary.exportedAt))
    : 'Unknown date';
  const parts = [
    `${summary.cycleDays} cycle ${summary.cycleDays === 1 ? 'day' : 'days'}`,
    `${summary.periods} ${summary.periods === 1 ? 'period' : 'periods'}`,
    `${summary.transactions} ${summary.transactions === 1 ? 'transaction' : 'transactions'}`,
    `${summary.meals} ${summary.meals === 1 ? 'meal' : 'meals'}`,
  ];
  return `Backup from ${dateLabel}\n\n${parts.join(' · ')}`;
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
git commit -m "settings: add ImportRow with two-step replace confirmation"
```

---

## Task 8: Create `StaleBackupChip` component

**Files:**
- Create: `src/components/features/settings/StaleBackupChip.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/features/settings/StaleBackupChip.tsx`:

```tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PressableOpacity } from '@/src/components/ui';
import { useAppData } from '@/src/data';
import { colors, radius, spacing, typography } from '@/src/theme';

const STALE_THRESHOLD_DAYS = 30;

export function StaleBackupChip({ style }: { style?: object }) {
  const router = useRouter();
  const { data } = useAppData();
  const lastBackupAt = data.meta?.lastBackupAt ?? null;

  if (!lastBackupAt) return null;

  const date = new Date(lastBackupAt);
  if (Number.isNaN(date.getTime())) return null;

  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days < STALE_THRESHOLD_DAYS) return null;

  function open() {
    Haptics.selectionAsync().catch(() => undefined);
    router.push('/settings');
  }

  return (
    <PressableOpacity onPress={open} style={[styles.chip, style]}>
      <Ionicons name="time-outline" size={14} color={colors.ochre} />
      <Text style={styles.text} numberOfLines={1}>
        Backup is {days} days old
      </Text>
      <Text style={styles.hint}>· Tap to back up</Text>
      <View style={styles.spacer} />
      <Ionicons name="chevron-forward" size={14} color={colors.inkMuted} />
    </PressableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.card,
    backgroundColor: '#fdf3d6',
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: {
    ...typography.subhead,
    fontSize: 13,
    color: colors.ink,
  },
  hint: {
    ...typography.caption,
    color: colors.inkMuted,
    flexShrink: 1,
  },
  spacer: {
    flex: 1,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/features/settings/StaleBackupChip.tsx
git commit -m "settings: add StaleBackupChip nudge for Home"
```

---

## Task 9: Add settings barrel exports

**Files:**
- Create: `src/components/features/settings/index.ts`

- [ ] **Step 1: Create the barrel**

Create `src/components/features/settings/index.ts`:

```ts
export * from './BackupStatusRow';
export * from './ExportRow';
export * from './ImportRow';
export * from './SettingsCard';
export * from './StaleBackupChip';
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/features/settings/index.ts
git commit -m "settings: add barrel exports"
```

---

## Task 10: Create `app/settings.tsx` route

**Files:**
- Create: `app/settings.tsx`

- [ ] **Step 1: Create the route**

Create `app/settings.tsx`:

```tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableOpacity } from '@/src/components/ui';
import {
  BackupStatusRow,
  ExportRow,
  ImportRow,
  SettingsCard,
} from '@/src/components/features/settings';
import { colors, radius, spacing, typography } from '@/src/theme';

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>SETTINGS</Text>
        <PressableOpacity
          onPress={() => router.back()}
          style={styles.closeBtn}
          hitSlop={8}>
          <Ionicons name="close" size={22} color={colors.ink} />
        </PressableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SettingsCard kicker="Backup">
          <BackupStatusRow />
          <ExportRow />
          <ImportRow />
        </SettingsCard>

        <Text style={styles.footnote}>
          Backups are saved as JSON files. To survive uninstall, save them to iCloud Drive,
          Google Drive, or Files.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
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
  title: {
    ...typography.heading,
    color: colors.ink,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paperRaised,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  footnote: {
    ...typography.caption,
    color: colors.inkMuted,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Manual smoke test**

Run: `npx expo start --ios` (or `--android`).

You can reach `/settings` directly at this stage by typing the URL into the dev menu, or by waiting until Task 11 (which adds the gear icon). For now, verify the route compiles and the bundle still ships.

- [ ] **Step 4: Commit**

```bash
git add app/settings.tsx
git commit -m "settings: add Settings screen route"
```

---

## Task 11: Wire Home — gear icon + stale-backup chip

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Add imports**

Open `app/(tabs)/index.tsx`. After the existing imports of feature components, add:

```ts
import { useRouter } from 'expo-router';

import { StaleBackupChip } from '@/src/components/features/settings';
```

(Place `useRouter` import alongside the existing `expo-router` import that imports `Link`, and `StaleBackupChip` alongside the cycle import.)

- [ ] **Step 2: Use the router**

Inside the `HomeScreen` component, near the top alongside the other hooks (`const { data } = useAppData();`), add:

```ts
const router = useRouter();
```

- [ ] **Step 3: Add the gear icon to the header**

Find the JSX block that currently reads:

```tsx
<Text style={styles.greeting}>{greeting.toUpperCase()}</Text>
<Text style={styles.heading}>{formatDayHeading(today)}</Text>

<CycleStatusStrip style={styles.cycleStrip} />
```

Replace those two `Text` lines with a header row that includes a gear button:

```tsx
<View style={styles.headerRow}>
  <View style={styles.headerCopy}>
    <Text style={styles.greeting}>{greeting.toUpperCase()}</Text>
    <Text style={styles.heading}>{formatDayHeading(today)}</Text>
  </View>
  <PressableOpacity
    onPress={() => {
      Haptics.selectionAsync().catch(() => undefined);
      router.push('/settings');
    }}
    style={styles.settingsBtn}
    hitSlop={8}>
    <Ionicons name="settings-outline" size={20} color={colors.ink} />
  </PressableOpacity>
</View>

<StaleBackupChip style={styles.staleChip} />

<CycleStatusStrip style={styles.cycleStrip} />
```

- [ ] **Step 4: Add styles**

In the `styles` `StyleSheet.create({...})` at the bottom of the file, add the following entries (anywhere among existing keys):

```ts
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerCopy: {
    flex: 1,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paperRaised,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.md,
  },
  staleChip: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
```

The existing `heading` style probably has `marginBottom: spacing.lg` — leave it alone; the headerRow already wraps the heading.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Manual smoke test**

Run: `npx expo start --ios`.

Verify:
- Home loads cleanly.
- A gear icon appears top-right of the heading.
- Tapping it navigates to `/settings`.
- Settings shows: BACKUP kicker, "LAST BACKUP — Never", Export row, Import row.
- Tapping "Export data" opens the share sheet with a .json file.
- Save it to Files → confirm a file `fitness-tracker-backup-YYYY-MM-DD.json` exists.
- Open Settings again — "LAST BACKUP" now shows "Just now".
- Tap "Import data" → first confirm → pick the file you just saved → second confirm with summary → "Data imported."
- Stale chip is NOT visible (backup just made).

- [ ] **Step 7: Commit**

```bash
git add 'app/(tabs)/index.tsx'
git commit -m "home: add settings gear icon and stale-backup chip"
```

---

## Final verification

- [ ] **Run full type-check**

Run: `npx tsc --noEmit`
Expected: PASS, no errors.

- [ ] **Run lint**

Run: `npm run lint`
Expected: PASS, or only pre-existing warnings unrelated to the new files.

- [ ] **Walk the spec's acceptance criteria** (from §11 of the spec):
  1. Tap gear icon on Home → reach Settings. ✓
  2. Settings shows "Last backup" — relative time + absolute date — or "Never". ✓
  3. Export data opens the share sheet with a `fitness-tracker-backup-YYYY-MM-DD.json` file. ✓
  4. After exporting, `meta.lastBackupAt` updates; Settings row reflects "Just now". ✓
  5. Import data prompts twice (intent + summary) before replacing. ✓
  6. After importing, all tabs reflect the imported data. ✓
  7. Importing an invalid / corrupt file shows an error and does NOT change current data. ✓
  8. Backup whose `_schemaVersion` is newer than current shows clear error. ✓
  9. Backwards-compatible read for users without `meta`. ✓
  10. Stale-backup chip on Home appears only when applicable. ✓ (To test: edit `meta.lastBackupAt` in storage to be 31+ days ago, reload — chip should appear.)

---

## Notes for the implementing agent

- **No tests** — the codebase has no test framework. Verification is `npx tsc --noEmit` after each task plus manual simulator pass at the end.
- **Hot reload** — most edits hot-reload via Metro; you do not need a full restart per task.
- **`expo-file-system` API surface** — we use `cacheDirectory`, `writeAsStringAsync`, `readAsStringAsync`, `EncodingType.UTF8`. All are stable in SDK 54.
- **`expo-sharing.shareAsync`** — does not return a meaningful "did the user save it" boolean on iOS. We update `lastBackupAt` whenever the share sheet is opened.
- **`expo-document-picker.getDocumentAsync`** — returns either `{ canceled: true }` or `{ canceled: false, assets: [{ uri, name, mimeType, size }] }`. Always check `canceled` first.
- **Permissions** — none required for these flows on iOS or Android in SDK 54.
- **App version** — `serializeBackup(data, '1.0.0')` is hardcoded for now; later we can wire this to `Constants.expoConfig?.version`.
- **iOS Files / Drive integration** — comes for free via `Sharing.shareAsync`. Don't try to write directly into iCloud Drive container — `Sharing` lets the user pick.
