# Tabs

A horizontal (or vertical) row of headers that each switch a single
content region between mutually-exclusive panels. The user clicks (or
arrow-keys) onto a tab; the corresponding panel becomes visible and
every other panel hides. Tabs is the canonical *selected-one-of-many*
surface with **persistent panel slots** — the same set of panels is
addressable by name at all times; the tab strip is the selector,
nothing rotates, nothing pops up, nothing is gated on completion.

Tabs is the heaviest pure-a11y component in the catalogue after
Carousel. The WAI-ARIA Authoring Practices specify the keyboard
contract precisely (Home/End, ArrowLeft/Right or ArrowUp/Down per
orientation, automatic vs. manual activation), the role triplet
(`tablist` → `tab` → `tabpanel`) is non-negotiable, and every
mainstream library ships a different shape for the *programmer*-facing
API. This analysis pins the kouji shape: a four-directive Radix-style
compound, string-keyed values (matching Accordion and Carousel),
opt-in manual activation (default automatic per APG), reused
`KjRovingTabindex` with a new `orientation` input, and a CSS-only
panel visibility model with lazy first-render mount-then-keep.

> **Not on disk yet.** No `packages/core/src/tabs/`, no
> `packages/components/src/tabs/`. This analysis is the v1 design.

For **adjacent navigation primitives**, see:

- [`./stepper.md`](./stepper.md) — a numbered, ordered sequence with
  completion / error state and linear-vs-non-linear gating. Stepper
  and Tabs share the *row of headers + one panel visible at a time +
  roving tabindex on headers* shape but Stepper has `next()` /
  `previous()` (order matters), `aria-current="step"` semantics, and
  uses `<ol>` + `<li>` + `<button>` rather than the `tablist` /
  `tab` / `tabpanel` triplet. Tabs assumes the headers are
  unordered: pick any.
- [`./pagination.md`](./pagination.md) — also a row of indexed
  buttons but each one is *its own tab stop* (the user is choosing
  between actions of equal importance, not between views of one
  panel) and uses `aria-current="page"`, not `tablist`. Tabs is for
  switching what fills a single content region; Pagination is for
  jumping into a homogeneous data list.
- [`./menu.md`](./menu.md) — easy to confuse because both are "rows
  of clickable headers". Menu is *navigation* across pages /
  sections / routes; Tabs is *view selection* over a fixed set of
  panels at the same URL. Menu uses native `<nav>` + `<ul>` + `<a>`
  and `aria-current="page"`; Tabs uses `tablist` / `tab` /
  `tabpanel`. The tab-as-secondary-nav pattern (Material's "nav
  tabs") muddies this — see [Tabs as router-driven nav](#tabs-as-router-driven-nav-the-nav-tabs-pattern)
  for the explicit position.
- [`./menubar.md`](./menubar.md) — horizontal application menubar
  (the desktop-app `File / Edit / View` strip). Looks like a
  horizontal tab strip; uses `role="menubar"` and pops sub-menus,
  not panels. Different ARIA pattern, different keyboard contract.

For the **same-shape sibling on a different ARIA pattern**, see
[`../data-display/accordion.md`](../data-display/accordion.md). Tabs
and Accordion share the `single | multiple` mental model in their
state machines (Tabs is always *single*, Accordion can be either),
the string-keyed item identity, the `value` two-way binding, and the
header / panel association via id pairs. They differ in (a) ARIA
pattern (`tablist`/`tab`/`tabpanel` vs. `button` + `region`), (b)
panel visibility model (lazy-then-persistent vs. inert-when-closed),
and (c) keyboard contract (Tabs always uses arrow-key roving;
Accordion makes it opt-in). After both ship, consider extracting a
shared `KjSelectionState<T, Mode>` primitive — but not yet (the
duplication is small, the ARIA divergence is large).

For the **rotating-content cousin**, see
[`../data-display/carousel.md`](../data-display/carousel.md). The APG
"tabbed carousel" variant overlaps with Tabs — indicators-as-tabs
where the panels are slides. We treat them as separate components:
Tabs assumes the user picks freely and panels are static; Carousel
assumes the system rotates and panels are visual content. Both adopt
string-keyed values and both ship a `kjValue` model on the root, so
the consumer can mechanically swap one for the other when the
pattern changes.

## Source comparison

| Concern | PrimeNG `p-tabs` (modern) / `p-tabView` (legacy) | Angular Material `mat-tab-group` | shadcn/ui `Tabs` (Radix) | WAI-ARIA APG Tabs |
|---|---|---|---|---|
| Primary surface | Modern: compound `<p-tabs>`, `<p-tablist>`, `<p-tab>`, `<p-tabpanels>`, `<p-tabpanel>` (Radix-shaped). Legacy: monolithic `<p-tabView>` + `<p-tabPanel>` with a `header` slot | Single component family: `<mat-tab-group>` containing `<mat-tab>` children. Each `<mat-tab>` projects label and content via `<ng-template matTabLabel>` and the projected content body | Compound headless: `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>` | Pattern only. Specifies the role triplet (`tablist`, `tab`, `tabpanel`), the keyboard contract, the activation mode (automatic vs. manual), and the orientation contract |
| Selection model | `[(value)]` on `<p-tabs>` — string or number; `<p-tab value="…">` and `<p-tabpanel value="…">` wire through. **String-keyed in modern API** | `[(selectedIndex)]: number` on `<mat-tab-group>` — index-based, brittle on reorder. Imperative `realignInkBar()`, `focusTab(index)` | Controlled `value: string` on `<Tabs>` (`onValueChange`), uncontrolled `defaultValue`. `<TabsTrigger value="…">` and `<TabsContent value="…">` wire by string. **String-keyed** | n/a |
| Orientation | `[orientation]="'horizontal' \| 'vertical'"` on `<p-tabs>` | **Horizontal only.** Vertical tabs require a separate component, `mat-tab-nav-bar`, used for routing (see *nav-tabs*). The main `mat-tab-group` does not flip axis | `orientation: 'horizontal' \| 'vertical'` on root; flips arrow-key axis | `aria-orientation` on the tablist; affects which arrow keys move the active tab |
| Activation mode | `[activateOnFocus]` boolean — `true` ≈ automatic (focus = activate), `false` ≈ manual (focus then Enter to activate) | **Manual only**: focus moves with arrow keys; Enter/Space activates. `mat-tab-group` does not implement automatic activation | `activationMode: 'automatic' \| 'manual'` on root; default `'automatic'` (matches APG default) | Defines both modes. **Automatic is the recommended default** for cheap content. **Manual is recommended** when activation has cost (network call, expensive render) |
| Keyboard | Home/End, ArrowLeft/Right (horizontal) or ArrowUp/Down (vertical), Enter/Space (manual mode), roving tabindex | Same arrow-axis pairs, Home/End, Enter/Space activate, roving via CDK | Same — Radix `RovingFocusGroup` powers it; Home/End; arrow-axis honours orientation | Same as above. Optionally Delete to close (closable tabs); Optionally Ctrl+PageUp/PageDown to cycle (advanced) |
| Closable tabs | `[closable]` on `<p-tab>`; renders an X button; emits `(close)` | Not built-in. Material's stance: closable tabs are an app shell concern, not a Tabs concern | Not built-in; consumers compose an X button inside the `TabsTrigger` and wire their own removal | Recommended pattern: each closable tab has a separate close button (so the tab itself is still activatable); Delete key on focused tab closes |
| Lazy panel rendering | `[lazy]` on `<p-tabpanel>` — only render when first activated; remains rendered after | `[lazyContent]` directive (`*matTabContent`) — same: only mount on first activation, remain mounted. **Default is to mount all panels eagerly** | All `TabsContent` panels mount eagerly; consumers wrap content in their own conditional if they want lazy. *Forced eager because Radix uses `display: none`/`block` for the panel switch and respects layout-stable mounts* | Pattern is silent. Either is conformant; the contract is on visibility, not on DOM presence |
| Disabled tab | `[disabled]` on `<p-tab>` | `[disabled]` on `<mat-tab>` | `disabled` on `<TabsTrigger>` | Recommended: `aria-disabled="true"` on the tab; remains in the focus order if reachable but cannot be activated |
| Variants / chrome | Heavy: underline, pill, segmented, with motion-bar, etc. — opinionated | Heavy: ink bar animates between active tabs; Material elevation; ripple | Zero — primitives are unstyled; consumer owns chrome | n/a |
| Animation | Built-in slide / fade between panels | Built-in slide animation (`@translateTab`); requires `BrowserAnimationsModule`; can be disabled with `[animationDuration]="'0ms'"` | None; CSS-only at consumer level | n/a |
| Router integration | `<p-tabs scrollable>` + `MenuItem`-shaped router config (legacy `<p-tabMenu>`) | Separate component: `<mat-tab-nav-bar>` + `<a mat-tab-link routerLink>`. **Different DOM, different ARIA**: `<nav>` role, no `tabpanel` (each tab is a route, the page itself is the panel) | Not built-in; consumers wire `<TabsTrigger>` to a routing handler manually | n/a (APG patterns are scoped to in-page panel switching; routing is outside) |

**Read-off.**

- **PrimeNG's modern compound** (`<p-tabs>` / `<p-tablist>` /
  `<p-tab>` / `<p-tabpanels>` / `<p-tabpanel>`) is a direct port of
  Radix's shape, with `[(value)]` as a string. Five elements is one
  more than necessary — the `<p-tabpanels>` wrapper is a
  layout-only container that adds no behaviour and forces an extra
  element that consumers must remember to write. We collapse to
  four (no `KjTabPanels` wrapper); panels are siblings of
  `<kj-tab-list>` under `<kj-tabs>`.
