# Time Picker

A **Time Picker** lets users select a time of day — hours and minutes
at minimum, optionally seconds and milliseconds, in either 24-hour or
12-hour-with-AM/PM presentation. The control is a small grid of
spinbuttons (one per time segment) plus an optional period toggle, with
optional bounds (`min` / `max` time-of-day) and a step constraint
(e.g. 15-minute increments).

This file resolves five design questions that shape every other decision:

1. **Visual style.** Three segmented spinbuttons (PrimeNG-ish), a styled
   native `<input type="time">`, or a clock-face dial (older Material)?
   See [Decision — visual style](#decision--visual-style).
2. **Composition.** One opaque `<KjTimePicker>` component or a directive
   family (`KjTimePicker` root + per-segment directives + period
   directive)? — see [Decision — composition](#decision--composition).
3. **Value model.** `Date` (most flexible, lossy w.r.t. timezone),
   `string` (`'HH:mm:ss'`), or a typed object `{ hour, minute, second }`?
   See [Value model](#value-model).
4. **24-hour vs. 12-hour.** Locale-driven default, with an explicit
   `kjHourCycle` override.
5. **Granularity & step.** Minute-only by default; opt into seconds /
   milliseconds; `kjMinuteStep` for coarse increments (15-minute slots).

Time Picker is the natural sibling of [Number Input](./number-input.md)
(each segment is a bounded numeric spinbutton) and [Date Picker](./date-picker.md)
(often combined as date+time in a single form control — see
[Date+time composition](#datetime-composition)). The strong recommendation
threaded through this analysis is **reuse the spinbutton primitive
already proved out by Number Input** rather than reimplementing
keyboard / ARIA / step logic per segment.

## Source comparison

### PrimeNG — bundled into `<p-datepicker [showTime]>`

PrimeNG does **not** ship a first-class time picker. Time entry lives
inside `<p-datepicker>` ([primeng.org/datepicker](https://primeng.org/datepicker))
as the `[showTime]="true"` and `[timeOnly]="true"` flags. `[timeOnly]`
hides the calendar grid and renders only the time strip — a panel of
two (or three) up/down stepper pairs over read-only numeric labels for
hours / minutes / (seconds), plus a separate AM/PM toggle when
`[hourFormat]="'12'"`.

Public time-related surface:

| Input             | Notes                                                                                |
| ----------------- | ------------------------------------------------------------------------------------ |
| `showTime`        | Enables the time strip alongside the calendar.                                        |
| `timeOnly`        | Hides the calendar; only the time strip is rendered.                                  |
| `hourFormat`      | `'12' \| '24'`. Drives AM/PM presentation. No locale fallback.                        |
| `showSeconds`     | Adds the seconds spinner pair.                                                        |
| `stepHour` / `stepMinute` / `stepSecond` | Per-segment increment step (default `1`).                              |
| `defaultDate`     | Seed value when the model is `null`.                                                  |
| `disabled` / `readonly` | State.                                                                          |

Behaviour worth lifting:

- **Per-segment up/down buttons.** Each segment renders as
  `[up-button] [HH] [down-button]` stacked vertically. Click steps,
  long-press auto-repeats. No keyboard arrow handling on the *segment
  text* itself — it is a passive `<span>` rather than a focusable
  spinbutton. See critique below.
- **Read-only segment text.** The HH / MM / SS labels are not typeable;
  the only inputs are the buttons. Minimises parsing surface, but
  abandons the typing affordance keyboard users want.
- **Step per segment.** Independent `stepHour` / `stepMinute` /
  `stepSecond` is the right shape — kouji adopts it.

Critique:

- **Bundled, not first-class.** A consumer who wants only a time picker
  pays the date-picker bundle cost and gets a control whose API and DOM
  shape were designed for the date-picker. The time-only case deserves
  its own component.
- **No `role="spinbutton"` on segments.** The HH / MM / SS labels are
  inert `<span>`s; the up/down buttons are `<button>`s. AT users hear
  "increase, decrease, increase, decrease" with no value context. Fails
  the WAI-ARIA APG **Spinbutton** pattern (<https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/>).
- **No keyboard typing.** You cannot focus the HH text and type `09`;
  you must mash the up arrow nine times. This is the most concrete
  improvement over PrimeNG.
- **No arrow-key step from the segment.** Because segments aren't
  focusable, arrow keys only fire when a stepper button has focus.
- **No min/max time bounds.** PrimeNG's `min` / `max` are date bounds,
  not time-of-day bounds. A "08:00–18:00 only" constraint requires
  custom validation.
- **AM/PM as a separate toggle button** rather than a segment in the
  same focus order. Acceptable but inconsistent with how AT users walk
  the control.
- **Long-press auto-repeat at constant rate** (no acceleration).

### Angular Material — `<mat-timepicker>`

Material ships a first-class **timepicker** as of v19+
([material.angular.dev/components/timepicker](https://material.angular.dev/components/timepicker)).
The shape is:

```html
<mat-form-field>
  <mat-label>Time</mat-label>
  <input matInput [matTimepicker]="picker" [(ngModel)]="time" />
  <mat-timepicker-toggle matSuffix [for]="picker" />
  <mat-timepicker #picker />
</mat-form-field>
```

Key shape:

- **Text input as the value-bearing surface.** The `<input>` displays
  the formatted time string (e.g. `"08:30 AM"`); `matTimepicker`
  attaches keyboard parsing + the toggle popover. The `<mat-timepicker>`
  panel is an option-list popover (every 30 minutes by default) — *not*
  a clock dial, *not* spinbuttons.
- **Option-list panel.** The popover renders as a `role="listbox"` of
  pre-generated time options at `interval` granularity (default
  `30min`). The user picks one with arrow keys + Enter. This is the
  big shift from older Material — the clock-face dial is gone.
- **`interval`, `min`, `max`.** `interval` is a duration-shaped string
  (`'30min'`, `'15min'`, `'1h'`). `min` / `max` accept locale-parsed
  time strings or `Date` values; out-of-range options are filtered.
- **Free-typed values are accepted.** Typing `"08:37"` commits `08:37`
  even though it isn't on the 30-minute grid. The grid is only the
  panel suggestion.
- **Form integration via `MatTimepickerInput`.** The directive on the
  `<input>` is the CVA. Value model is **`Date`** by default (Material's
  `DateAdapter` abstracts), but `MAT_DATE_FORMATS` controls parse /
  display.
- **`<mat-timepicker-toggle>`** — opens the panel. Same pattern as the
  date-picker toggle.

Behaviour worth lifting:

- **Typing as first-class.** The input is the labelled element; the
  popover is an *aid*, not the only path. AT users can type
  `"08:37 AM"` and tab away.
- **Locale-driven 24h/12h.** The `DateAdapter` chooses based on the
  injected locale. No `hourFormat` flag at the consumer level (though
  `MAT_DATE_FORMATS` overrides).
- **`interval` for coarse times.** A common request — "give me 15-minute
  slots only" — collapses to one input. kouji's `kjMinuteStep` mirrors
  this.
- **Min / max.** First-class time bounds, not date bounds.

Critique:

- **No segmented spinbutton DOM.** The `<input>` is a single text field
  parsed by `DateAdapter`. There is no per-segment focus, no per-segment
  ARIA, no Tab between H / M / S. AT users get one big text field.
  This is a deliberate simplification but loses the granular spinbutton
  contract.
- **`Date`-shaped value forces a date.** A user picking just `08:30` ends
  up with a `Date` whose date part is "today" (or the start of epoch,
  depending on adapter). For pure time-of-day this is awkward — see
  [Value model](#value-model) for the kouji decision.
- **Listbox panel doesn't scale.** At `interval='1min'` and a 24-hour
  range, the panel renders 1440 options. Material falls back to virtual
  scroll, but the UX is poor — picking from a 1440-row list is worse
  than typing.
- **No clock-face fallback.** Older Material (pre-MDC, MatLegacy) had a
  clock dial; the new component dropped it. Touch users on small screens
  may want it back. We don't ship it either, but flag as future work.
- **Toggle button on the suffix slot only.** No way to bind the panel to
  a different trigger.

### Older Angular Material — clock-face dial (legacy)

The pre-MDC Material time picker rendered a clock face: an analogue dial
with a draggable hand for hours, then a second pass for minutes. It was
removed because (a) maintenance cost was high, (b) the AT story was
poor (no good ARIA pattern for "drag a hand around a circle"), and (c)
typing was always faster. We do not ship a clock dial — option-list and
segmented-spinbutton each beat it on every axis except "feels native on
Android". If a consumer needs it, they own the rendering on top of our
headless directive.

### shadcn/ui — no first-class time picker

shadcn ([ui.shadcn.com/docs/components/input](https://ui.shadcn.com/docs/components/input))
ships a generic `<Input />`; the community pattern for time picking is
either:

1. **`<Input type="time">`** — native browser time input. Zero JS,
   inconsistent UI per browser, no locale formatting, no step beyond
   what the browser supports.
2. **Three numeric `<Input>`s** (HH / MM / [SS]) glued together with
   custom focus rotation — community blog posts.
3. **A popover with two scrolling columns** (Lucide-icon + custom
   scroll-snap) — the trendy "iOS picker" recipe.

There is no canonical recipe and no a11y story across the three. The
takeaways for kouji:

- **Native `type="time"` is a credible fallback** for trivial use.
  Worth exposing under an opt-in, the same way `[kjNumberInput]` exposes
  `kjUseNativeNumber`.
- **The "three siblings + focus rotate" recipe is the right structural
  shape** — segments are the atomic focusable unit. shadcn doesn't ship
  it, but kouji's directive family does.

### Cross-library summary

|                          | PrimeNG (`p-datepicker[timeOnly]`) | Angular Material (`mat-timepicker`) | shadcn (recipe)                | kouji direction                                                   |
| ------------------------ | ---------------------------------- | ----------------------------------- | ------------------------------ | ----------------------------------------------------------------- |
| First-class component    | no — bundled                       | yes (v19+)                          | no                             | **yes** — `KjTimePicker` directive family                        |
| Visual style (default)   | three segmented spinbuttons         | text input + listbox popover        | varies (native / siblings)     | **three segmented spinbuttons** (typeable + arrow-steppable)     |
| Native `<input type=time>` fallback | no                       | no                                  | community                      | **opt-in** via `kjUseNativeTime`                                  |
| 24h vs 12h               | `hourFormat="12 \| 24"`            | locale-driven (`DateAdapter`)        | n/a                            | **locale-driven default**, `kjHourCycle` overrides                |
| Seconds                  | `showSeconds`                      | locale / format                      | manual                         | `kjShowSeconds`                                                   |
| Milliseconds             | no                                 | no                                  | manual                         | `kjShowMs` (rare; opt-in)                                          |
| Step (per segment)       | `stepHour` / `stepMinute` / `stepSecond` | `interval` (single combined)  | manual                         | `kjMinuteStep` (canonical) + `kjHourStep` / `kjSecondStep`        |
| Min / max time-of-day    | no (date only)                     | yes                                 | manual                         | **yes** — `kjMin` / `kjMax` accept time-of-day or `Date`           |
| Typing into segment      | no                                 | yes (whole input)                    | recipe                         | **yes** — each segment accepts numeric typing                      |
| Per-segment `role="spinbutton"` | no                          | n/a (single input)                   | no                             | **yes** — APG-compliant                                            |
| Arrow-key step on segment | no                                 | yes (panel; not segment)             | recipe                         | **yes** — directly on segment                                      |
| Long-press auto-repeat   | yes (constant)                     | n/a                                  | no                             | **yes, accelerating** (reused from Number Input stepper)           |
| Form integration         | CVA (date-picker)                  | CVA (`MatTimepickerInput`)           | controlled React               | **`KjFormControl`** via host directive                             |
| Value model              | `Date`                             | `Date`                                | string                         | **`Date` by default**, `kjValueShape` opts into `'string' \| 'parts'` |

## Decision — visual style

**Three segmented spinbuttons** as the kouji default. Each segment is a
focusable text-typeable element with `role="spinbutton"`, paired with
optional up/down stepper buttons. The DOM looks roughly:

```
[ HH ] : [ MM ] : [ SS ]   [ AM ▾ ]      ← segments + AM/PM toggle (when 12h)
```

Justification (in priority order):

1. **A11y story is the strongest of the three.** Each segment exposes
   `role="spinbutton"` + `aria-valuemin/max/now/text`. AT announces
   "hours spinbutton, 8, between 0 and 23". Tab moves between segments.
   The native `<input type="time">` cannot match this contract because
   browsers expose it as a single text field, and the clock dial cannot
   match it at all (no good APG pattern).
2. **Keyboard parity with Number Input.** Each segment behaves like a
   `[kjNumberInput]` with custom min/max and a wrap-around increment.
   Reusing the same keyboard contract (Arrow / Page / Home / End,
   long-press stepper acceleration) keeps the cross-component feel
   consistent and reuses tested code paths. See
   [Composition — segment reuse](#composition--segment-reuse).
3. **Typing is fast.** Power users want to type `0830`. The directive
   auto-advances focus on a 2-digit completion, so typing `0` → `8`
   commits `08` to hours and rotates focus to minutes; typing `3` →
   `0` commits `30` to minutes. Auto-rotation is opt-out (`kjAutoAdvance`).
4. **Locale formatting via separator slot.** The colon between segments
   can be a localised character (Arabic uses `:` too, but punctuation
   variations exist for some locales — handled by the separator
   element which the wrapper sets from `Intl.DateTimeFormat`).
5. **No popover required.** The control is inline in the form layout,
   not behind a click. Matches what most form designers want for a
   single time field. (Date+time combos add a popover via the date-picker.
   See [Date+time composition](#datetime-composition).)

The native `<input type="time">` is a **fallback** under
`kjUseNativeTime: input<boolean>(false)` — the same pattern as
`kjUseNativeNumber` on Number Input. Mobile-only forms where keyboard
real-estate trumps polish are the use case.

The clock-face dial is **not shipped**. If a consumer wants it, they
render it themselves on top of the headless `KjTimePicker` context
(reading `value`, calling `setValue`).

## Decision — composition

A **directive family** of five, mirroring Number Input's three-directive
shape:

| Directive                  | Element                  | Role                                                                                              |
| -------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------- |
| `[kjTimePicker]`           | `<div>` (wrapper)        | Owns the time value, min/max, step config, focus orchestration, and `KjFormControl` integration. **Provides `KJ_TIME_PICKER` context.** |
| `[kjTimePickerHour]`       | `<input>` or `<span tabindex>` | Hour segment. `role="spinbutton"`, min 0/1, max 11/12/23 depending on `hourCycle`. Owns hour typing + step. |
| `[kjTimePickerMinute]`     | `<input>` or `<span tabindex>` | Minute segment. min 0, max 59. Owns minute typing + step.                                  |
| `[kjTimePickerSecond]`     | `<input>` or `<span tabindex>` | Second segment, optional. min 0, max 59.                                                    |
| `[kjTimePickerPeriod]`     | `<button>` or `<select>` | AM/PM toggle. Only renders when `hourCycle = '12'`. `role="combobox"` if rendered as a 2-option dropdown; else a 2-state toggle button with `aria-pressed`. |

The wrapper is the value-owning, form-control-bearing element. The
segments are *display + interaction* surfaces that read/write through
the context. This is the same layered shape as Number Input
(`KjNumberInput` value-bearing input + `KjNumberStepper` button) but
with **more siblings** because time-of-day is structurally multi-part.

### Why a directive family rather than one component

1. **Different ARIA contracts on different elements.** Each segment
   needs its own `aria-valuemin/max/now/text`; the period toggle needs
   either `aria-pressed` (toggle) or `aria-expanded` + `aria-controls`
   (dropdown). A monolithic component cannot reflect five sets of ARIA
   to five elements without `Renderer2` reaches.
2. **Independent focusability.** Each segment is its own tab stop *or*
   its own roving-tabindex stop (see
   [Focus model](#focus-model)). Composition gives each its own
   directive boundary.
3. **Layout flexibility.** Consumers want to vary the separator
   character, swap colons for dots, hide seconds, render AM/PM before
   hours (right-to-left locales), or wrap segments in a custom shell.
   A directive family gives the consumer the DOM; the headless logic
   is shared via the context.
4. **Reuse of Number Input's spinbutton primitive.** Each segment
   directive is, internally, a constrained `[kjNumberInput]` plus
   wrap-around + auto-advance. See next section.

### Composition — segment reuse

Each segment directive reuses the spinbutton machinery from Number
Input. Concretely, `[kjTimePickerHour]` / `[kjTimePickerMinute]` /
`[kjTimePickerSecond]` are **thin wrappers around `[kjNumberInput]`**:

- They compose `KjNumberInput` via `hostDirectives` with hard-coded
  bounds (`kjMin` / `kjMax`) per segment + `kjAllowDecimals=false` +
  `kjAllowNegative=false` + leading-zero pad.
- They override the wrap-around behaviour: typing `60` in minutes
  rolls over to `00` and increments hours by one (when `kjAutoCarry`
  is true — default). Typing `25` in hours (24h cycle) rolls over to
  `01`. Number Input clamps; the segment wraps. The wrap-and-carry
  logic is the segment's job, not Number Input's.
- They override the focus-rotate behaviour: a 2-digit segment that
  reaches 2 typed digits (or whose internal value crosses the
  carry boundary) commits and advances focus to the next segment via
  the time-picker context.
- They override the format: always 2-digit zero-padded display
  (`"08"`, not `"8"`). Number Input's `kjMinimumIntegerDigits=2`
  achieves this.

This reuse is the strong recommendation flagged in
[`number-input.md`](./number-input.md#cross-component-pointers) and
realised here.

The **alternative** — a dedicated `[kjDateSegment]` primitive shared by
both Time Picker and Date Picker — is the right shape if Date Picker's
year/month/day segments diverge enough from Number Input. Decision:
**ship segments as `hostDirectives:[KjNumberInput]` wrappers in v1**;
extract `KjDateSegment` to `packages/core/src/primitives/date-segment/`
when Date Picker lands, if both consumers have aligned needs. Defer the
extraction; do not pre-build it.

### Why a wrapper provides the context

The wrapper is the natural value owner because:

- Time-of-day is a single CVA value (`Date | string | parts`); the
  segments are projections of that value, not independent CVAs.
- Validation (`kjMin` / `kjMax`, `kjMinuteStep`) is cross-segment —
  validating `08:32` against `kjMinuteStep=15` requires knowing
  the minute value, but reporting "invalid" is a property of the whole
  field.
- Form-error wiring through `[kjField]` ([`field.md`](./field.md))
  needs a single labelled element — the wrapper plays that role
  (`role="group"` with `aria-labelledby` from the field's label).

## Base features

### Underlying segment input mode

Segments use **`type="text"` with masking** by default (delegated to the
composed `[kjNumberInput]`'s mask). Per-segment `inputmode="numeric"` is
applied. The segment can also be implemented as a non-`<input>` element
(`<span tabindex="0">` with an `[attr.role]="spinbutton"`); the
directive must work on either. The wrapper renders `<input>`s by default
because they get the on-screen keyboard for free on mobile.

Opt-in `kjUseNativeTime: input<boolean>(false)` switches the entire
control to a single `<input type="time">` and disables the directive
family. The wrapper degrades to a single CVA-bridged native input. All
locale, step, and min/max inputs are then ignored at runtime; dev-mode
warns once if any are set (mirrors Number Input's `kjUseNativeNumber`
warning).

### Value model

The CVA model is **`Date` by default** with two opt-in alternatives via
`kjValueShape`:

| `kjValueShape`     | Type                                                                  | Notes                                                                                                                       |
| ------------------ | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `'date'` (default) | `Date \| null`                                                         | Most flexible; pairs naturally with date+time combos. Date part is set to the provided `kjReferenceDate` (default: today). |
| `'string'`         | `string \| null` — ISO 8601 time form `'HH:mm'` / `'HH:mm:ss'` / `'HH:mm:ss.SSS'` | No date part. Format chosen from `kjShowSeconds` / `kjShowMs`.                                                              |
| `'parts'`          | `{ hour: number; minute: number; second?: number; ms?: number } \| null` | Fully typed object. Hour is always 0–23 internally even in 12h display.                                                     |

Why `Date` is the default:

- **Pairs with Date Picker.** When a form has a date+time combo, both
  controls collaborate on the same `Date` (see
  [Date+time composition](#datetime-composition)). `'string'` would force
  manual joining.
- **Native bindings.** `Intl.DateTimeFormat` and most back-end JSON
  serialisers speak `Date`.
- **Distinguishable null.** `null` cleanly means "empty"; an empty
  string means the same but is conventionally weaker.

Why expose `'string'` and `'parts'`:

- **Backend-only consumers** want `'HH:mm'` directly without a `Date`
  detour and without a timezone hazard.
- **Typed-object consumers** want compile-time guarantees and explicit
  fields.

Internal storage is always `parts`; serialisers convert to the
consumer-facing shape on the CVA boundary.

### Hour cycle (24h vs 12h)

`kjHourCycle: input<'h11' | 'h12' | 'h23' | 'h24' | 'auto'>('auto')`,
following the [`Intl.Locale.hourCycle`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/hourCycle)
nomenclature:

- `'auto'` (default): derived from `kjLocale ?? LOCALE_ID`. `en-US`
  picks `h12`; `de-DE`, `fr-FR`, `ja-JP` pick `h23`. Implementation:
  `Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle`.
- `'h11'`: 0–11 + AM/PM (rare; valid for some Asian locales).
- `'h12'`: 1–12 + AM/PM (US-style).
- `'h23'`: 0–23 (24h, leading zero).
- `'h24'`: 1–24 (rare; midnight is `24`).

The period toggle (`KjTimePickerPeriod`) renders **only when**
`hourCycle ∈ {'h11', 'h12'}`.

Internal hour is always 0–23 in the `parts` representation; the segment
directive does the display conversion (display hour = `((h + 11) % 12) + 1`
for `h12`, etc.). This keeps min/max comparisons and validation logic
single-pathed.

### Granularity

| Input            | Type      | Default | Notes                                                                                                  |
| ---------------- | --------- | ------- | ------------------------------------------------------------------------------------------------------ |
| `kjShowSeconds`  | `boolean` | `false` | Renders the seconds segment.                                                                            |
| `kjShowMs`       | `boolean` | `false` | Renders the milliseconds segment (3-digit). Implies `kjShowSeconds=true`. Rare; opt-in.                  |

Default precision: minute. This matches the dominant form use case
(scheduling, opening hours, departures). Consumers who want second
precision flip `kjShowSeconds`.

When `kjShowMs=true` and `kjShowSeconds=false`, a dev-mode warning fires
once and `kjShowSeconds` is forced to `true`. Hiding seconds while
showing milliseconds is incoherent.

### Step constraint

| Input             | Type     | Default | Notes                                                                                                  |
| ----------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------ |
| `kjHourStep`      | `number` | `1`     | Hour increment. Must divide 24 (`1, 2, 3, 4, 6, 8, 12`) for clean lattice; not enforced.                |
| `kjMinuteStep`    | `number` | `1`     | Minute increment. Common values: `5`, `10`, `15`, `30`. Must divide 60 for clean lattice; not enforced. |
| `kjSecondStep`    | `number` | `1`     | Second increment.                                                                                       |
| `kjMsStep`        | `number` | `1`     | Millisecond increment.                                                                                  |

Per-segment step is the right granularity (PrimeNG's shape, not
Material's combined `interval`). A consumer who wants "every 15
minutes" sets `kjMinuteStep=15`; the minute segment then steps `00 →
15 → 30 → 45 → 00 (carry)`. Free-typed minutes off the lattice (e.g.
`23`) are accepted but `aria-invalid` flips when `kjStrictStep=true`.

`kjStrictStep: input<boolean>(false)` — when `true`, free-typed values
that don't fall on the lattice are rejected on commit and snap to the
nearest lattice value (mirrors PrimeNG `stepMinute` clamping). When
`false` (default), the lattice only governs stepper-button increments;
typing is unconstrained. The Material default is the latter.

### Min / max bounds

| Input    | Type                        | Default     | Notes                                                                                                |
| -------- | --------------------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| `kjMin`  | `Date \| string \| TimeParts \| undefined` | `undefined` | Lower bound. Accepts the same shapes as the value model. Compared on time-of-day only (date part ignored). |
| `kjMax`  | `Date \| string \| TimeParts \| undefined` | `undefined` |                                                                                                       |

Bounds wrap correctly for "08:00–02:00" overnight ranges:
`kjMin > kjMax` means "outside [max, min]" — i.e., `08:00–23:59` ∪
`00:00–02:00`. Common for night shifts. Document loudly because it is
the surprise.

Out-of-range values: same policy as Number Input — clamp on commit, not
on type. Consumers who want strict-on-type set
`kjClampOnType: input<boolean>(false)` (mirrors Number Input's escape
hatch).

### Locale formatting

`Intl.DateTimeFormat(locale, options)` drives the *display* of any
literal characters around segments (separators, AM/PM strings). The
segments themselves are zero-padded numerics rendered by the directive.
Locale concerns:

- **Separators.** `Intl.DateTimeFormat` `formatToParts` returns the
  literal characters between hour/minute/second tokens. The wrapper
  reads these to render the colon (or alternative).
- **AM/PM strings.** Locale-specific (`'AM' / 'PM'` in `en`, `'午前' /
  '午後'` in `ja`, etc.). The period directive's display string is
  pulled from `formatToParts` `dayPeriod` parts.
- **Right-to-left locales.** Hebrew, Arabic. The wrapper sets
  `dir="ltr"` on the segment row by default — time-of-day digits are
  always LTR even in RTL locales (per Unicode bidi). The label and AM/PM
  position follow the document's bidi.
- **Non-ASCII digits.** `'ar-EG'` formats numbers as `'٠٨:٣٠'`. The
  segment must accept both Arabic-Indic and Western digits on type and
  display in the locale's preferred set. Reuses Number Input's
  digit-normalisation policy (parse both, store Western).

### Reference date

`kjReferenceDate: input<Date | undefined>(undefined)` — when
`kjValueShape='date'`, the date part of the emitted `Date` object.
Defaults to "today at 00:00:00.000". Use cases:

- **Date+time combo:** the date-picker writes its date into a shared
  `kjReferenceDate` so the time-picker emits dates on the right day.
- **Backend epoch:** consumers who store time-of-day as a `Date` since
  epoch (rare) set `kjReferenceDate=new Date(0)`.

### Auto-advance and carry

| Input              | Type      | Default | Notes                                                                                                  |
| ------------------ | --------- | ------- | ------------------------------------------------------------------------------------------------------ |
| `kjAutoAdvance`    | `boolean` | `true`  | After 2 digits typed in a segment (or 3 in ms), commit and move focus to the next segment.              |
| `kjAutoCarry`      | `boolean` | `true`  | Stepper presses that overflow a segment carry into the next (e.g. `59 → 00 minutes` increments hours). |
| `kjWrapInsideSegment` | `boolean` | `true`  | Stepping past the segment max wraps to the segment min (without carry, when `kjAutoCarry=false`).        |

These are independent. Auto-advance is a focus concern; auto-carry is a
value concern. With both `false`, the control behaves like three
independent number inputs constrained to time bounds (Material's free-
typing behaviour minus the listbox).

### Period directive (`[kjTimePickerPeriod]`)

`KjTimePickerPeriod` renders as either:

1. **A 2-state toggle button** (`<button>` with `aria-pressed`).
   Default. One press flips `AM ↔ PM`. Tabable, focusable, click and
   Enter / Space activate.
2. **A select-style dropdown** (when wrapped with `[kjSelect]`) — opt-in
   for locales with > 2 day periods (rare; e.g. some Asian locales
   distinguish morning / afternoon / evening). Defers to `[kjSelect]`'s
   listbox a11y story.

Default: toggle button. The wrapper picks based on the locale's
`dayPeriod` count from `Intl.DateTimeFormat.formatToParts`.

When `hourCycle ∉ {'h11', 'h12'}`, the period directive is structurally
absent from the DOM (the wrapper does not project it). Stepping the
hour past 23 wraps to 00; the period flag is ignored entirely.

## Accessibility (WCAG 2.1 AAA)

### Roles

| Element                           | Role                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| `[kjTimePicker]` host (`<div>`)   | `group`. Labelled by `[kjField]`'s label via `aria-labelledby`. The group conveys "these segments are one logical control".  |
| `[kjTimePickerHour]` host         | `spinbutton`. `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`.          |
| `[kjTimePickerMinute]` host       | `spinbutton`. Same wiring.                                                                  |
| `[kjTimePickerSecond]` host       | `spinbutton`. Same wiring.                                                                  |
| `[kjTimePickerPeriod]` host (toggle) | `button` with `aria-pressed`.                                                              |
| `[kjTimePickerPeriod]` host (dropdown) | `combobox` with `aria-expanded` / `aria-controls` (delegated to `[kjSelect]`).            |

Reference: WAI-ARIA APG **Spinbutton**
(<https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/>) for segments.
Toggle button per APG **Toggle Button**
(<https://www.w3.org/WAI/ARIA/apg/patterns/button/>).

### ARIA wiring

On the wrapper (`[kjTimePicker]`):

- `role="group"`.
- `aria-labelledby` — auto-wired by `[kjField]` to the field label id.
- `aria-describedby` — auto-wired by `[kjField]` for helper / error
  text.
- `aria-invalid` — reflects `formCtrl.touched() && (formCtrl.invalid()
  || outOfRange() || stepViolation())`.
- `aria-required` — reflected from `KjFormControl` when
  `Validators.required` is applied.
- `aria-disabled` — reflected from `KjDisabled`.
- `aria-readonly` — reflected from `kjReadonly`. Forwarded to each
  segment.

On each segment (`[kjTimePickerHour]` / `Minute` / `Second`):

- `role="spinbutton"`.
- `aria-valuemin` / `aria-valuemax` — segment-specific (0/23, 1/12, 0/59).
- `aria-valuenow` — current numeric segment value (display value in 12h
  for hour; 0–23 internally is fine for AT but display value is more
  intuitive — see Open Questions).
- `aria-valuetext` — formatted display string. For hour:
  `"08"` (h23) or `"8 AM"` (h12 — includes period for context). For
  minute: `"30 minutes"`. The trailing word is locale-driven via
  `Intl.DisplayNames` where possible, fallback to a locale message
  table.
- `aria-label` — segment name. Auto-set by the directive: `"Hours"` /
  `"Minutes"` / `"Seconds"` from a locale message table. Consumers
  override via `kjAriaLabel` per segment for non-standard locales.
- `aria-describedby` — inherits the wrapper's describedby chain (so the
  field's helper text is announced when each segment receives focus —
  configurable via `kjFieldDescribesSegments: input<boolean>(true)`,
  default `true`). When `false`, only the wrapper carries describedby
  and AT users hear it once on group entry.
- `aria-invalid` — set per segment when that segment's value is
  out-of-range (e.g. typed `61` in minutes) or violates step. Mirrors
  Number Input.
- `aria-disabled` — reflected from wrapper's `KjDisabled`.

On the period directive (`[kjTimePickerPeriod]`, toggle mode):

- `role="button"` (implicit on `<button>`).
- `aria-pressed="true|false"` — `true` for PM.
- `aria-label` — `"Toggle AM/PM"` or locale equivalent. Consumer can
  override.

### Keyboard contract

| Key               | When focus is on…                | Behaviour                                                                                          |
| ----------------- | -------------------------------- | -------------------------------------------------------------------------------------------------- |
| Digit             | segment                          | Append to the segment's typing buffer; if 2 digits typed (or buffer would exceed max), commit + (when `kjAutoAdvance`) advance to next segment. |
| `Backspace`       | segment                          | Remove the last digit from the typing buffer. If empty and at start, move focus to previous segment. |
| `ArrowUp`         | segment                          | Step the segment by `kjXStep` (with `kjAutoCarry` rolling over). Repeats on key-hold.               |
| `ArrowDown`       | segment                          | Step the segment by `-kjXStep`. Repeats on key-hold.                                                 |
| `PageUp`          | segment                          | Step by `kjXStep * 10` (or per-segment override) — commonly hours `+12`, minutes `+15`. Configurable. |
| `PageDown`        | segment                          | Inverse.                                                                                              |
| `Home`            | segment                          | Set segment to its min (0 or 1).                                                                     |
| `End`             | segment                          | Set segment to its max (23, 12, 59).                                                                  |
| `:` / `.` / locale separator | segment                  | Commit current segment and advance to next. Same as auto-advance trigger.                            |
| `Tab`             | segment                          | Move focus to next segment within the wrapper, or out of the wrapper if on the last segment.         |
| `Shift+Tab`       | segment                          | Move focus to previous segment, or out backward if on the first.                                      |
| `Enter`           | segment                          | Commit current buffer (no submit unless inside a `<form>` whose default-submit applies). Does not advance focus.  |
| `Escape`          | segment                          | Reset segment buffer to last committed value. Does not collapse focus.                                |
| `ArrowLeft` / `ArrowRight` | segment                  | When the segment is `<input>`, default text-cursor behaviour. When the buffer is empty or at edge, move focus to adjacent segment (mirrors Material's date-picker segment behaviour). |
| `Enter` / `Space` | period toggle (`[kjTimePickerPeriod]`) | Toggle AM ↔ PM.                                                                                |
| `ArrowUp` / `ArrowDown` | period toggle              | Toggle AM ↔ PM.                                                                                       |
| (pointerdown-hold) | optional stepper button (`[kjNumberStepper]`) | Long-press auto-repeat (reuses Number Input behaviour exactly).                          |

### Focus model

Two valid models. Decision: **Tab moves between segments by default**
(no roving). Rationale:

- A keyboard-only user often wants to skip directly from minutes to
  the next field below (Tab once if minutes is the last segment, twice
  if seconds are present). Roving forces them out via a single Tab
  *plus* an extra Tab back-into-the-control on Shift+Tab — surprising.
- AT users on mobile (where Tab is rare) navigate with swipe-right /
  swipe-left, which respects DOM focus order; Tab and roving would
  behave identically there.
- The roving model is appropriate for things like radio groups where
  there is exactly one logical value, with multiple presentations.
  Time-picker segments are *multiple values*; they each deserve a tab
  stop.

When the consumer wants roving (e.g. for compactness inside a wider
toolbar), `kjFocusModel: input<'tabs' | 'roving'>('tabs')` opts in.
`'roving'` makes the wrapper itself the tab stop and segments inside
use ArrowLeft/Right to move.

### Touch target (WCAG 2.5.5 AAA — 44×44 CSS px)

Each segment's hit area must be ≥ 44×44 CSS px. This is the wrapper's
job (CSS padding around each segment's text). The headless directive
does not enforce; documents the requirement.

Stepper buttons (when projected) inherit Number Input's stepper
size requirement (`kjButton kjSize="icon"` ≥ 44×44).

Period toggle button inherits `KjButton`'s size minimum.

### Live region for announcements

`aria-valuetext` updates announce segment value changes. No additional
`aria-live` region is needed for stepping. For carry events ("minute
59 → 00, hour incremented to 09"), AT hears the new minute valuetext
*and* loses focus on the hour change — so the hour increment is *not*
announced. Mitigation: when carry fires, the wrapper sets a hidden
`aria-live="polite"` message via `KjLiveRegion`: e.g. `"Hour
incremented to 09"`. Configurable: `kjAnnounceCarry: input<boolean>(true)`
default `true`. Disabled by default would surprise — carry is one of
the unique time-picker behaviours.

### Reduced motion

No motion in core. Long-press auto-repeat is interaction acceleration,
not animation; not governed by `prefers-reduced-motion`. Wrapper visual
transitions on segment hover/active states respect the media query
(same as Number Input stepper).

### Contrast

Theme concern. Segment digits inherit input text colour (≥ 7:1 AAA).
Separator characters (colons) likewise. AM/PM text inherits button text
colour.

## Composition model

```
time-picker/
  time-picker.ts                ← KjTimePicker (root, on wrapper <div>)
  time-picker-hour.ts           ← KjTimePickerHour
  time-picker-minute.ts         ← KjTimePickerMinute
  time-picker-second.ts         ← KjTimePickerSecond
  time-picker-period.ts         ← KjTimePickerPeriod
  time-picker.context.ts        ← KJ_TIME_PICKER + KjTimePickerContext
  time-picker.format.ts         ← internal: formatToParts helpers, hour-cycle conversions
  time-picker.example.ts
  time-picker.steps.example.ts
  time-picker.bounds.example.ts
  time-picker.seconds.example.ts
  time-picker.locale.example.ts
  time-picker.native.example.ts
  time-picker.spec.ts
  index.ts
```

### Shared state (`KJ_TIME_PICKER` context)

```ts
export interface TimeParts {
  readonly hour: number;     // 0–23 internal
  readonly minute: number;   // 0–59
  readonly second: number;   // 0–59 (0 if not shown)
  readonly ms: number;       // 0–999 (0 if not shown)
}

export interface KjTimePickerContext {
  readonly value: Signal<TimeParts | null>;
  readonly hourCycle: Signal<'h11' | 'h12' | 'h23' | 'h24'>;
  readonly showSeconds: Signal<boolean>;
  readonly showMs: Signal<boolean>;
  readonly hourStep: Signal<number>;
  readonly minuteStep: Signal<number>;
  readonly secondStep: Signal<number>;
  readonly msStep: Signal<number>;
  readonly min: Signal<TimeParts | null>;
  readonly max: Signal<TimeParts | null>;
  readonly disabled: Signal<boolean>;
  readonly readonly: Signal<boolean>;
  readonly invalid: Signal<boolean>;
  readonly autoCarry: Signal<boolean>;
  readonly autoAdvance: Signal<boolean>;
  readonly wrapInsideSegment: Signal<boolean>;

  /** Apply n step units to a segment. Carries when overflow + autoCarry. Wraps when overflow + !autoCarry + wrapInsideSegment. */
  stepSegment(segment: 'hour' | 'minute' | 'second' | 'ms', units: number): void;
  /** Set a segment's value directly. Clamps + carries / wraps per config. */
  setSegment(segment: 'hour' | 'minute' | 'second' | 'ms', value: number): void;
  /** Toggle AM ↔ PM (hour ± 12, mod 24). */
  togglePeriod(): void;
  /** Move focus to the next / previous segment in DOM order. */
  focusNextSegment(from: 'hour' | 'minute' | 'second' | 'ms' | 'period'): void;
  focusPrevSegment(from: 'hour' | 'minute' | 'second' | 'ms' | 'period'): void;
  /** Announce a message via the wrapper's live region. */
  announce(message: string): void;
}
export const KJ_TIME_PICKER = new InjectionToken<KjTimePickerContext>('KjTimePicker');
```

### `hostDirectives` composition

- `[kjTimePicker]` (wrapper) composes:
  - `KjDisabled` (input alias `kjDisabled`).
  - `KjFormControl` — owns CVA wiring. Generic over the resolved value
    shape (`Date | string | TimeParts | null`).
  - `KjLiveRegion` — for carry announcements.
  - **Does not** compose `KjFocusRing` (the segments do; the wrapper
    is just a group).
  - **Does not** compose `KjVariant` / `KjSize` (delegated to the
    wrapper component in `@kouji-ui/components`, which fans out
    `kjSize` to each segment).
- `[kjTimePickerHour]` / `Minute` / `Second` compose:
  - `KjNumberInput` with hard-coded `kjMin` / `kjMax` / `kjAllowDecimals=false`
    / `kjAllowNegative=false` / `kjMinimumIntegerDigits=2`. The
    wrapping directive overrides the wrap-vs-clamp behaviour by
    listening to `kjValueChange` and re-routing through the
    `KJ_TIME_PICKER` context.
  - `KjFocusRing`.
  - `KjDisabled` (forwarded from wrapper).
- `[kjTimePickerPeriod]` (toggle) composes:
  - `KjFocusRing`.
  - `KjDisabled`.
  - **Nothing** of the dropdown apparatus — when the consumer wants the
    select-style period, they wrap the directive in `[kjSelect]`.

### Cross-component pointers

- **Number Input** ([`number-input.md`](./number-input.md)) — direct
  reuse via `hostDirectives:[KjNumberInput]` per segment. Each segment
  is a constrained Number Input with wrap-and-carry. The
  promoted-helper candidate `clamp + snap-to-step` flagged in Number
  Input's open questions is the same primitive Time Picker needs for
  per-segment step. Recommendation: extract to
  `packages/core/src/primitives/numeric/clamp-snap.ts` when Slider
  *or* Time Picker lands, whichever is first. Time Picker also needs a
  sibling helper `wrap-add` (modular-add with carry-into-other-segment)
  that does not exist in Number Input — owned by Time Picker until a
  third consumer surfaces.
- **Date Picker** ([`./date-picker.md`](./date-picker.md), not yet
  written) — most intimate sibling. Date+time forms commonly compose
  the two. See [Date+time composition](#datetime-composition). Date
  Picker's day/month/year segments are also `role="spinbutton"` with
  custom max (months: 1–12, days: 1–28..31 depending on month, years:
  unbounded). The promoted-helper candidate `KjDateSegment` (a thin
  wrapper around `[kjNumberInput]` with auto-advance + carry) is owned
  jointly by Date and Time Picker. Decision: ship segments as
  `KjNumberInput` wrappers in v1 of Time Picker; promote `KjDateSegment`
  when Date Picker lands and the two consumers agree on the shape.
- **Field** ([`field.md`](./field.md)) — owns label association,
  helper text, error display, and the `aria-describedby` chain. Time
  Picker's wrapper is the labelled element (`role="group"` +
  `aria-labelledby`). The describedby chain is by default duplicated to
  *each segment* so AT users hear the helper text on segment focus
  (configurable via `kjFieldDescribesSegments`). This is one of the
  rare cases where the field's describedby fans out to multiple
  inner elements; flagged in Field's open questions as a precedent.
- **Input** ([`input.md`](./input.md)) — segments composed of
  `<input type="text">` reuse `[kjInput]`'s focus / disabled / variant
  surface implicitly via the composed `[kjNumberInput]`. Time Picker
  segments are not standalone `[kjInput]`s — they are
  `[kjNumberInput]`s, which is `[kjInput]`'s peer. Document the
  relationship.
- **Select** ([`select.md`](./select.md)) — period dropdown mode opts
  into `[kjSelect]`'s 2-option listbox. The default toggle-button mode
  does not need Select. Document both shapes in examples.
- **Form** ([`./form.md`](./form.md)) — Time Picker ships as a fully
  CVA-compliant control. Validators recommended: `Validators.required`,
  plus the directive-emitted out-of-range and step-violation invalid
  states surfaced via `KjFormControl`.
- **Form Field** ([`field.md`](./field.md)) — see above.
- **Slider** ([`slider.md`](./slider.md)) — Time Picker is a multi-
  segment numeric control like Slider's two-handle range, but each
  segment is a discrete spinbutton (not a draggable handle). The
  `role="spinbutton"` story diverges from Slider's `role="slider"`.
  Both share the `clamp + snap-to-step` helper from Number Input.
- **Input OTP** ([`./input-otp.md`](./input-otp.md)) — structurally
  similar (multiple bounded numeric segments, auto-advance on digit
  completion, focus rotation on Backspace at start). OTP cells differ:
  no per-cell min/max beyond `0–9`, no carry, no step. Time Picker
  borrows OTP's auto-advance / Backspace-back focus rotation behaviour;
  OTP's analysis covers it. Recommended: extract a shared
  `KjSegmentFocusRotation` helper if a third consumer (e.g. credit-card
  field) emerges. Defer.

## Inputs / Outputs / Models

### `[kjTimePicker]` (root)

| Member                       | Kind   | Type                                                                                          | Default          | Notes                                                                                                                  |
| ---------------------------- | ------ | --------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `kjValue`                    | model  | `Date \| string \| TimeParts \| null` (resolved by `kjValueShape`)                              | `null`           | Two-way bindable. CVA-bridged. Use `[(kjValue)]` outside reactive forms; `[formControl]` inside.                        |
| `kjValueShape`               | input  | `'date' \| 'string' \| 'parts'`                                                                | `'date'`          | Picks the public model type.                                                                                            |
| `kjReferenceDate`            | input  | `Date \| undefined`                                                                            | `undefined`      | Date part used when `kjValueShape='date'`. Defaults to today at 00:00.                                                  |
| `kjHourCycle`                | input  | `'h11' \| 'h12' \| 'h23' \| 'h24' \| 'auto'`                                                   | `'auto'`         | `'auto'` resolves from `kjLocale ?? LOCALE_ID`.                                                                          |
| `kjLocale`                   | input  | `string \| undefined`                                                                          | `undefined`      | BCP-47 tag. Falls back to injected `LOCALE_ID`.                                                                          |
| `kjShowSeconds`              | input  | `boolean`                                                                                      | `false`          |                                                                                                                          |
| `kjShowMs`                   | input  | `boolean`                                                                                      | `false`          | Implies `kjShowSeconds=true`.                                                                                            |
| `kjHourStep`                 | input  | `number`                                                                                       | `1`              |                                                                                                                          |
| `kjMinuteStep`               | input  | `number`                                                                                       | `1`              | Most-used non-default: `15`.                                                                                              |
| `kjSecondStep`               | input  | `number`                                                                                       | `1`              |                                                                                                                          |
| `kjMsStep`                   | input  | `number`                                                                                       | `1`              |                                                                                                                          |
| `kjStrictStep`               | input  | `boolean`                                                                                      | `false`          | When `true`, free-typed values off the step lattice are snapped on commit.                                                |
| `kjMin`                      | input  | `Date \| string \| TimeParts \| undefined`                                                     | `undefined`      | Time-of-day lower bound. Compared modulo date.                                                                            |
| `kjMax`                      | input  | `Date \| string \| TimeParts \| undefined`                                                     | `undefined`      | Time-of-day upper bound. `kjMin > kjMax` denotes an overnight range.                                                      |
| `kjClampOnType`              | input  | `boolean`                                                                                      | `false`          | Mirrors Number Input.                                                                                                    |
| `kjAutoAdvance`              | input  | `boolean`                                                                                      | `true`           | Focus rotates to next segment on completion.                                                                              |
| `kjAutoCarry`                | input  | `boolean`                                                                                      | `true`           | Stepper overflow carries into the next segment.                                                                            |
| `kjWrapInsideSegment`        | input  | `boolean`                                                                                      | `true`           | Stepper overflow wraps within segment when `kjAutoCarry=false`.                                                            |
| `kjAnnounceCarry`            | input  | `boolean`                                                                                      | `true`           | Live-region announcement on carry.                                                                                          |
| `kjFocusModel`               | input  | `'tabs' \| 'roving'`                                                                            | `'tabs'`         | Tab between segments vs. roving with arrows.                                                                              |
| `kjFieldDescribesSegments`   | input  | `boolean`                                                                                      | `true`           | When `true`, each segment inherits the field's `aria-describedby`.                                                          |
| `kjReadonly`                 | input  | `boolean`                                                                                      | `false`          |                                                                                                                          |
| `kjDisabled`                 | input  | `boolean`                                                                                      | `false`          | Forwarded to `KjDisabled`.                                                                                                |
| `kjInvalid`                  | input  | `boolean`                                                                                      | `false`          | External invalid signal. OR'd with bounds + step violations + form invalidity.                                              |
| `kjUseNativeTime`            | input  | `boolean`                                                                                      | `false`          | Renders a single `<input type="time">` instead of segments. Most other inputs are then ignored at runtime.                    |
| `kjAriaLabel`                | input  | `string \| null`                                                                                | `null`           | Group label fallback when no `[kjField]` label is present.                                                                  |

| Output           | Payload                                                                                  | Notes                                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `kjValueChange`  | `Date \| string \| TimeParts \| null`                                                     | Auto-emitted by `kjValue` model. Fires on commit (segment commit, stepper, programmatic).            |
| `kjCommit`       | resolved value                                                                            | Convenience: equivalent to `kjValueChange` but distinct from typing.                                  |
| `kjSegmentCommit`| `{ segment: 'hour' \| 'minute' \| 'second' \| 'ms' \| 'period'; value: number \| 'AM' \| 'PM' }` | Per-segment commit event.                                                                            |
| `kjPeriodToggle` | `'AM' \| 'PM'`                                                                            | Fires when AM/PM flips.                                                                                 |
| `kjOutOfRange`   | `{ value: TimeParts; bound: 'min' \| 'max' }`                                              | Fires when the user commits a value outside `[kjMin, kjMax]`. Useful for inline error UX.              |

### `[kjTimePickerHour]`

| Member          | Kind   | Type                              | Default          | Notes                                                                                                |
| --------------- | ------ | --------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------- |
| `kjAriaLabel`   | input  | `string \| null`                   | `null`           | Defaults to the locale's "Hours" string. Set to override.                                             |

(Hour bounds, step, and value are read from `KJ_TIME_PICKER`. The
segment directive has no further public surface — it is a thin focus
+ a11y wrapper.)

### `[kjTimePickerMinute]` / `[kjTimePickerSecond]`

Same shape: only `kjAriaLabel`. All behaviour is context-driven.

### `[kjTimePickerPeriod]`

| Member          | Kind   | Type                              | Default          | Notes                                                                                                |
| --------------- | ------ | --------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------- |
| `kjAriaLabel`   | input  | `string \| null`                   | `null`           | Defaults to the locale's "Toggle AM/PM" string.                                                       |

| Output            | Payload         | Notes                                                                                  |
| ----------------- | --------------- | -------------------------------------------------------------------------------------- |
| `kjPeriodChange`  | `'AM' \| 'PM'`  | Fires on toggle.                                                                        |

## Date+time composition

The dominant compound use case: a single form value representing a
moment-in-time, edited via a date picker plus a time picker. Two
shapes work:

1. **Two separate form controls** — `dateControl: FormControl<Date | null>`
   + `timeControl: FormControl<Date | null>`, joined in a parent
   `FormGroup` validator. Each picker is independent.
2. **A single form control bound to both pickers** — both pickers' CVAs
   read/write the same `Date`. The date picker writes the date part;
   the time picker writes the time part. This requires both pickers to
   share a `kjReferenceDate` synchronisation hook.

Decision for the v1 docs: **support both, prefer (1)**. (1) is simpler,
composes with `[kjForm]` and `[kjField]` cleanly, and matches Material's
recommended pattern. (2) is the "nice" UX shape for date+time as one
field, but requires either:

- A wrapper `[kjDateTimePicker]` that owns the merged `Date` and fans
  out date / time slices to two child pickers — feasible but a v1.1
  scope item, owned by Date Picker's analysis when written, or
- An inter-picker context (`KJ_DATE_TIME` token) that both pickers
  inject when present — more invasive.

Carry the requirement into [`./date-picker.md`](./date-picker.md): the
date picker should expose a `kjReferenceTime` mirror input so that
when a date+time wrapper is built, both pickers share a single
canonical `Date`.

## Examples to ship

`@doc-example` groups in the directive's TSDoc:

1. **Default** (`time-picker.example.ts`) — minimal: `<div kjTimePicker
   [(kjValue)]="time"><input kjTimePickerHour /><span>:</span><input
   kjTimePickerMinute /></div>`. No seconds, no AM/PM (unless locale).
   Demonstrates auto-advance and Tab-between-segments.
2. **12-hour with period** (`time-picker.period.example.ts`) — explicit
   `kjHourCycle="h12"` with `<button kjTimePickerPeriod />`.
3. **Seconds** (`time-picker.seconds.example.ts`) — `kjShowSeconds=true`.
4. **15-minute step** (`time-picker.steps.example.ts`) — `kjMinuteStep=15`,
   `kjStrictStep=true`. Demonstrates lattice snap on commit.
5. **Bounds** (`time-picker.bounds.example.ts`) — `kjMin="08:00"
   kjMax="18:00"`. Demonstrates clamp + `aria-invalid`.
6. **Overnight bounds** (`time-picker.overnight.example.ts`) —
   `kjMin="22:00" kjMax="06:00"` (22:00–06:00 valid). Documents the
   `min > max` semantic.
7. **Locale formatting** (`time-picker.locale.example.ts`) — three
   side-by-side: `en-US` (12h `08:30 AM`), `de-DE` (24h `08:30`),
   `ja-JP` (24h `08:30`). Demonstrates separator and period rendering.
8. **Reactive forms** (`time-picker.form.example.ts`) — `FormGroup`
   with `Validators.required` and a custom step validator. Uses
   `[kjField]` for label + helper + error.
9. **Native time input** (`time-picker.native.example.ts`) — opt-in
   `kjUseNativeTime=true`. Documents the loss of segments / step / bounds.
10. **Date+time combo** (`time-picker.date-time.example.ts`) — paired
    with `[kjDatePicker]` over a single `Date`-shaped FormControl.
    Pending the date-picker analysis; example shipped as
    `@doc-example-pending` until then.
11. **Themed** (`time-picker.retro.example.ts`,
    `time-picker.finance.example.ts`) — variant + size composition.

## Open questions / risks

1. **`aria-valuenow` for 12-hour hour segment.** When `hourCycle='h12'`
   and the internal hour is `0` (midnight), the displayed hour is `12`
   AM. Should `aria-valuenow="0"` (internal) or `"12"` (display)? APG
   says `aria-valuenow` is numeric and represents the *current value*.
   Decision: **display value** (`12`) for h12; AT users hear what they
   see. Cross-check with NVDA / VoiceOver in v1 testing.

2. **`aria-valuetext` and the period.** The hour segment's
   `aria-valuetext="8 AM"` includes the period for context, but the
   period directive's own `aria-pressed` already announces the period.
   Risk: AT reads the period twice on hour focus then on period focus.
   Decision: **include period in hour valuetext** (canonical AAA
   pattern: prefer redundant context to ambiguous numbers). Document
   for review.

3. **Carry across the day boundary.** Stepping minute up from `23:59`
   carries to hour `00`. Does the date part advance (`Date` value
   shape)? Decision: **yes** — the underlying `Date` increments. This
   surprises consumers who expect time-of-day to be modular. Document
   loudly. Consumers who want strict modular time set
   `kjValueShape='string'` or `'parts'`, which discard the date.

4. **Locale where AM/PM strings don't fit a button.** Some locales
   (`my-MM`, Burmese: `နံနက်` / `ညနေ`) have multi-character period
   strings that overflow narrow toggle buttons. Wrapper concern: the
   button's display string can be replaced with localised abbreviations
   (`Intl.DateTimeFormat formatToParts dayPeriod`'s `narrow` style).
   Documented; not a blocker.

5. **`<input>` vs `<span tabindex>` for segments.** `<input>` gives
   mobile keyboard for free but has a default selection-on-focus that
   complicates the typing-buffer model. `<span tabindex="0">` is
   cleaner internally but loses mobile keyboard. Decision: ship `<input>`
   default; `kjSegmentElement: input<'input' | 'span'>('input')` is the
   escape hatch for embedded toolbars where focusable text spans are
   preferred. Most consumers never touch it.

6. **Decimal milliseconds.** `kjShowMs=true` displays a 3-digit
   millisecond segment. Some specs allow fractional seconds at higher
   precision (microseconds). Out of scope; document the precision cap.

7. **Step lattice across carry.** With `kjMinuteStep=15` and current
   value `08:45`, ArrowUp → `09:00` (carry crosses, lands on lattice).
   With `kjMinuteStep=15` and current value `08:50` (off lattice
   because user typed it), ArrowUp behaviour is ambiguous: snap to next
   lattice (`09:00`) or step from current (`09:05`)? Decision: **snap
   to next lattice** when stepping (matches Material `interval`
   behaviour). When `kjStrictStep=false`, the typed `08:50` survives
   until next stepper press; when `kjStrictStep=true`, `08:50` is
   snapped to `08:45` or `09:00` on commit (round-half-to-even).

8. **`kjMin`/`kjMax` step interaction.** `kjMin=08:07 kjMinuteStep=15`
   produces a lattice `08:07, 08:22, 08:37, …` or `08:00, 08:15,
   08:30, …`? Decision: **the lattice base is `kjMin`** (mirrors Number
   Input's `kjStepBase=kjMin`). Document.

9. **Form-control disabled flowthrough.** When the form control is
   disabled, all segments and the period must be disabled. Implementation:
   wrapper's `KjDisabled` is read by every segment via the context.
   Care: the period directive composes `KjDisabled` with its own input;
   the *effective* disabled is `wrapper.disabled || own.disabled`.
   Standard pattern.

10. **SSR and `Intl.DateTimeFormat`.** `Intl.DateTimeFormat` is
    available in Node 18+. Locale resolution at SSR time uses
    `LOCALE_ID`; if the client locale differs, hydration mismatches.
    Same answer as Number Input: the consumer must provide
    `LOCALE_ID` and `kjLocale` consistently.

11. **Native `<input type="time">` step semantics.** Browsers support
    `step` on `<input type="time">` in seconds (e.g. `step="900"` for
    15-minute increments). When `kjUseNativeTime=true` and
    `kjMinuteStep` is set, the directive forwards
    `step="${kjMinuteStep * 60}"`. Document.

12. **Promotion of `KjDateSegment`.** Number Input flagged the segment
    extraction as an open question; Time Picker ships segments as
    `KjNumberInput` wrappers in v1. When Date Picker lands, evaluate
    extraction. The shared shape so far: bounded numeric, 2-digit
    leading-zero, type-to-buffer with auto-advance, ArrowUp/Down step,
    PageUp/Down 10× step, Home/End to bounds, no decimals, no negatives,
    `role="spinbutton"` with `aria-valuemin/max/now/text`. Date adds
    month-name display (some locales spell out months); Time does not.
    Promotion target: `packages/core/src/primitives/segment/`. Defer.

13. **Live region pollution.** `kjAnnounceCarry=true` fires a live-
    region message on every carry. Rapid stepping (long-press) can
    pile up announcements. Mitigation: throttle announcements to one
    per 200 ms and coalesce ("Hour incremented by 3 to 11"). Defer the
    coalescing to v1.1; v1 fires per-carry which AT will queue.

14. **Field describedby fan-out.** `kjFieldDescribesSegments=true`
    duplicates the helper/error id list onto every segment. Some AT
    re-announces helper text on every segment focus, which is noisy
    after the first. Compromise considered: announce only on the first
    segment within a focus session, reset on focus-out of the wrapper.
    Implementation requires intercepting focus at the wrapper. Defer to
    v1.1; v1 ships full fan-out with `false` as the opt-out for noisy
    cases.

15. **Date+time wrapper component.** The `[kjDateTimePicker]` shape is
    out of scope for this analysis — it lives in [`./date-picker.md`](./date-picker.md)
    when written. **Soft block:** the date-picker analysis must
    define the merged-`Date` ownership and provide `kjReferenceTime`
    plumbing for consumers who use the two pickers together.
    Time Picker ships independently; the wrapper is additive.

16. **Polyfill for `Intl.Locale.hourCycle`.** Older browsers without
    `Intl.Locale` lose `hourCycle='auto'`. We target evergreen browsers
    (Angular 17+); no polyfill. Documented in
    [`stack.md`](../../../rules/stack.md) if not already.

17. **Step + min interaction at midnight.** `kjMin="00:15" kjMinuteStep=15`
    with current `00:00` (out of range). On commit, snap up to `00:15`.
    With `kjMin="00:00" kjMax="00:00"` (degenerate), the only valid
    value is `00:00:00.000` and stepping is a no-op. Document.

18. **A11y for the `<input type="time">` fallback.** Browsers' native
    time inputs vary in ARIA exposure (Chrome announces "spinner",
    Firefox announces "edit"). When `kjUseNativeTime=true`, the
    directive cannot improve native exposure. Document the trade-off.

19. **Mouse-wheel changes value.** Same stance as Number Input: **off
    by default.** Consumers who want it listen for `wheel` and call
    `ctx.stepSegment(...)`. Document.

20. **`TimeParts` location.** The interface lives in
    `packages/core/src/time-picker/time-picker.context.ts` initially.
    If Date Picker reuses, promote to
    `packages/core/src/primitives/datetime/parts.ts`. Defer.
