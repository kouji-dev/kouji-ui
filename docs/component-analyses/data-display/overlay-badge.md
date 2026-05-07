# Overlay Badge

A small badge — a counter, a presence dot, a status pip — pinned to a
corner of another element. The host element is the **anchor** (a bell
icon, an avatar, a tab label, an inbox row); the badge sits over it as
a positioned visual annotation. The badge content itself is a normal
`KjBadge`; the overlay component owns only the wrapping, the corner
placement, the dot-vs-content rendering, and the assistive-tech
relationship between the anchor and the badge.

> Not yet shipped in core or components. This analysis decides the
> directive shape, the relationship to the existing `KjBadge`, and the
> a11y wiring before code lands. The plan is to compose `KjBadge` for
> the visual chrome and add a thin `KjOverlayBadge` family for
> positioning and announcement.

For the **flow-positioned** badge (a chip beside text, a status pill
inside a button) — see [`./badge.md`](./badge.md). The two share visual
tokens (variant, size, dot mode) but not positioning: a flow Badge is
just an inline `<span>`; an Overlay Badge is absolutely positioned
inside a `position: relative` host. For the most common **anchor host**
— a user picture with a presence dot — see
[`./avatar.md`](./avatar.md), which documents the `position: relative`
+ `overflow: hidden` shape that an overlay badge has to coexist with
(presence dots specifically opt out of the avatar's overflow clip; see
the Anchor coexistence section below). For other typical anchors
— icon buttons in app bars, navigation tabs, list items — the same
rules apply: the host must be positioned, and the overlay badge must
not steal pointer events.

## Source comparison

