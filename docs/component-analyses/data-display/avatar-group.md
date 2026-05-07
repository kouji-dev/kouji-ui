# Avatar Group

A horizontally stacked, overlapping cluster of `KjAvatar` instances —
the canonical "team / collaborators / participants" affordance. The
group caps the number of visible avatars at `kjMax` and renders an
overflow chip ("+N") for the remainder, so a team of 27 can be summed
up in four circles. The component is a thin coordinator: it does not
own avatar markup, image loading, or fallback text — those belong to
each child `KjAvatar`. The group owns layout (overlap direction,
z-index stacking, RTL flip), counting (visible vs. hidden), the
overflow chip, and a single `role="group"` with a count-aware
`aria-label`.

> Not yet shipped in core. This analysis specifies the directive
> contract before code lands. Cross-reference [`avatar.md`](./avatar.md)
> for the per-child primitive and [`../feedback/tooltip.md`](../feedback/tooltip.md)
> for the per-avatar name-on-hover pattern.

For the **single-avatar** building block (image + fallback + load
state), see [`avatar.md`](./avatar.md). The Avatar Group reuses
`KjAvatar` / `KjAvatarImage` / `KjAvatarFallback` verbatim — including
for the overflow chip itself, which is just a `KjAvatar` with text
content "+N" and an `aria-hidden` decoration around it. For overflow
beyond the chip (e.g. clicking "+N" to reveal a popover listing the
remaining members), wire a `KjPopover` / `KjDropdownMenu` on the
chip — not an Avatar Group concern.

## Source comparison

| Concern | PrimeNG `p-avatarGroup` | Angular Material | shadcn/ui |
|---|---|---|---|
| First-class component? | Yes — `<p-avatarGroup>` wrapping `<p-avatar>` children | **No** — gap. Material ships `<mat-icon>` + custom CSS recipes; teams hand-roll a flex container with negative margin | **No** — gap. Recipes/community snippets stack `<Avatar>` with negative `margin-left` and a `border` to fake the cut-out |
| Stacking direction | LTR fixed: each subsequent child is positioned to the right of the previous, with negative left margin | n/a | LTR fixed: `space-x-reverse` + negative margin |
| RTL handling | None — overlap direction does not flip in RTL | n/a | None |
| Z-index policy | Document order: first child highest, last child lowest (CSS-only, no inline styles) | n/a | First child on top via CSS source-order; consumer-tweaked |
| Max + overflow | **Not built-in.** Consumers manually slice the array and append a `<p-avatar label="+5">` themselves | n/a | **Not built-in.** Recipes show `array.slice(0, max)` in JSX and a manual `<Avatar>{`+${rest}`}</Avatar>` |
| Group ARIA | None — no `role`, no `aria-label`. Children inherit whatever `<p-avatar>` provides (which itself has no a11y semantics) | n/a | None — recipes typically wrap in a `<div role="group" aria-label="…">` by hand |
| Per-avatar name | Consumer responsibility (`alt` on the image, or a `Tooltip` recipe outside the group) | n/a | Consumer responsibility |
| Size propagation | `[size]` on the group is **not** forwarded to children — each `<p-avatar>` carries its own `[size]` | n/a | Each child sets its own `size` |
| Overlap amount | Hard-coded CSS (negative margin); no API | n/a | CSS variable; consumer overrides |

**Read-off.**

- **PrimeNG** ships the visual layout but punts on max/overflow,
  ARIA, and any cross-child coordination. It is essentially a CSS
  rule packaged as a component.
- **Material** has no first-class. The roadmap gap is real for teams
  migrating from Material to kouji.
- **shadcn/ui** has no first-class either; it is recipes only,
  reflecting that Radix has no Avatar Group primitive (Avatar is a
  leaf in their tree).

This is one of the small set of components where kouji can ship a
genuinely better story than all three reference libraries by owning
**(a)** the max+overflow logic, **(b)** the ARIA group label with
live count, **(c)** RTL-aware stacking, and **(d)** size propagation
through context — all of which the references make the consumer
hand-roll.

## Decision: needs a core directive?

**Yes — one root directive (`KjAvatarGroup`) with no child directive.**

The work the group does is not "set a flex class". It is:

