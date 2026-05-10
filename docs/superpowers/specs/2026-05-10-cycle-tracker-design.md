# Cycle Tracker — Design Spec

**Date:** 2026-05-10
**Scope:** Period tracking + symptoms/mood (categories A + B). Single user, always-on, no profile toggle.
**Lives in:** Health tab + condensed Home strip.

---

## 1. Goals & Non-Goals

### Goals
- Make daily logging take 5–15 seconds, max.
- One-glance daily status: where she is in the cycle, when the next period hits.
- Calendar she can plan around (vacations, events).
- Visual style fully consistent with the existing warm-paper aesthetic (Georgia display, terracotta/sage/ochre palette). The cycle feature should look like it always belonged here, not bolted on.

### Non-goals (deferred)
- Fertility / ovulation / fertile-window highlighting
- Pregnancy mode
- Sex / libido tracking
- BBT (basal body temperature)
- Cervical mucus
- Birth-control reminders
- Cycle-aware calorie/macro adjustments
- Push notifications
- Custom symptoms / multi-user / profiles

---

## 2. UX Principles (frictionless = the whole point)

These are non-negotiable for v1:

1. **One-tap "Period today"**: tapping a single chip on Today's row marks today as a period day with sensible flow default (`medium`). She can refine the flow level after, or never.
2. **Pre-fill from yesterday**: when she opens the log sheet for today and yesterday had flow, today's flow is pre-selected to the same level. She just hits Save (or doesn't — see #4).
3. **No "Save" friction**: log sheet auto-saves on dismiss. There's no required Save tap. (A subtle "Saved" toast on close.)
4. **Optimistic UI**: chip taps update state immediately; no spinners.
5. **Haptics everywhere small interactions happen**: matches the existing app's pattern (selection, light, warning, success). Use the same `expo-haptics` calls already in the codebase.
6. **Empty states are inviting, not blank**: first-time view shows a single sentence "Tap a day to log your period" with one large primary CTA, not a dump of zeros.
7. **No fertility / ovulation language in v1.** Status reads "Day N · X days to next period" — neutral, factual, no medical implication.
8. **Future days are read-only**: tapping them never opens the log sheet. They show a small ghost dot for predicted period.
9. **Accessibility**: every interactive element ≥44pt tap target; chips have descriptive `accessibilityLabel`.

---

## 3. Data Model

Edits to [src/data/types.ts](src/data/types.ts):

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
  flow?: FlowLevel;          // presence of `flow` means this is a period day
  mood?: Mood;
  symptoms?: Symptom[];
  note?: string;
}

export interface CycleSettings {
  cycleLengthHint: number;   // default 28 — used until 2 cycles logged
  periodLengthHint: number;  // default 5
}

export interface CycleData {
  daily: Record<string, CycleDayEntry>;  // ISO yyyy-mm-dd → entry
  settings: CycleSettings;
}

// extend AppData
export interface AppData {
  // ...existing
  cycle: CycleData;
}
```

### Seed defaults (in [src/data/seed.ts](src/data/seed.ts))

```ts
cycle: {
  daily: {},
  settings: { cycleLengthHint: 28, periodLengthHint: 5 },
}
```

### Storage
No changes required. The existing `AppDataProvider` and `storage.ts` already serialize the entire `AppData` blob. Adding a top-level field is transparent — the existing migration-on-load path (if any) needs to merge defaults for `cycle` when older data is loaded; if no migration helper exists, do this defensively in `AppDataProvider` initial-load (`{ ...SEED, ...loaded }` already handles it for top-level keys).

---

## 4. Theme Additions

Edits to [src/theme/colors.ts](src/theme/colors.ts) — add a "bloom" family that fits the warm-paper palette without colliding with `danger` (used by spends) or `clay` (used by calories):

```ts
// Cycle / period tones — dusty rose, distinct from danger
bloom: '#c8526b',          // primary
bloomDeep: '#9d3f56',      // heavy flow / accent
bloomTint: 'rgba(200, 82, 107, 0.10)',  // subtle bg fills

