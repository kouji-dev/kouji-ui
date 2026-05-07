# Skeleton

A **decorative placeholder** for content that hasn't loaded yet — a gray
rounded rectangle (or circle, or block of lines) shaped roughly like the
real content will be. Skeletons reduce the perceived load time, prevent
layout shift when the real content lands, and signal "we're fetching"
without spinning indeterminately. They are deliberately silent to AT —
the *parent* region carries the loading semantics; the skeleton itself
is paint.

> Not yet shipped. No `packages/core/src/skeleton/` directory exists
> today. This file specifies the directive, a11y contract (which is
> mostly *what not to do*), shape presets, and wrapper API to land for
> v1.

For the determinate progress sibling (known percentage), see
[`progress-bar.md`](./progress-bar.md) (planned). For the indeterminate
spinner used when the layout of the eventual content is unknown or
trivial, see [`spinner.md`](./spinner.md) (planned). Skeleton is the
**known-shape, content-replacing** sibling: when you can predict the
final layout (a card with an avatar + two lines + a button row),
skeleton is correct; when you can't (a single inline action firing), a
spinner is correct. For consumers of skeletons, see
[`../data-display/card.md`](../data-display/card.md),
[`../data-display/list.md`](../data-display/list.md),
[`../data-display/avatar.md`](../data-display/avatar.md), and
[`../data-display/empty-state.md`](../data-display/empty-state.md) — the
Avatar analysis already plans a `data-state="loading"` hook the skeleton
chrome can attach to, and List explicitly delegates its loading story
here. The Empty State analysis distinguishes "fetching" (skeleton)
from "fetched and empty" (empty state); consumers must not flash empty
state during a short fetch.

## Source comparison

