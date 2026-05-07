# UI Architecture — Finance & Health

> Editorial Wellness Journal direction · cream paper, serif display, tabular mono numerals, one clay accent, generous whitespace, quiet motion. Optimised for very-low-friction daily logging.

This document defines the visual system, layout primitives, component inventory, screen architecture, and build order. It is the single source of truth for UI decisions. Where it differs from the spec in `fitness tracker.md`, this doc wins on visuals; the spec wins on data shapes and logic.

---

## 0. Existing scaffolding

The current `src/` (Redux store, auth/user/workout slices, API client, services) was generated from a generic fitness template and **does not match the spec** — the app is local-only (no auth, no API, Context-based state, finance + intake not workouts). The data layer must be rebuilt per spec §5 before UI work begins. The UI design below is independent of which state library wins, but assumes Context per spec.

---

## 1. Design system

### 1.1 Color tokens — `src/theme/colors.ts`

| Token | Hex | Purpose |
|---|---|---|
| `paper` | `#faf6ef` | App background — warm cream |
| `paperRaised` | `#fdfaf3` | Card surfaces (one step lighter than paper) |
| `paperRecessed` | `#f1ebde` | Sheet bg, search field bg |
| `ink` | `#1d1d1f` | Headlines, primary text |
| `inkSoft` | `#3a3835` | Body text |
| `inkMuted` | `#7a766f` | Captions, units, metadata |
| `rule` | `#e6dfcf` | Hairline dividers |
| `clay` | `#b6432a` | Single accent — selected, FAB, deltas, log actions |
| `clayDeep` | `#7e2c1a` | Pressed clay state |
| `sage` | `#6e7a5a` | Earned / positive metric |
| `ochre` | `#c08a2e` | Carbs / mid-progress / warning |
| `slate` | `#3e4a5a` | Spent / weight / negative metric |
| `target` | `#a99070` | Target lines on charts (gold-khaki dashed) |

**Disciplined chart cycle:** `[clay, sage, ochre, slate, #8a7a9c]`. Used for all categorical fills (categories, pie, multi-series). Replaces the rainbow `chartEarned`/`chartSpent`/`chartPie` arrays from spec §4.1.

### 1.2 Typography — `src/theme/typography.ts`

Three Google fonts via `expo-font`:

| Role | Font | Where |
|---|---|---|
| Display | **Fraunces** (variable; opt 9 → headlines, opt 144 → hero numerals) | Section titles, hero numbers |
| Body | **Inter Tight** | Labels, button text, sentences |
| Numeric | **JetBrains Mono** (tabular) | Amounts, grams, dates, times, transactions |

Hero numerals use Fraunces `opt-144 / soft 100 / wonk 1` for that pull-quote weight. Body and units stay sober.

```
kicker      11 / 1.4 / Inter Tight 600 / +1.2 letter-spacing / UPPERCASE / inkMuted
sectionHead 14 / 1.2 / Fraunces 600 opt-9 / ink (smcp via OpenType)
hero        56 / 1.0 / Fraunces 400 opt-144 / ink
heading     22 / 1.2 / Fraunces 500 opt-12 / ink
subhead     16 / 1.3 / Inter Tight 600 / ink
body        15 / 1.4 / Inter Tight 400 / inkSoft
caption     12 / 1.3 / Inter Tight 400 / inkMuted
metric      28 / 1.0 / JetBrains Mono 500 / ink
metricSm    14 / 1.0 / JetBrains Mono 400 / inkSoft
```

### 1.3 Spacing & shape

- **Spacing scale:** `4 · 8 · 12 · 16 · 24 · 40 · 64`. The 40/64 are load-bearing — they create the "page margin" feel.
- **Radius:** cards `12`, sheets `20`, pills `999`. No 18.
- **Border:** 0.5px `rule` for dividers; 1px `clay` for active/selected only.
- **Shadows:** none. Depth comes from `paperRaised` on `paper`, never from drop shadow.

### 1.4 Motion

Quiet by mandate.

