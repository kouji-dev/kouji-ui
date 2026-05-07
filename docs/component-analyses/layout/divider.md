# Divider / Separator

A thin line that separates two regions of content. Visually, a 1px
rule running horizontally between sections of a card, between groups
of menu items, between rows of a list, or vertically between the
items of a button group, a toolbar, or a stat strip. Sometimes the
line carries a label in the middle ("OR", "Today", "January") in
which case the rule splits and the label sits flush in the gap.

Semantically, a divider is the smallest, lowest-stakes thing in the
whole roadmap that still has a real a11y story — the difference
between a *decorative* hairline and a *structural* section break is
visible to assistive technology and matters in templated layouts
where the same chrome renders in both roles. The component's whole
job is: pick the right host element, set the right ARIA, reflect a
handful of `data-*` attributes for theme CSS to consume, and document
the surrounding patterns (in-content label; vertical orientation
inside a flex strip; orientation inversion under flex-direction
changes) that consumers will otherwise hand-roll wrong on every
project.

> Not yet shipped. No `packages/core/src/divider/` directory exists
> today. This analysis specifies the contract — and the surrounding
> pattern set — before code lands.

This is the **only** component in the layout category and the **last
component in the analysis sprint** (62 of 62 — the analysis pipeline
closes on this file). Cross-references throughout point to siblings
that are already analysed; nothing downstream depends on this file
being open. For the **menu group separator** consumer, see
[`../actions/dropdown-menu.md`](../actions/dropdown-menu.md) §
"`[kjMenuSeparator]`" — that directive is a **specialised sibling**
of the generic divider, with stricter ARIA (`role="separator"` is
required by the menu pattern; `aria-hidden` is forbidden because the
separator skips during arrow-key navigation), and is **not** the same
class. The general-purpose `[kjDivider]` documented here is the
default; `[kjMenuSeparator]` is a constrained variant inside the menu
context. Both files cross-link.

For consumers of the general-purpose divider, see:

- [`../data-display/card.md`](../data-display/card.md) — between
  card sections (header / body / footer).
- [`../data-display/list.md`](../data-display/list.md) — between
  groups of rows. List itself owns its inter-row hairline via a
  `data-divided` attribute on the list container (theme-side CSS),
  not by inserting `<kj-divider>` instances; Divider is reached for
  when the consumer wants a divider *between groups of rows*, not
  between every row.
- [`../navigation/menu.md`](../navigation/menu.md) — Menu is the
  primary owner of `[kjMenuSeparator]`; see the cross-reference
  above. The non-menu nav patterns (Menubar, Breadcrumb) do **not**
  use `[kjDivider]` — Menubar uses the constrained `[kjMenuSeparator]`
  inside popups (see [`../navigation/menubar.md`](../navigation/menubar.md)),
  and Breadcrumb's `>` separators are typography, not dividers (see
  [`../navigation/breadcrumb.md`](../navigation/breadcrumb.md) — they
  are `aria-hidden` text glyphs in the link row, not separator
  semantics).
- [`../actions/button-group.md`](../actions/button-group.md) — between
  the buttons of a segmented control. The button-group analysis flags
  this for divider-time and explicitly **does not** own the divider
  rule itself; that ships here.
- A **Toolbar** consumer is named in the brief but is **not on the
  roadmap** (the README lists 62 components and Toolbar is not one
  of them — Menubar and Button Group cover the toolbar use cases the
  roadmap cares about). If a future Toolbar is scoped, it will
  consume `[kjDivider]` in the same shape as Button Group does. No
  forward-reference file is created.

## Source comparison

