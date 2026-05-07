# Badge

A small label or count indicator, used for counts ("3 unread"), status
("Beta", "New"), or category tags ("v2.1", "TypeScript"). Visually
compact, semantically passive: a Badge is **read**, not **operated**.
It has no click handler of its own, no removable affordance, and no
focus stop. It is the simplest data-display primitive in the library —
roughly a `<span>` with a token-driven background, foreground, radius,
and density.

> Already shipped in core at `packages/core/src/badge/badge.ts`
> (`KjBadge` directive — single, standalone, attribute-only) and
> wrapped in flight at `packages/components/src/badge/badge.ts`
> (`KjBadgeComponent` — emits a styled `<span kjBadge>` with
> `<ng-content />`). This analysis documents the existing shape,
> contrasts it with peer libraries, and lists the concrete gaps to
> close before declaring v1.

Badge is **standalone** — it stands on its own in flow, attached to no
particular host. The roadmap lists a separate
[Overlay Badge](./overlay-badge.md) for the
notification-dot-on-bell-icon case, where the badge is positioned
absolutely against a parent (anchor + offset + collision logic). Keep
the two components disjoint: Badge is the visual primitive, Overlay
Badge is the positioning wrapper that *contains* a Badge. For the
**interactive** sibling — chip-like elements with a click target and an
optional remove button — see [`tag.md`](./tag.md). Tag is a button (or
button + button), ships keyboard handling, fires `(remove)`, and
participates in the tab order. Badge does none of that; if you need
those affordances, you are reaching for the wrong primitive.

## Source comparison

| Concern | PrimeNG `p-badge` / `pBadge` directive | Angular Material `matBadge` directive | shadcn/ui `Badge` (Radix-flavoured Tailwind) |
|---|---|---|---|
| Primary surface | Two APIs: `<p-badge>` standalone component **and** `pBadge` directive that overlays an existing element | Directive only — `matBadge` attaches to any element and **renders an overlay** via DOM-injected child node | Single component (`<Badge>`) — pure styled `<div>`, no overlay, no positioning |
| Overlay vs. inline | Both: `<p-badge>` is inline; `pBadge` directive overlays | Always overlay (positioned over the host) | Always inline |
| Variants | `severity`: `'success' \| 'info' \| 'warn' \| 'danger' \| 'secondary' \| 'contrast'` (theme-token driven) | None at the directive level — color via `matBadgeColor`: `'primary' \| 'accent' \| 'warn'` | `variant`: `'default' \| 'secondary' \| 'destructive' \| 'outline'` |
| Size | `size`: `'small' \| 'large' \| 'xlarge'` | `matBadgeSize`: `'small' \| 'medium' \| 'large'` | None — single size, consumer overrides via Tailwind |
| Content modes | Text/number via `value`, dot via `[badgeDisabled]` flip + empty value, count cap via `severity` only | Text/number via `matBadge` value, dot via `matBadgeDescription` + empty content (workaround), no built-in cap | Free children — text only; consumer manages truncation/cap |
| Numeric overflow | Manual — consumer renders "99+" themselves | Manual | Manual |
| ARIA | `<p-badge>` is presentational by default; `pBadge` directive sets nothing on the host | `matBadge` adds `aria-describedby` pointing at a visually-hidden description; supports `matBadgeDescription` for the SR-only text | None — consumer applies `aria-label` etc. on the badge or wrapping element |
| Live updates | None | None — but the description is a polite live region candidate (consumer-driven) | None |
| Disabled state | `[badgeDisabled]` hides the badge entirely | `matBadgeHidden` toggles visibility without unmounting | n/a |
| Visual chrome | Heavy — full PrimeNG token theming, severity colors baked in | Heavy — Material Design pill, three palettes, three sizes, six positions, overlap modes | Tailwind classes only (rounded-full pill, color-by-variant) |

**Read-off.**

- **PrimeNG** double-dips: a freestanding `<p-badge>` *and* a
  positioning directive that injects an overlay child. Conflating the
  two cases under one name is exactly the trap we want to avoid by
  splitting Badge / Overlay Badge.
- **Angular Material** bakes positioning into the badge itself —
  `matBadge` always overlays. That makes the inline label case
  awkward (consumers reach for `<mat-chip>` instead). It also forces
  every badge through the overlay machinery, which is overkill for
  the freestanding case.
- **shadcn/ui** is the right shape for kouji's "Badge" specifically:
  pure visual primitive, no positioning, variant-driven, single size,
  consumer-supplied content. We already match this shape today.

