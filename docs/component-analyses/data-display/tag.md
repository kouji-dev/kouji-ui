# Tag / Chip

A small, label-shaped surface for compact metadata. **Interactive** is the
defining axis: a Tag/Chip is what a Badge becomes once you can click,
toggle, or remove it. Three real shapes hide under the umbrella name —

1. **Decorative** — a static label (looks the same as a Badge).
2. **Removable** — a label with a trailing `×` button that dismisses it.
3. **Selectable** — a label that toggles on / off (filter chips, tag
   cloud).

…and one composite where the chips live inside a wider control:

4. **Input chip** — a chip rendered inside a tags-input or multi-select
   trigger, where the wider control owns the keyboard contract
   (Backspace at position 0 removes the last chip; arrow keys roving
   through chips, etc.).

> **Sibling, non-interactive component:** see
> [`badge.md`](./badge.md) — a Badge is the static cousin
> (`role` = none, no removal, no selection, no keyboard target). When in
> doubt: if you would describe it as "a small piece of *information*",
> reach for Badge; if you would describe it as "a small piece of *user
> data the user can manipulate*", reach for Tag/Chip. The two share the
> same visual chrome (rounded pill, density tokens, `KjVariant` /
> `KjSize`) but live in different a11y worlds.

## Source comparison

PrimeNG splits the visual into two components based on interactivity;
Material rolls everything under a chip family with role-discriminating
container parents; shadcn has no first-class — community recipes layer
their `<Badge>` with a remove button glued on.

| Concern                          | PrimeNG `<p-tag>` (static)                                                  | PrimeNG `<p-chip>` (interactive)                                                                                                                                | Angular Material `MatChip*` family                                                                                                                                                                                | shadcn/ui (community recipe)                                                                                  |
| -------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Selectors                        | `<p-tag>`                                                                   | `<p-chip>`                                                                                                                                                      | `<mat-basic-chip>`, `<mat-chip>`, `<mat-chip-option>`, `<mat-chip-row>`; containers `<mat-chip-set>`, `<mat-chip-listbox>`, `<mat-chip-grid>`. Sub-elements: `[matChipRemove]`, `[matChipAvatar]`, `[matChipTrailingIcon]`, `[matChipEdit]`. | Apply `<Badge>` styles to a `<button>` and project a remove `<X>` `<button>`.                                 |
| Interactivity                    | None                                                                        | `removable: boolean` + `(onRemove)` event.                                                                                                                      | Three flavours: `MatChip` (action chip — single button), `MatChipOption` (toggle / select chip in a `MatChipListbox`), `MatChipRow` (input chip in a `MatChipGrid`).                                              | Whatever the consumer wires.                                                                                  |
| Variants / severity              | `severity: success / info / warn / danger / contrast / secondary`           | none — single visual.                                                                                                                                           | `color: 'primary' \| 'accent' \| 'warn'` + a `highlighted` flag for "selected" tone.                                                                                                                              | Inherits `<Badge>` variants.                                                                                  |
| Sizes                            | `[rounded]`, `[severity]`, no size axis.                                    | `[styleClass]` only.                                                                                                                                            | Density via Material density tokens (no per-chip size).                                                                                                                                                           | Tailwind sizing classes.                                                                                      |
| Avatar / leading icon            | `[icon]` (PrimeIcons class) + `[image]`.                                    | `[icon]` + `[image]` + `[label]`.                                                                                                                               | `[matChipAvatar]` projection slot (image / first-letter).                                                                                                                                                         | Project an `<Avatar>` or icon next to text.                                                                   |
| Removal                          | n/a                                                                         | `[removable]="true"` shows trailing icon; `(onRemove)` fires; `removeIcon` configurable.                                                                        | `[matChipRemove]` directive on a projected `<button>`. Container handles announcement and keyboard.                                                                                                               | Project a `<button>` with `<X />` and an `onClick` handler.                                                   |
| Keyboard (single chip)           | n/a                                                                         | `Backspace` / `Enter` on the trailing remove `<span>` triggers remove. No focus management on the chip itself.                                                  | `Space`/`Enter` activate; `Delete`/`Backspace` remove (when `removable`); `Arrow` keys move focus *between* chips inside a container; `F2` enters edit mode for input chips.                                      | Consumer-defined.                                                                                             |
| Selection                        | n/a                                                                         | n/a                                                                                                                                                             | `MatChipOption.selected` model + container's `selectable: boolean`. Listbox container coordinates single / multi via `multiple`.                                                                                  | Consumer-defined.                                                                                             |
| Container coordination           | none                                                                        | none — chips are siblings.                                                                                                                                      | Container is mandatory for selection / input modes; provides `role="listbox"` / `role="grid"`, focus management (`FocusKeyManager`), and `(focus)`/`(blur)` redirection.                                          | none.                                                                                                         |
| Form-control integration         | none                                                                        | none                                                                                                                                                            | `MatChipGrid` implements `MatFormFieldControl` and `ControlValueAccessor` — the input-chip container becomes the form control.                                                                                    | none.                                                                                                         |
| Roles                            | `<span>`, no role                                                           | `<div>`, no role; remove icon is a `<span>` (a11y-questionable).                                                                                                | Container: `listbox` or `grid` (depending on family). Chip itself: `option` (in listbox), `row` (in grid), or `button` (action). Always a real `<button>` for the remove action.                                  | Whatever.                                                                                                     |
| Focus management                 | n/a                                                                         | none                                                                                                                                                            | `FocusKeyManager` on container; on remove, focus moves to the next chip (or container if last).                                                                                                                   | Consumer-defined.                                                                                             |
| Visual chrome                    | Coloured pill, padding, optional rounded, optional icon.                    | Larger pill with avatar slot, label, and trailing remove icon.                                                                                                  | MDC-driven Material chip surface; ripple, elevation (selected), state layer.                                                                                                                                      | Tailwind utility classes.                                                                                     |

