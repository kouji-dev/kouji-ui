# Date Picker

A **Date Picker** is a value-bearing form control that pairs a typed text
input with a popup calendar grid for selecting a date. The collapsed state
shows an `<input>` formatted per locale; activating the toggle (or the
input's own ArrowDown / Alt+ArrowDown) opens an anchored panel containing a
**Calendar** grid; choosing a day writes the selected date into the form
model and (by default) closes the panel.

Two value shapes are supported behind one root:

- **Single mode** (`kjRange = false`, default) — value is `Date | null`.
- **Range mode** (`kjRange = true`) — value is `[Date | null, Date | null]`,
  where the first cell is the start and the second is the end. Range
  selection is mid-edit until both cells are filled.

Date Picker is **not** the inline calendar grid — that lives in the parallel
`KjCalendar` family ([`data-input/calendar.md`](./calendar.md)). Date Picker
*wraps* `KjCalendar` inside a popover, ties it to a typed input, and adds
locale-aware parse/format and combobox a11y semantics. The same separation
shadcn / Radix and Material both use (`<Calendar>` / `MatCalendar` standalone,
`<DatePicker>` / `MatDatepicker` for the input + popup combo).

This file covers the architecture, source comparison, accessibility contract,
composition, prefixed surface, examples, and open questions. It assumes the
patterns established by [`data-input/select.md`](./select.md) (compound
shape, `aria-activedescendant` strategy, `KjField` integration, anchor
primitive) and [`data-input/number-input.md`](./number-input.md) (display-vs-edit
format swap, `Intl` formatting, clamp on commit).

## Source comparison

### PrimeNG — `<p-datepicker>` ([primeng.org/datepicker](https://primeng.org/datepicker))

PrimeNG's `<p-datepicker>` (formerly `<p-calendar>` pre-v18) is a single
component covering both the inline grid and the popup-with-input usage. The
`inline` flag flips between the two modes:

```html
<p-datepicker [(ngModel)]="date" />                      <!-- input + popup -->
<p-datepicker [(ngModel)]="date" inline="true" />        <!-- grid only -->
<p-datepicker [(ngModel)]="dates" selectionMode="range" /> <!-- range -->
<p-datepicker [(ngModel)]="dates" selectionMode="multiple" /> <!-- multi -->
```

Public API surface (PrimeNG 18, abridged):

| Input                          | Notes                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------ |
| `selectionMode`                | `'single' \| 'range' \| 'multiple'`                                            |
| `view`                         | `'date' \| 'month' \| 'year'` — initial visible view                            |
| `dateFormat`                   | `'mm/dd/yy'` etc — Prime's own mini-format DSL (NOT `Intl`).                    |
| `defaultDate`                  | Used when value is `null` to seed the visible month.                            |
| `minDate` / `maxDate`          | Bounds.                                                                         |
| `disabledDates` / `disabledDays` | Per-date and per-weekday disabling.                                            |
| `showOtherMonths` / `selectOtherMonths` | Adjacent-month leading/trailing day cells.                              |
| `numberOfMonths`               | Render N months side-by-side (typical: `2` for range pickers).                  |
| `showTime` / `timeOnly` / `hourFormat` / `stepHour` / `stepMinute` / `stepSecond` | Inline time selection inside the panel. |
| `showSeconds`                  | Adds a seconds column when `showTime`.                                          |
| `showButtonBar`                | Renders "Today" / "Clear" buttons at the panel bottom.                          |
| `showWeek`                     | Adds a week-number column.                                                       |
| `firstDayOfWeek`               | `0..6` (Sunday..Saturday).                                                       |
| `locale`                       | Object with `dayNames`, `monthNames`, `today`, `clear`, etc — Prime's own       |
|                                | structure, NOT `Intl.DateTimeFormat`.                                            |
| `readonlyInput` / `keepInvalid` / `appendTo` / `panelStyleClass`              | DOM / behaviour. |
| `placeholder` / `inputId` / `name` / `tabindex` / `disabled` / `required`      | HTML pass-through. |
| `iconDisplay`                  | `'button' \| 'input'` — toggle icon position.                                   |
| `showIcon`                     | Render the calendar-icon toggle.                                                |
| `touchUI`                      | Renders the panel as a centered modal overlay on touch devices.                  |
| `panelClass` / `style` / `styleClass`                                          | Styling. |
| `yearRange` / `yearNavigator` / `monthNavigator` (deprecated) | Year-picker bounds. |

Outputs: `onSelect`, `onShow`, `onHide`, `onInput`, `onTodayClick`,
`onClearClick`, `onMonthChange`, `onYearChange`, `onClickOutside`,
`onFocus`, `onBlur`.

Form integration: standard CVA — `[(ngModel)]` / `[formControl]` on the
component itself. Value is `Date | null`, `Date[]` for range, or
`Date[]` for multiple.

A11y: input has `role="combobox"` + `aria-haspopup="dialog"` + `aria-expanded`;
panel has `role="dialog"` with `aria-modal="false"`; date cells are real
`<button>` elements inside a table layout (the table itself is **not**
`role="grid"` in PrimeNG — they rely on the buttons' tabindex roving). Keyboard:
Arrow keys move day-by-day, PageUp/PageDown move month-by-month, Shift+PageUp/Down
move year-by-year, Home/End move to start/end of week, Enter/Space selects, Esc
closes.

Critique:

- **Single component, ~70 inputs.** Same complaint we level at PrimeNG
  elsewhere — `<p-datepicker>` has time-picking, range, multiple, view-switching,
  button bar, week numbers, touch UI, all on one flat surface.
- **Custom `dateFormat` DSL** instead of `Intl.DateTimeFormat`. Means every
  consumer learns a Prime-specific format string (`'dd/mm/yy'`,
  `'M d, yy'`, etc), and locale data is hand-maintained per language.
  `Intl.DateTimeFormat` is the standard and ships in every browser — kouji
  uses `Intl` by default.
- **Inline mode + popup mode in one component** is the same conflation
  PrimeNG does with Select's `editable`. We split: `KjCalendar` is the
  inline grid (`data-input/calendar.md`), `KjDatePicker` is the input +
  popup wrapper. They share zero rendering code; Date Picker imports
  Calendar's *directives* and projects them into the panel.
- **`showTime` inside the same component.** Time-of-day picking is its own
  pattern (sliders / spin buttons / wheel pickers). We split into
  `KjTimePicker` and offer Date Picker a slot where the consumer drops a
  TimePicker if they need one.
- **No `aria-modal="false"` documented** — Prime's panel sometimes traps
  focus and sometimes doesn't depending on `touchUI`. We commit explicitly
  to non-modal popup (no focus trap) for the default case and modal only
  when `kjModal=true` (rare, mobile-targeted).
- **`role="dialog"` on the panel is correct** per APG combobox + dialog —
  matches our decision below.

### Angular Material — `<mat-datepicker>` ([material.angular.dev/components/datepicker](https://material.angular.dev/components/datepicker))

Material's Datepicker is the **closest reference** for kouji architecturally
because it ships as a compound:

```html
<mat-form-field>
  <mat-label>Choose a date</mat-label>
  <input matInput [matDatepicker]="picker" [formControl]="dateCtrl">
  <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
  <mat-datepicker #picker></mat-datepicker>
</mat-form-field>
```

Sub-components / directives:

| Class                                          | Role                                                                                                             |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `MatDatepickerInput` (`[matDatepicker]`)       | Attribute directive on the `<input>`. Owns parse, format, validation (`min`, `max`, `matDatepickerFilter`), CVA, ARIA wiring. |
| `MatDatepickerToggle` (`<mat-datepicker-toggle>`) | The button that opens the panel. `aria-haspopup="dialog"`. References the picker via `[for]`.                  |
| `MatDatepickerToggleIcon` (`[matDatepickerToggleIcon]`) | Slot for a custom icon inside the toggle button.                                                          |
| `MatDatepicker` (`<mat-datepicker>`)           | The state container (open/close, opened date, calendar config). **Renders nothing inline** — the panel is a CDK overlay opened on demand. |
| `MatCalendar` (`<mat-calendar>`)               | The actual grid component. Reused by `MatDatepicker` (in the panel) and by consumers directly (inline). Owns view switching, keyboard, day cells. |
| `MatDateRangeInput`, `MatStartDate`, `MatEndDate` | Range-mode trio: a wrapper input with two child inputs. Replaces `MatDatepickerInput` for range pickers.       |
| `MatDateRangePicker`                           | Range-mode picker. Same shape as `MatDatepicker`.                                                                 |

Form integration: `MatDatepickerInput` is the CVA — the `<input>` is the
form control, the `<mat-datepicker>` is its UI.

**Date library abstraction — `DateAdapter`.** Material does **not** pick a
date library. It defines a `DateAdapter<D>` abstract class plus
`MAT_DATE_FORMATS` (a parse/display format pair) and ships three
implementations:

- `provideNativeDateAdapter()` — uses native `Date`, parses with
  `Date.parse()` (locale-fragile), formats with `Intl.DateTimeFormat`. Default.
- `provideMomentDateAdapter()` — Moment.js (now legacy).
- `provideLuxonDateAdapter()` — Luxon.
- `provideDateFnsAdapter()` — date-fns.

Consumers pick one in their app's bootstrap. The picker, calendar, and inputs
all consume `DateAdapter<D>` generically — the value type `D` flows through.
This is the correct shape — date math is genuinely library-pluggable, and
forcing a choice in a UI library leaks the dependency to every consumer.

A11y: Input is `role="combobox"` + `aria-haspopup="dialog"` + `aria-expanded`,
toggle is `<button>` + `aria-haspopup="dialog"`, panel is a CDK overlay with
`role="dialog"` + `aria-modal="true"` (Material **does** trap focus inside
the calendar — different from Prime). Calendar grid has `role="grid"` with
`role="row"` and `role="gridcell"` per cell, `aria-selected`, `aria-current="date"`
for today, `aria-label` per cell with full date string.

Critique:

- **Heavy on CDK** (overlay, a11y, portal, dates package). Out of bounds
  per [`rules/stack.md`](../../../rules/stack.md). We need our own
  date-adapter abstraction and our own anchor primitive (the same
  `KjAnchor` Select uses).
- **`aria-modal="true"` + focus trap** is debatable for a date picker. APG
  combobox spec says the popup is "not necessarily modal" and recommends
  Esc to close + focus restoration; trapping focus is overkill when the
  popup is a transient picker. We default to **non-modal** (no focus trap)
  but expose `kjModal` for the rare case.
- **`MatDateRangeInput` is a separate input shape** for range mode — two
  inputs joined by an em-dash visually. We unify under a single
  `[kjDatePickerInput]` directive that flips into range mode based on the
  root's `kjRange`, with two internal segmented sub-inputs rendered by the
  wrapper. See [Range mode](#range-mode) below.
- **`MatCalendar` reuse is exactly the pattern we want.** The panel
  projects a calendar; the calendar is a standalone component.
- **`<mat-datepicker>` is invisible in the DOM** — it's a portal anchor
  with no rendered output. We follow the same shape: `KjDatePickerPanel`
  is structural, not visible until opened.

### shadcn/ui — Date Picker recipe ([ui.shadcn.com/docs/components/date-picker](https://ui.shadcn.com/docs/components/date-picker))

shadcn does **not** ship a Date Picker as a single component — it's a
documented **recipe** that composes:

- `<Popover>` + `<PopoverTrigger>` + `<PopoverContent>` (Radix Popover) for
  the anchored panel.
- `<Button variant="outline">` inside `<PopoverTrigger>` as the click target,
  showing the formatted date.
- `<Calendar>` inside `<PopoverContent>` — shadcn's Calendar component is a
  thin wrapper around `react-day-picker` (https://daypicker.dev).
- `date-fns` for formatting (`format(date, 'PPP')`).

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" className="w-[240px] justify-start">
      <CalendarIcon className="mr-2 h-4 w-4" />
      {date ? format(date, 'PPP') : <span>Pick a date</span>}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0">
    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
  </PopoverContent>
</Popover>
```

Notable choices:

- **No typed input.** The trigger is a `<button>` showing the formatted
  date. Users cannot type the date — they must click and pick. This is
  fine for short forms but loses the "type 12/04 and tab away" power-user
  flow that Material and PrimeNG support. shadcn offers a separate "Date
  Picker with Input" recipe that pairs an `<Input>` with a popup `<Popover>` +
  `<Calendar>`, manually wiring `parse(value, 'yyyy-MM-dd', new Date())`.
- **react-day-picker dependency.** The Calendar is not built — it's
  imported. shadcn's role is to style and theme `react-day-picker`'s
  primitives.
- **Range mode.** `<Calendar mode="range" />` — the calendar itself owns
  the dual-cell selection state. Trigger button shows "Jan 1, 2025 –
  Jan 7, 2025". Same recipe; just the format string and input change.
- **`date-fns`** is the de facto choice in the React ecosystem. Tree-shakes,
  immutable, locale-agnostic, has `parse` / `format` / `addDays` / `isBefore`.

Critique:

- **Recipe-not-component.** Pro: maximally composable, every consumer can
  pick their own popover, calendar, format strategy. Con: every consumer
  re-implements parse/format, range edit, ARIA wiring; the "right" wiring
  drifts across apps.
- **Tied to react-day-picker.** Library lock-in via the calendar layer.
- **Format via date-fns.** Locale-aware via `date-fns/locale`, but
  `Intl.DateTimeFormat` covers 99% of formatting needs without a
  dependency.

**Pattern picked up.** kouji takes Material's compound shape (input + toggle
+ panel + calendar) but adopts shadcn's principle of "the calendar is
reusable on its own". `KjCalendar` is the standalone family
([`data-input/calendar.md`](./calendar.md)); `KjDatePicker` wraps it in a
panel tied to an input. We pick `Intl` by default (no library lock), and
ship a thin `KjDateAdapter` abstraction so consumers who want `date-fns` /
`luxon` / `temporal` can swap.

### Cross-library summary

|                            | PrimeNG `<p-datepicker>`     | Material `<mat-datepicker>` family | shadcn (recipe)              | kouji direction                                                |
| -------------------------- | ---------------------------- | ---------------------------------- | ---------------------------- | -------------------------------------------------------------- |
| Composition                | single component (~70 inputs) | compound (input + toggle + picker + calendar) | recipe (Popover + Button + Calendar) | **compound** (`KjDatePicker` + `Input` + `Toggle` + `Panel` + reuses `KjCalendar`) |
| Inline grid                | `inline=true` flag           | `<mat-calendar>` standalone        | `<Calendar>` standalone      | **separate `KjCalendar` family** (no `inline` flag)            |
| Date library               | own (Prime locale data)      | `DateAdapter<D>` abstraction       | `date-fns` (recipe choice)   | **`KjDateAdapter` abstraction**, default = native + `Intl`     |
| Format / parse             | own format DSL (`'mm/dd/yy'`)| `MAT_DATE_FORMATS` + adapter       | `date-fns` `format` / `parse` | **`Intl.DateTimeFormat`** (display) + adapter `parse()` (input) |
| Display-vs-edit            | strips on focus              | strips on focus (depends on adapter) | n/a (no input)             | **strips on focus** (mirrors `KjNumberInput`)                  |
| Range mode                 | `selectionMode='range'`      | `MatDateRangeInput` (separate input shape) | `<Calendar mode='range' />` | **`kjRange` flag on root** (single-input ranges via segmented input) |
| Multi mode                 | `selectionMode='multiple'`   | n/a                                | `<Calendar mode='multiple' />` | **deferred** to v1.1 — see Open Questions                    |
| Time picking               | `showTime` flag              | n/a                                | n/a                          | **separate `KjTimePicker`** — see [`time-picker.md`](./time-picker.md) (planned) |
| Trigger / toggle           | input-icon or input itself   | `<mat-datepicker-toggle>` button   | trigger is the button itself | **dedicated `[kjDatePickerToggle]`** sub-directive (button)    |
| Popup role                 | `dialog`                     | `dialog` + `aria-modal="true"`     | `dialog` (Popover)           | **`dialog` + `aria-modal="false"`** (non-modal, Esc + click-outside close) |
| Focus trap                 | sometimes (touchUI only)     | yes (always)                       | no (Popover default)         | **no by default**, `kjModal=true` opt-in                       |
| Anchored positioning       | own                          | CDK overlay                        | Floating UI                  | **shared `KjAnchor` primitive**                                |
| Form integration           | CVA on root component        | CVA on `MatDatepickerInput`        | controlled in React          | **CVA on root** (`KjDatePicker`), input is presentational      |
| Min / max                  | `minDate` / `maxDate`        | `min` / `max` on input             | `disabled={{ before, after }}` | **`kjMin` / `kjMax` on root**                                 |
| Per-date filter            | `disabledDates`, `disabledDays` | `matDatepickerFilter`           | `disabled={(date) => …}`     | **`kjDateDisabled: (d: Date) => boolean`** on root             |
| Today / Clear bar          | `showButtonBar`              | n/a (consumer adds)                | n/a                          | **`kjShowButtonBar`** input on panel                            |
| Touch / mobile             | `touchUI=true` modal         | n/a                                | n/a                          | **`kjModal` opt-in** (rendered as centered overlay)             |

## Decision — needs a core directive?

**Yes — a Date Picker compound family** (one root + three children + reuse
of `KjCalendar`). Both because the wiring (parse / format / clamp /
combobox ARIA / dialog ARIA / open-close keyboard contract) is significant,
and because four sibling pickers (`KjTimePicker`,
`KjDateTimePicker` (recipe), `KjDateRangePicker` (alias of `KjDatePicker[kjRange]`),
`KjMonthPicker`, `KjYearPicker`) want to share most of it.

### 1. Compound shape

| Directive                        | Status | Role                                                                                                                                                |
| -------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[kjDatePicker]` (root, value-bearing) | new | Owns `value`, `open`, `kjRange`, `kjMin`, `kjMax`, `kjDateDisabled`, `kjLocale`, `kjFormat`, `kjFirstDayOfWeek`, the registered input/toggle/panel refs, `KjFormControl` (CVA). Provides `KJ_DATE_PICKER`. |
| `[kjDatePickerInput]`            | new    | Attribute directive on the typed `<input>`. Owns `role="combobox"`, `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`, parse on blur, format on render, ArrowDown / Alt+ArrowDown to open, Escape to close (when open). |
| `[kjDatePickerToggle]`           | new    | Button that opens / closes the panel. `<button type="button">` + `aria-haspopup="dialog"` + `aria-expanded` + `aria-controls`. Equivalent to `MatDatepickerToggle`. |
| `[kjDatePickerPanel]`            | new    | The popup host. `role="dialog"`, `aria-modal="false"` (default), `aria-labelledby` (auto-resolved to the input's accessible name or `kjAriaLabel`). Anchored via `KjAnchor`. Renders projected `KjCalendar` inside; owns the dialog dismissal contract (Escape, click-outside, Tab-out). |
| `[kjDatePickerCalendar]` *(alias of `[kjCalendar]`)* | reuses | The grid lives in [`data-input/calendar.md`](./calendar.md). Date Picker projects it into the panel and feeds it `value()`, `kjMin()`, `kjMax()`, `kjDateDisabled()`, `kjFirstDayOfWeek()`, `kjLocale()`, `kjFocusedDate()`, plus a callback for selection. The calendar emits day-selected; root commits the value and closes. |

### 2. Why the form control lives on the root, not the input

Material puts CVA on `MatDatepickerInput`. We deliberately diverge:

- **Range mode is a single value with two cells.** When `kjRange = true`,
  the form value is `[Date, Date]` — that's one form control producing one
  bound value. Putting CVA on the input forces either two CVAs (Material's
  `MatStartDate` + `MatEndDate` approach) or a wrapper input that fakes
  CVA over two children. Neither composes with our segmented-input
  approach (see [Range mode](#range-mode)).
- **Toggle-only mode.** A future variant could hide the typed input
  entirely (button-only trigger, like shadcn). The form control must
  survive that — so it lives on the root.
- **Symmetry with `KjSelect`.** Select also puts CVA on the root, with
  the trigger as a presentational combobox button. Date Picker mirrors:
  the typed input is the labelled element from Field's perspective, but
  the root owns the value.

The input directive *does* still wire `value` reflection and `(input)` /
`(blur)` listeners — it's the bridge between the DOM and the root's
context, not a CVA itself.

### 3. Reuse `KjCalendar` rather than re-implement the grid

Calendar is a substantial component on its own (~12 directives — root,
header, prev / next button, view switcher, grid, month-view, year-view,
decade-view, day cell, week-number cell). Re-implementing the grid inside
Date Picker would double the code and split bug fixes across two paths.

The contract between `KjDatePicker` and `KjCalendar`:

- **Date Picker provides** (via projected `[value]`, `[kjMin]`, `[kjMax]`,
  `[kjDateDisabled]`, `[kjFirstDayOfWeek]`, `[kjLocale]`, `[kjFocusedDate]`,
  `(kjDateSelected)`):
  - `value` — current selection (`Date | null` or `[Date, Date]`).
  - `kjMin` / `kjMax` — clamped range.
  - `kjDateDisabled` — per-date predicate.
  - `kjFirstDayOfWeek` / `kjLocale` — display config.
  - `kjFocusedDate` — which date the calendar should focus when the panel
    opens (selected date if present, else today, else min, else first
    visible day).
  - `kjRange` — toggles the calendar's range-selection UI affordance
    (hover-preview between the start and the in-flight cell).
- **Calendar emits**:
  - `kjDateSelected: Date` — user activated a day cell. Date Picker
    commits it (single mode) or extends/restarts the range (range mode).
  - `kjMonthChange` / `kjYearChange` — for analytics / future use; Date
    Picker doesn't act on them.
  - `kjFocusedDateChange` — for syncing keyboard focus state if the
    consumer wants to reflect it.

Calendar **does not** know about input parsing, popup state, or form
integration — those live in Date Picker. This is a clean contract and
matches Material's `MatDatepicker` + `MatCalendar` split.

The wrapper component `<kj-date-picker>` projects a default
`<kj-calendar>` into its panel; advanced consumers can replace it with
two side-by-side calendars (range pickers commonly want
`numberOfMonths=2`) by passing a custom panel template.

### 4. Date adapter — ship a thin `KjDateAdapter` abstraction

Material's `DateAdapter<D>` is the right pattern; consumers who want
`date-fns`, `luxon`, `temporal`, or moment can plug their own. We ship
this thin abstraction and one default implementation:

```ts
export interface KjDateAdapter<D = Date> {
  /** Today's date in this adapter's representation. */
  today(): D;
  /** Parse a localised input string. Returns `null` if invalid. */
  parse(value: string, format: string, locale?: string): D | null;
  /** Format a date for display via Intl options or a format-string token. */
  format(date: D, format: KjDateFormatLike, locale?: string): string;
  /** Add `n` units. `unit` is `'day' | 'week' | 'month' | 'year'`. */
  add(date: D, n: number, unit: KjDateUnit): D;
  /** Compare two dates, day-precision. Returns negative / 0 / positive. */
  compare(a: D, b: D): number;
  /** Day-of-week for the given date, `0..6`. */
  dayOfWeek(date: D): number;
  /** Year / month / day getters. */
  getYear(date: D): number;
  getMonth(date: D): number;       // 0..11
  getDate(date: D): number;        // 1..31
  /** Is this date in the closed interval [min, max]? `min` / `max` may be `null`. */
  isInRange(date: D, min: D | null, max: D | null): boolean;
  /** Convert to / from native Date for interop. */
  toJsDate(date: D): Date;
  fromJsDate(date: Date): D;
}

export const KJ_DATE_ADAPTER = new InjectionToken<KjDateAdapter<unknown>>(
  'KjDateAdapter',
  { factory: () => new KjNativeDateAdapter() },
);

/** Default — uses native `Date` + `Intl.DateTimeFormat` for formatting,
 *  and a small format-token parser for `parse()`. */
export class KjNativeDateAdapter implements KjDateAdapter<Date> { ... }

/** Helper to register a third-party adapter. */
export function provideKjDateAdapter(adapter: Type<KjDateAdapter<unknown>>) {
  return [{ provide: KJ_DATE_ADAPTER, useClass: adapter }];
}
```

`KjDateFormatLike` is one of:

- `Intl.DateTimeFormatOptions` — preferred for display formatting,
  `{ year: 'numeric', month: 'short', day: 'numeric' }`.
- A short string token shorthand `'short' | 'medium' | 'long' | 'full'` —
  forwards to `Intl` presets per locale.
- A format-string DSL `'yyyy-MM-dd'` — for parsing user input where token
  matching matters. The native adapter implements a minimal subset
  (`yyyy`, `yy`, `MM`, `M`, `dd`, `d`). For richer DSLs (Unicode
  CLDR-style, `'EEEE'` etc), users plug in `KjDateFnsAdapter`.

Why ship this even though most apps use native `Date`:

- **Locking to native `Date` is hostile to half the JS ecosystem.** Big
  apps using `date-fns` / `luxon` / Temporal want their representation
  flowing through forms.
- **`Date.parse()` is locale-fragile.** `'01/02/2025'` is Jan 2 in en-US
  and Feb 1 in en-GB — `Date.parse` ignores locale entirely. We can't
  use it. Either we ship a real parser (which the native adapter does
  for the limited token DSL) or we delegate to `date-fns/parse`.
- **Temporal is coming.** `Temporal.PlainDate` lands in browsers and is
  the right shape for date-only forms. `KjDateAdapter<Temporal.PlainDate>`
  is a clean drop-in.

Bundling: the native adapter is the default, registered automatically.
Consumers wanting another adapter call `provideKjDateAdapter(KjDateFnsAdapter)`
in `app.config.ts`. The adapter implementation lives in a sibling package
(`@kouji-ui/date-fns-adapter`, `@kouji-ui/luxon-adapter`), kept out of
the core bundle.

### 5. Why a typed input rather than button-only

shadcn's button-only trigger is fine for casual consumer apps; it fails
power-users in admin / spreadsheet / data-entry contexts. We default to a
typed input + toggle button, with the option to hide the input entirely:

- `kjShowInput: input(true)` on the wrapper — when `false`, the
  input is `display: none` (still in DOM for ARIA / form participation)
  and the toggle becomes the visible trigger. This subsumes shadcn's
  recipe without a separate component.

The typed input + toggle + popup pattern is the APG-recommended combobox
shape for date pickers
(<https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-datepicker/>).

### 6. Anchor primitive and the popup

The panel is anchored to the input (or, when `kjShowInput=false`, to the
toggle button) via the same `KjAnchor` primitive Select / Combobox /
Popover use. Side / align / offset behaviour mirrors Select:

- `kjSide` default `'bottom'`, `kjAlign` default `'start'`, `kjOffset`
  default `4`, `kjAvoidCollisions` default `true`.
- `kjMatchTriggerWidth` default `false` — calendars are wider than typical
  inputs. Width is intrinsic (the calendar's natural ~280px / two months
  ~580px).

Reflected on the panel as `data-side` / `data-align` / `data-state` for
theme transitions.

## Base features

- **Variants.** `KjVariant` host directive on `[kjDatePickerInput]` and on
  `[kjDatePickerToggle]` (default / filled / ghost / destructive). The
  panel takes `kjPanelClass` only — no variant on the panel itself
  (variants live on the trigger surface, matching Select).
- **Sizes.** `KjSize` on the input and toggle (sm / md / lg). The two
  inherit the same size via `KJ_DATE_PICKER.size` so consumers don't have
  to set both.
- **States.** `kjDisabled` on root → cascades to input + toggle, both
  reflect `aria-disabled`; `kjReadonly` (renders the input read-only and
  the toggle disabled, but selection is still visible); `kjInvalid`
  reflects `aria-invalid` on the input when `formCtrl.touched()`;
  `kjRequired` mirrors `Validators.required` to `aria-required`.
- **Min / max.** `kjMin` / `kjMax` (typed as `D` from the date adapter).
  Enforced in three places:
  1. `KjFormControl` validator `kjDateMin` / `kjDateMax` on the bound
     control (auto-registered when `kjMin` / `kjMax` are set).
  2. The calendar disables out-of-range cells (`aria-disabled`,
     non-activatable).
  3. The input parser clamps on commit when the typed value is
     out-of-range *and* `kjClampOnCommit=true` (default `false` — by
     default, an out-of-range typed value sets `aria-invalid` and stays
     as-is; the form validator surfaces the error).
- **Per-date disabling.** `kjDateDisabled: input<(d: D) => boolean | undefined>`.
  Returns truthy to mark the date un-selectable. Calendar cells reflect
  `aria-disabled`; the input commits the date but the form control flags
  it via the same min/max validator path.
- **Locale.** `kjLocale: input<string | undefined>` — BCP-47 tag.
  Defaults to the value of `LOCALE_ID` (Angular's default) when omitted.
  Flows to `Intl.DateTimeFormat` for display, to the adapter's `parse`
  for input parsing, and to the calendar for day-name / month-name
  rendering.
- **Format.** `kjFormat: input<KjDateFormatLike>` — see
  `KjDateFormatLike` above. Default is `'medium'` (e.g. en-US `'Jan 5, 2025'`,
  de-DE `'05.01.2025'`).
- **First day of week.** `kjFirstDayOfWeek: input<0..6 | undefined>` —
  forwarded to calendar. When omitted, calendar derives from
  `Intl.Locale(kjLocale()).getWeekInfo?.()` (or default to Sunday on
  unsupported browsers).
- **Open / close behaviour.**
  - **Open:** click on toggle; `Alt+ArrowDown` on focused input;
    `ArrowDown` on focused input (per APG combobox example) — this
    differs from Select where ArrowDown alone seeds active-descendant;
    here it opens the panel and focuses the calendar's currently-focused
    cell.
  - **Close:** Escape (focus restored to input); click outside (no focus
    restoration); selecting a day in single mode (focus restored to input,
    `kjCloseOnSelect` default `true`); selecting the second cell in
    range mode (same as single); Tab from the panel (closes, focus
    follows natural tab order).
- **Display vs edit format swap.** Mirrors `KjNumberInput`. On focus,
  the input shows the *parseable* form (e.g. `'2025-01-05'`); on blur,
  the *display* form (e.g. `'Jan 5, 2025'`). Configurable via two
  inputs: `kjFormat` (display) and `kjEditFormat` (edit, default
  `'yyyy-MM-dd'` ISO-ish for unambiguous re-parse).
- **Buttons bar.** `kjShowButtonBar: input<boolean>(false)` on the panel.
  Renders "Today" + "Clear" buttons at the bottom. Each is a
  `KjButton kjVariant="ghost" kjSize="sm"` — defined inside the panel,
  not as separate sub-directives.
- **Range mode.** See [Range mode](#range-mode). `kjRange: input<boolean>(false)`
  on root flips the value type to tuple, the calendar to range UI, and
  the input to a segmented input pair.
- **Number of months.** `kjNumberOfMonths: input<number>(1)` on the panel.
  When `> 1`, calendar renders side-by-side months. Common for range
  pickers where `2` is the default.
- **Modal / non-modal.** `kjModal: input<boolean>(false)`. When `true`,
  the panel renders with `aria-modal="true"` + a focus trap (composed
  via `KjFocusTrap`) + a backdrop. Default `false` (non-modal — Esc /
  click-outside / Tab-out close, no trap, no backdrop).
- **Touch / mobile.** When `kjModal=true` (or via a separate
  `kjFullscreenOnTouch` heuristic), the panel renders centered, full-width
  on small viewports. This is the touch-optimised variant.
- **RTL.** `dir` flows from `KjDirectionality` (same as Select). Calendar
  swaps day-of-week order accordingly.
- **Native form participation (`name`).** `kjName: input<string | undefined>`
  on root. When set, root renders a hidden `<input type="hidden">` synced
  to the value's ISO string (single mode) or two hidden inputs
  `<input name="<name>-start">` + `<input name="<name>-end">` (range
  mode). For `<form action=…>` postback.

### Range mode

`kjRange = true` flips three things:

1. **Value shape** — `[D | null, D | null]`. The first cell is the start,
   the second is the end. Both cells `null` = no selection. First filled,
   second `null` = mid-edit.
2. **Calendar UI** — Calendar enters range-selection mode (`kjMode='range'`).
   First cell click sets the start; hover preview shades the in-flight
   range; second cell click commits the end. If the second click is
   *before* the start, the calendar swaps them.
3. **Input rendering** — The wrapper component renders **a single segmented
   input** with two cells joined by an em-dash. Each cell is a
   `[kjDatePickerInput]` directive instance with a different "side" input
   (`kjSide='start' | 'end'`). The two share the same root context (same
   value, same panel, same toggle); they only differ in *which cell* of
   the tuple they read/write.

Why a segmented single-line input rather than Material's `MatDateRangeInput`
shape (two inputs separated by an em-dash):

- **It IS Material's shape**, just owned by the wrapper component instead
  of a separate component. The wrapper renders `<input kjDatePickerInput
  kjSide="start"> – <input kjDatePickerInput kjSide="end">` inside one
  visual field; the two inputs share `KJ_DATE_PICKER` and coordinate via
  the root context.
- This avoids exposing a separate `KjDateRangePicker` component to
  consumers — the family is one root with `kjRange`, period.

Range-mode close behaviour:

- After the *first* cell is selected, panel **stays open** so the user
  can pick the end. Focus moves to the calendar's just-clicked cell, then
  Arrow keys move forward.
- After the *second* cell is selected, panel closes (per `kjCloseOnSelect`,
  default `true`).
- Esc anywhere clears the in-flight start back to the previous committed
  value (or to `[null, null]` if there was no previous selection).

## Accessibility (WCAG 2.1 AAA)

### Roles + ARIA wiring

| Element                                | Role                | Attributes                                                                                                                                                |
| -------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[kjDatePicker]` (root)                | none                | none — state container                                                                                                                                     |
| `[kjDatePickerInput]`                  | `combobox`          | `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls="<panel id>"`, `aria-labelledby` / `aria-label` (consumer or via `KjField`), `aria-describedby` (via `KjField` chain), `aria-required` (mirrored from validators), `aria-invalid` (touched + invalid), `aria-disabled` (from form control), `tabindex="0"`. Host element should be `<input type="text">` (NOT `type="date"` — see [Open Questions](#open-questions--risks)). |
| `[kjDatePickerToggle]`                 | `button` (implicit) | `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls="<panel id>"`, `aria-label` (default: localised "Choose date" via `KjLiveRegion.localize`; consumer overrides via `kjAriaLabel`), `tabindex="0"`. |
| `[kjDatePickerPanel]`                  | `dialog`            | `id="<panel id>"`, `aria-modal="false"` (default — `"true"` when `kjModal=true`), `aria-labelledby="<input or toggle accessible name id>"`, `data-side`, `data-align`, `data-state="open|closed"`, `[hidden]` when closed. Receives DOM focus on open (transferred to the calendar's focused cell on the next tick). |
| `[kjCalendar]` (within panel)          | (own ARIA — see [`calendar.md`](./calendar.md)) | The grid uses `role="grid"`, rows use `role="row"`, cells use `role="gridcell"` with `aria-selected`, `aria-current="date"` for today, full-date `aria-label` per cell. Calendar's keyboard model is roving tabindex (one cell is `tabindex="0"`, others `-1`). |
| Today / Clear buttons (when `kjShowButtonBar`) | `button` | Each is a `KjButton`; `aria-label`s are localised "Today" / "Clear". |

### Keyboard contract

Source: [WAI-ARIA APG Combobox + Date Picker example](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-datepicker/).

| Key                          | When focus is on…             | Behaviour                                                                                       |
| ---------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------- |
| `Alt+ArrowDown`              | Input (closed)                | Open panel; focus moves to calendar's focused cell.                                              |
| `ArrowDown`                  | Input (closed)                | Same as `Alt+ArrowDown` (per APG date-picker example).                                           |
| `Enter`                      | Input (closed)                | Commit typed value (parse-and-commit), do NOT open panel.                                        |
| `Escape`                     | Input (closed)                | No-op (no panel to close).                                                                       |
| Printable char               | Input (closed)                | Native typing — no special handling.                                                              |
| `Enter` / `Space`            | Toggle                        | Open / close panel.                                                                               |
| `Escape`                     | Panel (open)                  | Close panel, restore focus to input.                                                              |
| `Tab` / `Shift+Tab`          | Panel (open, non-modal)       | Close panel, let natural tab order continue past the input/toggle. Last selection preserved.    |
| `Tab` / `Shift+Tab`          | Panel (open, `kjModal=true`)  | Cycles within calendar + button bar. (Focus trap.)                                               |
| `Arrow` / `PageUp` / `PageDown` / `Home` / `End` | Calendar cell        | Owned by `KjCalendar` — see [`calendar.md`](./calendar.md). Summary: Arrow moves day, Page moves month, Shift+Page moves year, Home/End move to start/end of week. |
| `Enter` / `Space`            | Calendar cell                 | Select the date. Single mode → close + restore focus to input. Range mode (first cell) → keep open, advance to end-cell pick. Range mode (second cell) → close + restore focus. |

### Focus management

- **Opening from the input** focuses `[kjDatePickerPanel]` first (so screen
  readers announce `dialog`), then on the next animation frame transfers
  focus to the calendar's focused cell. The `kjFocusedDate` seed:
  - `value()` if set (single mode) or first cell of `value()` if set
    (range mode).
  - else `today()` clamped into `[kjMin, kjMax]` and skipping
    `kjDateDisabled`.
  - else first non-disabled date in the visible month.
- **Closing via Escape / Enter / day-selection** restores focus to the
  input (for input-driven open) or to the toggle (for toggle-driven
  open). The focused-element snapshot is captured when the panel opens.
- **Click outside**: close, no focus restoration. Natural focus follows
  the click.
- **Tab from inside (non-modal)**: close, do not consume Tab — let
  natural tab order continue.
- **Focus trap (modal mode)**: composed via `KjFocusTrap` host directive
  on the panel. Sentinels at the start / end; Tab from the last cell
  cycles to the first focusable element (typically the calendar's
  prev-month button); Shift+Tab from the first cycles to the last
  (typically the Clear button if shown, else the last calendar cell).

### Touch target ≥ 44×44 (WCAG 2.5.5)

- **Input:** `KjSize.md` preset on `[kjDatePickerInput]` must produce
  ≥ 44×44px. Same constraint as `KjInput.md`.
- **Toggle:** `KjSize.md` preset on `[kjDatePickerToggle]` ≥ 44×44px.
  Wrapper renders the toggle with a min-size of 2.75rem.
- **Calendar cells:** owned by `KjCalendar` — see [`calendar.md`](./calendar.md).
  Each day cell ≥ 44×44px in `md`. Themes that ship a `dense` calendar
  must declare it AA-only.
- **Today / Clear buttons:** `KjButton kjSize="sm"` is below 44px in some
  themes; the panel forces `kjSize="md"` for the button bar buttons.

### Color / contrast

Theme concern, same ratios as Select / Input. Calendar's specifics
(today vs other-month vs disabled vs in-range vs selected) are owned by
[`calendar.md`](./calendar.md).

### Live region announcements

- **On panel open:** announce "Date picker, use arrow keys to navigate, Enter to
  select" via `KjLiveRegion` polite. The calendar separately announces the
  focused cell on Arrow key (its own `KjLiveRegion` channel — see calendar.md).
- **On commit (single mode):** announce "<formatted date> selected."
- **On commit (range mode, first cell):** announce "<formatted date> set as start, choose end date."
- **On commit (range mode, second cell):** announce "<formatted start> to <formatted end> selected."
- **On parse failure:** announce "Invalid date format."

All announcement strings flow through `KjLiveRegion.localize(key, params)`
which consumes the same `kjLocale` for translation lookup. Default English
strings ship; consumers override per-locale via the live-region's
`KJ_LIVE_REGION_MESSAGES` token.

### Reduced motion

Wrapper concern. Panel reflects `data-state="open|closed"`; theme guards
transitions with `@media (prefers-reduced-motion: reduce)`.

### `aria-required`, `aria-invalid`, `aria-describedby`

Same machinery as Select. Field's `describedByIds()` flows onto the
**input** (the labelled element), not onto the panel. `aria-required` /
`aria-invalid` ride on the input.

When `kjShowInput=false` (toggle-only mode), described-by and required flow
onto the **toggle** instead — root tracks which element is the labelled
control via the registered ref's `kind: 'input' | 'toggle'`.

## Composition model

```text
date-picker/
  date-picker.ts                  ← KjDatePicker (root, value-bearing) — new
  date-picker-input.ts            ← KjDatePickerInput (combobox) — new
  date-picker-toggle.ts           ← KjDatePickerToggle (button) — new
  date-picker-panel.ts            ← KjDatePickerPanel (dialog) — new
  date-picker.context.ts          ← KJ_DATE_PICKER + KjDatePickerContext — new
  date-adapter.ts                 ← KjDateAdapter abstract + KjNativeDateAdapter — new
  date-picker.example.ts
  date-picker.range.example.ts
  date-picker.min-max.example.ts
  date-picker.disabled-dates.example.ts
  date-picker.locale.example.ts
  date-picker.field.example.ts
  date-picker.reactive.example.ts
  date-picker.button-bar.example.ts
  date-picker.modal.example.ts
  date-picker.toggle-only.example.ts
  date-picker.spec.ts
  index.ts
```

### Shared state — `KjDatePickerContext`

```ts
export type KjDatePickerSide = 'start' | 'end';

export type KjDatePickerValue<D> = D | null | readonly [D | null, D | null];

export interface KjDatePickerContext<D = unknown> {
  /** Current value. Single mode: D | null. Range mode: [D | null, D | null]. */
  readonly value: Signal<KjDatePickerValue<D>>;
  /** Whether the panel is open. */
  readonly open: Signal<boolean>;
  /** Whether the picker is disabled. */
  readonly disabled: Signal<boolean>;
  /** Whether the picker is read-only. */
  readonly readonly: Signal<boolean>;
  /** Whether range mode is active. */
  readonly range: Signal<boolean>;
  /** Whether the panel renders modal (focus trap + backdrop). */
  readonly modal: Signal<boolean>;
  /** Min / max bounds (D | null). */
  readonly min: Signal<D | null>;
  readonly max: Signal<D | null>;
  /** Per-date disabling predicate. */
  readonly dateDisabled: Signal<(d: D) => boolean | undefined>;
  /** Locale BCP-47. */
  readonly locale: Signal<string>;
  /** Display format. */
  readonly format: Signal<KjDateFormatLike>;
  /** Edit format (focus mode). */
  readonly editFormat: Signal<string>;
  /** First day of week. 0..6 or null = derive from locale. */
  readonly firstDayOfWeek: Signal<number | null>;
  /** Stable id of the panel; combobox / toggle use for aria-controls. */
  readonly panelId: string;
  /** Stable id of the labelled element (input or toggle when no input). */
  readonly labelledElementId: Signal<string | null>;
  /** The focused date in the calendar (open-time seed). */
  readonly focusedDate: Signal<D | null>;
  /** Range-mode in-flight start (null when not editing range). */
  readonly rangeInFlight: Signal<D | null>;

  /** The date adapter — convenience access for child directives. */
  readonly adapter: KjDateAdapter<D>;

  /** Input registers itself once on init. */
  registerInput(el: HTMLInputElement, side: KjDatePickerSide | null):
    { id: string; deregister: () => void };
  /** Toggle registers itself once on init. */
  registerToggle(el: HTMLElement):
    { id: string; deregister: () => void };
  /** Panel registers itself once on init. */
  registerPanel(el: HTMLElement):
    { id: string; deregister: () => void };

  /** Open the panel. */
  openPanel(): void;
  /** Close the panel. `restoreFocus` defaults `true` for keyboard / select reasons. */
  closePanel(reason: KjDatePickerCloseReason, restoreFocus: boolean): void;
  /** Toggle. */
  togglePanel(): void;
  /** Commit a date selection from the calendar. Handles single + range. */
  selectDate(d: D): void;
  /** Commit a parsed value from a typed input. Side is null in single mode. */
  commitTypedValue(parsed: D | null, side: KjDatePickerSide | null): void;
  /** Programmatic clear. */
  clear(): void;
  /** Programmatic "today" jump (used by the button bar). */
  selectToday(): void;
  /** Set the focused date (used by Calendar's keyboard handler). */
  setFocusedDate(d: D): void;
}

export type KjDatePickerCloseReason =
  | 'select' | 'escape' | 'tab' | 'click-outside' | 'programmatic';

export const KJ_DATE_PICKER = new InjectionToken<KjDatePickerContext>('KjDatePicker');
```

### `hostDirectives` composition

- `[kjDatePicker]` (root):
  - `KjFormControl` — CVA, value, touched, disabled propagation.
  - `KjDisabled` (input alias `kjDisabled`).
  - **No** `KjFocusRing` on root — focus rings live on the input and toggle.
- `[kjDatePickerInput]`:
  - `KjVariant` (input alias `kjVariant`).
  - `KjSize` (input alias `kjSize`).
  - `KjDisabled` (input alias `kjDisabled`) — defaults to root's disabled
    via context.
  - `KjFocusRing`.
  - `KjAriaDescribedBy` — consumed by `KjField`'s describedby chain.
  - **No** `KjFormControl` on the input — root owns it.
- `[kjDatePickerToggle]`:
  - `KjVariant` (input alias `kjVariant`) — defaults to ghost.
  - `KjSize` (input alias `kjSize`).
  - `KjDisabled` (input alias `kjDisabled`).
  - `KjFocusRing`.
  - Capture-phase click suppression on disabled (mirrors `KjButton`).
- `[kjDatePickerPanel]`:
  - `KjAnchor` — anchored positioning math against the input or toggle.
  - `KjFocusTrap` (gated — applied only when `kjModal=true`).
  - `KjLiveRegion` — for the open / commit / parse-failure announcements.
  - **No** `KjRovingTabindex` on the panel itself — Calendar owns its
    own roving tabindex internally (see `calendar.md`).

### `KJ_FIELD` integration

In its constructor, `KjDatePicker` reads
`inject(KJ_FIELD, { optional: true })` and, when present, calls
`field.registerControl(...)` passing the **input's** element ref (or
toggle's, when `kjShowInput=false`). The field's auto-minted id becomes
the input's id; the field's `for=` on `<label kjFormLabel>` points at
the input; the field's `describedByIds()` flow onto the input via
`KjAriaDescribedBy`.

In range mode the field still registers a single control — the **start**
input (`kjSide='start'`) — for `for=` resolution. Both inputs share the
same field-described-by chain.

### Cross-component pointers

- **[`data-input/calendar.md`](./calendar.md)** — the inline grid family.
  **Date Picker projects `KjCalendar` into its panel.** Calendar's contract
  with Date Picker is documented in [Decision §3](#3-reuse-kjcalendar-rather-than-re-implement-the-grid)
  above. Calendar can also be used **standalone** (inline grid, no input,
  no popup) — that's the entire point of separating the two.
- **[`data-input/time-picker.md`](./time-picker.md)** *(planned)* — the
  parallel time-of-day picker (hour / minute / second selection). Common
  pairing: `<kj-date-picker> + <kj-time-picker>` side-by-side, or a
  combined `<kj-date-time-picker>` recipe that wires both into one form
  control. Time Picker is **not** integrated into Date Picker's panel by
  default — that path is a separate component because the value type
  (`Date` with significant time) and the keyboard model differ. PrimeNG
  conflates them via `showTime`; we don't.
- **[`data-input/field.md`](./field.md)** — owns label / error / describedby /
  required mirror. Date Picker is a **composite control** from Field's
  perspective: the registered "control element" is the input (or toggle).
- **[`data-input/form.md`](./form.md)** — higher-level form orchestrator.
  No direct coupling.
- **[`data-input/input.md`](./input.md)** — `[kjDatePickerInput]` reuses
  the same composition pattern (`KjFormControl`, `KjFocusRing`, `KjDisabled`,
  `KjVariant`, `KjSize`) but is its own directive — it does **not**
  attribute-stack `[kjInput]` because `kjInput` writes form-control values
  via its own effect (incompatible with the date-picker-owned CVA on the
  root).
- **[`data-input/number-input.md`](./number-input.md)** — Date Picker
  borrows the **display-vs-edit format swap** pattern wholesale. On focus,
  show the parseable edit-format; on blur, show the display-format.
  Identical state machine.
- **[`data-input/select.md`](./select.md)** — pattern reference for the
  combobox + dialog ARIA wiring, the root-owns-form-control decision,
  the `KjAnchor` consumption, the `KJ_FIELD` integration as a composite
  control. Read this first if anything below is unclear.
- **[`feedback/popover.md`](../feedback/popover.md)** *(planned)* — defines
  the shared `KjAnchor` primitive. Date Picker's panel consumes it for
  positioning math, side / align resolution, collision avoidance.
  **Date Picker blocks on this extraction.** Fallback: ship v0 with
  `data-side` / `data-align` reflection only and rely on theme CSS for
  positioning math (same fallback Select uses).
- **[`actions/button.md`](../actions/button.md)** — the toggle is a
  `KjButton` (composed via attribute stacking on the toggle directive's
  host element). The Today / Clear buttons in the panel button bar are
  also `KjButton`. Toggle inherits Button's variant / size / focus-ring
  / disabled handling.
- **[`navigation/menu.md`](../navigation/menu.md)** — *not* used. Some
  libraries implement the year-picker as a dropdown menu; we keep
  year/month switching inside the calendar (it's Calendar's own
  view-switcher), per `calendar.md`.

## Inputs / Outputs / Models — `kj`-prefixed

### Root directive (`KjDatePicker`, selector `[kjDatePicker]`)

| Name                  | Type                                              | Default        | Notes                                                                                          |
| --------------------- | ------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------- |
| `kjRange`             | `input(false)`                                    | `false`        | Flips value type to `[D, D]` and calendar to range mode.                                        |
| `kjMin`               | `input<D \| null>(null)`                          | `null`         | Lower bound. Inclusive. Type from registered `KjDateAdapter<D>`.                                |
| `kjMax`               | `input<D \| null>(null)`                          | `null`         | Upper bound. Inclusive.                                                                         |
| `kjDateDisabled`      | `input<(d: D) => boolean \| undefined>(() => false)` | `() => false` | Per-date disabling predicate. Returns truthy → un-selectable.                                  |
| `kjLocale`            | `input<string \| undefined>(undefined)`           | `LOCALE_ID`    | BCP-47.                                                                                         |
| `kjFormat`            | `input<KjDateFormatLike>('medium')`               | `'medium'`     | Display format (post-blur, panel-shut).                                                         |
| `kjEditFormat`        | `input<string>('yyyy-MM-dd')`                     | `'yyyy-MM-dd'` | Parse / edit format (focus, typing).                                                             |
| `kjFirstDayOfWeek`    | `input<0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| null>(null)` | `null`     | `null` = derive from locale.                                                                     |
| `kjDisabled`          | forwarded via `hostDirectives` to `KjDisabled`    | `false`        | Cascades to input + toggle.                                                                      |
| `kjReadonly`          | `input(false)`                                    | `false`        | Renders input read-only and toggle disabled; selection still visible.                            |
| `kjInvalid`           | `input(false)`                                    | `false`        | Touched-gated `aria-invalid` on the input.                                                      |
| `kjRequired`          | `input(false)`                                    | `false`        | Mirrors `Validators.required` to `aria-required` on the input. Auto-derived when bound.          |
| `kjModal`             | `input(false)`                                    | `false`        | Renders panel with `aria-modal="true"` + focus trap + backdrop.                                  |
| `kjCloseOnSelect`     | `input(true)`                                     | `true`         | Single mode: closes after select. Range mode: closes after second cell. `false` keeps open.      |
| `kjShowInput`         | `input(true)`                                     | `true`         | When `false`, input is `display: none` and toggle is the visible trigger.                        |
| `kjShowButtonBar`     | `input(false)`                                    | `false`        | Renders Today / Clear buttons in the panel.                                                      |
| `kjNumberOfMonths`    | `input(1)`                                        | `1`            | Side-by-side months in panel. Common: `2` for range pickers.                                    |
| `kjClampOnCommit`     | `input(false)`                                    | `false`        | When `true`, out-of-range typed values clamp to `kjMin` / `kjMax` on commit. Default leaves invalid. |
| `kjName`              | `input<string \| undefined>(undefined)`           | `undefined`    | Hidden input name(s) for native form postback.                                                   |
| `kjAriaLabel`         | `input<string \| undefined>(undefined)`           | `undefined`    | Used when no `KjField` parent and no external `aria-labelledby` is wired.                        |
| `kjOpened`            | `output<void>()`                                  | —              | Emits when panel opens.                                                                          |
| `kjClosed`            | `output<KjDatePickerCloseReason>()`               | —              | Emits with reason when panel closes.                                                              |
| `kjDateSelected`      | `output<D \| readonly [D, D]>()`                  | —              | Emits when value is committed (separate from `valueChange` so consumers can react to "user did pick" without firing on programmatic value writes). |

Bidirectional value flow goes through `KjFormControl` on the root —
`[(ngModel)]` / `[formControl]` work as expected. Value type is
`D | null` (single) or `[D | null, D | null]` (range). The default
adapter pins `D = Date`.

### Input directive (`KjDatePickerInput`, selector `[kjDatePickerInput]`)

| Name        | Type                          | Default    | Notes                                                                                            |
| ----------- | ----------------------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| `kjSide`    | `input<KjDatePickerSide \| null>(null)` | `null` | `'start'` / `'end'` for range mode. `null` for single mode.                                      |
| `kjVariant` | forwarded via `hostDirectives` | `'default'` | Validated against `KJ_DATE_PICKER_INPUT_CONFIG`.                                                  |
| `kjSize`    | forwarded via `hostDirectives` | `'md'`     | Validated against `KJ_DATE_PICKER_INPUT_CONFIG`.                                                  |
| `kjPlaceholder` | `input<string>('')`       | `''`       | Forwarded to native `<input [placeholder]>`.                                                     |

The input has no `kjValue` / `kjValueChange` — it reads from and writes
to `KJ_DATE_PICKER` context.

### Toggle directive (`KjDatePickerToggle`, selector `[kjDatePickerToggle]`)

| Name           | Type                        | Default     | Notes                                                                       |
| -------------- | --------------------------- | ----------- | --------------------------------------------------------------------------- |
| `kjVariant`    | forwarded via `hostDirectives` | `'ghost'` | Default to ghost (icon-only).                                               |
| `kjSize`       | forwarded via `hostDirectives` | `'md'`    | Inherits root size if not set.                                              |
| `kjAriaLabel`  | `input<string>('Choose date')` | `'Choose date'` | Accessible name; localised at consumer-time. |

### Panel directive (`KjDatePickerPanel`, selector `[kjDatePickerPanel]`)

| Name                  | Type                                                      | Default       | Notes                                                                                  |
| --------------------- | --------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------- |
| `kjSide`              | `input<'top' \| 'right' \| 'bottom' \| 'left'>('bottom')` | `'bottom'`    | Anchored side. Forwarded to `KjAnchor`.                                                 |
| `kjAlign`             | `input<'start' \| 'center' \| 'end'>('start')`            | `'start'`     | Anchored alignment.                                                                     |
| `kjOffset`            | `input(4)`                                                | `4`           | Pixels between trigger and panel.                                                       |
| `kjAvoidCollisions`   | `input(true)`                                             | `true`        | Flip / shift to fit viewport.                                                           |
| `kjMatchTriggerWidth` | `input(false)`                                            | `false`       | Calendars are wider than inputs; default off.                                           |

### Wrapper component (`KjDatePickerComponent`, selector `kj-date-picker`)

Re-exposes the root surface plus structural props for the rendered
template:

| Name                 | Type                       | Default   | Notes                                                                                       |
| -------------------- | -------------------------- | --------- | ------------------------------------------------------------------------------------------- |
| All root inputs      | (forwarded)                | —         | Same names, same types.                                                                      |
| `kjPanelClass`       | `input<string \| string[] \| undefined>(undefined)` | `undefined` | Custom classes on the rendered panel.                                                       |
| `kjToggleIcon`       | `input<TemplateRef<unknown> \| string \| null>(null)` | `null` | Custom toggle icon. Defaults to a built-in calendar SVG.                                    |
| `kjStartPlaceholder` | `input<string>('Start')`   | `'Start'` | Range mode start-side placeholder.                                                          |
| `kjEndPlaceholder`   | `input<string>('End')`     | `'End'`   | Range mode end-side placeholder.                                                            |

All `kj`-prefixed names follow shape (A) — property name carries the
prefix — since the directive selector already starts with `kj`.

## Examples to ship

Match the structure under `packages/components/src/select/` (which mirrors
`packages/components/src/button/`):

1. **Default** — `date-picker.example.ts`. Single-mode, defaults.
2. **Reactive form** — `date-picker.reactive.example.ts`.
   `formControl` with `Validators.required` + `kjDateMin` validator.
3. **Min / max** — `date-picker.min-max.example.ts`. `[kjMin]` / `[kjMax]`
   with disabled out-of-range cells.
4. **Per-date disabling** — `date-picker.disabled-dates.example.ts`.
   `kjDateDisabled` predicate disabling weekends.
5. **Range** — `date-picker.range.example.ts`. `[kjRange]="true"` with
   segmented input and `kjNumberOfMonths="2"`.
6. **Locale** — `date-picker.locale.example.ts`. `kjLocale="de-DE"` with
   "DD.MM.YYYY" display.
7. **In a field** — `date-picker.field.example.ts`. Inside `<kj-field>`
   with label + error.
8. **Button bar** — `date-picker.button-bar.example.ts`. Today / Clear.
9. **Modal** — `date-picker.modal.example.ts`. `kjModal="true"` with
   focus trap + backdrop.
10. **Toggle-only (no input)** — `date-picker.toggle-only.example.ts`.
    `kjShowInput="false"`, button is the visible trigger.
11. **Custom adapter** — `date-picker.date-fns.example.ts`. App config
    registers `provideKjDateAdapter(KjDateFnsAdapter)`; value is a
    `date-fns`-compatible Date with custom format token.
12. **Configured presets** — `date-picker.configured.example.ts`.
    Extends variant list with `brand` via `provideKjDatePicker(...)`.

## Open questions / risks

- **`<input type="text">` vs `<input type="date">` for the typed input.**
  `type="date"` gives free native picker, native parsing, and the
  browser's locale-aware ISO contract — but its UI is uncontrollable per
  browser, the visible format isn't customisable (Chrome shows `mm/dd/yyyy`
  in en-US regardless of `kjFormat`), and on iOS it triggers a wheel
  picker that competes with our own. **Decision: `type="text"`.** The
  trade-off is that we own parsing — the adapter handles that. Document
  loudly. (Material picks `type="text"` for the same reasons.)
- **Date adapter — ship now or punt?** Punting locks us to native `Date`
  in the public API; users coming from `date-fns` / `luxon` / Temporal
  hit a wall. **Decision: ship the abstraction now**, with only the
  native adapter implemented. `date-fns` and `luxon` adapters live in
  sibling packages added when consumers ask. The cost (one
  abstract class + one implementation) is small; the cost of un-shipping
  this later is huge.
- **Where does the date-fns adapter live?** Sibling package
  `@kouji-ui/date-fns-adapter` so it's not bundled with core. Ditto
  `@kouji-ui/luxon-adapter`, `@kouji-ui/temporal-adapter`. Each is a
  10-line module re-exporting the adapter class.
- **Two-input range vs single segmented input.** Material picks two
  inputs joined by a UI separator (`MatDateRangeInput` wraps
  `MatStartDate` + `MatEndDate`). Our wrapper achieves the same visual
  by rendering two `[kjDatePickerInput kjSide=...]` directives inside a
  single visual cell with an em-dash between them. **The directives are
  the same shape**; the wrapper composes the visual joining. This avoids
  a separate `<kj-date-range-picker>` component — ranges are a flag, not
  a different component. Trade-off: input ARIA (each `<input>` is
  separately a `combobox`) is two combobox elements, both pointing at
  the same panel. APG doesn't forbid this but it's unusual.
  Alternative: render *one* combined `<input>` whose value is
  "2025-01-01 — 2025-01-07" and parse the entire string. Material had
  this (`MatDateRangeInput.value` is a parsed range string) and it's
  hostile to type — typing `2025` then losing focus rejects the partial
  range. **Recommendation: two segmented inputs**, each its own
  combobox, sharing one panel. Document the two-combobox unusual-ness.
- **Calendar `role="grid"` vs `role="table"` vs no role.** APG date-picker
  example uses `role="grid"` with `role="row"` and `role="gridcell"`. PrimeNG
  uses no role (relies on button semantics per cell). Material uses
  `role="grid"`. **Decision: `role="grid"`** — matches APG. Owned by
  `KjCalendar`; not a Date-Picker concern beyond cross-reference.
- **`aria-modal="false"` non-modal vs `aria-modal="true"` with focus
  trap.** Material does the latter. APG combobox spec doesn't require
  modality. **Decision: non-modal default, `kjModal=true` opt-in.** The
  trap-focus default is hostile when the picker is one of many fields in
  a long form (Tab from the panel should advance the form, not bounce
  back into the calendar).
- **Multi-mode (multiple discrete dates).** PrimeNG ships
  `selectionMode='multiple'` (an array of dates, no range). Use cases:
  vacation-day picker, multi-day event editor. **Decision: defer to v1.1.**
  The complexity in the calendar (selection-toggle, focus model) is
  significant and the use case is narrower than range. When it lands,
  it's a separate `kjMode='multiple'` flag on the calendar (not on the
  date picker), and Date Picker exposes a `kjMultiple` flag that flips
  value to `D[]`.
- **Time of day inside the panel.** PrimeNG's `showTime` puts hour /
  minute spin inputs at the bottom of the panel. Useful for
  date-and-time fields. **Decision: ship as a separate `KjTimePicker`
  component.** Date Picker gets a `kjTimeSlot` template input where
  consumers can drop a `<kj-time-picker>` inside the panel; the time
  flows into the same form value (Date with significant time). This
  avoids `showTime` flag-explosion and keeps Date Picker's value
  type honest (date-only).
- **Hidden `<input>` for native form postback.** Like Select, we expose
  `kjName`. Value serialisation is ISO-8601 (`'2025-01-05'` for
  single, `'2025-01-05'` + `'2025-01-12'` in two hidden inputs for range).
  Time component dropped if present (postback is date-only).
- **`KjField` integration in range mode.** Field's `for=` points at the
  start input; the end input has its own `aria-label="End date"`.
  Error messages flow to *both* inputs via shared `aria-describedby`.
  Document the contract; Field doesn't need a special "two controls"
  mode (it stays one-control-per-field; the range case is an internal
  detail of Date Picker).
- **What does Esc do mid-range?** Two reasonable behaviours: (a)
  close panel and roll back to previous committed range; (b) close panel
  and clear the in-flight start (leaving previous range untouched).
  Material picks (a). PrimeNG picks (a). **Decision: (a)**.
- **Calendar day-cell labels announced as full date.** Each cell's
  `aria-label` is the fully-formatted date in the user's locale (e.g.
  "Wednesday, January 15, 2025"). Owned by `KjCalendar` — cross-reference
  only.
- **Server-side rendering.** The native `Intl.DateTimeFormat` is
  available in Node 12+ but the resulting strings differ between Node's
  ICU build and the browser's. Document: SSR'd format strings hydrate
  before client-side rendering may re-format identically — risk of
  hydration mismatch on locales whose Node ICU lacks the data. Mitigation:
  the panel and live-region announcements are client-only
  (`afterNextRender`), so only the input's blurred display value is
  rendered server-side. For rare ICU-mismatch locales, document that
  consumers should ship `full-icu`.
- **Time-zone handling.** Out of scope — Date Picker assumes the date
  is wall-clock in the consumer's locale. For time-zone-aware date
  selection, the consumer wraps with their own time-zone conversion
  layer (or uses Temporal via the Temporal adapter, which has zoned
  types). Document loudly.
- **Why no `inline` flag.** PrimeNG's `<p-datepicker inline>` is
  `<kj-calendar>` — those are separate components in our family. There
  is no inline mode of `KjDatePicker`. Document the migration in the
  README.
- **Two-character year typing (`'25'` → `2025`?).** Adapter responsibility.
  The native adapter expands `yy` → 20yy (Material's policy: "if yy is
  ≥ 50, century is 19xx; else 20xx" — the so-called Excel pivot).
  Document. Consumers needing different policies write a custom adapter
  or override the parser via `kjParse: input<((s, fmt, locale) => D | null)>`.
- **Cross-month / out-of-bounds typed dates.** The user types
  `'2099-12-31'` but `kjMax='2025-12-31'`. Two paths: (a) `kjClampOnCommit=true`
  silently clamps to max; (b) `kjClampOnCommit=false` (default) leaves
  the invalid value, marks `aria-invalid`, surfaces the validator error.
  **Decision: (b) default**. Clamping silently is a pit-of-failure for
  forms.
- **`kjDateSelected` output vs `valueChange`.** Both fire on user-driven
  selection; only `valueChange` (CVA) fires on programmatic write.
  Document explicitly to avoid double-handling.
- **Performance — calendar render cost on month change.** Calendar's
  concern. Date Picker just opens / closes the panel; the panel's
  `[hidden]` mount / unmount strategy is a separate question owned by
  `calendar.md` and the wrapper template. (`@if (open())` defers
  initial render of Calendar until first open; subsequent opens reuse.)
- **`kjMin` / `kjMax` typed dates that aren't valid in the adapter's
  representation.** The adapter validates in its `parse` / `compare`
  paths; bad input from the consumer (e.g. `kjMin=NaN as unknown as Date`)
  is undefined behaviour with a dev-mode console warning.