| Concern | PrimeNG `p-skeleton` | Angular Material | shadcn/ui `Skeleton` | daisyUI `.skeleton` | WAI-ARIA APG |
|---|---|---|---|---|---|
| First-class component? | Yes (`<p-skeleton>`) | **No** — community recipes only (CDK has nothing here) | Yes — bare `<Skeleton className="…" />` (a `<div>` with `bg-muted animate-pulse`) | Yes — CSS-only utility class `.skeleton` | No specific pattern. Falls under [Status / Live Region](https://www.w3.org/TR/wai-aria-1.2/#status) guidance applied to the *parent* loading region — not the skeleton itself |
| Shape presets | `shape="rectangle" \| "circle"`, plus `width`/`height`/`borderRadius` inputs | n/a | None — consumer sets size with Tailwind classes (`h-4 w-[250px]`, `h-12 w-12 rounded-full`) | None — consumer sizes with width/height utilities | n/a |
| Animation | `animation="wave" \| "none"` (wave = shimmer sweep) | n/a | Single built-in `animate-pulse` (opacity oscillation), no shimmer by default | Built-in shimmer (`@keyframes skeleton`); no opt-out without overriding | n/a |
| `prefers-reduced-motion` | Not honoured by default | n/a | Inherits Tailwind's behaviour (consumer responsibility) | Not honoured | Not specified — but [WCAG 2.3.3 Animation from Interactions (AAA)](https://www.w3.org/TR/WCAG21/#animation-from-interactions) and the broader prefers-reduced-motion contract say the animation must be removable |
| ARIA on the skeleton | None (decorative `<div>`) | n/a | None | None | A non-semantic placeholder *should* be `aria-hidden="true"` so AT doesn't read random "loading" labels |
| Loading semantics on the *parent* | Not modelled — left to consumer | n/a | Not modelled — left to consumer | Not modelled | Recommends `aria-busy="true"` on the region while it loads + a `role="status"` polite live region announcing the change once |
| Multi-line text presets | `<p-skeleton>` only does one shape; multi-line is consumer-built | n/a | Same — repeat the component | Same — repeat the class | n/a |
| Default shape | `rectangle` | n/a | None (consumer-set) | Generic block (consumer-sized) | n/a |
| Theming | Per-component CSS vars (`--p-skeleton-background`, …) | n/a | Tailwind tokens (`bg-muted`) | daisyUI base color token | n/a |

**Read-off.** PrimeNG ships the most surface (shape input, dimension
inputs, animation toggle) but nobody — PrimeNG, shadcn, daisyUI —
addresses the *contextual* a11y contract: the skeleton itself is
correctly silent in shadcn and daisyUI (no role), but the parent region
should also announce the loading state, and **none** of the three help
the consumer with that. Material has no story at all. PrimeNG and
daisyUI ignore `prefers-reduced-motion`. The job to be done in kouji
is therefore: ship the visual primitive (CSS class + minimal directive)
*and* document the parent-region a11y pattern as the canonical recipe,
re-using `KjLiveRegion` for the announcement.

## Decision: needs a core directive?

**Yes — but the smallest possible one.** A `[kjSkeleton]` attribute
directive that owns exactly two things: `aria-hidden="true"` on the
host, and reflecting `data-shape` / `data-animation` so themes can
swap chrome. Below the bar of "directive = behaviour or a11y
semantics" (see *What NOT to Build* in `rules/code_style.md`), but
`aria-hidden` enforcement is itself an a11y semantic — the same
threshold `KjAlertIcon` clears (cf. [`alert.md`](./alert.md) §
"Composition model"). And since skeletons commonly appear in lists
and grids, getting `aria-hidden` wrong on every instance is exactly
the kind of "easy to forget, hard to debug" rule that justifies
centralisation.

### The "no directive at all" case (rejected)

The case for **CSS-only** is real: a skeleton is paint, not behaviour.
shadcn ships it as a class on a `<div>`. We could expose a `.kj-skeleton`
class in the components package, document `aria-hidden="true"`, and be
done. Pros:

- Zero JS cost per skeleton instance — important when a list renders
  50 skeleton rows.
- No `hostDirectives` chain, no preset binding overhead.
- Matches the daisyUI/shadcn idiom Angular consumers will already
  recognise.

We **reject** this for two reasons:

1. **`aria-hidden` enforcement is the whole point.** A class can't add
   `aria-hidden`. Documenting "remember to add `aria-hidden` to every
   skeleton" is exactly the contract a directive exists to enforce.
   Skipping it means every theme, every consumer recipe, has to
   remember — and they won't.
2. **`prefers-reduced-motion` switching is theme-side, but
   `data-animation` reflection is directive-side.** A consumer who
   says `kjSkeletonAnimation="none"` overrides the OS preference (the
   shimmer is gone for everyone). A consumer who says `"shimmer"`
   gets the shimmer — *unless* the OS says reduce, in which case
   theme CSS picks `data-animation="shimmer"` + `@media
   (prefers-reduced-motion: reduce)` and pins it to a static
   background. The directive emits the data attribute; the theme
   reads it. CSS-only can't gate on a consumer input.

### The "wrapper component" case (rejected as the *primary* surface)

`<kj-skeleton kjShape="text"/>` is **also** something we ship — but as
the components-package wrapper, not the core surface. PrimeNG's
`<p-skeleton>` is the consumer ergonomics target. Pros over the
attribute directive:

- Self-closing; no host element to choose ("should I put `[kjSkeleton]`
  on a `<div>` or `<span>`?").
- Predictable in templates (`<kj-skeleton/>` reads the same in every
  codebase).

Why **not the primary surface**:

- Forces a tag at every skeleton site. In a card-skeleton recipe
  (avatar circle + two text lines), three `<kj-skeleton>` tags is
  fine; in a 50-row list-skeleton, it's the same as `[kjSkeleton]` —
  but at the row level, the consumer often *wants* the existing
  `<li>` / `<tr>` / `<div class="row">` and just to skeletonise it.
  `[kjSkeleton]` lets the existing element become a skeleton without
  inventing a wrapper.
- Wrappers can't be applied to elements you want to keep semantically
  (e.g., a `<button kjSkeleton>` placeholder for a button row — the
  button still renders the right tag, just with skeleton chrome and
  `aria-hidden`).

**Position taken: ship all three layers, with the directive as the
contract anchor.**

1. **`[kjSkeleton]` (core attribute directive)** — applies
   `aria-hidden="true"`, reflects `data-shape` / `data-animation`,
   honours `prefers-reduced-motion` via theme CSS that reads
   `data-animation`. The contract.
2. **`<kj-skeleton kjShape="…"/>` (components wrapper)** — a
   self-closing `<div kjSkeleton>` for the common "drop a placeholder
   in" case. Composes `KjSkeleton` via `hostDirectives`, exposes the
   same inputs.
3. **`.kj-skeleton-block` (theme CSS class, no directive)** — when a
   theme wants to skeletonise, e.g., the children of a card without
   wrapping each one, it can apply the class for paint and document
   `aria-hidden` is the consumer's responsibility. CSS is a
   convenience, not the canonical surface.

## Composition model

A single directive, no compound parts, no context token. Skeletons
don't have an internal state machine, don't host descendants, and
don't communicate up. This is the **simplest possible** directive in
the library — and the model is intentional: anything we add is
overhead per instance, multiplied by however many skeletons render in
a list view.

```
KjSkeleton             (selector: [kjSkeleton], standalone, exportAs: 'kjSkeleton')
```

### Reused primitives

- `KjVariant` — **not composed.** Skeletons are tonally neutral by
  design; they should match the surrounding background, not vary by
  semantic intent. There is no `success` skeleton or `error`
  skeleton — those are the alerts that *replace* the skeleton when
  the fetch resolves. Themes pick a single neutral token
  (`--kj-color-skeleton`) tuned to be a few percent off the surface
  background.
- `KjSize` — **not composed.** Sizing is consumer-driven via width /
  height (or via shape presets in the wrapper, see below). A
  preset-bound `kjSize` would imply a small/medium/large taxonomy
  that doesn't match how skeletons are actually used (every skeleton
  is sized to *its* eventual content, not to a global scale).
- `KjFocusRing` — **not composed.** Skeletons are not focusable.
- `KjLiveRegion` — **not composed on the skeleton itself.** The
  loading announcement lives on the *parent* region (see
  *Accessibility — the parent contract* below), and is typically
  fired once per data-loading cycle via `KjLiveRegion.announce()` or
  a `role="status"` element. The skeleton stays silent.
- `KjVisuallyHidden` — **not composed.** Skeletons are visual; AT
  reads the parent's `aria-busy` / status text, not hidden text on
  the skeleton.

### Cross-component pointers

- [`spinner.md`](./spinner.md) (planned) — sibling for indeterminate
  loading when the eventual layout is unknown or doesn't merit the
  shape investment (e.g., a single button's pending state — that's
  Spinner via `KjButton.kjLoading`, not a skeleton). Decision rule:
  *known shape, replacing content area* → Skeleton; *unknown shape,
  inline interaction pending* → Spinner. Document this rule in both
  files.
- [`progress-bar.md`](./progress-bar.md) (planned) — determinate
  sibling. If you have a percentage (file upload, multi-step
  process), use Progress Bar, not Skeleton. Skeleton is for "we're
  fetching of unknown duration but we know the layout"; Progress
  Bar is for "we're fetching of measurable duration."
- [`../data-display/card.md`](../data-display/card.md) — the canonical
  consumer. A card-skeleton recipe (image area + title line + two body
  lines + button row) is one of the v1 examples and lives in the
  components package, not in core. The Card wrapper does **not** bake
  in a `[loading]` slot; consumers conditional-render a skeleton
  card-shaped block, then the real `<kj-card>`.
- [`../data-display/list.md`](../data-display/list.md) — explicitly
  delegates its loading story here (`list.md` § "Loading state" —
  *out of scope for List, see skeleton.md*). The list-skeleton recipe
  ships as one of the v1 examples (5 skeleton rows).
- [`../data-display/avatar.md`](../data-display/avatar.md) — Avatar's
  `data-state="loading"` (planned in `avatar.md` § "Open questions")
  is a CSS hook a theme can use to paint the avatar slot as a
  skeleton circle while the image loads, *without* the consumer
  conditional-rendering a separate `<kj-skeleton>`. That's a theme-
  layer concern; the directive doesn't know about it.
- [`../data-display/empty-state.md`](../data-display/empty-state.md) —
  the **post-resolution** sibling. Skeleton until the fetch resolves;
  on resolution, branch on `data.length === 0` to either empty state
  or rendered rows. Consumers who flash empty state during a short
  fetch have built the wrong thing — `empty-state.md` documents this,
  this file echoes it.
- [`alert.md`](./alert.md) — when a fetch *fails*, the post-resolution
  branch is an inline error alert (or an empty-state-with-error
  composing alert chrome), not a skeleton-stuck-forever. Document the
  failure-branch wiring in the docs page.

## Base features

- **Shapes (preset, configurable):** `'rectangle' | 'circle' |
  'text' | 'text-block'`. Default `'rectangle'`. Open-set string;
  consumers may extend (e.g., `'pill'` for a tag-shaped skeleton).
  Reflects `data-shape`.
  - `rectangle` — generic block, consumer sets width/height. Default.
  - `circle` — `border-radius: 50%`; consumer sizes via width/height
    (which should be equal for a true circle).
  - `text` — single line of text-shaped skeleton; height defaults to
    `1em`, border-radius is small (≈ `0.25rem`), width consumer-set
    or `100%`. Wrapper helper: matches a single line of body text.
  - `text-block` — multi-line text. Wrapper renders N child
    skeletons (default 3, last one shorter — the canonical
    "paragraph" pattern). At the directive level, `text-block` is
    only a `data-shape` value; multi-line composition is the
    wrapper's job because it requires DOM children.
- **Animation (preset):** `'shimmer' | 'pulse' | 'none'`. Default
  `'shimmer'`. Reflects `data-animation`. Themes own the keyframes;
  the directive emits the attribute.
  - `shimmer` — diagonal gradient sweep across the skeleton (the
    PrimeNG/daisyUI default look).
  - `pulse` — opacity oscillation (the shadcn `animate-pulse` look).
  - `none` — no animation. Used for static empty-state stand-ins,
    or as the consumer-side reduced-motion override.
- **`prefers-reduced-motion`:** when the OS sets the preference, the
  theme **must** suppress the animation regardless of the
  `kjSkeletonAnimation` value. The directive does not detect the
  media query (would impose JS cost on every instance); themes
  apply a `@media (prefers-reduced-motion: reduce) { [data-animation]
  { animation: none; }}` rule. This pattern is repeated in the
  Carousel and Toast analyses; document it in the rules layer
  (`rules/accessibility.md`) so themes pick it up consistently.
- **Sizing:** width / height come from the consumer via `style` /
  CSS classes. The directive does not own dimensions. The wrapper
  exposes `kjWidth` / `kjHeight` convenience inputs (see below).
- **Slots:** none. Skeletons project no content (their content is
  paint). The wrapper's `<ng-content/>` is omitted intentionally —
  if you need to wrap real content, you don't need a skeleton.

### State model

**Stateless.** `KjSkeleton` has no inputs that affect anything but
`data-*` attributes. The consumer toggles between "skeleton" and
"real content" via `*ngIf`/`@if` at the call site:

```html
@if (loading()) {
  <kj-skeleton kjShape="text-block" />
} @else {
  <p>{{ data() }}</p>
}
```

The directive does not own the loading boolean, does not subscribe to
data, does not know what content it's standing in for. This matches
the Alert state model (consumer-owned visibility) and the broader
kouji posture (directives observe inputs; consumers own state).

## Accessibility

Target: **WCAG 2.1 AAA** for the loading region as a whole. The
**skeleton element itself is decorative** — its only a11y
responsibility is to be silent. The real a11y work happens on the
*parent region* and is the consumer's responsibility, documented in
this file as the canonical recipe.

### What the skeleton directive does

| Criterion | Requirement | Where it lives |
|---|---|---|
| 1.1.1 Non-text Content | Decorative content has `aria-hidden="true"` so AT skips it | `KjSkeleton` host binding `[attr.aria-hidden]="true"`. Always set, not user-overridable. |
| 4.1.2 Name, Role, Value | Skeleton has no role (it is `aria-hidden`) | Host element keeps its native role (`<div>` is generic). Directive does not set `role`. |
| 2.3.3 Animation from Interactions (AAA) | Animations triggered by interaction can be disabled | Theme CSS gates the shimmer / pulse on `prefers-reduced-motion`; consumers can also force-disable via `kjSkeletonAnimation="none"`. |

### What the **parent region** must do (the canonical recipe)

This is the part libraries get wrong. The skeleton is silent; the
parent region announces:

1. **`aria-busy="true"`** on the region while data is loading. AT
   reads this as "this region is currently busy, content may
   change." Set it back to `false` (or remove) when the data lands.
2. **A polite `role="status"` live region** that announces "Loading
   …" *once* when the fetch starts, and (optionally) "Loaded N
   items" when it resolves. Use `KjLiveRegion.announce()` for the
   imperative fire-once message (preferred), or render a
   `<span role="status" class="kj-visually-hidden">Loading…</span>`
   inside the region (declarative, also fine).
3. **Don't put `aria-live` on a wrapper around the skeleton itself.**
   That would announce the skeleton's existence (a meaningless event)
   and miss the actual loading semantic.

The wrapper (`<kj-skeleton>`) doesn't enforce any of this — that
would require knowing the parent, which it doesn't. **The
documentation page is the enforcement layer**, and the v1 examples
demonstrate the pattern at the recipe level (card-skeleton,
list-skeleton).

#### Why not a `<kj-loading-region>` directive?

A real option: a `[kjLoadingRegion]` directive that owns
`aria-busy`, fires the `KjLiveRegion` announcement on transition to
loading / resolved, and lets consumers wrap their fetch UIs. We
**defer** this to a follow-up:

- It overlaps with what `KjLiveRegion` already does for imperative
  announcements; the value-add is the `aria-busy` reflection and
  the convention.
- The pattern is shared with anything async (data tables that
  refetch, a dropdown loading options, an async select). Owning it
  here as "for skeletons specifically" is the wrong scope.
- v1 ship: document the recipe with the existing `KjLiveRegion`.
  v1.x: lift `[kjLoadingRegion]` once two or three components
  (Skeleton, Select-with-async-options, Table-pagination) want it.
- Listed in *Open questions* so it's not lost.

### Keyboard contract

None. Skeletons are not focusable, not interactive, do not respond
to any key. If a consumer somehow makes a skeleton focusable (e.g.,
puts `[kjSkeleton]` on a `<button>` placeholder), they're on their
own — the directive does not strip `tabindex`. Dev-mode warning
*could* assert "the host of `[kjSkeleton]` is not in the tab order",
but it's overzealous; defer.

### Color & contrast

Skeletons are **decorative shapes, not text** — WCAG contrast does
not apply to them as such. They should be visible against the
surface (≥ 3:1 from background per 1.4.11 *Non-text Contrast*) so
sighted users perceive the placeholder, but should **not** approach
text contrast (≥ 7:1 AAA) — that would make them more salient than
the eventual text, which is wrong. Themes pick a token
(`--kj-color-skeleton`) at roughly 5–10% off the surface background.
Per-theme tuning lives in the components / themes layer.

### Touch target & motion

- **Touch target:** N/A — non-interactive.
- **Motion:** the shimmer is a continuous animation. WCAG 2.2.2
  *Pause, Stop, Hide* applies to animations longer than 5 seconds —
  the skeleton's shimmer is technically infinite, but the skeleton
  itself is short-lived (it's gone when data loads). The
  `prefers-reduced-motion` honour and the `kjSkeletonAnimation="none"`
  escape hatch satisfy the spirit of 2.2.2 / 2.3.3 here.

### Dev-mode validation

`KjSkeleton` runs an `effect()` in dev mode that asserts:

1. The host element does not also carry an `aria-label`,
   `aria-labelledby`, `role="status"`, or `role="alert"` — these
   contradict `aria-hidden="true"`. Warn (not throw) and suggest
   moving the label/role to the parent region.
2. If `kjSkeletonShape() === 'circle'`, the computed width and
   height differ by more than 10% — warn (it's a lopsided "circle").
   This is purely a quality-of-life check; the skeleton still
   renders.

These mirror the Alert and Button dev-mode posture (warnings, not
throws).

## Inputs / Outputs / Models

### `KjSkeleton` (`[kjSkeleton]`, `exportAs: 'kjSkeleton'`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjSkeletonShape` | `input` (preset) | `string` (validated against `KJ_SKELETON_CONFIG.shapes`) | `'rectangle'` | Reflects `data-shape`. Default preset list: `'rectangle' \| 'circle' \| 'text' \| 'text-block'`. Open set; extend via `provideKjSkeleton({ shapes: [...] })`. |
| `kjSkeletonAnimation` | `input` (preset) | `string` (validated against `KJ_SKELETON_CONFIG.animations`) | `'shimmer'` | Reflects `data-animation`. Default preset list: `'shimmer' \| 'pulse' \| 'none'`. |

That's the entire input surface. No outputs, no models. No
`exportAs` consumers (nothing useful to template-ref to). Outputs
omitted intentionally — there is no event the skeleton can emit
that's meaningful (it doesn't know when its replacement is mounting).

Host bindings:

```ts
host: {
  '[attr.aria-hidden]': '"true"',
  '[attr.data-shape]': 'kjSkeletonShape()',
  '[attr.data-animation]': 'kjSkeletonAnimation()',
}
```

### `KjSkeletonConfig`

```ts
export interface KjSkeletonConfig extends KjBindablePresetConfig {
  shapes: readonly string[];        // default ['rectangle', 'circle', 'text', 'text-block']
  animations: readonly string[];    // default ['shimmer', 'pulse', 'none']
  defaults: { shape: 'rectangle'; animation: 'shimmer' };
}
export const KJ_SKELETON_CONFIG = new InjectionToken<KjSkeletonConfig>('KjSkeletonConfig');
```

Consumed via `bindPresets(KJ_SKELETON_CONFIG)` in the directive's
`providers`, same shape Button / Alert use.

### Wrapper component (`<kj-skeleton>`, components package)

Composes `KjSkeleton` via `hostDirectives` and adds two convenience
inputs for the most common case (a self-sized rectangular or circular
skeleton).

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjShape` | `input` (alias to `kjSkeletonShape`) | `string` | `'rectangle'` | Pass-through. |
| `kjAnimation` | `input` (alias to `kjSkeletonAnimation`) | `string` | `'shimmer'` | Pass-through. |
| `kjWidth` | `input<string \| undefined>` | `string \| undefined` | `undefined` | When set, applies `style.width`. Accepts any CSS length (`'12rem'`, `'100%'`, `'250px'`). |
| `kjHeight` | `input<string \| undefined>` | `string \| undefined` | `undefined` | When set, applies `style.height`. |
| `kjLines` | `input<number>` | `number` | `3` | **Only honoured when `kjShape === 'text-block'`.** Renders N internal line skeletons; the last is rendered at 60% width to match the typographic cadence. Ignored otherwise. |

Template:

```html
@if (effectiveShape() === 'text-block') {
  @for (line of lines(); track $index) {
    <span
      kjSkeleton
      [kjSkeletonShape]="'text'"
      [kjSkeletonAnimation]="kjAnimation()"
      [style.width]="$index === lines().length - 1 ? '60%' : '100%'"
    ></span>
  }
}
```

For all other shapes the wrapper renders a self-closing element with
`KjSkeleton` composed and width/height bound. The `text-block` branch
exists because multi-line is the one case where a single host element
can't carry the visual; everything else is one node.

The wrapper deliberately has **no `<ng-content/>`** — if a consumer
needs to project content, they don't need a skeleton.

## Variants & severity mapping

**None.** Skeletons are tonally neutral. There is no `kjVariant` input,
no severity. A skeleton standing in for an error message is still a
skeleton — when the error lands, it's the alert that carries the
severity, not the placeholder. Themes provide a single
`--kj-color-skeleton` token that picks a tasteful tone-on-tone for the
surface; that's the entire design token surface.

This is a deliberate departure from the Alert / Toast / Badge pattern
where `kjVariant` is the central knob. Skeletons are the exception,
and the rule "don't add a variant just because the directive shape
suggests it" is one of the prompts the analysis takes a position on.

## Examples to ship

Under `packages/core/src/skeleton/` (headless, theme-agnostic):

1. **`skeleton.example.ts`** — single rectangle skeleton with
   width/height set inline. Demonstrates the directive in isolation.
2. **`skeleton.shapes.example.ts`** — rectangle / circle / text /
   text-block side-by-side, with `data-shape` reflected and
   theme-side chrome painting each.
3. **`skeleton.reduced-motion.example.ts`** — toggling
   `kjSkeletonAnimation` between `shimmer` / `pulse` / `none`, plus a
   note documenting the OS-level preference path. Snap-tested with
   `@media (prefers-reduced-motion: reduce)` simulated via the
   testing-library MediaQueryList shim.

Under `packages/components/src/skeleton/` (wrapper + chrome):

4. **`skeleton.default.example.ts`** — `<kj-skeleton kjShape="text"
   kjWidth="12rem"/>`. The simplest possible consumer recipe.
5. **`skeleton.text-block.example.ts`** — `<kj-skeleton
   kjShape="text-block" [kjLines]="4"/>`. Multi-line paragraph
   placeholder.
6. **`skeleton.card.example.ts`** — the canonical card-skeleton
   recipe: avatar circle (40×40) + title line (60% width) + two body
   lines + a button-shaped rectangle, all inside a `<kj-card>`-shaped
   container with `aria-busy="true"`. Includes the parent-region
   `KjLiveRegion.announce('Loading card content…')` at fetch start,
   and the conditional-render switch to the real card on resolution.
   This is **the** demo that shows the parent-region a11y contract;
   the docs page links to it from the "Accessibility" section.
7. **`skeleton.list.example.ts`** — five skeleton rows wrapped in a
   region with `aria-busy="true"` and `role="status"` polite
   announcer, switching to a `<kj-list>` of real items on resolution.
   Cross-references [`../data-display/list.md`](../data-display/list.md).
8. **`skeleton.avatar.example.ts`** — `<kj-skeleton kjShape="circle"
   kjWidth="40px" kjHeight="40px"/>` standing in for a `<kj-avatar>`
   while the image loads. Cross-references the
   `data-state="loading"` hook from
   [`../data-display/avatar.md`](../data-display/avatar.md).
9. **`skeleton.configured.example.ts`** — `provideKjSkeleton({
   shapes: [...KJ_SKELETON_DEFAULTS.shapes, 'pill'],
   animations: [...KJ_SKELETON_DEFAULTS.animations, 'wave'] })` to
   demonstrate the configurable preset surface. Mirrors the Button
   `provideKjButton` configured example.

## Open questions / risks

1. **Should `[kjSkeleton]` strip a `tabindex` it sees on the host?**
   A focusable skeleton is almost certainly a bug. Today the
   proposal is "doc it, don't enforce". If real consumers
   consistently apply `[kjSkeleton]` to focusable elements (most
   likely a `<button>` placeholder), escalate to a dev-mode warning,
   not a throw. Themes can set `pointer-events: none` to at least
   prevent the click; the directive doesn't.

2. **`text-block` line cadence.** The wrapper renders N equal-width
   lines with the last at 60%. Real paragraphs vary line by line;
   a "more realistic" version would randomise each line's width
   between 70%–100%. We're shipping the deterministic version
   because (a) randomness in tests is annoying, (b) the visual
   difference is marginal, and (c) consumers who want fancier can
   compose `[kjSkeleton]` directly. Revisit if real consumers ask.

3. **Should the directive own `prefers-reduced-motion`?** Today,
   theme CSS gates the animation via the media query. Alternative:
   the directive injects a media-query observer and reflects
   `data-reduced-motion="true"`, letting themes write a single
   `[data-reduced-motion="true"] { animation: none; }` rule. Pros:
   one observer per app (could inject `KjReducedMotion` service),
   not per skeleton; CSS gets simpler; consumer's
   `kjSkeletonAnimation="none"` can be distinguished from "OS says
   reduce" in the DOM (useful for debugging). Cons: more JS in core
   for what CSS handles natively. **Decision: defer to v1.x**;
   ship CSS-only honour for v1, lift to a service if a consumer
   ever needs the data attribute.

4. **`<kj-skeleton-region>` / `[kjLoadingRegion]` directive.** As
   noted in *Accessibility*, a directive that owns `aria-busy` +
   announces via `KjLiveRegion` would be useful and is shared with
   non-skeleton async UIs. **Decision: defer.** Document the
   recipe; lift the directive once two or three other components
   (async-Select, Table refetch, Combobox loading options) want it.
   Tracked in `rules/agent_orchestration.md` § "Lift cross-cutting
   patterns when 3+ consumers need them".

5. **Animation taxonomy: shimmer vs. pulse.** Two animations is
   already arguably one too many — shimmer is the established
   default, pulse is the shadcn idiom. Themes can paint either.
   We ship both because they're cheap (CSS keyframes only), but
   if a future theme audit shows nobody uses `pulse`, drop it
   from the preset list. Listed here so we remember to ask.

6. **Skeleton overlay vs. skeleton-replace.** Today, consumers
   conditional-render between skeleton and real content
   (replace). An "overlay" pattern — show the real content
   behind, with a skeleton overlay on top — is also a known
   pattern, used to keep the layout fixed during refetch (e.g.,
   in tables, when paging). We do not ship overlay support in v1;
   the consumer can build it with `position: relative` on the
   container and a skeleton with `position: absolute; inset: 0`.
   Document the recipe in the docs page if there's demand.

7. **Skeleton inside a `<kj-card>`.** The Card analysis declined to
   bake in a `[loading]` slot, deferring here. The card-skeleton
   recipe (example 6) is the canonical answer. If a future
   `KjCard` revision wants a `loading` input that swaps content
   for a skeleton, that's a Card-level change, not a Skeleton
   one — the directive stays neutral.

8. **Single-letter avatar fallback vs. avatar skeleton.** Avatar's
   image-state machine has `idle / loading / loaded / error`. The
   `loading` state can paint as either: (a) the initial-letter
   fallback, or (b) a skeleton circle. Decision lives in
   `avatar.md`; this file just notes the cross-cut. If Avatar
   picks (b), example 8 here is its v1 demo.

9. **Server-rendered skeletons in SSR.** A skeleton rendered
   server-side and hydrated client-side is fine — `aria-hidden`
   is a static attribute, no JS dependency. The animation kicks
   in with CSS as soon as the stylesheet arrives, no hydration
   gap. No special SSR consideration needed; flag here only to
   confirm we considered it.

10. **No "shimmer direction" input.** PrimeNG and several other
    libraries expose a `direction` input (left-to-right, top-to-
    bottom) for the shimmer sweep. We're not exposing this — it
    is a theme-layer detail, configurable via CSS custom
    properties (`--kj-skeleton-shimmer-angle`) if a theme cares.
    Same posture as Carousel's transition direction.

11. **Configurable preset shape — `KJ_SKELETON_CONFIG`.** Mirrors
    `KJ_BUTTON_CONFIG` / `KJ_ALERT_CONFIG`:
    ```ts
    export interface KjSkeletonConfig extends KjBindablePresetConfig {
      shapes: ['rectangle', 'circle', 'text', 'text-block'];
      animations: ['shimmer', 'pulse', 'none'];
      defaults: { shape: 'rectangle'; animation: 'shimmer' };
    }
    ```
    Reuse `bindPresets(KJ_SKELETON_CONFIG)` in the directive's
    `providers`. Same pattern Button / Alert use; no new
    infrastructure needed.

12. **Cross-link back-fill.** When [`spinner.md`](./spinner.md) and
    [`progress-bar.md`](./progress-bar.md) are written, add the
    decision rule (Skeleton vs. Spinner vs. Progress Bar) as a
    shared block at the top of each. Today the rule lives only
    here under "Cross-component pointers"; that's an asymmetric
    cross-link until the siblings are documented.
