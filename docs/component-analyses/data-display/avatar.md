# Avatar

A small, fixed-size container that represents a person, organisation, or
entity. It renders a profile image when one is available and falls back
to a textual stand-in (typically two-letter initials) or a generic icon
when the image is missing, still loading, or has failed to load. The
component is purely presentational — it has no interactive state of its
own — but it sits at the centre of a small ecosystem of related
display components: the corner status indicator, the stacked group, and
the overlay-positioning primitive that drives both.

> Already shipped in core at `packages/core/src/avatar/avatar.ts` (three
> directives + injection token) and wrapped in
> `packages/components/src/avatar/avatar.ts`. This analysis documents
> the existing shape, contrasts it with peer libraries, and lists the
> concrete gaps to close before declaring v1.

For the **stacked / overflowing** form — N avatars side by side with
the tail collapsed into a `+N` chip — see
[`avatar-group.md`](./avatar-group.md). For the **status dot** in the
corner (online / offline / busy) and the **count pill** that hangs off
a target, see [`badge.md`](./badge.md) and
[`overlay-badge.md`](./overlay-badge.md). The Avatar itself owns
neither the dot nor the count: both are projected via the same
`KjOverlayBadge` positioning primitive so a `<kj-avatar>` can host any
overlayed marker without baking the rules into this component.

## Source comparison

| Concern | PrimeNG `p-avatar` / `p-avatarGroup` | Angular Material | shadcn/ui `Avatar` (Radix) |
|---|---|---|---|
| Primary surface | Single component (`<p-avatar>`) with `image`, `label`, `icon`, `shape`, `size`, `style`, `styleClass`, `badge*` inputs | **No first-class avatar.** Consumers compose `<img mat-card-avatar>` / `<img matListItemAvatar>` inside other components, or roll their own `<div class="avatar">` | Compound headless primitives (`Avatar`, `AvatarImage`, `AvatarFallback`) |
| Image vs. fallback | `[image]` input takes precedence; on error `(onImageError)` fires and the consumer is expected to swap to `[label]` / `[icon]` themselves | n/a | Built-in load-state machine; `AvatarImage` reports `idle / loading / loaded / error` and `AvatarFallback` shows itself unless the image is `loaded` |
| Shape | `shape: 'square' \| 'circle'` (default `square`) | n/a | Consumer-styled; primitive renders neutral `<span>` |
| Size | `size: 'normal' \| 'large' \| 'xlarge'` | n/a | Consumer-styled |
| Initials / label | `[label]` input renders directly inside the avatar; no derivation from name | n/a | Consumer-owned content inside `<AvatarFallback>` |
| Icon fallback | `[icon]` input renders a PrimeIcons class | n/a | Consumer-owned content (any SVG / `<svg>`) inside `<AvatarFallback>` |
| Status indicator | `[badge]`, `[badgeSeverity]` inputs render a built-in dot | n/a — consumers manually position a Material badge | Not in primitive; consumers compose with their own overlay |
| Loading delay | n/a — fallback shows immediately on error | n/a | `<AvatarFallback delayMs={600}>` — fallback only renders after N ms to avoid flashing during fast image loads |
| Group / stacking | `<p-avatarGroup>` clones overflow chrome and applies negative margins | n/a | Not part of the primitive; community recipes |
| Accessibility wiring | `<img alt>` plus an outer `<div>` with no role; no `aria-label` on initials | n/a | `<img alt>` for the image; fallback is plain content (consumer responsible) |

**Read-off.**

- **PrimeNG** packs everything into one component: image, label,
  icon, status badge, and group are all knobs on `<p-avatar>` /
  `<p-avatarGroup>`. Easy to start with, awkward to extend (e.g.
  arbitrary projected content next to a status dot, multi-letter
  initials styled differently from icon fallbacks). The image-error
  story is also weaker — it fires an event and lets the consumer
  fix the rendering, instead of swapping to fallback automatically.
- **Angular Material** has no primitive at all. `mat-card-avatar` is
  a CSS class, nothing more. This is a real gap in the ecosystem
  and one of the cleanest opportunities for a kouji component to
  out-class Material.
- **shadcn / Radix** is the spiritual match: small compound
  primitives, a real load-state machine (`idle | loading | loaded |
  error`), `delayMs` to avoid flicker, and zero opinions on shape /
  size / status. We already have the three-directive shape; we need
  to deepen the state machine and add the corner-overlay slot.

## Decision (core directive)

**Yes — keep the existing three-directive family**, but flesh the state
machine out from a boolean (`imageLoaded: boolean`) to the four-state
shadcn-style enum and add a corner-positioning slot. The current
`packages/core/src/avatar/avatar.ts` already establishes the right
shape:

```
KjAvatar           (selector: [kjAvatar])
  └── provides KJ_AVATAR { imageLoaded }
KjAvatarImage      (selector: [kjAvatarImage])
  └── injects KJ_AVATAR; toggles imageLoaded on load/error
KjAvatarFallback   (selector: [kjAvatarFallback])
  └── injects KJ_AVATAR; visible when !imageLoaded()
```

It is a small but real headless contract — three pieces of cross-element
co-ordination that are tedious and error-prone for consumers to wire by
hand:

1. **Image load-state machine.** Watching `(load)` and `(error)` on the
   `<img>`, surfacing the result to a sibling element so the fallback
   can react. This is the directive's reason to exist.
2. **`alt` / `aria-hidden` discipline.** The image element must carry
   the user-visible alt text; the fallback (initials / icon) must be
   hidden from AT when the image succeeds, otherwise the user's name
   is announced twice ("Jane Doe, J D"). Without a directive owning
   this, consumers either repeat the announcement or hide both.
3. **A single point to mount status indicators / count badges.** The
   corner overlay (online dot, "+3", notification count) lives at the
   root, positioned with `KjOverlayBadge`. Centralising that slot
   keeps wrappers thin and lets `KjAvatarGroup` reuse the same root.

**Three directives, not one.** A single `KjAvatar` directive with the
image and fallback handled internally would force a template ("use my
markup or none") and leak the implementation across the
core/components boundary. Three directives lets the components-package
wrapper render the standard markup *and* lets advanced consumers
project their own image / fallback when needed (e.g. `<picture>` with
`<source>` for AVIF, an inline `<svg>` fallback with custom paint).

**Reuse existing primitives, not re-invent.** Sizes via `KjSize`
(`hostDirectives` on the wrapper); shape (`circle | square | rounded`)
via a `data-shape` attribute the wrapper sets directly — there is no
behavioural difference between the shape values, only border-radius,
so a preset directive is overkill. Status indicators via
`KjOverlayBadge` (positioning primitive) wrapping a `KjBadge`
(visual). Initials derivation lives in a tiny pure helper exported
from core, not on the directive.

**No CDK.** No Angular Animations. The fallback fade-in is a CSS
transition on opacity driven by the `data-loaded` attribute the
directive already writes. SSR-safe, zoneless-safe.

## What exists today

`packages/core/src/avatar/`:

- `avatar.ts` — three directives (`KjAvatar`, `KjAvatarImage`,
  `KjAvatarFallback`) plus `KJ_AVATAR` token and `KjAvatarContext`
  interface, all in a single ~25-line file.
- `avatar.spec.ts` — renders the container + axe pass with `<img alt>`
  and `aria-hidden` on the fallback. Does **not** yet cover the
  load/error state transitions or the four-state machine described
  below.
- No `index.ts` re-export visible in this folder; the public surface
  bundles via the package's top-level barrel.

`packages/components/src/avatar/`:

- `avatar.ts` — single wrapper component `KjAvatarComponent`. Composes
  `KjAvatar` via `hostDirectives`, imports `KjAvatarImage` and
  `KjAvatarFallback` into its template, accepts `src`, `alt`,
  `content` (string | `TemplateRef`), `size`, `shape`. Mirrors `alt`
  to `title` for native hover tooltips.
- `avatar.css` — CSS custom properties (`--kj-avatar-size`,
  `--kj-avatar-bg`, `--kj-avatar-fg`, `--kj-avatar-radius`),
  `data-size` and `data-shape` selectors, fallback fade via
  `[data-loaded]` / `[data-visible]`. Border-radius is `9999px` by
  default; `data-shape="rounded"` swaps to the design-token box
  radius.
- Five examples on disk: `avatar.default.example.ts`,
  `avatar.with-image.example.ts`, `avatar.initials.example.ts`,
  `avatar.shapes.example.ts`, `avatar.sizes.example.ts`.

**Notable gaps the analysis below closes:**

- The state machine is a boolean (`imageLoaded`) — there is no `idle`
  vs. `loading` vs. `error` distinction, and no way to delay the
  fallback to avoid flashing.
- Initials are passed as a literal string (`content="JD"`); there is
  no helper to derive them from a name.
- Shapes ship as `'circle' | 'rounded'`; the brief asks for
  `'circle' | 'square' | 'rounded'` — `square` (sharp corners, no
  radius) is not yet a wrapper option.
- There is no slot for a corner status indicator. Today consumers
  would have to wrap `<kj-avatar>` in a `<kj-overlay-badge>` from the
  outside, which works but isn't documented as the pattern.
- The wrapper uses local `'xs' | 'sm' | 'md' | 'lg' | 'xl'` typing
  for `size` instead of composing `KjSize` via `hostDirectives`.
  This is inconsistent with the rest of the library (Badge, Button,
  Input all route through `KjSize`).
- `alt` is mirrored to `title` on the **outer host**, which means
  hovering the fallback also surfaces the tooltip — fine, but it
  also means a decorative-only avatar (`alt=""`) gets `title=""` on
  the host, a no-op DOM attribute that is harmless but ugly. Cheap
  to gate.
- No spec coverage of load → error → fallback-visible transitions.

## Base features

| Feature | Where it lives | Notes |
|---|---|---|
| Image rendering | `KjAvatarImage` directive on an `<img>` inside the wrapper template | Only rendered when `src()` is truthy. |
| Fallback rendering | `KjAvatarFallback` directive on the wrapper's `<span class="kj-avatar-fallback">` | Always rendered; CSS hides it via `[data-visible]` when the image is loaded. |
| Initials | **Wrapper-only string today.** Plan: add a pure helper `kjInitialsFromName(name: string, max = 2): string` exported from core, used by the wrapper when `[name]` is supplied | Default behaviour: split on whitespace, take the first character of the first and last word, uppercase, max 2 chars. Single-word names yield a single-letter initial. Empty / whitespace-only → empty string (caller falls through to the icon). |
| Icon fallback | Projected content (`<ng-content select="[kj-avatar-icon]">`) — **gap today** | When neither `src` resolves nor initials are derivable, render a generic user icon (consumer-supplied; we ship one in `kj-iconography` examples but no built-in). |
| Sizes | **`KjSize` via `hostDirectives` on the wrapper** — gap today (wrapper has its own union type) | Allowed values: `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'`. Default `'md'`. Routed through the standard preset machinery so a consumer-app token can narrow the set. |
| Shapes | `kjShape: 'circle' \| 'square' \| 'rounded'` host attribute on the wrapper (`data-shape`) | `circle` → `border-radius: 9999px`, `rounded` → `var(--kj-radius-box)`, `square` → `0`. **Gap today**: only `circle` and `rounded` are exposed. |
| Image load states | `KjAvatar.imageState: Signal<'idle' \| 'loading' \| 'loaded' \| 'error'>` — **upgrade from today's boolean** | Replaces `imageLoaded`. `idle` when no `src` is set, `loading` after `src` is observed but before `(load)` / `(error)` fires, `loaded` after `(load)`, `error` after `(error)`. Boolean kept as a deprecated computed alias for one release. |
| Fallback delay | `kjFallbackDelay: input<number>(0)` on `KjAvatar` (ms) | Suppresses fallback rendering for the first N ms of `loading` to avoid a flash on fast images. Default `0`. Mirrors Radix's `delayMs`. |
| Status indicator slot | Projected content slot at the root: `<ng-content select="[kj-avatar-overlay]">` — **new** | Consumer drops a `<span kj-avatar-overlay kjOverlayBadge=...>` (or a `<kj-badge>` wrapped in `<kj-overlay-badge>`) into this slot. The avatar is `position: relative` already, so the overlay positions correctly. |
| Tooltip-on-hover | `[attr.title]="alt()"` on the host — gap: emits `title=""` when alt is empty | Plan: `[attr.title]="alt() || null"` so empty alt yields no attribute. |
| Decorative mode | `kjDecorative: input<boolean>(false)` on the wrapper — **new** | When `true`, the host gets `aria-hidden="true"` and the image's `alt` is forced to `""`. Used for ornamental avatars in carousels, hero strips, etc. |
| Group composition | See [`avatar-group.md`](./avatar-group.md) | The group wraps N `<kj-avatar>` instances; nothing new on the avatar itself except a `data-grouped` attribute the group sets so the avatar can pick up the ring/border that visually separates stacked avatars. |

### Initials helper contract

A small pure function, not a directive. Lives at
`packages/core/src/avatar/initials.ts`.

```ts
/**
 * Derives initials from a person or entity name.
 *
 * Splits on Unicode whitespace, takes the first grapheme of the first
 * and last token, uppercases via `toLocaleUpperCase()` (with no locale
 * argument — defers to the runtime), and clamps to `max` characters.
 *
 * - `"Jane Doe"`   → `"JD"`
 * - `"jane doe"`   → `"JD"`
 * - `"Madonna"`    → `"M"`
 * - `"  "` / `""`  → `""`
 * - `"François Hôpital"` → `"FH"`
 * - `"한지민"` (single token) → `"한"`
 *
 * Surrogate-pair-safe: uses `Array.from(name)` to iterate by grapheme.
 */
export function kjInitialsFromName(name: string, max: 1 | 2 = 2): string;
```

Wrapper consumes it lazily — only when the consumer passes
`[name]` and not an explicit `[content]`.

## Accessibility (WCAG 2.1 AAA)

There is no formal WAI-ARIA APG pattern for "avatar"; the relevant
references are [WCAG 1.1.1 Non-text
Content](https://www.w3.org/TR/WCAG21/#non-text-content), [4.1.2
Name, Role, Value](https://www.w3.org/TR/WCAG21/#name-role-value), and
the general [HTML img element
guidance](https://www.w3.org/WAI/tutorials/images/decision-tree/).

| Criterion | Requirement | Where it lives |
|---|---|---|
| 1.1.1 Non-text Content | The image carries a text alternative; informative avatars have a meaningful `alt`, decorative avatars have `alt=""` and `aria-hidden="true"` on the container | Wrapper renders `<img [alt]="alt() ?? ''">`. **Gap today**: the wrapper sets `[alt]="alt() ?? ''"` *unconditionally* when `src` is set, but does not enforce that an informative avatar has *non-empty* alt. Decorative mode (`kjDecorative`) is missing. |
| 1.3.1 Info & Relationships | When the avatar is part of a list / row that already names the user, the avatar should be decorative (alt=""). When it stands alone, the alt is the user's name | Documented in examples; wrapper supports both via `[alt]` + `[kjDecorative]`. |
| 1.4.5 Images of Text (AA) | Avoid text-as-image; initials are a *graphical fallback for an image*, not "image of text" — they are rendered as live text inside a `<span>`, satisfying the criterion | Inherent — fallback is an HTML element with real characters. |
| 1.4.11 Non-text Contrast | Initials text against the avatar background must hit 4.5:1 (text ≥ 14pt is large; initials at our default sizes are not large) | Components-package responsibility. Default tokens (`--kj-color-base-300` bg / `--kj-color-base-content` fg) hit AAA in both light and dark themes; verify under custom themes. |
| 1.4.6 Contrast (Enhanced — AAA) | 7:1 for normal text. Initials at `xs` (~11pt) qualify as small text | Token audit — same as 1.4.11. |
| 2.1.1 Keyboard | An avatar is non-interactive by default; no keyboard contract | Inherent. **If** a consumer makes it a button/link (e.g. profile menu trigger), the wrapper should not get in the way — no `pointer-events: none`, no swallowed clicks. |
| 2.5.5 Target Size (AAA) | When the avatar acts as a trigger, ≥ 44×44 CSS px | At `md` and above we exceed 44px (`md` is 2.5rem = 40px → close; `lg` 3rem = 48px → ✓). **Gap**: at `xs` / `sm` (24px / 32px) the avatar is below the target. Document that avatars used as triggers should use `md` minimum, or wrap in a button with adequate hit area. |
| 4.1.2 Name, Role, Value | The image conveys its name via `alt`; the fallback must not duplicate that announcement when the image succeeds | **Gap today**: `KjAvatarFallback` toggles visibility via `[data-visible]` (CSS opacity + `pointer-events: none`) — it stays in the accessibility tree while the image is loaded, so a screen reader cycling through descendants still finds the initials. Plan: also bind `[attr.aria-hidden]="ctx.imageState() === 'loaded' ? 'true' : null"` on `KjAvatarFallback`, so when the image announces "Jane Doe", the duplicate "JD" is suppressed. |
| 4.1.3 Status Messages | The load state is not a status message; no live region required | Inherent. |

### Alt-text discipline

The directive layer does **not** enforce a non-empty alt — the wrapper
does, with two distinct modes:

1. **Informative avatar** (default). Consumer must pass `[alt]` (the
   user's name). If omitted in dev mode, log a `console.warn`
   referencing 1.1.1. The image gets `alt="<name>"`; the fallback
   gets `aria-hidden="true"` whenever the image is loaded so the
   name is announced exactly once.
2. **Decorative avatar** (`[kjDecorative]="true"`). The image gets
   `alt=""`; the host gets `aria-hidden="true"`. The fallback
   inherits `aria-hidden` via the host. Used inside list rows where
   a sibling cell already names the user.

A third "purely textual" case — initials only, no image — is **also
informative**: the fallback announces the name. Since `aria-hidden` is
suppressed in `error` / `idle` states, the initials text is read by AT.
For better than initials announcement, consumers should set
`[alt]="name"` and rely on a `KjVisuallyHidden` element next to the
fallback that carries the full name; we will document this pattern
rather than build it into the directive — it is rare and easy to
overengineer.

### Keyboard contract

None. The avatar is non-interactive by default. When a consumer wraps
it in `<kj-button>` or `<a kjLink>`, that element owns the keyboard
contract. The avatar must not interfere — no `tabindex`, no event
listeners other than the `(load)` / `(error)` on `<img>`.

### Reduced motion

The fallback's opacity transition is a CSS-only effect; respect
`prefers-reduced-motion: reduce` by gating the transition in the
component CSS. Today the CSS does not gate it — minor v1 fix.

## Composition model

Three core directives plus one helper, communicating through one
injection token:

```
KjAvatar                (provides KJ_AVATAR { imageState, fallbackDelay })
  ├── KjAvatarImage     (injects KJ_AVATAR — toggles imageState on load/error)
  └── KjAvatarFallback  (injects KJ_AVATAR — visible when !loaded, optional delay)

kjInitialsFromName(name, max?)  ← pure helper, exported from core
```

`KjAvatarImage` and `KjAvatarFallback` never see each other directly —
they only know about the root context. That keeps the trio reusable
inside both `<kj-avatar>` and `<kj-avatar-group>` (which renders its
overflow chip as a sibling avatar), and lets advanced consumers
project a non-standard `<picture>` element under `[kjAvatarImage]`
without re-implementing the state machine.

### Reused primitives

| Primitive | Where | Why |
|---|---|---|
| `KjSize` | Composed via `hostDirective` on `KjAvatarComponent` | Standardises size token routing. **Gap today** — wrapper uses a local union. Trivial refactor: add to `hostDirectives`, drop the local `size = input<...>('md')`. |
| `KjOverlayBadge` | **Not** composed — projected via the `[kj-avatar-overlay]` content slot | Decouples positioning (the primitive's job) from "what hangs in the corner" (badge, dot, count). The avatar offers the slot; consumers decide what to put in it. See [`overlay-badge.md`](./overlay-badge.md). |
| `KjBadge` | Same — projected, not composed | The visual layer for status / count indicators. See [`badge.md`](./badge.md). |
| `KjVisuallyHidden` | Optional, wrapper-side, only when consumers want richer AT-only text alongside an `alt`-less avatar | Not part of the v1 directive surface. |

`KjVariant` and `KjFocusRing` are **not** used here — the avatar has no
behavioural variants (just shape + size + colour tokens) and no focus
contract of its own.

### Wrapper composition (components package)

`<kj-avatar>` applies `KjAvatar` and `KjSize` via `hostDirectives` (the
former for the state machine and provider, the latter for the
`data-size` attribute). It exposes `src`, `alt`, `name`, `content`,
`size`, `shape`, `decorative`, `fallbackDelay` as inputs and renders:

```html
<!-- conceptually -->
@if (src(); as srcVal) {
  <img kjAvatarImage class="kj-avatar-image" [src]="srcVal" [alt]="resolvedAlt()" />
}
<span kjAvatarFallback class="kj-avatar-fallback" [attr.aria-hidden]="hideFallbackFromAt()">
  @if (isTemplate(content())) {
    <ng-container *ngTemplateOutlet="$any(content())"></ng-container>
  } @else if (content()) {
    {{ content() }}
  } @else if (initials()) {
    {{ initials() }}
  } @else {
    <ng-content select="[kj-avatar-icon]"></ng-content>
  }
</span>
<ng-content select="[kj-avatar-overlay]"></ng-content>
```

`resolvedAlt()` returns `''` when `kjDecorative()` is true; otherwise
the consumer-supplied `alt`. `hideFallbackFromAt()` returns `'true'`
when `imageState() === 'loaded'`, else `null`. `initials()` is a
`computed` that prefers an explicit `[content]`, otherwise derives from
`[name]` via `kjInitialsFromName`.

The host element keeps `style: 'display: inline-flex; …'` (already in
CSS) and gains:

- `[attr.aria-hidden]="kjDecorative() ? 'true' : null"`
- `[attr.title]="alt() || null"` (was unconditional)
- `[attr.data-state]="imageState()"` (new — exposes the four-state
  machine as a CSS hook for `[data-state="loading"]` skeletons)
- `[attr.data-shape]="shape()"` (already present; gains `'square'` value)
- `[attr.data-grouped]` is set externally by `KjAvatarGroup` when
  this avatar is its child — for the ring border between stacked items.

### Cross-component pointers

- [`avatar-group.md`](./avatar-group.md) — stacked avatars with a `+N`
  overflow chip. The group does **not** modify the avatar; it just
  arranges N `<kj-avatar>` elements with negative margins, applies a
  `data-grouped` attribute so the avatar can pick up its ring/border,
  and renders a final overflow avatar whose `[content]` is the count.
- [`badge.md`](./badge.md) — the visual chip used as the corner
  marker (status dot, "+3", "99+"). Avatar provides only the slot;
  Badge owns colours, sizes, content.
- [`overlay-badge.md`](./overlay-badge.md) — the positioning
  primitive that anchors a marker to a corner of any element. Avatar
  is one of its primary clients; Button is another.
- [`../actions/dropdown-menu.md`](../actions/dropdown-menu.md) — when
  an avatar acts as a profile-menu trigger, it is wrapped in
  `<kj-menu-trigger>` / `<kj-button variant="ghost">`. The Avatar
  itself stays non-interactive; the wrapping element owns the
  keyboard contract.
- [`../layout/`](../layout/) — `KjCard` regularly hosts an avatar in
  its header. No special integration; just composition.

## Inputs / Outputs / Models

All public-facing inputs/outputs/models are `kj`-prefixed on the
directive layer; wrapper components re-map them to terse names
(`src`, `alt`, `name`, `content`, `shape`, `size`) via `hostDirectives`
`inputs` aliasing.

### `KjAvatar` (`[kjAvatar]`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjFallbackDelay` | `input` | `number` | `0` | **New.** Milliseconds to suppress fallback rendering after entering `loading` state. Mirrors Radix `delayMs`. Implemented inside the directive as a `setTimeout` cleared on `(load)` / `(error)`. |
| `imageState` | `Signal<'idle' \| 'loading' \| 'loaded' \| 'error'>` | — | `'idle'` | **Replaces** `imageLoaded` boolean. Public read-only. |
| `imageLoaded` | `Signal<boolean>` | — | `false` | **Deprecated alias** = `computed(() => imageState() === 'loaded')`. Kept for one release for spec compatibility, then removed. |

### `KjAvatarImage` (`[kjAvatarImage]`)

No public inputs.

| Host binding | Source |
|---|---|
| `(load)` | `ctx.imageState.set('loaded')` |
| `(error)` | `ctx.imageState.set('error')` |
| `[attr.data-loaded]` | `ctx.imageState() === 'loaded' ? '' : null` |

The directive should also detect `idle → loading` transition: a
`constructor()` `effect` that observes the host element's `src`
attribute and flips `imageState` from `idle` to `loading` whenever
the attribute changes to a non-empty value. (We can read `src` via
`(inject(ElementRef).nativeElement as HTMLImageElement).src` and a
`MutationObserver`, but cheaper: have the wrapper poke the state
directly via the context when its `src()` input changes — see Open
questions.)

### `KjAvatarFallback` (`[kjAvatarFallback]`)

No public inputs.

| Host binding | Source |
|---|---|
| `[attr.data-visible]` | `shouldRender() ? '' : null` |
| `[attr.aria-hidden]` | `ctx.imageState() === 'loaded' ? 'true' : null` — **new** |

`shouldRender()` is `true` when `imageState()` is anything other than
`'loaded'`, **and** the `kjFallbackDelay` window has elapsed (or is
zero). The directive owns its own delay timer; the wrapper does not
re-implement it.

### Wrapper inputs (components package, `<kj-avatar>`)

| Input | Type | Default | Maps to |
|---|---|---|---|
| `src` | `string \| undefined` | `undefined` | `<img [src]>` (only when truthy) |
| `alt` | `string \| undefined` | `undefined` | `<img [alt]>` and host `[title]` |
| `name` | `string \| undefined` | `undefined` | **New.** Used to derive initials when `content` is empty. Also a sensible default for `alt` if `alt` is unset (we can default `alt` to `name` in `resolvedAlt()`). |
| `content` | `string \| TemplateRef<unknown>` | `''` | Fallback body (overrides initials derivation). Already supported. |
| `size` | `KjSize` values (`'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'`) | `'md'` | Host-composed via `hostDirectives` (replaces local union). |
| `shape` | `'circle' \| 'square' \| 'rounded'` | `'circle'` | `data-shape` host attribute. **Gap**: add `'square'` to the union and the CSS. |
| `decorative` | `boolean` | `false` | Host `aria-hidden`, forces empty alt. |
| `fallbackDelay` | `number` | `0` | `kjFallbackDelay` on the host directive. |

No outputs. The image-state signal is read-only on the directive; if
consumers need to react to errors (analytics, custom retry), they can
inject `KJ_AVATAR` from a sibling directive — that is enough headless
power for the rare cases. We deliberately do **not** add an
`(imageError)` output to keep the wrapper a pure presentation
component.

## Examples to ship

Already on disk under `packages/components/src/avatar/`:

- `avatar.default.example.ts` — single avatar with explicit `content="JD"`.
- `avatar.with-image.example.ts` — image with alt + fallback.
- `avatar.initials.example.ts` — image src that 404s, falling back to
  initials. (Will become a more honest "fallback on error" demo once
  the helper-derived initials path lands.)
- `avatar.shapes.example.ts` — `circle` and `rounded`.
- `avatar.sizes.example.ts` — five sizes side-by-side.

**To add for v1:**

1. **`square` shape** — extend `avatar.shapes.example.ts` to demonstrate
   all three (circle, rounded, square).
2. **Derived initials** — `<kj-avatar name="Jane Doe" alt="Jane Doe" />`,
   no `content`, no `src`. Anchors the new `kjInitialsFromName` helper
   and the `[name]` input.
3. **Image error fallback** — broken `src` plus `[name]`; demonstrates
   the four-state machine and the suppressed-flicker delay (use
   `[fallbackDelay]="200"` and a deliberately slow image).
4. **Decorative mode** — avatar inside a list row whose primary cell
   already names the user; `[decorative]="true"` to mute AT.
5. **With status indicator** — `<kj-avatar><span kj-avatar-overlay
   kjOverlayBadge="bottom-end"><kj-badge variant="success">●</kj-badge></span></kj-avatar>`.
   Shows the projected-overlay slot and the cross-component
   composition.
6. **As profile-menu trigger** — wrapped in `<kj-menu-trigger>` /
   `<kj-button variant="ghost">`; demonstrates that the avatar stays
   non-interactive and inherits hit-target from the wrapping button.
7. **Custom icon fallback** — projecting an `<svg kj-avatar-icon>`
   when neither image nor initials are available (e.g. anonymous
   user).
8. **In a card header** — `<kj-card-header>` with `<kj-avatar>` and
   title/subtitle; cross-references the Card examples.

## Open questions / risks

1. **Image state machine is currently a boolean.** `imageLoaded:
   signal<boolean>` cannot distinguish `idle` (no src) from `loading`
   (src set, awaiting load) from `error` (src set, load failed). This
   blocks the fallback-delay feature, the `data-state` CSS hook for
   skeleton effects, and accurate `aria-hidden` toggling. Plan:
   replace with `imageState: WritableSignal<'idle' | 'loading' |
   'loaded' | 'error'>`; keep `imageLoaded` as a deprecated computed
   alias for one release. Update `avatar.spec.ts` to cover the
   transitions.

2. **How does `loading` state get entered?** The directive watches
   `(load)` and `(error)` on the `<img>`, but it does not watch `src`
   changes. Two options:
   - **(a) MutationObserver** on the image's `src` attribute (clean,
     SSR-aware via `afterNextRender`, handles the case where a
     consumer toggles `[src]` post-init).
   - **(b) Wrapper poke**: the wrapper component runs an `effect()` on
     its `src()` input and calls `ctx.imageState.set('loading')` via
     a sibling directive. Cheaper, but couples the wrapper to the
     state machine.

   Recommendation: **(a)**. The directive layer is supposed to be
   self-contained; relying on the wrapper to drive a state machine
   defeats the purpose. `MutationObserver` is widely supported and
   we already use it elsewhere (focus-trap).

3. **`kjFallbackDelay` semantics under SSR.** On the server, no image
   can ever load — should the fallback render immediately during SSR
   regardless of `delay`? Yes: gate the `setTimeout` on
   `isPlatformBrowser`. On the server, `imageState` stays `idle` (or
   `loading` if `src` is set), and `shouldRender()` returns `true`
   immediately. Hydration then takes over and the timer kicks in
   only if the client lands in `loading` state without a cached
   image.

4. **Initials helper locale-correctness.** `toLocaleUpperCase()`
   without a locale argument relies on the runtime's default. For
   names where this matters (Turkish dotless i, German ß), the
   consumer should pass an already-cased string in `content`. We
   document this caveat in the helper's TSDoc; we do not accept a
   locale argument on `kjInitialsFromName` for v1 — it bloats the
   API for a niche case.

5. **`KjSize` not yet composed on the wrapper.** Today the wrapper
   declares `size = input<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md')`.
   This is inconsistent with Badge, Button, Input, and prevents the
   per-app preset narrowing the `KjSize` machinery enables. Plan:
   add `KjSize` to `hostDirectives` (with `kjSize: size` aliasing),
   delete the local input, register an `KJ_SIZE_PRESET` factory at
   the avatar's component scope so the dev-mode warning lists the
   five allowed values.

6. **`shape: 'square'` is not yet supported.** Wrapper declares
   `shape: 'circle' | 'rounded'`. Brief asks for square as well. Two
   lines of CSS (`[data-shape="square"] { --kj-avatar-radius: 0; }`)
   plus union widening. Trivial.

7. **Status indicator: built-in vs. projected.** PrimeNG bakes
   `[badge]` / `[badgeSeverity]` into the avatar; we project via
   `[kj-avatar-overlay]`. Trade-off: built-in is one less thing to
   import for the common online-dot case; projected is unconstrained
   (any chip, any positioning, any variant). Decision: **projected**.
   The projection slot is < 5 lines of template; consumers compose
   `<kj-overlay-badge>` + `<kj-badge>` and get the full power. We
   document the recipe in an example so the friction is one
   copy-paste.

8. **Generic icon fallback.** Today there is no built-in icon for
   the "no name, no image" case — the fallback `<span>` renders
   empty. Options: (a) ship a tiny inlined `<svg>` user-icon inside
   the wrapper; (b) document that consumers project their own
   icon via `[kj-avatar-icon]`. **(b)** keeps the wrapper free of
   icon dependencies and matches Radix; document a snippet in the
   examples.

9. **`title` on the host vs. on the image.** Today the wrapper sets
   `[attr.title]="alt()"` on the *outer* host. That makes the
   tooltip work even when the image fails (the host is the only
   element always present). Risk: when `alt` is empty (decorative
   mode), `title=""` is still emitted. Plan: switch to
   `[attr.title]="alt() || null"` so empty alt yields no attribute.

10. **`aria-hidden` on the fallback — is this enough?** Hiding the
    fallback from AT when the image is loaded is correct, but
    setting `aria-hidden="true"` on a node that contains focusable
    descendants is a WCAG anti-pattern (4.1.2). The fallback is
    initials text — never focusable — so this is safe today.
    Reaffirm in code review that consumers projecting custom
    fallback content (a button, an icon button to "regenerate
    initials"?) would break this contract. Document it.

11. **No spec coverage of state transitions.** `avatar.spec.ts`
    only checks the static rendered tree. Add tests that:
    (a) render with a valid src, fire `load`, assert
    `data-loaded="" `, fallback hidden;
    (b) render with a broken src, fire `error`, assert fallback
    visible, no `data-loaded`;
    (c) render with `kjFallbackDelay="200"`, advance fake timers
    by 100ms, assert fallback still hidden; advance another 150ms,
    assert visible;
    (d) axe pass with informative + decorative mode.

12. **Wrapper alt-defaulting.** Should the wrapper default `alt` to
    `name` when `alt` is unset? Pro: less repetition for the common
    case (`<kj-avatar name="Jane Doe" />`). Con: implicit behaviour
    can hide a missing-alt bug when the consumer drops a `name`
    binding. Decision: **yes, default `alt` to `name`**, but in dev
    mode warn when *neither* is set and `decorative` is false. The
    warning is the safety net; the default is the ergonomic win.

13. **Shape = `square` and image cropping.** With `border-radius: 0`,
    `object-fit: cover` already centres and crops. No extra rule
    needed, but verify with portrait-orientation source images.

14. **`KjAvatarGroup` ring-border styling.** When stacked, each
    avatar needs a ring (typically `--kj-color-base-100` or the
    theme-page background) so the overlap is visually clean. The
    group sets `data-grouped` on each child avatar; the avatar's
    CSS reads:
    `.kj-avatar[data-grouped] { box-shadow: 0 0 0 2px var(--kj-color-base-100); }`.
    This means the ring colour follows the *page* background, not
    the avatar's own background — a known limitation. Document
    `--kj-avatar-ring-color` as a custom property the group can set
    when stacked over a non-default surface (e.g. inside a
    `<kj-card>`). Not blocking for v1 of avatar; on
    `avatar-group.md`'s plate.

15. **`decorative` interplay with the status overlay.** A
    decorative avatar (`aria-hidden="true"` on the host) hides
    *all* descendants from AT, including a corner status badge
    that might carry meaningful state ("3 new messages"). If the
    status is meaningful, the avatar is by definition not purely
    decorative — the count is the message and the avatar is the
    target. Document this: when the overlay carries informative
    text, do **not** mark the avatar decorative; instead, set
    `[alt]=""` on the image and keep the host visible to AT, so
    the overlay's text is still announced.

16. **Bundle: pure helper export from `@kouji-ui/core`.**
    `kjInitialsFromName` is a pure function with no Angular
    dependencies. Export it from the core package's avatar barrel
    (`packages/core/src/avatar/index.ts`) so wrappers and consumer
    apps can both reuse it without dragging the directives along.
    Tree-shaking handles the rest.

17. **Class name suffix on the wrapper.** The wrapper is named
    `KjAvatarComponent` (with the `Component` suffix) because
    `KjAvatar` is already the directive name — same collision rule
    as `KjAccordionComponent` / `KjAccordion`. This is consistent
    with the project naming rule; no change needed. Worth flagging
    in the v1 review so we do not "fix" it.
