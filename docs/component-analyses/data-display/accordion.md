# Accordion

A vertically stacked set of expandable sections. Each section has a header
(button) and a body (region) that expands or collapses on click. The
accordion may be configured to allow only one section open at a time
(`single`) or any number open simultaneously (`multiple`). It is the
canonical disclosure pattern: discoverable, in flow (no overlay), no
focus trap, no scroll lock — just header buttons that flip
`aria-expanded` on a region.

> Already shipped in core at `packages/core/src/accordion/` and wrapped
> in `packages/components/src/accordion/`. This analysis documents the
> existing shape, contrasts it with peer libraries, and lists the
> concrete gaps to close before declaring v1.

For the **single-disclosure** variant — one trigger toggling one panel,
no item collection — see [`collapsible.md`](./collapsible.md). It is the
same machinery (`KJ_ACCORDION_ITEM` context, `aria-expanded`,
`aria-controls`, `role="region"`) reduced to a single item; we ship it
as a separate component for ergonomics, not because it has a different
core. For the analogous **selected-one-of-many** pattern with mutually
exclusive bodies and roving tabindex on the headers, see
[`../navigation/tabs.md`](../navigation/tabs.md). Tabs and Accordion
share the same `single | multiple` mental model in their state
machines, but Tabs uses `role="tablist"`/`tab`/`tabpanel` and assumes
exactly one selection, while Accordion uses plain buttons + regions and
permits zero or many.

## Source comparison

| Concern | PrimeNG `p-accordion` | Angular Material `MatExpansionPanel` / `MatAccordion` | shadcn/ui `Accordion` (Radix) |
|---|---|---|---|
| Primary surface | Component family (`<p-accordion>`, `<p-accordionTab>`) — declarative-first, data-light | Component family (`<mat-accordion>`, `<mat-expansion-panel>`, `<mat-expansion-panel-header>`, `<mat-panel-title>`, `<mat-panel-description>`) | Compound headless primitives (`Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`) |
| Single vs. multiple | `[multiple]` boolean input on `<p-accordion>` | `multi: boolean` input on `<mat-accordion>` (default `false`) | `type: 'single' \| 'multiple'` on root |
| Value model | `[(activeIndex)]` — number for single, `number[]` for multiple. Index-based; brittle if items reorder | `expanded: boolean` per panel; no value at the parent | `value: string \| string[]` (controlled) or `defaultValue` (uncontrolled). String-keyed |
| Header markup | Built-in chrome with `header` slot | `<mat-expansion-panel-header>` is a real component (`role="button"`); description / icon slots | Consumer owns `<button>`; primitives wire ARIA only |
| Disabled item | `[disabled]` on `<p-accordionTab>` | `disabled` on the panel | `disabled` on `AccordionItem` |
| Animation | CSS height + opacity, hard-coded transitions | Angular Animations (`@bodyExpansion`) — auto-height, expects `BrowserAnimationsModule` | Radix CSS variables (`--radix-accordion-content-height`) measured at runtime; consumers animate with CSS keyframes |
| Keyboard | Tab between headers, Enter/Space toggle. Up/Down arrow nav optional (`p-accordion` does **not** ship arrow nav) | Tab between headers, Enter/Space toggle, Home/End jump. **No arrow keys** by default | Tab between headers, Enter/Space toggle, Up/Down/Home/End arrow nav (roving) |
| Focus management | Trigger keeps focus on toggle; no roving | Same; no roving (each header is its own tab stop) | Roving via `RovingFocusGroup` so headers behave like a one-tab-stop composite |
| ARIA | `role="region"` on body, `aria-labelledby` to header, `aria-expanded` + `aria-controls` on trigger | Same wiring; header is a real `<button>` (composed from a CDK `<a>` if `hideToggle`) | Same wiring; consumer-supplied `<button>` |
| Programmatic open/close | `(activeIndexChange)` two-way; `accordion.open(index)` not in public API | `panel.open()`, `panel.close()`, `panel.toggle()` on each `MatExpansionPanel`; `accordion.openAll()` / `closeAll()` when `multi=true` | Controlled `value` only; no imperative API |
| Visual chrome | Heavy: borders, chevron, hover, selected state, transitions all baked in | Heavy: Material Design surface, elevation, padding, chevron | Zero — primitives are unstyled |

