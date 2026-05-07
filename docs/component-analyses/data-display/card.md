# Card

A surface that groups information about a single subject — image, title,
description, body, footer actions — into one bordered (or shadowed,
or filled) box. Visually one of the most-used components in any UI;
behaviourally one of the **least**-loaded. A Card is, in the simplest
case, a `<div>` with padding and a border. The whole question of this
analysis is whether that "simplest case" is the *whole* case, or
whether enough cross-element coordination hides under the surface to
earn a directive in `@kouji-ui/core`.

> Already partially shipped in components at
> `packages/components/src/card/card.ts` — seven presentation-only
> components (`KjCardComponent`, `KjCardCoverComponent`,
> `KjCardHeaderComponent`, `KjCardTitleComponent`,
> `KjCardSubtitleComponent`, `KjCardContentComponent`,
> `KjCardFooterComponent`) plus `card.css`. **Nothing in
> `packages/core/src/card/`** — there is no headless directive today,
> by deliberate omission ("Presentation-only: no headless directive in
> core, no behavior" reads the file's TSDoc). This analysis re-opens
> that decision, not to undo it for the static case but to define
> what core *would* own once the **interactive** card shapes
> (clickable card, selectable card) are needed — and to firm up the
> sub-part API before more consumers compose against the current
> components-only surface.

For the **non-interactive sibling** patterns Card frequently composes
with, see [`avatar.md`](./avatar.md) (typical card-header avatar),
[`badge.md`](./badge.md) and [`tag.md`](./tag.md) (status / category
chrome inside a card body or header). For the actions wired in the
footer, see [`../actions/button.md`](../actions/button.md) and
[`../navigation/`](../navigation/) (link). For the empty-state
container that lives *inside* a card body when there is no data, see
the planned [`../feedback/empty-state.md`](../feedback/empty-state.md)
(not yet written; flagged as a cross-reference target). For
**multi-card** layouts — a list / grid of cards driving a feed — see
the planned [`../layout/list.md`](../layout/list.md) and
[`../layout/card-grid.md`](../layout/card-grid.md).

## Source comparison

| Concern | PrimeNG `<p-card>` | Angular Material `<mat-card>` family | shadcn/ui `Card` (Radix-flavoured) | daisyUI `.card` |
|---|---|---|---|---|
| Primary surface | One component (`<p-card>`) with input slots (`header`, `subheader`, `title`, `style`, `styleClass`) and named `<ng-template pTemplate="title|subtitle|header|footer">` projection | **Five-component family**: `<mat-card>`, `<mat-card-header>`, `<mat-card-title>`, `<mat-card-subtitle>`, `<mat-card-content>`, `<mat-card-actions>`, `<mat-card-image>` (and image position variants `mat-card-sm-image` / `mat-card-md-image` / `mat-card-lg-image`, `mat-card-avatar`) | **Six-component family**: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` — each is a styled `<div>` (or `<h3>` for Title, `<p>` for Description) with no behaviour | **CSS-only**: `.card`, `.card-body`, `.card-title`, `.card-actions`, `.card-side`, `.card-image-full`, `.image-full`, `.card-bordered`, `.card-compact` — no JS at all |
| Variants / appearance | Single visual; theme-driven via PrimeNG presets | `appearance: 'raised' \| 'outlined'` (added in v15) | None — `border bg-card text-card-foreground` is a single visual; consumer adds variants via Tailwind | `card-bordered`, `card-side` (image-side layout), `image-full` (image as background) — class modifiers, no API |
| Sizes / density | None | None — Material density tokens drive global density | None | `card-compact`, `card-normal` |
| Sub-parts | All optional — headers and footers projected via `pTemplate` | All optional — five separate components, each opinionated about its inner DOM (`<mat-card-title>` becomes `<div class="mat-mdc-card-title">`) | All optional — composable, none required | All optional — `.card-body` is the conventional content wrapper |
| Image / media | `<ng-template pTemplate="header">` typically holds an `<img>`; no positioning logic | `[mat-card-image]` directive on an `<img>` element — the directive applies layout CSS for top-of-card placement; size variants for thumbnail-style (`mat-card-sm-image`) | No dedicated component — consumer drops an `<img>` inside `<CardHeader>` or `<CardContent>` | `figure` child handles top media; `.image-full` puts media as background under content |
| Heading semantics | `<p-card>` exposes a `header` *string* input that renders a `<div>` (no heading) — accessibility foot-gun. The `pTemplate="title"` slot lets consumers project their own heading | `<mat-card-title>` renders a `<div>`, **not** a heading element — same foot-gun, documented but not enforced | `<CardTitle>` defaults to `<h3>` (configurable via `as`/`asChild` — Radix slot pattern) | Consumer writes `<h2 class="card-title">` explicitly |
| Heading id wiring | None — title and card are not related via `aria-labelledby` | None | None — community recipes wire it manually | None |
| Interactive card | None built-in. Consumer wraps `<p-card>` in an `<a>` or adds `(click)` ad hoc | **Specific support**: `<mat-card appearance="raised" (click)="...">` plus the `.mat-mdc-card-clickable` class + ripple. Material's pattern: the **whole card** becomes a button with `cdkRipple` | None — consumer composes `<a>` → `<Card>` or wraps the title in a `<Link>` | None — consumer pattern: `<a class="card …">` |
| Selectable card | None | None first-class — consumer adds checkbox / radio inside footer | None | None |
| Focus / keyboard contract | None | When clickable: focus ring + ripple, no special arrow keys | None | None |
| ARIA | None set automatically | None set automatically | None set automatically | None |
| Footer alignment | `pTemplate="footer"` — consumer aligns | `<mat-card-actions [align]="'start' \| 'end'">` — directive input | `<CardFooter className="flex justify-…">` — Tailwind utility | `.card-actions justify-end` etc. |

**Read-off.**

- **PrimeNG** treats Card as a single component with template
  projection slots. The string-`header` input is a real a11y trap —
  it renders `<div class="p-card-header">` and looks like a heading
  but isn't one. The five-template indirection (`pTemplate`) is
  more typing than the shadcn approach for the same outcome.
- **Angular Material** is the most opinionated: a five-component
  family that each render their own `<div>` wrapper. **The notable
  win** is the **clickable-card support** (raised appearance +
  ripple + click handler) and the **`<mat-card-image>` directive**
  applying layout CSS at the directive level. The notable
  *miss* is `<mat-card-title>` rendering a `<div>` instead of a
  real heading — same trap as PrimeNG.
- **shadcn / Radix** is the spiritual match for our component split:
  six small components, one styled element each, zero behaviour, the
  consumer composes them. `<CardTitle>` defaults to `<h3>` — the
  right call. `<CardDescription>` is `<p>`, automatically tied to
  the title for AT (no, actually — shadcn doesn't wire
  `aria-describedby` either; the relation is visual only).
- **daisyUI** is the floor of the question: it ships **no JS**, no
  components, just CSS classes. The fact that a useful Card can be
  delivered without a single line of TypeScript is the strongest
  argument that core has nothing to own — at least for the static
  case.

## Decision: split by interactivity, not by anatomy

This is the central question for Card and the answer is **two
different answers** depending on the shape of the card you mean.

### Static (decorative) card — no core directive

A card that exists purely as a styled container for text, images, and
actions has **no cross-element coordination, no state, no keyboard
contract, no ARIA wiring that the consumer can't author in five
characters**. It is a `<div>` with a border, padding, a radius, and a
shadow. Building a `KjCard` directive that only sets
`[attr.data-variant]` would violate the project's own "What NOT to
Build" rule in [`rules/code_style.md`](../../../rules/code_style.md):

> Do not create directives that only add `data-*` attributes with no
> behaviour.

The current **components-package-only** layout is correct for this
case. `KjCardComponent` is a thin styled `<div>`; the seven sub-part
components are thin styled wrappers. None of them deserves a core
directive **for the static case** because none of them has any
behaviour to deduplicate.

The argument for "but a `KjCard` directive could own
`aria-labelledby` wiring to its `<kj-card-title>`" is **rejected**.
The relationship between a card and its heading is not a
machine-readable widget pattern — it is a visual grouping. WAI-ARIA
explicitly warns against wrapping every visual group in
`role="region"` + `aria-labelledby` (the
[landmark-overuse anti-pattern](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/));
landmarks are reserved for the page-level structure, and a feed of
30 cards turned into 30 `region`s is hostile noise for AT users.
**Static cards take no role** and need no labelledby wiring.

So: **no `KjCard` core directive for static cards.** Document this
in the component file's TSDoc (already done — keep it). Push back on
proposals to add one unless the proposal carries actual behaviour
(load state, expand/collapse, drag affordance — none of which Card
should grow at v1).

### Interactive card — yes, a core directive (`KjCardInteractive`)

The moment a Card becomes a click target — the whole surface fires a
navigation, opens a detail view, or toggles selection in a card-grid
— it stops being a `<div>` and starts being either a button or a
link, with all the keyboard, focus, and ARIA contract those imply.
Consumers reach for this pattern constantly: e-commerce product
cards, dashboard tile cards, file-picker thumbnail cards, settings
preference cards. Every one of those surfaces has the same set of
mistakes consumers make:

1. **Nested-interactive trap.** A clickable card with a `<button>`
   in its footer is a `<button>` inside a `<button>` (or `<a>`
   inside `<a>`) — invalid HTML, broken keyboard semantics, broken
   AT announcement.
2. **Focus ring on the wrong element.** Consumers `(click)` a
   `<div>` and forget `tabindex="0"`, focus styling, `role="button"`,
   `Enter`/`Space` handlers — every single piece needs to be wired
   to satisfy WCAG 2.1.1 (Keyboard) and 4.1.2 (Name/Role/Value).
3. **Whole-card hit area vs. linked title.** The "card-as-link"
   pattern needs the whole card to feel clickable but the
   accessible name should be the *title*, not the entire card's
   text content. The standard solution is the
   [pseudo-content trick](https://inclusive-components.design/cards/):
   make the title the real `<a>`, then absolutely-position a
   `::after` over the whole card so the card surface receives
   pointer events but the AT-visible target stays the title.
   Consumers virtually never know this trick exists.

A core `KjCardInteractive` directive owns exactly these concerns —
nothing else. Visual chrome stays in components, sub-parts stay in
components; the directive is one ~80-line file:

```
KjCardInteractive   (selector: [kjCardInteractive])
  ├─ enforces semantic host element (<a> or <button>, dev warning otherwise)
  ├─ host-binds tabindex, role (when needed), aria-disabled
  ├─ composes KjFocusRing (focus ring), KjDisabled (disabled contract)
  └─ exposes KJ_CARD_INTERACTIVE { mode, disabled, pressed }
KjCardInteractiveTitle  (selector: [kjCardInteractiveTitle])
  └─ wires the "linked-title hit-extension" pattern when projected
     inside KjCardInteractive's body — no per-card a11y trap
```

For the **selectable** card case (a card that toggles in a card
grid, Pinterest-style "favorite this", or single-/multi-select tile
groups for plan picker / template picker UIs) `KjCardInteractive`
extends to a `kjCardSelectable` flag that flips role to `button` +
`aria-pressed` (toggle button pattern). Group coordination
(roving tabindex, `role="listbox"` over a grid of selectable cards,
`aria-multiselectable`) is **not** Card's job — that lives in the
forthcoming `KjCardGroup` (parallel to `KjTagList` for tags), and the
selectable card opts into the group via context injection exactly
the way `KjTag` opts into `KjTagList`. See cross-references.

### Why interactive is the only directive

Headless layers earn their keep by encoding **non-trivial,
error-prone, cross-element coordination**. The static card has none.
The interactive card has three of them (nested-interactive
prevention, keyboard contract, linked-title hit-extension). Drawing
the line at "interactive" is the cleanest cut: it matches the
project's `KjBadge` (no behaviour, no directive needed beyond a
variant routing) → `KjTag` (interactive, gets a real directive
family) split documented in [`tag.md`](./tag.md). Card follows the
same rule — **the static case stays in components; the interactive
case earns a core directive.**

### What composes with what — at a glance

| Shape | Host element | Core directive | Components-package wrapper |
|---|---|---|---|
| Static decorative card | `<div>` (or `<article>` if consumer chooses — see Open questions) | none | `<kj-card>` + `<kj-card-*>` sub-parts |
| Card whose title is a link, body is decorative | `<div>` for the card; `<a kjLink>` on the title | none on the card itself | same `<kj-card>`; consumer drops `<kj-link>` inside `<kj-card-title>` |
| Whole-card link (clickable card → navigation) | `<a kjCardInteractive>` | `KjCardInteractive` (`mode='link'`) | `<kj-card kjCardInteractive href="…">` (wrapper picks `<a>`) |
| Whole-card button (clickable card → action) | `<button kjCardInteractive>` | `KjCardInteractive` (`mode='button'`) | `<kj-card kjCardInteractive (kjCardActivate)>…` (wrapper picks `<button>`) |
| Selectable card (in a card grid) | `<button kjCardInteractive [kjCardSelectable]>` | `KjCardInteractive` + `KJ_CARD_GROUP` (when present) | `<kj-card kjCardInteractive kjCardSelectable [(kjCardSelected)]>…` |

## What exists today

`packages/components/src/card/`:

- `card.ts` — seven components in one file:
  - `KjCardComponent` (host `class="kj-card"`, `[data-variant]`,
    inputs: `variant: 'default' | 'outline' | 'subtle'` — the file
    calls these "Variants" but the names are inconsistent with
    `KjVariant`'s preset list. See Open questions.).
  - `KjCardCoverComponent` (host `class="kj-card-cover"`,
    `[data-size]`, `[data-fit]`, inputs: `size: 'sm' | 'md' | 'lg'`,
    `fit: 'cover' | 'contain'`).
  - `KjCardHeaderComponent` (host `class="kj-card-header"`).
  - `KjCardTitleComponent` (renders `<h3 class="kj-card-title">` —
    correct heading semantics; `style="display: contents"` on host).
  - `KjCardSubtitleComponent` (renders `<p class="kj-card-subtitle">`).
  - `KjCardContentComponent` (host `class="kj-card-content"`,
    `[data-padded]`, input `padded: boolean = true`).
  - `KjCardFooterComponent` (host `class="kj-card-footer"`,
    `[data-align]`, input `align: 'start' | 'center' | 'end' |
    'between' = 'end'`).
- `card.css` — component-layer CSS in `@layer kj.component`. CSS
  custom properties for everything (`--kj-card-bg`, `--kj-card-fg`,
  `--kj-card-border-color`, `--kj-card-border-width`,
  `--kj-card-radius`, `--kj-card-padding-x`, `--kj-card-padding-y`,
  `--kj-card-shadow`, plus cover/footer-specific properties).
  `:has()` selector falls back to padded surface when no sub-parts
  are present (`.kj-card:not(:has(.kj-card-header, .kj-card-content,
  .kj-card-footer, .kj-card-cover))` — clever but limits browser
  matrix; see Open questions).
- `card.spec.ts` — four tests covering host class, default variant,
  variant attribute forwarding, content projection. **No tests for
  sub-parts, no axe pass, no clickable / interactive coverage.**
- `card.example.ts`, `card.full.example.ts`, `card.cover.example.ts`
  — three examples on disk.
- `index.ts` — barrel.

`packages/core/src/card/`: **does not exist.** No directive, no
context, no spec.

### Notable gaps the analysis below closes

- **No `KjCardInteractive`** — there is no first-class clickable /
  selectable card. Consumers who need one today would wrap
  `<kj-card>` inside `<a>` or `<button>`, with all the
  nested-interactive and accessible-name traps unsolved.
- **No `KjCardActions` (or equivalent)** — footer is named
  `<kj-card-footer>`. Material's split into "footer text" vs.
  "actions" is a real distinction (see Open questions); we collapse
  both into `<kj-card-footer>` today, which works but blurs intent
  and doesn't auto-handle the button-spacing token.
- **No `KjCardDescription`** — `<kj-card-subtitle>` renders `<p>`
  inside the header today; shadcn's `<CardDescription>` is the
  longer prose summary that lives directly in the body or
  immediately under the title. Distinct slot, distinct typography.
  See Open questions.
- **`variant` names don't compose `KjVariant`** — `default | outline
  | subtle` is a local union; the rest of the library routes through
  `KjVariant`. The naming is also inconsistent with the broader
  preset list (`outline` not `outlined`, `subtle` not `secondary`).
- **No `KjSize` composition** — Card has implicit "one size only".
  Material ships density tokens; daisyUI ships `card-compact`. The
  brief calls out **outlined / elevated / filled** as the variant
  axis, which is the appearance question — the size question is
  separate and currently unaddressed.
- **`elevated` variant is missing** — current set is `default |
  outline | subtle`. The brief calls for `outlined | elevated |
  filled`. The current `default` is roughly "filled (low contrast
  surface)", `outline` is "outlined", and `subtle` is also a filled
  flavour — there is no `elevated` (drop-shadow box) variant. See
  Open questions.
- **`<kj-card-title>` is hard-coded `<h3>`** — there is no `level`
  input. In practice the heading level depends on the card's
  position in the document outline. PrimeNG's foot-gun is missing
  the heading entirely; ours is locking it to `h3`. See Open
  questions.
- **`role="article"` is never set** — for content-piece cards (a
  blog-post card, a news-feed card) the WAI-ARIA-recommended role
  is `article`. Today consumers can't request it without rewriting
  the host element. See Open questions.
- **No spec coverage of the sub-parts.** `card.spec.ts` only tests
  the root.

## Base features

| Feature | Where it lives | Notes |
|---|---|---|
| Visual variants | `<kj-card>` `kjVariant` (host-composed via `KjVariant`) | **Plan**: replace local `variant` with `kjVariant` aliased through `KjVariant`. Preset list: `'outlined' \| 'elevated' \| 'filled' \| 'subtle' \| 'ghost'`. Default `'filled'` (rename of today's `'default'`). `'subtle'` retained for the lower-contrast filled flavour. `'ghost'` is borderless, transparent — useful inside list rows where the card is purely a layout box. |
| Density / size | `<kj-card>` `kjSize` (host-composed via `KjSize`) | **New.** Presets `'sm' \| 'md' \| 'lg'`. Drives `--kj-card-padding-{x,y}`, `--kj-card-radius`, and the typography scale of `<kj-card-title>` / `<kj-card-subtitle>` via `data-size` cascading from the root. |
| Surface element | `<kj-card>` `kjCardAs` (`'div' \| 'article' \| 'section' \| 'aside' \| 'li'`) | **New.** Wrapper renders the chosen element under the hood. Default `'div'`. Use `'article'` for blog-post / news-feed cards (auto-applies `role="article"` is *not* needed — `<article>` carries the role natively). Use `'li'` when the card is a list item inside a `<ul>` / `<ol>` driven by `<kj-list>`. |
| Cover / media | `<kj-card-cover>` (existing) | Keep. Plan: **promote `KjCardCover` to a small core directive** that owns `<img alt="">` discipline (decorative cover) vs. a meaningful alt (informative cover). Today it is presentation-only and the `<img>` element's alt is purely consumer-managed. See Open questions for whether the directive earns its keep. Lean: borderline yes for a11y discipline, but not a blocker. |
| Header band | `<kj-card-header>` (existing) | Keep. Display `flex column`. Optional `kjCardHeaderActions` slot input (`'inline' \| 'wrap'`) for a top-right actions area (overflow menu, "·" kebab) — common pattern, missing today. See Open questions. |
| Title | `<kj-card-title>` | **Plan**: add `kjCardTitleLevel: 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 'div'` input (default `3`). Wrapper renders the chosen element. `'div'` is an explicit opt-out for cases where the consumer is using ARIA labelledby wiring of their own and a heading would double-up. |
| Description / subtitle | `<kj-card-subtitle>` (existing, renders `<p>`) | Keep as-is for the "subtitle inside header" case. Add `<kj-card-description>` as a separate component that renders `<p>` and lives **outside** the header (in the body, below the title) — the shadcn split. See Open questions. |
| Body | `<kj-card-content>` (existing) | Keep. The `padded` boolean is awkward — see Open questions for replacing with a `kjCardContentInset` enum (`'default' \| 'flush'`). |
| Actions / footer | `<kj-card-footer>` (existing) + new `<kj-card-actions>` | **Plan**: keep `<kj-card-footer>` for arbitrary footer content (text + meta + actions). Add `<kj-card-actions>` for the **buttons-only** flavour. `<kj-card-actions>` enforces a consistent gap between projected `<kj-button>` instances via `gap: var(--kj-space-sm)`, takes the same `align` input. Consumers reach for the right one based on intent, not invent footer alignment. See Open questions. |
| Interactivity | `KjCardInteractive` (new core directive) + wrapper composition | See [Interactive card section](#interactive-card-yes-a-core-directive-kjcardinteractive) above and [Composition model](#composition-model) below. |
| Selection | `KjCardInteractive[kjCardSelectable]` + `KjCardGroup` (group coordinator, scoped to v1.x) | New. Toggle pattern via `aria-pressed` when standalone; `option` / `aria-selected` when inside a `KjCardGroup[role="listbox"]`. Mirrors `KjTag` / `KjTagList` shape. |
| Disabled state | Composed `KjDisabled` on `KjCardInteractive` | Standard ARIA-disabled (focusable, `aria-disabled="true"`, click suppression). Disabled non-interactive cards are not a concept — a static card cannot be "disabled". |
| Focus ring | Composed `KjFocusRing` on `KjCardInteractive` | Card surface itself shows the ring when in `mode='button'`; in `mode='link'` the ring is on the link, but the card surface mirrors via `[data-focus-visible]` so the whole tile lights up. |

## Accessibility (WCAG 2.1 AAA)

There is no formal WAI-ARIA APG pattern for "card"; the relevant
references are
[WCAG 1.3.1 Info & Relationships](https://www.w3.org/TR/WCAG21/#info-and-relationships),
[1.4.3 / 1.4.6 Contrast](https://www.w3.org/TR/WCAG21/#contrast-minimum),
[2.1.1 Keyboard](https://www.w3.org/TR/WCAG21/#keyboard),
[2.4.4 Link Purpose (In Context)](https://www.w3.org/TR/WCAG21/#link-purpose-in-context),
[2.5.5 Target Size (AAA)](https://www.w3.org/TR/WCAG21/#target-size),
[4.1.2 Name, Role, Value](https://www.w3.org/TR/WCAG21/#name-role-value),
and the
[APG Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/)
plus
[APG Listbox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)
when cards participate in a selectable group.

### Per-shape role + ARIA wiring

| Shape | Host element | Role | Required ARIA | Notes |
|---|---|---|---|---|
| Static decorative card | `<div>` (or `<article>` / `<section>` / `<aside>` / `<li>` per `kjCardAs`) | none (or implicit landmark when `<article>` / `<aside>`) | none | Heading inside `<kj-card-title>` carries the section's name in the document outline. **No `aria-labelledby` wiring** — a card is not a region. |
| Card with linked title | `<div>` for the card; `<a>` for the title | none on the card; `link` on the `<a>` | `aria-label` on the link if the visible text is shorter than the destination's name (rare) | Hit-area extension via `::after` is purely visual; the AT-visible target stays the link. Recommended composition for content-feed cards. |
| Whole-card link | `<a kjCardInteractive>` | `link` (native) | `href` (native); `aria-label` if the card's text is too noisy to serve as the accessible name | The accessible name is the entire concatenated text content unless `aria-label` overrides. Consumer should review whether that name is acceptable. |
| Whole-card button | `<button kjCardInteractive>` | `button` (native) | `aria-disabled` when disabled | Enter / Space activate natively. |
| Selectable card (standalone toggle) | `<button kjCardInteractive [kjCardSelectable]>` | `button` (native) + `aria-pressed` | `aria-pressed="true \| false"` always set | Toggle button pattern. Same as `KjTag[kjTagSelectable]` standalone. |
| Selectable card inside `KjCardGroup[role="listbox"]` | `<button kjCardInteractive [kjCardSelectable]>` | `option` (overrides native button role via `[attr.role]`) | `aria-selected="true \| false"` always set; container provides `role="listbox"`, `aria-multiselectable` | Roving tabindex on the group; arrow keys move active index. APG listbox pattern. |
| Selectable card inside `KjCardGroup[role="grid"]` | rendered as `<div role="row">` containing the card + remove cells | `gridcell` on inner cells | `aria-selected` per row, `aria-rowindex`, `aria-colindex` | Two-dimensional selectable grid (less common; deferred — see Open questions). |

### Per-criterion checklist

| WCAG 2.1 criterion | Requirement | Where it lives |
|---|---|---|
| 1.1.1 Non-text Content | `<img>` inside `<kj-card-cover>` carries an `alt` (informative card cover) or `alt=""` (decorative). | Consumer-supplied via `<img alt="…">`. **Plan**: optional `KjCardCover` directive that warns in dev mode when an `<img>` child has no `alt` attribute (not just empty — *missing*). |
| 1.3.1 Info & Relationships | Heading inside the card uses a real heading element (`<h2>`–`<h6>`). | `<kj-card-title>` defaults to `<h3>` today; `kjCardTitleLevel` lets the consumer pick the right level for the document outline. |
| 1.4.3 Contrast (AA) / 1.4.6 Contrast (AAA) | Card text against background ≥ 7:1; subtitle / description (lower opacity today, 0.6) must still hit 4.5:1 large-text or 7:1 normal-text. | Theme tokens — same approach as Badge / Tag. **Risk today**: `<kj-card-subtitle>` uses `opacity: 0.6` on `--kj-color-base-content`. With default tokens this lands around 5.6:1 in light theme — passes AA, fails AAA. Plan: drop the opacity hack, switch to a real palette colour (`--kj-color-base-content-muted`) so token authors can tune it independently. |
| 1.4.5 Images of Text (AA) / 1.4.9 Images of Text (No Exception, AAA) | Avoid text rendered as image inside cards. | Consumer responsibility; documented in examples. |
| 1.4.11 Non-text Contrast | Card border (`outlined` variant) and focus ring ≥ 3:1 against page background. | Theme tokens. The current `outline` variant uses `--kj-color-neutral`, which on default tokens passes 3:1 in both themes. Verify `elevated` variant's drop-shadow visibility (shadow is not a "border" per WCAG, but the perceived edge needs contrast — verify with a tester). |
| 2.1.1 Keyboard | Interactive cards reachable + operable via keyboard. Static cards have no keyboard contract. | Static: inherent. Interactive: `KjCardInteractive` enforces `<a>` or `<button>` as the host element (dev-mode warn otherwise); native semantics give Tab + Enter/Space for free. Selectable: same plus `aria-pressed` toggling on Space (button) or click. |
| 2.1.2 No Keyboard Trap | Tab leaves the card / card group when no further focusable elements remain. | Inherent — no overlay, no trap. |
| 2.4.3 Focus Order | Focus order inside an interactive card matches DOM order; nested interactives (forbidden by `KjCardInteractive`) do not arise. | Enforced by `KjCardInteractive`'s nested-interactive dev warning. See [Open questions](#open-questions--risks) Q1. |
| 2.4.4 Link Purpose (In Context) / 2.4.9 Link Purpose (Link Only, AAA) | A whole-card link's accessible name describes the destination. The "linked title with hit-area extension" pattern often has a shorter, clearer name than the whole-card link. | Documented explicitly in examples. The "linked title" pattern is the AAA-friendly choice; "whole-card link" is AA-friendly only if `aria-label` overrides the noisy text content. |
| 2.4.7 Focus Visible | Interactive cards show a visible focus ring; static cards don't focus. | `KjCardInteractive` composes `KjFocusRing`. The card surface is the focus host (via `[data-focus-visible]` on the host attribute) — the ring outlines the whole tile. |
| 2.5.5 Target Size (AAA) | Interactive cards ≥ 44×44 CSS px. | Cards are practically always ≥ 44px. The risk is the linked-title hit-area extension: when the title's `::after` overlay extends to the card edges, the **link** target size is the card's bounding box. |
| 2.5.8 Target Size (Minimum, AA) | 24×24 fallback when 44×44 isn't met. | Inherent — cards exceed it trivially. |
| 4.1.2 Name, Role, Value | Interactive cards announce as "{accessible name}, button" or "{accessible name}, link". Selectable cards announce pressed/selected state. | Native `<a>` / `<button>` give role + name; `KjCardInteractive` host-binds `aria-pressed` / `aria-selected` per shape. |
| 4.1.3 Status Messages | A card whose content is a live-changing status (count, "x agents online") needs a live region inside the card body. | Out of Card's scope — `KjLiveRegion` primitive exists; consumers wire it as needed inside `<kj-card-content>`. |

### Keyboard contract

| Context | Key | Behaviour |
|---|---|---|
| Static card | n/a | Not focusable. |
| Card with linked title | `Tab` | Lands on the link inside the title. The whole card's hit area is mouse-only (the `::after` overlay does not affect the focus story — focus follows the actual `<a>`). |
| Whole-card link (`<a kjCardInteractive>`) | `Tab` | Lands on the card. |
| | `Enter` | Activates the link (native). |
| Whole-card button (`<button kjCardInteractive>`) | `Tab` | Lands on the card. |
| | `Enter` / `Space` | Activates (native). |
| Selectable card (standalone toggle) | `Tab` | Lands on the card. |
| | `Enter` / `Space` | Toggles `kjCardSelected`. `aria-pressed` flips. |
| Selectable card inside `KjCardGroup[role="listbox"]` | `Tab` | Enters the group at the active descendant (or first card). Subsequent `Tab` exits. |
| | `Arrow` keys | Move active index between cards. Axis driven by `kjCardGroupOrientation` (`'horizontal' \| 'vertical' \| 'both'`); for grid layouts use `'both'` (Up/Down move rows, Left/Right move columns). |
| | `Home` / `End` | First / last card. |
| | `Space` | Toggles selection on the focused card (multi) or selects (single). |
| | `Ctrl/Cmd+A` | Select all (multi only). |

### Focus management

- **Whole-card link / button**: ring on the card surface via
  `KjFocusRing`. The components-package CSS reads
  `[data-focus-visible]` and paints the ring on `:host`.
- **Linked title with hit extension**: ring on the `<a>` inside the
  title (`KjLink` already composes `KjFocusRing`). The card surface
  does not visually move; only the title text is outlined. This is
  the conservative choice — if consumers prefer the whole-card lift
  on focus, they wrap the title's focus state through a CSS sibling
  selector, which we document in the example.
- **After remove (selectable in a group)**: same machinery as
  `KjTagList.focusNextAfterRemoval` — focus moves to the next card,
  else previous, else group container.

### Heading hierarchy

The heading level inside `<kj-card-title>` is the consumer's call
because only the consumer knows the document outline. **Today** the
title is hard-locked to `<h3>`, which is wrong for cards inside an
already-nested context (a section under an `<h2>`, where the card
should be `<h3>`; or a tile in a sub-section under `<h3>`, where the
card should be `<h4>`).

**Plan.** Add `kjCardTitleLevel: 1 | 2 | 3 | 4 | 5 | 6 | 'div'`
input. Default `3` (matching today). When set to `'div'` the wrapper
renders a `<div>` and the consumer is responsible for outline
semantics elsewhere (rare, but needed for cards inside a tabular
view where the heading is on the column header, not the row).

### Reduced motion

Card animates only on hover (subtle elevation lift) and focus (ring
fade-in). Both are CSS transitions — already gateable by
`@media (prefers-reduced-motion: reduce)`. Today the CSS does not
gate; minor v1 fix.

## Composition model

```
@kouji-ui/core/card/                       (NEW PACKAGE)
  card-interactive.ts          ← KjCardInteractive (root for clickable / selectable)
  card-interactive-title.ts    ← KjCardInteractiveTitle (linked-title hit-extension wiring)
  card-group.ts                ← KjCardGroup (optional group coordinator; scoped v1.x)
  card.context.ts              ← KjCardInteractiveContext, KJ_CARD_INTERACTIVE,
                                 KjCardGroupContext, KJ_CARD_GROUP
  card-interactive.spec.ts
  card-group.spec.ts
  index.ts

@kouji-ui/components/card/                 (existing — extend)
  card.ts                      ← seven existing components, plus:
                                   KjCardDescriptionComponent  (NEW)
                                   KjCardActionsComponent      (NEW)
  card.css                     ← extend for elevated variant + size tokens
  card.example.ts              ← existing
  card.full.example.ts         ← existing
  card.cover.example.ts        ← existing
  card.clickable.example.ts    ← NEW (whole-card link)
  card.linked-title.example.ts ← NEW (linked title + hit extension)
  card.selectable.example.ts   ← NEW (selectable card group)
  card.spec.ts                 ← extend coverage
  index.ts
```

### `KjCardInteractive` (`[kjCardInteractive]`)

```ts
@Directive({
  selector: '[kjCardInteractive]',
  providers: [{ provide: KJ_CARD_INTERACTIVE, useExisting: KjCardInteractive }],
  hostDirectives: [
    { directive: KjDisabled, inputs: ['kjDisabled: kjCardDisabled'] },
    KjFocusRing,
  ],
  host: {
    '[attr.role]': 'computedRole()',         // null | 'button' | 'option'
    '[attr.aria-pressed]': 'computedPressed()',
    '[attr.aria-selected]': 'computedSelected()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.tabindex]': 'computedTabindex()',
    '[attr.data-mode]': 'mode()',            // 'link' | 'button' (CSS hook only)
    '[attr.data-selected]': 'kjCardSelected() ? "" : null',
    '(click)': 'onClick($event)',
    '(keydown.space)': 'onActivate($event)',
    '(keydown.enter)': 'onActivate($event)',
  },
})
export class KjCardInteractive implements KjCardInteractiveContext {
  /** 'link' (host is `<a>`) or 'button' (host is `<button>` or `<div>`). */
  readonly kjCardInteractiveMode = input<'link' | 'button' | 'auto'>('auto');
  /** Toggle-button shape. */
  readonly kjCardSelectable = input(false);
  /** Two-way bindable selection state. */
  readonly kjCardSelected = model(false);
  /** Direct disabled passthrough — aliased through to KjDisabled. */
  // (handled via hostDirectives input alias above)
}
```

The `'auto'` default of `kjCardInteractiveMode` reads the host
element tag at construction time: `<a>` → `'link'`, `<button>` →
`'button'`, anything else → dev-mode warning + treat-as-button. The
explicit input is for cases where the wrapper renders one element
under the hood and the directive can't see the original (rare
inside the components-package wrapper, common for advanced
consumers).

The `computedRole()` chain:

```ts
computedRole = computed(() => {
  const group = this.group?.role();
  if (group === 'listbox') return 'option';
  if (group === 'grid')    return 'gridcell'; // for v1.x grid mode; see Open questions
  if (this.mode() === 'link') return null;     // <a> already has role="link"
  return null;                                 // <button> already has role="button"
});
```

Native semantics first; ARIA roles only when overriding (group
mode). This is the same pattern `KjTag` uses.

### `KjCardInteractiveTitle` (`[kjCardInteractiveTitle]`)

```ts
@Directive({
  selector: '[kjCardInteractiveTitle]',
  host: {
    '[attr.data-card-interactive-title]': '""',
  },
})
export class KjCardInteractiveTitle {
  // Marker directive. The card's CSS scopes a `::after` overlay to
  // [data-card-interactive-title] inside .kj-card so the whole-card
  // hit area extends out from the title's <a> without making the
  // card a button.
  //
  // No inputs. The directive's only job is to be a CSS scope target
  // and to validate (in dev mode) that there is exactly one
  // [kjCardInteractiveTitle] inside any card root that uses the
  // hit-extension pattern. Multiple titles → ambiguous hit target →
  // warn.
}
```

This is the `KjTagRemove` shape — a marker directive whose
existence is a contract. It does not own state; it is the
attachment point for the components-package CSS rule:

```css
.kj-card:has([data-card-interactive-title]) {
  position: relative;
}
.kj-card [data-card-interactive-title] a::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: auto;  /* but the link is the real focus target */
}
```

The CSS uses `:has()`, which constrains the supported browser
matrix to 2023+. See Open questions for fallback.

### `KjCardGroup` (`[kjCardGroup]`) — group coordinator

Scoped to v1.x. Optional, opt-in: standalone interactive cards work
without it. Mirrors `KjTagList` in shape.

```ts
@Directive({
  selector: '[kjCardGroup]',
  providers: [{ provide: KJ_CARD_GROUP, useExisting: KjCardGroup }],
  hostDirectives: [KjRovingTabindex],
  host: {
    '[attr.role]': 'kjCardGroupRole()',                  // 'listbox' | 'group' | 'grid'
    '[attr.aria-orientation]': 'kjCardGroupOrientation()',
    '[attr.aria-multiselectable]': 'multiSelectable()',
  },
})
```

| Input | Type | Default |
|---|---|---|
| `kjCardGroupRole` | `'listbox' \| 'grid' \| 'group'` | `'group'` |
| `kjCardGroupMultiple` | `boolean` | `false` |
| `kjCardGroupOrientation` | `'horizontal' \| 'vertical' \| 'both'` | `'both'` |
| `kjCardGroupWrap` | `boolean` | `true` |

When a `KjCardInteractive` lives inside a `KjCardGroup`, its
`computedRole()` resolves to `option` (listbox) or `gridcell`
(grid) — see above.

### Reused primitives

| Primitive | Where | Why |
|---|---|---|
| `KjVariant` | `hostDirectives` on `<kj-card>` (wrapper) | Standardise the variant token routing. **Gap today** — wrapper has its own union. The new preset list is `'outlined' \| 'elevated' \| 'filled' \| 'subtle' \| 'ghost'`. |
| `KjSize` | `hostDirectives` on `<kj-card>` (wrapper) | Standardise size token routing. **Gap today** — Card has no size axis. Presets: `'sm' \| 'md' \| 'lg'`. |
| `KjDisabled` | `hostDirectives` on `KjCardInteractive` | Standard ARIA-disabled (focusable, `aria-disabled="true"`, click suppression). |
| `KjFocusRing` | `hostDirectives` on `KjCardInteractive` | Shared focus-visible ring. |
| `KjRovingTabindex` | `hostDirectives` on `KjCardGroup` | Arrow-key navigation across registered cards. Same usage as `KjTagList`. |
| `KjFocusRestore` (planned, used by `KjDialog`) | inside selectable-card removal callbacks | When a card is removed from a group and was focused, restore focus to the previously focused element if no neighbour exists. |

`KjVariant`, `KjSize`, `KjFocusRing`, and `KjDisabled` are not
composed on `<kj-card>` directly today — they're all gaps the v1
work closes.

### Wrapper composition (components package)

`<kj-card>` is the existing wrapper. Plan:

- Compose `KjVariant` + `KjSize` via `hostDirectives`.
- Replace the local `variant: 'default' | 'outline' | 'subtle'`
  union with `kjVariant` aliased through `KjVariant`. Preset list
  expands per [Variants](#variants-and-appearance).
- Add `kjCardAs` input (string union) and conditionally render the
  appropriate host-element tag using a `@switch` over a
  one-element shadow template. Default `'div'`.
- Add `kjCardInteractive` boolean input → conditionally compose
  `KjCardInteractive` via `hostDirectives` (Angular's
  `hostDirectives` cannot be conditional, so the wrapper actually
  always composes it but `KjCardInteractive` is a no-op when its
  `mode()` resolves to `null`/standalone-static — same trick as
  `KjAccordion`'s arrow-nav handling).
- For the linked-title hit-extension pattern: the wrapper exposes
  no special input; consumers project a `<kj-link
  kjCardInteractiveTitle>` inside `<kj-card-title>` and the CSS
  picks it up via `:has()`.

```html
<!-- whole-card link -->
<kj-card kjVariant="outlined" kjCardInteractive href="/products/atlas">
  <kj-card-cover><img src="…" alt="" /></kj-card-cover>
  <kj-card-header>
    <kj-card-title kjCardTitleLevel="2">Project Atlas</kj-card-title>
    <kj-card-description>Planning tool for the platform team.</kj-card-description>
  </kj-card-header>
