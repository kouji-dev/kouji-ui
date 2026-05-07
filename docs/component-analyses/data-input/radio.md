# Radio

Reference architecture for the kouji-ui Radio — exclusive single-choice
selection within a labelled group. **Already shipped (wrapper-in-flight):**
headless `KjRadioGroup` + `KjRadio` directives at
`packages/core/src/radio/radio.ts` and styled wrapper components
`KjRadioGroupComponent` + `KjRadioComponent` at
`packages/components/src/radio/radio.ts`. This document captures the existing
shape, flags concrete improvements informed by the source comparison, and
positions Radio against its sibling exclusive-selection siblings (`KjCheckbox`,
`KjToggle`, future `KjToggleGroup` / `KjSelectButton`).

> **Radio is meaningless alone.** Every contract on this page is two-piece:
> the **group** (root) owns selected value, focus ownership, ARIA labelling,
> form-control identity; the **item** owns its own value, checked computation,
> and click/keyboard activation. Anywhere this analysis says "the directive"
> without qualifying which, it's wrong — say which one.

## Source comparison

- **PrimeNG** — [primeng.org/radiobutton](https://primeng.org/radiobutton).
  Two pieces: `<p-radioButton>` (an item) and `<p-radioButton-group>` (an
  optional grouping shell that mostly exists for forms-binding + label
  composition). The item is rendered as a `<div role="radio">` with a hidden
  native `<input type="radio">` underneath for forms compatibility — NOT a
  styled native input. Each item carries its own `name` (string) and `value`,
  and items with the same `name` form an implicit group via the browser radio
  semantics. Inputs include `name`, `value`, `formControlName`, `disabled`,
  `readonly`, `tabindex`, `inputId`, `ariaLabel`, `ariaLabelledBy`, `size`
  (`small | large`), `variant` (`outlined | filled`). The hidden native input
  is what implements the CVA. Roving tabindex is **not** managed — every
  selected item retains `tabindex=0` because each is its own native radio (the
  browser handles arrow-key navigation when items share a `name`). The styled
  div mirrors `aria-checked`, `data-checked`, `data-disabled`. `<p-radioButton-group>`
  is a thin wrapper that just provides forms-binding context and a label slot.
- **Angular Material** — [material.angular.dev/components/radio](https://material.angular.dev/components/radio).
  Two pieces: `<mat-radio-group>` (the form control + selection owner) and
  `<mat-radio-button>` (item). The **group is the CVA** — items don't
  individually implement `ControlValueAccessor`; they ask the group for the
  current value and report clicks back. Group inputs: `name` (auto-minted if
  missing), `value`, `selected`, `disabled`, `disabledInteractive`, `required`,
  `color`, `labelPosition` (`'before' | 'after'`), and indirectly `formControl`
  / `ngModel`. Item inputs: `value`, `checked`, `disabled`,
  `disabledInteractive`, `name`, `id`, `aria-label`, `aria-labelledby`,
  `aria-describedby`, `color`, `labelPosition`. Each item still renders a
  native `<input type="radio" [name]>` inside, BUT the group sets `tabindex`
  on the items so that **only the selected one (or the first one if none
  selected) is in the tab order** — the group implements an explicit roving
  tabindex on top of the native radios. Arrow keys move focus between items
  AND select on focus (per WAI-ARIA APG). Material's group also exposes a
  `change` `(MatRadioChange)` output emitting `{ source, value }`.
- **shadcn/ui** — [ui.shadcn.com/docs/components/radio-group](https://ui.shadcn.com/docs/components/radio-group).
  Wraps Radix UI Radio Group. Two pieces: `<RadioGroup>` and `<RadioGroupItem>`.
  The group is rendered as a `role="radiogroup"` `<div>` (NOT a fieldset, NOT
  a native form group); each item is a `<button role="radio">` (NOT a native
  `<input>`) and Radix coordinates roving tabindex internally. `<RadioGroup>`
  props: `value`, `defaultValue`, `onValueChange`, `disabled`, `name` (used to
  emit a hidden synced native input for form submission), `required`,
  `orientation` (`'horizontal' | 'vertical'`), `dir`, `loop`. `<RadioGroupItem>`
  props: `value` (required), `disabled`, `id`. Selection-on-focus IS
  implemented. The button-as-radio approach gives full styling control (no
  `<input>` element to fight); accessibility is hand-wired via
  `role="radio"` + `aria-checked` + roving tabindex.

**Pattern picked up.** kouji's existing implementation is closest to **shadcn /
Radix**: divs with `role="radio"`, no native `<input type="radio">`,
`aria-checked` reflected from the group's selected value, and roving
tabindex done in user-land. Group is a pure attribute directive
(`[kjRadioGroup]`) holding a `model<unknown>` for the selected value. Item
(`[kjRadio]`) injects the group via `KJ_RADIO_GROUP` token, computes
`checked()` from `group.value() === kjRadioValue()`, and reports clicks /
Space / Enter back to the group.

The CVA placement differs from all three references: today **the item
composes `KjFormControl`** (each `[kjRadio]` is registerable as a form
control), and the group does **not**. That's wrong for radio semantics —
see [Decisions](#decision-cva-on-the-group-not-the-item) below — and is
the largest concrete improvement to land before the wrapper stabilises.

## Decision: needs a core directive?

**Yes — already shipped, and Radio is a two-piece contract that absolutely
needs both directives in core.** The headless layer owns:

1. **Group ↔ item context (`KJ_RADIO_GROUP`)** — the only sane way to keep
   the items decoupled from the group while letting them read the selected
   value and write back via `select(val)`. Already shipped.
2. **`role="radiogroup"` on the group, `role="radio"` per item** — themes
   should never have to remember this. Already shipped.
3. **Selection model.** `KjRadioGroup.kjValue` is `model<unknown>` — generic
   over the value type the consumer supplies via each item's
   `kjRadioValue`. Already shipped.
4. **`aria-checked` per item, derived from `value === kjRadioValue`** — must
   be the literal string `'true'` / `'false'` (NOT toggled-presence-only,
   `aria-checked` requires an explicit boolean string). Already shipped via
   `'[attr.aria-checked]': 'checked().toString()'`.
5. **Click + keyboard activation** — `(click)`, `(keydown.space)` (with
   `preventDefault` to suppress page scroll), `(keydown.enter)` (per
   WAI-ARIA radio APG: Enter is **optional** but harmless and matches user
   muscle memory). Already shipped on the item.
6. **CVA registration** — needs to live on the **group**, not the item;
   correction tracked below.
7. **Roving tabindex with selection-on-focus** — currently NOT in the core
   directive (consumers hand-write `tabindex="0"` / `"-1"` in the spec),
   tracked as the most important improvement after CVA placement.
8. **Disabled propagation** — group-level disable should disable every item;
   item-level disable should disable only that item. Currently each item
   composes `KjDisabled` independently and the group has no `kjDisabled`
   input.

Items 6, 7, 8 are gaps in the existing core. Items 1–5 are correct as
shipped. Below they're listed under "Improvements" with concrete shapes.

## Decision: CVA on the GROUP, not the item

**Move `KjFormControl` from the item to the group.** Today `KjRadio`
composes `KjFormControl` and on click does
`this.formCtrl.notifyChange(this.kjRadioValue())`. This means each radio
item is its own form control — which is wrong for the same reason Material
puts CVA on `<mat-radio-group>`:

- A radio group has **one value** (`'a' | 'b' | 'c'` — the selected value),
  not three booleans. A reactive form bound to the group should read/write
  the selected value, not three independently-tracked checkbox-style states.
- `[(ngModel)]="size"` on the **group** is the natural shape and matches
  every reference library. `[(ngModel)]` on each item makes no sense.
- Validation (`Validators.required`) is a group-level concern — "the user
  must pick one" — not an item-level concern.
- `setDisabledState(true)` from the form layer should disable the entire
  group, not a single item. Today there's no path for that.
- `notifyTouched()` on blur should fire when focus leaves the **whole
  group**, not when focus leaves any one item (which fires constantly as
  the user arrows between items).

Concretely, after the move:

```ts
@Directive({
  selector: '[kjRadioGroup]',
  hostDirectives: [
    { directive: KjDisabled, inputs: ['kjDisabled'] },
    KjFormControl,
  ],
  providers: [{ provide: KJ_RADIO_GROUP, useExisting: KjRadioGroup }],
  host: {
    role: 'radiogroup',
    '[attr.aria-disabled]': 'formCtrl.disabled() || null',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class KjRadioGroup implements KjRadioContext {
  readonly formCtrl = inject(KjFormControl);
  readonly kjValue = model<unknown>(undefined);
  readonly value = this.kjValue.asReadonly();
  readonly disabled = computed(() => this.formCtrl.disabled());

  constructor() {
    // Forms write -> group value
    effect(() => this.kjValue.set(this.formCtrl.value()));
  }

  select(val: unknown): void {
    if (this.disabled()) return;
    this.kjValue.set(val);
    this.formCtrl.notifyChange(val);
  }

  /** Touched fires when focus leaves the group entirely. */
  onFocusOut(e: FocusEvent): void {
    const next = e.relatedTarget as Node | null;
    if (!this.host.contains(next)) this.formCtrl.notifyTouched();
  }
}
```

The item shrinks to just consuming the group:

```ts
@Directive({
  selector: '[kjRadio]',
  hostDirectives: [
    { directive: KjDisabled, inputs: ['kjDisabled'] },
    KjFocusRing,
  ],
  host: {
    role: 'radio',
    '[attr.aria-checked]': 'checked().toString()',
    '[attr.data-checked]': 'checked() ? "" : null',
    '[attr.aria-disabled]': '(group.disabled() || disabled()) ? "true" : null',
    '(click)': 'select()',
    '(keydown.space)': 'onSpace($event)',
    '(keydown.enter)': 'select()',
  },
})
export class KjRadio { /* no KjFormControl */ }
```

This split is the single biggest correctness improvement for the wrapper.

## Decision: `role="radio"` on a div/button — NOT native `<input type="radio">`

Same rationale as `KjCheckbox` (see [`checkbox.md`](./checkbox.md)):

- **Styling.** Native `<input type="radio">` rendering is almost
  un-styleable across browsers (the dot is a UA-painted glyph, not a CSS
  pseudo-element). To get a custom dot, every implementation either hides
  the native input visually and renders a parallel div (PrimeNG, Material)
  or skips the native input entirely (shadcn/Radix, kouji).
- **Sizing.** WCAG 2.5.5 (44×44 touch target) is non-negotiable for AAA;
  native radios are typically 13×13. A custom div lets the wrapper hit the
  target without the native input getting in the way of pointer hits.
- **Form participation.** When the group owns the CVA, there's no need for
  a native radio inside the item — Angular's reactive forms machinery binds
  to the group's `KjFormControl` and the wire-format is whatever the
  consumer's `kjRadioValue` types resolve to (string, number, object).
- **Native form submission.** If a consumer wants the group's value to
  appear in a non-Angular `<form>` POST, the wrapper can render a single
  hidden `<input type="radio" name="…" value="…" checked>` per item
  (Radix's approach). Defer until requested — Angular reactive forms cover
  the 99% case.

**Tradeoff (same as Checkbox).** Without the native `<input>`:

- **Browser autofill** for radio groups is rare but non-zero (think survey
  forms). Defer until requested.
- **`:has(input:checked)` CSS** doesn't apply — but `[data-checked]` and
  `[aria-checked="true"]` do. Equivalent.
- **Form submission outside Angular forms.** Consumers must use reactive /
  template-driven forms, or wire a hidden input themselves. Document.

**Pick:** keep div-with-`role=radio`. Same as checkbox, same as Radix.

## Decision: roving tabindex (selection-follows-focus)

**Most-important-improvement-not-yet-shipped.** Per WAI-ARIA APG
([w3.org/WAI/ARIA/apg/patterns/radio](https://www.w3.org/WAI/ARIA/apg/patterns/radio/)),
a `radiogroup` MUST:

1. Place exactly one item in the tab order (`tabindex="0"`); all others get
   `tabindex="-1"`.
2. The tabbable item is the **selected** one. If nothing is selected, the
   **first** item is tabbable.
3. **Arrow keys** (Up/Down/Left/Right) move focus between items AND **select
   on focus** — focusing an item via arrow key sets it as the new value.
   Home/End jump to first/last and select. (This is the "selection follows
   focus" pattern; it differs from listbox/tabs where selection requires
   Enter.)
4. **Tab** moves focus *out of* the group entirely; it does NOT cycle through
   items.

Today the spec hard-codes `tabindex="0"` on the first item and `"-1"` on the
rest, and there are no arrow-key handlers. The wrapper renders the item
`<span>` with a static `tabindex="0"`. **This violates the APG on three
counts:** all items end up tabbable, arrows do nothing, selection-on-focus
doesn't happen.

**Fix:** reuse `KjRovingTabindex` from `packages/core/src/a11y/roving-tabindex.ts`
on the group, with an additional behavior layer for selection-follows-focus.
Two implementation options:

### Option A — extend `KjRovingTabindex` with a "select on focus" mode

Add an opt-in input `kjSelectOnFocus: boolean` to `KjRovingTabindex` (default
`false` so the existing toolbar/tablist consumers don't change). When true,
on `onKeydown`-driven focus moves, also call back into a
`KJ_ROVING_TABINDEX_SELECTION` callback (or fire an event) so the radio group
can `select(value)` on the new active item.

The roving primitive also needs to:
- Initialize `activeIndex` to the **selected** item, not always `0`. Either
  expose a `kjActiveIndex` model or accept a `KJ_ROVING_TABINDEX_SELECTOR`
  callback that the group implements (`(items) => items.findIndex(i => i.value === group.value())`).
- Skip disabled items in the cycle.
- Honor the group's `data-orientation` (`vertical` → Up/Down primary,
  `horizontal` → Left/Right primary). Today it accepts all four, which is
  fine but verbose.

### Option B — Radio group implements roving directly

Don't reuse `KjRovingTabindex`; let `KjRadioGroup` host the `(keydown)` and
manage tabindex per item directly via the existing `KJ_RADIO_GROUP` context
(items already register their values; the group can list them via
`contentChildren(KjRadio)`).

**Recommendation: Option A.** Roving tabindex with optional
selection-on-focus is the same primitive Toolbar / Tabs / Listbox / Combobox
all want; cementing the option in the primitive avoids a per-component
re-implementation for every composite widget. Concretely:

```ts
// roving-tabindex.ts — additions
readonly kjSelectOnFocus = input(false);
readonly kjOrientation = input<'horizontal' | 'vertical' | 'both'>('both');
readonly kjLoop = input(true);

// ...inside onKeydown after this.activeIndex.set(next):
if (this.kjSelectOnFocus()) this.selection?.onActiveChange(all[next]);
```

…where `selection` is an optionally-injected `KJ_ROVING_TABINDEX_SELECTION`
service the radio group provides. (See **Open questions** for the cleaner
shape.)

### Disabled items in the group

Per APG, focus *should* skip disabled items in the arrow-key cycle but they
remain visible. The roving primitive must check each item's
`KjDisabled.disabled()` (or a `data-disabled` attribute) when computing
`next` and continue past disabled items. Today the primitive doesn't.

## Base features

- **Selected value (group).** `kjValue` is `model<unknown>`. Two-way bind via
  `[(kjValue)]` on the group. Wrapper aliases this to `[(value)]`.
- **Item value.** `kjRadioValue` is `input.required<unknown>()`. Wrapper
  aliases to `[value]`. Equality is reference equality (`===`); for object
  values consumers must reuse the same reference. Document.
- **Variants** — *not yet integrated.* Add `KjVariant` via `hostDirectives`
  on the **item** (not the group). Variants apply to the dot's appearance
  (`default`, `filled`, `outline`, `ghost`). Mirror Button. Group has no
  variant.
- **Sizes** — *not yet integrated.* Add `KjSize` via `hostDirectives` on the
  **item**. WCAG 2.5.5 drives the `md` minimum (44×44 hit area on the
  label-wrapped item; the dot itself can be smaller as long as the label
  click region clears 44px).
- **Orientation** — wrapper-level `orientation: 'horizontal' | 'vertical'`
  on the group reflects to `data-orientation`. Already shipped on the
  wrapper. Should also flow to the (proposed) roving tabindex orientation.
- **Disabled.** Two paths: group-level (`kjDisabled` on the group disables
  all items + the form control) and item-level (`kjDisabled` per item
  disables only that item). Item must read `(group.disabled() ||
  disabled())` for its own `aria-disabled`; group disable wins.
- **Read-only** — *not yet shipped.* PrimeNG ships `readonly` on the radio.
  Useful for "view this filled form, don't let me change it." Add
  `kjReadonly` on the group (mirrors `aria-readonly`, `data-readonly`).
  Pointer events suppressed; arrow keys still navigate so screen readers
  can read each option, but `select()` becomes a no-op.
- **Required** — derive from the bound form control's
  `Validators.required` (`group.injector.get(NgControl, null,
  InjectFlags.Optional)?.control?.hasValidator(Validators.required)`).
  Reflects to `aria-required` on the group. Mirrors Material.
- **Slots** — none on the directive. The wrapper component projects content
  inside a `<label>` wrapper that wraps both the dot and the projected
  text (already shipped at `packages/components/src/radio/radio.ts`).
- **Label position** — Material has `labelPosition: 'before' | 'after'`.
  We don't, today. Add `kjLabelPosition` on the wrapper item; reflects to
  `data-label-position` and CSS swaps the flex direction. Default `'after'`.
- **Card-style radio** — large clickable card with title + description.
  Common UX pattern for plan / payment / shipping selectors. Defer to a
  separate `KjRadioCard` wrapper or document as a recipe (the headless
  layer is sufficient — just project richer content into `<kj-radio>`).

## Accessibility (WCAG 2.1 AAA)

| Concern | Where | Mechanism |
|---|---|---|
| **Group role** | `KjRadioGroup` core | `role="radiogroup"` on the host. |
| **Item role** | `KjRadio` core | `role="radio"` on the host. |
| **`aria-checked`** | `KjRadio` core | `[attr.aria-checked]="checked().toString()"` — explicit `'true'` / `'false'` string per APG. |
| **`data-checked`** | `KjRadio` core | Hook for CSS state styling. |
| **Group label** | `KjFieldLabel` (preferred) **or** `aria-label` / `aria-labelledby` on the group | The group MUST have an accessible name. Inside `<kj-field>`, the field's `<label kjFieldLabel>` registers its id and the field assigns `aria-labelledby` on the inner control (the group). Standalone use must set `aria-label` directly on the group host. The wrapper exposes `ariaLabel` as a passthrough today — keep it for non-Field usage. |
| **Item label** | item DOM | The wrapper renders a `<label>` wrapping the dot + projected text and points the dot's `aria-labelledby` at a generated id on the label `<span>`. Already shipped. Click on label → forwarded to dot's click handler (already shipped). |
| **Tab order — only ONE item tabbable** | (gap → improvement) | Selected item gets `tabindex="0"`, all others `tabindex="-1"`. If nothing selected, first non-disabled item is tabbable. **Today this is hand-wired in the spec; needs to be automated via `KjRovingTabindex` on the group.** |
| **Arrow-key navigation** | (gap → improvement) | Up/Down + Left/Right move focus between items, wrapping at ends. Home/End jump to first/last. **Today: not implemented.** Add via `KjRovingTabindex` extension. |
| **Selection-follows-focus** | (gap → improvement) | Per APG, focusing an item via arrow key should also select it. Tab/Shift+Tab into the group restores focus to the selected item without changing selection. **Today: not implemented.** Land alongside roving tabindex. |
| **Skip disabled items** | (gap → improvement) | Roving tabindex must skip items where `(group.disabled() || item.disabled())`. **Today: primitive doesn't skip.** |
| **Space activation** | `KjRadio` core | `(keydown.space)` calls `e.preventDefault(); select()`. Already shipped. |
| **Enter activation** | `KjRadio` core | `(keydown.enter)` calls `select()`. APG marks Enter as optional but it matches muscle memory; harmless. Already shipped. |
| **`aria-disabled` (group)** | (gap → improvement) | Reflect from `formCtrl.disabled()` and the group's `kjDisabled` input. Group disable cascades to every item. |
| **`aria-disabled` (item)** | improvement | Reflect from `(group.disabled() || item.disabled())`. Today the item only reflects its own `KjDisabled`. |
| **`aria-required`** | (gap → improvement) | Auto-derive from the group's bound `Validators.required`. On the group, not the item. |
| **`aria-invalid`** | improvement | Touched-and-invalid gating, same pattern as `KjInput`. Reflected on the **group**, not on each item. Wired by `KjField` via `KJ_FIELD` context. |
| **`aria-orientation`** | improvement | Reflect `orientation` to `aria-orientation="horizontal"`/`"vertical"` on the group. Default vertical per APG. |
| **`aria-describedby`** | `KjField` wrapper | The field's hint + error id chain is applied to the **group** host, not to each item. |
| **Touch target ≥ 44×44 (WCAG 2.5.5)** | wrapper CSS | The clickable `<label>` (dot + text) must clear 44×44. Today the dot is `1rem` and the label is `font: 0.875rem / 1.4` — the row is ~22px, **below 44px**. Improvement: bump the label's hit area (padding + min-block-size: 2.75rem) without enlarging the dot itself. |
| **Color/contrast** | themes layer | `--kj-color-primary` for the checked dot inner fill must hit ≥ 7:1 against `--kj-color-base-100` (the dot bg). `--kj-color-neutral` (border) must hit ≥ 3:1 against the background. The `:focus-visible` outline already meets ≥ 3:1 via `--kj-color-primary`. |
| **Focus-visible** | `KjRadio` core | `KjFocusRing` composed via `hostDirectives`; `data-focus-visible` on keyboard focus. CSS targets `:focus-visible`. Already shipped. |
| **Disabled focusability policy** | core | Items composed `KjDisabled` reflect `aria-disabled`, NOT native `disabled`. Disabled items remain focusable so screen readers can still announce them — matches `KjButton`'s AAA stance. The wrapper additionally sets `pointer-events: none` on the dot when disabled (already shipped) which is fine because keyboard arrow navigation skips disabled items at the roving-tabindex layer. |
| **`fieldset` + `legend`?** | n/a | NOT needed. `role="radiogroup"` + accessible name is the modern pattern. Consumers may still wrap in `<fieldset>` for visual grouping; that's their call. |

Most-important AAA gap: **roving tabindex with selection-follows-focus, plus
disabled-skip**. Without this, arrow keys do nothing in a Radio group, and
Tab walks every single radio in the group — both fail
[2.1.1 Keyboard](https://www.w3.org/TR/WCAG21/#keyboard) and
[4.1.2 Name, Role, Value](https://www.w3.org/TR/WCAG21/#name-role-value)
expectations for a `radiogroup`.

## Composition model

Two attribute directives, mediated by a DI token. **Group is the form
control**, item is presentation + click target.

```ts
// Group — the form control + selection owner
@Directive({
  selector: '[kjRadioGroup]',
  hostDirectives: [
    { directive: KjDisabled, inputs: ['kjDisabled'] },
    KjRovingTabindex,        // proposed — with kjSelectOnFocus = true
    KjFormControl,           // proposed — moved from item to here
  ],
  providers: [{ provide: KJ_RADIO_GROUP, useExisting: KjRadioGroup }],
  host: {
    role: 'radiogroup',
    '[attr.aria-orientation]': 'orientation()',  // proposed
    '[attr.aria-required]': 'required() || null',  // proposed
    '[attr.aria-disabled]': 'formCtrl.disabled() || null',
  },
})
export class KjRadioGroup implements KjRadioContext { /* … */ }

// Item — leaf presentation + activation
@Directive({
  selector: '[kjRadio]',
  hostDirectives: [
    { directive: KjVariant, inputs: ['kjVariant'] },   // proposed
    { directive: KjSize,    inputs: ['kjSize'] },       // proposed
    { directive: KjDisabled, inputs: ['kjDisabled'] },
    KjRovingTabindexItem,                              // proposed — for the group's roving
    KjFocusRing,
  ],
  providers: [...bindPresets(KJ_RADIO_CONFIG)],         // proposed
  host: {
    role: 'radio',
    '[attr.aria-checked]': 'checked().toString()',
    '[attr.data-checked]': 'checked() ? "" : null',
    '[attr.aria-disabled]': '(group.disabled() || disabled()) ? "true" : null',
    '(click)': 'select()',
    '(keydown.space)': 'onSpace($event)',
    '(keydown.enter)': 'select()',
  },
})
export class KjRadio { /* … */ }
```

**Why the split is correct.**

- **`KjFormControl` belongs on the group.** A radio group has one value; the
  group is the form control. Items are stateless w.r.t. forms — they just
  ask the group what's selected and tell the group when the user clicks.
  Material agrees; we should too.
- **`KjVariant` / `KjSize` belong on the item.** An item has visual variant
  (the dot's look) and size (the dot's diameter / hit-region). The group is
  a layout shell with no rendering of its own.
- **`KjDisabled` on both.** Group-level disable cascades; item-level
  disable is per-item. Item's effective disabled = `group.disabled() ||
  item.disabled()`.
- **`KjRovingTabindex` on the group; `KjRovingTabindexItem` on each item.**
  Already the established split for that primitive (toolbar / tablist
  use it the same way).
- **`KjFocusRing` on the item.** Each item has its own focus ring.
- **`KjField` integration via `KJ_FIELD`.** The group injects `KJ_FIELD`
  optionally. When present:
  - The field auto-mints an id and applies it to the group host.
  - The field's `<label kjFieldLabel>` registers as `aria-labelledby` on
    the group.
  - The field's hint/error id chain is applied as `aria-describedby` on
    the group.
  - Touched-and-invalid drives `aria-invalid` / `data-invalid` on the
    group.
  - `Validators.required` on the bound control flows to `aria-required`
    on the group.
  This is one-call-site registration in `KjRadioGroup`'s constructor:
  `inject(KJ_FIELD, { optional: true })?.registerControl(this)`. The
  field reads `KjFormControl` from the group's host directives (since
  the group owns it). Mirrors Material's `MatFormFieldControl` pattern
  but generalized.

**Cross-component pointers:**

- **`data-input/field.md`** — `KjField` is the label + hint + error wrapper.
  Radio integrates by injecting `KJ_FIELD` on the **group**, not on items.
  The field's accessible name (label) becomes the group's `aria-labelledby`;
  the describedby chain hits the group host. Critical: the field must detect
  that the registered control has `role="radiogroup"` and use its host as
  the labelled element (not, say, the first item).
- **`data-input/checkbox.md`** — sibling. Identical primitives composition
  (`KjFocusRing`, `KjDisabled`, `KjFormControl`), identical role-on-div
  vs native-input decision, identical Space activation. Differences:
  Checkbox is a single control (no group / no roving tabindex / no
  selection-follows-focus); Checkbox's `aria-checked` includes a third
  `'mixed'` state for indeterminate; Radio's mutual-exclusion is intrinsic
  to the group's `model<unknown>` (you can't get into the "two checked"
  state because writing a new value clears the previous).
- **`data-input/form.md`** — top-level form orchestration. Radio groups
  (not items) participate in form-level validation summaries and submit
  blocking. Nothing radio-specific.
- **`actions/toggle-group.md`** *(future)* — `KjToggleGroup` is the visually-
  similar UX for exclusive selection rendered as connected buttons (think
  "Bold / Italic / Underline" toolbar groups, or "Day / Week / Month" view
  toggles). Mechanically very close to Radio:
  - Same `role="radiogroup"` (single-select mode) or `role="group"` +
    items with `aria-pressed` (multi-select mode).
  - Same roving tabindex + arrow-key navigation.
  - Same selection-follows-focus (single-select) or Space-toggle
    (multi-select).
  - **Difference:** Toggle group items are styled as `<button>` chips, not
    radio dots. Toggle group also supports a **multi-select** mode
    (`type="multiple"`) which Radio does not. The two should share the
    `KJ_RADIO_GROUP`-shaped context (rename to `KJ_SELECTION_GROUP`?) so
    a single roving primitive serves both. Defer the rename until
    `KjToggleGroup` ships; cross-link from there.
- **`actions/select-button.md`** *(future, PrimeNG calls it `SelectButton`)* —
  same as Toggle Group. Effectively a UI-styling skin over the same
  selection model as Radio. Re-uses `KJ_RADIO_GROUP` context (or its
  rename) and roving tabindex; the wrapper is just a different CSS skin
  (button-shaped items, no dot, instead a "pressed" data state).
- **`data-input/select.md`** — Select is *also* exclusive selection but
  via an overlay (listbox). Not a sibling of Radio — different UX, different
  ARIA pattern (`role="combobox"` / `role="listbox"`). Cross-reference for
  "how do I pick one of N options" as the alternative when N > ~5 or
  vertical space is tight.
- **`data-input/toggle.md`** — sibling. Single binary toggle (`aria-pressed`),
  no group, no roving. Composition is the same except the model is
  `model<boolean>` and there's no item directive.
- **`a11y/roving-tabindex` primitive** — the existing
  `KjRovingTabindex` / `KjRovingTabindexItem` at
  `packages/core/src/a11y/roving-tabindex.ts` is the foundation. Needs the
  three additions described above (selection-on-focus, skip-disabled,
  initialise-from-selected). Those three additions also benefit the future
  Tabs / Toolbar / Listbox / Combobox / Toggle Group consumers.

## Inputs / Outputs / Models — `kj`-prefixed

### Group directive (`KjRadioGroup`, selector `[kjRadioGroup]`)

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjValue` | `model<unknown>(undefined)` | `undefined` | The selected value. Two-way bind via `[(kjValue)]`. Wrapper aliases to `value`. |
| `kjDisabled` | forwarded via `hostDirectives` to `KjDisabled` | `false` | Group-level disable. Cascades to every item via the item's `(group.disabled() \|\| item.disabled())` computation. |
| `kjReadonly` | *(proposed)* `input<boolean>(false)` | `false` | Reflects `aria-readonly` + `data-readonly`. `select()` becomes a no-op. |
| `kjOrientation` | *(proposed)* `input<'horizontal' \| 'vertical'>('vertical')` | `'vertical'` | Reflects to `aria-orientation` + `data-orientation`. Drives roving tabindex's primary axis. Wrapper aliases to `orientation` today (rename to `kjOrientation` per `kj` prefix rule). |
| `kjName` | *(proposed)* `input<string \| undefined>(undefined)` | auto-minted | Group name. Used by the optional hidden-native-input rendering for non-Angular form submission. Auto-minted via Angular's id generator if not set. |
| `kjAriaLabel` | wrapper | `undefined` | Passthrough to `aria-label` on the host. Only needed when there's no `KjField` parent and no external `aria-labelledby`. |

**Bidirectional value flow.** Reactive forms / `[(ngModel)]` bind to the
group's `KjFormControl` (post-improvement). The `kjValue` `model<unknown>` is
kept in sync via an `effect()` that mirrors `formCtrl.value()` →
`kjValue.set(...)` and vice versa via `select(val)` →
`formCtrl.notifyChange(val)`.

**No `kjValueChange` output is needed** — `model<unknown>` already exposes
`(kjValueChange)` for templates that don't want two-way binding. The wrapper
exposes `(valueChange)`.

### Item directive (`KjRadio`, selector `[kjRadio]`)

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjRadioValue` | `input.required<unknown>()` | — | The value this item represents. Required. Wrapper aliases to `value`. |
| `kjDisabled` | forwarded via `hostDirectives` to `KjDisabled` | `false` | Per-item disable. Effective disabled = `(group.disabled() \|\| this)`. |
| `kjVariant` | *(proposed)* forwarded to `KjVariant` | `'default'` (from `KJ_RADIO_CONFIG`) | Validated against preset list. |
| `kjSize` | *(proposed)* forwarded to `KjSize` | `'md'` (from `KJ_RADIO_CONFIG`) | Validated against preset list. |
| `kjLabelPosition` | *(proposed, wrapper-only)* `input<'before' \| 'after'>('after')` | `'after'` | Reflects to `data-label-position`; CSS swaps flex direction. |
| `kjAriaLabel` / `kjAriaLabelledBy` | passthrough | — | Each item needs its own accessible name; defaults to the projected text content when wrapped by `<label>` (already shipped via `aria-labelledby` to the inner `<span>`'s id). |

**No `kjChecked` model on the item.** Checked state is *derived* from the
group's value, not stored locally. This is the key difference from
`KjCheckbox` (which has `kjChecked = model<boolean>(false)`). Selection is
exclusive and group-owned; items must not be able to set their own checked
independently.

### Wrapper components

`KjRadioGroupComponent` (selector `kj-radio-group`):

| Name | Type | Default | Notes |
|---|---|---|---|
| `value` (currently — should be `kjValue`) | model passthrough | `undefined` | Wrapper aliases the directive's `kjValue` model. **`kj` prefix violation — improvement.** |
| `orientation` (currently — should be `kjOrientation`) | `input<'horizontal' \| 'vertical'>('vertical')` | `'vertical'` | Reflects to `data-orientation`. **`kj` prefix violation.** |
| `ariaLabel` (currently — should be `kjAriaLabel`) | `input<string \| undefined>(undefined)` | `undefined` | Forwarded to host `aria-label`. **`kj` prefix violation.** |
| `kjDisabled` *(proposed)* | passthrough | `false` | Group-level disable. |
| `kjReadonly` *(proposed)* | passthrough | `false` | |

`KjRadioComponent` (selector `kj-radio`):

| Name | Type | Default | Notes |
|---|---|---|---|
| `value` (currently — should be `kjValue`) | `input.required<unknown>()` | — | Forwarded to `kjRadioValue`. **`kj` prefix violation — improvement.** |
| `disabled` (currently — should be `kjDisabled`) | `input(false)` | `false` | Forwarded to `KjDisabled`. **`kj` prefix violation.** |
| `kjVariant` *(proposed)* | passthrough | `'default'` | |
| `kjSize` *(proposed)* | passthrough | `'md'` | |
| `kjLabelPosition` *(proposed)* | `input<'before' \| 'after'>('after')` | `'after'` | |

All `kj`-prefixed names follow shape (A) — property name carries the prefix —
since the directive selector already starts with `kj`.

## Examples to ship

Match the structure already partly under `packages/components/src/radio/`:

1. **Default** — `radio.default.example.ts` *(exists)*. Vertical group of
   three options, second pre-selected.
2. **Group** — `radio.group.example.ts` *(exists)*. Four-option pricing-plan
   selector. (Slightly redundant with default; consider folding in.)
3. **Disabled (item-level)** — `radio.disabled.example.ts` *(exists)*. One
   option disabled, others selectable.
4. **Disabled (group-level)** — `radio.group-disabled.example.ts` *(new)*.
   Whole group disabled; demonstrates cascade. **Depends on group
   `kjDisabled` improvement.**
5. **Inline (horizontal)** — `radio.inline.example.ts` *(exists)*. Yes/No/
   Abstain row. Demonstrates `orientation="horizontal"`.
6. **Variants** — `radio.variants.example.ts` *(new)*. `default`, `filled`,
   `outline`, `ghost` side-by-side. Depends on `KjVariant` integration.
7. **Sizes** — `radio.sizes.example.ts` *(new)*. `sm`, `md`, `lg`.
   Demonstrates 44×44 hit region on `md`+.
8. **Reactive form** — `radio.reactive.example.ts` *(new)*. `FormControl`
   bound to the group, `Validators.required`, error message via
   `KjFieldError`, touched-gated invalid styling on the group host.
9. **Template-driven form** — `radio.ngmodel.example.ts` *(new)*. Same with
   `[(ngModel)]` on the group.
10. **In a field** — `radio.field.example.ts` *(new)*. Group wrapped in
    `<kj-field>` with `<label kjFieldLabel>` and `<span kjFieldError>` —
    canonical labelled + error composition.
11. **Card-style** — `radio.card.example.ts` *(new, recipe)*. Each item
    projects a richer card body (title + description + icon). Demonstrates
    that the headless layer is sufficient — no new component needed.
12. **Configured presets** — `radio.configured.example.ts` *(new)*. Extends
    the variant list via `provideKjRadio`.
13. **Object values** — `radio.object-values.example.ts` *(new)*. Each item's
    `value` is an object; demonstrates reference-equality requirement and
    suggests `compareWith`-style escape hatch (see Open questions).

## Open questions / risks

- **Move CVA from item to group.** Largest correctness fix. Today
  `KjRadio` composes `KjFormControl` and `KjRadioGroup` doesn't. Outcome:
  reactive forms / `[(ngModel)]` on items, not the group, which is wrong.
  Land first; everything else (touched-on-blur-of-group, group disable
  via `setDisabledState`, `aria-required` derivation) depends on it.
- **Roving tabindex with selection-follows-focus.** Largest a11y gap. Three
  primitive additions: `kjSelectOnFocus`, `kjOrientation`, skip-disabled.
  Plus an `initialActiveIndex` mechanism so the selected item starts as
  tabbable. Land via `KjRovingTabindex` extension; cross-applies to Tabs
  / Toolbar / Listbox / Combobox / Toggle Group future consumers. The
  cleanest shape is a `KJ_ROVING_SELECTION` context that consumers (radio
  group, toggle group, …) implement to bridge active-index changes to
  their own selection model. Avoid coupling the primitive to radio-specific
  semantics.
- **`kj` prefix on the wrapper inputs.** Currently `value`, `orientation`,
  `ariaLabel`, `disabled` — should be `kjValue`, `kjOrientation`,
  `kjAriaLabel`, `kjDisabled` per `rules/code_style.md`. Sibling-wide
  issue (Input has the same one). Coordinate the rename across all
  wrappers in one breaking-change pass.
- **Reference equality of `kjRadioValue`.** Today `checked = computed(() =>
  group.value() === item.kjRadioValue())`. For object values (e.g. `{ id: 1,
  name: 'foo' }`) this requires the consumer to reuse references. Either
  document the contract clearly or add a `compareWith: (a, b) => boolean`
  input on the group (Material does this on `<mat-radio-group>` —
  actually no, Material doesn't, but `<mat-select>` does, and the same
  argument applies). Recommend adding `kjCompareWith` on the group to
  match `KjSelect`.
- **Disabled item: focusable or skipped?** Two camps:
  - **Skip in roving** (Material): focus never lands on disabled items via
    arrows; Tab can't reach them either (they have `tabindex="-1"`).
    Pro: matches user expectation that disabled = "leave me alone."
    Con: screen-reader users can't know the option exists.
  - **Focusable but inert** (Button policy in this codebase): focus lands
    on disabled items via arrows; Space/Enter no-op; `aria-disabled="true"`.
    Pro: discoverable. Con: more keypresses for the keyboard user trying
    to skip past disabled options.
  **Recommendation:** match the Button policy (focusable but inert). This
  is the existing kouji house style. Document that arrow keys navigate
  through disabled items; Space/Enter do nothing on a disabled item.
- **`aria-required` placement.** On the group host, derived from the
  group-bound `Validators.required`. The group must `inject(NgControl, {
  optional: true, self: true })` once CVA is moved over. Cheap.
- **Native form submission (no Angular forms).** Defer. If a consumer
  needs the group's value in a non-Angular `<form>` POST, render a single
  hidden `<input type="radio" name="<kjName>" value="<kjRadioValue>"
  [checked]="checked()">` per item. Radix does this. Add behind an opt-in
  `kjEmitNativeInput: boolean` if/when requested.
- **Initial `tabindex` when nothing selected.** Per APG, the **first**
  non-disabled item is tabbable when no selection exists. The roving
  primitive's `initialActiveIndex` must be `0` when `group.value() ===
  undefined`, otherwise the index of the selected item. Skip disabled
  when looking for "the first."
- **Touched timing.** With CVA on the group, `notifyTouched()` fires on
  `(focusout)` of the group host whose `relatedTarget` is outside the
  group. This is correct (matches "user has interacted with this control,
  is now leaving") but trickier than a single-element control's
  `(blur)`. Verify in tests with arrow-key navigation between items
  (should NOT mark touched, focus stays inside the group).
- **`KjField` integration: label points at WHAT?** The field's label needs
  `for=` (HTML5) or `aria-labelledby` (ARIA). For a `radiogroup` (a
  `<div>`, not a focusable form control), `for=` doesn't work — `<label
  for="">` only points to interactive form elements. Solution:
  `aria-labelledby` from the group host to the label's id. Field detects
  the radiogroup case and emits `aria-labelledby` instead of (or in
  addition to) `for=`. Confirm the field implementation does this; if
  not, this is a Field improvement to track in `field.md`.
- **`KjField` `aria-describedby` for radiogroup.** Should land on the
  group host, NOT on each item. The group is the labelled control.
  Same as Material.
- **Radio inside a Form (top-level).** `KjForm` should be unaware that
  Radio is a group of items — it sees the group as a single
  `KjFormControl`-bearing entity, same as Input. No special handling
  needed. Confirm `form.md` does not assume "one DOM element per
  control."
- **Per-item `aria-label` / `aria-labelledby` source of truth.** The
  wrapper today wraps content in a `<label>` and points the dot's
  `aria-labelledby` at the label `<span>`'s generated id. This is correct.
  When consumers project non-text content (icon-only radios), they must
  supply an `aria-label` on the dot directly (passthrough on the wrapper:
  `kjAriaLabel`). Document.
- **Card-style radios + nested interactive content.** A card-style radio
  with a "Learn more" link inside the projected content has nested
  interactive elements; clicking the link should NOT also select the
  radio. The wrapper's current `onLabelClick` handler forwards label-area
  clicks to the dot regardless of `e.target` (it only excludes the dot
  itself). Improvement: also exclude clicks whose target is itself
  interactive (`closest('a, button, [role="button"], input, select,
  textarea')`). Same fix Material applies.
- **`compareWith` for object values.** See above. Add `kjCompareWith:
  input<(a: unknown, b: unknown) => boolean>(Object.is)` on the group;
  use in `KjRadio.checked`'s computation.
- **Group focus restoration.** When an item is removed from the DOM (e.g.
  filtering), if it was the tabbable one, the roving primitive must
  re-elect the new tabbable item. Today the primitive's `effect()` over
  `contentChildren` will run, but if `activeIndex` is now out of bounds,
  the `tabindex="0"` ends up on no one. Add a clamp: `activeIndex.set(
  Math.min(activeIndex(), all.length - 1))` after the items signal
  changes, and prefer the index of the now-selected item if any.
- **`<kj-radio-group>` projection ordering.** The wrapper renders
  `<ng-content />`. If consumers wrap `<kj-radio>` items in additional
  `<div>`s for layout, the `kjRadio` directive still finds its
  `KJ_RADIO_GROUP` (DI traverses the host hierarchy), but the
  `contentChildren(KjRadio)` query on the group would NOT find them
  (descendants are off by default). When migrating to the
  contentChildren-based roving tabindex source, set `{ descendants: true
  }` on the query. Verify with a "wrapped items" test.
- **Spec coverage gaps.** The current `radio.spec.ts` covers:
  radiogroup role, role="radio" on items, `aria-checked="true"` on the
  selected, click selects, jest-axe pass. It does NOT cover: arrow-key
  navigation, Tab order (only one tabbable), selection-follows-focus,
  Home/End, Space, Enter, disabled-skip, group disable cascade, forms
  binding (CVA write/read), touched-on-focus-out, `aria-required`,
  `aria-orientation`. Land these alongside each improvement.
- **SSR.** Both directives are SSR-safe (no DOM access in constructors;
  the click forwarding in the wrapper happens at runtime only). Confirm
  with an SSR smoke test in the apps workspace once the wrapper's
  improvements land.