1. **Count-aware ARIA label.** The group's `aria-label` ("3 of 8
   collaborators") must update reactively as children mount /
   unmount. That requires a `contentChildren(KjAvatar)` query plus
   a `computed()` over the children's count and the `kjMax` input.
   CSS cannot do this.
2. **Overflow chip rendering.** The group needs to know how many
   `KjAvatar`s are projected so it can render or omit the "+N"
   chip and pass the correct number into it. Consumers who built
   this in PrimeNG shipped bugs every time the array length and
   the slice limit drifted.
3. **Size / shape / variant propagation via context.** Children
   that don't set their own size read a default from the group's
   `KjSize` host directive. This is identical to the
   "variant on the group, override per child" pattern from
   [`button-group.md`](../actions/button-group.md), and only
   works if there is an injection token.
4. **RTL-aware stacking.** The CSS for overlap direction needs a
   `[dir]` reading; the directive emits a stable
   `[attr.data-direction]` so the wrapper CSS does not depend on
   walking up to find `dir="rtl"`.
5. **Z-index policy.** First child on top is the visually correct
   default (it is the most-recent / most-prominent face); CSS
   source-order alone does *not* give us "first on top" without a
   z-index rule, because later DOM siblings naturally paint above
   earlier ones. The directive owns the
   `[style.--kj-avatar-group-count]` custom property so the
   wrapper CSS can compute `z-index: calc(var(--kj-avatar-group-count) - var(--kj-avatar-group-index))`.

A pure-CSS group cannot do (1), (2), or (5) correctly. Per the
"What NOT to Build" rule in `code_style.md`, a directive must do
at least one of: manage state, implement keyboard, apply ARIA, or
expose useful API. `KjAvatarGroup` does three of the four (state,
ARIA, API), so it clears the bar comfortably.

**No child directive.** Children are bare `KjAvatar`s already.
`KjAvatarGroup` discovers them via
`contentChildren(KjAvatar, { descendants: false })` and indexes
them via the query order. We do **not** introduce a
`KjAvatarGroupItem` because there is no per-child state the group
needs to write back into the avatar — only state to read out
(count). Adding an item directive would be a useless wrapper
(see `code_style.md` §What NOT to Build).

## Base features

- **Stacked overlap layout** — children render in document order,
  each one shifted left (LTR) or right (RTL) over the previous by
  a configurable overlap distance. CSS does the painting; the
  directive only emits the data attributes and CSS custom
  properties the wrapper CSS keys off of.
- **Max with overflow chip** — `kjMax: number` (default `4`)
  caps the visible avatar count. When `children.length > kjMax`,
  the directive renders a final synthetic `KjAvatar` containing
  the text "+N" where N = `children.length - kjMax`. The chip is
  a real `KjAvatar` (not a custom element), so it inherits all
  size, shape, and styling from the group context.
- **`role="group"` with live `aria-label`** —
  `kjAriaLabel="collaborators"` produces
  `aria-label="3 of 8 collaborators"`. The label format is
  configurable via `kjAriaLabelFormat` for i18n
  (`(visible, total, label) => string`).
- **Per-child name (consumer responsibility)** — each child
  `KjAvatar` already carries `alt` (mirrored to `title` in the
  components-package wrapper, see [`avatar.md`](./avatar.md)).
  For richer per-avatar reveal — a real
  `role="tooltip"` instead of native `title`,
  positioning, delays — wrap each child in a `[kjTooltip]`. The
  group neither owns nor blocks this.
- **Size / shape propagation** — `KjSize` and a custom
  `kjShape` input on the group are exposed via the
  `KJ_AVATAR_GROUP` context. The wrapper-package
  `KjAvatarComponent` reads from this context inside its
  template (cascading via `inject(KJ_AVATAR_GROUP, { optional:
  true })`), falling back to its own `size()` / `shape()`
  inputs when the group is absent or when the child sets an
  explicit override. This matches the inheritance pattern
  already established for `KjButtonGroup`.
- **Overlap distance** — `kjOverlap: number | string` (default
  `'33%'`) drives the negative margin via a CSS custom
  property (`--kj-avatar-group-overlap`). Numeric values are
  treated as `px` for ergonomics; strings pass through verbatim
  (so `'1rem'` or `'25%'` work). Pure styling concern; no
  behavioural side-effects.
