# Progress Bar

A horizontal bar that visualises the completion state of an in-flight
operation. Two distinct modes:

- **Determinate** — a known fraction of the work is done, expressed as a
  number between `0` and `100` (or, more precisely, between
  `kjProgressMin` and `kjProgressMax`). Used during file uploads,
  multi-step form completion, downloads, batch jobs whose total is
  known up front.
- **Indeterminate** — work is in progress but progress can't be measured
  (waiting on a server response, queued behind unknown work,
  long-running first paint). Visualised as a CSS-animated stripe that
  travels across the bar; ARIA expresses *"busy, no value"* by omitting
  `aria-valuenow`.

> Not yet shipped. No `packages/core/src/progress-bar/` directory exists
> today. This file specifies the directive set, the determinate /
> indeterminate state model, the a11y contract, and the wrapper API to
> land for v1.

For the small spinning indeterminate sibling that fits inline in a
button or next to a piece of text, see [`spinner.md`](./spinner.md).
For the content placeholder that pre-paints layout while data loads,
see [`skeleton.md`](./skeleton.md). Progress Bar is consumed by
[`../data-input/file-upload.md`](../data-input/file-upload.md) (per-file
row) and is the visual companion to
[`../navigation/stepper.md`](../navigation/stepper.md) (overall step
progress, often expressed as `kjAriaValuetext="Step 3 of 5"`). Progress
Bar is **not** a Meter — see *Progress vs. Meter* below for the
distinction we explicitly enforce.

## Source comparison

| Concern | PrimeNG `p-progressBar` | Angular Material `mat-progress-bar` | shadcn/ui `<Progress>` (Radix) | daisyUI `progress` | WAI-ARIA APG |
|---|---|---|---|---|---|
| Element shape | `<div role="progressbar">` with inner fill `<div>` | `<mat-progress-bar>` custom element with multiple inner `<div>`s for buffer / primary / animation | `<ProgressPrimitive.Root>` + `<ProgressPrimitive.Indicator>` (two parts) | Native `<progress>` (CSS-styled) | `role="progressbar"` on the bar; `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-valuetext` |
| Determinate / indeterminate | `mode="determinate" \| "indeterminate"` | `mode="determinate" \| "indeterminate" \| "buffer" \| "query"` | Determinate only — pass `value`; `null`/`undefined` → indeterminate (CSS) | CSS-only; `<progress>` with no `value` is indeterminate by default | Both supported — indeterminate omits `aria-valuenow` |
| Buffer mode | No | Yes (`buffer` + `value` and `bufferValue`) — for video buffering | No | No | n/a |
| Query mode | No | Yes (`query`) — pre-loading state, animation runs backward | No | No | n/a |
| Variants / colours | `severity` (`success`, `info`, `warn`, …) | `color` (`primary`, `accent`, `warn`) | None — consumer styles | `progress-primary`, `progress-success`, `progress-warning`, `progress-error`, … | n/a |
| Sizes | Single height; `[style]` override | Single height; can override CSS var `--mdc-linear-progress-active-indicator-height` | Single height; consumer styles | `h-2` / `h-4` Tailwind utilities; no first-class size | n/a |
| Striped / animated | Striped + animated stripe options | The indeterminate animation; no stripe in determinate | None | Not in core; common recipe with `bg-stripes` utility | n/a (decorative) |
| Value display (label) | `[showValue]` toggles "%n%" overlay text | None | None — consumer renders own label | None — consumer renders own label | `aria-valuetext` for human-readable phrasing ("Step 3 of 5") |
| `aria-valuenow` / min / max | Auto from `value` / `[mode]` | Auto from `value` (always 0–100) | Auto on the root | Native `<progress>` exposes mapped value/max | Required for determinate; **omit `aria-valuenow` for indeterminate** |
| `aria-valuetext` | No | No | No | No | Recommended when the numeric value alone isn't meaningful |
| Reduced motion | No special handling | Animation respects `prefers-reduced-motion` (Material 16+) | Indicator transition; no media-query default | No | n/a (user-agent handles for `<progress>`) |
| Live-region behaviour | Not announced | Not announced (consumer adds `aria-live` if wanted) | Not announced | Not announced | APG explicitly notes the busy element itself does not need to be a live region; if periodic milestones are wanted, use a separate `aria-live="polite"` region |

**Read-off.** Material is the most feature-complete (buffer, query,
reduced motion) but ties everything to a single element with internal
`<div>`s a consumer can't reach into. PrimeNG bolts on a value-label
text overlay that it then has to hide from AT (the bar already announces
its value). shadcn/ui is the cleanest composition shape (Root + Indicator
parts, no chrome) but offers no indeterminate mode and no
`aria-valuetext`. daisyUI leans on `<progress>` and gets correctness for
free but loses the indeterminate ARIA story (a `<progress>` with no
attribute *is* indeterminate visually, but not all browsers expose that
to AT consistently).

