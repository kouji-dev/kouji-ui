# Select

A **Select** is a custom-rendered, value-bearing dropdown that lets the user pick
exactly one value from a list. The collapsed state shows a trigger button
displaying the current selection (or a placeholder); activating the trigger
opens a popover-anchored listbox of options, and choosing one closes the panel
and writes the selected value into the form model.

This component is *not* a styled `<select>` — those duties live in the parallel
[`KjNativeSelect` directive](#native-fallback-kjnativeselect) (see Decision
below). The custom Select owns: keyboard contract beyond what `<select>` gives
for free (including type-ahead with multi-character buffer, Home/End,
PageUp/PageDown), composable groups/labels/separators, item rendering with
slots (icons, descriptions, two-line layouts), reactive-forms integration via
`KjFormControl`, `KjField` integration for label/error/describedby, anchored
positioning via the shared Popover anchor, and full WAI-ARIA 1.2 combobox
semantics on the trigger + listbox role on the panel.

**Already shipped:** `KjSelect` + `KjSelectTrigger` + `KjSelectContent` +
`KjOption` (`packages/core/src/select/select.ts`), with a thin styled wrapper
`KjSelectComponent` + `KjOptionComponent`
(`packages/components/src/select/select.ts`). The current shape matches
`Dropdown Menu` architecturally but is incomplete: no Popover anchor, no
`KjSelectGroup` / `KjSelectLabel` / `KjSelectSeparator`, no
`ControlValueAccessor` wiring, no `KjField` registration, no focus restoration,
no `aria-haspopup="listbox"`, no `aria-controls`, no roving tabindex (each
option carries `tabindex="0"`), no live-region announcements, no native-select
fallback. This document captures the existing shape, specifies the missing
pieces against the source comparison, and serves as the canonical pattern for
sibling overlays-of-options
([`combobox.md`](./combobox.md), [`multi-select.md`](./multi-select.md),
[`cascade-select.md`](./cascade-select.md), [`tree-select.md`](./tree-select.md)).

## Source comparison

### PrimeNG — `<p-select>` ([primeng.org/select](https://primeng.org/select))

PrimeNG's `Select` (formerly `Dropdown` pre-v18) is a single component, not a
compound. The consumer passes `[options]="data"`, plus `optionLabel` /
`optionValue` / `optionDisabled` / `optionGroupLabel` / `optionGroupChildren`
strings to descriptor-walk the data. Slots (`#item`, `#selectedItem`,
`#header`, `#footer`, `#emptyfilter`) are `ng-template` children — not
sub-components.

Surface (PrimeNG 18, `<p-select>`):

| Input                          | Notes                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| `options`                      | `any[]` — flat list or grouped list when `group=true`.                                |
| `optionLabel` / `optionValue`  | String paths into each option object.                                                |
| `optionDisabled`               | String path or function — disabled-per-option.                                        |
| `optionGroupLabel` / `optionGroupChildren` | String paths for grouped data.                                            |
| `placeholder`                  | String shown when no value is selected.                                              |
| `filter` / `filterBy` / `filterPlaceholder` / `filterMatchMode` | Built-in case-insensitive substring search; `filterMatchMode` is `'contains' \| 'startsWith' \| ...`. |
| `editable`                     | Lets the user type a free-form value (combobox mode — *not* what kouji's Select does — see Combobox). |
| `showClear`                    | Renders an inline clear button.                                                       |
| `dropdownIcon` / `clearIcon`   | Icon overrides.                                                                       |
| `appendTo`                     | `'body' \| ElementRef \| string` — escape clipping containers.                        |
| `scrollHeight`                 | Px string limiting the panel height.                                                  |
| `virtualScroll` / `virtualScrollItemSize` | Long lists.                                                                |
| `panelStyleClass` / `styleClass` | CSS hooks.                                                                          |
| `disabled` / `readonly` / `loading` | States.                                                                          |
| `tabindex`                     | Integer.                                                                              |
| `ariaLabel` / `ariaLabelledBy` | A11y name forwarded to the trigger.                                                  |
| `tooltip`                      | Tooltip on the trigger.                                                               |
| `lazy`                         | Defer panel render until first open.                                                  |
| `autoOptionFocus` / `autofocusFilter` / `selectOnFocus` / `focusOnHover` | Focus tuning. |
| `resetFilterOnHide` / `clearOnHide` | Lifecycle of filter state.                                                       |

Outputs: `onChange`, `onShow`, `onHide`, `onFilter`, `onFocus`, `onBlur`,
`onClear`, `onLazyLoad`.

Form integration: standard CVA — `[(ngModel)]` / `[formControl]` on
`<p-select>` itself.

A11y: trigger renders as `role="combobox"` with `aria-haspopup="listbox"` and
`aria-expanded`; panel is `role="listbox"`; items are `role="option"` with
`aria-selected`. Type-ahead is built in. Keyboard: ArrowDown / ArrowUp,
Home / End, Enter / Space, Escape, type-ahead. Filter input lives inside the
panel; when `editable`, the trigger itself becomes a free-text combobox
(blurs the line with `<p-autoComplete>`).

Critique:
- **Data-first API.** `[options]="data"` plus stringly-typed property paths is
  the same complaint as `<p-menu>`. Per-item template (`#item`) is a slot, not
  a sub-component, so per-row composition is awkward (no per-option directive
  to attach behavior to, no easy way to slot in icons + secondary text + a
  trailing keyboard shortcut hint).
- **`editable` mode conflates two components.** kouji splits this: read-only
  pick-from-list is `KjSelect`; type-to-filter-then-pick is `KjCombobox`
  ([`combobox.md`](./combobox.md)).
- **Built-in filter is short-list-only.** PrimeNG's filter is fine for ~50
  options; for longer lists it pairs poorly with `virtualScroll`. We follow
  the same split: type-ahead in `KjSelect`, real filter only in `KjCombobox`.
- **No `KjFormField`-equivalent integration.** The consumer wires
  `aria-labelledby` themselves.

### Angular Material — `<mat-select>` ([material.angular.dev/components/select](https://material.angular.dev/components/select))

Material's Select is the closest reference for kouji because the
`MatFormFieldControl` wiring is exactly the contract `KjField` expects.

Surface:

| Class                         | Inputs / Methods                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------- |
| `<mat-select>` (`MatSelect`)  | `value`, `placeholder`, `required`, `disabled`, `multiple`, `disableOptionCentering`, `panelClass`, `panelWidth`, `compareWith: (a, b) => boolean`, `errorStateMatcher`, `typeaheadDebounceInterval`, `sortComparator`, `id`, `ariaLabel`, `ariaLabelledby`, `tabindex`. |
| `<mat-option>` (`MatOption`)  | `value`, `disabled`, `id`, `viewValue` (computed from projected text), `selected`, `multiple`. |
| `<mat-optgroup>` (`MatOptgroup`) | `label`, `disabled`. Renders a heading + group of options.                       |
| `<mat-select-trigger>` (`MatSelectTrigger`) | A projected `ng-content` slot used to **override** the trigger's display when the default "show option text" is wrong (e.g. avatar + name in trigger, full info in option). |

Outputs: `selectionChange`, `valueChange` (CVA), `openedChange`,
`opened`, `closed`, `_stateChanges` (internal for form-field).

Behaviour worth lifting:

- **Compound with `<mat-option>` and `<mat-optgroup>` content-projected
  children.** No data-driven option list. Each option is its own component, so
  per-option icons / templates / structure compose naturally. This is exactly
  the shadcn shape too.
- **`<mat-select-trigger>` slot.** The trigger's *display* defaults to the
  selected option's `viewValue` (textContent). When richer rendering is
  needed, the consumer projects a `<mat-select-trigger>` into the select that
  takes over the trigger's content. We adopt this — see `KjSelectValue` slot.
- **`compareWith`.** Object-valued options need a custom comparator
  (`(a, b) => a?.id === b?.id`); reference equality alone is too brittle.
  Material exposes this; we mirror as `kjCompareWith`.
- **`MatFormFieldControl` integration.** The select carries
  `id`, `placeholder`, `required`, `disabled`, `errorState`, `empty`,
  `focused`, `userAriaDescribedBy`, `setDescribedByIds`, plus the
  `_stateChanges` Subject the form-field listens to. **kouji replaces this
  with `KjFormControl` host directive + `KJ_FIELD` registration** — same
  contract, no per-control `MatFormFieldControl` boilerplate.
- **Typeahead with debounce.** `typeaheadDebounceInterval` (default 200ms)
  buffers consecutive keystrokes for a single match. We need this — the
  current `KjSelectContent` matches one character at a time.
- **`disableOptionCentering`.** Material's panel by default vertically aligns
  the selected option with the trigger (overlay scroll math). We do **not**
  ship this; default is bottom-anchor (Popover-style). Document explicitly —
  it's a Material idiom that surprises users coming from PrimeNG / shadcn.
- **No filter.** Material Select intentionally has no built-in filter; for
  filtering, Material directs users to `<mat-autocomplete>` (its Combobox).
  Same split as kouji.
- **Roving tabindex on the panel.** Each option gets `tabindex="-1"`; the
  panel's host element manages keyboard focus via `aria-activedescendant`.
  Material's chosen pattern is `aria-activedescendant` (panel keeps DOM
  focus, virtual cursor moves between options) rather than roving tabindex
  (real focus moves between option DOM nodes). **Decision below:** kouji
  uses `aria-activedescendant` to match Material — see Composition.