// Flow ramp (light → heavy)
flowSpotting: '#e8b9c4',
flowLight: '#d88498',
flowMedium: '#c8526b',     // === bloom
flowHeavy: '#9d3f56',      // === bloomDeep
```

A helper in `src/lib/cycle.ts` exports `flowColor(level: FlowLevel): string` so component code never hardcodes hex.

---

## 5. New Files & Modules

### Logic (pure, easily testable)

**`src/lib/cycle.ts`** — all derivation logic, no React:
- `extractCycles(daily): { start: string; end: string; length: number }[]` — runs over daily entries, returns sorted list of cycle records (period start = first day of contiguous flow run; cycle = start-to-next-start).
- `avgCycleLength(cycles, fallback): number` — mean of last up to 6 cycles, or `fallback` if <2 cycles.
- `avgPeriodLength(cycles, fallback): number`
- `predictNextPeriods(cycles, settings, count = 2): string[]` — ISO start dates of next N predicted periods.
- `currentCycleDay(today, cycles, settings): { day: number; isPeriod: boolean; flow?: FlowLevel; daysToNext?: number }`
- `flowColor(level): string`
- `flowLabel(level): string` (for "Heavy", "Light", etc.)
- `moodEmoji(mood): string`, `moodLabel(mood): string`
- `symptomLabel(symptom): string`

### Components

**`src/components/features/cycle/`** (new directory, mirroring the `health/` layout):

- `CycleStatusStrip.tsx` — thin one-line status. Used both in Health tab (top) and Home (above first pulse card).
  - Layout: small bloom-tinted dot + bold "Day N" + muted "· X days to next period" (or "· Heavy flow").
  - When during a period: shows a tiny flow indicator dot in flow color.
  - Hidden if no cycle data ever logged AND no period currently running (avoids noise on Day 0).
- `CycleSection.tsx` — the dedicated section in Health tab. Composes:
  - Section kicker: "Cycle"
  - `WeekStrip` (inline)
  - One primary "Log today" button (full-width, paper-recessed, bloom-tinted on press) → opens `CycleLogSheet` for today.
  - Footer link: "View calendar →" → opens `CycleMonthModal`.
- `WeekStrip.tsx` — horizontal `ScrollView`, ~14 day cells (past 7 + today + next 6), auto-scrolls today into view on mount. Each cell:
  - Top: day-of-week letter (M/T/W…)
  - Middle: date number (large)
  - Bottom: dot — empty / solid (flow color) / dashed-outline (predicted)
  - Today: ink-colored bold border
  - Tap (past or today): opens log sheet for that date.
  - Tap (future): no-op (predicted state is communicated by the dashed dot itself).
- `CycleMonthModal.tsx` — full-screen modal:
  - Header: prev/next chevrons, month name (Georgia display), Done button.
  - 7-col grid, Mon-first.
  - Cell: number + dot. Same dot semantics as WeekStrip.
  - Today: bold border + ink number.
  - Tap past/today cell → opens log sheet.
  - Bottom: legend strip explaining the dot semantics ("● Flow · ◌ Predicted · today bold").
- `CycleLogSheet.tsx` — bottom sheet (uses existing `BottomSheet.tsx`). Sections in order:
  - **Header**: date + relative label ("Today" / "Yesterday" / "May 3").
  - **Flow row**: "Period today?" toggle (large, prominent). When on, reveals 4 flow chips: Spotting / Light / Medium / Heavy. Default = `medium` if turning on for the first time. Auto-fills from yesterday's flow when toggling on.
  - **Mood row**: 5 large emoji chips, single-select (toggle).
  - **Symptoms row**: 8 chips, multi-select. Wraps to 2 rows on narrow widths.
  - **Note**: single-line `TextInput`, placeholder "Anything to remember?".
  - **Footer**: muted "Clear day" button (left), no Save button — auto-saves on dismiss.
  - On close: `Haptics.notificationAsync(Success)` + small "Saved" toast (1.2s) at the top.

### Existing files touched

- [src/data/types.ts](src/data/types.ts) — types added.
- [src/data/seed.ts](src/data/seed.ts) — seed `cycle` field.
- [src/data/AppDataProvider.tsx](src/data/AppDataProvider.tsx) — defensive merge on load (if not already handling new fields generically).
- [src/theme/colors.ts](src/theme/colors.ts) — bloom palette.
- [src/components/features/cycle/index.ts](src/components/features/cycle/index.ts) — barrel exports.
- [app/(tabs)/health.tsx](app/(tabs)/health.tsx) — render `CycleStatusStrip` (after date row) + `CycleSection` (between Meals and Trends).
- [app/(tabs)/index.tsx](app/(tabs)/index.tsx) — render `CycleStatusStrip` once at top, above the first pulse card. Hidden when no data + not on period.

---

## 6. Visual System

### Status strip

```
[● Day 14 · 14 days to next period          ]
```

- Background: `paperRaised`, hairline border `rule`, radius `card`.
- Padding: `spacing.sm` vertical / `spacing.md` horizontal.
- Dot: 8pt, color = `bloom` outside period, flow color during period.
- Text: `typography.subhead` for "Day 14", `typography.caption` for the muted suffix.

### Week strip cell

- 44pt wide × 64pt tall, gap 6pt.
- Day-of-week letter: `typography.kicker` (10pt), color `inkMuted`.
- Number: `typography.metricSm` upgraded to 18pt.
- Dot: 8pt centered below number.
- Today: 1.5pt `colors.ink` border around the cell, radius 10.
- Predicted: dashed border on the dot only (use a small `View` with `borderStyle: 'dashed'`).

### Log sheet chips

Reuse the visual language already in the spends `ViewPill` and `viewToggleWrap` patterns:

- Pill: `paperRecessed` background by default; selected = filled with feature accent (`bloom` for flow, `sage` for mood, `slate` for symptoms — keeps each row visually distinct).
- Min height: 44pt. Horizontal padding: 14pt.
- Selected state: animated background fade (200ms) + light haptic.

### Calendar modal

- Header bar: same paper background, ink heading (Georgia, large), chevron buttons matching the date row in [health.tsx](app/(tabs)/health.tsx).
- Grid cells: 44pt × 56pt minimum (tap target).
- Past period days: solid bloom-shade dot.
- Predicted: dashed bloom-shade ring.
- Today: 1.5pt ink border on cell.
- Animation: subtle slide on month change.

---

## 7. Predictions Logic (detailed)

In `src/lib/cycle.ts`:

1. **Build cycles**: walk `daily` entries sorted by ISO date. Group consecutive flow-bearing days into "periods". A cycle = `{ start: period1.firstDay, end: period2.firstDay - 1, length: days }`. Skip the in-progress (last) period since it has no closing cycle.
2. **Average cycle length**: take last min(6, cycles.length) cycles. If `cycles.length >= 2`, mean. Else fallback to `settings.cycleLengthHint`.
3. **Predict next period start**: if there's an in-progress or last-known period, base = its first day; predicted next start = base + avgCycleLength. Otherwise no prediction (return null).
4. **Predict 2 cycles forward**: chain — next + avgCycleLength.
5. **Predicted period span**: avgPeriodLength days starting from each predicted start (also dashed-outlined in calendar).
6. **Status text** (`currentCycleDay` consumer):
   - If today is a flow day: `Day {periodDay} of period · {flowLabel}` with bloom dot.
   - Else if predictions available: `Day {cycleDay} · {N} days to next period`.
   - Else (insufficient data, no prediction): `Day {cycleDay} · log a few cycles for predictions`.
   - Edge case: no cycles ever logged → strip is hidden entirely.

---

## 8. Interaction Flows (frictionless paths)

### Flow 1: First-ever period log
1. She opens the Health tab. Cycle section shows empty state: "Tap a day to log your period" + a primary "Period started today" button.
2. She taps "Period started today". Today is now marked with `flow: medium`. Haptic success.
3. The strip animates in: "Day 1 of period · Medium · log a few cycles for predictions".

### Flow 2: Daily log during period
1. Strip shows "Day 3 of period · Medium".
2. She taps the strip OR the "Log today" CTA in the Cycle section.
3. Sheet opens. Flow toggle is on, level is pre-filled from yesterday (Medium). She taps "Heavy" — instantly updates.
4. She taps a mood, two symptoms. Drags down to dismiss. Toast: "Saved". Haptic success.

### Flow 3: Period ends
She doesn't have to "end" anything. She just stops marking days. The cycle helper detects period end automatically (last contiguous flow day).

### Flow 4: Looking up next period
1. From Home, the one-line strip is visible: "Day 19 · 9 days to next period".
2. Or she taps "View calendar →" from the Cycle section in Health, sees May highlighted with a dashed ring on May 28.

### Flow 5: Editing a past day (e.g., forgot to log)
1. She taps "View calendar →".
2. Taps May 3. Sheet opens for May 3. Flow toggle is off; she turns it on, picks "Light", dismisses. Saved. Calendar dot updates.

### Flow 6: Removing an erroneous entry
1. Same as #5, but she taps "Clear day" in the sheet footer.
2. Confirm alert ("Clear all data for May 3?"). Confirm.
3. Entry removed. Predictions re-derive. Haptic warning.

---

## 9. Edge Cases

- **Single-day period**: handled — a contiguous run of length 1 still counts as a period.
- **Two periods with a gap of <14 days**: still treated as separate cycles (cycle length will be unusual but accurate). No special handling.
- **Spotting only, never any other flow**: counts as period days for cycle detection. Acceptable.
- **Future-dated entries via clock change / device-time travel**: the helper ignores any flow days dated > today.
- **Editing a day across the period boundary**: re-derives cycles on every state change (cheap — `daily` is small).
- **No data at all**: strip hidden everywhere, Cycle section in Health tab shows the empty state described in Flow 1.
- **Hint-only predictions**: when `cycles.length < 2` but at least one period exists, show the prediction using `settings.cycleLengthHint` and a softer hint text "Estimate — log more cycles for accuracy".

---

## 10. Out of Scope (explicit, for future work)

- Fertility / ovulation language and fertile-window UI
- Pregnancy week tracker
- Cycle-aware adjustments to nutrition targets
- Reminders / notifications
- Custom symptom adding
- Multi-user / profile switching
- Trends/insights tab for cycle (could come later — would mirror the existing `MetricBarChart` pattern)
- Cycle data export

---

## 11. Acceptance Criteria

- [ ] Health tab renders `CycleStatusStrip` and `CycleSection` without breaking the existing layout.
- [ ] Home tab renders the strip when cycle data exists; hidden otherwise.
- [ ] Logging a period day updates the week strip and status strip immediately.
- [ ] Predictions appear after 2 complete cycles are logged; before that, hint-based predictions appear when at least 1 period exists.
- [ ] Month calendar opens, navigates months, allows tapping past/today cells.
- [ ] Future cells in the week strip and calendar are read-only.
- [ ] All taps have appropriate haptics.
- [ ] Auto-save on sheet dismiss works (no Save button required).
- [ ] Tap targets ≥44pt; accessibility labels present on chips.
- [ ] Visual style matches existing app (paper bg, Georgia headings, kicker labels, paperRecessed pills).
- [ ] App still loads cleanly for users with no `cycle` field in stored data (backwards-compatible read).

---

## 12. Open Questions (none blocking)

None — all scoping decisions resolved during brainstorming. Implementation can proceed.
