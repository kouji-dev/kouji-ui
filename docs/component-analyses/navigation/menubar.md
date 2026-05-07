# Menubar

A **Menubar** is a horizontal bar of top-level "menu names" — File, Edit,
View, Window, Help — each of which discloses a vertical dropdown of
commands. It is the classic desktop-application menu transplanted into the
browser, and it has a specific WAI-ARIA pattern
([Menubar Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/))
distinct from a horizontal navigation strip.

This is **not** a horizontal nav. A horizontal nav is a row of links
(`<nav><ul><li><a>`); each click navigates the page. A menubar is a row of
*menu disclosures*; each click opens a popup of commands (most of which
fire actions in the current document, not navigations). The two surface
shapes look similar at a glance and are distinct in role, in keyboard
contract, and in user expectation:

| | Menubar (this analysis) | Horizontal nav |
|---|---|---|
| Top-level role | `menubar` | (none — the `<nav>` landmark) |
| Top-level item role | `menuitem` (with `aria-haspopup="menu"`) | `link` (`<a>`) |
| Click behaviour | Opens a popup of commands | Navigates |
| Keyboard | ArrowLeft/Right between bar items, ArrowDown opens the popup, ArrowUp/Down inside the popup | Tab between links |
| Roving tabindex | Yes (only one bar item is in the tab sequence) | No (all links tabbable) |
| Roll-over disclosure | Yes (once one menu is open, hovering the next opens it) | n/a |
| Where it appears | App chrome (the top of an editor, IDE, draw tool, file browser) | Site chrome (top of a marketing page or app shell) |