**Read-off.**

- **PrimeNG** binds state by index. That is fragile (sorted lists,
  conditional `@for`s) and forces consumers to think in array
  positions. Avoid.
- **Angular Material** treats each panel as independently
  open/closed; the parent only gates "single mode" behaviour. Clean,
  but spreads state across N components — no single source of truth
  the way kouji's signal model wants.
- **shadcn / Radix** is the spiritual match: `type: 'single' |
  'multiple'`, string-keyed values, headless primitives, consumer
  owns the `<button>` and the chevron. We already match this shape
  in core.

## Decision (core directive)

**Yes — keep the existing four-directive family.** The state machine
(open set, single vs. multiple toggle, per-item context resolution) is
not trivial enough to leave to consumers, and the ARIA wiring
(`aria-controls`, `aria-labelledby`, `aria-expanded`, `role="region"`)
is exactly the kind of cross-element coordination the headless layer
exists to own. The current implementation in
`packages/core/src/accordion/accordion.ts` already establishes the
correct shape:

```
KjAccordion          (selector: [kjAccordion])
  └── provides KJ_ACCORDION { openIds, toggle, isOpen }
KjAccordionItem      (selector: [kjAccordionItem], requires kjItemValue)
  └── provides KJ_ACCORDION_ITEM { expanded, toggle, open, close }
KjAccordionTrigger   (selector: [kjAccordionTrigger])
  └── injects KJ_ACCORDION_ITEM, host-binds aria-expanded + click
KjAccordionContent   (selector: [kjAccordionContent])
  └── injects KJ_ACCORDION_ITEM, host-binds [hidden]
```

**String-keyed `kjItemValue`** — not index-based. Stable across
reorders, easy to two-way bind to user-meaningful keys.

**Single source of truth on the root.** `KjAccordion._openIds:
WritableSignal<ReadonlySet<string>>`. Items derive their `expanded`
state via `computed(() => accordion.isOpen(value()))`. Toggling goes
through the root, which enforces `single`-mode invariant (clear all
others) before adding. This is the right place to put the rule.

**Re-use `KjRovingTabindex` for arrow-key navigation** — but only
**opt-in**. The WAI-ARIA APG accordion pattern lists Up/Down arrow nav
as **recommended, not required**, and in flow-of-content accordions
(FAQ pages, settings sections) Tab-between-headers is more idiomatic
because Tab also reaches links and form fields *inside* an open
panel. For an accordion whose headers are the dominant navigation
(e.g. a left-rail filter list), expose `kjArrowNavigation` to opt into
roving; we can then host-apply `KjRovingTabindex` to the root and
`KjRovingTabindexItem` to triggers. Default: off.

**No CDK, no Angular Animations.** Animation is CSS-only and
content-driven. We measure the content's natural height in a
`ResizeObserver` and expose it as a CSS custom property
(`--kj-accordion-content-height`) on the content host element so
consumers can `transition: height` or `@keyframes` against it. This is
the Radix pattern, fits the no-CDK rule, and works across SSR /
zoneless / animations-disabled.

## What exists today

`packages/core/src/accordion/`:

- `accordion.ts` — four directives: `KjAccordion`, `KjAccordionItem`,
  `KjAccordionTrigger`, `KjAccordionContent`.
- `accordion.context.ts` — `KjAccordionContext` and
  `KjAccordionItemContext` interfaces; `KJ_ACCORDION` and
  `KJ_ACCORDION_ITEM` injection tokens.
- `accordion.spec.ts` — covers default-hidden content, click-to-expand,
  `aria-expanded` toggling, axe audit.
- `index.ts` — re-exports the four directives plus both tokens.

`packages/components/src/accordion/`:

