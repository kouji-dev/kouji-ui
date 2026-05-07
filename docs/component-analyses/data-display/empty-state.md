# Empty State

A placeholder shown in place of a list, table, feed, or detail panel
when the underlying data set is empty — either because there has
never been any data ("no projects yet — create your first one"), or
because a filter / search collapsed the visible set to zero
("no results match `octopus`"), or because something failed
("we couldn't reach the server — try again"). The visual anatomy is
universally the same across the field: an illustration or icon, a
short title, a one- or two-line description, and one or two action
buttons. The behavioural anatomy is almost nothing — no state, no
focus contract, no keyboard handling, no overlay, no live region
*by default*.

The interesting questions for Empty State are not *what does it
render* (the answer is "the four slots above"), but **whether it
deserves a core directive at all**, and **what the right ARIA
discipline is** for the search-returned-no-results case versus the
nothing-has-ever-happened-here case versus the
something-has-actually-failed case.

> **Not yet on disk.** No `packages/core/src/empty-state/`, no
> `packages/components/src/empty-state/`. This is a greenfield
> design. The roadmap entry slots Empty State into `data-display`,
> immediately downstream of List, Card, and Table — the three
> components that most often need a "what to render when there is
> nothing" answer.

A common mistake is to confuse Empty State with three distinct
neighbours; the discipline of this component is to keep them
separated:

- **Alert / Banner / Toast** — runtime *interruptions* that something
  has gone wrong or that the user must attend to a status change. An
  alert lives **alongside** content (a banner above a still-populated
  list) or **above** content (a toast). An empty state lives
  **inside** the content slot, *replacing* the list / table / feed
  rows. The two can co-occur: a banner above the list saying "your
  account is in read-only mode" and an empty state inside the list
  saying "no items". Owned by [`../feedback/alert.md`](../feedback/alert.md)
  and [`../feedback/toast.md`](../feedback/toast.md) (planned).
- **Skeleton / Loading** — the *transient* placeholder while data is
  in flight. A skeleton is "we're fetching"; an empty state is
  "we fetched and there is nothing". A consumer that flashes an
  empty state during a 200 ms fetch has built the wrong thing.
  Owned by [`../feedback/skeleton.md`](../feedback/skeleton.md)
  (planned).
- **Error page / 404 / 500** — full-page failures owned by the
  router and the app shell. An empty-state-with-error variant
  ("we couldn't reach the server") shares the visual anatomy but is
  a *contained* failure inside an existing surface. The full-page
  case is a different component (planned `error-page`); the
  contained case is Empty State's `variant="error"`.

For the **container that an empty state most often lives inside**,
see [`./card.md`](./card.md) — a card body whose data is missing
becomes a card-shaped empty state. For the **list whose rows are
absent**, see [`./list.md`](./list.md): the list's "no items" branch
renders an empty state in place of `<kj-list-item>` repetition; the
List analysis explicitly forwards this case here. For the **table**
counterpart, see `../data-display/table.md` (planned). For the
**alert/banner counterpart** (the runtime interruption), see
[`../feedback/alert.md`](../feedback/alert.md) (planned).

## Source comparison

This is a four-blank-cells row. None of the reference libraries
ships a first-class Empty State. The pattern is universally
hand-rolled.