The shape we adopt is **shadcn-flavoured composition** (root +
indicator) plus **APG-correct ARIA** (omit `aria-valuenow` when
indeterminate, support `aria-valuetext` natively, allow
prefers-reduced-motion to neutralise the indeterminate animation), and
we **explicitly do not ship buffer or query modes** in v1 — see
*Open questions* for why.

## Decision: needs a core directive?

**Yes.** Three contracts justify it:

1. **Determinate / indeterminate is an a11y inflection point, not just
   a visual one.** The directive must set `aria-valuemin` /
   `aria-valuemax` always, set `aria-valuenow` when determinate, and
   *omit* `aria-valuenow` when indeterminate. Consumers and themes
   routinely get this wrong (Material's older releases set
   `aria-valuenow="0"` even when indeterminate, which AT reports as
   *"0 percent"* — false). Encoding the rule in a core directive that
   accepts `kjValue: number | null` (where `null` means indeterminate)
   is the cleanest place to enforce it.

2. **Value normalisation is non-trivial.** `kjValue` of `0.47` (fraction)
   vs. `47` (percent) vs. `47` with `kjMax=200` (absolute) all must
   produce the same accessible reading. The directive owns:
   - clamping `kjValue` to `[kjMin, kjMax]`,
   - computing the percentage for CSS (`--kj-progress-fraction: 0..1`),
   - and computing the rounded `aria-valuenow` for AT.
   Doing this in three different theme implementations is how bugs
   ship.

3. **Reduced-motion enforcement on the indeterminate animation.** The
   indeterminate stripe is purely decorative — under
   `prefers-reduced-motion: reduce` it must collapse to a static or
   opacity-only state. The directive reflects `data-reduced-motion`
   from a media-query signal; themes layer their CSS off it. Same
   pattern Carousel and Toast use.

Items beyond a11y — variant tokens, height presets, striped chrome —
are reused from existing primitives (`KjVariant`, `KjSize`) and don't
motivate the directive on their own. The valuenow-omission +
fraction-normalisation + reduced-motion combo does.

## Composition model

**Two directives, shadcn-shaped.** A root that owns ARIA + the value
math, plus an indicator/fill child that consumes the computed fraction
as a CSS variable. Both standalone, sharing a `KJ_PROGRESS_BAR`
injection token. Not three (no separate "track"); the root *is* the
track.

```
KjProgressBar       (selector: [kjProgressBar],     owns role/ARIA + value math, provides KJ_PROGRESS_BAR)
  └── KjProgressBarFill  (selector: [kjProgressBarFill], reads ctx.fraction, sets transform / width)
```

### Why **two** directives, not one

A single-directive shape is tempting (PrimeNG's: one element, one inner
`<div>` rendered from a template), but it forces the directive to own
the inner element's lifecycle and animation hooks. That couples
"semantic bar" to "visual fill", and it means consumers can't put
custom chrome (segments, striped overlay, value label) inside the track
without fighting the directive.

A two-directive shape lets:

- the **root** be a `<div>` (or `<progress>`, see below) carrying
  `role="progressbar"` + ARIA;
- the **fill** be any inner element a theme wants — a `<div>` with
  `transform: scaleX()`, a `<span>` absolutely positioned, a striped
  overlay, two stacked elements for primary + buffer (when we add it
  later);
- the consumer drop a `[kjProgressBarValue]` text label *inside* the
  root next to the fill, with `aria-hidden="true"` because the label is
  duplicating what `aria-valuenow` / `aria-valuetext` already announce.

This mirrors the Radix shape and is consistent with the Alert / Dialog
compound-directive pattern in the rest of kouji.

### Why not compose `<progress>`?

`<progress>` is the most semantically correct element for determinate
progress and gets `aria-valuenow` for free. The catch:

- Styling a native `<progress>` requires per-engine pseudo-elements
  (`::-webkit-progress-bar`, `::-moz-progress-bar`,
  `::-webkit-progress-value`) and is *very* fiddly under prefers-
  contrast and forced-colors modes.
- `<progress>` has no good indeterminate ARIA story across engines:
  some report *"indeterminate progress"*, some report *"0 percent"*,
  some say nothing.
- A native `<progress>` cannot host the inner `[kjProgressBarFill]`
  child in a way that themes can layer (its rendering is engine-owned).

So `[kjProgressBar]` defaults to a `<div>` host. We **document** that
consumers may apply `[kjProgressBar]` to a `<progress>` element — in
which case the directive sets the same ARIA but lets the browser draw
the fill, and `KjProgressBarFill` is unused. (The directive detects
`tagName === 'progress'` in dev mode and warns if `[kjProgressBarFill]`
is also projected.) This satisfies progressive-enhancement consumers
without making `<progress>` the default.

