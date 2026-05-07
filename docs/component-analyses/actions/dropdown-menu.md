# Dropdown Menu

A **Dropdown Menu** is a trigger-anchored menu opened from a clickable element
(typically a `<button>`), rendered as a floating panel positioned next to the
trigger. It is distinct from the inline [`KjMenu`](../navigation/menu.md), which
can sit statically in document flow (e.g. inside a sidebar or as a vertical
list). The dropdown menu adds: anchor-relative positioning, click-outside
dismissal coordinated with the trigger, focus restoration, item types
(checkbox/radio/separator/group/submenu), submenu nesting, and a richer
keyboard contract than the existing `KjMenu`.

This file resolves the central design question raised in the brief — **is this
a separate directive family, or does it reuse `KjMenu` plus a new
`KjDropdownMenuTrigger`?** See [Decision](#decision-core-directive). Spoiler:
we extend `KjMenu` into a full menu primitive family and add a
`KjDropdownMenuTrigger` directive that anchors a menu panel to a trigger
button; the existing `KjMenu` is generalised, not replaced.

## Source comparison

### PrimeNG — `<p-menu popup="true">` and `<p-menubar>`

PrimeNG's closest analogue to a dropdown menu is `<p-menu>` in popup mode
(<https://primeng.org/menu>), opened imperatively via a `MenuItem` array and a
trigger that calls `menu.toggle($event)`. `<p-menubar>`
(<https://primeng.org/menubar>) is the multi-root version with its own
submenus.

Public API surface (PrimeNG 17/18 `p-menu` in popup mode):

| Input               | Notes                                                                            |
| ------------------- | -------------------------------------------------------------------------------- |
| `model`             | `MenuItem[]` — label, icon, `routerLink`, `command()`, `disabled`, nested `items`. |
| `popup`             | `boolean` — switches between inline and dropdown rendering.                       |
| `appendTo`          | `'body' \| ElementRef \| string` — escape clipping containers.                    |
| `autoZIndex`        | `boolean`.                                                                        |
| `baseZIndex`        | `number`.                                                                         |
| `showTransitionOptions` / `hideTransitionOptions` | Anim string (e.g. `'.12s cubic-bezier(0, 0, 0.2, 1)'`).      |
| `tabindex`          | Integer.                                                                          |
| `ariaLabel` / `ariaLabelledBy` | Accessibility name forwarded to the panel.                            |
| `id`                | Manually assignable; otherwise auto.                                              |

| Output              | Notes                                                                            |
| ------------------- | -------------------------------------------------------------------------------- |
| `onShow`            | Panel opened.                                                                     |
| `onHide`            | Panel closed.                                                                     |
| `onFocus` / `onBlur`| Panel focus crossings.                                                            |

Imperative API: `menu.toggle($event)`, `menu.show($event)`, `menu.hide()`. The
trigger is **not** declared via a directive — the consumer wires it manually
with a template ref:

```html
<button (click)="menu.toggle($event)" aria-haspopup="true">Actions</button>
<p-menu #menu [model]="items" popup="true" appendTo="body" />
```

Behaviour:

- `MenuItem.items` produces a nested submenu rendered as a flyout.
- Items may be `separator: true` (rendered `role="separator"`).
- No first-class checkable items; PrimeNG `MenuItem` has no
  `selected`/`role="menuitemcheckbox"` story. (`<p-tieredMenu>` and
  `<p-contextMenu>` add submenu polish but still no checkable role.)
- Arrow-key navigation, Home/End, Escape closes + restores focus to the
  invoking element are implemented inside the component.
- Type-ahead: yes (alphanumeric jumps to next item starting with that char).
- `appendTo="body"` is the recommended dodge for clipping containers; ARIA
  `aria-labelledby` on the panel must be wired by the consumer.

Critique:

- Data-driven (`MenuItem[]`) — same complaint as Speed Dial; no per-item
  template slots without escape hatches (`itemTemplate`).
- No `[kjDropdownMenuTriggerFor]`-style directive: trigger wiring is manual
  and easy to get wrong (`aria-haspopup`, `aria-controls`, focus restoration
  on `Esc`/blur are all consumer responsibility).
- No `menuitemcheckbox` / `menuitemradio` ARIA roles — fails some AAA review
  criteria for menus that toggle state.
- No submenu typeahead reset between roots/branches.

### Angular Material — `MatMenu` + `[matMenuTriggerFor]`

Material's dropdown menu (<https://material.angular.dev/components/menu>) is
the closest spiritual reference for kouji because its trigger pattern is the
one we'll mirror.

Public API surface:

| Class / directive             | Inputs / Methods                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------- |
| `MatMenu` (template `<mat-menu>`) | `xPosition: 'before' \| 'after'`, `yPosition: 'above' \| 'below'`, `overlapTrigger`, `hasBackdrop`, `backdropClass`, `panelClass`, `ariaLabel`, `ariaLabelledby`, `ariaDescribedby`, `classList`, `closed: EventEmitter<MenuCloseReason>` (`'click' \| 'keydown' \| 'tab' \| void`). |
| `[matMenuTriggerFor]`         | Takes a `MatMenu` reference; provides `openMenu()`, `closeMenu()`, `toggleMenu()`, `menuOpen: boolean`, plus `menuOpened: EventEmitter`, `menuClosed: EventEmitter`. Optional `[matMenuTriggerData]` for context. |
| `[mat-menu-item]`             | `disabled`, `disableRipple`, `role: 'menuitem' \| 'menuitemradio' \| 'menuitemcheckbox'` (input!). |

Behaviour worth lifting:

- **Trigger directive idiom.** `[matMenuTriggerFor]="menu"` is exactly the
  ergonomics we want. The directive sets `aria-haspopup`, `aria-expanded`,
  `aria-controls`, and the keyboard contract (Enter/Space/ArrowDown to open).
- **Submenu support.** Place a `[matMenuTriggerFor]` *inside* a `mat-menu`
  and Material wires it as a submenu (ArrowRight to open, ArrowLeft to close
  back to parent, hover-to-open with delay).
- **Focus restoration.** Closing the menu (Escape, click outside, item
  activation) returns focus to the trigger.
- **`role` is a per-item input.** Material exposes `role="menuitemcheckbox"`
  and `role="menuitemradio"` on `mat-menu-item` via the `role` input — but
  it does not own the checked state itself; the consumer manages it. Fine for
  a headless library, slightly under-specified for AAA.
- **Panel positioning** is CDK overlay-driven. `xPosition`/`yPosition` map to
  flexible position strategies. **kouji is no-CDK** — see
  [`rules/stack.md`](../../../rules/stack.md) — so we re-implement the anchor
  primitive ourselves (see [`feedback/popover.md`](../feedback/popover.md)).

Critique:

- Heavy CDK dependency: overlay, portal, a11y, scrolling. Out of bounds for
  kouji.
- `role`-as-input on the item conflates concerns; we'll split into
  `[kjMenuItemCheckbox]` and `[kjMenuItemRadio]` directives that own both the
  ARIA role *and* the `aria-checked` state binding.
- Submenu is keyboard-correct but the hover-open delay is a fixed magic
  number with no input.

### shadcn/ui — `DropdownMenu` (Radix)

shadcn's dropdown (<https://ui.shadcn.com/docs/components/dropdown-menu>) is
a Radix UI re-skin. Radix's compound-component shape is the template for
checkable items, groups, and submenus that we will closely follow:

```tsx
<DropdownMenu>
  <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>Account</DropdownMenuLabel>
    <DropdownMenuItem>Profile</DropdownMenuItem>
    <DropdownMenuCheckboxItem checked={…} onCheckedChange={…}>Show toolbar</DropdownMenuCheckboxItem>
    <DropdownMenuRadioGroup value={…} onValueChange={…}>
      <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
    <DropdownMenuSeparator />
    <DropdownMenuGroup>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuItem>Sub 1</DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </DropdownMenuGroup>
  </DropdownMenuContent>
</DropdownMenu>
```

Surface worth lifting:

- **Distinct components for distinct ARIA roles.** Item / CheckboxItem /
  RadioItem / Separator / Label / Group / Sub. No `role`-as-input
  conflation. Each compound holds its own ARIA contract.
- **Two-way bindable checked / value.** `onCheckedChange`,
  `onValueChange` — maps cleanly to Angular signal `model()`.
- **Sub-menu primitives.** `DropdownMenuSub` + `SubTrigger` + `SubContent`
  is a separate scope inside the parent, with its own context. We'll mirror
  this scope-nesting.
- **Modality.** Radix's `modal` prop (default `true`) traps focus and blocks
  outside interactions. For kouji we expose `kjModal` on the menu root and
  default it to `false` (matches Material; menus are typically non-modal —
  modal-trapping a list of actions surprises power users).
- **`Label` vs. `Group` semantics.** `DropdownMenuLabel` is a non-interactive
  group heading (`role="presentation"` with text styled), while `Group` is a
  `role="group"` wrapper that the label labels via `aria-labelledby`. We
  adopt the same split.

Critique:

- React-only (Radix). Behaviour patterns transfer; code does not.
- `<button>` vs. `<div role="menuitem">` is a Radix choice we will
  contradict — kouji items are real `<button>` elements (AAA stance from
  `KjButton`).

### Cross-library summary

|                          | PrimeNG `p-menu popup` | Material MatMenu     | shadcn (Radix)        | kouji direction                          |
| ------------------------ | ---------------------- | -------------------- | --------------------- | ---------------------------------------- |
| Trigger wiring           | manual (`#menu` + `(click)="menu.toggle($event)"`) | `[matMenuTriggerFor]` directive | `<DropdownMenuTrigger>` compound | **`[kjDropdownMenuTriggerFor]` directive** |
| Items                    | `MenuItem[]` data      | template + `[mat-menu-item]` | per-role compounds | **per-role directives**, content-projected |
| Checkable items          | none                   | role-as-input        | dedicated compounds   | `[kjMenuItemCheckbox]`, `[kjMenuItemRadio]` (+ `[kjMenuRadioGroup]`) |
| Separator                | `MenuItem.separator`   | `<mat-divider>` alongside | `<DropdownMenuSeparator>` | `[kjMenuSeparator]`                  |
| Group / label            | section header in data | `<mat-menu-item disabled>` workaround | `Group` + `Label` | `[kjMenuGroup]` + `[kjMenuLabel]`     |
| Submenus                 | nested `MenuItem.items`| `[matMenuTriggerFor]` inside | `Sub` compound       | nested `[kjDropdownMenuTriggerFor]` reusing root machinery |
| Anchored positioning     | CDK overlay            | CDK overlay          | Floating UI           | **kouji's own anchor primitive** (see Popover) |
| Modality                 | non-modal              | non-modal            | modal default         | non-modal default; `kjModal` opt-in     |
| Focus restoration        | yes                    | yes                  | yes                   | yes (mandatory for AAA)                  |
| Click-outside dismissal  | yes                    | yes                  | yes                   | yes                                      |
| Type-ahead               | yes                    | yes                  | yes                   | yes (existing `KjMenu` matcher reused)   |
| Item roles               | `menuitem` only        | role-as-input        | dedicated             | dedicated directives, real ARIA roles    |
| Touch open               | tap                    | tap                  | tap; long-press for context menu | tap; long-press deferred to Context Menu |

## Decision (core directive?)

**Yes — extend the `KjMenu` family rather than ship a parallel directive
tree.** The composition is:

| Directive                         | Role                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| `[kjMenu]` (existing, generalised) | Root menu container. Owns `open` signal, `triggerEl`, `modal`, item-activation policy. Provides `KJ_MENU` context. Keeps inline-mode capability.                                  |
| `[kjMenuContent]` (existing, hardened) | Panel host. Owns roving tabindex, type-ahead, Esc, click-outside, focus restoration. Adds `data-side` / `data-align` reflection so the wrapper can position. |
| `[kjMenuItem]` (existing)         | `role="menuitem"` button. Closes parent menu on activation unless inside a submenu (where a sub-trigger overrides). |
| `[kjMenuItemCheckbox]` (new)      | `role="menuitemcheckbox"` button with `kjChecked: model<boolean>`.                          |
| `[kjMenuItemRadio]` (new)         | `role="menuitemradio"` button with a `kjValue: input<unknown>`. Coordinates via parent `[kjMenuRadioGroup]`. |
| `[kjMenuRadioGroup]` (new)        | Owns `kjValue: model<unknown>`. Sets `role="group"`; children inject the group context.     |
| `[kjMenuGroup]` (new)             | Plain `role="group"` wrapper, optional `aria-labelledby` to a `[kjMenuLabel]` id.           |
| `[kjMenuLabel]` (new)             | `role="presentation"` heading text. Auto-generates an id consumed by the wrapping group.    |
| `[kjMenuSeparator]` (new)         | `role="separator"` non-focusable divider.                                                   |
| `[kjDropdownMenuTriggerFor]` (new) | Trigger directive that anchors and opens a `KjMenu`. Wires `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`. Owns the keyboard-to-open contract (Enter/Space/ArrowDown/ArrowUp). |

### Why extend `KjMenu` rather than add a parallel `KjDropdownMenu` family

The brief's central question — "is this a separate directive, or `KjMenu` +
a `KjDropdownMenuTrigger`?" — hinges on whether the menu *body* differs
between inline and dropdown modes. It does not, in any AAA-meaningful way:

- The `role="menu"` panel, items, navigation, type-ahead, Esc-to-close, and
  focus management are **identical** between inline and dropdown menus.
- The only differences are: (a) **anchored positioning** (dropdown only) and
  (b) **trigger wiring + focus restoration on close** (dropdown only). Both
  are concerns of the *trigger* directive plus a tiny bit of `KjMenuContent`
  (data-side reflection, restoration target).
- Maintaining two directive families would force divergence on item types
  (`KjMenuItemCheckbox` vs. `KjDropdownMenuItemCheckbox`) for no semantic
  gain — it just doubles the public API and the wrapper variants.

The existing `[kjMenuTrigger]` (which lives *inside* `[kjMenu]` and toggles
its parent's state) is **kept** for the inline use case (e.g. a sidebar with
a collapsible submenu), but is no longer the preferred dropdown idiom — that
is `[kjDropdownMenuTriggerFor]`, which sits on a button outside the menu's
DOM.

### Why `[kjDropdownMenuTriggerFor]` (Material idiom) over a context token

We considered three trigger patterns:

1. **Material idiom.** `[kjDropdownMenuTriggerFor]="menu"` on a button,
   pointing to a `<ng-template>` or to a `KjMenu` reference. The template
   gets stamped via overlay primitive when opened.
2. **Context-token nesting.** Wrap trigger + content in a `[kjDropdownMenu]`
   container (like the existing `[kjMenu]` shape, but the content is
   teleported). Trigger and content infer each other from the `KJ_MENU`
   context.
3. **Compound shadcn idiom.** Trigger and content are siblings inside a
   `[kjDropdownMenu]` parent, content is teleported via overlay primitive
   when the menu opens.

We choose **option 1**. Reasons:

- **DOM hierarchy reflects logic.** The trigger sits where the user clicks;
  the menu template is referenced by id — there is no expectation that the
  menu DOM be a sibling of the trigger. This avoids the structural lie of
  declaring `<button>…<menu>` as siblings when the menu is teleported to a
  different layer.
- **Reuse of `KjMenu` as the panel.** The template stamped by the trigger is
  literally `<div *kjMenu …>`; the trigger directive does **not** introduce
  a parallel container directive. Composition stays coherent with the inline
  menu shape (and with Speed Dial, which already builds its own
  trigger/content/action triple).
- **Cross-component consistency with the future Tooltip and Popover.** Both
  Tooltip and Popover will likely converge on a `[kjXTriggerFor]` shape; we
  start that pattern here.
- **Bundle locality.** A consumer who only uses inline `[kjMenu]` (e.g. a
  vertical sidebar nav) doesn't pay for the dropdown's overlay/anchor logic
  — the trigger directive is the gate.

The cost: there is duplication between `[kjMenuTrigger]` (inline) and
`[kjDropdownMenuTriggerFor]` (dropdown) for the `aria-haspopup` /
`aria-expanded` / `aria-controls` host bindings. We accept this; both stay
small. A future `KjPopupTrigger` primitive (flagged in
[Speed Dial Open Questions](./speed-dial.md#open-questions--risks)) can
absorb both once we have a third consumer (Tooltip likely).

## Base features

- **Open behaviour:** click toggles; Enter/Space on focused trigger opens and
  moves focus to the first item; ArrowDown opens and focuses the first item;
  ArrowUp opens and focuses the last item.
- **Close behaviour:** Esc closes and restores focus to the trigger; click
  outside closes (no focus restoration — natural focus follows the click);
  Tab closes (matches Material — Tab from inside the menu lets natural focus
  flow continue, with `closed` event emitting `'tab'`); item activation
  closes (unless it is a checkbox/radio item — those keep the menu open by
  default, configurable via `kjCloseOnSelect`).
- **Anchored positioning:** `kjSide: 'top' | 'right' | 'bottom' | 'left'`
  (default `'bottom'`) and `kjAlign: 'start' | 'center' | 'end'` (default
  `'start'`). Reflected as `data-side` / `data-align` on the panel — the
  wrapper handles the positioning math via CSS anchor positioning or a
  shared `KjAnchor` primitive (cross-reference
  [`feedback/popover.md`](../feedback/popover.md)). Core directive does **no**
  positioning. `kjOffset: number` and `kjAvoidCollisions: boolean` (default
  `true`) inputs are reflected for the anchor primitive to consume.
- **Item types:** plain item, checkbox, radio (inside a radio group),
  separator, group, label. All are projected as content; the menu does not
  consume a `model: MenuItem[]` array.
- **Submenus:** nesting `[kjDropdownMenuTriggerFor]` inside a
  `[kjMenuContent]` produces a submenu. The nested trigger:
  - Opens on ArrowRight (root direction-aware via `dir="rtl"` flips),
    Enter/Space, hover after `kjSubmenuOpenDelayMs` (default `100`).
  - Closes on ArrowLeft (or `dir="rtl"` ArrowRight), Escape (which only
    closes the submenu, not the root), or focus-leaving the submenu chain.
  - Provides `aria-haspopup="menu"`, `aria-expanded`, `aria-controls` like
    the root trigger.
- **Type-ahead:** the existing `KjMenu` matcher handles printable characters;
  we extend it to (a) reset typeahead buffer on focus crossing into a
  submenu, and (b) ignore separators/labels.
- **Modality:** `kjModal: input<boolean>(false)`. When `true`, mounts a
  scrim and traps focus via `KjFocusTrap`. Default `false` — see Decision.
- **Disabled items:** `KjDisabled` host directive on each item directive.
  Capture-phase click swallowing matches `KjButton`. Disabled items are
  skipped by arrow navigation but still reachable by typeahead (matches
  Material; debatable — see Open Questions).
- **`kjCloseOnSelect`:** input on the menu root. `true` (default) for plain
  items; checkbox/radio items override to `false` per their own input. Per-
  item override available via `[kjCloseOnSelect]` on the item directive.
- **Variant / Size:** `KjVariant` / `KjSize` host directives on each item
  directive (mirrors `KjButton`). Panel itself takes a `kjPanelClass` for
  consumer-driven styling, but no variant — variants live on the items.
- **Trigger composition:** `[kjDropdownMenuTriggerFor]` does **not**
  hostDirective `KjButton`. It is intended to sit on whatever the consumer
  put the trigger on (commonly `<button kjButton>`). The trigger directive
  adds aria/keyboard wiring without claiming the button's own composition.

## Accessibility (WCAG 2.1 AAA)

### Roles

| Element                              | Role                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------ |
| `[kjMenu]` (root)                    | none (state container)                                                                     |
| `[kjDropdownMenuTriggerFor]`         | implicit `button` (host element should be `<button type="button">`)                        |
| `[kjMenuContent]`                    | `menu`                                                                                      |
| `[kjMenuContent]` inside a submenu   | `menu` (same role; nesting is conveyed by `aria-haspopup` on the parent item)               |
| `[kjMenuItem]`                       | `menuitem`                                                                                  |
| `[kjMenuItemCheckbox]`               | `menuitemcheckbox` + `aria-checked`                                                         |
| `[kjMenuItemRadio]`                  | `menuitemradio` + `aria-checked`                                                            |
| `[kjMenuRadioGroup]`                 | `group`                                                                                     |
| `[kjMenuGroup]`                      | `group` (+ `aria-labelledby` if a label is present)                                         |
| `[kjMenuLabel]`                      | `presentation` (heading text consumed by `aria-labelledby`)                                  |
| `[kjMenuSeparator]`                  | `separator` + `aria-orientation="horizontal"` (default; vertical for menubar future-use)     |

### ARIA wiring

On `[kjDropdownMenuTriggerFor]`:

- `aria-haspopup="menu"`
- `aria-expanded="true|false"` reflecting `ctx.open()`.
- `aria-controls="<panel id>"` — panel id is auto-generated
  (`kj-menu-{n}`).
- The directive does **not** override `aria-label` / `aria-labelledby`; the
  consumer wires the trigger's accessible name (e.g. visible text or
  `aria-label` for icon-only triggers — same rule as Speed Dial).

On `[kjMenuContent]` (when used as a dropdown panel):

- `id="<panel id>"` matching the trigger's `aria-controls`.
- `aria-labelledby` defaults to the trigger's id if present, else the
  trigger's accessible name is used (the wrapper resolves this — the core
  directive accepts `kjAriaLabelledby: input<string \| null>(null)` to let
  consumers override).
- `aria-orientation="vertical"` (menus stack vertically). Cross-axis menubars
  are a separate component ([`navigation/menubar.md`](../navigation/menubar.md)).
- `data-side` / `data-align` for wrapper positioning.

On a sub-trigger (a `[kjDropdownMenuTriggerFor]` placed inside a
`[kjMenuContent]`):

- All of the root-trigger ARIA, plus the host element's `role` is forced to
  `menuitem` (it is both an item and a sub-trigger). This is the standard
  ARIA pattern for hierarchical menus.

On `[kjMenuItemCheckbox]` and `[kjMenuItemRadio]`:

- `aria-checked` reflects `kjChecked` (checkbox) or
  `groupValue === kjValue` (radio).
- `aria-disabled` reflects `kjDisabled`.

On `[kjMenuSeparator]`:

- `role="separator"`, `aria-orientation="horizontal"`, `tabindex="-1"`.

### Keyboard contract

| Key                   | When focus is on…                | Behaviour                                                               |
| --------------------- | -------------------------------- | ----------------------------------------------------------------------- |
| `Enter` / `Space`     | Trigger (closed)                 | Open + focus first item.                                                |
| `Enter` / `Space`     | Trigger (open)                   | Close + keep focus on trigger.                                          |
| `ArrowDown`           | Trigger (closed)                 | Open + focus first item.                                                |
| `ArrowUp`             | Trigger (closed)                 | Open + focus last item.                                                 |
| `ArrowDown` / `ArrowUp` | Item                           | Move to next/previous focusable item. Wraps. Skips disabled, separators, and labels. |
| `Home` / `End`        | Item                             | First / last focusable item.                                            |
| `ArrowRight`          | Sub-trigger (item that has a submenu) | Open submenu + focus first item. (`dir="rtl"` flips to ArrowLeft.) |
| `ArrowLeft`           | Item inside a submenu            | Close submenu + return focus to the parent sub-trigger. (`dir="rtl"` flips.) |
| `Enter` / `Space`     | Item (`menuitem`)                | Activate. Closes the menu (and all ancestors) unless `kjCloseOnSelect="false"`. |
| `Enter` / `Space`     | Item (`menuitemcheckbox`)        | Toggle `kjChecked`. Does **not** close by default.                      |
| `Enter` / `Space`     | Item (`menuitemradio`)           | Set the parent radio group's `kjValue` to this item's `kjValue`. Does not close by default. |
| `Escape`              | Item or sub-trigger              | Close the current scope (submenu if in a sub; root menu otherwise) and restore focus to its trigger. |
| `Tab` / `Shift+Tab`   | Item                             | Closes the entire menu chain. Natural Tab order resumes. `closed` emits `'tab'`. |
| Type-ahead (printable char) | Item                       | Jump to next focusable item starting with that character. Buffer resets on focus crossing scope boundary. |

The roving-tabindex lives in `[kjMenuContent]` via `KjRovingTabindex`
(orientation: `'vertical'`, wrap: `true`). The trigger always has
`tabindex="0"`; only one item per panel has `tabindex="0"` at a time.

### Focus management

- **Opening from the trigger** moves focus to the first item (or last for
  ArrowUp). Hover-opening (the rare case via `kjOpenOnHover`) does **not**
  move focus.
- **Closing via Escape, Tab, item activation, or programmatic close** runs
  through a single `close({ restoreFocus, reason })` path. `restoreFocus`
  defaults `true` for Escape and item activation, `false` for click-outside
  and Tab. The trigger element is captured at open-time (`document.activeElement`
  snapshot) so submenus restore to their sub-trigger and the root restores
  to the original button.
- **No focus trap by default** (`kjModal=false`). When `kjModal=true`, the
  panel composes `KjFocusTrap` and a scrim is rendered by the wrapper.
- **Submenu transitions** keep focus inside the active submenu only;
  closing a submenu returns focus to its parent sub-trigger (which is itself
  a focused `menuitem` in the parent panel).

### Touch target (WCAG 2.5.5 AAA — 44×44 CSS px)

The core directive does not enforce sizes. The wrapper's `KjSize` defaults
must guarantee 44×44 px minimum on every item directive variant — same
contract as `KjButton` items. Separator height has no min target (not
focusable). Labels likewise.

### Reduced motion

Wrapper concern. Core reflects `data-state="open|closed"` on the panel; the
wrapper guards transitions with
`@media (prefers-reduced-motion: reduce)`. No behaviour change in core.

### Live region for state changes

Out of scope. Item activation, checkbox toggling, and radio selection are
user-initiated and announced naturally by AT through `aria-checked`
transitions. If a consumer has a long-running command on an item (e.g.
"Delete project"), they own the live-region announcement via
`KjLiveRegion` separately. Defer to v1.1 review.

## Composition model

```
menu/
  menu.ts                 ← KjMenu (root container; existing, generalised)
  menu-content.ts         ← KjMenuContent (panel host with roving tabindex; refactor of existing)
  menu-item.ts            ← KjMenuItem (existing, kept)
  menu-item-checkbox.ts   ← KjMenuItemCheckbox (new)
  menu-item-radio.ts      ← KjMenuItemRadio (new)
  menu-radio-group.ts     ← KjMenuRadioGroup (new)
  menu-group.ts           ← KjMenuGroup (new)
  menu-label.ts           ← KjMenuLabel (new)
  menu-separator.ts       ← KjMenuSeparator (new)
  menu-trigger.ts         ← KjMenuTrigger (existing inline trigger; kept)
  dropdown-menu-trigger.ts ← KjDropdownMenuTriggerFor (new)
  menu.context.ts         ← KJ_MENU + KjMenuContext + KJ_MENU_RADIO_GROUP
  menu.example.ts
  menu.dropdown.example.ts
  menu.checkbox.example.ts
  menu.radio.example.ts
  menu.submenu.example.ts
  menu.modal.example.ts
  menu.spec.ts
  index.ts
```

Note the file organisation deliberately keeps `[kjMenu]` and the dropdown
trigger in a single feature folder. The brief's directory hint
(`packages/core/src/menu/menu.ts` already exists) is honoured: this analysis
extends that folder rather than carving out a `dropdown-menu/` peer.

### Shared state (`KJ_MENU` context — extended)

```ts
export interface KjMenuContext {
  readonly open: Signal<boolean>;
  readonly contentId: string;
  readonly modal: Signal<boolean>;
  readonly side: Signal<KjMenuSide>;
  readonly align: Signal<KjMenuAlign>;
  /** The element that opened the menu — captured at open-time for focus restoration. */
  readonly invoker: Signal<HTMLElement | null>;
  open(invoker: HTMLElement, focus: 'first' | 'last' | 'none'): void;
  close(reason: KjMenuCloseReason, restoreFocus: boolean): void;
  toggle(invoker: HTMLElement): void;
}
export type KjMenuSide = 'top' | 'right' | 'bottom' | 'left';
export type KjMenuAlign = 'start' | 'center' | 'end';
export type KjMenuCloseReason = 'item' | 'escape' | 'tab' | 'click-outside' | 'programmatic';
export const KJ_MENU = new InjectionToken<KjMenuContext>('KjMenu');

export interface KjMenuRadioGroupContext {
  readonly value: Signal<unknown>;
  select(value: unknown): void;
}
export const KJ_MENU_RADIO_GROUP = new InjectionToken<KjMenuRadioGroupContext>('KjMenuRadioGroup');
```

`KjMenu` provides `KJ_MENU`. `KjMenuRadioGroup` provides
`KJ_MENU_RADIO_GROUP`. `KjMenuItemRadio` injects the latter and reads
`value()` to compute `aria-checked`; activation calls `select(this.kjValue())`.

Submenus get their own `KJ_MENU` instance — a `[kjDropdownMenuTriggerFor]`
inside a `[kjMenuContent]` opens a child `[kjMenu]` template, which provides
its own context. The `Esc`-closes-current-scope behaviour falls out of this
naturally: each `[kjMenuContent]` listens for Escape and only closes its
own context.

### `hostDirectives` composition

- `[kjDropdownMenuTriggerFor]` composes:
  - **Nothing.** It is meant to sit alongside whatever directive the
    consumer already has on the button (`[kjButton]`, `[kjButtonGroupItem]`,
    a plain `<button>`, etc.). Composing `KjVariant`/`KjSize` here would
    fight with the consumer's button. The trigger directive's job is purely
    aria/keyboard wiring.
  - It does compose `KjFocusRing` only if the consumer's host element does
    not already have one — in practice, they always will (it's a button), so
    the directive does not add it. Documented expectation.
- `[kjMenuItem]`, `[kjMenuItemCheckbox]`, `[kjMenuItemRadio]` each compose:
  - `KjVariant` (input alias `kjVariant`)
  - `KjSize` (input alias `kjSize`)
  - `KjFocusRing`
  - `KjDisabled` (input alias `kjDisabled`)
  - And inline the capture-phase click suppression on disabled (mirrors
    `KjButton` and `KjSpeedDialAction`; we accept the third instance and
    extract a helper if a fourth lands).
- `[kjMenuContent]` composes:
  - `KjRovingTabindex` (orientation: `'vertical'`, wrap: `true`).
  - `KjFocusTrap` is **conditionally** composed when `ctx.modal()` is
    `true`. Because Angular `hostDirectives` are static, we instead place
    `KjFocusTrap` on the host unconditionally and the directive itself
    no-ops when its `kjFocusTrapEnabled` input is `false`. (If `KjFocusTrap`
    does not yet support an enable flag, that needs to be added — flagged in
    Open Questions.)
- `[kjMenuRadioGroup]`, `[kjMenuGroup]`, `[kjMenuLabel]`, `[kjMenuSeparator]`:
  - No host directives. Pure ARIA-attribute wiring.

### Cross-component pointers

- **Menu — inline** ([`navigation/menu.md`](../navigation/menu.md)) — same
  directive family, sans the `[kjDropdownMenuTriggerFor]` and submenu
  pieces. The two analyses share the item-type taxonomy. The inline doc
  should treat the dropdown items as the canonical contract and just note
  "inline rendering doesn't anchor to a trigger".
- **Context Menu** ([`actions/context-menu.md`](./context-menu.md)) — same
  panel and item directives, different trigger. Context menus open from a
  `contextmenu` event at the pointer position and from `Shift+F10` /
  `MenuKey` on a focused element. Expect a `[kjContextMenuTriggerFor]`
  directive that mirrors `[kjDropdownMenuTriggerFor]`'s open/close API but
  positions to the pointer instead of the anchor element. Same `KjMenu`
  body, same items, same a11y contract.
- **Menubar** ([`navigation/menubar.md`](../navigation/menubar.md)) —
  horizontal row of `[kjDropdownMenuTriggerFor]`s sharing a common
  orientation handler. The menubar wraps the triggers in a
  `[kjMenubar]` that owns `aria-orientation="horizontal"` and ArrowLeft/
  ArrowRight to move between roots. Each root reuses the same dropdown
  machinery.
- **Popover** ([`feedback/popover.md`](../feedback/popover.md)) — owns the
  shared **anchor primitive** (positioning math, side/align resolution,
  collision avoidance, viewport flipping). The dropdown menu consumes that
  primitive for its panel positioning. We expect Popover's analysis to
  define a `KjAnchor` directive or service; this dropdown directive will
  inject it from `[kjMenuContent]` when used as a dropdown.
  - The `[kjPopover]` family already exists in core
    (`packages/core/src/popover/popover.ts`) but is shaped as a self-
    contained popover, not as a shared anchor primitive. The Popover analysis
    will refactor it to expose the anchor logic as a reusable directive (or
    service); this dropdown menu blocks on that refactor — see Open Questions.
- **Button** ([`actions/button.md`](./button.md)) — pattern for
  variant/size/focus-ring/disabled composition + capture-phase click
  suppression. Item directives mirror this. Trigger directive sits *on top
  of* `KjButton` (no composition conflict).
- **Speed Dial** ([`actions/speed-dial.md`](./speed-dial.md)) — same family
  of trigger ARIA wiring (`aria-haspopup` / `aria-expanded` /
  `aria-controls`), Esc-to-close, focus restoration. Speed Dial's open
  question #7 (shared `KjPopupTrigger` primitive) lands here as the second
  consumer; we still **defer** the abstraction to v1.1 — see Open Questions.
- **Dialog** ([`actions/dialog.md`](./dialog.md)) — only relevant for the
  modal-mode contrast. When `kjModal=true`, the dropdown menu's focus-trap
  + scrim behaviour mirrors Dialog's, but without the role change (still
  `role="menu"`, not `role="dialog"`). Default is non-modal — different from
  Dialog.

## Inputs / Outputs / Models

### `[kjMenu]` (root, generalised)

| Member                  | Kind   | Type                                              | Default   | Notes                                                                                  |
| ----------------------- | ------ | ------------------------------------------------- | --------- | -------------------------------------------------------------------------------------- |
| `kjOpen`                | model  | `boolean`                                         | `false`   | Two-way bindable. Setting `true` opens (without an invoker, focus stays where it is); `false` closes.  |
| `kjModal`               | input  | `boolean`                                         | `false`   | Modal mode: focus trap + wrapper scrim.                                                  |
| `kjCloseOnSelect`       | input  | `boolean`                                         | `true`    | Default for items in this menu. Per-item override available.                            |
| `kjSide`                | input  | `'top' \| 'right' \| 'bottom' \| 'left'`          | `'bottom'`| Reflected to `data-side` on `[kjMenuContent]`.                                          |
| `kjAlign`               | input  | `'start' \| 'center' \| 'end'`                    | `'start'` | Reflected to `data-align` on `[kjMenuContent]`.                                         |
| `kjOffset`              | input  | `number`                                          | `4`       | Px offset between trigger and panel. Reflected as CSS var `--kj-menu-offset`.            |
| `kjAvoidCollisions`     | input  | `boolean`                                         | `true`    | Anchor primitive flips/shifts to keep panel on-screen.                                  |
| `kjAriaLabelledby`      | input  | `string \| null`                                  | `null`    | Override the panel's `aria-labelledby`. Auto-resolves to trigger id when null.           |
| `kjAriaLabel`           | input  | `string \| null`                                  | `null`    | Override panel's `aria-label`. Mutually exclusive with `kjAriaLabelledby`.               |

| Output                  | Kind   | Payload                                           | Notes                                                                                  |
| ----------------------- | ------ | ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `kjOpenChange`          | output | `boolean`                                         | Convenience event paired with the `kjOpen` model.                                       |
| `kjClosed`              | output | `KjMenuCloseReason`                               | Emitted when the menu closes; reasons: `'item' \| 'escape' \| 'tab' \| 'click-outside' \| 'programmatic'`. |

### `[kjDropdownMenuTriggerFor]`

| Member                       | Kind   | Type                                              | Default   | Notes                                                                                 |
| ---------------------------- | ------ | ------------------------------------------------- | --------- | ------------------------------------------------------------------------------------- |
| `kjDropdownMenuTriggerFor`   | input  | `KjMenu \| TemplateRef<unknown>`                  | required  | Either a reference to a `[kjMenu]` or a `<ng-template>` containing one.                |
| `kjOpenOnHover`              | input  | `boolean`                                         | `false`   | Disabled on coarse pointers (matches Speed Dial).                                      |
| `kjHoverGraceMs`             | input  | `number`                                          | `120`     | Open delay on hover; close delay also.                                                  |
| `kjDisabled`                 | input  | `boolean`                                         | `false`   | Suppresses open. Reflected as `aria-disabled` on the trigger host.                      |
| `kjMenuTriggerData`          | input  | `unknown`                                         | `null`    | Passed as `$implicit` when the target is a `<ng-template>`. Mirrors Material's `matMenuTriggerData`. |

| Output                       | Kind   | Payload                                           | Notes                                                                                 |
| ---------------------------- | ------ | ------------------------------------------------- | --------------------------------------------------------------------------------------|
| `kjMenuOpened`               | output | `void`                                            | Convenience; consumers can also bind `(kjOpenChange)` on the menu.                     |
| `kjMenuClosed`               | output | `KjMenuCloseReason`                               | Mirrors `[kjMenu]`'s `kjClosed`. Convenient for analytics on the trigger element.       |

### `[kjMenuContent]`

No public inputs/outputs. Reads `KJ_MENU`. Owns roving tabindex, type-ahead,
Esc, click-outside, focus restoration, side/align reflection.

### `[kjMenuItem]`

| Member            | Kind   | Type                              | Default | Notes                                                                                  |
| ----------------- | ------ | --------------------------------- | ------- | -------------------------------------------------------------------------------------- |
| `kjVariant`       | input  | `KjVariant` (forwarded)           | preset  |                                                                                        |
| `kjSize`          | input  | `KjSize` (forwarded)              | preset  |                                                                                        |
| `kjDisabled`      | input  | `boolean`                         | `false` |                                                                                        |
| `kjCloseOnSelect` | input  | `boolean \| undefined`            | `undefined` | When undefined, inherits `kjMenu.kjCloseOnSelect`.                                  |

| Output            | Kind   | Payload                           | Notes                                                                                  |
| ----------------- | ------ | --------------------------------- | -------------------------------------------------------------------------------------- |
| `kjSelect`        | output | `void`                            | Fires on click / Enter / Space. Suppressed if disabled. Consumer's native `(click)` still fires (preserved capture-phase pattern). |

### `[kjMenuItemCheckbox]`

| Member            | Kind   | Type                              | Default | Notes                                                                                  |
| ----------------- | ------ | --------------------------------- | ------- | -------------------------------------------------------------------------------------- |
| `kjChecked`       | model  | `boolean`                         | `false` | Two-way bindable. Reflected as `aria-checked`.                                          |
| `kjVariant`       | input  | `KjVariant` (forwarded)           | preset  |                                                                                        |
| `kjSize`          | input  | `KjSize` (forwarded)              | preset  |                                                                                        |
| `kjDisabled`      | input  | `boolean`                         | `false` |                                                                                        |
| `kjCloseOnSelect` | input  | `boolean \| undefined`            | `false` | Default `false` (don't close after toggling). Override per item.                        |

### `[kjMenuItemRadio]`

| Member            | Kind   | Type                              | Default | Notes                                                                                  |
| ----------------- | ------ | --------------------------------- | ------- | -------------------------------------------------------------------------------------- |
| `kjValue`         | input  | `unknown`                         | required| Compared with the parent group's `kjValue` to compute `aria-checked`.                   |
| `kjVariant`       | input  | `KjVariant` (forwarded)           | preset  |                                                                                        |
| `kjSize`          | input  | `KjSize` (forwarded)              | preset  |                                                                                        |
| `kjDisabled`      | input  | `boolean`                         | `false` |                                                                                        |
| `kjCloseOnSelect` | input  | `boolean \| undefined`            | `false` |                                                                                        |

### `[kjMenuRadioGroup]`

| Member            | Kind   | Type                              | Default | Notes                                                                                  |
| ----------------- | ------ | --------------------------------- | ------- | -------------------------------------------------------------------------------------- |
| `kjValue`         | model  | `unknown`                         | `null`  | Two-way bindable. Children compare against this to reflect `aria-checked`.              |

### `[kjMenuGroup]` / `[kjMenuLabel]` / `[kjMenuSeparator]`

No public inputs/outputs.

- `[kjMenuLabel]` auto-generates an id (`kj-menu-label-{n}`); the wrapping
  `[kjMenuGroup]` picks it up via `contentChild(KjMenuLabel)` and binds
  `aria-labelledby` on the group host. (Pure host attribute wiring; no
  signal computations on data.)
- `[kjMenuSeparator]` host attrs: `role="separator"`,
  `aria-orientation="horizontal"`, `tabindex="-1"`.

## Examples to ship

`@doc-example` groups in the directive's TSDoc:

1. **Dropdown menu — basic** (`menu.dropdown.example.ts`): `<button kjButton
   [kjDropdownMenuTriggerFor]="menu">Actions</button>` plus a
   `<ng-template #menu><div kjMenu kjMenuContent>…</div></ng-template>`
   with three `[kjMenuItem]`s. Default theme. Demonstrates click-to-open,
   ArrowDown-to-open-and-focus-first, Esc-to-close-and-restore.
2. **Inline menu** (`menu.example.ts`): existing inline form (sidebar-style)
   using `[kjMenu]` + `[kjMenuTrigger]` + `[kjMenuContent]` siblings — kept
   as the canonical inline shape.
3. **Checkbox items** (`menu.checkbox.example.ts`): three checkbox items
   bound to a record signal; demonstrates `[(kjChecked)]` two-way binding
   and the menu staying open while toggling.
4. **Radio group** (`menu.radio.example.ts`): three `[kjMenuItemRadio]`s
   inside a `[kjMenuRadioGroup]` with two-way `[(kjValue)]` to a signal.
5. **Submenu** (`menu.submenu.example.ts`): a `[kjMenuItem]` host that
   *also* has `[kjDropdownMenuTriggerFor]="subMenu"` to open a nested menu.
   Demonstrates ArrowRight to enter the submenu, ArrowLeft to leave, Esc
   closes the submenu only.
6. **Groups + labels + separators** (`menu.groups.example.ts`): a menu with
   `[kjMenuLabel]` "Account", a `[kjMenuGroup]` containing items, a
   `[kjMenuSeparator]`, then a second labelled group "Workspace".
7. **Modal mode** (`menu.modal.example.ts`): `kjModal=true` showing the
   focus trap + wrapper scrim. Demonstrates AAA contract under modal.
8. **Themed** (`menu.retro.example.ts`, `menu.finance.example.ts`): variant
   + size composition under retro and finance themes — mirrors the button
   doc structure.

## Open questions / risks

1. **Anchor primitive availability.** Dropdown Menu's positioning depends on
   the shared anchor primitive that
   [`feedback/popover.md`](../feedback/popover.md) is expected to define.
   That analysis hasn't been written yet, so the exact API surface is
   unresolved. The current `KjPopover` directive bakes anchoring into the
   popover-specific shape (`data-side` / `data-align` reflected on the
   panel; consumer CSS does the math). Before the dropdown menu ships, the
   Popover analysis must (a) extract a shared `KjAnchor` directive (or
   service) that any consumer can inject onto a panel host, or (b) document
   the contract for "consumers compute their own positioning from
   `data-side`/`data-align` reflection". Recommendation: option (a) but
   **block** the dropdown implementation only if the Popover work hasn't
   started by then. As a fallback, this analysis can ship in the meantime
   with `data-side`/`data-align` reflection only and rely on Tailwind anchor
   utilities in the wrapper for v1.

2. **Re-entry of `[kjMenuTrigger]` (inline) vs. `[kjDropdownMenuTriggerFor]`
   on the same `[kjMenu]`.** A consumer could put both on a menu — undefined
   behaviour. Decision: the inline `[kjMenuTrigger]` is **deprecated**
   when used on a button outside the menu (its current `'(click)'` toggles
   `ctx.toggle()` but does no anchoring). We keep it for in-tree inline
   submenu use only and note in TSDoc that `[kjDropdownMenuTriggerFor]` is
   preferred for any anchored case. No runtime guard — just docs.

3. **Conditional `KjFocusTrap` host directive.** Static `hostDirectives` in
   Angular cannot be conditionally attached. Options: (a) extend
   `KjFocusTrap` with an `enabled: input<boolean>(true)` flag; (b) split
   into `[kjMenuContent]` (non-modal) and `[kjMenuContentModal]` (with the
   trap); (c) implement the trap inline in `[kjMenuContent]` when modal,
   bypassing the primitive. Recommendation: **(a)** — `KjFocusTrap` should
   gain an `enabled` flag anyway (Dialog needs it for nested-modal cases).
   Tracked as a primitive enhancement. Until then, **(c)** is the fallback —
   inline a small focus trap when `ctx.modal()` is true.

4. **Hover-to-open on root triggers vs. submenus.** Hover-to-open root
   triggers is rare and noisy (hovering a "More" button in a toolbar opens
   accidentally). Default `kjOpenOnHover=false` for root. **Submenus**, in
   contrast, are *always* hover-to-open (Material's behaviour) — that is
   not a configurable input on the sub-trigger. Rationale: hover-open
   submenus is the strong UX expectation; opting out is awkward enough that
   nobody asks for it.

5. **Type-ahead behaviour with checkbox/radio items.** Should typeahead
   match a checkbox item's *label*, or include its current state? Decision:
   match label only (matches Material). Documented.

6. **Disabled items reachable by typeahead.** Material lets typeahead jump
   to disabled items (they get focus but can't be activated). Some AAA
   reviewers prefer skipping. Decision: **match Material** for v1 — focus
   moves to the disabled item and AT announces it as disabled. Revisit if
   AAA review flags it. The arrow-key roving navigator **skips** disabled
   items.

7. **Closing reason emitted on Tab.** Material distinguishes Tab-close
   (`'tab'`) from outside-click. We emit the same. Useful for analytics +
   for consumers that want to focus a specific element after Tab-close
   (rare). Documented.

8. **Submenu-Esc behaviour: close current scope vs. close all.** Decision:
   Esc closes *only* the focused scope. ArrowLeft also exits a submenu but
   keeps the parent open. To close the entire chain, users press Esc once
   per level. This matches Material and Radix; PrimeNG closes the whole
   chain. Choose Material's behaviour for a more controlled dismissal.

9. **`[kjMenuTriggerData]` ergonomics.** Material's `matMenuTriggerData` is
   used to parameterise a menu template (e.g. a row-action menu in a table
   that knows the row id). We mirror it via `kjMenuTriggerData`. The
   `<ng-template>` consumer reads `let-rowId="$implicit"`. This is the
   reason `[kjDropdownMenuTriggerFor]` accepts a `TemplateRef` and not just
   a `KjMenu` reference — the data must be passed at open-time, not at
   compile-time of the template.

10. **`[kjDropdownMenuTriggerFor]` host directive on a non-button.** Some
    consumers will try this on a `<div>` (e.g. an avatar acting as a
    trigger). The directive does not enforce a button host (Angular has no
    selector mechanism for that). It will work — keyboard handlers attach
    fine — but the `<div>` won't be focusable by Tab unless the consumer
    adds `tabindex="0"`. Documented; we do not assert. AAA discourages
    non-button triggers; we leave the choice to the consumer.

11. **Shared "popup trigger" abstraction (deferred again).** Dropdown Menu
    is the **second** consumer of the
    `aria-haspopup`/`aria-expanded`/`aria-controls`/Esc-restore-focus
    pattern after Speed Dial. Tooltip and Combobox will be the third and
    fourth. We still defer the `KjPopupTrigger` primitive for now (per
    Speed Dial's open question #7) — extract when Combobox lands, by which
    point the contract will be load-bearing across four consumers and
    refactor risk is low.

12. **Auto-id collisions across menus on a page.** Panel ids are generated
    via a module-level counter (`kj-menu-{n}`). This is fine in SSR/CSR
    because counters reset on module load and ids only need stability per
    DOM. No action; documented.

13. **Light-dismiss vs. virtual keyboard.** On mobile, opening a dropdown
    menu can shift the layout if a soft keyboard was open. Decision: the
    menu opens with `inputmode="none"` semantics on the panel host (no
    text fields in a menu by default), so no keyboard pop-up. If a consumer
    embeds an input (search-in-menu — see Command Palette,
    [`actions/command-palette.md`](./command-palette.md)), they own the
    consequences. Document.
