# Date Range Presets — Design

**Date:** 2026-07-07
**Roadmap slice:** [idea-date-time-polish](../../../apps/docs/src/app/pages/roadmap/items/idea-date-time-polish.md) → **Range presets** ("Last 7 days", "This quarter", "Year to date"). Multi-date select, time-zone awareness, and inline-calendar mode are explicitly **deferred**.

## Problem

The existing date picker (`packages/core/src/date-picker`, `packages/components/src/date-picker`) is a **single-date** picker. A common analytics/reporting need is to pick a *date range* quickly — "Last 7 days" should be one click, not two calendar selections. The roadmap frames presets as "a slot on the range picker."

There is **no range picker in the repo yet**. Rather than rewrite the date picker into a range picker (a large, separate slice), this delivers the **presets primitive** — the reusable, headless part — as a standalone, keyboard-accessible list that resolves a named preset to a `{ start, end }` range and two-way-binds it. It is designed to drop into a future range picker as a side slot, and already works wired to any range consumer.

## Non-goals

- Building a full range calendar / two-date grid selection.
- Multi-date (non-contiguous) selection, time zones, inline mode. (Separate roadmap slices.)

## Preset model

```ts
interface KjDateRange { start: Date; end: Date }          // both at startOfDay, inclusive

interface KjDateRangePreset {
  id: string;                                              // stable, e.g. 'last-7-days'
  label: string;                                           // human label, e.g. 'Last 7 days'
  getRange: (now: Date) => KjDateRange;                    // pure; `now` injected for testability
}
```

`getRange` takes `now` so tests are deterministic and consumers can freeze "today." All returned dates are normalized to `startOfDay` (day precision, matching the calendar family).

### Default presets — `defaultDateRangePresets()`

| id             | label          | range (relative to `now`)                          |
| -------------- | -------------- | -------------------------------------------------- |
| `today`        | Today          | [today, today]                                     |
| `yesterday`    | Yesterday      | [today−1, today−1]                                 |
| `last-7-days`  | Last 7 days    | [today−6, today]  (7 days inclusive of today)      |
| `last-30-days` | Last 30 days   | [today−29, today]                                  |
| `this-week`    | This week      | [startOfWeek, today] (week start = locale/Sunday)  |
| `this-month`   | This month     | [startOfMonth, today]                              |
| `last-month`   | Last month     | [startOfPrevMonth, endOfPrevMonth]                 |
| `this-quarter` | This quarter   | [startOfQuarter, today]                            |
| `year-to-date` | Year to date   | [Jan 1, today]                                     |
| `last-year`    | Last year      | [Jan 1 prev year, Dec 31 prev year]                |

`defaultDateRangePresets(weekStartsOn?)` accepts an optional week-start (0=Sun…6=Sat) so `this-week` honors locale.

### Custom presets

Consumers pass their own array to fully replace (or spread + extend) the defaults:

```ts
presets = [
  ...defaultDateRangePresets(),
  { id: 'fiscal-q1', label: 'Fiscal Q1', getRange: (now) => ({ start: …, end: … }) },
];
```

## API — core (headless)

`packages/core/src/date-range-presets/`

- **`KjDateRangePresets`** — directive `[kjDateRangePresets]`. The listbox coordinator.
  - Inputs: `kjPresets: KjDateRangePreset[]` (default `defaultDateRangePresets()`), `kjLabel: string` ('Date range presets'), `kjNow: Date | null` (default `new Date()` — injectable clock for tests), `kjDisabled`.
  - Model: `kjValue: KjDateRange | null` (two-way).
  - Host: `role="listbox"`, `aria-orientation="vertical"`, `[attr.aria-label]="kjLabel"`. Composes `KjRovingTabindex` (vertical) host directive for arrow/Home/End navigation.
  - Exposes context (`KJ_DATE_RANGE_PRESETS`): `presets()`, `selectedId()`, `select(preset)`, `isSelected(id)`.
  - `select(preset)` resolves `preset.getRange(now)`, sets `kjValue`, records `selectedId`.
- **`KjDateRangePresetOption`** — directive `button[kjDateRangePresetOption]`. One option.
  - Input `kjPreset: KjDateRangePreset`.
  - Host: `role="option"`, `[attr.aria-selected]`, `(click)` → `ctx.select`. Composes `KjRovingTabindexItem` (managed `tabindex`). Native `<button>` gives free Enter/Space activation.
- **`resolveDateRangePreset(preset, now)`** — pure helper (normalizes to startOfDay).

## API — components (styled)

`packages/components/src/date-range-presets/` → **`KjDateRangePresetsComponent`** (`<kj-date-range-presets>`).

- Renders the preset buttons via `@for` over the headless context, styled as a vertical menu list.
- Two-way `kjValue: KjDateRange | null`; passes through `kjPresets`, `kjLabel`, `kjDisabled`.
- Selected option paints an active state and sets `aria-selected="true"`.
- CSS custom properties for theming (`--kj-date-range-presets-*`), 44px-min touch targets.

## Wiring into a (future) range picker

The presets panel sits beside a range calendar; selecting a preset sets the shared range model, which the calendar reflects. Because the contract is just `[(kjValue)]` of `KjDateRange`, it needs no range picker to be useful today — bind it to any `signal<KjDateRange | null>`.

## Accessibility (WCAG 2.1 AAA)

- **2.1.1 Keyboard** — roving tabindex: one tab stop; Up/Down move between options; Home/End jump; Enter/Space select (native button).
- **4.1.2 Name, Role, Value** — `role="listbox"` + labeled; each option `role="option"` with `aria-selected`.
- **1.3.1 Info & Relationships** — selected state conveyed via `aria-selected`, not color alone.
- **2.5.5 Target Size** — options ≥ 44px tall.
- **1.4.6 Contrast (AAA)** — themed tokens meet 7:1.

## Testing

- Unit (core): each default preset resolves the correct `{start,end}` against a frozen `now`; custom presets resolve; `select` updates `kjValue` + `selectedId`; roving/`aria-selected` wiring.
- E2E (Playwright): open the docs example, click a preset, assert the displayed range updates.