### Reused primitives

- **`KjVariant`** — host directive on `KjProgressBar`, validated against
  `KJ_PROGRESS_BAR_CONFIG` via `bindPresets`. Same shape Button / Alert
  use. Reflects `data-variant`.
- **`KjSize`** — host directive on `KjProgressBar`. Reflects `data-size`.
  Drives the bar height (`xs` / `sm` / `md` / `lg` per the matrix below).
- **`KjLiveRegion`** — **not** composed. The progress bar itself is
  *not* a live region — APG is explicit that a `role="progressbar"`
  element does not need `aria-live`; AT polls the value when focus or
  cursor enters the bar. For *milestone* announcements (25%, 50%, 75%,
  "Upload complete"), a separate `[kjLiveRegion]` strip is the right
  surface — exposed as an opt-in on the wrapper (see *Milestone
  announcements* below). Forcing every progress bar to live-announce
  every value change would flood AT.
- **`KjFocusRing`** — **not** composed. The progress bar is not
  focusable. (Consumers may make it focusable for keyboard *cancel*
  affordances, but cancel lives on a sibling button — not on the bar.)
- **`KjVisuallyHidden`** — used by themes when rendering a visible
  value label that should be redundant for AT (the bar already
  announces). The label itself gets `aria-hidden="true"`; the SR-only
  phrasing comes from `aria-valuetext`.

### Cross-component pointers

- [`spinner.md`](./spinner.md) — the indeterminate-only sibling.
  Spinner is for "small, inline, no measurable progress" (a button's
  loading state, a list cell's pending refresh). Progress Bar's
  indeterminate mode covers the same semantic but only when the
  surface is large enough to make sense as a horizontal bar. Document
  the picker in both files: bar for full-row / full-section, spinner
  for inline / icon-sized.
- [`skeleton.md`](./skeleton.md) — Skeleton is a *layout* placeholder
  ("the shape of the data is being painted"), not a progress signal.
  A long fetch shows skeleton rows; a long *upload* shows a progress
  bar. Skeletons typically don't carry `role="progressbar"` (they
  carry `aria-busy="true"` on a parent and themselves are
  `aria-hidden`).
- [`../data-input/file-upload.md`](../data-input/file-upload.md) — each
  row's `KjFileUploadItemContext.progress` (`number | null`) feeds a
  `KjProgressBar`. The row carries `aria-labelledby` to the filename;
  the bar inside is `aria-labelledby="row-id"` so AT reads
  *"thumbnail.png, uploading, 47%"* rather than just *"47%"*. The file
  upload analysis already forward-references this file.
- [`../navigation/stepper.md`](../navigation/stepper.md) — Steppers
  often render a thin progress bar above the step list ("Step 3 of 5",
  60% complete). The stepper computes the fraction and passes it as
  `kjValue`; `kjAriaValuetext="Step 3 of 5"` is set so the SR phrasing
  reads naturally instead of *"60 percent"*.
- [`../actions/button.md`](../actions/button.md) — a `KjButton` with
  `kjLoading="true"` renders a Spinner inline (not a progress bar).
  Don't confuse the two.
- `KjLiveRegion` (`packages/core/src/a11y/live-region.ts`) — used
  *next to* the progress bar for milestone announcements; not used
  *as* the progress bar.

## Determinate vs. indeterminate

`kjValue: number | null`. The single input drives both modes:

| `kjValue` | Mode | `aria-valuenow` | Visual |
|---|---|---|---|
| `0..100` (or `kjMin..kjMax`) | Determinate | rounded integer percent | fill scales to fraction |
| `null` | Indeterminate | **omitted** (no attribute) | CSS-animated stripe |
| `undefined` (initial) | Indeterminate (with hint) | omitted | same as `null` |

`null` is the explicit sentinel for *"this operation is in flight but
its progress is not measurable right now"*. We chose `null` over
`'indeterminate'` (a magic string) for two reasons:

1. The TypeScript signature `number | null` is self-documenting and
   plays well with reactive sources (a `Subject<number | null>` is
   ergonomic).
2. It mirrors HTML's own `<progress>` semantics — a `<progress>` with
   no `value` attribute is indeterminate.

**Switching modes mid-flight is supported.** A common pattern is
*"upload starts indeterminate (waiting for the server to acknowledge),
then becomes determinate once we get a `Content-Length`-backed stream,
then back to indeterminate while the server processes after upload
completes."* The directive computes `aria-valuenow` reactively from
`kjValue()`; no extra hook required. Themes drive the visual transition
off `data-indeterminate` reflected on the host.

