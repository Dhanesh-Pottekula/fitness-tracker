# Data Export & Import — Design Spec

**Date:** 2026-05-10
**Goal:** Allow the user to manually export all app data to a JSON file (sharable to iCloud Drive / Files / Drive / Slack / email / AirDrop) and import that file later, so that data survives uninstall, device replacement, and accidental wipes.
**Out of scope:** Automatic cloud sync, encryption, cross-device push, partial exports.

---

## 1. UX Principles

1. **Single, clear surface** — all backup actions live in one place: a Settings screen reached from a gear icon on Home. No surprise affordances scattered across other screens.
2. **Two-step destructive confirms** — Import REPLACES all current data; never enable replacement on a single tap.
3. **Trust the user's storage choice** — we open the native share sheet; she decides whether the backup goes to iCloud Drive, Files, Drive, AirDrop, email, etc. We don't try to manage backup destinations.
4. **Visible recency** — Settings always shows when the last backup was. Home shows a low-key nudge only when a backup is stale (≥30 days) AND at least one backup has been taken before.
5. **Robustness over richness** — refuse to import anything we can't validate. A clear error is better than corrupted state.

---

## 2. Data Model Changes

Extend `AppData` with a `meta` field to track schema version and last-backup timestamp.

```ts
// src/data/types.ts
export interface AppMeta {
  schemaVersion: number;        // current value: 1
  lastBackupAt: string | null;  // ISO timestamp, null until first export
}

export interface AppData {
  // ...existing fields
  meta: AppMeta;
}
```

`SEED.meta = { schemaVersion: 1, lastBackupAt: null }`.

`storage.ts`'s `mergeWithSeed` gets a small `mergeMeta()` helper so users with pre-existing stored data (no `meta` field) load cleanly.

---

## 3. Export File Format

A small wrapper around the `AppData` payload to make future migrations clean:

```json
{
  "_schemaVersion": 1,
  "_exportedAt": "2026-05-10T14:30:00.000Z",
  "_appVersion": "1.0.0",
  "data": { /* full AppData blob */ }
}
```

**File naming:** `fitness-tracker-backup-YYYY-MM-DD.json`. If multiple backups happen on the same day, the OS appends a counter when the user saves to Files / Drive.

The wrapper means a v2 of the app can detect old exports by `_schemaVersion` and migrate, without us having to guess about raw `AppData` shapes.

---

## 4. Validation Rules (Import)

In order:

1. **JSON parse** — if invalid → error "This file isn't a valid backup."
2. **Wrapper shape** — `_schemaVersion` is a number, `data` is an object. If missing → same error.
3. **Schema version compatibility** — `_schemaVersion === 1` required. If newer → "This backup was made on a newer version of the app — please update first." If older (none yet) → run a future migrator.
4. **Required top-level fields** — `data.physicalHealth`, `data.cycle`, etc. checked via the same defensive merge `mergeWithSeed` already runs. Missing fields are filled from current `SEED`.
5. **Confirm-then-replace** — never replace on a single button tap.

---

## 5. Routing & Surfaces

- New stacked route at `app/settings.tsx`. (Expo Router file-based: no manual registration needed.)
- New gear icon top-right of the Home tab heading row. Tapping `router.push('/settings')`.
- Settings is a full-screen scrollable page (matching existing tab visual language: paper bg, kicker labels, cards with hairline borders).
- Stale-backup nudge chip on Home: shown ONLY when `meta.lastBackupAt != null && days(now - lastBackupAt) >= 30`. Tap → `/settings`.

---

## 6. Settings Screen Layout

```
SETTINGS                                    [×]

Backup
┌──────────────────────────────────────────┐
│ LAST BACKUP                              │
│ 3 days ago · May 7, 2026                 │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ ↑  Export data                           │
│    Save a backup file. Share to Files,   │
│    iCloud Drive, or any cloud storage.   │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ ↓  Import data                           │
│    Replace current data with a backup    │
│    file.                                 │
└──────────────────────────────────────────┘
```

Each row is a tappable card — same visual language as Spends category rows. No heavy chrome.

---

## 7. Interaction Flows

### 7a. Export
1. User taps **Export data**.
2. App serializes `AppData` into the wrapper format.
3. Writes to a temp file via `expo-file-system` (`cacheDirectory + filename`).
4. Calls `expo-sharing.shareAsync(uri)` — native share sheet appears.
5. After dismissal of the share sheet (success or cancel), update `meta.lastBackupAt` (only if she actually shared — but the share-sheet success/cancel detection on iOS is unreliable, so we set it optimistically). Show a small "Saved" toast.

> **Note on `lastBackupAt` semantics:** we set it whenever the share sheet was opened, not whenever the file was actually saved. iOS doesn't reliably tell us which destination the user chose. The trade-off is "occasional false-positive backup-recency" vs. "no backup tracking at all." We pick the former.

