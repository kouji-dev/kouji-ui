# Calendar

The **Calendar** is the standalone, inline date-grid surface. It owns date
selection by mouse and keyboard — month/year navigation, day grid layout,
single / range / multi selection modes, min/max bounds, per-date filtering,
locale-aware week-day and month names, and APG-conforming keyboard
interaction. There is **no input field**, **no popup**, **no formatting**;
those concerns belong to [`date-picker.md`](./date-picker.md), which wraps
this Calendar in an overlay anchored to a text input.

Calendar is the foundation a Date Picker, Date Range Picker, and Inline
Date Picker all share. Time selection is a sibling concern owned by
[`time-picker.md`](./time-picker.md); a "Date+Time" picker is a Date
Picker that *composes* a Calendar and a Time Picker side-by-side.

Cross-references:

- [`date-picker.md`](./date-picker.md) — parent component. Wraps
  `KjCalendar` in a `KjPopover`, anchors to a text `KjInput`, and adds
  keyboard parsing of the typed string. Owns format / parse / locale
  string handling. Calendar exposes everything needed (`kjValue`,
  `kjValueChange`, `kjFocusedDate`, `kjFocusedDateChange`,
  `kjMinDate`, `kjMaxDate`, `kjDateFilter`) for the Date Picker to
  drive without re-inventing the grid.