The split kouji is converging on:

| Component | Selector | Surface | Job |
|---|---|---|---|
| **Badge** | `[kjBadge]` / `<kj-badge>` | inline `<span>` in flow | label / status / count chip in document flow |
| **Overlay Badge** | `[kjOverlayBadge]` / `<kj-overlay-badge>` | wrapper around an anchor element | positions a Badge absolutely over an avatar / button / icon |
| **Tag** | `[kjTag]` / `<kj-tag>` | interactive — `<button>` or `<div role="button">` + optional remove `<button>` | clickable / removable chip (filter pills, tag-input output) |

This file covers Badge only. Cross-references at the bottom.

## Decision (core directive)

**Yes — keep `KjBadge` as a one-directive primitive, but expand its
contract slightly.** Today it does exactly one thing: reflect a
`kjBadgeVariant` input to `data-variant`. That is fine for the
variant-only case but two more concerns belong on the directive layer:

1. **Content mode** — text vs. dot. A "dot" badge is a 6×6
   presence indicator with no text; it should signal that mode to CSS
   so the components-package stylesheet can collapse padding to zero
   and clamp to a fixed circular shape. This is `data-mode` /
   `data-shape`, not consumer-applied classes.
2. **Numeric overflow ("99+")** — consumer renders "99+" today, but
   the cap-and-format logic is repetitive. A small input
   (`kjBadgeMax`) plus a transformation hook (or a sibling
   `KjBadgeCount` micro-directive) keeps consumers from reinventing
   the cap in template literals.
3. **`role`** — Badge is *usually* decorative. But when it conveys a
   live-changing count ("3 unread → 4 unread"), the surrounding
   context wants `aria-live` semantics so a screen reader hears the
   change. The directive should expose an opt-in `kjBadgeLive` input
   that flips the host's `role` to `"status"` and `aria-live` to
   `"polite"`. **Default off** — most badges are decorative and
   adding `role="status"` everywhere would flood AT users with
   irrelevant announcements.

Everything else — variant tokens, size tokens, focus, disabled —
either lives in shared primitives (`KjVariant`, `KjSize`) or doesn't
apply (Badge has no focus, no disabled state, no keyboard contract).

The directive stays attribute-only (`[kjBadge]`). It does **not**
become a structural / template-projecting thing. Content is
`<ng-content>` projection in the wrapper component; the directive
itself only annotates the host element.

```
KjBadge      (selector: [kjBadge])
  composes:  KjVariant, KjSize  (via hostDirectives, for the wrapper layer)
  binds:     [attr.data-variant], [attr.data-size], [attr.data-mode],
             [attr.role], [attr.aria-live]
```

Note: `KjVariant` and `KjSize` are **internal preset directives** (see
`packages/core/src/presets/variant.ts` and
`presets/size.ts`). Today `KjBadge` re-implements `data-variant`
manually with a hard-coded union (`'default' | 'secondary' |
'destructive' | 'outline'`). Migrate to `KjVariant` + a
`KJ_VARIANT_PRESET` provider so the variant set is preset-driven and
the dev-mode unknown-variant warning comes for free. Same for size —
today the wrapper sets `data-size` ad hoc; the directive should own
it via composed `KjSize`.

## What exists today

`packages/core/src/badge/`:

- `badge.ts` — `KjBadge` directive. Single input
  `kjBadgeVariant: input<'default' | 'secondary' | 'destructive' | 'outline'>('default')`,
  reflects to `[attr.data-variant]`. No size, no role, no live
  region, no count-cap. ~14 lines including types.
- `badge.spec.ts` — three cases: `data-variant` is reflected, default
  variant is `'default'`, axe audit passes on a default badge.
- `index.ts` — re-exports `KjBadge`. **No re-export of
  `KjBadgeVariant`** — gap, the wrapper has to import the type from
  `'@kouji-ui/core'` and that path resolves only because the
  top-level barrel re-exports it.

`packages/components/src/badge/`:

- `badge.ts` — `KjBadgeComponent` (selector `kj-badge`). Standalone,
  `imports: [KjBadge]`, template is a single `<span kjBadge
  class="kj-badge" [kjBadgeVariant]="variant()" [attr.data-size]="size()"><ng-content /></span>`.
  Inputs: `variant: KjBadgeVariant ('default')`, `size: 'sm' | 'md' |
  'lg' ('md')`. `host: { style: 'display: contents;' }`,
  `ViewEncapsulation.None`, `OnPush`.