- `accordion.ts` — four wrapper components: `KjAccordionComponent`,
  `KjAccordionItemComponent`, `KjAccordionTriggerComponent`,
  `KjAccordionContentComponent`. Root and item compose via
  `hostDirectives`; trigger and content imports the directive into
  their template (since both render their own host element). Item
  exposes a `[label]`-shorthand path that renders an internal
  `<kj-accordion-trigger>` so simple FAQ-style accordions can omit
  the trigger element entirely.
- `accordion.css` — borders, padding, chevron rotation via
  `[aria-expanded="true"]::after`, focus ring, disabled opacity.
- `accordion.default.example.ts`, `accordion.multiple.example.ts`,
  `accordion.disabled.example.ts`, `accordion.rich-content.example.ts`.

## Base features

| Feature | Where it lives | Notes |
|---|---|---|
| Single vs. multiple | `KjAccordion.kjAccordionType` input (`'single' \| 'multiple'`, default `'single'`) | Enforced in `toggle()` — clears the set first in single mode. |
| String-keyed item identity | `KjAccordionItem.kjItemValue` (`input.required<string>`) | Stable across reorders. |
| Imperative per-item control | `KjAccordionItem.open()`, `close()`, `toggle()` | Already present. Useful for programmatic flows. |
| Read-only open state | `KjAccordion.openIds: Signal<ReadonlySet<string>>` | Public; consumers can `effect()` over it for analytics or persistence. |
| Per-item `expanded` signal | `KjAccordionItem.expanded: Signal<boolean>` | Computed from the root's set. |
| Disabled item | **Wrapper-only today** — `KjAccordionTriggerComponent.disabled` input drives `[disabled]` on the inner button and `aria-disabled="true"` | Gap in core: see Open questions. |
| Default-open items | **Missing** | No way to seed `_openIds` from item declarations or root inputs. See Open questions. |
| Two-way value binding | **Missing** | `kjAccordionType` is one-way only; the open-set is internal. We need `kjOpenValues: model<string \| string[] \| null>` (mirrors Radix `value` / `onValueChange`). See Open questions. |
| Arrow-key navigation | **Missing** | Per the decision above, opt-in via `kjArrowNavigation` + `KjRovingTabindex`. |
| Animation hooks | **Missing** | Content is `[hidden]` — no measured height. See Open questions. |
| Disclosure (single-item) reuse | **Cross-component** — see [`collapsible.md`](./collapsible.md) | Collapsible composes `KjAccordionItem` + `KjAccordionTrigger` + `KjAccordionContent` directly under a thin `KjCollapsible` root that hard-codes `kjAccordionType="multiple"` and synthesises a single item value. |

## Accessibility (WCAG 2.1 AAA)

Reference: [WAI-ARIA APG — Accordion
Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/).

| Criterion | Requirement | Where it lives |
|---|---|---|
| 1.3.1 Info & Relationships | Header is a real `<button>`; body has `role="region"` with `aria-labelledby` to the header's id | Wrapper renders `<button>`; **gap in core**: trigger does not generate an id, content does not set `role="region"` or `aria-labelledby`. See Open questions. |
| 2.1.1 Keyboard | Headers reachable via Tab; Enter/Space toggles | Native `<button>` element gives this for free. **Verify** that the trigger directive does not call `event.preventDefault()` on Space, which would break native scroll-vs-activate. (It does not today; it only listens on `click`.) |
| 2.1.2 No Keyboard Trap | Tab leaves the accordion when no focusable descendants remain | Inherent — no trap. |
| 2.4.3 Focus Order | Open panel's tabbable contents fall in document order | Inherent — no portal, no overlay. |
| 2.4.6 Headings & Labels (AAA) | The header text describes the section | Consumer-owned content. Documented in examples — first child of `<kj-accordion-trigger>` should be the section label. |
| 2.4.7 Focus Visible | Focus ring on triggers | `kj-accordion-trigger:focus-visible` outline in `accordion.css`. **Should compose `KjFocusRing`** to share the design-system ring rather than redefining it locally. See Open questions. |
| 2.5.5 Target Size (AAA) | Trigger ≥ 44×44 CSS px | Components-package responsibility — the wrapper trigger is full-width with `padding: var(--kj-space-md) var(--kj-space-lg)`, comfortably above the threshold for default tokens. Verify under `xs` size variant if/when added. |
| 4.1.2 Name, Role, Value | Trigger announces `aria-expanded` and `aria-controls`; content's region announces `aria-labelledby` | `aria-expanded` is wired today; **`aria-controls` is missing**, **`aria-labelledby` on the content is missing**. See Open questions. |
| 4.1.3 Status Messages | None — disclosure is a direct user action, not a status update | No live region needed. |