| Concern | PrimeNG `p-overlayBadge` | Angular Material `matBadge` (directive) | shadcn/ui |
|---|---|---|---|
| Primary surface | Component (`<p-overlayBadge value="2">…</p-overlayBadge>`) — wraps the anchor as a child | Directive applied directly to the anchor host (`<button matBadge="4" matBadgePosition="above after">`) | No first-class component. Recipe: `<div className="relative"> + <span className="absolute -top-1 -right-1 …">` |
| Anchor relationship | Wrapper element (`<span class="p-overlay-badge">`) injected around projected content | No wrapper — the directive mutates the host: forces `position: relative`, injects an internal `<span class="mat-badge-content">` inside the host element | Consumer-owned. The host is whatever the consumer renders; the badge is a separate sibling positioned absolutely |
| Position | **Single fixed position (top-right)** in v17+; older versions had `[position]="'top-left' \| 'top-right' \| 'bottom-left' \| 'bottom-right'"` (now removed) | `matBadgePosition="<vertical> <horizontal>"` — `above\|below` × `before\|after` (locale-aware: `before` flips RTL). Default `above after` | Pure CSS — `top-N right-N` etc. Consumer chooses |
| Content | `value` input — string/number; truncates with `value > maxValue` becoming `{maxValue}+` | `matBadge` input — same string/number; `matBadgeOverlap` controls whether the badge overlaps the host or sits beside it | Whatever React node the consumer puts in the absolutely-positioned span |
| Dot vs. value | No first-class dot mode; consumers pass empty string and apply `.p-overlay-badge.p-overlay-badge-dot` modifier | No first-class dot mode; consumers omit `matBadge` content and pass an empty string. Material does **not** ship a presence dot — common community workaround is `matBadgeSize="small"` with empty content | Recipe-only |
| Hidden state | None first-class; consumers `*ngIf` the badge | `matBadgeHidden` boolean — toggles `display: none` on the badge content but keeps the directive wired | Consumer-owned |
| Variant / severity | `severity="info" \| "success" \| "warn" \| "danger" \| "secondary" \| "contrast"` | `matBadgeColor="primary" \| "accent" \| "warn"` | Consumer-owned via Tailwind classes |
| Size | `size="small" \| "large" \| "xlarge"` (no `medium` — that's the default) | `matBadgeSize="small" \| "medium" \| "large"` | Consumer-owned |
| ARIA / SR announcement | The injected badge is just a styled `<span>`; **no `aria-describedby` to the host**, no `aria-label` synthesis. Consumers must wire it manually if they want it announced | `matBadgeDescription` input — produces a `<span>` rendered visually-hidden adjacent to the badge content, **and** wires `aria-describedby` from the host element to that span. Without it, the badge's text is rendered visually but the screen reader hears the host alone. With it, the host announces "Notifications, 4 unread" | Recipe — consumer wires `aria-describedby` (or `aria-label` on the host) by hand |
| Reduced motion | None — the badges do not animate by default | Subtle scale-in on first paint (`@matBadgeAnimation`); respects `prefers-reduced-motion` via Angular Animations | Consumer-owned |
| Z-index | Hard-coded in CSS (`z-index: 1`) | Hard-coded in CSS (`z-index: 1`) on `.mat-badge-content` | Consumer-owned |
| RTL | None — position is always top-right regardless of `[dir]` | Locale-aware via `before`/`after` keywords; `Dir` is read from `BiDi` | Consumer-owned (Tailwind `start-N` / `end-N` from v3.3) |

**Read-off.**

- **PrimeNG** is a component wrapper that injects a `<span>` around
  whatever you project. Simple to write but it adds a wrapper element
  that consumers cannot collapse — bad when the anchor is a flex
  child whose layout depends on being a single element. PrimeNG also
  dropped multi-position support, which is fine for them but a real
  loss for, e.g., an avatar with a presence dot at bottom-right.
- **Angular Material** is a **directive on the anchor**, no wrapper.
  This is the cleanest a11y story (the host element gets the
  `aria-describedby`, the description span lives in the same DOM
  context as the host) and the cleanest layout story (no extra
  wrapper, anchor's flex/grid behaviour is preserved). The cost is
  that the directive forces `position: relative` on the host element
  via a CSS class — surprising, but acceptable when documented.
  `matBadgePosition` and `matBadgeOverlap` are exactly the right
  knobs. `matBadgeDescription` is the only feature in the entire
  comparison that actually meets WCAG 2.1 SC 4.1.2.
- **shadcn / Tailwind** is recipe-only because, as a styled-component
  collection, anchor + absolutely-positioned sibling is one CSS rule.
  We are not a styled-only library — we need an Angular surface for
  the a11y and the position tokens — but the recipe is a useful
  fallback story: a consumer can always wrap an anchor in
  `position: relative` and drop a `<kj-badge>` into the corner with
  three CSS rules. The overlay-badge primitive's job is to make that
  recipe automatic, accessible, and theme-consistent.

## Decision (core directive)

**Single directive on the anchor — `[kjOverlayBadge]` — plus an
internal `KjOverlayBadgeContent` directive for the badge node.** This
is the Material shape, not the PrimeNG shape, because:

1. **No injected wrapper element.** Composing `[kjOverlayBadge]` on
   the bell-icon button or the `<kj-avatar>` keeps the anchor's
   identity intact — flex/grid layout, label-by-id wiring, focus
   ring, click handler. A wrapper-component shape would force
   consumers to either re-target the click handler one level out or
   accept that the wrapper steals focus / pointer events for hover
   states.
2. **The host element is the natural `aria-describedby` source.**
   The badge content (a number, a dot, a status word) describes the
   host; AT must hear the host's name first ("Notifications") and
   then the description ("4 unread"). With a wrapper component, the
   accessible name lives on a parent that the host doesn't know
   about, so the wiring becomes "find the descendant button and add
   the attribute to it" — fragile when the projected child is
   conditionally rendered or wrapped further.
3. **It composes naturally with `[kjAvatar]`.** Avatar's host is
   already `position: relative` (see `avatar.css`); adding
   `[kjOverlayBadge]` to the same element is a one-line change at
   the consumer site.

**File layout (mirrors `accordion/`):**

```
packages/core/src/overlay-badge/
  overlay-badge.ts                 ← KjOverlayBadge (anchor directive)
  overlay-badge-content.ts         ← KjOverlayBadgeContent (the badge node, projects KjBadge)
  overlay-badge.context.ts         ← KjOverlayBadgeContext + KJ_OVERLAY_BADGE token
  overlay-badge.spec.ts
  index.ts
```

```
KjOverlayBadge       (selector: [kjOverlayBadge])
  └── provides KJ_OVERLAY_BADGE { contentId, hidden, dot, position, description, hasContent }
  └── host-binds: position: relative + aria-describedby (when description set)
KjOverlayBadgeContent (selector: [kjOverlayBadgeContent])
  └── injects KJ_OVERLAY_BADGE
  └── host-binds: id, [hidden], data-position, data-dot, position: absolute
```

**Why two directives, not one.** The anchor needs to expose the badge
id to its `aria-describedby`, drive the visually-hidden description
span's text, and own the context for the content directive to read.
The content needs a stable id, the position data attribute, the
dot/value rendering decision, and the visually-hidden description
sibling. Splitting them lets the consumer project the badge content
anywhere in the host's template (typical: as the last child, but for
exotic hosts it can sit elsewhere) without the anchor directive
caring about template order.

**`KjBadge` is reused, not replaced.** The `<span kjOverlayBadgeContent>`
inner node carries `[kjBadge]` via `hostDirectives`, so all variant /
size / dot styling lives in the same place as the inline Badge — one
CSS file, one set of design tokens, one set of variants. Consumers
who project a `<kj-badge>` element directly into the slot get the
same wiring; the directive is the slot, the badge is the content.

**Position is a four-corner enum, not Material's two-axis.** Material's
`above|below × before|after` is locale-aware but expressive overkill
for the badge-on-anchor case. We use `'top-end' | 'top-start' |
'bottom-end' | 'bottom-start'` (default `'top-end'`) — the four logical
corners. The `start`/`end` keywords give us RTL flipping for free
without paying for the full bidi axis split. Internally we map to
`inset-block-start` / `inset-block-end` × `inset-inline-start` /
`inset-inline-end` so RTL is purely a CSS concern and the directive
stays bidi-agnostic.

**Dot mode is a first-class boolean.** PrimeNG and Material both
treat presence dots as a styling afterthought (empty content + a CSS
modifier). We surface it as `kjDot: input<boolean>(false)` because
(a) the rendering rules are different — a dot ignores `kjValue` and
the `maxValue` truncation; a number badge respects them — and (b) the
ARIA description differs — a dot announces a status word
("online", "away") and a number badge announces a count. Conflating
them produces wrong markup for at least one of the two cases.

**Overlap is implicit.** Material exposes `matBadgeOverlap` because
some Material anchors (text fields, FAB buttons) need the badge to
sit *beside* the host rather than on top of it. We do not have those
anchors today; when we add them we can introduce
`kjOverlap: input<boolean>(true)` and translate the badge by 100% of
its own size in the relevant axis. Not v1.

## What exists today

Nothing under `packages/core/src/overlay-badge/` or
`packages/components/src/overlay-badge/`. Adjacent prerequisites:

- `packages/core/src/badge/badge.ts` — `KjBadge` directive with
  `kjBadgeVariant`. Reused as the visual content.
- `packages/components/src/badge/badge.ts` — `KjBadgeComponent`
  (`<kj-badge>`). Consumers can project this into the overlay slot
  for a fully styled badge.
- `packages/core/src/avatar/avatar.ts` — typical anchor; its host is
  already `position: relative` so overlay-badge composes cleanly.
- `packages/core/src/a11y/visually-hidden.ts` — `KjVisuallyHidden`.
  Used to render the description text as a hidden sibling of the
  badge so AT reads it but it never paints.
- `packages/core/src/a11y/aria-describedby.ts` — `KjAriaDescribedBy`.
  We will **not** compose this on the host because it owns its own
  `kjDescribedBy` input which would collide with the consumer's
  description-id wiring (e.g. a form input that already has a hint).
  Instead, the overlay-badge directive **appends** its description id
  to whatever `aria-describedby` the host already carries (see the
  Accessibility section).
- `packages/core/src/presets/variant.ts`,
  `packages/core/src/presets/size.ts` — `KjVariant`, `KjSize`. These
  are composed on the badge content node, not on the anchor.

## Base features

| Feature | Where it lives | Notes |
|---|---|---|
| Anchor wraps without injecting a DOM element | `KjOverlayBadge` (directive on host) | `position: relative` is host-bound. No wrapper element generated. |
| Badge content is reused `KjBadge` | `KjOverlayBadgeContent` host-composes `KjBadge` via `hostDirectives` | Same variants, same data-attribute hooks; one CSS file. |
| Four-corner position | `kjPosition: input<KjOverlayBadgePosition>('top-end')` on `KjOverlayBadge`; reflected as `data-position` on the content node via context | `'top-end' \| 'top-start' \| 'bottom-end' \| 'bottom-start'`. RTL handled via logical properties in CSS. |
| Dot mode | `kjDot: input<boolean>(false)` on `KjOverlayBadge`; reflected as `data-dot` on the content node | When `true`, content ignores `kjValue` and renders an empty fixed-size circle. |
| Numeric value with overflow | `kjValue: input<number \| string \| null>(null)` and `kjMaxValue: input<number \| null>(99)` on `KjOverlayBadge` | A `computed` derives `display = value > max ? \`${max}+\` : String(value)`. `null` value collapses to dot-or-nothing depending on `kjDot`. |
| Hidden | `kjHidden: input<boolean>(false)` | Drives `[hidden]` on the content node; the host's `aria-describedby` link to the description id is also dropped. |
| Variant / size | Composed on the **content** node, not the anchor: `hostDirectives: [{ directive: KjBadge, inputs: ['kjBadgeVariant'] }, KjVariant, KjSize]` on `KjOverlayBadgeContentComponent` | The anchor stays neutral so two anchors with different badge variants on the same page are independent. |
| Description for assistive tech | `kjDescription: input<string>('')` on `KjOverlayBadge` | Renders a `<span kjVisuallyHidden id="…">` adjacent to (or inside) the content node; appends the id to host's `aria-describedby`. Without this, the badge is decorative — see the a11y section. |
| Decorative mode | `kjDecorative: input<boolean>(false)` on `KjOverlayBadge` | Sets `aria-hidden="true"` on the content node and skips the `aria-describedby` wiring. Use for "we already announce the count in the host's accessible name" cases. |
| RTL flipping | CSS-only, via `inset-inline-start` / `inset-inline-end` keyed off `data-position` | No JS bidi reads. |

## Accessibility (WCAG 2.1 AAA)

Reference: WCAG 2.1 SC 1.3.1, 1.4.3, 1.4.11, 2.5.5, 4.1.2. There is
**no WAI-ARIA APG pattern for overlay badges** — they are decorations
in the spec's eyes. The substantive a11y rules come from how the
description gets wired to the host.

| Criterion | Requirement | Where it lives |
|---|---|---|
| 1.3.1 Info & Relationships | The relationship between the badge and its host must be programmatic, not visual | `aria-describedby` from host → description id (visually-hidden span). The badge text alone (e.g. "4") is not enough — without the description, an SR user hears "Notifications" + "4" with no link between them. |
| 1.4.3 Contrast (Minimum) — AA | 4.5:1 for the badge text on its background | Inherited from `KjBadge` token configuration. Default + destructive variants meet this; `outline` variant must be checked under each surface tone. **Verify in the components-package CSS.** |
| 1.4.6 Contrast (Enhanced) — AAA | 7:1 for the badge text | Same source. Smaller font sizes (size `sm` at `0.6875rem`) are below the 18pt threshold, so AAA contrast applies. **Likely fails under low-contrast theme presets** — flag for token review. |
| 1.4.11 Non-text Contrast — AA | 3:1 for the badge boundary against the surrounding host | The badge sits over the anchor; if the anchor is a coloured icon button the badge edge needs a contrasting outline or shadow. Plan: a `box-shadow: 0 0 0 2px var(--kj-color-base-100)` ring around the badge to produce a halo against the host. Variant-aware. |
| 2.5.5 Target Size (AAA) | Interactive targets ≥ 44×44 CSS px | The overlay badge is **not** an independent target. It does not consume pointer events (`pointer-events: none` on the content node) — clicks pass through to the host. If a consumer wants the badge itself clickable (e.g. "click to dismiss"), they project a `<button kjBadge>` and we drop the pointer-events override; in that case the consumer is responsible for the 44×44 hit area. |
| 4.1.2 Name, Role, Value | The badge's information must reach the AT | `kjDescription` + `aria-describedby` is the canonical wiring. **Without it, the badge is decorative** — we set `aria-hidden="true"` on the content so the SR does not read a stray "4". This is the Material pattern's core insight: a badge without a description is invisible to AT, by design, because reading "4" with no context is worse than silence. |
| 4.1.3 Status Messages | A badge whose value updates dynamically (new notifications arrive) should announce the change | **Optional.** When `kjLive: input<'off' \| 'polite' \| 'assertive'>('off')` is set, the description span is also `role="status"` (polite) or `role="alert"` (assertive) and AT will re-announce it on change. Default off — over-announcing notification counts is hostile UX. |

### `aria-describedby` merging

The host element may already have `aria-describedby` pointing at a
hint, an error, a help icon. The overlay badge cannot blindly
overwrite it. The directive reads the host's existing
`aria-describedby` once on init (via the host element reference) and
maintains a derived signal:

```
mergedDescribedBy = computed(() => {
  if (kjHidden() || !kjDescription()) return originalDescribedBy;
  return [originalDescribedBy, contentId()].filter(Boolean).join(' ');
});
```

The host binding `[attr.aria-describedby]` reads `mergedDescribedBy`.
This is the Material approach — Material does the same merge inside
`MatBadge.updateHostAriaDescription`. We do it with signals, not with
`Renderer2.setAttribute`.

**Edge case.** A consumer could change `aria-describedby` after init
via direct DOM mutation, in which case our cached `originalDescribedBy`
is stale. We accept that: signal-based bindings are the public
contract; consumers who bypass them are out-of-contract. Document
this in the directive's TSDoc.

### Decorative vs. described

A common pattern is "an avatar with a status dot" where the dot is
decorative — the user already knows whose avatar it is, the dot's
meaning is conveyed by the surrounding UI ("Friends online"). For
that, `kjDecorative="true"` skips the `aria-describedby` merge and
sets `aria-hidden="true"` on the content node. This is the
explicit-opt-out shape we want, not the implicit "no description =
hidden" Material has. Reasoning: explicit decorative intent reads
better at the call site and produces clearer review feedback than a
silent skip.

### Keyboard contract

The overlay badge has **no keyboard contract of its own**. It is a
visual decoration; it does not receive focus, does not handle keys,
does not steal focus from the host. The host owns its keyboard
interaction. This is the same shape as Tooltip's anchor: the host
is the interactive element, the decoration is along for the ride.

### Touch / pointer

`pointer-events: none` on `[kjOverlayBadgeContent]` so clicks pass
through to the host. Overriding this is a consumer choice (project
a `<button>` into the slot, or apply a specific class). When the
slot is interactive, consumer is responsible for hit-target size.

### `prefers-reduced-motion`

If the components-package CSS adds an entry animation (a small
scale-in on first paint when the value transitions from `null` to a
number), wrap it in `@media (prefers-reduced-motion: no-preference)`.
For the directive layer this is a non-issue — no JS animation API.

## Composition model

Two directives, one context token:

```
KjOverlayBadge                        (provides KJ_OVERLAY_BADGE)
  └── KjOverlayBadgeContent           (injects KJ_OVERLAY_BADGE; composes KjBadge, KjVariant, KjSize)
```

`KjOverlayBadge` is applied to the anchor host. `KjOverlayBadgeContent`
is applied to the badge node — typically a `<span>` projected as the
last child of the host. The wrapper component supplies a default
internal `<span kjOverlayBadgeContent>` so consumers don't have to
project one for the simple case.

### Reused primitives

| Primitive | Where | Why |
|---|---|---|
| `KjBadge` | `hostDirective` on `KjOverlayBadgeContentComponent` | All visual chrome — variant, padding, font, border-radius — comes from the existing badge styles. One source of truth. Forwards `kjBadgeVariant` from the wrapper component. |
| `KjVariant` | `hostDirective` on `KjOverlayBadgeContentComponent` | Routes the variant token via `data-variant`. Same primitive Badge already composes (when Badge migrates to the preset system). |
| `KjSize` | `hostDirective` on `KjOverlayBadgeContentComponent` | Same — sizing tokens. |
| `KjVisuallyHidden` | Applied to the description `<span>` | Renders the SR-only text without painting it. |
| `KjAriaDescribedBy` | **Not composed** | We need to *merge* with existing `aria-describedby` on the host, not own it. Direct host binding instead. |
| `KjLiveRegion` | Conditionally applied to the description span when `kjLive !== 'off'` | Re-announces on value change. |

### Wrapper composition (components package)

`<kj-overlay-badge>` is a component that **does not own a wrapping DOM
element**: it sets `host: { style: 'display: contents;' }` and
projects the consumer's anchor through. The component's template is a
single `<ng-content>` for the anchor plus an absolutely-positioned
default badge slot:

```html
<!-- inside KjOverlayBadgeComponent template -->
<ng-content />
@if (!kjHidden()) {
  <span
    kjOverlayBadgeContent
    class="kj-overlay-badge"
    [kjBadgeVariant]="kjVariant()"
    [attr.data-size]="kjSize()"
  >
    @if (!kjDot()) { {{ displayValue() }} }
  </span>
  @if (kjDescription()) {
    <span kjVisuallyHidden [id]="contentId() + '-desc'">{{ kjDescription() }}</span>
  }
}
```

But: since `display: contents` strips the component element from the
layout box tree, the projected anchor and the absolute-positioned
content end up siblings under whatever ancestor the consumer
provides. That ancestor must be `position: relative` for the absolute
positioning to land. **Two design choices:**

1. **Require the consumer to make their anchor `position: relative`.**
   Reads cleanly because `<kj-overlay-badge>` then composes
   `KjOverlayBadge` on the anchor itself via `hostDirectives` — but
   that is impossible across `<ng-content>` boundaries. Reject.
2. **The wrapper component is itself a positioned element.** Drop
   `display: contents`; the component renders a real `<span
   class="kj-overlay-badge-anchor">` with `position: relative;
   display: inline-flex` that contains the projected anchor and the
   badge. This is the PrimeNG shape, with the wrapper-element cost
   the Decision section flagged.

**Resolution.** Ship **both shapes**. The directive layer
(`[kjOverlayBadge]` on the anchor host) is the no-wrapper, a11y-best,
Material-style API for power users and library composers. The wrapper
component (`<kj-overlay-badge>`) is the wrapper-element shape that's
ergonomic for app code. The wrapper internally still uses the same
two directives, just on its own host (`KjOverlayBadge`) and a child
span (`KjOverlayBadgeContent`); the projected content goes inside the
host element naturally and gets the `position: relative` from the
wrapper's host class. `aria-describedby` in the wrapper case attaches
to the **wrapper host**, not the projected anchor. That is acceptable
for the common cases (the wrapper host's accessible name is inherited
from the projected anchor when the anchor is a button/link with
visible text) and documented as a limitation for the cases where it
isn't (see Open questions).

### Cross-component pointers

- [`./badge.md`](./badge.md) — the in-flow Badge, whose visual chrome
  (variants, sizes, dot) is reused here. Any change to Badge's
  variant set propagates to overlay-badge automatically because we
  compose `KjBadge` rather than reimplement its data attributes.
- [`./avatar.md`](./avatar.md) — the canonical overlay-badge anchor.
  Avatar's host is already `position: relative` and `overflow:
  hidden`. The overflow hides badges that sit at the literal corner,
  so the components-package CSS pulls the badge outward by `25%` of
  its own size (`transform: translate(25%, -25%)` for `top-end`) so
  a corner-anchored dot peeks past the avatar's circular mask. The
  Avatar analysis must call out this contract as a reason its
  `overflow: hidden` is on the **image** layer, not the host — so an
  overlay badge as a sibling of the image is not clipped.
- [`../actions/button.md`](../actions/button.md) — icon buttons in
  app bars are the second-most-common anchor. Button's host already
  composes `KjFocusRing` and reserves `position: relative` for the
  ring; overlay-badge does not conflict.
- [`../navigation/tabs.md`](../navigation/tabs.md) — tab labels with
  unread counts. The `KjTab` host is already `position: relative`
  for the active-state underline; overlay-badge composes cleanly.
  The description should read e.g. "Inbox tab, 4 unread" — set
  `kjDescription="4 unread"` on the tab.
- [`../actions/dropdown-menu.md`](../actions/dropdown-menu.md) — menu
  items with counts. Same shape; the description ensures the count
  is announced when the menuitem receives focus.

## Inputs / Outputs / Models

All public-facing inputs are `kj`-prefixed. The wrapper component
forwards via `hostDirectives` `inputs` arrays.

### `KjOverlayBadge` (`[kjOverlayBadge]`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjValue` | `input` | `number \| string \| null` | `null` | Numeric counts truncate via `kjMaxValue`. Strings render as-is. `null` collapses to a dot (when `kjDot`) or hides the badge. |
| `kjMaxValue` | `input` | `number \| null` | `99` | When `value > max`, displays `${max}+`. `null` disables truncation. Ignored when `kjDot`. |
| `kjDot` | `input` | `boolean` | `false` | Renders a fixed-size dot; ignores `kjValue` and `kjMaxValue`. |
| `kjPosition` | `input` | `'top-end' \| 'top-start' \| 'bottom-end' \| 'bottom-start'` | `'top-end'` | Logical positioning; RTL flips automatically via CSS logical properties on the content node. |
| `kjHidden` | `input` | `boolean` | `false` | Drops the badge from view and unwires `aria-describedby`. Useful for value-driven visibility (`kjHidden="!unread()"`). |
| `kjDescription` | `input` | `string` | `''` | The accessible description appended to the host's `aria-describedby`. Required for non-decorative use. |
| `kjDecorative` | `input` | `boolean` | `false` | When `true`, content is `aria-hidden`, no `aria-describedby` wiring. Mutually exclusive with `kjDescription` (description wins; emit a dev-mode warning if both set). |
| `kjLive` | `input` | `'off' \| 'polite' \| 'assertive'` | `'off'` | Wraps the description in a live region so changes are re-announced. Off by default. |
| `contentId` | `Signal<string>` | — | — | Public read-only — stable id of the badge content node, derived from a unique seed. |
| `displayValue` | `Signal<string>` | — | — | Public read-only — the truncated string actually rendered (e.g. `'99+'`). |

### `KjOverlayBadgeContent` (`[kjOverlayBadgeContent]`)

| Host binding | Source |
|---|---|
| `[attr.id]` | `ctx.contentId()` |
| `[attr.data-position]` | `ctx.position()` |
| `[attr.data-dot]` | `ctx.dot() ? '' : null` |
| `[attr.data-hidden]` | `ctx.hidden() ? '' : null` |
| `[attr.aria-hidden]` | `ctx.decorative() ? 'true' : null` |
| `[hidden]` | `ctx.hidden() \|\| (ctx.value() == null && !ctx.dot())` |

No public inputs of its own — all driven by the parent context. Composes
`KjBadge` (forwarding `kjBadgeVariant`), `KjVariant`, `KjSize` via
`hostDirectives` so the consumer can apply variants directly to the
content node when projecting one manually.

### Wrapper inputs (components package)

| Element | Input | Maps to |
|---|---|---|
| `<kj-overlay-badge>` | `kjValue` | `KjOverlayBadge.kjValue` |
| `<kj-overlay-badge>` | `kjMaxValue` | `KjOverlayBadge.kjMaxValue` |
| `<kj-overlay-badge>` | `kjDot` | `KjOverlayBadge.kjDot` |
| `<kj-overlay-badge>` | `kjPosition` | `KjOverlayBadge.kjPosition` |
| `<kj-overlay-badge>` | `kjHidden` | `KjOverlayBadge.kjHidden` |
| `<kj-overlay-badge>` | `kjDescription` | `KjOverlayBadge.kjDescription` |
| `<kj-overlay-badge>` | `kjDecorative` | `KjOverlayBadge.kjDecorative` |
| `<kj-overlay-badge>` | `kjLive` | `KjOverlayBadge.kjLive` |
| `<kj-overlay-badge>` | `kjVariant` | `KjBadge.kjBadgeVariant` (on the internal content span) |
| `<kj-overlay-badge>` | `kjSize` | `KjSize.kjSize` (on the internal content span) |

The wrapper's host carries `class="kj-overlay-badge-anchor"`, which
applies `position: relative; display: inline-flex` so projected
anchors that are inline (`<button>`, `<a>`, `<kj-avatar>`) keep their
inline rhythm.

## Examples to ship

1. **Notification bell with count** —
   `<button class="icon-button"><kj-icon name="bell" /></button>`
   wrapped in `<kj-overlay-badge kjValue="4" kjVariant="destructive"
   kjDescription="4 unread notifications">`. Anchors the
   `aria-describedby` story.
2. **Avatar with presence dot** — `<kj-avatar>` wrapped in
   `<kj-overlay-badge kjDot="true" kjPosition="bottom-end"
   kjVariant="success" kjDescription="Online">`. Demonstrates dot
   mode + non-default position. Cross-references avatar.md's
   overflow contract.
3. **Tab with unread count** — projected into a tab's label slot;
   `kjValue` driven by a signal; `kjHidden="value() === 0"`.
   Demonstrates value-driven visibility.
4. **Truncated count** — `kjValue="248"` with default `kjMaxValue="99"`
   rendering `99+`. Verifies overflow logic and width clamping in
   the components CSS.
5. **Decorative dot** — same as (2) but `kjDecorative="true"`,
   showing the case where the surrounding context already
   announces presence.
6. **Live updates** — `kjLive="polite"` with a `setInterval` bumping
   `kjValue`. Verifies the live-region wiring.
7. **Directive-only (no wrapper) usage** — power-user form on an
   `<button kjOverlayBadge kjValue="4" kjDescription="4 unread">…<span
   kjOverlayBadgeContent></span></button>`. Documents the no-wrapper
   path for library composers.
8. **RTL** — wrapper around an `<kj-avatar>` inside `<div dir="rtl">`,
   `kjPosition="top-end"` rendering at top-left visually.
   Verifies the logical-property CSS.

## Open questions / risks

1. **Wrapper-component vs. directive-on-anchor for `aria-describedby`.**
   The decision to ship both paths means the wrapper case attaches
   `aria-describedby` to the wrapper element rather than the
   projected anchor. When the anchor is a button with a visible
   label, AT computes its accessible name from the visible text and
   the description carries through. When the anchor is an icon-only
   button with `aria-label`, the description is on the parent and
   AT may not associate them. Plan: when the wrapper detects exactly
   one focusable child (via a `ContentChild(... { read: ElementRef })`
   plus a focusable-element check), forward the description id to
   that child instead of itself. Stretch goal — not v1 blocker; v1
   ships with the wrapper-host wiring and a docs note.

2. **`aria-describedby` merge race.** If a consumer sets the host's
   `aria-describedby` *after* the directive's init (e.g. inside an
   `effect` reacting to form errors), the cached
   `originalDescribedBy` is stale and we will append our id to the
   stale list, dropping the consumer's later additions. Plan: read
   `originalDescribedBy` lazily inside the `mergedDescribedBy`
   computed, via `host.getAttribute('aria-describedby')` — but that
   only re-reads when the computed re-evaluates, which signal-based
   inputs do not trigger from. Accept the limitation; document the
   contract that `aria-describedby` must be set declaratively or via
   the same directive (`KjAriaDescribedBy`) which the consumer
   composes alongside.