**No "buffer" mode in v1.** Material's `buffer` mode (a secondary,
fainter bar showing how much of a stream is buffered ahead of the
current playback) is the only credible third mode, and it is video-
playback-specific. None of our roadmap consumers (file upload, page
load, multi-step form) need it. We park it as a v1.x candidate; if it
returns, the shape is a second `[kjProgressBarBuffer]` directive that
sets a second CSS variable (`--kj-progress-buffer-fraction`) — not a
new mode flag on the root. (`mode` flags and orthogonal data don't
mix; a separate directive composes more cleanly with striped /
segmented later.)

**No "query" mode in v1.** Material's `query` is a pre-load state
where the animation runs *backwards* to signal *"about to start"*.
Visually distinct only in Material's own design system, not a generic
need.

## Base features

- **Variants (preset, configurable):** `primary`, `success`, `warning`,
  `error`. Default `'primary'`. Open-set string. Extend via
  `provideKjProgressBar({ variants: [...KJ_PROGRESS_BAR_DEFAULTS.variants, 'brand'] })`.
- **Sizes (preset, configurable):** `xs`, `sm`, `md`, `lg`. Default
  `'md'`. Drives the bar height; the directive only reflects
  `data-size`, themes own the actual `height` token mapping.
- **Min / max:** `kjMin` (default `0`), `kjMax` (default `100`). Most
  consumers leave them as defaults and pass a percentage. For absolute
  measures (`bytesUploaded` / `bytesTotal`), pass both — the directive
  computes the fraction.
- **Value:** `kjValue: number | null`. `null` = indeterminate.
- **Accessible value text:** `kjAriaValuetext: string | undefined`.
  When set, it becomes `aria-valuetext` on the host. Use for
  *human-readable* phrasings (`"Step 3 of 5"`, `"Uploading 4 of 10
  files"`, `"3 minutes remaining"`) where the raw percentage is less
  meaningful. APG specifically calls this out as the right pattern.
- **Accessible label:** `kjAriaLabel` / `kjAriaLabelledby` on the host.
  At least one must be present (dev-mode warning otherwise) — a
  progress bar without a name announces as just *"50 percent"*, which
  is useless. Same posture as icon-only Button.
- **Decorative striped overlay (theme-only).** Themes may render a
  striped `::after` on `[kjProgressBarFill]`; the directive does not
  know or care. Reflects `data-striped` only if a future input is
  added; for v1, themes own it via `data-variant` / class.

### State model

**Stateless.** The directive owns no internal state — `kjValue` is the
single source of truth, the directive reflects derived signals
(`fraction`, `valuenow`, `indeterminate`), and the consumer drives the
value from wherever it has it (RxJS, signals, observables from an
upload service). Same posture as `KjButton`.

## Accessibility

Target: **WCAG 2.1 AAA**.

| Criterion | Requirement | Where it lives |
|---|---|---|
| 1.3.1 Info & Relationships | `role="progressbar"` on the host; `aria-valuemin` / `aria-valuemax` always set; `aria-valuenow` set when determinate, **omitted** when indeterminate; `aria-valuetext` set when `kjAriaValuetext` is provided | `KjProgressBar` host bindings, computed from `kjValue` / `kjMin` / `kjMax`. |
| 1.4.1 Use of Color | Variant colour is **not** the only signal of state — the bar's *length* expresses progress, the variant only expresses *kind* (success / error). An error progress bar at 47% communicates "47% done, failed" via length + icon overlay (theme), not via colour alone. | Theme layer; the directive reflects `data-variant` so themes can pair colour with an icon. |
| 1.4.6 Contrast (Enhanced, AAA) | ≥3:1 fill-vs-track contrast for each variant; ≥7:1 if a value label is rendered as text on the bar | Themes layer — `--kj-progress-bar-track`, `--kj-progress-bar-fill-{variant}` token pairs. |
| 1.4.13 Content on Hover or Focus | n/a — the progress bar is not a hover/focus surface | — |
| 2.1.1 Keyboard | The progress bar is not focusable. Cancel / pause affordances are sibling `KjButton`s; their keyboard contract is theirs | Out of scope for `KjProgressBar`. |
| 2.2.1 Timing Adjustable (AAA) | Indeterminate animation has no time limit and can be paused via `prefers-reduced-motion` | `data-reduced-motion` reflected; theme CSS halts the animation. |
| 2.2.2 Pause, Stop, Hide | Indeterminate animation respects `prefers-reduced-motion: reduce` (collapses to static or opacity-only) | `data-reduced-motion` reflected from a `KJ_REDUCED_MOTION` signal. |
| 2.3.3 Animation from Interactions (AAA) | Same — animations respect reduced motion | Theme CSS layer. |
| 4.1.2 Name, Role, Value | Correct `role` and value attributes per the matrix above; the bar has an accessible name (`aria-label` or `aria-labelledby`) | `KjProgressBar` host bindings + dev-mode warning. |
| 4.1.3 Status Messages | Milestone announcements (25%, 50%, 75%, 100%, *"Failed"*) are pushed through a separate `[kjLiveRegion]` (polite), **not** by adding `aria-live` to the progress bar itself | Wrapper-level opt-in; see *Milestone announcements* below. |

