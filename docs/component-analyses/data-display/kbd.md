# Kbd

A visual rendering of a single keyboard key — `Ctrl`, `⌘`, `Enter`,
`?` — used inline in documentation, command-palette rows, tooltip
shortcut hints, and menu-item right-aligned chips. Semantically the
component **is** the native HTML `<kbd>` element; visually it is a
small, subtly raised pill with a 1px border, a cool-grey fill, and
monospace-ish typography that reads as "this is a key".

It is the smallest, lowest-stakes component in the data-display
roadmap — by some distance the strongest "this is just CSS"
candidate. The whole job is: pick the right element, give it a
class, optionally accept a `kjSize` for parity with the rest of the
library, and document a small set of conventions for combos
(`Ctrl + K`) and screen-reader pronunciation of unicode glyphs
(`⌘` should announce as "Command", not "place of interest sign").

> Not yet shipped in core. This analysis specifies the contract
> before code lands. The recommendation lands on a
> **directive-only core surface plus a one-line wrapper component**
> (rather than CSS-class-only, and rather than wrapper-only with no
> directive); the case is laid out under
> [Decision (core directive)](#decision-core-directive).

For the **shortcut-hints in tooltips** consumer, see
[`../feedback/tooltip.md`](../feedback/tooltip.md). For
**right-aligned shortcut chips inside menu rows**, see
[`../navigation/menu.md`](../navigation/menu.md). For the
**heaviest consumer** — the command palette where every row ends in
`<kbd>↵</kbd>` and the search input shows `<kbd>⌘</kbd><kbd>K</kbd>`
on the page — see `../navigation/command-palette.md` (planned).
Kbd is consumed by all three; none of them owns Kbd.

## Source comparison

This is a rare case where three of the four reference libraries
ship **nothing**. There is no headless or styled `<kbd>` primitive
in PrimeNG, Angular Material, or shadcn/ui. daisyUI has a class.
That is the whole field.

| Concern | PrimeNG | Angular Material | shadcn/ui | daisyUI |
|---|---|---|---|---|
| First-class component | **No** — gap. Templates use raw `<kbd>` styled per-app | **No** — gap. Templates use raw `<kbd>` styled per-app | **No** — gap. A handful of marketing/docs templates show inline `<kbd>` styled with Tailwind utility classes (`px-1.5 py-0.5 rounded border bg-muted`) but no exported component | **Yes — but as a CSS class only.** `class="kbd"` on any element (canonical `<kbd>`); modifiers `kbd-xs`, `kbd-sm`, `kbd-md`, `kbd-lg` |
| Selector | n/a | n/a | n/a | `<kbd class="kbd">` |
| Sizes | n/a | n/a | n/a | `xs / sm / md / lg` (no `xl`) |
| Variants | n/a | n/a | n/a | None — single visual; consumer overrides border / bg via CSS variables (`--kbd-bg`, `--kbd-border`) |
| Combo wrapper | n/a | n/a | n/a | None — sibling `<kbd>` elements with literal `+` text between them: `<kbd>Ctrl</kbd> + <kbd>K</kbd>` |
| Platform-aware key text (`Ctrl` vs `⌘`) | n/a | n/a | n/a | None — consumer responsibility |
| ARIA conventions | n/a | n/a | n/a | None — relies on the native `<kbd>` semantics |
| Keyboard contract | n/a | n/a | n/a | None — non-interactive |

**Read-off.**

- **Three blank cells in a row.** PrimeNG, Material, and shadcn/ui
  all leave Kbd to the consumer because they reasonably treat it
  as a class, not a component. Angular Material's stance is the
  same as their stance on Avatar — "this is CSS, not a primitive".
  We have already disagreed with Material on Avatar; we will agree
  with Material on Kbd, _almost_. The "almost" is the
  scope-of-the-tiny-thing-we-do-add: a `kjSize` hook and a few
  conventions for combos and unicode-glyph announcements that
  consumers will otherwise hand-roll wrong on every project.
- **daisyUI is the existence proof** that a kbd primitive can pay
  rent. The daisyUI surface — a class plus four size modifiers — is
  almost exactly the right scope. We add an Angular-shaped
  directive on top for `kjSize` integration with the rest of the
  library, plus optional helpers for the platform-aware-text and
  unicode-glyph-aria-label cases that daisyUI doesn't tackle.

## Decision (core directive)

**Yes — ship `KjKbd` as a tiny attribute directive (`[kjKbd]`)
plus a `<kj-kbd>` wrapper component.** This is the minimum viable
shape for kouji-ui's conventions; doing less would break parity
with the rest of the library and doing more would confuse the
component's role.

The case is unusual enough to walk through carefully, because the
*default* answer for "is this just CSS?" is "yes, it's just CSS"
and we need to justify the directive's existence on its merits, not
on consistency-with-other-components alone.

### The three options

**(A) CSS class only — no directive, no component.**
Ship a `kj-kbd` CSS class in the components package's stylesheet
and tell consumers to write `<kbd class="kj-kbd kj-kbd--sm">`.

- Pro: smallest possible surface; ergonomic for consumers writing
  raw HTML in markdown-rendered docs.
- Pro: matches daisyUI's stance exactly.
- **Con (decisive):** breaks the pattern. Every other primitive in
  the library is reached via a directive selector
  (`[kjBadge]`, `[kjButton]`, `[kjAvatar]`, `[kjTag]`). Consumers
  who type `[kjK…` and tab-complete will get every other
  component but not this one. Worse, `kjSize` is not a CSS
  contract — it is a directive that emits `data-size` and
  participates in dev-mode validation against `KJ_SIZE_PRESET`.
  A class-only Kbd cannot opt into that machinery without each
  consumer hand-typing `data-size="sm"`, at which point the
  ergonomic argument has lost its only payoff.
- Con: no surface to hang a future helper on (e.g. the
  unicode-glyph aria-label helper described below).

**(B) Directive only — `[kjKbd]`, no wrapper.**
Ship `KjKbd` and tell consumers to apply it to their own `<kbd>`
elements: `<kbd kjKbd kjSize="sm">⌘</kbd>`.

- Pro: smaller than (C).
- Pro: aligns with the "everything is a directive in core" stance.
- **Con (decisive):** without the wrapper, the `<kj-kbd>` selector
  is unavailable to consumers who prefer component selectors for
  documentation auto-discovery (the docs site indexes by
  selector). Tooling-wise, every other data-display component
  exposes both — Badge has `[kjBadge]` + `<kj-badge>`, Tag has
  `[kjTag]` + `<kj-tag>`. Asymmetry would be confusing and would
  force the docs site to special-case Kbd's auto-generated
  reference page.
- Con: the wrapper is one-line trivial. Skipping it saves ~15
  lines of code at the cost of the inconsistency above.

**(C) Directive + wrapper — `[kjKbd]` and `<kj-kbd>`.** ✅
Ship both. The directive is the headless contract; the wrapper is
the conventional template (renders `<kbd kjKbd>` with
`<ng-content/>`).

- Pro: matches every other primitive's shape.
- Pro: consumers writing inline-in-prose docs can still use the
  attribute on their own `<kbd>`; consumers writing template-heavy
  views use the component.
- Pro: the wrapper provides a single place for the
  `kjSize`-preset provider declaration so consumers don't need to
  manually `provide(KJ_SIZE_PRESET, …)` per app.
- Con: thirty lines instead of fifteen. Acceptable.

**Verdict: (C).** The directive's job is two host bindings
(`data-size`, optional `data-variant`) and one host attribute
discipline (`role`, `aria-label`). The wrapper's job is to render
`<kbd kjKbd>…<ng-content/>…</kbd>` and provide the size preset.
Neither piece is doing real work alone; both pieces together cost
nothing more than (B) and buy us symmetry with the rest of the
library.

### What the directive actually does

Three things, no more:

1. **Renders nothing.** It is an attribute directive on a host
   `<kbd>` element supplied by the wrapper (or by the consumer
   when `[kjKbd]` is applied directly).
2. **Composes `KjSize`** via `hostDirectives` so the host gets
   `[attr.data-size]` reflected from the preset, and dev-mode
   warnings if a consumer passes `'huge'` to a preset that only
   knows `xs/sm/md/lg`.
3. **Owns one a11y opinion** — when the consumer passes
   `kjKbdAriaLabel`, the directive reflects it to
   `[attr.aria-label]` and (importantly) sets the host's text
   content's `aria-hidden` discipline correctly via a small CSS
   convention documented in the wrapper, not via DOM manipulation.
   See [Accessibility](#accessibility-wcag-21-aaa) for the full
   pattern; the short version is: when the visible text is a
   unicode glyph (`⌘`, `⌥`, `↵`), the consumer passes
   `kjKbdAriaLabel="Command"` and the directive sets `aria-label`
   on the host so AT announces "Command" instead of the unicode
   character name (which varies wildly across screen readers and
   is sometimes silently dropped).

That's it. No variant. No combo logic. No platform detection. No
`kjKey` mapping input. The case for *not* doing those, one by one,
is in [Open questions / risks](#open-questions--risks).

### What the directive does *not* do

- **No platform detection.** Mac vs. Windows vs. Linux key text is
  the consumer's job (almost always: read the user-agent or
  `navigator.platform` once at app boot, expose a signal via DI,
  pass the right string into `<kj-kbd>`). If we owned this, we'd
  need to own the platform abstraction and the SSR-safe deferral
  of platform reads, both of which are heavier than Kbd deserves.
  Rejected — see Open question 2.
- **No `kjKey="mod"` mapping input.** Tempting (`<kj-kbd kjKey="mod">`
  renders `Ctrl` on Windows, `⌘` on Mac) but conflates rendering
  with interpretation. The same shortcut definition that drives
  the kbd visual usually also drives the `keydown` handler (see
  the command-palette analysis); centralising the mapping in a
  separate `KjKeybinding` service that *both* consumers read keeps
  Kbd a pure visual primitive. Rejected — see Open question 2.
- **No combo wrapper directive.** Combos are sibling `<kbd>`
  elements with whitespace-or-`+` text between them. Daisy does
  this. Browsers render it cleanly. The visual gap between two
  kbds is `0.25em` of inline whitespace plus a literal `+` glyph;
  there is no coordination between the kbds to manage. A
  `KjKbdGroup` would buy us nothing concrete and would force
  consumers to learn a new selector for a problem that doesn't
  exist. Rejected — see Open question 1.
- **No interactivity.** Kbd is non-focusable, non-clickable,
  non-disabled-able. If a consumer wants a clickable shortcut
  badge (e.g. clicking the visual key invokes the command), they
  wrap a `<button kjButton>` around the `<kbd kjKbd>` and the
  button owns the click / focus / a11y story.
- **No live-region semantics.** Kbds don't update; their text is
  the literal key the user is meant to press. If a consumer wants
  to teach a user a sequence dynamically ("now press X"), that's
  a `KjLiveRegion` paired with a `<kj-kbd>` rendered after the
  fact, not a Kbd opinion.

### Class naming

Per CLAUDE.md, drop the Angular type suffix unless there's a
collision. `KjKbd` is the directive name; the wrapper is
`KjKbdComponent` because `KjKbd` (directive in `@kouji-ui/core`) and
the wrapper (in `@kouji-ui/components`) would otherwise collide on
import — same situation as `KjBadge` / `KjBadgeComponent`. File
names: `kbd.ts` (directive), `kbd.ts` (wrapper) in their respective
packages. No `.directive.ts` / `.component.ts` suffixes.

## What exists today

Nothing on disk. No `packages/core/src/kbd/`, no
`packages/components/src/kbd/`, no entry in `public-api.ts`. This
analysis specifies the contract before code lands.

The roadmap context: Kbd sits in the "data display" group alongside
Badge, Tag, Avatar, and Accordion. The expected build order ships
the visually heavier primitives (Badge, Tag, Avatar) first and
sweeps in Kbd as a follow-on once the `KjSize` preset migration
across those components has stabilised — Kbd will inherit whatever
size-preset shape that migration settles on, which is a small
schedule lever.

## Base features

| Feature | Where it lives | Notes |
|---|---|---|
| `kjSize` | `KjSize` host directive | Presets `xs / sm / md / lg`. Default `md`. Kbd is one of two components in the library that legitimately wants `xs` (the other is the unread-count overflow chip on Overlay Badge), because keyboard-hint chips embedded inline in body text typically need to be smaller than the surrounding type so they don't dominate visually. The default `KJ_SIZE_PRESET` for Kbd's wrapper provides `[xs, sm, md, lg]` even if other components stick with `[sm, md, lg]`. |
| Variant | **None.** | Single visual. Reasoning: daisyUI ships none, the entire reference field ships none, and the visual distinction a variant would buy us (e.g. "warning" red kbd) has no real-world use case in shortcut hints — the kbd is the literal key, not a status indicator. If a future design language wants e.g. "deprecated shortcut" tone, a CSS-only `[data-deprecated="true"]` attribute can fold in without API churn. **Rejected for v1.** |
| Disabled | **None.** | Kbd is non-interactive; nothing to disable. |
| `kjKbdAriaLabel` | `KjKbd` (input) | Optional override for the host's accessible name. Default: the host's text content (the standard `<kbd>` semantics). Use only when the visible text is a unicode glyph that AT does not pronounce sensibly. See [Accessibility](#accessibility-wcag-21-aaa). |
| Combos | **CSS-driven, no API.** | Sibling `<kj-kbd>` elements with literal `+` text or `aria-hidden` separator. Documented pattern below. The components package ships a `.kj-kbd-combo` utility class (just `display: inline-flex; gap: 0.25em; align-items: baseline;`) that wrappers can apply to a span containing the sequence; not exported as a directive. |
| Platform-aware text | **Consumer responsibility.** | Document the recommended pattern: an app-level `injectPlatform()` helper exposes a `Platform` signal; consumers do `<kj-kbd>{{ platform() === 'mac' ? '⌘' : 'Ctrl' }}</kj-kbd>` or read from a `KjKeybinding` registry that already speaks platform. See [Open question 2](#open-questions--risks). |
| Sequence (`G then H`) | **No API; documented pattern.** | Render two `<kj-kbd>`s separated by the literal text "then" or "→": `<kj-kbd>G</kj-kbd> then <kj-kbd>H</kj-kbd>`. AT reads the prose between the kbds. No special component. |
| Touch target | **n/a** | Kbd is non-interactive. |

## Accessibility (WCAG 2.1 AAA)

The native `<kbd>` element is the primary a11y story. Browsers map
it to the ARIA "key" role conceptually (no explicit ARIA role
exists — `<kbd>` is "implicit role: generic" per HTML AAM, but
screen readers commonly announce it with a "key" prefix in verbose
modes). The directive's job is to **not break** the native
semantics, with one targeted addition for the unicode-glyph case.

Reference: [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/) has
no dedicated Kbd pattern — the closest applicable guidance is
[HTML AAM `<kbd>`](https://www.w3.org/TR/html-aam-1.0/#html-element-role-mappings),
which maps `<kbd>` to `role="generic"` and notes that AT typically
reads the element's text content directly without a role prefix
(unless verbose mode is on). The
[ARIA in HTML](https://www.w3.org/TR/html-aria/) guidance is to
prefer the native element over `role="generic"` plus a class, which
is exactly what we do.

| Criterion | Requirement | Where it lives |
|---|---|---|
| 1.1.1 Non-text Content | If the visible text is a unicode glyph (`⌘`, `⌥`, `↵`, `⇧`, `⌫`, `⎋`, `⌦`, `⇥`, `⏎`), the AT-announced name must match the user-facing key name | `kjKbdAriaLabel` on `KjKbd`. Consumer writes `<kj-kbd kjKbdAriaLabel="Command">⌘</kj-kbd>`. The directive reflects it to `[attr.aria-label]`. **Decision:** the directive does **not** ship a built-in glyph→name map (e.g. `⌘ → "Command"`) because the right name is *language-dependent* (German "Befehl", French "Commande") and *contextual* (some apps say "Cmd", others "Command"). A built-in map would force a single English convention. Documented strongly in examples. See [Open question 4](#open-questions--risks). |
| 1.3.1 Info & Relationships | The `<kbd>` semantic must be preserved so AT users can recognise this as a key reference, not arbitrary text | The wrapper renders the host as `<kbd>`. Direct directive use (`[kjKbd]` on a `<span>`) is technically allowed but **dev-mode warned** — the directive checks `host.tagName !== 'KBD'` in development and logs a warning. |
| 1.4.3 / 1.4.6 Contrast | The kbd's text-on-fill ≥ 7:1 (AAA normal) at every size; the 1px border ≥ 3:1 against the page background (1.4.11 Non-text Contrast) | Theme tokens. The default surface uses `--kj-color-base-200` for the fill and `--kj-color-base-content` for the text — the same pair used by Badge's `secondary` variant. **Verify** the border (`--kj-color-base-300`) at the `xs` size (where the border is visually dominant) against `base-100`, `base-200`, and `base-300` page backgrounds before declaring v1. |
| 1.4.11 Non-text Contrast | The 1px outer border that gives the kbd its "raised key" silhouette must be ≥ 3:1 against the page background | Token responsibility. **Risk** at `xs` on a `base-200` page background — the border is `base-300`, which against `base-200` may not clear 3:1. Mitigation: a darker border at `xs` only, or a faint inner `box-shadow` that increases the perceived edge. See [Open question 5](#open-questions--risks). |
| 2.1.1 Keyboard / 2.1.2 No Keyboard Trap | n/a | Kbd is non-interactive. |
| 2.4.7 Focus Visible | n/a | Kbd does not receive focus. |
| 2.5.5 Target Size (AAA) | n/a | Kbd is not a target. If wrapped by an interactive element (a clickable shortcut chip, e.g.), the **parent** owns the 44×44 contract. |
| 4.1.2 Name, Role, Value | The kbd's accessible name is its text content by default; when overridden via `kjKbdAriaLabel`, the override wins; the role is the native `<kbd>` (generic in ARIA, but UA-reported as "key" in verbose AT modes) | Directive host bindings. Never sets `role` explicitly — the native element's mapping is correct and adding `role="generic"` (or anything else) is redundant. |
| 4.1.3 Status Messages | n/a | Kbd content does not change in response to events. (If a consumer is updating a kbd's text dynamically — e.g. a "press the next key" tutor — the surrounding context owns the live region; Kbd does not.) |

### Combo announcement

A combo (`Ctrl + K`) renders as two `<kbd>` elements separated by
literal `+` text. Screen readers announce something like
"keyboard Control plus K" (NVDA), "Control plus K" (VoiceOver), or
"Control K" (JAWS) depending on platform. **None of these are
wrong.** Critically, they all *include* the `+`, which means the
sibling-`<kbd>` pattern is correct without extra ARIA wiring.

The directive does **not** mint a wrapping `aria-label` on a combo
parent. We considered this and rejected it — a wrapping
`aria-label="Control plus K"` would force AT into a single
phrasing and override the user's verbose-mode preference. Native
`<kbd>` reads better.

The one case where wrapping ARIA helps is when the combo separator
is unicode (e.g. `⌃⌘K` rendered as three sibling kbds with no
literal separator at all). Some AT will run those together.
Recommended pattern in that case: one `<span aria-label="Control
Command K">` wrapping the three kbds, with each kbd marked
`aria-hidden="true"` so AT reads the wrapper's label only. The
components package ships a `.kj-kbd-combo[aria-label]` example for
this; no new directive.

### Sequence announcement (`G then H`)

Render the literal word "then" between two kbds in the DOM:

```html
<kj-kbd>G</kj-kbd>
then
<kj-kbd>H</kj-kbd>
```

AT reads "G, then, H" cleanly. No special wiring. If the visual
design wants an arrow glyph instead, render `<span aria-hidden="true">→</span>`
plus a visually-hidden `then` for AT.

### `<kbd>` nested in `<kbd>`

HTML allows `<kbd><kbd>Ctrl</kbd>+<kbd>K</kbd></kbd>` to express
"this whole thing is the input". Some style guides recommend this;
most don't. The directive does **not** require this nesting and
the wrapper does not project it. Consumers who want it can hand-roll.

## Composition model

```
KjKbd                              (selector: [kjKbd])
  └── hostDirective: KjSize        (data-size routing)
```

One directive. One composed primitive. No context tokens. No
sibling directives. No optional container. No service. The
simplest composition in the library — by design.

### Reused primitives

| Primitive | Where | Why |
|---|---|---|
| `KjSize` | `hostDirectives` on `KjKbd` (with a `KJ_SIZE_PRESET` provider declared by the wrapper component) | Standard size routing. Reflects `data-size`, validates against the preset list, ships dev-mode warnings on unknown values. |
| `KjVariant` | **Not used.** | Kbd has no variants. |
| `KjDisabled`, `KjFocusRing`, `KjFocusTrap`, `KjButton`, `KjFormControl`, `KjLiveRegion`, `KjRovingTabindex` | **Not used.** | Kbd has no interactive contract. Reaching for any of these is a category error. |

### Wrapper composition (components package)

`<kj-kbd>` renders a `<kbd>` and applies `[kjKbd]` on it via the
template. Like Badge, the component host carries `display:
contents;` so the rendered element is the `<kbd>` itself, not a
wrapping element that would break inline-flow rendering.

```ts
@Component({
  selector: 'kj-kbd',
  standalone: true,
  imports: [KjKbd],
  template: '<kbd kjKbd [kjSize]="size()" class="kj-kbd"><ng-content /></kbd>',
  host: { style: 'display: contents;' },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: KJ_SIZE_PRESET,
      useValue: { values: ['xs', 'sm', 'md', 'lg'], default: 'md' },
    },
  ],
})
export class KjKbdComponent {
  readonly size = input<'xs' | 'sm' | 'md' | 'lg'>('md');
  readonly kjKbdAriaLabel = input<string | undefined>();
}
```

The `aria-label` plumbing on the wrapper is template-driven —
`[attr.aria-label]="kjKbdAriaLabel() ?? null"` on the inner
`<kbd>` — rather than a directive host binding, because the
directive does not own a separate input for it (it reads the host
attribute that the wrapper sets). This is a deliberate choice to
keep the directive minimal: the wrapper is allowed to set host
attributes the directive does not declare, exactly the same way a
consumer using `[kjKbd]` directly is.

### Cross-component pointers

- [`badge.md`](./badge.md) — closest sibling in shape (small,
  inline, non-interactive, single-host-element with `display:
  contents` wrapper, attribute-only directive). The composition
  pattern (`KjBadge` + wrapper component on a `<span>`) is the
  template Kbd follows on a `<kbd>`. Variant set diverges
  (Badge has many; Kbd has none).
- [`tag.md`](./tag.md) — interactive cousin of Badge.
  **Not** the right reference for Kbd; Kbd has no interactive
  contract whatsoever. Including the pointer here only because
  consumers will reach for "interactive kbd-like thing" and the
  answer is "wrap a `<kj-kbd>` in a `<button kjButton>`", not
  "use Tag".
- [`../feedback/tooltip.md`](../feedback/tooltip.md) (planned) —
  the **shortcut-hint consumer**. Tooltips frequently render
  `<kj-kbd>` inside their content slot ("Save (Ctrl + S)"). The
  tooltip's `aria-describedby` wiring picks up the kbd's text
  content automatically; no special integration needed. Tooltip's
  body content is `<ng-content>`-projected, so any markup
  including `<kj-kbd>` works without coordination.
- [`../navigation/menu.md`](../navigation/menu.md) (planned) —
  **right-aligned shortcut chips inside menu rows**. The menu
  item's template includes a `[kjMenuItemShortcut]` slot (or just
  a flex-aligned trailing `<span>`) that consumers fill with one
  or more `<kj-kbd>`s. Menu does not own a Kbd-specific
  affordance.
- `../navigation/command-palette.md` (planned) — the
  **canonical heavy consumer**. Every result row ends in
  `<kj-kbd>↵</kj-kbd>`; the search header shows
  `<kj-kbd>⌘</kj-kbd><kj-kbd>K</kj-kbd>`; recent commands list
  their shortcuts. Command Palette does not own a Kbd-specific
  affordance — it just renders Kbds via projection like everyone
  else. Forward-reference: Command Palette's analysis should
  describe the platform-aware-text pattern (Mac / Windows / Linux
  glyph differences) and the keybinding-registry → kbd-text
  mapping in detail; Kbd itself is platform-blind.
- [`../actions/button.md`](../actions/button.md) — for the
  "clickable kbd" case (rare, but real — e.g. an on-screen
  keyboard demo where pressing the visual key invokes the
  shortcut). Wrap `<kj-kbd>` inside a `<button kjButton>`. Button
  owns the click / focus / a11y story; Kbd contributes the visual.
- `KjSize` — `packages/core/src/presets/size.ts`. Same composition
  pattern is used by every variant-or-size-bearing component.

## Inputs / Outputs / Models

All public-facing inputs/outputs/models are `kj`-prefixed.

### `KjKbd` (`[kjKbd]`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjSize` | `input` | `string` (preset-driven) | preset default (`'md'`) | Provided by composed `KjSize`. Reflects to `[attr.data-size]`. Preset-validated in dev mode. |
| (host) `[attr.data-size]` | host binding | — | — | From `KjSize`. |

No outputs. No models. Kbd is one-way display.

The directive **does not** declare a `kjKbdAriaLabel` input. The
`aria-label` is a host attribute the wrapper sets directly via
`[attr.aria-label]` in its template. A consumer using `[kjKbd]`
directly on their own `<kbd>` writes `aria-label="Command"`
themselves — exactly the same idiom as setting `aria-label` on any
HTML element. Adding a directive input for it would buy nothing
and would force consumers to learn a duplicate path for a native
attribute.

(Reconsidered if we ever ship the glyph→name helper described in
Open question 4; that helper would justify a directive-level
input. v1: native attribute only.)

### Wrapper inputs (components package)

| Element | Input | Maps to |
|---|---|---|
| `<kj-kbd>` | `size` | `kjSize` (host-composed via `KjSize`) |
| `<kj-kbd>` | `kjKbdAriaLabel` | `[attr.aria-label]` on the rendered `<kbd>` |

That's it. The wrapper is, in total, ~25 lines of Angular code
including imports and the standalone metadata.

## Examples to ship

`packages/components/src/kbd/`:

1. **Default** (`kbd.default.example.ts`) —
   `<kj-kbd>Enter</kj-kbd>`. Anchors the chrome.
2. **Sizes** (`kbd.sizes.example.ts`) —
   `<kj-kbd size="xs">⌃</kj-kbd> <kj-kbd size="sm">⌃</kj-kbd> <kj-kbd size="md">⌃</kj-kbd> <kj-kbd size="lg">⌃</kj-kbd>`
   side by side. Anchors the size scale and visually verifies the
   `xs` border-contrast risk against the docs site's actual
   background.
3. **Combo** (`kbd.combo.example.ts`) — `<kj-kbd>Ctrl</kj-kbd> +
   <kj-kbd>K</kj-kbd>`. Demonstrates the sibling-with-literal-`+`
   pattern. Includes a comment in the example source explaining
   why no `KjKbdGroup` exists and why sibling kbds is the
   recommended path.
4. **Unicode glyphs with aria-label**
   (`kbd.glyphs.example.ts`) — `<kj-kbd kjKbdAriaLabel="Command">⌘</kj-kbd>
   <kj-kbd kjKbdAriaLabel="Shift">⇧</kj-kbd>
   <kj-kbd kjKbdAriaLabel="Return">↵</kj-kbd>`. Demonstrates the
   one a11y opinion the component owns. Source comments call out
   the "glyph→name is consumer territory" decision and link to the
   relevant open question.
5. **Combo with unicode-only separator (silent kbds)**
   (`kbd.combo-glyphs.example.ts`) — `<span class="kj-kbd-combo"
   aria-label="Control Command K"><kj-kbd aria-hidden="true">⌃</kj-kbd><kj-kbd
   aria-hidden="true">⌘</kj-kbd><kj-kbd aria-hidden="true">K</kj-kbd></span>`.
   Demonstrates the rare wrapper-ARIA pattern for combos with no
   literal `+`.
6. **Inside a tooltip** (`kbd.in-tooltip.example.ts`) — a button
   with a tooltip whose content includes `<kj-kbd>`. Anchors the
   tooltip integration story; lives in the kbd folder so the kbd
   docs page can preview it without depending on the tooltip docs
   page's example registry.
7. **Inside a menu item** (`kbd.in-menu.example.ts`) — a menu row
   with the shortcut chip flex-aligned to the right. Anchors the
   menu integration. Same locality argument as (6).
8. **Sequence** (`kbd.sequence.example.ts`) — `<kj-kbd>G</kj-kbd>
   then <kj-kbd>H</kj-kbd>`. Demonstrates the
   no-API-needed sequence pattern.
9. **Themed (core-only)** — `kbd.example.ts`,
   `kbd.retro.example.ts`, `kbd.finance.example.ts` under
   `packages/core/`. Confirms the headless directive works under
   arbitrary theme CSS. Especially useful for Kbd because the
   "raised key" silhouette is heavily theme-dependent — a brutalist
   theme might want flat, a skeuomorphic theme might want a thick
   inner highlight.

## Open questions / risks

1. **Combo wrapper directive — yes or no?** Considered
   `KjKbdGroup` (selector `[kjKbdGroup]`, wrapper `<kj-kbd-group>`)
   that would render its children with consistent
   spacing-plus-separator. The work it would do:

   - Inject a `kjKbdGroupSeparator` input (`'+' | '·' | ' '`)
     that renders between siblings via CSS `::after` content on
     all-but-last child.
   - Optionally wrap the group in `aria-label` derived from
     children for the silent-kbd case described in
     [Combo announcement](#combo-announcement).

   **Decision: no.** Cost (one new directive, one new selector,
   one new context token, dev-mode validation that children are
   `KjKbd`s) outweighs benefit (saving a literal `+` character in
   the template). The silent-kbd case is rare enough that
   consumers can hand-roll the wrapper `<span aria-label="…">`
   without an abstraction. Revisit if three or more real
   consumers ask for it. **Lean: never; this is what whitespace
   and the `+` character were designed for.**

2. **Platform-aware text — `kjKey="mod"` input?** Tempting:
   `<kj-kbd kjKey="mod">` renders `⌘` on macOS, `Ctrl` everywhere
   else. The work it would require:

   - A platform-detection service (`KjPlatform`) injectable via
     `inject()`, SSR-safe (defers reads to `afterNextRender()`),
     and configurable for testing.
   - A glyph-and-text map per logical key (`'mod'`, `'meta'`,
     `'alt'`, `'shift'`, `'enter'`, `'escape'`, `'tab'`,
     `'backspace'`, `'delete'`, `'arrow-up'`, …) per platform.
   - A naming convention decision: does `'mod'` mean "the
     primary modifier on this platform" (Cmd on Mac, Ctrl
     elsewhere) or "any of Cmd/Ctrl/Win/Super" (the Electron
     `accelerator` convention)? Different applications expect
     different answers.

   **Decision: no for v1.** Two reasons:

   1. **Same shortcut needs to work in two places** — the
      `<kj-kbd>` visual *and* the `keydown` listener. If Kbd owns
      the platform mapping and the listener owns its own copy,
      the two drift. The right home for "this is the platform's
      Save shortcut" is a `KjKeybinding` registry that *both* the
      visual and the listener read from. Building Kbd's
      platform-awareness without that registry would lock in a
      duplication; building the registry is bigger than Kbd
      deserves. **Defer to a future `KjKeybinding` analysis.**
   2. **Localisation** — the *text* "Ctrl" / "Alt" / "Shift" is
      English. German users see "Strg" / "Alt" / "Umschalt".
      Owning the platform mapping inside Kbd means owning the
      localisation too, and we have no other component that owns
      its own translations.

   **Documented mitigation:** the example for Command Palette
   (and the kbd-in-tooltip docs page) shows the consumer-side
   pattern: a `platform()` signal on a service, plus
   `<kj-kbd>{{ platform() === 'mac' ? '⌘' : 'Ctrl' }}</kj-kbd>`
   in the template. Verbose, but explicit and correctly
   localisable. Revisit when (a) `KjKeybinding` ships and
   (b) the library's i18n story is settled.

3. **Element check in dev mode — how strict?** The directive
   warns when `host.tagName !== 'KBD'`. Three options:

   - **(a) Warn only.** Consumer using `[kjKbd]` on a `<span>`
     gets a console warning; runtime behaviour unchanged.
   - **(b) Selector-restrict.** Selector becomes
     `kbd[kjKbd]` so the directive simply doesn't apply to
     non-kbd elements. Cleaner, but removes the consumer's
     ability to override (e.g. for some bizarre styling
     experiment with a `<span>`).
   - **(c) Throw in dev.** Hard failure on non-kbd hosts in dev
     mode. Production: silent (because the styling won't be
     right anyway).

   **Lean (a).** Dev warning, no enforcement. The kbd element is
   a 100% solid recommendation but not a hard constraint —
   consumers who deliberately apply it to a `<span>` (e.g. inside
   a `display: flex` row where they want to control the
   inline-baseline behaviour exactly) deserve an escape hatch.

4. **Glyph→name aria-label map — ship a built-in?** Tempting to
   provide:

   ```ts
   const KJ_KBD_GLYPH_LABELS = {
     '⌘': 'Command', '⌥': 'Option', '⌃': 'Control', '⇧': 'Shift',
     '↵': 'Return', '⌫': 'Backspace', '⌦': 'Delete',
     '⎋': 'Escape', '⇥': 'Tab', '↑': 'Up arrow', '↓': 'Down arrow',
     '←': 'Left arrow', '→': 'Right arrow',
   };
   ```

   …and have the directive auto-set `aria-label` when the
   text content is a single glyph in the map. Three reasons not to:

   1. **Localisation.** The labels are English. A French-speaking
      Mac user expects "Commande", not "Command". The map would
      either lock in English or force every project to provide
      its own translated map via DI, at which point the value of
      shipping the default is small.
   2. **Pronunciation variance.** "Command" vs. "Cmd" vs. "Mac
      command key" — different docs sites pick different
      conventions. A built-in map picks one for everyone.
   3. **Verbose-mode AT already does most of this.** NVDA in
      verbose mode reads "place of interest sign" for `⌘` —
      annoying — but JAWS and VoiceOver typically read "Command"
      out of the box. The map's value is largely capturing the
      lowest common denominator; consumers in NVDA-heavy contexts
      need it more than others.

   **Decision: no for v1, ship the documentation pattern instead.**
   Specifically, the `kbd.glyphs.example.ts` example shows the
   correct manual usage and the docs page calls out the most
   common glyphs and their recommended labels. Revisit if user
   feedback shows consumers consistently shipping wrong or
   inconsistent labels — at that point a `provideKjKbdGlyphLabels({…})`
   opt-in helper is cheap to add without changing the directive.

5. **`xs` size border contrast.** The kbd's 1px outer border at
   `xs` (designed to be ~16px tall) carries most of the visual
   identity; if its contrast against the page background drops
   below 3:1, the kbd visually melts into the page. Risk concentrates
   on `base-200` page backgrounds where the border (`base-300`) is
   only one tonal step darker. **Mitigation:** at `xs` only,
   bump the border to `base-content` at 30% alpha (computed via
   `color-mix`), which clears 3:1 against any base-N background
   in the default theme. Verify in the `kbd.sizes.example.ts`
   preview against light, dark, and high-contrast themes before
   declaring v1.

6. **Inline baseline alignment.** `<kbd>` rendered inline with
   text often sits visually too high or too low because the
   browser default font-size and baseline of `<kbd>` don't match
   the surrounding prose. Common fix: `vertical-align: baseline`
   plus a `line-height: 1` and explicit `padding-top` /
   `padding-bottom` that compensate for the font's metrics. **Risk:**
   the right padding values depend on the font stack the consumer
   has loaded. Ship sensible defaults for the default `Inter`
   stack; document the override path for other stacks; verify
   against the docs site's font (which uses a different stack
   than the `Inter` default in some sections).

7. **`<ng-content>` with whitespace.** A consumer writing
   `<kj-kbd> Enter </kj-kbd>` (with surrounding whitespace) gets
   a kbd whose accessible name has leading/trailing spaces. Most
   AT trim these silently; some don't. **Mitigation:** the
   wrapper template uses `ngPreserveWhitespaces: false` (the
   default) and the example projects without surrounding
   whitespace. Documented; not enforced.

8. **SSR / hydration.** Kbd has no client-side state, no event
   listeners, no `MutationObserver`, no `afterNextRender`. SSR
   produces the final DOM verbatim; hydration is a no-op. The
   only SSR concern is the `display: contents` host style on the
   wrapper, which is universally supported but historically
   awkward in some SSR-to-CSS pipelines (the host element ends up
   in the DOM but contributes nothing to layout). Verified
   pattern in Badge; same pattern works here.

9. **Tooltip-shortcut interaction announcement.** When a tooltip
   contains a kbd ("Save (Ctrl + S)"), the tooltip's
   `aria-describedby` references the tooltip's full content. AT
   reads the description on focus — including the kbd text. We
   verified this works for Badge and the same applies here. Risk
   is mostly cosmetic: the description reads as "Save Control
   plus S" which is correct but slightly awkward. Documented in
   the tooltip-integration example; no Kbd code needed.

10. **Consumer puts a `<button>` *inside* the kbd.** Pathological
    case: `<kj-kbd><button>?</button></kj-kbd>`. The `<kbd>`
    wraps an interactive element, which the HTML spec explicitly
    permits ("represents user input… typically derived from a
    keyboard or other input device") but most AT will re-parent
    or strip. **Decision:** dev-mode warn if a focusable
    descendant exists inside `[kjKbd]` after first render. Same
    machinery the Badge directive could use for its
    `aria-hidden` discipline. Low-priority polish; not blocking
    v1.

11. **`kjSize` preset divergence from the rest of the library.**
    Most components ship `[sm, md, lg]` defaults. Kbd's wrapper
    ships `[xs, sm, md, lg]`. Minor inconsistency. Justified:
    inline-with-prose kbds genuinely want sub-`sm`; other
    components don't. Documented in the kbd docs page and
    in the wrapper file's TSDoc.

12. **Right-aligned kbd in menu rows — should the menu own the
    layout slot?** Question for the Menu analysis, not Kbd:
    does `<kj-menu-item>` provide a `[kjMenuItemShortcut]`
    structural directive (auto-flex-aligned right) or just an
    `<ng-content select="[shortcut]">` slot? Either way Kbd
    contributes nothing — the layout decision is the menu's.
    Flagged here only so the Menu analysis remembers to address
    it, with Kbd as the canonical content for that slot.

13. **Whether to re-export the size preset constant from `core`.**
    The wrapper provides `KJ_SIZE_PRESET` with a four-value array.
    A core-package consumer wanting to apply `[kjKbd]` directly
    needs to provide their own `KJ_SIZE_PRESET` or import the
    wrapper's. **Decision:** export a `KJ_KBD_SIZE_PRESET` constant
    from the components package so core-package consumers can
    `provide(KJ_SIZE_PRESET, { useValue: KJ_KBD_SIZE_PRESET })`
    if they want parity. Tiny, free, and avoids the silent-drift
    case where a consumer picks `'huge'` and the directive's
    dev-mode validator passes (because the consumer's preset
    didn't list it) but the CSS doesn't recognise the value.

14. **Core-package directive without a wrapper — does that
    pattern have a name?** Yes: it's the `[kjBadge]`-on-your-own-`<span>`
    pattern. Document the kbd-attribute-on-your-own-`<kbd>` use
    case prominently in the kbd docs page so consumers who write
    markdown-rendered docs (where the renderer outputs a `<kbd>`
    automatically) can opt into the styling without rewriting
    their markdown to use the wrapper component.
