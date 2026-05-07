# Spinner

A small, indeterminate "work in progress" indicator. The component
answers exactly one question for the user: *something is happening,
and we don't know how long it will take.* It does **not** show a
percentage, an ETA, or a step count — that is what
[`progress-bar.md`](./progress-bar.md) is for. It does **not** stand
in for missing content blocks — that is what
[`skeleton.md`](./skeleton.md) is for.

> Not yet shipped. No `packages/core/src/spinner/` directory exists
> today. This file specifies the directive, the a11y contract, the
> composition with peer components (notably Button's loading slot and
> File Upload's per-row progress), and the wrapper API to land for v1.

For the determinate counterpart that fills clockwise like a gauge or
linearly like a bar, see [`progress-bar.md`](./progress-bar.md). For
the placeholder pattern that occupies the geometry of the *not-yet-
loaded content* (e.g., card stubs, list rows, avatar circles), see
[`skeleton.md`](./skeleton.md). For the host that most often *contains*
a spinner, see [`../actions/button.md`](../actions/button.md). For
per-file upload progress, see
[`../data-input/file-upload.md`](../data-input/file-upload.md).

## Source comparison

| Concern | PrimeNG `p-progressSpinner` | Angular Material `mat-progress-spinner` | shadcn/ui (recipe-only) | daisyUI `loading` (CSS) | WAI-ARIA APG |
|---|---|---|---|---|---|
| First-class component? | Yes (`<p-progressSpinner>`) | Yes (`<mat-progress-spinner>` / `<mat-spinner>`) | **No** — convention is `<Loader2 className="animate-spin" />` from `lucide-react`, sometimes wrapped in a `<Spinner>` recipe | No directive — CSS classes only (`<span class="loading loading-spinner">`) | No spinner pattern; `role="status"` + `aria-live="polite"` is the live-region guidance |
| Indeterminate vs. determinate | `mode` removed in v17 — indeterminate-only | Both, via `mode="indeterminate" \| "determinate"` and `value` | Indeterminate-only (it's just an icon spinning) | Indeterminate-only (animations only) | n/a |
| Shapes / animations | One — circular SVG arc rotating | One — circular SVG arc rotating; determinate sweep when value-bound | One — whatever icon the consumer picks | Five: `loading-spinner`, `loading-dots`, `loading-bars`, `loading-ring`, `loading-ball`, `loading-infinity` | n/a |
| Sizing | `[style.width]`/`[style.height]`, `strokeWidth` | `diameter` (px), `strokeWidth` | Tailwind `size-4`/`size-6` etc. | `loading-xs/sm/md/lg/xl` | n/a |
| Color | `[styleClass]` + CSS vars (`--p-progressspinner-color-*` cycle of four colors during animation) | `color="primary" \| "accent" \| "warn"` | `text-*` (inherits `currentColor` — the icon is just text) | `text-primary` etc. (also `currentColor`) | n/a |
| ARIA | `role="progressbar"` (always — wrong for indeterminate-only widget without `aria-valuenow` semantics) | `role="progressbar"`, `aria-valuemin/max/now` for determinate; `aria-label` configurable | None by default — consumer must add `aria-label` and `role` | None — `<span>` with classes; consumer must wrap | `role="status"` + visually hidden text is the canonical pattern for indeterminate |
| Reduced motion | No special handling | No special handling | No (consumer's own animation) | No special handling | WCAG 2.3.3 — non-essential animation should respect `prefers-reduced-motion` |
| Inside Button | Manual — consumer overlays the spinner | `<button mat-button><mat-spinner diameter="20"/></button>` recipe | `<Button disabled><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving</Button>` recipe | Manual — `<button class="btn"><span class="loading loading-spinner"/></button>` | n/a |

**Read-off.** Material is the only library whose spinner is also a
*progress bar* (determinate mode) — and the docs explicitly say
"prefer linear for progress." That double-duty is a wart we should
not inherit; it forces every consumer of the indeterminate case to
load determinate machinery (sweep arc math, value clamping,
`aria-valuenow` reflection) they will never use. PrimeNG drops
determinate but ships `role="progressbar"` *without* the value
attributes, which is technically broken (`progressbar` requires
`aria-valuenow` or explicit `aria-valuetext`; an indeterminate
progressbar should at least say so via `aria-valuetext` — and even
then `role="status"` is the cleaner choice for "I'm working"). daisyUI
is CSS-only — no a11y at all. shadcn punts to the consumer. Sonner-
era best practice (and the APG live-region guidance) is `role="status"`
with a visually hidden label, which is what we will ship.

## Decision: needs a core directive?

**Yes, but minimally.** The spinner is the smallest non-trivial
directive in the library. It earns core for two reasons, and *only*
those two:

1. **A11y label is easy to forget and hostile to omit.** A bare
   spinning glyph that announces nothing to AT users is worse than no
   indicator at all (sighted users see "the page is working", AT users
   hear silence and think the click was lost). The directive owns
   `role="status"`, the default `aria-label="Loading"`, and the
   "no visible label and no override → render `<KjVisuallyHidden>` text
   automatically" rule. That contract is the same across every theme
   and every shape variant — it belongs in core.

2. **Reduced-motion fallback is theme-shareable.** WCAG 2.3.3 (AAA)
   requires that non-essential animation respect
   `prefers-reduced-motion: reduce`. Themes can pick their own
   reduced-motion expression (the agreed default is a slow opacity
   pulse instead of a continuous rotation), but the *decision* of
   "should I animate at all" is one consumers should not have to
   re-litigate per theme. The directive reflects
   `data-reduced-motion="true"` when the user preference is set, so
   themes only need to author one CSS rule.

What does **not** justify core, individually:

- Sizes / variants — solved by `KjSize` and `KjVariant` host
  directives (same as Button, Alert, Toast).
- Shape variants (spin / dots / pulse / bars) — pure CSS in the theme.
  The directive reflects `data-animation` and stops there.
- "Inside Button" composition — handled by Button's loading slot
  contract (see below), not by the spinner.

Two contracts, both small, both easy to get wrong: that's the bar
`rules/code_style.md` *What NOT to Build* sets, and the spinner
clears it. (Compare: `KjAlertIcon` clears the same bar with just
`aria-hidden="true"` enforcement.)

## Composition model

**One core directive. No supportive parts.** Unlike Alert / Dialog /
Toast, Spinner has no internal slots, no descendants that need a
shared context, no dismiss button, no actions. The whole contract
fits on the host.

```
KjSpinner   (selector: [kjSpinner], owns role/label/reduced-motion)
```

### Reused primitives

- **`KjVariant`** — host directive on `KjSpinner`, validated against
  `KJ_SPINNER_CONFIG.variants`. Default `'neutral'`. The spinner uses
  `currentColor` by default in themes (so a spinner inside a primary
  button is primary-coloured automatically, matching the daisyUI /
  shadcn / lucide convention) — `kjVariant` is an explicit override
  for free-standing usage. See *Color resolution* below.
- **`KjSize`** — host directive, validated against
  `KJ_SPINNER_CONFIG.sizes`. Default `'md'`. Themes own the px
  mapping. Sizes ship as `xs | sm | md | lg`; `xl` is **not** in the
  default set (a >40 px spinner usually wants a determinate Progress
  Bar instead — see *Open questions* #4).
- **`KjVisuallyHidden`** — composed automatically by the wrapper when
  the consumer provides no `kjAriaLabel` and projects no labelled
  child. Renders `<span kjVisuallyHidden>{{ kjAriaLabel() }}</span>`
  inside the spinner so the default "Loading" text reaches AT. Core
  directive consumers who write their own template are responsible
  for supplying their own visually-hidden label or an `aria-label` —
  the directive emits a dev-mode warning if neither is present (same
  posture as the icon-only Button warning).
- **`KjLiveRegion`** — **not** composed by default. The spinner is a
  *visual indicator that already has* `role="status"`; an additional
  hidden announcer would double-announce (or worse, announce the word
  "Loading" once on every render frame in some AT). Document that
  consumers who need an explicit "Loading users…" → "Done" pair
  should use `KjLiveRegion.announce()` from elsewhere in their
  template, not from the spinner.

### Cross-component pointers

- [`progress-bar.md`](./progress-bar.md) — the **determinate** sibling.
  Decision rule for consumers: if you can compute "x of y", use
  Progress Bar; if you cannot, use Spinner. Both can carry an
  optional textual status message; only Progress Bar reflects
  `aria-valuenow`. Document this matrix on both pages.
- [`skeleton.md`](./skeleton.md) — the **placeholder** sibling. Use
  Skeleton when the geometry of the missing content is known and you
  want to avoid layout shift on load (a list of 5 rows, an avatar +
  two text lines, a card grid). Use Spinner when the loading region
  has no meaningful geometry yet, or when it's centered in a
  bounded container (a panel, a button, a form's submit area).
  Mixing them is fine: a card body with a centered Spinner *inside* a
  Skeleton card border is a valid pattern for "we know there will be
  a card, we don't know how long it'll take".
- [`../actions/button.md`](../actions/button.md) — Button owns the
  `kjLoading` state and `aria-busy` reflection. The wrapper
  (`<kj-button>`) already renders an inline spinner element when
  `kjLoading()` is true (see button.md §"Examples to ship" /
  §"Loading spinner is wrapper-only"). The decision below makes
  that inline element an actual `<kj-spinner>` (replacing the
  hand-rolled `<span class="kj-button__spinner">` placeholder), and
  introduces a `[kjButtonSpinnerSlot]` projection point so consumers
  can swap shape (e.g., dots variant for a chat send button) without
  forking the wrapper.
- [`../data-input/file-upload.md`](../data-input/file-upload.md) —
  per-file upload rows show a spinner during pre-flight (signing the
  upload URL, computing checksum) and a Progress Bar during the
  bytes-on-the-wire phase. File Upload composes both; the spinner is
  used in its `'preparing'` state and replaced by Progress Bar once
  `'uploading'` starts. Document the state transition in
  `file-upload.md`.
- [`../navigation/pagination.md`](../navigation/pagination.md) and
  data list components — a centered Spinner is the default
  loading affordance when paging in a new result set. Themes ship a
  `kj-loading-overlay` recipe (consumer-side CSS) but the spinner
  itself is identical.

## Button's loading slot — the contract

Button has a `kjLoading` boolean. The wrapper renders chrome that
includes a spinner when `kjLoading()` is true. Two questions:

### 1. Does Button render its own spinner, or compose `<kj-spinner>`?

**Compose `<kj-spinner>`.** The button-spinner-shape contract
(role, label, reduced-motion, size, color) is exactly the spinner's
contract; duplicating it in the button wrapper would mean two places
to fix any spinner bug, two `aria-label` defaults, two
reduced-motion rules. The button wrapper **uses** `<kj-spinner>` and
does not maintain its own.

The button wrapper *picks the size automatically* from the button's
own size:

| `kjButton[kjSize]` | `kjSpinner[kjSize]` |
|---|---|
| `sm` | `xs` |
| `md` | `sm` |
| `lg` | `sm` |
| `icon` | `xs` |

(One step smaller than the button — the spinner sits inside the
button's content geometry and should not crowd the label.)

The button wrapper *does not pass* `kjVariant` to the spinner —
spinner inherits `currentColor` from the button's text color, which
is already correctly themed per button variant. (A primary button has
white text, the spinner should be white. A ghost button has its
parent text color, the spinner should match.) This is the daisyUI /
lucide convention and it just works.

### 2. Can the consumer customise the button's spinner?

**Yes, via a named projection slot:**
`[kjButtonSpinnerSlot]`. The default content of that slot is
`<kj-spinner kjAriaLabel="Loading">`. A consumer who wants a
dots-shaped indicator on a chat send button writes:

```html
<button kjButton type="submit" [kjLoading]="sending()">
  <kj-spinner kjButtonSpinnerSlot kjAnimation="dots" kjAriaLabel="Sending" />
  Send
</button>
```

The button wrapper is responsible for showing/hiding the slot
element based on `kjLoading()` — the consumer never writes
`*ngIf="kjLoading()"` themselves. The spinner element is removed
from the DOM (not just visually hidden) when `kjLoading()` is false
so its `role="status"` doesn't sit in the live tree announcing
nothing.

This split — Button owns the *visibility & timing*, Spinner owns the
*shape & a11y* — keeps the responsibilities clean and matches the
existing kouji pattern (Alert owns dismiss timing; Button owns
`aria-busy`; Toast owns its own queue).

The detail of the slot mechanic (named `<ng-content select="[kjButtonSpinnerSlot]">`,
fallback to the wrapper-rendered default when no projection is
provided) is documented in `button.md` and re-used here. No new
infrastructure.

## Centered overlays — leave to consumer (mostly)

A common request: "spinner centered in a card / panel / page".
Material ships nothing for this. PrimeNG ships `<p-blockUI>` (a full
overlay with z-index, dimmer, and a centred spinner) — large surface
area for a small problem. shadcn/Sonner ship nothing. daisyUI ships
nothing.

**Position:** **leave to the consumer.** A four-line theme recipe
covers it:

```css
.kj-loading-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--kj-color-base-100) 70%, transparent);
}
```

We do **not** ship a `<kj-spinner-overlay>` wrapper because:

1. The hard parts of an overlay (focus management, scroll lock,
   dimmer click-to-dismiss, z-index policy) only apply if it's
   *blocking* the user — and a blocking overlay is a Dialog
   (`role="dialog"` + `aria-modal="true"`), not a spinner. We have
   Dialog.
2. A non-blocking overlay (read-only, inert backdrop) is purely
   layout — exactly the kind of thing themes own and consumers can
   trivially style.
3. Wrapping it in a directive forces a positioning context on the
   parent (`position: relative`) that not every parent wants.

What we **do** ship: a documented "loading panel" example in
`<kj-spinner>`'s example set (see *Examples to ship* below) showing
the recipe, with `aria-busy="true"` recommended on the panel host
when its content is replaced with a spinner. That `aria-busy` is on
the **panel**, not on the spinner — it tells AT "this region is
loading", which is orthogonal to the spinner's own `role="status"`.

## Determinate spinner — out of scope

Material's `mat-progress-spinner` doubles as a determinate progress
indicator (a circular gauge filling 0→100). This is **not** a
Spinner concern in kouji. Reasoning:

- A determinate circular indicator is a Progress Bar in a different
  shape. Its a11y contract is `role="progressbar"` +
  `aria-valuenow/min/max`, not `role="status"`. The two contracts
  do not coexist on one element without contortions.
- Real determinate-circular use cases (download progress in a
  cloud-storage UI, recording-time-remaining in a voice memo widget)
  are rare and tend to want extra chrome (numeric label,
  cancel button, segment colors) that don't belong on a spinner.
- WCAG 1.3.1 (Info & Relationships) is much harder to satisfy on a
  pure circular gauge with no text label — the percentage must be
  surfaced textually in the accessible name. That's a Progress Bar
  problem, solved there.

If a future "circular progress" surface is needed, it ships in
`progress-bar.md` as `kjProgressShape="circular"` (or as a separate
`KjCircularProgress`), reusing the Progress Bar's value model. The
Spinner directive remains indeterminate-only.

## Base features

- **Animation shapes (preset, configurable):** `'spin'` (rotating
  arc, default), `'dots'` (three pulsing dots), `'pulse'` (single
  fading circle), `'bars'` (vertical bars rising/falling).
  Open-set — extend via
  `provideKjSpinner({ animations: [...KJ_SPINNER_DEFAULTS.animations, 'ring'] })`.
  The directive reflects `data-animation`; themes own the keyframes.
- **Variants (preset, configurable):** `'neutral'` (default —
  inherits `currentColor`), `'primary'`, `'secondary'`, `'success'`,
  `'warning'`, `'error'`, `'info'`. Default `'neutral'`.
- **Sizes (preset, configurable):** `xs | sm | md | lg`. Default
  `'md'`. (No `xl` by default — see *Open questions* #4.)
- **Label:** `kjAriaLabel` input, default `'Loading'`. Localisable
  by overriding the default via `provideKjSpinner({ defaults: { ariaLabel: 'Chargement' }})`
  or per-instance.
- **Reduced motion:** `prefers-reduced-motion: reduce` is observed
  via `inject(MEDIA_QUERY_LIST)` (re-using the same primitive that
  Toast and Carousel use) and reflected as
  `data-reduced-motion="true"`. Themes provide a CSS rule under that
  selector to swap rotation for opacity pulse. The directive does
  not animate anything itself — animation is theme-layer.

### State model

**Stateless.** The spinner does not own visibility, timing, or any
"Started / Finished" lifecycle. A consumer hides it by removing it
from the DOM (`@if`), or by binding the parent's `aria-busy` and
unmounting on completion. The directive does **not** offer a
`kjShown` input or a `kjStop()` method — both would invite the wrong
mental model ("the spinner controls when work is done"); work is
always controlled by the consumer's data flow, and the spinner only
visualises that flow.

## Color resolution

| Caller context | Effective color |
|---|---|
| `<kj-spinner>` standalone | `var(--kj-color-base-content)` (theme default — neutral text color) |
| `<kj-spinner kjVariant="primary">` | `var(--kj-color-primary)` |
| `<kj-spinner>` inside a `<kj-button kjVariant="primary">` (button-spinner-slot path) | `currentColor` — inherits the button's text color (which is already `--kj-color-primary-content`, i.e. the on-primary color). No explicit variant is passed. |
| `<kj-spinner>` inside an inline run of text | `currentColor` — the `neutral` variant resolves to `currentColor` in themes |

The contract: **`neutral` variant = `currentColor`**, every other
variant = the corresponding token. This matches lucide / daisyUI
behaviour and avoids the Material trap of needing to repeat the color
prop on every spinner that's already inside a coloured surface.

## Accessibility

Target: **WCAG 2.1 AAA**.

| Criterion | Requirement | Where it lives |
|---|---|---|
| 1.1.1 Non-text Content | Spinner has a text alternative — `aria-label` (default `'Loading'`) or a labelled child via `aria-labelledby` | `KjSpinner` host bindings; wrapper auto-projects `<KjVisuallyHidden>{{ label }}</KjVisuallyHidden>` if no labelled child is provided |
| 1.3.1 Info & Relationships | The spinner is exposed as a status region, not a progress bar | `role="status"` on the host |
| 1.4.6 Contrast (Enhanced, AAA) | The spinner glyph against its background ≥3:1 (non-text) — themes tune `--kj-color-*` per variant; `neutral` inherits text color so meets AAA whenever the surrounding text does | Themes — token contract documented in the theming guide |
| 2.3.1 Three Flashes | The spinning animation never flashes — continuous rotation, not strobe | Theme-level — keyframe authoring rule, validated by visual review |
| 2.3.3 Animation from Interactions (AAA) | `prefers-reduced-motion: reduce` swaps rotation for a slow opacity pulse | `KjSpinner` reflects `data-reduced-motion`; themes provide the alternate keyframe |
| 4.1.2 Name, Role, Value | `role="status"` with an accessible name | `KjSpinner` host bindings |
| 4.1.3 Status Messages | An indeterminate "I'm working" surface is exactly the AAA-sanctioned use of `role="status"` (`aria-live="polite"`) | Inherited from `role="status"` — no extra `aria-live` attr needed |

### Keyboard contract

**None.** Spinner is not focusable, has no `tabindex`, owns no keys.
Tab skips over it. (Consumers who need to expose a "Cancel" alongside
the spinner render a `<kj-button>` next to it; that button has its
own keyboard contract.)

### Focus management

**None.** Spinner never takes focus, never restores focus, never
shifts focus on mount or unmount. If the consumer is replacing
content with a spinner (e.g., a panel body), they should preserve
the panel's `aria-busy` and **not** move focus — moving focus to a
loading indicator is hostile (the user is reading, the AT user has
mid-sentence speech, etc.). Document this as a recipe in the
"loading panel" example.

### Live region nuances

- `role="status"` implies `aria-live="polite"` and
  `aria-atomic="true"` in modern AT, but we set
  `aria-live="polite"` and `aria-atomic="true"` explicitly on the
  host to avoid divergence across older NVDA / JAWS versions. (Same
  posture Toast takes for its `role="status"` items.)
- **Mounting a spinner does not announce.** AT users hear "Loading"
  *only when the spinner is freshly inserted into the live tree*.
  Hiding-and-showing the same DOM node by toggling `display: none`
  is **wrong** — it does not re-announce. Use `@if` (DOM
  insertion/removal) for the visibility toggle.
- **Long-running spinners are silent after the initial announcement.**
  This is correct behaviour — re-announcing every few seconds
  ("Loading… loading… loading…") is hostile. Consumers who need
  periodic progress updates should use `KjLiveRegion.announce()`
  with a meaningful message ("Still loading users — 30 seconds
  elapsed") instead of fighting the spinner.

### Dev-mode validation

`KjSpinner` runs an `effect()` in dev mode that asserts:

1. The host has either `kjAriaLabel` set, an `aria-label` attr, an
   `aria-labelledby` attr, or a projected child carrying any of
   those. Otherwise warn — "spinner without an accessible name."
2. The host is not `tabindex="0"` or focusable. Otherwise warn — a
   focusable spinner is a UX antipattern.
3. (Optional, low-priority) If the host has `role="progressbar"`
   forced via attribute, warn — that's the determinate path, use
   Progress Bar.

Warnings, not throws — same posture as the rest of the library.

## Inputs / Outputs / Models

### `KjSpinner` (`[kjSpinner]`, `exportAs: 'kjSpinner'`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjVariant` | `input` (preset) | `string` (validated against `KJ_SPINNER_CONFIG.variants`) | `'neutral'` | Forwarded to `KjVariant` host directive. Reflects `data-variant`. `'neutral'` resolves to `currentColor` in themes. |
| `kjSize` | `input` (preset) | `string` (validated against `KJ_SPINNER_CONFIG.sizes`) | `'md'` | Forwarded to `KjSize`. Reflects `data-size`. |
| `kjAnimation` | `input` (preset) | `string` (validated against `KJ_SPINNER_CONFIG.animations`) | `'spin'` | Reflects `data-animation`. Themes own keyframes per value. |
| `kjAriaLabel` | `input<string>` | `string` | `'Loading'` | Bound to `[attr.aria-label]` when no `aria-labelledby` is present on the host. |

No outputs. No two-way models. No public methods.

### `KJ_SPINNER_CONFIG` (preset config)

Mirrors `KJ_BUTTON_CONFIG` / `KJ_ALERT_CONFIG`:

```ts
export interface KjSpinnerConfig extends KjBindablePresetConfig {
  variants: ['neutral', 'primary', 'secondary', 'success', 'warning', 'error', 'info'];
  sizes:    ['xs', 'sm', 'md', 'lg'];
  animations: ['spin', 'dots', 'pulse', 'bars'];
  defaults: { variant: 'neutral'; size: 'md'; animation: 'spin'; ariaLabel: 'Loading' };
}
```

Reuse `bindPresets(KJ_SPINNER_CONFIG)` in the directive's
`providers`. No new infrastructure.

### Wrapper component (`<kj-spinner>`, components package)

Re-exposes everything on `KjSpinner` plus the visually-hidden label
auto-projection. Composes `KjSpinner` via `hostDirectives`
(`exportAs: 'kjSpinner'` preserved).

Wrapper template:

```html
<!-- themes own the visual glyph; this is the structural contract -->
<span class="kj-spinner__glyph" aria-hidden="true">
  <!-- per-animation SVG / divs supplied by the theme via :host([data-animation="…"]) -->
</span>
@if (shouldRenderHiddenLabel()) {
  <span kjVisuallyHidden>{{ kjAriaLabel() }}</span>
}
```

`shouldRenderHiddenLabel()` is `true` when the host has neither an
`aria-label` attribute nor an `aria-labelledby` attribute — i.e.,
when the directive's `kjAriaLabel` is the *only* source of the
accessible name. This guarantees AT always finds a name without
double-naming the host.

No new inputs at the wrapper layer — `KjSpinner`'s contract is
complete.

## Examples to ship

Under `packages/core/src/spinner/` (headless, theme-agnostic):

1. **`spinner.example.ts`** — bare `[kjSpinner]` on a `<span>`,
   default size and animation.
2. **`spinner.retro.example.ts`** / **`spinner.finance.example.ts`**
   — themed variants of the basic example, mirroring the Button /
   Alert / Toast pattern.
3. **`spinner.animations.example.ts`** — `spin`, `dots`, `pulse`,
   `bars` side by side at one size.
4. **`spinner.reduced-motion.example.ts`** — toggles a CSS-vars
   override that simulates `prefers-reduced-motion: reduce`,
   showing the fade-pulse fallback.

Under `packages/components/src/spinner/` (wrapper + chrome):

5. **`spinner.default.example.ts`** — `<kj-spinner>` standalone,
   default `aria-label="Loading"`.
6. **`spinner.sizes.example.ts`** — xs / sm / md / lg in a row.
7. **`spinner.variants.example.ts`** — neutral / primary / success
   / warning / error / info side by side.
8. **`spinner.in-button.example.ts`** — a `<kj-button kjLoading>`
   demonstrating the default spinner slot, then the same button
   with a `kjAnimation="dots"` spinner projected via
   `[kjButtonSpinnerSlot]`.
9. **`spinner.centered-panel.example.ts`** — a `.kj-loading-overlay`
   recipe with a centred spinner over a bounded panel; demonstrates
   `aria-busy="true"` on the panel (not the spinner) and the
   non-blocking nature of the dim layer.
10. **`spinner.with-label.example.ts`** — visible label
    ("Saving draft…") next to the spinner, wired via
    `aria-labelledby` so the visible text *is* the accessible name
    and no hidden duplicate is rendered.
11. **`spinner.localised.example.ts`** —
    `provideKjSpinner({ defaults: { ariaLabel: 'Chargement' }})`
    showing the global override path.

## Open questions / risks

1. **`role="status"` vs. `role="progressbar"` for indeterminate.**
   PrimeNG and Material use `role="progressbar"`; Sonner / shadcn
   recipes use `role="status"` (or none). APG's progressbar pattern
   *requires* `aria-valuenow` (it permits an indeterminate progressbar
   *only* via the explicit absence of `aria-valuenow`, and even then
   AT support is patchy). `role="status"` is the cleaner contract for
   "I'm working, no number to share." We ship `status`; if a real
   consumer needs a progressbar-style spinner (e.g., for an a11y
   audit tool that specifically looks for `role="progressbar"`),
   reconsider — but only by routing them to Progress Bar.

2. **Default label `'Loading'` is English.** Same problem every
   library has. The override paths (per-instance `kjAriaLabel`,
   global `provideKjSpinner({ defaults: { ariaLabel: '…' }})`) cover
   it, but a real i18n consumer will want to bind the label to a
   live translation signal — verify that
   `provideKjSpinner({ defaults: { ariaLabel: t('spinner.loading') }})`
   re-evaluates when the translation pipe's source changes. Likely
   needs the default to be a `Signal<string>` rather than a `string`
   in the config. Decide before locking the config interface.

3. **`KjVariant` `'neutral'` resolving to `currentColor`** is a theme
   concern, not a directive concern — the directive only reflects
   `data-variant="neutral"`. But it's worth a smoke test with the
   shipped themes to confirm the convention holds (especially the
   "spinner inside a primary button is white" case, which is the
   one that fails most often in other libraries). Add a visual
   regression test in the Button + Spinner pair.

4. **No `xl` size by default.** A spinner larger than ~32 px usually
   wants a determinate Progress Bar (the user is staring at it long
   enough to want a percentage). Themes can extend the preset list
   if they disagree — `provideKjSpinner({ sizes: [...defaults, 'xl'] })`
   — but the default is "use Progress Bar instead." Document the
   guidance in the size example.

5. **Dots / bars animations have an implicit aspect ratio that
   differs from spin / pulse.** A "spinner" that's a 3-dot row is
   ~3× wider than tall at the same height; a "spinner" that's a 4-bar
   row is ~2× wider than tall. Themes will need to set width
   independently from `--kj-spinner-size` for the non-circular
   shapes. Document the size token contract: for circular shapes
   `--kj-spinner-size` controls both width and height; for linear
   shapes (`dots`, `bars`), it controls height and width is auto.

6. **Multiple spinners in one viewport.** A list of N pending rows,
   each with its own `<kj-spinner>`, will mount N `role="status"`
   regions. AT will queue all N "Loading" announcements on initial
   render — noisy. Recipe-level fix: render the spinners with
   `aria-label=""` (suppress the announcement) and put a single
   summary status region above the list ("Loading 12 items…").
   Document this in the example set; consider a directive helper
   (`kjAriaLabel=""` already does it, but a shorter syntax like
   `kjSilent="true"` may be friendlier — flag for v2).

7. **Hydration during SSR.** A spinner rendered server-side and
   hydrated client-side will not announce on hydrate (the live
   region was already in the DOM at the time AT scanned the page).
   This is *correct* — you don't want every SSR'd loading state to
   shout on first paint — but it does mean a consumer relying on
   the spinner's announcement to signal a state change must mount
   it client-side via `@if` toggling. Document the SSR nuance.

8. **Animation throttling on background tabs.** `requestAnimationFrame`
   pauses when the tab is hidden — which is fine, the user can't see
   it. But long-running operations that complete while the tab is
   backgrounded should use the Page Visibility API + a Toast on
   visibility-restore, not just a quietly-spinning spinner. This is
   a consumer concern, but worth a mention in the
   `spinner.centered-panel.example.ts` doc copy.

9. **Button's `[kjButtonSpinnerSlot]` projection.** Adding a named
   slot to the existing Button wrapper is a non-breaking change
   *iff* the wrapper continues to render a default spinner when no
   projection is supplied. Confirm during Button v1 implementation
   that the slot mechanic is in place; otherwise consumers writing
   custom-shape spinners inside a button will need to drop down to
   the core `[kjButton]` directive and write their own template.
   Cross-link this open question in `button.md` §"Loading spinner
   is wrapper-only" so neither file drifts.

10. **`File Upload` per-row spinner→progress-bar transition.** When
    a file moves from `'preparing'` (spinner) to `'uploading'`
    (progress bar at 0%), the swap means tearing down the spinner's
    `role="status"` and mounting a new `role="progressbar"`. AT will
    announce the progress bar's name *only* on first mount, so the
    consumer must ensure the upload row's overall accessible name
    ("Uploading photo.jpg") is on a stable parent element, not on
    the swapped indicator. Flag in `file-upload.md`.

11. **Progress Bar's circular shape (deferred).** If `progress-bar.md`
    later ships a `kjProgressShape="circular"` variant, the visual
    overlap with `kjSpinner` will be near-total — same SVG arc, same
    size scale, different role. Decision rule for that future point:
    Spinner is `role="status"` and indeterminate-only; circular
    Progress Bar is `role="progressbar"` and value-bound. Don't try
    to merge them via a `kjMode` input — APG's role contract doesn't
    let one element be both.

12. **Reduced-motion media query is not reactive in SSR.** The
    `MEDIA_QUERY_LIST` injection token must yield a deterministic
    server value (`{ matches: false }`) so the SSR'd HTML has the
    full animation; the post-hydrate value re-evaluates and reflects
    `data-reduced-motion="true"` if the user prefers it. Verify this
    in the same SSR test that covers Toast — the existing test
    harness should already cover the pattern.