| Surface | Treatment |
|---|---|
| Sheet | Reanimated spring `damping 22, stiffness 240`, 320ms slide-from-bottom |
| Tab change | 120ms opacity cross-fade |
| Hero numbers | 600ms easeOut count-up via `useDerivedValue` (only on net worth, total kcal) |
| Press state | opacity → 0.65 in 80ms (no scale) |
| Haptics | FAB tap + long-press destructive only |
| Disallowed | Scroll parallax · list stagger · loading skeletons · per-tap haptic |

---

## 2. Layout primitives

### 2.1 Page container

```
SafeAreaView (paper bg)
└─ ScrollView, contentInset top 24, h-padding 24
   ├─ Page kicker      ("FINANCE / HEALTH")
   ├─ Page heading     (Fraunces — date / context)
   ├─ Hero block       (asymmetric, may break left margin)
   └─ Sections         (each: Kicker + content + 64px bottom)
```

### 2.2 Card

```
View (paperRaised, radius 12, padding 20, no shadow)
├─ Optional kicker row  (Inter caps left, value right)
├─ Content
└─ Optional rule + footer action
```

That's it. No gradient cards anywhere. The spec's gradient `Card` becomes a flat `paperRaised` view.

### 2.3 Section pattern

```
─── KICKER ───
content
content
                                 (64px gap)
─── KICKER ───
…
```

Kickers always paired with a `RuleDivider` to their left+right or beneath. Never floating section headers without rules.

---

## 3. Component inventory

### 3.1 New / renamed

| Name | Replaces | Description |
|---|---|---|
| `Hero` | (new) | Fraunces opt-144 numeric + delta line; sits at the top of each tab |
| `Kicker` | `SectionHeader` | 11px Inter caps + letter-spacing + rule beneath |
| `RuleDivider` | (new) | 0.5px `rule` colored, full-bleed within container |
| `Fab` | (new) | 56px clay circle, ink plus icon, 24px from bottom-right, safe-area-aware |
| `AccountRow` | `Ribbon` | Rule-separated row; bank name + masked account left, mono amount right; optional 4×4 stripe-color dot |
| `ProgressRule` | `LoanGauge` | 4px-tall hairline track + clay-filled progress + tick marker at target |
| `MetricTile` | `StatTile` | paperRaised cell, kicker + mono metric + tiny progress rule at bottom |
| `Donut` | `PieSlice` | Donut variant of pie, 40% inner radius, labels outside ring only |

### 3.2 Reshaped from spec

| Component | Editorial version |
|---|---|
| `Card` | paperRaised, radius 12, no gradient, no shadow |
| `BarChart` | clay bars, target dashed line in `target` color, 11px mono axis |
| `LineChart` | catmull-rom smoothed, 2px clay stroke, markers only at first/last |
| `AreaLineChart` | clay line + 8%-clay area fill (no gradient) |
| `Tape` | `sage` + `slate` stacked horizontal bar, 8px tall, 4px radius |
| `MealCard` | paperRaised; kicker row (time + LABEL + ✕); rule-divided item rows; clay `+ add` footer |
| `FoodPickerModal` | drag-handle sheet, search-first, RECENTS pinned, inline custom-food form |
| `Pressable` | opacity-only feedback wrapper |

### 3.3 Removed

| Component | Reason |
|---|---|
| `MonthPickerSheet` | Replaced by inline horizontal month scroller on Spends tab |

### 3.4 Component ↔ design-system contract

Every UI component imports tokens from `src/theme/{colors,spacing,typography}.ts` and uses **no hardcoded values**. This is the single rule that lets the entire aesthetic shift later by changing tokens.

---

## 4. Screen architecture

### 4.1 Home — `app/(tabs)/index.tsx`

```
┌───────────────────────────────────────┐
│ FINANCE / HEALTH                      │  Kicker
│ Tuesday, May 7                        │  heading
│                                       │
│ ─── NET WORTH ───                     │
│                                       │
│ ₹1,24,752                             │  Hero
│ ▲ +8.4% this month                    │  delta (sage / slate)
│                                       │
│ ─── ACCOUNTS ───                      │
│ HDFC          •••• 0000   ₹24,752     │  AccountRow × 4
│ Salary        •••• 0000        0      │
│ Savings       •••• 0000        0      │
│ Wallet        Cash             0      │
│                                       │
│ ─── LOANS ───                         │
│ ┌───────────────────────────────┐     │  Card per loan
│ │ LOAN A                        │     │  → tap navigates to
│ │ Sample loan                   │     │     loan/[id] modal
│ │ ₹1,20,000 left  ProgressRule  │     │
│ │ 6 / 12 months · EMI ₹20,000   │     │
│ └───────────────────────────────┘     │
│                                       │
│ ─── CARDS & OWED ───                  │
│ Credit Card                  ₹0       │  AccountRow style
│ Person A                     ₹0       │
│ Person B                     ₹0       │
└───────────────────────────────────────┘
```