- [`time-picker.md`](./time-picker.md) — sibling. Same date-library
  abstraction (decision in [Open questions](#open-questions--risks)).
  Composed alongside Calendar in a Date+Time Picker.
- [`field.md`](./field.md) — the form-row wrapper. Calendar registers
  with the field via `KjFormControl` so the field's `<label>` carries
  `aria-labelledby` to the calendar (and `for=` is *not* used —
  Calendar is a composite, not a single labelled element). The
  field's describedby chain flows onto the **calendar root**, not
  any individual cell.
- [`input.md`](./input.md) — Calendar reuses none of `KjInput`
  directly (it is not a text control), but shares the `KjFormControl`
  primitive for ControlValueAccessor wiring, `KjFocusRing` for
  keyboard-only focus signalling, and `KjDisabled` for the
  ARIA-disabled stance.

## Source comparison

### daisyUI — CSS recipe over a foreign calendar

[daisyui.com/components/calendar/](https://daisyui.com/components/calendar/)
ships **only CSS classes** (`cally`, `pika-single`, `react-day-picker`),
each targeting a third-party JS calendar (Cally web component,
Pikaday, react-day-picker). There is no daisyUI-owned calendar logic
— the recipe page just shows that you can apply the daisyUI tokens
to one of three external calendars. **Lessons:** none directly, but
it confirms the market expectation that a Calendar is a heavyweight
component most CSS-only libraries delegate. We're not delegating —
we own the headless layer. The only useful takeaway is that the
markup `<calendar-date>` (Cally) uses a `<div role="grid">` with
day buttons inside, which matches the APG pattern we'll adopt.

### shadcn/ui — wraps `react-day-picker`

[ui.shadcn.com/docs/components/calendar](https://ui.shadcn.com/docs/components/calendar)
is a thin styled wrapper over `react-day-picker` v9. The interesting
decisions there are not shadcn's — they're upstream:

- **API surface.** `react-day-picker`'s `<DayPicker>` component takes
  `mode: 'single' | 'multiple' | 'range'`, `selected`, `onSelect`,
  `disabled` (predicate), `fromDate` / `toDate`, `numberOfMonths`,
  `locale`, `weekStartsOn`, `showOutsideDays`, `fixedWeeks`. **Mode
  drives the value type:** `Date` for single, `Date[]` for multiple,
  `{ from: Date; to: Date }` for range. We adopt the same shape
  ([Inputs/Outputs](#inputs--outputs--models--kj-prefixed)) modulo
  the `kj` prefix.
- **A11y.** `react-day-picker` renders `<table role="grid">` with
  `<th scope="col">` weekday headers and `<td><button role="gridcell" aria-selected>`
  cells. Roving tabindex on the cell buttons. APG-compliant. We
  follow exactly.
- **Locale.** Uses `date-fns/locale` packs (`enUS`, `de`, `fr`, …).
  Locale supplies week-day names, month names, and `weekStartsOn`.
  We use `Intl.DateTimeFormat` instead of date-fns — see the
  [date-library decision](#decision-date-library--abstraction).
- **Outside days, fixed weeks.** Days from previous/next month
  shown muted at the start/end of the grid; `fixedWeeks` always
  renders 6 rows so the calendar height doesn't jump month-to-month.
  Both adopted (the second as opt-in `kjFixedWeeks`).
- **Multiple months.** `numberOfMonths` renders 1, 2, or more
  months side-by-side. Useful for range selection. Adopted as
  `kjNumberOfMonths`.
- **Caption layout / dropdowns.** Month/year navigation is two
  arrow buttons + a textual caption by default; an alternate
  `captionLayout="dropdown"` swaps the caption for `<select>`
  controls. We split this into **sub-views** —
  [Composition: month-picker, year-picker](#composition-model) —
  because dropdowns inside the caption are awkward for keyboard
  users and inconsistent with APG.

### Angular Material — `<mat-calendar>` (the closest reference)

[material.angular.dev/components/datepicker](https://material.angular.dev/components/datepicker)
exposes the calendar standalone as `<mat-calendar>`, separate from
`<mat-datepicker>` (the popup wrapper). This is the design we mirror
most closely — it's the only mainstream Angular implementation, the
APG pattern is tightly followed, and the date-abstraction layer is
exemplary.

- **Three sub-views.** `MatCalendar` switches between
  `month` (the day grid), `multi-year` (a 24-cell grid of years),
  and `year` (a 12-cell grid of months). The sub-view is held in
  internal state and toggled by clicking the caption "April 2025"
  → year view → multi-year view. We adopt the same three views,
  exposed as `kjView: 'month' | 'year' | 'multi-year'` two-way bound,
  and as composition (`KjCalendarHeader`, `KjCalendarMonthGrid`,
  `KjCalendarYearGrid`, `KjCalendarMultiYearGrid`) so themes can
  reposition them.
- **Date abstraction.** `MatDateAdapter<D>` is an abstract class
  with ~25 methods (`createDate`, `today`, `parse`, `format`,
  `addCalendarDays`, `getYearName`, `getMonthNames`, `getDayOfWeekNames`,
  `getFirstDayOfWeek`, …). Concrete adapters: `NativeDateAdapter`
  (uses `Date` + `Intl.DateTimeFormat`), `MomentDateAdapter`,
  `LuxonDateAdapter`, `DateFnsAdapter`. Date format is provided
  via a separate `MAT_DATE_FORMATS` token. The abstraction lets
  consumers ship the calendar without forcing a date library
  on them. **We adopt the same shape** — `KjDateAdapter<D>` with a
  `KjNativeDateAdapter` default — see
  [the date-library decision](#decision-date-library--abstraction).
- **A11y.** `<mat-calendar>` host has `role="group"` (NOT `role="application"`).
  The day grid is a `<table role="grid">` with `<th role="columnheader">`
  weekday names and `<td role="gridcell">`. The month/year caption is
  a `<button>` (not just text) so screen readers can navigate to it.
  Material does **not** use `role="application"`, and APG is explicit
  that you should not use `role="application"` for a date picker — see
  [the role decision](#decision-role-grid-not-application). We follow
  Material here.
- **Keyboard.** APG-pattern: Arrows (day), PageUp/PageDown (month),
  Shift+PageUp/PageDown (year), Home/End (week start/end), Enter/Space
  (select), Escape (when in a popup — handled by `MatDatepicker`, not
  `MatCalendar`). We follow exactly.
- **Focus management on month change.** When the month changes via
  arrow keys, focus moves to the equivalent date in the new month.
  When the day-of-month doesn't exist (focused day 31 → February),
  focus lands on the last day of the new month. When the focused
  date is filtered out, focus advances to the next selectable date.
  We follow exactly.
- **Live region.** Material announces the new month/year on
  navigation via its own `LiveAnnouncer`. We use `KjLiveRegion`.
- **`startAt` / `startView` / `dateClass`.** `startAt` sets the
  initially-shown date when no value is selected; `startView` picks
  the initial sub-view; `dateClass` is a function returning extra CSS
  classes per date. We adopt all three (`kjStartAt`, `kjStartView`,
  `kjDateClass`).
- **Range selection.** Material 16+ ships `MatDateRangePicker` /
  `MatDateRangeInput` with two text inputs feeding `MatCalendar` in
  `selectionStrategy` mode. The calendar itself is shared between
  single and range — internal `MatRangeDateSelectionModel` swaps
  the strategy. We do the same: one `KjCalendar`, mode-driven
  selection model.
- **What Material misses.** No multi-selection mode (`Date[]`
  rather than a range). No locale week-start override (always
  reads from the adapter). No fixed-weeks option (height jumps).
  We address all three.

### PrimeNG — inline mode of `<p-datepicker>`

[primeng.org/datepicker](https://primeng.org/datepicker) ships a
single `<p-datepicker>` with an `[inline]="true"` flag that hides the
text input and renders the calendar inline. There is **no separate
Calendar component** — the inline mode is the calendar.

- **Selection modes.** `selectionMode="single" | "multiple" | "range"`.
  Same shape as react-day-picker. Range mode highlights the from→to
  span on hover.
- **Multiple months.** `numberOfMonths` (default 1). PrimeNG
  doesn't side-by-side them; they stack horizontally with shared
  caption. We follow.
- **Locale.** A flat `Locale` object with `firstDayOfWeek`,
  `dayNames`, `dayNamesShort`, `dayNamesMin`, `monthNames`,
  `monthNamesShort` provided via the global config. Roughly what
  `Intl.DateTimeFormat` already gives us, except PrimeNG forces
  consumers to manage the strings. We do *not* — we read from
  `Intl` (and let the adapter override, see the date-library
  decision).
- **Time.** PrimeNG's datepicker gains a time-picker section in
  the same overlay when `[showTime]="true"` — a single
  composite component does both. We split: Calendar is dates only,
  Time Picker is times only, the composite "Date+Time Picker" is
  built by composing them. Cleaner separation, smaller surface
  per component.
- **Year/Month dropdowns.** PrimeNG's caption can swap arrows for
  year/month dropdowns (`yearNavigator`, `monthNavigator`). Same
  awkward keyboarding as react-day-picker's `captionLayout="dropdown"`.
  We use the three-sub-view model (Material's) instead.
- **A11y.** PrimeNG's grid uses `role="grid"`, cells use
  `role="gridcell"` with `aria-selected`, dates outside the
  current month carry `data-p-other-month`. APG-compliant. Same
  keyboard contract. We match.
- **What PrimeNG misses.** Range "preview span" announcement —
  hovering the to-date doesn't announce "Range from April 1 to
  April 15" via live region. We add (see
  [a11y for range](#range-mode-a11y)).

**Pattern picked up.** Calendar follows **Material's shape**
(standalone calendar, three sub-views, date-adapter abstraction,
APG keyboard contract, `role="grid"` not `role="application"`),
**react-day-picker's mode/value shape** (`single | multiple | range`
driving the value type), and **PrimeNG's inline-mode features**
(range hover preview, multiple months stacked horizontally). We
**don't** ship Material's text-input + datepicker bundle — that's
[`date-picker.md`](./date-picker.md). We **don't** ship PrimeNG's
"calendar with built-in time" — that's [`time-picker.md`](./time-picker.md)
composed alongside.

## Decision: needs a core directive?

**Yes — five directives + an adapter abstraction.** A Calendar can
not live as "just a styled component" because every contract worth
sharing is logic, not CSS:

1. **Selection model** (single / range / multi) — pure code.
2. **Date arithmetic** (next month, previous year, week-start,
   day-of-week index) — delegated to `KjDateAdapter<D>`, but the
   wiring lives in the calendar.
3. **Keyboard navigation** with focus management on month change
   — pure code.
4. **Roving tabindex** for the day cells — the existing primitive
   needs a 2D variant (see [Composition: roving tabindex](#composition-model)).
5. **`aria-selected` / `aria-disabled` / `aria-current="date"`**
   propagation — pure code.
6. **Live-region announcements** on month/year change — pure code.
7. **`ControlValueAccessor`** plumbing for forms — `KjFormControl`,
   pure code.

None of this is theme-specific. Themes paint the cells, the row
borders, the today-marker, the selected/range backgrounds; the
directives give them the `data-*` attributes to paint *against*.

The five directives:

```text
KjCalendar             ← root, owns selection model + value + view state + a11y context
KjCalendarHeader       ← month/year caption + nav buttons (prev / next / view-toggle)
KjCalendarGrid         ← <table role="grid"> wrapping the day-row layout
KjCalendarRow          ← <tr role="row"> (per week)
KjCalendarCell         ← <td role="gridcell"> + the inner button
```

Plus the sub-view grids:

```text
KjCalendarYearGrid     ← 12-cell month-picker for a single year
KjCalendarMultiYearGrid ← 24-cell year-picker for a range of years
```

And the abstractions:

```text
KjDateAdapter<D>       ← abstract class; subclassed per date library
KjNativeDateAdapter    ← default, uses Date + Intl.DateTimeFormat
KJ_DATE_ADAPTER        ← injection token, default factory returns KjNativeDateAdapter
KJ_DATE_FORMATS        ← injection token for format strings (parse + display patterns)
```

Material's split of "MatCalendarHeader / MatCalendarBody / MatMonthView /
MatYearView / MatMultiYearView" is what we adopt, just under the
`KjCalendar*` family.

## Decision: `role="grid"`, not `role="application"`

The user prompt asked us to consider `role="application"`. **APG is
unambiguous**: do not use `role="application"` for a date picker.
Quoting [APG's date picker pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/):

> The grid pattern is preferred over the dialog/application pattern
> for date pickers because grid provides the standard semantics for
> two-dimensional navigation that screen readers and assistive
> technology already understand.

`role="application"` tells screen readers to disable their virtual
cursor and pass keystrokes through. That's the wrong mode for a date
picker — the user *wants* the screen reader to read out cell text on
arrow navigation (the "Tuesday, April 15, 2025" phrase). With
`role="grid"`, the screen reader handles announcement automatically;
with `role="application"`, you have to hand-roll a live region for
every cell move and intercept arrow keys yourself.

**Decision:** the day grid carries `role="grid"` with
`aria-labelledby` pointing to the month/year caption's id. The
calendar root carries `role="group"` (Material's choice) with its
own `aria-label` or `aria-labelledby` (defaulted to "Calendar"
when no `KjField` parent is present). Cells carry
`role="gridcell"`. **No `role="application"` anywhere.**

## Base features

### Selection modes — `kjMode: 'single' | 'range' | 'multi'`

- **`single`** (default). `kjValue: D | null`. Clicking a cell
  selects it; clicking again does nothing (toggling is opt-in via
  `kjAllowDeselect="true"` — Material doesn't, react-day-picker
  does, we default off because the standard is "selected stays
  selected until another date is chosen").
- **`range`**. `kjValue: { from: D | null; to: D | null }`. First
  click sets `from` and clears `to`; second click sets `to` (and
  swaps if before `from`); third click resets to a new `from`.
  Hover between first and second click previews the range
  visually via `data-in-range` on every cell between the focused
  cell and the start. Live region announces "Selecting end of
  range" between clicks.
- **`multi`**. `kjValue: D[]` (array, sorted ascending). Clicking
  toggles a date in/out of the set. No upper bound by default;
  `kjMaxSelections` caps it.

The mode also determines the value type. We use TypeScript
discriminated unions so consumers get type-safe values:

```ts
export type KjCalendarValue<D> =
  | { mode: 'single';  value: D | null }
  | { mode: 'range';   value: { from: D | null; to: D | null } }
  | { mode: 'multi';   value: readonly D[] };
```

The wrapper component flattens this — `kjMode` is a separate input
and `kjValue` is `D | null | { from: D | null; to: D | null } | readonly D[]`
(a union the consumer narrows by the bound mode). The directive's
internal `selectionModel` (a strategy object) does the type
narrowing.

### Min / max / disabled-dates

- **`kjMinDate: D | null`** — earliest selectable date.
  Cells before this carry `aria-disabled="true"` and `data-disabled`,
  and are skipped by the keyboard navigation (arrow keys jump over).
- **`kjMaxDate: D | null`** — latest selectable date. Symmetric.
- **`kjDateFilter: ((date: D) => boolean) | null`** — predicate
  returning `true` for selectable dates. Returning `false` disables
  the cell. Used for "weekdays only", "no holidays", per-tenant
  blocked dates, etc. Runs once per visible cell per render — must
  be cheap (memoize on the consumer side if expensive).

The combined `disabled(d) = !inRange(d, min, max) || (filter && !filter(d))`
is computed per cell. Disabled cells get `aria-disabled`, `data-disabled`,
and `pointer-events: none` (theme CSS owns the visual). Keyboard
navigation **skips** disabled cells (Material's behaviour) — pressing
ArrowRight on April 14 with April 15 disabled lands focus on April 16.
This matches APG's date-picker pattern explicitly.

### View state — `kjView` and `kjStartView`

- **`kjView: 'month' | 'year' | 'multi-year'`** — two-way
  bound. `month` shows the day grid (default). `year` shows the
  12 months of the focused year (`KjCalendarYearGrid`). `multi-year`
  shows a 24-year span (`KjCalendarMultiYearGrid`). Clicking a
  month in `year` view switches to `month`; clicking a year in
  `multi-year` view switches to `year`. The header's caption is
  a button that walks the view chain backward (`month` → `year`
  → `multi-year`).
- **`kjStartView: 'month' | 'year' | 'multi-year'`** — initial
  view (default `'month'`). Useful for "year picker" use-cases.
- **`kjStartAt: D | null`** — initial focused date when no value
  is selected (defaults to `today`).

### Multiple months — `kjNumberOfMonths`

`kjNumberOfMonths: number` (default `1`). Renders that many
month grids inline, navigated together (next/prev moves all
months by one). The header shows the range
"April 2025 – June 2025" when more than one. Layout is
horizontal-scroll on mobile (`overflow-x: auto`) and side-by-side
on desktop — theme CSS owns the layout switch via
`data-number-of-months`.

### Week start, fixed weeks, outside days

- **`kjFirstDayOfWeek`** — `0` (Sunday) through `6` (Saturday).
  Default reads from the date adapter's locale (which reads
  `Intl.Locale.weekInfo.firstDay` in Chromium, or the date
  adapter's hardcoded fallback). Override per-instance.
- **`kjFixedWeeks: boolean`** — when `true`, always render 6
  weeks (filling with outside days from the previous/next
  month). Default `false`. Setting `true` prevents
  layout shift between months that span 4, 5, or 6 weeks.
- **`kjShowOutsideDays: boolean`** — when `true` (default),
  render the leading/trailing outside days as faded cells.
  When `false`, the cells are empty `<td>` (still semantic
  rows of 7).

Outside days are *selectable by default* (clicking them moves
focus to the new month and selects). Set
`kjOutsideDaysClickable="false"` to make them visual-only.
Material allows clicking outside days; PrimeNG doesn't. We
default to clickable.

### Today marker, custom cell classes

- **`aria-current="date"`** + `data-today` on the cell whose
  date equals the adapter's `today()`. Only one cell per render
  carries this.
- **`kjDateClass: ((date: D, view: 'month' | 'year' | 'multi-year') => string | string[]) | null`**
  — function returning per-cell class names. Used for "weekend",
  "holiday", "user's birthday" decorations. Material's
  `dateClass` exactly. The classes are applied to the inner
  cell button, not the `<td>`.

### States

- `kjDisabled` — disables the entire calendar. All cells get
  `aria-disabled`; navigation arrows disabled; selection
  blocked. Composes `KjDisabled` host directive on the root.
- `kjReadonly` — calendar is navigable (focus moves with
  arrows, view changes work) but selection is blocked.
  `data-readonly` on the root.

## Accessibility (WCAG 2.1 AAA)

| Concern | Where | Mechanism |
|---|---|---|
| **Root role** | `KjCalendar` | `role="group"` with `aria-label="Calendar"` (default) or `aria-labelledby="<KjField label id>"` when nested in a field. NEVER `role="application"`. |
| **Day grid role** | `KjCalendarGrid` | `<table role="grid">` with `aria-labelledby` pointing to the `KjCalendarHeader`'s caption id. WAI-ARIA APG date picker. |
| **Column headers** | inside `KjCalendarGrid` | `<thead><tr role="row"><th role="columnheader" abbr="Sunday">Su</th>…</tr></thead>` — `abbr` carries the full weekday name for assistive tech, the visible text is the short form. WCAG 1.3.1. |
| **Row role** | `KjCalendarRow` | `<tr role="row">` per week. Optional `<th role="rowheader">` for the ISO week number when `kjShowWeekNumber="true"`. |
| **Cell role** | `KjCalendarCell` | `<td role="gridcell">` containing a `<button>` (focusable) — the cell carries `aria-selected`, `aria-disabled`, `aria-current`, the button is the focus target. |
| **`aria-selected`** | `KjCalendarCell` | `'true'` when the date is selected (per the selection model — for range, true on `from` and `to`, **not** on the in-between cells). `null` (unset) otherwise — never `'false'` (`'false'` confuses some SR into reading "not selected" on every cell). |
| **`aria-current="date"`** | `KjCalendarCell` | Set on the cell representing today. Only one per render. WCAG 1.3.1. |
| **`aria-disabled`** | `KjCalendarCell` | `'true'` when the date fails `kjMinDate` / `kjMaxDate` / `kjDateFilter`, OR the calendar itself is disabled. Inner button gets `disabled` AND `aria-disabled` — disabled buttons are skipped by Tab and arrow navigation. (We keep them in the DOM for layout.) |
| **`aria-label` per cell** | `KjCalendarCell` | Full date as readable string: `"Tuesday, April 15, 2025"`. Generated via `dateAdapter.format(date, 'longDate')`. SR users hear this on focus; sighted users see only the day number. WCAG 4.1.2. |
| **In-range visual** | `KjCalendarCell` | `data-in-range` for the cells between `from` and `to` in range mode. Theme CSS paints. **No ARIA on these** — `aria-selected` is only on the endpoints, and `data-in-range` is purely visual. SR announcement of the range happens once via the live region when `to` is set. |
| **Range hover preview** | `KjCalendarCell` | `data-in-preview-range` for the cells between `from` and the focused / hovered cell while waiting for the second click. Theme paints; no ARIA. |
| **Roving tabindex** | `KjCalendarGrid` (host) | A 2D variant of `KjRovingTabindex` ([Composition](#composition-model)). Only one cell button has `tabindex="0"` at a time — the focused-date cell. All others `tabindex="-1"`. WCAG 2.1.1. |
| **Keyboard contract** | `KjCalendarGrid` | Per APG: ArrowLeft/Right (±1 day), ArrowUp/Down (±1 week), Home (start of week), End (end of week), PageUp/PageDown (±1 month), Shift+PageUp/Shift+PageDown (±1 year), Enter or Space (select), Tab (move focus out of grid — to next focusable element on the page). In year view: arrows ±1 month, PageUp/Down ±1 year. In multi-year view: arrows ±1 year, PageUp/Down ±10 years. WCAG 2.1.1, 2.1.2. |
| **Focus on month change** | `KjCalendar` | When the user navigates to a new month (via PageUp/Down, the prev/next buttons, or arrow keys that cross month boundaries), focus is set to the cell representing the same day-of-month in the new month. If that day doesn't exist (Feb 30), focus lands on the last day of the new month. If the target is filtered out by min/max/dateFilter, focus advances forward (or backward, depending on direction) to the next selectable date. Material's behaviour exactly. WCAG 2.4.3. |
| **Focus on view change** | `KjCalendar` | Switching `month` → `year`: focus the cell for the focused date's month. `year` → `multi-year`: focus the cell for the focused date's year. Reverse: same. The focused-date signal persists across view changes. |
| **Live region** | `KjCalendar` (composes `KjLiveRegion`) | On month change: announce "April 2025" (or whatever `dateAdapter.format(date, 'monthYear')` yields). On year change in `year` view: announce "2025". On range-mode "selecting end" transition: announce "Selecting end of range, currently April 1, 2025". Polite, not assertive. WCAG 4.1.3. |
| **Focus-visible** | `KjCalendarCell` | Composes `KjFocusRing`; cell button reflects `data-focus-visible` for keyboard-only ring. Mouse clicks don't draw the ring. WCAG 2.4.7. |
| **Focus order** | calendar | Tab moves into the calendar landing on the **header's previous-month button**, then **caption (view toggle)**, then **next-month button**, then **the focused day cell** (the only `tabindex="0"` cell), then **out of the calendar** to the next focusable on the page. Shift-Tab reverses. Arrow keys *only* navigate within the day grid; they do nothing in the header. WCAG 2.4.3. |
| **Touch target ≥ 44×44** | wrapper CSS | Each cell's button must be ≥ 44×44px. With 7 columns at 44px, the day grid is ≥ 308px wide — fits a phone in portrait. WCAG 2.5.5. |
| **Color/contrast** | themes layer | Selected cell background and selected cell text must hit ≥ 7:1 (AAA). In-range cell background ≥ 3:1 against unselected (1.4.11 non-text contrast); the in-range cells' text retains ≥ 7:1 against their background. Today-marker outline ≥ 3:1 against the cell background. Disabled cell text ≥ 3:1 (informative; AAA-compatible because the cell isn't activatable). |
| **Reduced motion** | themes layer | Month-change transitions (slide-in, fade) must respect `prefers-reduced-motion: reduce`. Default theme uses no motion. WCAG 2.3.3. |
| **`aria-required`** | `KjCalendar` | Reflected when the bound `Validators.required` is on the form control, OR `kjRequired="true"`. Surfaces on the calendar root; the field wrapper drives the label `*`. WCAG 3.3.2. |
| **`aria-invalid`** | `KjCalendar` | Reflected when `kjInvalid && touched`, mirroring `KjInput`'s pattern. Useful for "you must pick a date" form errors after submit. |
| **`aria-describedby`** | `KjCalendar` | Reflects the `KjField`'s describedby chain when nested in a field — same pattern as Input. Useful for "Pick a return date after the departure date" hints. |

### Range mode a11y

Range mode adds three extra a11y concerns the single mode doesn't:

1. **Live region between clicks.** After the first click on
   April 1, the live region announces "April 1 selected, now
   choose end of range". On the second click on April 15, the
   live region announces "Range from April 1 to April 15 selected".
   Without this, SR users get no feedback that the range is
   in-progress.
2. **`aria-selected` is only on endpoints.** SR users navigating
   with arrow keys hear "selected" on April 1 and April 15, and
   plain "April 8" on the in-between cells. The `data-in-range`
   visual styling doesn't translate to a11y semantics — that's
   correct. PrimeNG and Material both do this; we follow.
3. **Reverse-order entry.** Clicking April 15 first, then April 1,
   should normalize to `from: April 1, to: April 15` (Material does
   this; react-day-picker does this; we do this). Live region
   announces "Range from April 1 to April 15 selected" — the
   normalized form, not the click order.

### Multi mode a11y

- Each selected cell carries `aria-selected="true"`. SR users hear
  "selected" on every selected cell as they navigate.
- Live region announces "Date X selected, N total" / "Date X
  removed, N total" on toggle.
- `kjMaxSelections` reached: the live region announces "Maximum
  reached, N of N", and clicking any unselected cell does nothing
  (cell still focusable, no `aria-disabled` — disabling would
  imply they can never be picked, but they can after a deselect).

### Disabled vs out-of-bounds

- Cell *outside* `kjMinDate` / `kjMaxDate` is `aria-disabled="true"`,
  `data-out-of-bounds`. Skipped by keyboard.
- Cell *inside bounds* but failing `kjDateFilter` is
  `aria-disabled="true"`, `data-filtered`. Also skipped by keyboard.
- Outside days (from previous/next month, when shown) are
  `data-outside-month` but **not** disabled (selecting one moves
  focus to the new month). Set `kjOutsideDaysClickable="false"`
  to disable them.

### Where each piece lives

- Root role + `aria-label` + live region + form CVA wiring → **`KjCalendar`**.
- Caption + view-toggle button + prev/next buttons + label-id
  for the grid's `aria-labelledby` → **`KjCalendarHeader`**.
- `<table role="grid">` + roving tabindex + keyboard handler →
  **`KjCalendarGrid`**.
- Per-cell `aria-selected`, `aria-disabled`, `aria-current`,
  `aria-label`, focus-ring, click handler → **`KjCalendarCell`**.

## Composition model

```text
calendar/
  calendar.ts                     ← KjCalendar (root)
  calendar-header.ts              ← KjCalendarHeader + KjCalendarPrevButton, KjCalendarNextButton, KjCalendarViewToggle
  calendar-grid.ts                ← KjCalendarGrid (the <table role="grid">)
  calendar-row.ts                 ← KjCalendarRow (per-week <tr>)
  calendar-cell.ts                ← KjCalendarCell (per-day <td> + button)
  calendar-year-grid.ts           ← KjCalendarYearGrid (12-cell month grid)
  calendar-multi-year-grid.ts     ← KjCalendarMultiYearGrid (24-cell year grid)
  calendar.context.ts             ← KjCalendarContext + KJ_CALENDAR token
  selection-model.ts              ← KjCalendarSelectionModel<D> (single / range / multi strategies)
  date-adapter.ts                 ← KjDateAdapter<D> abstract + KjNativeDateAdapter + KJ_DATE_ADAPTER + KJ_DATE_FORMATS tokens
  roving-2d.ts                    ← KjRovingGrid + KjRovingGridCell (2D roving tabindex variant; see below)
  calendar.spec.ts
  index.ts
```

### Shared state — `KjCalendarContext`

```ts
export interface KjCalendarContext<D> {
  /** Current view: month / year / multi-year. Two-way bound. */
  readonly view: WritableSignal<'month' | 'year' | 'multi-year'>;
  /** The "active" date — the date that has tabindex=0. Drives keyboard nav and focus restoration. */
  readonly focusedDate: WritableSignal<D>;
  /** Mode-aware selection state. */
  readonly selection: KjCalendarSelectionModel<D>;
  /** Per-cell predicate combining min/max/filter. */
  readonly isDisabled: (date: D) => boolean;
  /** True between the first and second clicks in range mode. */
  readonly isSelectingRangeEnd: Signal<boolean>;
  /** True when calendar itself is disabled. */
  readonly disabled: Signal<boolean>;
  /** True when calendar is readonly. */
  readonly readonly: Signal<boolean>;

  /** The injected date adapter. */
  readonly adapter: KjDateAdapter<D>;
  /** The injected formats config. */
  readonly formats: KjDateFormats;

  /** Move focused date by N units in the current view, skipping disabled. */
  moveFocus(unit: 'day' | 'week' | 'month' | 'year' | 'decade', delta: number): void;
  /** Move focused date to start/end of week (month view) or year (year view). */
  moveFocusToBoundary(boundary: 'start' | 'end'): void;
  /** Select / toggle the focused date (or whatever date is passed). */
  selectDate(date: D): void;
  /** Switch view; focus moves to the cell representing the previous focusedDate's relevant unit. */
  switchView(view: 'month' | 'year' | 'multi-year'): void;
  /** Announce a string via the live region. */
  announce(message: string): void;
}

export const KJ_CALENDAR =
  new InjectionToken<KjCalendarContext<unknown>>('KjCalendar');
```

### `KjCalendar` (root, selector `[kjCalendar]` / `kj-calendar`)

```ts
@Directive({
  selector: '[kjCalendar]',
  standalone: true,
  hostDirectives: [
    KjFormControl,            // CVA wiring (value, touched, disabled)
    KjFocusRing,              // keyboard-only focus ring (delegated to cells, but root carries the signal)
    { directive: KjDisabled, inputs: ['kjDisabled'] },
    KjLiveRegion,             // announce() routes through this
  ],
  providers: [{ provide: KJ_CALENDAR, useExisting: KjCalendar }],
  host: {
    'role': 'group',
    '[attr.aria-label]': 'computedAriaLabel()',
    '[attr.aria-labelledby]': 'computedAriaLabelledBy()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.aria-readonly]': 'readonly() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    '[attr.aria-invalid]': 'invalid() ? "true" : null',
    '[attr.data-mode]': 'kjMode()',
    '[attr.data-view]': 'view()',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.data-readonly]': 'readonly() ? "" : null',
    '[attr.data-number-of-months]': 'kjNumberOfMonths()',
  },
})
export class KjCalendar<D = Date> implements KjCalendarContext<D> { /* … */ }
```

Wrapper component `<kj-calendar>` is the styled equivalent —
projects the default header / grid / sub-views.

### `KjCalendarHeader` (selector `[kjCalendarHeader]`)

The header owns three things:

1. **Caption** — a `<button>` showing "April 2025" (`month` view),
   "2025" (`year` view), "2024 – 2047" (`multi-year` view). Clicking
   walks the view chain backward.
2. **Prev / Next buttons** — `KjButton` instances with appropriate
   `aria-label` ("Previous month", "Next month", per the current
   view). `kjMinDate` / `kjMaxDate` disable the button when the
   adjacent month/year is fully out of bounds.
3. **Label id for the grid's `aria-labelledby`.** The caption's
   `id` is exposed on the context so `KjCalendarGrid` can reflect
   `aria-labelledby={ headerCaptionId }`.

```ts
@Directive({
  selector: '[kjCalendarHeader]',
  standalone: true,
})
export class KjCalendarHeader<D> {
  private ctx = inject<KjCalendarContext<D>>(KJ_CALENDAR);
  /** Auto-minted; exposed on context for grid's aria-labelledby. */
  readonly captionId = signal<string>(getId('kj-calendar-caption'));
  // … click-prev, click-next, click-caption methods drive ctx.moveFocus()/switchView()/announce()
}
```

### `KjCalendarGrid` (selector `[kjCalendarGrid]`, on a `<table>`)

```ts
@Directive({
  selector: 'table[kjCalendarGrid]',
  standalone: true,
  hostDirectives: [KjRovingGrid],   // 2D roving tabindex
  host: {
    'role': 'grid',
    '[attr.aria-labelledby]': 'ctx.headerCaptionId()',
    '[attr.aria-readonly]': 'ctx.readonly() ? "true" : null',
    '(keydown)': 'onKeydown($event)',
  },
})
export class KjCalendarGrid<D> { /* … */ }
```

The `onKeydown` handler maps APG keys to `ctx.moveFocus(...)`,
`ctx.moveFocusToBoundary(...)`, `ctx.selectDate(ctx.focusedDate())`,
or PageUp/Down → `ctx.moveFocus('month', ±1)`. The grid does
**not** mutate the DOM — `KjRovingGrid` reads `ctx.focusedDate()`
and applies `tabindex` accordingly via the cell directives.

### `KjCalendarCell` (selector `[kjCalendarCell]`, on a `<td>`)

```ts
@Directive({
  selector: 'td[kjCalendarCell]',
  standalone: true,
  host: {
    'role': 'gridcell',
    '[attr.aria-selected]': 'isSelected() ? "true" : null',
    '[attr.aria-current]': 'isToday() ? "date" : null',
    '[attr.aria-disabled]': 'isDisabled() ? "true" : null',
    '[attr.data-today]': 'isToday() ? "" : null',
    '[attr.data-selected]': 'isSelected() ? "" : null',
    '[attr.data-in-range]': 'isInRange() ? "" : null',
    '[attr.data-in-preview-range]': 'isInPreviewRange() ? "" : null',
    '[attr.data-outside-month]': 'isOutsideMonth() ? "" : null',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
  },
})
export class KjCalendarCell<D> {
  /** Required input — the date this cell represents. */
  readonly kjDate = input.required<D>();
}
```

The cell's inner button (a `<button>`) is the focus target;
`KjRovingGridCell` host directive on the button reads
`ctx.focusedDate()` and reflects `tabindex="0"` when matching.

### Cross-component pointers

- **`data-input/date-picker.md`** — wraps `KjCalendar` in a
  `KjPopover` anchored to a `KjInput`. Date Picker provides
  the format/parse ↔ Calendar value bridge. Calendar's
  `(kjValueChange)` flows back into the input's value as a
  formatted string; the input's parsed value flows into
  `[kjValue]`. Calendar handles **none** of the parse/format —
  that's strictly the Date Picker's responsibility (and the
  `KjDateAdapter`'s).
- **`data-input/time-picker.md`** — sibling. Time Picker uses
  the same `KjDateAdapter` (or a sibling `KjTimeAdapter` —
  decision deferred to the Time Picker analysis). When
  composed in a "Date+Time Picker", Calendar selects the
  date portion and Time Picker selects the time portion;
  the parent component combines them. Calendar **does not**
  ever expose time controls.
- **`data-input/field.md`** — Calendar registers as a
  composite control. The field's label uses
  `aria-labelledby` (NOT `for=`) onto the calendar root. The
  field's describedby chain flows onto the calendar root.
  See [Field's section on composite controls](./field.md#1-the-field-family).
- **`data-input/input.md`** — the calendar's `KjFormControl`
  composition mirrors `KjInput`'s exactly (CVA, touched-aware
  invalid state, disabled signal). Calendar **does not** compose
  `KjInput` — it is not a text control. The shared primitive
  is `KjFormControl` only.
- **`a11y/roving-tabindex.ts`** — needs a 2D variant. The
  current `KjRovingTabindex` walks a 1D `contentChildren()`
  list with arrow keys mapped to next/previous. Calendar
  needs a `KjRovingGrid` that walks a 2D structure — arrow
  Right/Left = ±1 column, arrow Up/Down = ±1 row, with
  row-wrap on horizontal arrows (ArrowRight on the last cell
  of a week moves to the first cell of the next week,
  matching APG). Ship `KjRovingGrid` alongside `KjRovingTabindex`
  in `packages/core/src/a11y/`. Open question:
  [generalization vs duplication](#open-questions--risks).
- **`a11y/live-region.ts`** — already shipped. Calendar
  composes via `hostDirectives` on the root and routes the
  context's `announce()` method to it.
- **`primitives/forms/form-control.ts`** — Calendar composes
  `KjFormControl`. The form control's `value` is `unknown`;
  Calendar narrows it via the selection model strategy.
  `value()` returns `D | null` (single), `{ from; to }` (range),
  or `D[]` (multi).

## Inputs / Outputs / Models — `kj`-prefixed

### `KjCalendar` (root)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjMode` | `input` | `'single' \| 'range' \| 'multi'` | `'single'` | Drives the selection model strategy and the value type. Changing mode at runtime resets the value to the new mode's empty state. |
| `kjValue` | `model` | `D \| null \| { from: D \| null; to: D \| null } \| readonly D[]` | mode-dependent (`null` / `{ from: null, to: null }` / `[]`) | Two-way bound. `[(kjValue)]` works in templates. |
| `kjFocusedDate` | `model` | `D` | `kjStartAt ?? today` | Two-way bound. Tracks which cell has `tabindex=0`. Drives keyboard nav. Consumers can write to it to programmatically move focus. |
| `kjView` | `model` | `'month' \| 'year' \| 'multi-year'` | `kjStartView` | Two-way bound. |
| `kjStartAt` | `input` | `D \| null` | `null` | Initial focused date when no value is selected. Defaults to today. |
| `kjStartView` | `input` | `'month' \| 'year' \| 'multi-year'` | `'month'` | Initial view. |
| `kjMinDate` | `input` | `D \| null` | `null` | Earliest selectable date. |
| `kjMaxDate` | `input` | `D \| null` | `null` | Latest selectable date. |
| `kjDateFilter` | `input` | `((date: D) => boolean) \| null` | `null` | Predicate; `false` disables the cell. |
| `kjDateClass` | `input` | `((date: D, view: KjCalendarView) => string \| string[]) \| null` | `null` | Per-cell extra classes (Material's `dateClass`). |
| `kjFirstDayOfWeek` | `input` | `0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| undefined` | `undefined` (read from adapter) | Override locale's first day of week. |
| `kjNumberOfMonths` | `input` | `number` | `1` | Number of months rendered side-by-side. |
| `kjFixedWeeks` | `input` | `boolean` | `false` | Always render 6 weeks per month. |
| `kjShowOutsideDays` | `input` | `boolean` | `true` | Render outside-month days. |
| `kjOutsideDaysClickable` | `input` | `boolean` | `true` | Outside days are selectable. |
| `kjShowWeekNumber` | `input` | `boolean` | `false` | Render the ISO week number column. |
| `kjAllowDeselect` | `input` | `boolean` | `false` (single mode); always `true` for multi | Clicking a selected date in single mode clears the value. |
| `kjMaxSelections` | `input` | `number \| null` | `null` (multi mode only) | Caps the multi-mode selection count. |
| `kjDisabled` | forwarded via `hostDirectives` to `KjDisabled` | `boolean` | `false` | Disables the entire calendar. |
| `kjReadonly` | `input` | `boolean` | `false` | Navigable but not selectable. |
| `kjRequired` | `input` | `boolean` | `false` | Reflects `aria-required`. Auto-derived from `Validators.required` when bound to a form. |
| `kjInvalid` | `input` | `boolean` | `false` | Reflects `aria-invalid` only when also `touched()`. Same touched-gate as `KjInput`. |
| `kjAriaLabel` | `input` | `string \| undefined` | `undefined` | When no `KjField` parent provides `aria-labelledby`, this provides `aria-label` on the root. Defaults to "Calendar" if neither is set. |

| Name | Kind | Type | Notes |
|---|---|---|---|
| `kjValueChange` | output via `model` | `KjCalendarValue<D>` | Auto-emitted by the `model` binding. Emitted on every selection change. |
| `kjFocusedDateChange` | output via `model` | `D` | Auto-emitted by the `model` binding. Useful for syncing a parent component's "currently visible month" UI. |
| `kjViewChange` | output via `model` | `'month' \| 'year' \| 'multi-year'` | Auto-emitted by the `model` binding. |

`model()` bindings produce both an input and a same-named `Change`
output, satisfying [`code_style.md`'s naming rule (B)](../../rules/code_style.md):
*model property name carries `kj`; the change output is `<name>Change`*.

### `KjCalendarHeader`

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjCalendarHeaderLabel` | `input` | `((view: KjCalendarView, focusedDate: D, adapter: KjDateAdapter<D>) => string) \| null` | `null` (uses default formatter) | Override the caption text. Default: `month` → `"April 2025"`, `year` → `"2025"`, `multi-year` → `"2024 – 2047"`. |

### `KjCalendarGrid` / `KjCalendarYearGrid` / `KjCalendarMultiYearGrid`

No public inputs. They consume context.

### `KjCalendarCell`

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjDate` | `input.required` | `D` | — | The date this cell represents. The directive computes `isSelected`, `isToday`, `isInRange`, `isDisabled` from `ctx` + `kjDate`. |

All `kj`-prefixed names follow shape (A) — property name carries
the prefix — since selectors all start with `kj`. Two-way bindings
use shape (B): `[(kjValue)]` / `(kjValueChange)`.

## Decision: date library / abstraction

Match Material's pattern: an **adapter abstraction** with a default
**native** implementation, and a separate **formats** config. Both
are injection tokens. Consumers wanting Luxon / date-fns / Day.js
provide alternative adapters; the calendar code stays library-agnostic.

```ts
export abstract class KjDateAdapter<D> {
  abstract today(): D;
  abstract createDate(year: number, month: number, day: number): D;
  abstract getYear(date: D): number;
  abstract getMonth(date: D): number;          // 0-indexed
  abstract getDate(date: D): number;           // 1-indexed day-of-month
  abstract getDayOfWeek(date: D): number;      // 0 = Sunday
  abstract getDaysInMonth(date: D): number;
  abstract getFirstDayOfWeek(): number;        // locale-driven
  abstract getDayOfWeekNames(style: 'long' | 'short' | 'narrow'): string[];
  abstract getMonthNames(style: 'long' | 'short' | 'narrow'): string[];
  abstract getYearName(date: D): string;
  abstract addCalendarDays(date: D, days: number): D;
  abstract addCalendarMonths(date: D, months: number): D;
  abstract addCalendarYears(date: D, years: number): D;
  abstract clone(date: D): D;
  abstract isValid(date: D): boolean;
  abstract isSameDay(a: D, b: D): boolean;
  abstract isSameMonth(a: D, b: D): boolean;
  abstract isSameYear(a: D, b: D): boolean;
  abstract compareDate(a: D, b: D): number;
  abstract format(date: D, displayFormat: string): string;
  abstract parse(value: string, parseFormat: string): D | null;
  abstract toIso8601(date: D): string;
  abstract fromIso8601(value: string): D | null;
  abstract setLocale(locale: string): void;
}

export interface KjDateFormats {
  parse: { dateInput: string };                // e.g. 'yyyy-MM-dd' or 'shortDate'
  display: {
    dateInput: string;                         // for the Date Picker's text input
    monthYearLabel: string;                    // for the calendar header in 'month' view
    yearLabel: string;                         // for the calendar header in 'year' / 'multi-year' view
    dateA11yLabel: string;                     // for cell aria-label
    monthYearA11yLabel: string;                // for header announcement
  };
}

export const KJ_DATE_ADAPTER =
  new InjectionToken<KjDateAdapter<unknown>>('KjDateAdapter', {
    providedIn: 'root',
    factory: () => new KjNativeDateAdapter(inject(LOCALE_ID)),
  });

export const KJ_DATE_FORMATS =
  new InjectionToken<KjDateFormats>('KjDateFormats', {
    providedIn: 'root',
    factory: () => KJ_NATIVE_DATE_FORMATS,
  });

export function provideKjNativeDateAdapter(): EnvironmentProviders { /* … */ }
export function provideKjLuxonDateAdapter(): EnvironmentProviders { /* … */ }
// …etc per third-party library, shipped as separate optional sub-packages
```

`KjNativeDateAdapter` uses `Date` + `Intl.DateTimeFormat` for all
locale-aware strings (day names, month names, formatted dates). It
reads first-day-of-week from `Intl.Locale(locale).getWeekInfo()`
(in supporting browsers; falls back to a hard-coded table for
older runtimes — the table covers the ~50 locales whose first-day
isn't Sunday or Monday). No third-party dependencies.

**`provideKjLuxonDateAdapter()` / `provideKjDateFnsAdapter()` /
`provideKjMomentDateAdapter()`** ship as **separate optional
sub-packages** under `@kouji-ui/core/date-luxon`, etc., importing
the date library as a peer dependency. Material's split is the
template; we follow it. The base `@kouji-ui/core` package depends
only on the native adapter.

The same `KjDateAdapter<D>` is shared by the **Time Picker**
([`time-picker.md`](./time-picker.md)) — the abstraction covers
both date and time arithmetic. Methods like `addCalendarMinutes`
exist on the adapter for the Time Picker's benefit; the Calendar
just doesn't call them. **This is the correct shape** — a single
adapter for all temporal concerns, not two.

### Locale handling

- Day names / month names: `dateAdapter.getDayOfWeekNames('short')`
  for the column headers, `'narrow'` for tight layouts.
  `getMonthNames('long')` for the year-view grid.
- Today: `dateAdapter.today()` honours the user's local time zone
  (the Native adapter uses `new Date()`).
- First day of week: `dateAdapter.getFirstDayOfWeek()` reads the
  `Intl.Locale.weekInfo` API. `kjFirstDayOfWeek` overrides per
  instance.
- Cell `aria-label`: `dateAdapter.format(date, formats.display.dateA11yLabel)`,
  with the default native format yielding `"Tuesday, April 15, 2025"`
  for `en-US` and the locale-equivalent for others.

## Examples to ship

Files under `packages/components/src/calendar/` (styled wrapper)
and core-only equivalents under `packages/core/src/calendar/`.

1. **Default (single mode)** — `calendar.example.ts`. One calendar,
   `[(kjValue)]` to a `signal<Date | null>`. Today highlighted.
2. **Range mode** — `calendar.range.example.ts`.
   `kjMode="range"`, two-way bound to
   `signal<{ from: Date | null; to: Date | null }>`. Hover preview
   shown, second click commits.
3. **Multi mode** — `calendar.multi.example.ts`.
   `kjMode="multi"`, bound to `signal<Date[]>`. With
   `kjMaxSelections="3"` capped.
4. **Min / max** — `calendar.bounds.example.ts`.
   `[kjMinDate]="today" [kjMaxDate]="thirtyDaysOut"`.
5. **Custom filter** — `calendar.filter.example.ts`.
   Weekdays-only via `[kjDateFilter]="(d) => d.getDay() !== 0 && d.getDay() !== 6"`.
6. **Multiple months** — `calendar.multi-month.example.ts`.
   `[kjNumberOfMonths]="2"` with range mode.
7. **Year-picker start view** — `calendar.year-picker.example.ts`.
   `[kjStartView]="'multi-year'"` for "pick a year first" UX.
8. **Locale + first day of week** — `calendar.locale.example.ts`.
   `provideKjNativeDateAdapter()` with `LOCALE_ID = 'fr-FR'`,
   showing French day/month names and Monday as first day.
9. **Custom adapter (Luxon)** — `calendar.luxon.example.ts`.
   `provideKjLuxonDateAdapter()`, `D = DateTime`. Same calendar
   surface, different value type.
10. **Disabled** — `calendar.disabled.example.ts`.
    `[kjDisabled]="true"`.
11. **In a field** — `calendar.field.example.ts`. Calendar inside
    `<div kjField>` with `<label kjFieldLabel>` and a
    `<span kjFieldError>`. Demonstrates the
    `aria-labelledby` strategy and the field-driven describedby.
12. **Custom date class** — `calendar.date-class.example.ts`.
    Highlight weekends and a list of public holidays via
    `kjDateClass`.
13. **Themed (core-only)** — `calendar.example.ts`,
    `calendar.retro.example.ts`, `calendar.finance.example.ts`
    under `packages/core/src/calendar/`. Demonstrates the headless
    directives work under arbitrary theme CSS.

## Open questions / risks

1. **`KjRovingGrid` vs generalising `KjRovingTabindex`.** The
   current `KjRovingTabindex` is 1D. Calendar needs 2D
   navigation with row-wrap (ArrowRight on cell 7 of week 1
   moves to cell 1 of week 2). Two paths:
   (a) Ship `KjRovingGrid` as a *new* directive in the same
       file, sharing the active-cell-signal pattern. Keep
       `KjRovingTabindex` 1D. Calendar uses `KjRovingGrid`;
       toolbars / tab lists use `KjRovingTabindex`.
   (b) Generalise `KjRovingTabindex` with a `kjRovingOrientation: 'horizontal' | 'vertical' | 'grid'`
       input and infer 2D structure from `contentChildren()`
       grouped by `<tr>`.
   **Recommendation: (a).** Generalising forces `KjRovingTabindex`
   to know about table structure, which leaks DOM concerns into
   a primitive that should be DOM-agnostic. A separate
   `KjRovingGrid` is cleaner and the implementations can share a
   helper (`updateActive(idx)`). Document under the a11y
   primitives.
2. **`Date` vs `D` everywhere.** Calendar is generic over `D` but
   most consumers will use the native `Date`. The wrapper component
   `<kj-calendar>` defaults `D = Date`; Luxon / DateFns consumers
   either use the directive directly with their type, or we ship
   typed wrapper components per adapter (`<kj-calendar-luxon>`).
   **Recommendation:** generic directive, native-defaulting
   component, no per-library wrappers (the cost outweighs the
   ergonomics — consumers can re-export a typed alias themselves).
3. **`Intl.Locale.weekInfo` browser support.** Available in Chrome
   99+, Edge 99+, Safari 17+, Firefox 130+. Older runtimes need
   the fallback table. The fallback table is small (~50 locales
   whose first day isn't Sunday or Monday) and ships in
   `KjNativeDateAdapter` itself — no separate dependency.
   Document the SSR caveat: when SSRing for an unknown locale,
   fall back to Sunday (en-US default) to avoid hydration
   mismatches. Consumers can override per-locale.
4. **Time zones.** `KjDateAdapter`'s `today()` returns local time
   per the Native adapter. Consumers needing UTC or arbitrary
   tz support pass a Luxon adapter (Luxon has first-class tz
   support via `setZone`). Calendar itself is tz-naive: it shows
   the date the adapter says, no implicit conversions.
5. **Range mode "selecting end" persistence.** What if the user
   navigates the calendar (PageDown to next month) between the
   first and second clicks? Material persists the in-progress
   range across navigation; PrimeNG persists; we persist. The
   live region announces "Selecting end of range, on April 1
   to April 28" when the focused month changes during selection
   to remind the SR user of the in-progress state. The
   alternative — resetting on navigation — is worse UX.
6. **Range mode wrong direction.** User clicks April 15, then
   April 1. Should the range be `{ from: April 15, to: April 1 }`
   (preserving click order) or `{ from: April 1, to: April 15 }`
   (normalized)? **Recommendation: normalize on commit, raw
   during selection.** During the in-progress preview show
   `from: April 15` with the preview span back to April 1; on
   the second click swap and emit the normalized form. Material
   does this. The alternative — emitting raw with `from > to` —
   forces every consumer to normalize, which is worse.
7. **Cells outside `kjMinDate` / `kjMaxDate` in the Year and
   Multi-Year views.** A January cell in the Year view should
   be disabled if every day in January is outside the bounds.
   The check is "any day in this month/year is selectable" —
   i.e., `month` is selectable iff there's at least one day
   in the month within bounds. Compute via the adapter's
   `addCalendarDays(monthStart, n)` loop. Cache per render to
   avoid 31× per-cell loops.
8. **`kjView` and the `model` two-way binding.** Switching the
   view from outside (consumer writes to `kjView`) emits
   `kjViewChange`, which echoes back. Use Angular's built-in
   model() echo guard (writing to a model() input from outside
   doesn't re-trigger the output). Verify in the spec.
9. **Sub-pixel rendering at 44px touch target.** 44 × 7 = 308px
   minimum width for the day grid. On a 320px viewport (the
   smallest WCAG suggests targeting), there are 12px of
   horizontal padding to play with — tight. Themes must avoid
   per-cell margin and use `gap` on the row instead. Document
   in the calendar-token spec.
10. **`role="grid"` and ChromeVox / VoiceOver behavior.**
    ChromeVox reads each cell on arrow-nav as expected.
    VoiceOver on iOS used to skip empty cells (cells with
    `role="gridcell"` but no text content) — fixed in iOS 16.
    Fall back to per-cell `aria-label` on the inner button
    when SR pacing is poor; we already do this. No change
    needed.
11. **Range-end live announcement i18n.** "Selecting end of
    range" is English. Use `KJ_DATE_FORMATS` for the
    a11y labels and add `KJ_CALENDAR_LABELS` for the
    parametric strings ("Previous month", "Next month",
    "Selecting end of range, currently {date}", "Range from
    {from} to {to} selected", …) so consumers can localize.
    Material does this with its `MAT_DATE_RANGE_SELECTION_STRATEGY`
    and translation hooks. We ship a `KJ_CALENDAR_LABELS`
    token with `provideKjCalendarLabels(labels)` helper. Defaults
    to English; consumers override per-locale.
12. **Outside days in range mode.** Clicking an outside day
    that's already in the range should… do what? Move to the
    new month, then re-anchor? Just move? **Recommendation:**
    treat clicks on outside days exactly as clicks on the
    same date — set `from` or `to` per the range protocol,
    AND switch the visible month to where the click landed.
    Material does this; PrimeNG does this; we follow.
13. **Multi mode and `kjMaxSelections`.** When the cap is
    reached, clicking an unselected cell does nothing. Should
    we visually disable the unselected cells once the cap is
    reached? **Recommendation: no.** They remain enabled
    visually (so the user can deselect-and-pick) but the click
    is a no-op when the cap is hit. Live region announces
    "Maximum reached, N of N". Document.
14. **`kjAllowDeselect` default.** Material doesn't allow
    deselect (clicking the selected date does nothing).
    react-day-picker allows it. We default off (Material's
    behaviour) because the standard pattern in form contexts
    is "you can change but not clear" — clearing is done via
    a separate "Clear" button. The Date Picker wrapper
    surfaces a clear button.
15. **Year view with `multi` and `range` modes.** What does
    selecting a month or year *mean* in those modes? Material
    closes the year-view back to month-view on click rather
    than selecting the month/year as a value. **Recommendation:**
    same — clicking in `year` view always switches to `month`
    view focused on the clicked month, regardless of mode.
    Only the `month` view's day cells are selectable. Document.
16. **SSR.** Calendar's render is signal-driven and the date
    adapter's `today()` runs in the constructor — same time
    zone on server and client (when the server's tz matches
    the user's, which is rarely true at scale). The
    `aria-current="date"` attribute may flicker on hydration
    if server and client compute different "today" values.
    **Recommendation:** the Native adapter accepts an optional
    `now()` override (default `() => new Date()`), and the
    calendar reads `today()` lazily inside an effect.
    Document; ship an SSR smoke test.
17. **Form integration: `Validators.required` on the value.**
    Single mode — `Validators.required` fails on `null`,
    works. Range mode — `Validators.required` checks
    truthiness of the `{ from, to }` object, which is always
    truthy. We need a custom validator (`KjValidators.dateRangeRequired`)
    that checks `from && to`. Multi mode — same problem, ship
    `KjValidators.dateMultiRequired` for `length > 0`.
    Document in the validators package; cross-reference under
    [`form.md`](./form.md).
18. **Initial focus when calendar mounts inside a popup.** When
    the Date Picker opens its popover, focus must enter the
    calendar — typically on the focused-date cell (or the
    first selectable cell in the visible month if no value).
    Calendar exposes a `focus()` method on `KjCalendar` that
    calls `el.querySelector('[tabindex="0"]')?.focus()`.
    Date Picker calls this after the popover opens. Document
    in the Date Picker analysis.
19. **Year and Multi-Year grid roving tabindex.** Both are
    grids (`role="grid"`) with their own roving — same
    `KjRovingGrid` works (4×3 for Year, 6×4 for Multi-Year),
    just different layouts. Each has its own keyboard map:
    Year: arrows ±1 month, PageUp/Down ±1 year. Multi-Year:
    arrows ±1 year, PageUp/Down ±10 years. Same APG pattern,
    just scaled. Document.
20. **Two-way `model` echo on `kjFocusedDate`.** When the user
    arrow-navigates, `focusedDate` updates internally, emits
    `kjFocusedDateChange`, which is fine. When a parent
    component writes back to `[kjFocusedDate]`, the model
    binding's echo-guard prevents the loop — verify with
    a spec. Useful for "scroll to month" parent-driven UI
    (e.g. a separate "Show January" button outside the
    calendar).
