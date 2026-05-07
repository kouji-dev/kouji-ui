# Slider / Range

A **Slider** is a draggable numeric input: a thumb travels along a track
between `min` and `max`, optionally snapping to discrete `step` increments,
optionally with two thumbs to express a `[low, high]` range. Visual
affordance is the whole point — there is no text-typing surface — which
forces a different shape from [Number Input](./number-input.md) (its
nearest sibling) even though the underlying numeric model is the same.

This file resolves five threading questions:

1. **Single vs. range** — does one directive cover both modes via a flag
   on the value model (`number | [number, number]`), or do we ship two
   directives? — see [Decision](#decision-core-directive).
2. **Native `<input type="range">` vs. custom rendering.** Native gives us
   the platform contract for free but cannot do two thumbs, cannot be
   styled to AAA contrast across browsers, and cannot expose tick
   labels. — see [Underlying rendering](#underlying-rendering).
3. **Composition.** Root directive that owns the value vs. a directive
   family (`KjSlider` + `KjSliderTrack` + `KjSliderThumb`) where each
   thumb is its own focusable element. — see [Composition](#composition-model).
4. **Continuous vs. discrete.** Tick rendering, snap behaviour, and
   `aria-valuetext` formatting per discrete step.
5. **Vertical orientation.** Real keyboard semantics for vertical
   sliders (Arrow-Up = increase even though "up" means "more"
   geometrically), and how `aria-orientation` interacts with the
   pointer-drag math.

## Source comparison

### PrimeNG — `<p-slider>`

PrimeNG's `<p-slider>` ([primeng.org/slider](https://primeng.org/slider))
is a standalone single-component slider with a flag-based range mode.

Public API surface (PrimeNG 17/18):

| Input            | Notes                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------- |
| `min` / `max`    | Numeric bounds. Default `0` / `100`.                                                         |
| `step`           | Increment value. Default `1`. Continuous when omitted (PrimeNG always snaps; "continuous" is `step=0` which it treats as `step=1`). |
| `orientation`    | `'horizontal' \| 'vertical'`. Vertical needs an explicit height; PrimeNG sets none for you. |
| `range`          | `boolean` — when `true`, model is `[low, high]` and two thumbs render.                      |
| `disabled`       | State.                                                                                       |
| `tabindex`       | Forwarded to the thumb (single thumb only — both thumbs share `tabindex` in range).         |
| `ariaLabel` / `ariaLabelledBy` | Accessible name forwarded to the thumb. In range mode, both thumbs share this. |
| `style` / `styleClass` | Per-DOM-target styling.                                                                |

| Output / model              | Notes                                                                       |
| --------------------------- | --------------------------------------------------------------------------- |
| `ngModel` / `formControl`   | `number` (single) or `[number, number]` (range). Type widens at runtime; consumers must know which they configured. |
| `onChange`                  | Emits `{ originalEvent, value, values? }` while dragging.                   |
| `onSlideEnd`                | Emits at pointerup / keyboard-commit.                                       |

Behaviour worth lifting:

- **Range mode shares the same component.** `range="true"` swaps the
  model shape and renders a second thumb; the track between the two
  thumbs is highlighted as the "selected" segment. This is the right UX
  shape: a range slider is one control conceptually (the user is
  selecting a span), not two independent sliders. We follow.
- **Thumbs are focusable elements with `tabindex="0"`.** Each thumb has
  `role="slider"` and a full `aria-valuemin/max/now` set. Clicking the
  track jumps the *nearest* thumb to that position — also the right
  default.
- **Keyboard contract on the focused thumb.** Arrow keys step by `step`;
  PrimeNG does **not** wire Page / Home / End. (We do — see APG.)
- **Pointer math.** PrimeNG computes the dragged value from
  `(pointerX − trackLeft) / trackWidth * (max − min) + min`, then snaps
  to the nearest `step`. Edge handling: if the pointer is outside the
  track, the value clamps to `min` / `max`. Vertical mirrors the math on
  the Y axis with the inversion (top of the track = `max`).

Critique:

- **`range` as a boolean that mutates the model shape is awkward.** A
  consumer reading `[(ngModel)]="value"` cannot tell from the binding
  whether `value` is `number` or `[number, number]`; it's typed by
  configuration. TypeScript can't help. We mitigate by exposing two
  template-friendly model inputs (`kjValue` for single, `kjRange` for
  range) and a single underlying mode signal — see
  [Decision](#decision-core-directive).
- **No `Page` / `Home` / `End` keyboard.** WAI-ARIA APG Slider explicitly
  recommends `Home`/`End` (jump to min/max) and `PageUp`/`PageDown`
  (large step). PrimeNG omits them.
- **No `aria-valuetext`.** PrimeNG sets `aria-valuenow` only. AT users
  hear "55" instead of "55 percent" or "$55". Same gap as their
  number-input.
- **No `KjLiveRegion`-equivalent commit announcement.** Continuous drag
  with pointer never speaks the value through AT; only keyboard arrow
  presses fire AT updates because focus is on a `role="slider"` element
  whose `aria-valuenow` changes. PrimeNG is fine on this; we only need
  a live region for *committed* range-mode crossings (see
  [Open questions](#open-questions--risks) on cross-thumb behaviour).
- **No tick mark support.** Visual ticks under the track (Material's
  `discrete` mode) are absent from PrimeNG.
- **Range thumbs share `aria-label`.** With one label, AT cannot
  distinguish "Minimum" from "Maximum" thumb. Each thumb needs its own
  accessible name.
- **Range thumbs can cross each other.** PrimeNG silently swaps low/high
  if the user drags the low thumb past the high thumb. This is a
  valid UX choice (Apple iOS is the same) but should be configurable.
- **No `kjMinDistance` / minimum spread.** Range mode allows the two
  thumbs to coincide at the same value. Some UIs need a minimum
  spread (e.g. price filters where low must be at least $10 below
  high). Not in PrimeNG.

### Angular Material — `<mat-slider>` + `<input matSliderThumb>` (single) or `<input matSliderStartThumb> + <input matSliderEndThumb>` (range)

Material's MDC-based slider
([material.angular.dev/components/slider](https://material.angular.dev/components/slider))
shipped a redesign in v15: the slider is now a **container component
that owns the track** plus **one or two `<input type="range">` projected
inside as thumbs**. The native ranges supply the value model and form
integration; the container draws the visual track, thumb dots, and tick
marks.

Public API surface:

```html
<!-- Single -->
<mat-slider min="0" max="100" step="1" discrete showTickMarks>
  <input matSliderThumb [(ngModel)]="value" />
</mat-slider>

<!-- Range -->
<mat-slider min="0" max="100" step="1">
  <input matSliderStartThumb [(ngModel)]="low" />
  <input matSliderEndThumb   [(ngModel)]="high" />
</mat-slider>
```

| Input on `<mat-slider>`     | Notes                                                            |
| --------------------------- | ---------------------------------------------------------------- |
| `min` / `max` / `step`      | Numeric bounds, increment.                                       |
| `discrete`                  | When `true`, shows the value bubble above the dragging thumb.    |
| `showTickMarks`             | Tick marks at every `step` along the track.                      |
| `disabled`                  | State.                                                           |
| `displayWith`               | `(value) => string` for the value bubble (e.g. `"$55"`).         |
| `color`                     | Material theme palette token.                                    |

| Input on `<input matSliderThumb>` (or start/end) | Notes                          |
| ------------------------------------------------ | ------------------------------ |
| `[(ngModel)]` / `[formControl]` | `number`. Each thumb has its own form control. |
| `valueIndicatorText`        | Computed display for the value bubble + `aria-valuetext`.       |
| `aria-label` / `aria-labelledby` | Per-thumb. Range mode benefits — start vs. end can be named separately. |

Behaviour worth lifting:

- **Two form controls in range mode.** `matSliderStartThumb` and
  `matSliderEndThumb` are independent CVAs. This avoids PrimeNG's
  "value type widens with config" problem — at the binding site, each
  thumb is a `number`. We adopt this shape, with a sugar overlay
  (`kjRange: model<[number, number]>`) for consumers who want one
  binding for the pair.
- **`<input type="range">` per thumb under custom-rendered chrome.**
  Material projects native `<input type="range">` into the container
  but visually replaces the track and thumb. The native input keeps:
  - Form integration for free (CVA wired to `valueAsNumber`).
  - The browser's keyboard contract (Arrow / Page / Home / End — yes,
    `<input type="range">` natively supports all of them).
  - `role="slider"` plus `aria-valuemin/max/now` — *automatic*.
  - Native pointer dragging on the input — but Material *replaces* it
    with custom pointer math because the visual thumb is not the
    `<input>` element.
- **`displayWith` for the value bubble and `aria-valuetext`.** A single
  formatter function feeds both the visual bubble and the AT
  announcement. We mirror this exactly with `kjDisplayWith`.
- **`discrete` mode renders a value bubble.** Pure visual; the
  directive layer doesn't care, but the wrapper does.
- **Tick marks at every `step`** (`showTickMarks`). Cheap UX win for
  small ranges; visual noise for large. Wrapper concern.

Critique:

- **The `<input type="range">` projection means the *focusable* element
  is not the visual thumb.** Material aligns them by absolute
  positioning the `<input>` over the visual thumb. This is fragile —
  RTL, vertical orientation, and zoom break it routinely (Material's
  v15 release had several rounds of fixes). We **don't** project a
  hidden native input by default; we use a focusable `<button>` or
  `<div role="slider">` as the thumb, with a hidden native `<input
  type="range">` only when `kjUseNativeRange=true` (opt-in for
  consumers who want platform autofill / form-data semantics).
- **No vertical orientation.** Material 15+ dropped vertical sliders;
  the team cited "complexity vs. demand". We ship vertical because
  audio mixers, color pickers, and some industrial UIs need it. APG
  covers it.
- **Range mode requires two `[(ngModel)]`s, no single `[(ngModel)]` for
  the pair.** Some consumers want `[(kjRange)]="value"` where `value:
  [number, number]`. We expose both.
- **Tick mark labels are not supported** (only unlabeled dots). Some
  designs (e.g. discrete preset levels: "Low / Medium / High") need
  labels. Wrapper concern via projected `KjSliderTickLabel`.
- **Custom rendering means custom drag math** — Material reimplements
  pointer-to-value mapping despite having a native input. We do too,
  for the same reason; documenting that we accept the duplication
  knowingly.
- **`color` is a Material-theme concept** that doesn't translate.
  `KjVariant` covers the equivalent surface for kouji.

### shadcn/ui — Radix `<Slider>`

shadcn ([ui.shadcn.com/docs/components/slider](https://ui.shadcn.com/docs/components/slider))
re-exports Radix UI's `<Slider>` with a Tailwind skin. Radix's slider
is the cleanest composition model in the three references:

```tsx
<Slider.Root min={0} max={100} step={1} defaultValue={[50]}>
  <Slider.Track>
    <Slider.Range />        {/* highlighted span — selected portion */}
  </Slider.Track>
  <Slider.Thumb />          {/* one or two */}
</Slider.Root>
```

Public API surface (Radix):

| Component / prop          | Notes                                                                |
| ------------------------- | -------------------------------------------------------------------- |
| `<Slider.Root>` `value`   | Always `number[]`. Length 1 = single thumb, length 2 = range, length N = N thumbs. |
| `min` / `max` / `step`    | Bounds and increment.                                                 |
| `orientation`             | `'horizontal' \| 'vertical'`.                                         |
| `dir`                     | `'ltr' \| 'rtl'`.                                                     |
| `inverted`                | Reverses direction.                                                   |
| `minStepsBetweenThumbs`   | Minimum `step`-units between adjacent thumbs in a multi-thumb slider. |
| `<Slider.Thumb>` ref      | A focusable element rendered per thumb in `value`.                    |

Behaviour worth lifting:

- **Composition is one root + track + range fill + N thumbs.** This is
  the right shape for a directive family. Each piece can be styled
  independently; the consumer composes the visual track and thumb
  shapes themselves.
- **Multi-thumb (≥2) generalisation via `value: number[]`.** Radix
  treats single, range, and N-thumb sliders uniformly. We don't ship
  N>2 in v1 (no concrete use case in kouji's roadmap), but the
  underlying directive accepts an array and we cap at 2 by API. Adding
  N>2 later is a non-breaking widening.
- **`minStepsBetweenThumbs`** prevents thumb crossing in range mode.
  Equivalent to our `kjMinDistance` (in step-units) — see
  [Inputs](#inputs--outputs--models).
- **No native `<input type="range">` projection.** Radix uses a
  `role="slider"` `<span>` per thumb. Fully custom. Tab focus lands on
  the thumb; arrow keys move it. Form integration is the consumer's
  job (Radix is React; in the kouji port we add `KjFormControl`).

Critique:

- **No tick marks.** Out of scope for Radix; consumers DIY.
- **No discrete value bubble.** Same.
- **No keyboard `Home`/`End`/`Page` on the thumb** in older Radix
  releases — added later. We bake it from day one.
- **`value: number[]` is slightly awkward for the single case** —
  consumers write `[(value)]={[50]}` instead of `[(value)]={50}`. We
  expose `kjValue: number` and `kjRange: [number, number]` as the
  template-friendly inputs, and an internal canonical
  `values: Signal<number[]>` for the rendering layer.

### Cross-library summary

|                                  | PrimeNG `<p-slider>`        | Angular Material `<mat-slider>` | shadcn (Radix `<Slider>`)         | kouji direction                                                            |
| -------------------------------- | --------------------------- | ------------------------------- | --------------------------------- | -------------------------------------------------------------------------- |
| First-class component            | yes                         | yes (MDC redesign)              | yes (Radix-skin)                   | **yes** — `KjSlider` directive family                                      |
| Composition                      | one component               | container + projected `<input>` per thumb | root + track + range + thumbs    | **root + track + range fill + thumbs** (mirrors Radix)                     |
| Single vs. range                 | `range` boolean flag        | start-thumb + end-thumb         | `value: number[]`                 | **mode signal**, two template-friendly inputs (`kjValue`, `kjRange`)       |
| Underlying focusable element     | `<span tabindex=0>`          | projected native `<input type="range">` | `<span role="slider">`             | **focusable `<div role="slider">` (or any element)** by default; opt-in native via `kjUseNativeRange` |
| Form integration                 | one CVA on the component     | one CVA per thumb               | none (consumer wires)             | **one CVA per thumb** via `KjFormControl` on each `KjSliderThumb` + sugar `kjRange` model |
| `min` / `max` / `step`           | yes                         | yes                             | yes                               | yes                                                                         |
| `orientation`                    | yes                         | **horizontal only (v15+)**       | yes                               | **yes** — both                                                              |
| RTL                              | partial                     | yes                             | yes                               | **yes** — `dir="rtl"` inverts pointer-to-value math                        |
| `Home` / `End`                   | no                          | yes (native input)              | yes                               | **yes**                                                                     |
| `Page` / `Page` keys             | no                          | yes (native input)              | yes                               | **yes**, `kjPageStep`                                                       |
| Tick marks                       | no                          | yes (`showTickMarks`)           | no                                | **yes**, via `KjSliderTick` projection (wrapper layer)                     |
| Tick labels                      | no                          | no                              | no                                | **yes**, projected content per `KjSliderTick`                              |
| `aria-valuetext`                 | no                          | yes (`displayWith`)             | yes                               | **yes**, `kjDisplayWith`                                                    |
| Discrete value bubble            | no                          | yes (`discrete`)                | no                                | **yes** at wrapper layer; directive exposes `editing`/`dragging` signals    |
| `minStepsBetweenThumbs`          | no                          | no                              | yes                               | **yes**, `kjMinDistance` (in *value* units; convertible to step-units)      |
| Thumb-crossing policy            | swap silently               | swap silently                   | block (`minStepsBetweenThumbs=0` allows touch but not cross) | **block by default**; opt-in `kjAllowThumbCross: boolean` |
| Live-region announcement         | none                        | none                            | none                              | **opt-in** via wrapper using `KjLiveRegion` for non-AT-supported scenarios   |

## Decision (core directive?)

**Yes — and as a directive family of four.** The composition is:

| Directive                | Element                   | Role                                                                                             |
| ------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------ |
| `[kjSlider]`             | `<div>` (container)       | Owns the value model(s), bounds (`min/max/step/pageStep`), orientation, RTL, dragging state, tick definitions. Provides `KJ_SLIDER` context. **Does not** carry a single CVA — the per-thumb directive does. |
| `[kjSliderTrack]`        | `<div>` (child of root)   | Owns pointer event capture for "click on track jumps nearest thumb" and pointer-drag math. Carries `aria-orientation` mirror. Reports its bounding rect to the root for value-from-coordinate math. |
| `[kjSliderRange]`        | `<div>` (child of track)  | Highlighted span representing the *selected* portion (track→thumb for single, low-thumb→high-thumb for range). Pure visual; reads `values` from the context, sets inline `--kj-slider-start` / `--kj-slider-end` CSS custom properties (or `inset-inline-start` / `inline-size`). |
| `[kjSliderThumb]`        | `<button>` or `<div role="slider">` | Focusable, draggable. One per thumb (1 in single, 2 in range). Owns `role="slider"`, `aria-valuemin/max/now/text`, `aria-orientation`, `aria-label`, the keyboard contract, and one `KjFormControl` per thumb. Optionally wraps a hidden `<input type="range">` when `kjUseNativeRange=true`. |
| (optional) `[kjSliderTick]` | `<div>` or projected child | Visual marker at a step; in continuous mode there are none. Decorative by default (`aria-hidden="true"`); informative when given a label. |

Per `architecture.md` the family lives at
`packages/core/src/slider/` with one directive per file:

```
slider/
  slider.ts                ← KjSlider (root, value/bounds/context)
  slider-track.ts          ← KjSliderTrack (pointer math, click-to-jump)
  slider-range.ts          ← KjSliderRange (visual fill)
  slider-thumb.ts          ← KjSliderThumb (role=slider + per-thumb CVA)
  slider-tick.ts           ← KjSliderTick (decorative or labelled marker)
  slider.context.ts        ← KJ_SLIDER + KjSliderContext
  slider.geometry.ts       ← internal: pointer-to-value math (LTR/RTL × horizontal/vertical)
  slider.example.ts
  slider.range.example.ts
  slider.vertical.example.ts
  slider.discrete.example.ts
  slider.spec.ts
  index.ts
```

### Why a directive family rather than one root component

1. **Different ARIA contracts on different elements.** Each thumb is
   `role="slider"` with its own `aria-valuemin/max/now/text`. The
   container is the labelled element only when there is no individual
   thumb label — *and* when there are two thumbs each must have a
   distinguishing `aria-label` (e.g. "Minimum price", "Maximum
   price"). A single root cannot host two roles.
2. **Per-thumb CVA.** Following Material's correct call: each thumb
   carries its own `KjFormControl`, so `[formControl]` / `[(ngModel)]`
   on each thumb works without a custom serialiser. The `kjRange`
   model on the root is sugar that mirrors the two thumb controls in
   both directions.
3. **Pointer-event ownership lives on the track**, not the root. The
   track is the hit area; the root may have padding / labels / tick
   labels outside the hit area. Encapsulating pointer capture on the
   track makes the boundary explicit.
4. **`KjSliderRange`'s position is computed; making it its own
   directive lets it react via `effect()` to the context without the
   root needing to push styles down.** Same Tailwind-friendly
   `--kj-slider-*` CSS custom properties pattern used in
   [Number Input](./number-input.md)'s `[kjNumberInputGroup]`.
5. **Tick rendering scales.** Continuous slider has zero ticks;
   discrete slider may have many. A separate `[kjSliderTick]`
   directive keeps the root agnostic about tick generation strategy
   (manual placement vs. auto-generated from `step`).

### Why the value lives on `[kjSliderThumb]` (per-thumb CVA), not on `[kjSlider]`

Three reasons:

1. **Shape stability.** Whether the slider has 1 or 2 thumbs, each
   `[kjSliderThumb]` carries `KjFormControl<number>`. The model shape
   at each binding site is `number`. The root's `kjRange` is a derived
   bidirectional sync, not the canonical store.
2. **Form integration without a custom CVA.** A range slider in a
   `FormGroup` looks like
   `{ priceLow: FormControl<number>, priceHigh: FormControl<number> }`
   — natural and validator-friendly (`Validators.min` / `max` on each).
   A single composite `FormControl<[number, number]>` would need a
   custom validator vocabulary.
3. **Crossing prevention is a *coordination* policy on the root**, not
   a value-shape decision. The root reads both thumb values, enforces
   the `kjMinDistance` and `kjAllowThumbCross` policy, and writes
   clamped values back via the per-thumb CVA. The root *does* hold
   coordination state; it just doesn't hold *the* value.

### Why not extend `[kjNumberInput]`?

Slider and Number Input share the bounded-numeric model
(`min`/`max`/`step`/`pageStep`) and the ARIA `valuemin`/`max`/`now`/`text`
contract — but otherwise diverge:

- Slider's role is `slider`, not `spinbutton`.
- Slider has no text-typing surface, no masking, no display-vs-edit
  format swap, no `Intl.NumberFormat` hookup at the directive level
  (the wrapper can use one for `kjDisplayWith`). The directive's
  output is a number; how the value bubble or `aria-valuetext` reads
  is a formatting concern handled by `kjDisplayWith` (a function).
- Slider supports two-thumb range; Number Input does not (a "range"
  in number-input is two `[kjNumberInput]`s in a `[kjFieldGroup]`).
- Long-press auto-repeat does not apply to a slider thumb (drag, not
  button).
- Slider has orientation; Number Input does not.

`[kjSlider]` is therefore a **sibling** to `[kjNumberInput]`, not a
sub-directive. The shared utility is the **clamp + snap-to-step**
helper, which Slider promotes from inline (in Number Input) to
`packages/core/src/primitives/numeric/clamp-snap.ts` on landing — see
[Cross-component pointers](#cross-component-pointers) and
[Number Input's open question 17](./number-input.md#open-questions--risks).

## Base features

### Underlying rendering

The directive is **custom-rendered by default**: the focusable thumb is
a `<button type="button">` (or any focusable element with
`role="slider"`), and pointer-to-value math runs in the directive. The
directive exposes `kjUseNativeRange: input<boolean>(false)` to opt into
projecting a hidden `<input type="range">` per thumb for consumers who
want browser autofill, native form-data semantics, or the platform
keyboard contract verbatim. Trade-off matrix:

|                                  | Custom (default)                                       | Native `<input type="range">` (opt-in)                |
| -------------------------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| Two thumbs                       | yes                                                    | **no** — one input per thumb but no shared track natively |
| Custom thumb visual              | yes — direct on the focusable element                  | yes — overlay positioning hack (Material's approach)  |
| Tick marks                       | yes — projected siblings                               | yes — `<datalist>`, but browser support is thin       |
| AAA contrast / focus ring        | yes — themeable                                        | inconsistent across browsers                          |
| Vertical orientation             | yes (CSS + math)                                       | partial — `writing-mode` hack, browser-dependent      |
| Keyboard contract                | we own (Arrow / Page / Home / End)                      | browser owns                                          |
| Form-data on submit              | only if `KjFormControl` -> form serialisation runs     | yes — native input value submits with the form        |
| `aria-valuemin/max/now`          | we set explicitly                                       | browser sets                                          |
| `aria-valuetext`                 | yes via `kjDisplayWith`                                 | yes — we still set it (`kjDisplayWith`)               |
| RTL                              | we own (multiply axis by -1)                            | browser-inconsistent                                  |
| `prefers-reduced-motion`         | n/a (no motion in core)                                | n/a                                                   |

The custom path is the canonical one. Native is escape-hatch.

### Value model

- **Per-thumb (canonical):** `KjSliderThumb` carries
  `KjFormControl<number>`. `kjValue: model<number>` on the thumb is
  two-way bindable.
- **Single-mode sugar:** `[kjSlider]` exposes `kjValue: model<number>`
  that mirrors the **single** child thumb's value. If 0 thumbs are
  registered, `kjValue` is a write-buffer that flushes when a thumb
  registers. If 2 thumbs are registered, setting `kjValue` is a dev-mode
  warning ("use `kjRange` for two-thumb sliders") and is ignored.
- **Range-mode sugar:** `[kjSlider]` exposes
  `kjRange: model<[number, number]>` that mirrors the pair `[low, high]`
  in stable order regardless of which thumb registered first. Setting
  `kjRange` to a value where `low > high` swaps to `[high, low]` and
  re-emits.
- **`null` / empty:** sliders cannot be empty by design (a thumb is
  always somewhere on the track). At `[kjSlider]` initialisation, if
  no value is bound, each thumb defaults to its computed default:
  - Single: `min`.
  - Range: `[min, max]`.
- **NaN never escapes.** The thumb's CVA coerces `NaN` and out-of-range
  values to the nearest valid clamped + snapped value, then re-emits.

### Bounds and step

- `kjMin: input<number>(0)` — defaults to `0` (Material/PrimeNG default).
- `kjMax: input<number>(100)` — defaults to `100`.
- `kjStep: input<number>(1)` — increment unit. `0` (or any
  non-positive) means **continuous** — no snapping. The directive treats
  continuous as "snap to a value's full IEEE-754 representation"; ARIA
  consumers see no `aria-valuetext` rounding.
- `kjPageStep: input<number | undefined>(undefined)` — Page-key step.
  Defaults to `max(kjStep * 10, (kjMax − kjMin) / 10)` so that 10
  Page-presses traverse the whole range regardless of `step`.
- `kjStepBase: input<number | undefined>(undefined)` — lattice base.
  Defaults to `kjMin`. Snapping uses
  `kjStepBase + n * kjStep`.
- **Clamp policy:** clamp + snap on every commit and during drag.
  Unlike Number Input (which clamps only on commit because the user is
  *typing*), Slider has no concept of mid-typing — every pointer move
  and every keypress is a discrete commit. Always clamp + snap.

### Orientation

- `kjOrientation: input<'horizontal' | 'vertical'>('horizontal')`.
- Reflected as `aria-orientation` on each thumb (default for
  `role="slider"` is `horizontal`, so vertical must be explicit).
- Pointer-to-value math swaps axes:
  - Horizontal LTR: `value = min + (px − trackLeft) / trackWidth × range`.
  - Horizontal RTL: `value = min + (trackRight − px) / trackWidth × range`.
  - Vertical: `value = min + (trackBottom − py) / trackHeight × range`.
    Up = increase, regardless of `kjInverted`.
- Keyboard semantics:
  - Horizontal: `ArrowRight` = next thumb position toward `max` in
    visual reading order (LTR: increase; RTL: decrease).
    `ArrowLeft` = the other direction. **Independent** of orientation
    `aria-orientation`.
  - Vertical: `ArrowUp` = increase, `ArrowDown` = decrease (up means
    "more"). RTL has no effect on vertical sliders.
  - `ArrowUp`/`ArrowDown` work on horizontal sliders too (always
    `ArrowUp` = increase, `ArrowDown` = decrease) — APG explicit.
    `ArrowRight`/`ArrowLeft` work on vertical sliders too with the
    visual semantic (LTR right = up = increase).

### RTL

- `kjDirection: input<'ltr' | 'rtl' | 'auto'>('auto')` — `'auto'` reads
  `dir` from the closest ancestor `<html>`/`<body>`/element via the
  injected `Directionality` (we do not depend on `@angular/cdk/bidi` —
  see the no-CDK policy in `rules/stack.md`; we ship our own
  `KjDirectionality` token in `packages/core/src/a11y/`).
- Reflected on the track as `dir` (string, so wrapper styles can
  use `[dir="rtl"]` selectors).

### Inverted axis

- `kjInverted: input<boolean>(false)` — flips the *visual* track
  direction (`max` rendered at left/bottom, `min` at right/top) without
  changing the keyboard contract (Arrow-Right always moves the
  *keyboard-active* thumb toward `max` visually). Mirrors Radix's
  `inverted`. Rare; useful for "remaining time" sliders.

### Tick marks

- `kjTicks: input<readonly number[] | 'auto' | false>(false)` —
  - `false` (default): no ticks; continuous slider.
  - `'auto'`: auto-generate ticks at every `kjStep` between `kjMin` and
    `kjMax`. Hard-capped at 100 ticks (warn beyond) — at typical
    densities tick-count grows fast.
  - `readonly number[]`: explicit tick positions (e.g. `[0, 25, 50, 75, 100]`
    for non-uniform ticks).
- The root publishes the tick array on the context. `[kjSliderTick]`
  directives projected as siblings inside the track render at each
  position (consumer-driven), or — when the wrapper is in "auto"
  mode — the wrapper itself iterates the tick array and renders its
  own `<div kjSliderTick>` per entry.
- A tick is **decorative by default** (`aria-hidden="true"`). When a
  tick has projected text content (a label), the wrapper sets a
  `data-tick-label` attribute and may flip `aria-hidden="false"`; in
  practice tick *labels* are read as part of the slider's
  `aria-describedby` chain (composed by the field), not per-tick.

### Cross-thumb policy (range mode)

- `kjMinDistance: input<number>(0)` — minimum delta between low and
  high in *value* units. Default `0` means thumbs may touch (be equal)
  but not cross. Setting `kjMinDistance` to e.g. `5` enforces
  `high − low >= 5` at all times.
- `kjAllowThumbCross: input<boolean>(false)` — when `true`, dragging
  the low thumb past the high silently swaps the two; the model values
  reorder. Required for some UX (e.g. iOS Photos brightness/contrast
  paired sliders); **off by default** because it surprises form
  bindings (`priceLow` becomes `priceHigh` and vice versa, which is
  almost never what the validator expected).
- Block behaviour (default): when the user attempts to push beyond the
  partner thumb (or within `kjMinDistance` of it), the active thumb
  stops at the boundary; the partner thumb **does not move**. This
  mirrors Radix's `minStepsBetweenThumbs=0` block behaviour.

### Click-to-jump

- Clicking on the track moves the *nearest* thumb to the click
  position. In single mode there is one thumb so it's unambiguous. In
  range mode, "nearest" is by absolute value distance; ties go to the
  thumb on the side the click is closest to (left half → low thumb,
  right half → high).
- After click-to-jump, the moved thumb gains focus. Subsequent drag
  moves the focused thumb only.

### Pointer drag

- `pointerdown` on a thumb: capture pointer to the thumb element,
  enter "dragging" state. `KjSlider.dragging: Signal<boolean>`
  exposed on the context for wrapper visual states (e.g. show value
  bubble while dragging).
- `pointermove`: compute the new value via the geometry helper, write
  via the per-thumb CVA. Honour `kjMinDistance` / `kjAllowThumbCross`.
- `pointerup` / `pointercancel` / `lostpointercapture`: exit dragging.
  Emit `kjCommit` with the final value(s).
- `touch-action: none` on the track and thumbs (set via host binding) so
  vertical sliders don't conflict with page scroll. Documented for
  consumers.
- `kjDragThreshold: input<number>(0)` — px movement before drag
  begins. Default `0` (any move is a drag). Useful values: `2`–`4` to
  filter out hand tremor on touch devices. Open question: should
  default be non-zero for touch UAs? See [Open questions](#open-questions--risks).

## Accessibility (WCAG 2.1 AAA)

### Roles

| Element                  | Role                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------- |
| `[kjSlider]`             | none (it is a layout container).                                                     |
| `[kjSliderTrack]`        | none (decorative; pointer hit area only — not a semantic role).                      |
| `[kjSliderRange]`        | none — `aria-hidden="true"` (pure decoration).                                        |
| `[kjSliderThumb]`        | `slider`. Focusable. Each thumb is independently a `slider`-role element.            |
| `[kjSliderTick]`         | none — `aria-hidden="true"` by default; informative only when the wrapper composes labels into the slider's `aria-describedby`. |

Reference: WAI-ARIA APG **Slider**
([w3.org/WAI/ARIA/apg/patterns/slider/](https://www.w3.org/WAI/ARIA/apg/patterns/slider/))
and **Slider (Multi-Thumb)**
([w3.org/WAI/ARIA/apg/patterns/slidertwothumb/](https://www.w3.org/WAI/ARIA/apg/patterns/slidertwothumb/)).

### ARIA wiring on each `[kjSliderThumb]`

- `role="slider"`.
- `aria-valuemin` — reflects `kjMin()` (or, for the high thumb in
  range mode, the *effective* min: `lowValue + kjMinDistance`).
  Open question — see [Open questions](#open-questions--risks) on
  whether we narrow valuemin/max to the partner-thumb position. APG
  doesn't mandate it; PrimeNG and Material don't do it; Radix does.
  Decision: **mirror Radix** — narrow on each thumb so AT users are
  not told they can reach a value they can't.
- `aria-valuemax` — reflects `kjMax()` (or, for the low thumb,
  `highValue − kjMinDistance`).
- `aria-valuenow` — reflects the thumb's current value.
- `aria-valuetext` — reflects `kjDisplayWith(value, thumbIndex)`. When
  `kjDisplayWith` is undefined, `aria-valuetext` is omitted (AT falls
  back to reading `aria-valuenow`).
- `aria-orientation` — reflects `kjOrientation()`.
- `aria-label` — required input on `[kjSliderThumb]` (`kjAriaLabel`) or
  via the wrapping `[kjField]` (which auto-wires `aria-labelledby`).
  In range mode, **each thumb must have a distinguishing label**:
  `"Minimum"` / `"Maximum"`, or domain-specific (`"Lowest price"` /
  `"Highest price"`). The wrapper supplies sensible defaults the
  consumer can override per thumb.
- `aria-disabled` — reflected from `KjDisabled` (composed via
  `hostDirectives`).
- `aria-readonly` — reflects `kjReadonly` (a read-only slider can be
  focused and announced but not changed).
- `aria-invalid` — reflects
  `formCtrl.touched() && (formCtrl.invalid() || outOfRange())`. Out-of-
  range is a guard; the directive clamps before commit, so only
  programmatic out-of-range writes can trip it.
- `aria-required` — reflected from `KjFormControl` when the per-thumb
  control has `Validators.required`. Rare for a slider (the value is
  always defined) but consistent with siblings.

### ARIA wiring on `[kjSliderTrack]`

- `aria-orientation` — mirror; not strictly required (per APG, only
  thumbs need it), but kouji sets it for AT that surface track-level
  orientation cues (some screen readers do).

### Keyboard contract

The keyboard-focused thumb is the action target. Tab moves through
each thumb in DOM order (low first, high second in range mode).

| Key                  | Behaviour on the focused thumb                                                                |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `ArrowRight`         | Horizontal: increase by `kjStep` (LTR) / decrease by `kjStep` (RTL). Vertical: increase by `kjStep`. |
| `ArrowLeft`          | Horizontal: decrease by `kjStep` (LTR) / increase by `kjStep` (RTL). Vertical: decrease by `kjStep`. |
| `ArrowUp`            | Always increase by `kjStep`.                                                                   |
| `ArrowDown`          | Always decrease by `kjStep`.                                                                   |
| `PageUp`             | Increase by `kjPageStep`.                                                                      |
| `PageDown`           | Decrease by `kjPageStep`.                                                                      |
| `Home`               | Set value to effective `valuemin` (i.e. `kjMin` for single / low thumb, or `lowValue + kjMinDistance` for high thumb). |
| `End`                | Set value to effective `valuemax` (i.e. `kjMax` for single / high thumb, or `highValue − kjMinDistance` for low thumb). |
| `Enter` / `Space`    | No-op on a slider thumb (APG explicit). Consumers wishing for "commit and close" semantics should listen on the parent form. |
| `Escape`             | If currently dragging by pointer, cancel the drag and revert to the value at drag-start. Otherwise no-op. |
| `Tab` / `Shift+Tab`  | Standard focus movement (each thumb is its own tab stop).                                       |

Key-hold repeats via the browser's native `keydown` repeat. The
directive does not implement custom repeat acceleration (that's a
Number-Input stepper concern; key-hold on a slider arrow is already
fluid because `keydown` fires repeatedly).

### Focus management

- Each thumb is its own tab stop (`tabindex="0"`). In range mode, the
  low thumb is reached first (DOM order = visual order LTR; the
  wrapper places the low-thumb element before the high-thumb element
  in DOM regardless of `kjInverted` so focus order matches reading
  order, not visual order).
- Click on the track moves the nearest thumb *and* gives it focus.
  This is the only place pointer interaction grants focus to the
  thumb — pointerdown directly on a thumb leaves focus where it is
  (matching native `<input>` semantics: clicking a focused control
  doesn't refocus, clicking an unfocused control focuses).
- Disabled slider: the thumbs are still focusable (ARIA-disabled, not
  native `disabled`), so AT users can still hear "slider, 50, minimum
  0, maximum 100, disabled". Pointer interaction is suppressed via
  the same capture-phase `(click)` / `(pointerdown)` interceptor as
  `KjButton`.

### Touch target (WCAG 2.5.5 AAA — 44×44 CSS px)

- The visual thumb must be ≥ 44×44 px on touch breakpoints. Wrapper
  enforces via theme tokens (e.g. `--kj-slider-thumb-size: 44px` on
  `pointer: coarse`).
- The **track hit area** must be ≥ 44px in the cross-axis dimension
  (i.e. height for horizontal, width for vertical) so that
  click-to-jump works on touch. If the visual track is narrower (a
  3px hairline), the wrapper provides invisible padding on the
  `[kjSliderTrack]` element. The directive itself does no
  size-policing.

### Contrast

- Track unfilled: ≥ 3:1 against background (WCAG 1.4.11
  Non-Text Contrast).
- Track filled (`[kjSliderRange]`): ≥ 3:1 against unfilled track
  (state contrast) and ≥ 3:1 against background.
- Thumb: ≥ 3:1 against any background it overlaps (track filled,
  track unfilled, page background).
- Focus ring: ≥ 3:1 against the thumb (KjFocusRing's default token
  is theme-tuned to 4.5:1 minimum for AAA).
- Tick marks: ≥ 3:1 against track unfilled — ticks are visible UI.
- Tick *labels*: text contrast ≥ 7:1 (AAA 1.4.6) against background.

These are theme concerns; the wrapper enforces via Tailwind tokens
declared in `@kouji-ui/components`. Documented here so theme authors
have the targets in one place.

### Live region for announcements

`aria-valuetext` on `role="slider"` is announced by AT on change in
all three majors (NVDA, JAWS, VoiceOver). No additional `aria-live`
region is needed for keyboard interactions — the focused thumb's
announcement covers them.

For **pointer interactions** (mouse/touch dragging), most AT do not
re-announce a slider during drag because focus has not moved (the
thumb does not refocus per drag tick). This is APG-conformant — APG
doesn't require pointer-drag announcement — but kouji ships an
**opt-in** wrapper hook that uses `KjLiveRegion` (see
`packages/core/src/a11y/live-region.ts`) to announce the value at
drag-end (`pointerup`) when `kjAnnounceOnDrag: input<boolean>(false)`
is set on the wrapper. Off by default to avoid double-announcements
for AT that *do* reflect mid-drag changes.

For **range-mode crossing events** (when one thumb collides with the
partner's `kjMinDistance` boundary, or when a swap occurs in
`kjAllowThumbCross=true` mode), the wrapper announces "Minimum and
maximum swapped" / "Reached partner thumb" via the same
`KjLiveRegion`. Also opt-in (`kjAnnounceCrossing: input<boolean>(true)`
default true — these are silent state changes that benefit from a
nudge).

### Reduced motion

No motion in core. The wrapper's value-bubble fade-in/out and any
"snap" animation respect `prefers-reduced-motion: reduce` (instant
state change instead of transition). Same posture as `KjButton`.

## Composition model

### Directive layout

```html
<div kjSlider [(kjValue)]="volume" kjMin="0" kjMax="100" kjStep="1">
  <div kjSliderTrack>
    <div kjSliderRange></div>
    <button kjSliderThumb kjAriaLabel="Volume" type="button"></button>
  </div>
</div>

<!-- Range mode (two thumbs, two CVA bindings, plus optional kjRange sugar) -->
<div kjSlider [(kjRange)]="priceWindow" kjMin="0" kjMax="500" kjStep="5" kjMinDistance="20">
  <div kjSliderTrack>
    <div kjSliderRange></div>
    <button kjSliderThumb [(kjValue)]="priceWindow[0]" kjAriaLabel="Lowest price" type="button"></button>
    <button kjSliderThumb [(kjValue)]="priceWindow[1]" kjAriaLabel="Highest price" type="button"></button>
  </div>
</div>
```

In practice, the styled wrapper `<kj-slider>` collapses this into:

```html
<kj-slider [(value)]="volume" [min]="0" [max]="100" [step]="1" ariaLabel="Volume" />
<kj-slider [(range)]="priceWindow" [min]="0" [max]="500" [step]="5" [minDistance]="20"
           startAriaLabel="Lowest price" endAriaLabel="Highest price" />
```

### Shared state (`KJ_SLIDER` context)

```ts
export interface KjSliderContext {
  // Bounds
  readonly min: Signal<number>;
  readonly max: Signal<number>;
  readonly step: Signal<number>;          // 0 = continuous
  readonly pageStep: Signal<number>;
  readonly stepBase: Signal<number>;

  // Layout
  readonly orientation: Signal<'horizontal' | 'vertical'>;
  readonly direction: Signal<'ltr' | 'rtl'>;
  readonly inverted: Signal<boolean>;

  // Range coordination
  readonly minDistance: Signal<number>;
  readonly allowThumbCross: Signal<boolean>;

  // State
  readonly disabled: Signal<boolean>;
  readonly readonly: Signal<boolean>;
  readonly dragging: Signal<boolean>;
  readonly activeThumbIndex: Signal<number | null>;

  // Thumb registry — populated by KjSliderThumb on construction in DOM order
  readonly thumbs: Signal<readonly KjSliderThumbHandle[]>;

  // Track geometry — populated by KjSliderTrack on resize/scroll
  readonly trackRect: Signal<DOMRectReadOnly | null>;

  // Tick definition
  readonly ticks: Signal<readonly number[]>;

  // Display / formatting
  readonly displayWith: Signal<((value: number, thumbIndex: number) => string) | undefined>;

  // Mutations
  setThumbValue(thumbIndex: number, value: number, source: 'pointer' | 'keyboard' | 'programmatic'): void;
  beginDrag(thumbIndex: number): void;
  endDrag(): void;
  cancelDrag(): void;          // restores values from drag-start snapshot
}

export interface KjSliderThumbHandle {
  readonly index: number;
  readonly value: Signal<number>;
  readonly element: HTMLElement;
  readonly disabled: Signal<boolean>;
  setValue(value: number, source: 'pointer' | 'keyboard' | 'programmatic'): void;
  focus(): void;
}

export const KJ_SLIDER = new InjectionToken<KjSliderContext>('KjSlider');
```

`KjSlider` provides `KJ_SLIDER`. `KjSliderTrack`, `KjSliderRange`,
`KjSliderThumb`, `KjSliderTick` all `inject(KJ_SLIDER)`.

`KjSliderThumb`'s constructor calls `ctx.registerThumb(this)`; on
`OnDestroy` (`DestroyRef`-driven cleanup), `ctx.unregisterThumb(this)`.
The registry is the canonical source of "how many thumbs exist", which
drives the mode (`single` if 1, `range` if 2).

### `hostDirectives` composition

- `[kjSlider]` composes:
  - `KjDisabled` (input alias `kjDisabled`).
  - `KjVariant` (input alias `kjVariant`).
  - `KjSize` (input alias `kjSize`).
  - **Does not** compose `KjFormControl` (the per-thumb does).
  - **Does not** compose `KjFocusRing` (the per-thumb does — focus
    lives on the thumbs).
- `[kjSliderTrack]` composes nothing. Pointer-event owner.
- `[kjSliderRange]` composes nothing. Pure visual.
- `[kjSliderThumb]` composes:
  - `KjDisabled` (input alias `kjDisabled`).
  - `KjFocusRing`.
  - `KjFormControl` — owns the per-thumb CVA (`number`).
  - **Does not** compose `KjVariant`/`KjSize` (those live on the
    container; the wrapper's thumb component reads from theme tokens).
  - **Does not** compose `KjAriaDescribedBy` directly; the wrapper
    or [`field.md`](./field.md) wires hint/error `aria-describedby` —
    crucially, the field describes **all** thumbs identically (the
    single error message applies to whichever thumb is invalid).
- `[kjSliderTick]` composes nothing. Decorative.

### Cross-component pointers

- **Number Input** ([`number-input.md`](./number-input.md)) — closest
  numeric sibling. Shares the bounded-numeric model
  (`min`/`max`/`step`/`pageStep`/`stepBase`), the ARIA
  `valuemin`/`max`/`now`/`text` contract, and the keyboard contract for
  Arrow / Page / Home / End. **Action item:** on landing, Slider
  promotes the inline `clamp + snap-to-step` helper to
  `packages/core/src/primitives/numeric/clamp-snap.ts`. Number Input
  refactors to import the same helper. Tracked in
  [Number Input open question 17](./number-input.md#open-questions--risks).
  Differences worth carrying:
  - Slider's `role="slider"`, not `spinbutton`.
  - Slider has no text-typing surface (no masking, no display-vs-edit
    swap, no `Intl.NumberFormat` hookup at the directive — `kjDisplayWith`
    is the formatting hook, and the wrapper can pass a
    `Intl.NumberFormat`-backed function).
  - Slider supports two-thumb range; Number Input is single-value.
  - Slider has orientation; Number Input is implicitly horizontal.
  - Slider has no long-press auto-repeat (drag, not button).
- **Field / Form Field** ([`field.md`](./field.md)) — owns label
  association, helper text, error message, and `aria-describedby`
  wiring. The Slider directive only sets `aria-invalid` per thumb;
  the field wraps the slider + label + error. Note: when the field
  contains a *range* slider (two thumbs), the field's
  `aria-describedby` flows onto both thumbs identically; the
  `aria-labelledby` flow is **not** the right shape (each thumb needs
  a distinguishing label) — the field defers to the per-thumb
  `kjAriaLabel`. Document under Field's "composite controls" section.
  Soft block (same as Number Input): Field needs to define how it
  handles composite controls for the wrapper-level v1; the directive
  ships independently.
- **Form** ([`form.md`](./form.md)) — Slider ships as fully
  CVA-compliant per-thumb controls, so `[kjForm]` integration is free.
  Range mode binds two `FormControl<number>`s (typically inside a
  `FormGroup` shape `{ low, high }`). Validators recommended:
  `Validators.min(min)` / `max(max)` per thumb; for cross-thumb
  validation (e.g. "low must be ≤ high − minDistance"), a custom
  `FormGroup` validator. Document the recipe in Form.
- **Input** ([`input.md`](./input.md)) — shares no DOM shape; mention
  Slider only as "non-text-input form control" alongside Checkbox /
  Radio / Toggle.
- **Field Group** (future, `field-group.md`) — when a UI shows a
  slider plus textual numeric inputs side-by-side ("type a value or
  drag the slider"), the field-group binds both controls to the same
  `FormControl<number>`. Slider's per-thumb CVA is the fit.
- **Color Picker** (future, `color-picker.md`) — color pickers use
  three vertical sliders (HSL or RGB) plus a 2D area picker. The
  vertical-slider portion is `[kjSlider kjOrientation="vertical"]`
  verbatim. The 2D area is a *different* directive
  (`[kjAreaPicker]`); recommend cross-reference.
- **KjLiveRegion** (`packages/core/src/a11y/live-region.ts`) —
  announce-on-drag and announce-on-cross use it. Documented here as
  one of the few wrapper-level uses outside Toast / Alert.
- **Directionality** (`packages/core/src/a11y/directionality.ts`,
  to-be-shipped if not present) — Slider needs RTL detection. Cross-
  reference the directionality token; if it doesn't exist yet, this
  is the directive that motivates shipping it (no-CDK constraint
  rules out `@angular/cdk/bidi`).

## Inputs / Outputs / Models

### `[kjSlider]`

| Member               | Kind   | Type                                                | Default        | Notes                                                                                              |
| -------------------- | ------ | --------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------- |
| `kjValue`            | model  | `number`                                            | `kjMin`        | Single-mode sugar. Mirrors the single child thumb's value. Setting in range-mode is a dev warning.   |
| `kjRange`            | model  | `[number, number]`                                  | `[kjMin, kjMax]` | Range-mode sugar. Mirrors `[low, high]` in stable order. Setting an unordered tuple swaps + emits.    |
| `kjMin`              | input  | `number`                                            | `0`            | Lower bound. Reflected to thumbs as `aria-valuemin`.                                                  |
| `kjMax`              | input  | `number`                                            | `100`          | Upper bound. Reflected to thumbs as `aria-valuemax`.                                                  |
| `kjStep`             | input  | `number`                                            | `1`            | Increment unit. `0` (or non-positive) → continuous.                                                  |
| `kjPageStep`         | input  | `number \| undefined`                                | `undefined`    | Page-key step. Defaults to `max(kjStep * 10, (kjMax − kjMin) / 10)`.                                  |
| `kjStepBase`         | input  | `number \| undefined`                                | `undefined`    | Lattice base. Defaults to `kjMin`. Snapping uses `kjStepBase + n * kjStep`.                            |
| `kjOrientation`      | input  | `'horizontal' \| 'vertical'`                         | `'horizontal'` | Reflected as `aria-orientation` on each thumb.                                                       |
| `kjDirection`        | input  | `'ltr' \| 'rtl' \| 'auto'`                            | `'auto'`       | RTL handling. `'auto'` reads from injected `KjDirectionality`.                                        |
| `kjInverted`         | input  | `boolean`                                           | `false`        | Visual axis flip. Does not change keyboard semantics.                                                |
| `kjMinDistance`      | input  | `number`                                            | `0`            | Range mode: minimum delta in value units between low and high.                                      |
| `kjAllowThumbCross`  | input  | `boolean`                                           | `false`        | Range mode: when `true`, low/high silently swap when crossed.                                        |
| `kjTicks`            | input  | `readonly number[] \| 'auto' \| false`              | `false`        | Tick definition. `'auto'` generates per-`step` ticks (capped 100).                                    |
| `kjDisplayWith`      | input  | `((value: number, thumbIndex: number) => string) \| undefined` | `undefined` | Formatter for `aria-valuetext` and value bubble. Receives the thumb index to support per-thumb formatting in range mode. |
| `kjReadonly`         | input  | `boolean`                                           | `false`        | Reflected to thumbs as `aria-readonly`. Drag and key both ignored.                                    |
| `kjDisabled`         | input  | `boolean`                                           | `false`        | Forwarded to `KjDisabled`. Each thumb mirrors via the context.                                        |
| `kjDragThreshold`    | input  | `number`                                            | `0`            | Pixels of pointer movement before drag starts. `0` = instant.                                         |
| `kjAnnounceOnDrag`   | input  | `boolean`                                           | `false`        | When `true`, announces value via `KjLiveRegion` at drag-end. Off by default — most AT speak it already through `aria-valuetext`. |
| `kjAnnounceCrossing` | input  | `boolean`                                           | `true`         | Range mode: announce when a thumb hits the `kjMinDistance` boundary or when swap occurs.              |
| `kjVariant`          | input  | `KjVariant` (forwarded)                              | preset         | Same surface as `[kjInput]`.                                                                         |
| `kjSize`             | input  | `KjSize` (forwarded)                                 | preset         | Same surface as `[kjInput]`. Drives the 44×44 thumb minimum on touch breakpoints.                     |

| Output           | Payload                                                    | Notes                                                                              |
| ---------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `kjValueChange`  | `number`                                                   | Auto-emitted by `kjValue` model. Single mode only.                                  |
| `kjRangeChange`  | `[number, number]`                                          | Auto-emitted by `kjRange` model. Range mode only.                                    |
| `kjInput`        | `{ value: number \| [number, number]; thumbIndex: number; source: 'pointer' \| 'keyboard' \| 'programmatic' }` | Per-tick during drag and per-keypress. High frequency. |
| `kjCommit`       | `number \| [number, number]`                               | Fires once per *committed* change: pointerup, keypress (each), programmatic write. Distinct from per-tick `kjInput`. |
| `kjDragStart`    | `{ thumbIndex: number }`                                    | Pointerdown on a thumb (after threshold).                                            |
| `kjDragEnd`      | `{ thumbIndex: number; cancelled: boolean }`                | Pointerup / Esc-during-drag.                                                          |

### `[kjSliderTrack]`

No public inputs. One internal output for diagnostics:

| Output           | Payload                       | Notes                                                                |
| ---------------- | ----------------------------- | -------------------------------------------------------------------- |
| `kjTrackClick`   | `{ value: number; thumbIndex: number }` | Fires when click-to-jump moves a thumb. Surfaced as a debugging hook; the actual value mutation goes through the context. |

### `[kjSliderRange]`

No public inputs / outputs. Reads from the context.

### `[kjSliderThumb]`

| Member          | Kind   | Type                  | Default     | Notes                                                                                                  |
| --------------- | ------ | --------------------- | ----------- | ------------------------------------------------------------------------------------------------------ |
| `kjValue`       | model  | `number`              | `kjMin`     | Per-thumb value. Two-way bindable. CVA-bridged via `KjFormControl`.                                     |
| `kjAriaLabel`   | input  | `string \| null`       | `null`      | Required when there is no `aria-labelledby` from a `[kjField]` ancestor. In range mode, *each* thumb must have a distinguishing label. |
| `kjAriaLabelledBy` | input | `string \| null`     | `null`      | Alternative to `kjAriaLabel`. Forwarded to `[attr.aria-labelledby]`.                                      |
| `kjAriaValueText` | input | `string \| null`     | `null`      | Per-thumb override of the root's `kjDisplayWith`. Overridden value wins when set.                         |
| `kjDisabled`    | input  | `boolean`             | `false`     | Per-thumb disable. ORed with the root's `kjDisabled`.                                                    |
| `kjUseNativeRange` | input | `boolean`            | `false`     | Project a hidden `<input type="range">` for native form-data semantics. Off by default.                  |

| Output           | Payload                          | Notes                                                                              |
| ---------------- | -------------------------------- | ---------------------------------------------------------------------------------- |
| `kjValueChange`  | `number`                         | Auto-emitted by `kjValue` model.                                                    |
| `kjFocus`        | `FocusEvent`                     | Forwarded host event.                                                                |
| `kjBlur`         | `FocusEvent`                     | Forwarded host event.                                                                |

### `[kjSliderTick]`

| Member        | Kind   | Type                | Default     | Notes                                                                                              |
| ------------- | ------ | ------------------- | ----------- | -------------------------------------------------------------------------------------------------- |
| `kjValue`     | input  | `number` (required) | required    | Position of the tick along the axis (in value units, not px).                                      |
| `kjAriaHidden`| input  | `boolean`           | `true`      | Decorative by default. Set to `false` only when the tick has informative projected content that AT should read directly (rare — usually labels are composed via the field's `aria-describedby`). |

No outputs.

## Examples to ship

`@doc-example` groups in the directive's TSDoc:

1. **Default single** (`slider.example.ts`) — minimal: one slider, `kjMin=0
   kjMax=100 kjStep=1`, `[(kjValue)]`. Demonstrates pointer drag,
   click-to-jump, Arrow / Page / Home / End.
2. **Range** (`slider.range.example.ts`) — two thumbs, `[(kjRange)]`,
   `kjMinDistance=10`. Demonstrates per-thumb `aria-label`, no-cross
   block behaviour.
3. **Vertical** (`slider.vertical.example.ts`) — `kjOrientation="vertical"`.
   Demonstrates Up/Down keyboard semantics and CSS sizing for vertical
   tracks.
4. **Discrete with ticks** (`slider.discrete.example.ts`) — `kjStep=10
   kjTicks="auto"`. Demonstrates tick rendering and snap-on-drag.
5. **Tick labels** (`slider.tick-labels.example.ts`) — `kjTicks=[0, 25,
   50, 75, 100]` with projected `<div kjSliderTick kjValue="0">Low</div>` etc.
6. **Custom display** (`slider.display.example.ts`) — `kjDisplayWith`
   formats as `"$55"` / `"55 %"`. Demonstrates `aria-valuetext` and
   wrapper value-bubble both reading from the same formatter.
7. **RTL** (`slider.rtl.example.ts`) — `dir="rtl"` on an ancestor.
   Demonstrates pointer-math inversion and Arrow-Right semantic flip
   (Arrow-Right = decrease in RTL horizontal).
8. **Inverted** (`slider.inverted.example.ts`) — `kjInverted=true`.
   Demonstrates visual flip without keyboard flip.
9. **Reactive forms (single)** (`slider.form.example.ts`) — inside a
   `FormGroup` with `Validators.min` / `Validators.max`.
10. **Reactive forms (range)** (`slider.range-form.example.ts`) —
    `FormGroup({ priceLow, priceHigh })` with a cross-thumb validator.
11. **Native range opt-in** (`slider.native.example.ts`) — `kjUseNativeRange=true`,
    documents the form-data submission story.
12. **Themed** (`slider.retro.example.ts`, `slider.finance.example.ts`)
    — variant + size composition under retro and finance themes.
    Mirrors the structure used in `KjButton` and `KjInput`.

## Open questions / risks

1. **Default `kjMin` / `kjMax`.** PrimeNG and Material default to
   `0` / `100`. Radix has no default (required). We default to `0/100`
   to match consumer expectation and reduce required boilerplate.
   Documented; non-blocking.

2. **`aria-valuemin/max` narrowing in range mode.** Whether the high
   thumb's `aria-valuemin` is `kjMin` (global) or `lowValue +
   kjMinDistance` (effective). APG is silent; PrimeNG and Material do
   not narrow; Radix narrows. Decision: **narrow** — AT users should
   not be told "minimum is 0" when they cannot reach 0 because the
   partner thumb is at 50. Mirrors physical reality. Documented.

3. **Pointer hit-test for range thumbs at the same position.** If
   both thumbs sit at exactly the same value (only possible when
   `kjMinDistance=0` and the user has dragged them together), which
   one does click-on-track move? Decision: the thumb on the side the
   click came from (left half of the slider's midpoint → low; right
   half → high). If the click is exactly at the midpoint (rare),
   prefer the *previously-active* thumb (`activeThumbIndex` from the
   context). If neither has been active, prefer high (so clicks tend
   to widen the range, not collapse it). Documented.

4. **Drag threshold default.** `0` (any movement is a drag) is
   correct on mouse but not on touch (hand tremor). Open question:
   should the directive auto-detect touch via `pointerType` and
   apply a default threshold of e.g. 4px on touch only? Decision:
   **yes — per-pointer-type default**. `kjDragThreshold` overrides;
   when undefined, the directive uses `0` for `pointerType="mouse"` /
   `"pen"` and `4` for `pointerType="touch"`. Document.

5. **Click-to-jump on a disabled slider.** Does click on the track
   move the thumb when the slider is `kjDisabled` / `kjReadonly`?
   Decision: **no**, click-to-jump is suppressed in both states.
   Pointerdown on the track is intercepted by the same capture-phase
   handler as `KjButton`'s click suppression. Document.

6. **Vertical slider container height.** A vertical slider needs an
   explicit height to render. The directive does no CSS; the wrapper
   sets a sensible default (e.g. `200px`) when `kjOrientation="vertical"`
   and no explicit height is set. Open question: should the
   directive *warn* if it detects a 0-height vertical track? Decision:
   **dev-mode `effect()` warn** when track height is `0` after
   first render, similar to the `kjUseNativeNumber` + `kjFormat`
   conflict warn in Number Input. Document.

7. **Touch `touch-action`.** Setting `touch-action: none` on the
   track and thumbs prevents page scroll during drag. This is
   correct for sliders but conflicts with consumers who want
   *vertical* touch scroll on a *horizontal* slider (the page should
   scroll vertically when the user touches a horizontal slider with
   the intent to scroll the page, not drag the thumb). Decision:
   `touch-action: pan-y` on horizontal sliders (allows vertical page
   scroll, blocks horizontal drag-via-page) and `pan-x` on vertical
   sliders (mirror). The thumb itself uses `touch-action: none`
   (the user is committed to dragging once they hit the thumb).
   Documented.

8. **Pointer math precision near bounds.** Floating-point arithmetic
   in `(px - left) / width * range + min` can produce values like
   `99.99999998` near max. Decision: snap-to-step *and* a guard that
   if `value` is within `Number.EPSILON * (max - min)` of `max` it
   coerces to exactly `max` (and mirror at `min`). Documented.

9. **Continuous mode (`kjStep=0`) and `aria-valuetext`.** Without a
   `kjDisplayWith`, continuous values like `42.7314159` are read
   verbatim by AT. Decision: when `kjStep=0` and `kjDisplayWith` is
   undefined, the directive emits `aria-valuetext` formatted with
   `Intl.NumberFormat(LOCALE_ID, { maximumFractionDigits: 2 })`. The
   raw value is still on `aria-valuenow`. Documented.

10. **`kjValue` vs. `kjRange` collision.** A consumer who sets both
    `[(kjValue)]` and `[(kjRange)]` on the same `[kjSlider]` is
    ambiguous. Decision: **dev-mode warn**, prefer `kjRange` when
    two thumbs have registered, prefer `kjValue` when one. Document.

11. **`KjFormControl` per thumb with a single `kjValue`.** When the
    consumer binds `[(kjValue)]` on the **root** (single mode), the
    root mirrors to the single child thumb's `KjFormControl` via an
    `effect()`. The thumb's CVA still emits `kjValueChange`; the root
    listens. When the consumer binds `[formControl]` directly on the
    thumb, the root's `kjValue` reflects but does not own. Both work
    independently. Document.

12. **`kjAllowThumbCross=true` with reactive forms.** When low and
    high swap, the underlying `FormControl<number>`s swap their
    *values* (and emit `valueChanges`), but the controls themselves
    don't move (the consumer's `formControlName="priceLow"` still
    points at the same control). This means the form group ends up
    with `priceLow > priceHigh`, which is almost certainly a bug.
    Decision: **document loudly that `kjAllowThumbCross=true` is
    incompatible with reactive-forms range bindings**. The
    `[(kjRange)]` model sugar handles the swap correctly (it
    re-orders before emit). Open: whether to *runtime-warn* when
    both `kjAllowThumbCross=true` and the thumbs have
    `formControlName`. Decision: yes, dev-mode `effect()` warns.

13. **Effective-disabled abstraction.** Slider Track click suppression
    is the fourth consumer of the "ARIA-disabled + capture-phase
    click suppression + effective signal" pattern (after `KjButton`,
    Menu Item, Number Stepper). Same promotion target as Number
    Input — extract a `KjEffectiveDisabled` host directive. Defer to
    v1.1; carry the pattern inline in v1. See
    [Number Input open question 11](./number-input.md#open-questions--risks).

14. **N>2 thumbs.** Radix supports arbitrary thumb counts via
    `value: number[]`. We don't ship N>2 in v1 (no concrete kouji
    use case). The internal `thumbs: Signal<readonly KjSliderThumbHandle[]>`
    already holds an array, so widening later is a non-breaking
    relaxation (the API surface gains a `kjValues:
    model<readonly number[]>` sugar; existing `kjValue` /
    `kjRange` keep working). Documented as a forward-compat note.

15. **`KjLiveRegion` reuse.** Slider is the second non-toast user
    after [Status / Alert] components. The live region service is
    already in `packages/core/src/a11y/`; the slider's
    announce-on-drag and announce-on-cross hooks call it directly.
    No new primitive needed. Cross-reference in the live-region
    primitive's docs.

16. **`KjDirectionality` token availability.** If the project does
    not yet have a non-CDK directionality token in
    `packages/core/src/a11y/`, Slider's RTL detection requires
    shipping it. The token is trivially small (read `dir` attribute
    from closest ancestor; expose `Signal<'ltr' | 'rtl'>`; subscribe
    via `MutationObserver`). **Action item:** if absent, ship as part
    of Slider's PR; mark for reuse by Date Picker / Calendar / Menu
    (which all have RTL concerns).

17. **Field composite-control wiring.** As with Number Input,
    [`field.md`](./field.md) needs to define how a single `[kjField]`
    wraps a *two-thumb* composite control. The `aria-describedby`
    flow onto both thumbs is straightforward; the `aria-labelledby`
    flow is *not* (each thumb needs its own label). Soft block on
    Field for the wrapper-level v1 (range mode); the directive-level
    v1 ships independently. Same posture as Number Input.

18. **Slider as a presets picker.** Some UIs use a discrete slider
    with labelled ticks as a preset selector ("Low / Medium / High /
    Very High"). The discrete slider with `kjTicks=[0, 1, 2, 3]` and
    a `kjDisplayWith` mapping to the names is the recipe. Worth
    documenting as a known-good pattern; not an API change.

19. **`KjSliderRange` rendering math.** The `[kjSliderRange]`
    directive sets two CSS custom properties on its host:
    `--kj-slider-start: <0..1>` and `--kj-slider-end: <0..1>`,
    representing the percentage span of the highlighted region. The
    wrapper applies `inset-inline-start: calc(var(--kj-slider-start)
    * 100%)` and `inline-size: calc((var(--kj-slider-end) -
    var(--kj-slider-start)) * 100%)` (and the vertical mirror with
    `inset-block-end` / `block-size`). Open question: should the
    directive directly write inline-styles for `inset-inline-start`
    and `inline-size`, bypassing the custom properties? Decision:
    **custom properties only** — keeps the directive theme-agnostic
    and lets the wrapper choose its own rendering technique
    (e.g. `transform: translateX()` for GPU-accelerated dragging on
    low-end devices). Documented.

20. **SSR.** `getBoundingClientRect()` on the track is undefined on
    the server. The directive defers all geometry reads to
    `afterNextRender()` (per stack rules). First render shows a
    "neutral" range fill (start=0, end=value-as-fraction) computed
    purely from value/min/max; pointer math activates on hydration.
    Documented; non-blocking.

21. **Mouse-wheel changes value.** Some libraries listen to `wheel`
    on the track to step. We **do not** by default — same posture
    as Number Input (wheel-changes are an accidental-edit source).
    Consumers can call `ctx.setThumbValue(...)` from a `(wheel)`
    handler if they want it. Documented.

22. **Deciding which thumb the keyboard-active is on multi-thumb.**
    APG: each thumb is its own tab stop, so the user explicitly
    selects which thumb to manipulate by tabbing. We follow. No
    "active thumb" indicator beyond focus. Documented.