**Architectural calls**

- Spec's "total ribbon" → the `Hero` (no card chrome).
- `Ribbon` colored gradient is killed; the bank's `stripe` color is reduced to a single 4×4 dot before the bank name. (Spec data shape preserved; render is editorial.)
- Loan card uses `ProgressRule`, not the half-circle `LoanGauge`.
- Tap loan card → `app/loan/[id].tsx` modal.

### 4.2 Spends — `app/(tabs)/spends.tsx`

```
┌───────────────────────────────────────┐
│ MONTHLY SPENDS                        │
│ May 2026                              │
│                                       │
│ ◀  Apr   May   Jun   Jul   Aug   ▶    │  typographic month
│       ·    ●    ·    ·    ·             scroller; clay underline
│                                          on selected, no pill bg
│ ─── THIS MONTH ───                    │
│ Earned ₹62,000        Spent ₹38,400   │
│ Tape (sage / slate, 8px tall)         │
│  62%                            38%   │
│                                       │
│ ─── BY CATEGORY ───                   │
│ Rent       ▆▆▆▆▆▆▆▆▆▆ ₹15,000         │  category bar = filled
│ Food       ▆▆▆▆▆       ₹8,200         │  rule in cycle color
│ Gym        ▆▆          ₹3,000         │  tap → expands sub-cats
│ Transport  ▆           ₹1,800         │
│                                       │
│ ─── TRANSACTIONS · 14 ───             │
│ May 7 09:14   Rent · PG     −₹15,000  │  long-press → action
│ May 6 18:22   Salary · Mo.  +₹62,000  │     sheet (Edit/Delete)
│ …                                     │
└───────────────────────────────────────┘
                                ⊕  Fab → spend sheet
```

**Architectural calls**

- Month scroller is `FlatList horizontal`, item = typographic label only. Past months full opacity, future 0.4 opacity, current is clay with underline.
- No fixed pills, no rounded selectors anywhere.
- FAB opens a spend-form sheet (different content, shared sheet skeleton with Health).

### 4.3 Health — `app/(tabs)/health.tsx`

```
┌───────────────────────────────────────┐
│ PHYSICAL HEALTH                       │
│ Tuesday, May 7    ◀ today ▶           │  date nav typographic
│                                       │
│ ─── TODAY'S INTAKE ───                │
│ Calories                              │
│ 1,420                                 │  Hero
│ / 2,200 kcal   ProgressRule  64%      │  clay fill, target tick
│                                       │
│ ┌──────────┬──────────┬──────────┐    │  3-up MetricTile row
│ │ Protein  │ Carbs    │ Fats     │    │  (not 2×2)
│ │   72 g   │  185 g   │   45 g   │    │
│ │  / 150   │  / 250   │   / 70   │    │
│ │ ▔▔▁▁▁▁▁▁ │ ▔▔▔▔▔▔▁▁ │ ▔▔▔▔▔▔▁▁ │    │
│ └──────────┴──────────┴──────────┘    │
│                                       │
│ ─── BODY ───                          │
│ Water    [ 1,800 ] / 3,000 ml         │  inline TextInput,
│ Weight   [ 70.4  ] / 70 kg            │  hairline below — no
│                                       │  boxed input border
│ ─── MEALS · 3 ───                     │
│ ┌───────────────────────────────┐     │
│ │ 08:00  BREAKFAST           ✕ │     │  MealCard
│ │ ─────────────────────────────│     │
│ │ Egg (whole)              350g │     │
│ │ Idli                     150g │     │
│ │ + add items                   │     │  clay link, no underline
│ └───────────────────────────────┘     │
│                                       │
│ ─── TRENDS ───                        │
│ [ week ]  month   year                │  scale toggle, clay underline
│ Calories — BarChart                   │
│ Weight   — LineChart                  │
└───────────────────────────────────────┘
                                ⊕  Fab → FoodPickerModal
```

