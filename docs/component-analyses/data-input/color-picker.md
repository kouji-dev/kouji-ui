# Color Picker

A **Color Picker** lets the user pick a color through a graphical interface:
a swatch trigger button shows the current color; a popup panel renders the
two-axis saturation/value square, a hue slider, an optional alpha slider,
optional preset palette, optional eyedropper button, and hex / RGB text
inputs that mirror the visual selection. The native browser primitive
(`<input type="color">`) covers the "I just need a color" case but is a
black box: no preset palette, no alpha, no hex field, no eyedropper, no
control over panel placement, no keyboard model that screen readers can
narrate, and a 44×32 swatch in the existing kouji styles that already
fails WCAG 2.5.5 (see [`input.md`](./input.md) Open questions).

This file resolves six threading questions:

1. **Native vs. custom** — when does the browser-native picker suffice,
   when must we render a custom panel, and how does the wrapper expose
   both modes? — see [Underlying rendering](#underlying-rendering).
2. **Composition.** Root + family of sub-controls
   (`KjColorPickerSwatch` / `KjColorPickerPanel` /
   `KjColorPickerSatValueArea` / `KjColorPickerHueSlider` /
   `KjColorPickerAlphaSlider` / `KjColorPickerHexInput` /
   `KjColorPickerRgbInputs` / `KjColorPickerPresets` /
   `KjColorPickerEyedropper`) — see [Composition](#composition-model).
3. **Color model algebra.** Internally we live in HSV (the only model
   where the sat/value rectangle and hue slider are independent axes),
   but the public binding can be hex, RGB, HSL, or HSV. We pick a
   default emit format and document round-trip stability.
4. **Alpha / transparency.** Optional alpha slider + checkerboard
   background; emitted format flips from `#rrggbb` to `#rrggbbaa` (or
   `rgba(...)`) when alpha is shown.
5. **Eyedropper API.** Modern Chromium ships `window.EyeDropper`. We
   feature-detect and progressively enhance — never required.
6. **Sat/value area accessibility.** A two-axis surface inside a single
   element is not a clean fit for `role="slider"` (one-axis) or
   `role="application"` (over-broad). APG explicitly addresses this for
   color pickers; we implement the recommended pattern.

## Source comparison

### PrimeNG — `<p-colorPicker>`

PrimeNG's [`<p-colorPicker>`](https://primeng.org/colorpicker) is a
single-component, opinionated picker with a small public surface.

Public API (PrimeNG 17/18):

| Input            | Notes                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------- |
| `format`         | `'hex' \| 'rgb' \| 'hsb'`. Default `'hex'`. Determines `ngModel` emit shape.           |
| `inline`         | Boolean. When `true`, panel renders inline (no popup); when `false`, swatch triggers an overlay. |
| `appendTo`       | Overlay attach target (`'body'`, ElementRef). Default in-place.                        |
| `disabled`       | State.                                                                                 |
| `tabindex`       | Forwarded to swatch trigger.                                                           |
| `style` / `styleClass` / `inputStyle` / `inputStyleClass` | Per-DOM-target styling.                            |
| `autoZIndex` / `baseZIndex` | Overlay stacking control.                                                  |
| `showTransitionOptions` / `hideTransitionOptions` | Animation timings.                                   |

| Output / model              | Notes                                                                       |
| --------------------------- | --------------------------------------------------------------------------- |
| `ngModel` / `formControl`   | Shape varies by `format`: `string` for `'hex'` (`"#rrggbb"`, no leading hash configurable), `{ r, g, b }` for `'rgb'`, `{ h, s, b }` for `'hsb'`. |
| `onChange`                  | Emits `{ originalEvent, value }` after panel commit.                        |
| `onShow` / `onHide`         | Panel visibility events.                                                    |

Internal pieces (not consumer-facing):

- **Saturation/Brightness rectangle.** A draggable circular handle on a
  hue-tinted gradient square. PrimeNG uses pointer math relative to the
  rectangle's bounding box; no keyboard support — *the rectangle is not
  focusable*.
- **Hue slider.** A vertical strip with a handle. Pointer-only — also
  not focusable.
- **No alpha.** PrimeNG's color picker emits opaque colors only.
- **No hex / RGB text input.** The popup is graphical-only; the
  consumer cannot type a value.
- **No preset palette.** No quick-pick row.
- **No eyedropper.**
- **No live announcement.** The panel does not narrate the current
  color to AT.

Behaviour worth lifting:

- **`inline` mode.** Useful for full-bleed pickers (e.g. an admin theme
  editor where the picker is the page). We expose the same flag.
- **`format` selection.** A single input that controls both the
  internal type and the emit shape is a clean API. We adopt with
  expansion (we add `'hsl'` and `'rgba'` / `'hsla'` for alpha).

Critique:

- **Accessibility is broken.** Neither the sat/value rectangle nor the
  hue strip is keyboard-reachable. There is no `role`, no
  `aria-valuenow`, no `aria-valuetext`. PrimeNG's color picker is
  pointer-only — fails WCAG 2.1.1 (Keyboard) outright. We must do
  better: each axis is a focusable widget with its own arrow-key
  contract.
- **No alpha.** A color picker without alpha is half a color picker;
  every modern design tool exposes it. We ship alpha behind
  `kjShowAlpha=true`.
- **No text input.** Designers paste hex codes constantly. A picker
  without a hex field forces them to drag a thumb until the readout
  matches — terrible UX. We ship `KjColorPickerHexInput` and
  `KjColorPickerRgbInputs`.
- **No presets.** Brand palettes (logo colors, status colors) are the
  most common picker use case. We ship `KjColorPickerPresets`.
- **No eyedropper.** Chromium has shipped `window.EyeDropper` since
  2021. We feature-detect and surface a button.
- **`format` mutates the model shape.** Same problem as PrimeNG's
  Slider `range` flag (see [`slider.md`](./slider.md)): the consumer
  cannot tell from `[(ngModel)]="value"` what `value` is typed as. We
  default to `'hex'` (a string — TypeScript-clean) and document that
  switching `format` is a binding contract change.

### Angular Material — **no first-class color picker**

Angular Material does **not** ship a color picker. The CDK does not
ship one either. The component is a known gap; the team's stance has
historically been that a good color picker is "either trivial (use
`<input type="color">`) or not in scope" (paraphrased from issue
discussions on `angular/components`).

Consequences:

- **Consumer-side options are community libraries** — `ngx-color-picker`,
  `mat-color-picker`, `ngx-mat-color-picker`, etc. Quality varies wildly;
  none are official. We do not depend on them.
- **No Material-styled reference.** The MDC color picker spec exists
  ([Material Design 3 color picker](https://m3.material.io/foundations/design-tokens/pairs)
  is design-token guidance, not a component). We are free of the
  opinionated-Material-component baseline that constrains other
  Data Input components — we own this surface.
- **Cdk Overlay would normally power our popup.** Per
  [`rules/stack.md`](../../rules/stack.md) we have a no-CDK policy, so
  the popup is wired through our own `KjPopover` / `KjOverlay`
  primitive (cross-reference: a future `overlay/popover.md` analysis,
  not yet written; the existing dialog and tooltip components share
  this primitive).

This is a **gap to flag** in the analysis: kouji-ui shipping a proper
color picker becomes a meaningful differentiator vs. Material consumers,
and pulls forward demand for our own `KjPopover` primitive (the panel
trigger pattern is reused by Date Picker, Time Picker, Combobox, Select,
Multi-Select, Cascade Select, Tree Select, Menu, Tooltip — every overlay
in the library).

### shadcn/ui — **no first-class color picker**

shadcn/ui does not ship a color picker either. The
[`ui.shadcn.com`](https://ui.shadcn.com) registry has no `color-picker`
recipe. The community pattern is to compose `Popover` + a third-party
React color library (`react-colorful`, `react-color`) inside the
popover content slot. The "code is yours" philosophy means there is
no maintained recipe — each consumer pulls in whichever lib they
prefer.

Pattern picked up:

- **Popover-as-trigger.** The Popover owns positioning, focus
  management, and the `aria-haspopup` / `aria-expanded` wiring on the
  trigger. The picker is *content* in the popover. This is the right
  composition: the picker should not own popover concerns. Our
  `KjColorPickerPanel` is rendered inside `KjPopover`, not as its
  own overlay.

Critique:

- **Same gap as Material.** No first-class component. The user composes
  a recipe; quality depends on which third-party they pulled in. kouji
  ships a real component.

### ng-primitives — no color-picker primitive yet (as of the cutoff)

ng-primitives ([angularprimitives.com](https://angularprimitives.com))
has slider, popover, and form primitives but no color-picker primitive
at time of writing. Closest analog is their `Popover` + `Slider`
composition — exactly what we use under the hood, but bundled as a
single component.

### Native `<input type="color">`

Browser-native: a single element that opens a system picker on click.

Public API:

| Aspect       | Notes                                                      |
| ------------ | ---------------------------------------------------------- |
| `value`      | Always `#rrggbb` (lowercase, six chars, leading hash). No alpha. |
| `list`       | When pointed at a `<datalist>` of `<option value="#rrggbb">`, the OS picker shows preset swatches (Chrome / Edge only). |
| `disabled`   | Native.                                                    |
| Events       | `input` (live), `change` (commit).                         |

Behaviour:

- **OS-native panel.** macOS shows the system Color Picker (with
  sliders, hex, palettes, eyedropper *via OS*). Windows / Chrome shows
  a small in-page popover with HSV + RGB + hex. Firefox shows a tiny
  hex strip. **Inconsistent across platforms.**
- **`<datalist>` presets.** The simplest preset palette possible — but
  only honored by Chromium-family browsers.
- **Always opaque.** No alpha channel.
- **Focus & keyboard.** Element is focusable; Enter / Space opens the
  OS panel; the OS panel itself is not keyboard-reachable from kouji
  on most platforms (it's an OS overlay).
- **Form-data wins.** `<input type="color">` round-trips through HTML
  forms perfectly.

Pattern picked up:

- **Hex (`#rrggbb`) is the most-portable emit format.** Aligns with
  CSS color values, with `<input type="color">`, with most design
  tools, and is a string (TypeScript-clean). We default to it.
- **`<datalist>`-style presets** are the right shape: an array of
  hex strings, optionally with labels. We surface
  `kjPresets: input<KjColorPreset[]>([])`.

Critique:

- **No customization.** The OS panel cannot be themed, sized, or
  positioned. Cannot add presets beyond `<datalist>`, cannot show
  alpha, cannot live-announce, cannot be inline.
- **44×32 swatch problem.** kouji's existing `[type="color"]` CSS
  reduces the input to 44×32 — already flagged in `input.md` as a
  WCAG 2.5.5 violation. The custom picker fixes this by rendering a
  44×44 swatch button.
- **Inconsistent UX.** A user on macOS sees a different picker than a
  user on Windows than a user on Linux. For a brand-controlled UI,
  unacceptable.

**Pattern picked up overall.** We ship a custom picker as the default
component (`<kj-color-picker>`). We expose `kjUseNative=true` as an
escape hatch for consumers who explicitly want the native picker
(typically forms that prioritize platform consistency over UI
consistency, e.g. accessibility-tooling consumers who trust the OS
picker more than ours). When `kjUseNative=true`, the wrapper renders a
plain `<input type="color">` with our chrome around it, and the
custom panel is not built. The directive layer (`KjColorPicker`)
remains constant — only the wrapper toggles which body to render.

## Decision: core directive?

**Yes — root directive `KjColorPicker` plus seven sub-directives.** The
contracts worth sharing across themes / consumers / sub-controls are:

1. **Color-model context** — a `KJ_COLOR_PICKER` injection token
   exposing the live HSV/RGB/HEX/HSL representation as Signals, plus
   `setHsv` / `setHue` / `setSaturationValue` / `setAlpha` / `setHex` /
   `setRgb` mutators. Every sub-directive consumes the same context;
   nobody "owns" the value except the root.
2. **`ControlValueAccessor` plumbing** via the existing `KjFormControl`
   primitive on the root directive. The emitted shape depends on
   `kjFormat`; the reverse (`writeValue`) parses any of the supported
   formats and reconciles them into the internal HSV+alpha state.
3. **Open / close state** for the panel, plus `aria-expanded` /
   `aria-controls` on the swatch trigger. Lives on the root context;
   consumed by `KjColorPickerSwatch` (writes `aria-expanded`) and
   `KjColorPickerPanel` (writes `aria-hidden` / mounts content).
4. **Live announcement** of the current color via `KjLiveRegion` —
   debounced to ~150ms during continuous drag, immediate on commit
   (Enter / blur / panel close). Speaks the **named** color when it
   matches a preset name, otherwise the active emit-format string
   ("hex two three four five six seven", or "R 35 G 86 B 213" — see
   [Open questions](#open-questions--risks) on AT pronunciation).
5. **`KjFocusRing`** composed on the root and on every focusable
   sub-control (swatch, sat/value handle, hue handle, alpha handle,
   hex input, R/G/B inputs, preset cells, eyedropper button) for the
   keyboard-only outline.
6. **`KjDisabled`** composed on the root, propagated through context
   to every sub-control. When the picker is disabled, swatch is not
   activatable, panel cannot open, sub-controls are non-interactive
   (kouji policy: ARIA-disabled with focus retained — same as
   [`actions/button.md`](../actions/button.md), unlike text inputs
   where we keep native `disabled`; see [`input.md`](./input.md)
   Open questions).

This is genuinely cross-cutting; a single component would couple
sat/value math, hue math, alpha math, hex parsing, RGB parsing, panel
overlay, form integration, and a11y announcements into one 800-line
file. Splitting into the directive family below keeps each piece
small enough to reason about and lets consumers compose
custom-layout panels (e.g. drop alpha, drop RGB inputs, swap the
preset row for a brand palette component) without forking the root.

## Underlying rendering

Two render modes, picked at the wrapper level by `kjUseNative`:

- **Custom (default).** `<button kjColorPickerSwatch>` opens a
  `<div kjColorPickerPanel>` rendered through `KjPopover`. The panel
  contains `KjColorPickerSatValueArea`, `KjColorPickerHueSlider`,
  optional `KjColorPickerAlphaSlider`, `KjColorPickerHexInput`,
  optional `KjColorPickerRgbInputs`, optional `KjColorPickerPresets`,
  optional `KjColorPickerEyedropper`. Every visual element is custom;
  we control hue gradient rendering (CSS conic-gradient for the hue
  strip, linear-gradient for sat/value), alpha checkerboard background
  (CSS `conic-gradient` against transparent), and thumb positioning
  (CSS `inset` from computed signals).
- **Native (`kjUseNative=true`).** Wrapper renders
  `<input type="color" [list]="presetsDatalistId">` plus an optional
  `<datalist>` from `kjPresets`. No custom panel; no alpha (native
  doesn't support); no eyedropper button (the OS picker may have one).
  `KjFormControl` still wires the value, but sub-directives are not
  mounted. Mostly a compatibility / forms-purist mode.

The custom panel uses **two `<input type="range">` elements as the
hue and alpha thumbs** (mirroring the Material Slider strategy from
[`slider.md`](./slider.md)) but **does not** use a native input for
the sat/value area — there is no native two-axis input. Instead, the
sat/value handle is a `<div role="slider" aria-orientation="">` with
custom keyboard handlers (see [Accessibility](#accessibility-wcag-21-aaa)).

The hue and alpha sliders **delegate to `KjSlider`** under the hood
(cross-reference [`slider.md`](./slider.md)) — same pointer math, same
keyboard contract, same `kjDisplayWith` for `aria-valuetext`. The
color-picker-specific concern is the gradient background of the track,
which the wrapper renders via CSS custom properties driven by signals
from `KJ_COLOR_PICKER`.

## Composition model

```
<kj-color-picker [(ngModel)]="brand" kjFormat="hex" kjShowAlpha kjShowEyedropper [kjPresets]="brandPalette">
  <!-- Default content, projected automatically by the wrapper.
       Consumers can override the panel by projecting their own. -->
  <kj-color-picker-swatch />
  <kj-color-picker-panel>
    <kj-color-picker-sat-value-area />
    <kj-color-picker-hue-slider />
    <kj-color-picker-alpha-slider />            <!-- gated on kjShowAlpha -->
    <kj-color-picker-hex-input />
    <kj-color-picker-rgb-inputs />
    <kj-color-picker-presets />                 <!-- gated on kjPresets.length > 0 -->
    <kj-color-picker-eyedropper />              <!-- gated on kjShowEyedropper && supported -->
  </kj-color-picker-panel>
</kj-color-picker>
```

### Directive family — headless layer

| Directive                          | Selector                          | Role                                                                                       |
| ---------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------ |
| `KjColorPicker`                    | `[kjColorPicker]`                 | Root. Owns HSV+alpha state, format, open/close, CVA. Provides `KJ_COLOR_PICKER`.           |
| `KjColorPickerSwatch`              | `[kjColorPickerSwatch]`           | The trigger button. Renders the current color; opens the panel; carries `aria-expanded` / `aria-controls` / `aria-haspopup="dialog"`. |
| `KjColorPickerPanel`               | `[kjColorPickerPanel]`            | The popup container. `role="dialog"`, `aria-label="Color picker"`, traps focus with `KjFocusTrap`, restores focus on close. |
| `KjColorPickerSatValueArea`        | `[kjColorPickerSatValueArea]`     | The 2-axis sat/value rectangle. `role="slider"` with `aria-orientation="horizontal"` and a custom keyboard model that handles both axes (see a11y). |
| `KjColorPickerHueSlider`           | `[kjColorPickerHueSlider]`        | One-axis hue slider. Wraps `KjSlider` `min=0 max=360 step=1`; sets `aria-valuetext` to "hue N degrees". |
| `KjColorPickerAlphaSlider`         | `[kjColorPickerAlphaSlider]`      | One-axis alpha slider. Wraps `KjSlider` `min=0 max=1 step=0.01`; `aria-valuetext` to "N percent opacity". |
| `KjColorPickerHexInput`            | `[kjColorPickerHexInput]`         | Hex text input. Wraps `KjInput` `kjType="text"`; validates `^#?[0-9a-fA-F]{3,8}$`; commits on blur or Enter. |
| `KjColorPickerRgbInputs`           | `[kjColorPickerRgbInputs]`        | Three numeric inputs (R / G / B). Each wraps `KjNumberInput` `min=0 max=255 step=1`. |
| `KjColorPickerPresets`             | `[kjColorPickerPresets]`          | Grid of preset cells. `role="listbox"` (each cell `role="option"`), arrow-key navigation. |
| `KjColorPickerEyedropper`          | `[kjColorPickerEyedropper]`       | Eyedropper button. Hidden when `window.EyeDropper` is undefined. Calls `new EyeDropper().open()`. |

`KJ_COLOR_PICKER` context exposes:

```ts
export interface KjColorPickerContext {
  // Internal canonical state — HSV + alpha; everything else is derived.
  readonly hue:        Signal<number>;       // 0..360
  readonly saturation: Signal<number>;       // 0..1
  readonly value:      Signal<number>;       // 0..1   ("brightness" in HSV)
  readonly alpha:      Signal<number>;       // 0..1

  // Derived representations (computed signals).
  readonly hex:  Signal<string>;             // '#rrggbb' or '#rrggbbaa' if alpha < 1 and showAlpha
  readonly rgb:  Signal<{ r: number; g: number; b: number; a: number }>;
  readonly hsl:  Signal<{ h: number; s: number; l: number; a: number }>;

  // Mutators — called by sub-directives.
  setHsv(h: number, s: number, v: number): void;
  setHue(h: number): void;
  setSaturationValue(s: number, v: number): void;
  setAlpha(a: number): void;
  setHex(hex: string): boolean;              // returns false on parse failure
  setRgb(r: number, g: number, b: number): void;

  // UI state.
  readonly open:        Signal<boolean>;
  readonly disabled:    Signal<boolean>;
  readonly format:      Signal<KjColorFormat>;
  readonly showAlpha:   Signal<boolean>;
  readonly presets:     Signal<readonly KjColorPreset[]>;
  setOpen(open: boolean): void;

  // Wiring — id minting for swatch ↔ panel ↔ live region.
  readonly panelId:     Signal<string>;
  readonly liveRegionId:Signal<string>;
}
```

### Wrapper components — styled layer

`KjColorPickerComponent` (`<kj-color-picker>`) composes the directive
family with default chrome. Sub-wrappers `<kj-color-picker-swatch>`,
`<kj-color-picker-panel>`, `<kj-color-picker-sat-value-area>`, etc.
exist for consumers who want to override the panel layout. Default
behaviour is "render everything"; consumers projecting their own
children inside `<kj-color-picker-panel>` opt out of the default
content (Angular content projection takes precedence).

### Cross-component pointers

- [`slider.md`](./slider.md) — hue and alpha sliders compose `KjSlider`
  one-to-one. Pointer math, keyboard contract, `aria-valuetext` via
  `kjDisplayWith` are all inherited. The color-picker-specific bit is
  the **track gradient background**, which is per-instance CSS driven
  by signals from `KJ_COLOR_PICKER`. Hue track is a static CSS
  `linear-gradient` (red → yellow → green → cyan → blue → magenta →
  red); alpha track is dynamic — it's the current opaque color faded
  to transparent, recomputed when hue/saturation/value change. Both
  tracks need a checkerboard *behind* them for alpha to be readable.
- [`input.md`](./input.md) — `KjColorPickerHexInput` is a `KjInput`
  with a hex-only validator and an opinionated `(blur)` /
  `(keydown.enter)` commit. Borrows the touched-gated `aria-invalid`
  semantics. The `KjColorPickerRgbInputs` group is three `KjNumberInput`s
  (cross-reference [`number-input.md`](./number-input.md)) bound to
  the R / G / B sub-signals.
- [`field.md`](./field.md) — when the color picker is wrapped in a
  `<kj-form-field>`, the **swatch trigger** is the labelled element
  (it carries the `id` and is the focus target). The panel itself
  does not get the field's `aria-describedby`; the swatch does.
  Mirrors the Select / Combobox pattern.
- **Future `overlay/popover.md`** — `KjColorPickerPanel` mounts
  through `KjPopover` (anchor = the swatch element). Popover handles
  positioning, scroll containment, viewport flipping, focus trap, and
  ESC / outside-click dismissal. Color picker does not duplicate any
  of this; same primitive used by Select, Combobox, Multi-Select,
  Cascade Select, Tree Select, Date Picker, Time Picker, Tooltip,
  Menu.
- [`form.md`](./form.md) — color-picker integrates as a single
  form control bound to a hex string by default. No special form
  treatment needed.

## Color models — internal vs. emitted

**Canonical internal state: HSV + alpha** (also called HSB).

Reasons:

- The sat/value rectangle is a 2-axis surface where x = saturation,
  y = value, hue held constant. RGB and HSL are the wrong basis: in
  RGB, no two axes form a constant-hue plane; in HSL, the
  saturation/lightness rectangle has the saturation axis collapsing
  toward white at the top *and* black at the bottom (a "diamond"
  shape), which is what HSL designers find unintuitive. HSV's
  rectangular shape is why every picker UI uses it.
- The hue slider is a 1-axis range over `[0, 360)` independent of
  S / V / alpha. Trivially modeled as a single number.
- The alpha slider is a 1-axis range over `[0, 1]` independent of
  H / S / V. Trivially modeled as a single number.

**Emitted format: configurable via `kjFormat`.** Default `'hex'`.

```ts
export type KjColorFormat = 'hex' | 'rgb' | 'rgba' | 'hsl' | 'hsla' | 'hsv' | 'hsva';
```

| `kjFormat` | Emitted shape                                                  | Notes                                                |
| ---------- | -------------------------------------------------------------- | ---------------------------------------------------- |
| `'hex'`    | `string` — `'#rrggbb'` (no alpha) or `'#rrggbbaa'` if `kjShowAlpha` and `alpha < 1` | Default. CSS-portable, form-portable, TS-clean. |
| `'rgb'`    | `{ r: number, g: number, b: number }` — each `0..255`          | `kjShowAlpha` ignored (use `'rgba'`).               |
| `'rgba'`   | `{ r: number, g: number, b: number, a: number }`               | `a` is `0..1`.                                      |
| `'hsl'`    | `{ h: number, s: number, l: number }`                          | `h` is `0..360`, `s` and `l` are `0..1`.            |
| `'hsla'`   | `{ h: number, s: number, l: number, a: number }`               |                                                     |
| `'hsv'`    | `{ h: number, s: number, v: number }`                          | The internal model — exposed for consumers who want to skip the conversion. |
| `'hsva'`   | `{ h: number, s: number, v: number, a: number }`               |                                                     |

**Round-trip stability.** Hex round-trips cleanly because we always
emit lowercase `#rrggbb` / `#rrggbbaa`. RGB / HSL / HSV round-trip with
quantization: HSV → RGB → HSV can drift by 1° of hue when the user
parks the thumb on a near-grayscale value (saturation ≈ 0). We
*preserve the canonical HSV state across renders* — i.e. when a
consumer sets `value = '#ffffff'` and the picker writes back, we keep
the user's last-edited hue / saturation rather than resetting to
`hue=0 sat=0`. The internal HSV is the source of truth; the emit
formats are projections.

**`writeValue` parsing.** When the consumer sets a value externally
(reactive form `setValue`, `[(ngModel)]` write), we parse against the
configured `kjFormat`:

- `'hex'` — accept `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`,
  `rgb(...)`, `rgba(...)`, `hsl(...)`, `hsla(...)`, **and** the named
  CSS colors (`red`, `cornflowerblue`, …) via a small lookup table.
  Reject anything else (no throw — invalid values leave state
  unchanged and emit a `console.warn` in dev mode only). Internally
  decompose to HSV+alpha.
- Object formats — type-check the keys and clamp values to range.

This is intentionally lenient on input and strict on output. Mirrors
how `<input type="color">` parses (lenient) and emits (always
`#rrggbb`).

## Alpha / transparency

Gated by `kjShowAlpha: input<boolean>(false)`. When true:

- **`KjColorPickerAlphaSlider` mounts** in the panel below the hue
  slider.
- **Track background** is a CSS gradient from
  `var(--kj-color-picker-current-opaque)` to `transparent`, layered
  over a checkerboard pattern. The opaque variable is updated by an
  effect that watches `hue / saturation / value`.
- **Swatch trigger background** also gets the checkerboard when alpha
  < 1, so the user can tell the color is translucent.
- **Hex emit format flips** to `#rrggbbaa` when `alpha < 1`. When
  alpha = 1, we emit `#rrggbb` (six chars) for compatibility with
  consumers who don't expect eight-char hex. Configurable via
  `kjAlwaysEmitAlpha: input<boolean>(false)` for consumers who need
  the format stable.
- **RGB inputs gain a fourth field** for alpha (0..1, two-decimal
  display).

When `kjShowAlpha=false`, alpha is forced to `1`. If the consumer
writes `'#aabbccdd'` while `kjShowAlpha=false`, we strip the alpha
silently (and emit a `console.info` in dev mode noting the strip).

## Eyedropper API

```ts
if (typeof globalThis.EyeDropper === 'function') {
  const eye = new globalThis.EyeDropper();
  const result = await eye.open();   // returns { sRGBHex: '#rrggbb' }
  ctx.setHex(result.sRGBHex);
}
```

- **Feature-detect at injection time.** `KjColorPickerEyedropper`
  reads `'EyeDropper' in globalThis` once and exposes a
  `supported: Signal<boolean>`. The wrapper hides the button when
  unsupported (Firefox, Safari at time of writing).
- **`abort` on panel close.** If the user closes the picker panel
  while the eyedropper is open, abort the request via
  `AbortController` to avoid a dangling promise.
- **`kjShowEyedropper: input<boolean>(true)`** — defaults on (since
  the button hides itself anyway when unsupported). Set to `false` to
  hide it explicitly.
- **Returned color is opaque** (`sRGBHex` is six-char). When
  `kjShowAlpha`, the existing alpha is preserved across the
  eyedrop — the user picked a hue/value, not a new opacity.

## Preset palette

`kjPresets: input<readonly KjColorPreset[]>([])`.

```ts
export interface KjColorPreset {
  readonly value: string;           // any parseable color string
  readonly label?: string;          // for AT — e.g. "Brand Red"
}
```

Rendered by `KjColorPickerPresets` as a `role="listbox"` grid (cell
size 32×32, with a 12px gap → meets touch target spacing per WCAG
2.5.5 *for the cluster*; individual cells smaller than 44 are fine
inside a listbox where the keyboard is the AT-supported entry path).

- **Click / Enter / Space on a preset** sets the color and *does not
  close* the panel (committing happens on panel-close per
  [Open questions](#open-questions--risks)).
- **Arrow keys** navigate the grid (Left / Right within a row, Up /
  Down across rows, Home / End to first / last in row, PageUp /
  PageDown across rows by N where N is the columns-per-row from CSS
  `grid-template-columns` count).
- **`aria-selected`** on the cell whose color matches the current
  state (within a small ΔE tolerance — see
  [Open questions](#open-questions--risks)).

## Accessibility (WCAG 2.1 AAA)

| Concern                              | Where                              | Mechanism                                                                          |
| ------------------------------------ | ---------------------------------- | ---------------------------------------------------------------------------------- |
| **Swatch role**                      | `KjColorPickerSwatch`              | `<button kjColorPickerSwatch>` — implicit `role="button"`. `aria-haspopup="dialog"`, `aria-expanded` reflecting `ctx.open()`, `aria-controls` referencing `ctx.panelId()`. Visually shows current color with a checkerboard backdrop when alpha < 1. |
| **Swatch label**                     | `KjColorPickerSwatch`              | Either an external `<label for>` (via `KjFormField`), an `aria-labelledby` from a heading, or `aria-label="Color picker"` as the fallback. The current color value is *announced via `aria-describedby`* pointing to a hidden text node "Currently: hex two three four five six seven" — keeps the label stable while the description tracks state. |
| **Panel role**                       | `KjColorPickerPanel`               | `role="dialog"`, `aria-modal="false"` (popovers are non-modal — page is still readable; matches WAI-ARIA APG dialog-modal vs. dialog-non-modal split), `aria-label="Color picker"`. Focus trap via `KjFocusTrap`. ESC closes; outside-click closes; focus restores to swatch. |
| **Sat/value area role**              | `KjColorPickerSatValueArea`        | `role="slider"`, `aria-orientation="horizontal"` (the more meaningful axis — hue is horizontal in our layout, but here the convention is to label the *primary* axis as horizontal even on 2-axis surfaces; APG color-picker example does this). `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-valuenow` reflects saturation × 100 (rounded), `aria-valuetext` is the full color label "saturation 75 percent, value 60 percent, hue 210 degrees". `tabindex="0"`. **Not `role="application"`** — that role is over-broad and tells AT to suppress all browse-mode shortcuts inside, which we don't want. |
| **Sat/value keyboard**               | `KjColorPickerSatValueArea`        | Arrow Right / Left → ±1% saturation. Arrow Up / Down → ±1% value (note: arrow-up *increases* value = brighter = up on screen, matching the visual). Shift+Arrow → ±10%. Home → saturation = 0 (hold value). End → saturation = 100. PageUp → value = 100. PageDown → value = 0. Announce committed value via `KjLiveRegion` after a 150ms idle. |
| **Hue slider**                       | `KjColorPickerHueSlider`           | Composes `KjSlider`. `role="slider"` (native via `<input type="range">` projected by KjSlider). `aria-orientation="horizontal"` (or "vertical" if the wrapper picks the vertical layout). `aria-valuemin="0" aria-valuemax="360" aria-valuenow`. `aria-valuetext` formatted as "hue 210 degrees" via `kjDisplayWith`. |
| **Alpha slider**                     | `KjColorPickerAlphaSlider`         | Same shape. `aria-valuemin="0" aria-valuemax="100" aria-valuenow` (we expose alpha as 0–100 to AT for whole-number announcements; internal model is still 0–1). `aria-valuetext` = "opacity 75 percent". |
| **Hex input**                        | `KjColorPickerHexInput`            | Native `<input type="text">` via `KjInput`. `aria-label="Hex color value"` when no visible label. `aria-invalid` when parse fails (touched-gated, same as `KjInput`). Pattern attribute `pattern="^#?[0-9a-fA-F]{3,8}$"`. Commits on blur or Enter; reverts on Escape. |
| **RGB inputs**                       | `KjColorPickerRgbInputs`           | Three `KjNumberInput`s with `aria-label="Red"`, `"Green"`, `"Blue"`. Each `min=0 max=255 step=1`. Bound to ctx.rgb sub-signals. |
| **Preset listbox**                   | `KjColorPickerPresets`             | `role="listbox"`, `aria-label="Preset colors"`. Each cell `role="option"`, `aria-selected`, `aria-label="{preset.label or preset.value}"`. Roving tabindex via `KjRovingTabindex`. |
| **Eyedropper button**                | `KjColorPickerEyedropper`          | `<button kjButton>` with `aria-label="Pick color from screen"`. Hidden when API unsupported. |
| **Live announcement**                | root via `KjLiveRegion`            | `aria-live="polite"`, `aria-atomic="true"`. Speaks the current color label after each commit (drag-end, keyboard step, hex parse success, preset click). Debounced to 150ms during continuous drag to avoid AT spam. The same region is referenced by every sub-control's `aria-describedby` for state updates. |
| **Disabled state**                   | root via `KjDisabled`              | ARIA-disabled (kouji house style for non-text-input controls — same as Button). Swatch retains `tabindex="0"` but its click handler no-ops; panel cannot open. Sub-controls in the panel ignore input. The text inputs (hex, RGB) follow `KjInput`'s policy split — they *do* set native `disabled` because a focused-but-blocked text field has no useful affordance (see [`input.md`](./input.md) Open questions). |
| **Touch targets**                    | wrapper CSS                        | Swatch ≥ 44×44 (fixes the existing `[type="color"]` 44×32 violation). Sat/value handle is at least 24×24 visually but its hit area is 44×44 via `padding` on the handle (transparent extension). Hue / alpha slider handles inherit `KjSlider`'s 44×44 hit area. Preset cells: ≥ 32×32 visual + ≥ 12px gap (allowed inside listbox keyboard nav). Eyedropper button ≥ 44×44. |
| **Color contrast**                   | wrapper CSS                        | Panel border, slider handles, hex/RGB labels — all ≥ 7:1 against panel background. The sat/value handle uses a *double-stroke* (white outer ring + black inner ring) so it remains visible against any background color, mirroring the Material slider thumb design. |
| **Focus management**                 | `KjColorPickerPanel`               | Open: focus moves to the sat/value handle (first interactive). Close: focus restores to swatch. `KjFocusTrap` keeps Tab cycling within the panel. Tab order inside panel: sat/value → hue → alpha → hex → R → G → B → presets (single tabindex via roving) → eyedropper → close button. |
| **Reduced motion**                   | wrapper CSS                        | `@media (prefers-reduced-motion: reduce)` disables panel slide-in / fade transitions. The drag updates themselves are not animated; they're 1:1 with pointer position. |
| **High-contrast / Forced-Colors**    | wrapper CSS                        | `@media (forced-colors: active)`: gradient backgrounds become solid swatches keyed off the `forced-color-adjust` policy on the actual color cells; thumbs use `CanvasText` borders. The picker remains usable in Windows High Contrast mode (color *display* fidelity is necessarily reduced — but the *interaction* is preserved). |
| **Internationalization of labels**   | `KJ_COLOR_PICKER_I18N` token        | Default English labels can be overridden via a token: "Hue", "Saturation", "Value", "Red", "Green", "Blue", "Hex", "Pick color", "Color picker" — same pattern as APG number-input localization. |

**Where it lives.** Roles, `aria-orientation`, `aria-valuemin/max`,
`aria-haspopup`, `aria-controls`, `aria-expanded` all live on the
**core directives** (host bindings). `aria-label` defaults live on
the **wrappers** (so consumers can override declaratively without
touching internals). `aria-describedby` chains and `aria-required`
mirroring come from the surrounding `KjFormField`
([`field.md`](./field.md)).

## Inputs / Outputs / Models — `kj`-prefixed

### Core directive (`KjColorPicker`, selector `[kjColorPicker]`)

| Name                  | Type                                                  | Default      | Notes                                                                                              |
| --------------------- | ----------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------- |
| `kjFormat`            | `input<KjColorFormat>('hex')`                         | `'hex'`      | Determines `writeValue` / emit shape. Switching at runtime is supported but is a binding contract change. |
| `kjShowAlpha`         | `input<boolean>(false)`                               | `false`      | Mounts the alpha slider; flips hex emit to 8-char when alpha < 1.                                  |
| `kjAlwaysEmitAlpha`   | `input<boolean>(false)`                               | `false`      | When `kjShowAlpha=true` and this is true, hex always emits 8 chars even at alpha=1. RGB→RGBA shape stays stable. |
| `kjShowEyedropper`    | `input<boolean>(true)`                                | `true`       | Even when true, the button is hidden if `EyeDropper` is unsupported.                               |
| `kjPresets`           | `input<readonly KjColorPreset[]>([])`                 | `[]`         | Empty array hides the preset row.                                                                  |
| `kjInline`            | `input<boolean>(false)`                               | `false`      | When true, panel renders in place (no swatch / popover).                                           |
| `kjUseNative`         | `input<boolean>(false)`                               | `false`      | Wrapper-only — toggles native `<input type="color">` rendering. Directive layer behaves the same.  |
| `kjDisabled`          | forwarded via `hostDirectives` to `KjDisabled`        | `false`      | ARIA-disabled posture across the picker.                                                           |
| `kjVariant`           | forwarded via `hostDirectives` to `KjVariant`         | `'default'`  | From `KJ_COLOR_PICKER_CONFIG`. Default set: `'default'`, `'filled'`, `'ghost'`.                    |
| `kjSize`              | forwarded via `hostDirectives` to `KjSize`            | `'md'`       | From `KJ_COLOR_PICKER_CONFIG`. `'sm'` / `'md'` / `'lg'` — affects swatch size and panel scale.     |
| `kjInvalid`           | `input<boolean>(false)`                               | `false`      | Touched-gated `aria-invalid`, mirrors `KjInput` semantics.                                         |
| `kjPanelClass`        | `input<string \| string[] \| undefined>(undefined)`   | `undefined`  | Applied to `KjColorPickerPanel` host for consumer-side panel styling.                              |
| `kjAriaLabel`         | `input<string \| undefined>(undefined)`               | `undefined`  | Override default "Color picker" name on the swatch.                                                |
| (output) `kjOpenChange`     | `output<boolean>()`                                   | —            | Fires on panel open / close.                                                                       |
| (output) `kjCommit`         | `output<KjColorValue>()`                              | —            | Fires when the user commits (panel-close or external `setValue`). Distinct from `ngModelChange` which fires on every drag step. |

Bidirectional value flow is through the composed `KjFormControl` —
no `kjValue` / `kjValueChange` on the directive. Consumers use
`[(ngModel)]` or `[formControl]` exactly as they would for a text
input. Same shape as `KjInput`, `KjSelect`, `KjSlider`.

### Wrapper component (`KjColorPickerComponent`, selector `kj-color-picker`)

Re-exposes the directive's surface; structural inputs documented
above. Adds:

| Name                  | Type                                                  | Default      | Notes                                                                                              |
| --------------------- | ----------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------- |
| `kjShowHexInput`      | `input<boolean>(true)`                                | `true`       | Controls visibility of `KjColorPickerHexInput` in the default panel.                               |
| `kjShowRgbInputs`     | `input<boolean>(true)`                                | `true`       | Controls visibility of `KjColorPickerRgbInputs` in the default panel.                              |
| `kjPanelPosition`     | `input<KjPopoverPosition>('bottom-start')`            | `'bottom-start'` | Forwarded to `KjPopover`.                                                                       |

All inputs are `kj`-prefixed per `rules/code_style.md`. Boolean inputs
use `input<boolean>(false)` (or `(true)` where the default is on)
shape (A) — property name carries the prefix.

### Sub-directive selectors

```html
<button kjColorPickerSwatch>...</button>
<div    kjColorPickerPanel>...</div>
<div    kjColorPickerSatValueArea></div>
<div    kjColorPickerHueSlider></div>
<div    kjColorPickerAlphaSlider></div>
<input  kjColorPickerHexInput />
<div    kjColorPickerRgbInputs></div>
<div    kjColorPickerPresets [kjPresets]="brandPalette"></div>
<button kjColorPickerEyedropper>...</button>
```

Each sub-directive injects `KJ_COLOR_PICKER` and is a no-op outside
that context (throws in dev, no-ops in prod — same convention as
`KjOption` outside `KjSelect`).

## Examples to ship

1. **Default** — `color-picker.example.ts`. Hex, no alpha, no presets.
2. **With alpha** — `color-picker.alpha.example.ts`. `kjShowAlpha`,
   `kjAlwaysEmitAlpha=false`. Demonstrates the swatch checkerboard
   when alpha < 1.
3. **With presets** — `color-picker.presets.example.ts`. Brand
   palette (8–12 colors with labels).
4. **Inline mode** — `color-picker.inline.example.ts`. `kjInline`
   true; demonstrates a full-width picker as a page section.
5. **Native fallback** — `color-picker.native.example.ts`.
   `kjUseNative=true`, with a `<datalist>` of presets.
6. **Reactive form + validation** — `color-picker.reactive.example.ts`.
   `[formControl]` with a custom `requiredHexValidator`. Shows
   `KjFormField` + `KjFormError` integration.
7. **Custom format (RGBA)** — `color-picker.rgba.example.ts`.
   `kjFormat="rgba"`, `kjShowAlpha=true`. Demonstrates the object
   binding shape.
8. **Eyedropper-only** — `color-picker.eyedropper.example.ts`.
   `kjShowEyedropper=true`; demonstrates the supported-feature
   degradation in non-Chromium browsers.
9. **Custom panel layout** — `color-picker.custom-panel.example.ts`.
   Consumer projects their own children into
   `<kj-color-picker-panel>` — e.g. presets at the *top*, hex at the
   *bottom*, no RGB inputs.
10. **Disabled** — `color-picker.disabled.example.ts`. `kjDisabled`
    true; swatch shows muted state, panel cannot open.
11. **Sizes** — `color-picker.sizes.example.ts`. `'sm'` / `'md'` /
    `'lg'` side-by-side.
12. **Variants** — `color-picker.variants.example.ts`. `'default'`,
    `'filled'`, `'ghost'`.

## Open questions / risks

- **`role` for the sat/value area: `slider` vs. `application` vs.
  `group`.** The WAI-ARIA APG color-picker example uses *two
  separate sliders* (one horizontal, one vertical) inside a
  `role="group"`. We could split the sat/value rectangle into two
  visually-overlapping sliders (saturation horizontal, value
  vertical) each focusable separately. The 2024 update to APG leans
  this way. The single-`role="slider"` approach we propose is closer
  to ng-primitives and react-aria's color-area pattern. **Decision:**
  ship single `role="slider"` on the area for v1 (one focusable
  control, intuitive arrow-key model that moves both axes), revisit
  if user testing reveals AT confusion. The `aria-valuetext` carries
  full state ("saturation 75 percent, value 60 percent") so the AT
  user does not lose information.
- **Continuous-drag announcements via `KjLiveRegion`.** We debounce
  to 150ms idle, but on a hue drag a user can sweep through 200+
  values per second. The live region needs to **drop** intermediate
  values, not queue them — i.e. last-write-wins with a single timer.
  Confirm `KjLiveRegion` already does this; if not, file a
  follow-up to its analysis (cross-reference `a11y/live-region.md`,
  not yet written).
- **Preset selection ΔE tolerance.** When the current state matches
  a preset to within ~ΔE 1.0, that preset shows `aria-selected="true"`
  and a visual ring. Below that threshold, no preset is selected. ΔE
  is in CIE Lab space (a perceptual metric). Implementing it requires
  RGB → Lab conversion (cheap; D65 white point assumed). Alternative:
  exact-string match on hex. Exact match misses the case where the
  user dragged 1 unit off a preset, which feels unselected. We pick
  ΔE 1.0. Worth user-testing.
- **Where does the consumer's existing `[(ngModel)]` see commits?**
  `ngModelChange` fires on every drag step (current model). `kjCommit`
  fires only on panel-close (or hex Enter, or preset click). This
  duality is convenient but un-ergonomic — most consumers want one or
  the other. **Decision:** add `kjCommitOn: input<'change' | 'commit'>('change')`
  so consumers can opt into the calmer "only on commit" mode without
  giving up `[(ngModel)]`. Mirrors Angular Forms `updateOn`.
- **`writeValue` parsing scope.** Accepting CSS named colors
  (`'red'`, `'cornflowerblue'`) requires a 148-entry lookup table
  (~3KB after gzip). Worth it? Consumers can normalize externally.
  **Decision:** ship the table — color picker is a "developer
  ergonomics" component, and rejecting `'red'` would be embarrassing.
  Tree-shake-friendly: the table is in a separate file, only pulled
  in if the parser needs it.
- **`<input type="color">` on the native side does not support alpha
  or presets-via-`<datalist>` cross-browser.** When `kjUseNative=true`
  and the consumer also sets `kjShowAlpha=true` or non-empty
  `kjPresets`, we *log a warning in dev* and silently degrade. Should
  this be a hard error? **Decision:** warn, don't throw — `kjUseNative`
  is a compatibility flag, and a hard error would defeat its purpose.
- **Color-blind users and color-only signals.** The picker by nature
  is a color-only UI; AT narration is the primary affordance for
  color-blind users. Ensure the hex / RGB readouts are **always
  visible** in the default panel (they are, but a consumer could hide
  them via `kjShowHexInput=false kjShowRgbInputs=false` and end up
  with a graphical-only panel — same WCAG 1.4.1 violation as
  PrimeNG). **Decision:** if the consumer hides both the hex and RGB
  inputs, the wrapper still renders a *read-only* hex value in the
  panel header (cannot be hidden). Documented behaviour.
- **Eyedropper API and iframes.** `EyeDropper.open()` rejects in
  cross-origin iframes (per spec). The eyedropper button must
  swallow the rejection silently and announce
  "Eyedropper unavailable in this context" to the live region. Test
  in our own docs site (which embeds examples in iframes).
- **Mobile / coarse-pointer.** The sat/value area on a 320px-wide
  phone is too small for fine pointer control. Consider a
  zoom-on-press affordance (the area expands to 90vw on touch-start)
  on mobile — out of scope for v1, document as a follow-up. The
  alternative is making consumers use the hex input on mobile, which
  is acceptable but not great.
- **Internal state vs. form state during drag.** While the user
  drags the sat/value handle, `ngModelChange` fires per pointer move
  (default `kjCommitOn='change'`). For reactive forms with
  `updateOn: 'blur'`, the form value only updates on panel close —
  but the picker UI follows the canonical HSV state (which is in the
  directive, not the form). This is correct (the directive owns the
  visual state during drag, the form owns the committed value on
  blur), but worth documenting because Angular's
  `updateOn` semantics are subtle.
- **Panel size and viewport collisions.** Default panel ≈ 280×340
  with all sub-controls on. On a 360px-wide phone in portrait, that's
  fine; in landscape with a soft keyboard up, the panel may overflow.
  `KjPopover` handles flipping (top → bottom, etc.) and viewport
  clamping; verify the alpha checkerboard doesn't clip. Cross-link
  the future `overlay/popover.md` with a sizing test.
- **HSL vs. HSV as the user-facing slider model.** We use HSV
  internally; some pickers (Adobe, Sketch) expose HSL on a separate
  tab. Ship both? **Decision:** no for v1. HSV via the sat/value
  rectangle is the universal pattern; consumers who want HSL get the
  HSL emit format (`kjFormat="hsl"`) which suffices for most cases.
- **`<datalist>` quirks in native mode.** Firefox does not honor
  `<datalist>` on `<input type="color">`. Document the gap; don't
  attempt to polyfill (we have a non-native mode for full control).
- **Forms: should the picker round-trip through `<input type="hidden">`
  for non-Angular form posts?** No — `KjFormControl` is the contract
  surface. Angular forms only. Document that vanilla form-data
  consumers should `kjUseNative=true`.
- **`aria-required` mirroring.** Like every other Data Input, the
  picker should auto-derive `aria-required` from
  `Validators.required` on the bound control. Same plumbing as
  proposed for `KjInput` — solve once, reuse.
- **Selector for sat/value area.** Considered `[role="slider"]`
  collisions: sat/value, hue, alpha all use `role="slider"`. AT
  reads them as three sliders in the panel — fine, but the
  `aria-label` on each must disambiguate ("Color saturation and
  value", "Hue", "Opacity"). Document the canonical labels in the
  wrapper.
- **`kjCommit` vs. `ngModelChange` duplication.** Two outputs that
  carry the same value at different times. Some consumers will bind
  both. **Decision:** ship both, document that `kjCommit` is the
  one to bind for "save to server" workflows and `ngModelChange`
  for "preview while dragging".
- **Color-picker inside a `KjFormField` and the describedby chain.**
  Field's hint / error ids should describe the *swatch*, not any
  internal control. The hex / RGB inputs already have their own
  internal descriptions (parse errors, range errors); they should
  *not* inherit the field's error id (that would announce the
  parent field's error from inside the panel). Cross-reference
  [`field.md`](./field.md): the rule "Field describes the labelled
  element only" handles this — the swatch is the labelled element,
  the panel internals are not.
- **Swatch transparency rendering on the trigger.** When alpha < 1,
  the swatch shows the color *over* a checkerboard so transparency
  is visible. The checkerboard tile size at small (`'sm'`) swatch
  sizes (32×32) is too tight visually. **Decision:** scale tile to
  4×4 on `'sm'`, 6×6 on `'md'`, 8×8 on `'lg'`. CSS-only.
- **SSR.** No browser-only APIs run during render — `EyeDropper`
  detection runs at first event handler invocation, not at injection.
  `KjPopover` already gates on `isPlatformBrowser`. Hue gradient is
  pure CSS. Confirm with an SSR smoke test once `KjPopover` is
  stable.
