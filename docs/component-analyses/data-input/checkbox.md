# Checkbox

Reference architecture for the kouji-ui Checkbox — the canonical binary
(checked / unchecked) and tri-state (checked / unchecked / indeterminate)
selection control.

**Already shipped:** headless `KjCheckbox` directive
(`packages/core/src/checkbox/checkbox.ts`) and styled wrapper
`KjCheckboxComponent` (`packages/components/src/checkbox/checkbox.ts`,
`checkbox.css`). This document captures the existing shape, flags concrete
improvements informed by the source comparison, and acts as the reference
architecture for sibling boolean / single-selection controls
(`KjToggle` / `KjSwitch`, `KjRadio` / `KjRadioGroup`).

## Source comparison

- **PrimeNG** — [primeng.org/checkbox](https://primeng.org/checkbox).
  `<p-checkbox>` is a **component** (not an attribute directive). Renders a
  visible custom box and a hidden native `<input type="checkbox">` underneath
  for form interop. Surface area: `[(ngModel)]` / `[formControl]` for the
  bound value, `value` (the value contributed when used in a multi-select
  group), `binary` (boolean mode — toggles `true` / `false` instead of
  contributing to an array), `name`, `inputId`, `disabled`, `readonly`,
  `tabindex`, `variant` (`outlined` / `filled`), `size` (`small` / `large`),
  `indeterminate`, `invalid`, `required`, plus `falseValue` / `trueValue`
  overrides (so a binary checkbox can map to e.g. `'Y'` / `'N'`). `(onChange)`
  emits a custom `CheckboxChangeEvent`. The label slot is **not** projected
  by the component — PrimeNG documents wrapping a `<label>` around a
  `<p-checkbox>` + the label text manually. Indeterminate is a regular
  `[indeterminate]` input bound to the underlying native input. ARIA: native
  `<input type=checkbox>` carries it; PrimeNG sets `aria-checked="mixed"` via
  the indeterminate property pass-through. PrimeNG ships `<p-checkboxGroup>`
  to coordinate multi-checkbox selection into a single value array; the
  group is a thin context that propagates `name`, `disabled`, and the bound
  array model.
- **Angular Material** — [material.angular.dev/components/checkbox](https://material.angular.dev/components/checkbox).
  `<mat-checkbox>` is a **component** that renders a hidden native
  `<input type="checkbox" class="cdk-visually-hidden">` plus a custom SVG
  check mark for the visible box. The native input is the focus target,
  receives keyboard events, and provides the entire ARIA / forms surface
  for free. The wrapper projects content as the visible label and wires
  `<label for="…">` to the native input's auto-minted id. Surface area:
  `[(ngModel)]` / `[formControl]`, `checked`, `indeterminate`,
  `indeterminateChange`, `change` (emits `MatCheckboxChange`), `disabled`,
  `disabledInteractive` (focusable-but-disabled — Material's recent AAA
  improvement), `required`, `name`, `value`, `id`, `aria-label`,
  `aria-labelledby`, `aria-describedby`, `tabIndex`, `color`
  (`'primary' \| 'accent' \| 'warn'`), `labelPosition` (`'before' \| 'after'`),
  `click` action (`'check' \| 'noop'` — opt out of toggle for purely visual
  controlled mode). Click on label propagates to native input via
  `<label for>`. `MAT_CHECKBOX_DEFAULT_OPTIONS` provides app-wide defaults
  (color, click action). No multi-checkbox group — Material's `MatSelectionList`
  fills that role.
- **shadcn/ui** — [ui.shadcn.com/docs/components/checkbox](https://ui.shadcn.com/docs/components/checkbox).
  Wraps `@radix-ui/react-checkbox`. The visible element is a
  `<button type="button" role="checkbox" aria-checked="true|false|mixed">`
  (no native input). A separate, hidden native input is rendered only when
  the component is inside a `<form>` for form-submission compatibility.
  Surface area: `checked` (`true \| false \| 'indeterminate'`),
  `onCheckedChange`, `disabled`, `required`, `name`, `value`, plus pass-through
  `<button>` attributes. The label is a sibling, not a child — consumers
  pair `<Checkbox id="…">` with `<Label htmlFor="…">`. The `onCheckedChange`
  handler returns the new checked state directly; consumers control the
  binding. Tri-state is a first-class union type, not a separate boolean prop.
  The button's `role="checkbox"` plus `aria-checked` is the ARIA contract;
  Space toggles, Enter does not (matches WAI-ARIA Authoring Practices for
  checkbox).

**Pattern picked up.** Today's `KjCheckbox` directive is closest to **Radix /
shadcn**'s shape — a `role="checkbox"` element on an arbitrary host (no native
`<input>`), Space-toggles, `aria-checked` reflection from a signal. The styled
wrapper additionally projects label content beside the box and proxies label
clicks to the box, like Material's projected-label pattern. The source
comparison settles two open decisions:

1. **Custom rendering wins over hidden native input.** kouji's headless model
   is "directive on any element"; mandating a hidden `<input type="checkbox">`
   underneath would force the directive to render DOM, breaking the rule that
   `@kouji-ui/core` is zero-component, directives-only. The Radix-style
   `role="checkbox"` button-on-element model fits the architecture. Form
   interop is delivered by composing `KjFormControl` (already done), not by a
   hidden native input.
2. **Tri-state is first-class — but as two state slots, not a string union.**
   `kjChecked: model<boolean>` (toggleable user state) plus
   `kjIndeterminate: input<boolean>` (programmatic-only). Indeterminate
   overlays checked when `true`. Matches Material's two-prop model and is
   ergonomically simpler than Radix's `boolean | 'indeterminate'` union for
   `[(ngModel)]` users (the form value remains a `boolean`).

## Decision: needs a core directive?

**Yes — already shipped, and this is the canonical example for binary
selection controls.** The directive owns six contracts that have to live in
code, not CSS, and that should be shared across `KjCheckbox`, `KjToggle` /
`KjSwitch`, and (with adaptations) `KjRadio`:

1. **`role="checkbox"` semantics on arbitrary elements.** kouji-style
   "directive on any element" means the host needs `role`, `tabindex`
   readiness, and `aria-checked` reflection from a signal. `KjCheckbox`
   already does the first and the third; `tabindex="0"` is on the consumer
   today (improvement flagged below).
2. **Tri-state `aria-checked`.** Today the host writes
   `[attr.aria-checked]="kjChecked().toString()"`, which yields `'true'` /
   `'false'` only. WAI-ARIA Authoring Practices specifies
   `aria-checked="mixed"` for indeterminate; the directive does not
   currently honour the wrapper's `indeterminate` input. **Improvement
   flagged below** — add `kjIndeterminate` to the core directive and
   compute `aria-checked` as `'mixed' | 'true' | 'false'`.
3. **Space-toggles, Enter does not.** WAI-ARIA's checkbox keyboard
   contract: only Space toggles. `(keydown.space)` is wired with
   `preventDefault()` (avoids page scroll); Enter is correctly ignored.
   Indeterminate must not gate Space — when the user toggles an
   indeterminate checkbox, the directive resolves to `checked = true` and
   `indeterminate = false` (Material's behaviour). Today's `toggle()`
   only flips `kjChecked` — **improvement flagged below**.
4. **`ControlValueAccessor` plumbing** via composed `KjFormControl`. One
   place implements `writeValue` / `registerOnChange` / `registerOnTouched` /
   `setDisabledState` for *every* form input in the library. `KjCheckbox`
   only wires the two host events that bridge user interaction to the CVA
   (`(click)` → `notifyChange`, `(blur)` → `notifyTouched`). This is the
   same shape as `KjInput`.
5. **Disabled handling.** `KjDisabled` host directive reflects
   `aria-disabled` / `data-disabled`; `KjFormControl.disabled()` reflects
   reactive-form-driven disabled. The directive currently *also* writes
   `[attr.disabled]` from `formCtrl.disabled()`, which on a non-`<input>`
   element is meaningless (browsers ignore `disabled` on `<div>` /
   `<span>`). **Improvement flagged below** — drop the native `[attr.disabled]`
   binding; rely on `aria-disabled` plus a click/keydown intercept to
   block interaction (capture-phase, mirroring `KjButton`).
6. **Focus-visible signal** via composed `KjFocusRing` — keyboard-only
   focus ring, no mouse-click halo.

Items 1, 2, 3, 6 are the checkbox-specific behaviour; items 4, 5 are
cross-cutting shared with every form control. None of this is
theme-specific styling, so a directive is correct, and `KjToggle` /
`KjSwitch` should compose the same primitives set (with a different role
and slightly different click semantics).

## Base features

- **Tri-state** — `unchecked` / `checked` / `indeterminate`. Indeterminate
  is **programmatic-only** (a parent component sets it to reflect "some
  but not all children selected"). User interaction (click / Space) on an
  indeterminate checkbox transitions to `checked` and clears
  `indeterminate`, matching Material and Radix. The form value
  (`kjChecked`) is always a `boolean`; indeterminate is a separate visual
  flag.
- **Variants** — *not yet integrated.* Add `KjVariant` via `hostDirectives`.
  Recommended set: `default` / `filled` / `ghost` / `destructive`,
  matching Button / Input. Themes drive via `data-variant`.
- **Sizes** — *partially integrated, in the wrapper only.* The wrapper
  reflects `[attr.data-size]` from `size: 'sm' | 'md' | 'lg'`. **Improvement:**
  promote to a `KjSize` `hostDirective` on the core directive so themes
  can read `data-size` from the directive host (consistent with
  `KjButton`), and so the size primitive is the single source of truth.
  WCAG 2.5.5 (44×44 touch target) drives the `md` minimum for the
  click-region (the box itself can be smaller — see Accessibility).
- **States** — `kjChecked` (model), `kjIndeterminate` (proposed input),
  `kjDisabled` (forwarded), `kjReadonly` (proposed; see Open questions),
  `kjInvalid` (proposed; touched-gated, mirrors `KjInput`), `kjRequired`
  (proposed; reflected as `aria-required`).
- **Slots** — none on the directive itself. The wrapper component
  projects label text via `<ng-content>` into a `<span class="kj-checkbox-label">`
  beside the box. The wrapper's wrapper `<div class="kj-checkbox-inner">`
  proxies clicks from the label area to the box (manually wired today
  with a `(click)` handler — could become `<label for>` if the box is
  given an id and the inner element is a `<label>`; see Open questions).
- **Label & error** — never owned by `KjCheckbox`. The `KjField` family
  (cross-reference [`field.md`](./field.md)) provides label-control
  association, hint, and error slots. Checkbox registers itself with the
  field via `KjFormControl`'s `KJ_FIELD` registration (per the Field
  analysis). The field's `<label kjFieldLabel>` resolves
  `aria-labelledby` to the checkbox via the field context.
- **Group selection (multi-checkbox)** — `KjCheckboxGroup` proposed.
  See [Composition model](#composition-model) and Open questions.

## Accessibility (WCAG 2.1 AAA)

| Concern | Where | Mechanism |
|---|---|---|
| **Role** | core directive (host) | `role="checkbox"` on the host element. The directive applies to non-input elements (today's wrapper uses `<span>`); the role compensates for the missing native semantics. |
| **`aria-checked` tri-state** | core directive (host) | `[attr.aria-checked]="ariaChecked()"` where `ariaChecked = computed(() => kjIndeterminate() ? 'mixed' : (kjChecked() ? 'true' : 'false'))`. **Today** the directive writes `kjChecked().toString()` — yields `'true'` / `'false'` only and ignores `indeterminate`. The wrapper sets `[attr.data-indeterminate]` for CSS but the SR contract is broken. **Improvement.** WCAG 4.1.2. |
| **`data-checked` / `data-indeterminate`** | core directive + wrapper | `data-checked` (already) and `data-indeterminate` (today on wrapper, should be on core directive) for CSS state styling. |
| **`aria-disabled` vs native `disabled`** | core directive | Reflect `aria-disabled` only (via `KjDisabled`). The directive currently also writes `[attr.disabled]` from `formCtrl.disabled()` — meaningless on `<span>` / `<div>` and inconsistent with `KjButton`'s ARIA-disabled stance. **Improvement:** drop the native binding; intercept `click` / `keydown.space` in capture phase when `aria-disabled` is true (mirrors Button). Keep the element focusable so SR users can discover the disabled control (WCAG 2.4.7). |
| **`aria-required`** | core directive | Auto-derive from `Validators.required` on the bound `NgControl` (mirrors Material). When `kjRequired` is set explicitly, the explicit value wins. **Improvement** — not present today. WCAG 3.3.2. |
| **`aria-invalid`** | core directive | `[attr.aria-invalid]="formCtrl.touched() && kjInvalid() ? 'true' : null"`. Touched-gated (matches `KjInput`). **Improvement** — `kjInvalid` not present today. WCAG 3.3.1. |
| **`aria-readonly`** | core directive | When `kjReadonly`, reflect `aria-readonly="true"` and intercept toggle. WAI-ARIA allows `aria-readonly` on `role="checkbox"`. **Improvement** — not present today. |
| **Label association** | consumer / `KjField` / wrapper | Three valid paths: (1) wrapper's `aria-labelledby` from the projected label `<span>`'s id (already wired in the wrapper); (2) consumer's `aria-label` directly on the box element; (3) `KjField` integration when the checkbox is inside a `<div kjField>` — Field provides `aria-labelledby` from the registered `KjFieldLabel`. The wrapper's id-minting today uses a module-scoped counter (`kj-checkbox-${++checkboxIdCounter}`) — works but is **not SSR-stable**. **Improvement:** use the same id strategy as `KjField` (deterministic counter generator) for hydration stability. WCAG 1.3.1 / 4.1.2. |
| **Native `<label for>` vs proxied click** | wrapper | Today the wrapper uses a `<div class="kj-checkbox-inner">` with a `(click)` handler that finds the box and calls `.click()` on it. **Cleaner:** make the inner element a `<label [attr.for]="boxId">` with the box carrying the matching `id`. Browsers natively forward label clicks to the labelled control without JS, including for `role="checkbox"` elements when the label has `for=`. The current proxy works but adds a JS hop and an `eslint-disable-next-line` for the click-without-keyboard rule. **Improvement.** WCAG 1.3.1 / 2.1.1. |
| **Keyboard contract** | core directive | Tab to focus, Space to toggle, Enter ignored (matches WAI-ARIA Authoring Practices: ["Checkbox Pattern"](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/)). Today: Space wired with `preventDefault` (correct — avoids page scroll). Tab order requires `tabindex="0"` on the host; **today's directive does not set `tabindex` automatically** — every consumer must remember. **Improvement:** the core directive should default `tabindex` to `0` via host binding (`'[attr.tabindex]': 'tabIndex()'`), with a `kjTabIndex` input for opt-out (`-1` for "in a roving group"; see `KjCheckboxGroup` follow-up). WCAG 2.1.1 / 2.4.3. |
| **Focus-visible** | core directive (host) | `KjFocusRing` composed via `hostDirectives`; `data-focus-visible` attribute on keyboard focus. Wrapper CSS targets `:focus-visible` on `.kj-checkbox-box` for the outline. WCAG 2.4.7. |
| **Touch target ≥ 44×44** | wrapper CSS | The visible box is 16px (`md`) — well below 44px. WCAG 2.5.5 AAA requires the **interactive target** to be ≥ 44×44. The cleanest fix: the inner `<label>` (or `<div>` proxy today) carries the click region, with adequate padding around the box + label so the combined hit area exceeds 44×44 on its shortest axis. Today's wrapper does not enforce this — the click region is "the inner div's natural bounds", which on short labels can fall under 44×44. **Improvement:** add `min-block-size: 2.75rem` and `padding-block: var(--kj-space-xs)` on `.kj-checkbox-inner`, or a transparent `::before` extension on the box element extending the hit region. Material does the latter (a 40px-by-40px ripple container around the 16px box). WCAG 2.5.5. |
| **Color/contrast** | themes layer | `--kj-color-primary` against `--kj-color-base-100` for the checked-fill must meet ≥ 7:1 (AAA). The check mark glyph (`✓` today) against `--kj-color-primary-content` likewise. Theme tokens already pair these; the contract belongs in the theme spec. The unchecked border (`--kj-color-neutral` today) only needs UI-component contrast (3:1 vs base) per WCAG 1.4.11. |
| **Indeterminate visual** | wrapper CSS | A horizontal bar (`width: 60%; height: 2px;`) inside the box, styled identically to the check colour. Already implemented. The bar should **not rotate or animate on `prefers-reduced-motion`** if a theme adds a transition. WCAG 2.3.3. |
| **Click action override** | core directive | Material exposes `click` action `'check' \| 'noop'` for purely-controlled use cases (the consumer wants to inspect the click event and decide). **Recommendation: ship `kjClickAction`** as an input (defaults to `'check'`); `'noop'` keeps `aria-checked` in sync from the model only and lets the consumer call `.toggle()` (or set the model) externally. Useful for confirm-dialog gating. |
| **`aria-describedby` chain** | inner control via `KjAriaDescribedBy` | Hint and error ids registered with the parent `KjField` flow onto the checkbox via the same mechanism as `KjInput`. See [`field.md`](./field.md). |
| **Group `aria-checked="mixed"`** | `KjCheckboxGroup` (proposed) | The group host can carry `role="group"` (or `role="checkbox" aria-checked="mixed"` if exposed as a master checkbox). Document both patterns in the group analysis. WCAG 1.3.1. |

**Where each piece lives.** `aria-checked` / `aria-disabled` / `aria-required` /
`aria-invalid` / `aria-readonly` / `data-*` state reflections are on the
**core directive**. Label association (`aria-labelledby`) is delivered by the
**wrapper** (and by `KjField` when wrapped). The keyboard contract
(Space toggles, Enter ignored) and disabled-interception are on the **core
directive**. Touch-target sizing is on the **wrapper CSS** (and on themes).

## Composition model

**Single root attribute directive (`KjCheckbox`).** No children at the
single-checkbox level — Checkbox is a leaf control. Existing primitives are
composed through `hostDirectives`:

```ts
hostDirectives: [
  { directive: KjDisabled, inputs: ['kjDisabled'] },
  KjFocusRing,
  KjFormControl,
],
```

**Proposed additions** (mirroring `KjButton` / `KjInput`):

```ts
hostDirectives: [
  { directive: KjVariant,  inputs: ['kjVariant'] },
  { directive: KjSize,     inputs: ['kjSize'] },
  { directive: KjDisabled, inputs: ['kjDisabled'] },
  KjFocusRing,
  KjFormControl,
],
providers: [...bindPresets(KJ_CHECKBOX_CONFIG)],
```

…with a new `KJ_CHECKBOX_CONFIG` token + `provideKjCheckbox()` helper exactly
mirroring `KJ_BUTTON_CONFIG` / `provideKjButton()`. Default presets:

```ts
KJ_CHECKBOX_DEFAULTS = {
  variants: ['default', 'filled', 'ghost', 'destructive'],
  sizes:    ['sm', 'md', 'lg'],
  defaults: { variant: 'default', size: 'md' },
};
```

### Optional sibling: `KjCheckboxGroup`

```text
checkbox/
  checkbox.ts            ← KjCheckbox
  checkbox-group.ts      ← KjCheckboxGroup (root)
  checkbox.context.ts    ← KjCheckboxGroupContext + KJ_CHECKBOX_GROUP token
  checkbox.spec.ts
  index.ts
```

`KjCheckboxGroup` is an **opt-in** wrapper for multi-checkbox selection
into an array model. It is **not required** for individual checkboxes —
binary checkboxes with `[(ngModel)]` / `[formControl]` work standalone via
`KjFormControl`. The group exists to deliver three things a single
checkbox can't:

1. **Array-model binding.** `kjValue` on each child checkbox contributes
   to a `string[]` (or other primitive[]) on the group when checked.
   Mirrors PrimeNG's `<p-checkboxGroup>` and HTML's
   `name="…"`-on-multiple-checkboxes form-submission semantics.
2. **Group `aria-checked="mixed"` master pattern.** When some-but-not-all
   children are checked, the group host (or a designated "master"
   checkbox inside the group) reflects `aria-checked="mixed"`. Toggling
   the master sets all children to `true` (when none / mixed) or `false`
   (when all). This is the canonical "select all" pattern.
3. **`aria-required` / `aria-disabled` propagation.** Group-level
   disabled / required on the wrapping element, propagated to each
   child via the context.

Context shape:

```ts
export interface KjCheckboxGroupContext {
  /** Current array of selected values. */
  readonly value: Signal<readonly unknown[]>;
  /** Whether the group is disabled (overrides per-child unless explicitly set). */
  readonly disabled: Signal<boolean>;
  /** Master state: 'all' | 'none' | 'mixed' — drives aria-checked on a master checkbox or the group host. */
  readonly masterState: Signal<'all' | 'none' | 'mixed'>;

  /** Called by KjCheckbox children that opt into the group via `kjValue`. */
  registerChild(args: {
    valueGetter: () => unknown;
    checked: WritableSignal<boolean>;
  }): { deregister: () => void };

  /** Toggle a child's contribution. */
  setChecked(value: unknown, checked: boolean): void;

  /** Master toggle: set all → unset all (or mixed → all). */
  toggleAll(): void;
}

export const KJ_CHECKBOX_GROUP =
  new InjectionToken<KjCheckboxGroupContext>('KjCheckboxGroup');
```

Group host:

```ts
@Directive({
  selector: '[kjCheckboxGroup]',
  standalone: true,
  providers: [{ provide: KJ_CHECKBOX_GROUP, useExisting: KjCheckboxGroup }],
  hostDirectives: [
    { directive: KjDisabled, inputs: ['kjDisabled'] },
    KjFormControl,
  ],
  host: {
    'role': 'group',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-state]': 'masterState()',
  },
})
export class KjCheckboxGroup implements KjCheckboxGroupContext { /* … */ }
```

The child `KjCheckbox` injects `KJ_CHECKBOX_GROUP` optionally; when
present it routes `toggle()` through `setChecked(value, !checked)`
instead of through its own `formCtrl.notifyChange(...)`.

A "master" checkbox inside the group is just another `KjCheckbox` with
`kjMaster="true"` (a marker input); it ignores its own value
contribution and toggles the group via `ctx.toggleAll()`. Its own
`aria-checked` reflects `ctx.masterState()` ('all' → `'true'`,
'none' → `'false'`, 'mixed' → `'mixed'`).

### Cross-component pointers

- **[`field.md`](./field.md)** (`KjField` / `KjFieldLabel` / `KjFieldHint` /
  `KjFieldError`) — the label + hint + error wrapper. `KjCheckbox` is meant
  to slot inside it for form-row layouts. Per the Field analysis, the
  checkbox registers via `KjFormControl`'s `KJ_FIELD` registration; the
  field's `<label kjFieldLabel>` uses the `aria-labelledby` strategy
  (because `<label for>` doesn't apply to a `role="checkbox"` host element
  the way it does to a native `<input>`). For a single checkbox, however,
  the Field-style label is often redundant — the wrapper's own
  next-to-the-box label is the canonical placement (Material's pattern).
  Field becomes useful when you need a hint or error message: `<div
  kjField><kj-checkbox>…</kj-checkbox><span kjFieldHint>…</span><span
  kjFieldError>…</span></div>`.
- **[`form.md`](./form.md)** — the higher-level form orchestrator. A
  Checkbox inside a Form participates in cross-field validation and
  submit gating exactly like any other `KjFormControl`-backed control.
  Nothing checkbox-specific.
- **[`input.md`](./input.md)** — sibling form control. Compares the
  text-input variant of the same `hostDirectives` set
  (`KjFormControl` + `KjFocusRing` + `KjDisabled` + proposed
  `KjVariant` / `KjSize`). The improvements flagged on Input
  (`KJ_*_CONFIG` token, `provideKj*` helper, `KjVariant` / `KjSize`
  integration, `aria-required` derivation, capture-phase intercept of
  disabled interactions) translate one-for-one to Checkbox.
- **`actions/toggle.md`** / **`actions/switch.md`** (`KjToggle` /
  `KjSwitch`) — the closest sibling. Toggle and Switch are also binary
  controls but with **different UX semantics**: Switch represents an
  "on/off setting that takes effect immediately" (e.g. enable
  notifications), while Checkbox represents "selection that is
  applied later" (e.g. accept terms before submit). The ARIA roles
  differ (`role="switch"` vs `role="checkbox"`); keyboard contract is
  the same (Space toggles, Enter ignored). They share `KjFormControl` /
  `KjDisabled` / `KjFocusRing` and most of the host bindings — the
  difference is the role and the visual (a sliding thumb vs a check
  mark). Same `KJ_TOGGLE_CONFIG` / `KJ_CHECKBOX_CONFIG` shape.
  No tri-state on Switch (no `aria-checked="mixed"` on `role="switch"`
  per WAI-ARIA — switches are strictly binary).
- **`data-input/radio.md`** (`KjRadio` / `KjRadioGroup`) — the related
  *grouped* selection pattern. Radio enforces single-selection within
  a group; Checkbox group allows multiple. Differences:
  (a) `role="radio"` + `role="radiogroup"` (Radio) vs `role="checkbox"` +
  optional `role="group"` (Checkbox group);
  (b) **roving tabindex** on radios (only the selected radio is in the
  tab order; arrow keys navigate within the group) vs **every checkbox
  is independently tabbable**;
  (c) Arrow keys move selection on Radio; Arrow keys do nothing on
  Checkbox.
  Radio's group is mandatory (a lone radio doesn't make sense);
  Checkbox's group is optional. The two share the
  `KjFormControl` plumbing and the focus-ring / disabled primitives,
  but the keyboard contract diverges. Document the divergence in
  Radio's analysis explicitly.
- **`primitives/forms/form-control.ts`** — the shared CVA primitive.
  Checkbox composes it via `hostDirectives` exactly like Input. The
  Checkbox uses `formCtrl.value` as a `boolean` (cast on read);
  document the contract: when wired to Angular forms, the bound value
  must be `boolean` (or `null` / `undefined` for "no model
  yet" — treated as `false` for display).
- **`a11y/aria-describedby.ts`** — `KjAriaDescribedBy` applies the
  composed id chain from `KjField`. Reused unchanged.
- **`primitives/interaction/disabled.ts`** — `KjDisabled` reflects
  `aria-disabled` / `data-disabled`. Reused unchanged. Capture-phase
  intercept of click / keydown when disabled is **a Checkbox-side
  responsibility** (not the `KjDisabled` directive's), exactly as it
  is on `KjButton`.

## Inputs / Outputs / Models — `kj`-prefixed

### Core directive (`KjCheckbox`, selector `[kjCheckbox]`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjChecked` | `model` | `boolean` | `false` | Two-way bindable. Form value when wired to `[(ngModel)]` / `[formControl]`. |
| `kjIndeterminate` | *(proposed)* `input` | `boolean` | `false` | Programmatic-only. User toggle on indeterminate clears it and sets `kjChecked = true`. Reflected as `aria-checked="mixed"` and `data-indeterminate=""`. |
| `kjValue` | *(proposed)* `input<unknown>` | `undefined` | When inside `KjCheckboxGroup`, this value contributes to the group's array model on check. Ignored when no group. |
| `kjDisabled` | forwarded via `hostDirectives` to `KjDisabled` | `boolean` | `false` | Reflects `aria-disabled` / `data-disabled`. Today *also* triggers native `disabled` via `formCtrl.disabled()` — drop the native binding (see Open questions). |
| `kjReadonly` | *(proposed)* `input` | `boolean` | `false` | Reflects `aria-readonly`; intercepts toggle. |
| `kjInvalid` | *(proposed)* `input` | `boolean` | `false` | Reflects `aria-invalid` / `data-invalid` only when `formCtrl.touched()` is true. Mirrors `KjInput`. |
| `kjRequired` | *(proposed)* `input` | `boolean` | `false` | Reflects `aria-required`. Auto-derived from `Validators.required` when an `NgControl` is bound. |
| `kjVariant` | *(proposed)* forwarded to `KjVariant` | string | `'default'` (from `KJ_CHECKBOX_CONFIG`) | Validated against preset list. |
| `kjSize` | *(proposed)* forwarded to `KjSize` | string | `'md'` (from `KJ_CHECKBOX_CONFIG`) | Validated against preset list. |
| `kjTabIndex` | *(proposed)* `input` | `number` | `0` | Allows `-1` opt-out for grouped / roving-tabindex contexts. Reflected as `[attr.tabindex]`. |
| `kjClickAction` | *(proposed)* `input` | `'check' \| 'noop'` | `'check'` | Material parity. `'noop'` lets consumers handle clicks externally without auto-toggle. |
| `kjMaster` | *(proposed, group-only)* `input` | `boolean` | `false` | Marks this checkbox as the "select-all master" of the enclosing `KjCheckboxGroup`. `aria-checked` reflects `ctx.masterState()`. |
| `kjAriaLabel` | `aria-label` (native) | `string` | `undefined` | Native attribute, not directive input. Required when no projected label and no `KjField` parent. |

The directive has **no `(kjCheckedChange)` output beyond what `model` emits**. Bidirectional value flow goes through `KjFormControl` — there is no `kjValue` / `kjValueChange` shape (the existing `kjValue` *input* above is the multi-select group contribution, not the bound value).

All `kj`-prefixed names follow shape (A) — property name carries the prefix — since the directive selector already starts with `kj`.

### Wrapper component (`KjCheckboxComponent`, selector `kj-checkbox`)

Re-exposes the directive's surface plus structural props:

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjChecked` | `model<boolean>` *(currently `checked`)* | `boolean` | `false` | Forwarded to `KjCheckbox.kjChecked`. **Rename** — `checked` violates the `kj` prefix rule. |
| `kjIndeterminate` | `input<boolean>` *(currently `indeterminate`)* | `boolean` | `false` | Forwarded. **Rename.** |
| `kjDisabled` | `input<boolean>` *(currently `disabled`)* | `boolean` | `false` | Forwarded. **Rename.** |
| `kjSize` | `input<'sm' \| 'md' \| 'lg'>` *(currently `size`)* | `'md'` | Forwarded. **Rename.** |
| `kjInvalid` | *(proposed)* `input<boolean>` | `false` | Forwarded. |
| `kjRequired` | *(proposed)* `input<boolean>` | `false` | Forwarded. |
| `kjReadonly` | *(proposed)* `input<boolean>` | `false` | Forwarded. |
| `kjVariant` | *(proposed)* `input` | `'default'` | Forwarded. |
| `kjValue` | *(proposed)* `input<unknown>` | `undefined` | Forwarded; only meaningful when inside a `KjCheckboxGroup`. |
| `kjLabelPosition` | *(proposed)* `input<'before' \| 'after'>` | `'after'` | Where the label sits relative to the box. Material parity. Reflected as `data-label-position`. |
| `kjAriaLabel` | *(proposed)* `input<string \| undefined>` | `undefined` | Forwarded as `aria-label` on the box. Required when `<ng-content>` is empty. |

**Existing wrapper inputs are NOT `kj`-prefixed** (`checked`, `indeterminate`, `disabled`, `size`). Per `rules/code_style.md` §"Inputs, Outputs, and Models — `kj` prefix is mandatory", these names violate the rule. Renaming them is a breaking change (exercised by the example files at `packages/components/src/checkbox/checkbox.*.example.ts`). **Improvement flagged.**

### `KjCheckboxGroup` (proposed, selector `[kjCheckboxGroup]`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjGroupValue` | `model<readonly unknown[]>` | `[]` | Two-way bindable; the array of selected child values. |
| `kjGroupDisabled` | `input<boolean>` | `false` | Propagated to children via context. |
| `kjGroupRequired` | `input<boolean>` | `false` | Reflected as `aria-required` on the group host; propagated. |
| `kjGroupName` | `input<string \| undefined>` | `undefined` | For native form-submission compat (when used with a native `<form>`); applied to each child's `name` attribute. |
| `kjGroupOrientation` | `input<'vertical' \| 'horizontal'>` | `'vertical'` | Layout only; reflected as `data-orientation`. |

## Examples to ship

Match the structure under `packages/components/src/checkbox/`. **Existing**
files: `checkbox.default.example.ts`, `checkbox.checked.example.ts`,
`checkbox.indeterminate.example.ts`, `checkbox.disabled.example.ts`. The
existing examples bind `[(checked)]` — they need updating once the
`kj`-prefix rename ships.

1. **Default** — `checkbox.default.example.ts` *(exists)*. Single
   unchecked checkbox.
2. **Checked** — `checkbox.checked.example.ts` *(exists)*. Single
   pre-checked checkbox.
3. **Indeterminate** — `checkbox.indeterminate.example.ts` *(exists)*.
   Programmatically indeterminate with a "child A / child B" pair below
   that drive its state. Update once `kjIndeterminate` reflects
   `aria-checked="mixed"` (today's wrapper sets `data-indeterminate` for
   CSS but leaves the SR contract broken).
4. **Disabled** — `checkbox.disabled.example.ts` *(exists)*. Disabled
   off + disabled on side-by-side.
5. **Variants** — `checkbox.variants.example.ts` *(new, gated on
   `KjVariant` integration)*. `default` / `filled` / `ghost` /
   `destructive` side-by-side.
6. **Sizes** — `checkbox.sizes.example.ts` *(new)*. `sm` / `md` / `lg`.
   Verify each meets WCAG 2.5.5 click-region floor.
7. **Reactive form** — `checkbox.reactive.example.ts` *(new)*. Bound
   to `FormControl<boolean>(false, [Validators.requiredTrue])`, with a
   `kjFieldError` for "must accept terms". Demonstrates touched-gated
   `aria-invalid`.
8. **Template-driven form** — `checkbox.ngmodel.example.ts` *(new)*.
   Same as above with `[(ngModel)]`.
9. **In a field** — `checkbox.field.example.ts` *(new, gated on
   `KjField` rename)*. Checkbox inside `<div kjField>` with
   `<label kjFieldLabel>` + `<span kjFieldHint>` + `<span kjFieldError>`.
   Demonstrates the `aria-labelledby` strategy (Field detects
   non-`<input>` control and uses labelledby instead of `for=`).
10. **Group** — `checkbox.group.example.ts` *(new, gated on
    `KjCheckboxGroup`)*. A list of preferences, with `[(kjGroupValue)]`
    bound to `string[]`.
11. **Group with master "select all"** — `checkbox.group.master.example.ts`
    *(new)*. The select-all checkbox uses `kjMaster="true"` and reflects
    `aria-checked="mixed"` when partial.
12. **Label position** — `checkbox.label-position.example.ts` *(new)*.
    `kjLabelPosition="before"` (label on the left).
13. **`'noop'` click action** — `checkbox.noop.example.ts` *(new)*.
    The wrapper intercepts the click, opens a confirm dialog, and only
    sets `kjChecked` after the user confirms.

## Open questions / risks

1. **`aria-checked="mixed"` on the core directive.** Today the directive
   binds `[attr.aria-checked]="kjChecked().toString()"` — yields only
   `'true'` / `'false'`. The wrapper exposes `indeterminate` and writes
   `data-indeterminate` for CSS, but the SR contract is broken (a
   tri-state checkbox announced as "checkbox, not checked" instead of
   "checkbox, mixed"). **Decision: add `kjIndeterminate` to the core
   directive and compute `aria-checked` as
   `'mixed' | 'true' | 'false'`.** Single-line fix; no breaking change
   if `kjIndeterminate` defaults to `false`. Spec at
   `packages/core/src/checkbox/checkbox.spec.ts` adds two tests
   (`aria-checked='mixed'` reflection, "Space on indeterminate clears it
   and sets checked").

2. **`kj` prefix on the wrapper inputs.** Currently `checked`,
   `indeterminate`, `disabled`, `size` — should be `kjChecked`,
   `kjIndeterminate`, `kjDisabled`, `kjSize` per `rules/code_style.md`.
   Breaking change (the four `*.example.ts` files reference the old
   names). **Decision: rename now**, before more sibling boolean controls
   (`KjToggle`, `KjSwitch`, `KjRadio`) crystallise the wrong shape. Same
   call as the Input analysis made.

3. **Drop the native `[attr.disabled]` binding.** The directive currently
   writes `[attr.disabled]="formCtrl.disabled() ? '' : null"`. On a
   `<span>` / `<div>` (the wrapper today, and any consumer's host) this
   attribute is meaningless — browsers don't honour `disabled` on
   non-form-control elements. The `aria-disabled` reflection (via
   `KjDisabled`) is the correct path. **Decision: drop the native
   binding; add a capture-phase intercept on `(click)` and
   `(keydown.space)` that calls `event.preventDefault()` +
   `event.stopImmediatePropagation()` when `aria-disabled` is true.**
   Mirrors `KjButton`. Keeps the element focusable for SR
   discoverability (WCAG 2.4.7). Material's recent
   `disabledInteractive` opt-in supports this exact stance — adopt as
   the *default*, not an opt-in (matches kouji's existing AAA stance for
   actions).

4. **Tri-state user-interaction semantics.** When the user clicks an
   indeterminate checkbox, what's the next state? Material: `checked =
   true, indeterminate = false` (ignores prior `checked`). Radix: same.
   PrimeNG: same. **Decision: same — `toggle()` always resolves
   indeterminate to `checked = true` and clears indeterminate.** Today's
   `toggle()` doesn't touch indeterminate; **improvement.** The
   indeterminate input is one-way (no `[(]`) since the user can never
   set it to `true` — the parent component owns it.

5. **`KjCheckboxGroup` — ship now or defer?** Single checkboxes work
   standalone today; the group is purely additive. The "select all
   master" pattern is the most-asked-for missing feature in checkbox
   libraries (Material doesn't ship it; PrimeNG does; daisyUI does).
   **Recommendation: ship as a follow-up after the prefix rename and
   tri-state fixes land.** The context shape is straightforward and
   doesn't block any single-checkbox improvements.

6. **`<label for>` vs the `(click)` proxy in the wrapper.** Today the
   wrapper wraps everything in a `<div>` with a manual `(click)`
   handler that calls `.click()` on the box. **Cleaner:** make the
   wrapper element a `<label [attr.for]="boxId">` and the box a
   `<span id="boxId" kjCheckbox>`. Browsers natively forward label
   clicks to the labelled control via the `for` attribute *for any
   element*, not just `<input>` — verified in Chrome / Firefox /
   Safari for `role="checkbox"` elements. Removes the
   `eslint-disable-next-line @angular-eslint/template/click-events-have-key-events`
   line and the `viewChild` wiring. **Recommendation: switch to
   `<label for>`** in the wrapper. Verify SR behaviour (NVDA, JAWS,
   VoiceOver) — should be identical or better, since SR treats
   `<label for>` as the canonical labelling mechanism.

7. **SSR-stable id generation.** The wrapper's
   `kj-checkbox-${++checkboxIdCounter}` is module-scoped — works when
   the module is loaded once per render, but unstable across
   server-then-client when chunk loading order differs. **Decision:
   replace with the same id generator the `KjField` analysis specifies
   (per-package counter via a singleton service or
   `ɵɵresetIdCounter`-style hook).** Also: when a `KjField` parent is
   present, defer to the field's id-minting path entirely (the field
   owns the id, the checkbox accepts it).

8. **`indeterminate` input and `Validators.requiredTrue`.** A common
   "accept terms" checkbox uses `Validators.requiredTrue`. When that
   validator is in play, `indeterminate` must not satisfy it (the
   form value remains `false` until the user actually checks).
   Confirmed: `kjChecked` is the form value; indeterminate is purely
   visual. Document.

9. **Touch target enforcement.** Today the visible box is 16px (`md`)
   and the click region is "the inner div's natural bounds" — which
   on short labels can fall under 44×44. **Decision:** add
   `min-block-size: 2.75rem` and adequate padding on the click
   region in the wrapper CSS so the **md** size always meets WCAG
   2.5.5 AAA. The `sm` size (14px box) is allowed to fall below 44px
   *only* when the consumer opts in (e.g. dense table cells); document
   `kjSize="sm"` as an explicit accessibility-trade-off opt-out, not
   the default.

10. **Disabled-and-checked vs disabled-and-unchecked colour.** The
    wrapper today applies `opacity: 0.45` to the whole inner element
    when disabled. For checked-disabled, the `--kj-color-primary` fill
    plus 0.45 opacity may dip below the 3:1 UI-component contrast
    floor against `--kj-color-base-100`. **Verify per theme.** Either
    bump the disabled opacity floor or use a separate disabled-fill
    token.

11. **`aria-required` on a non-required checkbox group.** Some
    `Validators.requiredTrue` setups want only the group-level marker
    (one `*` on the field label, not `*` on each child). When the
    field's `KjFieldRequired` is set, the per-child `aria-required`
    on the checkboxes should still reflect each child's own
    validators. Document the orthogonality.

12. **Group `role="group"` vs `role="checkbox" aria-checked="mixed"`
    on the group host.** Two valid patterns. Group-role-only: the
    group is purely organisational, each checkbox stands alone for
    SR. Master-checkbox-on-group: the group host *itself* announces
    as a tri-state checkbox (the "select all" master). The former
    is the safer default; the latter is the daisyUI / PrimeNG
    pattern. **Recommendation: support both — group host defaults to
    `role="group"`; consumer adds `kjMaster` to the group itself
    (not to a child) to switch to the master pattern.** Document.

13. **Keyboard contract divergences.** kouji's checkbox does *not*
    handle Enter (correct per WAI-ARIA). Some consumers reflexively
    test for Enter (because forms commonly submit on Enter). Decision:
    **don't toggle on Enter**, but document loudly. Adding Enter
    breaks form-submission flow (Enter inside a form should submit,
    not toggle a checkbox).

14. **`(click)` on a disabled checkbox bubbling out.** Without the
    capture-phase intercept, a disabled checkbox's click can still
    bubble up and trigger surrounding handlers (e.g. closing a
    dropdown). The intercept (item 3) fixes this. Confirm with a test.

15. **`prefers-reduced-motion` and the indeterminate / checked
    transition.** The wrapper CSS has a `transition: var(--kj-transition)`
    on the box. For users with reduced motion, the box should snap
    instantly between states. Themes must respect
    `@media (prefers-reduced-motion: reduce)`. Document as a hard
    requirement; lint rule if feasible. WCAG 2.3.3.

16. **`KjFormControl` value type for checkbox.** `KjFormControl.value`
    is `unknown`; the checkbox treats it as `boolean`. Document the
    contract: the bound value must be `boolean | null | undefined`
    (null / undefined → treated as `false` for display). For
    array-model-via-`KjCheckboxGroup`, the *group's* `KjFormControl`
    holds `readonly unknown[]`; each child's `KjFormControl` is
    redirected (via the group context) to contribute / remove values
    from the array.

17. **`aria-controls` on a master checkbox.** The "select all"
    master checkbox can semantically reference the IDs of the
    checkboxes it controls via `aria-controls`. Most SRs ignore
    this for checkboxes (it's more meaningful for `aria-haspopup`),
    but it's not wrong. **Decision: don't auto-wire `aria-controls`**
    on the master — adds complexity for negligible SR benefit.
    Document as a manual opt-in (consumers can set it on the master
    checkbox host directly if they care).

18. **Native form submission for `KjCheckboxGroup`.** In Radix /
    shadcn, a hidden native `<input type="checkbox" name="…"
    value="…">` is rendered for each checkbox so the group submits
    correctly with a plain `<form>`. kouji is Angular-forms-first;
    native form submission is not the primary use-case. **Decision:
    don't render hidden inputs by default.** Provide
    `kjNativeSubmit="true"` on the group as an opt-in escape hatch
    when needed. Document.
