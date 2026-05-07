# Combobox / Autocomplete

A **Combobox** is a [`KjSelect`](./select.md) whose trigger is a typeable
`<input>` rather than a `<button>` — the user can both pick from the list
*and* filter it by typing. Single or multi value, with optional free-text
entry (the value need not be in the list). The collapsed state shows the
input with the current text; activating it (focus / click / arrow / typing)
opens the same anchored listbox panel `KjSelect` already owns; choosing an
item writes the value to the form model and closes the panel; typing
narrows the visible options through a pluggable filter.

This is the canonical "type-to-find then pick" pattern. It deliberately
sits *next to* — not inside — `KjSelect`: PrimeNG conflates them through
`<p-select editable>`, and the brief plus
[`select.md`](./select.md#cross-library-summary) call out why we keep them
split (typed value lifecycle, `aria-autocomplete`, free-text semantics, and
async loading are all combobox-only concerns that would warp the Select
surface).

The directive family **does not duplicate Select**. The panel
(`KjSelectContent`), the option (`KjSelectOption`), the option indicator
(`KjSelectItemIndicator`), the group / label / separator triplet, and the
shared anchor primitive are all reused verbatim. The combobox-specific
work is concentrated in two new directives:

- **`[kjCombobox]`** — root state container (extends the Select root with
  filter state, query model, and the free-text contract).
- **`[kjComboboxInput]`** — the typeable trigger (`<input>` with
  `role="combobox"` + `aria-autocomplete="list"`), replacing
  `[kjSelectTrigger]`.

Plus a small constellation of slot directives for the panel's
filter-aware affordances (`[kjComboboxEmpty]`, `[kjComboboxLoading]`,
`[kjComboboxClear]`) and a multi-mode root (`[kjComboboxMulti]`) that
reuses the chip-bearing trigger pattern from
[`multi-select.md`](./multi-select.md).

## Source comparison

### PrimeNG — `<p-autoComplete>` ([primeng.org/autocomplete](https://primeng.org/autocomplete))

PrimeNG ships `<p-autoComplete>` as a single component covering single-pick,
multi-pick, force-from-list, free-text, async (`completeMethod` event-driven
load), grouped, virtualized, and "dropdown" (always-show-trigger-arrow) modes.
The relationship to `<p-select>` (formerly `<p-dropdown>`) is conceptually
"autocomplete is the editable variant" — they have non-overlapping Surface
inputs but logically share much. Notable surface (PrimeNG 18):

| Input                                | Notes                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| `suggestions`                        | `any[]` — driven by the consumer in response to `completeMethod`. PrimeNG does **not** filter for you; the consumer's handler decides. |
| `completeMethod`                     | Output event fired on each keystroke (debounced via `delay`, default `300ms`). Consumer fetches / filters and writes back to `suggestions`. |
| `delay`                              | Keystroke debounce ms.                                                                       |
| `minLength`                          | Minimum query length before `completeMethod` fires (default `1`).                            |
| `optionLabel` / `optionValue` / `optionGroupLabel` / `optionGroupChildren` / `optionDisabled` | Stringly-typed property paths (same complaint as `<p-select>`). |
| `field`                              | Display field for object items (alias of `optionLabel`).                                     |
| `multiple`                           | Flips the trigger to a chip-bearing wrapper, value type to `T[]`. Built-in chip rendering with remove-icon. |
| `forceSelection`                     | `true` → free-text disallowed: blur with non-matching value reverts to the previous valid value. |
| `dropdown` / `dropdownMode`          | Renders a trailing dropdown arrow that opens the panel without typing. `dropdownMode='blank'` opens with empty query, `'current'` opens with current query.                  |
| `unique`                             | Multi-mode: prevents duplicates.                                                              |
| `showEmptyMessage` / `emptyMessage` / `#empty` template | Empty-state slot.                                                          |
| `lazy` / `virtualScroll` / `virtualScrollItemSize` / `scrollHeight` | Virtualization.                                                |
| `appendTo`                           | Escape clipping containers.                                                                  |
| `loading` / `#loader` template       | Loading state in panel.                                                                       |
| `placeholder` / `disabled` / `readonly` / `tabindex` | Standard.                                                                  |
| `inputId` / `ariaLabel` / `ariaLabelledBy` | A11y.                                                                                  |
| `autoOptionFocus` / `selectOnFocus` / `autoHighlight` | Focus tuning.                                                                |
| `panelStyleClass`                    | CSS hook.                                                                                    |

Outputs: `completeMethod`, `onSelect`, `onUnselect` (multi), `onShow`,
`onHide`, `onFocus`, `onBlur`, `onClear`, `onLazyLoad`, `onKeyUp`,
`onDropdownClick`.

A11y: input has `role="combobox"`, `aria-autocomplete="list"`,
`aria-controls`, `aria-expanded`, `aria-activedescendant`. Panel is
`role="listbox"`. Items are `role="option"` with `aria-selected`.

Critique:

- **Consumer-owned filter is the right default for async** but the *wrong*
  default for the common synchronous case. 80% of combobox usages are a
  static array of countries / users / tags; PrimeNG forces every consumer
  to wire `completeMethod` even for those. We split the API: `kjOptions` (a
  signal-fed input) handles the synchronous case with built-in filtering;
  `kjShouldFilter={false}` + `(kjQueryChange)` handles async exactly like
  PrimeNG.
- **`forceSelection` as the only free-text gate is too coarse.** We separate
  *constrained* (the only valid values are the ones in the list) from
  *free-text* (any string is valid) into a single `kjAllowFreeText: input<boolean>(false)`
  with explicit semantics (see [Free text vs. constrained](#free-text-vs-constrained)).
- **`dropdown` mode bakes a layout decision (the trailing arrow button)
  into the directive.** We make the dropdown trigger a separate slot
  directive (`[kjComboboxDropdownTrigger]`) consumers compose when desired;
  default `[kjCombobox]` opens on focus / typing / ArrowDown only.
- **Single component covers too many modes.** We keep multi mode in a
  sibling root directive (`[kjComboboxMulti]`) for the same type-bifurcation
  reasons [`multi-select.md`](./multi-select.md#decision-needs-a-core-directive)
  rejects `[multiple]` on `KjSelect`.

### Angular Material — `<mat-autocomplete>` ([material.angular.dev/components/autocomplete](https://material.angular.dev/components/autocomplete))

Material's design is the **inversion** of PrimeNG's: the autocomplete is a
*panel* directive (`<mat-autocomplete>`) attached to a separate `<input matInput
[matAutocomplete]="auto">`. The input owns the value, the keyboard, and form
participation; the panel just renders options.

Surface:

| Class                                | Inputs / Methods                                                                                                       |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `<mat-autocomplete>` (`MatAutocomplete`) | `displayWith: (value: T) => string`, `autoActiveFirstOption`, `autoSelectActiveOption`, `requireSelection`, `panelWidth`, `disableRipple`, `class`, `hideSingleSelectionIndicator`, `ariaLabel`, `ariaLabelledBy`. |
| `[matAutocompleteTrigger]` (`MatAutocompleteTrigger`) | Attribute directive applied to a native `<input>` (or `<textarea>`). Inputs: `matAutocomplete`, `matAutocompletePosition`, `matAutocompleteConnectedTo`, `matAutocompleteDisabled`, `autocomplete` (native). Methods: `openPanel()`, `closePanel()`, `updatePosition()`. |
| `<mat-option>` / `<mat-optgroup>`    | The same option directives as `<mat-select>`. **This is the key reuse**: option / option-group / option-label is one set across Select and Autocomplete.                                                                          |

Outputs: `optionSelected`, `opened`, `closed`, `optionActivated`.

Behaviour worth lifting:

- **`displayWith`.** Object-valued options need a function to convert the
  selected object back into the displayed string in the input. PrimeNG's
  `optionLabel` string path solves the same problem less generally;
  Material's function is strictly more powerful (returning composed text).
  We mirror as `kjDisplayWith: input<(value: T) => string>`.
- **`requireSelection`.** When `true`, blur with a string that doesn't match
  any option clears the input (Material's stance: don't keep invalid text
  around). Maps to our `kjAllowFreeText=false` + a "revert on blur" rule —
  see [Free text vs. constrained](#free-text-vs-constrained).
- **`autoActiveFirstOption`.** When the panel opens, the first option is
  active so Enter immediately commits it. Default `false` in Material; we
  default `true` (matches user expectation for typeahead — pressing Enter
  after typing should commit the obvious match).
- **`autoSelectActiveOption`.** Goes a step further: arrow-key navigation
  *commits the active option to the form value* as you scroll, only
  reverting if the user closes via Escape. Niche; we ship as opt-in
  (`kjAutoSelectActive`).
- **Trigger directive on a native `<input>`.** This is where Material and
  kouji align: don't invent a custom-element trigger, decorate a native
  `<input>` with a directive that adds the combobox role and ARIA
  attributes. Our `[kjComboboxInput]` is the exact analogue.
- **Reuses `<mat-option>` from Select.** Confirmation that the per-option
  directive is identical — different host (panel vs. autocomplete panel),
  same option contract.
- **`displayWith` runs against the form value** (so the bound form value is
  always the option *object*, not its display string). The input element
  shows the result of `displayWith(value)`. Critical for object-valued
  comboboxes.

Critique:

- **No first-class multi mode.** Material directs consumers to a chip-grid
  + autocomplete recipe (manually wired with `<mat-chip-grid>`, the
  combobox example called "Chips Autocomplete" in the docs). Acceptable for
  a low-level CDK, undesirable for an AAA component library — we ship
  `[kjComboboxMulti]` as a first-class sibling, mirroring
  [`multi-select.md`](./multi-select.md)'s split.
- **No async pattern in the directive itself.** Material expects the
  consumer to filter (RxJS pipeline on the input's `valueChanges`) and pass
  filtered options to the panel. Same as PrimeNG, just expressed as RxJS
  instead of an event. We support both: built-in synchronous filter or
  consumer-driven via `(kjQueryChange)` + `kjShouldFilter={false}`.
- **`requireSelection` was added late** (Material 17, 2023). The lack
  before that produced years of "user typed garbage and we wrote it to the
  form" bugs. Treat the lesson seriously: free-text must be an *explicit*
  opt-in.

### shadcn/ui — `Combobox` ([ui.shadcn.com/docs/components/combobox](https://ui.shadcn.com/docs/components/combobox))

shadcn does not ship a dedicated Combobox primitive. The recipe is
**`Popover` + `Command` + `Button` trigger**:

```tsx
<Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger asChild>
    <Button variant="outline" role="combobox" aria-expanded={open}>
      {value ? frameworks.find(f => f.value === value)?.label : "Select framework..."}
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-[200px] p-0">
    <Command>
      <CommandInput placeholder="Search framework..." />
      <CommandList>
        <CommandEmpty>No framework found.</CommandEmpty>
        <CommandGroup>
          {frameworks.map(framework => (
            <CommandItem key={framework.value} value={framework.value}
              onSelect={current => { setValue(current === value ? "" : current); setOpen(false); }}>
              <Check className={cn("mr-2 h-4 w-4", value === framework.value ? "opacity-100" : "opacity-0")} />
              {framework.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

Surface worth lifting:

- **Composition with a typeahead listbox primitive** (`Command`, the cmdk
  library — the same primitive shadcn's Command Palette is built on, see
  [`actions/command-palette.md`](../actions/command-palette.md)). The
  combobox is "a popover-anchored Command with a button trigger and a
  selected-value contract." This validates our cross-cut question: yes,
  the listbox-with-typeahead-input mechanics deserve a shared primitive
  (see [Cross-cut with Command Palette](#cross-cut-with-command-palette)).
- **Filter input *inside* the panel** is a deliberate UX choice: the
  trigger looks like a Select (a button with the current value), and the
  search input only appears once the panel is open. PrimeNG and Material
  do the opposite — the trigger *is* the input. **We support both** as
  two distinct directive shapes: `[kjCombobox]` with `[kjComboboxInput]`
  on the trigger (PrimeNG / Material model) is the default; the
  shadcn-style "filter only inside panel" model is reachable by combining
  `[kjSelect]` (button trigger) with a `[kjComboboxInput]` rendered
  inside `[kjSelectContent]` (a panel-search recipe). See
  [Open questions](#open-questions--risks) #1.
- **`onSelect` returning the option's `value` string** — same pattern as
  cmdk, with the same critique we recorded for command palette: filter
  text and value identity should be separable. We use `kjValue` for
  identity and the option's `textContent` (plus `kjKeywords`) for filter
  matching, exactly as the command palette does.
- **`Check` indicator.** Identical pattern to `KjSelectItemIndicator` —
  reuse the same directive. Already specified in
  [`select.md`](./select.md#composition-model).

Critique:

- **Two-component recipe (Popover + Command) is a footgun** for AAA
  consumers: easy to forget `role="combobox"` on the trigger button, easy
  to wire `aria-expanded` to the wrong state, easy to lose
  `aria-activedescendant` between the input (inside the panel) and the
  list (also inside the panel). We collapse it to a single `[kjCombobox]`
  family that owns the wiring.
- **The button-trigger model loses the typed value as a form value.** In
  the recipe above, `value` is a string id; what the user *typed* into
  the search box is discarded after selection. That's fine for a "pick
  one of these" UX but excludes free-text combobox use cases. Our
  `[kjComboboxInput]`-as-trigger model preserves the typed string when
  `kjAllowFreeText=true`.
- **No multi-mode story.** Same gap as Material; community wraps the
  recipe with chips manually.

### Cross-library summary

|                                  | PrimeNG `<p-autoComplete>` | Material `<mat-autocomplete>` | shadcn (Popover+Command) | kouji direction                                                                  |
| -------------------------------- | -------------------------- | ----------------------------- | ------------------------ | -------------------------------------------------------------------------------- |
| Composition                      | single component           | input-directive + panel       | Popover + Command recipe | **compound** (`KjCombobox` + `KjComboboxInput` + reused `KjSelectContent` + `KjSelectOption`) |
| Trigger element                  | `<input>` (built-in)       | `<input matInput>`            | `<button>`               | **`<input [kjComboboxInput]>`** (default), `<button kjSelectTrigger>` (shadcn-style recipe) |
| Filter location                  | trigger input              | trigger input                 | inside panel             | **trigger input** (default), inside panel (recipe)                                |
| Built-in synchronous filter      | no — consumer-driven       | no — consumer-driven (RxJS)   | yes (cmdk substring)     | **yes** (substring + diacritic-strip default; pluggable)                          |
| Async / server filter            | yes (`completeMethod`)     | yes (consumer pipes)          | n/a                      | yes (`kjShouldFilter={false}` + `(kjQueryChange)`)                                |
| Free-text vs. constrained        | `forceSelection`           | `requireSelection`            | (button-trigger n/a)     | **`kjAllowFreeText` (default `false`)**                                           |
| Multi mode                       | `multiple`                 | manual chip-grid recipe       | manual chip recipe       | **`[kjComboboxMulti]` sibling root** (mirrors `KjMultiSelect` split)              |
| Display-from-object              | `optionLabel` string path  | `displayWith: fn`             | (button-trigger n/a)     | **`kjDisplayWith: fn`** (mirrors Material)                                        |
| Auto-active first option         | `autoHighlight`            | `autoActiveFirstOption`       | yes (cmdk default)       | **default `true`**                                                                |
| Auto-select active on arrow      | n/a                        | `autoSelectActiveOption`      | n/a                      | opt-in `kjAutoSelectActive` (default `false`)                                     |
| Min query length before open     | `minLength` (default `1`)  | n/a (always open on focus)    | n/a                      | `kjMinLength: input<number>(0)` (`0` matches Material; consumers raise as needed) |
| Loading state in panel           | `loading` + `#loader`      | n/a (consumer renders)        | n/a                      | **`[kjComboboxLoading]` slot + `kjLoading` input**                                |
| Empty state in panel             | `#empty` template          | manual                        | `<CommandEmpty>`         | **`[kjComboboxEmpty]` slot**                                                      |
| Clear button                     | n/a                        | n/a (manual)                  | n/a                      | **`[kjComboboxClear]` slot directive** (same shape as `[kjSelectClear]`)          |
| Dropdown arrow trigger           | `dropdown` flag            | n/a                           | (button trigger built-in) | **`[kjComboboxDropdownTrigger]` slot directive** (opt-in)                         |
| `aria-autocomplete`              | `'list'`                   | `'list'`                      | n/a                      | **`'list'`** (matches APG); `'both'` reserved for inline-completion variant       |
| Anchored positioning             | CDK overlay                | CDK overlay                   | Floating UI              | shared `KjAnchor` primitive (same as Select)                                      |
| Virtualization                   | yes                        | virtualized via CDK           | manual                   | deferred to v1.1 (same stance as Select)                                          |

## Decision — needs a core directive?

**Yes — one new compound rooted at `[kjCombobox]` plus a sibling
`[kjComboboxMulti]` for multi-mode.** The compound deliberately reuses the
existing Select panel / option / group / label / separator / indicator
directives. The combobox-specific surface is small: a new root that adds
filter state and free-text contract on top of the Select root, a typeable
input directive that replaces the button trigger, and a handful of slot
directives for the panel's filter affordances.

### 1. Compound shape (mostly reuse, four new directives)

| Directive                                         | Status                                | Role                                                                                                                                                                |
| ------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[kjCombobox]` (root, value-bearing, single mode) | **new**                               | Owns `value`, `open`, `query`, `filter` function, `allowFreeText`, the registered options list. Provides `KJ_SELECT` + `KJ_COMBOBOX` (the latter narrows the former with combobox-only context). |
| `[kjComboboxMulti]` (root, value-bearing, multi mode) | **new**                           | Same shape as `[kjCombobox]`, but value is `readonly T[]` and selection toggles instead of replaces. Provides the same context tokens with `multiple()` set `true`. Mirrors the [`multi-select.md`](./multi-select.md) split. |
| `[kjComboboxInput]`                               | **new**                               | Attribute directive on a native `<input>`. `role="combobox"`, `aria-autocomplete="list"`, `aria-controls` → panel, `aria-expanded`, `aria-activedescendant`. Owns the keyboard contract (ArrowDown / ArrowUp / Home / End / Enter / Escape / Tab / typing) and the query model wiring. |
| `[kjComboboxDropdownTrigger]`                     | **new** (slot, opt-in)                | A `<button>` rendered alongside the input that opens the panel without typing — the PrimeNG `dropdown=true` affordance. Attribute directive; consumer renders the chevron icon themselves. Pure presentational + open / close on click. |
| `[kjComboboxClear]`                               | **new** (slot, opt-in)                | A `<button>` that clears the value and the query. Same shape as `[kjSelectClear]` (also new in [`select.md`](./select.md)). |
| `[kjComboboxEmpty]`                               | **new** (slot inside panel)           | Rendered when the filtered option count is zero. Same shape as `[kjCommandEmpty]` (see [`actions/command-palette.md`](../actions/command-palette.md)). |
| `[kjComboboxLoading]`                             | **new** (slot inside panel)           | Rendered when `kjLoading` is `true` on the root. Same shape as `[kjCommandLoading]`. |
| `[kjSelectContent]`                               | **reused verbatim** from `KjSelect`   | The listbox panel. `role="listbox"`, anchored positioning, `aria-activedescendant`. **Combobox does not need its own panel directive** — Select's already does the work. |
| `[kjSelectOption]`                                | **reused verbatim**                   | The option. `role="option"`. The same `kjValue`, `kjDisabled`, `kjSearchLabel`, `kjVariant`, `kjSize` contract. |
| `[kjSelectItemIndicator]`                         | **reused verbatim**                   | The selected-state checkmark slot inside an option. |
| `[kjSelectGroup]` / `[kjSelectLabel]` / `[kjSelectSeparator]` | **reused verbatim**          | Grouped options + headings + dividers. |

The Select directives reused above are **the directives specified in
[`select.md`](./select.md)**, not the current shipped shape — combobox
blocks on the Select refactor (see [Open questions](#open-questions--risks)
#2).

### 2. Why a new root rather than `[kjSelect]` + `kjFilter`

The brief frames combobox as "a Select where the trigger is typeable", and
the compound shape reflects that — but the *root directive* must be its
own thing. Three reasons:

1. **Query is a model, not derived state.** `[kjCombobox]` owns
   `kjQuery: model<string>('')` as an exposed two-way bindable so
   consumers can drive the query externally (a "Recent searches" link
   that pre-fills the box, a deep-linked URL parameter). `[kjSelect]` has
   no analogue and we don't want to invent one for the read-only case.
2. **`allowFreeText` changes the value contract.** When `true`, the form
   value can be a typed string that does not correspond to any registered
   option. `[kjSelect].kjValue` is constrained to the union of option
   values (or `null`); a `kjAllowFreeText` flag would force the type to
   widen to `T | string | null`. Same type-bifurcation argument
   [`multi-select.md`](./multi-select.md#option-a--just-add-kjmultiple-to-kjselect) used.
3. **Form integration semantics differ.** `[kjSelect]` writes the form
   value on Enter / click commit; `[kjCombobox]` writes on commit *or*
   on every keystroke when `kjAllowFreeText` is `true` (so typing into
   the input dirties the form, matching how `<input>` already works).
   Mixing both lifecycles inside one root produces conditional CVA logic
   that's much clearer in two roots.

### 3. Why `[kjComboboxInput]` is its own directive instead of composing `[kjInput]` + `[kjSelectTrigger]`

Two host-binding sets collide:

- `[kjInput]` (see [`input.md`](./input.md)) sets
  `role="textbox"` (implicitly via the `<input>` element's default — it
  doesn't override).
- `[kjSelectTrigger]` sets `role="combobox"` and
  `aria-haspopup="listbox"`.

A combobox **input** has `role="combobox"` (overriding the implicit
textbox) plus `aria-autocomplete="list"` (which `[kjSelectTrigger]`
doesn't set because the button-trigger is non-typeable). Setting all
three host bindings via two stacked directives produces ARIA conflicts
that depend on directive order.

Moreover, the keyboard contract differs:

- `[kjSelectTrigger]` consumes printable characters as type-ahead-while-closed
  (advances the value without opening). Combobox **never does that** —
  printable chars always update `kjQuery` and open the panel.
- `[kjSelectTrigger]` consumes Space as "open / commit". Combobox
  treats Space as a regular text-entry character (the user can type
  spaces in the query). Enter is the only commit key.
- `[kjSelectTrigger]` consumes Tab to commit-and-close. Combobox lets
  Tab pass through naturally (the input is already a real focusable
  control) — the panel just closes; no value commit unless
  `kjAutoSelectActive` is on.

`[kjComboboxInput]` is therefore a **distinct attribute directive**, not
a `[kjSelectTrigger]` on an input. It composes `KjInput` (for the
variant / size / focus-ring / disabled / form-control plumbing) plus
its own keyboard handler and ARIA host bindings.

### 4. `aria-activedescendant` on the input, not the panel

Select's panel keeps DOM focus while open and reflects
`aria-activedescendant` on the panel itself
(see [`select.md`](./select.md#4-why-aria-activedescendant-rather-than-roving-tabindex-on-the-panel)).
Combobox is the opposite: the **input keeps DOM focus** the entire
session — that's the load-bearing UX of a typeable trigger. So
`aria-activedescendant` reflects on the *input*, not on the panel.

The panel (`[kjSelectContent]`) becomes a passive listbox: it owns
positioning + the option list + the click-to-select behaviour, but does
not receive focus, does not own a keyboard handler beyond click-outside
detection. `[kjComboboxInput]` owns the entire keyboard contract.

This is identical to the Command Palette's input-driven model
(see [`actions/command-palette.md`](../actions/command-palette.md#why-a-fresh-kjcommanditem-family-instead-of-reusing-kjmenuitem)),
which is the same WAI-ARIA APG pattern (combobox-with-listbox).

To make the same `[kjSelectContent]` directive work in both modes, the
panel reads its keyboard-handler enable flag from `KJ_SELECT.focusModel`
— `'panel'` (Select) means the panel installs its own keydown listener;
`'external'` (Combobox) means it skips that work. Default `'panel'`.

### 5. Reuse vs. extract a shared listbox-navigation primitive

The brief asks: should Combobox and Command Palette share a
`KjListboxNav` primitive? **Yes — extract one**, but the scope is
deliberately narrow.

[`multi-select.md`](./multi-select.md#option-c--separate-family--shared-selection-primitive-chosen)
already proposes lifting the panel keyboard logic into
`KjListboxNavigation`. [`actions/command-palette.md`](../actions/command-palette.md)
implements its own equivalent inside `[kjCommandList]`. Combobox would
need a third copy. Three is the threshold; we extract:

```ts
// packages/core/src/primitives/listbox/listbox-navigation.ts
export interface KjListboxNavigationConfig {
  readonly options: Signal<readonly KjListboxNavOption[]>;
  readonly activeId: WritableSignal<string | null>;
  readonly loop: Signal<boolean>;
  readonly pageSize: Signal<number>;
  readonly orientation: Signal<'vertical' | 'horizontal'>;
}

export interface KjListboxNavOption {
  readonly id: string;
  readonly disabled: Signal<boolean>;
  readonly element: HTMLElement;
  readonly searchLabel: Signal<string>;
}

/**
 * Keyboard helper for ARIA listbox navigation. Computes the next active
 * option for ArrowUp/Down/Home/End/PageUp/Down and a printable-char
 * type-ahead buffer. Pure (no DOM mutation, no Angular DI) — callers
 * write the resulting active id back into their context signal.
 */
export class KjListboxNavigation {
  constructor(private readonly cfg: KjListboxNavigationConfig) {}

  next(): string | null;
  prev(): string | null;
  first(): string | null;
  last(): string | null;
  pageDown(): string | null;
  pageUp(): string | null;
  typeahead(char: string): string | null;
  scrollIntoView(id: string): void;
}
```

Consumers ([`KjSelectContent`](./select.md), `[kjCommandList]`,
`[kjComboboxInput]`) instantiate one and route their keydown handlers
through it. The primitive owns the algorithm (next-non-disabled-option,
wrap-around, page math, type-ahead buffer with `200ms` idle clear); each
consumer owns its own keydown registration and decides which keys to
forward (Enter / Space / Escape / Tab handling stays in the consumer
because it diverges across components).

This unblocks all three directives without forcing them to share more
than they should. It's a v1 deliverable, not a v1.1 nice-to-have —
combobox blocks on it.

### 6. Single root ownership of the value contract

Same stance as Select: `[kjCombobox]` is the value-bearing root.

- Composes `KjFormControl` via `hostDirectives`.
- Registers with `KJ_FIELD` as a composite control. The labelled element
  from the field's perspective is the **input** (`[kjComboboxInput]`),
  which is a real form control, so `KjField` uses `<label for=>` (not
  `aria-labelledby` like Select does for its button trigger).
- The input reflects `aria-disabled` from the form-control's disabled
  signal but does not implement CVA itself.
- `aria-required` / `aria-invalid` / `aria-describedby` flow from the
  field onto the input via `KjAriaDescribedBy`.

This is one of the architectural advantages over Select: `<label for=>`
just works because the trigger is a native `<input>`. No
`<button>`-as-form-control hack needed (see
[`select.md`](./select.md#open-questions--risks) #6).

## Base features

- **Variants.** `KjVariant` host directive on `[kjComboboxInput]`
  (default / filled / ghost / destructive) — same set as `[kjInput]`.
  Panel inherits no variant; `kjPanelClass` for theme styling.
- **Sizes.** `KjSize` on `[kjComboboxInput]` and on each
  `[kjSelectOption]`. Option size defaults to the input's size via
  `KJ_SELECT.size` (already specified in
  [`select.md`](./select.md#base-features)).
- **States.** `kjDisabled` on root → flows to input and disables open;
  `kjReadonly` (proposed) renders the input non-editable but value
  visible (matches Select's read-only semantics);
  `kjInvalid` → `aria-invalid` on the input (touched-gated);
  `kjLoading` → `aria-busy="true"` on the input + renders
  `[kjComboboxLoading]` in the panel.
- **Anchored positioning.** Reused from Select — same `kjSide`,
  `kjAlign`, `kjOffset`, `kjAvoidCollisions`, `kjMatchTriggerWidth`
  inputs on the root, all proxied to `[kjSelectContent]` via
  `KJ_SELECT`. Default `kjMatchTriggerWidth=true` (panel `min-width` =
  input width) — matches Material and PrimeNG.
- **Open / close behaviour.**
  - **Open:** focus the input (when `kjOpenOnFocus=true`, default
    `false` — Material's behaviour; PrimeNG opens only on typing or
    explicit dropdown click); typing any printable character; ArrowDown
    / ArrowUp / Alt+ArrowDown when input has focus; click on
    `[kjComboboxDropdownTrigger]`. **Does not open on click of the
    input itself** unless `kjOpenOnClick=true` — clicking inside an
    input typically positions the caret and shouldn't pop a panel.
  - **Close:** Escape (focus stays on input, query optionally cleared
    via `kjEscapeBehaviour='clear' | 'close'`, default `'close'` first
    then `'clear'` on a second Escape per APG); Tab (closes; focus
    moves naturally; commit-on-Tab is opt-in via `kjAutoSelectActive`);
    selecting an option (closes + commits); click outside (closes, no
    focus change); blur of the input (closes; on blur with non-matching
    text and `kjAllowFreeText=false`, revert to last valid value — see
    [Free text vs. constrained](#free-text-vs-constrained)).
- **Filter modes (built-in).** Pluggable filter function. Three
  first-party implementations shipped:
  - `kjStartsWithFilter` — case- and diacritic-insensitive prefix match.
  - `kjContainsFilter` — case- and diacritic-insensitive substring match
    (default).
  - `kjFuzzyFilter` — re-exported from `@kouji-ui/core`; same
    implementation as `kjFuzzyFilter` shipped for the command palette
    (see [`actions/command-palette.md`](../actions/command-palette.md#built-in-fuzzy-filter--kjfuzzyfilter-opt-in)).
  Default `kjFilter: kjContainsFilter`. See
  [Filter modes](#filter-modes).
- **Async data.** When `kjShouldFilter={false}`, the directive disables
  internal filtering and emits `(kjQueryChange)` with the current query
  on every keystroke (debounced via `kjQueryDebounce: input<number>(0)`,
  default `0` for synchronous use; consumers raise to `200`-`300ms` for
  server fetches). `kjLoading=true` while the consumer fetches; consumer
  writes back to a signal that drives the projected option list. See
  [Async data](#async-data).
- **Free text vs. constrained.** `kjAllowFreeText: input<boolean>(false)`.
  Default `false`: the form value is always the value of the selected
  option (or `null`). When `true`, the form value can be the typed
  string itself when no option matches at commit. See
  [Free text vs. constrained](#free-text-vs-constrained).
- **`displayWith`.** `kjDisplayWith: input<(value: T) => string>((v) =>
  String(v ?? ''))`. Converts the form value back into the input's
  displayed text. Critical for object-valued options (the value is
  `{ id, name }`; the input shows `name`). Mirrors Material.
- **Commit on Enter.** Default behaviour: Enter on an active option
  commits it (writes value, closes panel). Enter when no option is
  active — when `kjAllowFreeText=true`, commits the typed string as the
  value; when `false`, no-op (panel stays open). Both behaviours emit a
  `(kjCommit)` output for consumers that want to know.
- **Auto-active first option.** `kjAutoActivateFirst:
  input<boolean>(true)`. Mirrors cmdk; matches user expectation that
  Enter after typing commits the obvious match. Set `false` if your UX
  prefers explicit ArrowDown before commit.
- **Auto-select active.** `kjAutoSelectActive: input<boolean>(false)`.
  When `true`, ArrowDown / ArrowUp commits the active option to the form
  value as the user navigates (Material's `autoSelectActiveOption`).
  Niche; default off.
- **Min length.** `kjMinLength: input<number>(0)`. Panel does not open
  until the query has at least this many characters. `0` = always open
  (Material default); `1`-`3` typical for async / large lists.
- **Clearable.** `kjClearable: input<boolean>(false)`. Wrapper renders
  a `[kjComboboxClear]` button in the input's trailing slot; clearing
  resets `kjValue` to `null` and `kjQuery` to `''`.
- **Placeholder.** `kjPlaceholder: input<string>('')` — proxied to the
  input's native `placeholder`.
- **Empty state.** `[kjComboboxEmpty]` slot directive; rendered when the
  filtered option count is zero **after** the first keystroke (don't
  flash empty before the user has typed anything when `kjMinLength=0`).
- **Loading state.** `[kjComboboxLoading]` slot directive; rendered when
  `kjLoading=true`. Themes typically render a spinner; the directive
  contributes only `aria-busy` and visibility.
- **RTL.** Reflect `dir` from the host's resolved `Directionality`.
  Same handling as Select.

## Filter modes

Combobox shipping three first-party filter functions (and the
`KjComboboxFilter` type for custom implementations) is the right scope
for v1: substring covers ~80% of cases, startsWith is the historical
"autocomplete" idiom, fuzzy serves power users.

### Pipeline

```text
input keystroke → KjInput's CVA fires → kjQuery model updates
              → if kjShouldFilter:
                    kjCombobox re-derives `filteredOptions` via kjFilter()
                    → each option flips data-state="visible|hidden"
                    → KjLiveRegion announces "{N} results" (debounced 500ms)
                    → if active option is now hidden, jump to first visible
              → else (consumer-driven):
                    (kjQueryChange) emits → consumer fetches → writes options signal
                    → kjLoading toggles
```

All steps run inside Angular's signal graph (computed signals + an
`effect` for the live-region announce + an `effect` for active-option
recovery). Same pattern as the command palette's filter pipeline —
deliberately so, since they're the same UX primitive viewed from
different angles.

### `KjComboboxFilter` shape

```ts
export type KjComboboxFilter = (
  query: string,
  haystacks: readonly string[],
) => number; // 0 = hidden, > 0 = visible (higher = more relevant)
```

Identical to `KjCommandFilter` (see
[`actions/command-palette.md`](../actions/command-palette.md#default-filter--substring-case--and-diacritic-insensitive)).
**Same type, alias re-exported** so consumers writing a custom filter
can use it interchangeably between Combobox and Command Palette.

`haystacks` for a given option is `[searchLabel(), ...kjKeywords()]`,
flattened. `kjKeywords` is a new optional input on `[kjSelectOption]`
mirroring its presence on `[kjCommandItem]` — small extension to the
Select option contract that costs nothing for read-only Select consumers.

### Built-in implementations

```ts
/** Case- and diacritic-insensitive prefix match. Returns 1 / 0. */
export const kjStartsWithFilter: KjComboboxFilter = (q, h) => {
  if (!q) return 1;
  const needle = stripDiacritics(q.toLowerCase());
  return h.some(s => stripDiacritics(s.toLowerCase()).startsWith(needle)) ? 1 : 0;
};

/** Case- and diacritic-insensitive substring match. Default. */
export const kjContainsFilter: KjComboboxFilter = (q, h) => {
  if (!q) return 1;
  const needle = stripDiacritics(q.toLowerCase());
  return h.some(s => stripDiacritics(s.toLowerCase()).includes(needle)) ? 1 : 0;
};

/** fzy-derived fuzzy match. Re-exported from the same module the
 *  command palette uses. */
export { kjFuzzyFilter } from '@kouji-ui/core/listbox/fuzzy';
```

`stripDiacritics` is a 6-line helper (same one shipped for the command
palette) — `s.normalize('NFD').replace(/\p{Diacritic}/gu, '')`.

### Sort

Default: declared order (consumer wins). Optional `kjSortByScore: input<boolean>(false)`:
when `true`, the panel reorders visible options by descending score
(highest match relevance first). Implemented via flexbox `order` (same
trick as command palette and cmdk) so DOM order stays stable —
preserving focus, animation, and avoiding `aria-activedescendant`
churn on every keystroke.

## Async data

Two paths, mirroring the Select / Combobox split between simple and
power-user cases.

### Synchronous (default)

Static `[kjSelectOption]`s in the template; `kjFilter` runs on each
keystroke against their text content. Zero consumer code beyond the
`kjValue` two-way binding.

### Asynchronous (consumer-driven)

```html
<div [kjCombobox]
     [(kjValue)]="selectedUser"
     [(kjQuery)]="query"
     [kjShouldFilter]="false"
     [kjLoading]="loading()"
     (kjQueryChange)="onQueryChange($event)"
     [kjDisplayWith]="displayUser">
  <input kjComboboxInput placeholder="Search users…" />

  <div kjSelectContent>
    @if (loading()) {
      <span kjComboboxLoading>Searching…</span>
    } @else if (results().length === 0 && query()) {
      <span kjComboboxEmpty>No users found.</span>
    } @else {
      @for (user of results(); track user.id) {
        <button kjSelectOption [kjValue]="user">
          {{ user.name }}
          <kj-icon kjSelectItemIndicator name="check" />
        </button>
      }
    }
  </div>
</div>
```

```ts
results = signal<User[]>([]);
loading = signal(false);
query = signal('');
selectedUser = model<User | null>(null);

private readonly q$ = toObservable(this.query);

constructor(private readonly api: UserApi) {
  this.q$.pipe(
    debounceTime(250),
    distinctUntilChanged(),
    switchMap(q => {
      if (!q) { this.results.set([]); return EMPTY; }
      this.loading.set(true);
      return this.api.searchUsers(q).pipe(finalize(() => this.loading.set(false)));
    }),
    takeUntilDestroyed(),
  ).subscribe(users => this.results.set(users));
}

displayUser = (u: User | null) => u?.name ?? '';
onQueryChange(_q: string) { /* signal-driven; no-op */ }
```

The directive's responsibility ends at `(kjQueryChange)` and the loading
indicator. The consumer owns the data pipeline — same shape Material
expects, but inside Angular's signal-friendly idioms instead of pure
RxJS-on-the-template.

### Loading state semantics

When `kjLoading=true`:

- `[kjComboboxInput]` reflects `aria-busy="true"`.
- `[kjComboboxLoading]` is rendered (themes typically place it where
  `[kjComboboxEmpty]` would otherwise sit).
- The option list is **still rendered** (loading is additive, not
  replacing) — consumers who want to hide stale results during the
  fetch reset `results.set([])` themselves.
- `KjLiveRegion` does **not** announce result count while loading
  (avoids "0 results" flicker between fetches); announces once when
  loading settles.

## Free text vs. constrained

The single most under-specified surface in PrimeNG and Material. We make
it explicit via one input plus three ergonomic rules:

### `kjAllowFreeText: input<boolean>(false)`

| Mode | `kjAllowFreeText` | Form value type            | Commit-on-Enter (no active option) | Blur with non-matching text                  |
| ---- | ----------------- | -------------------------- | ---------------------------------- | -------------------------------------------- |
| Constrained (default) | `false`  | `T \| null`                 | no-op                              | revert input text to last valid value's `displayWith` |
| Free-text             | `true`   | `T \| string \| null`       | commits typed string as value      | keep typed text; commit value as that string  |

### Rules

1. **The form value type widens with the flag.** When
   `kjAllowFreeText=true`, the bound model's accepted type is
   `T | string | null` — TypeScript users have to model this. The
   wrapper component documents the union explicitly. (Compare with
   PrimeNG / Material, which silently accept any string into the form
   value when `forceSelection` / `requireSelection` is off, with no
   type signal.)
2. **Revert is loud.** Constrained-mode revert-on-blur emits
   `(kjReverted)` so consumers can show a toast or shake the input.
   Don't silently throw away user input.
3. **Commit-on-Enter is symmetric.** In constrained mode, Enter without
   an active option is a no-op (panel stays open, input keeps text);
   pressing Enter again with an active option commits as usual. In
   free-text mode, Enter commits the typed string immediately if no
   option is active — matching plain `<input>`'s submit semantics.

### `kjAllowFreeText=true` interaction with `kjMultiple`

In `[kjComboboxMulti]`, free-text adds a typed string as a new chip on
Enter / comma / blur — the canonical "tags input" UX. Each chip is then
either a registered option's value or a free-text string; consumers
type-narrow via `typeof chip === 'string'` (or whatever discriminator
their `T` carries). This is **the** tags-input pattern — kouji ships
tags through this combobox path rather than as a separate component.

## Multi mode

`[kjComboboxMulti]` is the multi-value sibling root, mirroring the
[`multi-select.md`](./multi-select.md#decision-needs-a-core-directive)
split. It reuses everything `[kjCombobox]` does except:

- **Value type** is `readonly T[]` (or `readonly (T | string)[]` when
  `kjAllowFreeText=true`).
- **Selection toggles** instead of replaces (uses the shared
  `KjSelectionModel` from [`multi-select.md`](./multi-select.md#option-c--separate-family--shared-selection-primitive-chosen)
  in multi mode).
- **`kjCloseOnSelect` defaults `false`** — keep the panel open between
  picks so the user can rapidly add several. Esc / blur / outside-click
  closes.
- **Trigger renders chips inside the input area.** The chip area sits
  before the typed text; the typed text is the "tail" the user is
  currently entering. Backspace at position 0 removes the last chip
  (matching every chip-input on the web). Chips compose
  [`KjChip` / `KjChipRemove`](../data-display/chip.md) — same primitives
  Multi Select uses (forward reference; chip analysis not yet written).
- **Filter excludes already-selected options** by default
  (`kjMultiHideSelected: input<boolean>(true)`). PrimeNG's `unique`
  flag rolled into the filter contract.

The directive `selector` is `[kjComboboxMulti]` rather than
`[kjCombobox][kjMultiple]` to surface the type bifurcation in the
template, and to match Multi Select's separate-root precedent.

## Accessibility (WCAG 2.1 AAA)

Source: [WAI-ARIA APG Combobox Pattern (with-listbox)](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
plus [APG Listbox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/).

### Roles + ARIA wiring

| Element                       | Role             | Attributes                                                                                                                                                                                         |
| ----------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[kjCombobox]` (root)         | none             | none — state container.                                                                                                                                                                            |
| `[kjComboboxInput]`           | `combobox`       | `aria-autocomplete="list"`, `aria-controls="<panel id>"`, `aria-expanded` (mirrors `open()`), `aria-activedescendant="<active option id>"` (only when panel open), `aria-required` (from validators), `aria-invalid` (touched-gated), `aria-disabled` (from form-control), `aria-busy="true"` (when `kjLoading`), `aria-haspopup="listbox"`. Host element must be `<input type="text">` (or `type="search"`). The directive does not enforce. |
| `[kjComboboxDropdownTrigger]` | `button`         | `aria-label="<consumer-supplied; default 'Show options'>"`, `aria-controls="<panel id>"`, `aria-expanded` (mirrors). `tabindex="-1"` — not in tab order; the input is. |
| `[kjComboboxClear]`           | `button`         | `aria-label="<consumer-supplied; default 'Clear'>"`, `tabindex="-1"`. |
| `[kjSelectContent]`           | `listbox`        | Same as Select. `aria-labelledby="<input id>"` (auto-resolved), `aria-multiselectable="false"` (or `"true"` for `[kjComboboxMulti]`). |
| `[kjSelectOption]`            | `option`         | Same as Select. `data-active` derived from `KJ_SELECT.activeId` matching this option's id. |
| `[kjComboboxEmpty]`           | `status`         | `aria-live="polite"`, `aria-atomic="true"`. Themes render the projected text. |
| `[kjComboboxLoading]`         | `status`         | `aria-live="polite"`, `aria-atomic="true"`. |

Note `aria-haspopup="listbox"` on the input: APG specifies it only as
recommended (the combobox role implies a popup); we set it for parity
with Select's trigger and for older AT that don't infer it. Same for
`aria-controls` — APG marks it required only when the popup is in a
sibling element relative to the combobox, which is our case (the panel
is teleported via the anchor primitive).

### Keyboard contract

Source: APG Combobox-with-Listbox (focus stays on input).

| Key                                | When focus is on…       | Behaviour                                                                                                                                  |
| ---------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Printable char                     | Input                   | Insert into input value; update `kjQuery`; open panel if not yet open and `query.length >= kjMinLength`.                                    |
| `Backspace` / `Delete`             | Input                   | Standard text edit. If `kjMultiple` and caret at position 0: remove last chip.                                                              |
| `ArrowDown`                        | Input (closed)          | Open panel; activate first option (or selected option, if any).                                                                             |
| `ArrowUp`                          | Input (closed)          | Open panel; activate last option (or selected option, if any).                                                                              |
| `Alt+ArrowDown`                    | Input                   | Open panel without changing active option.                                                                                                  |
| `Alt+ArrowUp`                      | Input (open)            | Close panel without committing.                                                                                                             |
| `ArrowDown` / `ArrowUp`            | Input (open)            | Move active option to next / previous focusable option. Wraps if `kjLoop` (default `false`); skips disabled, separators, labels.            |
| `Home` / `End`                     | Input (open)            | Caret to start / end of input text — **standard text-edit behaviour, not listbox first/last**. APG note. To jump in the listbox, use `PageUp` / `PageDown`. |
| `PageUp` / `PageDown`              | Input (open)            | Jump 10 options up / down (configurable via `kjPageSize: input<number>(10)`).                                                              |
| `Enter`                            | Input (open, active option) | Commit the active option, close, focus stays on input.                                                                                  |
| `Enter`                            | Input (open, no active option) | Free-text mode: commit typed string as value. Constrained mode: no-op.                                                              |
| `Enter`                            | Input (closed)          | Submit the parent form (native `<input>` behaviour passes through).                                                                          |
| `Tab` / `Shift+Tab`                | Input (open)            | Close (no commit unless `kjAutoSelectActive=true`); allow Tab to continue natural focus flow. Matches Material.                              |
| `Escape`                           | Input (open)            | Close (no commit). Focus stays on input.                                                                                                    |
| `Escape`                           | Input (closed)          | Clear query + value (per APG when `kjEscapeClearsValue=true`, default `false`); otherwise no-op.                                            |

The `aria-activedescendant` invariant: `[kjComboboxInput]` keeps DOM
focus the entire session. Options are `tabindex="-1"` always. The panel
(`[kjSelectContent]`) is `tabindex="-1"` and never receives focus —
which is why `KJ_SELECT.focusModel === 'external'` for combobox usage
(see Decision §4).

### Focus management

- **Opening**: focus stays on input. The panel becomes visible and
  paints, `aria-expanded` flips to `true`, `aria-activedescendant`
  starts pointing at the auto-active first option (or selected option
  if any).
- **Closing via Enter / commit**: focus stays on input. Input text
  updates to `kjDisplayWith(newValue)`. Caret moves to end of text.
- **Closing via Escape / outside-click / Tab**: focus stays on input
  (Tab additionally moves focus naturally to the next tabbable
  element).
- **Closing via blur of input**: panel closes; constrained-mode revert
  fires if applicable.
- **No focus trap.** Combobox is non-modal. (Modal mode is for command
  palette, not combobox.)

### Touch target ≥ 44×44 (WCAG 2.5.5)

- **Input:** `KjSize.md` preset on `[kjComboboxInput]` must produce
  ≥ 44px height. Same constraint as `[kjInput]`.
- **Each option:** identical to Select.
- **Dropdown trigger / clear button:** ≥ 44×44 in `md`. Themes render
  these visually smaller (icon-button style) but the *touch target*
  (hit area) must satisfy 44 — usually via padding outside the visible
  glyph.

### Color / contrast

- Input text vs. background ≥ 7:1 (AAA).
- Placeholder text ≥ 4.5:1 (AA — placeholder is not informative-content
  so AAA's stricter ratio is impractical, matches `KjInput`).
- Active-descendant focus ring on the active option ≥ 3:1.
- Selected-state checkmark ≥ 3:1 against the option background.
- "No results" / loading status text ≥ 7:1.

### Live region announcements

- **Result count** (synchronous filter mode): `KjLiveRegion` (polite)
  announces `"{N} result(s)"` after the query settles (debounced
  `500ms`). Suppressed during `kjLoading=true` and reset between
  open/close cycles.
- **No results**: announced via the `[kjComboboxEmpty]`'s `role="status"`
  + `aria-live="polite"` host, no separate `KjLiveRegion` push (the
  visible empty-state element double-duties as the live region).
- **Loading**: `aria-busy="true"` on the input is the primary signal;
  `[kjComboboxLoading]`'s `aria-live="polite"` announces "Loading"
  text once.

### Reduced motion

Wrapper concern. Same as Select.

### `aria-required`, `aria-invalid`, `aria-describedby`

Same flow as Select. Because the trigger is a real `<input>`, the
`KjField` integration is simpler:

- `<label kjFieldLabel for="<input id>">` works directly (no
  `aria-labelledby` workaround).
- `aria-describedby` chain attaches to the input via `KjAriaDescribedBy`.
- `aria-invalid` and `aria-required` reflect on the input (where AT
  expect them on a text-entry combobox).

## Composition model

```text
combobox/
  combobox.ts                    ← KjCombobox (root, single value) — new
  combobox-multi.ts              ← KjComboboxMulti (root, multi value) — new
  combobox-input.ts              ← KjComboboxInput (typeable trigger) — new
  combobox-dropdown-trigger.ts   ← KjComboboxDropdownTrigger (slot button) — new
  combobox-clear.ts              ← KjComboboxClear (slot button) — new
  combobox-empty.ts              ← KjComboboxEmpty (slot inside panel) — new
  combobox-loading.ts            ← KjComboboxLoading (slot inside panel) — new
  combobox.context.ts            ← KJ_COMBOBOX context (narrows KJ_SELECT)
  filters.ts                     ← kjStartsWithFilter, kjContainsFilter (re-exports kjFuzzyFilter)
  combobox.example.ts
  combobox.async.example.ts
  combobox.free-text.example.ts
  combobox.multi.example.ts
  combobox.field.example.ts
  combobox.reactive.example.ts
  combobox.compare-with.example.ts
  combobox.fuzzy.example.ts
  combobox.dropdown-trigger.example.ts
  combobox.spec.ts
  index.ts
```

Plus the new shared listbox-navigation primitive:

```text
primitives/listbox/
  listbox-navigation.ts          ← KjListboxNavigation (shared with Select, Multi Select, Command Palette)
  fuzzy.ts                       ← kjFuzzyFilter implementation
  diacritics.ts                  ← stripDiacritics helper
  index.ts
```

### Shared state — `KjComboboxContext`

Narrows `KjSelectContext` (see [`select.md`](./select.md#shared-state--kjselectcontext)):

```ts
export interface KjComboboxContext<T = unknown> extends KjSelectContext<T> {
  /** Current query text (drives filtering). Two-way bindable on the root. */
  readonly query: Signal<string>;
  /** Whether internal filtering is enabled (false = consumer-driven). */
  readonly shouldFilter: Signal<boolean>;
  /** Loading flag for async data fetch. */
  readonly loading: Signal<boolean>;
  /** Whether free-text values are accepted on commit. */
  readonly allowFreeText: Signal<boolean>;
  /** displayWith function — value → input text. */
  readonly displayWith: Signal<(value: T) => string>;
  /** The pluggable filter function. */
  readonly filter: Signal<KjComboboxFilter>;
  /** Currently visible (filter-passing) options, in declared order. */
  readonly filteredOptions: Signal<readonly KjSelectOption<T>[]>;

  /** Programmatic query setter (used by the input directive on every keystroke). */
  setQuery(q: string): void;
  /** Commit the typed string as the value (free-text mode). */
  commitFreeText(): void;
  /** Revert input text to the last valid value's `displayWith` (constrained mode). */
  revert(): void;
}

export const KJ_COMBOBOX = new InjectionToken<KjComboboxContext>('KjCombobox');
```

`[kjCombobox]` provides **both** `KJ_COMBOBOX` and `KJ_SELECT` (the
narrower interface plus the wider one) so that the reused
`[kjSelectContent]` / `[kjSelectOption]` directives — which inject
`KJ_SELECT` — Just Work without modification. The `KJ_COMBOBOX` token
is what `[kjComboboxInput]` and the slot directives inject.

`KJ_SELECT.focusModel` (a new field added in this analysis — see
[Open questions](#open-questions--risks) #2) is set to `'external'` by
combobox. `[kjSelectContent]` reads it and skips its own keyboard
handler installation.

### `hostDirectives` composition

- `[kjCombobox]` (root):
  - `KjFormControl` (CVA — value, touched, disabled propagation).
  - `KjDisabled` (input alias `kjDisabled`).
  - **No** `KjFocusRing` on root — focus rings live on the input.
- `[kjComboboxMulti]` (sibling root):
  - Same as `[kjCombobox]` plus internal `KjSelectionModel<T>` in
    multi mode.
- `[kjComboboxInput]`:
  - `KjInput` (the existing input-on-`<input>` directive — provides
    variant / size / focus-ring / disabled / form-control plumbing
    against the native input).
  - `KjAriaDescribedBy`.
  - **No** `KjSelectTrigger` — see Decision §3.
- `[kjComboboxDropdownTrigger]`:
  - `KjButton` (variant / size / focus-ring / disabled).
  - Capture-phase click suppression on disabled (mirrors Button).
- `[kjComboboxClear]`:
  - `KjButton`.
- `[kjComboboxEmpty]` / `[kjComboboxLoading]`:
  - No host directives. Pure ARIA + signal-driven `[hidden]`.

### `KJ_FIELD` integration

In `[kjCombobox]`'s constructor, read
`inject(KJ_FIELD, { optional: true })` and call
`field.registerControl(...)` with the **input element** ref (once the
input registers itself with the combobox context). The auto-minted
field id becomes the input's id; the field's `<label for=>` attaches
naturally; the field's `describedByIds()` flows onto the input via
`KjAriaDescribedBy`.

This is markedly cleaner than Select's composite-control story
(see [`select.md`](./select.md#kj_field-integration)) because the
trigger *is* a real form control. No `<label for>` validity worries.

### Cross-component pointers

- **[`data-input/select.md`](./select.md)** — the parent. Combobox
  reuses Select's panel (`KjSelectContent`), option (`KjSelectOption`),
  indicator (`KjSelectItemIndicator`), group / label / separator, and
  the `KJ_SELECT` context. Combobox blocks on Select's planned refactor
  (registration-based options, anchor primitive, `aria-activedescendant`
  rewrite, `focusModel` flag); see Open Questions.
- **[`data-input/multi-select.md`](./multi-select.md)** — multi-mode
  sibling. `[kjComboboxMulti]` reuses `KjSelectionModel<T>` (the shared
  selection primitive specified there) for its toggle semantics, and
  the chip-rendering pattern for its trigger area.
- **[`actions/command-palette.md`](../actions/command-palette.md)** —
  similar typeahead. The Command Palette is "a modal, action-launching
  Combobox without a value contract." Concretely:
  - **Shared filter type.** `KjCommandFilter` and `KjComboboxFilter`
    are aliases for the same shape. Custom filters work on both.
  - **Shared `kjFuzzyFilter` implementation.** Lives in
    `packages/core/src/primitives/listbox/fuzzy.ts`; both consume it.
  - **Shared `KjListboxNavigation` primitive.** Specified in this
    analysis (Decision §5). Replaces the inline keyboard logic in
    `KjSelectContent`, `KjMultiSelectContent`, and `KjCommandList`.
    All three become consumers of the same algorithm; the algorithm
    has one source of truth and one test suite.
  - **Different value contract.** Combobox commits a value to a form
    on selection (CVA round-trip); palette emits `(kjActivate)` for a
    side effect (open route, run shortcut). Don't try to merge the
    roots — same shape, different semantics, recorded explicitly in
    the command palette analysis.
  - **Shared diacritic helper.** `stripDiacritics` in
    `primitives/listbox/diacritics.ts`.
- **[`data-input/input.md`](./input.md)** — the trigger element.
  `[kjComboboxInput]` composes `KjInput` (variant / size / focus-ring /
  CVA against the native `<input>`) and adds the combobox role +
  keyboard contract on top. The two are stacked deliberately:
  `<input kjComboboxInput>` ≡ `<input kjInput kjComboboxInput>` (the
  former includes the latter via `hostDirectives`).
- **[`data-input/field.md`](./field.md)** — owns label-control
  association, `aria-describedby` chain, `aria-required` mirror, error
  gating. `[kjCombobox]` registers as a single control (the input)
  with `KJ_FIELD` — *not* a composite control like Select. Field's
  `<label for=>` strategy works directly.
- **[`data-input/form.md`](./form.md)** — higher-level orchestrator.
  No direct Combobox↔Form coupling; Form contains Fields, Fields wrap
  Comboboxes.
- **[`data-display/chip.md`](../data-display/chip.md)** /
  **[`data-display/tag.md`](../data-display/tag.md)** — forward
  references; not yet written. `[kjComboboxMulti]`'s chip rendering
  consumes whatever those analyses specify, same as Multi Select.
- **[`feedback/popover.md`](../feedback/popover.md)** — defines the
  shared `KjAnchor` primitive that `[kjSelectContent]` (and therefore
  Combobox by reuse) consumes for positioning math. Combobox blocks
  on this extraction along with Select.
- **[`primitives/listbox/listbox-navigation.ts`](../../packages/core/src/primitives/listbox/listbox-navigation.ts)** —
  the new shared primitive specified in Decision §5. Combobox is the
  trigger to extract this; Select / Multi Select / Command Palette
  refactor onto it as a follow-up.
- **[`feedback/live-region.md`](../feedback/)** — `KjLiveRegion`
  primitive used to announce filtered result counts.
- **[`primitives/forms/form-control.ts`](../../packages/core/src/primitives/forms/)** —
  Combobox composes `KjFormControl` for CVA. Selecting an option or
  committing free text calls `formCtrl.notifyChange(value)`; blur of
  the input fires `notifyTouched()`.

## Inputs / Outputs / Models — `kj`-prefixed

### `[kjCombobox]` (root, single value)

| Member             | Kind   | Type                                          | Default                  | Notes                                                                                              |
| ------------------ | ------ | --------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------- |
| `kjValue`          | model  | `T \| string \| null`                         | `null`                   | Two-way bindable. Type widens to include `string` only when `kjAllowFreeText=true`.                |
| `kjQuery`          | model  | `string`                                      | `''`                     | Two-way bindable query text. Synced with the input's value.                                        |
| `kjOpen`           | model  | `boolean`                                     | `false`                  | Two-way bindable.                                                                                   |
| `kjDisabled`       | input  | `boolean`                                     | `false`                  | Forwarded via `hostDirectives` to `KjDisabled`.                                                    |
| `kjReadonly`       | input  | `boolean`                                     | `false`                  | Input non-editable; panel does not open.                                                           |
| `kjInvalid`        | input  | `boolean`                                     | `false`                  | Reflects `aria-invalid` on the input (touched-gated).                                              |
| `kjAllowFreeText`  | input  | `boolean`                                     | `false`                  | Allow values not in the option list.                                                               |
| `kjShouldFilter`   | input  | `boolean`                                     | `true`                   | Set `false` for consumer-driven (async / server) filtering.                                        |
| `kjFilter`         | input  | `KjComboboxFilter`                            | `kjContainsFilter`       | Pluggable filter function.                                                                          |
| `kjSortByScore`    | input  | `boolean`                                     | `false`                  | Reorder visible options by descending filter score.                                                  |
| `kjAutoActivateFirst` | input | `boolean`                                  | `true`                   | Activate first visible option after each query change.                                              |
| `kjAutoSelectActive` | input | `boolean`                                   | `false`                  | ArrowUp / ArrowDown commits to form value as it moves.                                              |
| `kjMinLength`      | input  | `number`                                      | `0`                      | Don't open until query has at least this many characters.                                            |
| `kjOpenOnFocus`    | input  | `boolean`                                     | `false`                  | Open the panel as soon as the input receives focus.                                                  |
| `kjOpenOnClick`    | input  | `boolean`                                     | `false`                  | Open the panel when the input is clicked (not just typed into).                                     |
| `kjEscapeBehaviour`| input  | `'close' \| 'clear' \| 'close-then-clear'`     | `'close-then-clear'`     | What Escape does. APG-recommended: close panel, then clear on a second press.                        |
| `kjLoading`        | input  | `boolean`                                     | `false`                  | Toggles `aria-busy` and renders `[kjComboboxLoading]`.                                              |
| `kjQueryDebounce`  | input  | `number`                                      | `0`                      | Milliseconds — only used when emitting `(kjQueryChange)`. Internal filter is undebounced.            |
| `kjCompareWith`    | input  | `(a: T, b: T) => boolean`                     | reference equality       | For object-valued options.                                                                          |
| `kjDisplayWith`    | input  | `(value: T) => string`                        | `(v) => String(v ?? '')` | Convert value → input display text.                                                                  |
| `kjClearable`      | input  | `boolean`                                     | `false`                  | Wrapper renders a clear button.                                                                      |
| `kjPlaceholder`    | input  | `string`                                      | `''`                     | Forwarded to the input.                                                                              |
| `kjName`           | input  | `string \| undefined`                         | `undefined`              | Forwarded to the input's native `name`. Hidden-input postback works for free-text mode (string value). |
| `kjSide`           | input  | `'top' \| 'right' \| 'bottom' \| 'left'`      | `'bottom'`               | Anchor side. Forwarded to `[kjSelectContent]`.                                                       |
| `kjAlign`          | input  | `'start' \| 'center' \| 'end'`                | `'start'`                | Anchor alignment.                                                                                    |
| `kjOffset`         | input  | `number`                                      | `4`                      | Px offset.                                                                                            |
| `kjAvoidCollisions`| input  | `boolean`                                     | `true`                   | Anchor flip / shift to keep panel on-screen.                                                          |
| `kjMatchTriggerWidth` | input | `boolean`                                  | `true`                   | Panel `min-width` matches input width.                                                                |
| `kjLoop`           | input  | `boolean`                                     | `false`                  | Arrow-key wrap-around in the option list.                                                             |
| `kjPageSize`       | input  | `number`                                      | `10`                     | PageUp / PageDown jump distance.                                                                      |
| `kjAriaLabel`      | input  | `string \| null`                              | `null`                   | Forwarded to the input when no `KjField` parent.                                                      |
| `kjAriaLabelledby` | input  | `string \| null`                              | `null`                   | Override.                                                                                             |

| Output             | Payload                            | Notes                                                                                          |
| ------------------ | ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| `kjValueChange`    | `T \| string \| null`              | Paired with `kjValue` model.                                                                    |
| `kjQueryChange`    | `string`                           | Paired with `kjQuery` model. Debounced via `kjQueryDebounce`. **Use this for async fetches.**    |
| `kjOpenChange`     | `boolean`                          | Paired with `kjOpen` model.                                                                     |
| `kjOpened`         | `void`                             | After panel finishes opening.                                                                    |
| `kjClosed`         | `KjComboboxCloseReason`            | `'commit' \| 'escape' \| 'tab' \| 'click-outside' \| 'blur' \| 'programmatic'`.                  |
| `kjCommit`         | `T \| string`                      | Fired on Enter / option click / `kjAutoSelectActive` move. Useful for "search-on-commit" UX.    |
| `kjReverted`       | `{ rejected: string }`             | Constrained mode: emitted when blur reverts non-matching typed text.                              |
| `kjCleared`        | `void`                             | Fired on `[kjComboboxClear]` activation.                                                          |

### `[kjComboboxMulti]` (root, multi value)

Same surface as `[kjCombobox]`, with the following differences:

| Member                   | Kind   | Type                                          | Default                  | Notes                                                                                  |
| ------------------------ | ------ | --------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------- |
| `kjValue`                | model  | `readonly (T \| string)[]`                    | `[]`                     | Multi-value array.                                                                     |
| `kjMultiHideSelected`    | input  | `boolean`                                     | `true`                   | Hide already-selected options from the panel.                                          |
| `kjMultiUnique`          | input  | `boolean`                                     | `true`                   | Reject duplicate values (relevant in free-text mode where two chips could repeat).       |
| `kjMultiCommitOn`        | input  | `readonly ('Enter' \| ',' \| 'blur')[]`        | `['Enter', ',', 'blur']` | Which keys / events commit the typed query as a new chip in free-text mode.             |
| `kjCloseOnSelect`        | input  | `boolean`                                     | `false`                  | Different default vs. single-mode (`true`).                                             |

| Output                   | Payload                            | Notes                                                                                  |
| ------------------------ | ---------------------------------- | -------------------------------------------------------------------------------------- |
| `kjAdd`                  | `T \| string`                      | Fired when an option is added to the selection.                                         |
| `kjRemove`               | `T \| string`                      | Fired when a chip is removed from the selection.                                        |

### `[kjComboboxInput]`

No public inputs / outputs that aren't proxied from `KjInput` (variant /
size / disabled). Reads `KJ_COMBOBOX`. Owns the combobox role, the
`aria-autocomplete="list"` host binding, the keyboard contract, and the
query model wiring.

| Member         | Kind   | Type                | Default | Notes                                                                                          |
| -------------- | ------ | ------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| `kjVariant`    | input  | `KjVariant`         | preset  | Forwarded via `KjInput` host directive.                                                         |
| `kjSize`       | input  | `KjSize`            | `'md'`  |                                                                                                |
| `kjDisabled`   | input  | `boolean`           | `false` |                                                                                                |

### `[kjComboboxDropdownTrigger]`

| Member         | Kind   | Type                | Default            | Notes                                                                                          |
| -------------- | ------ | ------------------- | ------------------ | ---------------------------------------------------------------------------------------------- |
| `kjAriaLabel`  | input  | `string`            | `'Show options'`   | Accessible name. Defaults are intentional — themes may override.                                |
| `kjVariant`    | input  | `KjVariant`         | `'ghost'`          | Forwarded via `KjButton`.                                                                        |
| `kjSize`       | input  | `KjSize`            | from input's size  |                                                                                                  |

### `[kjComboboxClear]`

| Member         | Kind   | Type                | Default       | Notes                                                                                          |
| -------------- | ------ | ------------------- | ------------- | ---------------------------------------------------------------------------------------------- |
| `kjAriaLabel`  | input  | `string`            | `'Clear'`     |                                                                                                |
| `kjVariant`    | input  | `KjVariant`         | `'ghost'`     |                                                                                                |

### `[kjComboboxEmpty]` / `[kjComboboxLoading]`

No public inputs / outputs. Computed `[hidden]` from
`KJ_COMBOBOX.filteredOptions().length === 0` (Empty) or
`KJ_COMBOBOX.loading()` (Loading).

### Wrapper components (Library / `@kouji-ui/components`)

- **`<kj-combobox>`** — host-directive composes `KjCombobox`. Re-exposes
  the full single-mode input surface above. Renders an `<input
  kjComboboxInput>` and projects `<ng-content kjSelectContent>` for the
  panel; optional `<button kjComboboxDropdownTrigger>` and
  `<button kjComboboxClear>` slots inside the input wrapper.
- **`<kj-combobox-multi>`** — host-directive composes `KjComboboxMulti`.
  Same surface plus chip area, "X more" overflow chip, multi-specific
  inputs.
- **`<kj-option>`** — same as Select's wrapper. Reused.
- **`<kj-combobox-empty>`** / **`<kj-combobox-loading>`** — thin slot
  wrappers; no extra inputs.
- **`<kj-combobox-clear>`** / **`<kj-combobox-dropdown-trigger>`** — thin
  button wrappers with a default chevron / x-icon glyph.

## Examples to ship

1. **Default** — `combobox.example.ts`. Single `<kj-combobox>` with
   static `<kj-option>` children (e.g. country list), two-way bound to
   a signal. Demonstrates substring filter, auto-active first option,
   commit-on-Enter.
2. **Reactive form** — `combobox.reactive.example.ts`. `[formControl]`
   with `Validators.required`, error message via `<kj-field-error>`,
   touched-gated `aria-invalid`.
3. **Inside a Field** — `combobox.field.example.ts`. Wrapped in
   `<div kjField>` with `<label kjFieldLabel>`. Demonstrates the simple
   `<label for=>` flow (no composite-control workaround unlike Select).
4. **Async data** — `combobox.async.example.ts`.
   `[kjShouldFilter]="false"`, `(kjQueryChange)` debounced, fetches from
   a fake API, displays loading state inside the panel via
   `<span kjComboboxLoading>`.
5. **Free text** — `combobox.free-text.example.ts`.
   `kjAllowFreeText="true"` so the user can commit a typed string that
   isn't in the list. Shows the type-widening to `T | string`.
6. **Multi mode** — `combobox.multi.example.ts`. `<kj-combobox-multi>`
   with chips, "X more" overflow, Backspace-to-remove, free-text tags
   (`kjAllowFreeText="true"`).
7. **Object values + `displayWith`** — `combobox.compare-with.example.ts`.
   Options of `{ id, name }`, `[kjCompareWith]="(a, b) => a?.id === b?.id"`,
   `[kjDisplayWith]="user => user.name"`.
8. **Fuzzy filter** — `combobox.fuzzy.example.ts`.
   `[kjFilter]="kjFuzzyFilter"` with `kjSortByScore=true`.
9. **Dropdown trigger** — `combobox.dropdown-trigger.example.ts`.
   PrimeNG-style trailing chevron button that opens the panel.
10. **Grouped options** — `combobox.grouped.example.ts`. Reuses
    `<kj-select-group>` + `<kj-select-label>` + `<kj-select-separator>`.
11. **Variants + sizes** — `combobox.variants.example.ts`.
12. **Min length + empty state** — `combobox.min-length.example.ts`.
    `kjMinLength=2`; demonstrates the panel staying closed for short
    queries, and `[kjComboboxEmpty]` rendering when no matches.
13. **Tags input** — `combobox.tags.example.ts`. Multi + free-text +
    no static options — pure tags-input UX.

## Open questions / risks

1. **Filter-input-inside-the-panel recipe.** The shadcn-style "trigger
   is a button, search input lives inside the open panel" UX is real
   (used by GitHub's repo picker, Linear's project picker). Ship as a
   recipe (`<button kjSelectTrigger>` + `<input kjComboboxInput>`
   rendered inside `<kj-select-content>`), not as a separate directive.
   The recipe needs `[kjComboboxInput]` to function without a parent
   `[kjCombobox]` — the directive should fall back to the nearest
   `KJ_SELECT` and treat that as its host. Resolved: treat
   `[kjComboboxInput]` as compatible with both `KJ_COMBOBOX` and
   `KJ_SELECT` contexts; auto-detect via `inject(..., { optional: true })`
   in priority order.

2. **Combobox blocks on the Select refactor.** All of
   [`select.md`](./select.md)'s open questions transfer (anchor primitive
   extraction, `aria-activedescendant` rewrite, registration-based option
   context, the new directives `[kjSelectGroup]` / `[kjSelectLabel]` /
   `[kjSelectSeparator]` / `[kjSelectItemIndicator]`). Combobox should
   not ship until those land. Mitigation: ship in three rounds — round 1
   is the Select refactor + `KjListboxNavigation` primitive; round 2 is
   `[kjCombobox]` single-mode + `[kjComboboxInput]` + filter functions;
   round 3 is `[kjComboboxMulti]` + tags-input ergonomics.

3. **`KjListboxNavigation` extraction is on the critical path.** Three
   consumers (Select, Multi Select, Command Palette) currently each
   roll their own. Combobox makes four. Extract before round 2 above —
   this is the trigger. Risk: subtle algorithm divergence between the
   existing inline implementations during the migration. Mitigation:
   port one consumer at a time, with a regression test corpus
   (Arrow-key navigation across disabled options, type-ahead reset on
   idle, page-size jumping at edges) ported once and run against all
   four consumers.

4. **`kjValue` type widening with `kjAllowFreeText`.** TypeScript can't
   express "the model's accepted type depends on another input's
   value." Either:
   - Always widen to `T | string | null` (consumer always type-narrows
     even when free-text is off — annoying but truthful);
   - Provide two model inputs (`kjValue: T | null` and `kjFreeTextValue: string | null`)
     — splits the contract;
   - Generic the directive on a discriminated value type — viral.
   **Decision:** always widen. Document explicitly. Consumers in
   constrained mode get a `T | null` value at runtime; the type
   reflects the looser superset for safety.

5. **`kjQuery` and `kjValue` synchronisation.** When the consumer sets
   `kjValue` programmatically, what happens to `kjQuery`? Three options:
   (a) auto-update `kjQuery` to `kjDisplayWith(kjValue)`; (b) leave
   `kjQuery` alone; (c) emit an event so the consumer decides. Material
   chooses (a). PrimeNG also (a). **Decision:** (a) by default, with
   `kjResetQueryOnExternalValue: input<boolean>(true)` to opt out for
   advanced cases. Document the symmetry: typing → updates query →
   filter; programmatic value → updates query (display) → filter resets
   to "everything visible" because the input's text now equals the
   displayed value (not a partial query). This is a non-trivial
   subtlety; example to ship covers it.

6. **Async race conditions.** The consumer's fetch pipeline is their
   responsibility, but the directive can help: emit `(kjQueryChange)`
   only when the query *actually changed* (debounced + distinct) so the
   consumer's RxJS pipeline doesn't have to do that work. Mitigation:
   built-in `kjQueryDebounce` + a default `distinctUntilChanged`
   semantic on the output. Document.

7. **`displayWith` and the input's caret position.** When
   `kjValue` is committed via Enter, the input text becomes
   `kjDisplayWith(value)` and the caret moves to end-of-text. Material
   does the same. PrimeNG also. Risk: if the user has the cursor
   mid-word and an active option is committed via mouse-click (focus
   leaves and returns), the caret position is lost. Acceptable; matches
   precedent.

8. **Free-text in multi mode and duplicate detection.** When
   `kjAllowFreeText=true` and `kjMultiUnique=true` (default), how do we
   compare a typed string to existing option-value chips? **Decision:**
   `kjCompareWith` is used for option-vs-option; for string-vs-anything,
   strict `===` between strings only. Two chips with the same string
   are duplicates (rejected); a string chip and an object chip are
   never duplicates regardless of object content. Document; example
   in tags-input.

9. **`[kjComboboxInput]`'s interaction with `<input type="search">`.**
   Native search inputs render a clear-X glyph in WebKit (the `appearance`
   bit). For consistency and theme control, recommend `type="text"` and
   our own `[kjComboboxClear]` slot. Document; do not enforce.

10. **`Backspace` at caret 0 in multi mode.** Removing the last chip is
    non-undoable (no toast confirms). Risk: accidental removal during
    fast typing. Mitigation: emit `(kjRemove)` and let the consumer
    show a toast / undo affordance if they want. Don't add a "first
    backspace highlights, second removes" two-step here — that's a
    subtle interaction model better lived with for a beat post-launch
    before adding.

11. **Min length + auto-active first.** When `kjMinLength=2` and the
    user has typed 1 character, the panel is closed. The first
    keystroke that crosses the threshold should auto-activate the first
    option (per `kjAutoActivateFirst=true`). Verify: the activation
    timing must be after the filter pipeline runs, not before. Pure
    sequencing concern in the implementation; flagged here to make
    sure the spec implies it.

12. **Live-region throttling under fast typing.** `KjLiveRegion`
    announcing "{N} results" on every keystroke is bad — AT queues
    fall behind, user hears stale counts. Built-in `500ms` debounce on
    the announce-only pipeline; the visible result count is undebounced.
    Document.

13. **`kjEscapeBehaviour='close-then-clear'`.** APG's recommended
    behaviour. Implementation: track "did Escape close the panel just
    now?" with a transient flag (clears after `300ms`); the second
    Escape clears query + value. Risk: state leak across opens.
    Mitigation: clear the flag on open. Test.

14. **SSR.** Counter-based ids stable. The reactive `kjQuery` model,
    filter computation, and live-region pushes all run in the browser
    only. Verify with SSR smoke test.

15. **Bundle locality.** Consumers using `[kjSelect]` should not pay
    for the combobox bundle (filter functions, fuzzy code,
    `KjComboboxInput`'s keyboard handler). The combobox feature folder
    has no imports from Select beyond the `KJ_SELECT` token; tree-shaking
    handles the rest. Verify with the bundle analyzer.

16. **Virtualization.** Out of scope for v1, like Select. The combobox
    use case is *more* likely to need virtualization (filtered lists
    can still be in the hundreds), so this is a v1.1 priority. Track.

17. **`KjField` and the input's auto-id.** Same as Select — the field
    auto-mints an id on the registered control element. Combobox's
    registered control is the input directly, so the id flows naturally.
    No composite-control workaround.

18. **Browser-native autocomplete.** Native `<input>` carries an
    `autocomplete` attribute (e.g. `autocomplete="email"`). When set,
    Chrome / Safari render their own suggestion dropdown over our
    panel. **Decision:** force `autocomplete="off"` by default on
    `[kjComboboxInput]` (host binding); consumers who deliberately want
    browser autocomplete (e.g. an email-field combobox) can override
    via `[attr.autocomplete]="'email'"` on the same input. Document.

19. **Tests.** The full E2E matrix is large: filter modes × free-text ×
    multi × async × keyboard contract × screen-reader behaviour. Per
    [user instructions](../../../CLAUDE.md), every shipped feature
    needs E2E tests. Plan: write the matrix as a Playwright spec
    parameterized over the example files; run against all examples in
    `combobox.*.example.ts`.

## Accessibility Review

WCAG 2.1 considerations against the proposed shape:

- **1.3.1 Info and Relationships:** `[kjComboboxInput]` host bindings
  set `role="combobox"`, `aria-controls`, `aria-expanded`,
  `aria-autocomplete="list"`, `aria-haspopup="listbox"`,
  `aria-activedescendant`. Panel reuses `[kjSelectContent]`'s
  `role="listbox"` + `aria-labelledby`. Empty / loading slots use
  `role="status"` + `aria-live="polite"`. **Status: covered.**
- **2.1.1 Keyboard:** Full APG combobox-with-listbox contract: Arrow,
  Home / End (text-edit, not listbox), PageUp / PageDown,
  Alt+Arrow, Enter, Escape (two-step), Tab. **Status: covered.**
- **2.4.3 Focus Order:** Input keeps DOM focus the entire session;
  panel is `tabindex="-1"`; options are `tabindex="-1"`. Tab from
  input flows naturally past it on close. **Status: covered.**
- **2.4.7 Focus Visible:** Input composes `KjFocusRing` via
  `KjInput`. Active option reflects `data-active` for the
  active-descendant theme outline. **Status: covered.**
- **3.3.1 Error Identification & 3.3.2 Labels or Instructions:**
  `KjField` integration via input's auto-registration (single
  control, not composite — `<label for=>` works). `aria-describedby`
  chain, `aria-required` and `aria-invalid` mirroring. **Status: covered.**
- **4.1.2 Name, Role, Value:** Input's accessible name from
  `<label for=>` (via `KjField`) or `kjAriaLabel`. Role / state
  attributes wired in host bindings. **Status: covered.**
- **2.5.5 Target Size (AAA):** `KjSize.md` ≥ 44×44 on input,
  options, dropdown trigger, clear button. Theme concern. **Status:
  conditional on theme.**
- **1.4.11 Non-text Contrast (AA → AAA):** Active-descendant outline
  ≥ 3:1; selected-state checkmark ≥ 3:1. Theme concern. **Status:
  conditional on theme.**
- **4.1.3 Status Messages (AA):** `KjLiveRegion` announces filtered
  result count after debounce; loading state announced via
  `aria-busy` + `[kjComboboxLoading]`'s `role="status"`. **Status: covered.**

Status: **no issues identified in the spec itself.** The accessibility
contract holds end-to-end given the assumed Select refactor and
`KjListboxNavigation` extraction. Implementation verification will
happen at the directive PRs.
