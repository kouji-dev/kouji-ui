# Button

Reference architecture for the kouji-ui Button. Already shipped: headless `KjButton`
directive (`packages/core/src/button/button.ts`) and styled wrapper
`KjButtonComponent` (`packages/components/src/button/button.ts`). This file
documents the existing shape and flags concrete improvements informed by source
comparison.

## Source comparison

- **PrimeNG** — [primeng.org/button](https://primeng.org/button). One
  `<p-button>` component with a wide flat prop surface: `label`, `icon`,
  `iconPos`, `severity` (intent: success / info / warn / danger / contrast /
  help / secondary), `variant` (`outlined` / `text` / `link` are also
  exposed as boolean shortcuts), `size`, `loading`, `loadingIcon`, `raised`,
  `rounded`, `text`, `outlined`, `plain`, `badge`, `disabled`, `ariaLabel`.
  Anchor mode is achieved by passing `routerLink` / `href` style inputs, not by
  attribute directive on `<a>`. No first-class `pressed` / toggle state — that
  ships as a separate `<p-toggleButton>` component.
- **Angular Material** — [material.angular.dev/components/button](https://material.angular.dev/components/button).
  Splits intent across **separate selectors** that all attach to either
  `<button>` or `<a>`: `mat-button` (text), `mat-flat-button`,
  `mat-stroked-button` (outlined), `mat-raised-button`, `mat-icon-button`,
  `mat-fab`, `mat-mini-fab`, `mat-extended-fab`. Inputs are minimal: `color`
  (`primary` / `accent` / `warn` — themable triad), `disabled`,
  `disabledInteractive` (keep focusable when disabled — same stance as kouji),
  `disableRipple`, plus standard `aria-label`. No built-in loading; no
  pressed / toggle (use `MatButtonToggle` for that). Anchor variant uses the
  same selector on `<a>` and inherits `MatAnchor`'s navigation handling.
- **shadcn/ui** — [ui.shadcn.com/docs/components/button](https://ui.shadcn.com/docs/components/button).
  Single CVA-driven `<Button>`. Six variants (`default`, `secondary`,
  `destructive`, `outline`, `ghost`, `link`); eight sizes including
  `icon` / `icon-xs` / `icon-sm` / `icon-lg`. `asChild` (Radix Slot) lets the
  caller swap the underlying tag (anchor, Next.js `<Link>`, etc.) while keeping
  styles. No built-in `loading` or `pressed` — both are recipe-level, composed
  by the consumer with `<Spinner>` and `aria-pressed` respectively.

Pattern picked up from the comparison: kouji's wrapper most closely follows
shadcn's CVA-style preset surface (variant list + size list, configurable),
but pairs it with Material's `disabledInteractive` stance (always-focusable
ARIA-disabled) and with first-class `loading` and `pressed` baked into the
core directive — neither of which Material or shadcn provide out of the box.

## Decision: needs a core directive?

**Yes — and this is the canonical example.** The directive owns four pieces
of behaviour worth sharing across themes:

1. **ARIA-disabled instead of native `disabled`.** WCAG 2.1 AAA prefers
   keeping disabled controls focusable so screen-reader users can discover
   them. `KjButton` reflects `aria-disabled` + `data-disabled` and
   intercepts clicks in the **capture phase** so consumer template handlers
   never run when disabled.
2. **`loading` semantics.** Sets `aria-busy="true"` and forces the
   effective-disabled state, so a busy button can't be re-clicked but stays
   focusable.
3. **Toggle (`aria-pressed`) contract.** Tri-state model: unset → omit
   `aria-pressed` (regular button); bound → directive auto-flips on click and
   emits `kjPressedChange`. Pure-HTML `<button>` has no equivalent.
4. **Preset binding.** `bindPresets(KJ_BUTTON_CONFIG)` wires `KjVariant` and
   `KjSize` to a configurable preset list, validates inputs against it, and
   sets `data-variant` / `data-size`. Themes can extend the list via
   `provideKjButton(...)` without touching the wrapper.

Items 1-3 are stateful keyboard- and screen-reader-facing contracts; item 4 is
a configurable surface that styled wrappers (themed or otherwise) need to
share. None of this is theme-specific styling, so a directive is correct.

## Base features

- **Variants (preset, configurable):** `default`, `destructive`, `outline`,
  `ghost`, `link`. Open-set string. Extend via
  `provideKjButton({ variants: [...KJ_BUTTON_DEFAULTS.variants, 'brand'] })`.
- **Sizes (preset, configurable):** `sm`, `md`, `lg`, `icon`. `icon`
  enforces a 1:1 aspect ratio and ≥44×44 minimum touch target.
- **States:** `kjDisabled`, `kjLoading` (auto-disables, sets `aria-busy`),
  `kjPressed` (model, tri-state — unset/true/false).
- **Element flexibility:** the directive attaches to either `<button>` or
  `<a>` — anchors get the same styling and disabled-suppression. The wrapper
  hard-codes `<button>`; using `<a kjButton>` directly is the documented
  anchor path.
- **Slots:** single default content slot (`<ng-content />`); spinner element
  is rendered inline by the wrapper when `kjLoading()` is true.
- **State model:** stateless besides `kjPressed` (model). Parent owns
  `loading` / `disabled`; the directive only observes them.

## Accessibility (WCAG 2.1 AAA)

| Concern | Where | Mechanism |
|---|---|---|
| **Role** | DOM | Native `<button>` (default) or `<a>` (link / nav). No explicit `role` set — rely on the underlying element. |
| **`aria-disabled`** | core directive | `[attr.aria-disabled]="effectiveDisabled() ? 'true' : null"`. **Not** native `disabled` — keeps focus and discoverability (WCAG 2.4.7, 4.1.2). |
| **`data-disabled`** | core directive | Hook for CSS state styling without parsing `aria-disabled`. |
| **`aria-busy`** | core directive | Set when `kjLoading()` is true. Pairs with the spinner so AT users hear a busy state. |
| **`aria-pressed`** | core directive | Computed: `null` when `kjPressed()` is `undefined`, `'true'` / `'false'` otherwise. Tri-state semantics — never spurious `aria-pressed` on non-toggle buttons. |
| **`aria-label`** | wrapper | `kjAriaLabel` input forwarded as `[attr.aria-label]`. Mandatory for icon-only buttons (`kjSize="icon"`); current spec test asserts presence. |
| **Click suppression** | core directive | Capture-phase listener calls `preventDefault()` + `stopImmediatePropagation()` when `effectiveDisabled()` — prevents consumer (click) handlers from running while keeping focus (WCAG 4.1.2). |
| **Keyboard contract** | native | Inherited from `<button>`: `Space` and `Enter` activate. No custom keys (no need — single-action control). For `<a kjButton>`: `Enter` only, per native anchor semantics. |
| **Focus-visible** | core directive (host) | `KjFocusRing` composed via `hostDirectives`; only sets `data-focus-visible` on keyboard focus. Wrapper CSS keys `:focus-visible` for the outline. |
| **Focus management** | n/a | Buttons don't move focus on activation; nothing to manage here. |
| **Touch target ≥ 44×44** | wrapper CSS | `data-size="icon"` sets `min-width` / `min-height: 2.75rem` (WCAG 2.5.5 Target Size — AAA bumps to 44px). Text sizes rely on the inline-text exception; padding for `sm` is tight but the label provides equivalent inline target. |
| **Contrast** | themes layer | `--kj-color-*` / `--kj-color-*-content` token pairs are theme-tuned for ≥7:1 (AAA) on filled variants; `link` and `ghost` rely on `--kj-color-base-content` which themes guarantee. |
| **Loading announcement** | (gap) | `aria-busy` is correct, but no live-region announcement when state flips. Borderline — `aria-busy` toggling is announced by NVDA/JAWS in most modes; if a stricter "Saving…" announcement is wanted, layer `KjLiveRegion` in the consumer template, not in the directive (avoids double-announce when consumers already manage status). |

**Where it lives:** every a11y attribute (`aria-disabled`, `aria-busy`,
`aria-pressed`, `data-disabled`) is on the **core directive**. The wrapper only
adds `aria-label` (theme-facing input) and the visual spinner. This split is
correct: a different theme reusing `KjButton` directly inherits all
contracts.

## Composition model

**Single root directive (`KjButton`).** No supportive child directives — Button
is a leaf control with no parts to coordinate. Existing primitives are
composed through `hostDirectives` and a provider:

```ts
hostDirectives: [
  { directive: KjVariant, inputs: ['kjVariant'] },
  { directive: KjSize,    inputs: ['kjSize'] },
  KjFocusRing,
],
providers: [...bindPresets(KJ_BUTTON_CONFIG)],
```

- `KjVariant` + `KjSize` — preset host directives that read
  `KJ_BUTTON_CONFIG`, validate the input string against the configured list,
  and reflect `data-variant` / `data-size`. Re-used by every preset-driven
  component (Badge, Tag, Alert, etc.).
- `KjFocusRing` — keyboard-only focus-visible signal, reflected as
  `data-focus-visible`.
- `bindPresets(KJ_BUTTON_CONFIG)` — wires `KjVariant` / `KjSize`'s default
  resolution and validation to the Button-specific preset token.

`KjDisabled` is **not** composed. Button needs a richer effective-disabled
contract (`kjDisabled OR kjLoading`), capture-phase click suppression, and
its own attribute reflection. Re-using the bare primitive would force two
host bindings to compete on `aria-disabled`. Documented improvement below.

**No injection-token context.** Button is a leaf — there is no parent /
child relationship for a context to mediate. (Compare: Tabs, Accordion,
Select all need contexts. Button does not.)

**Cross-component pointers:**

- The capture-phase click-suppression pattern used here is the same one
  proposed for `MenuItem` and any other clickable that needs to short-circuit
  consumer click handlers when disabled. See **Dropdown Menu** analysis
  (`actions/dropdown-menu.md`) `Composition model`.
- `kjPressed` toggle semantics map directly to the proposed **Toggle / Switch**
  control's pressed model (`data-input/toggle.md`). If we ever ship a
  `KjToggleButton`, it should be `KjButton` with a required `kjPressed` —
  not a separate directive. Document this in toggle.md.
- `KjButton` on `<a>` is the canonical "anchor styled as button" pattern.
  Link analysis (`navigation/link.md`) should defer to this rather than
  re-implementing button-shaped link styles.

## Inputs / Outputs / Models

### Core directive (`KjButton`)

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjVariant` | `string` (validated against preset) | `'default'` (from `KJ_BUTTON_CONFIG`) | Forwarded to `KjVariant` host directive. |
| `kjSize` | `string` (validated against preset) | `'md'` (from `KJ_BUTTON_CONFIG`) | Forwarded to `KjSize` host directive. |
| `kjDisabled` | `input<boolean>(false)` | `false` | Reflects `aria-disabled`, `data-disabled` when truthy. |
| `kjLoading` | `input<boolean>(false)` | `false` | Reflects `aria-busy`. ORs into `effectiveDisabled`. |
| `kjPressed` | `model<boolean \| undefined>(undefined)` | `undefined` | Tri-state. Field type **must** be annotated `ModelSignal<boolean \| undefined>` due to ng-packagr d.ts narrowing. |
| `kjPressedChange` | (auto from `model()`) | — | Fires after directive auto-toggles on click. |

### Wrapper (`KjButtonComponent`, selector `kj-button`)

Re-exposes everything above, plus:

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjType` | `input<'button' \| 'submit' \| 'reset'>('button')` | `'button'` | Bound to native `<button [type]>`. |
| `kjAriaLabel` | `input<string \| undefined>(undefined)` | `undefined` | Bound to `[attr.aria-label]`. **Required** when `kjSize="icon"` — flag in dev with a console warning (improvement). |

All input names are `kj`-prefixed per `rules/code_style.md`.

## Examples to ship

Match what exists in `packages/components/src/button/`:

1. **Default** — `button.example.ts`. One button, all defaults.
2. **Variants** — `button.variants.example.ts`. `default`, `destructive`,
   `outline`, `ghost`, `link` side-by-side.
3. **Sizes** — `button.sizes.example.ts`. `sm`, `md`, `lg`, `icon`.
4. **Disabled** — `button.disabled.example.ts`. Includes a click handler to
   visibly demonstrate that consumer handlers don't fire while disabled.
5. **Loading** — `button.loading.example.ts`. Async action; toggles
   `kjLoading` for 1.5s.
6. **Pressed (toggle)** — `button.pressed.example.ts`. `[(kjPressed)]`
   two-way binding with a label that flips.
7. **Icon-only** — `button.icon.example.ts`. `kjSize="icon"` + `kjAriaLabel`.
8. **Anchor as button** — `button.anchor.example.ts`. `<a kjButton>` directly.
9. **Configured presets** — `button.configured.example.ts`. Extends the
   variant list with `brand` / `warning` via `provideKjButton`.
10. **Themed (core-only)** — `button.example.ts`, `button.retro.example.ts`,
    `button.finance.example.ts` under `packages/core/`. Demonstrates that the
    headless directive works under arbitrary theme CSS without the wrapper.

## Open questions / risks

- **`aria-label` enforcement on icon-only.** Today nothing fails the build
  when a consumer writes `<kj-button kjSize="icon">` without `kjAriaLabel`.
  Add a dev-mode `effect()` in the wrapper that asserts the label is set
  whenever `kjSize() === 'icon'` and the projected content has no accessible
  text. Cheap, catches the most common a11y miss.
- **`KjDisabled` primitive overlap.** `KjButton` re-implements
  `aria-disabled` / `data-disabled` reflection. Keeping it inline is fine
  (the contract is richer here), but worth noting to avoid drift if the
  primitive ever changes the data-attr name. Consider one of:
  (a) leave as-is and add a comment; (b) extend `KjDisabled` with an
  optional `effective` signal input so Button can compose it. (a) is
  simpler; (b) is consistent with the architecture rule of composing
  primitives. Pick (a) until a second component (Menu Item, IconButton)
  needs the same effective-disabled pattern, then promote to (b).
- **Loading spinner is wrapper-only.** Core-direct consumers
  (`<button kjButton>` without `<kj-button>`) get `aria-busy` but no visual
  spinner. That's correct (themes own visuals), but document it. When
  `KjSpinner` ships, the wrapper should swap its inline `<span>` for it.
- **Submit-form behaviour with `loading`.** A `<button kjButton type="submit"
  [kjLoading]="busy()">` clicked during loading currently has its click
  suppressed in the capture phase — but the form's native submit may still
  trigger via `Enter` in a form field. Verify that `aria-disabled` on a
  submit button blocks implicit form submission too; if not, also call
  `event.preventDefault()` on the form element's `submit` event when any
  `kjButton[type=submit]` inside it is `effectiveDisabled()`. Open: do we
  want the directive to reach for the form, or push that responsibility to
  a future `KjForm`?
- **Long-press / repeat.** Out of scope. Speed Dial / Stepper-style repeat
  press belongs in those components; Button stays single-press.
- **Link variant + anchor element.** `kjVariant="link"` strips padding and
  underlines. On `<button>` this looks like a link but isn't one — fine for
  visual hierarchy, but document that for actual navigation the `<a kjButton
  kjVariant="link">` form is preferred.
- **Focus restoration after `kjLoading` flips false.** If a button removes
  itself from the DOM while loading (rare but possible — e.g. dialog confirm
  closes the dialog), focus is lost. Caller responsibility, but worth
  noting in docs.