3. **Z-index stacking.** The badge sits at z-index 1 within the
   anchor. When the anchor is itself inside a positioned ancestor
   (a sticky toolbar, a dialog), neighbouring elements may overlap
   the badge. Plan: leave z-index at 1; document that the parent
   stacking context governs. Adding a `kjZIndex` input is a
   slippery slope.

4. **Anchor without `position: relative`.** The directive forces
   `position: relative` via host-bound style. If the consumer's
   own CSS sets `position: absolute` on the same element, our
   inline style still wins (specificity tie, last-wins on inline)
   — but if the consumer needs `position: absolute` for layout
   reasons, we cannot accommodate. Plan: detect `position:
   absolute \| fixed \| sticky` on the host in dev mode and emit a
   `console.warn` — the badge will still position correctly (those
   values also create a positioning context) so the warning is
   informational, not an error.

5. **Avatar overflow clipping.** `KjAvatar` has `overflow: hidden`
   on its host so the image's border-radius clips it. An overlay
   badge as a sibling of the image inside that host gets clipped
   too. Resolution as documented in cross-references: avatar.css
   moves `overflow: hidden` from the host to the image element so
   the badge sibling is unclipped. **Action item on the Avatar
   analysis** — flagged here so the avatar.md author owns the
   change.

6. **`KjBadge` does not yet compose `KjVariant` / `KjSize`.** The
   current `KjBadge` directive only sets `data-variant` from a
   local input. To keep variants consistent across in-flow and
   overlay badges, `KjBadge` should compose `KjVariant` (and gain
   a `KJ_BADGE_PRESET` preset). That's a Badge-analysis decision;
   overlay-badge composes whatever Badge ships with. If Badge
   stays preset-less, overlay-badge composes `KjVariant`
   independently and we live with the duplication for v1.