</kj-card>

<!-- linked title with hit extension -->
<kj-card kjVariant="elevated" kjCardAs="article">
  <kj-card-cover><img src="…" alt="" /></kj-card-cover>
  <kj-card-header>
    <kj-card-title kjCardTitleLevel="2">
      <kj-link kjCardInteractiveTitle href="/products/atlas">Project Atlas</kj-link>
    </kj-card-title>
    <kj-card-description>Planning tool for the platform team.</kj-card-description>
  </kj-card-header>
  <kj-card-content>…</kj-card-content>
  <kj-card-actions>
    <kj-button kjVariant="ghost">Star</kj-button>
    <kj-button>View</kj-button>
  </kj-card-actions>
</kj-card>

<!-- selectable card grid -->
<div kjCardGroup kjCardGroupRole="listbox" [kjCardGroupMultiple]="true">
  @for (plan of plans(); track plan.id) {
    <kj-card kjCardInteractive kjCardSelectable [(kjCardSelected)]="plan.selected">
      <kj-card-header>
        <kj-card-title>{{ plan.name }}</kj-card-title>
        <kj-card-description>{{ plan.summary }}</kj-card-description>
      </kj-card-header>
      <kj-card-content>{{ plan.price }}</kj-card-content>
    </kj-card>
  }