- `badge.css` — `@layer kj.component`, sets background / foreground
  via `--kj-color-primary` / `--kj-color-primary-content`, radius via
  `--kj-radius-selector`, padding via `--kj-space-sm` + 0.125rem,
  font-size 0.75rem. Variant overrides for `secondary`,
  `destructive`, `outline`. Size overrides for `sm` and `lg`.
- `badge.default.example.ts`, `badge.variants.example.ts`,
  `badge.sizes.example.ts`, `badge.with-icon.example.ts` — preview
  groups for the docs site.
- `index.ts` — re-exports `badge`.

The wrapper applies `[kjBadgeVariant]` via the imported directive in
the template **rather than via `hostDirectives`** because it renders
its own `<span>` (not the host element). The component host carries
`display: contents;` so it is layout-transparent.

## Base features

| Feature | Where it lives | Notes |
|---|---|---|
| Variant | `KjBadge.kjBadgeVariant` input today; should migrate to composed `KjVariant` | Currently a hard-coded union (`default \| secondary \| destructive \| outline`). Migrate to preset-driven via `KJ_VARIANT_PRESET` so the values are configurable per app theme. |
| Size | **Wrapper only** today — `KjBadgeComponent.size: 'sm' \| 'md' \| 'lg'`, sets `data-size` on the inner `<span>`. | Lift to core via composed `KjSize` so the directive owns the attribute. Wrapper keeps `size` input as a re-mapped alias. |
| Content mode (text vs. dot) | **Missing** | New `kjBadgeMode: input<'text' \| 'dot'>('text')`. Reflects to `data-mode`. CSS for `[data-mode="dot"]` collapses padding, hides text content, sets a 6×6 fixed circle (or larger per size). |
| Numeric content + cap | **Missing** | New `kjBadgeCount: input<number \| null>(null)` and `kjBadgeMax: input<number>(99)`. When `count != null`, the directive sets `[textContent]` to `count > max ? '${max}+' : String(count)` and `[attr.aria-label]="..."` if `kjBadgeLive` is true. **Question**: do we set textContent at all from the directive (which then conflicts with `<ng-content />`), or do we project a `KjBadgeCount` sibling directive that owns the text node? See Open questions. |
| Live region semantics | **Missing** | New `kjBadgeLive: input<boolean \| 'polite' \| 'assertive'>(false)`. When truthy, sets `role="status"` and `aria-live="polite"` (or `"assertive"`). Default off — most badges are decorative. |
| Decorative announcement opt-out | Implicit (no role today) | When `kjBadgeLive` is `false` and the badge is purely visual chrome, the consumer should set `aria-hidden="true"` on the badge or wrap it in a parent that labels it. Documented in examples; not enforced. |
| Icon-only / icon + text | Wrapper template is `<ng-content />`; consumer projects an `<svg aria-hidden="true">` plus text | Already works. The "with icon" example demonstrates the pattern: icon is `aria-hidden`, text label remains in the SR pass. |
| Outlined variant | Variant `'outline'` today | Already shipped. Border color via `--kj-color-neutral`. |
| Pill vs. square | Single shape (`--kj-radius-selector`) | No input — radius is theme-driven. Keep it that way; if a future design language needs both, expose as a `data-shape` driven by a new variant. |
| Truncation | None | Badges are short-by-construction. If truncation is needed, the consumer wraps the badge in a `text-overflow: ellipsis` container. Documented, not built. |

## Accessibility (WCAG 2.1 AAA)

Reference: WAI-ARIA APG does not have a dedicated "Badge" pattern.
The closest applicable patterns are
[Status messages](https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA22)
(for live counts) and the general guidance on decorative content
(`aria-hidden`).

