# Input Group

A wrapper that joins an inner `KjInput` (or any text-shaped form control) with
prefix and/or suffix addons — icons, plain text, or buttons — into a single
visually-unified control. Renders as one rounded box with a shared border and
a single focus ring that lights up when the inner input takes focus, regardless
of which sub-element the consumer is pointing at.

```
[ $ ][_____ amount _____][ .00 ]   ← text addons
[ 🔍][_____ search _____][ Go  ]   ← icon prefix + button suffix
[ https:// ][__ slug __][ .com ]   ← multi-text addons
```

Cross-references:
- [`input.md`](./input.md) — the wrapped element. `KjInput` keeps zero
  awareness of grouping; the group reaches *into* the input via context, not
  the other way around.
- [`field.md`](./field.md) — `KjFormField` owns label + error wiring. Input
  Group is **inside** Field (`<div kjFormField><label kjFormLabel>Amount</label>
  <div kjInputGroup>…</div><span kjFormError>…</span></div>`). Field-level
  invalid state is consumed by the group via `KJ_FORM_FIELD` to colour the
  shared border.
- [`number-input.md`](./number-input.md), [`password-input.md`](./password-input.md),
  [`textarea.md`](./textarea.md) — sibling text-shaped controls that may be
  wrapped by `KjInputGroup` exactly the same way. The group is control-agnostic;
  it relies only on `KjFormControl` (focus + disabled signals) being present
  on the inner field.
- [`actions/button.md`](../actions/button.md) — a button addon is just a
  `[kjButton]` placed inside a `[kjInputGroupAddon]`. The group propagates
  `KjVariant` and `KjSize` to the button so it visually aligns with the
  input.

## Source comparison

### PrimeNG — `p-inputgroup` + `p-inputgroupaddon`, `p-iconfield` + `p-inputicon`

PrimeNG ships **two** orthogonal wrappers:

- **`p-inputgroup`** is a flex container `<div class="p-inputgroup">` whose
  CSS collapses internal radii so the input and any `<p-inputgroupaddon>` (or
  `<button pButton>`) siblings render as one. Addons are **siblings outside
  the input**, not inside it. The group has no role, no state, no API surface
  beyond content projection. PrimeNG users wrap an `<input pInputText>`,
  optionally between/around `<p-inputgroupaddon>$</p-inputgroupaddon>` for
  text addons or `<button pButton icon="…">` for action addons. Focus styling
  is achieved by CSS sibling selectors targeting `:focus-within` on the
  wrapper.
- **`p-iconfield`** is the icon-only flavour: `<p-iconfield iconPosition="left">
  <p-inputicon class="pi pi-search" /><input pInputText /></p-iconfield>`. It
  exists separately because the visual treatment differs — the icon is
  **inside** the input box (absolute-positioned over padded space) rather than
  beside it. PrimeNG keeps these distinct: addon = box-adjacent; icon = inside
  the input's own box.

PrimeNG addons inherit the input's height by CSS rather than a shared size
token. There is no programmatic propagation of variant/size from the group;
each child owns its own appearance.

### Angular Material — `<mat-form-field>` with `matPrefix` / `matSuffix`