**Read-off.**

- **PrimeNG splits the question** by hard-coding the answer: `<p-tag>`
  is the decorative half, `<p-chip>` is the removable half. The split
  feels like two stages of the same idea, not two components — and it
  forces the consumer to swap their template element when interaction
  status changes (e.g. "make these tags removable in edit mode").
  Reject.
- **Angular Material** treats the chip as one shape with three roles
  determined by its **container parent**. That is the right
  decomposition — interactivity is not a property of the chip, it's a
  property of the surface the chip lives in. We borrow this idea but
  flatten it: instead of three sibling root directives, kouji ships
  one `KjTag` chip plus role-marker inputs, and a single optional
  container (`KjTagList`) for the keyboard / focus story when chips
  participate in a group. The form-control marriage that
  `MatChipGrid` does internally we route through the existing
  `KjMultiSelect` / `KjCombobox[multi]` paths (see Cross-component
  pointers) — no separate "chip grid" widget.
- **shadcn** recognises that there is no headless primitive worth
  shipping and stops at the visual layer. We disagree: the
  removable / selectable contracts (focus management, ARIA wiring,
  Backspace-removes) are non-trivial enough that consumers will
  re-implement them poorly across projects. The directive earns its
  keep.

## Decision: one component, four shapes, one helper directive

**Single name.** Roadmap says "Tag / Chip". We ship one component
called **Tag** (selector `[kjTag]` + `<kj-tag>` wrapper), because
"tag" is the more common word in the form-control / metadata space
and reads naturally inside `<kj-multi-select>` (chips inside a chip-bearing
trigger are tags by another name). "Chip" remains the colloquial term in
docs prose, and we do not gate consumers from saying it.

**Four shapes, three flag inputs.** The shape is decided by inputs on
`KjTag`, not by a sibling component:

| Shape         | Inputs / context                                                                                                | DOM emitted                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Decorative    | none                                                                                                            | `<span kjTag>` — `role` omitted; nothing focusable.                                                  |
| Removable     | a child `[kjTagRemove]` is projected                                                                            | `<span kjTag>` (still no role) **+** the inner `<button kjTagRemove>` with `aria-label="Remove …"`.  |
| Selectable    | `kjTagSelectable="true"` and (optionally) `[(kjTagSelected)]`                                                   | `<span kjTag role="button" tabindex="0" aria-pressed="true|false">` (toggle pattern).                |
| Input chip    | host element is rendered inside a `KjTagList` container (chip is `role="option"` or `role="row"` per container) | Container-driven; see [`KjTagList`](#kjtaglist---chip-group-coordinator) below.                      |

The reason for one component instead of four: the **visual chrome is
identical**, the **size / variant tokens are identical**, and the
**variant decision tree is the consumer's problem**, not ours.
Splitting into `KjTagButton` / `KjTagOption` / `KjTagRow` would
duplicate styling and force the consumer to swap template elements
when an interaction shape changes — exactly the PrimeNG mistake.

**Removal lives in a child directive (`KjTagRemove`)**, not a flag,
because the remove button is a real focus target with its own a11y
contract (a `<button>` with an accessible name "Remove {label}",
`Enter` / `Space` activation, `aria-label` injection from the parent
tag's content). Modelling it as a flag would force the parent to
template-render a button it cannot label correctly without consumer
input.

**Selection lives on the tag itself** (not a child), because the
toggle target is the chip — there is no separate hit area. We adopt
the same `aria-pressed` toggle pattern that `KjButton` already uses,
and we re-use `KjButton` underneath for everything except the visual
chrome.

**Group coordination lives in `KjTagList`** (optional, opt-in),
modelled on Material's container family but unified into one
directive whose ARIA role is configurable. Without `KjTagList`, tags
behave as independent siblings; with it, the group gains roving
tabindex, `role="listbox" | "grid"`, and focus-after-removal.

## What exists today

Nothing on disk. No `packages/core/src/tag/`, no
`packages/components/src/tag/`. The Multi Select analysis
([`../data-input/multi-select.md`](../data-input/multi-select.md)) has
already pencilled in `KjChip` / `KjChipRemove` selectors (lines ~229,
252, 254 of that file) as forward references. Combobox does the same
([`../data-input/combobox.md`](../data-input/combobox.md), line ~772).
**Both forward references must be reconciled to `KjTag` /
`KjTagRemove`** when those analyses are next revisited; the
selectors here are canonical.

## Base features

| Feature                                       | Where it lives                            | Notes                                                                                                                                                                                                              |
| --------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `kjVariant`                                   | `KjVariant` host directive                | Same preset list as `KjBadge` (see badge.md): `default`, `primary`, `secondary`, `success`, `warning`, `danger`, `info`, `outline`, `ghost`. Configurable via `provideKjTag(...)`.                                  |
| `kjSize`                                      | `KjSize` host directive                   | Presets: `sm`, `md`, `lg`. Touch-target rule: when **any** shape is interactive (`kjTagRemove` projected, `kjTagSelectable`, or container-mediated), `sm` enforces a 44×44 hit area via padding (see Accessibility). |
| `kjTagSelectable`                             | `KjTag`                                   | Boolean. When `true`, makes the host element keyboard-focusable, applies `role="button"`, binds `aria-pressed`, and enables click-to-toggle.                                                                       |
| `kjTagSelected`                               | `KjTag` (model)                           | `model<boolean>(false)` — only meaningful when `kjTagSelectable` is `true`. Two-way bindable.                                                                                                                      |
| `kjTagDisabled`                               | `KjTag` (composes `KjDisabled`)           | Standard ARIA-disabled treatment (focusable, `aria-disabled="true"`, click-suppression in capture phase). Disables both selection toggle and the projected `KjTagRemove`.                                          |
| Removal                                       | `KjTagRemove` (child directive)           | Composes `KjButton` for ARIA + click-suppression. Auto-derives `aria-label="Remove {label}"` by reading the parent tag's projected text content (override via `kjTagRemoveLabel`).                                 |
| `(kjTagRemoved)`                              | `KjTag` (output)                          | Emitted by the parent tag when its projected `KjTagRemove` is activated. Container `KjTagList` re-emits as `(kjTagListRemoved)` with the index for higher-level coordination.                                      |
| Avatar / leading icon                         | wrapper slot                              | `<kj-tag>` projects content; the recommended pattern is `<kj-avatar size="xs">` or an icon element followed by a text node, then the optional `<button kjTagRemove>×</button>` last.                                |
| Group / listbox / grid                        | `KjTagList`                               | Optional container. `kjTagListRole: 'listbox' \| 'grid' \| 'group'` (default `'group'`). Provides roving tabindex, focus-after-removal, and ARIA wiring for selectable / input-chip groups.                        |
| Removable inside Multi Select / Combobox      | container-mediated                        | When tags are rendered inside `KjMultiSelect`'s trigger or `KjCombobox[multi]`'s trigger, the form control is the listbox/combobox itself; the tags inherit `role="option"` / are children of `role="listbox"` only when explicitly inside a `KjTagList`. In the trigger the chips are visual rendering of the value model — not separately keyboarded — and Backspace-at-position-0 removes the last from the **input**, not the chip. See Cross-component pointers. |

## Accessibility (WCAG 2.1 AAA)

Reference: [WAI-ARIA APG — Listbox
Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) for
selectable groups; [APG Button
Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/) for the
toggle and remove behaviours; [APG Grid
Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) for input chips
inside a tags-input field (Material's `MatChipGrid` model).

### Per-shape role + ARIA wiring

| Shape         | Host element         | Role on `KjTag`                                                       | Required ARIA                                                                                                          | Removable button                                                                          |
| ------------- | -------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Decorative    | `<span>`             | none (omitted; let it be `generic`)                                   | none — equivalent to a Badge.                                                                                          | n/a                                                                                       |
| Removable     | `<span>`             | none (the `<span>` is a label; the `<button kjTagRemove>` is the target) | `aria-describedby` on the remove button references a hidden span inside the tag carrying its text (so SR users hear "Remove. Acme Corp.").                              | `<button>` with `aria-label="Remove {label}"` (auto) or `kjTagRemoveLabel` override.       |
| Selectable    | `<span>` (we host-bind `role="button"`) | `button`                                                              | `aria-pressed="true|false"` (never omitted in selectable mode); `aria-disabled` from `KjDisabled`; `data-selected` mirror for CSS. | n/a (selection is the chip itself).                                                       |
| Listbox option (`KjTagList[role="listbox"]`)         | `<span>`             | `option`                                                              | `aria-selected="true|false"` (always set in multi-selectable container — APG explicit). Roving tabindex from the container. | n/a — selection is the chip, removal is *not* a listbox-option behaviour. (See [Q3](#open-questions--risks).) |
| Grid row (`KjTagList[role="grid"]`)                  | `<span>` rendered as `<tr>` semantically (`role="row"`) wrapping a `<td role="gridcell">` for the label and another for the remove button | `row` on the chip; `gridcell` on the label and the remove button | Two `gridcell`s — the chip is one row, two columns. Keyboard: `Right` from label moves into the remove cell; `Delete` on the row removes the chip; `F2` enters edit mode (deferred, see Q5). | `<button kjTagRemove>` lives in the second `gridcell`. |

### Keyboard contract

| Context                                    | Key                                | Behaviour                                                                                                                                            |
| ------------------------------------------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Decorative                                 | n/a                                | Not focusable.                                                                                                                                       |
| Removable (standalone)                     | `Tab`                              | Skips the tag itself; lands on the trailing remove `<button>`.                                                                                       |
|                                            | `Enter` / `Space` on remove button | Removes the tag. Focus moves to the next focusable element in document order (consumer territory when not inside `KjTagList`).                       |
| Selectable (standalone)                    | `Tab`                              | Lands on the tag (`tabindex="0"`).                                                                                                                   |
|                                            | `Space` / `Enter`                  | Toggles `kjTagSelected`. `aria-pressed` flips. **No `Space`-scrolls behaviour** because we keep the host as a `<span>` with `role="button"` and intercept Space via host listener — preventing scroll. |
| Inside `KjTagList[role="listbox"]`         | `Tab`                              | Enters the listbox at the active descendant (or first chip if none). Subsequent `Tab` exits.                                                          |
|                                            | `Arrow` keys                       | Move focus between chips (axis configurable: `kjTagListOrientation: 'horizontal' \| 'vertical' \| 'both'`, default `'horizontal'`). Wrap configurable. |
|                                            | `Home` / `End`                     | First / last chip.                                                                                                                                   |
|                                            | `Space`                            | Toggles selection on the focused chip (multi-selectable) or selects (single-selectable).                                                              |
|                                            | `Ctrl/Cmd+A`                       | Select all (multi-selectable only).                                                                                                                  |
| Inside `KjTagList[role="grid"]` (input chips) | `Tab`                              | Enters at the focused row; subsequent `Tab` moves to the next focusable (the input that owns the chip grid in real form usage).                       |
|                                            | `Arrow Left/Right`                 | Move between cells within a row (label cell ↔ remove-button cell).                                                                                   |
|                                            | `Arrow Up/Down`                    | Move between rows (chips).                                                                                                                           |
|                                            | `Backspace` / `Delete`             | Remove the focused chip. Focus moves to the **previous** chip if any, else to the container's owning input (when bridged).                            |
|                                            | `Enter`                            | When the remove cell is focused, removes. When the label cell is focused, no-op (no edit-mode in v1; see Q5).                                         |

### Per-criterion checklist

| WCAG 2.1 criterion             | Requirement                                                       | Where it lives                                                                                                                                                              |
| ------------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.3.1 Info & Relationships     | Tag's text is associated with its remove button                   | `KjTagRemove` host-binds `aria-label="Remove {projected text}"` derived from the parent tag's text content via a content `MutationObserver` (or, preferred, a hidden id-targeted span — see Q1). |
| 1.4.3 Contrast (AA) / 1.4.6 Contrast (AAA) | ≥ 7:1 chip text against background                            | Theme tokens — same approach as `KjBadge`. The `outline` / `ghost` variants tighten contrast on selection (`aria-pressed=true`) by switching to filled tone.               |
| 1.4.11 Non-text Contrast       | The remove `×` glyph and selection focus ring ≥ 3:1               | Theme tokens; verify in the `xs` variant when added.                                                                                                                         |
| 2.1.1 Keyboard                 | Every interactive shape reachable / operable via keyboard         | Removable: `<button>` is native. Selectable: `tabindex="0"` + `Space`/`Enter` host listeners. Container: `KjRovingTabindex`.                                                |
| 2.1.2 No Keyboard Trap         | Tab leaves the tag / list when no further chips are focusable     | Roving tabindex collapses the group to one tab stop; nothing wraps focus *out* of the document.                                                                              |
| 2.4.3 Focus Order              | Focus order after removal is predictable                          | After remove: focus the next chip in DOM order; if last, the previous; if list is empty, the container (with `tabindex="-1"` so it can receive focus then collapse to invisible). When standalone, focus is restored to the previously focused element via `KjFocusRestore` (a primitive used by Dialog already). |
| 2.4.7 Focus Visible            | Focus ring on chips and remove buttons                            | `KjFocusRing` composed on both `KjTag` (selectable mode only) and `KjTagRemove`.                                                                                             |
| 2.5.5 Target Size (AAA)        | Interactive area ≥ 44×44 CSS px                                   | The remove `<button>` is visually 16–20px (the `×` glyph) but its **hit area** is enlarged via padding to ≥ 44×44 at the tag's `md` size and a `pointer-events` overlay at `sm`. The toggle (selectable chip) hit area is the whole chip — already ≥ 44×40 at `md`. The `xs` size if/when added must opt out via the inline-text exception or accept WCAG 2.5.8 (Target Size — Minimum, AA, 24×24) as a compromise. |
| 4.1.2 Name, Role, Value        | Selectable chips announce as "{label}, button, pressed/not pressed" | Host-bind `role="button"` + `aria-pressed`; the projected text is the accessible name automatically.                                                                         |
| 4.1.3 Status Messages          | Removal is announced when chips are part of a form value          | When a chip removal originates inside `KjMultiSelect` / `KjCombobox`, the parent already posts a polite live-region announcement ("{label} removed") via `KjMultiSelectAnnouncer`. Standalone removal does **not** auto-announce — that would over-announce in the common decorative-list case; consumers wire `KjLiveRegion` if they need it. |

### Where each piece lives (directive vs. wrapper)

- **All `aria-*` and `role` attributes** on the **core directives**
  (`KjTag`, `KjTagRemove`, `KjTagList`).
- **`aria-label` for the remove button** has its **default value
  computed in the directive** from the parent's content, but the
  consumer-facing **override input** (`kjTagRemoveLabel`) is on the
  directive too — a different theme using `KjTagRemove` directly
  inherits both.
- **Wrapper** (`<kj-tag>`, `<kj-tag-remove>`, `<kj-tag-list>`) only
  adds the visual chrome (CSS), the `<button>` element when
  `kjTagSelectable` is true (host element rendered as `<button>`
  rather than `<span>` for richer affordance — but only in the
  wrapper; the bare directive stays element-agnostic), and the
  default remove icon (`×` glyph; theme-overridable).

## Composition model

```text
tag/
  tag.ts                ← KjTag (root; selectable / removable behaviours + KJ_TAG context)
  tag-remove.ts         ← KjTagRemove (child; selector [kjTagRemove], composes KjButton)
  tag-list.ts           ← KjTagList (optional container; provides KJ_TAG_LIST + roving tabindex)
  tag.context.ts        ← KjTagContext, KjTagListContext, KJ_TAG, KJ_TAG_LIST
  tag.spec.ts
  index.ts
```

Three directives, two injection tokens. The remove directive injects
`KJ_TAG`; the tag injects `KJ_TAG_LIST` *optionally* (so a standalone
tag works fine).

### `KjTag` (`[kjTag]`)

```ts
@Directive({
  selector: '[kjTag]',
  providers: [{ provide: KJ_TAG, useExisting: KjTag }],
  hostDirectives: [
    { directive: KjVariant, inputs: ['kjVariant'] },
    { directive: KjSize, inputs: ['kjSize'] },
    { directive: KjDisabled, inputs: ['kjDisabled: kjTagDisabled'] },
    { directive: KjFocusRing }, // only writes data-focus-visible when interactive
  ],
  host: {
    '[attr.role]': 'computedRole()',           // 'button' | 'option' | 'row' | null
    '[attr.tabindex]': 'computedTabindex()',   // 0 | -1 | null
    '[attr.aria-pressed]': 'computedPressed()',
    '[attr.aria-selected]': 'computedSelected()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-selected]': 'kjTagSelected() ? "" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(click)': 'onClick($event)',
    '(keydown.space)': 'onActivate($event)',
    '(keydown.enter)': 'onActivate($event)',
  },
})
```

The `computedRole()` / `computedTabindex()` / `computedPressed()` /
`computedSelected()` are `computed()` derivations that fold three
inputs (`kjTagSelectable`, `kjTagSelected`, projected `KJ_TAG_LIST`)
into a single attribute decision per attribute. This keeps the host
binding cheap and means each shape's a11y wiring is in one place,
read top-to-bottom.

### `KjTagRemove` (`[kjTagRemove]`)

```ts
@Directive({
  selector: '[kjTagRemove]',
  hostDirectives: [
    { directive: KjButton, inputs: ['kjAriaLabel: kjTagRemoveLabel'] },
  ],
  host: {
    'type': 'button',
    '[attr.aria-label]': 'effectiveLabel()',
    '(click)': 'tag.remove()',
  },
})
```

Reuses **`KjButton`** for: native `<button>` semantics, capture-phase
click suppression on `aria-disabled`, ARIA-disabled (focusable when
disabled), `KjFocusRing`. The `KjButton` composition is the single
source of truth for the remove control — there is no second
keyboard / a11y story to maintain.

`effectiveLabel()` is `computed(() => kjTagRemoveLabel() ??
'Remove ' + tag.textContent())`. The `tag.textContent()` is itself a
signal updated by a `MutationObserver` on the parent tag's projected
content (alternative: an explicit `kjTagLabel` input on `KjTag` that
the remove reads — see Q1).

### `KjTagList` — chip-group coordinator

Optional. Purely opt-in: standalone tags work without it.

```ts
@Directive({
  selector: '[kjTagList]',
  providers: [{ provide: KJ_TAG_LIST, useExisting: KjTagList }],
  hostDirectives: [
    KjRovingTabindex, // arrow-key navigation between registered chips
  ],
  host: {
    '[attr.role]': 'kjTagListRole()',                  // 'listbox' | 'grid' | 'group'
    '[attr.aria-orientation]': 'kjTagListOrientation()',
    '[attr.aria-multiselectable]': 'multiSelectable()',
  },
})
export class KjTagList {
  readonly kjTagListRole = input<'listbox' | 'grid' | 'group'>('group');
  readonly kjTagListOrientation = input<'horizontal' | 'vertical' | 'both'>('horizontal');
  readonly kjTagListMultiple = input<boolean>(false);
  readonly kjTagListWrap = input<boolean>(true);

  readonly multiSelectable = computed(() =>
    this.kjTagListRole() === 'listbox' && this.kjTagListMultiple() ? 'true' : null,
  );

  // Internal chip registry; KjTag injects KJ_TAG_LIST and registers itself in
  // its constructor with destroyRef cleanup. Removal updates the registry and
  // the roving tabindex's active index.
  register(tag: KjTagContext): void { /* … */ }
  unregister(tag: KjTagContext): void { /* … */ }
  focusNextAfterRemoval(removed: KjTagContext): void { /* … */ }
}
```

When `KjTag` is inside a `KjTagList`, its `computedRole()` reads:

```ts
computedRole = computed(() => {
  if (this.list?.role() === 'listbox') return 'option';
  if (this.list?.role() === 'grid') return 'row'; // chip becomes a row of two gridcells
  if (this.kjTagSelectable()) return 'button';
  return null;
});
```

The chip's role is **container-determined first**, falling back to
selectable-button when standalone, falling back to nothing
(decorative) otherwise. This is the Material insight; we just don't
require the consumer to switch component classes to express it.

### Reused primitives

| Primitive                | Where                                         | Why                                                                                                                 |
| ------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `KjVariant`              | `hostDirectives` on `KjTag`                   | Shared preset routing; same preset list as `KjBadge`.                                                                |
| `KjSize`                 | `hostDirectives` on `KjTag`                   | Shared sizing; touch-target enforcement in CSS.                                                                       |
| `KjDisabled`             | `hostDirectives` on `KjTag`                   | ARIA-disabled (focusable) + click-suppression; aliased input `kjTagDisabled`.                                         |
| `KjFocusRing`            | `hostDirectives` on `KjTag` (interactive only) and `KjTagRemove` (via `KjButton`) | Shared keyboard focus-visible signal.                                                                                 |
| `KjButton`               | `hostDirectives` on `KjTagRemove`             | The remove control is a button. Re-using `KjButton` gets us native button semantics, ARIA-disabled, capture-phase click suppression, focus ring, and the `kjAriaLabel` enforcement-friendly input — none of which the chip should re-implement. |
| `KjRovingTabindex`       | `hostDirectives` on `KjTagList`               | Arrow-key navigation across registered chips. Used the same way as in `KjAccordion` (when arrow-nav is opted in) and `KjTabs`. |
| `KjFocusRestore` (planned, used by `KjDialog`) | inside `KjTagRemove.tag.remove()` callback | When a removable standalone tag is dismissed and no `KjTagList` exists, the previously focused element gets focus back. |

### Cross-component pointers

- [`badge.md`](./badge.md) — non-interactive sibling. Same chrome,
  different ARIA story. **Do not** alias `KjBadge` to `KjTag`; they
  diverge once interactivity exists, and the rendering element
  (`<span>` for both, but with different role / tabindex stories)
  must stay separate.
- [`../data-input/multi-select.md`](../data-input/multi-select.md) —
  the **canonical input-chip consumer**. Its trigger renders a
  default chip template via
  `<span kjTag><span>{{label}}</span><button kjTagRemove>×</button></span>`.
  The trigger does **not** wrap the chips in a `KjTagList` —
  `KjMultiSelectTrigger` is itself a `combobox` and handles keyboard
  / chip focus (Backspace-at-position-0, see Q4). Tag's role inside
  the trigger is purely visual + removal callback wiring.
  **Reconciliation:** the `KjChip` / `KjChipRemove` references in
  multi-select.md (lines ~229, 252, 254) must be rewritten to
  `KjTag` / `KjTagRemove` when that file is next touched.
- [`../data-input/combobox.md`](../data-input/combobox.md) — same
  reconciliation: the chips inside `[kjComboboxMulti]`'s trigger are
  `KjTag` / `KjTagRemove`. The "tags input" UX pattern
  (Backspace-at-position-0 removes last chip; Enter/comma adds a
  free-text chip) lives in **`KjCombobox`**, not in `KjTag` —
  Combobox owns the input and the value-list editing; Tag is the
  per-chip rendering / removal.
- [`../data-input/field.md`](./../data-input/field.md) — when chips
  are the value of a form control (multi-select trigger,
  tags-input combobox), `KjField` labels the **container** (the
  combobox / multi-select trigger), not the individual chips. The
  chips inherit the field's accessible name implicitly via being
  *inside* the labelled control. This means `KjTagList` does **not**
  need to register with `KjField` directly.
- [`../actions/button.md`](./../actions/button.md) — `KjTagRemove`
  composes `KjButton` and inherits everything documented there
  (ARIA-disabled, capture-phase click suppression, `kjAriaLabel`
  enforcement). Any future improvement to `KjButton`'s a11y
  contract automatically benefits the remove button.

## Inputs / Outputs / Models

All public bindings `kj`-prefixed.

### `KjTag` (`[kjTag]`)

| Name                  | Kind     | Type                                                | Default     | Notes                                                                                                                              |
| --------------------- | -------- | --------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `kjVariant`           | `input`  | preset string (validated against `KJ_TAG_CONFIG`)   | `'default'` | Forwarded to `KjVariant`. Same preset list as Badge.                                                                                |
| `kjSize`              | `input`  | preset string (validated against `KJ_TAG_CONFIG`)   | `'md'`      | Forwarded to `KjSize`.                                                                                                              |
| `kjTagDisabled`       | `input`  | `boolean`                                           | `false`     | Forwarded to `KjDisabled` as `kjDisabled`.                                                                                          |
| `kjTagSelectable`     | `input`  | `boolean`                                           | `false`     | Enables toggle-button behaviour.                                                                                                    |
| `kjTagSelected`       | `model`  | `boolean`                                           | `false`     | Two-way bindable. Field-typed `ModelSignal<boolean>` to avoid the `model<boolean | undefined>` ng-packagr d.ts issue.               |
| `kjTagLabel`          | `input`  | `string \| undefined`                               | `undefined` | Optional explicit label for the remove button to read. When set, takes precedence over `MutationObserver`-derived text content (see Q1). |
| `(kjTagSelectedChange)` | (auto)  | —                                                   | —           | From `model()`.                                                                                                                     |
| `(kjTagRemoved)`      | `output` | `void`                                              | —           | Fired by `KjTagRemove` upward through `KJ_TAG`.                                                                                     |

### `KjTagRemove` (`[kjTagRemove]`)

| Name                | Kind    | Type                  | Default     | Notes                                                                                                          |
| ------------------- | ------- | --------------------- | ----------- | -------------------------------------------------------------------------------------------------------------- |
| `kjTagRemoveLabel`  | `input` | `string \| undefined` | `undefined` | Override the auto-generated `aria-label`. Aliased through to `KjButton.kjAriaLabel`.                            |

No outputs — the remove event is emitted by the parent tag. This
keeps consumers from having to listen on a child for behaviour they
think of as belonging to the chip.

### `KjTagList` (`[kjTagList]`)

| Name                       | Kind    | Type                                              | Default        | Notes                                                                                                |
| -------------------------- | ------- | ------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------- |
| `kjTagListRole`            | `input` | `'listbox' \| 'grid' \| 'group'`                  | `'group'`      | Drives chip role + container ARIA.                                                                    |
| `kjTagListMultiple`        | `input` | `boolean`                                         | `false`        | Only meaningful when `role === 'listbox'`. Drives `aria-multiselectable`.                              |
| `kjTagListOrientation`     | `input` | `'horizontal' \| 'vertical' \| 'both'`            | `'horizontal'` | Forwarded to `KjRovingTabindex`.                                                                       |
| `kjTagListWrap`            | `input` | `boolean`                                         | `true`         | Wrap arrow-key navigation at the ends.                                                                  |
| `(kjTagListRemoved)`       | `output`| `{ index: number }`                               | —              | Aggregated removal event with the chip's index in registration order. Convenience for higher-level consumers. |
| `(kjTagListSelectionChange)` | `output`| `ReadonlySet<number>`                            | —              | Only when `role === 'listbox'`. Aggregated selected indices.                                            |

### Wrapper inputs (components package)

| Element             | Input                  | Maps to                    |
| ------------------- | ---------------------- | -------------------------- |
| `<kj-tag>`          | `kjVariant`            | `KjTag.kjVariant`          |
| `<kj-tag>`          | `kjSize`               | `KjTag.kjSize`             |
| `<kj-tag>`          | `kjTagDisabled`        | `KjTag.kjTagDisabled`      |
| `<kj-tag>`          | `kjTagSelectable`      | `KjTag.kjTagSelectable`    |
| `<kj-tag>`          | `kjTagSelected`        | `KjTag.kjTagSelected` (2-way) |
| `<kj-tag>`          | `kjTagLabel`           | `KjTag.kjTagLabel`         |
| `<kj-tag-remove>`   | `kjTagRemoveLabel`     | `KjTagRemove.kjTagRemoveLabel` |
| `<kj-tag-list>`     | `kjTagListRole`        | `KjTagList.kjTagListRole`  |
| `<kj-tag-list>`     | `kjTagListMultiple`    | `KjTagList.kjTagListMultiple` |
| `<kj-tag-list>`     | `kjTagListOrientation` | `KjTagList.kjTagListOrientation` |
| `<kj-tag-list>`     | `kjTagListWrap`        | `KjTagList.kjTagListWrap`  |

The `<kj-tag>` wrapper conditionally renders its host as `<button>`
(when `kjTagSelectable()` is true) or `<span>` (otherwise) via a
`@switch` over a tiny shadow template. The directive layer stays
element-agnostic — the wrapper picks the right element so the
default-built-in semantics (button vs. span) match the role we
declare via host bindings.

## Examples to ship

1. **Decorative tags** (`tag.example.ts`) — a row of `<kj-tag>` per
   variant. Visually anchors the chrome and confirms parity with
   Badge.
2. **Removable tag** (`tag.removable.example.ts`) — a list of
   removable tags as a controlled `signal<string[]>`. Demonstrates
   `(kjTagRemoved)`, the auto-derived `aria-label`, and focus
   restoration on remove.
3. **Selectable / filter chips** (`tag.selectable.example.ts`) —
   `<kj-tag-list kjTagListRole="listbox" [kjTagListMultiple]="true">`
   wrapping seven `<kj-tag kjTagSelectable [(kjTagSelected)]>` for a
   "filter by tag" UI. Demonstrates roving tabindex,
   `aria-pressed` / `aria-selected` interplay, `Ctrl+A` select-all.
4. **Single-select chips** (`tag.single-select.example.ts`) —
   `<kj-tag-list kjTagListRole="listbox">` (no `multi`). Radio-like
   semantics with `aria-selected="true"` on exactly one chip.
5. **Tags inside a Multi Select** — already covered by Multi Select
   examples; cross-link from this file's docs page.
6. **Tags input via Combobox** — already covered by Combobox
   examples; cross-link from this file's docs page.
7. **Disabled state** (`tag.disabled.example.ts`) — disabled
   selectable + disabled removable. Verifies focusable-disabled and
   that activation is suppressed.
8. **Custom remove icon** (`tag.custom-remove.example.ts`) — shows
   the consumer projecting an `<svg>` icon inside `<kj-tag-remove>`
   instead of the default `×` glyph. Confirms a11y stays intact.
9. **Avatar + label** (`tag.avatar.example.ts`) — `<kj-avatar>` +
   text + remove button inside a single tag, exercising the multi-slot layout.
10. **Configured presets** (`tag.configured.example.ts`) —
    `provideKjTag({ variants: [...defaults, 'brand'] })`.
11. **Themed (core-only)** — `tag.example.ts`,
    `tag.retro.example.ts`, `tag.finance.example.ts` under
    `packages/core/`. Confirms the headless directives work under
    arbitrary theme CSS.

## Open questions / risks

1. **Source of the auto-`aria-label` for `KjTagRemove`.** Three
   options:
   - **(a) `MutationObserver`** on the parent tag's projected content,
     reading `textContent` and writing it into `effectiveLabel()`.
     Fully automatic but observer cost on every text change.
   - **(b) Explicit `kjTagLabel` input on `KjTag`.** Consumer-supplied;
     cheap; requires the consumer to repeat the visible text. Awkward
     when the tag's label is dynamic interpolation.
   - **(c) `aria-describedby` from the remove button to a hidden span
     inside the tag.** Removes the duplication problem entirely (the
     SR reads the visible label); requires us to mint a stable id per
     tag.
   **Recommendation:** ship **(a)** as the default with **(b)** as
   an override. (c) is appealing but requires every tag to host a
   hidden labelling span, which complicates the wrapper template.
   Revisit if (a) creates measurable observer churn in tag-heavy
   pages.

2. **Selectable chip role: `button` vs. `option`.** When a chip is
   selectable but **not** inside a `KjTagList`, what role wins?
   APG's "toggle button" pattern uses `role="button"` +
   `aria-pressed`; APG's "single-select listbox" uses
   `role="option"` + `aria-selected`. Standalone selectable chips
   without a container will not announce as part of a group.
   **Decision:** standalone selectable chip = `role="button"` +
   `aria-pressed`. The "group of selectable chips" semantics
   require `KjTagList[role="listbox"]`. Document explicitly.

3. **Listbox option chips with remove buttons.** APG's listbox
   pattern does not contemplate per-option destructive buttons —
   nested interactives inside `role="option"` are technically
   forbidden. Material's solution is `role="grid"` (with rows of
   gridcells) for input chips, `role="listbox"` (no remove button)
   for selectable chips. Plan: **enforce in dev mode** that a
   chip with `[kjTagRemove]` projected cannot live inside a
   `KjTagList[role="listbox"]` — the only legal containers are
   `'group'` (no group keyboard) or `'grid'` (gridcell rules apply).
   Console warning in dev; runtime selectivity not changed.

4. **Backspace-at-position-0 for input chips.** Lives on the
   container — for the multi-select / combobox trigger, the
   `<input>` (combobox) or trigger button (multi-select) catches
   `keydown.backspace` and removes the last chip from the value
   model when the caret is at position 0 (or the trigger is empty).
   `KjTag` and `KjTagList` do **not** implement this — it belongs
   to the input owner because it depends on the input's caret /
   selection state. Cross-reference enforced by docs in
   multi-select.md and combobox.md.

5. **Edit-mode for input chips (Material's `MatChipRow.editable`).**
   Material lets users press `F2` on a chip to edit its label
   in-place. Out of scope for v1 — adds an entire input-mode
   substate to a directive that should be small. If consumers need
   it, ship a recipe that swaps the chip for an `<input>` on click.
   Revisit when a real consumer asks.

6. **`tabindex="-1"` on the container when empty.** When all chips
   are removed and the last-focused chip is gone, focus should land
   somewhere predictable. We move focus to the container itself
   (`KjTagList`) and rely on its `tabindex="-1"` to allow programmatic
   focus. The container then visually collapses to nothing (no chips)
   but remains in the DOM. **Risk:** AT may announce "empty list"
   awkwardly — verify with NVDA + JAWS before locking. Fallback:
   if `KjTagList` has no chips, move focus to the previously
   focused element via `KjFocusRestore`.

7. **`KjButton`'s `aria-pressed` model conflicts with `KjTag`.**
   `KjButton` already exposes a `kjPressed` model (tri-state). If
   a consumer types `<button kjButton kjTag>` (composing both),
   both bindings attempt to write `aria-pressed`. **Decision:**
   `KjTag` does not compose `KjButton` on the chip itself
   (composition is on `KjTagRemove` only). The chip is a `<span>`
   with `role="button"` host-bound. This matches Multi Select's
   `<button kjMultiSelectTrigger>` choice for the *trigger* (which
   is a button) but keeps the chip as a span. Document the rule:
   **don't add `kjButton` to `kjTag` directly**; if you need a
   button-shaped chip, use the wrapper which already picks the
   right element.

8. **Focus-after-removal in lists.** When a chip is removed mid-list,
   we move focus to the next chip in DOM order; if removed at the
   end, the previous; if last chip removed, the container itself
   (with `tabindex="-1"`). Implemented in `KjTagList.focusNextAfterRemoval()`.
   Standalone removable tags (no container) restore focus to the
   previously focused element via `KjFocusRestore`. **Risk:** the
   "previously focused element" may itself be unmounted (rare —
   imagine a tag whose remove also closes its parent dialog).
   `KjFocusRestore` should fall back to `<body>` in that case
   (existing behaviour in Dialog).

9. **`KjTagList` focus when no chips registered yet.** Race
   condition during initial render — the list is mounted before its
   children. `KjRovingTabindex` already handles the empty-registry
   case (no-op); verify when first chip registers, the roving
   primitive correctly elevates it to `tabindex="0"`. Existing
   behaviour in Tabs / Accordion (when arrow-nav is enabled) suggests
   this is fine; spec explicitly.

10. **Touch-target enforcement at `sm` size.** The chip's trailing
    remove button is small (a `×` glyph). At `sm` size, the visual
    glyph is ~14px; the hit area must reach 44×44 via padding. Two
    options: (a) enlarge via padding, which inflates the chip's
    visible footprint at `sm`; (b) use a `pointer-events`-overlay
    pseudo (`::after`) that extends the hit area beyond the visible
    button. **Recommendation:** ship (b) — keeps the chip visually
    small while honouring 2.5.5. Verify the overlay does not eat
    clicks targeted at neighbouring chips when chips are tightly
    packed (use a `transform: translate` rather than absolute
    overflow).

11. **`role="grid"` on `<kj-tag-list>` requires a table-shaped DOM.**
    APG specifies `role="grid"` works with `<table>` semantics
    (`<tr>`, `<td>`). Material's `MatChipGrid` uses
    `<div role="grid">` with `<div role="row">` / `<div role="gridcell">`
    — non-table DOM with explicit roles is permitted. We follow
    Material: when `kjTagListRole="grid"`, the list is a `<div>` and
    its chips are `<span role="row">` containing `<span role="gridcell">`s.
    The wrapper `<kj-tag-list>` picks the host element accordingly.
    Risk: heavy host-binding logic on `KjTag` to mint two virtual
    `gridcell` children when in grid mode. Plan: project a small
    structural directive (`*kjTagGridLabel`, `*kjTagGridRemove`)
    that the wrapper applies internally — keeps the consumer-facing
    template the same as the listbox case (`<kj-tag>…<kj-tag-remove>`
    is what they write; the wrapper rearranges the DOM).

12. **Variant parity with Badge.** Badge is a sibling — the visual
    chrome must match exactly so a "tag" and a "badge" with the
    same `kjVariant="info"` look identical in non-interactive
    contexts. **Plan:** share the preset configuration object
    between `KJ_BADGE_CONFIG` and `KJ_TAG_CONFIG` (or have one
    extend the other). Keep `provideKjTag(...)` separate so themes
    can override per-component if they want, but the **defaults**
    are identical. Risk: drift if Badge ships variants Tag does
    not (e.g. a "dot" variant for Badge that makes no sense for
    a removable Tag). Document explicitly which variants are
    Badge-only vs. shared.

13. **Public `KjTagContext`.** The injection token interface needs
    `textContent: Signal<string>`, `remove(): void`, and
    `selected: Signal<boolean>` so `KjTagRemove` and any
    external child directive can read them. Keep the surface
    minimal — the more fields we expose, the harder it is to
    swap implementations. Mirror what `KJ_ACCORDION_ITEM` does
    in size (3–4 properties).

14. **Disabled propagation from list to chips.** If
    `<kj-tag-list>` becomes disabled (e.g. inside a disabled form
    field), should every chip auto-disable? Material says yes;
    PrimeNG has no concept. **Decision:** add a `kjTagListDisabled`
    input that flows down through `KJ_TAG_LIST.disabled` signal;
    each chip's effective disabled is `kjTagDisabled() ||
    list?.disabled() ?? false`. Cheap, matches Material, and
    avoids consumers having to bind `kjTagDisabled` on every chip
    when they really mean "the whole control is disabled".

15. **Will Multi Select's chip rendering need a *non-removable*
    chip flavour?** When a chip in the multi-select trigger
    represents a permanent / required tag (e.g. an
    "always-included" filter), the user should see it but not be
    able to dismiss it. This is just `<kj-tag>` without a
    projected `<kj-tag-remove>`. No new API needed — flagged here
    so the Multi Select template-projection contract supports it
    (it does, by virtue of being a template with full chip
    control).

16. **SSR / hydration.** The `MutationObserver` for auto-`aria-label`
    must be guarded with `isPlatformBrowser(inject(PLATFORM_ID))`
    and instantiated inside `afterNextRender()`. SSR-rendered tags
    work without the observer; once hydration completes, the
    observer attaches and replaces any consumer-provided
    `kjTagLabel` only when the latter is unset. No flicker risk
    because SSR snapshots include the `aria-label` from the
    initial server-side text content (we compute it on the server
    via a one-shot read, no observer needed).

17. **Reuse vs. extract `KjGroupRemoval` primitive.** Multi Select's
    "remove an item, focus moves to neighbour" is the same code as
    `KjTagList.focusNextAfterRemoval`. Tabs' "close a tab"
    behaviour (when Tabs gains close support, see
    [`../navigation/tabs.md`](../navigation/tabs.md)) is also the
    same. **Decision:** keep the logic inside `KjTagList` for v1.
    Extract a `primitives/interaction/group-removal.ts` helper
    once we have three consumers. Premature extraction adds an
    indirection without payoff.
