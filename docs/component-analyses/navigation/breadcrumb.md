# Breadcrumb

A **Breadcrumb** is a secondary navigation aid that shows the path
from the site root to the current page — `Home › Library › Data` —
giving the user a "you are here" cue and a one-click ladder back up
the hierarchy. It is the smallest *compound* navigation pattern in
the library: a `<nav aria-label="Breadcrumb">` wrapping an `<ol>`
of `<li>` cells, each cell containing a [`<a kjLink>`](./link.md)
except the last (the current page), which is plain text marked
`aria-current="page"`. Between cells sits a separator (`/`, `›`,
`→`, an icon — designer's choice). Long breadcrumb trails collapse
their middle cells into an ellipsis (`…`) that may either render as
plain truncation or as a [`KjDropdownMenu`](../actions/dropdown-menu.md)
showing the hidden cells.

The component is *primitive-shaped* — there is no state to manage,
no keyboard contract beyond the native `<a>` tab order, no overlay
to position (unless the ellipsis menu opens one) — but it is **not**
"just CSS". The contract worth shipping is the *semantic envelope*:
the `<nav>` landmark with the right label, the ordered list, the
`aria-current="page"` on the last crumb, the auto-inserted
separators marked `aria-hidden="true"` so AT does not read
`"Home slash Library slash Data"`, the right-to-left mirroring of
the chevron separator, and the truncation rule. A consumer who
hand-authors a breadcrumb gets one or two of these right; the full
set is the directive family's job.

> **Not on disk yet.** No `packages/core/src/breadcrumb/`, no
> `packages/components/src/breadcrumb/`. This analysis specifies
> the shape before any code lands. The recommendation is **yes,
> ship a thin directive family** — `KjBreadcrumb` (root) +
> `KjBreadcrumbList` (`<ol>`) + `KjBreadcrumbItem` (`<li>`) +
> `KjBreadcrumbLink` (composes [`KjLink`](./link.md)) +
> `KjBreadcrumbCurrent` (the last cell) + `KjBreadcrumbSeparator`
> (slot or auto) + `KjBreadcrumbEllipsis` (truncation overflow) —
> rather than a CSS recipe or a single monolithic
> `<kj-breadcrumb [model]>` data-driven component. The case for the
> family is in [Decision (core directive family)](#decision-core-directive-family).
> It is **not** a "useless `data-*` directive bundle" (per
> [`rules/code_style.md`](../../../rules/code_style.md) "What NOT
> to Build") because each directive owns a real semantic
> contract: `KjBreadcrumb` owns the `<nav>` landmark + label,
> `KjBreadcrumbList` enforces the `<ol>` requirement, the item
> family enforces "exactly one current crumb, last in document
> order", separators are auto-marked `aria-hidden`, and the
> ellipsis owns the truncation policy.

For the **per-crumb anchor**, see
[`./link.md`](./link.md) — the breadcrumb does not re-implement
underline policy, focus ring, external-link `rel` plumbing, or
disabled-link enforcement; it composes `KjLink`. The defaults are
muted variant + small size + hover underline, but every cell is a
`<a kjLink>` and every per-anchor input is forwarded.

For the **page-header context** in which a breadcrumb almost
always lives, see [`../data-display/card.md`](../data-display/card.md)
(the "page-header card" pattern places the breadcrumb above the
title) and [`../data-display/typography.md`](../data-display/typography.md)
(the breadcrumb sits inside the page header's typographic stack,
between the H1 and the eyebrow row).

For the **sibling navigation roles**, see
[`./tabs.md`](./tabs.md) (within-page navigation, `role="tablist"`,
*not* a breadcrumb's role even though both are "horizontal rows of
links"), [`./menu.md`](./menu.md) and
[`../actions/dropdown-menu.md`](../actions/dropdown-menu.md) (the
ellipsis-overflow truncation reuses `KjDropdownMenu`, not a fresh
overlay), and [`./pagination.md`](./pagination.md) (also a row of
links inside `<nav>`, but cardinality-based not hierarchy-based).

## Source comparison

The reference field is moderately split. PrimeNG ships a model-driven
`<p-breadcrumb>`. Material *omits* breadcrumb (ranked 11th in the
"missing components" tracker — there is a long-standing community
gap acknowledged in their issue tracker). shadcn/ui ships a fully
compound API (`Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`,
`BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator`,
`BreadcrumbEllipsis`) which is the closest reference for what we
are building. daisyUI ships only `.breadcrumbs` + `<ul>` styling.

| Concern | PrimeNG | Angular Material | shadcn/ui | daisyUI |
|---|---|---|---|---|
| First-class component | **Yes** — `<p-breadcrumb>` (https://primeng.org/breadcrumb), single component, model-driven via `[model]: MenuItem[]` plus `[home]: MenuItem`. | **No** — there is no `MatBreadcrumb`. Material's docs ship a "breadcrumb recipe" CSS-only example and refer consumers to an external community library (`xng-breadcrumb`) for routed wiring. The omission has been on the Material backlog since 2017 (issue #6232 and follow-ups). | **Yes** — compound (`Breadcrumb` + `BreadcrumbList` + `BreadcrumbItem` + `BreadcrumbLink` + `BreadcrumbPage` + `BreadcrumbSeparator` + `BreadcrumbEllipsis`). | **CSS only** — `.breadcrumbs` class on a wrapper `<div>` containing a `<ul>` of `<li>` cells. No JS, no a11y plumbing, no truncation, no current-cell semantics. |
| Selector / surface | `<p-breadcrumb [model]="items" [home]="home">` — single tag. | n/a (CSS recipe), or `<xng-breadcrumb>` from the community library. | `<Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink href="…">…</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator/>…<BreadcrumbItem><BreadcrumbPage>Current</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>` | `<div class="breadcrumbs"><ul><li><a>Home</a></li><li>…</li></ul></div>` |
| Container semantics | `<nav class="p-breadcrumb">` — yes, the `<nav>` landmark is rendered. `aria-label` is consumer-supplied via `[ariaLabel]`; defaults to `'Breadcrumb'`. | n/a | `<nav aria-label="breadcrumb">` rendered by `Breadcrumb`. | `<div>` — **not** a `<nav>` landmark. AT does not announce it as a breadcrumb. Failure to meet [WAI-ARIA APG: Breadcrumb](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/). |
| List semantics | `<ul>` (unordered list) — APG specifies `<ol>` (ordered) since hierarchy implies order. PrimeNG's choice is non-canonical. | n/a | `<ol>` — correct per APG. | `<ul>` — non-canonical. |
| Current crumb | Last item in the model is rendered as a `<span>` (not `<a>`). PrimeNG sets `aria-current="page"` on the last `<li>`. The placement on the `<li>` rather than the inner element is non-canonical (APG examples place it on the link/text directly). | n/a | `BreadcrumbPage` — `<span role="link" aria-disabled="true" aria-current="page">`. The `role="link"` here is unnecessary (and arguably misleading) but does not break AT. | The consumer marks the current cell however they like; daisyUI does not prescribe. No automatic `aria-current`. |
| Separator | A single global separator passed via `[separator]` template (or defaults to `›`). Rendered between items, marked `aria-hidden="true"`. | n/a | `BreadcrumbSeparator` is a slot — defaults to a chevron SVG, consumer-replaceable. Marked `aria-hidden="true"` and `role="presentation"`. | A global CSS `::before` content on each `<li>:not(:first-child)` — `content: "/"` by default, customisable via `--bc-content` CSS var. Marked `aria-hidden` because pseudo-elements are not in the AT tree. |
| Truncation / collapse | None — long breadcrumbs wrap or overflow horizontally. | n/a | `BreadcrumbEllipsis` — manual; the consumer chooses which middle items to hide and replaces them with `<BreadcrumbEllipsis />`, which renders `<span role="presentation" aria-hidden="true">…</span>`. shadcn does **not** auto-collapse — that is consumer logic. | None. |
| Overflow menu | None. | n/a | Pattern documented but not built-in: wrap a `BreadcrumbEllipsis` inside a `DropdownMenu` to expose hidden crumbs. | None. |
| Routing | Each `MenuItem` may have a `routerLink` property; PrimeNG's renderer wires it to Angular Router. | n/a | Each `<BreadcrumbLink>` is a normal `<a href>` — consumer wires the routing library. | n/a |
| Keyboard | Native `<a>` tab order. No custom keyboard contract. | n/a | Native `<a>` tab order; ellipsis menu has its own (DropdownMenu's). | Native. |
| A11y | `<nav>` + `aria-label` + `aria-current="page"` on last `<li>`. Separators `aria-hidden`. Adequate; the `<ul>` instead of `<ol>` is the only criticism. | n/a | `<nav>` + `aria-label="breadcrumb"` + `<ol>` + `aria-current="page"` on the current page span. APG-compliant. | None — the visual is correct, the semantics are not. |

**Read-off.**

- **shadcn/ui is the canonical compound reference.** Their split
  (root / list / item / link / page / separator / ellipsis) is the
  same split kouji adopts. The differences are in implementation
  (`KjBreadcrumbLink` composes `KjLink` rather than re-styling an
  `<a>`; the separator is auto-inserted by default rather than
  consumer-rendered; truncation has a built-in `kjMaxItems` policy
  rather than being wholly consumer logic).
- **PrimeNG is the model-driven counter-reference.** Their single
  `<p-breadcrumb [model]="items">` API is ergonomic for static
  models but loses every per-crumb composition site. A consumer
  who wants a tooltip on a breadcrumb cell, a custom icon next to
  one crumb, or an external-link affordance on a crumb that links
  off-domain has to drop the model API and reach for a
  `[separator]`/`[itemTemplate]` template. The compound API has
  no such cliff: any per-crumb decoration is just "more children
  inside the `<li>`".
- **Material's omission is a textbook gap.** Long-running issue
  on the tracker; the recommended workaround is "use a community
  library or write the CSS recipe yourself" — exactly the gap kouji
  fills.
- **daisyUI ships the visual but not the semantics.** The most
  common authoring pattern in their docs uses `<ul>` and a `<div>`
  wrapper, both wrong for AT. We *do* copy daisyUI's separator
  story (CSS pseudo-element with a CSS-variable for the content,
  marked `aria-hidden` by virtue of being a pseudo-element) — but
  on `<ol>` and inside `<nav aria-label="Breadcrumb">`.

The split kouji is converging on:

| Surface | Selector | Job |
|---|---|---|
| **Core root directive** | `[kjBreadcrumb]` (binds `<nav>`) | Owns the landmark — sets `role` (implicit on `<nav>`) and the `aria-label`. Provides the breadcrumb context token so descendants can register themselves and the last item can be auto-marked current. |
| **Core list directive** | `[kjBreadcrumbList]` (binds `<ol>`) | Enforces ordered-list semantics. Sets the layout primitive (flex row, gap, wrap policy). Consumes the breadcrumb context's `kjMaxItems` to compute which items render visibly vs. inside the ellipsis overflow. |
| **Core item directive** | `[kjBreadcrumbItem]` (binds `<li>`) | Tiny — registers itself with the list (so the list knows item ordinality) and exposes a `kjCurrent` signal derived from "am I last + no following non-current items?". |
| **Core link directive** | `[kjBreadcrumbLink]` (binds `<a>`) | Composes `KjLink` with breadcrumb-tuned defaults (`muted` variant, `sm` size, `hover` underline). Forwards every `KjLink` input. Consumes context to know whether it sits inside the current item (in which case dev-mode warns: a current item should be `KjBreadcrumbCurrent`, not `KjBreadcrumbLink`). |
| **Core current directive** | `[kjBreadcrumbCurrent]` (binds `<span>`) | The last crumb. Owns `aria-current="page"`. Styled like a muted link without underline. Refuses to render `<a>` semantics — the element is text. |
| **Core separator directive** | `[kjBreadcrumbSeparator]` (binds `<span>` or `<svg>`) | Optional. Marked `aria-hidden="true"`. Only used when the consumer opts out of auto-separators (see [Auto separator policy](#auto-separator-policy)). |
| **Core ellipsis directive** | `[kjBreadcrumbEllipsis]` (binds `<button>` or `<span>`) | The truncation cell. Default visual: `…` glyph. May open an overflow menu (`KjDropdownMenu`) listing the collapsed crumbs. |
| **Wrapper component** | `<kj-breadcrumb>`, `<kj-breadcrumb-list>`, `<kj-breadcrumb-item>`, `<kj-breadcrumb-link>`, `<kj-breadcrumb-current>`, `<kj-breadcrumb-separator>`, `<kj-breadcrumb-ellipsis>` | Re-expose every input from the directive layer, render the correct host element, project content through `<ng-content>`. Pure ergonomic sugar — the directive surface is the canonical API. |
| **CSS layer** | `.kj-breadcrumb`, `.kj-breadcrumb-list`, `.kj-breadcrumb-item`, `.kj-breadcrumb-current`, `.kj-breadcrumb-separator`, `.kj-breadcrumb-ellipsis` | Lives in `packages/components/src/breadcrumb/breadcrumb.css`. Reads from `--kj-breadcrumb-separator-content`, `--kj-breadcrumb-gap`, `--kj-color-breadcrumb-muted` (which falls through to `--kj-color-link` from Link). |

Three consumer paths, one styling system. The compound directive
shape is the same as Card and Accordion; the per-crumb anchor
*composes* `KjLink` exactly the way Card's linked title does (see
[`../data-display/card.md`](../data-display/card.md) §192–200).

## Decision (core directive family)

**Yes — but lightweight.** The brief flagged this as the question:
"does it need a core directive?" Lightweight HTML *can* render a
correct breadcrumb. But the directive family earns its keep on
seven concrete behaviours, each of which a CSS-only solution cannot
deliver:

1. **Landmark + label enforcement.** A breadcrumb is a `<nav>`
   landmark per [WAI-ARIA APG: Breadcrumb](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/);
   the `aria-label` distinguishes it from other `<nav>` regions on
   the page (primary nav, footer nav, in-page tabs nav). A
   consumer-authored breadcrumb gets the `<nav>` part right roughly
   half the time and the `aria-label` part right roughly *never*.
   The directive sets the role implicitly (via host element) and
   sets `aria-label="Breadcrumb"` by default with a `kjAriaLabel`
   override.

2. **`<ol>` requirement.** A breadcrumb's order is meaningful —
   `Home › Library › Data` is not the same as
   `Data › Library › Home`. The list element must be `<ol>`. A
   `[kjBreadcrumbList]` selector that *only* binds `ol[kjBreadcrumbList]`
   (Angular selector restriction) makes "use the right element"
   structurally enforced rather than hopefully documented. Same
   pattern as `KjAccordionItem` requiring a `<details>`-or-`<div>`
   host (see [`../data-display/accordion.md`](../data-display/accordion.md)).

3. **Auto-`aria-current="page"` on the last crumb.** The directive
   walks its registered items and marks the last one current
   (unless the consumer has explicitly placed `KjBreadcrumbCurrent`
   somewhere — in which case the consumer's choice wins). This
   removes the "I copied a breadcrumb template and forgot to update
   the `aria-current`" failure mode. See
   [Open question 1](#open-questions--risks) for the resolution
   between auto-detect and explicit `KjBreadcrumbCurrent`.

4. **Separator insertion + `aria-hidden` discipline.** Default
   render: a CSS pseudo-element on each non-first `<li>`, content
   driven by `--kj-breadcrumb-separator-content`, marked
   `aria-hidden` by virtue of being a pseudo-element. Opt-out: the
   consumer renders `<kj-breadcrumb-separator>` cells explicitly
   between items (this is the path for icon-based separators, where
   a CSS pseudo-element cannot carry an SVG with semantically
   correct fill / stroke / size). See
   [Auto separator policy](#auto-separator-policy).

5. **RTL mirroring of chevron separators.** A `›` separator visually
   becomes `‹` in right-to-left scripts (Arabic, Hebrew, Persian).
   The CSS layer applies `transform: scaleX(-1)` to the separator
   pseudo-element under `[dir="rtl"]`. A `/` separator does not
   mirror; a `→` separator does. The CSS layer ships per-glyph
   logic. A consumer who hand-authors will not.

6. **Truncation with `kjMaxItems`.** When the crumb count exceeds
   `kjMaxItems` (default `4`, configurable via
   `KJ_BREADCRUMB_CONFIG`), the list collapses the middle crumbs
   into `<kj-breadcrumb-ellipsis>` — keeping the first crumb (root,
   "Home") and the last `kjMaxItems - 2` crumbs visible (so for
   `kjMaxItems = 4` and a path of `Home › A › B › C › D › Current`,
   the rendered list is `Home › … › C › D › Current` with the
   ellipsis substituting for `A › B`). The directive owns the
   computation. The ellipsis cell may be plain (truncation only)
   or open a [`KjDropdownMenu`](../actions/dropdown-menu.md) with
   the hidden crumbs as menu items. See
   [Truncation policy](#truncation-policy).

7. **Per-crumb anchor composition.** Every crumb but the last is
   `<a kjBreadcrumbLink>`, which composes `KjLink` so the consumer
   gets external-link `rel` plumbing, focus-ring composition, and
   disabled-link enforcement *for free* on every crumb. A
   consumer-authored breadcrumb without the directive does not
   inherit any of these — they would have to type `<a kjLink
   kjVariant="muted" kjSize="sm">` per crumb, and then the
   directive's job is to *not* require all that typing.

The directive family is **small** — under 200 lines of TypeScript
total across the seven directives. None of them holds significant
state: the root provides a context token; the list reads
`kjMaxItems` and emits a computed list of "visible item indices" +
"hidden item indices"; the item registers its ordinal and computes
`kjCurrent`; the link is a thin host-directive composition over
`KjLink`; the current is a host-binding shell; the separator is
host-binding only; the ellipsis is the same with a `kjOverflowMenu`
input pointing at a `KjDropdownMenu`. It is **not** a "useless
data-attribute directive bundle" because the seven behaviours above
are real, error-prone work the consumer would otherwise hand-author
on every breadcrumb in the app.

### Why not just CSS?

A CSS-only `.kj-breadcrumb` recipe (parallel to daisyUI's) was
considered. Rejected because:

- **Landmark + label cannot be set from CSS.** `<nav>` and
  `aria-label` are HTML attributes. A CSS-only API would either
  require the consumer to author them (the daisyUI failure mode)
  or render the wrong element (a `<div>` styled to look like a
  nav, invisible to AT).
- **Auto-current detection requires DOM walking.** CSS can style
  the *last child* differently, but cannot set
  `aria-current="page"` on it — pseudo-classes do not write
  attributes. The directive owns this.
- **Truncation requires conditional rendering.** Computing "show
  the first crumb, hide the middle four, show the last three, show
  an ellipsis cell in between" is logic, not styling. CSS
  `display: none` on `:nth-child(n+3):nth-last-child(n+3)` *can*
  hide middle children, but cannot insert an ellipsis cell, cannot
  open a menu of hidden cells, and cannot adapt to the actual crumb
  count without bespoke `:nth-child` rules per crumb count.
- **Per-crumb `KjLink` composition requires the directive.** A CSS
  recipe leaves the consumer to apply `<a kjLink>` on every crumb;
  forgetting one means an unstyled, un-focusable, un-`rel`-secured
  anchor. The directive applies `KjLink` automatically per
  registered link.

Each one is a hard requirement, not a nicety. The directive family
wins.

### Why not a single monolithic `<kj-breadcrumb [model]>` component?

The PrimeNG model-driven shape was considered. Rejected because:

- **Per-crumb decorations need slots.** A `<kj-breadcrumb-link>`
  may host an icon, a tooltip, an external-link affordance, a
  router context query-param. With a `[model]: BreadcrumbItem[]`
  API, every per-crumb decoration becomes either a model field
  (`{ icon: '…', tooltip: '…', external: true, … }`) or a template
  escape (`[itemTemplate]`). The compound API does not need either:
  a `<kj-breadcrumb-link kjTooltip="…" [kjExternal]="true">` is
  just normal Angular composition.
- **Dynamic crumbs are a routing concern.** The
  `xng-breadcrumb`-style "auto-build the breadcrumb from the route
  tree" pattern is valuable but **not** Breadcrumb's job. It is a
  routing helper that produces a `BreadcrumbItem[]`-shaped signal
  which the consumer renders inside `<kj-breadcrumb>`. The compound
  API plus a `@for` is sufficient: see [Examples to ship](#examples-to-ship)
  example 8.
- **The compound API matches `KjAccordion`, `KjTabs`, `KjMenu`,
  `KjList`, `KjCard`.** Every other navigation / data-display
  component in kouji uses compound directives. Shipping
  `<p-breadcrumb [model]>` here would be the only inconsistency.

### Why not just compose `KjLink` and stop there?

Discussed in passing in the brief. Rejected because:

- **The container semantics are not Link's job.** `KjLink` does
  not know about `<nav>`, `aria-label`, `<ol>`, or
  `aria-current="page"`. Pushing those into `KjLink` would bloat
  Link with breadcrumb-specific concerns.
- **The truncation policy is not Link's job.** Link does not know
  about overflow.
- **The current cell is not a Link.** It is a `<span>`. A
  `KjLink`-only design has nothing to say about the current cell.

We ship **the directive family** + **wrapper components** + **CSS
layer**, matching Accordion's "directive-per-piece + wrapper-per-piece +
CSS-per-piece" pattern. The directive family is the canonical
surface; the wrappers are ergonomic sugar.

### Class naming

Per [`CLAUDE.md`](../../../CLAUDE.md), drop the Angular type suffix
unless there's a collision. The seven directives are `KjBreadcrumb`,
`KjBreadcrumbList`, `KjBreadcrumbItem`, `KjBreadcrumbLink`,
`KjBreadcrumbCurrent`, `KjBreadcrumbSeparator`,
`KjBreadcrumbEllipsis` (files: `breadcrumb.ts`, `breadcrumb-list.ts`,
`breadcrumb-item.ts`, `breadcrumb-link.ts`, `breadcrumb-current.ts`,
`breadcrumb-separator.ts`, `breadcrumb-ellipsis.ts`). The wrappers
share the same base names with `Component` suffix
(`KjBreadcrumbComponent`, `KjBreadcrumbListComponent`, …) — the
collision pattern Card and Accordion use. The context interface +
token live in `breadcrumb.context.ts` per
[`rules/architecture.md`](../../../rules/architecture.md) "One
Directive Per File". Configuration is `KJ_BREADCRUMB_CONFIG` /
`KJ_BREADCRUMB_DEFAULTS` / `provideKjBreadcrumb()`.

## Auto separator policy

**Decision: auto-insert by default, with an opt-out for the icon
case.**

Two routes were on the table:

1. **Auto-insert via CSS pseudo-element.** Each non-first
   `<li[kjBreadcrumbItem]>` gets a `::before` pseudo-element with
   `content: var(--kj-breadcrumb-separator-content, '/')`. Marked
   `aria-hidden` by virtue of being CSS content. RTL mirroring is
   handled in CSS for chevron-like glyphs. The consumer changes
   the separator by setting the CSS variable
   (`<ol kjBreadcrumbList style="--kj-breadcrumb-separator-content: '›'">`)
   or, app-globally, in their theme.

2. **Require the consumer to render `<kj-breadcrumb-separator>`
   between items.** Every breadcrumb authoring site renders
   `Item / Sep / Item / Sep / Item`, with the separator as an
   element rather than a pseudo-element. This is shadcn's pattern.

**Trade-off.** Pseudo-elements are zero-friction (consumer writes
nothing extra) but cannot carry an SVG icon with proper `width` /
`height` / `currentColor` `stroke` (CSS `content: url("…")`
*can* render an SVG, but cannot recolour it via `currentColor`
because the SVG is rendered as an image, not as inlined SVG; the
result is "the separator is fixed-coloured", which is wrong for
themes). Element-based separators are typing overhead but support
arbitrary SVG slots.

**Resolution: ship both, default to pseudo-element.** When
`kjSeparator` is set on the root (`<nav kjBreadcrumb kjSeparator="›">`)
or a CSS variable is set, the CSS pseudo-element renders that
content. When the consumer renders `<kj-breadcrumb-separator>`
elements between items, the CSS layer detects the explicit
elements via attribute selector and *suppresses* the
pseudo-element on adjacent items
(`ol[data-explicit-separators] > li:not(:first-child)::before { content: none; }`).
Detection is a host binding on the list directive: when the list
sees any `KjBreadcrumbSeparator` registered with its context, it
sets `data-explicit-separators=""` on its host. Implementation is
an `effect()` that watches the registered-separators signal in the
list context.

This matches the "consumer-friendly default + explicit escape
hatch" pattern Card uses for its avatar / interactive variants
(see [card.md](../data-display/card.md)).

The consumer paths:

```html
<!-- Auto separator (default, '/' content) -->
<nav kjBreadcrumb>
  <ol kjBreadcrumbList>
    <li kjBreadcrumbItem><a kjBreadcrumbLink href="/">Home</a></li>
    <li kjBreadcrumbItem><a kjBreadcrumbLink href="/library">Library</a></li>
    <li kjBreadcrumbItem><span kjBreadcrumbCurrent>Data</span></li>
  </ol>
</nav>

<!-- Auto separator with custom glyph -->
<nav kjBreadcrumb kjSeparator="›"> ... </nav>

<!-- Explicit separator (icon case) -->
<nav kjBreadcrumb>
  <ol kjBreadcrumbList>
    <li kjBreadcrumbItem><a kjBreadcrumbLink href="/">Home</a></li>
    <li kjBreadcrumbSeparator><svg>…chevron…</svg></li>
    <li kjBreadcrumbItem><a kjBreadcrumbLink href="/library">Library</a></li>
    <li kjBreadcrumbSeparator><svg>…chevron…</svg></li>
    <li kjBreadcrumbItem><span kjBreadcrumbCurrent>Data</span></li>
  </ol>
</nav>
```

The explicit-separator path uses `<li kjBreadcrumbSeparator>`
rather than `<span>` so the list semantics stay clean (every child
of `<ol>` must be `<li>`); the directive sets `role="presentation"`
and `aria-hidden="true"` on the host so AT does not announce the
separator as a list item.

## Truncation policy

**Decision: ship `kjMaxItems` with a default of `4` and three
overflow modes (`truncate` / `menu` / `none`).**

Long breadcrumb trails (deep wikis, file-tree navigation, faceted
search refinement) are common; cramming twelve crumbs onto a single
line is unreadable. shadcn's pattern (manual `BreadcrumbEllipsis`
placement) is fine for static three-or-four-level menus and unwieldy
for dynamic navigation. PrimeNG ships nothing.

`KJ_BREADCRUMB_DEFAULTS.maxItems = 4`. When the registered item
count exceeds `kjMaxItems`, the list collapses middle items per:

- **First crumb stays visible** (almost always "Home" — the user's
  primary escape hatch up the hierarchy).
- **Last `kjMaxItems - 2` crumbs stay visible**, ensuring the
  current crumb and its immediate parents are reachable.
- **Middle crumbs collapse** into a `<kj-breadcrumb-ellipsis>` cell
  inserted at position 1 (between first and the visible tail).

For `kjMaxItems = 4` and a path of length 6:
`Home › A › B › C › D › Current` →
`Home › … › C › D › Current` (the ellipsis covers `A`, `B`).

For `kjMaxItems = 4` and a path of length 4:
`Home › A › B › Current` (no truncation — count not exceeded).

For `kjMaxItems = 4` and a path of length 3:
`Home › A › Current` (no truncation).

For `kjMaxItems = 0` or `kjMaxItems = Infinity`: never truncate.

Three overflow modes via `kjOverflow` on the root:

| Mode | Behaviour |
|---|---|
| `'truncate'` (default) | The ellipsis cell renders as plain `<span>…</span>` with `aria-hidden="true"` on the cell. **The hidden crumbs are not reachable.** Suitable when the hidden crumbs are inferable from context (a file path where the parent folders are visually obvious from the visible crumbs). The accessible name on the breadcrumb's `<nav>` includes a count: `aria-label="Breadcrumb (2 items hidden)"` so AT users learn the truncation occurred. |
| `'menu'` | The ellipsis cell renders as `<button kjBreadcrumbEllipsis>` with `aria-haspopup="true"` `aria-expanded` toggling, opening a [`KjDropdownMenu`](../actions/dropdown-menu.md) listing the hidden crumbs as menu items. Each hidden crumb becomes a menu item linking to its `href`. The button's accessible name is `"Show 2 hidden breadcrumbs"`. **Hidden crumbs are reachable** via the menu — the AAA-friendlier choice. |
| `'none'` | The directive does not collapse — all crumbs render. The CSS layer applies `flex-wrap: wrap` so the row breaks across multiple lines. Suitable for unconstrained widths or print stylesheets. |

The default is `'truncate'` (matches shadcn / industry default).
The recommendation in documentation is `'menu'` for any breadcrumb
that may grow beyond `kjMaxItems` programmatically — the AAA-best
choice. See [Open question 4](#open-questions--risks) for whether
to default to `'menu'` instead.

## What exists today

Nothing on disk. No `packages/core/src/breadcrumb/`, no
`packages/components/src/breadcrumb/`. The library's existing CSS
does not declare `--kj-breadcrumb-*` tokens; those need to be added
to the theme layer alongside the directive's first PR. The
`--kj-color-link` and `--kj-color-link-hover` tokens that the
breadcrumb's link cells will consume are scheduled in
[`./link.md`](./link.md)'s expected build order (item 1).

The expected build order:

1. Land [Link](./link.md) first — Breadcrumb's link cell composes
   `KjLink`, so Link must exist. Track in
   [link.md §What exists today](./link.md).
2. Add `--kj-breadcrumb-separator-content`,
   `--kj-breadcrumb-gap`, `--kj-breadcrumb-overflow-pad`,
   `--kj-color-breadcrumb-muted` (falls through to
   `--kj-color-link` by default), `--kj-color-breadcrumb-current`
   (falls through to `--kj-color-base-content`) to the theme layer.
3. Ship the seven core directives in
   `packages/core/src/breadcrumb/`, plus `breadcrumb.context.ts`
   and `provideKjBreadcrumb` per the bind-presets pattern.
4. Ship the seven wrapper components + CSS layer in
   `packages/components/src/breadcrumb/`.
5. Cross-link to Link (per-crumb composition) and to
   [`KjDropdownMenu`](../actions/dropdown-menu.md) (overflow menu
   when `kjOverflow="menu"`).

## Base features

| Feature | Where it lives | Notes |
|---|---|---|
| `<nav>` landmark | `KjBreadcrumb` selector restriction (`nav[kjBreadcrumb]`) | The directive only matches `<nav>` hosts; an Angular dev-mode error fires if the consumer attaches `kjBreadcrumb` to a `<div>` (selector won't match). The `<kj-breadcrumb>` wrapper renders a `<nav>` host. |
| `aria-label` | `KjBreadcrumb` host binding | `[attr.aria-label]="kjAriaLabel()"`. Default `'Breadcrumb'`. Configurable via `KJ_BREADCRUMB_CONFIG.defaults.ariaLabel` (for i18n — see [Open question 9](#open-questions--risks)). |
| `<ol>` semantic enforcement | `KjBreadcrumbList` selector restriction (`ol[kjBreadcrumbList]`) | The directive only matches `<ol>` hosts; a `<ul>` does not match. |
| Item registration + ordering | `KjBreadcrumbItem` registers with `KjBreadcrumb` context | The root holds an array signal of registered items. Items add themselves on `ngOnInit` and remove on `ngOnDestroy`. The list reads the array to compute visible vs. truncated indices. |
| Auto-current marking | Computed in `KjBreadcrumbItem` | Each item has a `kjCurrent` computed signal: `true` when the item is the last registered item *and* no explicit `KjBreadcrumbCurrent` is registered elsewhere. When `kjCurrent()` is `true`, the item's host gets `[attr.aria-current]="'page'"` reflected. **Override**: a consumer can render `<span kjBreadcrumbCurrent>` inside any item to opt out of auto-detection (see [Open question 1](#open-questions--risks)). |
| Per-crumb link | `KjBreadcrumbLink` composes `KjLink` via `hostDirectives` | Inputs forwarded: `kjVariant`, `kjSize`, `kjUnderline`, `kjExternal`, `kjDisabled`. Defaults via `KJ_BREADCRUMB_CONFIG.defaults.linkVariant = 'muted'`, `linkSize = 'sm'`, `linkUnderline = 'hover'`. |
| Current crumb (terminal) | `KjBreadcrumbCurrent` host binding | `[attr.aria-current]="'page'"`, `[attr.tabindex]="null"` (not focusable — it's text). The consumer's content (text or template) projects through. |
| Auto separator | CSS pseudo-element on `[kjBreadcrumbList] > [kjBreadcrumbItem]:not(:first-child)::before` | Content from `var(--kj-breadcrumb-separator-content, '/')`. Suppressed when `data-explicit-separators=""` is on the list host. Marked `aria-hidden` by virtue of being a pseudo-element. |
| Explicit separator | `KjBreadcrumbSeparator` host bindings | `role="presentation"`, `aria-hidden="true"`. Sets `data-explicit-separators=""` on the parent list (via context registration) so the auto pseudo-element is suppressed. |
| Truncation policy | `KjBreadcrumb` + `KjBreadcrumbList` shared computed | `kjMaxItems` input on `KjBreadcrumb` (default `4`); list computes `visibleIndices` and `hiddenIndices` from the registered items array; items not in `visibleIndices` are `display: none` via host binding `[attr.data-hidden]=""`; ellipsis cell renders only when `hiddenIndices.length > 0`. |
| Overflow mode | `KjBreadcrumb` `kjOverflow` input | `'truncate' \| 'menu' \| 'none'`, default `'truncate'`. Reflects to `[attr.data-overflow]` on the nav host so CSS can style. |
| Overflow menu | `KjBreadcrumbEllipsis` consumes `KjDropdownMenu` when `kjOverflow="menu"` | The ellipsis directive's host binds `[kjDropdownMenuTriggerFor]` to a `<kj-dropdown-menu>` template provided by the consumer (or auto-rendered by the wrapper). Each hidden crumb becomes a `<kj-dropdown-menu-item><a kjLink href="…">…</a></kj-dropdown-menu-item>`. Routing is forwarded. See [`../actions/dropdown-menu.md`](../actions/dropdown-menu.md). |
| Sizes (preset, configurable) | `KJ_BREADCRUMB_CONFIG.sizes` via `KjSize` host directive on `KjBreadcrumb` | Default list: `'sm' \| 'md' \| 'lg'`. Default `'md'`. Cascades to `KjBreadcrumbLink` size default unless the link sets its own. The size primarily governs gap, padding, and font-size of the list container. |
| Variants (preset, configurable) | **No `KjVariant` on the root.** | Per the brief: "Variants — `KjVariant` probably not — breadcrumbs are visually consistent". A breadcrumb is muted text; there is no "destructive breadcrumb" or "primary breadcrumb" use case. The per-crumb `KjLink` variant is the only variant axis (and it defaults to `muted`). See [Open question 5](#open-questions--risks). |
| RTL mirroring | CSS layer | Chevron-like separator glyphs (`›`, `→`) get `transform: scaleX(-1)` under `[dir="rtl"]`. Slash glyphs (`/`) do not (slashes are direction-neutral). The CSS layer ships per-glyph rules for the four canonical separators. |
| Routing | Native — no special handling | Each `<a kjBreadcrumbLink>` is an `<a>`, so `[routerLink]` works directly: `<a kjBreadcrumbLink routerLink="/library">Library</a>`. The directive does not interpose. |
| Wrapping vs. truncation | `kjWrap` input on `KjBreadcrumbList` | `'wrap' \| 'no-wrap' \| 'truncate'`. Default `'no-wrap'` for `kjOverflow="truncate"` and `kjOverflow="menu"` (truncation handles the long path). `'wrap'` for `kjOverflow="none"`. The combinations that read poorly (e.g. `kjOverflow="truncate"` + `kjWrap="wrap"`) are dev-mode warned but allowed. |
| Touch target | CSS layer | Each `<a kjBreadcrumbLink>` inherits Link's `kjSize="sm"` standalone-link policy: `padding: 0.5rem 0` extends the hit area to ≥ 44px vertically. Inline-text exception (WCAG 2.5.5) applies to the breadcrumb's row of small links — see [Accessibility](#accessibility-wcag-21-aaa) and [link.md Open question 6](./link.md). |
| Print | CSS layer | `@media print` rule shows the full breadcrumb (overrides `display: none` on truncated items, drops the ellipsis cell). The consumer's print-orientated content keeps the full path. |
| SSR | All directive logic synchronous on host bindings | The registered-items array materialises during view init; `visibleIndices` / `hiddenIndices` are computed immediately; the SSR HTML carries the right `data-hidden=""` attributes so the truncation is correct on first paint. No flicker. |

## Accessibility (WCAG 2.1 AAA)

Reference: [WAI-ARIA APG: Breadcrumb Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/),
[ARIA in HTML §`<nav>`](https://www.w3.org/TR/html-aria/#el-nav),
[WCAG Technique G65 — Providing a breadcrumb trail](https://www.w3.org/WAI/WCAG21/Techniques/general/G65),
[ARIA 1.1 §aria-current](https://www.w3.org/TR/wai-aria-1.1/#aria-current).

| Criterion | Requirement | Where it lives |
|---|---|---|
| 1.3.1 Info & Relationships | The breadcrumb trail is programmatically a navigation landmark with an ordered list of links and a designated current page. | `<nav>` host (KjBreadcrumb selector restriction) + `<ol>` host (KjBreadcrumbList selector restriction) + `aria-current="page"` on the current cell. |
| 1.3.2 Meaningful Sequence | The reading order matches the visual order (root → current). | Native — the DOM order *is* the hierarchy order. The directive does not reorder; the consumer authors items in path order. |
| 1.4.1 Use of Colour (AA) | Links are distinguishable from surrounding text by more than colour alone. | Inherited from `KjLink` — `kjUnderline="hover"` reveals the underline; the breadcrumb's separator + the `<a>` element + the visual rhythm of "row of clickable strings" all serve as the additional cue. The current cell is non-link and intentionally undecorated (its position-as-last is the cue). |
| 1.4.3 Contrast (AA) / 1.4.6 Contrast (AAA) | Link colour ≥ 7:1 against page background. Current cell colour ≥ 7:1 against page background. Separator ≥ 3:1 (decorative — non-text contrast). | Theme tokens — `--kj-color-breadcrumb-muted` (defaults to `--kj-color-link`) for the link cells; `--kj-color-breadcrumb-current` (defaults to `--kj-color-base-content`) for the terminal cell; separator colour matches the muted link colour by default. **Verify** ≥ 7:1 in light / dark / high-contrast themes. The muted contrast risk is the same as Link's — see [link.md Open question 3](./link.md). |
| 1.4.11 Non-text Contrast (AA) | Focus ring on link cells ≥ 3:1 against page background. Separator (decorative) ≥ 3:1 against page background. | `KjFocusRing` composed via `KjLink` for focus rings; theme token tunes the separator colour for ≥ 3:1. |
| 2.1.1 Keyboard / 2.1.2 No Keyboard Trap | Each crumb link reachable + activatable by keyboard. The ellipsis (when `kjOverflow="menu"`) reachable + openable by keyboard. | Native `<a>` tab order for crumb links. The ellipsis menu trigger is a `<button>` with `KjDropdownMenu`'s keyboard contract (Enter / Space opens, Escape closes, Arrow keys navigate). The current cell is **not** focusable (it is text — `tabindex="-1"` is *not* set; the element is a `<span>` that browsers do not put in the tab order anyway). |
| 2.4.1 Bypass Blocks | The breadcrumb itself is a bypass block (a `<nav>` landmark) AT users can skip past or to. | The `<nav>` landmark + `aria-label="Breadcrumb"` is the bypass mechanism. Multiple `<nav>` regions on the same page (primary nav, breadcrumb, in-page tabs nav) must each have a unique `aria-label` to be distinguishable in the AT landmark list — `'Breadcrumb'` is the canonical label per APG. |
| 2.4.4 Link Purpose (In Context, AA) / 2.4.9 Link Purpose (Link Only, AAA) | Each crumb's link text describes the destination. | **Consumer's job.** The directive does not auto-generate names. Crumb text is typically a page title; the natural authoring pattern produces unambiguous names ("Library", "Data", "Sales reports Q4") — but the consumer may dev-mode opt-in to the ambiguous-text warning per [link.md Open question 5](./link.md). |
| 2.4.7 Focus Visible (AA) | Visible focus indicator on each crumb link. | Inherited from `KjLink` (`KjFocusRing` host directive). |
| 2.4.13 Focus Appearance (WCAG 2.2 AAA) | Focus indicator ≥ 2px, ≥ 3:1 contrast. | Inherited from `KjLink`. |
| 2.4.8 Location (AAA) | Information about the user's location within a set of pages is available. | **The breadcrumb is itself the satisfaction of this criterion.** Per [WCAG Technique G65](https://www.w3.org/WAI/WCAG21/Techniques/general/G65), a breadcrumb trail meets 2.4.8 directly. The directive's existence-and-correctness on a multi-page site is the AAA-clearing artefact. |
| 2.5.5 Target Size (AAA) | Each crumb link ≥ 44×44 CSS px. | Crumbs are inline links inside an `<ol>`, arguably eligible for the inline-text exception. Per [link.md Open question 6](./link.md), the resolution is to extend the hit area vertically via `padding: 0.5rem 0` on small standalone links so the keyboard / pointer hit area clears 44px without changing the visual size. The breadcrumb's CSS layer applies this to its descendant `KjBreadcrumbLink` cells. The current cell does not need to clear 44px — it is not interactive. |
| 2.5.8 Target Size (Minimum, AA) | 24×24 fallback. | Inherent — even the small link cells exceed 24px. |
| 4.1.2 Name, Role, Value | Native `<nav>`, `<ol>`, `<li>`, `<a>` provide all roles. `aria-current="page"` on the terminal cell. | All host bindings are `[attr.…]` declarations in the directives' `host` objects; no `role` overrides. The only ARIA attributes the directives set are `aria-label` (on `<nav>`), `aria-current="page"` (on the terminal cell), `aria-hidden="true"` (on separator + truncated items + ellipsis when `kjOverflow="truncate"`). |

### The "exactly one current crumb, last in document order" invariant

A breadcrumb without a current crumb is ill-formed (the user has
no "you are here" cue). A breadcrumb with two current crumbs is
ill-formed (multiple `aria-current="page"` on the same nav region
violates [ARIA 1.1 §aria-current](https://www.w3.org/TR/wai-aria-1.1/#aria-current),
which expects one). A breadcrumb with the current crumb in the
middle of the path is ill-formed visually but ARIA-acceptable —
however it is rare enough to dev-mode warn. The directive enforces:

- **Exactly one current crumb.** If `KjBreadcrumbCurrent` is
  registered explicitly, it wins and auto-detection is skipped.
  If not, the last registered item is auto-marked. Two
  `KjBreadcrumbCurrent` instances → dev-mode warning + first one
  wins. Zero items → dev-mode warning ("breadcrumb is empty").
- **Last in document order.** If `KjBreadcrumbCurrent` is
  registered at a position other than the last item, dev-mode
  warns ("`KjBreadcrumbCurrent` should be the last crumb"). The
  attribute is still applied (the consumer may have a reason —
  e.g. a "you-are-currently-here-but-also-here" annotation
  pattern — though we have not encountered one).

The invariant lives in an `effect()` inside `KjBreadcrumb` that
watches the registered-items signal and the
registered-currents signal, asserting both invariants in dev-mode
(`isDevMode()` guard, no production cost).

### Truncated-crumb AT story

In `kjOverflow="truncate"` mode, the hidden crumbs are
`display: none` (CSS) and additionally have
`aria-hidden="true"` on their hosts (so AT does not surface them
even when the user navigates by element). The ellipsis cell is
a `<span>` with `aria-hidden="true"`. The breadcrumb's
`aria-label` extends to include the count:
`aria-label="Breadcrumb (2 items hidden)"`. AT users learn the
truncation occurred and can act accordingly (zoom in, change
display width, switch to `'menu'` overflow if the consumer offers
it). This is a tradeoff — the AAA-friendlier choice is `'menu'`
(reachable hidden crumbs); see [Open question 4](#open-questions--risks).

In `kjOverflow="menu"` mode, the hidden crumbs render *inside* the
dropdown menu (in DOM order, via `KjDropdownMenu`'s template).
They are reachable by AT and keyboard via the menu's contract.
The ellipsis button's accessible name is
`"Show 2 hidden breadcrumbs"`; the menu items are the same
crumbs as anchors (so navigation works and the routing layer
sees the same hrefs). On menu close, focus restores to the
ellipsis button per `KjDropdownMenu`'s focus restoration contract.

## Composition model

```
[Core directives]                                  (folder: packages/core/src/breadcrumb/)
  ├── KjBreadcrumb                                 (selector: nav[kjBreadcrumb])
  │     hostDirectives:
  │       └── KjSize (inputs: kjSize)
  │     providers:
  │       ├── { provide: KJ_BREADCRUMB, useExisting: KjBreadcrumb }
  │       └── bindPresets(KJ_BREADCRUMB_CONFIG)
  │     owns:
  │       ├── kjAriaLabel reflection ([attr.aria-label])
  │       ├── kjMaxItems + kjOverflow (computed visible/hidden indices)
  │       ├── kjSeparator (sets --kj-breadcrumb-separator-content)
  │       ├── registered-items array signal
  │       ├── registered-currents array signal
  │       └── invariant assertions (dev-mode)
  │
  ├── KjBreadcrumbList                             (selector: ol[kjBreadcrumbList])
  │     ctx = inject(KJ_BREADCRUMB)
  │     owns:
  │       ├── kjWrap reflection ([attr.data-wrap])
  │       ├── data-explicit-separators reflection
  │       │   (set when ≥ 1 KjBreadcrumbSeparator registered)
  │       └── data-overflow reflection (mirrors root's kjOverflow)
  │
  ├── KjBreadcrumbItem                             (selector: li[kjBreadcrumbItem])
  │     ctx = inject(KJ_BREADCRUMB)
  │     owns:
  │       ├── ngOnInit: ctx.registerItem(this); ngOnDestroy: ctx.unregisterItem(this)
  │       ├── kjCurrent computed (last + no explicit current)
  │       ├── data-hidden reflection (when index ∈ ctx.hiddenIndices())
  │       └── [attr.aria-current]="kjCurrent() ? 'page' : null"
  │
  ├── KjBreadcrumbLink                             (selector: a[kjBreadcrumbLink])
  │     hostDirectives:
  │       └── KjLink
  │           inputs: [
  │             'kjVariant: kjVariant',
  │             'kjSize: kjSize',
  │             'kjUnderline: kjUnderline',
  │             'kjExternal: kjExternal',
  │             'kjDisabled: kjDisabled',
  │           ]
  │     ctx = inject(KJ_BREADCRUMB)
  │     defaults sourced from KJ_BREADCRUMB_CONFIG.defaults.linkVariant / linkSize / linkUnderline
  │     dev-mode check: if parent KjBreadcrumbItem has kjCurrent() === true,
  │     warn ("a current crumb should be KjBreadcrumbCurrent, not KjBreadcrumbLink")
  │
  ├── KjBreadcrumbCurrent                          (selector: span[kjBreadcrumbCurrent], [kjBreadcrumbCurrent])
  │     ctx = inject(KJ_BREADCRUMB)
  │     owns:
  │       ├── ngOnInit: ctx.registerCurrent(this); ngOnDestroy: ctx.unregisterCurrent(this)
  │       └── [attr.aria-current]="'page'"
  │
  ├── KjBreadcrumbSeparator                        (selector: li[kjBreadcrumbSeparator], [kjBreadcrumbSeparator])
  │     ctx = inject(KJ_BREADCRUMB)
  │     owns:
  │       ├── ngOnInit: ctx.registerSeparator(this); ngOnDestroy: ctx.unregisterSeparator(this)
  │       ├── role="presentation"
  │       └── aria-hidden="true"
  │
  └── KjBreadcrumbEllipsis                         (selector: [kjBreadcrumbEllipsis])
      ctx = inject(KJ_BREADCRUMB)
      owns:
        ├── kjOverflowMenu (TemplateRef | KjDropdownMenu instance, optional)
        ├── when ctx.overflow() === 'menu': hostDirectives include KjDropdownMenuTrigger,
        │   bound to kjOverflowMenu (or auto-rendered from ctx.hiddenItems())
        ├── when ctx.overflow() === 'truncate': aria-hidden="true"
        └── visible only when ctx.hiddenIndices().length > 0

[Context]                                          (file: packages/core/src/breadcrumb/breadcrumb.context.ts)
  └── KjBreadcrumbContext interface + KJ_BREADCRUMB InjectionToken

[Wrapper components]                               (folder: packages/components/src/breadcrumb/)
  ├── KjBreadcrumbComponent (selector: kj-breadcrumb)         → renders <nav kjBreadcrumb>
  ├── KjBreadcrumbListComponent (selector: kj-breadcrumb-list) → renders <ol kjBreadcrumbList>
  ├── KjBreadcrumbItemComponent (selector: kj-breadcrumb-item) → renders <li kjBreadcrumbItem>
  ├── KjBreadcrumbLinkComponent (selector: kj-breadcrumb-link) → renders <a kjBreadcrumbLink>
  ├── KjBreadcrumbCurrentComponent (selector: kj-breadcrumb-current) → renders <span kjBreadcrumbCurrent>
  ├── KjBreadcrumbSeparatorComponent (selector: kj-breadcrumb-separator) → renders <li kjBreadcrumbSeparator>
  └── KjBreadcrumbEllipsisComponent (selector: kj-breadcrumb-ellipsis) → renders <button kjBreadcrumbEllipsis>
                                                                            or <span kjBreadcrumbEllipsis>
                                                                            depending on overflow mode

[Configuration]                                    (file: packages/core/src/breadcrumb/config.ts)
  ├── KJ_BREADCRUMB_DEFAULTS = { sizes, defaults: { size, ariaLabel, separator, maxItems, overflow,
  │                                                  linkVariant, linkSize, linkUnderline } }
  ├── KJ_BREADCRUMB_CONFIG = new InjectionToken(...)
  └── provideKjBreadcrumb(config: Partial<KjBreadcrumbConfig>): Provider[]

[CSS layer]                                        (file: packages/components/src/breadcrumb/breadcrumb.css)
  ├── .kj-breadcrumb (display: block; nav landmark; per-size font-size + gap)
  ├── .kj-breadcrumb-list (display: flex; flex-wrap depending on data-wrap; gap from --kj-breadcrumb-gap)
  ├── .kj-breadcrumb-item (inline-flex alignment; padding for hit area)
  ├── .kj-breadcrumb-item[data-hidden] { display: none; }
  ├── .kj-breadcrumb-list:not([data-explicit-separators]) > .kj-breadcrumb-item:not(:first-child)::before {
  │     content: var(--kj-breadcrumb-separator-content, '/');
  │     opacity: 0.7;
  │     padding-inline-end: var(--kj-breadcrumb-gap, 0.5rem);
  │   }
  ├── [dir="rtl"] .kj-breadcrumb-list[data-separator-mirror]::before { transform: scaleX(-1); }
  ├── .kj-breadcrumb-current { color: var(--kj-color-breadcrumb-current); font-weight: 500; }
  ├── .kj-breadcrumb-separator (explicit element variant)
  ├── .kj-breadcrumb-ellipsis (button vs. span styling per overflow mode)
  └── @media print { .kj-breadcrumb-item[data-hidden] { display: revert; } .kj-breadcrumb-ellipsis { display: none; } }
```

One root + six children. Context token (`KJ_BREADCRUMB`) provides
the parent / child coordination (matches Accordion / Tabs / Menu /
List). `KjLink` is composed via `hostDirectives` on
`KjBreadcrumbLink` (matches Card's linked-title via `<a kjLink>`,
just one composition layer deeper). `KjDropdownMenu` is composed
*conditionally* on `KjBreadcrumbEllipsis` only when
`kjOverflow="menu"` — implemented as a runtime guard in the
ellipsis directive's host bindings rather than a `hostDirectives`
entry (so the menu's directive cost is paid only when the
truncation menu is actually used).

### Reused primitives

| Primitive | Where | Why |
|---|---|---|
| `KjLink` | `KjBreadcrumbLink` `hostDirectives` | The per-crumb anchor's variant / size / underline / external-link / disabled-link plumbing all comes from `KjLink`. Defaults are tuned for breadcrumb context (`muted`, `sm`, `hover`) but every input forwards. |
| `KjSize` | `KjBreadcrumb` `hostDirectives` | Routes the breadcrumb's overall size to `data-size` on the nav host so the CSS layer scales gap, font-size, and per-cell padding. |
| `KjFocusRing` | Inherited via `KjLink` on each `KjBreadcrumbLink` | Per-cell focus ring. The breadcrumb root does not have its own focus ring (it is a landmark, not interactive). |
| `KjDropdownMenu` + `KjDropdownMenuTrigger` | Conditional on `KjBreadcrumbEllipsis` | Only when `kjOverflow="menu"`. The ellipsis becomes a `<button>` triggering a dropdown menu of hidden crumbs. See [`../actions/dropdown-menu.md`](../actions/dropdown-menu.md). |
| `KjVisuallyHidden` | Programmatic — used in the ellipsis cell when `kjOverflow="menu"` for the "Show N hidden breadcrumbs" accessible name | Class-only application on a span child of the ellipsis button. |
| `KjVariant` | **Not used on the root.** | Per the brief and confirmed: a breadcrumb does not have visual variants. The per-crumb `KjLink` variant is the only variant axis. |
| `KjFormControl` / `KjLiveRegion` / `KjFocusTrap` / `KjRovingTabindex` / `KjAriaDescribedby` | **Not used.** | A breadcrumb is a static landmark — no form-control duties, no live region (the path doesn't announce as a status update), no focus trap (it is not modal), no roving tabindex (each crumb is independently tabbable — that is the natural anchor behaviour, no rove needed), no described-by wiring. |

### Cross-component pointers

- [`./link.md`](./link.md) — every crumb except the last is
  `<a kjBreadcrumbLink>`, which `hostDirectives`-composes `KjLink`
  with breadcrumb-tuned defaults (`muted` / `sm` / `hover`).
  Breadcrumb does not duplicate Link's external-link plumbing,
  focus-ring composition, or disabled-link enforcement; those flow
  through the composition. Link analysis closed in
  [link.md Open question 6](./link.md) the inline-vs-standalone
  hit-area question; this analysis is the consumer of that
  resolution.
- [`../actions/dropdown-menu.md`](../actions/dropdown-menu.md) —
  when `kjOverflow="menu"`, the ellipsis cell becomes a
  `KjDropdownMenuTrigger` opening a menu of hidden crumbs. The
  menu's keyboard contract (Enter / Space opens, Escape closes
  with focus restoration, Arrow keys navigate items) is inherited
  unchanged. Each menu item is a `<a kjLink>` so external-link
  affordances continue to apply on hidden crumbs.
- [`./menu.md`](./menu.md) — sibling navigation primitive. A
  breadcrumb is *not* a menu (it has no `role="menu"` /
  `role="menuitem"`); both live in the navigation category but
  serve different patterns. The two analyses do not share a
  directive but share the per-anchor `KjLink` composition
  pattern.
- [`./tabs.md`](./tabs.md) — sibling within-`<nav>` pattern, but
  Tabs is for *within-page* navigation (`role="tablist"` /
  `role="tab"`), Breadcrumb for *between-page* navigation.
  Visually similar (horizontal row of links); semantically
  unrelated. Cross-pointer here so consumers picking between the
  two land on the right primitive.
- [`./pagination.md`](./pagination.md) — sibling `<nav>`-wrapped
  row of links, but cardinality-based ("page 3 of 12") rather
  than hierarchy-based ("Home › Library › Data"). Pagination's
  `aria-label` is `'Pagination'`; Breadcrumb's is `'Breadcrumb'`.
  Both share the "<nav> with a unique label" idiom and may sit on
  the same page (a breadcrumb above the page title; a paginator
  below the table). Cross-pointer captures the distinction.
- [`../data-display/card.md`](../data-display/card.md) — the
  page-header card pattern places a breadcrumb in the card's
  eyebrow slot, above the title:
  `<kj-card><kj-card-header><kj-breadcrumb>…</kj-breadcrumb><kj-card-title>…</kj-card-title></kj-card-header></kj-card>`.
  Card does not own the breadcrumb's semantics; Breadcrumb does
  not know about Card. The composition is plain Angular
  projection.
- [`../data-display/typography.md`](../data-display/typography.md)
  — the breadcrumb sits inside the page-header typographic stack,
  consuming the same `--kj-color-link` token Link consumes (via
  the `--kj-color-breadcrumb-muted` fall-through) so the
  breadcrumb's link colour is consistent with prose links inside
  `kj-prose` containers on the same page.
- [`../data-display/list.md`](../data-display/list.md) — sibling
  list-of-anchors primitive; List rows whose entire row navigates
  use `<a kjLink>` as the row's primary action. A breadcrumb is
  not a list (visually horizontal, semantically ordered hierarchy)
  but the per-anchor `KjLink` composition pattern is shared.

## Inputs / Outputs / Models

All public-facing inputs / outputs / models are `kj`-prefixed per
[`rules/code_style.md`](../../../rules/code_style.md).

### `KjBreadcrumb` — root (`nav[kjBreadcrumb]`)

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjAriaLabel` | `string` | `'Breadcrumb'` (from `KJ_BREADCRUMB_CONFIG`) | Forwarded to host `[attr.aria-label]`. Overridable for i18n. |
| `kjSize` | `string` (validated against preset) | `'md'` (from `KJ_BREADCRUMB_CONFIG`) | Forwarded to `KjSize` host directive. Preset list: `'sm' \| 'md' \| 'lg'`. Cascades to descendant `KjBreadcrumbLink` size default. |
| `kjSeparator` | `string \| undefined` | `undefined` (CSS default `'/'`) | When set, applied as the value of `--kj-breadcrumb-separator-content` on the host. Common values: `'/'`, `'›'`, `'→'`, `'❯'`. Ignored when explicit `KjBreadcrumbSeparator` cells are present. |
| `kjMaxItems` | `number` | `4` (from `KJ_BREADCRUMB_CONFIG`) | When the registered-items count exceeds this, middle items are collapsed. `0` or `Infinity` disables truncation. |
| `kjOverflow` | `'truncate' \| 'menu' \| 'none'` | `'truncate'` (from `KJ_BREADCRUMB_CONFIG`) | The overflow-handling strategy when `kjMaxItems` is exceeded. Reflects `[attr.data-overflow]`. |
| (host) `[attr.aria-label]` | host binding | computed | Combines `kjAriaLabel()` with hidden-count when `kjOverflow="truncate"` and items are hidden: `"Breadcrumb (2 items hidden)"`. |
| (host) `[attr.data-size]` / `[data-overflow]` | host bindings | computed | CSS layer keys off these. |
| (host) `[style.--kj-breadcrumb-separator-content]` | host binding | from `kjSeparator` when set | CSS pseudo-element reads it. |

Outputs: none. The root does not emit events — navigation itself
is the consumer's routing concern and emits through `<a>` clicks.

### `KjBreadcrumbList` — `ol[kjBreadcrumbList]`

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjWrap` | `'wrap' \| 'no-wrap' \| 'truncate'` | `'no-wrap'` | Reflects `[attr.data-wrap]`. CSS layer maps to `flex-wrap` + `text-overflow`. |
| (host) `[attr.data-explicit-separators]` | host binding | computed | Set when ≥ 1 `KjBreadcrumbSeparator` is registered with the breadcrumb context. |

### `KjBreadcrumbItem` — `li[kjBreadcrumbItem]`

| Name | Type | Default | Notes |
|---|---|---|---|
| (no public input) | — | — | The item is registration-only. Consumer authoring is `<li kjBreadcrumbItem>` containing the cell. |
| (host) `[attr.aria-current]` | host binding | computed | `'page'` when `kjCurrent()` is `true`; otherwise `null`. |
| (host) `[attr.data-hidden]` | host binding | computed | Reflects `''` when the item's index is in `ctx.hiddenIndices()`; otherwise `null`. CSS layer hides via `display: none` on `[data-hidden]`. |
| (exposed signal) `kjCurrent` | `Signal<boolean>` | computed | True when the item is last-registered and no explicit `KjBreadcrumbCurrent` is registered, OR when the item directly contains a `KjBreadcrumbCurrent`. Useful for consumer-side conditional rendering inside the item if the consumer wants per-current styling (rare). |

### `KjBreadcrumbLink` — `a[kjBreadcrumbLink]`

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjVariant` | `string` (validated against `KjLink` preset) | `'muted'` (from `KJ_BREADCRUMB_CONFIG.defaults.linkVariant`) | Forwarded to `KjLink` via `hostDirectives` input alias. |
| `kjSize` | `string` (validated against `KjLink` preset) | `'sm'` (from `KJ_BREADCRUMB_CONFIG.defaults.linkSize`) | Forwarded to `KjLink`. |
| `kjUnderline` | `'always' \| 'hover' \| 'none'` | `'hover'` (from `KJ_BREADCRUMB_CONFIG.defaults.linkUnderline`) | Forwarded to `KjLink`. |
| `kjExternal` | `boolean \| undefined` | `undefined` | Forwarded to `KjLink`. Same auto-detect from `target="_blank"` applies. |
| `kjDisabled` | `boolean` | `false` | Forwarded to `KjLink`. Disabled crumbs stay focusable + announceable but click / enter are suppressed (per `KjLink`'s disabled-link bundle). |
| (host) `[attr.aria-current]` | host binding | not set | `KjBreadcrumbLink` does **not** set `aria-current` — that is the parent `KjBreadcrumbItem`'s job. Dev-mode warns if the consumer manually sets `aria-current="page"` on a link (the current cell should be `KjBreadcrumbCurrent`). |

### `KjBreadcrumbCurrent` — `span[kjBreadcrumbCurrent]`, `[kjBreadcrumbCurrent]`

| Name | Type | Default | Notes |
|---|---|---|---|
| (no public input) | — | — | The current cell is content-only. Consumer authoring is `<span kjBreadcrumbCurrent>{{ pageTitle() }}</span>`. |
| (host) `[attr.aria-current]` | host binding | constant | `'page'`. |

### `KjBreadcrumbSeparator` — `li[kjBreadcrumbSeparator]`

| Name | Type | Default | Notes |
|---|---|---|---|
| (no public input) | — | — | Content (icon, glyph, SVG) is consumer-projected via `<ng-content>`. |
| (host) `role` / `aria-hidden` | host bindings | constant | `'presentation'` / `'true'`. |

### `KjBreadcrumbEllipsis` — `[kjBreadcrumbEllipsis]`

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjOverflowMenu` | `TemplateRef<unknown> \| KjDropdownMenu \| undefined` | `undefined` | When set and `ctx.overflow() === 'menu'`, the ellipsis becomes a `KjDropdownMenuTrigger` opening this menu. When unset and overflow is `'menu'`, the ellipsis auto-renders a default menu listing hidden crumbs (the wrapper component handles auto-rendering; the directive only consumes a provided menu). |
| `kjAriaLabel` | `string` | `'Show {n} hidden breadcrumbs'` (i18n-templated; `n` interpolated from `ctx.hiddenIndices().length`) | Used when `ctx.overflow() === 'menu'` — the button's accessible name. When `ctx.overflow() === 'truncate'`, the cell is `aria-hidden="true"` and this label is unused. |
| (host) `[attr.aria-hidden]` / `[attr.aria-haspopup]` / `[attr.aria-expanded]` / `[attr.aria-label]` | host bindings | computed | Per overflow mode. |
| (host) `[attr.data-overflow]` | host binding | computed | Mirrors `ctx.overflow()`. |

### Wrapper components

Each wrapper re-exposes every directive input under the same name
and projects content through `<ng-content>`. The `kj-breadcrumb`
wrapper additionally accepts a `kjItems: BreadcrumbItem[]` input
for consumers who prefer the model-driven shape; when set, the
wrapper renders the items via `@for` internally — but **no** core
directive consumes `BreadcrumbItem`; the wrapper translates from
`BreadcrumbItem[]` to the compound DOM shape. This is an
ergonomic convenience for the static-data case (also serves the
`xng-breadcrumb`-from-route-tree pattern), not a core API.

```ts
export interface KjBreadcrumbItemModel {
  label: string;
  href?: string;
  routerLink?: string | unknown[];
  current?: boolean; // explicit override; otherwise auto-detect last
  external?: boolean;
  icon?: TemplateRef<unknown> | string;
}
```

### Configuration (`KJ_BREADCRUMB_CONFIG`)

```ts
export interface KjBreadcrumbConfig {
  sizes: string[];
  defaults: {
    size: string;
    ariaLabel: string;
    separator: string | undefined;
    maxItems: number;
    overflow: 'truncate' | 'menu' | 'none';
    linkVariant: string;
    linkSize: string;
    linkUnderline: 'always' | 'hover' | 'none';
  };
}

export const KJ_BREADCRUMB_DEFAULTS: KjBreadcrumbConfig = {
  sizes: ['sm', 'md', 'lg'],
  defaults: {
    size: 'md',
    ariaLabel: 'Breadcrumb',
    separator: undefined, // CSS default '/'
    maxItems: 4,
    overflow: 'truncate',
    linkVariant: 'muted',
    linkSize: 'sm',
    linkUnderline: 'hover',
  },
};

export const KJ_BREADCRUMB_CONFIG = new InjectionToken<KjBreadcrumbConfig>(
  'kj.breadcrumb.config',
  { factory: () => KJ_BREADCRUMB_DEFAULTS },
);

export function provideKjBreadcrumb(
  config: Partial<KjBreadcrumbConfig>,
): Provider[];
```

Identical extension story to Link / Button:
`provideKjBreadcrumb({ defaults: { separator: '›' } })` switches
the default separator app-wide.

## Examples to ship

Match the cadence of Accordion / Tabs:

1. **Default** — `breadcrumb.example.ts`. A three-crumb path
   (`Home › Library › Data`) with the default `/` separator, the
   muted-link styling, and the auto-current marking on `Data`.
2. **Custom separator** — `breadcrumb.separator.example.ts`. Two
   side-by-side: one with `kjSeparator="›"`, one with
   `kjSeparator="→"`. Demonstrates the CSS-variable approach.
3. **Icon separator** — `breadcrumb.icon-separator.example.ts`. A
   chevron SVG between cells via explicit
   `<li kjBreadcrumbSeparator>` cells. Demonstrates the opt-out
   from the auto pseudo-element. Includes RTL mirroring.
4. **Truncation (default)** — `breadcrumb.truncation.example.ts`.
   A six-crumb path with `kjMaxItems="4"` rendering as
   `Home › … › C › D › Current`. The ellipsis is plain text;
   hidden crumbs are not reachable. Includes the
   `aria-label="Breadcrumb (2 items hidden)"` reflection
   demonstrating the AT story.
5. **Truncation with overflow menu** — `breadcrumb.overflow-menu.example.ts`.
   Same six-crumb path with `kjOverflow="menu"`. The ellipsis is
   a `<button>` opening a `KjDropdownMenu` listing the hidden
   crumbs as menu items. Demonstrates focus restoration on menu
   close. **Recommended pattern for any breadcrumb that may grow
   programmatically** — the documentation calls this out
   explicitly.
6. **Routed crumbs** — `breadcrumb.router.example.ts`. Each crumb
   uses `[routerLink]` instead of `href`. Demonstrates that the
   `KjLink` composition makes routing work natively, including
   `aria-current="page"` on the last crumb when it matches the
   active route.
7. **External crumb** — `breadcrumb.external.example.ts`. One
   crumb in the path links to a different domain via
   `target="_blank"`. The `KjLink` external-link plumbing applies:
   trailing icon + `(opens in new tab)` AT suffix. Demonstrates
   that the breadcrumb's link cell is not a stripped-down
   `KjLink` — every Link feature applies.
8. **Dynamic from route tree** — `breadcrumb.dynamic.example.ts`.
   A consumer-side helper service produces a
   `BreadcrumbItemModel[]` signal from the active Angular Route
   tree; the wrapper renders the model via `[kjItems]`.
   Demonstrates the model-driven escape hatch and the
   compound-API equivalent side-by-side.
9. **Inside a card header** — `breadcrumb.in-card.example.ts`. A
   `<kj-card>` whose `<kj-card-header>` contains a breadcrumb
   above the `<kj-card-title>`. Anchors the composition with
   Card.
10. **RTL** — `breadcrumb.rtl.example.ts`. Same path under
    `[dir="rtl"]`. The chevron separator mirrors; the slash does
    not. Demonstrates the per-glyph CSS rules.
11. **Wrapping (no truncation)** — `breadcrumb.wrap.example.ts`.
    Long path with `kjOverflow="none"` and `kjWrap="wrap"`, so
    the row breaks across lines instead of truncating.
12. **Configured presets** — `breadcrumb.configured.example.ts`.
    Uses `provideKjBreadcrumb({ defaults: { separator: '›',
    overflow: 'menu', maxItems: 5 } })` at the application root
    to set app-wide breadcrumb defaults.
13. **Themed (core-only)** — `breadcrumb.example.ts`,
    `breadcrumb.retro.example.ts`,
    `breadcrumb.finance.example.ts` under `packages/core/`.
    Confirms the directive family works under arbitrary theme
    CSS without the wrapper.

## Open questions / risks

1. **Auto-current on the last item, or require explicit
   `KjBreadcrumbCurrent`?**
   The current design auto-marks the last registered item with
   `aria-current="page"` *unless* the consumer registers an
   explicit `KjBreadcrumbCurrent`. This is the
   "conventional-zero-config + explicit-override" pattern. The
   alternative is to require `KjBreadcrumbCurrent` on every
   breadcrumb (no auto-detect), forcing the consumer to be
   explicit and avoiding the "I forgot to mark the current cell"
   failure mode in the opposite direction (the consumer who
   wanted *no* current crumb — e.g. a transient breadcrumb in a
   deletion-confirmation dialog — instead gets one auto-applied).
   **Decision: auto-mark by default, with explicit override
   winning.** The transient-breadcrumb case is rare; the
   forgot-to-mark-current case is common. Dev-mode warns if there
   are zero registered items (empty breadcrumb). The
   "consumer wants no current crumb" case is unsupported in v1;
   add an opt-out (`kjAutoCurrent="false"`) if a real consumer
   reports it. Resolution path: ship auto-mark, watch the
   feedback channel.

2. **`KjBreadcrumbCurrent` must be `<span>`, or any element?**
   APG examples use a `<span>` (or `<a aria-current="page">` —
   both styles exist in the literature). shadcn's `BreadcrumbPage`
   renders a `<span role="link" aria-disabled="true"
   aria-current="page">` — the `role="link"` is non-canonical and
   arguably misleading. **Decision: the directive matches
   `[kjBreadcrumbCurrent]` (any host element)** but the wrapper
   `<kj-breadcrumb-current>` renders `<span>` as the canonical
   choice. The directive does **not** set `role="link"` on its
   host — the cell is text, the role is implicit (`generic`),
   and AT correctly announces "[link text], current page" when
   the cell is text. A consumer who wants a styled disabled
   anchor as the current cell can render
   `<a kjBreadcrumbLink kjDisabled aria-current="page">` — but the
   default and recommended path is the `<span>` text cell.

3. **Touch-target story for inline crumb rows.**
   This is the [link.md Open question 6](./link.md) consumer side.
   The inline-text exception (WCAG 2.5.5) likely applies to a
   breadcrumb's row of small links — the row reads as inline text
   inside a sentence-like flow. The CSS layer applies
   `padding: 0.5rem 0` per cell to extend the hit area
   vertically without changing the visual size. The vertical
   padding overlaps the row above and below, but in a breadcrumb
   the surrounding rows are typically a page title (large,
   non-interactive) and a separator (decorative), so the overlap
   does not create competing hit areas. **Verify** with an a11y
   reviewer. If the exception does not cleanly apply, the
   mitigation is to render each cell with
   `display: inline-flex; min-height: 44px` — visually identical
   but semantically a 44px hit area per cell. Defer the visual
   tuning to v1.1; ship the exception-friendly version in v1.

4. **Default `kjOverflow` — `'truncate'` or `'menu'`?**
   The current default is `'truncate'`, matching shadcn / industry
   default. The AAA-friendlier choice is `'menu'`: hidden crumbs
   stay reachable. **Lean: keep `'truncate'` as default in v1**,
   document `'menu'` as the recommended choice for any breadcrumb
   that may grow beyond `kjMaxItems`. The `'truncate'` default is
   what consumers expect on first-draft authoring; the `'menu'`
   upgrade is a one-input flip when the breadcrumb gets longer.
   Re-evaluate based on usage data: if 90% of consumers in
   production end up flipping to `'menu'` after launch, swap the
   default in v2 with a deprecation warning.

5. **`KjVariant` on the root — really not?**
   The brief says no, and the analysis above agrees — there is no
   "destructive breadcrumb" or "primary breadcrumb" use case, and
   the per-crumb `KjLink` variant covers the per-cell colour
   axis. **Risk**: a future consumer wants a "this breadcrumb is
   inside an error banner, all crumbs should be error-coloured"
   pattern. The mitigation is the implicit cascade (the parent's
   `data-variant="error"` selector colours descendant
   `.kj-breadcrumb-link` elements through token override). If the
   implicit cascade is insufficient, ship a v1.1
   `kjLinkVariant="inherit"` default mode that delegates per-cell
   colour to `currentColor`. Defer; not blocking v1.

6. **Item registration ordering — DOM order or Angular content
   order?**
   Items register with the breadcrumb context on `ngOnInit`. The
   registration order is the content-children-init order, which
   is the DOM order. **Risk**: if a consumer uses `@for` with
   `track` on a non-stable key, the items reorder on data change
   and the registration array becomes stale. Mitigation: the
   context's `registerItem`/`unregisterItem` use a `Set<KjBreadcrumbItem>`
   internally and the items array is computed from
   `Array.from(set)` re-sorted by DOM order via
   `compareDocumentPosition`. Implementation cost: O(n log n) on
   each registration change, negligible for typical breadcrumb
   sizes (n < 20). Verified pattern matches Accordion's item
   ordering.

7. **Truncation and the "Home is always visible" rule —
   universal?**
   The current rule keeps the first crumb (almost always "Home")
   plus the last `kjMaxItems - 2` crumbs visible. **Risk**: some
   breadcrumb designs prefer to hide the first crumb and keep the
   parents of the current page visible
   (`… › C › D › Current`, no Home). This is the
   "scrolling-tail" variant. **Lean: ship the canonical "keep
   first + tail" rule in v1**; expose a
   `kjTruncationStrategy: 'middle' | 'tail' | 'head'` input in
   v1.1 if a consumer asks. The `'middle'` strategy is the
   current behaviour; `'tail'` would keep the first
   `kjMaxItems - 1` and hide the rest with the ellipsis at the
   end; `'head'` would hide the first crumbs (ellipsis at the
   start) and keep the visible tail.

8. **Ellipsis + RTL — does the menu-trigger button mirror?**
   The ellipsis glyph (`…`) does not mirror under RTL — three
   horizontal dots are direction-neutral. The menu it opens does
   mirror (the menu's `KjDropdownMenu` panel is RTL-aware via the
   menu primitive's existing logic, see
   [`../actions/dropdown-menu.md`](../actions/dropdown-menu.md)).
   The position of the ellipsis cell within the breadcrumb row is
   handled by the parent `<ol>`'s flex direction (already
   RTL-correct via `flex-direction: row` + the document's
   `dir="rtl"`). No special handling needed. Verified path; no
   open work.

9. **`aria-label` i18n — is the `'Breadcrumb'` string
   translatable?**
   The default label is English. For an i18n'd application the
   label should translate (`Fil d'Ariane`, `Pfadnavigation`,
   `パンくずリスト`). The current design exposes the label
   via `KJ_BREADCRUMB_CONFIG.defaults.ariaLabel`, configurable
   per-app. The "Breadcrumb (N items hidden)" string is also
   configurable via a separate `hiddenItemsLabel:
   (n: number) => string` config field (function-based to handle
   plural rules — `1 item hidden` vs. `2 items hidden`). Defer
   the function-based label to v1.1; ship a static "{n} items
   hidden" template in v1 with a TODO. The `'Show N hidden
   breadcrumbs'` ellipsis label is similarly configurable. Same
   pattern as Link's `(opens in new tab)` AT suffix
   (see [link.md Open question 15](./link.md)).

10. **Print stylesheet — show full path even when truncated?**
    A print convention is to render the full breadcrumb path even
    when the on-screen view is truncated (the printed page does
    not have hover / click / interaction, so the truncation cost
    no longer applies). The CSS layer's print rule overrides
    `display: none` on `[data-hidden]` and hides the ellipsis
    cell. **Decision: ship this as default v1 behaviour.** The
    consumer-opt-out is a normal CSS override
    (`@media print { .kj-breadcrumb-item[data-hidden] { display:
    none !important; } }`).

11. **Visited-state for breadcrumb cells.**
    Each crumb is an `<a>` so the browser tracks `:visited`. The
    breadcrumb's "Home" and intermediate cells are *always*
    visited (the user navigated through them to reach the current
    page) — so they will always render in the
    `--kj-color-link-visited` colour. **Risk**: the visited
    colour, applied to *every non-current* cell, may make the
    breadcrumb look semantically broken (every cell is visually
    the same colour because every cell is visited). Mitigation:
    the breadcrumb's CSS layer overrides the visited colour back
    to the muted-link colour for descendant cells —
    `.kj-breadcrumb-link:visited { color: inherit; }`. The
    per-app `:visited` story is preserved elsewhere; only inside
    breadcrumbs do we suppress it. Verified pattern; document the
    suppression so consumers do not re-apply the visited colour
    via override.

12. **Long crumb labels — single-line truncation per cell.**
    A single crumb may have a long label ("My very long page
    title that runs to the edge of the viewport"). Truncating
    *within* a cell is distinct from truncating *across* cells
    (the `kjMaxItems` story). The per-cell CSS uses
    `max-width: 12rem; overflow: hidden; text-overflow: ellipsis;
    white-space: nowrap;` on small / medium sizes; the
    consumer can override the `max-width` via CSS variable
    (`--kj-breadcrumb-cell-max-width`). The full label remains
    accessible via `title="{full label}"` on the cell (set by the
    directive when the consumer's text content exceeds the
    `max-width`). **Risk**: `title` tooltips are inaccessible to
    keyboard users without hover. The mitigation is the canonical
    `KjTooltip` primitive (see
    [`../feedback/tooltip.md`](../feedback/tooltip.md)) — the
    breadcrumb cell could compose `KjTooltip` automatically when
    truncation is active. **Defer to v1.1**: ship the `title`
    fallback in v1; upgrade to `KjTooltip` composition once the
    Tooltip primitive lands.

13. **`KjBreadcrumb` inside `<header>` — is the `<nav>` redundant?**
    Some authoring patterns nest the breadcrumb inside a
    `<header role="banner">` landmark. The `<nav>` landmark stays
    distinct (a nested landmark is fine in ARIA). The
    `aria-label="Breadcrumb"` distinguishes it from a sibling
    `<nav aria-label="Primary">`. No conflict. Documentation
    mentions this pattern as a recommended page-header
    composition.

14. **Dynamic crumbs — register / unregister churn under route
    changes.**
    A breadcrumb that updates every navigation (the
    route-tree-driven case) creates / destroys items on each
    navigation. The registered-items array signal updates each
    time, and the visible / hidden indices recompute. **Risk**:
    if Angular's hydration runs the directive's `ngOnInit` before
    `ngOnDestroy` of the previous items (common during route
    transitions with reused components), the array briefly holds
    *both* sets of items. The auto-current marking sees the wrong
    "last" item for one frame. **Mitigation**: the registration
    is keyed on the item's instance; the array is recomputed from
    the live `Set` on each registration change and sorted by
    `compareDocumentPosition`, so dead items (whose hosts are
    detached from the DOM) sort to the end and the *live* last
    item is detected correctly. Verified pattern; spec the test
    explicitly.

15. **`<a kjBreadcrumbLink>` on the *first* (home) crumb — should
    it be styled differently?**
    A common pattern in older sites is "Home" as an icon (a small
    house glyph) rather than text. The breadcrumb does not
    prescribe — the consumer projects whatever content they want.
    The `KjBreadcrumbLink`'s default size + variant + underline
    apply to icon and text alike; if the consumer wants a
    home-icon-only crumb without underline, they set
    `kjUnderline="none"` on that one cell. The accessible name
    must still describe the destination
    (`<a kjBreadcrumbLink href="/" aria-label="Home"><svg>…</svg></a>`)
    — the directive does not enforce this; documentation calls
    out the pattern.

16. **SSR + auto-current — does the SSR HTML have `aria-current`
    on the right cell?**
    The auto-current marking depends on the registered-items
    array, which materialises during view init. SSR runs view
    init synchronously, so the array is populated before the SSR
    HTML is serialised. The `aria-current="page"` is therefore on
    the right cell in the SSR HTML — no flicker on hydration.
    Verify in SSR snapshot tests.

17. **Why no `<kj-breadcrumb-trail>` convenience for the dynamic
    case?**
    Considered: a wrapper that takes a `BreadcrumbItem[]` and
    renders the entire compound shape internally, no per-cell
    authoring needed. **Rejected** because the
    `<kj-breadcrumb [kjItems]>` shape on the existing wrapper
    already handles this (item 8 in [Examples to ship](#examples-to-ship)).
    Adding a second wrapper that does the same thing under a
    different name is API sprawl. Consumers picking between
    "model-driven" and "compound" use the same component with
    different inputs; the wrapper internally branches.

18. **Per-crumb tooltip / icon — composition or first-class
    inputs?**
    A `KjBreadcrumbLink` may benefit from a per-cell tooltip
    (truncated long labels) or a leading icon (per-cell visual
    affordance). **Decision: composition only.** A consumer who
    wants a tooltip writes
    `<a kjBreadcrumbLink kjTooltip="…" href="…">…</a>` and the
    Tooltip primitive (see
    [`../feedback/tooltip.md`](../feedback/tooltip.md)) does its
    work. A consumer who wants a leading icon projects the icon
    inside the `<a>` content. The breadcrumb does not own
    `kjIcon` or `kjTooltip` inputs of its own. Same stance as
    Link.

19. **Schema.org `BreadcrumbList` microdata.**
    SEO-conscious consumers add Schema.org `BreadcrumbList`
    microdata to their breadcrumbs (`itemtype="http://schema.org/BreadcrumbList"`
    on the `<ol>`, `itemprop="itemListElement"` on each `<li>`,
    nested `itemtype="http://schema.org/ListItem"` per cell with
    `itemprop="position"` and `itemprop="item"`). The directive
    does **not** auto-generate the microdata — that is content
    territory and the consumer's SEO strategy owns it. The
    `<ol>` host accepts `itemtype` / `itemprop` attributes
    natively (Angular passes them through). Documentation calls
    out the pattern with a microdata-shaped example. Defer to
    v1.1 the question of an opt-in `kjSchemaOrg` flag that
    auto-generates the microdata; ship the manual-author path in
    v1.

20. **Styling parity with `KjList`.**
    A breadcrumb is conceptually a single-row list (`<ol>` with
    inline items). [`KjList`](../data-display/list.md) is the
    primary list primitive. **Risk**: a consumer expects a
    breadcrumb to inherit `KjList`'s row-divider / row-padding
    styling, or vice versa. **Decision: separate styling
    layers.** A breadcrumb is visually distinct from a list (no
    row dividers, inline layout, separator glyphs between cells);
    the CSS layer is independent. Documentation cross-references
    so consumers picking between "list of links" vs.
    "breadcrumb" land on the right primitive (cardinality
    distinction: list = N, breadcrumb = path of N).