7. **No first-class "click-to-dismiss" API.** A common pattern:
   tap the count badge to open the notifications list. We do not
   surface this; consumers project a `<button kjBadge>` into the
   slot and own the click. The `pointer-events: none` default on
   the content node breaks this — consumers who project a button
   need to override it. Plan: when the projected child is a
   focusable element, the `KjOverlayBadgeContent` directive sets
   `pointer-events: auto` and adds a 4px hit-area extension via
   `padding`. Detection via `inject(ElementRef).nativeElement
   .matches('button, a, [tabindex]:not([tabindex="-1"])')`. Defer
   to v1.1 if the projection-detection feels like over-engineering;
   document the manual override for v1.

8. **Number formatting locale.** `kjValue: 1234` displays as `99+`
   today (truncated by `kjMaxValue`). When `kjMaxValue: null`, we
   render the raw `String(value)`. Locale-aware formatting
   (`new Intl.NumberFormat().format(value)` for `1,234`) is not
   wired. Plan: add `kjValueFormatter: input<(v: number) =>
   string>(...)` defaulting to identity; consumers wire `Intl`
   themselves. Defer to v1.1.

9. **Animation on value change.** A subtle scale-pulse when the
   count changes draws the eye to new notifications. Material
   ships this; we don't have the animation primitive. Plan:
   ship a CSS `@keyframes kj-overlay-badge-pop` in the
   components-package CSS, gated on `prefers-reduced-motion: no-preference`,
   triggered by a `data-pop=""` attribute that the component sets
   for one frame after `displayValue()` changes (via a `linkedSignal`
   + `afterRender` + `setTimeout(..., 0)` to remove the attribute).
   Defer to v1.1; the directive layer is animation-free.