Material has **no first-class input group** — the form field is the wrapper.
Inside `<mat-form-field appearance="outline">`, content projection via
`matPrefix` / `matSuffix` (and the newer `matIconPrefix` / `matTextPrefix`
/ `matIconSuffix` / `matTextSuffix` for finer alignment) places addons
**inside** the form field's outline. The form field owns the focus ring
(`:focus-within` + Material's underline/outline animation), the floating
label, the hint/error region, and the prefix/suffix slots — one box, all
concerns. `mat-icon-button` placed in `matSuffix` is a common action-addon
recipe (e.g., password visibility toggle, clear button). Material does *not*
expose appearance variants on the prefix/suffix directives themselves;
they inherit from the form field's `appearance` and the input's typography.

This conflates two concerns kouji separates: **label/error wrapping**
(`KjFormField`) and **visual unification with addons** (`KjInputGroup`).
Material's choice is ergonomic for its single supported style; ours is
deliberate to let consumers compose without forcing a label.

### shadcn/ui — `<InputGroup>`, `<InputGroupAddon>`, `<InputGroupInput>`, `<InputGroupButton>`, `<InputGroupText>`

The newest shadcn pattern. A flex wrapper plus several sibling primitives:
`<InputGroupAddon align="inline-start">` (positions the slot), an explicit
`<InputGroupInput>` wrapper around the native `<input>` (so the group can
remove the input's native border and own the unified one), `<InputGroupButton>`
(a `Button` variant pre-styled to fit the addon slot), and `<InputGroupText>`
(plain-text addon with muted-foreground colour). Focus ring lives on the
**group**, applied via `:focus-within` and Tailwind's `has-[…]:` selectors.
The `InputGroup` carries `data-slot="input-group"` and forwards `aria-*`
through to the input where appropriate; ARIA semantics are otherwise
inherited from the inner input.

shadcn's most useful idea: **opt-in addon directive** (`<InputGroupAddon>`)
rather than auto-styling whatever sibling appears. This makes participation
intentional and allows non-addon children (a hidden tooltip trigger, a
helper-popover) to coexist without breaking the visual unity.

## Decision: needs a core directive?

**Yes — a small one.** Forces:

1. **Focus-ring delegation.** When the inner input gains focus, the *group's*
   border must light up — not the input's. CSS `:focus-within` covers most
   cases, but kouji's `KjFocusRing` is JS-driven (keyboard-only via
   `:focus-visible` semantics, with pointerdown suppression) and lives on the
   focused element. Re-implementing keyboard-only focus tracking on a wrapper
   via pure CSS regresses to `:focus-within` (which fires for mouse focus too)
   and breaks parity with `KjButton` / `KjInput`. We need to **forward** the
   inner input's `KjFocusRing.focusVisible()` signal up to the group.
2. **Disabled / invalid propagation.** The group's border colour reflects the
   inner input's `disabled` and (touched-gated) `invalid` state. We can read
   those from `KjFormControl` via context, but only if the group can reach
   into the input.
3. **Variant / size propagation.** A `kjVariant="filled"` group must produce a
   filled-look input *and* filled-look addon buttons, with consistent size.
   Since `KjInput` and `KjButton` already expose `KjVariant` / `KjSize` via
   `hostDirectives`, the group needs a context the children read as a
   fallback when their own variant/size are unset. Same pattern as
   `KjButtonGroup` (button-group.md §"Variant override forwarding").
4. **Addon role/aria.** Decorative icon addons need `aria-hidden="true"`;
   text addons should be linkable via `aria-labelledby` from the input. A
   directive on the addon is the clean place to set those defaults (and let
   consumers override).

A pure CSS layout would force consumers to hand-wire `aria-hidden`,
`aria-labelledby`, focus tracking, variant cascading, and disabled
propagation on every use. The directive cost is low: one root context
provider plus one tiny addon directive (~20 lines).

## Base features

- **Composition** — root `KjInputGroup` (provides context) + addon marker
  `KjInputGroupAddon`. Inner input is any `[kjInput]` (or sibling control:
  `KjNumberInput`, `KjPasswordInput`, `KjTextarea`). No `KjInputGroupInput`
  wrapper component is required — `KjInput` already plays the right role
  because it composes `KjFormControl` and `KjFocusRing`, which the group
  reads via `contentChild(KjInput, { descendants: true })`.
- **Visual unity** — the wrapper package strips the inner input's own border
  and applies one shared border to the group host (`@kouji-ui/components`
  CSS concern). The headless directive only needs to *signal* that the input
  is grouped, via a `data-grouped` attribute the input reads from
  `KJ_INPUT_GROUP` context (so its CSS can opt out of its own border). See
  **Open questions** for the alternative pure-CSS approach.
- **Position** — `[kjInputGroupAddon]` accepts `kjPosition="start" | "end"`,
  defaulting to **inferred from DOM order** (an addon before the input is
  start, after is end). Explicit `kjPosition` overrides the inference for
  unusual layouts. Matches shadcn's `align="inline-start" | "inline-end"`.
- **Addon kinds** — three recipes, no separate directives:
  - **Icon addon** — `<span kjInputGroupAddon><kj-icon name="search"
    aria-hidden="true" /></span>`. Decorative.
  - **Text addon** — `<span kjInputGroupAddon>$</span>`. The directive sets
    a stable id and registers it on the group context so the inner input
    can include it in `aria-labelledby` (see **Accessibility**).
  - **Button addon** — `<button kjButton kjInputGroupAddon>Search</button>`.
    The button keeps its own role, focus-visible, and click handling. The
    group propagates variant and size; the button's `kjVariant` /
    `kjSize` host directives accept those fallbacks via context (same
    mechanism as `KjButtonGroup`).
  Distinct directives per kind would over-fragment for no behavioural win;
  the marker directive sets the right defaults based on what's projected
  inside.
- **Focus state** — when *any* `[kjInput]` (or `[kjTextarea]`, etc.)
  descendant has `KjFocusRing.focusVisible()` true, the group sets
  `data-focus-visible=""` on its own host. CSS uses this to draw the
  unified outline; the inner input's CSS suppresses its own ring while
  inside a group (driven by the `data-grouped` opt-out attribute it gets
  from context). This **must be JS-driven**, not `:focus-within`, to
  preserve keyboard-only focus semantics.
- **Variants & sizes** — `KjInputGroup` exposes `[kjVariant]` and `[kjSize]`
  inputs that are forwarded into context. Inner controls that compose
  `KjVariant`/`KjSize` (Input, Button) read the group as a fallback when
  their own values are unset. Defaults match `KjInput` (`default` / `md`).
- **Disabled propagation** — `[kjDisabled]` on the group sets
  `data-disabled` on the host (styling) **and** is read by the inner input
  via context as a fallback alongside its own `kjDisabled`. The inner
  input's `KjFormControl.disabled()` (form-driven disabled) bubbles back
  *up* into the group's `data-disabled` so the addons grey out when the
  form disables the input.
- **Invalid propagation** — analogous to disabled. The group reads
  `KjFormControl.invalid()` && `KjFormControl.touched()` from the inner
  input and reflects `data-invalid` on the host so the shared border can
  turn destructive. If a `KJ_FORM_FIELD` is present higher up, the group
  defers to it (`field.invalid()` is the source of truth).
- **Fluid / full width** — `[kjFluid]` (or rely on CSS `width: 100%` on
  the group itself; recommend the latter — no input on the directive).
- **Loading** — defer. The recipe is "swap an icon addon for a `KjSpinner`";
  no API needed on the group itself.

## Accessibility (WCAG 2.1 AAA)

| Concern | Where | Mechanism |
|---|---|---|
| **Role** | host | None. `<div>` with no role; the group is presentational. The inner `<input>` carries the semantics. **Do not** set `role="group"` — it would announce a redundant grouping that screen readers already infer from the input's own label. (Material's form-field is `role="group"` because it bundles a label; ours bundles only addons.) |
| **`aria-hidden` on icon addons** | `KjInputGroupAddon` | When the projected content is purely decorative (no text, single `<kj-icon>` or `<svg>` child with no `aria-label`), the directive sets `aria-hidden="true"` on its host. **Heuristic-based by default**, with explicit `[kjAriaHidden]` override. Consumers passing `aria-label` on the addon opt out of decoration. |
| **`aria-labelledby` for text addons** | `KjInputGroupAddon` → context → `KjInput` | Text addons (currency `$`, suffix `.00`, `https://`) form part of the input's effective name. The addon directive mints a stable id (`kj-addon-N`), registers it with `KJ_INPUT_GROUP`, and the inner `KjInput` reads `[ start-ids… current label-id end-ids… ]` to compose its `aria-labelledby`. The order matches DOM order so screen readers announce "dollar, amount, dot zero zero". |
| **Decorative vs informative split** | `KjInputGroupAddon` | If the addon contains a button (`<button kjButton>`), it is **never** decorative — the button has its own focusable name. The directive detects a focusable child and skips the `aria-hidden` default. |
| **Focus order** | native | Tab moves through addon-buttons and the input in DOM order. The group does **not** trap focus and does **not** roving-tabindex (this is not a composite widget; it's a single input with adjacent buttons). |
| **Focus-visible coordination** | core directive (group) | `effect()` watches the inner input's `KjFocusRing.focusVisible()` (read via context) and mirrors it onto the group's `data-focus-visible`. Inner input's CSS is keyed on `:host(:not([data-grouped])) [data-focus-visible]` so it suppresses its own ring while grouped. |
| **`aria-invalid` / `aria-disabled`** | inner `KjInput` | Stay on the input (semantic owner). The group only mirrors `data-invalid` / `data-disabled` on its host for **styling**, not ARIA. Screen readers learn invalid/disabled from the input itself. |
| **Touch targets ≥ 44×44** | wrapper CSS | The input is already ≥ 44px tall at `md`. Button addons inherit `KjButton`'s 44×44 minimum. **Risk:** small icon addons in tight layouts may visually shrink the hit area for the input itself if the addon overlaps the input's clickable area; the wrapper CSS keeps the input's clickable region ≥ 44px regardless of addon presence. WCAG 2.5.5 covered. |
| **Click-on-addon focuses input** | wrapper CSS | A `<label>`-style affordance: clicking a non-button addon (icon or text) should focus the input. Implement via `pointerdown.preventDefault` + `el.querySelector('[kjInput]').focus()` on the addon directive (skipped when the addon contains a focusable element). PrimeNG and Material both do this. |
| **Color & contrast** | themes | Shared border colour respects 3:1 against background per **1.4.11**. Destructive (invalid) state respects 4.5:1 for the border + the surrounding text per AAA. Theme tokens already enforce this for Input. |
| **Keyboard contract** | native | Inherited from the inner input + any button addons. Nothing custom. **2.1.1** / **2.1.2** covered without code. |
| **`role="group"` opt-in** | host | Consumers may pass `role="group" aria-label="…"` explicitly when the group represents a logical unit beyond a single input (e.g., a date range with two inputs side-by-side). The directive defers to author-provided `role`, same policy as `KjButtonGroup`. |

WCAG criteria covered by the design: **1.3.1** (programmatic structure via
`aria-labelledby`), **1.4.11** (non-text contrast on the shared border),
**2.1.1** / **2.1.2** (no custom keyboard behaviour to break),
**2.4.3** (DOM-order focus), **2.4.7** (focus-visible mirroring),
**2.5.5** (touch targets), **4.1.2** (name composed from addons + label).

## Composition model

```
input-group/
  input-group.ts            ← KjInputGroup (root)
  input-group-addon.ts      ← KjInputGroupAddon (per addon)
  input-group.context.ts    ← KjInputGroupContext + KJ_INPUT_GROUP token
  input-group.spec.ts
  input-group-addon.spec.ts
  index.ts
```

### `KjInputGroup` (selector `[kjInputGroup]`)

Provides `KJ_INPUT_GROUP`. `hostDirectives`:

```ts
hostDirectives: [
  { directive: KjVariant, inputs: ['kjVariant'] },
  { directive: KjSize,    inputs: ['kjSize'] },
  { directive: KjDisabled, inputs: ['kjDisabled'] },
],
providers: [
  { provide: KJ_INPUT_GROUP, useExisting: KjInputGroup },
  ...bindPresets(KJ_INPUT_GROUP_CONFIG),
],
```

Note: `KjFocusRing` is **not** composed on the group. The group does not
own focus; it mirrors the inner input's. This is the key architectural call
that separates Input Group from Button Group (the latter has focusable
items but no single "primary" focus target).

Host bindings:

```ts
host: {
  '[attr.data-focus-visible]': 'innerFocusVisible() ? "" : null',
  '[attr.data-disabled]':       'aggregateDisabled() ? "" : null',
  '[attr.data-invalid]':        'aggregateInvalid() ? "" : null',
  '[attr.data-orientation]':    '"horizontal"',  // future-proof for vertical
}
```

The group queries its inner control via `contentChild` for `KjFormControl`
(works for any kouji form input — `KjInput`, `KjTextarea`,
`KjNumberInput`, …) and `KjFocusRing`. Computed signals derive the four
aggregated states:

```ts
private readonly inputCtrl   = contentChild(KjFormControl, { descendants: true });
private readonly inputFocus  = contentChild(KjFocusRing,   { descendants: true });
private readonly field       = inject(KJ_FORM_FIELD, { optional: true });

readonly innerFocusVisible = computed(() => this.inputFocus()?.focusVisible() ?? false);
readonly aggregateDisabled = computed(() =>
  this.kjDisabled() || (this.inputCtrl()?.disabled() ?? false)
);
readonly aggregateInvalid = computed(() =>
  this.field?.invalid() ?? (
    (this.inputCtrl()?.invalid() ?? false) && (this.inputCtrl()?.touched() ?? false)
  )
);
```

### `KjInputGroupAddon` (selector `[kjInputGroupAddon]`)

```ts
@Directive({
  selector: '[kjInputGroupAddon]',
  host: {
    '[attr.aria-hidden]': 'effectiveAriaHidden()',
    '[attr.data-position]': 'position()',
    '[id]': 'addonId()',
  },
})
export class KjInputGroupAddon {
  private readonly group = inject(KJ_INPUT_GROUP);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly kjPosition = input<'start' | 'end' | 'auto'>('auto');
  readonly kjAriaHidden = input<boolean | undefined>(undefined);

  readonly addonId = signal(`kj-addon-${nextId()}`);
  readonly position = computed(() => this.kjPosition() === 'auto'
    ? this.inferPosition() : this.kjPosition());
  readonly effectiveAriaHidden = computed(() => {
    if (this.kjAriaHidden() !== undefined) return this.kjAriaHidden() ? 'true' : null;
    return this.containsFocusable() || this.containsText() ? null : 'true';
  });

  constructor() {
    this.group.registerAddon(this);
    inject(DestroyRef).onDestroy(() => this.group.unregisterAddon(this));
  }
}
```

The addon decides whether to register its id with the group context for
`aria-labelledby` composition: *text* addons register, *decorative icon*
addons do not, *button* addons do not (the button has its own
focusable name). Detection happens at `afterNextRender` by inspecting
projected content (text node count, focusable selector match).

### Shared state — `KjInputGroupContext`

```ts
export interface KjInputGroupContext {
  readonly variant: Signal<string | undefined>;
  readonly size: Signal<string | undefined>;
  readonly disabled: Signal<boolean>;
  readonly grouped: true;                          // truthy marker for inner input opt-out
  readonly startAddonIds: Signal<readonly string[]>;
  readonly endAddonIds: Signal<readonly string[]>;
  registerAddon(addon: KjInputGroupAddon): void;
  unregisterAddon(addon: KjInputGroupAddon): void;
}
export const KJ_INPUT_GROUP = new InjectionToken<KjInputGroupContext>('KjInputGroup');
```

### Inner-input cooperation

`KjInput` already needs a one-line addition (flagged here, not a new
component): inject `KJ_INPUT_GROUP` optionally and:

1. Reflect `[attr.data-grouped]=""` on the host so its CSS can suppress its
   own border + own focus ring.
2. Compose the registered addon ids into its `aria-labelledby`:
   `[attr.aria-labelledby]="ariaLabelledBy()"` where `ariaLabelledBy`
   joins `[ ...group.startAddonIds(), originalLabelId, ...group.endAddonIds() ]`.
3. Treat `group.disabled()` as an additional source of `disabled` (OR-ed).
4. Read variant/size fallbacks via `KjVariant` / `KjSize`'s context-fallback
   mechanism — same shape `KjButtonGroup` uses for its items.

This is the minimum invasive change to `KjInput`. It does **not** require a
new `KjInputGroupInput` wrapper (shadcn's pattern) because `KjInput` already
owns the right hooks; we just teach it to look up.

### Wrapper component (`KjInputGroupComponent`, `kj-input-group`)

Thin styled wrapper that:
- Applies the shared border / radius / padding via `@kouji-ui/components`
  CSS targeting the group's `data-*` attributes.
- Strips the inner input's own border via CSS keyed on `[data-grouped]`.
- Re-exposes the directive's prefixed inputs (`kjVariant`, `kjSize`,
  `kjDisabled`).

Why a styled wrapper and a directive both? Same split as Input itself —
headless `[kjInputGroup]` is composable into custom DOM (e.g., a
`<fieldset>` host), and `<kj-input-group>` is the shorthand for the common
case.

### Cross-component pointers

- **`data-input/input.md`** — describes `KjInput` and the planned ARIA-described-by
  / form-field id wiring. The "inner-input cooperation" listed above is the
  same concern, delivered through the same mechanism (optional `inject` of
  a context token). Land Field's id wiring first, then add Input Group; the
  two contexts (`KJ_FORM_FIELD`, `KJ_INPUT_GROUP`) compose without conflict.
- **`data-input/field.md`** — `KjFormField` is the *outer* wrapper (label +
  error). `KjInputGroup` lives **inside** it. Field is `role="group"` with a
  programmatic label; Input Group is presentational. Two separate concerns,
  two separate directives, both useful independently.
- **`actions/button.md`** — addon buttons are plain `[kjButton]` instances.
  Variant/size cascade from the group via the same context-fallback the
  Button Group uses for its items. No special `KjInputGroupButton` directive
  is needed; this matches PrimeNG's "just a `<button pButton>` inside the
  group" philosophy and avoids shadcn's `<InputGroupButton>` indirection.
- **`actions/button-group.md`** — sibling pattern (visual joining + variant
  cascade via context), but Button Group owns selection state and roving
  tabindex, while Input Group owns *none* of those. The directives share
  the *cascading variant/size context* idea; everything else differs.

### Why a `KjInputGroupAddon` rather than auto-styling siblings?

Same rationale as `KjButtonGroupItem`: opt-in semantic participation. A
consumer may legitimately drop a `<kj-popover>` trigger or a hidden helper
inside a group without wanting it styled as an addon. Requiring the marker
keeps the group inert by default for non-addon children and lets the
directive set sensible `aria-hidden` / `aria-labelledby` defaults that pure
CSS can't. shadcn made the same call; PrimeNG's `<p-inputgroupaddon>` is
the same shape.

### Inside Input or beside?

**Beside.** kouji follows PrimeNG / shadcn: addons are siblings of the
input, not absolute-positioned overlays inside the input's box. Reasons:

1. **Hit testing** — a button addon needs to be a real, separately-clickable
   element with its own focus and click semantics. Putting it inside the
   input means absolute-positioning over padded space, which fights pointer
   events and breaks at high zoom (WCAG 1.4.4).
2. **Width math** — the input element's width must adapt to the addons; that
   is straightforward with flexbox siblings, awkward with absolute-positioned
   children that the input has to pad around.
3. **Material conflates** because it owns the form-field outline. We don't:
   `KjFormField` owns the label and error region; `KjInputGroup` owns the
   addon-unification box. Two layers, two concerns, no conflation.

The "icon-inside-the-input" recipe (PrimeNG's `IconField`) is reachable in
kouji as a CSS variant of Input Group (`kjVariant="iconfield"` or simply a
wrapper-package CSS preset) — we do **not** ship a separate `KjIconField`
component. The directive shape is identical; only the visual treatment
changes. Decided to keep the API surface flat.

## Inputs / Outputs / Models — `kj`-prefixed

### `KjInputGroup`

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjVariant` | `input` (forwarded via `hostDirectives` to `KjVariant`) | `string` | `'default'` (from `KJ_INPUT_GROUP_CONFIG`) | Validated against preset list. Read by inner Input/Button as fallback. |
| `kjSize` | `input` (forwarded to `KjSize`) | `string` | `'md'` | Same. |
| `kjDisabled` | `input` (forwarded to `KjDisabled`) | `boolean` | `false` | OR-ed into inner input's effective disabled. Mirrors `data-disabled` on host. |
| `kjOrientation` | `input` | `'horizontal' \| 'vertical'` | `'horizontal'` | Future-proof (e.g. stacked OTP). Drives `data-orientation`; CSS only. |

No outputs. The group has no state worth emitting — value flows through
the inner input's reactive form binding, focus is inherent.

### `KjInputGroupAddon`

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjPosition` | `input` | `'start' \| 'end' \| 'auto'` | `'auto'` | `auto` infers from DOM order vs the input. |
| `kjAriaHidden` | `input` | `boolean \| undefined` | `undefined` | Override the heuristic. `undefined` → infer (decorative icon → `true`, text/button → not set). |

### Wrapper (`KjInputGroupComponent`, `kj-input-group`)

Re-exposes `kjVariant`, `kjSize`, `kjDisabled`, `kjOrientation`. No
additional inputs.

### Configuration token

`KJ_INPUT_GROUP_CONFIG` (mirrors `KJ_BUTTON_CONFIG` / `KJ_INPUT_CONFIG`):

```ts
KJ_INPUT_GROUP_DEFAULTS = {
  variants: ['default', 'filled', 'ghost'],
  sizes:    ['sm', 'md', 'lg'],
  defaults: { variant: 'default', size: 'md' },
}
```

`provideKjInputGroup({ variants: [...], sizes: [...] })` to extend.

## Examples to ship

Match the pattern under `packages/components/src/button/` and the planned
`input/` examples:

1. **Default** — `input-group.example.ts`. `[$]` text prefix +
   `[__amount__]` + `[.00]` text suffix.
2. **Icon prefix** — `input-group.icon.example.ts`. Magnifier icon prefix +
   plain input (search recipe).
3. **Button suffix** — `input-group.button.example.ts`. Input + "Search"
   `KjButton` suffix. Demonstrates focus ring on group and click → input
   focus passthrough.
4. **Icon prefix + button suffix** — `input-group.combo.example.ts`. Mail
   icon prefix + "Subscribe" button suffix.
5. **URL slug** — `input-group.url.example.ts`. `https://` prefix + slug
   input + `.com` suffix (multi-text addons demonstrating
   `aria-labelledby` composition).
6. **Variants** — `input-group.variants.example.ts`. Side-by-side default /
   filled / ghost groups, each with the same prefix/suffix to show
   addon variant cascade.
7. **Sizes** — `input-group.sizes.example.ts`. `sm` / `md` / `lg` showing
   uniform addon scaling.
8. **In a form field** — `input-group.field.example.ts`. Group inside
   `<div kjFormField>` with label + error, demonstrating that the
   group's `data-invalid` flips when the field's validation fails.
9. **Reactive form** — `input-group.reactive.example.ts`. Bound to a
   `[formControl]` with a required + minLength validator to verify
   touched-gated invalid styling propagates from input → group.
10. **Disabled** — `input-group.disabled.example.ts`. Both `[kjDisabled]`
    on the group and `formCtrl.disable()` on the input shown — both should
    grey the addons.
11. **Password toggle (recipe cross-link)** — referenced from
    `password-input.md`; the toggle is a `<button kjButton kjVariant="ghost"
    kjSize="icon" kjInputGroupAddon>` inside the group. Demonstrates
    button addon with an action.
12. **Icon-field flavour** — `input-group.iconfield.example.ts`. Pure CSS
    variant (`kjVariant="iconfield"`) where the icon sits *inside* the
    input box rather than beside it; same directive surface, different
    theme preset. Validates the "no separate IconField component" decision.

Themed variants (`default` / `retro` / `finance`) shipped for examples
1, 4, and 8.

## Open questions / risks

1. **Pure CSS unification vs `data-grouped` opt-out.** The wrapper package
   could instead unify visuals with `:has([data-grouped])` selectors on
   the input from the group side, never adding any attribute to the inner
   input. CSS-level coupling but zero directive cooperation. **Risk:**
   `:has()` baseline support is recent (Safari 15.4+, Firefox 121+). We
   require Angular 20+, which assumes evergreen browsers, so `:has()` is
   safe. **Recommendation:** still add `data-grouped` from context — it
   doubles as a hook for the inner input's own CSS to suppress its focus
   ring without depending on parent selectors, which keeps Input's CSS
   self-contained. Cheap and explicit.

2. **`contentChild(KjFormControl)` vs `inject` from the inner input upward.**
   The group queries downward; alternatively the inner input could
   `inject(KJ_INPUT_GROUP)` and *push* its signals up via `registerControl`.
   Push is more flexible (works across `<ng-container>` boundaries and
   custom projections) and matches `KjButtonGroupItem`'s pattern. **Pick
   push**: rename to `registerControl(ctrl: KjFormControl, focus: KjFocusRing)`
   on the context and have `KjInput`'s constructor call it when the optional
   inject succeeds. Update the group state via signals — same idea as
   `KJ_BUTTON_GROUP.registerSplitTrigger`.

3. **Multiple inputs in one group.** Date-range "from / to" or split-area
   addresses sometimes want two inputs joined visually. The push model
   above tolerates multiple controls, but the focus/invalid/disabled
   aggregation needs to handle "any focused → group focused, all disabled
   → group disabled, any invalid → group invalid". Not hard, but a
   dedicated example + spec is worth shipping. **Decision:** support N
   inputs; the context's `controls` is `Signal<readonly KjFormControl[]>`,
   not a single. (PrimeNG and Material both support this.)

4. **Auto `aria-hidden` heuristic on addons.** Inspecting projected content
   to decide whether to set `aria-hidden` is fragile (consumers can pass
   icons with `aria-label`, or text wrapped in a span, etc.). Two paths:
   - **A.** Default `aria-hidden="true"` on all addons; require explicit
     opt-out. Conservative; risks hiding informational text addons.
   - **B.** Default no `aria-hidden`; require explicit `[kjAriaHidden]="true"`
     on decorative addons. Safer for screen readers; more consumer
     responsibility.
   - **Recommendation:** default to **B** (no `aria-hidden`), document
     that decorative icons need `aria-hidden="true"` either on the addon
     directive or on the icon element itself, and ship a `kj-icon`
     component that defaults its own `aria-hidden`. This places the
     responsibility on the icon component, not on group introspection.

5. **`aria-labelledby` ordering when the input also has a `<label>`.** The
   composed `aria-labelledby` should be `[ start-addons, label, end-addons ]`.
   But the input may have an explicit `aria-labelledby` set by the consumer
   for a custom label. **Resolution:** if the consumer provides
   `aria-labelledby`, it wins outright (no composition). If a `KjFormField`
   provides a label id via `KJ_FORM_FIELD`, compose
   `[ start, fieldLabelId, end ]`. Otherwise compose `[ start, end ]` only.
   Consumers wanting a different order can provide the full string
   themselves. Document this precedence.

6. **Click-on-addon → focus-input passthrough vs button addon.** A button
   addon must keep its own click semantics. The passthrough (label-style
   focus delegation) applies *only* to non-focusable addons. Detection:
   addon registers itself, group reads addon's `containsFocusable` signal
   computed from a `closest('button, [kjButton], [tabindex]:not([tabindex="-1"])')`
   check at `afterNextRender`. Risk: if consumers add a focusable child
   later (lazy content), the heuristic is stale. **Mitigation:** re-run on
   `MutationObserver` for the addon's subtree, or document that addon
   children must be present at first render. Recommend: simple
   `afterNextRender` once + documented constraint; revisit if anyone
   complains.

7. **Variant/size cascade through `KjVariant` / `KjSize`.** Same risk
   flagged in `button-group.md` §"Variant override forwarding": the
   `KjVariant` primitive needs to support a context-fallback read. Confirm
   this is implementable cleanly given `KjVariant`'s preset-binding model
   in `presets/` before committing. Fallback plan: instead of context
   inside `KjVariant`, the group writes `--kj-variant: filled` / `--kj-size:
   lg` CSS custom properties on its host, and the inner input/button CSS
   reads them via `var()` when their own `data-variant` / `data-size` is
   absent. CSS-only fallback works without any change to the variant
   primitive.

8. **Wrapping a non-`KjInput` control.** Native `<input>` (no `kjInput`
   attribute) inside the group will not register and will not benefit
   from focus mirroring or `aria-labelledby` composition. **Decision:** the
   group is a kouji-only contract — document that the inner control must
   be a kouji form input (composes `KjFormControl` and `KjFocusRing`). For
   the rare native-input case, the wrapper's CSS still provides visual
   unification because the input visually fits, but accessibility
   composition is on the consumer.

9. **SSR.** All directives are render-side; the focus mirror uses
   signals, not DOM listeners directly (those are inside `KjFocusRing`,
   which already gates on `isPlatformBrowser`). The `contentChild` and
   `effect()` for aggregation run in the browser. No SSR risk beyond
   what Input already manages.

10. **Floating label compatibility.** Material's `floatLabel` lives inside
    its form field, not inside an input group. If kouji ships
    `KjFloatLabel` later, it should compose with both `KjFormField` and
    `KjInputGroup` — the float-label transform-origin needs to know the
    addon widths to start at the input's left edge, not the group's. Defer
    until float labels are on the roadmap; flag here so the group's CSS
    leaves a CSS variable (`--kj-input-group-content-inset-start`) that
    a future float-label can read. Cheap forward-compat.

11. **Loading inside the group.** PrimeNG ships `[loading]` on
    `pInputText`. We don't, and the recipe in the group is "swap a prefix
    icon for a `KjSpinner`". Document the recipe; no API. (Same call as
    `input.md`.)

12. **Addon between two inputs (date-range with `–` separator).** A plain
    text addon between two `[kjInput]`s is still a valid `[kjInputGroupAddon]`
    with `kjPosition="auto"` — its inferred position is "neither start nor
    end of the group, but between two inputs". The directive can return
    `position="middle"` for this, used by CSS for symmetric border
    collapse. Spec it with the multi-input example (open question 3).