| Criterion | Requirement | Where it lives |
|---|---|---|
| 1.1.1 Non-text Content | If the badge conveys information, that information must be available to AT users (text content or `aria-label`); if decorative, `aria-hidden="true"` | Consumer responsibility for now; we expose `kjBadgeLive` to opt into `role="status"` and document the `aria-hidden` pattern. |
| 1.3.1 Info & Relationships | The relationship between badge and the thing it labels must be programmatically determinable. For inline-in-flow Badge this is implicit (DOM order). For Overlay Badge, `aria-describedby` from the anchor to a visually-hidden description is required — **not Badge's problem** (covered by Overlay Badge). | n/a for inline Badge. |
| 1.4.3 / 1.4.6 Contrast (Minimum / Enhanced) | Default-variant text on background must meet 4.5:1 (AA) and target 7:1 (AAA) for normal text, 4.5:1 for large. Token responsibility. | `--kj-color-*-content` tokens are defined to satisfy AAA against their `--kj-color-*` background. **Verify** the destructive and secondary pairs against the actual theme presets — current `badge.css` uses `--kj-color-destructive-content` which is supposed to be paired-by-construction. **Open question 1.** |
| 1.4.11 Non-text Contrast (AA, used as minimum) | The badge's outline variant has a border against the surrounding surface; that border must meet 3:1 against the page background | Border is `--kj-color-neutral` today. **Verify against light + dark token palettes.** |
| 2.1.1 Keyboard | Badge is not interactive; nothing to test | Inherent — no focus, no key handlers, no `tabindex`. |
| 2.4.7 Focus Visible | n/a | Badge does not receive focus. |
| 2.5.5 Target Size (AAA) | n/a | Badge is not a target. If wrapped by an interactive element (link, button), the *parent* owns the 44×44 contract — see Tag. |
| 4.1.2 Name, Role, Value | If the badge has a `role`, it must have an accessible name | When `kjBadgeLive` is true, host gets `role="status"` and the host's text content (or `aria-label`) becomes the accessible name. When `kjBadgeLive` is false (default), the host has no role and no name — it is presentation. **The directive must not unconditionally set `role` or `aria-label`** — that would pollute the AT tree for purely decorative badges. |
| 4.1.3 Status Messages (AA) | When the badge represents a value that updates (unread count, build status), updates should be announced without focus moving | This is exactly what `kjBadgeLive` exists for. When set to `'polite'` (or `true`, which maps to polite), the host becomes a status live region; subsequent text content changes announce. **Caveat**: a single `role="status"` element receiving a count change announces the *whole* new content, so phrasing matters. Wrapper examples should show "5 unread messages" rather than just "5". |

### Keyboard contract

None. Badge is non-interactive, has no focus stop, registers no key
handlers.

If a consumer wraps a badge in a clickable element (e.g., a notification
bell button with an overlay badge), the *bell* owns the keyboard
contract. The badge contributes nothing.

### Touch target

Not applicable. Badges are visual chrome; they are not tap targets.
Where a Badge is overlaid on an interactive element (Overlay Badge over
a Button), the **anchor** owns the 44×44 minimum target. Documented in
[`overlay-badge.md`](./overlay-badge.md).

### `aria-hidden` discipline for decorative badges

When the badge is purely chrome (e.g., a "New" pill next to a feature
title in marketing copy that is already announced), the wrapper
component should accept an `[ariaHidden]` shorthand that puts
`aria-hidden="true"` on the rendered `<span>`. Cheaper than threading
the consumer-supplied attribute through each call site.

```html
<!-- decorative -->
<kj-badge variant="default" ariaHidden="true">New</kj-badge>

<!-- live count -->
<kj-badge variant="destructive" live="polite" [count]="unread()" ariaLabel="{{ unread() }} unread messages"></kj-badge>
```

(See **Inputs / Outputs / Models** below for the exact wrapper
mapping.)

## Composition model

One core directive, no context tokens, two composed primitives:

```
KjBadge                            (selector: [kjBadge])
  ├── hostDirective: KjVariant     (data-variant routing)
  └── hostDirective: KjSize        (data-size routing)
```

Optional sibling micro-directive (proposed, see Open questions):

```
KjBadgeCount                       (selector: [kjBadgeCount], standalone)
  └── owns the [textContent] for the cap-and-format display
```

`KjBadgeCount` exists only if we conclude the count-formatting belongs
on a separate node; the alternative is to keep it as inputs on
`KjBadge` itself and forfeit `<ng-content />` when count mode is
active. Decision in **Open questions**.

### Reused primitives

| Primitive | Where | Why |
|---|---|---|
| `KjVariant` | Composed via `hostDirectives` on `KjBadge` (with a `KJ_VARIANT_PRESET` provider declared by the wrapper component) | Replaces today's hand-rolled `kjBadgeVariant: input<KjBadgeVariant>` + `[attr.data-variant]`. Gains preset-driven values and dev-mode unknown-variant warnings. |
| `KjSize` | Composed via `hostDirectives` on `KjBadge` (with a `KJ_SIZE_PRESET` provider on the wrapper) | Lifts the size attribute from wrapper-only to directive-level. Consumers that use `[kjBadge]` directly on their own `<span>` get sizing without re-implementing the data attribute. |
| `KjLiveRegion` | **Not used.** | `KjLiveRegion` is the right idea but a heavier API — it owns an `announce()` method and clears/re-sets text on a timer. For Badge we just need `role="status"` + `aria-live="polite"` reflected from a single input; the announcement is whatever the consumer puts inside. Reaching for `KjLiveRegion` would force a content-management API the consumer doesn't want. |
| `KjFocusRing`, `KjDisabled`, `KjFocusTrap`, `KjRovingTabindex` | **Not used** | Badge has no focus, no disabled state, no keyboard contract. Reaching for any of these is a category error. |