**Architectural calls**

- `MetricTile` is 3-up so calorie hero gets vertical breathing room. Spec's 2×2 is dropped.
- `surfaceTinted` purple bg + indigo text from spec §5 tile is killed — fights the cream paper.
- Water/weight are inline `TextInput`s with hairline beneath. No boxed inputs anywhere in the app.
- Date nav is typographic `◀ today ▶` (taps the label → small inline date picker), not buttons.

### 4.4 Loan detail — `app/loan/[id].tsx` (modal)

```
╭─────────────────────────────────╮
│ LOAN A               CLOSE ✕    │
│ Sample loan                     │
│                                 │
│ ₹1,20,000                       │  Hero
│ remaining of ₹2,40,000          │
│ ProgressRule  6 / 12             │
│                                 │
│ ─── DETAILS ───                 │
│ Original amount       ₹2,40,000 │
│ Monthly EMI             ₹20,000 │
│ Next due           May 18, 2026 │
│                                 │
│ ─── SCHEDULE ───                │
│ Month 1            ✓  ₹20,000   │  past = sage check
│ Month 2            ✓  ₹20,000   │
│ Month 6            ●  ₹20,000   │  current = clay dot
│ Month 7            ◯  ₹20,000   │  future = ring
╰─────────────────────────────────╯
```

---

## 5. Quick-log architecture

Single `BottomSheet` component used by **both** Spends and Health FABs. Different children, identical chrome.

### 5.1 Sheet skeleton

```
╭─────────────────────────────────╮
│              ─────              │  drag handle 36×4 rule color
│                                 │
│ TITLE                  CLOSE ✕  │  kicker title, ink ✕
│                                 │
│ {children}                      │  per-flow form
│                                 │
│ ──────────────────────────────  │
│                       [Done]    │  clay button, ink text
╰─────────────────────────────────╯
```

Drag-to-dismiss via `react-native-gesture-handler` + Reanimated. Tap outside sheet = dismiss. Hardware back on Android = dismiss.

### 5.2 Food picker children

```
SearchBar             paperRecessed, hairline below, no border

RECENT                kicker
foodRow × 8           name · macros · grams (default 100) · Add
                      "recent" = last 8 unique foods used in last 7 days

ALL FOODS             kicker
foodRow × N           same as recent

IN THIS MEAL · n      kicker
itemRow × n           name · grams · ✕

+ add custom food     clay link → expands inline
  ┌──────────────────────────┐
  │ name | kcal | P | C | F  │   horizontal field row, mono inputs
  │  [Cancel]  [Save]        │
  └──────────────────────────┘
```

**Behaviour**

- Default grams `100` in mono input next to per-row Add. One tap = log.
- Search debounced 150ms. Empty query → alphabetical. Query → `startsWith` ranks above `includes`.
- RECENT is always visible (memoised from `data.physicalHealth.daily` over last 7 ISO dates).
- Adding a food does **not** close the sheet — log multiple in one open.
- Done button is a no-op for food rows (they already commit on Add); it only commits a pending custom-food form. Otherwise it's an explicit close.
- Custom-food save: validates `slugify(name) !== ''`, `kcal/P/C/F` finite ≥ 0; appends `-2`, `-3`, … on slug collision per spec §9.

### 5.3 Spend form children

```
NAME       TextInput
AMOUNT     mono numeric
WHEN       ◀ Today ▶ (small inline date picker)
CATEGORY   chip row, scrollable, clay underline on selected
SUB-CAT    TextInput
RECURRING  toggle (typographic ◯/●, no switch chrome)
NOTE       multi-line TextInput
                       [Save]
```

Categories are typographic chips (not dropdown) — visible options = faster pick.

---

## 6. Charts (Phase 7 of build)

Hand-rolled in `react-native-svg` per spec. Editorial overrides:

| Chart | Visual rules |
|---|---|
| BarChart | Solid clay bars; over-target bars use slate (subtle visual rebuke). 0.5px dashed `target` line. 11px mono axis labels. No tick marks; baseline rule only. |
| LineChart | 2px clay stroke, catmull-rom smoothed. Markers only at first + last point. |
| AreaLineChart | Clay line + 8%-clay area fill. No gradient. |
| Donut | 40% inner radius. Labels outside the ring with leader lines (0.5px rule). No inside-slice text. |