- **RTL flip** — the directive reads `inject(Directionality)`
  if the no-CDK rule allows (it does not — see open questions)
  or, more honestly, reads `getComputedStyle(host).direction`
  once on `afterNextRender()` and on a `MutationObserver`
  watching `[dir]` ancestors. Emits
  `[attr.data-direction]="ltr" | "rtl"` for the wrapper CSS to
  pick up.
- **Z-index policy** — the directive sets
  `[style.--kj-avatar-group-count]` on the host (= visible-child
  count, including the overflow chip). Each child receives a
  `[style.--kj-avatar-group-index]` from a tiny per-child host
  directive (`KjAvatarGroupItem`, but see open questions — we
  may instead emit it from the group's template using
  `@for ... ; track i; let i = $index`). The wrapper CSS does
  `z-index: calc(var(--kj-avatar-group-count) - var(--kj-avatar-group-index))`
  to paint first-on-top.
- **No selection, no focus, no keyboard** — avatars are
  decorations, not interactive controls. If a consumer wants
  clickable avatars (e.g. profile links), they wrap each
  `<kj-avatar>` in an `<a>` themselves. The group is not a
  composite widget and does **not** apply roving tabindex.

## Accessibility (WCAG 2.1 AAA)

Reference: there is **no** WAI-ARIA APG pattern for "stacked avatar
group". The closest applicable patterns are
[`group` role](https://www.w3.org/TR/wai-aria-1.2/#group) and
[Image Concepts in WCAG 2.1 §1.1.1](https://www.w3.org/TR/WCAG21/#non-text-content).

| Criterion | Requirement | Where it lives |
|---|---|---|
| 1.1.1 Non-text Content | Each avatar's image has alternative text describing the person | Per-child `KjAvatarImage[alt]` (already shipped in `KjAvatar`). The group does **not** override or fabricate alt text. |
| 1.3.1 Info & Relationships | The cluster is exposed as a related set | Host: `role="group"` + `aria-label="N of M label"`. |
| 1.4.3 Contrast (Minimum) | Overflow chip text (`+5`) meets 4.5:1 | Components-package CSS responsibility — verify under all themes. |
| 1.4.6 Contrast (Enhanced, AAA) | 7:1 for normal text, 4.5:1 for large | Same — components-package theming concern. |
| 1.4.11 Non-text Contrast | The visual ring/border separating overlapping avatars meets 3:1 | Components-package CSS — the cut-out border that creates the "stacked cards" illusion needs `outline-color` with adequate contrast against both the avatar fill and the surface behind the group. |
| 2.1.1 Keyboard | Group is non-interactive — no keyboard requirement | n/a |
| 2.4.4 Link Purpose | If consumer makes avatars links, each link's accessible name describes the destination | Consumer responsibility; group does not generate links. |
| 2.5.5 Target Size (AAA) | Only applies if avatars are interactive | If a consumer wraps avatars in links/buttons, the underlying `<kj-avatar>` must be ≥ 44×44 (default `md` is 2.5rem = 40px — **flag**). The group docs must call this out. |
| 4.1.2 Name, Role, Value | Group has correct role + accessible name; overflow chip has accessible name | Group host applies `role="group"` + `aria-label`. Overflow chip — see below. |

### The overflow chip's accessibility

The "+5" indicator is visually a sixth avatar but semantically a
*count*. Two choices:

- **Hide it from AT.** `aria-hidden="true"` on the chip + put the
  total ("of 8") in the group's `aria-label`. AT hears "3 of 8
  collaborators, group" and never encounters the chip directly.
  Cleanest mental model.
- **Expose it as a count.** `role="text"` + `aria-label="5 more"`.
  AT hears each visible avatar's name, then "5 more". More
  granular, but doubles up with the group label and is noisier
  in practice.

**Decision: hide the chip.** The group's count-aware label
already conveys totality; exposing the chip too creates
redundant announcements ("Jane Doe, John Smith, Avery Patel, 5
more, 3 of 8 collaborators, group"). Consumers who want the
overflow to be interactive (popover-on-click revealing the
hidden 5) can override `aria-hidden` on the chip's host because
the directive applies it as a default, not a hard binding.

### Per-avatar name on hover

Three layers:

1. **Native `title`** — `KjAvatarComponent` already mirrors `alt` to
   `title` in the components package (see
   [`avatar.md`](./avatar.md)). This is the floor: every kouji
   avatar has a hoverable name without any additional wiring.
2. **`role="tooltip"`** — for a real APG-pattern tooltip (with
   delay, positioning, and AT support that is more reliable than
   `title`), the consumer wraps each `<kj-avatar>` in
   `[kjTooltip]`. The Avatar Group does **not** auto-attach
   tooltips because (a) the avatar's `alt` is the source of truth
   for the name, and tooltip text would just duplicate it, and
   (b) auto-attaching would force `KjAvatarGroup` to import
   `KjTooltip`, breaking the layering rule (data-display →
   feedback would be a backwards dependency).
3. **Cross-reference** — the docs example file
   `avatar-group.tooltip.example.ts` (see Examples) demonstrates
   the wrapping pattern explicitly so consumers don't have to
   guess.

### When the group is interactive (e.g. a "stack of links to teammates")

If consumers project `<a>` elements (each containing a
`<kj-avatar>`), the group becomes a *list of links*. The correct
role is then **not** `group` — it should be a `list` with each
link wrapped in `listitem`. We do not auto-detect this. The
public API exposes `kjRole: 'group' | 'list' | null` (default
`'group'`); if `kjRole === 'list'` the directive sets
`role="list"` and emits a `data-list-item` attribute children CSS
can target, but it is **the consumer's responsibility** to
ensure each child is wrapped in `<li>` or carries
`role="listitem"`. We don't try to be clever about this — see
"Open questions" #3.

## Composition model

```
avatar-group/
  avatar-group.ts            ← KjAvatarGroup (root directive)
  avatar-group.context.ts    ← KjAvatarGroupContext + KJ_AVATAR_GROUP token
  avatar-group.spec.ts
  index.ts
```

**`KjAvatarGroup`** (selector `[kjAvatarGroup]`)
- Provides `KJ_AVATAR_GROUP` context.
- `hostDirectives`: `KjSize` (forwarded to context, so children
  fall back to the group's size), `KjVariant` (same — for chip
  styling and any variant-aware avatar). `KjVariant` is exposed
  here primarily so the *overflow chip* can be styled
  differently from the visible avatars (e.g. "subtle" variant)
  without requiring per-call overrides.
- Host: `role="group"`, `[attr.aria-label]`,
  `[attr.data-direction]` (`ltr` | `rtl`),
  `[style.--kj-avatar-group-count]`,
  `[style.--kj-avatar-group-overlap]`.
- Queries: `contentChildren(KjAvatar, { descendants: false })`
  to count visible children. (Note: this counts
  `KjAvatar` directives, not `<kj-avatar>` components — but
  because the components-package `<kj-avatar>` composes
  `KjAvatar` via `hostDirectives`, the directive query catches
  both forms uniformly.)
- Owns rendering of the overflow chip via a structural pattern.
  The chip is **not** projected by the consumer; the directive
  cannot project content into a parent's view, so the chip is
  rendered by the **wrapper component**
  (`KjAvatarGroupComponent`) using a `@for` over the visible
  slice plus a conditional `<kj-avatar>` for the chip. The
  directive exposes `visibleCount: Signal<number>`,
  `overflowCount: Signal<number>`, and
  `overflowLabel: Signal<string>` for the wrapper to consume.

**Why the directive renders nothing itself.**
`@kouji-ui/core` is template-free by mandate (no CSS, no Angular
components — directives only). The chip is a real DOM element with
text, so it must live in the wrapper's template. The directive
provides the *signals* the wrapper binds against, which is the
established pattern (see `KjSelect` / `KjSelectComponent`).

**Shared state — `KjAvatarGroupContext`**
```ts
export interface KjAvatarGroupContext {
  readonly size: Signal<KjSizeValue | undefined>;
  readonly shape: Signal<'circle' | 'rounded' | undefined>;
  readonly direction: Signal<'ltr' | 'rtl'>;
  readonly visibleCount: Signal<number>;
  readonly overflowCount: Signal<number>;
  readonly total: Signal<number>;
}
export const KJ_AVATAR_GROUP =
  new InjectionToken<KjAvatarGroupContext>('KjAvatarGroup');
```

Children read this via
`inject(KJ_AVATAR_GROUP, { optional: true })`. This is purely
additive: a `<kj-avatar>` rendered outside any group continues
to work exactly as it does today.

### Reused primitives

| Primitive | Where | Why |
|---|---|---|
| `KjAvatar`, `KjAvatarImage`, `KjAvatarFallback` | Children — projected by the consumer; **same directives** the standalone Avatar component composes | One avatar primitive, two contexts (alone vs. in a group). No fork. |
| `KjSize` | Composed via `hostDirectives` on `KjAvatarGroup` | Standardises size token routing. Acts as the default for children in the group. |
| `KjVariant` | Composed via `hostDirectives` on `KjAvatarGroup` | Standardises variant token routing — primarily for the overflow chip's appearance. |
| `KjTooltip` (cross-component) | **Not** composed by the group — consumer wraps each child if real-tooltip behaviour is wanted | Layering: data-display does not depend on feedback. See open question #5. |

### Wrapper composition (components package)

`<kj-avatar-group>` applies `KjAvatarGroup` via `hostDirectives`
and re-maps inputs to terse names (`max`, `total`, `overlap`,
`shape`, `ariaLabel`). Its template iterates the projected
children with a `@for ... ; track $index` and renders an
internal `<kj-avatar>` chip when
`group.overflowCount() > 0`:

```html
<ng-content select="kj-avatar"></ng-content>
@if (group.overflowCount() > 0) {
  <kj-avatar
    aria-hidden="true"
    [content]="'+' + group.overflowCount()"
    class="kj-avatar-group-overflow" />
}
```

The wrapper does **not** slice the projected children itself —
`<ng-content select="kj-avatar">` projects all of them into the
DOM. The directive instead sets a CSS rule that hides the
`(kjMax + 1)`-th and later children:
`.kj-avatar-group > .kj-avatar:nth-child(n + var(--kj-avatar-group-max + 1)) { display: none; }`.

**Wait** — `nth-child` does not accept custom-property
arithmetic. Two viable plans:

- **Plan A (CSS-only hiding).** Set
  `[style.--kj-avatar-group-max]` and use a sibling-counted
  attribute selector
  (`.kj-avatar:nth-child(n + 5)` for `kjMax=4` literally),
  generated from a small set of supported max values
  (1–10). Brittle.
- **Plan B (template-driven hiding).** The wrapper iterates the
  group's `visibleCount()` signal in a template `@for` rather
  than relying on `<ng-content>`. This requires consumers to
  pass `[avatars]="..."` as data, not project children — a
  different API shape. Less ergonomic.
- **Plan C (host-bound `data-overflow` per child).** The
  group walks its `contentChildren` and sets a
  `data-overflow="true"` on each child past `kjMax`, plus
  `[hidden]` to remove it from layout/AT. The wrapper CSS does
  not need to count; each child knows whether it is visible.
  Cleanest. **Recommended.**

We go with **Plan C**: the group iterates its
`avatars: Signal<readonly KjAvatar[]>` in a `computed()`, and an
`effect()` writes `host.style.display = 'none'` (or, better,
toggles a `[hidden]` attribute via a `Renderer2`-free
`(host as HTMLElement).toggleAttribute('hidden', overflow)`)
on hidden children.

**Risk with Plan C:** writing host attributes from a parent
directive on child host elements crosses the directive
boundary. Cleaner alternative: a tiny `KjAvatarGroupItem`
directive auto-applied to children via a CSS-attr
`[kjAvatar][kjAvatarGroupChild]` (set by the group's wrapper
template). But that re-introduces the child directive we
rejected. Net call: write the `hidden` attribute from the
group via `effect()` — it's one line per child, scoped, and
documented as "the group owns visibility of its overflow
items." Revisit if the boundary becomes a problem in practice.

### Cross-component pointers

- [`avatar.md`](./avatar.md) — the per-child primitive. Image
  load state, fallback rendering, alt-as-title mirroring all
  live there. The group does not duplicate any of it.
- [`../feedback/tooltip.md`](../feedback/tooltip.md) — when a
  consumer wants real APG tooltips per avatar (instead of
  native `title`), they wrap each child in `[kjTooltip]`. The
  group's example file demonstrates the pattern.
- [`../actions/button-group.md`](../actions/button-group.md) —
  same "size/variant on the group, override per child via
  context" pattern. Cross-reference when wiring the
  context-driven fallbacks.
- `KjPopover` / `KjDropdownMenu` (separate analyses, not yet
  written) — for a clickable overflow chip that reveals the
  hidden members. The group does not own this; the chip is
  exposed in the wrapper template with a `#overflow` template
  reference so consumers can attach a popover trigger.

## Inputs / Outputs / Models

All public-facing inputs/outputs/models are `kj`-prefixed on the
directive layer; wrapper components re-map them to terse names via
`hostDirectives` `inputs`.

### `KjAvatarGroup` (`[kjAvatarGroup]`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjMax` | `input` | `number` | `4` | Max number of avatars to show before the chip. `0` disables the cap (always show all, no chip). |
| `kjTotal` | `input` | `number \| undefined` | `undefined` | When provided, the group's `aria-label` reports `kjTotal` rather than `children.length`. Use when the projected children are a *page* of a larger collection (e.g. server-side paginated members). When `undefined`, the directive uses `children.length`. |
| `kjOverlap` | `input` | `number \| string` | `'33%'` | Numeric → `px`. String → passthrough. Drives `--kj-avatar-group-overlap`. |
| `kjShape` | `input` | `'circle' \| 'rounded'` | `'circle'` | Forwarded to children via context as a *default* (per-child `kjShape` overrides). |
| `kjAriaLabel` | `input` | `string` | `'avatars'` | Noun for the count-aware label. With default values: `aria-label="3 of 8 avatars"`. |
| `kjAriaLabelFormat` | `input` | `(visible: number, total: number, label: string) => string` | `(v, t, l) => \`${v} of ${t} ${l}\`` | i18n hook. |
| `kjRole` | `input` | `'group' \| 'list' \| null` | `'group'` | `null` opts out of host role entirely (e.g. when the consumer wants no semantics at all because each child is a link). `'list'` is the contract for "stack of links" use cases. |
| `visibleCount` | `Signal<number>` | — | — | Public read-only. `Math.min(children.length, kjMax || Infinity)`. |
| `overflowCount` | `Signal<number>` | — | — | Public read-only. `Math.max(0, (kjTotal ?? children.length) - kjMax)` when `kjMax > 0`, else `0`. |
| `total` | `Signal<number>` | — | — | Public read-only. `kjTotal ?? children.length`. |

No outputs. The component is read-only — no selection, no
hover-emission. If consumers want per-avatar click events, those
fire on the avatar itself (or its wrapping `<a>`).

### Wrapper inputs (components package)

| Element | Input | Maps to |
|---|---|---|
| `<kj-avatar-group>` | `max` | `kjMax` |
| `<kj-avatar-group>` | `total` | `kjTotal` |
| `<kj-avatar-group>` | `overlap` | `kjOverlap` |
| `<kj-avatar-group>` | `shape` | `kjShape` |
| `<kj-avatar-group>` | `size` | `KjSize` (host-composed) |
| `<kj-avatar-group>` | `variant` | `KjVariant` (host-composed; primarily affects the overflow chip) |
| `<kj-avatar-group>` | `ariaLabel` | `kjAriaLabel` |
| `<kj-avatar-group>` | `ariaLabelFormat` | `kjAriaLabelFormat` |
| `<kj-avatar-group>` | `role` | `kjRole` |

### Per-child overrides

Children always win over the group context. A
`<kj-avatar size="lg">` inside a `<kj-avatar-group size="md">`
renders at `lg`. Implementation: in
`KjAvatarComponent`, `size()` continues to be a plain
`input('md')`, but the *applied* size is computed as
`group?.size() ?? size()` when the consumer didn't
explicitly pass one. **Caveat:** `input()` always has a value
(`'md'` default); we cannot distinguish "consumer set `'md'`"
from "consumer didn't touch it." Two ways out:

- **A.** Default the wrapper's `size` to `undefined` and resolve
  to `'md'` only at the styling layer
  (`group?.size() ?? size() ?? 'md'`). Breaking change to the
  shipped Avatar component (its current default is `'md'`).
- **B.** Add a separate `kjInheritSize` flag on `<kj-avatar>`
  that opts into the group's size when truthy. Awkward and
  requires consumers to remember the flag.

**Recommendation: A.** Change `KjAvatarComponent.size`'s
default to `undefined` and let the CSS apply `md` styling when
no `data-size` is present. The wrapper continues to look like
`<kj-avatar />` for a default-size avatar — the CSS, not the
input default, defines what "no size" looks like.

## Examples to ship

1. **Default** — five avatars, `kjMax=3`, default size and
   overlap. Demonstrates the chip, the count-aware label, and
   the "first on top" stacking.
2. **All visible (no overflow)** — three avatars, `kjMax=4`.
   Verifies the chip is omitted when `children.length <= kjMax`
   and the label reports `3 of 3`.
3. **Sizes** — three groups (`size="sm"`, `size="md"`,
   `size="lg"`) showing context-driven size propagation. One of
   them includes a per-child override (`<kj-avatar size="xl">`)
   to demonstrate child-wins resolution.
4. **Custom overlap** — `overlap="50%"` for a tighter cluster
   and `overlap="0px"` for a non-overlapping row, both rendering
   correctly under the same wrapper CSS.
5. **RTL** — same default group inside `<div dir="rtl">`,
   verifying the stacking direction flips and the chip lands on
   the *left* (the visual end of the line in RTL flow).
6. **Server-paginated total** — `<kj-avatar-group [max]="3"
   [total]="42">` with three projected children, demonstrating
   the chip says `+39` and the label says `3 of 42`.
7. **With per-avatar tooltip** — each `<kj-avatar>` wrapped in
   `[kjTooltip]` showing the member's full name on hover. Anchors
   the cross-reference to `tooltip.md`.
8. **Clickable overflow chip** — wraps the chip in
   `[kjPopoverTriggerFor]` to reveal a popover listing the
   hidden members. Demonstrates the `#overflow` template-ref
   escape hatch in the wrapper.
9. **Mixed-shape / variant chip** — `variant="subtle"` on the
   group to differentiate the chip's visual treatment from the
   avatars; verifies the chip is the correct vehicle for
   "secondary" group styling.

Themed variants (`default` / `retro` / `finance`) shipped for
example 1 only — Avatar Group is a small enough surface that
theming the default communicates the system; the rest are
behavioural demonstrations and don't need triple-theming.

## Open questions / risks

1. **`hidden` writes from parent to child host.** The group
   marks overflow children `hidden` via an `effect()` that
   walks `contentChildren`. This crosses the directive
   boundary. Alternatives: (a) introduce a
   `KjAvatarGroupItem` directive (rejected as a useless
   wrapper); (b) require consumers to pass an array and
   iterate in the wrapper template (rejected as a worse API
   shape); (c) accept the boundary cross with a clear
   comment. Recommendation: (c). Validate that
   `MutationObserver`-driven AT (NVDA, VoiceOver) re-announce
   the group label correctly when children are hidden mid-
   session.

2. **Direction reading without CDK.** Material's
   `Directionality` lives in `@angular/cdk/bidi`; the no-CDK
   rule precludes it. We need a tiny in-house equivalent —
   read `getComputedStyle(host).direction` on
   `afterNextRender()` and listen to a
   `MutationObserver` on document for `dir` attribute
   changes. This belongs in `packages/core/src/a11y/` or
   `primitives/` as `KjDirectionality` and should be designed
   alongside Avatar Group rather than inlined. **Blocker:**
   confirm whether such a primitive already exists or is
   planned. If neither, this analysis blocks on a separate
   `KjDirectionality` design.

3. **`kjRole='list'` vs `kjRole='group'` inference.** We do
   not auto-detect whether children are interactive. If a
   consumer projects `<a>` elements but leaves `kjRole` at
   `'group'`, AT will hear "group" rather than "list of
   links" and may not announce items as a related set of
   navigations. Decision today: explicit opt-in via
   `kjRole`. Risk: consumers ship the wrong role.
   Mitigation: dev-mode warn when the directive detects a
   focusable descendant inside a child and `kjRole !==
   'list'`. Matches the warn-mode policy from
   `KjAriaDescribedby`.

4. **Counting via `contentChildren(KjAvatar)` misses
   wrappers.** If a consumer wraps each `<kj-avatar>` in
   `<a>` (the "stack of links" use case), the link is the
   immediate child of the group, not the avatar.
   `contentChildren(KjAvatar)` with `descendants: false` will
   miss those. We must use `descendants: true`, but then a
   nested incidentally-rendered avatar (e.g. inside a
   tooltip's `aria-describedby` template) would be counted.
   Plan: `descendants: true` with a docs warning that any
   nested `KjAvatar` not intended as a group member must be
   placed outside the group's projection slot. Practical
   risk is low.

5. **Auto-tooltip option.** Should `<kj-avatar-group>` accept
   a `kjAutoTooltip: boolean` that wraps each child in
   `[kjTooltip]` automatically, sourcing the tooltip text
   from the child's `alt`? Tempting, but breaks the layering
   rule (`avatar-group` is in `data-display`; `tooltip` is in
   `feedback`, and data-display must not depend on
   feedback). Reject for v1; revisit if the manual wrapping
   pattern proves clumsy in real apps.

6. **Overflow chip clickability.** The wrapper exposes the
   chip behind a `#overflow` template-reference variable so
   consumers can attach `[kjPopoverTriggerFor]` or similar.
   Open: should the chip emit its own `(kjOverflowClick)`
   output, or stay purely template-projected? Output is
   tempting for the common "open a popover" case but
   duplicates what a `(click)` listener on the chip already
   does. Decision: no output. Consumers who want the popover
   add the trigger directive directly. Documented in
   example 8.

7. **`kjMax=0` semantics.** Docs above call out "0 disables
   the cap." Confirm this is the desired default rather than
   `0` meaning "show no avatars" (which is what a literal
   reading of "max = 0" would suggest). Recommendation: keep
   "0 = no cap" because (a) `Infinity` is awkward to type in
   templates, and (b) `null` is already used elsewhere for
   "opt out" — but **document loudly**.

8. **Chip's accessibility default — `aria-hidden="true"`.**
   The wrapper applies `aria-hidden="true"` on the chip by
   default. A consumer who attaches a `[kjPopoverTrigger]`
   to the chip almost certainly wants it focusable and
   announced; the popover trigger directive must remove the
   hidden attribute. Confirm `KjPopoverTrigger`'s host
   bindings are precedence-correct (i.e. they win over the
   wrapper's static binding). If not, expose a
   `[chipAriaHidden]` input on the wrapper to opt out.

9. **`kjTotal < children.length`.** What happens if the
   consumer says `[total]="3"` but projects five children?
   The label would read "5 of 3" which is nonsense.
   Recommendation: clamp `total` to
   `Math.max(kjTotal, children.length)` and emit a
   dev-mode console.warn if they disagree. Consumers should
   pass `total` *only* when they are showing a subset of a
   larger collection.

10. **Touch target on interactive avatars.** Default avatar
    size is `2.5rem` (40px), below the WCAG 2.5.5 AAA
    threshold of 44×44. If consumers wrap avatars in
    interactive elements, the group's docs must call out the
    need to bump size to `lg` (3rem = 48px) or wrap in a
    larger hit-target element. Not the group's bug, but the
    group's doc surface is where a migrating PrimeNG user
    will look.

11. **First-render flash with image loading.** A child whose
    image is still loading shows the fallback briefly, then
    swaps to the image. In a stack of overlapping circles,
    that flicker is more visible than for a standalone
    avatar because users compare across faces. Mitigation
    is per-avatar (preload, decode-async, blur-up
    placeholder) and lives in `avatar.md`'s open questions
    rather than here. Cross-reference only.

12. **`KjAvatar` directive vs. `<kj-avatar>` component
    counting.** `contentChildren(KjAvatar)` matches the
    directive, which is composed via `hostDirectives` on
    `<kj-avatar>` and is *also* applicable as a bare
    `[kjAvatar]` selector. A consumer mixing both forms
    (rare but legal) will be counted uniformly — confirmed
    correct by the way `hostDirectives` registers the
    directive on the host element. No action needed; noted
    so future maintainers don't trip over it.

13. **No first-render measurement.** Unlike Accordion's
    content-height story, Avatar Group needs no DOM
    measurement — overlap is CSS-only via percentage
    margin. SSR-safe by construction.

14. **Empty group.** Zero projected children:
    `aria-label` reads `0 of 0 avatars`, which is correct
    but ugly. Decision: when `total === 0`, omit the
    `aria-label` entirely (the group is visually empty
    anyway). Implemented as a `computed()` returning `null`
    when `total() === 0`.