- **Material's index-based selection** is the same mistake
  Accordion's PrimeNG ancestor made: brittle under `@for` reorders,
  forces consumers to think in array positions, blocks
  string-keyed two-way binding to a route param. Reject. We
  string-key, like Accordion and Carousel.
- **Material's manual-only activation** is non-conformant with
  APG's default recommendation. APG explicitly recommends automatic
  activation for *cheap* content (which is the common case);
  Material's choice forces every consumer into the manual contract.
  We default to automatic and let the consumer opt into manual when
  activation is expensive.
- **Material's separate `mat-tab-nav-bar`** for routing is the
  correct call: tabs that swap router outlets are not the same
  ARIA shape as tabs that swap projected panels. We follow this
  split — see [Tabs as router-driven nav](#tabs-as-router-driven-nav-the-nav-tabs-pattern)
  — but ship the nav variant as a flag on the root rather than as a
  separate component family. The flag flips the rendered DOM (no
  `tabpanel`, the panel is the routed page) but keeps the
  authoring API uniform.
- **shadcn / Radix** is the spiritual match: four primitives,
  string-keyed `value`, `orientation`, `activationMode`,
  zero-chrome. We adopt the shape and add the kouji-flavoured
  composition (`KjVariant`, `KjSize`, `KjFocusRing`,
  `KjRovingTabindex`).

The shape we adopt is **four directives**, **shadcn-shaped
composition**, **APG-correct ARIA**, **Radix `activationMode` and
`orientation` knobs**, and **lazy-then-persistent panel mounting**.

## Decision (core directive)

**Yes — definitely needs core.** Five contracts justify it:

1. **State machine.** A single active value, the
   automatic-vs-manual activation rule, the disabled-tab gate, the
   closable-tab removal, and the boundary behaviour when the active
   tab is removed (advance to next or previous? back to first?) are
   exactly the cross-element coordination headless directives are
   for. Three theme implementations would each get the
   "active-tab-was-removed" edge case subtly wrong.

2. **A11y wiring across N elements.** The `<div role="tablist">`
   root, each tab's `role="tab"` + `aria-selected` + `aria-controls`
   + `id` + `tabindex`, each panel's `role="tabpanel"` +
   `aria-labelledby` + `tabindex` + `hidden`, all need to share the
   same id-generation and the same active-value signal. Putting that
   into theme bundles is how a11y bugs ship.

3. **Keyboard contract.** Roving tabindex on the tab strip,
   ArrowLeft/Right (horizontal) or ArrowUp/Down (vertical),
   Home/End, Enter/Space (manual mode only), Delete (closable),
   wrapping at boundaries. `KjRovingTabindex` provides the roving;
   the orientation-axis switch and the activation-mode branch are
   composed on top.

4. **Activation mode.** APG's automatic vs. manual distinction is
   load-bearing for AT users — the timing of the
   `aria-selected` + `tabpanel` swap relative to focus movement is
   different in each mode. This logic must live above the keyboard
   primitive, in a place that knows about both focus and selection.

5. **Panel visibility & lazy mounting.** The lazy-then-persistent
   contract (mount on first activation, keep mounted thereafter)
   requires the panel directive to know its own activation history.
   Three theme implementations would each handle this differently
   (and at least one would re-mount on every switch, breaking
   internal panel state).

Items beyond these — the underline indicator, the pill chrome, the
overflow-scrolling tab strip — are reused from existing primitives
(`KjVariant`, `KjSize`) or are pure CSS / wrapper concerns. The
state machine + a11y + keyboard + activation + lazy mounting combo
is the directive.

## Composition model

**Four core directives, Radix-shaped.** A root that owns the active
value, the orientation, the activation mode, and the registered
tab/panel pairs; a tablist directive that hosts the
`role="tablist"` + roving tabindex; a tab directive per header that
host-binds `role="tab"` + the ARIA wiring + the click handler; a
panel directive per content region that host-binds
`role="tabpanel"` + visibility. All standalone, communicating
through one injection token (`KJ_TABS`).

```
KjTabs            (selector: [kjTabs], owns state, provides KJ_TABS, hosts KjVariant + KjSize)
  ├── KjTabList   (selector: [kjTabList], host: role="tablist", composes KjRovingTabindex)
  │     └── KjTab (selector: [kjTab], requires kjTabValue, host: role="tab", composes KjRovingTabindexItem + KjFocusRing)
  └── KjTabPanel  (selector: [kjTabPanel], requires kjPanelValue, host: role="tabpanel")
```

Note: panels are *siblings* of `KjTabList` under `KjTabs`, not
children of a `KjTabPanels` wrapper. This collapses one element
relative to PrimeNG's modern API and matches the Radix four-piece
shape verbatim. The wiring between a tab and its panel is by
**string value**, not by parent-child structure: `KjTab` declares
`kjTabValue="overview"`, `KjTabPanel` declares
`kjPanelValue="overview"`, and the root resolves them through the
shared `KJ_TABS` context.

### Why one injection token, not two

Accordion uses two tokens (`KJ_ACCORDION` + `KJ_ACCORDION_ITEM`)
because the accordion *item* is a real DOM element that owns
per-item state (its own ids, its own expanded signal). Tabs has no
analogous "item" — the tab and the panel both inject the root and
look up their own state by value. There is no reason to mediate
through an item-level context. The simpler one-token shape mirrors
Radix and keeps the directive count to four.

`KjTabList` does not provide a separate token either; it is a
positional wrapper that hosts the `tablist` role and the roving
tabindex. `KjTab` injects `KJ_TABS` directly.

### Reused primitives

| Primitive | Where | Why |
|---|---|---|
| `KjVariant` | Composed via `hostDirective` on `KjTabs` (root) | Routes variant tokens (`underline` / `pill` / `enclosed`). Variant affects chrome only — borders, indicator placement, fill — never behaviour. Reflected as `data-variant` on the root. |
| `KjSize` | Composed via `hostDirective` on `KjTabs` | `xs` / `sm` / `md` / `lg` controls header padding, font-size, indicator thickness. Reflected as `data-size`. |
| `KjFocusRing` | Composed via `hostDirective` on `KjTab` (tab header) and on the close button when `kjClosable` is true | Centralises the design-system focus ring instead of redefining `:focus-visible` per component. Same posture as Accordion's planned upgrade. |
| `KjRovingTabindex` + `KjRovingTabindexItem` | `KjRovingTabindex` composed via `hostDirective` on `KjTabList` (with `kjOrientation` forwarded); `KjRovingTabindexItem` composed via `hostDirective` on `KjTab` | Single tab stop on the tab strip; arrow keys move the focused tab. **Requires an `orientation` input** on `KjRovingTabindex` — the primitive currently treats ArrowLeft/Right and ArrowUp/Down equivalently (see Accordion analysis open question 9 and Stepper open questions). Tabs is the forcing function for that addition. |
| `KjDisabled` | Composed via `hostDirective` on `KjTab` | Standardises `aria-disabled`, `tabindex="-1"`, and pointer-events handling for disabled tabs. The disabled tab remains in the roving sequence (so users can discover it and AT can announce it) but cannot be activated. |
| `KjLiveRegion` | Optional, mounted by the wrapper when `kjAnnouncePanelChange` is true. Pushes "Tab activated: Settings" on `(kjValueChange)` | Off by default. Useful for tab strips with long lists where focus alone may not be enough re-orientation. AT users who lost focus during a long panel transition (slow render, lazy-loaded content) can opt into a re-announcement. |

### Wrapper composition (components package)

`<kj-tabs>` applies `KjTabs` via `hostDirectives` and exposes `value`
(re-mapped from `kjValue`), `orientation`, `activationMode`,
`variant`, `size`. `<kj-tab-list>` applies `KjTabList` via
`hostDirectives`. `<kj-tab>` applies `KjTab` via `hostDirectives`
and re-maps `kjTabValue` to `value`; exposes a `[label]` shorthand
that renders the projected text wrapped in a `<button>` with
`KjFocusRing`. `<kj-tab-panel>` applies `KjTabPanel` via
`hostDirectives` and re-maps `kjPanelValue` to `value`.

The wrappers also handle:

- the visual chrome (underline, pill, enclosed variants);
- the optional active-tab indicator that animates between tabs
  (CSS-only via `view-transition-name` or a `--kj-tab-indicator-x`
  custom property the wrapper writes on tab change);
- the close button rendering when `kjClosable` is true on a tab —
  see [Closable tabs](#closable-tabs);
- the overflow scrolling for long tab strips (CSS `overflow-x:
  auto` on the tablist, with optional left/right scroll buttons —
  see open question 7).

### Cross-component pointers

- [`../data-display/accordion.md`](../data-display/accordion.md) —
  string-keyed value pattern, two-way `value` model, four-directive
  shape, and the per-item id-pair generation. Tabs reuses the same
  posture: `kjValue: model<string>` on the root, `kjTabValue:
  input.required<string>` per tab, `kjPanelValue:
  input.required<string>` per panel, and the wiring is by value
  rather than by array index. Accordion's open question 1 (the
  missing `aria-controls` / `aria-labelledby` wiring) is *the same
  question* in Tabs — solve it once, port the solution.
- [`./stepper.md`](./stepper.md) — same compound shape, same roving
  tabindex, similar orientation handling. Differs in (a) ordering
  is meaningful in Stepper, (b) Stepper has completion / error
  state per item, (c) Stepper uses `<ol>` + `aria-current="step"`
  rather than `tablist` / `tab` / `tabpanel`. Cross-reference for
  the orientation-aware roving primitive — both components need it.
- [`./pagination.md`](./pagination.md) — every page button is its
  own tab stop; no roving. Tabs and Pagination look similar but the
  keyboard contract is opposite (Tabs is one tab stop with arrow
  navigation; Pagination is N tab stops with no arrow navigation).
  The reason is *intent*: tabs select a view of one panel,
  pagination buttons are equally-weighted commands.
- [`../data-display/carousel.md`](../data-display/carousel.md) —
  the indicator-dots-as-tabs variant of Carousel uses similar
  string-keyed values. After Tabs ships, audit Carousel's
  `KjCarouselIndicators` to see if it should compose `KjTabList` /
  `KjTab` directly (it probably should not — Carousel's indicators
  use `aria-label="Slide N"` rather than `role="tab"`, per the APG
  carousel pattern, but the cross-reference is worth recording).
- [`./menu.md`](./menu.md) — easy to confuse with the
  tab-as-secondary-nav pattern. Menu is for navigation between
  pages / routes; Tabs is for switching what fills a panel at the
  same URL. If the surface causes a URL change, it is Menu (or the
  nav-tabs flavour of Tabs — see below).

## Tabs as router-driven nav (the "nav-tabs" pattern)

Material ships a separate component (`mat-tab-nav-bar`) for the
case where each tab is a router link and the panel is the routed
page. This is a real ARIA-pattern split: the `tablist` / `tab` /
`tabpanel` triplet assumes the panel content lives in the same
document and is shown/hidden in place. When the "panel" is a
different route (different URL, different rendered tree), the
correct ARIA shape is `<nav>` + `<a>` + `aria-current="page"`,
*not* `tablist` / `tab` / `tabpanel`.

**Decision.** We ship the nav-tabs flavour as a flag on the root
rather than as a separate component family:

```html
<kj-tabs kjAsNav>
  <kj-tab-list>
    <kj-tab value="overview" routerLink="overview">Overview</kj-tab>
    <kj-tab value="billing"  routerLink="billing">Billing</kj-tab>
  </kj-tab-list>
  <!-- no <kj-tab-panel>; the panel is <router-outlet /> below -->
  <router-outlet />
</kj-tabs>
```

When `kjAsNav` is true, the root renders as `<nav>` instead of a
`tablist`-roled element, each tab renders as `<a aria-current="page"
…>` instead of `<button role="tab">`, and `<kj-tab-panel>` is
rejected at runtime with a developer warning (the panel is the
router outlet; the wrapper does not own it). The wrapper still
wires the active-value tracking from a route param so that the
underline indicator animates and the keyboard story is consistent.

**Why a flag, not a separate component.** The visual chrome, the
variant / size handling, the underline indicator, and the
overflow-scroll behaviour are identical between the two flavours;
only the ARIA shape and the panel ownership differ. Splitting into
two components would duplicate the wrapper's CSS and force
consumers to learn two APIs for what is presentation-identical.
The flag affects exactly two things: the host element role and
whether `<kj-tab-panel>` is permitted.

Cross-reference [`./menu.md`](./menu.md) for the broader rule:
**when a surface changes the URL, it is navigation; use `<nav>` +
`aria-current`. When it switches a panel in place, it is a
selector; use the appropriate `aria-` pattern (`tablist`, in this
case).** Tabs' nav-tabs flag honours that rule by flipping the
rendered semantics rather than papering over the distinction.

## Base features

| Feature | Where it lives | Notes |
|---|---|---|
| String-keyed active value | `KjTabs.kjValue: model<string>` | Two-way bound. Required as a `model` (no uncontrolled mode at the directive layer) — the wrapper computes a default of "the first registered tab's value" if the consumer leaves it unset. Stable across reorders, route-param-bindable. |
| Orientation | `KjTabs.kjOrientation: input<'horizontal' \| 'vertical'>('horizontal')` | Drives `aria-orientation` on the tablist host and the arrow-key axis on the roving primitive. Reflected as `data-orientation` on the root for CSS. |
| Activation mode | `KjTabs.kjActivationMode: input<'automatic' \| 'manual'>('automatic')` | APG default is automatic. Manual is for tabs whose activation has cost (network call, expensive panel render). In manual mode, arrow keys move focus only; Enter/Space activates. |
| Disabled tab | `KjTab.kjTabDisabled: input<boolean>(false)` | Tab remains in the roving sequence (so users can land on it via Home/End or arrow keys), but Enter/Space is a no-op and `aria-disabled="true"` is announced. The roving primitive accepts a `disabled` predicate per item — wire through. |
| Closable tab | `KjTab.kjClosable: input<boolean>(false)` and `(kjClose): output<string>` | When true, the wrapper renders an X button inside the tab with `aria-label="Close <tab label>"`. Delete on the focused tab also fires `(kjClose)`. The directive does not remove the tab — the consumer removes it from the source list and the registration drops. See [Closable tabs](#closable-tabs). |
| Lazy panel rendering | `KjTabPanel` mounts content on first activation, then keeps it mounted for the lifetime of the component | Default. Mirrors Material's `*matTabContent` and PrimeNG's `[lazy]`. Eager-mount-all and unmount-on-deactivate are not exposed as toggles in v1 (see open question 8). |
| Active-tab indicator | Wrapper-only — CSS `--kj-tab-indicator-x` / `--kj-tab-indicator-width` custom properties on the tablist | The wrapper writes the active tab's `offsetLeft` / `offsetWidth` (or `offsetTop` / `offsetHeight` in vertical mode) to CSS variables on each value change; the consumer's CSS animates a `::after` pseudo-element using those variables. No JS animation API. |
| Tab-as-router-nav | `KjTabs.kjAsNav: input<boolean>(false)` | When true, the root renders `<nav>` instead of a `tablist`-roled element; tabs render as `<a aria-current="page">`; `<kj-tab-panel>` is forbidden. See [Tabs as router-driven nav](#tabs-as-router-driven-nav-the-nav-tabs-pattern). |
| Imperative API | `KjTabs.select(value: string)`, `KjTabs.next()`, `KjTabs.previous()` | Public methods on the root; useful for programmatic flows (an "Apply and continue" button that advances the active tab). `next` / `previous` clamp at the boundaries; they do not wrap. |
| Read-only state | `KjTabs.value: Signal<string>`, `KjTabs.tabs: Signal<readonly KjTab[]>`, `KjTabs.activeTab: Signal<KjTab \| undefined>` | Public, read-only. Consumers can `effect()` over them for analytics, route sync, etc. |
| Variant | `KjTabs` host-composes `KjVariant` | `underline` (default), `pill`, `enclosed`. Reflected as `data-variant` on the root. Components-package CSS owns the visuals. |
| Size | `KjTabs` host-composes `KjSize` | `xs` / `sm` / `md` / `lg`. Reflected as `data-size`. |

## Accessibility (WCAG 2.1 AAA)

Reference: [WAI-ARIA APG — Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/).

| Criterion | Requirement | Where it lives |
|---|---|---|
| 1.3.1 Info & Relationships | Tablist groups its tabs; each tab is associated with its panel via `aria-controls`; each panel is labelled by its tab via `aria-labelledby` | `KjTabList` host-binds `role="tablist"` + `aria-orientation`; `KjTab` host-binds `role="tab"` + `aria-controls={panelId}` + `id={tabId}`; `KjTabPanel` host-binds `role="tabpanel"` + `aria-labelledby={tabId}` + `id={panelId}`. The ids are generated by the root for each registered value (one pair per value). |
| 2.1.1 Keyboard | All keyboard interactions available without pointer | See [Keyboard contract](#keyboard-contract). |
| 2.1.2 No Keyboard Trap | Tab leaves the component when no focusable descendants remain | Inherent — no trap. The active panel's focusable descendants follow in document order. |
| 2.4.3 Focus Order | Active panel's tabbable contents fall in document order after the tablist | Inherent — no portal, no overlay. |
| 2.4.6 Headings & Labels (AAA) | Each tab's text describes its panel | Consumer-owned content. Documented in examples. |
| 2.4.7 Focus Visible | Focus ring on tabs and on the close button (when present) | `KjTab` and the close button compose `KjFocusRing`. |
| 2.5.5 Target Size (AAA) | Tab triggers ≥ 44×44 CSS px | Components-package responsibility — wrapper styles tabs with `padding: var(--kj-space-md) var(--kj-space-lg)`; verify under `xs` size variant. The close button (when present) must also meet 44×44; we render it with `min-width: 24px; min-height: 24px` plus a 10px hit-area extension via `padding`, totalling 44 — see open question 5. |
| 4.1.2 Name, Role, Value | Tab announces `role="tab"` + `aria-selected`; panel announces `role="tabpanel"` + `aria-labelledby` | All wired via host bindings. |
| 4.1.3 Status Messages | Tab activation is a direct user action, not a status update — no live region required by default. Optional `kjAnnouncePanelChange` for re-orientation | `KjLiveRegion` mounted opt-in by the wrapper. |

### ARIA wiring summary

For a Tabs with values `overview`, `billing`, `usage`, active value
`billing`:

```html
<div [kjTabs] data-orientation="horizontal" data-variant="underline">

  <div [kjTabList] role="tablist" aria-orientation="horizontal">
    <button [kjTab] kjTabValue="overview"
            role="tab" id="kj-tab-overview-7f3a"
            aria-controls="kj-panel-overview-7f3a"
            aria-selected="false" tabindex="-1"
            data-state="inactive">Overview</button>
    <button [kjTab] kjTabValue="billing"
            role="tab" id="kj-tab-billing-7f3a"
            aria-controls="kj-panel-billing-7f3a"
            aria-selected="true" tabindex="0"
            data-state="active">Billing</button>
    <button [kjTab] kjTabValue="usage"
            role="tab" id="kj-tab-usage-7f3a"
            aria-controls="kj-panel-usage-7f3a"
            aria-selected="false" tabindex="-1"
            data-state="inactive">Usage</button>
  </div>

  <div [kjTabPanel] kjPanelValue="overview"
       role="tabpanel" id="kj-panel-overview-7f3a"
       aria-labelledby="kj-tab-overview-7f3a"
       hidden>…</div>
  <div [kjTabPanel] kjPanelValue="billing"
       role="tabpanel" id="kj-panel-billing-7f3a"
       aria-labelledby="kj-tab-billing-7f3a"
       tabindex="0">…</div>
  <div [kjTabPanel] kjPanelValue="usage"
       role="tabpanel" id="kj-panel-usage-7f3a"
       aria-labelledby="kj-tab-usage-7f3a"
       hidden>…</div>
</div>
```

Notes on the wiring:

- **One id seed per `KjTabs` instance** (`7f3a` in the example),
  used to derive both halves of the pair so they remain co-located
  in DOM dev-tools. Generated via `inject(IdGenerator)` (or
  `crypto.randomUUID().slice(0, 8)`).
- **Inactive panels use `hidden`** (boolean attribute), which
  removes them from the focus order, the AT tree, and layout. The
  active panel does *not* set `hidden`.
- **Panel `tabindex="0"`** is conditional. APG: a panel that
  contains no focusable children should have `tabindex="0"` so the
  user can tab onto the panel itself and have its content read; a
  panel that contains focusable children should *not* set
  `tabindex="0"` (the children are the focus targets). The
  directive applies a `tabindex="0"` host binding *unless* the
  panel's projected content has at least one tabbable element.
  Implementation: a `MutationObserver` (panel-scope) plus an
  initial query — see open question 4.
- **`tabindex="-1"` on inactive tabs** plus `tabindex="0"` on the
  active tab is the roving-tabindex contract. `KjRovingTabindex`
  manages this; we do not wire it manually.

### Keyboard contract

| Key | Behaviour | Activation mode | Required by APG? |
|---|---|---|---|
| `Tab` / `Shift+Tab` | Move focus into / out of the tablist (single tab stop). When focus is on a panel's content, Tab moves between the panel's focusable descendants normally | both | Required |
| `ArrowLeft` / `ArrowRight` | Move focus to previous / next tab (horizontal orientation), wrapping at boundaries | automatic: also activate the focused tab. manual: focus only | Required |
| `ArrowUp` / `ArrowDown` | Move focus to previous / next tab (vertical orientation), wrapping at boundaries | automatic: also activate. manual: focus only | Required (when orientation = vertical) |
| `Home` | Move focus to first non-disabled tab | automatic: also activate. manual: focus only | Required |
| `End` | Move focus to last non-disabled tab | automatic: also activate. manual: focus only | Required |
| `Enter` / `Space` on a focused tab | Activate the tab | manual: required. automatic: redundant (already activated by focus) but still honoured | Required for manual mode |
| `Delete` on a focused closable tab | Fire `(kjClose)` for the tab; consumer removes it; if the closed tab was active, advance to the next non-disabled tab (or previous, if no next exists) | both | Recommended for closable tabs |
| `Ctrl+PageUp` / `Ctrl+PageDown` | Cycle to previous / next tab from anywhere in the panel content (advanced) | both | Optional — see open question 6 |

The "wrapping at boundaries" choice is APG's recommendation for
tabs (in contrast to, e.g., a listbox where boundary clamp is the
norm). Wrapping makes `End` then `ArrowRight` reach the first tab,
which is the discoverable behaviour.

### Automatic vs. manual activation

APG specifies both modes precisely. The choice between them is
**not** a stylistic preference; it is a content-cost question.

- **Automatic** (default). Focus = activation. The user arrow-keys
  through tabs and each panel becomes visible as focus lands on
  its tab. AT announces the new panel as the focus moves. Best for
  cheap content (already-rendered text, lightweight components).
  APG's default recommendation.
- **Manual**. Focus moves but activation does not. The user
  arrow-keys to a tab, then presses Enter or Space to activate.
  Best for expensive content (network call, large render) where
  drive-by activation while skimming would be costly.

The directive surfaces this as `kjActivationMode`. Default is
`'automatic'`. Wrappers may override per consumer needs but the
directive does not auto-detect: cost is a runtime property the
consumer knows and we don't.

### Closable tabs

When `kjClosable` is true on a tab:

- The wrapper renders an X button **inside the tab**. The X is
  *not* nested inside the tab's `<button>` (nested interactive
  elements are an a11y violation). Instead the tab's host element
  becomes a flex container with two children: the tab's `<button
  role="tab">` and a separate `<button class="kj-tab-close">`.
  Both are focusable; the close button has `tabindex="-1"`
  (outside the roving sequence) but is reachable as a *click
  target* and via the Delete key on the focused tab.
- The close button has `aria-label="Close <tab label>"`, computed
  from the tab's text content (or an explicit `kjCloseLabel` input
  for tabs with non-text labels). This is required by 4.1.2 — the
  X glyph alone has no accessible name.
- Pressing Delete on the focused tab fires `(kjClose)` for that
  tab. The directive does not remove the tab from the DOM — the
  consumer removes it from their source data, which causes the
  `@for` to drop the corresponding `<kj-tab>`, and the registration
  is cleaned up via `DestroyRef`.
- When the closed tab was the active tab, the directive
  advances the active value to the next non-disabled tab (or
  previous, if no next exists). When the last tab is closed, the
  active value becomes the empty string and the consumer is
  expected to render an empty state. The wrapper's CSS handles the
  empty state (a centered message panel) but the directive does
  not synthesise a "no tabs" state.

### Tabs-as-secondary-nav

When `kjAsNav` is true, the ARIA story changes from `tablist` /
`tab` / `tabpanel` to `<nav>` + `<a>` + `aria-current="page"`. The
keyboard contract changes too:

| Key | nav-tabs behaviour |
|---|---|
| `Tab` | Each tab link is its own tab stop (no roving). |
| `Enter` | Activate the link (router navigation). |
| `Space` | No-op (links activate on Enter only). |
| Arrow keys | No special handling — native browser behaviour (scroll). |

This matches the [Menu analysis](./menu.md) keyboard contract for
inline nav menus. The roving tabindex primitive is not composed
when `kjAsNav` is true.

## Inputs / Outputs / Models

All public-facing inputs/outputs/models are `kj`-prefixed on the
directive layer; wrapper components re-map to terse names via
`hostDirectives` `inputs`.

### `KjTabs` (`[kjTabs]`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjValue` | `model` | `string` | `''` | Two-way bound active tab value. The wrapper assigns the first registered tab's value when the consumer leaves it unset (single empty-string "uninitialised" sentinel triggers the assignment in an `effect`). |
| `kjOrientation` | `input` | `'horizontal' \| 'vertical'` | `'horizontal'` | Drives `aria-orientation` on the tablist and the arrow-key axis. |
| `kjActivationMode` | `input` | `'automatic' \| 'manual'` | `'automatic'` | APG default is automatic. |
| `kjAsNav` | `input` | `boolean` | `false` | When true, root renders as `<nav>` and tabs render as `<a aria-current="page">`. See [Tabs as router-driven nav](#tabs-as-router-driven-nav-the-nav-tabs-pattern). |
| `kjAnnouncePanelChange` | `input` | `boolean` | `false` | When true, mounts a `KjLiveRegion` and announces "Tab activated: <label>" on each value change. Off by default. |
| `kjValueChange` | `output` | `string` | — | Implicit via `model`; emitted on activation. |
| `kjTabClose` | `output` | `string` | — | Bubbled from `KjTab.kjClose`; the closed tab's value. Convenience output so consumers can listen at the root. |
| `value` | `Signal<string>` | — | — | Public, read-only. |
| `tabs` | `Signal<readonly KjTab[]>` | — | — | Read-only registration list, in document order. |
| `activeTab` | `Signal<KjTab \| undefined>` | — | — | Resolved active tab. |
| `select(value)`, `next()`, `previous()` | methods | — | — | Imperative API. `next` / `previous` clamp at boundaries. |

### `KjTabList` (`[kjTabList]`)

| Host binding | Source |
|---|---|
| `[attr.role]` | `'tablist'` (or absent when `kjAsNav` is true; the parent `<nav>` provides the landmark) |
| `[attr.aria-orientation]` | `tabs.orientation()` |
| `[attr.data-orientation]` | `tabs.orientation()` |

No public inputs. Composes `KjRovingTabindex` with
`orientation` forwarded from the root context.

### `KjTab` (`[kjTab]`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjTabValue` | `input.required` | `string` | — | The wiring key. Stable across reorders. |
| `kjTabDisabled` | `input` | `boolean` | `false` | Tab remains in the roving sequence (Home/End and arrow keys can land on it) but Enter/Space is a no-op. `aria-disabled="true"` announced. |
| `kjClosable` | `input` | `boolean` | `false` | When true, wrapper renders the close button. Delete on the focused tab fires `kjClose`. |
| `kjCloseLabel` | `input` | `string` | computed | Explicit close-button `aria-label`. When omitted, defaults to `Close ${kjTabValue}` (English) or whatever localisation hook the consumer wires (open question 9). |
| `kjClose` | `output` | `void` | — | Fires when the user closes this tab (X click or Delete). Bubbles to `KjTabs.kjTabClose`. |

| Host binding | Source |
|---|---|
| `[attr.role]` | `'tab'` (or `null` and rely on `<a>` semantics when `kjAsNav` is true) |
| `[attr.id]` | `tabs.tabId(value())` |
| `[attr.aria-controls]` | `tabs.panelId(value())` (omitted when `kjAsNav` is true) |
| `[attr.aria-selected]` | `tabs.isActive(value()) ? 'true' : 'false'` |
| `[attr.aria-current]` | `kjAsNav() && isActive() ? 'page' : null` |
| `[attr.aria-disabled]` | `kjTabDisabled() ? 'true' : null` |
| `[attr.tabindex]` | managed by `KjRovingTabindexItem` (`0` when active in roving order, `-1` otherwise). When `kjAsNav` is true, `tabindex` is unmanaged (native `<a>` is naturally focusable). |
| `[attr.data-state]` | `tabs.isActive(value()) ? 'active' : 'inactive'` |
| `[attr.data-disabled]` | `kjTabDisabled() ? '' : null` |
| `(click)` | `tabs.select(value())` (no-op when disabled) |
| `(keydown.delete)` | `kjClosable() ? close() : null` |

### `KjTabPanel` (`[kjTabPanel]`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjPanelValue` | `input.required` | `string` | — | The wiring key. Must match a `KjTab.kjTabValue` for the panel to be addressable. Mismatched panels render as orphans (a `console.warn` in dev mode flags them). |

| Host binding | Source |
|---|---|
| `[attr.role]` | `'tabpanel'` |
| `[attr.id]` | `tabs.panelId(value())` |
| `[attr.aria-labelledby]` | `tabs.tabId(value())` |
| `[attr.tabindex]` | `'0'` when the panel has no tabbable descendants, else `null`. See [open question 4](#open-questions--risks). |
| `[attr.hidden]` | `!tabs.isActive(value())` |
| `[attr.data-state]` | `tabs.isActive(value()) ? 'active' : 'inactive'` |

Lazy mount: panel content is wrapped in an internal `*ngIf` /
`@if` that becomes true on first activation and stays true. The
content is created once and kept; subsequent deactivations only
toggle `hidden`. This is the Material `*matTabContent` posture.

### Wrapper inputs (components package)

| Element | Input | Maps to |
|---|---|---|
| `<kj-tabs>` | `value` | `kjValue` (two-way: `[(value)]`) |
| `<kj-tabs>` | `orientation` | `kjOrientation` |
| `<kj-tabs>` | `activationMode` | `kjActivationMode` |
| `<kj-tabs>` | `asNav` | `kjAsNav` |
| `<kj-tabs>` | `announcePanelChange` | `kjAnnouncePanelChange` |
| `<kj-tabs>` | `variant` | `KjVariant` (host-composed) |
| `<kj-tabs>` | `size` | `KjSize` (host-composed) |
| `<kj-tab>` | `value` | `kjTabValue` |
| `<kj-tab>` | `disabled` | `kjTabDisabled` |
| `<kj-tab>` | `closable` | `kjClosable` |
| `<kj-tab>` | `closeLabel` | `kjCloseLabel` |
| `<kj-tab>` | `label` | wrapper-only shorthand; renders projected text inside the tab's `<button>` |
| `<kj-tab-panel>` | `value` | `kjPanelValue` |

## Examples to ship

1. **Default (automatic activation, horizontal, underline variant).**
   Three tabs, three panels of static text. Anchors the
   four-directive shape and the string-keyed wiring.
2. **Two-way bound value.** `<kj-tabs [(value)]="active">` with
   the active value persisted to `localStorage` via an `effect`.
   Demonstrates the `model` two-way binding and the
   route-param-bindable shape.
3. **Vertical orientation.** Same content, `orientation="vertical"`.
   Demonstrates the arrow-axis switch and the wrapper CSS that
   flips the tablist to a column.
4. **Manual activation.** `activationMode="manual"`. Useful for an
   expensive remote-loaded panel — demonstrates that arrow keys
   move focus only and Enter/Space activate.
5. **Disabled tab.** One tab with `disabled="true"`. Demonstrates
   that the disabled tab remains discoverable via Home/End / arrow
   keys but cannot be activated.
6. **Closable tabs.** Each tab `closable="true"`; X button + Delete
   key removal; the active tab advances on close. Demonstrates
   the closable contract and the close-button `aria-label`
   wiring.
7. **Pill variant.** `variant="pill"`. Demonstrates the variant
   chrome and the `data-variant` reflection.
8. **Enclosed variant.** `variant="enclosed"`. Demonstrates the
   bordered-tabs-with-bottomless-active-tab look.
9. **Lazy-mounted panel.** A panel containing a slow-rendering
   chart. Demonstrates that the chart is constructed once on
   first activation and kept across switches.
10. **Tabs-as-router-nav.** `<kj-tabs asNav>` with `routerLink` on
    each tab and `<router-outlet />` as the panel surface. Renders
    `<nav>` + `<a aria-current="page">` and demonstrates the
    nav-tabs flag.
11. **Active-tab indicator animation.** A custom underline that
    slides between active tabs using the wrapper's
    `--kj-tab-indicator-x` / `--kj-tab-indicator-width` custom
    properties. CSS-only animation.
12. **Long tab strip with overflow scroll.** 20 tabs, the tablist
    scrolls horizontally, optional left/right scroll buttons.
    Validates the overflow story (open question 7).
13. **Form-section tabs.** Each panel hosts a reactive sub-form;
    demonstrates that focus order, validation messages, and
    `aria-describedby` keep working when a tab deactivates
    mid-validation. The lazy-then-persistent mount means the form
    state survives tab switches.

## Open questions / risks

1. **`KjRovingTabindex` orientation input.** The primitive today
   treats ArrowLeft/Right and ArrowUp/Down equivalently. Tabs
   requires axis-aware behaviour: in `horizontal` orientation only
   ArrowLeft/Right move the tab; in `vertical` orientation only
   ArrowUp/Down move it. Plan: add `orientation: input<'horizontal'
   | 'vertical' | 'both'>('both')` to `KjRovingTabindex`, default
   `'both'` for backwards compatibility, and have `KjTabList`
   forward `kjOrientation` from the root. Stepper has the same
   forcing function (see Stepper open questions); landing this
   primitive change before Tabs ships unblocks both.

2. **`aria-controls` / `aria-labelledby` id generation.** Each
   `KjTabs` instance needs a unique seed; each registered value
   needs a derived id pair (`kj-tab-${value}-${seed}` and
   `kj-panel-${value}-${seed}`). Plan: a single `idSeed` private
   field on `KjTabs` initialised from `inject(IdGenerator)` (or
   `crypto.randomUUID().slice(0, 8)`); `tabId(value)` and
   `panelId(value)` are `computed` getters. Same posture as
   Accordion's planned per-item ids — port the implementation.

3. **Active-value resolution when no tab matches.** If
   `kjValue=''` (the wrapper's "uninitialised" sentinel) or the
   bound value does not match any registered tab, what is active?
   Plan: an `effect` on the root that reconciles `kjValue` against
   the registration list — when the value is unmatched and at
   least one tab exists, set `kjValue` to the first non-disabled
   tab's value; when no tabs exist, leave it as `''` and render an
   empty tablist (the consumer handles the empty state). This is
   the same drift-correction shape Accordion needs.

4. **Conditional `tabindex="0"` on the panel.** APG: a panel with
   no tabbable descendants needs `tabindex="0"` so the user can
   tab onto the panel; a panel with tabbable descendants must
   *not* set it (the descendants are the focus targets).
   Implementation: query the panel's projected content for
   tabbable descendants on each activation (and on a
   `MutationObserver` that watches subtree changes). The query
   uses the `tabbable` selector list (`a[href], button:not([disabled]),
   input:not([disabled]), select:not([disabled]),
   textarea:not([disabled]), [tabindex]:not([tabindex="-1"])`).
   Risk: SSR — the observer attaches on the client. For SSR-first
   render, use `tabindex="0"` until the observer reports a
   tabbable descendant; this is more permissive than the strict
   APG rule but is recoverable client-side. Test under
   `provideClientHydration()`.

5. **Close button target size.** WCAG 2.5.5 (AAA) requires 44×44
   CSS px. The X button is visually small (16–24 px) but its hit
   area must be ≥ 44 px. Plan: `min-width: 24px; min-height: 24px`
   on the visible glyph + `padding` to extend the hit area to 44
   px. The padding does not push the tab text apart because the
   close button is in a flex container with its own bounding box.
   Verify visually under all variants.

6. **Ctrl+PageUp / Ctrl+PageDown cycling.** APG lists this as an
   *optional* shortcut for cycling tabs from anywhere in the
   panel content. Plan: ship as opt-in via `kjGlobalShortcuts:
   input<boolean>(false)` on `KjTabs`; when true, the directive
   listens at `document` for the keys and cycles the active tab.
   Risk: collides with browser tab-cycling shortcuts in some
   browsers (Firefox does *not* override these for web content;
   Chromium does override and the keys reach the page). Decision:
   off by default, document the browser-compatibility caveat.
   v1 may ship without this and add it later.

7. **Overflow-scrolling tab strip.** Long tab strips need to
   scroll horizontally (or vertically). The CSS is trivial
   (`overflow-x: auto; scroll-snap-type: x mandatory` on the
   tablist), but the keyboard story needs care: when the active
   tab is off-screen after a value change (programmatic select,
   browser history restore), the directive should call
   `scrollIntoView({ block: 'nearest', inline: 'nearest' })` on
   the active tab. Plan: an `effect` that runs on every
   `activeTab()` change and calls `scrollIntoView` (skipping when
   the tab is already in view to avoid jitter). Optional left /
   right scroll buttons render in the wrapper when the tablist
   overflows; they are pure presentation and do not affect
   selection.

8. **Eager-mount-all and unmount-on-deactivate are not exposed.**
   v1 ships only the lazy-then-persistent mode. Reasons: (a) the
   default fits 95% of cases, (b) eager-mount-all means panels
   have to live-paint with `display: none` (which still triggers
   layout in some cases) or `visibility: hidden` (which keeps
   layout space), neither of which is a default we want, (c)
   unmount-on-deactivate breaks every internal panel state
   (scroll position, form values, expanded sections). Consumers
   who want eager mount can opt out by avoiding `<kj-tab-panel>`
   and authoring their own `[hidden]`-toggled panels under
   `<kj-tabs>` (the directive does not require panels to use
   `KjTabPanel` — the wiring is by value, not by type). Document
   this escape hatch.

9. **Localised close-button label.** The wrapper computes
   `aria-label="Close <tab label>"` from the tab's text content
   in English. Other locales need the verb translated. Plan:
   accept `kjCloseLabel: input<string>` as the override; the
   default is computed only when omitted. The components-package
   wrapper may also accept a `closeLabelTemplate:
   InputSignal<(label: string) => string>` to localise the
   format. Defer the i18n primitive design to a separate skill.

10. **`<button>` is not enforced on the tab.** A consumer may
    apply `[kjTab]` to a `<div>`. The directive will still wire
    `role="tab"` and `(click)`, but the user loses Enter/Space
    activation, focusability, and disabled semantics. APG
    explicitly mandates `<button>` (or `<a>` in nav-tabs mode).
    Decision: development-mode `console.warn` when the host
    element is neither (mirror the same warning in `KjMenuItem`
    and the planned Accordion check).

11. **Tab value collisions.** Two `KjTab`s with the same
    `kjTabValue` (or two panels with the same `kjPanelValue`)
    would share state. Footgun. Plan: dev-mode `console.warn` on
    duplicate registration; the registration map keeps the last
    one (consistent with how Angular's keyed `@for` would behave
    on duplicate trackBy).

12. **Active-indicator measurement under SSR.** The wrapper's
    `--kj-tab-indicator-x` writes happen in a `ResizeObserver` /
    `effect` after layout. SSR markup will paint without the
    indicator until hydration completes; the indicator will pop
    in. Plan: render the indicator with `opacity: 0` until the
    first measurement, then transition `opacity` to 1 on first
    paint. Acceptable; matches the Accordion measurement
    posture.

13. **Tab-as-router-nav and active-value sync.** When `kjAsNav`
    is true, the active tab is determined by the route, not by
    `kjValue`. The wrapper needs to listen to the router and
    update `kjValue` accordingly. Plan: a thin
    `KjTabsRouterSync` directive (composed via `hostDirectives`
    only when `kjAsNav` is true — but conditional `hostDirectives`
    is unsupported, so apply unconditionally as a no-op when
    `kjAsNav` is false). The directive injects the Router and
    Activated Route, listens for `NavigationEnd`, matches the
    URL against each tab's `routerLink`, and writes the matching
    value to `kjValue`. Documented as a wrapper concern; the
    core directive does not import the router.

14. **`KjTabList` exists but provides no token.** Currently it is
    a positional wrapper that hosts `role="tablist"` + roving.
    If a future feature needs per-list state (e.g. multiple tab
    strips inside one `KjTabs`, "tabs above and tabs below the
    panel"), we may want to lift the roving behaviour onto the
    list and pass a context. Not for v1. Document that
    `KjTabList` is currently a thin host but reserve the option
    to elaborate.

15. **Cross-tab focus restoration after close.** When a closable
    tab is removed, focus must move somewhere — staying on the
    detached element is invalid. Plan: on `(kjClose)`, the
    directive moves focus to the new active tab's host before
    the registration is dropped. This requires the directive to
    perform the focus call inside the same microtask as the
    registration drop, otherwise the consumer's `@for` rebuild
    will have already run. Test under zoneless and under
    `provideClientHydration()`.

16. **Wrapper's `[label]` shorthand vs. projected content.** Like
    Accordion's `<kj-accordion-item [label]>` shorthand, the
    `<kj-tab [label]>` shorthand renders projected text inside the
    `<button>`. When the consumer projects custom content (an
    icon + label, a badge), the shorthand is omitted and they
    project a `<ng-content>`. The wrapper supports both; document
    the precedence (explicit content wins).

17. **Unmount-then-remount on `kjValue` programmatic reset.** If
    a consumer programmatically resets `kjValue` to an unknown
    value while panels are mid-render, the previously active
    panel hides and the new one starts to mount. The lazy
    posture says the previously active panel stays mounted — fine.
    But a *new* unknown value would cause no panel to be active,
    which the wrapper handles as the empty-state case. Verify
    that the active-value-resolution `effect` (open question 3)
    correctly re-routes to the first non-disabled tab in this
    case.