### Keyboard contract

| Key | Behaviour | Required by APG? |
|---|---|---|
| `Tab` / `Shift+Tab` | Move focus to the next / previous focusable element in document order. Each header is its own tab stop **unless** `kjArrowNavigation` is enabled | Required |
| `Enter` / `Space` on a trigger | Toggle the corresponding panel | Required |
| `ArrowDown` / `ArrowUp` | Move focus to the next / previous header (with wrap) | Recommended — opt-in via `kjArrowNavigation` |
| `Home` / `End` | First / last header | Recommended — opt-in via `kjArrowNavigation` |

When `kjArrowNavigation` is enabled, `KjRovingTabindex` collapses the
group to a single tab stop and arrow keys move the active index. We
must also expose a `role="group"` on the root (otherwise screen
readers will not announce the headers as a related set). When
`kjArrowNavigation` is disabled (the default), each header is a
plain button in the page tab sequence — the simpler, more common
arrangement for FAQ-style content.

### Heading wrapping

The APG recommends each accordion header is wrapped in a heading
element (`<h2>`–`<h6>`) appropriate to the document outline. We will
**not** force a heading wrapper from the directive — we cannot know
which level fits a consumer's outline — but the docs and examples
must demonstrate the pattern:

```html
<kj-accordion-item value="billing">
  <h3 class="kj-accordion-heading">
    <kj-accordion-trigger>Billing</kj-accordion-trigger>
  </h3>
  <kj-accordion-content>…</kj-accordion-content>
</kj-accordion-item>
```

Because `<kj-accordion-trigger>` uses `display: contents;` on its host
and renders a `<button>` inside, heading-wrapping a trigger does not
break ARIA — the heading wraps the button, exactly as APG calls for.

### Animation

The current core uses `[hidden]` to toggle visibility. That is correct
for a11y (screen readers and Tab order both ignore the content while
hidden) but it precludes a height transition because `display: none`
removes the box from the layout, and toggling it back on jumps to full
height in one frame.

**Plan.** Mirror Radix's pattern:

1. `KjAccordionContent` measures its scroll height in a
   `ResizeObserver` and writes
   `style.setProperty('--kj-accordion-content-height',
   ${height}px)` on its host element.
2. Replace the `[attr.hidden]` binding with `[attr.data-state]="open
   ? 'open' : 'closed'"`. Keep `[attr.hidden]` only when
   `prefers-reduced-motion: reduce` matches (or as the SSR fallback)
   so AT users still get the strict on/off behaviour.
3. Components-package CSS animates `height` from `0` to
   `var(--kj-accordion-content-height)` on `[data-state="open"]` and
   the reverse on `[data-state="closed"]`. `overflow: hidden` on the
   panel during the transition; remove on open-end so focus rings
   from descendants do not clip.
4. **No JS animation API.** No `Animation` / `getAnimations()` / Web
   Animations. CSS only. Honors no-CDK and zoneless rules.
5. While transitioning closed, keep content in the DOM until
   `transitionend` so an Escape-during-collapse does not strand state
   — but mark it `inert` (or `aria-hidden="true"` + `tabindex="-1"`
   on every focusable descendant) so Tab cannot enter a half-closed
   panel. The simplest correct path: bind `[attr.inert]="!expanded()
   ? '' : null"` on `KjAccordionContent`; modern browsers (Chromium
   124+, Firefox 112+, Safari 15.5+) support it natively, and it
   removes the descendant-walk problem.

## Composition model

Four core directives, all standalone, communicating through two
injection tokens:

```
KjAccordion                     (provides KJ_ACCORDION)
  └── KjAccordionItem           (provides KJ_ACCORDION_ITEM, injects KJ_ACCORDION)
        ├── KjAccordionTrigger  (injects KJ_ACCORDION_ITEM)
        └── KjAccordionContent  (injects KJ_ACCORDION_ITEM)
```

`KjAccordionItem` is the only piece that mediates between the two
tokens; trigger and content never see the root directly. That keeps
the trigger and content reusable inside Collapsible (where the root
context is hand-rolled but the item context is identical).

### Reused primitives

| Primitive | Where | Why |
|---|---|---|
| `KjFocusRing` | Composed via `hostDirective` on `KjAccordionTriggerComponent` | Centralises the design-system focus ring instead of redefining `:focus-visible` per component. **Gap today** — wrapper has its own `:focus-visible` rule. |
| `KjDisabled` | Composed via `hostDirective` on `KjAccordionTriggerComponent` | Standardises `aria-disabled`, `tabindex="-1"`, and pointer-events handling. **Gap today** — wrapper sets `[disabled]` on the inner `<button>` and `aria-disabled` ad hoc. |
| `KjRovingTabindex` + `KjRovingTabindexItem` | Conditionally applied when `kjArrowNavigation` is true | Replaces hand-rolled keydown handling. Conditional `hostDirectives` are not supported, so apply via a thin `KjAccordionRovingNav` directive that the wrapper conditionally projects (see Open questions). |
| `KjVariant`, `KjSize` | Composed via `hostDirective` on `KjAccordionComponent` (root) | Standardises variant / size token routing. Variant / size affect chrome only — borders, density, font-size — not behaviour. |

### Wrapper composition (components package)

`<kj-accordion>` applies `KjAccordion` via `hostDirectives` and exposes
`type` (re-mapped from `kjAccordionType`). `<kj-accordion-item>`
applies `KjAccordionItem` via `hostDirectives` and re-maps
`kjItemValue` to `value`. The trigger and content components import
`KjAccordionTrigger` / `KjAccordionContent` into their templates
because both render real DOM (a `<button>` and a wrapping `<div>`
respectively), and `host: { style: 'display: contents;' }` keeps the
component element transparent to layout.

The `<kj-accordion-item>` wrapper exposes a `[label]` shorthand: when
provided, it renders an internal `<kj-accordion-trigger>` so the
common "header text + body" case is one line per item. When omitted,
the consumer projects their own `<kj-accordion-trigger>` for full
control (custom icons, multi-line headers, badges).

### Cross-component pointers

- [`collapsible.md`](./collapsible.md) — single-disclosure variant.
  Same `KjAccordionItem` / `KjAccordionTrigger` / `KjAccordionContent`
  directives composed under a `KjCollapsible` root that synthesises
  one item. Rationale for the separate component: ergonomics
  (`<kj-collapsible>` reads better than `<kj-accordion><kj-accordion-item value="only">`)
  and a tighter API (no `value`, no `type`).
- [`../navigation/tabs.md`](../navigation/tabs.md) — different ARIA
  pattern (`tablist` / `tab` / `tabpanel`) but similar single-vs-many
  state shape. Consider extracting a shared `KjSelectionState<T,
  Mode>` primitive after Tabs ships if the duplication starts to
  bite. Today both implementations are small enough that DRYing is
  premature.
- [`../actions/dropdown-menu.md`](../actions/dropdown-menu.md) — uses
  `aria-expanded` + `aria-controls` exactly the way our trigger
  should. Cross-reference when wiring the missing `aria-controls`
  binding.

## Inputs / Outputs / Models

All public-facing inputs/outputs/models are `kj`-prefixed on the
directive layer; wrapper components re-map them to terse names
(`type`, `value`, `disabled`) via `hostDirectives` `inputs`.