| Concern | PrimeNG `p-divider` | Angular Material `mat-divider` | shadcn/ui `Separator` (Radix) | daisyUI `.divider` |
|---|---|---|---|---|
| First-class component? | Yes — `<p-divider>` | Yes — `<mat-divider>` (very minimal) | Yes — `<Separator />` (Radix `@radix-ui/react-separator`) | Yes — CSS class on a `<div>` |
| Selector / element | `<p-divider>` (renders `<div>`) | `<mat-divider>` (renders `<hr>`-equivalent `<div role="separator">`) | `<Separator />` (renders `<div role="separator">` by default; `<hr>` if `decorative={false}` and consumer asks) | `class="divider"` on a `<div>` |
| Native `<hr>` used? | **No** — renders a styled `<div>` | **No** — renders `<div>` with `role="separator"` (their reasoning: `<hr>` was originally hard to style cross-browser; the abstraction predates modern CSS) | **No** by default — Radix renders `<div role="separator">` so it works with content (label) and vertical orientation; consumer can opt into `<hr>` for purely decorative cases | **No** — `<div class="divider">` with `::before`/`::after` pseudo-elements rendering the rule. The class on `<hr>` would not work because the implementation needs two children to support the with-content layout |
| Orientation | `layout="horizontal" \| "vertical"` (default `horizontal`) | `vertical` boolean input (default `false` → horizontal) | `orientation="horizontal" \| "vertical"` (default `horizontal`) | `divider-horizontal` / `divider-vertical` modifier classes (default vertical-of-horizontal-flow, i.e. horizontal rule) |
| With-content (label in middle) | `<p-divider>OR</p-divider>` — projects content; renders `::before` / `::after` rules + the projected text in the middle | **No** — Material's divider is rule-only. With-content is a non-feature | **No** — Radix's separator does not project content. Consumers compose two separators manually around a label, or use a different pattern | Yes — `<div class="divider">OR</div>` projects content; the `::before`/`::after` lines split around it. This is the canonical with-content pattern of the field |
| Content alignment | `align="left" \| "center" \| "right"` (default `center`) | n/a | n/a | n/a (always centred via flex) |
| Variant / line style | `type="solid" \| "dashed" \| "dotted"` (default `solid`) | None — single solid hairline | None — single solid hairline (consumer overrides with Tailwind `border-dashed` etc.) | None — single solid hairline; modifiers like `divider-primary`, `divider-secondary`, `divider-accent` etc. tint the rule but don't change line style |
| Spacing | None as input — themes own margin | None as input — themes own margin | None as input | None as input — class includes default vertical margin (~`1rem`) |
| ARIA — `role="separator"` | Yes, on the host `<div>` | Yes, on the host `<div>` | Yes by default (`<Separator>` always sets `role="separator"`); when `decorative={true}` (Radix's default), it sets `role="none"` + `aria-orientation` is dropped | **No** — bare `<div>`. The class is purely visual and consumers are not advised to add `role="separator"` |
| ARIA — `aria-orientation` | Reflected from `layout` | Reflected when `vertical=true` (`aria-orientation="vertical"`); horizontal omits it (the spec default) | Reflected from `orientation` (always present, even for `horizontal` — Radix is over-explicit) | n/a |
| ARIA — decorative case | Not addressed — divider is always `role="separator"` | Not addressed — same | **Yes — first-class.** `decorative` prop (default `true`!) sets `role="none"` and removes `aria-orientation`, treating the line as paint. Only when consumer explicitly passes `decorative={false}` does it become `role="separator"`. **This is the design decision worth borrowing.** | Not addressed |
| Keyboard | Non-focusable, non-interactive | Non-focusable, non-interactive | Non-focusable, non-interactive | n/a |
| `<hr>` opt-in | No | No | No (Radix uses `<div>` to support all orientation/content combinations uniformly) | No |
| Supports vertical with content | Yes (via `layout="vertical"` + projection; renders rotated rule) | No (vertical-only, no content support) | No (vertical orientation supported but no content projection) | Yes (`divider-vertical` + content) |

**Read-off.**

- **Material is the floor; PrimeNG and daisyUI are the ceiling.**
  Material's divider is one input (vertical or not), one rule, and
  is functionally the same as a styled `<hr>` with a class.
  PrimeNG and daisyUI both add the **with-content** pattern (label
  in the middle), the **orientation** dimension *applied to the
  with-content case* (vertical divider with a vertical label —
  rare, but real — appears in side-by-side compare panels), and a
  small **line-style** dimension (solid / dashed / dotted). We
  match PrimeNG/daisyUI on capability and we match Radix on the
  decorative-vs-structural a11y distinction (Material's "always
  `role="separator"`" stance is the wrong default for a
  predominantly-decorative element).
- **Radix's `decorative` default is the right default.** Most
  dividers in the wild are paint between sections that the
  surrounding heading hierarchy (`<h2>`, `<h3>`, etc.) already
  separates semantically. Putting a `role="separator"` on every
  one of them creates AT noise — the line gets announced as
  "separator" between every heading-and-body pair on the page. The
  AT-correct posture is `aria-hidden="true"` (or `role="none"`)
  for visual section breaks and `role="separator"` reserved for
  the cases where the divider *is* the only thing demarcating two
  regions (no surrounding heading, no parent landmark). We adopt
  Radix's `decorative` default (flipped to a `kjStructural` input
  in our naming, see [Inputs](#inputs--outputs--models)).
- **No library uses `<hr>` as the host.** Three independent
  implementations all picked `<div role="separator">` over the
  native semantic. The reasoning in PrimeNG's source comments,
  Material's design notes, and Radix's docs all converge: `<hr>`
  cannot host children (it is a void element), so the with-content
  pattern is impossible on `<hr>`; and applying the same component
  to two different host elements depending on whether content is
  projected creates a confusing API. We follow this decision and
  reason through it in [Decision (host element)](#decision-host-element)
  — but with one variation: we expose an opt-in `<hr kjDivider>`
  for the rule-only / no-content case, because the native semantic
  is the right thing when nothing else is going on.
- **PrimeNG's `align` (left / center / right for the label) is
  worth keeping.** Real designs use it: an "OR" divider centres;
  a "Today" timeline divider often left-aligns; a "More items
  below" divider right-aligns with a chevron. Cheap to ship.
- **Spacing is not an API.** No library exposes margin or
  thickness as inputs. Themes own those tokens. We do the same.

## Decision (core directive)

**Yes — ship `KjDivider` as a single attribute directive (`[kjDivider]`)
and a wrapper component (`<kj-divider>`).** Strong yes for the
directive existing; *minimal* for what it does. The directive is
borderline between "pure CSS" and "real a11y semantic" — but the
right side of the line, for reasons that take a paragraph to set
out.

### The case against (rejected)

The case for **CSS-only** is real. A divider is paint. daisyUI ships
it as a class. Three of the four reference libraries (counting
Material's stance) treat it as essentially-a-class-with-some-ARIA.
We could expose `.kj-divider`, document `role="separator"`
(or omit it for decorative cases) as a consumer convention, and
ship nothing in `core`. Pros:

- Zero JS cost per divider instance — meaningful when a long page
  has a dozen section dividers.
- Smallest possible surface; ergonomic for consumers writing
  markdown-rendered docs (a markdown `---` becomes `<hr>` and the
  consumer just adds a class).
- Matches the "CSS-only utilities are not directives" rule in
  [`../../../rules/code_style.md`](../../../rules/code_style.md) §
  "What NOT to Build".

We **reject** this for three reasons.

1. **The structural-vs-decorative ARIA decision must be enforced,
   not documented.** This is the same threshold `KjAlertIcon` and
   `KjSkeleton` clear (see
   [`../feedback/skeleton.md`](../feedback/skeleton.md) § "Decision"
   and [`../feedback/alert.md`](../feedback/alert.md) §
   "Composition"). The default for a divider — and the contested
   point across libraries — is whether AT announces it. CSS cannot
   add `role="separator"`, cannot add `aria-orientation`, cannot
   add `aria-hidden`. Documenting "remember to add `role="separator"`
   when the divider is structurally meaningful and `aria-hidden`
   when not" is exactly the contract a directive exists to enforce.
   Material's stance ("always `role="separator"`") is the wrong
   default; daisyUI's stance ("no ARIA, ever") is also wrong. The
   directive picks the right default per consumer intent and
   reflects it.
2. **Orientation is not just visual.** A vertical divider needs
   `aria-orientation="vertical"`. CSS cannot emit that attribute.
   Without the directive, every consumer who switches a divider's
   orientation under a flex-direction change has to remember to
   flip the ARIA too — and they won't.
3. **`data-*` reflection is the contract surface for themes.** The
   directive emits `data-orientation`, `data-with-content`,
   `data-variant`, `data-size`. Themes read those attributes to
   pick the right rule, the right pseudo-element layout (with vs.
   without content), the right line style (solid vs. dashed vs.
   dotted), and the right margin / thickness scale. CSS-class-only
   divides this contract across N theme stylesheets and N consumer
   templates; centralising in the directive removes a per-instance
   plumbing burden.

### The shape we ship

Two layers, with the directive as the contract anchor.

1. **`[kjDivider]` (core attribute directive).** Owns:
   - `role="separator"` when `kjStructural=true` (or by default on
     `<hr>` hosts; `<hr>` has implicit `role="separator"` per HTML
     AAM, so the directive does **not** set it — see
     [Accessibility](#accessibility-wcag-21-aaa)).
   - `aria-hidden="true"` when `kjStructural=false` (default).
   - `aria-orientation="vertical"` when `kjOrientation="vertical"`
     and `kjStructural=true`. (For horizontal structural dividers,
     omit the attribute — `horizontal` is the spec default and
     setting it explicitly is redundant noise.)
   - `data-orientation` reflection (always) so theme CSS can
     branch.
   - `data-with-content` reflection (auto-detected; see
     [Composition model](#composition-model)) so theme CSS can
     pick the with-content layout (two pseudo-element rules
     flanking the content) vs. the rule-only layout (single
     pseudo-element rule).
   - `data-variant` reflection from `KjVariant` (`solid` /
     `dashed` / `dotted`) — composed via `hostDirectives`.
   - `data-size` reflection from `KjSize` — composed via
     `hostDirectives`. Affects spacing (margin) and thickness
     (border-width or pseudo-element height).
   - **Dev-mode warning** if `kjStructural=true` and the host is
     `<hr>` *and* the consumer also projects content (an `<hr>`
     with content is invalid HTML — `<hr>` is void). The wrapper
     handles this case by switching to a `<div>` host
     automatically; the directive enforces it for direct-attribute
     consumers.
2. **`<kj-divider>` (components-package wrapper).** Renders:
   - `<hr kjDivider>` when no content is projected (the rule-only
     case). Native semantic preserved.
   - `<div kjDivider>` when `<ng-content>` is non-empty (the
     with-content case, including a label). The wrapper detects
     projected content via `contentChildren` / `<ng-content>`
     reachability at build time and chooses the host accordingly.
     (See [Open questions](#open-questions--risks) for the
     "consumer projects content conditionally" edge case.)
   - Forwards `kjOrientation`, `kjStructural`, `kjAlign`, `size`,
     `variant` to the directive.
   - Provides a `KJ_SIZE_PRESET` for the spacing scale (default
     `[sm, md, lg]`, default `md`).

This split — directive owns ARIA + data; wrapper picks `<hr>` vs.
`<div>` — is the **only** non-obvious design decision in this file.
The reasoning is in the next section.

## Decision (host element)

The native semantic for a horizontal rule is `<hr>`. It carries the
implicit `role="separator"` per HTML AAM, requires no extra ARIA,
and is the textbook "use the native element" answer. We use it
**when we can**, and we don't when we can't, and we are explicit
about which is which.

### Why not `<hr>` always

`<hr>` is a void element. It cannot host children. The with-content
divider — `<kj-divider>OR</kj-divider>` — must project a label, and
no projection is possible into `<hr>`. PrimeNG, Material, and
Radix all hit this wall and all chose to render `<div role="separator">`
uniformly across all cases. Their reasoning is sound: a single
host element is simpler than branching, even if the rule-only case
loses the native semantic.

### Why not `<div role="separator">` always (the contested choice)

We considered following Radix exactly: always `<div>`, with
`role="separator"` (or `role="none"`) reflected via the
decorative/structural toggle. Pros: uniform host element, simple
template. Cons:

- The native `<hr>` carries `role="separator"` *automatically*
  with no JS. A consumer who applies `[kjDivider]` to an `<hr>`
  gets correct AT semantics even if all the directive code
  unloads (theme-only stylesheet missing, JS bundle stripped,
  hydration delayed). The `<div>` path needs the directive's host
  binding to materialise before AT reads the page. The `<hr>` path
  is robust to all of those.
- Markdown-to-Angular pipelines (the docs site uses one) emit
  `<hr>` for `---`. Forcing those rules to be wrapped in
  `<kj-divider>` to get the chrome would mean post-processing the
  rendered markdown. Allowing `[kjDivider]` directly on the
  emitted `<hr>` is much friendlier — apply a `class="kj-divider"`
  in the markdown renderer's `<hr>` template, and the page-level
  `[kjDivider]` directive (or the CSS class alone if the consumer
  prefers) gives them styled rules without extra wiring.

### Position taken

**Both, with a clear rule:** `<hr>` for the rule-only case;
`<div>` for the with-content case.

| Case | Host | Why |
|---|---|---|
| `<kj-divider/>` (no content) | `<hr>` | Native semantic, implicit `role="separator"` if structural, robust to JS-less paint. |
| `<kj-divider>OR</kj-divider>` (with content) | `<div>` | `<hr>` cannot host children. `role="separator"` set by directive when structural. |
| `[kjDivider]` on author's own `<hr>` | `<hr>` (consumer-supplied) | Directive applies chrome and ARIA discipline; consumer must not project content (dev-mode warning if they do). |
| `[kjDivider]` on author's own `<div>` | `<div>` (consumer-supplied) | Directive applies chrome and ARIA discipline; works for both content and rule-only. |

The wrapper handles the choice automatically; consumers who reach
for `[kjDivider]` directly pick the right host themselves and the
directive validates in dev mode.

### Class naming

Per [`CLAUDE.md`](../../../CLAUDE.md) § "Class Naming Rule", drop
the Angular type suffix unless there's a collision. Same situation
as Badge / Kbd / Skeleton: the directive in `@kouji-ui/core` is
`KjDivider`; the wrapper in `@kouji-ui/components` is
`KjDividerComponent` because importing both into the same file
would otherwise clash. Files: `divider.ts` for the directive,
`divider.ts` for the wrapper (in their respective packages). No
`.directive.ts` / `.component.ts` suffixes.

## What exists today

Nothing on disk. No `packages/core/src/divider/`, no
`packages/components/src/divider/`, no entry in `public-api.ts` of
either package. The roadmap context: Divider is the **only** entry
in the layout category and the final component in the analysis
sprint. The build order has it landing after the major feedback and
data-display primitives stabilise so it can compose `KjVariant` /
`KjSize` in the shape they ultimately ship; nothing about Divider
is gated on a primitive that doesn't exist yet (compare
[`../feedback/popover.md`](../feedback/popover.md) which gates on
`KjOverlayService`).

The narrowly-scoped sibling `[kjMenuSeparator]` *is* expected to
land before `[kjDivider]`, because the dropdown menu's keyboard
roving needs the separator semantic in place before items can skip
over it during arrow-key navigation. The Divider directive
documented here is **not** that sibling — see
[Composition model](#composition-model) for the relationship.

## Base features

| Feature | Where it lives | Notes |
|---|---|---|
| `kjOrientation` | `KjDivider` (input) | `'horizontal' \| 'vertical'`. Default `'horizontal'`. Reflects to `[attr.data-orientation]`. When `kjStructural=true` and orientation is `vertical`, also reflects `[attr.aria-orientation]="vertical"`. The `horizontal` case **omits** `aria-orientation` (the spec default; setting it would be redundant noise). |
| `kjStructural` | `KjDivider` (input) | `boolean`. Default `false` (i.e., decorative). When `true`, host gets `role="separator"` (unless host is `<hr>`, which has implicit role). When `false` (default), host gets `aria-hidden="true"`. **The default flip from Material's "always structural" is the key a11y decision** — see [Decision (core directive)](#decision-core-directive) and [Accessibility](#accessibility-wcag-21-aaa). |
| `kjAlign` | `KjDivider` (input) | `'start' \| 'center' \| 'end'`. Default `'center'`. Affects only the with-content case (where the label sits in the rule). Reflects `[attr.data-align]`. Theme CSS uses this to pick the flex-grow ratios of the two pseudo-element rules flanking the content. Has no effect when `data-with-content="false"`. |
| `KjVariant` (`variant`) | `hostDirectives` on `KjDivider` | Presets: `'solid' \| 'dashed' \| 'dotted'`. Default `'solid'`. Reflects `data-variant`. Per [`rules/architecture.md`](../../../rules/architecture.md), preset values are validated in dev mode against `KJ_VARIANT_PRESET`; the wrapper provides a divider-specific preset that lists exactly these three values. **Decision:** no semantic variants (`primary`, `success`, `error`, etc.). Dividers are tonally neutral — a "success divider" is a category error (the surrounding alert would carry that semantic). daisyUI ships `divider-primary` etc.; we don't. If a future design language wants tinted dividers, a CSS-only `[data-tint]` or consumer-applied class can fold in without API churn. |
| `KjSize` (`size`) | `hostDirectives` on `KjDivider` | Presets: `'sm' \| 'md' \| 'lg'`. Default `'md'`. Reflects `data-size`. Affects two things in theme CSS: **spacing** (the divider's outer margin — `sm` is `0.5rem`, `md` is `1rem`, `lg` is `2rem` in the default theme) and **thickness** (the rule's border-width or pseudo-element height — `sm` is `1px`, `md` is `1px`, `lg` is `2px` in the default theme; `md` and `sm` share a thickness because hairlines below `1px` are not reliably renderable cross-platform without `transform: scaleY(0.5)` workarounds). |
| With-content | `<ng-content>` on `KjDividerComponent`; `data-with-content` reflection on `KjDivider` (auto-detected via host attribute the wrapper sets) | Project text or markup between `<kj-divider>` tags: `<kj-divider>OR</kj-divider>`. The wrapper renders the projected content centred (or aligned per `kjAlign`) between two flex-grow rules. The directive does not project content itself (it's an attribute directive); the host attribute `data-with-content="true" \| "false"` is set by the wrapper based on `<ng-content>` reachability. Direct `[kjDivider]` consumers set `data-with-content` themselves on the `<div>` host, or — better — let the wrapper handle it. |
| Spacing | **Theme tokens, not API.** | Owned by `data-size` + theme. No `kjMargin` / `kjSpacing` input. If a consumer needs a non-default spacing, they apply a utility class or wrap the divider in a sized container. |
| Thickness | **Theme tokens, not API.** | Same — `data-size` driven. |
| Disabled | **None.** | Divider is non-interactive. |
| Touch target | **n/a** | Divider is non-interactive. (If a consumer makes a divider focusable for resizable-pane behaviour, they're building a different component — APG has a [Window Splitter](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/) pattern for that. Out of scope; see [Open questions](#open-questions--risks).) |

### State model

**Stateless.** `KjDivider` has no inputs that affect anything but
`data-*` and `aria-*` attributes on the host. No outputs, no
models, no two-way bindings. Same posture as Skeleton and Kbd —
this is a **paint primitive with a small a11y opinion**.

## Accessibility (WCAG 2.1 AAA)

Target: **WCAG 2.1 AAA** for the divider in both its decorative and
structural modes. The decorative mode's a11y story is *be silent*;
the structural mode's a11y story is *announce as separator with
correct orientation*. Most of the work is choosing the right mode,
which is the consumer's call — the directive's job is to make both
modes correct and to make the wrong combinations impossible.

Reference: [WAI-ARIA APG separator pattern](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/)
covers the *focusable* separator (resizable panes), which is
**explicitly out of scope** here. The simple non-focusable
separator falls under [ARIA `separator` role](https://www.w3.org/TR/wai-aria-1.2/#separator)
and the [HTML AAM `<hr>` mapping](https://www.w3.org/TR/html-aam-1.0/#html-element-role-mappings),
which together specify: `<hr>` has implicit `role="separator"` and
implicit `aria-orientation="horizontal"`; explicit `role="separator"`
on a `<div>` is the equivalent for non-`<hr>` hosts;
`aria-orientation="vertical"` is set when the divider is vertical;
the simple separator is non-focusable and has no value.

| Criterion | Requirement | Where it lives |
|---|---|---|
| 1.1.1 Non-text Content | A purely decorative divider must not contribute AT noise. A divider that *is* the only thing demarcating two regions must be perceivable to AT | `kjStructural` (default `false`). When `false`, host gets `aria-hidden="true"`; AT skips it. When `true`, host gets `role="separator"` (or relies on implicit role on `<hr>`). The directive does **not** auto-detect intent — the consumer chooses. The default (decorative) matches the most common case (heading-and-body with surrounding `<h2>` already demarcating sections). |
| 1.3.1 Info & Relationships | Vertical dividers must announce their orientation; horizontal dividers may rely on the spec default | `kjOrientation` reflects to `[attr.aria-orientation]` only when `vertical` and `kjStructural=true`. Horizontal omits the attribute (spec default). The directive does **not** set `aria-orientation="horizontal"` explicitly — that would be redundant ARIA noise penalised by axe-core's `aria-allowed-attr` rule in some configurations and adds nothing for AT. |
| 1.3.2 Meaningful Sequence | When AT linearises a page, structural dividers must appear between the two regions they separate, not before or after both | Host element order in the DOM. The wrapper renders the divider in document order; consumers must place it between the two regions in the template. (Trivially true for any direct-DOM divider; flagged here for completeness.) |
| 1.4.3 / 1.4.6 Contrast | The divider's rule colour must be ≥ 3:1 against the page background (1.4.11 Non-text Contrast applies — the rule is a non-text graphical element) | Theme tokens. The default surface uses `--kj-color-border` for the rule; that token is calibrated to ≥ 3:1 against `--kj-color-base-100`, `base-200`, and `base-300` page backgrounds. **Verify** at `size="sm"` (1px rule) on `base-200` page backgrounds before declaring v1 — same risk shape as Kbd's `xs` border (see [`../data-display/kbd.md`](../data-display/kbd.md) § "Open question 5"). For with-content dividers, the *label text* (which is real text content) follows the standard 1.4.6 AAA 7:1 contrast requirement against the page background; the surrounding rule still follows 1.4.11. |
| 1.4.11 Non-text Contrast | The rule must be ≥ 3:1 against the page background | Theme tokens (see above). At `size="sm"` on `base-200` backgrounds, `--kj-color-border` (computed against `base-100`) may not clear 3:1 — mitigation: bump to `--kj-color-border-strong` at `sm` only, same pattern as List's `data-divided` rule (see [`../data-display/list.md`](../data-display/list.md) § Accessibility). |
| 2.1.1 Keyboard / 2.1.2 No Keyboard Trap | n/a | Divider is non-interactive. The focusable-separator (window splitter / resizable panes) pattern is **out of scope** for v1; if it ships in future, it lives in a separate `KjSplitter` directive, not on `KjDivider`. |
| 2.4.7 Focus Visible | n/a | Divider does not receive focus. |
| 2.5.5 Target Size (AAA) | n/a | Divider is not a target. (If a consumer wraps a divider in a clickable element for some collapsing-section UI, the wrapper owns the 44×44 target contract; the divider contributes only the visual rule.) |
| 4.1.2 Name, Role, Value | A structural divider's role is `separator`; its accessible name is its projected label (if any), otherwise no accessible name (the role alone is sufficient); its orientation is `vertical` if applicable, else implicit `horizontal` | Directive host bindings. **Crucial detail:** when content is projected (e.g. `<kj-divider>OR</kj-divider>`) and the divider is structural, the projected text becomes the accessible name automatically (DOM text content is the default name source). No `aria-label` plumbing needed. When content is projected and the divider is *decorative* (`kjStructural=false`), the entire host is `aria-hidden="true"` and the label is silent — which is correct: a decorative section break with the visual word "OR" between two body regions does not need to be announced (the body regions speak for themselves). |
| 4.1.3 Status Messages | n/a | Divider content does not change in response to events. (If a consumer is animating a divider in/out as part of a section reveal, the surrounding region owns any live-region semantics; Divider does not.) |

### The `kjStructural` default — why decorative wins

This is the contested decision and the one place we diverge from
Material (which always emits `role="separator"`). The case for
**decorative-by-default**:

1. **Most dividers in real templates are visual punctuation
   between regions that are already demarcated by headings,
   landmarks, or list semantics.** A card with a header `<h3>` and
   a body has the section break already encoded — adding
   `role="separator"` between them is duplicative and creates
   "separator" announcements that AT users do not need.
2. **The structural mode is a deliberate choice.** Pages where the
   divider *is* the only demarcation (e.g., a homepage hero with
   an "OR" divider between two sign-in options that share no
   surrounding heading) genuinely benefit from `role="separator"`
   — and the consumer in that case knows their layout and can flip
   `kjStructural=true`. Forcing them to flip *off* the role on
   every routine card divider is the wrong default.
3. **Radix made the same call** (their `decorative` defaults to
   `true`, which means decorative-by-default in their naming).
   PrimeNG and Material did not, but Radix's reasoning has the
   strongest published rationale and converges with the
   [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/practices/hiding-semantics/)
   advice on hiding non-semantic content from AT.

The `kjStructural` name (rather than `kjDecorative` flipped) is
chosen because: (a) the structural case is the *active* decision —
you are saying "this divider carries semantic weight" — and active
decisions read better as positive booleans; (b) `decorative` would
be the default value, which means consumers would write
`kjDecorative="false"` to opt into the active case, a double-negative
that's easy to misread.

### Vertical orientation under flex-direction changes

A vertical divider inside a row-flex strip becomes a horizontal
divider when the strip wraps to column-flex on a narrow viewport.
The ARIA must follow the visual orientation, not stay pinned to
the original. Two patterns:

1. **Consumer-driven.** The consumer toggles `kjOrientation` based
   on a media-query signal (or the layout's own orientation
   state). Explicit, but verbose.
2. **CSS-driven (recommended).** The theme provides a
   `[data-orientation="auto"]` opt-in that uses container queries
   or media queries to flip both the visual rule and the
   `aria-orientation` via CSS — except CSS cannot mutate ARIA
   attributes. So the *visual* flips via CSS but the consumer
   still has to toggle `kjOrientation` (or the surrounding
   directive that owns the layout state has to). **The directive
   does not own this coordination** — it would require knowing the
   parent layout, which it doesn't.

**Position taken:** consumer-driven. Document the pattern in the
Button Group / List examples (where the vertical-to-horizontal
flip is most common); flag the limitation; do not invent a
container-query a11y bridge. See [Open question 4](#open-questions--risks).

### Decorative vs. structural — a summary table

| Visual case | Recommended `kjStructural` | Why |
|---|---|---|
| Between card header and body (card has `<h3>` header) | `false` | Heading already demarcates; divider is paint. |
| Between groups of menu items | n/a — use `[kjMenuSeparator]` | Menu separator pattern is stricter (always structural); this directive is the wrong tool. |
| "OR" divider between two sign-in flows on a homepage | `true` | The label "OR" *is* the demarcation. AT users benefit from "separator: OR" announcement. |
| Between sections of a settings page (each section has `<h2>`) | `false` | Heading demarcates. Divider is paint. |
| Between rows of a list (per-row hairlines) | n/a — use list's `data-divided` | List owns this. See [`../data-display/list.md`](../data-display/list.md). |
| Between groups of rows in a list (heading per group) | `false` | Group heading demarcates. |
| Vertical divider in a button group | `false` | The button group itself has `role="group"`; the divider is visual punctuation between the buttons. |
| Vertical divider in a stat strip with no headings | `true` | Statistics with no surrounding heading — divider is the only demarcation. |

The docs page renders this table as a reference for consumers.

## Composition model

```
KjDivider                              (selector: [kjDivider])
  ├── hostDirective: KjVariant         (data-variant routing)
  └── hostDirective: KjSize            (data-size routing)
```

One directive. Two composed primitives. No context tokens. No
sibling directives. No content children. Same shape as Skeleton,
Kbd, Badge — the cluster of "small visual primitive with a small
a11y opinion".

### Reused primitives

| Primitive | Where | Why |
|---|---|---|
| `KjVariant` | `hostDirectives` on `KjDivider` (with a `KJ_VARIANT_PRESET` provider declared by the wrapper component) | Standard variant routing. Reflects `data-variant`, validates against the preset list (`solid`, `dashed`, `dotted`), ships dev-mode warnings on unknown values. |
| `KjSize` | `hostDirectives` on `KjDivider` (with a `KJ_SIZE_PRESET` provider declared by the wrapper component) | Standard size routing. Reflects `data-size`, validates against the preset list (`sm`, `md`, `lg`), ships dev-mode warnings. |
| `KjDisabled`, `KjFocusRing`, `KjFocusTrap`, `KjFormControl`, `KjLiveRegion`, `KjRovingTabindex`, `KjAriaDescribedby` | **Not used.** | Divider has no interactive contract, no focus story, no value. Reaching for any of these is a category error. |
| `KjVisuallyHidden` | **Not used.** | The with-content divider's label is *visible*; nothing to hide. The decorative case sets `aria-hidden` on the whole host. |

### Relationship to `[kjMenuSeparator]`

The dropdown menu (and menubar popups) ship a separate, narrower
directive `[kjMenuSeparator]` that emits `role="separator"`,
`aria-orientation="horizontal"`, and `tabindex="-1"`, and which
the menu's roving-tabindex skip-list explicitly recognises (see
[`../actions/dropdown-menu.md`](../actions/dropdown-menu.md) §
"`[kjMenuSeparator]`"). It is **not** the same directive as
`[kjDivider]`, despite the visual being similar. The differences:

| Concern | `[kjDivider]` | `[kjMenuSeparator]` |
|---|---|---|
| Default ARIA | `aria-hidden="true"` (decorative-by-default) | `role="separator"` always |
| Roving-tabindex integration | None | Required — the menu's keyboard navigation reads the menu item collection and skips entries with this directive |
| Variants | `solid` / `dashed` / `dotted` | None — themed by the menu chrome |
| Sizes | `sm` / `md` / `lg` | None — fixed by the menu's row scale |
| With-content | Yes (label projection) | No — menu separators are rule-only |
| Host element | `<hr>` (rule-only) or `<div>` (with-content) | `<div>` always (menus avoid `<hr>` to prevent nested-`<hr>` issues in screen reader announcements) |
| Where it lives | `packages/core/src/divider/divider.ts` | `packages/core/src/menu/menu-separator.ts` |

Could we **unify** them? Considered. Rejected — the menu separator's
contract is too different (always structural, integrated with the
menu's keyboard contract, no variants, no sizes, no content
projection) and the unification would require either (a) a
`kjDividerInMenuMode` input that toggles a wholly different ARIA
and roving-tabindex story, or (b) `[kjMenuSeparator]` extending
`[kjDivider]` and overriding most of its behaviour — both of which
add coupling without saving real code. Two small focused directives
is cleaner than one larger directive with a mode switch. The
[`../actions/dropdown-menu.md`](../actions/dropdown-menu.md) and
[`../navigation/menubar.md`](../navigation/menubar.md) analyses
both reference this file's `[kjDivider]` for the
non-menu case and note the deliberate split.

### Wrapper composition (components package)

`<kj-divider>` renders an `<hr>` or `<div>` with `[kjDivider]`
applied. The host element choice is made at render time based on
whether content is projected:

```ts
@Component({
  selector: 'kj-divider',
  standalone: true,
  imports: [KjDivider],
  template: `
    @if (hasContent()) {
      <div
        kjDivider
        [kjOrientation]="orientation()"
        [kjStructural]="structural()"
        [kjAlign]="align()"
        [variant]="variant()"
        [size]="size()"
        data-with-content="true"
      >
        <span class="kj-divider__content"><ng-content /></span>
      </div>
    } @else {
      <hr
        kjDivider
        [kjOrientation]="orientation()"
        [kjStructural]="structural()"
        [variant]="variant()"
        [size]="size()"
        data-with-content="false"
      />
    }
  `,
  host: { style: 'display: contents;' },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: KJ_VARIANT_PRESET,
      useValue: { values: ['solid', 'dashed', 'dotted'], default: 'solid' },
    },
    {
      provide: KJ_SIZE_PRESET,
      useValue: { values: ['sm', 'md', 'lg'], default: 'md' },
    },
  ],
})
export class KjDividerComponent {
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
  readonly structural = input<boolean>(false);
  readonly align = input<'start' | 'center' | 'end'>('center');
  readonly variant = input<'solid' | 'dashed' | 'dotted'>('solid');
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  // Detection: did the consumer project any non-whitespace content?
  // Implementation uses a ContentChild on a sentinel <ng-content> ref
  // plus ElementRef.nativeElement.childNodes inspection in
  // afterNextRender. See open question 1 for the conditional-content
  // edge case.
  protected readonly hasContent = signal<boolean>(false);
}
```

The `display: contents` host style matches the Badge / Kbd
pattern: the wrapper's host element is layout-invisible, and the
rendered `<hr>` or `<div>` participates in the parent's flow
directly. This matters for vertical dividers inside flex strips —
a wrapping `<kj-divider>` element with default `display: block`
would break the strip's row-flex.

### Cross-component pointers

- [`../data-display/card.md`](../data-display/card.md) — canonical
  consumer for **horizontal section dividers between card header
  and body, or body and footer**. The card analysis explicitly
  flags this use case and does not bake a divider into the card
  template itself; consumers compose `<kj-divider/>` between
  projected sections. Card's `<h*>` headings (when present) carry
  the section semantics, so divider defaults to decorative.
- [`../data-display/list.md`](../data-display/list.md) — between
  groups of rows. The list owns its **per-row** hairline via the
  `data-divided` attribute on the list container (see
  `list.md` § "Base features → Divider / hover discipline");
  Divider is reached for **between groups** (e.g., a contact list
  with an A-B-C alphabetical group header followed by names,
  then a divider, then D-E-F group header). The list does not
  inject `<kj-divider>` automatically; it's a consumer template
  decision.
- [`../navigation/menu.md`](../navigation/menu.md) — Menu's group
  separators use the **specialised** `[kjMenuSeparator]`, not
  `[kjDivider]`. See [Composition model](#composition-model) §
  "Relationship to `[kjMenuSeparator]`" above. Menu's analysis
  cross-references this file for the non-menu case.
- [`../navigation/menubar.md`](../navigation/menubar.md) — Same as
  Menu — uses `[kjMenuSeparator]` inside popups. The menubar
  itself does **not** put dividers between top-level bar items
  (the WAI-ARIA APG menubar pattern does not include separators
  at the bar level; spacing alone is the divider).
- [`../actions/dropdown-menu.md`](../actions/dropdown-menu.md) —
  Same pattern; uses `[kjMenuSeparator]`, references this file for
  the non-menu case.
- [`../actions/button-group.md`](../actions/button-group.md) —
  **Vertical dividers between segmented-control buttons**. The
  button-group analysis flags divider time and explicitly does not
  own the rule — that ships here. Consumers project
  `<kj-divider kjOrientation="vertical"/>` between buttons.
  Decorative; the button group has `role="group"` which carries
  the structural semantic for the whole strip.
- [`../navigation/breadcrumb.md`](../navigation/breadcrumb.md) —
  Breadcrumb's `>` separators are **not** dividers; they are
  `aria-hidden` typographic glyphs in the link row. Different
  pattern, different ARIA. Cross-linked here only to disambiguate
  for consumers searching for "separator".
- [`../navigation/pagination.md`](../navigation/pagination.md) —
  Pagination's "..." truncation marker is **not** a divider either
  — it's a `role="presentation"` ellipsis between page-link
  buttons. Same disambiguation.
- [`../data-display/chat-bubble.md`](../data-display/chat-bubble.md)
  — Chat's "Today / Yesterday / 12:46" date dividers are flagged
  in that file as a candidate for `[kjDivider]` reuse vs. a
  dedicated `KjChatDivider` directive (see `chat-bubble.md` §
  Open questions, divider work item). The chat-divider case is
  specifically the with-content centred form (`<kj-divider>Today</kj-divider>`)
  with a tighter spacing scale (chat uses `xs`-equivalent margins,
  not the default `md`). **Position taken from this side:** chat
  reuses `[kjDivider]` with `kjStructural=true` (the date *is* the
  demarcation) and a chat-themed CSS override for the spacing.
  The chat-bubble analysis can flip its work item from "ship
  KjChatDivider" to "use KjDivider with a chat preset" once this
  file lands.
- [`../data-display/kbd.md`](../data-display/kbd.md) — same
  composition shape (single attribute directive + wrapper, two
  host directives, no content projection in the directive itself).
  Refer to Kbd's "Decision (core directive)" section for the
  parallel reasoning on directive-vs-class-only and
  wrapper-component-symmetry.
- [`../feedback/skeleton.md`](../feedback/skeleton.md) — same
  "small visual primitive with a small a11y opinion" cluster.
  Skeleton owns `aria-hidden` discipline; Divider owns
  `role="separator"` / `aria-orientation` discipline; the
  composition shapes are siblings.

## Inputs / Outputs / Models

All public-facing inputs are `kj`-prefixed at the directive level.
The wrapper exposes shorter names (`size`, `variant`, etc.) for
ergonomics, aliasing them via `hostDirectives` input forwarding per
[`rules/architecture.md`](../../../rules/architecture.md) §
"Input aliasing".

### `KjDivider` (`[kjDivider]`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjOrientation` | `input` | `'horizontal' \| 'vertical'` | `'horizontal'` | Reflects to `[attr.data-orientation]`. When `'vertical'` and `kjStructural=true`, also reflects `[attr.aria-orientation]="vertical"`. The `'horizontal'` case omits `aria-orientation` (spec default). |
| `kjStructural` | `input` | `boolean` | `false` | When `true`: host gets `role="separator"` (suppressed if host is `<hr>`, which has implicit role); host does **not** get `aria-hidden`. When `false`: host gets `aria-hidden="true"`; no `role` is set. |
| `kjAlign` | `input` | `'start' \| 'center' \| 'end'` | `'center'` | Affects with-content layout only (label position within the rule). Reflects `[attr.data-align]`. No effect when `data-with-content="false"`. |
| `kjVariant` (forwarded from `KjVariant`) | `input` | preset-driven `string` (default preset values: `'solid' \| 'dashed' \| 'dotted'`) | preset default (`'solid'`) | Provided by composed `KjVariant`. Reflects to `[attr.data-variant]`. Preset-validated in dev mode. |
| `kjSize` (forwarded from `KjSize`) | `input` | preset-driven `string` (default preset values: `'sm' \| 'md' \| 'lg'`) | preset default (`'md'`) | Provided by composed `KjSize`. Reflects to `[attr.data-size]`. Preset-validated in dev mode. |
| (host) `[attr.data-orientation]` | host binding | — | — | From `kjOrientation`. |
| (host) `[attr.aria-orientation]` | host binding | — | — | Conditional: only when `kjOrientation='vertical'` and `kjStructural=true`. |
| (host) `[attr.role]` | host binding | — | — | `'separator'` when `kjStructural=true` and host is **not** `<hr>`; otherwise null (relies on implicit role for `<hr>`, no role for decorative `<div>`). |
| (host) `[attr.aria-hidden]` | host binding | — | — | `'true'` when `kjStructural=false`; otherwise null. |
| (host) `[attr.data-align]` | host binding | — | — | From `kjAlign`. |
| (host) `[attr.data-variant]` | host binding | — | — | From `KjVariant`. |
| (host) `[attr.data-size]` | host binding | — | — | From `KjSize`. |
| (host) `[attr.data-with-content]` | host attribute | — | — | Set by the wrapper or directly by the consumer; not a directive input. The directive *reads* this attribute (via `host: { '[attr.data-with-content]': '…'}` is **not** used; theme CSS reads it directly). |

No outputs. No models. No two-way bindings. Divider is one-way display.

### `KjDividerComponent` (`<kj-divider>`)

| Element | Input | Maps to |
|---|---|---|
| `<kj-divider>` | `orientation` | `kjOrientation` (forwarded to `KjDivider`) |
| `<kj-divider>` | `structural` | `kjStructural` (forwarded to `KjDivider`) |
| `<kj-divider>` | `align` | `kjAlign` (forwarded to `KjDivider`) |
| `<kj-divider>` | `variant` | `kjVariant` (host-composed via `KjVariant`) |
| `<kj-divider>` | `size` | `kjSize` (host-composed via `KjSize`) |

The wrapper additionally derives `data-with-content` from
`<ng-content>` reachability and sets it on the rendered host
element — see [Composition model](#composition-model). No outputs;
no models.

## Examples to ship

`packages/components/src/divider/`:

1. **Default (rule-only, horizontal, decorative)**
   (`divider.default.example.ts`) —
   `<kj-divider/>`. Renders an `<hr kjDivider data-with-content="false"
   data-orientation="horizontal" aria-hidden="true">`. Anchors the
   chrome.
2. **Structural** (`divider.structural.example.ts`) —
   `<kj-divider [structural]="true"/>`. Same visual as default, but
   `role="separator"` (implicit on `<hr>`) and no `aria-hidden`.
   Source comment explains when to flip the input.
3. **Vertical** (`divider.vertical.example.ts`) — a flex-row strip
   with three pieces of content interleaved with
   `<kj-divider orientation="vertical"/>`. Demonstrates the
   `display: contents` pattern (the wrapper does not break the
   row-flex). Decorative by default; surrounding row has its own
   labelling.
4. **With content (centred label)**
   (`divider.with-content.example.ts`) —
   `<kj-divider [structural]="true">OR</kj-divider>`. The
   canonical "OR" sign-in divider. Structural because the label
   *is* the demarcation. Source comment explains why structural
   here.
5. **With content (alignment)**
   (`divider.align.example.ts`) — three dividers stacked, each
   with a different `align`: `start`, `center`, `end`. Labels
   read "Earlier", "Today", "More". Structural on the "Today"
   one (timeline marker), decorative on the others (visual
   punctuation in a heading-demarcated layout).
6. **Variants** (`divider.variants.example.ts`) — three dividers
   stacked: `solid` / `dashed` / `dotted`. Anchors the
   variant axis. Includes a comment about why no semantic
   variants (no `primary` / `success` / etc.).
7. **Sizes** (`divider.sizes.example.ts`) — three dividers
   stacked: `sm` / `md` / `lg`. Visualises the spacing-and-
   thickness pairing.
8. **Inside a card** (`divider.in-card.example.ts`) — a
   `<kj-card>` with header projection, divider, body projection,
   divider, footer. Decorative dividers (the card has an `<h3>`
   header that demarcates). Locality argument as Kbd's
   `kbd.in-tooltip.example.ts`: the example lives in the divider
   folder so the divider docs page can preview it without
   depending on the card docs page's example registry.
9. **Inside a button group** (`divider.in-button-group.example.ts`)
   — three buttons in a `kjButtonGroup` with vertical dividers
   between them. Anchors the segmented-control pattern. Decorative.
10. **Between groups of list rows**
    (`divider.in-list.example.ts`) — a list with two grouped
    sections, each with its own group heading, divider between
    the groups. Decorative (group headings carry structure).
11. **Themed (core-only)** — `divider.example.ts`,
    `divider.retro.example.ts`, `divider.finance.example.ts`
    under `packages/core/`. Confirms the headless directive
    works under arbitrary theme CSS. Especially important for
    Divider because the with-content layout depends heavily on
    theme-side flex-grow ratios and pseudo-element rules; a
    brutalist theme might want flat ASCII-style dashes, a
    skeuomorphic theme might want a beveled rule with a soft
    drop shadow.

## Open questions / risks

1. **Conditional-content host election.** The wrapper picks `<hr>`
   vs. `<div>` based on whether content is projected. If the
   consumer projects content *conditionally* (`<kj-divider>@if
   (showLabel()) {OR}</kj-divider>`), the wrapper must re-elect
   the host when the projection toggles. Three options:

   - **(a) Always `<div>`.** Drop the `<hr>` optimisation entirely.
     Loses the native-semantic robustness for the rule-only case
     but eliminates a class of edge-case bugs.
   - **(b) Elect once at first render.** If projected at first
     render: `<div>` forever, even if later toggled empty. If empty
     at first render: `<hr>` forever, even if later toggled
     populated (would crash — `<hr>` cannot host children). **Bad.**
   - **(c) Re-elect on content change.** Watch projected-content
     mutations (via `MutationObserver` or Angular's
     `contentChildren` signal) and recreate the host element when
     the boolean flips. Expensive — recreating the host element
     loses any third-party class/attribute additions and is
     surprising to consumers.

   **Lean (a) — always `<div>`.** The `<hr>` optimisation is real
   but small (slightly better robustness if JS doesn't load), and
   the conditional-content edge case is enough of a footgun that
   simplicity wins. Reconsider if a meaningful number of consumers
   want the `<hr>` semantic for markdown-driven docs (in which
   case ship a separate `[kjDividerHr]` selector or just let
   them apply `[kjDivider]` directly to their `<hr>`, which already
   works without the wrapper).

   **Position taken (tentative): (a). Direct `[kjDivider]` on
   `<hr>` remains supported and is the recommended path for the
   markdown-rendered case.** Document this in the divider docs
   page.

2. **Auto-orientation from parent flex-direction.** A vertical
   divider inside a `flex-direction: row` strip should become
   horizontal when the strip wraps to `flex-direction: column` on
   a narrow viewport. The directive cannot detect this — CSS owns
   the layout, and the directive doesn't observe parent computed
   styles (would be expensive on every divider, would need
   `ResizeObserver`, would break SSR). Three options:

   - **(a) Consumer-driven.** Toggle `kjOrientation` from a
     media-query signal or a layout state signal. Verbose.
     Required for ARIA correctness today.
   - **(b) CSS-driven visual flip; consumer-driven ARIA.** Theme
     uses container queries to flip the visual rule
     (`@container (max-width: 600px) { [data-orientation="vertical"]
     { … } }`); consumer separately toggles `kjOrientation` for
     ARIA. Visual is automatic; ARIA isn't. Confusing.
   - **(c) `kjOrientation="auto"`.** New input value that defers
     to CSS. The directive sets `data-orientation="auto"` and
     leaves `aria-orientation` unset. Theme CSS picks the visual.
     Loses ARIA for the structural-vertical case — but gains it
     for the **decorative** case (which is most cases) where ARIA
     doesn't matter.

   **Lean (a) for v1, with (c) as a future add.** The structural-
   vertical case is rare; the decorative-vertical case is common,
   and forcing every consumer to wire a media-query signal for
   what is effectively "decorative chrome that flips axis" is
   verbose. Re-evaluate after one or two real consumers have
   shipped responsive divider strips.

3. **Sub-pixel `1px` rule rendering on hi-DPI displays.** On
   Retina / 2x displays, a `1px` rule rendered via `border-top`
   actually renders 2 device pixels thick — fine, but a true
   "hairline" (sub-pixel) requires `transform: scaleY(0.5)` or
   `box-shadow: inset 0 0.5px 0 var(--kj-color-border)`, both of
   which have cross-browser quirks. **Risk:** at `size="sm"` on
   a hi-DPI display, the divider may look heavier than the
   designer intended. **Mitigation:** the default theme uses
   `border-top: 1px solid var(--kj-color-border)` — predictable,
   ubiquitous — and accepts the device-pixel inflation. Consumers
   targeting designs that need true sub-pixel rules can override
   the theme rule per project. Document; do not solve.

4. **Container queries vs. media queries for the auto-orientation
   case** (relates to open question 2). If we ship `kjOrientation="auto"`
   in v1.x, the question of whether the theme uses
   `@container` (modern, scoped to the parent flex strip) or
   `@media` (broader, viewport-scoped) becomes a theme decision
   with consumer-visible behaviour differences. Container queries
   are more correct (the divider should flip when *its parent*
   changes axis, not when the viewport reaches a magic width), but
   they require the parent to declare `container-type: inline-size`,
   which we cannot enforce. Defer to the v1.x design when
   `kjOrientation="auto"` ships.

5. **Variant semantics — is `dashed` accessible?** A dashed line
   has slightly less perceived contrast than a solid line because
   the eye averages the gaps as background. The 3:1 contrast
   target (1.4.11 Non-text Contrast) measures the dash colour
   against the background, not the perceived average — so technically
   it passes if the colour does. **Risk:** at `size="sm"` (1px
   thickness) with a `dashed` variant on a `base-200` page background,
   the rule may visually melt away despite passing the technical
   contrast bar. **Mitigation:** at `dashed` + `sm`, bump the
   colour to `--kj-color-border-strong`, mirroring the per-size
   compensation pattern from List and Kbd. Verify in
   `divider.variants.example.ts` against light, dark, and
   high-contrast themes. Same mitigation for `dotted` (which
   has even less perceived ink coverage than dashed).

6. **With-content label nesting.** A consumer might project a
   `<button>` or other interactive element as the divider's "label"
   (e.g. an "Add new" button sitting in the rule between two
   groups of items, like Notion's section dividers). This works
   visually but creates a *focusable element inside an
   `aria-hidden` host* if `kjStructural=false` — which is a
   1.3.1 / 4.1.2 violation (focusable elements must be exposed to
   AT). **Mitigation:** dev-mode warning if the directive detects
   a focusable descendant when `kjStructural=false`. Same machinery
   Skeleton's open question 4 documents. **Decision:** consumers
   with interactive labels must set `kjStructural=true` (so the
   host is `role="separator"`, not `aria-hidden`), accepting the
   "separator: button text" announcement. If they prefer a silent
   button, they should not put it inside a divider — they should
   render it adjacent to a rule-only divider. Document this in
   the divider docs page; do not auto-fix.

7. **Resizable splitter (window splitter pattern) — out of scope
   for v1, but worth flagging.** The [WAI-ARIA APG window
   splitter pattern](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/)
   is a focusable separator that adjusts the size of two adjacent
   regions via keyboard (ArrowLeft/ArrowRight or
   ArrowUp/ArrowDown). It uses `role="separator"` plus
   `aria-valuenow` / `aria-valuemin` / `aria-valuemax` / `aria-orientation`
   and a `tabindex="0"`. **Decision:** out of scope for `KjDivider`
   v1. If it ships in future, it lives in a separate
   `KjSplitter` directive (or `KjResizableSeparator`) that
   composes the same `KjVariant` / `KjSize` plus a
   `KjFocusRing` and an arrow-key handler. The visual chrome can
   reuse divider's CSS, but the contract is different enough
   (focusable, value-bearing, two-region coordination) that
   bolting it onto Divider's surface would muddy the small,
   focused contract this directive ships with. Flag in the
   roadmap when a real consumer asks.

8. **Spacing scale divergence from card / list inset rules.**
   Divider's `md` margin (`1rem`) might not visually align with
   a card's body padding (`1.5rem` in the default theme) or a
   list row's inset (`0.75rem`). When a divider sits between
   card sections, the visual rhythm depends on the card's own
   padding plus the divider's outer margin — and the two scales
   are independent. **Risk:** dividers in cards may look "off"
   relative to the card's interior rhythm. **Mitigation:** ship
   a `data-context="card"` opt-in attribute the theme can read
   to use the card's inset scale instead of the divider's
   default scale. Or — simpler — let consumers wrap the divider
   in a sized container (`<div class="kj-card-section-divider">`)
   per project. **Lean:** consumer-driven for v1; ship a docs
   recipe in the card docs page. Reconsider once the card and
   divider both ship and the visual alignment is testable.

9. **Direct `[kjDivider]` on a `<span>` — should it be allowed?**
   The natural hosts are `<hr>` (rule-only) and `<div>`
   (with-content). A consumer applying `[kjDivider]` to a `<span>`
   is almost certainly making a mistake (inline element with
   block chrome). **Lean:** dev-mode warn; do not enforce via
   selector restriction. Same shape as Kbd's open question 3.
   Same reasoning: consumers who deliberately apply the directive
   to an inline element for some bizarre layout experiment deserve
   an escape hatch. Document the recommendation; warn loudly; do
   not block.

10. **SSR / hydration.** Divider has no client-side state, no
    event listeners, no `MutationObserver` (per open question 1's
    decision against (c)), no `afterNextRender` work. SSR produces
    the final DOM verbatim; hydration is a no-op. The only SSR
    concern is the wrapper's `display: contents` host style,
    which is universally supported but historically awkward in
    some SSR-to-CSS pipelines. Verified pattern in Badge / Kbd /
    Skeleton; same pattern works here.

11. **Internationalisation: vertical-text-mode and RTL.** In a
    vertical-writing-mode locale (Japanese tategaki, Mongolian),
    a "horizontal" divider relative to writing direction is
    visually vertical relative to the viewport — and vice versa.
    The CSS `border-block-start` / `border-inline-start` logical
    properties handle this correctly if the theme uses them
    instead of `border-top` / `border-left`. **Mitigation:** the
    default theme uses logical properties throughout the divider
    rules. Document the contract for theme authors. Same for RTL
    (less involved — RTL doesn't change the visual axis of a
    horizontal rule, only the start/end alignment of the
    with-content label, which `data-align` already handles via
    logical `start` / `end`).

12. **`<kj-divider>` with no content and `kjAlign` set — silent or
    warn?** `kjAlign` only affects the with-content layout. Setting
    `<kj-divider align="start"/>` (no content) is meaningless. We
    could (a) silently ignore, (b) dev-mode warn, (c)
    visual-test-detect (compute the rendered geometry and warn if
    `align` had no effect). **Lean (a) — silent.** The misuse is
    harmless (the data attribute is reflected, the theme CSS
    branches on `data-with-content`, no visual difference) and
    the warning would fire on perfectly valid templates where a
    consumer is conditionally projecting content (`align`
    matters when content is present, doesn't matter when absent;
    setting it always is reasonable defensive coding). Document;
    do not warn.

13. **Re-export of presets.** The wrapper provides
    `KJ_VARIANT_PRESET` (3 values) and `KJ_SIZE_PRESET` (3 values).
    Core-package consumers wanting to apply `[kjDivider]` directly
    need to provide their own presets or import the wrapper's.
    **Decision:** export `KJ_DIVIDER_VARIANT_PRESET` and
    `KJ_DIVIDER_SIZE_PRESET` constants from the components package
    so core-package consumers can opt in to parity. Same shape as
    `KJ_KBD_SIZE_PRESET` (Kbd open question 13). Tiny, free, and
    avoids the silent-drift case where a consumer picks an
    unrecognised value and the directive's dev-mode validator
    passes (because the consumer's preset didn't list it) but the
    CSS doesn't recognise the value.

14. **Closing-the-sprint note.** This is the last analysis in the
    62-component sprint. No downstream files depend on this one.
    The roadmap (`docs/component-analyses/README.md`) treats this
    file as the terminal node; the implementation roadmap
    sequencing thread (separate document) places the actual build
    of `KjDivider` after the variant- and size-preset migrations
    settle, the same scheduling lever Kbd uses (see
    [`../data-display/kbd.md`](../data-display/kbd.md) §
    "What exists today"). Nothing further to flag.