Critique:
- Heavy CDK (overlay, a11y, scrolling). Out of bounds for kouji.
- `disableOptionCentering` default is footgun-y: forms with selects in a
  scrollable container behave erratically.
- `<mat-select>` only works inside `<mat-form-field>` — opinionated; we
  permit standalone use (label is then the consumer's responsibility, like
  `KjInput`).

### shadcn/ui — `Select` (Radix) ([ui.shadcn.com/docs/components/select](https://ui.shadcn.com/docs/components/select))

shadcn ships a Radix-based compound:

```tsx
<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select a fruit" />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Fruits</SelectLabel>
      <SelectItem value="apple">Apple</SelectItem>
      <SelectItem value="banana">Banana</SelectItem>
      <SelectSeparator />
      <SelectItem value="grape">Grape</SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>
```

Plus **`SelectScrollUpButton` / `SelectScrollDownButton`** when the list
exceeds the panel height (Radix's built-in scroll-anchored buttons replacing
the native scrollbar — useful when the list is just slightly taller than the
panel).

Sub-components:

| Component                | Role                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `Select` (root)          | State container. Owns `value`, `open`, `dir`, `name`, `disabled`. Provides context.        |
| `SelectTrigger`          | The collapsed-state button. `role="combobox"`, `aria-haspopup="listbox"`, `aria-expanded`. |
| `SelectValue`            | Slot inside the trigger that renders the current selection's display text or a placeholder. |
| `SelectContent`          | Panel host. Anchored. `role="listbox"`. Keyboard contract owner.                            |
| `SelectViewport`         | Scroll container inside the content.                                                        |
| `SelectItem`             | One option. `role="option"`, `aria-selected`. Handles activation.                            |
| `SelectItemText` / `SelectItemIndicator` | Slots inside an item (display text + a checkmark-when-selected).                |
| `SelectGroup`            | `role="group"` wrapping a label + items.                                                     |
| `SelectLabel`            | Label projected into a group; `aria-labelledby` wired by the group.                          |
| `SelectSeparator`        | `role="separator"`.                                                                          |
| `SelectScrollUpButton` / `SelectScrollDownButton` | Sticky scroll affordances at panel top / bottom.                       |

Behaviour worth lifting:

- **`SelectValue` as a separate sub-component.** Cleanly separates "what gets
  shown when the listbox is closed" from the trigger button itself. The
  default rendering is "the selected option's text"; when a consumer wants
  richer trigger content (avatar + name) they project into `SelectValue`
  with its own template-context like Material's `<mat-select-trigger>`.
- **`SelectItemIndicator`.** A child slot inside an item that's only rendered
  when the item is selected — typically a checkmark. shadcn / Radix put the
  rendering control in the consumer's hands; we mirror via a `KjSelectItemIndicator`
  directive that hides itself when the parent option isn't selected.
- **Native form participation via hidden `<input>`.** Radix renders a
  `<input type="hidden" name=...>` synced to `value` so a Select inside a
  `<form>` participates in native submission. Angular's reactive forms make
  this less necessary, but it's still useful for plain `<form action=...>`
  postbacks. **Decision:** ship via `kjName` input (see Inputs).
- **Per-side scroll arrows.** Useful but not WCAG-required. Defer to v1.1
  unless a theme needs it.

Critique:
- Radix's `dir="rtl"` story is good; we mirror.
- React-only library — patterns transfer, code does not.

### shadcn/ui — `NativeSelect` ([ui.shadcn.com/docs/components/native-select](https://ui.shadcn.com/docs/components/native-select))

shadcn also ships a styled `<select>` wrapper as a sibling of the custom
Select. Reasons given in the docs:

1. **Mobile UX.** The OS-native picker on iOS / Android is *better* than any
   custom listbox for short lists — wheel pickers, accessibility-language
   integration, screen-reader pacing tuned to platform.
2. **Forms in dense UIs.** When you have ten selects in a row (admin tables,
   filter bars), the heavyweight custom Select becomes visually noisy.
   Native `<select>` is dense and predictable.
3. **JS-disabled progressive enhancement.** Native works without JS.

API: a thin `<select>` styled to match the design system. No compound; just
the bare element + theme classes.