Tap-bar = jump to that day (Health screen sets `editDate` to bar's ISO date).

---

## 7. Friction-reduction calls

These deliberately bias toward fewer taps and fewer dialogs:

1. **One global FAB per tab.** Single mental model for "log something."
2. **Default 100g** + per-row Add — typical egg logged in 2 taps.
3. **RECENTS pinned** at top of food picker — repeat foods are 80% of meals.
4. **Inline edit** for water/weight — touch number → keyboard, no modal.
5. **Today is default** everywhere. Date nav requires intent.
6. **Chips not dropdowns** for spend category — visible options = faster pick.
7. **Long-press = destructive.** Edit/Delete via action sheet, never inline buttons cluttering rows.
8. **No confirmation dialogs for delete.** Inline 4-second undo toast at bottom. Reversible > defensive.
9. **Sheet stays open** after Add — log multiple foods/spends in one session.
10. **Hardware back + tap-outside + swipe-down** all dismiss every sheet.

---

## 8. Build order

10 phases, each ends in a runnable, demoable build.

| # | Deliverable | Visual milestone |
|---|---|---|
| 1 | Theme + fonts + page shell. Replace existing src/. Set up Context per spec §5.7. Load Fraunces, Inter Tight, JetBrains Mono. Three tabs render with kicker + heading + cream bg. | Looks like a magazine cover |
| 2 | Home: Hero + AccountRow × N + Loans (cards + ProgressRule) + Cards & Owed. Read-only. | First "this is real" moment |
| 3 | Spends read-only. Month scroller, Tape, category list, transactions list. Seed only. | |
| 4 | Spends FAB + sheet (add/edit/delete + persist). Long-press action sheet. Undo toast. | First write path |
| 5 | Health read-only. Hero kcal + 3-up MetricTile + body inputs (read-only) + meal cards (display only). | |
| 6 | Health write paths. Inline water/weight edit. Meal time/label edit. Add/remove meal. | |
| 7 | FoodPickerModal — search, all foods, RECENTS, per-row add, in-this-meal cart, custom-food inline form. | App usable end-to-end |
| 8 | Charts: BarChart, LineChart, AreaLineChart, Donut. Week/month/year toggle. Tap-bar-to-jump. | |
| 9 | Loan detail modal. | |
| 10 | Polish: hero count-up, sheet spring, empty states ("Log your first meal"), accessibility audit (contrast AA, font scaling, hit-targets ≥ 44pt), haptics on FAB + long-press. | Ship-ready |

Each phase commits cleanly; the app never enters a broken state.

---

## 9. Accessibility & quality gates

Non-negotiable before phase 10 closes:

- **Contrast:** all text on `paper` / `paperRaised` ≥ AA (4.5:1 for body, 3:1 for ≥18pt). `inkMuted` on `paper` measured at ~5.1:1 — passes.
- **Font scaling:** all `Text` allows `allowFontScaling` default; layouts tested at 200%.
- **Hit targets:** every Pressable ≥ 44×44pt, including chart bars (transparent extended hitbox if visual is smaller).
- **Keyboard:** `KeyboardAvoidingView` on every screen with input. Sheet inputs use `keyboardType` (numeric for amounts/grams).
- **Reduced motion:** check `useReducedMotion()` from Reanimated → skip count-up and sheet spring.
- **Tabular numerals:** every number rendered with `fontVariant: ['tabular-nums']` (already in JetBrains Mono, but add fallback for Fraunces hero).

---

## 10. Open questions

Resolve before Phase 1 begins:

1. **Existing `src/` tear-out.** Confirm OK to delete the Redux/auth/api/services scaffolding entirely and rebuild data layer per spec §5.
2. **App icon + splash.** Replace defaults with editorial treatment (single Fraunces glyph on cream).
3. **Seed data.** Spec ships zero amounts. Add a dev-only "seed sample data" button so the design is visible during build, or leave sparse?
4. **Light only?** Spec §10.5 forbids dark mode. Confirm — the editorial direction is built around cream paper and would need separate token set if dark is added later.