This analysis covers the **app-style menubar only**. The horizontal nav
case is the inline form of [`KjMenu`](./menu.md) plus
[`KjLink`](./link.md) — see
[Cross-component pointers](#cross-component-pointers).

> **Not on disk yet.** No `packages/core/src/menubar/`, no
> `packages/components/src/menubar/`. This analysis specifies the shape
> before any code lands. The recommendation is **yes, ship a core
> directive family** — `KjMenubar` (root) plus `KjMenubarItem` (top-level
> item that triggers a popup) — that **reuses the dropdown menu primitive**
> from [`actions/dropdown-menu.md`](../actions/dropdown-menu.md) for the
> popup body. The menubar's contribution is the horizontal coordinator:
> roving tabindex across the bar, the open-on-hover-after-first-open
> ("roll-over disclosure") behaviour, and the ArrowLeft/Right cross-bar
> navigation that hands off into and out of the open popup.

## Source comparison

### PrimeNG — `<p-menubar>`

PrimeNG's [`<p-menubar>`](https://primeng.org/menubar) is the closest
direct analogue. Public API surface:

| Input | Notes |
|---|---|
| `model` | `MenuItem[]` — same data shape as `<p-menu>`. `label`, `icon`, `url`, `routerLink`, `command()`, `disabled`, nested `items` for the popup. |
| `autoDisplay` | `boolean` — when `true`, hovering a top-level item opens its menu without click. (PrimeNG default `false` — they don't roll-over by default.) |
| `autoHide` | `boolean` (default `true`) — close on hover-out after `autoHideDelay`. |
| `autoHideDelay` | `number` (ms). |
| `breakpoint` | `string` (e.g. `'960px'`) — below this width, the menubar collapses into a hamburger button that opens the bar items as a vertical drawer. |
| `style` / `styleClass` | Standard PrimeNG style hooks. |
| `id` / `ariaLabel` / `ariaLabelledBy` | Accessibility name on the menubar. |
| `start` / `end` | Template slots for content at the start / end of the bar (logo on the left, search on the right). |

Outputs: none beyond what each `MenuItem.command()` callback fires. There
is no `(open)` / `(close)` per top-level item.

Behaviour worth lifting:

- **Roll-over disclosure is a configurable input (`autoDisplay`)**, not
  forced. Default `false` (matches Material's MatMenu philosophy and
  desktop-OS expectations: macOS opens on click and stays sticky once one
  is open; PrimeNG mirrors that by treating roll-over as opt-in).
- **Mobile collapse via `breakpoint`** — drops the bar and shows a
  hamburger that opens the same items in a vertical column. The data is
  the same; only the layout flips.
- **`start` / `end` template slots** — leftmost logo and rightmost
  toolbar (search box, notifications icon) are common menubar
  affordances.

Critique:

- **Data-driven (`MenuItem[]`).** Same complaint as elsewhere: no
  per-item template slots without escape hatches; checkbox / radio menu
  items don't exist (`MenuItem` has no `selected`/`role="menuitemcheckbox"`
  story); separators are flagged via `MenuItem.separator: true` rather
  than declared as their own thing.
- **Hover behaviour is binary.** `autoDisplay` is on or off — there is no
  "click to open the first one, then roll-over the rest" mode, which is
  the WAI-ARIA APG canonical behaviour and the macOS / Windows desktop
  default.
- **Touch-screen handling is undocumented.** The `autoDisplay`
  hover-to-open mode has no coarse-pointer guard; on touch the hover
  pseudo-class fires on tap and stays "hovered" until the next tap
  elsewhere, which is incoherent.
- **No `aria-orientation` reflection** on the menubar host — verified in
  PrimeNG 17 source. WAI-ARIA APG explicitly recommends
  `aria-orientation="horizontal"` on `role="menubar"` though many AT
  default to horizontal for menubars; recommending vs. requiring is
  debatable.

### Angular Material — no first-class menubar

Material ships [`MatMenu`](https://material.angular.dev/components/menu)
(dropdown only), [`MatToolbar`](https://material.angular.dev/components/toolbar)
(visual chrome, no semantics), and [`MatTabs`](https://material.angular.dev/components/tabs)
(`tablist`/`tab` — different role).

There is **no `MatMenubar`**. A consumer building an app menubar in
Material has two paths, both wrong:

1. **Stack `MatMenu` triggers in a row.** Each `<button mat-button [matMenuTriggerFor]="fileMenu">File</button>` is a real button + `aria-haspopup="menu"`. But the bar wrapping them has no `role="menubar"`, no horizontal roving tabindex, and no ArrowLeft/Right cross-bar navigation, and roll-over disclosure does not happen — each menu is its own click-to-open island.
2. **Use `MatTabs`.** Wrong role (`tablist`/`tab`); a tab is a panel selector, not a menu disclosure. AT will announce "tab 1 of 5" instead of "File menu, has popup".

This is a real gap in Material. A consumer who wants the WAI-ARIA APG
menubar pattern in Material has to hand-roll it on top of `MatMenu`.

Critique:

- The gap is the strongest argument for kouji shipping a Menubar of its
  own — Material's miss leaves a market space, and the patterns we lift
  from `MatMenu` for the popups (the `[matMenuTriggerFor]` ergonomic
  pattern, roving tabindex inside the popup, focus restoration) are
  exactly the ones the dropdown menu primitive already adopted.

### shadcn/ui — `Menubar` (Radix Menubar)

shadcn's [`Menubar`](https://ui.shadcn.com/docs/components/menubar) is a
re-skin of Radix's [Menubar primitive](https://www.radix-ui.com/primitives/docs/components/menubar).
Compound-component shape:

```tsx
<Menubar>
  <MenubarMenu>
    <MenubarTrigger>File</MenubarTrigger>
    <MenubarContent>
      <MenubarItem>New <MenubarShortcut>⌘N</MenubarShortcut></MenubarItem>
      <MenubarItem>Open <MenubarShortcut>⌘O</MenubarShortcut></MenubarItem>
      <MenubarSeparator />
      <MenubarSub>
        <MenubarSubTrigger>Recent</MenubarSubTrigger>
        <MenubarSubContent>
          <MenubarItem>project-a.kouji</MenubarItem>
        </MenubarSubContent>
      </MenubarSub>
      <MenubarCheckboxItem checked>Word wrap</MenubarCheckboxItem>
      <MenubarRadioGroup value="line">
        <MenubarRadioItem value="line">Line numbers</MenubarRadioItem>
        <MenubarRadioItem value="off">Off</MenubarRadioItem>
      </MenubarRadioGroup>
    </MenubarContent>
  </MenubarMenu>
  <MenubarMenu>
    <MenubarTrigger>Edit</MenubarTrigger>
    <MenubarContent>...</MenubarContent>
  </MenubarMenu>
</Menubar>
```

Surface worth lifting:

- **`<MenubarMenu>` per top-level item.** Each top-level menu is its own
  scope — its own open state, its own context. This is exactly the shape
  kouji adopts: each `[kjMenubarItem]` is itself a dropdown menu trigger
  (with its own panel, items, submenus), and the `[kjMenubar]` parent
  only coordinates *which* one is open and the focus crossings between
  them.
- **Reuse of the Dropdown Menu primitives inside.** `MenubarItem`,
  `MenubarSeparator`, `MenubarCheckboxItem`, `MenubarRadioItem`,
  `MenubarSub` are *named differently* from the top-level
  `DropdownMenu*` siblings but are functionally identical. Radix could
  have unified them and didn't (presumably for the per-component CSS
  hooks the shadcn re-skin needs). **kouji unifies them** — see
  [Decision (composition)](#decision-composition).
- **`Shortcut` slot.** A right-aligned non-interactive text label on a
  menu item showing the keyboard shortcut (`⌘N`, `⇧⌘P`). This is a
  visual affordance specific to menubars (and command palettes); inline
  menus rarely show shortcuts. We adopt it as a reusable
  `[kjMenuShortcut]` directive — see
  [Composition model](#composition-model).
- **Roll-over disclosure is the default**, controlled via Radix's
  `dir`-aware focus model and an internal "open menu owner" signal that
  the menubar holds. Click one to open; once one is open, hovering an
  adjacent trigger transfers ownership without click. Click anywhere
  else (or Esc) returns to the closed state where hover does nothing.
- **`loop` on the menubar.** When ArrowRight at the last bar item, focus
  wraps to the first. Default `false`. We adopt the input — see
  [Inputs / Outputs / Models](#inputs--outputs--models).

Critique:

- **React-only (Radix).** Behaviour patterns transfer, code does not.
- **No mobile story.** Radix's Menubar primitive does not collapse on
  narrow viewports — that's a styling-layer concern in shadcn. We
  document the mobile collapse as a wrapper concern but flag it
  explicitly so consumers don't ship a 400px-wide menubar that horizontal-
  scrolls on phones.
- **`<MenubarTrigger>` does not auto-set `aria-orientation`** on the
  parent menubar; the consumer must remember. Verified in Radix source.
  We set `aria-orientation="horizontal"` by default on `[kjMenubar]`.

### WAI-ARIA APG — Menubar pattern

The [Menubar Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/)
specifies the canonical contract:

- Container: `role="menubar"`, `aria-orientation="horizontal"` (or
  vertical, but horizontal is by far the common case and is what this
  analysis covers).
- Each top-level item: `role="menuitem"` with `aria-haspopup="menu"` if
  it opens a popup (which is always, for an app menubar);
  `aria-expanded` reflects the popup's state.
- The popup itself is `role="menu"` — same shape as a standalone
  dropdown menu.
- Keyboard contract:
  - **On the menubar (no popup open):** ArrowRight / ArrowLeft move
    between bar items (with `dir="rtl"` flipping); Home / End jump to
    first / last; ArrowDown opens the focused item's popup and focuses
    its first item; ArrowUp opens the popup and focuses its last item;
    Enter / Space opens (and focuses first item).
  - **Inside an open popup:** ArrowDown / ArrowUp move between popup
    items; Home / End jump to first / last; Enter / Space activate;
    ArrowRight on the *last popup nesting level* (i.e., not on a
    sub-trigger) closes the popup, moves focus to the **next bar item**,
    and opens that bar item's popup; ArrowLeft does the mirror; ArrowRight
    on a sub-trigger opens the submenu instead; ArrowLeft inside a
    submenu closes the submenu (returning to the parent popup); Esc
    closes the popup and returns focus to the bar item; Tab closes the
    entire menubar's open popup and lets focus continue.
- Once one popup is open, **hovering an adjacent bar item should open
  its popup automatically** (the "roll-over disclosure" behaviour, not
  in the prose of the APG pattern but in the example
  [`menubar-editor.html`](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/examples/menubar-editor/)
  reference implementation). This is a usability requirement for a
  menubar to feel like a menubar; without it, the user must click each
  one separately, which is unfamiliar from native desktop menubars.
- Focus management: when a popup closes via Esc or item activation,
  focus returns to its bar item. When a popup closes via ArrowRight /
  ArrowLeft cross-bar, focus moves to the *next* bar item and opens
  its popup (focus does not stop on the bar — it continues into the
  next popup).
- Type-ahead on the menubar itself jumps to the next bar item starting
  with the typed character (mirrors menu type-ahead). Type-ahead inside
  a popup behaves as in any menu.

### Cross-library summary

| | PrimeNG `p-menubar` | Material | shadcn (Radix Menubar) | WAI-ARIA APG | kouji direction |
|---|---|---|---|---|---|
| First-class | yes | **no** | yes | (spec) | **yes** |
| Top-level shape | data-driven (`MenuItem[]`) | n/a | compound (`MenubarMenu` + `Trigger` + `Content`) | n/a | **directive composition** (`[kjMenubarItem]` + reused `[kjDropdownMenuTriggerFor]` + `[kjMenu]`) |
| Popup body | own `MenubarSub`-style nesting | n/a | compound `MenubarItem`, `MenubarCheckboxItem`, etc. | `role="menu"` + `menuitem*` | **reuse `KjMenu` family** ([dropdown-menu.md](../actions/dropdown-menu.md)) |
| Reuses dropdown menu? | **no** (own `MenubarSub`/`MenubarItem` namespace) | n/a | **no** (`MenubarItem` ≠ `DropdownMenuItem` despite identical behaviour) | n/a | **yes** — `[kjMenu]`/`[kjMenuItem]`/`[kjMenuItemCheckbox]` etc. used directly inside menubar popups |
| Roll-over disclosure | opt-in (`autoDisplay`) | n/a | default (built-in) | recommended in example | **default**, opt-out via `kjAutoDisclose=false` |
| Cross-bar arrow nav | yes | n/a | yes | required | yes |
| ArrowRight from popup → next bar | yes | n/a | yes | required | yes |
| Keyboard shortcuts in items | rendered via `MenuItem.label` text | n/a | `<MenubarShortcut>` slot | (informative) | `[kjMenuShortcut]` directive |
| Mobile collapse | yes (`breakpoint`) | n/a | wrapper concern | (out of scope) | **wrapper concern**; document hamburger-fallback contract |
| `aria-orientation` on bar | not set | n/a | not set | recommended | **set** (`horizontal`) |
| start / end slots | yes | n/a | no | n/a | **deferred** — content projection handles it; no special slot directives in v1 |
| Touch (coarse pointer) | undocumented | n/a | undocumented | undocumented | guard hover-to-open behind `(pointer: fine)` |

## Decision (composition)

**Yes — ship a Menubar core directive family that reuses the existing /
emerging `KjMenu` dropdown family for the popup body.** The decision
splits cleanly along the two axes specified in the brief:

### Decision 1: `KjMenubar` is its own root directive

The menubar root cannot be `[kjMenu]`; the roles are different
(`menubar` vs. `menu`), the orientation is opposite (horizontal vs.
vertical), the trigger contract is different (each child is itself a
disclosure trigger, not a flat list of items), and the cross-bar
keyboard contract is unique to menubars (ArrowRight from inside an open
popup transfers control to the next bar item — not a menu concept).

So `[kjMenubar]` is a new directive with `role="menubar"`,
`aria-orientation="horizontal"`, and its own context
(`KJ_MENUBAR`) tracking which child is open and coordinating cross-bar
navigation.

### Decision 2: Each top-level item is `[kjMenubarItem]` + reused `[kjDropdownMenuTriggerFor]`

A top-level menubar item is functionally a dropdown menu trigger plus
the menubar coordinator's contributions:

| Concern | Owned by |
|---|---|
| `role="menuitem"` on the bar item | `[kjMenubarItem]` |
| `aria-haspopup="menu"` | reused from `[kjDropdownMenuTriggerFor]` |
| `aria-expanded` reflecting the popup state | reused from `[kjDropdownMenuTriggerFor]` |
| `aria-controls` pointing to the popup id | reused from `[kjDropdownMenuTriggerFor]` |
| Click / Enter / Space / ArrowDown opens the popup | reused from `[kjDropdownMenuTriggerFor]` |
| ArrowLeft / ArrowRight moves between bar items (closing the current popup, opening the next if one was open) | `[kjMenubar]` (via cross-bar coordination) |
| Roving tabindex on the bar (only one bar item in tab sequence) | `[kjMenubar]` (composes `KjRovingTabindex`) |
| Roll-over disclosure (hover opens if another popup is open) | `[kjMenubar]` (tracks "auto-disclose mode" signal) |
| Esc closes the popup, returns focus to the bar item | reused from `[kjMenu]` / `[kjMenuContent]` |
| Tab closes the entire bar's open popup | reused from `[kjMenu]` / `[kjMenuContent]` (with bar coordination to also exit auto-disclose mode) |

So `[kjMenubarItem]` is **a button host that composes the dropdown menu
trigger** plus a small amount of menubar-specific wiring
(register/unregister with the bar's coordinator; participate in roving
tabindex). The popup template it points to is a regular
`<ng-template><div kjMenu kjMenuContent>…</div></ng-template>` —
identical to a standalone dropdown menu. All item types inside
(`[kjMenuItem]`, `[kjMenuItemCheckbox]`, `[kjMenuItemRadio]`,
`[kjMenuRadioGroup]`, `[kjMenuGroup]`, `[kjMenuLabel]`,
`[kjMenuSeparator]`, nested `[kjDropdownMenuTriggerFor]` for
submenus) work without modification.

### Why reuse rather than namespace separately (the Radix mistake)

Radix's Menubar ships `MenubarItem`, `MenubarCheckboxItem`,
`MenubarRadioItem`, `MenubarSeparator`, `MenubarSub`, etc. — a parallel
namespace for what is *behaviourally identical* to the
`DropdownMenu*` family. The reason is per-component CSS-hook
ergonomics (`data-radix-menubar-item` vs. `data-radix-dropdown-menu-item`).

For kouji the cost-benefit is the opposite:

- The CSS layer in `@kouji-ui/components` keys off `data-variant`,
  `data-size`, `data-state` — not directive-name-derived attributes.
  Same items get the same styling whether they sit in a menubar popup,
  a dropdown menu, or a context menu, and that is **correct** — a "Save"
  item should look the same wherever it appears.
- Doubling the directive surface doubles the AAA review burden, doubles
  the spec coverage, and doubles the opportunities for the two
  implementations to drift on subtle keyboard edge cases (Material's
  MatMenu and CdkMenu have done exactly this drift).
- The menubar's *contribution* (cross-bar nav, roll-over, roving) is
  small and targeted. Pushing it through the bar root and the bar items
  (which are the only menubar-specific surfaces) keeps the new directive
  count to two.

The popup body (everything inside the `<ng-template>`) is **literally
the same directives** as `actions/dropdown-menu.md` ships. This document
does not redefine `[kjMenuItem]`, `[kjMenuItemCheckbox]`, etc. —
cross-reference [dropdown-menu.md](../actions/dropdown-menu.md) for
those.

### Decision 3: A `[kjMenuShortcut]` directive ships in the menu folder

The shortcut affordance (`⌘N` right-aligned text inside a menuitem) is
shared between menubar popups and (rarely) standalone dropdown menus
and (often) command palettes. Ship it in
`packages/core/src/menu/menu-shortcut.ts` so it is co-located with the
menu primitive family it adorns. It is a non-focusable
`role="presentation"` directive that places its content into the
"shortcut" slot of a `[kjMenuItem]` host — see
[Composition model](#composition-model). This is a small new addition
to the dropdown-menu family that this analysis surfaces; it does not
belong only to menubar.

## Base features

- **Top-level items.** Each is a `<button kjMenubarItem
  [kjDropdownMenuTriggerFor]="fileMenu">File</button>` with a label
  (text or an icon + text) and an associated popup `<ng-template
  #fileMenu>…</ng-template>`. The bar accepts content-projected items —
  no `model: MenuItem[]` array.
- **Initial open state.** Closed. The bar appears as a row of buttons
  with no popups open. This matches PrimeNG default and macOS / Windows
  desktop. (Some app menubars open the first menu by default — uncommon
  and surprising; we don't.)
- **Click to open.** Click on a bar item opens its popup, focuses the
  first popup item. The clicked bar item becomes the "active" bar item
  for cross-bar nav purposes.
- **Click to close.** Clicking the *open* bar item closes its popup and
  returns focus to the bar item (no popup). Click outside also closes;
  focus stays where the click landed.
- **Roll-over disclosure (auto-disclose mode).** Once *any* bar item's
  popup is open (via click, Enter, Space, ArrowDown, ArrowUp), the bar
  enters "auto-disclose mode": hovering any adjacent bar item closes the
  current popup and opens the hovered item's popup, with focus moving
  into the new popup's first item. Clicking the open bar item
  (toggling-closed) or Esc, or Tab, or click-outside exits auto-disclose
  mode. The bar's auto-disclose mode is **on by default**, configurable
  via `kjAutoDisclose: boolean` on `[kjMenubar]`. **Coarse-pointer
  guard:** auto-disclose only fires on `(pointer: fine)` — on touch,
  hover doesn't make sense and would behave as "first tap opens, second
  tap on adjacent triggers it" anyway, which is what we want.
- **Cross-bar keyboard nav.** ArrowLeft / ArrowRight on a focused bar
  item (popup closed): move to the previous / next bar item. Wraps if
  `kjLoop=true` (default `false` — same as Radix). With
  `dir="rtl"`, flipped. Home / End jump to first / last bar item.
  ArrowLeft / ArrowRight from inside an *open popup* (not a sub-trigger):
  close the current popup, move to the previous / next bar item, and
  open *that* bar item's popup with focus on the first popup item. This
  hand-off is the menubar's defining keyboard behaviour. ArrowRight on
  a sub-trigger inside a popup *opens the submenu* (does not cross
  bars) — the cross-bar behaviour only fires when the focused item has
  no submenu.
- **Type-ahead on the bar.** Printable character on a focused bar item
  jumps to the next bar item whose accessible name starts with that
  character. Wraps. Does not open the popup (matches APG). The bar's
  type-ahead does not interfere with the popup's type-ahead — they are
  scoped separately (when focus is in a popup, type-ahead matches the
  popup's items).
- **Roving tabindex on the bar.** Only one bar item is in the tab
  sequence at a time. The bar root composes
  `KjRovingTabindex({ orientation: 'horizontal', wrap: <kjLoop> })`.
  Initial tabindex: the first non-disabled bar item.
- **Disabled bar items.** A bar item with `kjDisabled` is skipped by
  arrow-key navigation but still announced by AT (matches the dropdown
  menu's disabled-item policy). Type-ahead reaches disabled items
  (matches Material; reachable + announced as disabled).
- **Submenus inside popups.** A menubar popup item may itself be a
  sub-trigger (`<button kjMenuItem [kjDropdownMenuTriggerFor]="recent">
  Recent</button>`). Submenus follow the dropdown menu's submenu
  contract identically — ArrowRight opens the submenu (and does **not**
  cross to the next bar item, because the focused item *has* a
  submenu); ArrowLeft inside the submenu returns focus to the parent
  sub-trigger (and does **not** cross to the previous bar item, for the
  same reason).
- **Focus restoration.** Closing a popup via Esc returns focus to its
  bar item. Closing via item activation (a `[kjMenuItem]` click) also
  returns focus to the bar item, then exits auto-disclose mode. Closing
  via Tab lets natural tab order continue (focus does not return to the
  bar). Closing via cross-bar nav (ArrowRight/Left from inside the
  popup) hands focus to the next bar item's popup, not back to the bar.
- **`role="separator"` between bar items.** Not a thing in WAI-ARIA APG
  for menubars (separators only exist inside popups, not on the bar
  itself). The bar is a flat row of items; visual grouping (e.g. logo
  + items + spacer + items) is a layout concern handled by content
  projection, not by separator directives.
- **`KjVariant` / `KjSize` on bar items.** Bar items compose
  `KjVariant`, `KjSize`, `KjFocusRing`, `KjDisabled` exactly like
  `[kjMenuItem]` does — they share the same family, after all. Default
  variant: `'ghost'` (text on transparent background, hover and active
  states from theme tokens). Default size: `'sm'` for a tight desktop
  feel, configurable.
- **`KjVariant` on the bar itself.** No. The bar is layout chrome; the
  visual styling lives in the wrapper's CSS (`.kj-menubar`). The bar
  directive does not compose `KjVariant`.
- **Mobile collapse to hamburger.** **Wrapper concern, not core.** A
  menubar at 400px viewport width that lets its items wrap to a second
  line is incoherent (which line opens which popup?) and that horizontal-
  scrolls is unusable. The recommended wrapper pattern: a `<kj-menubar>`
  component that, below a CSS breakpoint, hides the bar items and
  shows a hamburger button that opens a `[kjDrawer]` (or a vertical
  `[kjMenu]`) listing the same top-level items, each of which expands
  inline (accordion-style) to reveal the popup contents. The directive
  layer offers no behaviour change on mobile; the wrapper composes the
  Drawer or Menu primitives. See [Open question
  4](#open-questions--risks).
- **Modality.** A menubar's open popup is **non-modal** — clicking
  outside dismisses, focus is not trapped. This matches every desktop
  menubar and the dropdown menu's default. Modal menubars are not a
  thing.

## Accessibility (WCAG 2.1 AAA)

Reference: [WAI-ARIA APG: Menubar Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/),
[WAI-ARIA APG: Menubar Editor example](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/examples/menubar-editor/),
[WAI-ARIA 1.2 §`menubar`](https://www.w3.org/TR/wai-aria-1.2/#menubar),
[ARIA in HTML](https://www.w3.org/TR/html-aria/).

### Roles

| Element | Role |
|---|---|
| `[kjMenubar]` | `menubar` |
| `[kjMenubarItem]` | `menuitem` (with `aria-haspopup="menu"` from the composed dropdown trigger) |
| Popup root (`[kjMenuContent]` inside the `<ng-template>`) | `menu` |
| Popup items, separators, groups, etc. | as defined in [dropdown-menu.md](../actions/dropdown-menu.md) — `menuitem`, `menuitemcheckbox`, `menuitemradio`, `separator`, `group`, etc. |
| `[kjMenuShortcut]` (new) | `presentation` |

### ARIA wiring

On `[kjMenubar]`:

- `role="menubar"`
- `aria-orientation="horizontal"` (always for v1; vertical menubars are
  out of scope and rare).
- `aria-label` or `aria-labelledby` — **consumer's job**, like every
  other landmark / region. Recommended: `aria-label="Application"` for
  the canonical app menubar (the WAI-ARIA APG editor example uses
  `"Text Formatting"`). The directive does **not** auto-generate a name.
  Document the recommendation; if a consumer ships a menubar with no
  accessible name, AT will announce "menubar" alone, which is awful.
  Dev-mode warning when neither `aria-label` nor `aria-labelledby` is
  present — see [Open question 1](#open-questions--risks).

On `[kjMenubarItem]`:

- `role="menuitem"` — set even though the host is a `<button>`,
  because in a menubar the bar item is a menuitem-with-haspopup, not a
  generic button. (This deliberately *changes* the host's role from its
  default; AT correctly announces "File menu, has popup" instead of
  "File button".)
- `aria-haspopup="menu"` — provided by the composed
  `[kjDropdownMenuTriggerFor]`.
- `aria-expanded="true|false"` — provided by the composed dropdown
  trigger; reflects the linked popup's open state.
- `aria-controls="<popup id>"` — provided by the composed dropdown
  trigger.
- `aria-disabled="true"` when `kjDisabled()` — provided by the composed
  `KjDisabled` host directive.
- `tabindex` — managed by the bar's `KjRovingTabindex`. Exactly one bar
  item has `tabindex="0"`; others have `tabindex="-1"`.

On the popup (regular `[kjMenuContent]` from the dropdown family):

- `role="menu"`, `aria-orientation="vertical"`, `aria-labelledby`
  defaulting to the bar item's id (so AT announces "File menu" with the
  bar item's text as the popup's label).
- `data-side="bottom"` `data-align="start"` (defaults — the popup
  appears below the bar item, aligned to its left edge in LTR, right
  edge in RTL).

### Keyboard contract

The contract is the union of the menubar's own keys and the inherited
dropdown menu keys (the latter handled by the popup's own directives
unchanged):

| Key | When focus is on… | Behaviour |
|---|---|---|
| `ArrowLeft` / `ArrowRight` | Bar item, popup closed | Move to previous / next bar item (skip disabled, wrap if `kjLoop`). RTL flipped. Popup stays closed. |
| `ArrowDown` | Bar item, popup closed | Open popup, focus first item. |
| `ArrowUp` | Bar item, popup closed | Open popup, focus last item. |
| `Enter` / `Space` | Bar item, popup closed | Open popup, focus first item. |
| `Enter` / `Space` | Bar item, popup open | Close popup, focus stays on bar item. (Toggle.) |
| `Home` / `End` | Bar item | First / last non-disabled bar item. |
| Type-ahead | Bar item | Jump to next bar item starting with character. Wraps. Does not open popup. |
| `Esc` | Bar item | No-op (the bar itself cannot be "closed"). Some implementations move focus out of the menubar entirely on Esc; we do **not** (matches APG — Esc on a closed bar item is a no-op). |
| `ArrowLeft` / `ArrowRight` | Popup item that is **not** a sub-trigger | Close current popup, move to previous / next bar item, **open that bar item's popup**, focus its first item. RTL flipped. Wraps if `kjLoop`. |
| `ArrowRight` | Sub-trigger inside a popup | Open the submenu (does not cross bars — see [dropdown-menu.md keyboard contract](../actions/dropdown-menu.md#keyboard-contract)). |
| `ArrowLeft` | Item inside a submenu (sub-popup) | Close the submenu, return focus to parent sub-trigger (does not cross bars). |
| `ArrowDown` / `ArrowUp` | Popup item | As in dropdown menu — next / previous focusable item, wraps, skips disabled / separators / labels. |
| `Home` / `End` | Popup item | First / last in the current popup scope. |
| `Enter` / `Space` | Popup item | Activate (closes the popup and returns focus to bar item, unless the item is a checkbox / radio / overrides `kjCloseOnSelect`). |
| `Esc` | Popup item | Close the current popup scope (the submenu if in a submenu; the bar item's popup otherwise). Focus returns to the parent (sub-trigger or bar item). Bar exits auto-disclose mode if the closed scope was the bar's open popup. |
| `Tab` / `Shift+Tab` | Bar item or popup item | Closes any open popup, exits auto-disclose mode, lets natural tab order resume. The bar's roving tabindex does **not** trap Tab — Tab leaves the menubar entirely. |
| Type-ahead | Popup item | As in dropdown menu — jump to next item starting with character. Scoped to the current popup, not the bar. |

The "ArrowRight from a popup item closes that popup, opens the next bar
item's popup" behaviour is the menubar's defining keyboard contract and
is the one piece the bar root must coordinate. Implementation: the bar
listens for `keydown` on the document (or on its own subtree via a
capture-phase listener); when the key is ArrowLeft / ArrowRight and the
event target is inside the bar's currently-open popup *and* the target
is not a sub-trigger (i.e., the focused item does not itself have a
submenu open or a submenu to open), the bar `preventDefault()`s the
event, calls `currentPopup.close()`, advances its own active-bar-item
index, and calls `nextBarItem.openPopup({ focus: 'first' })`. The popup
root (`[kjMenuContent]`) does not handle ArrowLeft / ArrowRight at all
— ArrowLeft / ArrowRight at the popup level would otherwise be the
submenu open / close contract, but submenu handling is per-item (on
sub-triggers and items inside sub-popups); the bar's coordinator picks
up only the leaf-item case where no submenu is involved.

### Focus management

- **Roving tabindex on the bar.** Only one bar item is in the tab
  sequence. Tabbing into the menubar lands on the active bar item;
  Tabbing out leaves the bar entirely.
- **Focus on popup open.** ArrowDown opens with focus on first item;
  ArrowUp opens with focus on last; Enter / Space / click open with
  focus on first. Hover-open (auto-disclose) does **not** move focus
  unless the user was *already* focused inside an adjacent popup —
  then focus follows into the new popup (matches APG editor example).
- **Focus on popup close.** Esc and item activation return focus to the
  bar item; the bar item is the active member of the roving tabindex.
  Click outside closes without changing focus (it lands wherever the
  click hit).
- **Focus on cross-bar (ArrowRight / Left from popup).** Focus moves to
  the next bar item's popup's first item. The next bar item itself
  briefly becomes active in the roving tabindex, but the user does not
  observe it as focused — the focus indicator follows directly into the
  popup.
- **Focus trap.** None. The menubar is non-modal.

### Touch target (WCAG 2.5.5 AAA — 44×44 CSS px)

Bar items use the same `KjSize` defaults as `[kjMenuItem]`: every
preset must guarantee 44×44 px. The bar's default `kjSize="sm"` shape
must still pad to 44px hit area even if the visual height is smaller
(matches the dropdown menu items' default behaviour). The wrapper
package's `.kj-menubar-item` CSS adds the required padding.

### Reduced motion

Wrapper concern. The bar reflects `data-state="active|inactive"` on
each bar item (active = the currently-open one) and the popup follows
the dropdown menu's existing `data-state` reflection. The wrapper
guards transitions with `@media (prefers-reduced-motion: reduce)`.

### Live region for state changes

Out of scope. Menubar state changes (popup open / close) are user-
initiated and announced naturally by AT through `aria-expanded`
transitions on the bar items.

## Composition model

```
menubar/                          ← packages/core/src/menubar/
  menubar.ts                      ← KjMenubar (root, role="menubar", roving tabindex coordinator, cross-bar nav, auto-disclose mode tracker)
  menubar-item.ts                 ← KjMenubarItem (role="menuitem", composes [kjDropdownMenuTriggerFor], registers with bar coordinator)
  menubar.context.ts              ← KJ_MENUBAR + KjMenubarContext + KjMenubarItemContext
  menubar.example.ts              ← canonical File / Edit / View example
  menubar.checkbox.example.ts     ← popup with checkbox / radio items
  menubar.submenu.example.ts      ← popup with a submenu (Recent files)
  menubar.shortcut.example.ts     ← popup items with [kjMenuShortcut]
  menubar.spec.ts
  index.ts

menu/                             ← packages/core/src/menu/  (pre-existing; this analysis adds one file)
  …                               ← all the existing dropdown-menu / menu directives
  menu-shortcut.ts                ← KjMenuShortcut (NEW, role="presentation", right-aligned shortcut text inside a kjMenuItem)
```

A consumer template (canonical example):

```html
<nav kjMenubar aria-label="Application">
  <button kjMenubarItem [kjDropdownMenuTriggerFor]="fileMenu">File</button>
  <button kjMenubarItem [kjDropdownMenuTriggerFor]="editMenu">Edit</button>
  <button kjMenubarItem [kjDropdownMenuTriggerFor]="viewMenu">View</button>
  <button kjMenubarItem [kjDropdownMenuTriggerFor]="helpMenu" kjDisabled>Help</button>
</nav>

<ng-template #fileMenu>
  <div kjMenu kjMenuContent>
    <button kjMenuItem (kjSelect)="newFile()">
      New <span kjMenuShortcut>⌘N</span>
    </button>
    <button kjMenuItem (kjSelect)="openFile()">
      Open <span kjMenuShortcut>⌘O</span>
    </button>
    <div kjMenuSeparator></div>
    <button kjMenuItem [kjDropdownMenuTriggerFor]="recentMenu">Recent</button>
  </div>
</ng-template>

<ng-template #recentMenu>
  <div kjMenu kjMenuContent>
    <button kjMenuItem>project-a.kouji</button>
    <button kjMenuItem>project-b.kouji</button>
  </div>
</ng-template>
```

The popup templates are **identical to standalone dropdown menu
templates** — there is nothing menubar-specific inside them. A consumer
can lift a popup template out of a menubar and reuse it as a standalone
dropdown menu trigger's target without modification.

### Shared state (`KJ_MENUBAR` context)

```ts
export interface KjMenubarContext {
  /** Auto-disclose mode is on once any popup opens; off after Esc / Tab / click-outside / toggle-close. */
  readonly autoDiscloseActive: Signal<boolean>;
  /** The bar item whose popup is currently open, if any. */
  readonly openItem: Signal<KjMenubarItemContext | null>;
  /** Whether ArrowLeft/Right wraps at the bar ends. */
  readonly loop: Signal<boolean>;
  /** Called by a KjMenubarItem when its popup opens; the bar adopts it as the openItem. */
  notifyItemOpened(item: KjMenubarItemContext): void;
  /** Called by a KjMenubarItem when its popup closes; the bar clears openItem if it matches. */
  notifyItemClosed(item: KjMenubarItemContext): void;
  /** Move focus to the bar item N positions away from `from`. Used by cross-bar nav. */
  moveFocus(from: KjMenubarItemContext, delta: 1 | -1, opts: { openPopup: boolean; focus: 'first' | 'last' | 'none' }): void;
}

export interface KjMenubarItemContext {
  readonly el: HTMLElement;
  readonly disabled: Signal<boolean>;
  /** Open my popup, with the given initial focus target. */
  open(focus: 'first' | 'last'): void;
  /** Close my popup. */
  close(): void;
  /** Whether my popup is currently open. */
  readonly open: Signal<boolean>;
}

export const KJ_MENUBAR = new InjectionToken<KjMenubarContext>('KjMenubar');
```

`[kjMenubar]` provides `KJ_MENUBAR`; `[kjMenubarItem]` injects it,
registers itself in `ngOnInit`, and unregisters in `ngOnDestroy`.
The bar maintains an ordered list of registered items (in DOM order)
to support ArrowLeft / ArrowRight movement. Roving tabindex is wired
on the bar root using the registered list as its target.

### `hostDirectives` composition

- `[kjMenubar]` composes:
  - `KjRovingTabindex` (orientation: `'horizontal'`, wrap:
    `kjLoop()`). The roving target is the registered bar items, not
    children of the host directly — same arrangement as Tab list.
  - Nothing else. The bar is layout-only at the directive layer.
- `[kjMenubarItem]` composes:
  - `KjVariant`, `KjSize`, `KjFocusRing`, `KjDisabled` — same as
    `[kjMenuItem]`. Default `variant: 'ghost'`, default `size: 'sm'`.
  - `KjDropdownMenuTriggerFor` — **this is the meat of the
    composition**. The bar item's `aria-haspopup`, `aria-expanded`,
    `aria-controls`, click-to-toggle, ArrowDown / ArrowUp / Enter /
    Space-to-open, Esc-to-close-and-restore-focus all come from this.
    The host directive's input `kjDropdownMenuTriggerFor` is exposed
    on the bar item host as the same alias. Composition note: because
    `[kjMenubarItem]` enforces `role="menuitem"` (overriding the
    composed trigger's default of "no role override"), the trigger's
    aria attributes still attach to the same host element — they
    co-exist with the role override. ARIA permits `aria-haspopup` on
    `role="menuitem"` and that is the canonical APG menubar shape.

The bar item does **not** compose `KjButton`. The host element is
expected to be a `<button type="button">` (the consumer authors it);
the `[kjMenubarItem]` directive is purely the menubar-aware ARIA /
keyboard / context-registration wiring on top of that button. Same
pattern as `[kjDropdownMenuTriggerFor]` — see
[dropdown-menu.md §Composition model](../actions/dropdown-menu.md#composition-model).

### `[kjMenuShortcut]` (new directive in the menu folder)

```ts
@Directive({
  selector: '[kjMenuShortcut]',
  host: {
    'role': 'presentation',
    'aria-hidden': 'true',
    'class': 'kj-menu-shortcut',
  },
})
export class KjMenuShortcut {}
```

A non-focusable directive that marks its host span as the keyboard-
shortcut affordance for its parent `[kjMenuItem]`. `aria-hidden="true"`
because AT will read the menuitem's full text content (including the
shortcut) as the accessible name; we do **not** want the screen reader
to also read it as a separate node. The visible glyphs (`⌘N`) translate
to "Command N" in the AT name reading, which is the desired AT
experience for a sighted-user shortcut hint.

Wrapper CSS positions it right-aligned via `margin-left: auto` inside
the flex-row `.kj-menu-item` container.

The directive is the simplest possible class; it earns its keep by (a)
declaring the `role="presentation"` and `aria-hidden="true"` so
consumers don't have to remember (the wrong combination here is
common — a `<kbd>` left visible to AT will be re-read), and (b) keying
the wrapper CSS off `.kj-menu-shortcut` for layout consistency. See
[Open question 7](#open-questions--risks) for the AT-vs-shortcut
announcement debate.

### Cross-component pointers

- **Dropdown Menu** ([`actions/dropdown-menu.md`](../actions/dropdown-menu.md))
  — the popup primitive reused. Each bar item composes
  `[kjDropdownMenuTriggerFor]`; the popup template is a standard
  `<div kjMenu kjMenuContent>` with the standard item types. This
  analysis introduces `[kjMenuShortcut]` as a new sibling of
  `[kjMenuItem]` in the menu folder — cross-listed there.
- **Menu (inline)** ([`navigation/menu.md`](./menu.md)) — the inline
  vertical version of the same primitive family. A horizontal nav-bar
  use case (a row of `<a kjLink>`s in a `<nav>` element) is **not** a
  menubar; it is `[kjLink]` instances laid out by the consumer's CSS
  (or a thin wrapper). The shared family ends at the popup-primitive
  layer; inline menus and menubars share popup machinery but their
  containers do not share semantics.
- **Context Menu** ([`actions/context-menu.md`](../actions/context-menu.md))
  — also reuses the dropdown menu popup primitive, for the
  right-click / long-press case. Menubar and Context Menu are both
  popup-trigger consumers; they don't share roots but share popup
  bodies.
- **Breadcrumb** ([`navigation/breadcrumb.md`](./breadcrumb.md), planned)
  — also a horizontal navigation widget but with completely different
  semantics: `<nav aria-label="Breadcrumb"><ol>` of `[kjLink]` crumbs.
  No popups, no roving tabindex, no cross-bar nav. Cross-link to
  disambiguate: a breadcrumb is "where am I in the hierarchy", a
  menubar is "what can I do".
- **Tabs** ([`navigation/tabs.md`](./tabs.md), planned) — different
  role (`tablist` / `tab` vs. `menubar` / `menuitem`), different
  semantic intent (panel selection vs. command disclosure), different
  keyboard contract (Enter activates a tab vs. Enter opens a popup).
  Cross-link to disambiguate.
- **Toolbar** ([`navigation/toolbar.md`](./toolbar.md), planned) — a
  related but distinct horizontal-row pattern: `role="toolbar"` for a
  row of buttons (and grouped controls) where each button is its own
  action, not a popup disclosure. A toolbar can sit inside or beside a
  menubar (the typical IDE shell has both: menubar at the top, toolbar
  below). The two share a horizontal-roving-tabindex shape, and the
  bar coordinator piece (`KjMenubar`) and a future `KjToolbar` may end
  up sharing a common `KjHorizontalNav` base in v1.1 — flagged in
  [Open question 8](#open-questions--risks). For v1, ship them
  independently.
- **Drawer / Bottom Sheet** ([`actions/drawer.md`](../actions/drawer.md),
  [`actions/bottom-sheet.md`](../actions/bottom-sheet.md)) — the
  intended mobile-collapse target. Below a configurable breakpoint, the
  wrapper substitutes a `[kjDrawer]`-wrapped vertical menu for the
  horizontal bar. See [Open question 4](#open-questions--risks).
- **Button** ([`actions/button.md`](../actions/button.md)) — the bar
  item's host element is a `<button kjButton>` in practice, plus
  `[kjMenubarItem]` plus `[kjDropdownMenuTriggerFor]`. The composition
  is identical to "a button that opens a dropdown menu" plus the
  bar-coordination piece.

## Inputs / Outputs / Models

All public inputs / outputs / models are `kj`-prefixed per
[`rules/code_style.md`](../../../rules/code_style.md).

### `[kjMenubar]` (root)

| Member | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjLoop` | input | `boolean` | `false` | When `true`, ArrowRight at the last bar item wraps to the first (and ArrowLeft at the first wraps to the last). Matches Radix's `loop` prop. |
| `kjAutoDisclose` | input | `boolean` | `true` | When `true`, hovering a bar item while another is open transfers ownership (roll-over disclosure). When `false`, hover does nothing — every bar item is click-to-open. |
| `kjAutoDiscloseDelayMs` | input | `number` | `0` | Hover dwell before transferring ownership. Default `0` (immediate, matching Radix). Some consumers may want `100`–`200` ms to suppress accidental transfers when sweeping the cursor across the bar. |
| `kjAriaLabel` | input | `string \| null` | `null` | Optional accessible name. Either this or `aria-labelledby` (set as a host attribute by the consumer) must be set. Dev-mode warning if neither — see [Open question 1](#open-questions--risks). |
| (host) `[attr.role]` | host binding | computed | `'menubar'` | Always `'menubar'`. |
| (host) `[attr.aria-orientation]` | host binding | computed | `'horizontal'` | Always horizontal in v1. |
| (host) `[attr.aria-label]` | host binding | computed | `kjAriaLabel()` or unset |  |

| Output | Kind | Payload | Notes |
|---|---|---|---|
| `kjOpenChange` | output | `string \| null` | Emits the `id` of the bar item whose popup just opened, or `null` when the last popup closes. Convenient for analytics ("which menu is being explored"); not load-bearing for behaviour. |

### `[kjMenubarItem]` (bar item)

| Member | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjDropdownMenuTriggerFor` | input | `KjMenu \| TemplateRef<unknown>` | required | Forwarded from the composed `[kjDropdownMenuTriggerFor]`. The popup template / KjMenu reference. |
| `kjVariant` | input | `KjVariant` (forwarded) | `'ghost'` |  |
| `kjSize` | input | `KjSize` (forwarded) | `'sm'` |  |
| `kjDisabled` | input | `boolean` | `false` | Forwarded to `KjDisabled` host directive. Disabled bar items participate in tabindex (focusable, announced as disabled) but are skipped by ArrowLeft / ArrowRight. |
| (host) `[attr.role]` | host binding | computed | `'menuitem'` | Forced — overrides the `<button>` host's default role. |
| (host) `[attr.aria-haspopup]` | host binding | computed | `'menu'` | From the composed dropdown trigger. |
| (host) `[attr.aria-expanded]` | host binding | computed | from popup state | From the composed dropdown trigger. |
| (host) `[attr.aria-controls]` | host binding | computed | popup id | From the composed dropdown trigger. |
| (host) `[attr.tabindex]` | host binding | computed | from `KjRovingTabindex` | Exactly one bar item is `0`; rest are `-1`. |

| Output | Kind | Payload | Notes |
|---|---|---|---|
| `kjMenuOpened` | output | `void` | Forwarded from the composed dropdown trigger. |
| `kjMenuClosed` | output | `KjMenuCloseReason` | Forwarded from the composed dropdown trigger. Reasons inherited from dropdown menu plus `'cross-bar'` (close-because-arrow-right-into-next-bar-item). |

### `[kjMenuShortcut]` (new, in menu folder)

No inputs / outputs / models. Pure ARIA + class-attribute reflection.

## Examples to ship

`@doc-example` groups in the directive's TSDoc:

1. **Menubar — basic** (`menubar.example.ts`): four bar items
   (File / Edit / View / Help), each with a popup of three to five
   `[kjMenuItem]`s. Demonstrates click-to-open, ArrowLeft / Right
   between bar items, ArrowDown to open and focus first, Esc to close
   and restore.
2. **Roll-over disclosure** (`menubar.auto-disclose.example.ts`): the
   default behaviour — click File, then hover Edit, watch the popup
   transfer. Then click outside, hover Edit again — nothing happens
   (auto-disclose mode is off until the next click). Explicit demo of
   the entry / exit conditions of auto-disclose mode.
3. **Submenus** (`menubar.submenu.example.ts`): a File menu with a
   "Recent" submenu containing five recent-file items. Demonstrates
   ArrowRight to enter submenu, ArrowLeft to leave, Esc closes only
   the submenu. ArrowRight on a leaf item *crosses bars* — included as
   a contrast.
4. **Checkbox / radio items in a popup**
   (`menubar.checkbox.example.ts`): the View menu with `Word wrap`
   (checkbox), `Show line numbers` (checkbox), and a radio group for
   `Theme` (Light / Dark / System). Demonstrates the dropdown menu's
   item-type contract working unchanged inside a menubar popup.
5. **Keyboard shortcuts** (`menubar.shortcut.example.ts`): each
   `[kjMenuItem]` has a trailing `<span kjMenuShortcut>⌘N</span>`.
   Demonstrates the shortcut directive and the right-aligned layout.
6. **Loop wrapping** (`menubar.loop.example.ts`): `kjLoop=true`. Press
   ArrowRight from the last bar item — focus moves to the first.
7. **Disabled bar item** (`menubar.disabled.example.ts`): the Help bar
   item is disabled. Demonstrates skip-on-arrow but reachable-via-tab,
   and AT announces "Help menu, disabled, has popup".
8. **Mobile collapse** (`menubar.mobile.example.ts`, **wrapper-only**):
   below 600px, the menubar is replaced with a hamburger button that
   opens a drawer listing the same items. The popup-popup transitions
   are replaced with accordion-expansion in the drawer. Wrapper
   responsibility — the example lives in
   `packages/components/src/menubar/`, not in the core directive's
   examples. Documents the recommended collapse pattern.
9. **Themed** (`menubar.retro.example.ts`,
   `menubar.finance.example.ts`): variant + size composition under
   retro and finance themes — mirrors the dropdown menu and button
   doc structure.
10. **Inside an app shell** (`menubar.app-shell.example.ts`): the
    canonical use case — a menubar at the top of a
    `<kj-app-layout>`-style shell, with content below. Shows the bar
    in context and demonstrates that the bar's
    `aria-label="Application"` is the AT entry point ("Application
    menubar, File menu, has popup").

## Open questions / risks

1. **Dev-mode warning for missing accessible name on the menubar.**
   A menubar with no `aria-label` or `aria-labelledby` is a real AAA
   issue (AT announces "menubar" with no qualifier). PrimeNG and Radix
   both leave it to the consumer; we should warn in dev mode when
   neither is set on the host. **Lean: yes**, ship the warning. Same
   shape as the planned dialog and tablist warnings.

2. **`Esc` behaviour when no popup is open.** APG says Esc on a closed
   bar item is a no-op. Some app menubars (and the WAI-ARIA APG editor
   example, on careful reading) implement Esc as "move focus out of
   the menubar entirely, into the document body" so the user can
   escape the bar without Tab. **Decision: Esc is a no-op when no
   popup is open.** Tab is the canonical escape route. If a consumer
   wants Esc-to-exit, they can wire it themselves. Document.

3. **Auto-disclose dwell delay.** `kjAutoDiscloseDelayMs` defaults to
   `0`. macOS menubar uses ~150ms; Windows menubar uses ~0ms. Radix
   uses 0. The risk of `0` is a sweeping cursor accidentally opening
   every menu in turn. The risk of `150` is the user feeling the bar
   is sluggish. **Decision: ship `0` as the default to match Radix and
   Windows; document the input and let consumers tune. Revisit after
   user-testing.**

4. **Mobile collapse — directive contract or pure wrapper concern?**
   At which breakpoint, and how (drawer? bottom sheet? vertical-menu
   replacement?). **Decision: pure wrapper concern.** The core
   directive layer ships the WAI-ARIA APG menubar pattern faithfully
   for `(pointer: fine)` desktop use; below the wrapper's CSS
   breakpoint, the wrapper renders a different DOM (a hamburger-
   button + `[kjDrawer]` listing the same items), not a CSS-collapsed
   menubar. The directives are not used at all in the mobile
   rendering. This avoids the contortion of "is this still a menubar
   when it's a vertical accordion in a drawer?" The wrapper's
   `<kj-menubar>` accepts the same content projection regardless and
   chooses the rendering at the template layer. Concretely, the
   wrapper template is `@if (isCompactViewport()) { <hamburger
   shape> } @else { <bar-shape with kjMenubar> }`. Document the
   pattern and the breakpoint default (`max-width: 39.9375rem`,
   matching the existing breakpoint scale in
   `packages/components/src/styles/breakpoints.css` if present;
   otherwise 600px).

5. **Should `[kjMenubar]` enforce that all children are
   `[kjMenubarItem]`?** A consumer might project a
   `<button>` (no `[kjMenubarItem]`) into the bar — the roving tabindex
   would skip it, ArrowLeft/Right would skip it, but it would still
   take up visual space. **Decision: do not enforce.** Allow consumers
   to project a logo `<img>` or a search box at one end of the bar
   (PrimeNG's `start` / `end` slots, served by content projection
   alone). The bar's coordinator only iterates registered items
   (`KjMenubarItem` instances), so non-item children are visually
   present but invisible to the keyboard contract. Document the
   pattern. (Alternative: ship `<kj-menubar-leading>` and
   `<kj-menubar-trailing>` slot directives — defer to v1.1 if the
   simple content-projection approach is not enough.)

6. **Cross-bar ArrowLeft/Right from a sub-popup.** When focus is
   inside a *sub-popup* (e.g. inside the "Recent" submenu of the
   File menu), should ArrowLeft / Right (when on a leaf, no further
   submenu involved) cross to the next bar item? **Decision: no — and
   this is a subtle deviation from APG's editor example.** APG's
   keyboard contract says "ArrowLeft inside a submenu closes the
   submenu and returns to the parent" — full stop. Crossing bars from
   inside a sub-popup is a rare and confusing behaviour (the user has
   navigated three levels deep; bar-crossing from there feels like
   teleporting). The bar's cross-bar handler **only fires when the
   event target is in the bar's directly-owned popup, not in any
   nested submenu**. Document this scoping rule. This matches Radix
   and PrimeNG behaviour observed in their examples.

7. **`[kjMenuShortcut]` as `aria-hidden` vs. announced.** Two camps:
   (a) `aria-hidden="true"` (current decision) — AT reads "New" as
   the menuitem's name; the visual `⌘N` is sighted-only chrome. (b)
   no `aria-hidden`; AT reads "New, Command N" as the full name. The
   APG menubar editor example uses approach (a). NVDA and VoiceOver
   both let the user query the keyboard shortcut via the AT command
   ("read line", "read item details") regardless. **Decision: ship
   approach (a)**. If a consumer has compelling user research that
   approach (b) is preferred, the wrapper layer can override
   `aria-hidden` per item — but the directive default is (a).
   Document the rationale.

8. **Shared horizontal-roving-tabindex base with future Toolbar?**
   `[kjMenubar]` and `[kjToolbar]` (planned) both compose a
   horizontal roving tabindex over registered children. Should they
   share a `KjHorizontalNav` base directive? **Lean: not yet.** The
   menubar's coordinator does meaningfully more (auto-disclose mode,
   cross-bar popup hand-off) than the toolbar will (toolbar buttons
   are flat actions). Sharing a base would force the toolbar to
   either inherit unused behaviour or compose-around it. Defer to
   v1.1; if Tabs lands a third horizontal-roving-tabindex consumer,
   reconsider. The cost is a small amount of duplication in the
   roving-tabindex composition; the benefit of independence is
   simpler code.

9. **Click outside while auto-disclose is active — close everything
   or just the popup?** Decision: **close everything** (the popup
   closes, auto-disclose mode exits). Hovering the bar after that
   does nothing until the user clicks again. Matches Radix.

10. **Touch-device behaviour for bar items.** On a coarse pointer
    (touch screen), tapping a bar item opens its popup; tapping
    elsewhere closes it. Auto-disclose does not apply (the
    `(pointer: fine)` guard). **But**: tapping an *adjacent* bar item
    while one is open — does it behave as "close current, open new"
    (matches the desktop hover), or "close current, second tap is
    needed to open new"? **Decision: "close current, open new"** —
    touch-tapping on a bar item always opens its popup (idempotent
    "this is the bar item I want to interact with" gesture). This
    differs from the auto-disclose-mode gating only in that touch
    treats tap-to-open as the always-on behaviour, while desktop
    requires a *first* click before hovers count. Document.

11. **Long bar items (overflow / ellipsis).** A menubar with eight
    items and a narrow viewport may not fit on one line. Decision:
    the wrapper's CSS uses `white-space: nowrap; overflow: hidden;
    text-overflow: ellipsis` per bar item (so each item is a single
    line, possibly truncated), and the wrapper also implements an
    overflow-collapse pattern at the end of the bar (a "More" menu
    holding any items that don't fit). The directive does **not**
    handle overflow — that is wrapper layout work, identical to the
    overflow handling in Tabs (planned). Defer to v1.1 if the simple
    "consumer ensures their bar fits" suffices for v1.

12. **Two menubars on the same page.** Edge case but possible — an
    app shell with a global menubar at the top and a per-document
    menubar inside a panel. Each menubar's coordinator is scoped to
    its `KJ_MENUBAR` provider, so the two don't interfere; cross-bar
    nav stays within one bar's registered items. The roving tabindex
    on each menubar is independent. **Risk**: id collisions for popup
    `aria-controls` if both menubars use the auto-id counter from the
    dropdown menu primitive. The counter is module-level; the ids
    will be globally unique anyway. No action; documented.

13. **Disabled top-level item with `aria-haspopup`.** A disabled bar
    item still announces "has popup" because the `[kjDropdownMenuTriggerFor]`
    composed directive sets `aria-haspopup="menu"` regardless of
    disabled state. AT reads "Help menu, disabled, has popup" — which
    is fine, but pedants may argue that a disabled trigger that won't
    open shouldn't claim a popup. **Decision: keep
    `aria-haspopup` on disabled bar items.** The popup *exists*; it
    is currently inaccessible because the trigger is disabled. The
    AT announcement is honest. Matches Material's MatMenu trigger
    behaviour for disabled buttons.

14. **`KjMenubar` SSR.** All directive logic is host bindings and
    capture-phase keydown listeners; no `afterNextRender` work. The
    SSR HTML carries the right `role="menubar"`,
    `aria-orientation="horizontal"`, the bar items' `role="menuitem"`,
    `aria-haspopup="menu"`, `aria-expanded="false"`, `aria-controls`,
    and the initial roving `tabindex` (first non-disabled = `0`,
    rest = `-1`). No hydration risk. The popup template is not
    stamped until first open, which is post-hydration anyway —
    matches the dropdown menu's SSR contract.

15. **i18n for the canonical `aria-label="Application"`.** The
    consumer authors the label, so i18n is consumer territory. The
    documentation examples use `aria-label="Application"` (English);
    examples in non-English locales should localise. The directive
    does not ship a default label.