### Wrapper composition (components package)

`<kj-badge>` renders a `<span>` and applies `[kjBadge]` on it via the
template (not `hostDirectives` on the component) because the component
host carries `display: contents;`. After the migration, the wrapper
will:

1. Provide `KJ_VARIANT_PRESET` via `bindPresets`-style configuration:
   `{ values: ['default', 'secondary', 'destructive', 'outline', 'success', 'warning', 'info'], default: 'default' }`.
   This is where the **expanded** variant set lives — the directive
   itself takes whatever the preset declares.
2. Provide `KJ_SIZE_PRESET` similarly: `{ values: ['sm', 'md', 'lg'], default: 'md' }`.
3. Re-map `variant` (consumer-facing) to `kjVariant` (directive),
   `size` to `kjSize`, `mode` to `kjBadgeMode`, `count` to
   `kjBadgeCount`, `max` to `kjBadgeMax`, `live` to `kjBadgeLive`,
   `ariaHidden` to a host attribute on the rendered `<span>`,
   `ariaLabel` similarly.

**On variant set expansion.** Today the directive's literal type is
`'default' | 'secondary' | 'destructive' | 'outline'`. The roadmap
asks for status semantics — `success`, `warning`, `error`, `info`. We
add these via the preset rather than the directive's literal type:

- `success`  → `--kj-color-success` / `--kj-color-success-content`
- `warning`  → `--kj-color-warning` / `--kj-color-warning-content`
- `error`    → alias for `destructive` **or** introduce as a
  semantic-name twin (preferred — both names route to the same
  tokens; consumers pick what reads best in their template). See
  Open question 4.
- `info`     → `--kj-color-info` / `--kj-color-info-content`

The directive's `kjBadgeVariant` literal type widens to `string` once
it composes `KjVariant` (which already takes `string`). The wrapper's
typed `variant` input keeps the narrower union for IDE
autocomplete — Angular's signal-input typing flows through
`hostDirectives` `inputs` aliasing.

### Cross-component pointers

- [`overlay-badge.md`](./overlay-badge.md) — the positioning sibling.
  Overlay Badge is a wrapper directive (`[kjOverlayBadge]`) that
  takes an anchor element as a child plus a `[kjOverlayBadgeContent]`
  template / projected `<kj-badge>`. It uses
  `KjOverlayService` for connected positioning (see
  `packages/core/src/primitives/overlay/`) with a default offset of
  top-right. The Badge it renders is *literally a `<kj-badge>`* — not
  a duplicate component — so any styling change propagates.
- [`tag.md`](./tag.md) — the interactive sibling. Tag composes
  `KjButton` (or `KjFocusRing` + native `<button>`), exposes
  `(remove)`, owns Backspace/Delete keyboard handling, and
  participates in the tab order. The visual styling can share tokens
  with Badge (same radius, similar density) but the API surfaces are
  disjoint.
- [`avatar.md`](./avatar.md) — Badge is frequently overlaid on an
  Avatar (online-status dot, message count). The composition is
  Avatar → Overlay Badge → Badge; Avatar exposes no badge-specific
  affordance, and Overlay Badge handles the positioning.
- [`../actions/button.md`](../actions/button.md) — same as Avatar but
  for buttons (notification bell with unread count). Button does not
  know about badges; the call site wraps Button in Overlay Badge.
- `KjVariant` / `KjSize` — `packages/core/src/presets/variant.ts` and
  `presets/size.ts`. Same composition pattern is used by Button,
  Alert, Card, Tag, and any future variant-driven component.

## Inputs / Outputs / Models

All public-facing inputs/outputs/models are `kj`-prefixed on the
directive layer; the wrapper component re-maps them to terse names
(`variant`, `size`, `mode`, `count`, `max`, `live`) via input
aliasing.