### Reduced motion

The indeterminate stripe animation is the only motion source. The
directive injects a `KJ_REDUCED_MOTION` signal (a shared primitive
backed by `matchMedia('(prefers-reduced-motion: reduce)')`, already
used by Carousel / Toast) and reflects `data-reduced-motion="reduce"`
on the host when active. Themes:

```css
[kjProgressBar][data-indeterminate="true"] [kjProgressBarFill] {
  animation: kj-progress-indeterminate 1.6s linear infinite;
}
[kjProgressBar][data-reduced-motion="reduce"] [kjProgressBarFill] {
  animation: none;
  opacity: 0.6; /* still visible as 'something is happening' */
}
```

The directive does **not** stop the animation itself (no JS-controlled
animation lifecycle); it only reflects the data attribute and trusts
the theme.

### Milestone announcements

For long-running operations (multi-minute uploads, batch jobs), users
benefit from periodic spoken updates — but the progress bar element
itself must not be a live region (announcing *every* `aria-valuenow`
change spams AT). The right shape:

- The component-package wrapper accepts a `kjAnnounceMilestones:
  boolean | number[]` input. `true` (default-ish for the wrapper, but
  off by default) = announce at `[25, 50, 75, 100]`. `[10, 25, 50, 75,
  90, 100]` = custom thresholds.
- The wrapper hosts a hidden `<span [kjLiveRegion]="'polite'">` and
  pushes phrasing through it when `kjValue` crosses a threshold:
  *"25% complete"* (or, if `kjAriaValuetext` is set, the wrapper uses
  the value text — *"Step 2 of 5"*).