</div>
```

### Cross-component pointers

- [`avatar.md`](./avatar.md) — typical card-header content; the
  Avatar's "in a card header" example will cross-link here.
- [`badge.md`](./badge.md) — status / metadata chrome inside a card
  header or content area. No special integration; just composition.
- [`tag.md`](./tag.md) — interactive variant lives in `KjTag`; same
  decomposition rule applies (static stays in components,
  interactive earns a core directive). The selectable card pattern
  borrows directly from `KjTagList`'s group coordinator design —
  same context-injection shape, same roving tabindex composition,
  same focus-after-remove handling.
- [`../actions/button.md`](../actions/button.md) — typical footer
  action. `<kj-card-actions>` enforces the spacing tokens between
  projected `<kj-button>` instances.
- [`../navigation/`](../navigation/) — `<kj-link>` is the typical
  whole-card link or linked-title element. The
  `[kjCardInteractiveTitle]` marker directive is applied to a
  `<kj-link>` when the linked-title pattern is in play.
- [`../feedback/empty-state.md`](../feedback/empty-state.md)
  (planned) — when a card's body has no data, the empty-state
  primitive renders inside `<kj-card-content>`. No structural
  integration; just composition.
- [`../layout/list.md`](../layout/list.md) (planned) — for vertical
  feeds of cards. `kjCardAs="li"` makes the card a real list item
  inside a `<ul>` for proper outline semantics.
- [`../layout/card-grid.md`](../layout/card-grid.md) (planned) —
  the grid layout that hosts a `KjCardGroup` for selectable card
  scenarios.

## Inputs / Outputs / Models

All public bindings `kj`-prefixed. The wrapper layer's existing
**unprefixed** inputs (`variant`, `size`, `fit`, `padded`, `align`)
are **violations of the project naming rule** and must be migrated
in v1. See [Open questions](#open-questions--risks) for the
rename plan.

### `KjCardInteractive` (`[kjCardInteractive]`) — new core directive

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjCardInteractiveMode` | `input` | `'link' \| 'button' \| 'auto'` | `'auto'` | Resolves at construction from host tag when `'auto'`. |
| `kjCardSelectable` | `input` | `boolean` | `false` | Enables toggle-button semantics. Forces `mode='button'` when true (selectable links are not a thing). |
| `kjCardSelected` | `model` | `boolean` | `false` | Two-way bindable. Only meaningful when `kjCardSelectable`. |
| `kjCardDisabled` | `input` | `boolean` | `false` | Aliased through `KjDisabled` as `kjDisabled`. |
| `(kjCardActivate)` | `output` | `MouseEvent \| KeyboardEvent` | — | Fires on Enter / Space / click when not selectable. (Selectable cards rely on `kjCardSelectedChange` instead.) |

