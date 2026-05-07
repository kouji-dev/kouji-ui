# Multi Select

Reference architecture for the kouji-ui Multi Select — a dropdown picker that
lets the user choose **many** values from a list, displays the selection set
as chips inside the trigger, and exposes a familiar listbox panel underneath.
Single-select is already shipped (`KjSelect` at
`packages/core/src/select/select.ts`); Multi Select **extends that family**
rather than starting from scratch. This document specifies how the extension
lands, where the existing single-select directive needs to grow, and which
behaviour is genuinely new.

This is the canonical "selection-list with multiple values" pattern. Combobox
([`combobox.md`](./combobox.md)) reuses Multi Select's selection / chip /
panel mechanics and adds a search-filtered listbox; the same primitives
underlie both. Tag / Chip ([`../data-display/tag.md`](../data-display/tag.md),
[`../data-display/chip.md`](../data-display/chip.md), forward references —
neither analysis is written yet) supply the in-trigger chip rendering.

## Source comparison

- **PrimeNG** — [primeng.org/multiselect](https://primeng.org/multiselect).
  Ships as a **separate component** (`<p-multiSelect>`), distinct from
  `<p-select>`. Both share an `OverlayService` and option projection
  (`p-multiSelectItem` is its own dedicated item, mirroring `p-selectItem`),
  but the components themselves are duplicated. Notable surface:
  `display="comma" | "chip"` flips the trigger between a comma-separated list
  and chip rendering; `maxSelectedLabels` + `selectedItemsLabel` (templated:
  e.g. `"{0} items selected"`) drives "X more" overflow when chips would
  blow up the trigger; `showToggleAll` adds a "select all" master checkbox in
  the panel header; `filter`, `filterBy`, `filterMatchMode`, `virtualScroll`,
  `loading`, `chipIcon`, `removeTokenIcon`, `panelStyleClass` are all on the
  same surface. Each option has a checkbox (`<p-checkbox>` reused) plus the
  label. Spacebar toggles the focused option without closing; the panel only
  closes on Escape, click-outside, or `hideOnSelect="true"` (off by default).
  Form integration is via `[(ngModel)]` / `[formControl]` against an array
  of selected values.
- **Angular Material** — [material.angular.dev/components/select](https://material.angular.dev/components/select).
  **The same `<mat-select>` directive in `[multiple]` mode** — no separate
  component. `[multiple]="true"` flips the panel from radio-style to
  checkbox-style options, switches the value type to `T[]`, and disables
  the close-on-select behaviour. The trigger renders the value via
  `MatSelect`'s default join-by-comma routine, but consumers can project a
  `<mat-select-trigger>` element to render whatever they want (chips, custom
  text, "X selected", etc. — Material doesn't ship a chip recipe out of the
  box). Each `<mat-option>` carries a `<mat-pseudo-checkbox>` automatically
  when the parent select is `[multiple]`. `aria-multiselectable="true"` is
  added to the listbox host. There is no built-in select-all; Material's docs
  show consumers writing it themselves with a sentinel `<mat-option>`.
- **shadcn/ui** — no first-class multi-select. The community pattern is
  Combobox + Command in multi mode: a popover containing a `<Command>`
  (filterable list) where each item toggles in/out of an external array
  state, and the trigger shows either chips (rendered via `<Badge>`) or a
  comma-separated string. There is no `[multiple]` flag — multi-select is
  **just an authoring pattern**, not a separate component, and it always
  goes through the search-filterable Combobox. The recipe lives at
  [shadcn-extensions multi-select](https://shadcn-extensions.vercel.app/docs/multiple-selector).

**Pattern picked up.** **PrimeNG's separate-component model** — `KjMultiSelect`
ships as its own family alongside `KjSelect`, **not** as a `[kjMultiple]`
toggle on `KjSelect`. The two share a single underlying selection-mechanics
primitive (`KjSelectionModel<T>`) and the same option directives (`KjOption`,
`KjOptionGroup`), so the duplication is at the *root directive* level only —
selection logic, panel, options, keyboard handling, focus management are all
shared code. See [Decision: reuse `KjSelect` or new family?](#decision-reuse-kjselect-or-new-family).

The trigger uses **chips by default** with an `"X more"` overflow chip — the
PrimeNG default and the visibly nicer one — with an explicit
`kjMultiSelectDisplay="comma"` opt-out for the Material-style join. Select-all
ships as a **first-class panel toolbar action** (PrimeNG-style), because rolling
it yourself is exactly the kind of foot-gun a component library exists to
prevent (Material's "write it yourself" advice produces a string of
re-implementations, none of them quite right; see Material's GitHub issues
under `select select-all`).

Search-filtering inside the panel is **deferred to `KjCombobox`** —
`KjMultiSelect` is the no-search variant; `KjCombobox kjMultiple` is the
search variant. Consumers needing both pick Combobox.

## Decision: needs a core directive?

**Yes — a new family `KjMultiSelect` / `KjMultiSelectTrigger` /
`KjMultiSelectContent`, plus shared primitives lifted out of `KjSelect`.**
The existing `KjSelect` is the right starting point, but it has hard-coded
single-value behaviour (`select(val)` *replaces* `value`, `select()` *closes*
the panel, options compare with `===` against the singular `value()`). Three
options were considered:

### Option A — "Just add `kjMultiple` to `KjSelect`" (Material model)

Toggling a flag on the existing `KjSelect`. Looks elegant: one component,
one set of imports, one set of examples.

**Rejected.** Three concrete problems:
1. **Value-type bifurcation.** `KjSelect.kjSelectValue` is `model<unknown>()`.
   In multi mode it would have to be `model<unknown[]>()`. TypeScript can't
   express "depends on another input's value" at the model() declaration site,
   so callers either get `unknown | unknown[]` (a footgun — every read needs
   a type guard) or two separate inputs (`kjSelectValue` for single,
   `kjSelectValues` for multi — at which point you've already created the
   split, just nominally inside one component).
2. **Behavioural divergence is large.** Single-select closes on choose; multi
   doesn't. Single uses radio-style options; multi uses checkbox. Single has
   no toolbar; multi has Select All / Clear All. Single's chip-trigger is
   meaningless. By the time the conditionals are written, the directive body
   is two implementations switched on `kjMultiple`. PrimeNG split exactly
   for this reason.
3. **Examples + docs blow up.** Every example for `KjSelect` either has to
   demonstrate "and here's the multi variant" or split into two files —
   defeating the "one component" appeal.

Material's approach pays for it via `[multiple]` being a *known flag*
TypeScript users learn to look up. In a typed library aiming at AAA-quality
ergonomics, the type bifurcation alone disqualifies it.

### Option B — Separate `KjMultiSelect` family, no shared code (literal PrimeNG)

Two completely independent directive sets. Selection mechanics, option
rendering, panel keyboard handling all duplicated. Easy to ship, hard to
maintain — every behaviour change has to land in two places.

**Rejected.** Costs without benefits. PrimeNG itself maintains a shared
overlay service and pseudo-shared option API; the duplication is at the API
surface, not the implementation.

### Option C — Separate family + shared selection primitive (chosen)

**`KjMultiSelect` / `KjMultiSelectTrigger` / `KjMultiSelectContent` are
their own directives**, but selection state, panel keyboarding, click-outside
hide, and option registration are factored into shared primitives:

- **`KjSelectionModel<T>`** — a generic, signal-based selection primitive
  in `packages/core/src/primitives/forms/selection-model.ts`. Holds a
  `selected: Signal<readonly T[]>`, `mode: 'single' | 'multi'`, `compareWith`,
  `select(v)`, `deselect(v)`, `toggle(v)`, `clear()`, `setAll(v[])`,
  `isSelected(v)`. `KjSelect` becomes a thin wrapper that constructs a
  single-mode model; `KjMultiSelect` constructs a multi-mode model. Same
  primitive, two callers.
- **`KjListboxNavigation`** — the Arrow / Home / End / type-ahead /
  active-descendant code currently inside `KjSelectContent.onKeydown` lifted
  into a primitive. `KjMultiSelectContent` reuses it verbatim and only adds
  Space/Enter handling that toggles instead of closes.
- **`KjOption` / `KjOptionGroup`** — the **same** option directives. The
  option already injects from a context token; we generalise that token from
  `KJ_SELECT` to `KJ_LISTBOX_HOST` (an interface both `KjSelect` and
  `KjMultiSelect` provide). The option calls `host.toggle(value)` for
  multi, `host.select(value)` for single — the host implements the right
  semantics. **No option duplication.**

The new directive surface is small (three directives + two thin context
providers), and behaviour-change-once-applies-twice is automatic via the
shared primitives. This is the model the analysis recommends and the rest of
the document assumes.

## Base features

- **Variants** — forwarded to the trigger via `KjVariant`
  (`default` / `filled` / `ghost` / `destructive`). Same set as `KjInput` /
  `KjSelect` for visual consistency. Wired via `hostDirectives` on
  `KjMultiSelectTrigger` plus `bindPresets(KJ_MULTI_SELECT_CONFIG)`.
- **Sizes** — `sm` / `md` / `lg` via `KjSize`. WCAG 2.5.5 floor at 44×44 for
  the trigger; `md` is the AAA-compliant default.
- **States** — `kjMultiSelectInvalid` (touched-gated, mirrors `KjInput`),
  `kjMultiSelectDisabled` (forwarded to `KjDisabled`), `kjMultiSelectReadonly`
  (panel does not open; chips are not removable).
- **Selection model** — array of values held in `kjMultiSelectValue` (a
  `model<readonly unknown[]>([])`). Order is **selection order** by default
  (most-recent-last) — see [Open questions](#open-questions--risks) for the
  alternative "source-order" stance.
- **Trigger display** — chips (default) or comma-separated. Chip mode
  composes the upcoming `KjChip` / `KjChipRemove` directives; the trigger is
  a `<button>` whose visible content is a row of chips followed by an
  optional "X more" overflow chip. Comma mode renders a single text node
  joined with `, `. See
  [Decision: trigger display](#decision-trigger-display).
- **Select-all / deselect-all** — `<button kjMultiSelectAllToggle>` directive
  that lives **inside** the panel (typically in a header toolbar). It reads
  the current selection vs the registered options and reflects a tri-state
  (none / some / all) via `data-state` and `aria-checked="mixed"` semantics
  (the toolbar button is `role="checkbox"`). Activating it sets all when
  some-or-none, clears when all.
- **Slots** — chip area + overflow chip + clear-all button inside the
  trigger; toolbar (select-all, clear-all, separator) inside the panel
  header; option list inside the panel body; an optional empty-state
  template (`*kjMultiSelectEmpty`) for "no options". Filter input is **not**
  a slot — that's `KjCombobox`.
- **Form integration** — via `KjFormControl` (the shared CVA primitive on
  the root). Value type is `readonly unknown[]`. `setDisabledState` and
  touched/dirty propagation work identically to `KjInput`.
- **Keyboard contract** — see [Accessibility](#accessibility-wcag-21-aaa).
  Spacebar **toggles** the active option without closing; Enter does the
  same; Escape closes; Tab from the trigger opens (or moves on, see Q&A);
  Tab inside the panel cycles the toolbar buttons and exits.

## Decision: trigger display

**Default to chips with "X more" overflow; opt out to a comma list.** Three
considerations decide it:

1. **Information density.** Chips per item make the selection scannable
   ("which 3 are selected?") in a way a comma string never does. AAA users
   relying on screen magnification benefit most — the chips are individually
   addressable, the string is one wrapping line.
2. **Removal affordance.** Chips give each value a removable handle (`×`
   button). The comma string forces consumers to either re-open the panel
   to deselect or build their own out-of-band remove UI. PrimeNG ships
   removal buttons inside chip mode for exactly this reason.
3. **Overflow is a real concern.** Five chips is fine; fifty chips break
   the layout. The default chip mode therefore caps at
   `kjMultiSelectMaxChips` (default `3`) and renders an overflow chip
   `+{n - 3} more` for the rest. The overflow chip is non-removable and
   announces the hidden count to SR. PrimeNG calls this `maxSelectedLabels`;
   the kouji name is more descriptive.

**Override with `kjMultiSelectDisplay="comma"`.** When the consumer wants
the Material-style "Item A, Item B, Item C" join — common in dense form
rows where chips would dominate — the comma renderer produces a single
text node and ignores `kjMultiSelectMaxChips`. SR-side, comma mode emits
a single concatenated string in the trigger's accessible name; chip mode
emits "selected: N items" plus per-chip names (see Accessibility).

A third mode, `kjMultiSelectDisplay="custom"`, passes a `<ng-template>`
through structural-directive projection (`*kjMultiSelectTriggerLabel`) that
receives the selection array — for consumers who want neither chips nor a
comma string. PrimeNG's `<ng-template pTemplate="selectedItems">` is the
direct analogue.

The chip rendering itself **does not live in `KjMultiSelect`**. The trigger
projects via `[ngTemplateOutlet]` into a per-value template; the default
template renders `<span kjChip kjVariant="ghost"><span>{{label}}</span><button kjChipRemove kjAriaLabel="Remove {{label}}">×</button></span>`,
sourced from the upcoming
[`../data-display/chip.md`](../data-display/chip.md). This keeps Multi Select
trigger code small and lets the chip family own its own a11y / touch-target
contracts.

## Accessibility (WCAG 2.1 AAA)

| Concern | Where | Mechanism |
|---|---|---|
| **Trigger role** | `KjMultiSelectTrigger` | `role="combobox"` on the `<button>`, with `aria-haspopup="listbox"` and `aria-expanded` mirrored from the panel's open state. The trigger is **not** a `<select multiple>` — that native widget has zero customisability and a notoriously bad UX. We follow [APG combobox + listbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) without the textbox-edit affordance. |
| **`aria-multiselectable`** | `KjMultiSelectContent` | The listbox panel sets `aria-multiselectable="true"`. This is the single authoritative signal to AT that more than one option is selectable. Without it, JAWS / NVDA announce "1 of N selected" instead of "1 of N, multi-select listbox". |
| **`aria-controls`** | `KjMultiSelectTrigger` → panel id | The trigger's `aria-controls` references the panel's auto-minted id — even when the panel is closed (the relationship survives close). |
| **`aria-activedescendant`** | `KjMultiSelectContent` | The panel keeps **DOM focus** while a roving `aria-activedescendant` points at the visually-highlighted option. This is the APG-recommended pattern for combobox-controlled listboxes — it lets keyboard users "look at" an option without committing focus to it, and lets Space toggle the highlighted option without losing the panel. Mirrors `KjSelect` exactly. |
| **`aria-selected`** | per-`KjOption` | Each option reflects `aria-selected="true|false"` from the shared selection model. **In a multi-selectable listbox**, *every* option must carry `aria-selected` (true or false) — APG is explicit. Single-select Listbox can omit it on unselected; multi must not. |
| **Checkbox affordance** | per-`KjOption` (visual only) | Each option renders a leading checkbox glyph (a `KjCheckbox` styled inert, or a CSS `[data-selected]` pseudo) bound to `aria-selected`. The checkbox is **purely visual** — no nested `role="checkbox"`, because the option already carries `role="option"` in a multi-selectable listbox and APG forbids nested interactives. |
| **Selected-count live region** | `KjMultiSelectAnnouncer` (composes `KjLiveRegion`) | On every change to the selection set, an off-screen live region announces "{n} selected" (and "{label} added" / "{label} removed" when `kjMultiSelectAnnounceItems="true"`). Polite, debounced 100ms to avoid storm announces during select-all. WCAG 4.1.3. |
| **`aria-invalid`** | `KjMultiSelectTrigger` | Touched-gated via `KjFormControl.touched()` — same pattern as `KjInput`. When a field's matcher fires invalid, `aria-invalid="true"` on the trigger. |
| **`aria-required`** | `KjMultiSelectTrigger` | Auto-derived from the bound `NgControl`'s `Validators.required` (or composed from `KjField`'s `kjFieldRequired`). |
| **`aria-disabled` vs native `disabled`** | `KjMultiSelectTrigger` | Trigger is a `<button>`. Per the kouji house style for buttons, **ARIA-disabled** with the trigger kept focusable (so SR users can still discover it). Click and Space/Enter are intercepted in the capture phase; Escape still works. |
| **Keyboard: trigger** | `KjMultiSelectTrigger` | `Space` / `Enter` / `Down Arrow` open the panel and move active descendant to the first selected item (or first item if none selected). `Up Arrow` opens and moves to the last selected (or last). `Escape` clears the trigger of focus only when the panel is already closed (unhandled otherwise). `Tab` while panel is closed moves to the next tabbable; **`Tab` while panel is open closes the panel and moves on** (see Q3). |
| **Keyboard: panel options** | `KjMultiSelectContent` (composes `KjListboxNavigation`) | `Down/Up Arrow` move active descendant; `Home/End` jump to first/last; `Page Down/Up` move by 10. Type-ahead jumps to the next option starting with typed chars (300ms reset). `Space` and `Enter` **toggle** the active option without closing; `Escape` closes; `Shift+Down/Up` **range-extends** the selection from the last anchor (Material's `_optionsForUpdates` pattern); `Ctrl/Cmd+A` selects all visible options. |
| **Keyboard: select-all toolbar** | `KjMultiSelectAllToggle` | `Space`/`Enter` toggle. When focused inside the panel toolbar, `Down Arrow` exits to the option list. |
| **Keyboard: chip removal** | `KjChipRemove` (in trigger) | When a chip is focused inside the trigger, `Backspace` and `Delete` remove it. Tab navigates between chips inside the trigger only when `kjMultiSelectChipsTabbable="true"` (default `false`) — see Q4. |
| **Focus management** | `KjMultiSelect` + `KjFocusTrap` | Panel does **not** trap focus by default — it stays on the trigger and uses `aria-activedescendant`. Optional `kjMultiSelectFocusTrap="true"` for full-screen / mobile drawer presentations (the panel does take focus and traps it; close restores to the trigger). The panel's anchor uses the kouji `KjOverlay` primitive. |
| **Touch target ≥ 44×44** | trigger CSS + chip CSS | Trigger min-height 44px at `md`. Chip remove buttons are 24×24 visually but expanded to 44×44 hit area via padding/`pointer-events: auto` overlay. WCAG 2.5.5. |
| **Color/contrast** | themes | Selected-state highlight ≥ 3:1 against the panel background; chip backgrounds + text ≥ 7:1 (AAA). |
| **No-options empty state** | `KjMultiSelectEmpty` | `role="status"`, polite live region. Text defaults to "No options available" (locale-overridable). |
| **Click outside / Escape** | `KjMultiSelectContent` | Both close the panel. Closing on outside-click does *not* clear selection — only the panel state changes. |

**Where each piece lives.** Trigger ARIA (`role="combobox"`, `aria-haspopup`,
`aria-expanded`, `aria-controls`, `aria-invalid`, `aria-required`) on the
**trigger directive**. Panel ARIA (`role="listbox"`, `aria-multiselectable`,
`aria-activedescendant`) on the **content directive**. Per-option ARIA
(`role="option"`, `aria-selected`, `aria-disabled`) on **each option** —
unchanged from `KjOption`. Live-region announcements composed via
`KjLiveRegion` host directive on the **root**. Field-level ARIA
(`aria-describedby`, label association) flows through
[`field.md`](./field.md) — Multi Select's trigger registers as the labelled
control with `KjField` exactly as `KjInput` does.

## Composition model

```text
multi-select/
  multi-select.ts                  ← KjMultiSelect (root, providers KJ_MULTI_SELECT + KJ_LISTBOX_HOST)
  multi-select-trigger.ts          ← KjMultiSelectTrigger
  multi-select-content.ts          ← KjMultiSelectContent
  multi-select-all-toggle.ts       ← KjMultiSelectAllToggle  (panel toolbar)
  multi-select-empty.ts            ← KjMultiSelectEmpty       (structural directive *kjMultiSelectEmpty)
  multi-select-trigger-label.ts    ← *kjMultiSelectTriggerLabel structural directive (custom render)
  multi-select.context.ts          ← KjMultiSelectContext + KJ_MULTI_SELECT token
  multi-select.spec.ts
  index.ts
```

…with two newly-extracted shared primitives also touched by `KjSelect`
and `KjCombobox`:

```text
primitives/forms/
  selection-model.ts          ← KjSelectionModel<T>  (lifted, used by KjSelect / KjMultiSelect / KjCombobox)
primitives/interaction/
  listbox-navigation.ts       ← KjListboxNavigation  (lifted from KjSelectContent.onKeydown)
overlay/
  listbox-host.context.ts     ← KJ_LISTBOX_HOST       (generalised KJ_SELECT for option-side context)
```

The option directives (`KjOption`, `KjOptionGroup`) **stay where they are**
in `packages/core/src/select/` and are the same files. Their context
injection is widened from `KJ_SELECT` to `KJ_LISTBOX_HOST` (a superset
interface that `KjSelect` satisfies and `KjMultiSelect` also satisfies).
This is the only change to the existing `select/` module — see Q1 for the
migration mechanics.

### Shared state — `KjMultiSelectContext`

```ts
export interface KjMultiSelectContext {
  /** Current selection — array of values, in selection order. */
  readonly value: Signal<readonly unknown[]>;
  /** Whether the panel is open. */
  readonly open: Signal<boolean>;
  /** Whether the trigger is in readonly mode. */
  readonly readonly: Signal<boolean>;
  /** Whether the trigger is disabled. */
  readonly disabled: Signal<boolean>;
  /** Whether the field is invalid (post-touch). */
  readonly invalid: Signal<boolean>;
  /** Compare function used by the selection model. */
  readonly compareWith: Signal<(a: unknown, b: unknown) => boolean>;
  /** All registered option values (for select-all and tri-state computation). */
  readonly registeredValues: Signal<readonly unknown[]>;
  /** Which registered options are currently disabled. */
  readonly disabledValues: Signal<readonly unknown[]>;

  /** Toggle a single value. Does NOT close the panel. */
  toggle(value: unknown): void;
  /** Add a single value if not present. */
  select(value: unknown): void;
  /** Remove a single value. */
  deselect(value: unknown): void;
  /** Set the selection wholesale (used by setAll / clear / shift-range). */
  setSelection(values: readonly unknown[]): void;
  /** Toggle every (non-disabled) registered value. */
  toggleAll(): void;
  /** Clear all selections. */
  clear(): void;
  /** Open / toggle / close the panel. */
  show(): void;
  toggleOpen(): void;
  hide(): void;
}

export const KJ_MULTI_SELECT = new InjectionToken<KjMultiSelectContext>('KjMultiSelect');
```

`KjMultiSelect` provides `KJ_MULTI_SELECT` *and* the more general
`KJ_LISTBOX_HOST` (whose interface is `Pick<KjMultiSelectContext, 'value' |
'compareWith' | 'toggle' | 'select' | 'mode'>` — `mode: 'single' | 'multi'`).
`KjOption` injects `KJ_LISTBOX_HOST`. The `mode` discriminator lets the
option know whether activation should `select` (which closes via the
single-select host's own internal logic) or `toggle` (which doesn't).

### `KjMultiSelect` (root, selector `[kjMultiSelect]`)

```ts
@Directive({
  selector: '[kjMultiSelect]',
  standalone: true,
  hostDirectives: [
    { directive: KjDisabled, inputs: ['kjMultiSelectDisabled'] },
    KjFormControl,
    KjLiveRegion,
  ],
  providers: [
    { provide: KJ_MULTI_SELECT, useExisting: KjMultiSelect },
    { provide: KJ_LISTBOX_HOST, useExisting: KjMultiSelect },
  ],
  host: {
    '[attr.data-open]': 'open() ? "" : null',
    '[attr.data-empty]': 'value().length === 0 ? "" : null',
  },
})
export class KjMultiSelect implements KjMultiSelectContext {
  readonly kjMultiSelectValue = model<readonly unknown[]>([]);
  readonly kjMultiSelectCompareWith = input<(a: unknown, b: unknown) => boolean>(Object.is);
  readonly kjMultiSelectMaxChips = input<number>(3);
  readonly kjMultiSelectDisplay = input<'chips' | 'comma' | 'custom'>('chips');
  readonly kjMultiSelectReadonly = input<boolean>(false);
  readonly kjMultiSelectAnnounceItems = input<boolean>(false);
  readonly kjMultiSelectFocusTrap = input<boolean>(false);
  readonly kjMultiSelectChipsTabbable = input<boolean>(false);
  readonly kjMultiSelectHideOnSelect = input<boolean>(false); // PrimeNG-style escape hatch
  readonly kjMultiSelectMode = 'multi' as const;
  /* ... selection model wiring, open state signal, value↔model bridge */
}
```

`KjMultiSelect` composes:
- `KjDisabled` (host directive) — ARIA-disabled propagation.
- `KjFormControl` — CVA wiring for `[(ngModel)]` / `[formControl]` against
  `readonly unknown[]`. The shared CVA primitive needs to accept arrays;
  see Q2.
- `KjLiveRegion` — selected-count announcer.
- `KjFocusTrap` — composed conditionally via the `KjOverlay` primitive
  when `kjMultiSelectFocusTrap` is set. Default off.

### `KjMultiSelectTrigger` (selector `[kjMultiSelectTrigger]`)

```ts
@Directive({
  selector: 'button[kjMultiSelectTrigger]',
  standalone: true,
  hostDirectives: [
    KjFocusRing,
    { directive: KjVariant, inputs: ['kjVariant'] },
    { directive: KjSize,    inputs: ['kjSize'] },
  ],
  host: {
    'role': 'combobox',
    'aria-haspopup': 'listbox',
    '[attr.aria-expanded]': 'ctx.open()',
    '[attr.aria-controls]': 'panelId()',
    '[attr.aria-disabled]': 'ctx.disabled() ? "true" : null',
    '[attr.aria-invalid]': 'ctx.invalid() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    '[attr.data-open]': 'ctx.open() ? "" : null',
    '(click)': 'onClick($event)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class KjMultiSelectTrigger { /* ... */ }
```

The trigger renders the chip row / comma string / custom template inside
itself. The default content of `<button kjMultiSelectTrigger>` is whatever
the consumer projects; the **default template** for un-projected children
is `<span kjMultiSelectTriggerLabel></span>` which the directive auto-fills.

### `KjMultiSelectContent` (selector `[kjMultiSelectContent]`)

```ts
@Directive({
  selector: '[kjMultiSelectContent]',
  standalone: true,
  hostDirectives: [KjListboxNavigation, KjOverlay],
  host: {
    'role': 'listbox',
    'aria-multiselectable': 'true',
    '[attr.id]': 'panelId()',
    '[attr.hidden]': '!ctx.open() ? "" : null',
    '[attr.aria-activedescendant]': 'nav.activeId()',
    '(keydown)': 'onKeydown($event)',
    '(document:keydown.escape)': 'ctx.hide()',
    '(document:click)': 'onDocClick($event)',
    '(click)': '$event.stopPropagation()',
  },
})
export class KjMultiSelectContent { /* ... */ }
```

Composes `KjListboxNavigation` (the shared keyboard primitive) and
`KjOverlay` (positioning / outside-click — same primitive `KjSelect` will
adopt). `KjListboxNavigation` is told `mode: 'multi'` so Space/Enter call
`toggle(active)` instead of `select(active); hide()`.

### `KjMultiSelectAllToggle` (selector `[kjMultiSelectAllToggle]`)

A button that lives in the panel header. Tri-state via `aria-checked`:

```ts
@Directive({
  selector: 'button[kjMultiSelectAllToggle]',
  standalone: true,
  hostDirectives: [KjFocusRing],
  host: {
    'type': 'button',
    'role': 'checkbox',
    '[attr.aria-checked]': 'tristate()',  // 'true' | 'false' | 'mixed'
    '[attr.data-state]': 'tristate()',
    '(click)': 'ctx.toggleAll()',
    '(keydown.space)': '$event.preventDefault(); ctx.toggleAll()',
  },
})
export class KjMultiSelectAllToggle { /* ... */ }
```

`tristate` is computed as: `'true'` if all non-disabled registered values
are selected, `'false'` if none, `'mixed'` otherwise. `aria-checked="mixed"`
is the canonical APG signal for indeterminate group selection.

Activation rule: when `mixed` or `false`, select all (non-disabled); when
`true`, clear all. PrimeNG's `showToggleAll` does the same.

### `KjMultiSelectEmpty` (structural directive `*kjMultiSelectEmpty`)

```html
<div kjMultiSelectContent>
  <p *kjMultiSelectEmpty>No matching options</p>
  @for (opt of options(); track opt.id) {
    <div kjOption [kjOptionValue]="opt">{{ opt.label }}</div>
  }
</div>
```

Renders the projected template inside a `role="status"` host when the
panel has zero options. `KjMultiSelect` does **not** filter options — that's
`KjCombobox` — but a parent `@if` over async option lists hits zero often
enough to warrant first-class support.

### Cross-component pointers

- **[`select.md`](./select.md)** — single-select sibling. Shares
  `KjSelectionModel`, `KjListboxNavigation`, `KjOverlay`,
  `KJ_LISTBOX_HOST`, `KjOption`, `KjOptionGroup`. Decision recorded here:
  `KjMultiSelect` is **not** a flag on `KjSelect`. The Select analysis
  should call back to this document for the rationale.
- **[`combobox.md`](./combobox.md)** — search-filterable Multi/Single.
  Reuses *all* of Multi Select's directives plus a `KjComboboxFilter`
  textbox primitive on top. Combobox in multi mode is essentially
  `KjMultiSelect` with `KjComboboxFilter` projected into the panel header
  and the trigger replaced by a `role="combobox"` `<input>` (instead of
  `<button>`). The chip rendering, selection model, listbox navigation,
  toolbar, all transfer.
- **[`field.md`](./field.md)** — `KjField` shell. The trigger registers
  with `KjField` via `KjFormControl` (same pattern as `KjInput`); Field's
  describedby chain flows onto the trigger; `aria-required` derives from
  `Validators.required` on the bound `NgControl`. The panel does **not**
  receive describedby — it's anchored separately and isn't the labelled
  element.
- **[`../data-display/tag.md`](../data-display/tag.md) /
  [`../data-display/chip.md`](../data-display/chip.md)** — chip renderer in
  the trigger. Multi Select doesn't define chip styling itself; it projects
  into the chip family. Forward references — neither analysis is written
  yet. Define chip there:
  - `KjChip` (root), `KjChipLabel`, `KjChipRemove` (× button).
  - Chip touch-target floor 44×44 (remove button hit area).
  - `kjVariant` palette must include `ghost` (the default the trigger uses).
  When chip ships, Multi Select's trigger uses `<kj-chip *ngFor="let v of
  shownValues()">` with the inferred label (see Q5 for label resolution).
- **[`checkbox.md`](./checkbox.md)** (forward) — option-side checkbox
  glyph. Multi Select's option doesn't *project* a checkbox (would create
  a nested interactive — APG-forbidden); it draws one via theme CSS keyed
  on `[aria-selected]`. The Checkbox analysis can call out the
  "checkbox-as-pseudo" recipe as a sub-pattern.
- **[`form.md`](./form.md)** — value type is `readonly unknown[]`.
  Form-level validators (e.g. minLength on the array, exactly-N-selected)
  are documented there; Multi Select itself only validates "is the value
  an array".
- **[`../actions/button.md`](../actions/button.md)** — the trigger is a
  `<button kjMultiSelectTrigger>`. ARIA-disabled stance, capture-phase
  intercept, `KjVariant` / `KjSize` integration, preset config token —
  all copy-paste from `KjButton`.
- **[`../navigation/menu.md`](../navigation/menu.md)** — *not* the same.
  Menu uses `role="menu" / role="menuitem"`, single-activation semantics,
  no `aria-multiselectable`. Multi Select must not be confused with a menu;
  document the distinction in both files.

## Inputs / Outputs / Models — `kj`-prefixed

### `KjMultiSelect` (root)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjMultiSelectValue` | `model` | `readonly unknown[]` | `[]` | Two-way bindable. The CVA primitive writes here on form-side updates and reads here on selection changes. |
| `kjMultiSelectCompareWith` | `input` | `(a: unknown, b: unknown) => boolean` | `Object.is` | Mirrors Material's `compareWith`. Critical when option values are objects. |
| `kjMultiSelectMaxChips` | `input` | `number` | `3` | Number of chips to render before the "+N more" overflow. Ignored when `kjMultiSelectDisplay !== 'chips'`. |
| `kjMultiSelectDisplay` | `input` | `'chips' \| 'comma' \| 'custom'` | `'chips'` | `'custom'` requires `*kjMultiSelectTriggerLabel`. |
| `kjMultiSelectDisabled` | forwarded via host directive `KjDisabled` | `boolean` | `false` | Reflects `aria-disabled` / `data-disabled`. |
| `kjMultiSelectReadonly` | `input` | `boolean` | `false` | Panel does not open; chip remove buttons disabled. |
| `kjMultiSelectAnnounceItems` | `input` | `boolean` | `false` | When true, announces "{label} added" / "{label} removed" instead of just "{n} selected". |
| `kjMultiSelectFocusTrap` | `input` | `boolean` | `false` | When true, panel takes focus + `KjFocusTrap` on open; restores on close. |
| `kjMultiSelectChipsTabbable` | `input` | `boolean` | `false` | When true, each chip is tabbable inside the trigger. Default false (chips remove via Backspace from the trigger button). |
| `kjMultiSelectHideOnSelect` | `input` | `boolean` | `false` | PrimeNG-compat escape hatch. When true, the panel closes on every toggle — defeats the multi UX, but useful for "tap to toggle, panel closes immediately" mobile flows. |

### `KjMultiSelectTrigger`

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjVariant` | host directive `KjVariant` | preset string | `'default'` (from `KJ_MULTI_SELECT_CONFIG`) | |
| `kjSize` | host directive `KjSize` | preset string | `'md'` | |
| `kjMultiSelectPlaceholder` | `input` | `string` | `''` | Shown when selection is empty. |
| `kjMultiSelectAriaLabel` | `input` | `string \| undefined` | `undefined` | Required when no `KjField` parent supplies the label and no `aria-labelledby`. |
| `kjMultiSelectShowClear` | `input` | `boolean` | `true` | When true, shows a "× Clear all" button inside the trigger when selection is non-empty. |

### `KjMultiSelectContent`

No public inputs — shape and behaviour are driven by the parent context.

### `KjMultiSelectAllToggle`

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjMultiSelectAllAriaLabel` | `input` | `string` | `'Select all'` | The accessible name; localised by consumers. |
| `kjMultiSelectAllScope` | `input` | `'all' \| 'visible'` | `'visible'` | When the panel is filtered (Combobox use case), `'visible'` toggles only the currently-visible options; `'all'` toggles every registered option. Default `'visible'` matches user expectation; `'all'` is for explicit "everything" semantics. |

### `KjMultiSelectEmpty` / `KjMultiSelectTriggerLabel`

Structural directives — no inputs beyond the implicit `<ng-template>`. The
trigger-label template's implicit context is `{ $implicit: readonly
unknown[] }` (the selected values).

All names are `kj`-prefixed per `rules/code_style.md`. Form value type is
**`readonly unknown[]`** — the CVA accepts arrays and writes them back.

## Examples to ship

Match the structure under `packages/components/src/multi-select/`:

1. **Default** — `multi-select.example.ts`. Five primitive options;
   `kjMultiSelectValue` two-way-bound to a signal; default chip display.
2. **Chip overflow** — `multi-select.overflow.example.ts`.
   `kjMultiSelectMaxChips="2"` with seven options to demonstrate the
   "+5 more" overflow chip and SR announcement.
3. **Comma display** — `multi-select.comma.example.ts`.
   `kjMultiSelectDisplay="comma"` with ten options and a `KjField` wrapper.
4. **Custom trigger label** — `multi-select.custom-trigger.example.ts`.
   `*kjMultiSelectTriggerLabel="let values"` rendering a "{n} categories
   selected" string.
5. **Select-all toolbar** — `multi-select.select-all.example.ts`. Panel
   header with `KjMultiSelectAllToggle` and a separator above the option
   list; demonstrates the tri-state.
6. **Reactive form** — `multi-select.reactive.example.ts`. `[formControl]`
   bound to a `FormControl<string[]>([])` with `Validators.required` and a
   minLength-via-array validator; error rendered via `KjFieldError`.
7. **Template-driven form** — `multi-select.ngmodel.example.ts`.
   `[(ngModel)]` against an object array with `compareWith`.
8. **Object values + `compareWith`** — `multi-select.compare.example.ts`.
   Options whose values are `{ id, name }` objects; `compareWith` matching
   on `id`. Shows the "without compareWith, re-renders break selection"
   anti-pattern.
9. **Grouped options** — `multi-select.grouped.example.ts`. `KjOptionGroup`
   reused from `KjSelect` with multi semantics (each group has its own
   "select group" mini-toggle as a separate sub-recipe).
10. **Disabled options** — `multi-select.disabled-options.example.ts`.
    `kjDisabled` on individual `KjOption`s; verify select-all skips them.
11. **Disabled control** — `multi-select.disabled.example.ts`.
    `kjMultiSelectDisabled="true"` and form-side `.disable()` shown.
12. **Readonly** — `multi-select.readonly.example.ts`.
    `kjMultiSelectReadonly="true"`; chips visible but non-removable, panel
    won't open.
13. **Focus-trap (mobile)** — `multi-select.focus-trap.example.ts`.
    `kjMultiSelectFocusTrap="true"` to demonstrate the full-screen drawer
    presentation; close restores trigger focus.
14. **In a Field** — `multi-select.field.example.ts`. `<div kjField>` with
    `<label kjFieldLabel>` and `<span kjFieldError>`; demonstrates
    label-as-`aria-labelledby` (combobox triggers can't take `<label for>`
    on themselves cleanly — see Q6).
15. **Empty state** — `multi-select.empty.example.ts`. Async options with
    initial empty array, demonstrates `*kjMultiSelectEmpty`.
16. **Configured presets** — `multi-select.configured.example.ts`. Extends
    the variant set with `brand` via `provideKjMultiSelect`.
17. **Themed (core-only)** — `multi-select.example.ts`,
    `multi-select.retro.example.ts`, `multi-select.finance.example.ts`
    under `packages/core/src/multi-select/`.

## Open questions / risks

1. **Generalising `KJ_SELECT` → `KJ_LISTBOX_HOST` without breaking shipped
   `KjSelect`.** The existing `select.context.ts` defines `KJ_SELECT` and
   the existing `KjOption` injects it. Strategy: add `KJ_LISTBOX_HOST` as
   a new token in `packages/core/src/overlay/listbox-host.context.ts`;
   make `KjSelect` provide both (`{ provide: KJ_LISTBOX_HOST, useExisting:
   KjSelect }` alongside the existing `KJ_SELECT` provider); switch
   `KjOption` to inject `KJ_LISTBOX_HOST`; keep `KJ_SELECT` exported and
   provided for any consumers that depend on it directly. Spec at
   `packages/core/src/select/select.spec.ts` continues to pass unchanged.
   No breaking change.

2. **`KjFormControl` value type for arrays.** Current `KjFormControl.value`
   is `Signal<unknown>`. Multi Select's value is `readonly unknown[]`. The
   CVA primitive accepts `unknown` already, so there's no type wall — but
   the **single-source identity check** that some compositions (`KjFloatLabel`'s
   `empty` derivation) do as `value() == null || value() === ''` would
   classify a non-empty array as "non-empty" correctly only by accident.
   Recommendation: add `customEmpty?: () => boolean` to `KjFormControl` (already
   flagged as a follow-up in [`field.md`](./field.md) Q7). `KjMultiSelect`
   provides `() => value().length === 0` as its `customEmpty`. Closes Field's
   open question.

3. **Tab behaviour while panel is open.** APG offers two patterns:
   (a) Tab closes the panel and moves on (Material's choice for select);
   (b) Tab moves between panel widgets (toolbar buttons, then exits).
   We have a select-all toolbar — Tab needs to reach it. **Recommendation:
   Tab cycles toolbar then exits-and-closes.** First Tab from trigger goes
   into the toolbar's first interactive (the select-all button); subsequent
   Tab moves through any further toolbar items; the next Tab past the last
   toolbar item closes the panel and moves to the next tabbable in the
   document. Shift+Tab from the trigger closes the panel and moves backwards
   normally. This is the behaviour the focus-trap variant uses verbatim, so
   the only behavioural difference between `kjMultiSelectFocusTrap` on/off
   is whether Tab can ever leave the panel — on, no; off, yes.

4. **`kjMultiSelectChipsTabbable` default.** With chips inside the trigger,
   Tab can either (a) treat the trigger as one focus stop (chips reachable
   only from inside via Arrow keys) or (b) make each chip its own tab stop.
   PrimeNG default: (a). Material doesn't have chips. shadcn extension
   default: (a). **Recommendation: default `false` (single tab stop)**, with
   `kjMultiSelectChipsTabbable="true"` for the (b) behaviour. Removal works
   either way: in (a), focus the trigger and press Backspace to remove the
   last chip (or Delete to remove the first); in (b), focus a chip and
   press Backspace/Delete on it. Document the keyboard contract in both
   modes.

5. **Chip label resolution.** A chip displays a label string for its value;
   the value itself is `unknown` (often a primitive id, sometimes an object).
   How does the chip find its label?
   (a) Project a label resolver: `kjMultiSelectGetLabel: (value: unknown) =>
       string` input.
   (b) Read each option's `textContent` from the registered options.
   (c) Project a per-chip template via `*kjMultiSelectChipLabel="let value"`.
   **Recommendation: ship (b) as the default — read the text content of the
   matching `KjOption`'s host element, register on option-attach** — and
   offer (c) for richer chip content. (a) is a strictly worse subset of (c).
   PrimeNG goes with (b)+(c) (`optionLabel` plus a chip template); we match.

6. **Field label association on a `<button>` trigger.** `<label for>` works
   only on form-associated elements (input/select/textarea); the trigger is
   a `<button>`. So `KjFieldLabel` must use the `aria-labelledby` strategy
   when the labelled control is a Multi Select trigger. The auto-detection
   in [`field.md`](./field.md) keys on `tagName === 'INPUT' | 'SELECT' |
   'TEXTAREA'` — `'BUTTON'` falls through to `aria-labelledby`. **Confirmed
   correct as designed in `field.md`; document the precedence here for
   discoverability.**

7. **Selection order.** When the user toggles items, the resulting array
   can be (a) selection order (most-recent-last), (b) source order (the
   order of the registered `KjOption`s). PrimeNG: source order. Material:
   source order. Forms typically expect source order (deterministic, easy
   to compare in tests). **Recommendation: source order** — surprises fewer
   people, makes value-equality checks predictable, and is what reactive
   form developers expect when comparing `formControl.value` between
   submissions. Implementation: `KjSelectionModel` exposes a
   `setSelection(values)` that re-projects the input array onto the
   registered-options order before storing. The selection-order alternative
   can ship later as `kjMultiSelectOrder="selection"` if a use case appears.

8. **`Ctrl/Cmd+A` semantics inside the panel.** APG suggests it as
   "select all in the listbox". Two concerns: (a) it conflicts with the
   browser-level "select all text" if the panel has any focused text input
   (it doesn't, in non-Combobox); (b) it can be a footgun on lists with
   thousands of items. **Recommendation: handle it** — call
   `ctx.toggleAll()` which does the same thing as the toolbar button, only
   when the listbox panel is the `aria-activedescendant` host (i.e. focus
   is on the trigger or the panel and the panel is open). Document.

9. **Shift+Click and Shift+Arrow range selection.** Material implements
   it (`_optionsForUpdates` via `_lastSelectedItemId` anchor); PrimeNG
   doesn't. **Recommendation: ship Shift+Arrow range-extension** in the
   shared `KjListboxNavigation` primitive (also useful for any future
   `role="grid"` cell selection). Shift+Click is more involved (requires
   the option to know what "previous click" was) — **defer** until the
   shared range-anchor signal lands. Document the partial coverage.

10. **`compareWith` and selection invalidation on identity drift.** When
    bound to an object array source that re-emits new instances (HTTP
    refetch), the selected array goes stale unless `compareWith` is
    object-identity-aware (id-based). Default `Object.is` will invalidate.
    Document the requirement loudly in TSDoc — Material has *the* canonical
    GitHub issue thread on this topic; we don't need to relive it. Add a
    dev-mode warning when `compareWith` is the default and any selected
    value is an object: "Multi Select with object values requires
    `compareWith`".

11. **Live-region storm during select-all over 1k options.** Announcing
    each addition is impossible at scale. The debounce in
    `KjMultiSelectAnnouncer` is 100ms; select-all announces a single
    "All N selected" within that window regardless of the per-item count.
    Implementation: when the selection size delta is `>1`, announce
    `"{n} selected"`; when delta is exactly `1`, announce per-item if
    `kjMultiSelectAnnounceItems` is true. Document.

12. **Touched semantics.** `KjFormControl.touched()` flips on first blur.
    For Multi Select: when does "blur" happen? Trigger blur, panel close,
    or panel close + trigger blur? **Recommendation: panel close** —
    closing the panel is the primary "I'm done" gesture; trigger blur after
    panel-close is redundant. Implementation: `notifyTouched()` from the
    root on every panel-close transition (open → closed). If the user
    never opens the panel (e.g. tabs through), trigger blur still fires
    `notifyTouched`. Both paths cover.

13. **SSR.** Panel is hidden by `[attr.hidden]` until the click handler
    runs, so SSR renders an empty trigger + a hidden panel. `KjOverlay`'s
    positioning runs in the browser only. `KjLiveRegion` is browser-only.
    No SSR hydration mismatches expected; verify with the SSR app once
    `KjOverlay` lands.

14. **Keyboard contract divergence from `KjSelect`.** `KjSelect` today
    treats Enter and Space identically (both select-and-close).
    `KjMultiSelect` treats Enter and Space identically (both toggle and
    keep open). The shared `KjListboxNavigation` primitive accepts a
    `mode: 'single' | 'multi'` discriminator — single-mode delegates to
    `host.select()`, multi-mode to `host.toggle()`. This subtly changes
    `KjSelect` to use the primitive instead of inline keydown — still
    behaviour-equivalent. Spec coverage: extend
    `packages/core/src/select/select.spec.ts` to lock the existing
    behaviour before the refactor, then add `multi-select.spec.ts` that
    locks multi behaviour against the same primitive.

15. **`role="combobox"` on a `<button>`.** APG 1.2 retired the
    "combobox-as-textbox" requirement; a non-textbox combobox is allowed
    when there's no inline filtering. NVDA, JAWS, and VoiceOver have all
    supported `role="combobox"` on non-textbox elements since 2019.
    Confirm the latest pattern under
    [APG combobox (Select Only)](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/)
    — that is the exact pattern Multi Select implements.

16. **Why not native `<select multiple>`?** Three reasons:
    (a) Visual fidelity — native multiple-select renders as a *visible
        scrolling list* on every browser, with no panel collapse, no chip
        rendering, and minimal styling hooks.
    (b) Touch UX — terrible. Mobile Safari and Chrome both fall back to
        full-screen pickers that don't honour the AAA contrast contract.
    (c) Cmd+Click / Ctrl+Click for multi-selection is a discoverable-only-
        if-you-know-it gesture and silently fails for keyboard-only users
        who don't know to use Space.
    For native `<select>` (single), kouji deliberately *does* offer a
    pass-through wrapper. For multiple, the native widget is unfit and
    the custom combobox+listbox pattern is the unambiguous best practice.
    Document the rationale.

17. **Loading state.** Async option lists need a "loading…" affordance.
    PrimeNG ships `loading: boolean` on the panel. Recommendation: ship
    `kjMultiSelectLoading: boolean` on the root that reflects
    `data-loading` and announces "Loading options" via the live region;
    panel content is replaced with a `*kjMultiSelectEmpty`-style projected
    template (`*kjMultiSelectLoading`) when set. Trigger remains
    interactive (so the user can still see selected chips) but the panel
    contents are placeholder. Defer the directive split until first real
    use case in apps.

18. **Validation: minimum / maximum selection count.** Out of scope for
    Multi Select itself. Use a validator on the bound `FormControl`:
    `Validators.min(2)` doesn't apply to arrays, but a custom validator
    `(c) => c.value.length < 2 ? { minSelected: 2 } : null` is two lines
    and the right place. Document the recipe in the form-integration
    example and in [`form.md`](./form.md).

19. **Maintenance note: refactor `KjSelect` to use the shared primitives
    in the same change.** Lifting `KjSelectionModel` and
    `KjListboxNavigation` out of `KjSelect`, then having `KjSelect`
    re-consume them, is the only way to keep behaviour identical between
    the single- and multi-select variants. If we ship Multi Select first
    and refactor Select later, two implementations of "what does
    Space do on an option" diverge for as long as the gap exists. Land
    the refactor + Multi Select in a single PR and lock both with specs.