| Concern | PrimeNG | Angular Material | shadcn/ui | daisyUI |
|---|---|---|---|---|
| First-class component | **No** — gap. App templates compose `<div>` + `<i pIcon>` + heading + paragraph + `<p-button>` per project | **No** — gap. Material design language describes the empty state pattern in the spec but ships no `<mat-empty-state>` | **No** — gap. Community recipes layer Tailwind utilities on a `<div>` with a centred column; some templates ship an `EmptyPlaceholder` recipe in `examples/` but it is not exported | **No** — gap. No `.empty-state` class. The `hero` class is the closest neighbour but is for marketing splash, not data-empty placeholders |
| Slots | n/a | n/a | n/a (recipe-level only) | n/a |
| Variants | n/a | n/a | n/a | n/a |
| Sizes | n/a | n/a | n/a | n/a |
| Roles / ARIA | n/a — fully consumer territory; common foot-gun is forgetting to give the empty state any accessible name at all when it replaces a previously-populated list | n/a | n/a — community recipes are inconsistent (some wrap in `role="status"`, most don't) | n/a |
| Live-region behaviour | n/a | n/a | n/a | n/a |
| Search-no-results variant | n/a | n/a | n/a | n/a |
| Error variant | n/a | n/a | n/a | n/a |

**Read-off.**

- **The whole field punts.** Four reasonable libraries, four
  community-recipe answers, zero shared semantics. This is *the*
  case where a small library can ship a tiny, opinionated component
  that pays disproportionate dividends — every consumer needs the
  pattern, every consumer hand-rolls it, and the hand-rolled
  versions consistently get the a11y wrong (no accessible name on
  the container; no live announcement for the search-no-results
  case; no error-vs-neutral distinction in tone).
- **The reason it's a gap is informative.** The pattern is so
  visually simple ("centre four things") that nobody felt it
  earned a primitive. That argument is right *for the visual
  layer* and wrong *for the a11y layer* — the visual is "centre
  four things", but the a11y has three distinct contracts
  (neutral / search-results / error) that the visual hides.
  We will ship the visual contract as components and we will pay
  the a11y differences in **inputs and host bindings on the root
  component**, not in a core directive — see Decision below.
- **shadcn's `EmptyPlaceholder` recipe** is the closest existing
  shape we agree with: a centred column with named
  `EmptyPlaceholder.Icon`, `EmptyPlaceholder.Title`,
  `EmptyPlaceholder.Description`. It is unstyled and lives in
  `examples/`, not the exported set. Our shape is the same
  decomposition, exported as a real component family.

## Decision (core directive)

**No — components-only, no core directive.** This is the
strongest "no" candidate among the data-display group, stronger
even than Kbd (which has a tiny opinion about unicode-glyph
ARIA labels). Empty State has *no* cross-element coordination,
*no* state machine, *no* keyboard contract, *no* focus
management, and *no* role-pairing requirement that a directive
could meaningfully own.

The case has to be made carefully because the project has a
default reflex toward "ship a directive, even a small one, for
parity with the rest of the library" — and that reflex is
correct for Kbd, Badge, Tag, and Avatar. It is **wrong** for
Empty State, because the actual a11y opinions Empty State holds
(when to announce as a status, when to announce as an alert,
how to label the container) are all standard ARIA attributes
the consumer would set anyway, not a behavioural primitive that
deduplicates work.

### The case for a directive (the steelman)

Imagine `KjEmptyState` as a directive on the wrapper element:

1. **`role="status"` for search-results case.** A user types into
   a search field, the result set drops to zero, the empty state
   appears in place of the rows. AT users need to be *told* this
   happened — visually obvious, audibly invisible. A directive
   could host-bind `[attr.role]="kjLive() ? 'status' : null"` and
   the wrapper renders `<kj-empty-state kjLive>` for the search
   case.
2. **`role="alert"` for error case.** Same machinery, different
   role: `<kj-empty-state variant="error" kjLive>` becomes
   `role="alert"`.
3. **`aria-labelledby` from the projected title.** The directive
   could grab the projected `KjEmptyStateTitle`'s `id` (auto-mint
   one if absent) and host-bind `[attr.aria-labelledby]` to it,
   guaranteeing the container gets an accessible name without
   the consumer thinking about it.
4. **Variant routing.** Standard `KjVariant` host directive
   composition: `data-variant="neutral|error"` reflected on the
   host so themes can paint differently.