### `KjCardInteractiveTitle` (`[kjCardInteractiveTitle]`)

No public inputs. Marker directive.

### `KjCardGroup` (`[kjCardGroup]`)

| Name | Kind | Type | Default |
|---|---|---|---|
| `kjCardGroupRole` | `input` | `'listbox' \| 'grid' \| 'group'` | `'group'` |
| `kjCardGroupMultiple` | `input` | `boolean` | `false` |
| `kjCardGroupOrientation` | `input` | `'horizontal' \| 'vertical' \| 'both'` | `'both'` |
| `kjCardGroupWrap` | `input` | `boolean` | `true` |
| `kjCardGroupDisabled` | `input` | `boolean` | `false` |
| `(kjCardGroupSelectionChange)` | `output` | `ReadonlySet<unknown>` | — |

### Wrapper inputs (components package, `<kj-card>` and friends)

#### `<kj-card>`

| Input | Type | Default | Notes |
|---|---|---|---|
| `kjVariant` | preset string | `'filled'` | Forwarded via `KjVariant`. **Rename** from `variant`. |
| `kjSize` | preset string | `'md'` | Forwarded via `KjSize`. **New.** |
| `kjCardAs` | `'div' \| 'article' \| 'section' \| 'aside' \| 'li'` | `'div'` | **New.** Picks the host element. |
| `kjCardInteractive` | `boolean` | `false` | **New.** Composes `KjCardInteractive`. |
| `href` | `string \| undefined` | `undefined` | Wrapper-only; when present + `kjCardInteractive`, host element switches to `<a>` and `KjCardInteractive.kjCardInteractiveMode` resolves to `'link'`. |
| `kjCardSelectable` | `boolean` | `false` | Forwarded to `KjCardInteractive`. |
| `kjCardSelected` | `boolean` (two-way) | `false` | Forwarded to `KjCardInteractive`. |
| `kjCardDisabled` | `boolean` | `false` | Forwarded to `KjCardInteractive`. |
| `(kjCardActivate)` | event | — | Forwarded from `KjCardInteractive`. |

