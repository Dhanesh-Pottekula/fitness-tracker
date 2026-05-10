# Idempotent Merge Import — Design Spec

**Date:** 2026-05-10
**Supersedes:** the replace-only import behavior described in [docs/superpowers/specs/2026-05-10-data-export-import-design.md](2026-05-10-data-export-import-design.md) §7b.
**Goal:** Replace the destructive "replace all data" import with an idempotent, additive merge that combines a backup with current data without duplicating anything that's already present and without overwriting recent local edits.

---

## 1. Why merge

The replace-only behavior solves the original use case (uninstall → reinstall → import) but creates a footgun for the more common case of "import a backup to fill in gaps in current data." A user who's been using the app and then imports a backup loses every change made since that backup.

Merge fixes this: importing the same backup twice produces the same result; importing a *partial* backup adds only what's missing without touching local edits.

---

## 2. Properties

The merge must satisfy:

| Property | Meaning |
|---|---|
| **Idempotent** | `merge(merge(L, B), B) === merge(L, B)`. Re-importing the same backup is a no-op. |
| **Commutative on identity** | Records are matched by stable identity (id, key, or content hash) so order of arrival doesn't change the result. |
| **Additive** | Nothing local is removed. Items missing locally but present in backup are added. |
| **Local-wins on conflict** | When the same record exists on both sides with different content, local wins. Recent local edits are protected. |
| **Field-merging for singletons** | Singleton objects (targets, settings, meta) merge per-field with local-wins on tie, non-empty side wins otherwise. |

---

## 3. Known limitations (called out)

- **Deletions don't propagate.** Without recorded tombstones, the merge can't distinguish "I deleted X" from "X was just added to backup." Anything in backup that's missing locally is added back. **If you delete something, then import a backup that still contains it, it reappears — you'd delete it again.** This is the documented trade-off for not having a tombstones layer.
- **Meals are content-hashed.** A `Meal` has no `id` — identity is `time + label + sorted items`. Editing a meal's grams produces a different hash, so both versions survive a merge. The user has to manually clean up duplicates if they care.
- **Symptoms accumulate via set union.** Same logic as deletions: removing a symptom locally then re-importing brings it back.

---

## 4. Per-field merge strategy

| Path | Strategy | Identity |
|---|---|---|
| `ribbons[]` | Union | `bank + "::" + account` |
| `creditCards[]` | Union | `name` |
| `loanTrackerItems[]` | Union | `id` |
| `peopleToGiveMoney[]` | Union | `name` |
| `financeTransactions[]` (legacy) | Union | content hash (`date + time + category + subCategory + amount + note`) |
| `monthlySpends[month][]` | Union per month | `id` |
| `physicalHealth.targets` | Per-field | local-wins; non-empty side wins |
| `physicalHealth.foods[]` | Union | `id` |
| `physicalHealth.mealTemplates[]` | Union | `id` |
| `physicalHealth.daily[date]` | Recursive merge | date is the key |
| `physicalHealth.daily[date].water` | Take max | — |
| `physicalHealth.daily[date].weight` | Local wins if non-zero | — |
| `physicalHealth.daily[date].meals[]` | Union | `mealHash(time + label + sorted items)` |
| `cycle.daily[date]` | Per-field merge | date is the key |
| `cycle.daily[date].flow` | Local wins if set | — |
| `cycle.daily[date].mood` | Local wins if set | — |
| `cycle.daily[date].symptoms[]` | Set union | — |
| `cycle.daily[date].note` | Local wins if set | — |
| `cycle.settings` | Per-field local-wins | — |
| `meta.schemaVersion` | Take max | — |
| `meta.lastBackupAt` | Take latest ISO timestamp | — |

For all "Union" rules, **local-wins on identity collision** (the local record's contents are kept).

---

## 5. Idempotency proofs (informal)

- **Map-based union** is idempotent: re-applying the same map writes the same keys with the same values.
- **Set union** for symptoms is idempotent: `S ∪ S = S`.
- **`Math.max(L, I)`** is idempotent: `max(max(L, I), I) = max(L, I)`.
- **Local-wins per field** is idempotent: if local was set after first merge, second merge still sees local wins.
- **`maxIso`** is idempotent: max of two ISO strings is deterministic.

Recursive merges of these primitives are idempotent by induction.

---

## 6. UX changes

### Import confirmation (replaces the §7b two-step flow)

1. **First confirm (Alert):** "Import a backup? It will be merged with your current data. Nothing will be deleted." → Cancel / Continue.
2. **File picker** (unchanged).
3. **Second confirm (Alert) — replaces the "Replace?" prompt with a merge summary:**

```
Merge backup from May 3, 2026

Will add: 12 transactions · 5 cycle days · 30 meals · 2 foods
Already in your data: 3 transactions · 2 cycle days

Continue?
```

→ Cancel / Merge.

4. On Merge → run `mergeWithSeed(mergeAppData(currentData, parsedBackup.data))` and `setData()` it. Toast "Backup merged."

### No other UX changes

- Export remains unchanged.
- The `meta.lastBackupAt` is updated on export (unchanged).
- Stale-backup chip on Home (unchanged).

---

## 7. Implementation footprint

**Create:**
- `src/lib/merge.ts` — pure merge logic. Exports `mergeAppData(local, incoming)` and `summarizeMerge(local, incoming)`.

**Modify:**
- `src/components/features/settings/ImportRow.tsx` — call `mergeAppData` instead of replacing; update summary alert text.

That's it. The merge is fully encapsulated; no other parts of the app change.

---

## 8. Acceptance criteria

- [ ] Importing the same backup twice produces no duplicates anywhere (transactions, foods, meals, cycle days, …).
- [ ] Importing a backup that's a strict subset of current data leaves local data unchanged.
- [ ] Importing a backup with new transactions adds them; local-only transactions stay; conflicts (same id, different content) keep the local version.
- [ ] Importing into an empty app (post-reinstall) restores the full backup.
- [ ] Cycle day with `flow=heavy` locally and `flow=light` in backup → result is `heavy` (local wins).
- [ ] Cycle day with `symptoms=[cramps]` locally and `symptoms=[headache]` in backup → result is `[cramps, headache]` (union).
- [ ] Water for a day: local 1500ml, backup 2000ml → result 2000ml (max).
- [ ] Meal exists locally with same content as in backup → not duplicated.
- [ ] Meal grams changed locally → both versions present after merge (called out in known limitations).
- [ ] Confirmation message accurately previews adds vs. existing.
- [ ] No silent data loss in any merge.

---

## 9. Out of scope (future)

- Tombstones for true deletion propagation.
- Per-record `updatedAt` timestamps for time-based conflict resolution.
- A "diff & decide per record" UI for power users.
- Real cloud sync.
- Selective field merge ("merge only cycle data, leave finance alone").