5. **Size routing.** Standard `KjSize` for inline (small,
   replaces a list of ~3 items) versus full-page (large,
   replaces an entire route's body) shapes.

Two of those (3, the auto-labelledby; 1+2, the live-region
role) are real coordination work. The others (4, 5) are pure
attribute reflection.

### Why the directive still loses

1. **Auto-labelledby is wrong.** Tying `aria-labelledby` to a
   projected child requires the directive to (a) wait until the
   child has rendered and registered, (b) hold a reference to
   the child's host element, (c) re-link if the projected
   content changes. We have done this exact dance for Dialog →
   Dialog Title (planned), where the *coordination is real*
   because the dialog is an overlay with a focus trap that
   needs an accessible name to be ARIA-conformant before the
   trap engages. For Empty State, the container is **inline
   content** with **no overlay, no trap, no role on the
   container by default** — there is nothing for
   `aria-labelledby` to attach to in the no-role case, and in
   the `role="status"` / `role="alert"` cases the live-region
   announcement reads the *content* of the region, not the
   labelledby reference. The auto-labelledby work would be
   coordination effort for zero AT impact.
2. **Live-region routing is one input on a component.** The
   `[attr.role]="…"` host binding the directive would do is
   four characters of HTML on a component template. There is
   no behavioural payoff to extracting those four characters
   into a directive. The "headless contract" framing only
   pays rent when the contract has *behaviour* (focus, state,
   keyboard) — Empty State's contract is *naming*, and naming
   is a host attribute, not a primitive.
3. **Variant + size routing without behaviour is exactly the
   thing the project rules forbid.** From
   [`rules/code_style.md`](../../../rules/code_style.md):
   *"Do not create directives that only add `data-*`
   attributes with no behaviour."* A `KjEmptyState` whose
   only host bindings are `data-variant`, `data-size`, and
   conditionally `role` would be a 30-line directive whose
   entire job is attribute reflection. The components-only
   approach is the project's own answer.
4. **The component is consumed by feed/list/table templates,
   which themselves do no headless work.** When a List
   renders its empty branch, the consumer writes
   `@empty { <kj-empty-state>…</kj-empty-state> }` inside the
   `@for` block. There is nothing for a `KjList` directive to
   coordinate *with* an Empty State directive — the empty
   branch is a different DOM subtree from the list's rows
   subtree, and the list's `aria-label` covers the populated
   case while the empty state's content covers the empty case.
   No coordination → no directive.
5. **Static Card already established the pattern.** See
   [`./card.md`](./card.md) — Card is components-only because
   "static decorative container with named slots" is exactly
   the shape Empty State has. Empty State is essentially a
   *Card with a default centred-column layout and a smaller
   slot vocabulary*. The same decision applies for the same
   reasons.

### Verdict

Components-only, in `@kouji-ui/components`, no entry in
`@kouji-ui/core`. The component family is:

```
KjEmptyStateComponent           (selector: kj-empty-state)
  ├── slot: [kj-empty-state-icon]      (decorative leading visual)
  ├── slot: [kj-empty-state-title]     (renders <h3>)
  ├── slot: [kj-empty-state-description] (renders <p>)
  ├── slot: [kj-empty-state-actions]    (primary + secondary)
  └── slot: [kj-empty-state-secondary-actions] (optional)
```

Each sub-part is a thin presentational component. The root
component takes three inputs that *would* be the directive's
host bindings — `kjVariant`, `kjSize`, and `kjLive` — and reflects
them via its own host bindings. No `@kouji-ui/core` directive is
needed because there is nothing to extract into a headless layer.

### The one revisit-trigger

The decision flips if **either** of the following lands:

- A `KjLiveRegion` primitive is introduced as a standalone
  composable host directive that any component can apply to opt
  into `aria-live="polite"` / `aria-live="assertive"` /
  `role="status"` / `role="alert"` discipline. At that point,
  Empty State's component would compose the directive via
  `hostDirectives` (no new core surface for Empty State itself —
  it'd just consume the shared one). This is mechanical, not
  philosophical: the decision against a `KjEmptyState` directive
  doesn't change; we'd just consume `KjLiveRegion` from inside
  the existing component. See [Open question 4](#open-questions--risks).
- The library decides to support **slot-based content
  projection in the core layer** (i.e. shipping projection
  contracts as directives so the same content vocabulary can be
  rendered by alternative wrapper components). This is currently
  not a project goal; flagged for completeness. **No action
  expected.**

### Class naming

Per CLAUDE.md, drop the Angular type suffix unless there's a
collision. Empty State has no directive in core, so there is no
collision. File and class names:

- `KjEmptyStateComponent` — root (collision-avoiding suffix; if
  we ever introduce a `KjEmptyState` directive, the suffix on
  the component is what allows them to co-exist; until then,
  the suffix is kept for **forward-compat parity** with Card,
  Badge, Tag, Kbd, etc., all of which use `…Component`).
- `KjEmptyStateIconComponent`, `KjEmptyStateTitleComponent`,
  `KjEmptyStateDescriptionComponent`, `KjEmptyStateActionsComponent`
- File names: `empty-state.ts`, `empty-state-icon.ts`,
  `empty-state-title.ts`, `empty-state-description.ts`,
  `empty-state-actions.ts` — no `.component.ts` suffix (per the
  CLAUDE.md class-naming-applies-to-files rule).

## What exists today

Nothing on disk. No `packages/core/src/empty-state/` (and there
will not be one), no `packages/components/src/empty-state/`. This
analysis specifies the contract before code lands.

The roadmap context: Empty State sits in the "data display" group
alongside Card, List, Table. It is expected to ship after List
and Table land — both of those components forward-reference
Empty State as their conventional "no rows" content, so the
shape needs to be settled before they cite it in their docs.

## Base features

| Feature | Where it lives | Notes |
|---|---|---|
| `kjVariant` | Local input on `KjEmptyStateComponent` (reflected to `[attr.data-variant]`) | Two values: `'neutral'` (default — "no data yet", "no results", any non-error empty state) and `'error'` ("we couldn't load this — try again"). **Deliberate two-value set.** Resisted: `'success'` (an empty state is by definition not a success — if there's nothing to celebrate, an alert/toast is the right component), `'warning'` (warnings are runtime interruptions, not steady-state content; banner/alert territory). The `KjVariant` host-directive primitive is *not* composed because Empty State's variants are a closed set that does not align with the standard `primary/secondary/etc.` palette. |
| `kjSize` | `KjSize` host directive on the component | Presets `sm / md / lg`. **Three sizes for three real placements:** `sm` = inline empty (replaces ~3 list rows; smaller icon, tighter padding, typography one step down — fits inside a `<kj-card>` body cleanly); `md` = default (replaces a feed or section); `lg` = full-page or full-route empty (centred in a viewport-height container, larger illustration). The `xs` size is **deliberately omitted** — there is no real placement smaller than "inside a card" that wants an empty state with all four slots. |
| `kjLive` | Local input on `KjEmptyStateComponent` | Boolean. Default `false`. When `true` and `variant="neutral"`, the host's `role` becomes `status` and AT announces the content politely on appearance; when `true` and `variant="error"`, the host's `role` becomes `alert` and AT announces assertively. **The default is `false`** because the most common use of Empty State — the never-populated case ("no projects yet, create your first") — appears in the *initial* render of the page, when the AT has already announced the page's content. Live-announcing it again is noise. The `true` setting is reserved for **dynamic replacement** — the search-input case where the user typed and the result set collapsed — and for the **runtime-error** case. See [Accessibility](#accessibility-wcag-21-aaa). |
| `kjEmptyStateLabel` | Local input on `KjEmptyStateComponent` | Optional `aria-label` override. Default: AT reads the projected title + description via the live region (when `kjLive` is on) or via inline content (when off). Override only when a single-string accessible name is more appropriate (rare; e.g. when title and description are stylised in a way that reads awkwardly aloud). |
| Icon slot | `KjEmptyStateIconComponent` (selector `kj-empty-state-icon`) | Renders the consumer-projected icon / illustration with `aria-hidden="true"` and CSS that sizes it relative to the parent `data-size`. The component does **not** know what icon library is used; the consumer projects an `<svg>`, an icon-component, or an `<img>`. **Decision: always `aria-hidden`.** The icon is decorative — the title and description carry the accessible meaning. If a consumer's icon legitimately *is* the meaning (e.g. a custom illustration that is the only "search" cue), they pass the meaning into the title slot too; the icon stays hidden. Standard pattern across the field. |
| Title slot | `KjEmptyStateTitleComponent` (selector `kj-empty-state-title`) | Renders an `<h3>` by default. **Heading level configurable** via `kjLevel` input (`1 \| 2 \| 3 \| 4 \| 5 \| 6`, default `3`) because an empty state's appropriate heading level depends on its container's heading depth. A full-page empty state replacing the route's primary content wants `<h2>` or `<h1>`; an empty state inside a card body two sections deep wants `<h4>`. Mirror the same pattern Card established for `<kj-card-title>` (planned). |
| Description slot | `KjEmptyStateDescriptionComponent` (selector `kj-empty-state-description`) | Renders a `<p>`. No further config. |
| Actions slot | `KjEmptyStateActionsComponent` (selector `kj-empty-state-actions`) | Renders a `<div>` with `display: flex; gap; justify-content: center;`. Consumer projects 0–2 buttons / links: typically one primary `<button kjButton variant="primary">` ("Create your first project") and optionally one secondary `<button kjButton variant="ghost">` or `<a kjLink>` ("Learn more"). Component does **not** enforce button count — three buttons is allowed but discouraged in docs. |
| Secondary actions slot | Optional named slot via `<ng-content select="[secondary]">` inside `KjEmptyStateActionsComponent` | Renders below the primary actions in a smaller-text row. Use for "still stuck? contact support" tertiary affordances. **Optional** because most empty states need only the primary row. |
| Touch target | Inherited from projected buttons | `KjButton` already enforces 44×44 minimum; Empty State adds nothing. |

## Accessibility (WCAG 2.1 AAA)

The hardest a11y question for Empty State is **whether and when
to use a live region**. The visual cue that "the list is empty"
is invisible to AT users; the same content rendered with the
same DOM can be invisible-on-arrival or announced-on-arrival
depending on whether the empty state was there from page load
or whether it appeared in response to user action.

Reference: [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/) has
no dedicated Empty State pattern; the relevant guidance is the
[Live Region Roles](https://www.w3.org/WAI/ARIA/apg/practices/live-regions/),
specifically `role="status"` (polite, additions only —
appropriate for "no results") and `role="alert"` (assertive —
appropriate for "we couldn't load this"). Also consulted:
[ARIA in HTML §`<aside>`/`<section>`](https://www.w3.org/TR/html-aria/),
which warns against decorating arbitrary content blocks with
`role="region"` (the landmark-overuse anti-pattern); we follow
that guidance and **do not** put `role="region"` on Empty State.

| Criterion | Requirement | Where it lives |
|---|---|---|
| 1.1.1 Non-text Content | The illustration/icon is decorative; the accessible meaning is in the title + description | `KjEmptyStateIconComponent` host-binds `aria-hidden="true"` unconditionally. The consumer's projected `<svg>` / icon-component does not need its own `aria-label`; the wrapper's `aria-hidden` is sufficient. |
| 1.3.1 Info & Relationships | The title is a heading at an appropriate level; the description follows it; the actions are buttons or links — all conveyed by native semantics | `KjEmptyStateTitleComponent` renders `<h{kjLevel()}>`; `KjEmptyStateDescriptionComponent` renders `<p>`; actions are projected `<button kjButton>` / `<a kjLink>`. The root component does **not** wrap the whole thing in a `role="region"` or `<section>` — see ["No landmark"](#no-landmark) below. |
| 1.4.3 / 1.4.6 Contrast | Title and description text ≥ 7:1 against the empty-state background (which is typically the same as the surrounding container — card surface or page background) | Theme tokens. `--kj-color-base-content` on `--kj-color-base-100`. **Verify** for the `error` variant where the description may be tinted toward `--kj-color-error-content` — must clear 7:1 against the same background. |
| 1.4.11 Non-text Contrast | If the icon has a meaningful outline (the "raised illustration" theme variant), its outline ≥ 3:1 against the page | Theme/token responsibility. Most empty-state illustrations are flat-coloured shapes that already clear 3:1; risk is concentrated in line-drawing illustrations on tinted backgrounds. |
| 2.1.1 Keyboard / 2.1.2 No Keyboard Trap | n/a | Empty State has no interactive contract of its own. The projected action buttons are reachable via Tab and own their own keyboard story (KjButton). |
| 2.4.6 Headings and Labels | The title clearly describes the empty state ("No projects yet", "No results for `octopus`", "We couldn't load your data"), in line with the variant | Documentation-only — the component cannot enforce title quality, but the docs page ships writing-guidance examples. |
| 2.4.7 Focus Visible | n/a on the root; inherited from projected buttons | KjButton's focus ring. |
| 2.5.5 Target Size (AAA) | The action buttons must be ≥ 44×44px | KjButton enforces. |
| 4.1.2 Name, Role, Value | The container has no role by default (it is plain content); when `kjLive=true`, the role becomes `status` (neutral) or `alert` (error); the title carries the accessible name when AT announces the live region | Root component host bindings, conditional on `kjLive()` and `kjVariant()`. |
| 4.1.3 Status Messages | When `kjLive=true`, AT must announce the empty state on appearance without requiring focus to move | `role="status"` (additions-only, polite) or `role="alert"` (assertive). The live region's content (title + description) is read out. |

### When to use `kjLive` — the rule of thumb

Three placements; three different answers:

1. **Initial-render empty state** (the never-populated case —
   "no projects yet, create your first" on a freshly-visited
   route). `kjLive=false`. The page has just loaded; AT has just
   announced the page content; the empty state is part of the
   document flow and is read in turn. Adding a live region here
   would re-announce content the user already heard.
2. **Search/filter-result empty state** (the dynamic case —
   user typed `octopus` and the results collapsed to zero).
   `kjLive=true` with `variant="neutral"` → `role="status"`. AT
   announces "No results match `octopus`" politely without
   stealing focus. This is the central use case for the live
   region.
3. **Runtime-error empty state** ("we couldn't reach the server").
   `kjLive=true` with `variant="error"` → `role="alert"`.
   AT announces assertively. Use sparingly — `role="alert"`
   interrupts whatever the user was hearing. If the error is
   recoverable and the user can keep working with stale data
   shown elsewhere on the page, prefer a banner alert (which
   uses `role="status"`) and reserve `role="alert"` for the
   "the data is gone and you must act" case.

The default is `kjLive=false` because case 1 is the most common.
Cases 2 and 3 are explicit consumer choices.

### `role="status"` vs. `aria-live="polite"`

`role="status"` implies `aria-live="polite"` and
`aria-atomic="true"`. We use `role="status"` (rather than the
two attributes separately) because the role is the more
semantically informative annotation — it says "this region's
purpose is to communicate status", not just "this region might
update". Likewise `role="alert"` for the error case.

The component **does not** combine roles with `aria-live`
overrides — they would conflict. If a consumer has an exotic
case (very rare), they can hand-roll the live region around
the empty state and pass `kjLive=false` to the component.

### No landmark

The root does **not** receive `role="region"` or render as a
`<section>` with an `aria-labelledby` to the title. Quoting
the [APG landmark guidance](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/):
landmarks are reserved for the page's primary structural
divisions (header, nav, main, complementary, footer, search,
form). A list's empty branch is a *content state*, not a
structural division, and tagging every content state as a
landmark adds noise to the AT user's landmark navigation. We
follow Card's same decision (see [`./card.md`](./card.md)).

### `aria-labelledby` to the title — rejected for the same reason as Card

The auto-labelledby pattern (root host-binds `aria-labelledby`
to the projected `KjEmptyStateTitle`'s id) was considered and
rejected. Two reasons:

1. With no role on the root, `aria-labelledby` has nothing to
   label — AT does not announce the container's name when the
   container has no role.
2. With `role="status"` or `role="alert"` on the root, the live
   region announces its **content**, not its labelled name.
   `aria-labelledby` would be silent in exactly the cases the
   live region exists to handle.

The title is announced because it is an `<h3>` (or whichever
level) inside a live region whose `aria-atomic="true"` wraps
the whole subtree's text — not because of a labelledby
reference.

### Heading level — consumer choice, default safe

`KjEmptyStateTitle` defaults to `<h3>`. The consumer overrides
via `kjLevel` for full-page placements (where `<h1>` or `<h2>`
is right) or for deeply-nested placements (where `<h4>`+ is
right). Defaulting to `<h3>` matches the most common placement
(inside a card or section, two heading levels deep) and matches
shadcn's default for `<CardTitle>`.

### Touch target — projected buttons inherit

The Empty State component does not enforce touch-target sizes;
projected action buttons do, via `KjButton`'s own enforcement
(see [`../actions/button.md`](../actions/button.md)). If a
consumer projects an `<a>` without `kjLink` or a non-button
element as an action, they are responsible for the 44×44
contract — the docs page calls this out.

## Composition model

```
KjEmptyStateComponent              (selector: kj-empty-state)
  └── hostDirective: KjSize        (data-size routing)

KjEmptyStateIconComponent          (selector: kj-empty-state-icon)
KjEmptyStateTitleComponent         (selector: kj-empty-state-title)
KjEmptyStateDescriptionComponent   (selector: kj-empty-state-description)
KjEmptyStateActionsComponent       (selector: kj-empty-state-actions)
```

One root, four sub-components, one host directive composition
on the root (`KjSize`). No core directive. No context tokens —
the sub-components do not need to read root state because the
root's variant / size affect the *root's* host bindings only;
sub-component styling is driven by CSS descendant selectors
(`kj-empty-state[data-size='sm'] kj-empty-state-icon { … }`)
declared in `empty-state.css`, not by per-child host bindings.

The rationale for **no context token** is that the children do
not behave differently based on root state in any way that
needs JS — they just look smaller / larger via CSS. Adding a
context token would be machinery without a payoff.

### Reused primitives

| Primitive | Where | Why |
|---|---|---|
| `KjSize` | `hostDirectives` on `KjEmptyStateComponent` (with a `KJ_SIZE_PRESET` provider declared by the component) | Standard size routing. Reflects `data-size`, validates against the preset list, ships dev-mode warnings on unknown values. Preset: `[sm, md, lg]` default `md`. |
| `KjVariant` | **Not used.** | Empty State's variant set (`neutral` / `error`) does not align with the standard `KjVariant` palette (`primary` / `secondary` / `accent` / `info` / `success` / `warning` / `error` / `ghost`). Forcing alignment would either pollute `KjVariant` with a meaningless `'neutral'` token or force consumers to pass `'info'` and rely on docs to map it back to neutral. Local input + local data attribute is simpler. |
| `KjLiveRegion` | **Not used (yet).** | This is the one revisit-trigger from the Decision section. If `KjLiveRegion` lands as a shared primitive, Empty State composes it via `hostDirectives` and the local `kjLive` input forwards into it. Until then, the live-region role is a single `[attr.role]` host binding on the root. |
| `KjButton`, `KjLink`, `KjFocusRing`, `KjFocusTrap`, `KjDisabled`, `KjFormControl`, `KjRovingTabindex` | **Not used.** | Empty State has no interactive contract. The projected action buttons compose these primitives themselves. |

### Cross-component pointers

- [`./card.md`](./card.md) — closest sibling **in shape**:
  components-only, slot-based, no core directive, multiple thin
  presentational sub-parts. The "no core directive for static
  containers with named slots" decision is established there
  and inherited here. **The most common consumer**: a card
  whose body is empty renders `<kj-empty-state size="sm">`
  inside the `<kj-card-content>` slot.
- [`./list.md`](./list.md) — the **canonical empty consumer**.
  When a List has no items, the consumer's template branches
  (`@for (item of items()) { <kj-list-item>…</kj-list-item> }
  @empty { <kj-empty-state>…</kj-empty-state> }`) render the
  empty state in place of repeated rows. List's analysis
  forward-references this component for that case. The List
  container's `aria-label` covers the populated case; the empty
  state's content covers the empty case — there is no shared
  ARIA surface.
- `../data-display/table.md` (planned) — the table counterpart
  to List. A `<kj-table>` with no rows renders an empty state
  in its body, typically `size="md"` because tables tend to be
  visually heavier than lists. The table's caption (`<caption>`
  or `aria-labelledby`) covers the populated case; empty state
  carries its own naming.
- [`../feedback/alert.md`](../feedback/alert.md) (planned) —
  **the runtime sibling**. Alert is for *interruptions* during
  populated states ("your account is now in read-only mode");
  Empty State is for *replacements* of empty states ("there is
  nothing"). They can co-occur on the same page (a banner
  alert above an empty list). The error-variant of Empty State
  (`variant="error"`) overlaps tonally with Alert's
  error-severity but is structurally distinct: Empty State
  *replaces* the data; Alert appears *alongside* whatever data
  is present. Consumers picking between them: if there is
  data to show, use Alert; if there isn't, use Empty State
  with `variant="error"`.
- [`../feedback/skeleton.md`](../feedback/skeleton.md)
  (planned) — the **transient sibling**. Skeleton is "we're
  fetching"; Empty State is "we fetched and there is nothing".
  Consumers must not flash an empty state during a short
  fetch — that produces a "no data… oh wait, here it is"
  jolt. The right pattern: skeleton until the fetch resolves;
  on resolution, branch on `data.length === 0` to either
  empty state or rows. Documented in the docs page.
- [`../actions/button.md`](../actions/button.md) — the action
  buttons projected into `<kj-empty-state-actions>` are
  `<button kjButton>` / `<a kjLink>`. Empty State adds no
  button affordances of its own.
- `KjSize` — `packages/core/src/presets/size.ts`. Same
  composition pattern as Badge, Tag, Avatar, Kbd, etc.

## Inputs / Outputs / Models

All public-facing inputs/outputs/models are `kj`-prefixed.

### `KjEmptyStateComponent` (`<kj-empty-state>`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjVariant` | `input` | `'neutral' \| 'error'` | `'neutral'` | Reflects to `[attr.data-variant]`. Drives theme paint (icon tint, optional border accent). Combined with `kjLive` to derive `role`. |
| `kjSize` | `input` | `'sm' \| 'md' \| 'lg'` (preset-driven) | `'md'` | Provided by composed `KjSize`. Reflects to `[attr.data-size]`. Preset-validated in dev mode. |
| `kjLive` | `input` | `boolean` | `false` | When `true`: `[attr.role]` becomes `'status'` (neutral) or `'alert'` (error). When `false`: no role, no live behaviour. |
| `kjEmptyStateLabel` | `input` | `string \| undefined` | `undefined` | Optional `aria-label` override. Reflects to `[attr.aria-label]`. Use rarely — the title + description are usually the right accessible name via the live region. |
| (host) `[attr.data-variant]` | host binding | — | — | From `kjVariant`. |
| (host) `[attr.data-size]` | host binding | — | — | From `KjSize`. |
| (host) `[attr.role]` | host binding | — | — | Computed: `kjLive() ? (kjVariant() === 'error' ? 'alert' : 'status') : null`. |
| (host) `[attr.aria-label]` | host binding | — | — | From `kjEmptyStateLabel()`, or `null` when unset. |

No outputs. No models. Empty State is one-way display.

### `KjEmptyStateIconComponent` (`<kj-empty-state-icon>`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| (host) `aria-hidden` | host attribute | — | `'true'` | Always. The icon is decorative. |

No inputs. The consumer projects icon content via `<ng-content>`.

### `KjEmptyStateTitleComponent` (`<kj-empty-state-title>`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjLevel` | `input` | `1 \| 2 \| 3 \| 4 \| 5 \| 6` | `3` | Renders the projected text inside `<h{kjLevel}>` via `@switch` in the template. |

No outputs. Consumer projects text via `<ng-content>`.

### `KjEmptyStateDescriptionComponent` (`<kj-empty-state-description>`)

No inputs. Renders `<p>` containing the projected `<ng-content>`.

### `KjEmptyStateActionsComponent` (`<kj-empty-state-actions>`)

No inputs. Renders a `<div>` with two `<ng-content>` slots:

- Default slot: primary action row.
- `<ng-content select="[secondary]">`: secondary actions row
  (renders below the primary row in smaller type, only if any
  child is projected — uses `*ngContentSelector`-equivalent
  conditional logic via a CSS `:has()` rule in `empty-state.css`).

## Examples to ship

`packages/components/src/empty-state/`:

1. **Default — never-populated** (`empty-state.default.example.ts`)
   — "No projects yet" with a folder illustration, a "Create your
   first project" primary button, no live region. Anchors the
   most common case and visually verifies the `md` size + neutral
   variant chrome.
2. **No search results** (`empty-state.no-results.example.ts`) —
   wired to a search input; the empty state is conditionally
   rendered with `kjLive`. Includes a comment in the example
   source explaining why `kjLive` is on here but not in (1).
   Demonstrates the `role="status"` integration. The example
   also includes a visible-on-focus "Clear search" link in the
   actions slot.
3. **Error variant** (`empty-state.error.example.ts`) — "We
   couldn't reach the server" with an error illustration, a
   "Retry" primary button, a "Contact support" secondary link.
   `kjLive=true` and `variant="error"` → `role="alert"`. Source
   comments explain the assertive-vs-polite trade-off.
4. **Inline (small) inside a card body** (`empty-state.in-card.example.ts`)
   — `<kj-card>` whose `<kj-card-content>` is `<kj-empty-state size="sm">`.
   Anchors the card-as-host pattern; lives in the empty-state
   folder so the empty-state docs page can preview it without
   depending on the card docs page's example registry.
5. **Inline inside a list `@empty` block** (`empty-state.in-list.example.ts`)
   — `<kj-list>` with `@for { … } @empty { <kj-empty-state size="sm"> }`.
   Same locality argument. Demonstrates the list's empty branch.
6. **Full-page** (`empty-state.full-page.example.ts`) — `size="lg"`
   centred in a viewport-height container. Anchors the
   full-page case (e.g. an empty inbox route).
7. **With secondary actions row** (`empty-state.secondary-actions.example.ts`)
   — primary "Create" + secondary `[secondary]`-slotted "Learn
   more" / "Contact support" links. Demonstrates the optional
   secondary slot.
8. **Custom heading level** (`empty-state.heading-level.example.ts`)
   — full-page empty state where `<kj-empty-state-title kjLevel="1">`
   replaces the default `<h3>`. Demonstrates `kjLevel` and
   anchors the document-outline use case.
9. **Themed (components-only)** — `empty-state.example.ts`,
   `empty-state.retro.example.ts`, `empty-state.finance.example.ts`.
   Confirms the visual layer adapts cleanly to themed surfaces.
   Especially useful for the icon slot (illustration style is the
   most theme-dependent part of an empty state).

## Open questions / risks

1. **Should `kjLive` default to `true` instead?** Tempting:
   "if you forget, at least AT announces it". The case for the
   current default (`false`) is in [Accessibility](#when-to-use-kjlive--the-rule-of-thumb).
   Re-quoting briefly: the most common Empty State placement is
   the initial-render never-populated case, where the page's
   own load announcement already covers the content; live-
   announcing it again is noise. **Lean: keep `false` as the
   default.** The docs page must call out the search-results
   case prominently because that is where consumers most often
   forget to opt in.

2. **Should there be a `KjLiveRegion` shared primitive?**
   Outside this component's scope but cited as a revisit-trigger
   above. The case for it: Empty State, Alert, Toast, and the
   "save status" indicator near a form's submit button all need
   `role="status"` / `role="alert"` discipline with consistent
   `aria-atomic` and `aria-relevant` values; centralising avoids
   four implementations. **Lean: yes, eventually, but not
   blocking Empty State.** When `KjLiveRegion` ships, Empty
   State refactors to compose it via `hostDirectives` instead
   of carrying the `[attr.role]` binding directly. The public
   API of Empty State (`kjLive`) does not change.

3. **Variant set — is `error` enough, or do we need `warning`
   and `info` too?** Considered. **Decision: no for v1.**
   Reasoning:
   - `'info'` overlaps entirely with `'neutral'`. An empty state
     that is purely informational ("no projects yet") is the
     neutral case. Splitting them would force consumers to make
     a meaningless choice.
   - `'warning'` is a runtime *interruption* tone — "this is
     getting worse, attend to it". Steady-state "there is no
     data" content does not have a warning shape; the cases
     consumers reach for warning ("you have hit your storage
     quota — no further uploads allowed") are *banner* /
     *alert* territory because the *populated* state is the
     thing being warned about, not the empty one.
   - If a future use case appears that genuinely needs a third
     tone, adding it is a non-breaking change (new value on a
     literal-string union; no API churn).

4. **Heading level — should it auto-detect from context?**
   Considered: a `KjHeadingLevelContext` injection token whose
   nearest provider sets the level so `<kj-empty-state-title>`
   automatically picks the right `<hN>`. **Decision: no for
   v1.** The token machinery is real coordination work
   (provider on every heading-level-establishing component)
   and the explicit `kjLevel` input is two characters of
   template. Revisit if the same auto-detect is needed by
   Card, Section, Modal, etc., at which point the shared token
   becomes worth it. Until then, explicit beats clever.

5. **Icon slot — should it be required?** Some empty-state
   designs are text-only ("No matching results."). **Decision:
   the icon slot is optional.** The component renders cleanly
   with just `<kj-empty-state-title>` and `<kj-empty-state-description>`.
   The default centred-column CSS does not require the icon
   element to exist. Documented; the no-icon variant gets its
   own example slot (folded into example 2 above — the
   "No search results" case is often text-only).

6. **Does the description allow rich content (links inside
   prose)?** Common case: "No results match `octopus`. Try
   adjusting your filters or [browse all items]." **Decision:
   yes.** `KjEmptyStateDescriptionComponent` projects
   `<ng-content>` into a `<p>`; the consumer can include
   inline `<a kjLink>` freely. Docs page shows this pattern.
   The accessible-name story doesn't change — the description
   text including the link's text is what AT announces in the
   live region.

7. **Multiple action buttons — discouraged but not forbidden.**
   The actions slot accepts any number of children. Three or
   more buttons creates choice paralysis and is bad UX, but
   the component does not enforce a count. **Documented; not
   technically enforced.** A dev-mode `console.warn` was
   considered and rejected as paternalistic — there are
   legitimate cases (e.g. a multi-tenant SaaS empty state
   offering "Create from template / Import / Start blank")
   where three primary actions is correct.

8. **Can the empty state itself be focusable?** Some patterns
   move focus *to* the empty state's title when it appears
   (e.g. "the user just performed an action that emptied the
   list, draw their attention"). **Decision: no, by default
   and for v1.** The component does not host `tabindex="-1"`
   and does not call `.focus()` on appearance. The live region
   announcement is the right discipline for AT users;
   keyboard users can already Tab to the action buttons. If
   a consumer has a strong reason to move focus (rare), they
   add `tabindex="-1"` to a child element and call focus
   themselves — Empty State does not get in the way. Revisit
   if the pattern proves common.

9. **CSS centring — should it be flex or grid?** Implementation
   detail; flagged here only because it affects the SSR output.
   **Lean: flex** (`display: flex; flex-direction: column;
   align-items: center; justify-content: center; gap: …`)
   because flex layout is more universally supported in
   email-rendering contexts (Empty State is occasionally
   rendered into an email body in admin tools; rare but real).
   No SSR-specific concerns; both flex and grid hydrate fine.

10. **Touch-target enforcement on projected actions.** The
    component cannot enforce 44×44 on projected children
    because it does not know what they are. The convention is:
    consumers project `<button kjButton>` or `<a kjLink>`,
    both of which already enforce. **Risk:** consumers who
    project a raw `<a>` without `kjLink` (e.g. a CMS-rendered
    text link) bypass the touch-target enforcement. **Mitigation:**
    the docs page strongly recommends `kjLink` for any link
    inside the actions slot; no runtime enforcement in v1.
    Revisit if consumer audit shows widespread bare-`<a>` use.

11. **`aria-atomic` for the live region.** When `role="status"`
    or `role="alert"` is set, `aria-atomic="true"` is the
    correct default (the whole region's content is announced
    on update, not just the changed parts). The component
    sets `[attr.aria-atomic]="kjLive() ? 'true' : null"`
    alongside the role binding. **Risk:** consumers who
    update the empty state's content *while it is visible*
    (e.g. live-search debouncing where the title changes from
    "Searching…" to "No results match `octopus`") will get
    the entire content re-announced, which is the correct
    behaviour for atomic but may feel verbose. **Documented;
    not a v1 blocker.**

12. **Hydration / SSR.** Empty State has no client-side state,
    no event listeners, no `MutationObserver`,
    no `afterNextRender`. The host bindings are pure functions
    of inputs. SSR renders the final DOM verbatim including
    the conditional `role` attribute; hydration is a no-op.
    No SSR-specific risks.

13. **Empty state inside a tab panel that becomes hidden.**
    The empty state is rendered inside a `<kj-tab-panel>` that
    can be hidden via `aria-hidden`. When hidden, the live
    region must not announce. **Resolution:** standard ARIA
    behaviour — a live region inside `aria-hidden="true"` is
    silenced by AT. No special handling needed in Empty State.

14. **Re-using the component for "you have no permissions"
    permission-denied screens.** Tempting to add a
    `'forbidden'` variant. **Decision: no — this is a
    different component.** Permission-denied is a *security*
    response, not a data-empty response, and typically wants
    distinct chrome (lock icon, "request access" button,
    sometimes redirect link to a login). Folding it into Empty
    State conflates two concerns. Plan a `PermissionDenied`
    component (or use `ErrorPage` with a `403` shape) when
    the case arises.

15. **i18n / RTL.** The centred-column layout is RTL-safe by
    construction (no horizontal asymmetry). The action buttons
    inherit `KjButton`'s RTL behaviour. The only translation-
    relevant aspect is consumer copy — no string lives in the
    component. **No risk.**