#### `<kj-card-cover>`

| Input | Type | Default | Notes |
|---|---|---|---|
| `kjCardCoverSize` | `'sm' \| 'md' \| 'lg'` | `'md'` | **Rename** from `size`. |
| `kjCardCoverFit` | `'cover' \| 'contain'` | `'cover'` | **Rename** from `fit`. |

#### `<kj-card-header>`

| Input | Type | Default | Notes |
|---|---|---|---|
| `kjCardHeaderActions` | `'inline' \| 'wrap' \| 'none'` | `'none'` | **New.** When `'inline'`, a top-right slot is laid out next to the title block. Consumer projects content into a named `[slot=actions]` ng-content selector. |

#### `<kj-card-title>`

| Input | Type | Default | Notes |
|---|---|---|---|
| `kjCardTitleLevel` | `1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 'div'` | `3` | **New.** Heading level. `'div'` for explicit opt-out. |

#### `<kj-card-subtitle>`

No new inputs. Renders `<p>`. Used inside `<kj-card-header>` for the
short tagline below the title.

#### `<kj-card-description>` — **new**

No inputs. Renders `<p class="kj-card-description">`. Used in the
body for the longer prose summary (the shadcn split). Distinct from
`<kj-card-subtitle>` by intent and typography.

#### `<kj-card-content>`

