# Pagination

The row of page-number buttons and previous/next controls that
navigates a paginated dataset — the `1 2 3 … 10  Next` strip at the
foot of a table, the bottom of a search-results list, the floor of a
gallery grid. Pagination's job is to expose **a) the current page**,
**b) the total page count**, and **c) the affordances to jump to any
adjacent page, the first page, the last page, or a specific page
within a sliding window**, without forcing the consumer to compute the
sliding window themselves and without re-implementing the keyboard /
ARIA contract every place a paginated list lives.

Pagination is a **navigation primitive over data**, not a form
control. It does not own the dataset; it does not own the
page-size selector or the rows-per-page dropdown (that ships
separately, see [Open question 1](#open-questions--risks)); it does
not know how to fetch a page (the consumer's data source does that).
It owns: the list of page tokens to render (`[1, '...', 4, 5, 6, '...', 10]`),
the boundary state of the previous/next/first/last controls
(disabled when at the corresponding edge), the `aria-current="page"`
plumbing on the current page button, the live-region announcement of
the page change, and the routing-vs-button choice on each rendered
page item.

> **Not on disk yet.** No `packages/core/src/pagination/`, no
> `packages/components/src/pagination/`. This analysis specifies the
> shape before any code lands. The recommendation is **yes, ship a
> compound core directive family** — a root `KjPagination` that owns
> page state and the sliding-window calculation, plus seven child
> directives (`Item`, `Previous`, `Next`, `First`, `Last`, `Ellipsis`,
> `Info`). The case for the compound is in
> [Decision (core directive)](#decision-core-directive). Pagination
> is **not** a "useless data-attribute directive" (per
> [`rules/code_style.md`](../../../rules/code_style.md) "What NOT to
> Build") because the root genuinely owns three things no consumer
> wants to re-author per usage: the windowed page-token algorithm,
> the boundary-disabled state for previous/next/first/last, and the
> live-region announcement on page change.

For the **interactive primitives** Pagination composes, see
[`../actions/button.md`](../actions/button.md) (each rendered page
item is a `<button kjButton>` when in-page state, or a
`<a kjLink>`-styled-as-button when routing) and
[`./link.md`](./link.md) (the routing case). Pagination does not
ship its own button styling — it composes the existing primitives.
The rule lifted from
[Nielsen Norman: Buttons vs. Links](https://www.nngroup.com/articles/buttons-vs-links/):
**buttons act, links navigate**. A page button that calls
`onPageChange(3)` and re-renders the visible list in-place is a
button (no URL change). A page link that navigates to `/products?page=3`
is a link (URL change). Both shapes ship; the consumer picks the
right semantics for their app and Pagination accepts either.

For the **adjacent navigation primitives**, see:

- [`./breadcrumb.md`](./breadcrumb.md) (planned) — also a
  `<nav>`-wrapped row of `<a kjLink>` items, also marks the current
  position with `aria-current="page"`. Breadcrumb encodes
  *hierarchical position* ("Home › Products › Widgets"); Pagination
  encodes *sequential position within a homogeneous list*.
  Different intent, similar surface; they share the
  `aria-current="page"` discipline and the `<nav aria-label>`
  wrapping pattern but compose differently and ship as separate
  components.
- [`./stepper.md`](./stepper.md) (planned) — a numbered linear
  sequence visually similar to Pagination (`(1) ─ (2) ─ (3)`) but
  with fundamentally different semantics. Stepper steps are
  **states in a workflow** with completion semantics (`completed`,
  `current`, `upcoming`); Pagination items are **interchangeable
  pointers into a homogeneous dataset** (page 5 is no more "complete"
  than page 6). Stepper uses `aria-current="step"`; Pagination uses
  `aria-current="page"`. Stepper often gates forward navigation on
  validation; Pagination never does. Two components, not one.
- [`./tabs.md`](./tabs.md) (planned) — selected-one-of-many with
  persistent panels. Tabs uses `role="tablist"` /  `role="tab"` and
  a roving-tabindex keyboard model; Pagination does **not**. Each
  pagination button is its own tab stop because the user is choosing
  between actions of equal importance, not between views of a single
  panel. See [Accessibility](#accessibility-wcag-21-aaa) for the
  reasoning.
- [`../data-display/carousel.md`](../data-display/carousel.md) — the
  indicator-dots row at the bottom of a Carousel borrows the same
  visual pattern as Pagination's compact dot variant, but the
  semantics are different. Carousel indicators announce
  "slide N of M" (rotating content); Pagination indicators announce
  "page N of M" (static page selection). Carousel indicators are
  **not** focusable as a composite; Pagination items **are** each a
  tab stop. The two should not share a directive — see
  [carousel.md §27](../data-display/carousel.md).

For the **dataset being paginated**, see
[`../data-display/list.md`](../data-display/list.md) and the
[Table](../data-display/) component (planned). Pagination renders
*beneath* a List or Table; it does not own the rows. The connection
between the list and the pagination strip is the consumer's data
source — typically a signal-driven page-size + page-index pair that
the Pagination component reads and writes via `kjPage` /
`kjPageChange` (controlled mode) and the consumer's data layer
re-derives the visible rows from. See
[Examples](#examples-to-ship) §5.

## Source comparison

The reference field on Pagination is the **most splintered** of any
component covered so far. Each of the three references picks a
different dial setting on every concern: PrimeNG ships a heavyweight
all-in-one paginator that doubles as a page-size selector and a
jump-to-page input; Angular Material ships a paginator that is *only*
the page-size + previous/next + "1–10 of 247" status row, no page
buttons at all; shadcn/ui ships a compound primitive with no state
at all (the consumer wires every input and output). Three philosophies,
three APIs. We pick a fourth: shadcn-style compound (the consumer
keeps control), kouji-style core (the windowed-page algorithm and the
ARIA wiring live in core where they can be share-once-implement-many),
plus a wrapper that exposes the most common composition as a
single-component shorthand for the 80% case.

| Concern | PrimeNG `p-paginator` | Angular Material `mat-paginator` | shadcn/ui `Pagination` |
|---|---|---|---|
| Primary surface | One component (`<p-paginator>`) with a configurable `template` slot describing which sub-elements to render and in what order (`'FirstPageLink CurrentPageReport PageLinks JumpToPageDropdown LastPageLink RowsPerPageDropdown'`) | One component (`<mat-paginator>`); fixed layout with `pageSize`, `pageSizeOptions`, prev/next, "N – M of T" status; **no page buttons at all** | Compound primitives (`<Pagination>`, `<PaginationContent>`, `<PaginationItem>`, `<PaginationLink>`, `<PaginationPrevious>`, `<PaginationNext>`, `<PaginationEllipsis>`); the consumer hand-renders the page list, computes the window, and wires every click |
| Element / role | `<div role="navigation">` (sic — the role is `navigation`, not the landmark `<nav>` element) | `<div>` with no landmark role | `<nav role="navigation" aria-label="pagination">` wrapping a `<ul>` of `<li>` items |
| Page buttons | Auto-rendered from `numberOfPages = Math.ceil(totalRecords / rows)`. `numberOfPageLinks` (default 5) caps how many page buttons render at once; the implementation slides the visible window around the current page but **does not insert ellipses** — when there are 100 pages it still only ever shows 5 numeric buttons (e.g. `[3,4,5,6,7]`), with no `…` and no first/last anchor. The first / last are reachable via dedicated First / Last icons or by typing into the JumpToPage dropdown | **None.** Material's paginator does not render numeric page buttons at all — only `<<` / `<` / `>` / `>>` icon buttons (and only `<` / `>` if `showFirstLastButtons` is false, default) plus the rows-per-page dropdown and the status text | Consumer-rendered. The recipe in shadcn's docs shows a hand-coded `[1, '…', 4, 5, 6, '…', 10]` template; the library ships no algorithm and no ellipsis logic — `<PaginationEllipsis>` is just a styled `…` glyph the consumer drops in |
| Sliding-window algorithm | `numberOfPageLinks` cap, no ellipsis, no boundary anchors | n/a (no buttons) | n/a (consumer's job) |
| First / Last | Icon buttons (`«` / `»`); shown when `showFirstLastIcon: boolean` | Icon buttons; shown when `showFirstLastButtons: boolean` (default `false`) | n/a — consumer composes |
| Previous / Next | Icon buttons (`‹` / `›`) | Icon buttons; the only "always visible" controls | `<PaginationPrevious>` / `<PaginationNext>` styled link/button primitives |
| Ellipsis (`…`) | **None.** The window slides without any "…" indicator | n/a | `<PaginationEllipsis>` — a styled `<span>` with `aria-hidden="true"` and a visually-hidden "More pages" label |
| Page size selector | Built-in (`rowsPerPageOptions: [10, 20, 30]`) | Built-in (`pageSizeOptions: [5, 10, 25, 100]`); the canonical Material paginator surface | **Not part of Pagination.** Consumer composes a Select if they want it |
| Jump-to-page | Built-in dropdown of page numbers | None | None |
| Current-page indicator | `aria-current="page"` on the active page button; visually styled via `.p-paginator-page-selected` | n/a (no buttons) | `<PaginationLink isActive>` sets `aria-current="page"` and a CSS variant |
| Live region | `<span class="p-sr-only">` updated to "Page N" — `aria-live` not explicitly set; Angular's default `aria-live` is unset, so the announcement is **not** read by AT in PrimeNG's current implementation (this is a [known issue](https://github.com/primefaces/primeng/issues)) | `<div aria-live="polite" class="cdk-visually-hidden">` updated to the localised range string ("Page 2 of 10") on every `pageChange` — works correctly | None — consumer's job |
| Routing variant | None — page buttons are always `<button>` with a click handler; consumer wires `(onPageChange)` to a router navigation | None | The `<PaginationLink>` is rendered as `<a href>` by default; consumer can swap to `<button>` via `asChild` (Radix Slot) |
| Keyboard | Tab through the buttons; no arrow-key roving (each button is its own tab stop) | Tab through the buttons | Tab through the buttons |
| Disabled at boundaries | Previous / First disabled at page 1; Next / Last disabled at last page | Previous disabled at page 0; Next disabled at last page | **Not built-in** — consumer must wire `aria-disabled` on `<PaginationPrevious>` / `<PaginationNext>` themselves |
| `prefers-reduced-motion` | n/a (no animations) | n/a | n/a |
| Localisation | Per-instance `locale` input plus a `pageReportTemplate` string with `{currentPage} {totalPages} {first} {last} {totalRecords}` placeholders | `MatPaginatorIntl` injectable with translatable strings (`itemsPerPageLabel`, `nextPageLabel`, `previousPageLabel`, `getRangeLabel`) | Strings are baked into the consumer's recipe — i18n is the consumer's job |
| Dependencies | None | CDK (focus monitoring) | Radix Slot (for `<PaginationLink asChild>`) |

**Read-off.**

- **Three philosophies, three different products.** PrimeNG is the
  "kitchen sink" — one component bundling pagination + page-size +
  jump-to-page into a single configurable surface. Material is the
  "minimal data-table footer" — page-size + status + prev/next, no
  numeric buttons, the canonical "next 10 / previous 10" model.
  shadcn is the "headless compound" — every piece is a primitive,
  the consumer assembles. We pick **shadcn's compound shape** for
  the API (composability, separation of concerns, consumers who only
  want the numeric strip don't get a page-size dropdown they didn't
  ask for) but with **the kouji core directive layer doing the work**
  the shadcn recipe leaves to the consumer (sliding-window
  calculation, boundary-disabled state, live-region announcement,
  ARIA wiring).
- **PrimeNG's missing ellipsis is a real gap.** With 100 pages and a
  5-button window, PrimeNG's paginator shows `[3,4,5,6,7]` with no
  indication that pages 1, 2 and 8–100 also exist. The user has to
  click the `»` (Last) icon, which is not always shown, or type
  into the JumpToPage dropdown, which is also not always shown. The
  ellipsis with boundary anchors (`[1, '…', 4, 5, 6, '…', 10]`) is
  the discoverability fix and ships standard in our design.
- **Material's "no page buttons" is a defensible philosophy but loses
  one real feature.** Material's stance is that for large datasets,
  numeric page buttons are anti-pattern (the user doesn't think in
  page numbers; they think in records — "show me the next 25").
  That is true for some data tables. It is not true for search
  results, gallery grids, or anywhere the user does want to skim
  to "around page 7" — which is most of the web. We ship numeric
  buttons; consumers who want a Material-style "next/previous + status"
  paginator can compose `<KjPaginationPrevious>`, `<KjPaginationNext>`,
  and `<KjPaginationInfo>` without rendering any `<KjPaginationItem>`
  (the items are opt-in via the consumer's `@for` over the page
  tokens). The page-size dropdown is **not** Pagination's job — that
  is a separate component (a Select with rows-per-page options).
  See [Open question 1](#open-questions--risks).
- **shadcn's "consumer hand-codes the window" is too low-level.**
  Every consumer who reaches for shadcn's Pagination ends up writing
  a `usePagination` hook that produces `[1, '…', 4, 5, 6, '…', 10]`
  from `(currentPage, totalPages, siblingCount, boundaryCount)`. We
  ship that hook — as a `kjPages` computed signal on the root
  directive — so the consumer's `@for` template is the only place
  they write the rendering, not the calculation.

The split kouji is converging on:

| Surface | Selector | Job |
|---|---|---|
| **Core root directive** | `[kjPagination]` | Owns the page-state model (`kjPage`, `kjTotalPages`, `kjPageSize`), the sliding-window calculation (`kjSiblingCount`, `kjBoundaryCount`), the `pages: Signal<KjPageToken[]>` computed, the boundary-state computeds (`isFirstPage`, `isLastPage`), the page-change live-region announcement, the `<nav>` host element with `aria-label="Pagination"`, and provides `KJ_PAGINATION` context to children. |
| **Core child directives** | `[kjPaginationItem]` (page button), `[kjPaginationPrevious]`, `[kjPaginationNext]`, `[kjPaginationFirst]`, `[kjPaginationLast]`, `[kjPaginationEllipsis]`, `[kjPaginationInfo]` | Each child injects `KJ_PAGINATION` and binds the appropriate ARIA + click semantics. Children are **stateless reflectors of the root's state** — the boundary-disabled state lives on the root, the children just bind to it. |
| **Wrapper component** | `<kj-pagination>` | Renders the canonical layout (`First Prev 1 … 4 5 6 … 10 Next Last`) over the root's `pages` computed, exposes every input/output the directive does, and projects optional `<kj-pagination-info>` content. Useful for the 80% case where the consumer doesn't need to hand-author the layout. |
| **CSS layer** | `.kj-pagination`, `.kj-pagination-item[data-current="true"]`, `.kj-pagination-item[data-disabled]`, `.kj-pagination-ellipsis` | Lives in `packages/components/src/pagination/pagination.css`. Reads from the same data attributes the directives reflect. |

Two consumer paths, one state engine. The compound directives
expose every piece for hand-authoring; the wrapper exposes one input
shape for the common case. Same pattern as Accordion's
`<kj-accordion>` wrapper-over-`KjAccordion`-family.

## Decision (core directive)

**Yes — and this is one of the clearer compound-directive cases on
the roadmap.** The root earns its keep on three pieces of behaviour
no consumer should re-author:

1. **The windowed page-token algorithm.** Given
   `(currentPage, totalPages, siblingCount, boundaryCount)`, produce
   the array `[1, '…', 4, 5, 6, '…', 10]` of stable tokens that drives
   the rendered list. The algorithm has six edge cases that are
   easy to get wrong: small `totalPages` (no ellipsis at all),
   current page near the start (only the right ellipsis appears),
   current page near the end (only the left ellipsis appears),
   the "siblings overlap with boundaries" case (no ellipsis on that
   side), the `siblingCount = 0` degenerate case, and the
   `totalPages = 0` empty-dataset case. The algorithm is ~30 lines
   of TypeScript but it is wrong-by-default in nearly every
   hand-written attempt; we own it once and the wrappers / consumers
   just iterate.

2. **The boundary-disabled state machine.** Previous and First
   should be `aria-disabled` on page 1; Next and Last on the last
   page. The state is derived from `(kjPage, kjTotalPages)` and is
   reflected onto the children via the `KJ_PAGINATION` context. A
   consumer hand-wiring this on every paginator instance gets one
   of three things wrong: forgets the disabled state entirely
   (Next still navigates to page 11 of 10), forgets the
   capture-phase click suppression (the `aria-disabled` is announced
   but the click still fires), or forgets to disable the underlying
   button so the focus ring keeps appearing on a non-actionable
   control. The directive ships all three pieces — see
   [Accessibility](#accessibility-wcag-21-aaa).

3. **The page-change live-region announcement.** When `kjPage`
   changes, AT users need to hear "Page 5 of 10" (or the localised
   equivalent) without the focus moving away from the just-clicked
   button. The root directive owns a single `KjLiveRegion`
   composition that announces the new page on every change. A
   consumer hand-authoring this typically forgets the live region
   entirely (the AT user clicks "Next" and hears nothing) or wires
   it as `aria-live="assertive"`, which interrupts whatever the AT
   was reading at the moment of the click. The default is `polite`
   and the announcement template is configurable.

The directive is **medium-weight** — root is ~120 lines (the page
algorithm, the boundary computeds, the live-region wiring, the
context provision); each child is ~20–40 lines (input forwarding,
ARIA reflection, click handler). It is **stateful** — `kjPage` is a
`model<number>` (two-way binding for the controlled-mode common
case); `kjTotalPages` is an `input<number>`. It is **not a useless
data-attribute directive** because the page algorithm and the
boundary state machine are real, error-prone work.

### Why a compound (seven children) and not one big component?

Considered: a single `<kj-pagination [page] [totalPages] [siblingCount]>`
with no children, rendering everything internally and exposing only
the inputs/outputs. Rejected because:

- **The Material vs. shadcn split shows there is no single right
  layout.** Material wants `Prev "Page 2 of 10" Next`; PrimeNG wants
  `« ‹ 1 … 4 5 6 … 10 › »`; many product surfaces want only
  `‹ 1 2 3 … 10 ›` with no first/last; some want the dot variant
  carousel-style (each page is a small dot with no number). A
  single-component API would have to ship a flag for each variant
  (`showFirstLast`, `showInfo`, `showEllipsis`, `dotVariant`,
  `infoTemplate`, …), which is the Material `MatPaginator` API
  shape — and Material's API is the canonical example of "we boxed
  ourselves in". The compound approach lets the consumer pick the
  pieces they want.
- **The routing variant requires per-item template control.** A page
  item that should be `<a kjLink routerLink="/products" [queryParams]="{ page: 3 }">`
  cannot be rendered by a closed component without an `@if` /
  `<ng-template>`-based "asChild" mechanism. With a compound, the
  consumer writes their own `<a>` or `<button>` inside the
  `[kjPaginationItem]` directive's host, and the directive
  contributes the ARIA + click + `data-current` semantics; the tag
  is the consumer's choice.
- **Compound matches the rest of the navigation family.** Breadcrumb,
  Tabs, Stepper, Menu — every other navigation primitive in kouji
  is compound. Pagination would be the odd one out as a
  monolith. The wrapper component (`<kj-pagination>`) is the
  one-input-shape escape hatch for consumers who want the closed
  experience.

The compound is the canonical surface. The wrapper is the
shorthand.

### Why "controlled is canonical" — uncontrolled is not shipped

Considered: an uncontrolled mode where the directive owns `kjPage`
internally and the consumer reads it via output only. Rejected on
Angular-idiom grounds:

- **Angular forms idiom is two-way binding.** `[(ngModel)]` on inputs,
  `[(value)]` on selects — the consumer holds the source of truth
  and binds it to the directive. Two-way binding via `model<number>`
  is the modern equivalent and gives both modes for free: the
  consumer writes `[(kjPage)]="page" [kjTotalPages]="totalPages"` and
  has both read and write; or `[kjPage]="page() (kjPageChange)="setPage($event)"`
  for the explicit-handler shape; or just `[kjPage]="initialPage"`
  with no write-back for "read-once initial" (rare).
- **Uncontrolled mode loses the URL-as-state pattern.** In real
  applications the page index is typically a URL query parameter
  (`?page=3`). The component cannot own the URL; the router does.
  Forcing the directive to own `kjPage` internally would make the
  URL-driven case awkward (the consumer would have to call an
  imperative method to sync). Two-way binding lets the consumer's
  signal *be* the URL-derived value, and the directive observes /
  writes through.
- **Uncontrolled mode adds API surface for no real saving.** The
  consumer who wants "no boilerplate" reaches for the wrapper
  `<kj-pagination>` and binds two inputs (`kjPage`, `kjTotalPages`).
  That is already minimal. Shipping a third "uncontrolled" mode for
  the consumer who wants to bind only `kjTotalPages` and have the
  component manage `kjPage` internally adds a state-ownership
  ambiguity (which signal wins on initial render?) for a one-line
  saving.

The directive ships **controlled only**, via `model<number>`. The
two-way `[(kjPage)]` shape is the canonical surface; the explicit
`[kjPage]` + `(kjPageChange)` decomposition is the Angular-standard
fallback for consumers who prefer the explicit shape.

### Why not just use Button + a manual `@for`?

A consumer-side pattern was considered: the consumer writes
`<nav aria-label="Pagination">` with their own `@for` over a page
array, each item a `<button kjButton>`. That works for the trivial
case but loses three things:

- **The page algorithm.** Hand-written, error-prone, and re-authored
  on every consuming page. See [Decision §1](#decision-core-directive).
- **The boundary state.** The consumer has to compute `disabled =
  page() === 1` on Previous and `disabled = page() === totalPages()`
  on Next, which is fine until they also need it on First and Last,
  and then they forget to disable First when `page() === 1` (which
  is the same condition as Previous-disabled but easy to miss as a
  separate check).
- **The `aria-current="page"` plumbing.** Hand-written on every
  iteration of the `@for`. A directive contributes this attribute
  derived from a single source-of-truth signal.

The directive is the share-once-implement-many; the consumer-side
hand-roll is the "five lines on every page that all do the same
thing" that the directive prevents.

### Class naming

Per [`CLAUDE.md`](../../../CLAUDE.md), drop the Angular type suffix
unless there is a collision. The primary directives are `KjPagination`,
`KjPaginationItem`, `KjPaginationPrevious`, `KjPaginationNext`,
`KjPaginationFirst`, `KjPaginationLast`, `KjPaginationEllipsis`,
`KjPaginationInfo` (file: `pagination.ts`, `pagination-item.ts`, …
under `packages/core/src/pagination/`). The wrapper is
`KjPaginationComponent` (file: `pagination.ts` under
`packages/components/src/pagination/`) — same suffix-collision pattern
Button uses. Configuration token is `KJ_PAGINATION_CONFIG`; default
factory is `KJ_PAGINATION_DEFAULTS`. Context token is
`KJ_PAGINATION` (typed `KjPaginationContext`).

## What exists today

Nothing on disk. No `packages/core/src/pagination/`, no
`packages/components/src/pagination/`. The CSS layer does not
declare `--kj-pagination-item-bg-current` or
`--kj-pagination-ellipsis-color` tokens; those need to be added
alongside the directive's first PR. The `KjLiveRegion` primitive
that the root composes for the page-change announcement already
exists at `packages/core/src/a11y/live-region/`.

The expected build order:

1. Add `--kj-pagination-item-bg`, `--kj-pagination-item-bg-hover`,
   `--kj-pagination-item-bg-current`, `--kj-pagination-item-fg`,
   `--kj-pagination-item-fg-current`, `--kj-pagination-ellipsis-color`
   to the theme layer (`packages/components/src/styles/tokens.css`).
   Verify AAA contrast against `base-100` / `base-200` / `base-300`
   in light / dark / high-contrast — see
   [Accessibility](#accessibility-wcag-21-aaa).
2. Ship `KjPagination` core root + `KJ_PAGINATION` context +
   `KJ_PAGINATION_CONFIG` / `provideKjPagination` per the
   bind-presets pattern (`packages/core/src/pagination/`).
3. Ship the seven child directives (`pagination-item.ts`,
   `pagination-previous.ts`, `pagination-next.ts`,
   `pagination-first.ts`, `pagination-last.ts`,
   `pagination-ellipsis.ts`, `pagination-info.ts`).
4. Ship `KjPaginationComponent` wrapper + CSS layer
   (`packages/components/src/pagination/`).
5. Cross-link to Button (each item is `<button kjButton>` /
   `<a kjLink>`) and to List / Table (the dataset being paginated).
6. Migrate any in-flight Table or Data-grid analyses to compose
   `KjPagination` for their footer.

## Base features

| Feature | Where it lives | Notes |
|---|---|---|
| Two-way page binding | `kjPage: model<number>` on root | Canonical surface — `[(kjPage)]="page" [kjTotalPages]="totalPages"`. Page numbers are **1-indexed** (matches the rendered UI; matches PrimeNG and shadcn; only Material is 0-indexed and we deliberately diverge — see [Open question 5](#open-questions--risks)). Pages outside `[1, totalPages]` are clamped on write; clamping triggers a console warning in dev mode. |
| Total page count | `kjTotalPages: input.required<number>` on root | Required. Consumer computes from `Math.ceil(totalRecords / pageSize)`; Pagination does not own page-size or record count. `totalPages = 0` is a valid state (empty dataset) — renders no items, all controls disabled. |
| Sibling count | `kjSiblingCount: input<number>(1)` on root | Pages adjacent to the current page on each side. Default 1 → window includes `[current-1, current, current+1]`. Setting 2 yields `[current-2, current-1, current, current+1, current+2]`. Setting 0 yields `[current]` only (still a valid mode — small viewports). |
| Boundary count | `kjBoundaryCount: input<number>(1)` on root | Pages anchored at the start and end. Default 1 → `[1]` and `[totalPages]` are always visible. Setting 0 yields no boundary anchors (rare; the first/last anchors disappear and the ellipsis becomes the only signal that more pages exist). Setting 2 yields `[1,2]` and `[totalPages-1, totalPages]`. |
| Page tokens | `pages: Signal<readonly KjPageToken[]>` computed on root | The output of the windowed-page algorithm. `KjPageToken = number \| 'ellipsis-left' \| 'ellipsis-right'`. The two ellipsis variants are distinct so the rendered DOM can carry stable keys (`@for (token of pages(); track token)`); a consumer who only cares about presence can `pages().includes('ellipsis-left')`. The token list always starts with `1` (when `boundaryCount ≥ 1`), always ends with `totalPages`, and the middle window is centered on `kjPage()` per the algorithm in [Page-token algorithm](#page-token-algorithm). |
| Boundary state computeds | `isFirstPage: Signal<boolean>`, `isLastPage: Signal<boolean>` on root | Read by Previous/First children (disabled when `isFirstPage()`) and Next/Last children (disabled when `isLastPage()`). Also `true` when `kjTotalPages() === 0`. |
| Page-change output | `kjPageChange: output<number>` on root | Fires when `kjPage` changes — model output. Two-way binding handles the most common case; consumers who want explicit-handler shape bind `(kjPageChange)`. |
| Page-change live region | `KjLiveRegion` host directive on root, `polite` | On every `kjPage()` change, announces the configured template (`'Page {{ page }} of {{ totalPages }}'` by default, configurable via `KJ_PAGINATION_CONFIG.pageChangeAnnouncement`). The live region is shared across the whole pagination instance, not per item. |
| Variants (preset, configurable) | `KJ_PAGINATION_CONFIG.variants` via `KjVariant` host directive on **each** of `KjPaginationItem`, `KjPaginationPrevious`, `KjPaginationNext`, `KjPaginationFirst`, `KjPaginationLast` | Default list: `'default' \| 'outline' \| 'ghost'`. The variant lives on the items, not the root — consistent with how Button's variant works. The root's `kjVariant` input cascades via context to children that did not set their own (consumer convenience for "all my buttons should be `outline`"). |
| Sizes (preset, configurable) | `KJ_PAGINATION_CONFIG.sizes` via `KjSize` host directive on each child item | Default list: `'sm' \| 'md' \| 'lg'`. Same cascade-from-root pattern as variants. |
| Item element flexibility | Each child directive attaches to either `<button>` or `<a>` | `<button kjPaginationItem [kjPage]="3">` for the in-page-state case; `<a kjPaginationItem [kjPage]="3" [routerLink]="['/products']" [queryParams]="{ page: 3 }">` for the routing case. The directive contributes the ARIA + `data-current` semantics regardless of tag; the consumer picks the navigation strategy. See [Examples §6](#examples-to-ship). |
| Current-page indicator | `[attr.aria-current]` on each item, set to `'page'` when the item's page matches `kjPage()` | Per [WAI-ARIA APG: aria-current](https://www.w3.org/TR/wai-aria-1.2/#aria-current). The active item also gets `data-current="true"` for CSS styling. |
| First / Last visibility | Not a flag on the root — composition | Consumers who want first/last buttons drop in `<button kjPaginationFirst>` / `<button kjPaginationLast>`. Consumers who don't, don't. The wrapper component exposes a `kjShowFirstLast: input<boolean>(true)` shorthand for the closed-component case. |
| Ellipsis rendering | Each `'ellipsis-left'` / `'ellipsis-right'` token in `pages()` is a `<span kjPaginationEllipsis>` | The directive sets `aria-hidden="true"` on the host span (the ellipsis is a visual indicator only) and adds a visually-hidden `<span>` reading "More pages" via the `KjVisuallyHidden` primitive (matches shadcn's pattern, satisfies WCAG 1.3.1 — the ellipsis carries information, so it must have a text equivalent for AT). |
| Info text | `<kj-pagination-info>` projection slot or `[kjPaginationInfo]` directive on a `<span>` | Renders the localised "Page N of M" string. The directive owns the formatting (configurable via `KJ_PAGINATION_CONFIG.infoTemplate`); the consumer projects it where they want it. **Lives in the same `<nav>`** as the buttons — the info text is part of the pagination region. AT-readable by default (the directive does not set `aria-hidden`), so AT users hear "Pagination, Page 2 of 10" when they enter the region. |
| Disabled state per item | `kjDisabled: input<boolean>(false)` on each child | Composed `KjDisabled`. Used by Previous/Next/First/Last children automatically (boundary-derived); also available manually on `KjPaginationItem` for consumers who want to disable specific page buttons (rare — typically a "this page is loading and cannot be re-clicked" affordance). |
| `routerLink` composition | Native — no special handling | `<a kjPaginationItem routerLink="/products" [queryParams]="{ page: 3 }">` works because `routerLink` is itself a directive on the same `<a>`. The `KjPaginationItem` directive's click handler does **not** call `event.preventDefault()` when the host is an `<a>` — the natural behaviour is to let the router navigate, then the directive's `kjPageChange` output fires from the `model` write. See the [routing example](#examples-to-ship) §6. |
| Variant composition with Button | Each child directive's host element is **not** `<button kjButton>` — it has its own variant/size composition | The directives **do not** depend on `KjButton` — they compose `KjVariant` + `KjSize` + `KjFocusRing` directly so the consumer can wear them on `<a>` without picking up Button's button-shaped chrome. The wrapper component renders `<button kjButton>` underneath and gets Button's chrome via that path; the headless directives are tag-agnostic. |
| Empty-dataset state | `kjTotalPages() === 0` → `pages()` returns `[]`, all controls `aria-disabled` | Renders the `<nav>` shell with no items and disabled prev/next. Consumers who want to hide Pagination entirely on empty datasets do so in their own template (`@if (totalPages() > 0)`). |
| Single-page state | `kjTotalPages() === 1` → `pages()` returns `[1]`, all controls except the active item `aria-disabled` | Renders the single page button (currently selected) with prev/next/first/last all disabled. Consumers may hide Pagination on single-page (common); the directive does not make that choice. |
| Page-size selector | **Not Pagination's job.** | A separate `<kj-select>` of rows-per-page options that the consumer composes alongside Pagination. Pagination reads `kjTotalPages` only; it does not own the page-size signal or the record-count signal. See [Open question 1](#open-questions--risks) for the reasoning and [Examples §7](#examples-to-ship) for the composition. |
| Jump-to-page input | **Not Pagination's job in v1.** | PrimeNG ships this; few real apps use it. Defer to v1.1 if user-feedback shows the gap; not blocking v1. See [Open question 2](#open-questions--risks). |

### Page-token algorithm

The core's `pages` computed runs the following algorithm on every
change of `kjPage`, `kjTotalPages`, `kjSiblingCount`, or
`kjBoundaryCount`:

```ts
function computePageTokens(
  current: number,
  total: number,
  siblings: number,
  boundary: number,
): readonly KjPageToken[] {
  if (total <= 0) return [];

  // Total pages renderable without ellipses: boundary + 1 + (sibling*2 + 1) + 1 + boundary
  // i.e. [1..boundary] + leftEllipsis + [current-sibling..current+sibling] + rightEllipsis + [total-boundary+1..total]
  const totalNumbers = boundary * 2 + siblings * 2 + 3;

  if (totalNumbers >= total) {
    // No ellipses needed — render every page.
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(current - siblings, boundary + 2);
  const rightSiblingIndex = Math.min(current + siblings, total - boundary - 1);
  const showLeftEllipsis = leftSiblingIndex > boundary + 2;
  const showRightEllipsis = rightSiblingIndex < total - boundary - 1;

  const tokens: KjPageToken[] = [];

  // Left boundary.
  for (let i = 1; i <= boundary; i++) tokens.push(i);

  if (!showLeftEllipsis) {
    // Sibling window meets the boundary — fill the gap with numbers.
    for (let i = boundary + 1; i < leftSiblingIndex; i++) tokens.push(i);
  } else {
    tokens.push('ellipsis-left');
  }

  // Sibling window.
  for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) tokens.push(i);

  if (!showRightEllipsis) {
    for (let i = rightSiblingIndex + 1; i < total - boundary + 1; i++) tokens.push(i);
  } else {
    tokens.push('ellipsis-right');
  }

  // Right boundary.
  for (let i = total - boundary + 1; i <= total; i++) tokens.push(i);

  return tokens;
}
```

Six edge cases the algorithm handles correctly, each with a unit
test:

1. `total <= 0` → empty array (empty-dataset state).
2. `totalNumbers >= total` → all pages, no ellipsis (small datasets).
3. `current` near 1 (e.g. `current=2, total=10, siblings=1, boundary=1`)
   → `[1, 2, 3, 'ellipsis-right', 10]` — only the right ellipsis.
4. `current` near `total` → only the left ellipsis (mirror case).
5. `current` in the middle → both ellipses.
6. `siblings=0, boundary=0` (degenerate) → produces `[current]` plus
   ellipses on each side if `total > 1`. Documented in the
   directive's TSDoc as supported but rare.

Cases 3–5 are tested at every `total` from 7 to 11 and at every
`current` from 1 to `total` to catch the off-by-one on the
"sibling window meets boundary" condition.

## Accessibility (WCAG 2.1 AAA)

Reference: [WAI-ARIA APG — disclosure / navigation patterns](https://www.w3.org/WAI/ARIA/apg/patterns/),
[ARIA in HTML §`<nav>`](https://www.w3.org/TR/html-aria/#el-nav),
[WAI-ARIA: aria-current](https://www.w3.org/TR/wai-aria-1.2/#aria-current),
[WAI-ARIA: aria-label](https://www.w3.org/TR/wai-aria-1.2/#aria-label).
There is no APG pattern named "pagination" specifically; the
authoritative shape is "a `<nav>` landmark with a labelled name,
containing a list of links/buttons, with the current location marked
via `aria-current='page'`" — this is the same pattern WAI-ARIA APG
recommends for [breadcrumbs](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/),
applied to a sequential rather than hierarchical position.

| Criterion | Requirement | Where it lives |
|---|---|---|
| 1.3.1 Info & Relationships | The pagination region is programmatically distinct from surrounding content. The current page is programmatically distinct from the other page items. | `<nav aria-label="Pagination">` host on `KjPagination` provides the landmark. `aria-current="page"` on the active `KjPaginationItem` provides the current-page distinction. The ellipsis carries information ("more pages exist here") — the visually-hidden "More pages" text fulfils the text-equivalent requirement. |
| 1.4.1 Use of Colour (AA) | The current page is distinguishable from other pages by **more than colour alone**. | The active item gets `aria-current="page"` (programmatic), `data-current="true"` (CSS hook), and CSS-layer styling that combines a colour change with **bold text and a background fill** so colour-blind users see the bold + fill, not just the colour. Verified in greyscale and Deuteranopia simulators. |
| 1.4.3 Contrast (AA) / 1.4.6 Contrast (AAA) | Page button text colour against background ≥ 4.5:1 (AA) / ≥ 7:1 (AAA). Disabled buttons keep ≥ 3:1 (the WCAG-permitted relaxation for disabled controls — but kouji aims AAA so we hold to ≥ 4.5:1 on disabled). | Theme tokens: `--kj-pagination-item-fg`, `--kj-pagination-item-fg-current`, `--kj-pagination-item-fg-disabled`. Verify ≥ 7:1 in light/dark/high-contrast × `base-100`/`base-200`/`base-300`. The `outline` variant against `base-100` is the contrast-risk shape — see [Open question 3](#open-questions--risks). |
| 1.4.11 Non-text Contrast (AA) | Focus ring ≥ 3:1; the active-page background ≥ 3:1 against the inactive-page background; the boundary between adjacent buttons ≥ 3:1 (or non-existent — buttons adjacent without a visible boundary is fine). | Theme tokens for the focus ring (composed `KjFocusRing` on each item); `--kj-pagination-item-bg-current` against `--kj-pagination-item-bg` ≥ 3:1. The "no boundary between buttons" approach is the kouji default — buttons are visually distinct via hover/focus/current states, not by a divider. |
| 1.4.13 Content on Hover or Focus (AA) | Hover/focus reveals (active state, focus ring) are dismissible, hoverable, persistent. | All hover/focus reveals are native CSS pseudo-class states. 1.4.13 cleared. |
| 2.1.1 Keyboard / 2.1.2 No Keyboard Trap | Every interactive element reachable + activatable via keyboard. | Native `<button>` and `<a>` are keyboard-reachable by default. Tab moves between buttons (each is a tab stop). Enter / Space activates each button. **No roving tabindex** — see the rationale below. |
| 2.4.1 Bypass Blocks | The pagination region has a landmark role so it can be skipped. | `<nav aria-label="Pagination">` is a landmark; AT users can skip the entire region via landmark navigation (NVDA `D` key, JAWS `R`, VoiceOver rotor). The `aria-label` is the accessible name for the landmark — important when the page has multiple `<nav>` landmarks (typical: top-nav, breadcrumb, pagination). Each must have a distinct `aria-label`. |
| 2.4.4 Link Purpose (In Context, AA) / 2.4.9 Link Purpose (Link Only, AAA) | Each pagination item's accessible name describes its destination. | Page buttons: text content is the page number ("3"), and the directive **augments** with a visually-hidden suffix `Page 3` so the link reads "Page 3" not just "3" (otherwise AT users hear "3" with no context). The suffix lives in a `KjVisuallyHidden` `<span>` appended by the directive. Previous / Next / First / Last: the directive sets `aria-label` to "Previous page" / "Next page" / "First page" / "Last page" (configurable via `KJ_PAGINATION_CONFIG`); the visible content is the icon, marked `aria-hidden="true"`. |
| 2.4.6 Headings and Labels (AA) | The `<nav>` has a label. | `aria-label="Pagination"` on the host (configurable via `KJ_PAGINATION_CONFIG.navigationLabel` for i18n). |
| 2.4.7 Focus Visible (AA) | Visible focus indicator on each item on `:focus-visible`. | Composed `KjFocusRing` on each child directive. CSS layer paints the ring. |
| 2.4.13 Focus Appearance (WCAG 2.2 AAA) | Focus indicator ≥ 2px thick, ≥ 3:1 contrast against adjacent and unfocused colours. | Components-package CSS uses `outline: 2px solid var(--kj-focus-ring); outline-offset: 2px` — verified against pagination button text and against the active-page background fill. |
| 2.5.5 Target Size (AAA) | Each button ≥ 44×44 CSS px. | Components-package CSS sets `min-width: 2.75rem; min-height: 2.75rem` (44px) on every `.kj-pagination-item`, `.kj-pagination-previous`, etc. **Including** the active state (don't shrink the active page). The ellipsis spans are not interactive, so the target-size requirement does not apply. |
| 2.5.8 Target Size (Minimum, AA) | 24×24 fallback. | Inherent — `sm` size still meets 24×24, though we hold to 44×44 for AAA. |
| 3.2.5 Change on Request (AAA) | Page changes are user-initiated; no automatic page advance. | Pagination never auto-advances. Every page change fires from a user click on Previous / Next / First / Last / Item. (Consumers may write code that sets `kjPage` programmatically — e.g. a "go to error page" button — but Pagination itself does not auto-change.) |
| 3.3.5 Help (AAA) | The pagination's purpose is discoverable. | The `aria-label="Pagination"` on the `<nav>` is the discovery primitive; the optional `<kj-pagination-info>` "Page N of M" provides the contextual help. |
| 4.1.2 Name, Role, Value | Each item has role `link` (when an `<a>`) or `button` (when a `<button>`). The `<nav>` has role `navigation` (implicit). The active item has `aria-current="page"`. | Native roles plus the directive's `aria-current` reflection. The directive does not override role. |
| 4.1.3 Status Messages (AA) | Page changes are announced to AT without focus moving. | `KjLiveRegion` on the root, `polite`, fires the configured template (`'Page {{ page }} of {{ totalPages }}'`) on every `kjPage()` change. The live region announcement is **separate** from the focused item's accessible name — the user clicks "5", focus stays on the "5" button, and AT reads first the focus change ("Page 5, current page, button"), then the live region ("Page 5 of 10"). The two announcements are slightly redundant but the redundancy is meaningful: focus-change announcements are tied to focus and skipped if focus jumps elsewhere; live-region announcements are tied to the page state and survive focus changes. See [Open question 4](#open-questions--risks) for the polite-vs-assertive choice. |

### Why no roving tabindex

Tabs and Listbox use a **roving tabindex** pattern: only one item in
the set has `tabindex="0"`, the rest have `tabindex="-1"`, and arrow
keys move focus within the set. That pattern is correct for **set
selection** — `role="tablist"` / `role="tab"` semantics, where the
user picks among mutually exclusive views.

Pagination is **not** set selection. Each pagination button is an
independent control: "go to page 3", "go to next page", "go to first
page". The user does not select a page in the same sense they select
a tab; they trigger a navigation. The relevant analogue is a row of
toolbar buttons, not a tab list. Per
[WAI-ARIA APG: Toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/),
toolbars use roving tabindex, but
[WAI-ARIA APG: Breadcrumb](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/)
(the closest formal analogue) uses **standard tab navigation** —
each crumb is its own tab stop. Pagination follows breadcrumb's
pattern: each button is a tab stop, no arrow-key navigation, no
roving tabindex.

The cost is one Tab keystroke per button, which can feel slow on
a 10-button paginator. The mitigation is the landmark — AT users
who don't want to traverse the buttons individually skip the whole
`<nav>` via landmark navigation. Sighted keyboard users who want to
jump to a specific page tab into the pagination, then arrow-key
through? **They don't.** The expected sighted-keyboard interaction
is Tab to "Next" or to the specific page they want; the buttons are
laid out in DOM order so the Tab traversal matches the visual order.
This was verified against PrimeNG, Material, and shadcn — none of
the three implements roving tabindex for Pagination, and the
WAI-ARIA APG Breadcrumb pattern (closest formal precedent) does not
either.

If a consumer specifically wants arrow-key navigation, they can
compose `KjRovingTabindex` on the host `<nav>` themselves. The
default does not.

### Disabled-state AT story

When the user is on page 1, Previous and First should announce as
"disabled" without disappearing from the AT tree (matches Button's
`disabledInteractive` stance — disabled controls are
discoverable). The four-part bundle (matches Link's disabled-link
discipline):

1. **`aria-disabled="true"`** — announces the disabled state.
2. **`tabindex="0"` (NOT `-1`)** — keep in tab sequence so AT users
   discover them and learn that "Previous is currently inactive".
   This is the same stance Button takes; we apply it consistently.
3. **Capture-phase `click` interceptor** — `preventDefault()` +
   `stopImmediatePropagation()` on the boundary children so the
   page does not navigate when the user clicks a disabled button.
4. **Capture-phase `keydown.enter` / `keydown.space` interceptor**
   — same.

The capture-phase logic lives in each boundary child directive
(`KjPaginationPrevious`, `KjPaginationNext`, `KjPaginationFirst`,
`KjPaginationLast`); the disabled state is sourced from
`KJ_PAGINATION` context (`isFirstPage`, `isLastPage`). A
consumer-applied `[kjDisabled]="true"` on `KjPaginationItem` for an
arbitrary mid-list page button uses the same bundle.

### Live-region story — polite vs. assertive

The page change is announced via a `polite` live region on the root.
Reasoning:

- **`polite` does not interrupt.** AT users who are mid-sentence
  hearing the page heading should hear the page-change announcement
  *after* the current sentence, not interrupting it. WCAG 4.1.3
  permits both `polite` and `assertive`; `polite` is the default
  unless the announcement is genuinely time-critical (form errors,
  approaching session timeouts).
- **`assertive` would be wrong on every click.** A user who clicks
  `Next` ten times in quick succession on a fast paginated list
  would hear ten "Page N of 10" announcements interrupting each
  other and any other content the AT was reading. `polite`
  coalesces — older queued announcements are dropped when newer
  ones arrive. The user hears one announcement per "settle".
- **Consumers may opt up.** `KJ_PAGINATION_CONFIG.pageChangeAnnouncementPoliteness:
  'polite' | 'assertive'` lets the consumer override per-app if
  their use case demands it. Default `'polite'`.

See [Open question 4](#open-questions--risks).

## Composition model

```
[Core directives]                                     (folder: packages/core/src/pagination/)
  ├── KjPagination                                    (selector: [kjPagination], host: nav element)
  │     hostDirectives: [KjLiveRegion]
  │     providers: [{ provide: KJ_PAGINATION, useExisting: KjPagination }, bindPresets(KJ_PAGINATION_CONFIG)]
  │     state: kjPage (model), kjTotalPages (input.required), kjSiblingCount (input), kjBoundaryCount (input)
  │     computeds: pages, isFirstPage, isLastPage
  │     host bindings: aria-label="Pagination"
  │
  ├── KjPaginationItem                                (selector: [kjPaginationItem])
  │     hostDirectives: [KjVariant, KjSize, KjFocusRing]
  │     inject: KJ_PAGINATION
  │     inputs: kjPage (number — the page this button targets)
  │     host bindings: [attr.aria-current], [attr.data-current], [attr.aria-label] (Page N), (click)
  │
  ├── KjPaginationPrevious                            (selector: [kjPaginationPrevious])
  │     hostDirectives: [KjVariant, KjSize, KjFocusRing, KjDisabled]
  │     inject: KJ_PAGINATION
  │     host bindings: [attr.aria-label]="Previous page", [attr.aria-disabled]=isFirstPage,
  │                    [attr.tabindex]="0", capture-phase (click)/(keydown.enter)/(keydown.space)
  │
  ├── KjPaginationNext                                (selector: [kjPaginationNext])
  │     (same shape as Previous, mirrored to isLastPage)
  │
  ├── KjPaginationFirst                               (selector: [kjPaginationFirst])
  │     (same shape as Previous, jumps to page 1)
  │
  ├── KjPaginationLast                                (selector: [kjPaginationLast])
  │     (same shape as Next, jumps to totalPages)
  │
  ├── KjPaginationEllipsis                            (selector: [kjPaginationEllipsis])
  │     host: <span> with aria-hidden="true" + visually-hidden child "More pages"
  │
  └── KjPaginationInfo                                (selector: [kjPaginationInfo])
        inject: KJ_PAGINATION
        host: <span> with text content from KJ_PAGINATION_CONFIG.infoTemplate

[Wrapper component]                                   (folder: packages/components/src/pagination/)
  └── KjPaginationComponent                           (selector: kj-pagination)
        template: <nav kjPagination [(kjPage)]="..." [kjTotalPages]="..." …>
                    @if (kjShowFirstLast()) { <button kjButton kjPaginationFirst>«</button> }
                    <button kjButton kjPaginationPrevious>‹</button>
                    @for (token of pages(); track token) {
                      @if (token === 'ellipsis-left' || token === 'ellipsis-right') {
                        <span kjPaginationEllipsis>…</span>
                      } @else {
                        <button kjButton kjPaginationItem [kjPage]="token">{{ token }}</button>
                      }
                    }
                    <button kjButton kjPaginationNext>›</button>
                    @if (kjShowFirstLast()) { <button kjButton kjPaginationLast>»</button> }
                    @if (kjShowInfo()) { <span kjPaginationInfo></span> }
                  </nav>

[Configuration]                                       (file: packages/core/src/pagination/config.ts)
  ├── KJ_PAGINATION_DEFAULTS = { variants, sizes, defaults, navigationLabel,
  │                              previousLabel, nextLabel, firstLabel, lastLabel,
  │                              ellipsisLabel, pageItemLabel, infoTemplate,
  │                              pageChangeAnnouncement, pageChangeAnnouncementPoliteness }
  ├── KJ_PAGINATION_CONFIG = new InjectionToken(...)
  └── provideKjPagination(config: Partial<KjPaginationConfig>): Provider[]

[Context token]                                       (file: packages/core/src/pagination/pagination.context.ts)
  └── KJ_PAGINATION = new InjectionToken<KjPaginationContext>('KjPagination')
        interface KjPaginationContext {
          page: Signal<number>;
          totalPages: Signal<number>;
          pages: Signal<readonly KjPageToken[]>;
          isFirstPage: Signal<boolean>;
          isLastPage: Signal<boolean>;
          goToPage: (page: number) => void;
          goToFirst: () => void;
          goToLast: () => void;
          goToNext: () => void;
          goToPrevious: () => void;
        }

[CSS layer]                                           (file: packages/components/src/pagination/pagination.css)
  └── .kj-pagination, .kj-pagination-item, .kj-pagination-item[data-current="true"],
      .kj-pagination-item[data-disabled], .kj-pagination-ellipsis,
      .kj-pagination-previous, .kj-pagination-next, .kj-pagination-info,
      .kj-pagination-info::before { content: var(--kj-pagination-info-prefix, ""); }
```

One root directive owning state. Seven child directives reflecting
state. One context token. One configuration token. One wrapper. One
CSS file.

### Reused primitives

| Primitive | Where | Why |
|---|---|---|
| `KjLiveRegion` | `hostDirectives` on `KjPagination` | Single live region for the whole pagination instance. Announces page changes via the configured template. Politeness configurable via `KJ_PAGINATION_CONFIG`. |
| `KjVariant` | `hostDirectives` on each item / boundary directive | Routes `kjVariant` to `data-variant`, validated against `KJ_PAGINATION_CONFIG.variants`. Standard preset pattern. |
| `KjSize` | `hostDirectives` on each item / boundary directive | Routes `kjSize` to `data-size`, validated against `KJ_PAGINATION_CONFIG.sizes`. Standard preset pattern. |
| `KjFocusRing` | `hostDirectives` on each item / boundary directive | Reflects `data-focus-visible` on `:focus-visible`. Standard. |
| `KjDisabled` | `hostDirectives` on each boundary directive (`Previous`, `Next`, `First`, `Last`) | Provides `aria-disabled` / `data-disabled` reflection. The capture-phase click + keydown suppression and the always-`tabindex="0"` policy live in each child's own directive code (richer contract than the bare primitive). Same arrangement as Button's `effectiveDisabled` plumbing and Link's disabled-link bundle. |
| `KjVisuallyHidden` | Programmatic — used to style the appended "Page N" suffix on items, the "More pages" suffix on ellipsis, and the live-region container | Class-only application. Same primitive Link uses for "(opens in new tab)". |
| `KjFormControl` | **Not used.** | Pagination is not a form control. The `kjPage` signal is exposed via `model` for two-way binding with consumer signals; it is not part of an Angular forms tree. (A consumer who really wants pagination inside a `FormGroup` can wire it via `[ngModel]="page" (ngModelChange)="page = $event"` — but the canonical surface is the signal-based two-way binding.) |
| `KjFocusTrap` | **Not used.** | Pagination is not a modal. |
| `KjRovingTabindex` | **Not used.** | See [Why no roving tabindex](#why-no-roving-tabindex). Each button is its own tab stop. |
| `KjOverlayService` | **Not used.** | No overlay; everything renders in flow. |

### Cross-component pointers

- [`../actions/button.md`](../actions/button.md) — each pagination
  item is rendered as `<button kjButton kjPaginationItem>` (or
  `<a kjButton kjPaginationItem>` for the routing variant). Button
  contributes the variant + size + focus-ring + capture-phase
  disabled-click bundle; Pagination's child directive contributes
  the `aria-current`, `data-current`, and click → `goToPage(page)`
  plumbing. The two compose without conflict because Pagination's
  directives expose their own `KjVariant` / `KjSize` /
  `KjFocusRing` instances on the host and the directives are
  tag-agnostic; when the consumer wears Button on the same `<button>`,
  the data-attribute reflection from both directives reads the same
  values (the host element only has one set of `data-variant` /
  `data-size` slots, and both directives forward to the same
  `KjVariant` host directive instance via Angular's host-directive
  composition rules).
- [`./link.md`](./link.md) — for the routing variant, each item is
  `<a kjLink kjPaginationItem [routerLink]="..." [queryParams]="..."
  [kjVariant]="..." [kjSize]="...">`. Link contributes the
  external-link / disabled-link / `routerLink` discipline; Pagination
  contributes the page-state semantics. Pagination's children do
  not depend on `KjLink` — they are agnostic — but they compose
  cleanly when the consumer wants the link styling.
- [`./breadcrumb.md`](./breadcrumb.md) (planned) — closest sibling.
  Same `<nav aria-label="...">` landmark pattern, same
  `aria-current="page"` discipline on the active item, same
  per-item `<a kjLink>` / `<button kjButton>` choice. Breadcrumb is
  hierarchical position; Pagination is sequential position. Two
  components, same a11y discipline. Breadcrumb's `KJ_BREADCRUMB`
  context is structurally similar to `KJ_PAGINATION` but
  Breadcrumb does not own a sliding-window algorithm (the consumer
  enumerates the crumbs); Breadcrumb has no boundary state machine
  (every crumb but the last is a normal link); Breadcrumb has no
  live-region announcement (the URL change announces itself).
- [`./stepper.md`](./stepper.md) (planned) — visually similar
  numbered sequence, fundamentally different intent. See the
  [introduction](#pagination) for the differentiator. Stepper has
  step-validation gating; Pagination does not. Stepper uses
  `aria-current="step"`; Pagination uses `aria-current="page"`.
  Stepper has a per-step `completed` / `current` / `upcoming` state
  triplet; Pagination has only `current` / `not-current`. Two
  components, two contexts, two state machines.
- [`./tabs.md`](./tabs.md) (planned) — uses roving tabindex;
  Pagination does not. See [Why no roving tabindex](#why-no-roving-tabindex).
- [`../data-display/carousel.md`](../data-display/carousel.md) — the
  Carousel indicators row is visually similar to a compact Pagination
  but rotates content rather than navigating pages of data. The two
  do not share a directive. See `carousel.md` §27 for the explicit
  cross-reference. Pagination's `'…'` ellipsis pattern does not
  appear in Carousel (carousels rarely have enough slides to need
  ellipsis); Carousel's autoplay does not appear in Pagination
  (pages do not auto-advance — WCAG 3.2.5).
- [`../data-display/list.md`](../data-display/list.md) and
  [`../data-display/table.md`] (planned) — the dataset being
  paginated. Pagination renders below a List / Table; the connection
  is the consumer's data source. The List / Table does not own the
  page state; Pagination does. The consumer's data source reads
  `kjPage` and re-derives the visible rows. See
  [Examples §5](#examples-to-ship).
- [`../data-input/select.md`](../data-input/select.md) — for the
  page-size selector that ships **alongside** Pagination (not
  inside it). The canonical layout is "page-size Select on the
  left, Pagination on the right, "X of Y records" info text in
  between" — three independent components composed by the consumer.
  See [Open question 1](#open-questions--risks).

## Inputs / Outputs / Models

All public-facing inputs/outputs/models are `kj`-prefixed per
[`rules/code_style.md`](../../../rules/code_style.md).

### Core root directive (`KjPagination`, selector `[kjPagination]`)

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjPage` | `model<number>` | n/a — required by binding shape | Two-way bound. 1-indexed. Clamped to `[1, kjTotalPages()]` on write; clamping issues a dev-mode console warning. The canonical surface — most consumers will use `[(kjPage)]`. |
| `kjTotalPages` | `input.required<number>` | n/a — required | Number of pages; consumer derives from `Math.ceil(records / pageSize)`. May be 0 (empty dataset). |
| `kjSiblingCount` | `input<number>` | `1` | Pages adjacent to current on each side. See [Page-token algorithm](#page-token-algorithm). |
| `kjBoundaryCount` | `input<number>` | `1` | Pages anchored at start and end. See [Page-token algorithm](#page-token-algorithm). |
| `kjVariant` | `string` | `'default'` | Cascades to children that don't set their own. Forwarded to each child's `KjVariant` host directive via the `KJ_PAGINATION` context's variant signal. |
| `kjSize` | `string` | `'md'` | Same as variant — cascades to children. |
| `kjPageChange` | model output | computed from `kjPage` | Fires when the page changes. Emitted from any source: child item click, programmatic write, clamp on out-of-range. |
| (host) `aria-label` | host binding | `'Pagination'` (from `KJ_PAGINATION_CONFIG.navigationLabel`) | Sets the navigation landmark's accessible name. Configurable for i18n. |
| (host) `[attr.data-page]`, `[attr.data-total-pages]` | host bindings | computed | CSS layer hooks. |

The directive provides `KJ_PAGINATION` to descendants. The context
exposes `page`, `totalPages`, `pages`, `isFirstPage`, `isLastPage`
signals plus `goToPage`, `goToFirst`, `goToLast`, `goToNext`,
`goToPrevious` methods. Children read state from the signals and
trigger transitions via the methods.

### Core child directive (`KjPaginationItem`, selector `[kjPaginationItem]`)

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjPage` | `input.required<number>` | n/a | The page number this item navigates to. |
| `kjVariant` | `string` (validated) | inherited from `KJ_PAGINATION` | Forwarded to `KjVariant` host directive. |
| `kjSize` | `string` (validated) | inherited from `KJ_PAGINATION` | Forwarded to `KjSize` host directive. |
| `kjDisabled` | `input<boolean>` | `false` | Composed `KjDisabled`. Used for "this specific page is unavailable" cases (rare). |
| (host) `[attr.aria-current]` | host binding | computed | `'page'` when `kjPage() === pagination.page()`; otherwise unset. |
| (host) `[attr.data-current]` | host binding | computed | `'true'` / `'false'` for CSS hooks. |
| (host) `[attr.aria-label]` | host binding | computed | `Page N` (configurable via `KJ_PAGINATION_CONFIG.pageItemLabel(page, totalPages)`). |
| (host) `(click)` | host listener | computed | Calls `pagination.goToPage(kjPage())`. When the host is `<a [routerLink]>`, does **not** call `preventDefault()` — the route change is the navigation, and the model write fires from `routerLink`'s navigation event via consumer wiring. See [Examples §6](#examples-to-ship). |

### Core child directives — `KjPaginationPrevious`, `KjPaginationNext`, `KjPaginationFirst`, `KjPaginationLast`

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjVariant` | `string` (validated) | inherited from `KJ_PAGINATION` | Forwarded. |
| `kjSize` | `string` (validated) | inherited from `KJ_PAGINATION` | Forwarded. |
| (host) `[attr.aria-label]` | host binding | from `KJ_PAGINATION_CONFIG` | `'Previous page'` / `'Next page'` / `'First page'` / `'Last page'`. Configurable for i18n. |
| (host) `[attr.aria-disabled]` | host binding | computed | `'true'` when `pagination.isFirstPage()` (Previous, First) or `pagination.isLastPage()` (Next, Last); also `'true'` when `kjTotalPages() === 0`. |
| (host) `[attr.data-disabled]` | host binding | computed | Mirrors `aria-disabled`. |
| (host) `[attr.tabindex]` | host binding | computed | Always `'0'` — even when disabled (matches Button's `disabledInteractive`). |
| (host) `(click)` capture | host listener | computed | When disabled: `preventDefault() + stopImmediatePropagation()`. When enabled: calls the appropriate context method. |
| (host) `(keydown.enter)` / `(keydown.space)` capture | host listeners | computed | Same — suppress when disabled. |

No item-specific inputs (Previous always goes to `page - 1`; First
always to `1`; etc.). The behaviour is fully derived from the
`KJ_PAGINATION` context.

### Core child directive (`KjPaginationEllipsis`, selector `[kjPaginationEllipsis]`)

| Name | Type | Default | Notes |
|---|---|---|---|
| (host) `aria-hidden` | host binding | `'true'` | The visible `…` glyph is decorative. |
| (host) projects `<span class="kj-visually-hidden">More pages</span>` | programmatic injection in `afterNextRender` | "More pages" (configurable via `KJ_PAGINATION_CONFIG.ellipsisLabel`) | The text equivalent for AT users. The whole element's accessible name is "More pages" via the visually-hidden child (the `aria-hidden` only hides the glyph itself; the directive structures the DOM so the visually-hidden span survives). **Implementation note**: actually setting `aria-hidden="true"` on the host removes the entire subtree from the AT tree, so the visually-hidden child does not work in this arrangement. Two options: (a) drop `aria-hidden` from the host and make the glyph itself the accessible name (simpler — the glyph "…" reads as "ellipsis" in most AT, which is acceptable), or (b) wrap the glyph in `<span aria-hidden="true">…</span>` and the visually-hidden text in `<span class="kj-visually-hidden">More pages</span>`, both inside the host span. **Choice: (b)** — the host is not aria-hidden, the glyph is, and the AT reads "More pages" cleanly. |

### Core child directive (`KjPaginationInfo`, selector `[kjPaginationInfo]`)

| Name | Type | Default | Notes |
|---|---|---|---|
| (host) `textContent` | computed via the directive | from `KJ_PAGINATION_CONFIG.infoTemplate(page, totalPages)` | The rendered string ("Page 2 of 10"). The directive sets `textContent` reactively whenever `page` or `totalPages` changes. Consumers who want a custom format pass a different `infoTemplate` to `provideKjPagination`. |

### Wrapper component (`KjPaginationComponent`, selector `kj-pagination`)

Re-exposes all root inputs (`kjPage`, `kjTotalPages`,
`kjSiblingCount`, `kjBoundaryCount`, `kjVariant`, `kjSize`,
`kjPageChange`) plus:

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjShowFirstLast` | `input<boolean>` | `true` | Shorthand to render or hide First / Last buttons. The compound directives are unaffected — consumers using the directives directly compose only what they want. |
| `kjShowInfo` | `input<boolean>` | `false` | Shorthand to render the "Page N of M" info span. Default `false` because the live region announces it for AT users; the visible span is opt-in for sighted users who want it visible. |

The wrapper renders the canonical layout described in the
[Composition model](#composition-model). Consumers who want a
non-canonical layout drop the wrapper and use the directives.

### Configuration (`KJ_PAGINATION_CONFIG`)

```ts
export interface KjPaginationConfig {
  variants: string[];
  sizes: string[];
  defaults: {
    variant: string;
    size: string;
    siblingCount: number;
    boundaryCount: number;
  };
  navigationLabel: string;
  previousLabel: string;
  nextLabel: string;
  firstLabel: string;
  lastLabel: string;
  ellipsisLabel: string;
  pageItemLabel: (page: number, totalPages: number) => string;
  infoTemplate: (page: number, totalPages: number) => string;
  pageChangeAnnouncement: (page: number, totalPages: number) => string;
  pageChangeAnnouncementPoliteness: 'polite' | 'assertive';
}

export const KJ_PAGINATION_DEFAULTS: KjPaginationConfig = {
  variants: ['default', 'outline', 'ghost'],
  sizes: ['sm', 'md', 'lg'],
  defaults: { variant: 'default', size: 'md', siblingCount: 1, boundaryCount: 1 },
  navigationLabel: 'Pagination',
  previousLabel: 'Previous page',
  nextLabel: 'Next page',
  firstLabel: 'First page',
  lastLabel: 'Last page',
  ellipsisLabel: 'More pages',
  pageItemLabel: (page) => `Page ${page}`,
  infoTemplate: (page, totalPages) => `Page ${page} of ${totalPages}`,
  pageChangeAnnouncement: (page, totalPages) => `Page ${page} of ${totalPages}`,
  pageChangeAnnouncementPoliteness: 'polite',
};

export const KJ_PAGINATION_CONFIG = new InjectionToken<KjPaginationConfig>(
  'kj.pagination.config',
  { factory: () => KJ_PAGINATION_DEFAULTS },
);

export function provideKjPagination(config: Partial<KjPaginationConfig>): Provider[];
```

The label fields are **functions where the result depends on
state** (page, totalPages) and **strings where it doesn't**
(`navigationLabel`, `previousLabel`). This split lets consumers
pass `$localize`-d strings for static labels and i18n-formatted
functions for dynamic ones (e.g. ICU plural for "Page 1" vs.
"Page 2" in languages with grammatical number).

## Examples to ship

Match the cadence of Accordion's example set:

1. **Default** — `pagination.example.ts`. The wrapper component
   with two-way `[(kjPage)]` and a `[kjTotalPages]="10"`. Demonstrates
   the canonical layout and the live-region announcement.

2. **Compound (hand-rolled)** — `pagination.compound.example.ts`.
   The same paginator built from the directives directly:
   ```html
   <nav kjPagination [(kjPage)]="page" [kjTotalPages]="10">
     <button kjButton kjPaginationFirst>«</button>
     <button kjButton kjPaginationPrevious>‹</button>
     @for (token of pages(); track token; let i = $index) {
       @if (token === 'ellipsis-left' || token === 'ellipsis-right') {
         <span kjPaginationEllipsis>…</span>
       } @else {
         <button kjButton kjPaginationItem [kjPage]="token">{{ token }}</button>
       }
     }
     <button kjButton kjPaginationNext>›</button>
     <button kjButton kjPaginationLast>»</button>
   </nav>
   ```
   Demonstrates how to access the `pages` computed via a template
   ref (`#p="kjPagination"` and `p.pages()`).

3. **Variants + sizes** — `pagination.variants.example.ts`.
   `default`, `outline`, `ghost` × `sm`, `md`, `lg`.

4. **Sibling and boundary counts** — `pagination.window.example.ts`.
   Three paginators side-by-side: `siblingCount=0, boundaryCount=1`
   (compact); `siblingCount=1, boundaryCount=1` (default);
   `siblingCount=2, boundaryCount=2` (wide). Same `kjPage=5`,
   `kjTotalPages=20` to show the algorithm output diverges.

5. **Backed by a List** — `pagination.with-list.example.ts`. A
   `<kj-list>` rendering the current page's slice of a 100-item
   dataset, with `<kj-pagination>` underneath. Demonstrates the
   `computed(() => items.slice((page() - 1) * 10, page() * 10))`
   wiring.

6. **Routing variant** — `pagination.router.example.ts`. Each item
   is `<a kjLink kjButton kjPaginationItem [routerLink]="['/products']"
   [queryParams]="{ page: token }">`; the `kjPage` two-way binding
   reads from a `toSignal` of `route.queryParamMap` and writes back
   via `router.navigate(...)`. Demonstrates that the URL is the
   single source of truth and Pagination observes / writes through.

7. **With page-size selector** — `pagination.with-page-size.example.ts`.
   A `<kj-select>` of `[10, 25, 50, 100]` to the left of the
   pagination, an info span ("11–20 of 247 records") in the middle,
   and the pagination on the right. Demonstrates the **separation of
   concerns**: page-size is a separate component; total-records and
   the range string are derived in the consumer's template; only
   `kjPage` and `kjTotalPages` go to Pagination.

8. **Material-style minimal** — `pagination.minimal.example.ts`.
   Just `<kj-pagination-info>` + Previous + Next, no numeric
   buttons:
   ```html
   <nav kjPagination [(kjPage)]="page" [kjTotalPages]="10">
     <button kjButton kjPaginationPrevious>Previous</button>
     <span kjPaginationInfo></span>
     <button kjButton kjPaginationNext>Next</button>
   </nav>
   ```
   Demonstrates that the consumer can drop the `@for` and ship the
   Material shape without changing components.

9. **Empty dataset** — `pagination.empty.example.ts`.
   `kjTotalPages=0` — renders the shell with all controls disabled.
   Consumer's `@if (totalPages() > 0)` wrapping is the recommended
   alternative; this example shows the in-component empty-state
   behaviour.

10. **Single page** — `pagination.single.example.ts`. `kjTotalPages=1`
    — the single page button is `aria-current="page"` and all
    boundary controls are disabled.

11. **Localised** — `pagination.i18n.example.ts`. `provideKjPagination`
    with `$localize`-d `previousLabel`, `nextLabel`, etc., and an
    ICU-plural `infoTemplate`. Confirms that the labels flow through
    cleanly.

12. **Configured presets** — `pagination.configured.example.ts`.
    Extends the variant list with a `brand` variant via
    `provideKjPagination`.

13. **Themed (core-only)** — `pagination.example.ts`,
    `pagination.retro.example.ts`, `pagination.finance.example.ts`
    under `packages/core/`. Confirms the directives work under
    arbitrary theme CSS without the wrapper.

## Open questions / risks

1. **Page-size selector — separate or inside Pagination?**
   PrimeNG and Material both bundle the page-size selector
   (`rowsPerPageOptions`) into the paginator. Should kouji?
   **Decision: no, separate.** Reasons: (a) the page-size selector
   is a Select, not a button — different a11y semantics, different
   visual chrome, different keyboard contract; (b) bundling forces
   consumers who don't want page-size to opt out, which adds a
   `showPageSize` flag we don't need; (c) the page-size value is
   often a different signal from the page (cached separately,
   persisted to localStorage independently); (d) the canonical
   layout puts page-size on the **left** of the pagination row, and
   bundling implies a fixed layout. Consumers compose
   `<kj-select [(value)]="pageSize" [options]="[10, 25, 50, 100]">`
   alongside `<kj-pagination>` themselves. Documented in
   [Examples §7](#examples-to-ship).

2. **Jump-to-page input — ship in v1?**
   PrimeNG ships a "jump to page N" dropdown / input. Material does
   not. shadcn does not. Real-world usage data:
   [GitHub's pagination](https://github.com/) has it; most product
   surfaces don't. **Decision: defer to v1.1.** A jump-to-page input
   is a `<kj-number-input min="1" max="totalPages">` plus a "Go"
   button bound to `pagination.goToPage()`; consumers who need it
   compose it themselves and we ship a recipe in the docs. If
   user-feedback shows the gap is real, ship `KjPaginationJumpInput`
   in v1.1 as an eighth child directive.

3. **`outline` variant AAA contrast against `base-100`.**
   The `outline` variant's text colour reads from `--kj-color-base-content`
   on a transparent background, with a 1px border. On `base-100`
   the contrast is ≥ 7:1 (the same colour Typography body text
   uses). On `base-200` (e.g. when Pagination is used inside a Card
   on a slightly tinted page background), the contrast may drop to
   ~6:1 in light theme. **Mitigation**: the `outline` variant for
   Pagination items reads from a separate token
   (`--kj-pagination-item-fg-outline`) tunable independently. Verify
   in the contrast matrix (light/dark/high-contrast × `base-100`/`base-200`/`base-300`)
   before shipping. The active-page background fill on the outline
   variant is the contrast-risk: `--kj-pagination-item-bg-current`
   on the outline border colour must be ≥ 3:1 (1.4.11).

4. **Polite vs. assertive on the page-change announcement.**
   The default is `polite`. Consumers building forms-driven paginators
   ("clicking Next saves the form and advances to the next page")
   may want `assertive` so the user hears "Page 5 of 10" immediately
   even if AT was mid-sentence on the form. **Lean: configurable,
   default `polite`.** Already documented above; flagged here for
   attention if testing reveals the polite default coalesces too
   aggressively in fast-clicking scenarios.

5. **1-indexed or 0-indexed?**
   PrimeNG: 1-indexed (page numbers match the rendered UI).
   Angular Material: 0-indexed (`pageIndex: 0` means page 1; legacy
   from earlier versions and the underlying `MatPaginator` event
   shape). shadcn: 1-indexed.
   **Decision: 1-indexed.** Reasons: (a) matches the rendered UI —
   consumers binding `[(kjPage)]="page"` and reading the value see
   `page() === 3` when the user is on page "3", not `page() === 2`;
   (b) 0-indexed is a frequent source of off-by-one bugs in
   consumer code; (c) two of three references agree. Document the
   divergence from Material in the migration guide for consumers
   coming from `MatPaginator`.

6. **Empty `<kj-pagination-info>` rendering.**
   When the consumer projects `<kj-pagination-info>` (no content)
   and the directive sets `textContent` from the configured template,
   the host span's content is replaced reactively. **Risk**: if
   the consumer projects content into the span (e.g.
   `<kj-pagination-info>Showing page {{ page }}</kj-pagination-info>`),
   the directive's `textContent` write clobbers the projected
   content. **Mitigation**: the directive checks if any content is
   projected (via `ContentChild` or `ngAfterContentInit` inspection)
   and only sets `textContent` when the host is empty. Alternative:
   require consumers to use `<kj-pagination-info>` empty for the
   default template, or write their own `<span>{{ page() }}</span>`
   for custom content. **Lean: ship the auto-detect** — empty
   projection → directive owns the text; non-empty → consumer wins.
   Documented in TSDoc.

7. **Mobile / responsive pagination — when does the window
   collapse?**
   On a 320px-wide phone, a 10-button paginator does not fit. The
   common pattern is to drop to "Previous / Page N of M / Next" on
   small screens. **Decision: not Pagination's job in v1.** The
   responsive collapse is a layout decision, owned by the consumer's
   media-query CSS or container queries. The wrapper component's
   `kjShowFirstLast` and a (deferred-to-v1.1) `kjCollapseAt` input
   could ship the canonical responsive variant; for v1 the consumer
   uses CSS to hide the page items and show only Previous/Next/Info
   below a breakpoint. Documented as a CSS recipe in the wrapper's
   docs page.

8. **`prefers-reduced-motion` — does Pagination have animations?**
   The default styling has no transitions on page change (the active
   indicator does not animate between buttons). Some libraries do
   animate (a sliding underline that moves to the new active
   button). **Lean: no animation in v1.** Adds complexity, doesn't
   meaningfully aid comprehension, and `prefers-reduced-motion`
   compliance becomes another box to check. If a consumer wants
   animation, they apply CSS transitions on the `[data-current]`
   attribute themselves.

9. **`KjPaginationItem` on `<a routerLink>` — click handler vs.
   router navigation order.**
   When the consumer writes `<a kjPaginationItem [routerLink]="..."
   [queryParams]="{ page: 3 }">`, two click handlers fire: Angular
   Router's (which calls `navigate()`) and `KjPaginationItem`'s
   (which calls `goToPage(3)`). If the URL is the source of truth
   (consumer's `kjPage` reads from `route.queryParamMap`), the
   directive's `goToPage(3)` is a no-op — `kjPage` is already
   updated by the URL change. If the URL is **not** the source of
   truth (consumer holds `kjPage` independently and uses
   `routerLink` only for the URL display), both fire and `kjPage`
   gets written twice (no harm; idempotent). **Risk**: in the
   "URL is source of truth" case, the directive's `goToPage` runs
   *before* the navigation completes, writing `kjPage = 3`
   optimistically; if the navigation is cancelled (e.g. by a route
   guard), `kjPage` is now wrong. **Mitigation**: the directive
   detects the `<a>` host with a `routerLink` and **defers**
   `goToPage` to the consumer's `kjPage` two-way binding (i.e.
   doesn't call `goToPage` at all when the host is a routed link).
   The consumer wires `kjPage` ← `route.queryParamMap` themselves;
   the directive contributes only the ARIA + `data-current` semantics.
   Implementation: the `KjPaginationItem` directive checks for a
   `RouterLink` or `RouterLinkActive` directive on the same host and
   skips the click → `goToPage` call when found. Documented in the
   routing example.

10. **SSR / hydration.**
    The directives' `host` bindings (`aria-current`, `data-current`,
    `aria-label`, `aria-disabled`, `tabindex`) all evaluate
    synchronously, so the SSR HTML carries the right attributes.
    The `pages` computed runs on the server (it is pure), so the
    rendered DOM matches the client. The live region's
    `KjLiveRegion` composition runs in `afterNextRender` (browser-only)
    — the SSR HTML does not include the live-region announcement,
    which is correct (the page hasn't *changed* yet, so there is
    nothing to announce). The visually-hidden "Page N" suffix on
    each item appended via DOM mutation runs in `afterNextRender`
    — **risk**: if the consumer's app relies on the suffix being
    present at SSR time for some reason (link-rel preload of an
    AT-derived label?), it will be absent until hydration. Realistic
    risk: zero. SSR snapshot tests should verify the visual page
    content matches.

11. **Internationalisation — RTL.**
    In RTL languages (Arabic, Hebrew), the paginator visual order
    reverses: `Last 10 … 6 5 4 … 1 First` (with First on the right
    and Last on the left). The `<nav>` element honours `dir="rtl"`
    natively via flexbox direction; the directives reflect
    `aria-label="Previous page"` etc. without flipping (the *concept*
    is "previous", whether the visual arrow points right or left).
    **Risk**: the icon (`‹` or `›`) baked into the consumer's button
    text does not flip — that is the consumer's RTL-mirroring
    responsibility. The wrapper component's CSS uses logical
    properties (`margin-inline-start`, not `margin-left`) so spacing
    flips correctly. The icon itself, in the wrapper, uses a CSS
    `transform: scaleX(-1)` under `[dir="rtl"]` to flip the chevron.

12. **Internationalisation — labels.**
    Every user-visible string is configurable via
    `KJ_PAGINATION_CONFIG` (see [Configuration](#configuration-kj_pagination_config)).
    Consumers using Angular's `$localize` mechanism pass localised
    values; consumers using `ngx-translate` pass functions that read
    from the translate service. Same shape as Material's
    `MatPaginatorIntl`. **Risk**: the `pageItemLabel(page)` returning
    `"Page 3"` is correct in English but in some languages requires
    grammatical-gender or grammatical-number agreement
    (e.g. Russian's "Страница 1" vs. "Страница 2" vs. "Страница 5"
    are all the same form, but ordinal "первая страница" / "вторая
    страница" / "пятая страница" differs). The function shape lets
    consumers handle this; the default English does not need it.

13. **Page-token algorithm — should `'ellipsis-left'` and
    `'ellipsis-right'` be a single `'ellipsis'` token?**
    Considered: a single `'ellipsis'` token regardless of position.
    Rejected because Angular's `@for (… ; track token)` requires
    stable unique tracks, and two ellipses in the same list would
    collide on the same track value, causing one to be reused
    across the divide. The two-token shape gives stable tracks.
    Consumers who only care about presence (rendering) treat both
    the same; consumers who want different left/right styling can
    differentiate via the token value.

14. **What about cursor-based pagination ("load more" / infinite
    scroll)?**
    Cursor pagination (Twitter feed, GitHub Issues "Load more")
    has no "page N of M" concept — there is only a forward cursor
    and a "more available" boolean. **Not Pagination's job.** A
    `<kj-load-more>` button or an intersection-observer-driven
    auto-load is a separate component pattern. Pagination is for
    **bounded numerically-indexed** datasets where the user can
    jump to an arbitrary page. Document the distinction in the
    docs page; do not blur the line.

15. **Does `kjPage` accept negative values or zero?**
    The model clamps `kjPage` to `[1, kjTotalPages()]` on every
    write. Setting `kjPage = 0` is clamped to `1` (with a dev-mode
    warning); setting `kjPage = -5` is also clamped to `1`; setting
    `kjPage = 999` when `kjTotalPages = 10` is clamped to `10`.
    The clamp prevents "page out of range" UI states. **Risk**: a
    consumer who writes `kjPage = pageFromUrl()` where `pageFromUrl`
    returns 0 on a malformed URL gets silent clamping; the URL is
    still `?page=0` but the directive shows page 1. **Mitigation**:
    the dev-mode warning surfaces the silent clamp; consumers
    pre-validate their URL parameters. The clamp is the right
    default — alternative ("throw on out-of-range") is too strict
    for a navigation primitive.