### `KjAccordion` (`[kjAccordion]`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjAccordionType` | `input` | `'single' \| 'multiple'` | `'single'` | Already shipped. |
| `kjOpenValues` | `model` | `string \| string[] \| null` | `null` | **New.** Two-way bound. In `single` mode the public type is `string \| null`; in `multiple` mode `string[]`. Internally we keep the `Set<string>` we have today and adapt at the boundary. |
| `kjCollapsible` | `input` | `boolean` | `true` | **New.** When `false` (and `type === 'single'`), prevents closing the open item by clicking it again — useful for "always-one-open" patterns (Material's default for single mode). |
| `kjArrowNavigation` | `input` | `boolean` | `false` | **New.** Opt-in roving tabindex on triggers. |
| `kjOrientation` | `input` | `'vertical' \| 'horizontal'` | `'vertical'` | **New.** Drives `aria-orientation` on the root and arrow-key axis when roving is enabled. Horizontal accordions are rare but APG-supported. |
| `openIds` | `Signal<ReadonlySet<string>>` | — | — | Already shipped. Public read-only state. |
| `toggle(id)`, `isOpen(id)` | methods | — | — | Already shipped. |

### `KjAccordionItem` (`[kjAccordionItem]`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjItemValue` | `input.required` | `string` | — | Already shipped. |
| `kjItemDisabled` | `input` | `boolean` | `false` | **New.** Disables the item from the root level so trigger and content can both react (trigger sets `aria-disabled`, content stays in current state, root's `toggle()` becomes a no-op for this id). |
| `expanded` | `Signal<boolean>` | — | — | Already shipped. |
| `open()`, `close()`, `toggle()` | methods | — | — | Already shipped. Should also become no-ops when `kjItemDisabled()` is true. |
| `headerId`, `contentId` | `Signal<string>` | — | — | **New.** Stable per-item ids derived from a unique seed (e.g. `inject(IdGenerator)` or `crypto.randomUUID().slice(0, 8)`). Both ids are exposed on the item context so trigger and content can read them without a second injection. |

### `KjAccordionTrigger` (`[kjAccordionTrigger]`)

| Host binding | Source |
|---|---|
| `[attr.aria-expanded]` | `item.expanded()` |
| `[attr.aria-controls]` | `item.contentId()` — **new** |
| `[attr.aria-disabled]` | `item.kjItemDisabled() ? 'true' : null` — **new** |
| `[attr.id]` | `item.headerId()` — **new** |
| `[attr.data-open]` | `item.expanded() ? '' : null` |
| `[attr.data-disabled]` | `item.kjItemDisabled() ? '' : null` — **new** |
| `(click)` | `item.toggle()` (no-op when disabled — **new**) |

No public inputs.

### `KjAccordionContent` (`[kjAccordionContent]`)

| Host binding | Source |
|---|---|
| `[attr.role]` | `'region'` — **new** |
| `[attr.aria-labelledby]` | `item.headerId()` — **new** |
| `[attr.id]` | `item.contentId()` — **new** |
| `[attr.data-state]` | `item.expanded() ? 'open' : 'closed'` — **new** (replaces `[attr.hidden]` for animation; see below) |
| `[attr.inert]` | `!item.expanded() ? '' : null` — **new** |
| `[style.--kj-accordion-content-height.px]` | measured via `ResizeObserver` — **new** |

For the `prefers-reduced-motion: reduce` and SSR fallbacks, also bind
`[attr.hidden]` when reduced motion is preferred — animation becomes
moot and the strict on/off behaviour is correct.

No public inputs.

### Wrapper inputs (components package)

| Element | Input | Maps to |
|---|---|---|
| `<kj-accordion>` | `type` | `kjAccordionType` |
| `<kj-accordion>` | `value` | `kjOpenValues` (two-way: `[(value)]`) |
| `<kj-accordion>` | `collapsible` | `kjCollapsible` |
| `<kj-accordion>` | `arrowNavigation` | `kjArrowNavigation` |
| `<kj-accordion>` | `orientation` | `kjOrientation` |
| `<kj-accordion>` | `variant` | `KjVariant` (host-composed) |
| `<kj-accordion>` | `size` | `KjSize` (host-composed) |
| `<kj-accordion-item>` | `value` | `kjItemValue` |
| `<kj-accordion-item>` | `disabled` | `kjItemDisabled` |
| `<kj-accordion-item>` | `label` | wrapper-only shorthand; renders an internal `<kj-accordion-trigger>` |
| `<kj-accordion-trigger>` | `disabled` | wrapper-only shorthand; sets `<button [disabled]>` and forwards to the item if it is the canonical disabled signal |

## Examples to ship

Already on disk under `packages/components/src/accordion/`:

- `accordion.default.example.ts` — single-mode FAQ with `[label]`
  shorthand.
- `accordion.multiple.example.ts` — `type="multiple"` with two
  `[label]` items.
- `accordion.disabled.example.ts` — projected trigger + a
  `<kj-accordion-trigger [disabled]="true">` second item.
- `accordion.rich-content.example.ts` — projected trigger + content
  with lists and code blocks; demonstrates the no-`label` path.

**To add for v1:**

1. **Two-way bound value** — `<kj-accordion [(value)]="open">` driving
   a signal; demonstrates persistence to `localStorage` via an
   `effect`. Anchors the new `kjOpenValues` model.
2. **Heading-wrapped trigger** — wrapping `<kj-accordion-trigger>` in
   `<h3>` to comply with APG's heading recommendation. Document the
   `display: contents` host so consumers know the heading is
   semantically meaningful but layout-transparent.
3. **Arrow-key nav** — `<kj-accordion arrowNavigation="true">`,
   showing roving tabindex. Best paired with a sidebar-style
   accordion of categories.
4. **Default-open** — seeding `value` with an initial id (or array)
   and verifying SSR / hydration paint the open state without
   flicker.
5. **Always-one-open (non-collapsible single mode)** — `[type]="'single'"
   [collapsible]="false"`. Demonstrates exclusive selection where
   re-clicking the open item is a no-op.
6. **Animated content** — leans entirely on the
   `--kj-accordion-content-height` custom property; a transition
   keyframe in the example's local styles. Validates the animation
   plan end-to-end.
7. **Form-section accordion** — each panel hosts a reactive sub-form;
   demonstrates that focus order, validation messages, and
   `aria-describedby` keep working when an item collapses
   mid-validation. (Use `inert` to verify Tab does not re-enter a
   closed panel.)

## Open questions / risks

1. **`aria-controls` and `aria-labelledby` are not wired.** This is
   the highest-priority a11y gap — without them, screen readers
   announce the trigger as a button and the body as a generic
   region with no relationship between them. Plan: generate a stable
   per-item id pair on `KjAccordionItem`, expose them through the
   item context, and host-bind from trigger and content. Implement
   alongside (2).

2. **`role="region"` is missing on content.** Same fix as (1); the
   item's `headerId` becomes the value of `aria-labelledby` on the
   content's region. Without a region role the `aria-labelledby`
   wiring is half-useful — many AT do not announce labelledby on a
   plain `<div>`.

3. **No two-way value binding.** The open set is internal only,
   so consumers cannot bind to a signal, persist to storage, or
   drive the accordion from a route param. Plan: add
   `kjOpenValues: model<string \| string[] \| null>`, sync into
   `_openIds` via an `effect`. Single mode keeps the type as
   `string \| null`; multiple mode as `string[]`. The discriminant
   is `kjAccordionType()`.

4. **Per-item disabled lives only on the wrapper trigger.** The
   directive layer has no concept of a disabled item, so:

   - Programmatic `item.toggle()` will still flip the state of a
     "disabled" item.
   - Disabled items never get `data-disabled` for selectors.
   - The disabled rule cannot be enforced when consumers project
     their own `<button>` outside the wrapper trigger.

   Plan: add `kjItemDisabled` to `KjAccordionItem`; gate
   `toggle/open/close` on it; expose through context for trigger and
   content host bindings. Then the wrapper's `disabled` input on
   `<kj-accordion-item>` flows down through the directive instead of
   sitting alongside it.

5. **No measured height for animation.** Today the content uses
   `[hidden]`, which makes a smooth open/close transition impossible.
   See the [Animation](#animation) section for the plan
   (`ResizeObserver` → CSS custom property → consumer-owned
   transition). Risk: `ResizeObserver` is widely available but we
   need a SSR-safe guard (`isPlatformBrowser`) before instantiating.

6. **Conditional `hostDirectives` is not supported in Angular.** We
   want to apply `KjRovingTabindex` only when `kjArrowNavigation` is
   true. Options: (a) always apply it but make it a no-op when
   disabled (cheapest); (b) emit a separate `KjAccordionArrowNav`
   directive that the wrapper conditionally adds via `*ngIf` /
   `@if` on a wrapping element. (a) is preferred — the keydown
   handler short-circuits when no items are registered, and a
   no-op `effect` is free.

7. **Default-open seeding via item declarations.** Some libraries
   accept `[defaultExpanded]` per item or `[expanded]` as a one-way
   input on the item; both write into the root's set on init.
   Decision: lean on `kjOpenValues` instead. One source of truth on
   the root is cleaner, and the consumer can always seed the model
   with the desired initial values. Reject per-item
   `defaultExpanded`.

8. **`KjFocusRing` and `KjDisabled` are not composed.** Today the
   wrapper ships its own `:focus-visible` rule and ad-hoc disabled
   styling. Plan: compose both as `hostDirectives` on
   `KjAccordionTriggerComponent`. This becomes a one-line refactor
   once (4) lands and the disabled signal is first-class.

9. **Roving tabindex axis when `kjOrientation === 'horizontal'`.**
   `KjRovingTabindex` today always interprets ArrowLeft/Right and
   ArrowUp/Down equivalently (see
   `packages/core/src/a11y/roving-tabindex.ts`). For an orientation
   contract that respects axis, we need to pass the orientation
   into the primitive — adds an `orientation` input to
   `KjRovingTabindex`. Not blocking for v1; horizontal accordions
   are rare.

10. **`<button>` is not enforced on the trigger.** A consumer can
    apply `[kjAccordionTrigger]` to a `<div>`. The directive will
    still wire `aria-expanded` and `(click)`, but the user loses
    Enter/Space activation, focusability, and disabled semantics.
    APG explicitly mandates a button. Decision: add a
    development-mode `console.warn` when the host element is not a
    `<button>` (mirror what `KjMenuItem` does, if it does — verify).

11. **Item value collisions.** Two `KjAccordionItem`s with the same
    `kjItemValue` would share open state — a footgun. We can either
    (a) `console.warn` in dev mode when a duplicate registers, or
    (b) track items in a `Map<string, KjAccordionItem>` on the root
    and error on collision. (a) is the lower-friction call; (b) is
    over-engineering for v1.

12. **SSR / hydration flicker.** With the planned data-state +
    measured-height approach, the first render has
    `--kj-accordion-content-height: 0` until `ResizeObserver` fires.
    For closed items this is correct; for items that should
    hydrate already-open (driven by initial `value`), we need the
    CSS to use `auto` until JS attaches. Plan: write the property
    only after first measurement; the initial CSS rule for
    `[data-state="open"]` reads `height: auto` and animation kicks
    in only after a value has been recorded once. Test under
    `provideClientHydration()` before locking the design.

13. **`[hidden]` removal is observable.** Today consumers can
    `querySelector('[kjAccordionContent]:not([hidden])')` to find
    open panels. Switching to `data-state` breaks that selector.
    Document the migration in the wrapper changelog, or keep
    `[hidden]` mirrored when reduced motion is preferred (which we
    plan anyway). Low risk — the directive layer is unreleased.

14. **`KjAccordion` does not implement the
    `KjAccordionContext` interface.** It has the right shape but
    does not declare `implements KjAccordionContext`. Same for
    `KjAccordionItem` vs. `KjAccordionItemContext`. Cosmetic, but
    the explicit `implements` clause catches drift between the
    directive and its public contract. Two-line change.

15. **`KjAccordionTrigger` host binding reads `item.expanded()`
    on every change detection.** Fine today, but if we add
    `aria-controls` and `aria-disabled` host bindings, the host
    object grows. Consider precomputing a single `state =
    computed(...)` on the trigger and binding from that, mirroring
    what `KjTab` does. Micro-optimisation — not blocking.