| Input | Type | Default | Notes |
|---|---|---|---|
| `kjCardContentInset` | `'default' \| 'flush'` | `'default'` | **Rename + repurpose** of `padded: boolean`. `'flush'` removes horizontal padding for media-flush content (full-bleed image inside the body). |

#### `<kj-card-actions>` — **new**

| Input | Type | Default | Notes |
|---|---|---|---|
| `kjCardActionsAlign` | `'start' \| 'center' \| 'end' \| 'between'` | `'end'` | Placement. |

#### `<kj-card-footer>`

| Input | Type | Default | Notes |
|---|---|---|---|
| `kjCardFooterAlign` | `'start' \| 'center' \| 'end' \| 'between'` | `'end'` | **Rename** from `align`. Consider renaming the component to `<kj-card-meta>` to disambiguate from `<kj-card-actions>` — see Open questions. |

## Examples to ship

Already on disk:

- `card.example.ts` — minimal default card, no sub-parts.
- `card.full.example.ts` — header / content / footer with two
  buttons, the canonical layout.
- `card.cover.example.ts` — cover image on top, full layout below.

**To add for v1:**

1. **All five variants** — `card.variants.example.ts`. Side-by-side
   `outlined`, `elevated`, `filled`, `subtle`, `ghost` so the
   `KjVariant` rename is visually anchored.