**Pattern picked up.** kouji should ship a parallel `KjNativeSelect`
**directive** (not a separate styled component) that adds variant / size /
disabled / focus-ring / form-control composition on a native `<select>`
element. See [Decision: Native fallback](#native-fallback-kjnativeselect).

### Cross-library summary

|                              | PrimeNG `<p-select>`   | Material `<mat-select>` | shadcn (Radix)         | kouji direction                                          |
| ---------------------------- | ---------------------- | ----------------------- | ---------------------- | -------------------------------------------------------- |
| Composition                  | data-driven (`options`) | compound (`<mat-option>`) | compound               | **compound** (`KjSelect` + `Trigger` + `Content` + `Option` + `Group` + `Label` + `Separator`) |
| Trigger value slot           | `#selectedItem`        | `<mat-select-trigger>`  | `<SelectValue>`        | **`[kjSelectValue]`** directive (slot)                   |
| Item indicator (selected ✓)  | none                   | leading-icon column reserved when `multiple` | `<SelectItemIndicator>` | **`[kjSelectItemIndicator]`** directive (slot inside option) |
| Group + label                | `optionGroupLabel` data field | `<mat-optgroup label>` | `<SelectGroup>` + `<SelectLabel>` | **`[kjSelectGroup]` + `[kjSelectLabel]`**         |
| Separator                    | none                   | none                    | `<SelectSeparator>`    | **`[kjSelectSeparator]`**                                 |
| Filter                       | built-in               | none — use Autocomplete | none — use Combobox    | **none — use `KjCombobox`**                              |
| Editable / free-text         | `editable`             | n/a                     | n/a                    | **n/a — use `KjCombobox`**                                |
| Multiple selection           | `multiple`             | `multiple`              | n/a — use `MultiSelect` | **n/a — use `KjMultiSelect`**                             |
| Native form participation    | CVA                    | CVA                     | hidden `<input>`       | **CVA via `KjFormControl`**, plus optional `kjName` for native postback |
| Focus model on panel         | `aria-activedescendant`| `aria-activedescendant` | roving tabindex        | **`aria-activedescendant`** (matches Material; see Decision) |
| Anchored positioning         | CDK overlay            | CDK overlay             | Floating UI            | **shared `KjAnchor` primitive** (see Popover)             |
| Scroll arrows                | scrollable panel       | scrollable panel        | per-side arrow buttons | scrollable panel; arrows deferred                         |
| Native fallback              | n/a                    | n/a                     | `NativeSelect` sibling | **`[kjNativeSelect]` directive** (see Decision)           |
| `compareWith`                | `dataKey`              | `compareWith`           | string-equality only   | **`kjCompareWith`** (mirrors Material)                    |
| `clearable`                  | `showClear`            | n/a                     | n/a (Radix)            | **`kjClearable`** input on root                           |
| Typeahead                    | yes (1 char)           | yes (debounced multi-char) | yes (Radix multi-char) | **multi-char debounced** (default 200 ms)               |
| Touch open                   | tap                    | tap                     | tap                    | tap                                                       |
| Mobile native picker         | n/a                    | n/a                     | sibling                | **sibling `KjNativeSelect`** for the explicit mobile case |

## Decision — needs a core directive?

**Yes — a Select compound family** (one root + six children + an optional
indicator slot), plus a parallel **`[kjNativeSelect]`** directive for the
native fallback. Both already partially live in core.

### 1. Compound shape (extend the existing family)

| Directive                             | Status          | Role                                                                                                            |
| ------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------- |
| `[kjSelect]` (root, value-bearing)    | exists, extend  | Owns `value`, `open`, the registered options list, `kjMultiple` flag (false here; true for `KjMultiSelect`), `compareWith`. Provides `KJ_SELECT`. |
| `[kjSelectTrigger]`                   | exists, harden  | The collapsed-state button. Owns `role="combobox"`, `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls`. Wires open/close and the keyboard-to-open contract. |
| `[kjSelectValue]`                     | **new**         | Slot directive inside the trigger. Renders the selected option's display text by default, or projected `<ng-content>` when used as a wrapper. Hidden when no value, with `[kjSelectPlaceholder]` shown instead. |
| `[kjSelectContent]`                   | exists, refactor | Panel host. `role="listbox"`. Owns `aria-activedescendant`, type-ahead buffer, anchored positioning via Popover anchor primitive, click-outside, focus restoration. |
| `[kjSelectOption]` (rename `[kjOption]` → `[kjSelectOption]`) | exists, rename | One option. `role="option"`, `aria-selected`, `aria-disabled`. Activation calls `ctx.select(value)`. The current `[kjOption]` selector survives as a deprecated alias until v1.0 (consistent with how `KjFormField` → `KjField` is being handled in [`field.md`](./field.md)). |
| `[kjSelectItemIndicator]`             | **new**         | Slot inside `[kjSelectOption]` rendered only when the option is selected. Typically a checkmark icon. `aria-hidden="true"` (the option carries the `aria-selected` semantics; the indicator is purely visual). |
| `[kjSelectGroup]`                     | **new**         | `role="group"` wrapping a label + options. Auto `aria-labelledby` to a `KjSelectLabel` inside it. |
| `[kjSelectLabel]`                     | **new**         | `role="presentation"` heading text consumed by `aria-labelledby` on the group. Mirrors `[kjMenuLabel]`. |
| `[kjSelectSeparator]`                 | **new**         | `role="separator"`, non-focusable, skipped by arrow nav and type-ahead.                                            |

The current `[kjSelectContent]` queries the DOM directly for `[kjOption]`
elements (`querySelectorAll('[kjOption]')`). That's a hold-over from the
v0 implementation. **Replace with a registration-based pattern:** options
register themselves on construction with the `KJ_SELECT` context, and
deregister via `DestroyRef`. Same shape used in Tabs, Accordion, and
(future) `KjMenuRadioGroup`. Avoids the DOM walk and works correctly
across `@if` / `@for` insertions and removals. See **Composition** below.

### 2. Why a compound rather than a single `<kj-select>` with a `model: SelectOption[]`

- **Per-option templates.** Real selects in real apps render countries with
  flags, users with avatars, severity levels with coloured dots. Slots-only
  (PrimeNG's `#item`) doesn't compose — there's no per-option directive to
  hostDirective `KjDisabled` / `KjFocusRing` against, and the registered
  `value` is a string-path away from the option object instead of a
  first-class signal-typed input.
- **Reuse of Field / Form / Disabled / Variant / Size primitives.** Each
  child directive composes the standard host-directive set; a
  `model: SelectOption[]` API would have to invent parallel "disabled per
  option" / "variant per option" / "ARIA-disabled per option" plumbing.
- **Architectural symmetry.** Dropdown Menu, Tabs, Accordion, Dialog all
  use compound shapes. Select is in the same shape-family; consumers
  learn the pattern once.

### 3. Native fallback — `[kjNativeSelect]`

**Yes — ship it.** A standalone attribute directive applied to a native
`<select>` element that adds `KjVariant` / `KjSize` / `KjDisabled` /
`KjFocusRing` / `KjFormControl` composition. Critical for:

- Mobile UX (OS-native wheel pickers).
- Dense admin / filter bars where the heavyweight custom Select is wrong.
- Progressive enhancement on JS-disabled clients.
- The "I just want a styled `<select>`" recipe — currently consumers have
  to hand-style a `<select>` with raw Tailwind, losing focus-ring + form
  primitives.

**No new public API outside the directive itself** — the consumer writes
their own `<option>` children. The directive is *not* a compound; it's
the same shape as `[kjInput]` (a leaf attribute directive on a native
element).

```html
<select [kjNativeSelect] kjVariant="filled" kjSize="md" [(ngModel)]="city">
  <option value="">Choose…</option>
  <option value="london">London</option>
  <option value="berlin">Berlin</option>
</select>
```

`KjNativeSelect` does **not** share `KJ_SELECT` context with the custom
Select — they are independent components that happen to model the same
form contract. The `KjField` integration is identical (both register a
`KjFormControl`), so swapping between the two requires only changing the
markup.

The native fallback ships in the same feature folder
(`packages/core/src/select/native-select.ts`) and is exported from
`packages/core/src/select/index.ts`.

### 4. Why `aria-activedescendant` rather than roving tabindex on the panel

The current `KjSelectContent` calls `items[idx]?.el.focus()` on each
ArrowDown / ArrowUp — moving real DOM focus through the option list. This
is **roving tabindex** (well, sort of — every option has `tabindex="0"`,
which is also wrong; the list should have one focused item at a time).

Switching to **`aria-activedescendant`** means:

- The `[kjSelectContent]` element keeps DOM focus (`tabindex="-1"` while
  open, focused programmatically when the panel opens).
- An internal `_activeId: signal<string | null>` reflects on the host as
  `[attr.aria-activedescendant]="_activeId()"`.
- Options themselves are `tabindex="-1"` always; they never receive DOM
  focus. Selection and `aria-selected` are derived from
  `value() === kjSelectOptionValue()`. The visually-focused state is
  derived from `_activeId() === host.id` (option computes
  `[attr.data-active]="active()"` for theme CSS to draw the focus ring).

Why this matches Material and PrimeNG and not Radix:

- Type-ahead becomes simpler — no need to call `el.focus()` and re-derive
  the active option from `document.activeElement`; the `_activeId` signal
  is the single source of truth.
- Screen readers handle `aria-activedescendant` correctly when announcing
  "Apple, option 1 of 5"; it's the recommended pattern in the
  [WAI-ARIA Authoring Practices Listbox example](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/examples/listbox-collapsible/).
- It avoids accidental scroll-into-view jumps when `el.focus()` is called
  on options inside a constrained-height scrollable panel.

The cost: some low-end ATs (older NVDA + IE, immaterial in 2025+) handle
roving tabindex better. We accept the cost.

### 5. Single root ownership of the value contract

Per the brief: `KjSelect` is the value-bearing root. **The form integration
lives on the root**, not on the trigger:

- `KjSelect` composes `KjFormControl` via `hostDirectives` (new — not in
  the existing implementation).
- The trigger reflects `aria-disabled` from the form-control's disabled
  signal but does **not** itself implement CVA — it's a pure
  presentational button with the combobox role.
- `KjSelect` registers with the optional `KJ_FIELD` context (see
  [`field.md`](./field.md)) as a "composite control" — the labelled
  element from the field's perspective is the **trigger**, so
  `KjSelect.registerControl()` returns the trigger's element ref to
  the field for `for=` resolution, and the field's describedby flows
  onto the trigger (not the panel).

This matches Material's `mat-select` registering itself as the
`MatFormFieldControl` while the trigger remains a `<div role="combobox">`
inside.

## Base features

- **Variants.** `KjVariant` host directive on `[kjSelectTrigger]`
  (default / filled / ghost / destructive). `[kjSelectContent]` itself
  takes a `kjPanelClass` for consumer-driven styling, no variant on the
  panel — variants live on the *trigger* (matches Button's variants
  living on the Button, not its dropdown menu's panel).
- **Sizes.** `KjSize` on `[kjSelectTrigger]` and on each
  `[kjSelectOption]` (sm / md / lg). Trigger inherits its size; option
  size defaults to the trigger's size via `KJ_SELECT.size` signal so a
  consumer doesn't have to set both.
- **States.** `kjDisabled` on root → flows to trigger and disables open;
  `kjReadonly` (proposed — see Open Questions) renders the trigger
  un-openable but keeps the value visible (mirrors Material's read-only
  forms);  `kjInvalid` reflects to `aria-invalid` on the trigger when
  `formCtrl.touched()`; `kjLoading` (proposed for v1.1) renders a
  spinner in the trigger's trailing slot via `KjInputGroup`-style.
- **Anchored positioning.** `kjSide` (default `'bottom'`) and `kjAlign`
  (default `'start'`), `kjOffset` (default `4`), `kjAvoidCollisions`
  (default `true`). Reflected as `data-side` / `data-align` on
  `[kjSelectContent]`; the shared `KjAnchor` primitive (defined in
  [`feedback/popover.md`](../feedback/popover.md)) does the math.
  `kjMatchTriggerWidth: input<boolean>(true)` — the panel's `min-width`
  defaults to the trigger's width (Material's behaviour, and what
  consumers expect from a Select). Reflected as a CSS custom property
  `--kj-select-trigger-width: <px>` on the panel; theme CSS picks it up.
- **Open/close behaviour.**
  - **Open:** click on the trigger; Enter / Space on focused trigger;
    ArrowDown / ArrowUp / Alt+ArrowDown opens and seeds the active option
    (selected option if any, else first); `F4` opens (per ARIA APG).
  - **Close:** Escape (focus restored to trigger), Tab (closes; natural
    Tab order resumes; matches Material), click outside (no focus
    restoration), selection (focus restored to trigger). `kjCloseOnSelect`
    is implicit `true` for single-Select; `KjMultiSelect` overrides
    to `false`.
- **Type-ahead.** Multi-character buffer with debounce
  (`kjTypeaheadDebounceInterval: input<number>(200)`). Matches against
  each option's projected text content via a registered `searchLabel`
  signal (defaults to `el.textContent?.trim()`; can be overridden per
  option via `kjSearchLabel: input<string | undefined>(undefined)`).
  Buffer auto-clears after `200ms` idle, or on Esc / focus crossing.
  When closed: type-ahead on the trigger advances the selection (matches
  native `<select>` and Material). When open: type-ahead moves the
  active option (no selection until Enter).
- **`compareWith`.** `kjCompareWith: input<(a: T, b: T) => boolean>((a, b) => a === b)`.
  For object-valued options. Used by all `aria-selected` / `data-selected`
  computations and by the `value === optionValue` lookup that drives
  trigger display.
- **`clearable`.** `kjClearable: input<boolean>(false)`. When `true`, the
  trigger's trailing area renders a clear button (in the wrapper); the
  core directive exposes a `ctx.clear()` method that sets the value to
  `null` without opening the panel. The clear button is its own
  `[kjSelectClear]` slot directive in the wrapper.
- **Placeholder.** `kjPlaceholder: input<string>('')` on the wrapper
  (already shipped). The headless directive exposes the same as a
  context signal so themes can resolve their own placeholder rendering.
  Placeholder text is *not* an `<option>` — it's a `KjSelectValue`
  fallback that renders when `value() == null || value() === ''`.
- **Empty state.** When the projected option list is empty, the wrapper
  renders an "(no options)" message via `KjSelectEmpty` slot directive
  (proposed — see Open Questions). Core only exposes `ctx.optionCount`.
- **Native form participation (`name`).** `kjName: input<string \|
  undefined>(undefined)` on root. When set, root renders a hidden
  `<input type="hidden" [name]>` synced to the value (only string-coercible
  values participate; object values are silently dropped per browser
  semantics). Useful for `<form action=...>` postbacks. Angular reactive
  forms don't need this.
- **`compareWith` + grouped options.** Groups are pure presentation; the
  flat option index for keyboard navigation is computed by the root
  iterating registered options in registration order, regardless of group
  nesting. Groups don't influence the value contract.
- **RTL.** Reflect `dir` from the host's resolved `Directionality` (read
  from `document.documentElement.dir` initially, then via
  `MutationObserver`). Anchor primitive consumes `dir` to swap
  `'start' / 'end'` alignment correctly. Per [`rules/stack.md`](../../../rules/stack.md)
  no CDK, so we own this — same `KjDirectionality` service used by
  Dropdown Menu's submenus.

## Accessibility (WCAG 2.1 AAA)

### Roles + ARIA wiring

| Element                          | Role                  | Attributes                                                                                                       |
| -------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `[kjSelect]` (root)              | none                  | none — state container                                                                                           |
| `[kjSelectTrigger]`              | `combobox`            | `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls="<panel id>"`, `aria-activedescendant="<active option id>"` (only when panel is open), `aria-labelledby` (consumer or via `KjField`), `aria-describedby` (via `KjField` chain), `aria-required` (mirrored from validators), `aria-invalid` (touched + invalid), `aria-disabled` (from form-control), `tabindex="0"` (always — even when `aria-disabled`, per kouji's Button stance). Host element should be `<button type="button">`. The directive does not enforce. |
| `[kjSelectContent]`              | `listbox`             | `id="<panel id>"`, `aria-orientation="vertical"`, `aria-labelledby="<trigger id>"` (auto-resolved from trigger's id; `kjAriaLabelledby` overrides), `tabindex="-1"`, `data-side`, `data-align`, `data-state="open|closed"`, `[hidden]` when closed. The content element receives DOM focus on open. `aria-multiselectable="false"` for Select; `KjMultiSelect` overrides to `"true"`. |
| `[kjSelectOption]`               | `option`              | `id` (auto-minted), `aria-selected="true|false"`, `aria-disabled`, `tabindex="-1"`, `data-active` (for theme to draw the active-descendant focus ring), `data-selected`, `data-disabled`. |
| `[kjSelectItemIndicator]`        | none                  | `aria-hidden="true"`, `[hidden]` when the parent option is not selected.                                          |
| `[kjSelectGroup]`                | `group`               | `aria-labelledby="<group label id>"` (auto-wired when a `[kjSelectLabel]` is inside).                              |
| `[kjSelectLabel]`                | `presentation`        | `id` (auto-minted), `tabindex="-1"`. Skipped by arrow nav and type-ahead.                                          |
| `[kjSelectSeparator]`            | `separator`           | `aria-orientation="horizontal"`, `tabindex="-1"`. Skipped by arrow nav and type-ahead.                              |
| `[kjSelectValue]`                | none                  | Renders `displayValue()` (default: text content of the selected option) or projected content. No ARIA — the
  trigger's accessible name comes from its own `aria-labelledby`. |

### Keyboard contract

Source: [WAI-ARIA APG Listbox Pattern (Collapsible)](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) +
[Combobox Pattern (with-listbox)](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/).

| Key                          | When focus is on…                  | Behaviour                                                                                       |
| ---------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| `Enter` / `Space` / `Alt+ArrowDown` | Trigger (closed)               | Open. Active option is the currently-selected option, else the first focusable option.           |
| `ArrowDown`                  | Trigger (closed)                   | Open. Active option is selected option, else first.                                              |
| `ArrowUp` / `Alt+ArrowUp`    | Trigger (closed)                   | Open. Active option is selected option, else last.                                               |
| `F4`                         | Trigger                            | Toggle open/close (per APG combobox).                                                             |
| Printable char               | Trigger (closed)                   | **Without opening:** advance value to next option whose `searchLabel` starts with the typed buffer (matches native `<select>`). The buffer is shared with the open-panel buffer; `200ms` idle clears it. |
| `Enter` / `Space`            | Trigger (open)                     | Confirm active option as the new value, close, restore focus to trigger.                          |
| `ArrowDown` / `ArrowUp`      | Listbox (panel)                    | Move active option to next / previous focusable option. Wraps if `kjLoop` (default `false`); skips disabled, separators, labels. |
| `Home` / `End`               | Listbox (panel)                    | First / last focusable option.                                                                    |
| `PageUp` / `PageDown`        | Listbox (panel)                    | Jump 10 options up / down (configurable via `kjPageSize: input<number>(10)`).                     |
| Printable char               | Listbox (panel, open)              | Move active option (no selection) to next match. Buffer shared with closed-state.                  |
| `Enter` / `Space`            | Listbox (panel)                    | Confirm active option, close, restore focus to trigger. **Space** does not insert a space — it confirms (matches APG; differs from native `<select>` where Space *opens*, but here we're already open). |
| `Tab` / `Shift+Tab`          | Listbox (panel)                    | Confirm active option, close (with `'tab'` reason emitted on `kjClosed`), let Tab continue natural focus. Matches Material. |
| `Escape`                     | Listbox (panel)                    | Close without changing value, restore focus to trigger.                                            |
| `Alt+ArrowUp`                | Listbox (panel)                    | Same as Escape (per APG).                                                                          |
| `Alt+ArrowDown`              | Listbox (panel)                    | No-op (already open).                                                                              |

The roving tabindex / `aria-activedescendant` invariant: only the
`[kjSelectContent]` is in the tab order while the panel is open
(`tabindex="-1"` programmatically focused on open). The trigger is
`tabindex="0"` always. Options are `tabindex="-1"` always.

### Focus management

- **Opening from the trigger** focuses `[kjSelectContent]` (so screen
  readers announce the listbox role and the active option), then sets
  `_activeId` to the currently-selected option's id (or first focusable
  if no selection, or last on `ArrowUp`).
- **Closing via Enter / Space / Escape / Alt+ArrowUp / item activation**
  restores focus to the trigger. Captured at open-time
  (`document.activeElement` snapshot) — same pattern as Dropdown Menu.
- **Click outside**: close, no focus restoration. Natural focus flows
  with the click.
- **Tab from inside**: close, do not consume the Tab key — let the
  natural tab order continue past the trigger. `kjClosed` emits `'tab'`.
- **No focus trap.** Select is non-modal. (Modal mode is for Dialog
  and the rare modal Dropdown Menu; not Select.)

### Touch target ≥ 44×44 (WCAG 2.5.5)

- **Trigger:** the `KjSize.md` preset on `[kjSelectTrigger]` must produce
  ≥ 44×44px. Same constraint as `KjButton.md`.
- **Each option:** likewise. The `data-size` reflection on options drives
  themed padding to clear 44px in `md`. Themes that ship a `dense` /
  `sm` size below 44px must declare it as **AA-only, not AAA**, in the
  size token's TSDoc.
- **Indicator (checkmark)**: not interactive — no min size constraint.
- **Separator / Label**: not focusable — no min size constraint.

### Color / contrast

Wrapper / theme concern. Trigger text vs. background ≥ 7:1 (AAA), option
text in default state ≥ 7:1, active-descendant focus ring outline ≥ 3:1
against adjacent colours (WCAG 1.4.11), selected-state checkmark colour
≥ 3:1 against the option's background. Themes own all four ratios; doc in
the select-token spec.

### Live region announcements

- **Selection changes via type-ahead while closed** (the user advances
  the value without opening) — announce the new value via
  `KjLiveRegion` with `aria-live="polite"`. Matches native `<select>`
  behaviour: Windows screen readers announce "Apple" when you type "a"
  on a focused but closed select. Without the live region this is
  silent in our implementation (the trigger's text content changes but
  SR don't always re-announce on text change).
- **No announcement when the panel is open**, because `aria-activedescendant`
  + the option text already announces on focus crossing.

### Reduced motion

Wrapper concern. Core reflects `data-state="open|closed"` on the panel;
wrapper guards transitions with `@media (prefers-reduced-motion: reduce)`.

### `aria-required`, `aria-invalid`, `aria-describedby`

All three flow from the bound `NgControl` (when present) or `KjField`
context (when wrapped in a field):

- `aria-required`: from `Validators.required` on the bound control, OR
  from `kjFieldRequired` on a wrapping `KjField`. Reflected on the
  trigger only when `true`.
- `aria-invalid`: from the field's `controlInvalid()` or the directive's
  own `kjInvalid` input. Touched-gated.
- `aria-describedby`: from the field's `describedByIds()`, applied to
  the trigger via `KjAriaDescribedBy` host directive composed onto
  `[kjSelectTrigger]`. The panel does **not** receive `aria-describedby`
  — described-by lives on the labelled control (the trigger), not on
  the popup.

## Composition model

```text
select/
  select.ts                 ← KjSelect (root, value-bearing) — exists, extend
  select-trigger.ts         ← KjSelectTrigger — exists, harden
  select-value.ts           ← KjSelectValue (new — slot in trigger)
  select-content.ts         ← KjSelectContent (refactor of existing — aria-activedescendant)
  select-option.ts          ← KjSelectOption (rename of existing KjOption)
  select-item-indicator.ts  ← KjSelectItemIndicator (new)
  select-group.ts           ← KjSelectGroup (new)
  select-label.ts           ← KjSelectLabel (new)
  select-separator.ts       ← KjSelectSeparator (new)
  native-select.ts          ← KjNativeSelect (new — directive on <select>)
  select.context.ts         ← KJ_SELECT + KjSelectContext + KJ_SELECT_OPTION (registration helper)
  select.example.ts
  select.placeholder.example.ts
  select.disabled.example.ts
  select.grouped.example.ts
  select.field.example.ts            (new — inside KjField)
  select.reactive.example.ts         (new — formControl)
  select.compare-with.example.ts     (new — object values)
  select.clearable.example.ts        (new)
  select.native.example.ts           (new — KjNativeSelect)
  select.spec.ts
  index.ts
```

### Shared state — `KjSelectContext`

```ts
export interface KjSelectOption<T = unknown> {
  /** Stable id of the option's host element. Used for `aria-activedescendant`. */
  readonly id: string;
  /** The option's value. */
  readonly value: Signal<T>;
  /** Display text used by type-ahead and as the default `KjSelectValue` content. */
  readonly searchLabel: Signal<string>;
  /** Whether the option is disabled. */
  readonly disabled: Signal<boolean>;
  /** The option's host element (for scrolling-into-view on activation). */
  readonly element: HTMLElement;
}

export interface KjSelectContext<T = unknown> {
  readonly value: Signal<T | null | undefined>;
  readonly open: Signal<boolean>;
  readonly disabled: Signal<boolean>;
  readonly multiple: Signal<boolean>;     // false on KjSelect; true on KjMultiSelect
  readonly compareWith: Signal<(a: T, b: T) => boolean>;
  /** Stable id of the listbox panel; trigger uses this for aria-controls. */
  readonly panelId: string;
  /** Stable id of the trigger element; panel uses this for aria-labelledby. */
  readonly triggerId: Signal<string | null>;
  /** All options in registration (DOM source) order. */
  readonly options: Signal<readonly KjSelectOption<T>[]>;
  /** The currently active-descendant option id (panel-open only). */
  readonly activeId: Signal<string | null>;

  /** Trigger registers itself once on init; provides its element ref. */
  registerTrigger(el: HTMLElement): { triggerId: string; deregister: () => void };

  /** Each option registers itself on construction. */
  registerOption(opt: KjSelectOption<T>): { deregister: () => void };

  /** Open the panel. `seedActive` controls which option starts active. */
  open(seedActive: 'selected' | 'first' | 'last' | 'none'): void;
  /** Close the panel. `restoreFocus` defaults `true` for keyboard / item-select reasons. */
  close(reason: KjSelectCloseReason, restoreFocus: boolean): void;
  /** Confirm the active option as the new value. No-op if no active option. */
  confirmActive(): void;
  /** Clear the value (used by `kjClearable`). */
  clear(): void;
  /** Select a value programmatically; updates form control + closes if open. */
  select(value: T): void;
  /** Set the active descendant id (used by Content's keyboard handlers). */
  setActive(id: string | null): void;
}

export type KjSelectCloseReason =
  | 'select' | 'escape' | 'tab' | 'click-outside' | 'programmatic';

export const KJ_SELECT = new InjectionToken<KjSelectContext>('KjSelect');
```

The current `KJ_SELECT` token in `select.context.ts` only exposes
`{ value, open, select, toggle, hide }` — the new shape is a strict
superset. Existing consumers continue to work; new consumers can register.

### `hostDirectives` composition

- `[kjSelect]` (root):
  - `KjFormControl` (CVA — value, touched, disabled propagation).
  - `KjDisabled` (input alias `kjDisabled`).
  - **No** `KjFocusRing` on the root — focus rings live on the *trigger*.
- `[kjSelectTrigger]`:
  - `KjVariant` (input alias `kjVariant`).
  - `KjSize` (input alias `kjSize`).
  - `KjFocusRing`.
  - `KjDisabled` (input alias `kjDisabled`) — mirrors the root's disabled
    state when the consumer doesn't set one explicitly.
  - `KjAriaDescribedBy` (consumed by `KjField`'s describedby chain).
  - Capture-phase click suppression on disabled (mirrors `KjButton`).
- `[kjSelectContent]`:
  - **No** roving-tabindex primitive (we use `aria-activedescendant`,
    not roving — see Decision 4). The keyboard handler is inline.
  - `KjAnchor` (the shared anchor primitive defined in
    [`feedback/popover.md`](../feedback/popover.md)) — provides
    `data-side` / `data-align` reflection and the position math.
- `[kjSelectOption]`:
  - `KjVariant` (input alias `kjVariant`) — defaults to root's variant
    via context.
  - `KjSize` (input alias `kjSize`) — defaults to root's size via context.
  - `KjDisabled` (input alias `kjDisabled`).
  - **No** `KjFocusRing` — options never receive DOM focus
    (`aria-activedescendant` model). The active state is rendered via
    `data-active` and themed CSS.
- `[kjSelectGroup]`, `[kjSelectLabel]`, `[kjSelectSeparator]`,
  `[kjSelectValue]`, `[kjSelectItemIndicator]`:
  - No host directives. Pure ARIA + signal wiring.
- `[kjNativeSelect]` (parallel directive):
  - `KjVariant` (input alias `kjVariant`).
  - `KjSize` (input alias `kjSize`).
  - `KjDisabled` (input alias `kjDisabled`).
  - `KjFocusRing`.
  - `KjFormControl`.
  - Host element must be `<select>`; the directive does not enforce
    statically (Angular's selector mechanism cannot), but a dev-mode
    check in the constructor warns when `nodeName !== 'SELECT'`.

### `KJ_FIELD` integration

In its constructor, `KjSelect` reads
`inject(KJ_FIELD, { optional: true })` and, if present, calls
`field.registerControl(...)` passing the **trigger's** element ref (once
the trigger registers itself with the select context). The field's
auto-minted id becomes the trigger's id; the field's `for=` on the
label points at the trigger; the field's `describedByIds()` flow onto
the trigger via `KjAriaDescribedBy`.

Selects can also be used **outside** a field — in that case the consumer
sets `kjAriaLabel` on the trigger directly (or wraps with a plain
`<label for=>` themselves, but the trigger isn't a native form control,
so `<label for=>` is technically invalid HTML; we recommend
`KjField` for all labelled cases).

### Cross-component pointers

- **[`data-input/field.md`](./field.md)** — owns label-control association
  (`aria-labelledby` strategy for combobox triggers — `<label for>`
  doesn't work on `<button role="combobox">`), `aria-describedby` chain,
  `aria-required` mirror, error gating. **Select is a composite control**
  from Field's perspective: the registered "control element" is the
  trigger, not the panel. Field flows `aria-describedby` and the
  required mirror onto the trigger.
- **[`data-input/form.md`](./form.md)** — higher-level form orchestrator.
  Form contains many Fields, each Field can wrap a Select. No direct
  Select↔Form coupling.
- **[`data-input/combobox.md`](./combobox.md)** — Combobox is **the
  filterable cousin**: same compound shape, plus a `[kjComboboxInput]`
  child (the editable text input that doubles as the trigger), built-in
  filter logic, `kjFilter`, async loading, "no results" empty state,
  free-text mode (`kjAllowFreeText`). The split between Select (read-only
  pick from list) and Combobox (type-to-filter) is firm — see PrimeNG's
  `editable=true` mistake of merging them. Combobox should compose the
  same `KjSelectContent` / `KjSelectOption` / `KjSelectGroup` /
  `KjSelectLabel` / `KjSelectSeparator` directives — only the trigger
  changes (an `<input role="combobox">` instead of a
  `<button role="combobox">`).
- **[`data-input/multi-select.md`](./multi-select.md)** — multi-value
  variant. **Reuses the same compound** (same panel, same options, same
  groups). The root directive `[kjMultiSelect]` provides
  `KJ_SELECT` with `multiple()` set to `true`; the option's selection
  toggles into / out of an array; the trigger renders
  selected-as-chips by default. `aria-multiselectable="true"` flips on
  the panel. `kjCloseOnSelect` defaults `false` (keep panel open for
  multi-pick).
- **[`data-input/cascade-select.md`](./cascade-select.md)** — hierarchical
  pick (country → region → city). Same trigger + panel shape; the panel
  contains nested sub-listboxes that open on hover/keyboard. Mirrors
  Dropdown Menu's submenu model. Keep on the same Select family if
  feasible.
- **[`data-input/tree-select.md`](./tree-select.md)** — tree-structured
  options. Different ARIA pattern (`role="tree"` panel, not `listbox`),
  so it does **not** reuse `KjSelectContent`. It does reuse `KjSelect`
  the root (value-bearing), the trigger, and the anchor primitive.
- **[`actions/dropdown-menu.md`](../actions/dropdown-menu.md)** —
  architectural sibling. Same compound (root + trigger + content + items
  + group + label + separator). Different ARIA: menus are `role="menu"`,
  selects are `role="combobox"` + `role="listbox"`. **Different
  semantics:** menu items are *actions*; select options are *values*.
  Don't try to merge the two.
- **[`actions/popover.md`](../actions/popover.md)** — defines the shared
  **anchor primitive** (`KjAnchor` directive). `[kjSelectContent]`
  consumes it for positioning math, side/align resolution, collision
  avoidance. The current `KjPopover` family (`packages/core/src/popover/popover.ts`)
  has anchoring baked in; the Popover analysis extracts the anchor as a
  reusable primitive that Select, Dropdown Menu, Tooltip, and Combobox
  all consume. **Select blocks on this extraction.** As a fallback, we
  ship Select v0 with `data-side` / `data-align` reflection only and
  rely on the wrapper to do the math via theme CSS / Tailwind anchor
  utilities — same fallback Dropdown Menu uses.
- **[`actions/button.md`](../actions/button.md)** — pattern for
  variant / size / focus-ring / disabled composition + capture-phase
  click suppression on disabled. The trigger directive mirrors this.
  Ideally the trigger sits *on top of* `KjButton` — but **Decision:**
  do **not** auto-compose `KjButton` on the trigger. The consumer is
  free to put both directives on the same `<button>`
  (`<button kjButton kjSelectTrigger>`), but `[kjSelectTrigger]` itself
  only handles the combobox aria + keyboard contract, leaving styling
  to the consumer's `[kjButton]` if present (or to the wrapper).
- **[`primitives/forms/form-control.ts`](../../packages/core/src/primitives/forms/form-control.ts)** —
  Select root composes `KjFormControl` for CVA. Selecting an option
  calls `formCtrl.notifyChange(value)`; closing without selection is
  not a touch event — touch fires on **trigger blur** (after the
  panel closes and focus returns to the trigger, an external blur
  marks `notifyTouched()`).
- **[`a11y/aria-describedby.ts`](../../packages/core/src/a11y/)** —
  `KjAriaDescribedBy` host directive composed on
  `[kjSelectTrigger]`; Field calls `describedBy.set(ctx.describedByIds())`.
- **[`primitives/overlay/overlay.ts`](../../packages/core/src/primitives/overlay/overlay.ts)** —
  the existing overlay primitive currently used by Popover. Select's
  `[kjSelectContent]` should consume the same overlay (when
  `kjAppendTo="body"` or implicit teleport to escape clipping
  ancestors), or the future `KjAnchor` primitive that subsumes it.
- **[`feedback/live-region.md`](../feedback/)** — `KjLiveRegion`
  primitive used to announce closed-state value changes from
  type-ahead. The Select directive injects it lazily.

## Inputs / Outputs / Models — `kj`-prefixed

### `[kjSelect]` (root, value-bearing)

| Member             | Kind   | Type                                          | Default            | Notes                                                                                              |
| ------------------ | ------ | --------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------- |
| `kjSelectValue`    | model  | `T \| null \| undefined`                      | `undefined`        | Two-way bindable. Existing input — kept for backwards compat. **Improvement:** the wrapper currently aliases this as `value` (un-prefixed); rename to `kjValue` per [`rules/code_style.md`](../../../rules/code_style.md). |
| `kjOpen`           | model  | `boolean`                                     | `false`            | Two-way bindable for programmatic open/close. Currently the directive only exposes `open()` getter; promoting to a model lets consumers control it. |
| `kjDisabled`       | input  | `boolean`                                     | `false`            | Forwarded via `hostDirectives` to `KjDisabled`. Suppresses panel open. |
| `kjReadonly`       | input  | `boolean`                                     | `false`            | When `true`, trigger is focusable but does not open. `data-readonly` reflects.                       |
| `kjInvalid`        | input  | `boolean`                                     | `false`            | Reflects `aria-invalid` on the trigger when `formCtrl.touched()`.                                    |
| `kjMultiple`       | input  | `boolean`                                     | `false`            | Internal — `KjMultiSelect` overrides to `true`. Documented but consumers should use `KjMultiSelect` directly rather than setting this. |
| `kjCompareWith`    | input  | `(a: T, b: T) => boolean`                     | reference equality | For object-valued options.                                                                          |
| `kjClearable`      | input  | `boolean`                                     | `false`            | Renders a clear button in the trigger's trailing slot (wrapper).                                     |
| `kjPlaceholder`    | input  | `string`                                      | `''`               | Rendered by `KjSelectValue` when value is empty. Currently lives on the wrapper as `placeholder` (un-prefixed); rename. |
| `kjName`           | input  | `string \| undefined`                         | `undefined`        | Native `name` for hidden-input postback (form `action=` use).                                       |
| `kjSide`           | input  | `'top' \| 'right' \| 'bottom' \| 'left'`      | `'bottom'`         | Reflected to `data-side` on `[kjSelectContent]`.                                                    |
| `kjAlign`          | input  | `'start' \| 'center' \| 'end'`                | `'start'`          | Reflected to `data-align` on `[kjSelectContent]`.                                                    |
| `kjOffset`         | input  | `number`                                      | `4`                | Px offset between trigger and panel.                                                                 |
| `kjAvoidCollisions`| input  | `boolean`                                     | `true`             | Anchor primitive flips/shifts to keep panel on-screen.                                               |
| `kjMatchTriggerWidth` | input | `boolean`                                  | `true`             | Panel `min-width` matches trigger width.                                                              |
| `kjLoop`           | input  | `boolean`                                     | `false`            | Arrow-key wrap-around on the option list.                                                            |
| `kjPageSize`       | input  | `number`                                      | `10`               | PageUp / PageDown jump distance.                                                                     |
| `kjTypeaheadDebounceInterval` | input | `number`                          | `200`              | Milliseconds.                                                                                        |
| `kjAriaLabel`      | input  | `string \| null`                              | `null`             | Forwarded to the trigger when no `KjField` parent.                                                    |
| `kjAriaLabelledby` | input  | `string \| null`                              | `null`             | Override of the auto-resolved `aria-labelledby` on the trigger.                                       |

| Output             | Kind   | Payload                            | Notes                                                                                          |
| ------------------ | ------ | ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| `kjSelectValueChange` | output | `T \| null`                     | Already exists (paired with `kjSelectValue` model). Keep.                                       |
| `kjOpenChange`     | output | `boolean`                          | Convenience event paired with `kjOpen` model.                                                    |
| `kjOpened`         | output | `void`                             | Emitted after the panel finishes opening (after focus moves to listbox).                         |
| `kjClosed`         | output | `KjSelectCloseReason`              | Emitted on close: `'select' \| 'escape' \| 'tab' \| 'click-outside' \| 'programmatic'`.            |
| `kjCleared`        | output | `void`                             | When `kjClearable` clear button is activated.                                                     |

### `[kjSelectTrigger]`

No public inputs/outputs. Reads `KJ_SELECT`. Owns the combobox role, the
keyboard-to-open contract (Enter/Space/Alt+ArrowDown/etc.), and the
type-ahead-while-closed behaviour. Receives `kjVariant` / `kjSize` /
`kjDisabled` via composed host directives.

### `[kjSelectValue]`

| Member                | Kind   | Type                | Default | Notes                                                                                  |
| --------------------- | ------ | ------------------- | ------- | -------------------------------------------------------------------------------------- |
| `kjSelectPlaceholder` | input  | `string`            | `''`    | Falls back to `KjSelect.kjPlaceholder` when not set on this slot.                       |

Renders the projected `<ng-content>` if any, else the selected option's
`searchLabel`, else the placeholder. The element is `<span>` by default
(no role); themes wrap as needed.

### `[kjSelectContent]`

No public inputs/outputs. Reads `KJ_SELECT`. Owns the listbox role,
`aria-activedescendant`, type-ahead buffer, click-outside, focus
restoration, anchored positioning (via composed `KjAnchor`).

### `[kjSelectOption]`

| Member       | Kind   | Type        | Default     | Notes                                                                                  |
| ------------ | ------ | ----------- | ----------- | -------------------------------------------------------------------------------------- |
| `kjValue`    | input  | `T`         | required    | Renamed from `kjOptionValue` for symmetry with the parent's `kjValue`. Old name kept as a deprecated alias. |
| `kjDisabled` | input  | `boolean`   | `false`     | Forwarded to `KjDisabled`.                                                              |
| `kjVariant`  | input  | `KjVariant` | from ctx    |                                                                                        |
| `kjSize`     | input  | `KjSize`    | from ctx    |                                                                                        |
| `kjSearchLabel` | input | `string \| undefined` | `undefined` | Override the type-ahead matching text (defaults to `el.textContent?.trim()`).        |

| Output       | Kind   | Payload          | Notes                                                                                  |
| ------------ | ------ | ---------------- | -------------------------------------------------------------------------------------- |
| `kjSelect`   | output | `T`              | Convenience event (consumers usually bind `(kjSelectValueChange)` on the root instead). |

### `[kjSelectItemIndicator]`

No public inputs/outputs. Computes `[hidden]="!parentOption.selected()"`.
Projected children are typically a single icon; the directive does not
provide a default icon — themes do.

### `[kjSelectGroup]`

No public inputs/outputs. Auto-wires `aria-labelledby` to a child
`[kjSelectLabel]`'s id via `contentChild(KjSelectLabel)`.

### `[kjSelectLabel]`

No public inputs/outputs. Auto-mints `id` (`kj-select-label-{n}`).

### `[kjSelectSeparator]`

No public inputs/outputs.

### `[kjNativeSelect]`

| Member       | Kind   | Type        | Default | Notes                                                                                  |
| ------------ | ------ | ----------- | ------- | -------------------------------------------------------------------------------------- |
| `kjVariant`  | input  | `KjVariant` | preset  |                                                                                        |
| `kjSize`     | input  | `KjSize`    | `'md'`  |                                                                                        |
| `kjDisabled` | input  | `boolean`   | `false` |                                                                                        |
| `kjInvalid`  | input  | `boolean`   | `false` | Reflects `aria-invalid` (touched-gated via `KjFormControl`).                            |

No outputs — value flows through `KjFormControl` (CVA) like `[kjInput]`.

### Wrapper components (Library / `@kouji-ui/components`)

- **`<kj-select>`** — host-directive composes `KjSelect`. Re-exposes
  `kjValue` / `kjOpen` / `kjDisabled` / `kjReadonly` / `kjInvalid` /
  `kjPlaceholder` / `kjVariant` / `kjSize` / `kjClearable` / `kjName`
  / `kjCompareWith` / `kjAriaLabel`. Renders the trigger button + caret
  + (when `kjClearable`) clear button, plus the panel via
  `<ng-content kjSelectContent>`.
- **`<kj-option>`** — host-directive composes `KjSelectOption`. Inputs:
  `kjValue` (required), `kjDisabled`. Renders projected text + an
  `<kj-icon kjSelectItemIndicator>` checkmark.
- **`<kj-select-group>` / `<kj-select-label>` / `<kj-select-separator>`** —
  thin wrappers; no extra inputs.
- **`<kj-native-select>`** — *not* shipped as a component. The directive
  is the consumer-facing API: `<select [kjNativeSelect]>`. A component
  wrapper would force the consumer to project `<option>`s via
  `<ng-content>`, and Angular's `<select>` interaction with projected
  options is fragile. Keep the directive as the public surface.

**Existing wrapper inputs that violate the `kj` prefix rule** (per
[`rules/code_style.md`](../../../rules/code_style.md) §"Inputs, Outputs,
and Models — `kj` prefix is mandatory"):

- `<kj-select>` currently exposes `value`, `placeholder`, `disabled` —
  rename to `kjValue`, `kjPlaceholder`, `kjDisabled`.
- `<kj-option>` currently exposes `value` — rename to `kjValue`.

Same breaking change as Input. Do it before more siblings (`KjMultiSelect`,
`KjCombobox`, `KjCascadeSelect`) crystallise the wrong shape.

## Examples to ship

Match the structure under `packages/components/src/select/` (some files
exist; all should be promoted to the canonical example set).

1. **Default** — `select.default.example.ts` *(exists)*. Single
   `<kj-select>` with three `<kj-option>` children, two-way bound to a
   signal.
2. **Placeholder** — `select.placeholder.example.ts` *(exists)*.
   Empty initial value showing the placeholder.
3. **Disabled** — `select.disabled.example.ts` *(exists)*. Whole-Select
   disabled and per-option disabled.
4. **Grouped** — `select.grouped.example.ts` *(exists, but using ad-hoc
   `<div class="group-label">`)*. Refactor to use `<kj-select-group>` +
   `<kj-select-label>` + `<kj-select-separator>` once those ship.
5. **Reactive form** — `select.reactive.example.ts` *(new)*. Bound via
   `[formControl]` with `Validators.required`, error message via
   `<kj-field-error>`, touched-gated `aria-invalid`.
6. **Inside a Field** — `select.field.example.ts` *(new)*. Wrapped in
   `<div kjField>` with `<label kjFieldLabel>` (uses
   `aria-labelledby` strategy because the trigger is `<button>`, not
   `<input>`) and a hint. Demonstrates the composite-control id flow.
7. **`compareWith`** — `select.compare-with.example.ts` *(new)*.
   Object-valued options (`{ id, name }`) with
   `[kjCompareWith]="(a, b) => a?.id === b?.id"`.
8. **Clearable** — `select.clearable.example.ts` *(new)*. `kjClearable`
   showing the inline clear button.
9. **Variants + sizes** — `select.variants.example.ts` *(new)*.
   `default` / `filled` / `ghost` triggers in `sm` / `md` / `lg`.
10. **Custom trigger value** — `select.value-slot.example.ts` *(new)*.
    Project a richer `<span kjSelectValue>` showing flag emoji + country
    name where the option lists country only.
11. **Side / align / collision** — `select.positioning.example.ts`
    *(new)*. Demonstrates `kjSide="top"` and `kjAvoidCollisions`.
12. **Native fallback** — `select.native.example.ts` *(new)*.
    `<select [kjNativeSelect] kjVariant="filled">` with native
    `<option>` children, two-way bound.
13. **Long list (typeahead)** — `select.typeahead.example.ts` *(new)*.
    50 options to demonstrate multi-character buffered type-ahead.

## Open questions / risks

1. **Anchor primitive availability.** Same blocker as Dropdown Menu's
   open question #1. The shared `KjAnchor` primitive that
   [`feedback/popover.md`](../feedback/popover.md) is meant to extract
   from `KjPopover` does not yet exist. Until it does, Select v0
   reflects `data-side` / `data-align` only and relies on theme CSS /
   Tailwind anchor utilities for positioning math. Cross-cuts with
   Dropdown Menu, Tooltip, Combobox.

2. **Rename `[kjOption]` → `[kjSelectOption]` and `kjOptionValue` →
   `kjValue`.** Existing spec exercises the old selectors. Ship aliases
   with `@deprecated` TSDoc + a dev-mode console.warn when the old
   selector is matched. Remove at v1.0. Same playbook as `KjFormField`
   → `KjField` rename in [`field.md`](./field.md).

3. **Rename wrapper inputs to `kj`-prefix.** `<kj-select>` and
   `<kj-option>` use `value` / `placeholder` / `disabled` un-prefixed.
   Breaking change; flagged in Input's open questions too. Do all
   data-input wrappers in one sweep.

4. **`aria-activedescendant` vs roving tabindex.** Decision recorded
   above (use `aria-activedescendant`). Risk: some screen readers (NVDA
   pre-2023, VoiceOver pre-iOS 15) report the non-focused option as
   "not focused" until the user reads further. The Listbox APG example
   has live results showing this is broadly fine in modern AT. If AAA
   review flags it, fall back to roving tabindex on the panel
   (`tabindex="0"` on the active option, `tabindex="-1"` on others, with
   `el.focus()` calls on activation). This is a one-flag change.

5. **Reading the trigger's `id`.** The auto-resolution
   `aria-labelledby="<trigger id>"` on the panel requires the trigger
   to have an id. Auto-mint via the same counter-based id generator
   used by `KjField` (see [`field.md`](./field.md) open question #3).
   If the consumer provides their own id, we don't override.

6. **Composite-control labelling and `<label for=>`.** A
   `<label for="trigger-id">` pointing at a `<button role="combobox">`
   is technically invalid HTML — `<label for>` only works on form
   controls (`<input>`, `<select>`, `<textarea>`, `<button>` listed,
   but the `<button>`-as-form-element semantics are weak). **WCAG
   compliant alternative:** the field uses `aria-labelledby` instead
   of `for=` when the registered control's `tagName` is not in the
   allowlist. `KjFieldLabel` detects this automatically (see
   [`field.md`](./field.md)). Document.

7. **Select inside `<form>` and Enter to submit.** When the panel is
   closed and the trigger has focus, pressing Enter currently opens
   the panel (per APG combobox). Some users expect Enter to submit the
   form (matches native `<select>` where Enter submits the form
   without opening). **Decision:** match APG combobox, not native
   `<select>`. Document the difference. Consumers that need
   submit-on-Enter can add a (keydown.enter) handler at the form level
   that fires when the active element is *not* a `[kjSelectTrigger]`.

8. **Disabled options reachable by typeahead.** Material includes
   disabled options in typeahead matches but doesn't activate them.
   Same as Dropdown Menu's resolution (open question #6 there). Match
   Material; document.

9. **`compareWith` and reactive value updates.** When the bound form
   value changes externally (e.g. `formCtrl.setValue(newObj)`), the
   `selected` computation must run `compareWith`, not `===`. Make sure
   the `selected` signal in `KjSelectOption` reads
   `ctx.compareWith()(ctx.value(), kjValue())`, not strict equality.

10. **Type-ahead debounce and async option lists.** Type-ahead matches
    against currently-registered options. If options are loaded
    async (e.g. from a server), keystrokes during the load window will
    silently miss. Document; recommend `KjCombobox` for async option
    sources.

11. **Hidden `<input name=>` for native postback.** Object-valued
    selects can't participate in native form submission (the hidden
    input renders `[object Object]`). Document; either coerce via
    `JSON.stringify` (changes the wire format silently) or skip the
    hidden input entirely when `value` is an object. **Decision:** skip
    silently and console.warn in dev mode when `kjName` is set + value
    is an object — consumers who want object→string mapping can do it
    themselves with a derived hidden input.

12. **`kjReadonly` semantics.** Material doesn't ship readonly on
    `<mat-select>` — there's a long-standing GitHub issue about it. Our
    take: readonly = focusable + value visible + panel does not open.
    `aria-readonly="true"` on the trigger. This is useful for
    detail-view forms that show the value but disallow change without
    "edit mode". PrimeNG ships it; matches the read-only shape we
    chose for `KjInput`.

13. **`kjLoading` state.** Defer to v1.1 with `KjInputGroup` integration
    — load spinner in the trigger's trailing slot. Until then, consumers
    handle loading externally via `kjDisabled`.

14. **Empty state inside the panel.** When projected option list is
    empty, the panel currently shows nothing (just an empty listbox
    role, which screen readers announce as "listbox, 0 items"). Ship a
    `[kjSelectEmpty]` slot directive (similar to `[kjSelectLabel]` —
    presentation role, no focus, no nav) that themes can use to render
    "(no options)". Defer until consumers ask.

15. **Per-side scroll buttons (Radix's `SelectScrollUp/DownButton`).**
    Defer to v1.1. The default is a CSS-styled native scrollbar on the
    panel.

16. **`KjMultiSelect` default close-on-select.** When extracted as a
    sibling root, `kjMultiple=true` should imply `kjCloseOnSelect=false`.
    Document.

17. **SSR.** Anchor primitive runs in the browser only. Counter-based
    id minting is SSR-stable. The `effect()` writing
    `__kjOptionValue` to the option's DOM node is a SSR-unsafe escape
    hatch in the current implementation — the planned switch to
    registration-based context (each option calls
    `ctx.registerOption(...)` and the context owns the value lookup)
    eliminates it. Verify with the apps SSR smoke test.

18. **Bundle locality.** Consumers using only `[kjNativeSelect]` should
    not pay for `[kjSelect]`'s anchor / typeahead / live-region code.
    The native-select directive lives in the same feature folder but
    has no imports from the compound; tree-shaking handles the rest.
    Verify with a bundle-analyzer test in the apps workspace.

19. **Long list virtualization.** Out of scope for v1. `KjCombobox`
    will own the virtualized list pattern when long lists are
    primarily a filter use case. Document.

20. **Placeholder element vs. placeholder option.** The current
    `<kj-select>` wrapper renders the placeholder via `displayLabel()`
    when value is empty. Native `<select>` requires a placeholder
    `<option>` with empty value as its first child. **Decision:** for
    custom Select, ship the slot-based placeholder (no fake first
    option). For `KjNativeSelect`, document the consumer's
    responsibility to add a placeholder `<option value="">…</option>`
    themselves; the directive does not auto-mint one.

## Accessibility Review

WCAG 2.1 considerations against current implementation
(`packages/core/src/select/select.ts`) and the proposed shape:

- **1.3.1 Info and Relationships:** Current implementation does not
  set `role="combobox"` on the trigger nor `aria-haspopup="listbox"`
  in the directive (it's hand-set by the consumer in the wrapper
  template, where it could easily be omitted). The proposal moves both
  into the trigger directive's host bindings. **Fix needed: add
  `'[attr.role]': '"combobox"'` and `'[attr.aria-haspopup]': '"listbox"'`
  to `[kjSelectTrigger]`.**
- **2.1.1 Keyboard:** Current implementation handles ArrowDown,
  ArrowUp, Home, End, Enter, Space, single-character type-ahead. **Fixes
  needed: PageUp / PageDown, Alt+ArrowDown to open, Alt+ArrowUp /
  Escape to close, F4 toggle, multi-character debounced type-ahead,
  type-ahead-while-closed (advance value without opening panel).**
- **2.4.3 Focus Order:** Current impl moves real DOM focus to each
  option via `el.focus()`, which can cause unexpected scroll jumps and
  loses programmatic control of the active descendant. **Fix needed:
  switch to `aria-activedescendant`.**
- **2.4.7 Focus Visible:** Trigger composes `KjFocusRing` (good).
  Options should reflect `data-active` for theme-driven active-descendant
  visualization. **Fix needed: `data-active` on `[kjSelectOption]`.**
- **3.3.1 Error Identification & 3.3.2 Labels or Instructions:** No
  `KjField` integration today. **Fix needed: composite-control
  registration with `KJ_FIELD`; `aria-describedby` chain on trigger;
  `aria-required` and `aria-invalid` mirroring; `aria-labelledby`
  resolution to a `KjFieldLabel` id when wrapped.**
- **4.1.2 Name, Role, Value:** Trigger has no `aria-controls` to the
  panel today. The current `'[attr.aria-expanded]': 'ctx.open().toString()'`
  is correct. **Fix needed: add `aria-controls` to trigger; add
  `aria-activedescendant` to either trigger or content (kouji choice:
  content); add `aria-labelledby` on content pointing at trigger id.**
- **2.5.5 Target Size (AAA):** Trigger and options must clear 44×44 in
  the `md` size preset. Wrapper concern, gated on `KjSize` integration.
- **1.4.11 Non-text Contrast (AA → AAA):** Active-descendant focus
  outline ≥ 3:1; selected-state checkmark ≥ 3:1. Theme concern.

Status: **issues found** — the in-flight implementation is functional
but does not yet satisfy the full WAI-ARIA 1.2 combobox + listbox
contract. The fixes above are tracked in the Open Questions and the
implementation plan implied by this analysis.