10. **`KjOverlayBadgeContent` composes `KjBadge`, but the
    component-level `<kj-badge>` *also* composes `KjBadge`.**
    When a consumer projects `<kj-badge>` into the slot manually,
    the inner `kjBadge` directive applies twice — once on the
    projected `<kj-badge>` host (via its template's inner `<span
    kjBadge>`) and once on the slot wrapper (via
    `KjOverlayBadgeContent`'s `hostDirectives`). This is fine
    today (both apply identical `data-variant` attributes) but
    becomes a bug if `KjBadge` later gains state (e.g. a focus
    handler). Plan: introduce a slot-level "I am the content
    node" data attribute and have `KjOverlayBadgeContent` skip
    its `KjBadge` host directive when the projected child carries
    that attribute. Or — simpler — document that consumers should
    project a plain `<span kjBadge>` rather than the wrapper
    `<kj-badge>` when using the directive-only path. Decision: go
    with the documentation route for v1.

11. **SSR / hydration.** The directive sets `position: relative`
    via host-bound style; the content has `position: absolute`.
    Both are static so SSR paints correctly. `aria-describedby`
    merging happens during change detection so the first
    server-rendered HTML carries the merged value. No flicker
    expected. Test under `provideClientHydration()` before
    locking.

12. **Multiple overlay badges on one anchor.** A power use case —
    e.g. a user picture with a presence dot at bottom-end *and* an
    unread-message count at top-end. The directive holds a single
    context; two `[kjOverlayBadge]` on the same host would
    collide. Plan: reject. Consumers who need multiple badges
    project two `<span kjOverlayBadgeContent>` slots manually under
    a single `[kjOverlayBadge]` and use `kjPosition` only as a
    default; per-slot `[attr.data-position]` overrides on the
    projected spans (we expose a `kjOverlayBadgeContentPosition`
    input on the content directive for this case). Or, more
    simply: nest `<kj-overlay-badge>` wrappers — the outer is the
    presence dot, the inner is the count, both share the same
    anchor through projection. Verify nesting works without
    z-index battles before locking.