2. **All three sizes** — `card.sizes.example.ts`. `sm | md | lg`
   stacked to show the density delta.
3. **Whole-card link** — `card.clickable.example.ts`.
   `<kj-card kjCardInteractive href="/foo">…</kj-card>`. Demonstrates
   the wrapper picking `<a>` and the focus ring on the whole tile.
4. **Linked title with hit extension** —
   `card.linked-title.example.ts`. The
   recommended composition for content feeds. Includes a
   `<kj-button>` in the footer so the example proves
   nested-interactive doesn't arise (button is a real second target,
   linked title is the AT-visible primary target).
5. **Selectable card group** — `card.selectable.example.ts`. A
   plan-picker UI: three cards in a `<div kjCardGroup>` with
   `[kjCardGroupMultiple]="false"`. Demonstrates roving tabindex,
   `aria-selected`, `Space` toggle, focus order.
6. **Multi-select card grid** — `card.multi-select.example.ts`. Same
   shape as (5) but `[kjCardGroupMultiple]="true"`, with a
   "select all" button. Demonstrates `Ctrl+A`.
7. **Decorative cover with `alt=""`** —
   `card.decorative-cover.example.ts`. Anchors the alt-discipline
   docs.
8. **Article card with `kjCardAs="article"`** —
   `card.article.example.ts`. Blog-post-shaped card; demonstrates
   the native landmark and `kjCardTitleLevel="2"`.
9. **List of cards** — `card.list.example.ts`. `<ul>` of
   `<kj-card kjCardAs="li">` rendered as a feed; cross-references
   the planned List component.
10. **Card with header actions slot** —
    `card.header-actions.example.ts`. Demonstrates the new
    `kjCardHeaderActions="inline"` slot for the kebab-menu pattern.
11. **Disabled selectable card** —
    `card.disabled.example.ts`. Exercises `kjCardDisabled` +
    `aria-disabled` focusable behaviour.

## Open questions / risks