### `KjBadge` (`[kjBadge]`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjVariant` | `input` | `string` (preset-driven) | `'default'` (preset default) | **Migrated.** Provided by composed `KjVariant`; the directive only re-aliases. Today's hand-rolled `kjBadgeVariant` is removed in favour of this. **Breaking change** within the (unreleased) directive surface. |
| `kjSize` | `input` | `string` (preset-driven) | `'md'` (preset default) | **New on directive.** Provided by composed `KjSize`. Lifts the size attribute from wrapper-only to directive-level. |
| `kjBadgeMode` | `input` | `'text' \| 'dot'` | `'text'` | **New.** Reflects to `[attr.data-mode]`. CSS for `[data-mode="dot"]` collapses padding, removes text content slot, fixes shape to a circle. When `'dot'`, the directive sets `[attr.aria-hidden]="true"` *unless* `kjBadgeLive` is truthy *or* `[attr.aria-label]` is consumer-provided. (A pure dot with no accessible name is by definition decorative.) |
| `kjBadgeCount` | `input` | `number \| null` | `null` | **New.** When non-null, the directive owns the host's text content via `[textContent]="format(count(), max())"`, where `format(c, m) = c > m ? '${m}+' : String(c)`. **Conflicts with `<ng-content />`** — see Open question 2. |
| `kjBadgeMax` | `input` | `number` | `99` | **New.** Cap for the count-formatter. Has no effect when `kjBadgeCount` is null. |
| `kjBadgeLive` | `input` | `boolean \| 'polite' \| 'assertive'` | `false` | **New.** When truthy, host gets `[attr.role]="'status'"` and `[attr.aria-live]="kjBadgeLive() === 'assertive' ? 'assertive' : 'polite'"`. Default `false` keeps the badge presentational. |
| (host) `[attr.data-variant]` | host binding | — | — | From `KjVariant`. |
| (host) `[attr.data-size]` | host binding | — | — | From `KjSize`. |
| (host) `[attr.data-mode]` | host binding | — | — | From `kjBadgeMode()`. |
| (host) `[attr.role]` | host binding | — | — | `kjBadgeLive() ? 'status' : null` |
| (host) `[attr.aria-live]` | host binding | — | — | derived from `kjBadgeLive()` |
| (host) `[attr.aria-hidden]` | host binding | — | — | `kjBadgeMode() === 'dot' && !kjBadgeLive() && !hostHasAriaLabel ? 'true' : null` (note: detecting consumer-applied `aria-label` requires reading the host element's attribute imperatively in `afterRenderEffect`; alternative: expose a `kjBadgeDecorative: input<boolean>(true)` for explicit consumer control — see Open questions). |

No outputs. No models. Badge is a one-way display.

### Wrapper inputs (components package)

| Element | Input | Maps to |
|---|---|---|
| `<kj-badge>` | `variant` | `kjVariant` (host-composed via `KjVariant`) |
| `<kj-badge>` | `size` | `kjSize` (host-composed via `KjSize`) |
| `<kj-badge>` | `mode` | `kjBadgeMode` |
| `<kj-badge>` | `count` | `kjBadgeCount` |
| `<kj-badge>` | `max` | `kjBadgeMax` |
| `<kj-badge>` | `live` | `kjBadgeLive` |
| `<kj-badge>` | `ariaLabel` | `[attr.aria-label]` on the rendered `<span>` |
| `<kj-badge>` | `ariaHidden` | `[attr.aria-hidden]` on the rendered `<span>` |
| `<kj-badge>` | (preset providers) | `KJ_VARIANT_PRESET`, `KJ_SIZE_PRESET` provided in the component's `providers` array |

The wrapper continues to render `<span kjBadge ...><ng-content /></span>`
with `host: { style: 'display: contents;' }` and
`ViewEncapsulation.None`. `OnPush` stays.

## Examples to ship

Already on disk under `packages/components/src/badge/`:

- `badge.default.example.ts` — `<kj-badge>New</kj-badge>`. Default
  variant, default size, text mode.
- `badge.variants.example.ts` — `default`, `secondary`,
  `destructive`, `outline`. Update to also show the new
  `success`/`warning`/`info` variants once the preset is wired.
- `badge.sizes.example.ts` — `sm`, `md`, `lg` side-by-side.
- `badge.with-icon.example.ts` — a destructive badge with an
  `aria-hidden="true"` dot character + "Live" text. Demonstrates
  icon-as-decoration + visible-text pattern.

**To add for v1:**

1. **Dot mode** — `<kj-badge mode="dot" variant="success">` next to
   user-name text ("Jane Doe • online"). Anchors `kjBadgeMode`.
2. **Numeric count with cap** — `<kj-badge variant="destructive"
   [count]="unreadCount()" [max]="99" live="polite" ariaLabel="{{
   unreadCount() }} unread notifications">`. Anchors `kjBadgeCount`,
   `kjBadgeMax`, `kjBadgeLive`. Show the announce-on-change behaviour
   in the docs site by stepping the signal up and back.
3. **Status semantics** — three badges side-by-side: `success`
   ("Passing"), `warning` ("Degraded"), `error` ("Failing"). Anchors
   the expanded preset. Each carries `aria-label` so SR users get the
   semantic, not just the chrome.
4. **Decorative pill in flow** — `<kj-badge variant="secondary"
   ariaHidden="true">Beta</kj-badge>` next to a heading whose text
   already includes "(Beta)". Demonstrates the explicit
   `aria-hidden` opt-out for decoration-only chrome.
5. **Outline variant on coloured surface** — outline badge on a
   `--kj-color-base-200` background; verifies the
   non-text-contrast rule for the border.
6. **Composed on Avatar (cross-component preview)** — points at the
   Overlay Badge example file once that component lands. The Badge
   examples folder itself does not own this; it lives under
   `overlay-badge.*.example.ts`.

## Open questions / risks

1. **Token-pair contrast verification.** The wrapper's variant CSS
   pairs `--kj-color-X` with `--kj-color-X-content`. AAA requires
   ≥7:1 for normal-weight text. The badge's font-size at `sm` is
   0.6875rem (11px), which is **not** "large text" per WCAG (large
   = 18pt / 14pt-bold). So normal-text AAA (7:1) applies. Audit the
   eight pairs (default/secondary/destructive/outline ×
   light/dark) before declaring v1. Outline variant's text color is
   `--kj-color-base-content` against the page; verify against
   `base-100`, `base-200`, and `base-300`.

2. **`kjBadgeCount` vs. `<ng-content />`.** When `kjBadgeCount` is
   non-null, the directive wants to own `textContent`. But the
   wrapper template is `<span kjBadge><ng-content /></span>` — there
   is already projected content. Three options:

   - **(a) Directive wins.** When `kjBadgeCount != null`, the
     directive overwrites the host's text content via
     `[textContent]`. Projected content is lost. Surprising; we
     would warn in dev mode if both are present.
   - **(b) Sibling directive `KjBadgeCount`.** A separate directive
     applied to a child `<span>` that owns its own `textContent`.
     `<kj-badge variant="destructive"><span [kjBadgeCount]="unread()" [kjBadgeMax]="99"></span></kj-badge>`.
     Cleaner separation, more boilerplate.
   - **(c) Wrapper-only formatter.** Drop `kjBadgeCount` /
     `kjBadgeMax` from the directive entirely; expose `count` /
     `max` on `<kj-badge>` only, and the wrapper template
     conditionally renders the formatted string instead of
     `<ng-content />`.

   **Lean (c)** — the count cap is presentation, the directive does
   not benefit from owning it, and the conflict with `<ng-content />`
   evaporates because the wrapper's own template makes the choice.
   Consumers using `[kjBadge]` directly on their own element handle
   their own text. Decide before the v1 milestone.

3. **`kjBadgeLive` default and AT noise.** Setting `role="status"`
   on every badge would create constant SR announcements as DOM
   updates anywhere in the live region propagate. Default of
   `false` (presentational) is correct, but worth flagging in the
   docs prominently — consumers who default-on the live behaviour
   "to be safe" will degrade their app's a11y, not improve it.

4. **`error` vs. `destructive` naming.** shadcn/ui uses
   `destructive` (action-colored — "this will delete things").
   PrimeNG and Material call status-red `danger` / `warn`. Roadmap
   prompt asks for `error`. Decision: **keep `destructive` as the
   action-tinted variant** (matches Button's `destructive` for
   delete/cancel-all flows) and **add `error` as a separate
   semantic variant** that may share the same tokens but reads
   differently in templates ("this badge means error" vs "this
   action is destructive"). They can route to the same CSS today
   and diverge in future themes if the design system distinguishes
   them. Document the intent so consumers pick the right name.

5. **Decorative-by-default detection.** The directive wants to set
   `aria-hidden="true"` on `[data-mode="dot"]` badges that have no
   accessible name. Reading the host's `aria-label` attribute
   imperatively is awkward (we need an `afterRenderEffect` and a
   `MutationObserver` to keep up with attribute changes). Cleaner
   alternative: **add `kjBadgeDecorative: input<boolean>(false)`**
   on the directive; the consumer (or wrapper) sets it explicitly
   when they want the badge hidden from AT. Default `false` keeps
   today's behaviour (no `aria-hidden` reflected). **Lean
   `kjBadgeDecorative`** — explicit beats implicit and avoids the
   observer.

6. **`KjBadgeVariant` re-export.** Today
   `packages/core/src/badge/index.ts` re-exports `KjBadge` only; the
   wrapper imports `KjBadgeVariant` from `'@kouji-ui/core'` (resolves
   via the top-level barrel). Once we migrate to `KjVariant`, the
   `KjBadgeVariant` literal type goes away — variants are
   string-typed and validated against the preset. The wrapper's
   `variant: 'default' | 'secondary' | ...` literal stays narrow at
   the component layer for IDE help; no shared type to re-export.

7. **`display: contents` and the host attribute split.** The wrapper
   component currently sets `[attr.data-size]` on the inner `<span>`
   in the template, *separately* from the `[kjBadge]` directive's
   `[attr.data-variant]`. Once `KjSize` is composed on the
   directive, `data-size` moves to the directive's host bindings —
   the wrapper template stops setting it manually. Less surface,
   one source of truth for the attribute.

8. **`outline` variant against transparent backgrounds.** The
   current rule is `--kj-badge-bg: transparent`. On a transparent
   page background (or a wallpapered hero image), the badge text
   contrast is undefined. **Recommend** the docs note that outline
   variant assumes a known surface tone (`base-100` / `base-200` /
   `base-300`); on photographic backgrounds, use a filled variant
   instead. Not a code fix — a usage note.

9. **Min-width for single-digit dots and counts.** A "9" badge and a
   "99+" badge have different widths; layout shifts as the count
   ticks past 10 / 100. Common shadcn/MUI fix is `min-width: 1.25em`
   on the badge host so single digits sit in a circle. Add to
   `badge.css` for `[data-mode="text"]` when `count` is in play, or
   unconditionally — it makes the visual rhythm steadier and costs
   nothing for text labels longer than one character.

10. **SSR / hydration of live badges.** When `kjBadgeLive` is
    `'polite'` and the count changes during hydration (initial
    server-rendered count vs. current client count), the
    `role="status"` element will announce on first paint. Mitigate
    by writing the value via an `afterNextRender` once, then
    letting subsequent updates announce normally. Alternatively
    accept the announcement; the user just heard "5 unread" and
    that is correct. Verify under `provideClientHydration()`
    before locking the design.

11. **`role="status"` placement.** ARIA's `status` role implicitly
    sets `aria-live="polite"` and `aria-atomic="true"`. Setting
    both explicitly is harmless (most AT respect both) but
    redundant. Decision: set `role="status"` plus `aria-live` (we
    want the politeness to be configurable independently of the
    role) and **omit** `aria-atomic` because Badge content is
    almost always atomic by virtue of being short. If a consumer
    wants non-atomic announcements, they bypass `kjBadgeLive` and
    apply their own ARIA manually.

12. **Tag/Chip naming overlap in the daisyUI category.** The
    roadmap groups Badge, Tag/Chip, and Overlay Badge under
    "Data display". Consumers will inevitably reach for `<kj-tag>`
    when they want a removable chip and `<kj-badge>` when they
    want a static label. Document the boundary on the Badge docs
    page (and on Tag) explicitly: **"is your label clickable or
    removable? use Tag. Otherwise use Badge."** Boundary signage
    is cheaper than the inevitable triage of misuse bugs.

13. **`kjBadge` selector collision risk.** `[kjBadge]` is a
    sufficiently distinctive attribute that collisions are
    unlikely, but if a future `KjBadgeOverlay` directive wants to
    selectively annotate the *projected* badge inside an Overlay
    Badge wrapper, the selector should remain narrow. Decision:
    no change — `[kjBadge]` stays as the sole attribute; Overlay
    Badge uses its own selector (`[kjOverlayBadge]`) on the anchor
    and the Badge inside is projected as-is.

14. **Wrapper component renames.** `KjBadgeComponent` is the only
    component in the library currently using the `Component`
    suffix where the analog directive name (`KjBadge`) does not
    collide — every other wrapper in the repo drops the suffix.
    Per the class-naming rule in CLAUDE.md, the suffix is kept
    here precisely because `KjBadge` (the directive in
    `@kouji-ui/core`) and the wrapper (in `@kouji-ui/components`)
    would otherwise collide on import. Confirmed correct
    application of the rule. Document the kept-suffix in the
    wrapper file's TSDoc so future contributors know it is
    intentional, not drift.