### 7b. Import
1. User taps **Import data**.
2. **First confirm (Alert):** "Import a backup? This will replace all current data. You can't undo this."  → Cancel / Continue.
3. On Continue → open `expo-document-picker` filtered to `application/json`.
4. User picks a file. App reads, parses, validates.
5. **Second confirm (Alert):** show summary: "Backup from May 3, 2026 · {N} cycle days · {M} transactions · {K} meals · Replace?" → Cancel / Replace.
6. On Replace → run `mergeWithSeed(parsed.data)` to fold in current schema defaults, `setData(merged)`, success haptic, toast "Data imported."

### 7c. First-time export (onboarding nudge)
- No nudge required for first-time users — they discover backup via the gear icon when they decide they want to.

### 7d. Stale-backup nudge on Home
- Visible only when `lastBackupAt != null && daysSince >= 30`.
- One-line yellow-tinted chip above the Health pulse card: `⏰ Backup is 45 days old · Tap to back up`.
- Tap → `/settings`.

---

## 8. Components

### Create
- `app/settings.tsx` — the route, holds page chrome (header, close button, scroll).
- `src/lib/backup.ts` — pure logic: `serializeBackup(data)`, `parseBackup(jsonText)`, `defaultBackupFileName(date)`, `summarizeData(data)`.
- `src/components/features/settings/SettingsCard.tsx` — generic visual card wrapper.
- `src/components/features/settings/BackupStatusRow.tsx` — reads `meta.lastBackupAt`, renders relative time and absolute date.
- `src/components/features/settings/ExportRow.tsx` — owns the export flow.
- `src/components/features/settings/ImportRow.tsx` — owns the import flow + confirmations.
- `src/components/features/settings/StaleBackupChip.tsx` — the Home-tab nudge.
- `src/components/features/settings/index.ts` — barrel.

### Modify
- `package.json` — add `expo-file-system`, `expo-sharing`, `expo-document-picker` (via `npx expo install`).
- `src/data/types.ts` — add `AppMeta` and `meta: AppMeta` field on `AppData`.
- `src/data/seed.ts` — add `meta` to `SEED`.
- `src/data/storage.ts` — extend `mergeWithSeed` with a `mergeMeta()` helper.
- `app/(tabs)/index.tsx` — gear icon next to greeting heading; `StaleBackupChip` rendered conditionally.

---

## 9. Visual System

- Settings page uses the existing palette (`paper`, `paperRaised`, `clay` for action accents, `inkMuted` for secondary text).
- Cards: `paperRaised` bg, hairline `rule` border, radius `card`, padding `md`.
- Action rows: icon (Ionicons) on left, title + subtitle stacked on right. Tap target ≥ 56pt.
- Toasts use the existing `Alert` for now (consistent with `clearDay` confirmation pattern in CycleLogSheet).
- Stale-backup chip: `bg #fdf3d6`, ink text, small clock icon, hairline border. Subtle, not screaming.

---

## 10. Edge Cases

- **First app launch (no backup ever):** Settings shows `LAST BACKUP — Never`. No stale chip on Home.
- **Backup file from a newer schema:** import rejected with clear message.
- **Backup file truncated / partially corrupt JSON:** `JSON.parse` throws → caught → error toast.
- **User taps Cancel in share sheet:** we still update `lastBackupAt` (see §7a trade-off note). Acceptable.
- **User imports backup, then edits data, then imports again:** Replace is replace — current edits gone. Two-step confirm makes this hard to do accidentally.
- **iOS: scoped storage / file URLs:** `expo-file-system.cacheDirectory` is the right scope; `expo-sharing` handles native URI shape.
- **Android: file mime-type quirks:** filter document picker to `application/json`; some pickers may show all files anyway. Acceptable.

---

## 11. Acceptance Criteria

- [ ] User can tap a gear icon on Home and reach Settings.
- [ ] Settings shows "Last backup" — relative time + absolute date — or "Never."
- [ ] **Export data** opens the native share sheet with a `fitness-tracker-backup-YYYY-MM-DD.json` file.
- [ ] After exporting, `meta.lastBackupAt` updates; the Settings row reflects "Just now."
- [ ] **Import data** prompts twice (intent + summary) before replacing.
- [ ] After importing, all tabs reflect the imported data (cycle days, finance transactions, meals).
- [ ] Importing an invalid / corrupt file shows an error and does NOT change current data.
- [ ] Importing a backup whose `_schemaVersion` is newer than current shows a clear error.
- [ ] Backwards-compatible read: users with old stored data (no `meta`) load cleanly with default `meta`.
- [ ] Stale-backup chip on Home appears only when applicable, taps through to Settings.

---

## 12. Open Questions

None blocking. Decisions made:
- Replace-only (no merge) on import — too dangerous to merge user data automatically.
- `lastBackupAt` set when share sheet is opened (not on actual save) — pragmatic given iOS API.
- Settings is a stacked route, not a tab — three tabs is enough; Settings is a power-user surface.
- Schema versioning baked into the wrapper from v1 — cheap insurance against future format changes.