1. **Nested-interactive prevention — warn or refuse?** A clickable
   card with a `<button>` in its body is invalid HTML and broken
   AT. `KjCardInteractive` should detect this. Two options:
   **(a) dev-mode `console.warn`** when a focusable descendant is
   detected via a one-shot `MutationObserver` on the card's
   subtree. **(b) Hard refusal** — throw in dev mode, no-op in
   prod. (a) matches the project's existing patterns
   (`KjMenuItem`'s host-element warn) and gives consumers room to
   intentionally violate the rule when they know what they're
   doing (e.g. when the card-as-link wraps the card and the inner
   button intentionally `event.stopPropagation()`s — a real
   pattern in product cards with a "quick add to cart"). **Pick
   (a).** Document the override path: a focusable descendant must
   carry `data-card-interactive-stop-propagation` and listen on
   click capture; the warning suppresses when that attribute is
   present.

2. **Should `KjCardCover` become a core directive?** Today it is
   presentation-only. Promoting it would let it own:
   (a) `<img>` alt-attribute discipline (warn when absent in dev);
   (b) auto-`object-fit` with a background fallback for missing
   images; (c) an `kjCardCoverDecorative` flag that forces
   `alt=""` and `aria-hidden="true"` on the inner media.
   **Lean: yes, in v1.x.** Not blocking — the alt-discipline win
   is real but can ship as a dev-mode lint instead. The
   directive's other concerns (object-fit) are pure CSS.

3. **`<kj-card-footer>` vs. `<kj-card-actions>` — keep both, rename
   one, or merge?** Material splits them; shadcn merges. Keeping
   both reads more naturally (a "footer" can hold meta — author,
   date, view-count — while "actions" is a row of buttons), but
   adds API surface. **Recommendation:** ship both. Rename
   `<kj-card-footer>` to `<kj-card-meta>` to disambiguate; or
   keep both names and document the intent split. Pick **rename
   to `<kj-card-meta>`** — the word "footer" inside a card is
   ambiguous (footer of what? the page? the card?), and "meta"
   names the slot's purpose. Risk: breaking change to the
   already-shipped wrapper. Acceptable pre-1.0.

4. **`<kj-card-description>` vs. `<kj-card-subtitle>` — what's the
   difference?** Subtitle (existing) is short, header-adjacent,
   tagline-shaped ("Status: in progress"). Description (new) is
   prose, body-adjacent, sentence-shaped ("Atlas is the planning
   tool used by the platform team."). Both render `<p>` but with
   different typography (subtitle smaller / muted, description
   larger / regular). Risk: consumers conflate them. **Plan:**
   document the distinction in TSDoc with examples; verify the
   shadcn split lands well in real designs. If it doesn't, merge
   into one `<kj-card-text>` with a `kjCardTextRole` enum.

5. **`elevated` variant via shadow vs. via raised position.**
   Material's `appearance="raised"` uses a real `box-shadow`.
   Today our `subtle` variant uses a different background colour —
   functionally elevated but visually flat. Plan: ship a true
   shadow-driven `elevated` variant (`box-shadow:
   var(--kj-shadow-md)`). Risk: shadow tokens
   may not exist yet — verify in
   `packages/components/src/styles/`. If absent, define
   `--kj-shadow-sm/md/lg` as part of this work.

6. **`kjCardTitleLevel` and SSR.** Rendering `<h2>` vs. `<h3>`
   conditionally requires either a `@switch` over six template
   branches or a structural directive. The cleanest path is the
   `@switch`. Verify it doesn't break the `display: contents` host
   trick used today (it shouldn't — the host stays
   layout-transparent, only the rendered child element changes).

7. **`kjCardAs` and the `display: contents` host strategy.** When
   `kjCardAs="li"`, the wrapper renders an `<li>` inside a `<ul>`.
   The host `<kj-card>` element sits between the `<ul>` and the
   `<li>`, which **breaks `<ul>`'s child-only-`<li>` rule** unless
   the host has `display: contents`. Today the wrapper does not
   set `display: contents`. Plan: set `host: { style: 'display:
   contents' }` on `<kj-card>` (consistent with the title /
   subtitle today) and move the `kj-card` class + variant
   attributes to the rendered inner element. Risk: third-party
   CSS that targets `kj-card` directly (rare) breaks; the
   migration is single-line.

8. **`role="article"` vs. `<article>` element.** When the card is
   a content piece, `kjCardAs="article"` renders a real
   `<article>` element, which carries `role="article"` natively.
   Adding a separate `kjCardRole` input would let consumers force
   `role="article"` on a `<div>` host — but that fights the
   semantic-element-first rule. **Decision:** no
   `kjCardRole` input. Consumers who want article semantics use
   `kjCardAs="article"`. (Keeps the API smaller and steers them
   toward the right element.)

9. **`:has()` browser support for the `kj-card-actions` and
   linked-title selectors.** `:has()` lands in stable browsers in
   2023 (Chrome 105, Safari 15.4, Firefox 121). The current
   `card.css` already uses `:has()` for the
   no-sub-parts-padding fallback. Since the project is greenfield,
   the floor is fine. **Risk:** if the project later targets
   older browsers, the linked-title hit-extension and the
   no-sub-parts fallback both regress. Document the requirement
   in the README's browser-support section.

10. **Is the linked-title CSS overlay focus-snitchable?** The
    `::after` overlay is `pointer-events: auto` so the whole tile
    becomes clickable. The actual `<a>` is the focus target, so
    Tab still focuses the link, not the overlay. Verify with
    `axe-core`: a pseudo-element shouldn't appear in the
    accessibility tree at all (it doesn't), so this should be
    safe. Spec it explicitly.

11. **`KjCardInteractive` in `mode='auto'` and SSR.** The directive
    reads its host tag at construction. On the server, `inject(
    ElementRef).nativeElement` may not be a real DOM element
    (Angular's SSR uses Domino). Plan: use `nativeElement.tagName`
    if present (Domino supports it); fall back to `'button'`. Test
    SSR snapshots for both `<a>` and `<button>` hosts.

12. **Selection group state shape.** `KjCardGroup` could expose
    selection as `ReadonlySet<unknown>` (whatever the cards register
    with) or as a typed model. Standalone cards expose
    `kjCardSelected` as boolean per card. Plan: cards register
    themselves with the group via context; the group's
    `kjCardGroupSelectionChange` aggregates the selected cards'
    identifiers. Each card carries an `kjCardValue: input<unknown>`
    that the group uses as the registry key. Mirror what
    `KjAccordionItem.kjItemValue` does for items.

13. **Unprefixed inputs on existing wrappers.** The current
    components-package code violates the naming rule:
    `variant`, `size`, `fit`, `padded`, `align` are not prefixed.
    All of these need renaming for v1. Migration path: add the new
    prefixed names alongside the old ones; mark the old ones
    `@deprecated` in TSDoc; remove in v1.0. Risk: cosmetic but
    pervasive — touches every example file too.

14. **`<kj-card-content>` `padded: boolean` is a leaky abstraction.**
    "Padded yes/no" isn't expressive enough — consumers ask for
    "horizontal-only", "flush at the top", etc. Replacing with a
    `kjCardContentInset` enum (`'default' \| 'flush'`) covers the
    common case (full-bleed image inside content); add more values
    if real consumers demand them. Avoid `'compact'` (that's
    `kjSize="sm"` on the card, not a content-level concern).

15. **Disabled propagation from group to cards.** When a
    `<kj-card-group>` is disabled (e.g. inside a disabled form
    field), every card auto-disables. Mirror what
    `KjTagList.kjTagListDisabled` does. Consumer ergonomics win.

16. **`KjCardInteractive` with no parent group — selectable role
    fallback.** Standalone selectable card → `role="button"` +
    `aria-pressed` (toggle pattern). Inside a group → `role="option"`
    + `aria-selected`. Document the rule explicitly so
    consumers don't expect "selected" semantics from a standalone
    selectable card.

17. **Removing a card from a `KjCardGroup`.** The card-grid use
    case sometimes wants to dismiss a card (Pinterest pin
    dismissal). That mirrors `KjTag[kjTagRemove]` exactly. **Plan:**
    not in v1. If real consumers ask, add a `KjCardRemove`
    directive (button child) and reuse `KjGroupRemoval` once that
    primitive is extracted (see [`tag.md`](./tag.md) Q17 — same
    reuse opportunity).

18. **Naming: `KjCardInteractive` vs. shorter alternatives.** The
    directive is verbose but unambiguous. `KjCardClickable` is
    shorter but conflates click-to-navigate (link) with
    click-to-act (button). `KjCardAction` collides with the new
    `<kj-card-actions>` component name. **Pick
    `KjCardInteractive`.** Document that it is the directive name
    even though most consumers will only see the wrapper input
    `kjCardInteractive: boolean` (the directive composition is
    hidden behind the wrapper).

19. **Variant naming alignment with Badge / Tag.** Badge / Tag use
    semantic colour variants (`primary`, `secondary`, `success`,
    `warning`, `danger`, `info`). Card uses appearance variants
    (`outlined`, `elevated`, `filled`). These are **two different
    axes** — colour vs. shape. Plan: keep them separate. Card has
    no colour variant axis at v1 (cards are neutral surfaces);
    if/when consumers want a "danger" card (red border, red-tinted
    background — rare), add a separate `kjCardTone` input rather
    than overloading `kjVariant`.

20. **Documentation of the "do we even need a directive?" question.**
    This decision is the most likely future regret if not
    documented. Plan: capture it in the wrapper file's TSDoc
    (already partially there — extend with the interactive-vs-static
    split rationale) and in the docs site's Card page.

## Cross-component pointers (recap)

- [`avatar.md`](./avatar.md) — card-header avatar composition.
- [`badge.md`](./badge.md) — card-header / card-content badge.
- [`tag.md`](./tag.md) — same static-vs-interactive split rationale;
  the selectable-card group coordinator borrows directly from
  `KjTagList`.
- [`accordion.md`](./accordion.md) — when a card body needs to
  expand / collapse (settings card with progressive disclosure),
  embed a `<kj-collapsible>` inside `<kj-card-content>`.
- [`../actions/button.md`](../actions/button.md) — actions slot
  consumer.
- [`../navigation/`](../navigation/) — `<kj-link>` is the typical
  whole-card link / linked title.
- [`../feedback/empty-state.md`](../feedback/empty-state.md)
  (planned) — empty body content; rendered inside
  `<kj-card-content>`.
- [`../layout/list.md`](../layout/list.md) (planned) —
  `kjCardAs="li"` for vertical feeds.
- [`../layout/card-grid.md`](../layout/card-grid.md) (planned) —
  hosts `KjCardGroup` for selectable card scenarios.