- On mode change `null → number` or `number → null`, the wrapper
  announces *"Progress measurable"* / *"Working…"* once. Same
  threshold-crossing rule (don't announce on every render).

The **core directive does not own this** — it's wrapper-layer
ergonomics. Consumers who want their own announcement strategy bypass
the wrapper or bind their own `[kjLiveRegion]`.

### Dev-mode validation

`KjProgressBar` runs an `effect()` in dev mode that asserts:

1. The host has `aria-label`, `aria-labelledby`, or — for `<progress>`
   hosts — a programmatic `<label for>` association. Otherwise warn.
2. If `kjMin >= kjMax`, throw (mis-configured).
3. If `kjValue` (when not `null`) is outside `[kjMin, kjMax]`, warn
   once and clamp.
4. If `kjAriaValuetext` is set but `kjValue === null` (indeterminate),
   warn — `aria-valuetext` should describe a value, and there isn't
   one. Encourage moving the phrasing to a sibling text element.

Warnings, not throws (except #2). Same posture as the icon-only Button
warning.

## Inputs / Outputs / Models

### `KjProgressBar` (`[kjProgressBar]`, `exportAs: 'kjProgressBar'`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjValue` | `input` | `number \| null` | `null` | `null` = indeterminate. Outside-of-range values clamp to `[kjMin, kjMax]` with a dev warning. |
| `kjMin` | `input` | `number` | `0` | `aria-valuemin`. |
| `kjMax` | `input` | `number` | `100` | `aria-valuemax`. Must be `> kjMin`. |
| `kjAriaValuetext` | `input<string \| undefined>` | `string \| undefined` | `undefined` | Bound to `[attr.aria-valuetext]`. Use for human-readable phrasing. |
| `kjVariant` | `input` (preset) | `string` (validated against `KJ_PROGRESS_BAR_CONFIG.variants`) | `'primary'` | Forwarded to `KjVariant` host directive. Reflects `data-variant`. |
| `kjSize` | `input` (preset) | `string` (validated against `KJ_PROGRESS_BAR_CONFIG.sizes`) | `'md'` | Forwarded to `KjSize`. Reflects `data-size`. |

Public API exposed via the context (`KJ_PROGRESS_BAR`):

```ts
export interface KjProgressBarContext {
  /** Raw value as provided, possibly null (indeterminate). */
  value: Signal<number | null>;
  /** Clamped value in [min, max], or null if indeterminate. */
  clampedValue: Signal<number | null>;
  /** 0..1 fraction for CSS, or null if indeterminate. */
  fraction: Signal<number | null>;
  /** Rounded integer for aria-valuenow, or null if indeterminate. */
  valuenow: Signal<number | null>;
  /** True iff value is null. */
  indeterminate: Signal<boolean>;
  /** Min / max as provided. */
  min: Signal<number>;
  max: Signal<number>;
}
export const KJ_PROGRESS_BAR = new InjectionToken<KjProgressBarContext>('KjProgressBar');
```

Host bindings:

```ts
host: {
  'role': 'progressbar',
  '[attr.aria-valuemin]': 'min()',
  '[attr.aria-valuemax]': 'max()',
  '[attr.aria-valuenow]': 'valuenow()',         // omitted when null
  '[attr.aria-valuetext]': 'kjAriaValuetext()', // omitted when undefined
  '[attr.data-indeterminate]': 'indeterminate() ? "true" : null',
  '[attr.data-reduced-motion]': 'reducedMotion() ? "reduce" : null',
  '[style.--kj-progress-fraction]': 'fraction()',  // null in indeterminate
}
```

Note: in Angular, binding `[attr.aria-valuenow]` to a signal whose
value is `null` causes the attribute to be **omitted** from the DOM —
exactly what APG requires for indeterminate. Tests must assert
`element.hasAttribute('aria-valuenow') === false` (not `=== ''` or
`=== '0'`).

### `KjProgressBarFill` (`[kjProgressBarFill]`)

No public inputs. Reads `KJ_PROGRESS_BAR.fraction` and reflects
`--kj-progress-fraction` (and `data-indeterminate`) on its own host so
themes can target the inner element directly. Themes typically:

```css
[kjProgressBarFill] {
  transform-origin: left center;
  transform: scaleX(var(--kj-progress-fraction, 0));
  transition: transform 200ms ease-out;
}
[kjProgressBarFill][data-indeterminate="true"] {
  transform: none;
  /* CSS-only stripe animation */
}
```

The directive itself sets nothing visual — `KjProgressBarFill` exists
because `--kj-progress-fraction` needs to flow to a *named* inner
element (themes need to know which child to scale), and because
re-emitting the variable on the inner host saves consumers a CSS
selector hop. (See *What NOT to Build* in `rules/code_style.md`: a
`data-*`-only directive is forbidden — re-emitting a CSS variable
*plus* `data-indeterminate` for themes to fork on lifts this above
that bar, and giving themes a stable selector hook for the inner
element is the load-bearing reason.)

### Wrapper component (`<kj-progress-bar>`, components package)

Re-exposes `KjProgressBar`'s inputs plus wrapper-only ergonomics:

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjValue` | `input` | `number \| null` | `null` | Pass-through to root. |
| `kjMin` / `kjMax` / `kjAriaValuetext` / `kjVariant` / `kjSize` | `input` | (per root) | (per root) | Pass-through. |
| `kjShowValueLabel` | `input<boolean>` | `boolean` | `false` | When `true`, renders a `<span aria-hidden="true">` with the percentage (or with `kjAriaValuetext` when set) inside the bar. The span is `aria-hidden` because the bar already exposes the same value via `aria-valuenow` / `aria-valuetext` — duplicating it for AT would announce twice. |
| `kjAnnounceMilestones` | `input<boolean \| number[]>` | `false` | When truthy, mounts a hidden `[kjLiveRegion]` and announces phrasings on threshold crossings. `true` ≡ `[25, 50, 75, 100]`. |
| `kjMilestoneFormatter` | `input<(value: number, max: number, valuetext: string \| undefined) => string>` | (default formats `'{value}% complete'` or echoes `valuetext`) | Lets consumers localise / customise the phrasing. |

Wrapper template (sketch):

```html
<div [kjProgressBar]
     [kjValue]="kjValue()"
     [kjMin]="kjMin()" [kjMax]="kjMax()"
     [kjAriaValuetext]="kjAriaValuetext()"
     [kjVariant]="kjVariant()" [kjSize]="kjSize()"
     class="kj-progress-bar">
  <div kjProgressBarFill class="kj-progress-bar__fill"></div>
  @if (kjShowValueLabel()) {
    <span aria-hidden="true" class="kj-progress-bar__label">{{ labelText() }}</span>
  }
</div>
@if (kjAnnounceMilestones()) {
  <span [kjLiveRegion]="'polite'" class="kj-visually-hidden">{{ milestoneAnnouncement() }}</span>
}
```

The wrapper composes `KjProgressBar` via `hostDirectives` so
`exportAs: 'kjProgressBar'` is preserved on `<kj-progress-bar>`. No
new ARIA inputs at the wrapper layer — the root's contract is
complete; the wrapper only adds the *visual* label and the *separate*
live-region announcement.

## Variants & token mapping

| `kjVariant` | When to use | Token pair |
|---|---|---|
| `'primary'` | The default for any neutral progress (uploads, page loads, multi-step forms). | `--kj-color-primary` / `--kj-progress-bar-track` |
| `'success'` | Operation succeeded but the bar is staying mounted while final processing finishes. | `--kj-color-success` / `--kj-progress-bar-track` |
| `'warning'` | Operation is degraded but still progressing (slow network, retrying). | `--kj-color-warning` / `--kj-progress-bar-track` |
| `'error'` | Operation failed mid-flight; bar is staying mounted to display where it stopped. | `--kj-color-error` / `--kj-progress-bar-track` |

Themes own the colour mapping; the directive only reflects
`data-variant`. Same model as Alert / Button.

## Sizes

| `kjSize` | Default height (theme-owned) | Typical use |
|---|---|---|
| `'xs'` | 2 px | Inline indicators (above a row of cards). |
| `'sm'` | 4 px | Default for file-upload row progress. |
| `'md'` | 8 px | Default for full-page / form progress. |
| `'lg'` | 12 px | Standalone, e.g., a download centre's primary file. |

The directive only reflects `data-size`. Themes own the actual heights
via `--kj-progress-bar-height-*`.

## Examples to ship

Under `packages/core/src/progress-bar/` (headless, theme-agnostic):

1. **`progress-bar.example.ts`** — basic determinate bar driven by a
   signal, default theme.
2. **`progress-bar.retro.example.ts`** / **`progress-bar.finance.example.ts`**
   — themed variants of the basic example, mirroring the Toast / Alert /
   Button pattern.
3. **`progress-bar.indeterminate.example.ts`** — `kjValue` is `null`;
   demonstrates the CSS-animated stripe and that `aria-valuenow` is
   absent in the rendered DOM.
4. **`progress-bar.variants.example.ts`** — primary / success / warning /
   error side-by-side at 50%.

Under `packages/components/src/progress-bar/` (wrapper + chrome):

5. **`progress-bar.default.example.ts`** — `<kj-progress-bar>` with
   `kjValue` bound to a signal; a button advances the value.
6. **`progress-bar.with-label.example.ts`** — `kjShowValueLabel="true"`,
   demonstrates the `aria-hidden` label.
7. **`progress-bar.value-text.example.ts`** — `kjAriaValuetext="Step 3
   of 5"` and `kjValue=60`. The bar visually shows 60%; AT reads
   *"Step 3 of 5"* (not *"60 percent"*).
8. **`progress-bar.indeterminate.example.ts`** — wrapper version of the
   indeterminate example, with the reduced-motion behaviour
   demonstrated in a docs note.
9. **`progress-bar.milestones.example.ts`** —
   `kjAnnounceMilestones="true"`; clicking a "Run" button drives the
   value 0 → 100 over 8 seconds; SR users hear "25% complete", "50%",
   "75%", "Complete".
10. **`progress-bar.mode-switch.example.ts`** — value transitions
    indeterminate → determinate → indeterminate to simulate "queued →
    streaming → server-processing"; demonstrates that the directive
    handles the toggle without re-mounting.
11. **`progress-bar.absolute-units.example.ts`** —
    `kjMin=0`, `kjMax=2_500_000`, `kjValue=bytesUploaded`,
    `kjAriaValuetext="1.2 MB of 2.5 MB"`. Demonstrates that the bar
    visualises the fraction correctly while the SR phrasing stays in
    bytes.
12. **`progress-bar.configured.example.ts`** —
    `provideKjProgressBar({ variants: [..., 'brand'] })` to extend
    presets.

## Open questions / risks

1. **`kjValue: number | null` vs. a separate `kjIndeterminate`
   boolean.** `null` is more ergonomic for reactive sources (a
   `Subject<number | null>` is natural; toggling a separate boolean
   in lock-step with the value is error-prone). The trade-off is that
   `null` is a special TS value and forces consumers to think about
   it. We accept the trade-off; `null` is the primary signal. A
   follow-up `kjIndeterminate` input is *not* planned because it
   would create two sources of truth.

2. **`<progress>` host support is "documented but not first-class".**
   The directive accepts `<progress kjProgressBar>` and warns if
   `[kjProgressBarFill]` is also projected (the fill is unused). The
   indeterminate ARIA story for `<progress>` varies across engines —
   we set `data-indeterminate` on the host but don't try to compensate
   for engine differences. Consumers who care about consistent
   indeterminate AT behaviour should use the `<div>` host.

3. **No buffer mode.** Material's buffer is video-specific and adds
   surface area we don't need yet. Plan: park as v1.x; if it returns,
   ship a sibling `[kjProgressBarBuffer]` directive that reflects a
   second CSS variable, rather than a `mode` flag on the root.

4. **No segmented (multi-stop) bar in v1.** A bar broken into
   discrete steps (Stepper-style) is a stepper concern, not a progress-
   bar concern. Stepper renders its own segmented chrome; if it wants
   to show *fractional* progress *between* steps, it composes
   `KjProgressBar` underneath with `kjValue` = overall completion.

5. **Striped / animated stripe is theme-only.** No `kjStriped` /
   `kjAnimatedStripe` input. If consumer feedback shows it's wanted at
   the directive layer (e.g., to flip stripes on for `warning` only),
   add `data-striped` reflection later — out of scope for v1.

6. **Milestone announcement thresholds default OFF.** Spamming AT
   isn't acceptable, but neither is *silent* progress for a 5-minute
   upload. We default `kjAnnounceMilestones` to `false` so the
   wrapper never announces unless the consumer asks; the file-upload
   wrapper sets it to `true` (with custom phrasing) on its per-row
   bars. Document this prominently — the pattern is opt-in by
   surface, not global.

7. **`aria-valuetext` precedence.** When both `aria-valuenow` and
   `aria-valuetext` are present, AT typically reads `aria-valuetext`
   exclusively. That's what we want for *"Step 3 of 5"*. Document
   that `aria-valuetext` should be a complete, standalone phrasing —
   not a suffix to the percentage.

8. **Reduced-motion behaviour for indeterminate is theme-owned.** The
   directive only reflects `data-reduced-motion`; if a theme forgets
   to honour it, the animation runs anyway. We add an axe rule? No —
   axe doesn't check this. We add a docs note + a unit test in the
   default theme that asserts the `animation` property collapses
   under `prefers-reduced-motion`. Other themes need to do the same;
   the rule is in the kouji theme-author checklist.

9. **Configurable preset shape — `KJ_PROGRESS_BAR_CONFIG`.** Mirrors
    `KJ_BUTTON_CONFIG` / `KJ_ALERT_CONFIG`:
    ```ts
    export interface KjProgressBarConfig extends KjBindablePresetConfig {
      variants: ['primary', 'success', 'warning', 'error'];
      sizes: ['xs', 'sm', 'md', 'lg'];
      defaults: { variant: 'primary'; size: 'md' };
    }
    ```
    Reuse `bindPresets(KJ_PROGRESS_BAR_CONFIG)` in the directive's
    `providers`. No new infrastructure.

10. **Progress vs. Meter — explicit non-goal.** `<meter>` /
    `role="meter"` is for **static** gauges (battery level, disk
    usage, vote count, password-strength dial). It is *not* a
    progress bar with no animation; it's a fundamentally different
    semantic — the value isn't the result of an in-flight operation,
    it's an instantaneous reading. APG: *"The meter pattern represents
    a value that falls within a known range"*; *"Do not use the meter
    pattern to indicate progress (as in a task-completion bar)."* We
    are **not building Meter** in v1 (it's not on the roadmap), and
    consumers who reach for `KjProgressBar` to render a battery
    indicator should be redirected — flag in the README and in the
    docs site's component picker. If Meter is added later it will
    have its own directive (`KjMeter`, `role="meter"`,
    `aria-valuemin/now/max`, no animation, possibly with optimum /
    low / high thresholds), not a mode on Progress Bar.

11. **Switching `kjValue` between numbers very rapidly.** If a
    consumer drives `kjValue` from a high-frequency observable
    (`requestAnimationFrame`-rate), every change triggers
    `aria-valuenow` re-binding. Browsers de-duplicate identical
    attribute writes, but `aria-valuenow="47"` → `"48"` → `"47"`
    bouncing on every frame may flood AT in some engines. Plan: the
    directive computes `valuenow` as `Math.round(clamped)` so a
    value moving from 47.0 to 47.4 doesn't change the attribute. Add
    a unit test for the rounding-stability behaviour.

12. **SSR.** No `setTimeout` / `IntersectionObserver` / DOM-measurement
    paths. The directive is fully signal-driven and SSR-safe. The
    only client-only piece is the `KJ_REDUCED_MOTION` signal, which
    short-circuits to `false` on the server (the signal primitive
    already does this for Carousel / Toast). Indeterminate animations
    don't run server-side; that's expected.

13. **Cancel / pause affordance.** Out of scope for `KjProgressBar`.
    Consumers render a sibling `KjButton` with `kjAriaLabel="Cancel
    upload"` and wire its `(click)` to their cancellation logic. The
    bar exposes nothing to bind to a cancel — it's a read model.

14. **Multiple progress bars in a list (file upload).** Each row's
    bar carries `aria-labelledby="row-id"` (the row's own label is
    the filename). With dozens of rows, AT users tab through *rows*,
    not bars; the bar is read passively when the row is focused. We
    do **not** add `tabindex="0"` to the bar. Document the row-level
    focus contract in `file-upload.md`.

15. **Animation for determinate transitions.** When `kjValue` jumps
    from `30` to `60`, the fill animates smoothly via the theme's
    CSS transition on `transform`. The directive does not run a JS
    animation. Consumers who want non-linear easing or per-update
    animation are stuck with the theme's default — that's
    intentional; deviating from the theme's motion language for one
    bar is an antipattern.
