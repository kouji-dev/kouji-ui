# Menu

A **Menu** is an *inline*, persistent, in-flow list of links or actions —
the vertical nav rail in a settings page, the sidebar of an admin
console, the tree of "Inbox / Drafts / Sent / Spam" in a mail client,
the left-rail of links inside a documentation site. It sits in document
flow, occupies real layout space, never overlays the page, never traps
focus, and is reachable by ordinary `Tab`. Sub-sections are nested
disclosure groups (a "Settings" group with "Profile / Account /
Notifications" beneath it), expanded and collapsed via header rows that
own their own `aria-expanded` state.

This file resolves the brief's central design question — **does the
inline menu reuse `role="menu"` like its popped-up cousin, or does it
adopt a navigation-list shape (`<nav><ul><li>`)?** See
[Decision](#decision-on-the-role-debate). Spoiler: the inline menu does
**not** use `role="menu"`. `role="menu"` is the wrong ARIA pattern for a
navigation list and forces an inappropriate keyboard contract; the
inline menu is built on native `<nav>` / `<ul>` / `<li>` / `<a>` /
`<button>` semantics with `aria-current="page"` for active items and
nested disclosure for sub-sections.

> **Not on disk yet** as a navigation-list primitive. The library *does*
> ship `packages/core/src/menu/` today, but that is the popped-up menu
> machinery (`role="menu"` + roving tabindex) shared with
> [`actions/dropdown-menu.md`](../actions/dropdown-menu.md) and
> [`actions/context-menu.md`](../actions/context-menu.md). This analysis
> specifies a **separate directive family** under
> `packages/core/src/nav-menu/` to avoid conflating the two ARIA
> patterns. The wrapper component name reuses `<kj-menu>` only at the
> presentation layer (see [Naming](#naming-and-disambiguation)).

For the **popped-up sibling** opened from a button trigger, see
[`../actions/dropdown-menu.md`](../actions/dropdown-menu.md). For the
**right-click** sibling, see
[`../actions/context-menu.md`](../actions/context-menu.md). For the
**Cmd-K typeahead launcher**, see
[`../actions/command-palette.md`](../actions/command-palette.md). For
the **horizontal application menubar** that contains a row of dropdown
triggers, see [`./menubar.md`](./menubar.md) (planned). For the
**data-display list** that looks superficially similar but holds
homogeneous data rows rather than navigation/action targets, see
[`../data-display/list.md`](../data-display/list.md). For the **single
breadcrumb trail** at the top of a page, see
[`./breadcrumb.md`](./breadcrumb.md) (planned). For the **app shell
sidebar** that wraps this Menu plus a header / collapse toggle, see
the future Sidebar component (shadcn's only first-class equivalent).
For the **disclosure machinery** that powers sub-menu expand/collapse,
see [`../data-display/accordion.md`](../data-display/accordion.md).

## Source comparison

The inline navigation menu is the most lopsided reference field of any
navigation primitive: PrimeNG ships a static `<p-menu>` that doubles as
a popup, Angular Material declines to ship one entirely (their
`MatMenu` is the popped-up form only), shadcn folds the concern into a
much larger `Sidebar` recipe, and daisyUI ships a CSS-only `menu` class.
Each library makes a different choice about whether this should exist
as a first-class component.

| Concern | PrimeNG `<p-menu>` (static mode) | Angular Material | shadcn/ui `Sidebar` | daisyUI `menu` |
|---|---|---|---|---|
| Primary surface | `<p-menu>` with `[popup]="false"` (default) — same component as the dropdown menu, just rendered inline. | **None.** `MatMenu` is popup-only; Material has no inline-nav-menu component. The documented pattern is hand-authored `<nav>` + `<ul>` + `<a mat-list-item>` (using `mat-list`, not a Menu primitive). | `<Sidebar>`, `<SidebarMenu>`, `<SidebarMenuItem>`, `<SidebarMenuButton>`, `<SidebarMenuSub>`, `<SidebarMenuSubItem>`, `<SidebarMenuSubButton>`, `<SidebarGroup>`, `<SidebarGroupLabel>`, `<SidebarGroupContent>` — a 12-component family for the entire app shell, with the menu being a sub-feature. | `.menu`, `.menu-title`, `.menu-disabled`, `.menu-active`, `.menu-focus`, `.menu-dropdown`, `.menu-dropdown-toggle`. CSS only. |
| Selector / surface | `<p-menu>` (component) | n/a (use `<a mat-list-item>` inside `<mat-nav-list>`, or hand-authored `<a>` in `<nav><ul>`) | `<SidebarMenu>` etc. (Tailwind + Radix Slot composition; React-only) | `<ul class="menu">` |
| Item structure | `MenuItem[]` data model — same as the popup `<p-menu>` and `<p-tieredMenu>`. Each item: `label`, `icon`, `routerLink`, `command()`, `items` (for sub-menu), `separator`, `disabled`. | Native: `<a mat-list-item routerLink>` with manual `aria-current` wiring. | Per-role components: `<SidebarMenuItem>` (row), `<SidebarMenuButton>` (interactive surface, can be `<a>` or `<button>` via `asChild`), `<SidebarMenuSub>` (nested group), `<SidebarMenuSubItem>` (nested row), `<SidebarMenuSubButton>` (nested interactive). | `<li>` per item, with `<a>` or `<button>` inside for interactivity. `<li class="menu-title">` for group headings, `<li><details><summary>` for sub-menus. |
| Sub-menu pattern | Nested `MenuItem.items` rendered as a flyout panel that *opens on hover/click* — i.e., even in static mode, sub-menus pop out of the main nav. **Not** an inline disclosure. | n/a (no Menu primitive) | `<Collapsible>` wrapper around `<SidebarMenuItem>`; the sub-menu is an inline disclosure that expands the menu's vertical extent. Uses Radix Collapsible internally. | `<details><summary>` — native HTML disclosure semantics. The `summary` is the toggle, the children of `details` are the sub-items. Indents via CSS. |
| Active item | `MenuItem.styleClass`/`MenuItem.routerLinkActiveOptions` — the consumer wires `routerLinkActive`, no first-class `aria-current` story. | `routerLinkActive="kj-active"` + manual `[attr.aria-current]="isActive ? 'page' : null"`. | `<SidebarMenuButton isActive>` boolean; component sets `data-active=""` for styling and `aria-current="page"` for AT. | `.menu-active` modifier class. No automatic `aria-current` wiring. |
| Group / heading | `MenuItem` with no `command` and styled as a label — convention only, no role. | `<h3 mat-subheader>` inside `<mat-nav-list>`. Real heading semantics. | `<SidebarGroup>` + `<SidebarGroupLabel>` (renders a real `<div>` with text and styles). | `<li class="menu-title">` — non-interactive `<li>` rendering a heading. |
| Roles | `role="menu"` + `role="menuitem"` — even in static mode. **This is the core decision point.** PrimeNG keeps the menu role in both static and popup mode. | None claimed; uses `<nav>` + native `<a>` + `aria-current="page"`. | `<nav>` wrapper around the sidebar; `<ul>` + `<li>` + `<a>`/`<button>` inside. Does **not** use `role="menu"`. | None — pure CSS, semantics inherit from the consumer's markup. Encourages `<details>`/`<summary>` for sub-menus, which uses native disclosure semantics. |
| Keyboard | Arrow Up/Down to move between items (`role="menu"` contract); Enter/Space to activate; Escape to "close" (no-op when static); Home/End; type-ahead. **Tab** moves focus *out* of the menu — only one tab stop for the whole menu. | Native `<a>` semantics: every link is its own tab stop. Tab moves between rows; Enter activates; arrow keys *do not* navigate. | Native: every link is its own tab stop. Sub-menu disclosure toggle is a separate `<button>` that uses Enter/Space to expand. | Native: Tab between `<a>`s; Enter activates `<details><summary>` to expand. |
| Orientation | Vertical only in `<p-menu>`; horizontal lives in `<p-menubar>` (a separate component). | n/a | Vertical only; horizontal nav is a separate concern. | Both — `.menu-horizontal` modifier. Same primitive flips orientation. |
| Disabled item | `MenuItem.disabled` | n/a (consumer sets `tabindex="-1"` + `aria-disabled`) | `<SidebarMenuButton disabled>` boolean | `.menu-disabled` modifier class (no behaviour). |
| `routerLink` integration | `MenuItem.routerLink` field consumed by PrimeNG's render layer. | Native — `<a routerLink>` works. | Via `asChild` slot — consumer passes their own anchor. | Native — consumer writes the anchor. |
| Icon slot | `MenuItem.icon` (string class). | Native — consumer writes `<mat-icon>` inside the link. | `<Icon />` child of `<SidebarMenuButton>` — free-form children. | Free-form children. |
| Badge / count slot | Custom (`itemTemplate`). | Native. | Free-form children of `<SidebarMenuButton>`. | Free-form. |
| Collapsed / icon-only mode | n/a | n/a | `<Sidebar collapsible="icon">` collapses the whole sidebar to a 56px-wide rail of icons. The Menu primitives shrink within. | n/a (consumer-built). |

**Read-off.**

- **PrimeNG conflates inline and popup**: the same `<p-menu>` renders
  in either mode and uses `role="menu"` regardless. This is the
  deepest single-component answer in the field, and also the most
  ARIA-questionable choice. `role="menu"` triggers AT users to
  expect the menu-pattern keyboard contract (arrow-only navigation,
  type-ahead, Esc to close, Tab moves out as a single stop). For an
  inline navigation rail that the user may want to Tab *through*
  (every link is its own tab stop in normal browser behaviour), this
  contract is wrong. PrimeNG gets away with it because most static
  `<p-menu>` users author small menus where the contract surprise is
  manageable, but for a 30-row sidebar nav it is actively
  user-hostile.
- **Angular Material declines to ship one** — and that is a real
  position. Material's stance is: an inline navigation menu is
  expressed via native `<nav>` + `<ul>` + `<a>` semantics with
  `routerLinkActive` for the active state, and the styled wrapper
  for that is `<mat-nav-list>` (which lives in the List family, not
  Menu). The gap kouji must close is the disclosure machinery for
  sub-menus and the styling discipline — neither of which Material
  treats as a Menu concern.
- **shadcn folds menu into a Sidebar recipe**: a 12-component family
  whose surface is "the entire app shell". The menu primitives
  inside that family use ordinary navigation semantics (no
  `role="menu"`) and use Radix `Collapsible` for sub-menu expansion.
  This is the closest match to kouji's intended shape, modulo the
  fact that we ship Menu and Sidebar separately (Sidebar is the
  shell; Menu is one of the things that goes inside).
- **daisyUI ships a CSS-only `.menu` class**: the most minimal
  answer, and the canonical name. Same shape as the kouji direction
  — `<ul class="menu">` of `<li>` rows, `<details><summary>` for
  sub-menus, `.menu-title` for headings. No JS, no a11y plumbing.
  The gap is the `aria-current` wiring, the disabled-link
  enforcement (same problem Link solves), and the disclosure
  primitive integration.

The split kouji is converging on:

| Surface | Selector | Job |
|---|---|---|
| **Core directive family** | `[kjNavMenu]`, `[kjNavMenuItem]`, `[kjNavMenuLink]`, `[kjNavMenuButton]`, `[kjNavMenuGroup]`, `[kjNavMenuTitle]`, `[kjNavMenuSubmenu]`, `[kjNavMenuSubmenuTrigger]`, `[kjNavMenuSubmenuContent]` | Owns orientation reflection, sub-menu disclosure machinery (extends `KjAccordion` for the open-set state), `aria-current` propagation, `KjVariant` / `KjSize` composition on items, `aria-orientation` on the root, indentation level reflection. **No** `role="menu"`. |
| **Wrapper component** | `<kj-menu>`, `<kj-menu-item>`, `<kj-menu-link>`, `<kj-menu-button>`, `<kj-menu-group>`, `<kj-menu-title>`, `<kj-menu-submenu>` | Renders the recommended container markup (`<nav>` for nav menus, `<ul>` / `<li>` for non-nav action lists), forwards every directive input, projects content. |
| **CSS layer** | `.kj-nav-menu`, `.kj-nav-menu[data-orientation=…]`, `.kj-nav-menu-item[data-active="true"]`, `.kj-nav-menu-submenu[data-expanded="true"]`, indentation via CSS variable `--kj-nav-menu-depth` | Lives in `packages/components/src/nav-menu/nav-menu.css`. Reads from `--kj-color-nav-menu-bg`, `--kj-color-nav-menu-row-hover`, `--kj-color-nav-menu-row-active`, plus the variant tokens for coloured variants. |

## Decision (on the role debate)

**The inline navigation menu does not use `role="menu"`.** It uses the
native semantics of `<nav>` (or `<aside>`), `<ul>`, `<li>`, `<a>`, and
`<button>`. The active item is marked with `aria-current="page"`
(or `aria-current="step"` / `"location"` / `"true"` depending on
context). Sub-menus are inline **disclosure** regions, not nested
menus.

This is a strong position taken against PrimeNG's idiom, and it is
load-bearing for the rest of this analysis.

### Why not `role="menu"`

The WAI-ARIA Authoring Practices specification for the menu pattern
(<https://www.w3.org/WAI/ARIA/apg/patterns/menubar/>) is
unambiguous about what `role="menu"` requires:

- **A roving tabindex**: only one item in the menu is in the tab
  sequence at a time. The user `Tab`s *into* the menu and *out* of it
  in a single step; navigation between items is via arrow keys.
- **Arrow-key-only navigation between items**, with `Home`/`End`,
  type-ahead, and Escape-to-close.
- **An expectation of "menu-ness"**: AT announces the role, and
  experienced AT users build a mental model of "this is an actions
  menu, every item is a verb, activation runs a command".

Each of these is wrong for an inline navigation menu:

1. **Tab through items is the expected contract.** A user navigating
   a sidebar with a screen reader expects `Tab` to move from the
   current link to the next link in the rail (and onward into the
   page main content). That is how every navigation list on the web
   works. Mapping this to `role="menu"` would force the user to
   discover that they must press arrow keys instead — a discoverability
   regression. Native `<a>` elements are tab-stop-per-item by default;
   we honour that.

2. **Verbs vs. nouns mismatch.** APG's menu pattern is for verbs
   ("Save", "Cut", "Paste"). The inline navigation menu is for nouns
   ("Inbox", "Settings", "Billing"). The mental model AT users build
   from `role="menu"` is "this is an actions menu" — wrong for a
   navigation rail. The correct mental model is signalled by `<nav>`
   wrapping the list, plus `aria-label` naming the rail ("Primary
   navigation", "Settings sections").

3. **APG explicitly discourages it for navigation.** APG's Disclosure
   Navigation pattern
   (<https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/>) and the
   Authoring Practices' guidance for navigation rails
   (<https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/examples/navigation.html>)
   recommend native semantics for navigation. The menu pattern is
   reserved for actions menus (in a menubar, in a dropdown).

4. **`Esc` has no meaning on an inline menu.** The menu pattern's
   keyboard contract includes Escape-to-close. An inline menu has
   nothing to close — it lives in flow. AT users pressing Escape
   would expect a dismiss; getting a no-op is worse than not
   advertising the menu role at all.

The PrimeNG critique upstream confirms this — even though their
docs claim `role="menu"`, several reported a11y issues against
`<p-menu>` in static mode have argued for the role being dropped.
We make the cleaner choice.

### Naming and disambiguation

There is a real terminology problem here. "Menu" is overloaded across
the design system:

| Component | What it is | ARIA pattern |
|---|---|---|
| **This Menu** (`KjNavMenu`, `<kj-menu>`) | Inline navigation/action list, in flow | `<nav><ul><li>` (navigation pattern) |
| [Dropdown Menu](../actions/dropdown-menu.md) (`KjMenu` + `KjDropdownMenuTriggerFor`) | Popped-up actions menu opened from a button | `role="menu"` + `role="menuitem"` (menu pattern) |
| [Context Menu](../actions/context-menu.md) (`KjContextMenuTriggerFor`) | Right-click actions menu | `role="menu"` (menu pattern) |
| [Menubar](./menubar.md) (planned) | Horizontal row of dropdown triggers (the "File / Edit / View" bar of a desktop app) | `role="menubar"` + `role="menu"` (menubar pattern) |
| [Command Palette](../actions/command-palette.md) (`KjCommandPalette`) | Cmd-K typeahead launcher | `role="dialog"` + `role="listbox"` (combobox pattern) |

The directive name `KjMenu` is **already taken** by the
popped-up-menu primitive in `packages/core/src/menu/`. This Menu
therefore ships under a different directive name. Two viable
choices:

1. **`KjNavMenu`** — explicit about the nav-list intent. Clear, but
   slightly heavy at the call site.
2. **Rename the existing `KjMenu` to `KjPopupMenu` (or
   `KjDropdownMenu`) and free up `KjMenu` for this directive.**
   Heavy refactor of the existing menu folder; would also impact
   Dropdown Menu, Context Menu, and the existing
   `<kj-menu>` wrapper component (which today wraps the popup
   shape per [`rules/docs.md`](../../../rules/docs.md)).

**Decision: ship as `KjNavMenu` in `packages/core/src/nav-menu/`.**
The existing `KjMenu` family stays where it is (heavily used in
analysis docs already; renaming would invalidate cross-references in
six other files). The wrapper layer reuses the `<kj-menu>` selector
*name* — i.e., we **rename the existing `<kj-menu>` wrapper** to
`<kj-popup-menu>` (matching the dropdown-menu doc's preferred name)
and the navigation-list wrapper takes the bare `<kj-menu>` name.
Rationale: at the docs / consumer surface, "menu" without
qualification reads as the inline navigation list (matching daisyUI,
matching shadcn's Sidebar recipe, matching every documentation
sidebar consumers have ever seen). The popped-up version's docs
reference clarifies "popup menu" in its component name, which is
also the more accurate term.

This rename is a coordinated change with the Dropdown Menu doc and
the existing wrappers; the migration is mechanical (the existing
`<kj-menu>` consumers are docs-internal and within this repo). See
[Open question 1](#open-questions--risks) for the migration
sequencing.

### Why a directive family at all (not just CSS)

A CSS-only `.menu` class (parallel to daisyUI) was considered.
Rejected on five grounds:

1. **Sub-menu disclosure state.** A "Settings" group expanding to
   reveal "Profile / Account / Notifications" is a real interactive
   disclosure that needs `aria-expanded`, `aria-controls`,
   keyboard activation (Enter/Space), and persistence (a refresh
   should remember which groups were open). CSS cannot manage state
   or set `aria-expanded` based on it.
2. **Active-item discovery.** `aria-current="page"` is the canonical
   active-item indicator, but determining *which* item is active in a
   routed app requires the consumer to wire `routerLinkActive` and
   forward it as the input to the directive. A CSS class alone gets
   the styling but misses the AT contract.
3. **Keyboard interactions on the disclosure header.** Sub-menu
   triggers are `<button>`s with `aria-expanded`; activating them
   requires Enter/Space handling. The headless layer owns this
   (composing `KjAccordion` machinery — see Composition).
4. **Single source of truth for which sub-menus are open.** A nav
   rail with multiple expandable groups should answer "is the
   Settings group open?" from one place. Signal-context provided by
   the root directive is the natural shape.
5. **`KjVariant` / `KjSize` consumption.** Inline menu rows compose
   the same variant + size system as Button and Link, so each row
   directive composes the host directives. CSS classes alone cannot
   route the validated preset.

The directive family **does** earn its keep. We ship both the
directive layer (in `core`) and the wrapper layer (in `components`),
matching every other primitive in the library.

## Base features

| Feature | Where it lives | Notes |
|---|---|---|
| Orientation | `kjOrientation: 'vertical' \| 'horizontal'` input on `[kjNavMenu]` | Default `'vertical'`. Reflects `[attr.aria-orientation]` on the host (when host is `<ul>`) and `[attr.data-orientation]` for CSS hooks. The horizontal mode is the "tabs-but-not-tabs" case (think the top-of-page nav rail); for the desktop-app horizontal application bar, see [`./menubar.md`](./menubar.md) which is a different component with `role="menubar"`. |
| Variants | `kjVariant` (forwarded to `KjVariant` host directive on each item directive) | Default preset list: `'default' \| 'ghost' \| 'subtle' \| 'destructive'`. The `default` variant is the standard sidebar-row visual; `ghost` is the no-background row; `subtle` is the muted-text-only row (used inside dense settings menus); `destructive` is for "Delete account" rows. |
| Sizes | `kjSize` (forwarded to `KjSize` host directive on each item directive) | Default preset list: `'sm' \| 'md' \| 'lg'`. The `sm` size targets dense file-tree menus (think VS Code's explorer); `md` is the default sidebar-nav row; `lg` is the comfortable settings-menu row with more vertical breathing room. The wrapper guarantees ≥ 44×44 CSS px hit area on every size — see [Accessibility](#accessibility-wcag-21-aaa). |
| Active item | `kjActive: boolean` input on `[kjNavMenuLink]` and `[kjNavMenuButton]` | Reflects `aria-current="page"` (default) when `true`. Override the `aria-current` value via a separate `kjAriaCurrent: 'page' \| 'step' \| 'location' \| 'date' \| 'time' \| 'true' \| 'false'` input — defaults to `'page'`. The consumer wires the truthy state from `routerLinkActive` (Angular Router) or their own router state. The CSS layer reads `[aria-current]` (any value other than `'false'`) for the active visual — no separate `data-active` attribute. See [Open question 2](#open-questions--risks) on whether to compose `routerLinkActive` directly. |
| Sub-menu disclosure | `[kjNavMenuSubmenu]` (group), `[kjNavMenuSubmenuTrigger]` (header button), `[kjNavMenuSubmenuContent]` (collapsible region) | The submenu trio composes `KjAccordionItem` machinery for the open-state signal and `aria-expanded` / `aria-controls` wiring (see [Composition](#composition-model)). The consumer activates the trigger with Enter/Space (native `<button>` behaviour); the content region is rendered with `[hidden]` toggling rather than DOM removal so screen-reader cursor positions stay stable across collapse/expand. |
| Sub-menu open mode | `kjSubmenuMode: 'single' \| 'multiple'` on `[kjNavMenu]` | Default `'multiple'`. With `'single'`, opening one sub-menu closes others (accordion-style); with `'multiple'`, sub-menus toggle independently. The default matches sidebar nav expectations (multiple sections expanded simultaneously); `'single'` is for dense settings menus where vertical space is tight. |
| Indentation | CSS variable `--kj-nav-menu-depth` reflected via `[style.--kj-nav-menu-depth]` on each item directive | Each item directive computes its depth from injected ancestor `KJ_NAV_MENU_LEVEL` context (provided by `[kjNavMenuSubmenuContent]` at depth + 1). The CSS layer multiplies this by a base padding token (`--kj-nav-menu-depth-step`, default `1rem`) for visual indentation. No nesting limit; the CSS scales linearly. See [Open question 3](#open-questions--risks) on RTL behaviour. |
| Group / heading | `[kjNavMenuGroup]` (wrapper) + `[kjNavMenuTitle]` (heading text) | A group is `role="group"` (only when not the root, where `<ul>` is enough) plus an optional `aria-labelledby` to a `[kjNavMenuTitle]` id. The title renders as a real heading (`<h2>`/`<h3>` depending on a `kjHeadingLevel` input, default `'h3'`); it is **not** `role="presentation"` (unlike the popup menu's label, where group label semantics differ). This is the navigation-pattern choice: real headings get heading-list announcement in screen readers, supporting heading-by-heading navigation through the rail. |
| Disabled item | `kjDisabled: boolean` input on `[kjNavMenuLink]` and `[kjNavMenuButton]` (forwarded to `KjDisabled`) | Reflects `aria-disabled="true"`. For links, also sets `tabindex="-1"` and capture-phase intercepts `click` + `keydown.enter` (same disabled-link bundle as [Link](./link.md)'s implementation; we inline the same behaviour rather than duplicate `KjLink` here). For buttons, the native `disabled` attribute is set (along with `aria-disabled` for AT). |
| Touch target | CSS layer | Every item is ≥ 44×44 CSS px (WCAG 2.5.5 AAA). `min-height: 2.75rem` at `md` and `lg`; at `sm`, `min-height: 2rem` plus `padding: 0.375rem 0` extends the hit area to 44px without changing the visual size. See [Accessibility](#accessibility-wcag-21-aaa). |
| Icon slot | Free-form children of `[kjNavMenuLink]` / `[kjNavMenuButton]` | The wrapper styles a leading `<svg>` / `<kj-icon>` automatically (via `:where()` CSS); the consumer just writes `<a kjNavMenuLink><kj-icon name="settings" /> Settings</a>`. The icon is decorative — `aria-hidden="true"` is the consumer's responsibility (or the icon component's default). |
| Trailing badge / count slot | Free-form children, with a CSS hook | A `<kj-badge>` placed at the end of the row gets pushed to the trailing edge by flex layout. No special directive — content composition is enough. |
| Active-section bubbling | Item active state propagates upward to the containing sub-menu trigger | When a sub-menu's content contains an active item, the sub-menu's trigger reflects `data-has-active-descendant="true"` for styling (a tinted left border in the default theme). Computed via a signal on the submenu context that aggregates child active state. **Does not** set `aria-current` on the trigger — only the leaf is `aria-current="page"`. This is purely visual feedback. |
| Auto-expand to active | `kjAutoExpandActive: boolean` input on `[kjNavMenu]` | Default `true`. When a sub-menu contains the active item on initial render, that sub-menu auto-expands. Implemented as an `effect()` on the root that reads child active states and calls `submenu.expand()` once at construction. Defer to v1.1 if it interacts badly with persisted open-state — see [Open question 4](#open-questions--risks). |
| Persisted open state | `kjPersistKey: string \| undefined` input on `[kjNavMenu]` | When set, the open-set of sub-menus persists to `localStorage` (or `sessionStorage` per `kjPersistStorage: 'local' \| 'session'`, default `'local'`). The consumer's responsibility to ensure the key is unique per menu instance and per user (e.g. include user id). Defer to v1.1 if `localStorage` access patterns cause SSR friction; the in-memory state machine works without persistence. See [Open question 5](#open-questions--risks). |
| Collapsed (icon-only) mode | **Out of scope for Menu**; lives on Sidebar | When a sidebar collapses to a 56px icon-only rail, the Menu inside it should hide its labels and show tooltips on icon hover. That orchestration is Sidebar's job — Sidebar provides a `KJ_SIDEBAR_COLLAPSED` context that Menu items consume to flip their layout. This Menu directive does not own the collapsed state, but it does honour an injected `KJ_SIDEBAR_COLLAPSED` signal when present. See [`./sidebar.md`](./sidebar.md) (planned). |
| Anchor as button | Both shapes supported via `[kjNavMenuLink]` (anchor row) and `[kjNavMenuButton]` (button row) | A nav menu typically contains links (navigation), but settings menus often contain buttons that toggle in-page state (e.g. "Toggle dark mode" in a sidebar). Both row directives exist; pick by host element: `<a kjNavMenuLink>` for navigation, `<button kjNavMenuButton>` for actions. Visually identical; semantically different. |

## Accessibility (WCAG 2.1 AAA)

Reference: [APG Disclosure Navigation Menu](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/),
[ARIA in HTML](https://www.w3.org/TR/html-aria/),
[WCAG SC 2.4.5 Multiple Ways](https://www.w3.org/WAI/WCAG21/Understanding/multiple-ways.html),
[WCAG SC 2.4.8 Location (AAA)](https://www.w3.org/WAI/WCAG21/Understanding/location.html),
[ARIA `aria-current` spec](https://www.w3.org/TR/wai-aria-1.2/#aria-current).

### Roles

| Element | Role / element | Notes |
|---|---|---|
| `[kjNavMenu]` (root, when on `<ul>`) | implicit `list` from `<ul>`. Recommended host wrapper is `<nav>` (landmark) wrapping the `<ul>` | The directive does **not** force `<nav>` because non-navigation menus (action lists in a settings panel) shouldn't claim the navigation landmark. The wrapper component `<kj-menu>` accepts a `kjLandmark: 'navigation' \| 'none'` input (default `'navigation'`) that controls whether to render the surrounding `<nav>`. |
| `[kjNavMenu]` (root, when on `<menu>` HTML element) | implicit `list` (HTML `<menu>` element maps to `role="list"` per [ARIA in HTML §menu](https://www.w3.org/TR/html-aria/#el-menu)) | Pre-existing native HTML `<menu>` element. Allowed but not recommended; `<ul>` is more universally supported. |
| `[kjNavMenuItem]` | implicit `listitem` from `<li>` | Plain row container; rarely directly addressed. The interactive surface inside is the link / button. |
| `[kjNavMenuLink]` | implicit `link` from `<a href>` | The interactive row when navigating. |
| `[kjNavMenuButton]` | implicit `button` from `<button>` | The interactive row when invoking an action. |
| `[kjNavMenuGroup]` | `group` (only when not redundant — i.e., when the group is not the root `<ul>`) + optional `aria-labelledby` to a `[kjNavMenuTitle]` id | When a group has a heading, the group + heading combination provides AT users with a navigable section. |
| `[kjNavMenuTitle]` | `<h2>`/`<h3>`/etc. via `kjHeadingLevel` input | Real heading element. The default level is `h3`; consumers who nest a Menu inside an `<aside>` whose own heading is `h2` should set `kjHeadingLevel="h3"` to maintain heading hierarchy. |
| `[kjNavMenuSubmenu]` | implicit `listitem` from `<li>` (the submenu is a row that expands) | The submenu is structurally a row with a button trigger and a nested `<ul>` body. |
| `[kjNavMenuSubmenuTrigger]` | implicit `button` from `<button>` | Owns `aria-expanded`, `aria-controls`. Activates Enter/Space natively. |
| `[kjNavMenuSubmenuContent]` | implicit `list` from `<ul>` (no `role="region"` — the surrounding `<ul>`/`<li>` structure is sufficient) | Hidden via `[hidden]` (not via `display:none` from CSS, because the directive needs to control hide/show without a layout flash). When hidden, descendant interactive elements are removed from the tab sequence by the native `[hidden]` semantics. |

### ARIA wiring

On `[kjNavMenu]`:

- **No `role`.** Native `<ul>` semantics. The directive does not set
  `role="menu"`, does not set `role="menubar"`, does not set
  `role="navigation"` (the wrapper `<nav>` provides the landmark).
- `[attr.aria-orientation]` reflected from `kjOrientation` only when
  set explicitly to `'horizontal'` (the default for `<ul>` is
  vertical and AT-implied).
- `[attr.aria-label]` from `kjAriaLabel` input, OR
  `[attr.aria-labelledby]` from `kjAriaLabelledby` input. **Mutually
  exclusive.** Required for naming the menu rail when not wrapped in
  a `<nav>` with its own `aria-label`. The wrapper component
  `<kj-menu>` wires this onto the surrounding `<nav>` instead when
  `kjLandmark="navigation"`.

On `[kjNavMenuLink]`:

- `[attr.aria-current]` reflects `kjAriaCurrent` when `kjActive()` is
  `true`; absent (not `'false'`) when inactive. The `'false'` value
  is reserved for explicitly indicating non-current — most consumers
  want absence.
- `[attr.aria-disabled]` from `KjDisabled` host directive.
- `[attr.tabindex]` is `'-1'` when `kjDisabled()` is `true`; otherwise
  unset (preserves consumer-supplied `tabindex`).
- `[attr.rel]` etc. — same external-link plumbing as
  [Link](./link.md). Recommend: when the row is genuinely an
  external link (rare but possible in a footer-style nav menu),
  consumers compose both `[kjNavMenuLink]` and `[kjLink]` on the
  same `<a>` (no conflict — `KjLink` owns external-link plumbing,
  `KjNavMenuLink` owns active-state and indentation). See
  [Composition](#composition-model).

On `[kjNavMenuButton]`:

- `[attr.aria-current]` same as `[kjNavMenuLink]`. Useful for
  action rows that represent a current setting (e.g. "Light mode"
  marked active in a theme picker rendered as a nav menu).
- `[attr.aria-disabled]` and `[disabled]` (native) reflected from
  `KjDisabled`.

On `[kjNavMenuSubmenuTrigger]`:

- `[attr.aria-expanded]` reflects the submenu's open signal.
- `[attr.aria-controls]` points to the submenu content's id
  (auto-generated `kj-nav-menu-submenu-{n}`).
- `[attr.aria-disabled]` from `KjDisabled` if the entire group is
  disabled (rare; used to grey out a section without removing it).
- The trigger does **not** set `aria-haspopup`. `aria-haspopup` is for
  popped-up menus (or dialogs, etc.) — sub-menus are inline
  disclosure, not popups. This is a deliberate divergence from
  `[kjDropdownMenuTriggerFor]`.

On `[kjNavMenuSubmenuContent]`:

- `[attr.id]` set to the auto-generated submenu id.
- `[hidden]` toggled from the submenu's open signal.
- `[attr.aria-labelledby]` defaults to the trigger's id (so AT users
  exiting the submenu region announce the section name). Computed by
  the submenu context.

On `[kjNavMenuTitle]`:

- Renders as `<h2>` / `<h3>` / etc. per `kjHeadingLevel` input.
- Auto-generates an id consumed by the wrapping `[kjNavMenuGroup]` or
  `[kjNavMenuSubmenu]` for `aria-labelledby`.

### Keyboard contract

The keyboard contract is **native** — the directive family adds
nothing beyond what `<a>` and `<button>` already provide.

| Key | When focus is on… | Behaviour |
|---|---|---|
| `Tab` | Anywhere in the menu | Move focus to the next focusable element in document order. **Every link / button is its own tab stop.** No roving. This is the central contract that distinguishes inline navigation menus from popped-up `role="menu"`. |
| `Shift+Tab` | Anywhere in the menu | Move focus to the previous focusable element. |
| `Enter` | Link | Native: navigate. (Plus `routerLink` handler if composed.) |
| `Enter` / `Space` | Button | Native: activate. |
| `Enter` / `Space` | Submenu trigger | Native: toggle the submenu's open state. The directive's click handler on the trigger button calls `ctx.toggle()`. |
| `Escape` | Anywhere in the menu | **No-op.** The menu is in flow; nothing to dismiss. (When the menu lives inside a Sidebar and the Sidebar is in a mobile-overlay mode, the Sidebar may handle `Escape` to close — that is Sidebar's concern, not Menu's.) |
| Arrow keys | Anywhere in the menu | **No-op.** Inline navigation menus do not use arrow keys; this is the central deviation from the popup menu pattern. AT users who prefer arrow-key list navigation use their AT's list-navigation mode (NVDA virtual cursor, JAWS arrow-key navigation in browse mode), which works on the underlying list semantics. |

**Optional arrow-key navigation as opt-in**: A consumer who wants
arrow-key navigation through the menu (some legacy app shells expect
this) can compose `KjRovingTabindex` on the menu host. The directive
does **not** ship this by default; if it did, the keyboard contract
would change between consumers in a confusing way. See
[Open question 6](#open-questions--risks).

### Focus management

- **No focus trap.** The menu is in flow.
- **No focus restoration.** The menu doesn't open or close as a unit.
- **Sub-menu open/close** does not move focus. Activating a submenu
  trigger toggles the submenu's open state; focus stays on the
  trigger. This matches APG's Disclosure Navigation pattern. The
  trigger remains focused until the user explicitly tabs into the
  expanded content.
- **Disabled items**: stay focusable but `tabindex="-1"` removes them
  from the tab sequence. AT users still discover them via
  list-navigation mode (where `aria-disabled` is announced). This
  matches the [Link](./link.md) disabled-bundle exactly.
- **Active item on initial render**: the directive does **not**
  auto-focus the active item. Auto-focusing an in-flow menu's active
  item would steal focus from wherever the page should land
  (typically the page's main heading or `<h1>`). Consumers who want
  to scroll the active item into view (rare; useful in a long
  scrollable nav rail) wire that themselves with
  `element.scrollIntoView({ block: 'nearest' })` on the active item.
  See [Open question 7](#open-questions--risks).

### Touch target (WCAG 2.5.5 AAA — 44×44 CSS px)

Every item is ≥ 44×44 CSS px:

- `kjSize="md"` (default) and `kjSize="lg"`: `min-height: 2.75rem`
  (44px) — explicit.
- `kjSize="sm"`: `min-height: 2rem` (32px visual) plus
  `padding-block: 0.375rem` (6px each side) extends the hit area
  vertically to 44px without changing the visible row height. The
  click handler is on the `<a>`/`<button>` element which is the
  full row width and the full padded height.

Disabled items stay at the same hit area — disabled does not mean
visually shrunken.

### Active-state contrast

The active row's visual treatment is a coloured background (the
"active rail" affordance). The contrast bar applies to:

- **Active row text vs. active row background**: ≥ 7:1 (AAA).
  Verified against `--kj-color-nav-menu-row-active-bg` and
  `--kj-color-nav-menu-row-active-fg` in light, dark, and
  high-contrast themes. The CSS layer ships these tokens; the theme
  layer tunes them.
- **Active row indicator vs. surrounding rail**: ≥ 3:1 (1.4.11
  Non-text Contrast). Typically a left-edge accent stripe (4px wide)
  in `--kj-color-primary` against `--kj-color-base-200` is the
  default, verified.
- **Active item AT announcement**: `aria-current="page"` is read by
  AT as "current page" — a programmatic distinction independent of
  visual contrast. WCAG 1.4.1 Use of Colour cleared.

### Reduced motion

Sub-menu expand/collapse animation: a CSS height transition on the
`[kjNavMenuSubmenuContent]` element, guarded by
`@media (prefers-reduced-motion: reduce)` to disable. Same pattern as
[Accordion](../data-display/accordion.md). The directive reflects
`[attr.data-state="open" \| "closed" \| "opening" \| "closing"]` for
the wrapper to key animation off.

### Heading hierarchy

`[kjNavMenuTitle]` renders a real heading. The default level is
`h3`. Consumers must verify the heading level is correct for their
page hierarchy:

- A sidebar with its own `<h2>` ("Documentation") containing a Menu
  with `[kjNavMenuTitle]` rows ("Getting started", "Components")
  should set `kjHeadingLevel="h3"`.
- A settings page with `<h1>` ("Settings") containing a Menu with
  group headings ("Account", "Privacy") should set `"h2"`.

The directive cannot infer the right level (no parent heading
traversal); the consumer is responsible. We **do** ship a dev-mode
warning when the same Menu has multiple `kjHeadingLevel` values (a
sign of inconsistent setup). See [Open question 8](#open-questions--risks).

### Skip link integration

A long sidebar nav warrants a skip-link (`<a href="#main">Skip to
main content</a>`). Skip links are a page-level concern, not a Menu
concern; the Menu does not ship one. The wrapper component's docs
recommend the skip-link pattern in any layout that wraps a Menu in a
landmark.

## Composition model

```
[Core directive family]                          (folder: packages/core/src/nav-menu/)
  ├── nav-menu.ts                                (selector: [kjNavMenu] — root)
  │   provides: KJ_NAV_MENU
  │   provides: KJ_NAV_MENU_LEVEL = signal(0)
  │   inputs: kjOrientation, kjSubmenuMode, kjAutoExpandActive,
  │           kjPersistKey, kjPersistStorage, kjAriaLabel, kjAriaLabelledby
  │
  ├── nav-menu-item.ts                           (selector: [kjNavMenuItem] on <li>)
  │   plain row wrapper; reflects [style.--kj-nav-menu-depth]
  │
  ├── nav-menu-link.ts                           (selector: a[kjNavMenuLink])
  │   hostDirectives:
  │     ├── KjVariant   (input alias kjVariant)
  │     ├── KjSize      (input alias kjSize)
  │     ├── KjDisabled  (input alias kjDisabled)
  │     └── KjFocusRing
  │   inputs: kjActive, kjAriaCurrent
  │   owns: aria-current reflection, disabled-link bundle
  │           (tabindex="-1" + capture-phase click/keydown.enter suppression),
  │           depth reflection (--kj-nav-menu-depth)
  │
  ├── nav-menu-button.ts                         (selector: button[kjNavMenuButton])
  │   hostDirectives:
  │     ├── KjVariant, KjSize, KjDisabled, KjFocusRing
  │   inputs: kjActive, kjAriaCurrent
  │   owns: aria-current reflection, depth reflection
  │
  ├── nav-menu-group.ts                          (selector: [kjNavMenuGroup])
  │   resolves: aria-labelledby from a contentChild(KjNavMenuTitle)
  │   sets: role="group" (when not the root)
  │
  ├── nav-menu-title.ts                          (selector: [kjNavMenuTitle])
  │   inputs: kjHeadingLevel
  │   renders: chosen heading element via host element type
  │            (consumer applies the directive on <h2>/<h3>/etc. directly;
  │            the input is a guard / dev-mode validator, not a renderer)
  │   auto-generates: id (kj-nav-menu-title-{n}) for parent group's aria-labelledby
  │
  ├── nav-menu-submenu.ts                        (selector: [kjNavMenuSubmenu] on <li>)
  │   composes (hostDirective): KjAccordionItem (input alias kjItemValue: kjSubmenuValue)
  │   provides: KJ_NAV_MENU_SUBMENU (open signal, trigger id, content id)
  │   provides: KJ_NAV_MENU_LEVEL = parent level + 1
  │
  ├── nav-menu-submenu-trigger.ts                (selector: button[kjNavMenuSubmenuTrigger])
  │   hostDirectives: KjVariant, KjSize, KjDisabled, KjFocusRing
  │   composes: KjAccordionTrigger (provides aria-expanded + click toggle)
  │   inputs: kjVariant, kjSize, kjDisabled
  │
  ├── nav-menu-submenu-content.ts                (selector: ul[kjNavMenuSubmenuContent])
  │   composes: KjAccordionContent (provides [hidden] + aria-labelledby)
  │   reflects: data-state="open" | "closed" | "opening" | "closing"
  │
  ├── nav-menu.context.ts
  │   ├── KjNavMenuContext { orientation, submenuMode, openSubmenus, expandSubmenu, collapseSubmenu, isExpanded }
  │   ├── KJ_NAV_MENU
  │   ├── KjNavMenuSubmenuContext { open, expanded, triggerId, contentId, toggle, expand, collapse }
  │   ├── KJ_NAV_MENU_SUBMENU
  │   └── KJ_NAV_MENU_LEVEL = InjectionToken<Signal<number>>('KjNavMenuLevel')
  │
  ├── nav-menu.spec.ts
  ├── nav-menu.example.ts
  ├── nav-menu.submenu.example.ts
  ├── nav-menu.horizontal.example.ts
  ├── nav-menu.persisted.example.ts
  └── index.ts

[Wrapper component family]                       (folder: packages/components/src/nav-menu/)
  ├── nav-menu.ts                                (selector: kj-menu)
  │   re-exports: kjOrientation, kjSubmenuMode, kjAriaLabel, kjAriaLabelledby,
  │              kjLandmark, kjAutoExpandActive, kjPersistKey
  │   template:
  │     @if (kjLandmark() === 'navigation') {
  │       <nav [attr.aria-label]="kjAriaLabel() || null"
  │            [attr.aria-labelledby]="kjAriaLabelledby() || null">
  │         <ul kjNavMenu [kjOrientation]="kjOrientation()" ...>
  │           <ng-content />
  │         </ul>
  │       </nav>
  │     } @else {
  │       <ul kjNavMenu [attr.aria-label]="kjAriaLabel() || null" ...>
  │         <ng-content />
  │       </ul>
  │     }
  │
  ├── nav-menu-item.ts                           (selector: kj-menu-item)
  │   template: <li kjNavMenuItem><ng-content /></li>
  │
  ├── nav-menu-link.ts                           (selector: kj-menu-link)
  │   template: <a kjNavMenuLink [href]="kjHref()" [routerLink]="kjRouterLink()"
  │                [kjActive]="kjActive()" [kjVariant]="..." [kjSize]="..." ...>
  │              <ng-content />
  │            </a>
  │
  ├── nav-menu-button.ts                         (selector: kj-menu-button)
  │   template: <button kjNavMenuButton (click)="kjActivate.emit()"
  │                     [kjActive]="kjActive()" ...>
  │              <ng-content />
  │            </button>
  │
  ├── nav-menu-group.ts, nav-menu-title.ts, nav-menu-submenu.ts,
  │   nav-menu-submenu-trigger.ts, nav-menu-submenu-content.ts
  │   (parallel wrappers for each directive)
  │
  └── nav-menu.css                               (CSS layer)
      .kj-nav-menu, .kj-nav-menu[data-orientation],
      .kj-nav-menu-link[aria-current], .kj-nav-menu-link[data-disabled],
      .kj-nav-menu-submenu[data-state],
      .kj-nav-menu-link, .kj-nav-menu-button {
        padding-inline-start: calc(var(--kj-nav-menu-depth, 0) * var(--kj-nav-menu-depth-step, 1rem)
                                  + var(--kj-nav-menu-base-padding-inline));
      }
```

### Reuse of `KjAccordion` for sub-menu disclosure

The submenu disclosure machinery is **the same machinery as
Accordion**. We do not re-implement open-set state, single/multiple
mode, `aria-expanded` wiring, `aria-controls` wiring, or the
`[hidden]` toggle. Instead:

- `[kjNavMenuSubmenu]` composes `KjAccordionItem` via `hostDirectives`,
  forwarding its `kjSubmenuValue` input as `KjAccordionItem`'s
  `kjItemValue`.
- `[kjNavMenuSubmenuTrigger]` composes `KjAccordionTrigger`, getting
  `aria-expanded` + click-to-toggle for free.
- `[kjNavMenuSubmenuContent]` composes `KjAccordionContent`, getting
  `[hidden]` + `aria-labelledby` wiring for free.
- `[kjNavMenu]` composes `KjAccordion` to own the open-set signal
  (`single` vs. `multiple`) — `kjSubmenuMode` is forwarded as
  `KjAccordion`'s `kjMode` input.

The composition is mechanical. The Menu directive family adds the
*navigation-list specific* parts (active-item indicator, indentation,
heading slot, link/button row split) on top of the disclosure
foundation. This keeps Menu small and means bug fixes / a11y
improvements to Accordion automatically benefit Menu.

### Reused primitives

| Primitive | Where | Why |
|---|---|---|
| `KjVariant` | `hostDirectives` on each row directive (`KjNavMenuLink`, `KjNavMenuButton`, `KjNavMenuSubmenuTrigger`) | Standard preset routing. Variants live on rows, not on the root. |
| `KjSize` | `hostDirectives` on each row directive | Standard preset routing. |
| `KjDisabled` | `hostDirectives` on `KjNavMenuLink`, `KjNavMenuButton`, `KjNavMenuSubmenuTrigger` | Provides `aria-disabled` reflection. The capture-phase click + keydown suppression on disabled links is inlined in `KjNavMenuLink` (richer contract — same as Link / Button). |
| `KjFocusRing` | `hostDirectives` on each row directive | Reflects `data-focus-visible=""` on keyboard focus. CSS layer paints the ring. |
| `KjAccordion`, `KjAccordionItem`, `KjAccordionTrigger`, `KjAccordionContent` | `hostDirectives` on the corresponding submenu directives | Provides the entire disclosure state machine — see above. |
| `KjVisuallyHidden` | Not used directly — but the wrapper's CSS layer uses the `.kj-visually-hidden` class for the optional skip-link. | Skip-link pattern is documented but not auto-rendered. |
| `KjFocusTrap` / `KjLiveRegion` / `KjRovingTabindex` | **Not used.** | No focus trap (in-flow), no live region (active-state announcement is via `aria-current`, which AT reads natively), no roving tabindex (Tab through items is the contract — see Decision). |

### Cross-component pointers

- [`../actions/dropdown-menu.md`](../actions/dropdown-menu.md) — the
  popped-up sibling. Same item-type taxonomy is **not** shared:
  Dropdown Menu items are `role="menuitem"` (with `menuitemcheckbox` /
  `menuitemradio` variants); Nav Menu items are plain `<a>` / `<button>`
  with no special role. The two directive families are sibling but
  separate. The naming-collision migration (this file's
  [Decision](#decision-on-the-role-debate)) renames the existing
  `<kj-menu>` wrapper to `<kj-popup-menu>` to free the bare
  `<kj-menu>` name for this navigation-list component.
- [`../actions/context-menu.md`](../actions/context-menu.md) — the
  right-click sibling. Even more divergent: opens at the pointer
  position, uses `role="menu"`, dismissible. Not relevant to inline
  Menu's design except for the shared "menu" terminology.
- [`./menubar.md`](./menubar.md) (planned) — the **horizontal**
  desktop-app menubar (File / Edit / View). That uses
  `role="menubar"` + `role="menu"` and is the application-bar
  pattern; it composes Dropdown Menu's machinery, not this Nav
  Menu's. Visually distinct (horizontal, top-aligned, rendered above
  document content); semantically distinct (`role="menubar"` claims
  a specific keyboard contract). Do not confuse.
- [`./breadcrumb.md`](./breadcrumb.md) (planned) — a single-row,
  single-trail variant. Breadcrumb is `<nav aria-label="Breadcrumb">`
  + `<ol>` + per-crumb `<a>` (using [Link](./link.md)) — same
  underlying navigation-list semantics, different shape. Not a
  variant of Nav Menu; a separate component.
- [`./link.md`](./link.md) — the row's interactive surface. A
  `[kjNavMenuLink]` is conceptually `<a kjLink>` with active-state
  + indentation reflection added. We deliberately do **not** compose
  `KjLink` automatically: nav menu rows have different defaults
  (no underline, larger hit area, variant/size from preset list)
  and composing `KjLink` would force the consumer to override every
  default. Consumers who genuinely want external-link plumbing on a
  nav row compose both directives manually:
  `<a kjNavMenuLink kjLink kjExternal href="https://...">`.
- [`./sidebar.md`](./sidebar.md) (planned) — the app-shell wrapper
  that contains a Menu plus header + collapse toggle. Sidebar
  provides `KJ_SIDEBAR_COLLAPSED` context that this Menu's items
  honour for the collapsed-icon-only mode. Sidebar does **not**
  wrap Menu (the consumer composes them); it provides the
  collapse-state context.
- [`../data-display/accordion.md`](../data-display/accordion.md) —
  the disclosure machinery used for sub-menus. Composed via
  `hostDirectives`, not duplicated. Bug fixes flow downstream.
- [`../data-display/list.md`](../data-display/list.md) — the
  data-display sibling. List holds homogeneous data rows (contacts,
  notifications, settings entries); Menu holds navigation/action
  targets. The visual chrome is similar (vertical list of rows) but
  the semantics diverge: List rows often have multi-line content
  with secondary text, may be selectable (via Listbox semantics in
  Select / Multi-select), and don't expand into sub-disclosures.
  List rows that happen to contain `<a kjLink>` are still List
  rows, not Menu items. The rule of thumb (lifted from List's own
  analysis): if rows are "navigate to / do this action", reach for
  Menu; if rows are "this is a piece of data", reach for List.
- [`../actions/command-palette.md`](../actions/command-palette.md) —
  the Cmd-K typeahead launcher. Lives in modal-overlay land; uses
  `role="dialog"` + `role="listbox"`. No semantic overlap with Nav
  Menu beyond the shared "list of selectable rows" mental model.
- [`../actions/button.md`](../actions/button.md) — the row's button
  shape. `[kjNavMenuButton]` is conceptually `<button kjButton>` with
  active-state + indentation reflection added. Same composition
  argument as Link: do not auto-compose `KjButton` (different
  defaults).

## Inputs / Outputs / Models

All public-facing inputs / outputs / models are `kj`-prefixed per
[`rules/code_style.md`](../../../rules/code_style.md).

### Core directive — `[kjNavMenu]`

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjOrientation` | `'vertical' \| 'horizontal'` | `'vertical'` | Reflects `[attr.aria-orientation]` (only when `'horizontal'`) and `[attr.data-orientation]`. |
| `kjSubmenuMode` | `'single' \| 'multiple'` | `'multiple'` | Forwarded to composed `KjAccordion`'s `kjMode`. |
| `kjAutoExpandActive` | `boolean` | `true` | When `true`, sub-menus containing the active item auto-expand on initial render. |
| `kjPersistKey` | `string \| undefined` | `undefined` | When set, persists open-set to storage. Defer to v1.1 if SSR-compat issues. |
| `kjPersistStorage` | `'local' \| 'session'` | `'local'` | Storage backend for `kjPersistKey`. |
| `kjAriaLabel` | `string \| undefined` | `undefined` | Accessible name for the menu rail. Mutually exclusive with `kjAriaLabelledby`. |
| `kjAriaLabelledby` | `string \| undefined` | `undefined` | Id of element labelling the menu rail. |

| Output | Payload | Notes |
|---|---|---|
| `kjSubmenuExpand` | `string` (the submenu's value) | Convenience event when any submenu expands. |
| `kjSubmenuCollapse` | `string` | Convenience event on collapse. |

### `[kjNavMenuLink]`

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjVariant` | preset | from `KJ_NAV_MENU_CONFIG` | Forwarded to `KjVariant`. Preset list: `'default' \| 'ghost' \| 'subtle' \| 'destructive'`. |
| `kjSize` | preset | from `KJ_NAV_MENU_CONFIG` | Forwarded to `KjSize`. Preset list: `'sm' \| 'md' \| 'lg'`. |
| `kjActive` | `boolean` | `false` | Reflects `aria-current` (per `kjAriaCurrent`) and `data-active`. |
| `kjAriaCurrent` | `'page' \| 'step' \| 'location' \| 'date' \| 'time' \| 'true'` | `'page'` | Value used when `kjActive()` is `true`. |
| `kjDisabled` | `boolean` | `false` | Forwarded to `KjDisabled`. Inlines the disabled-link bundle (tabindex + click suppression). |

No outputs — links navigate natively.

### `[kjNavMenuButton]`

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjVariant`, `kjSize`, `kjActive`, `kjAriaCurrent`, `kjDisabled` | (same as link) | (same as link) | Same shape. |

| Output | Payload | Notes |
|---|---|---|
| `kjActivate` | `void` | Fires on click / Enter / Space. Suppressed when disabled. |

### `[kjNavMenuSubmenu]`

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjSubmenuValue` | `string` | required | Identifies the submenu in the open-set. Forwarded to `KjAccordionItem`'s `kjItemValue`. |
| `kjDisabled` | `boolean` | `false` | When `true`, the trigger is disabled — entire group greyed out. |

| Output | Payload | Notes |
|---|---|---|
| `kjExpandedChange` | `boolean` | Fires when the submenu opens/closes. |

### `[kjNavMenuSubmenuTrigger]`

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjVariant`, `kjSize`, `kjDisabled` | (same shape as link) | (same defaults) | The trigger is a row-styled `<button>`. |

No outputs — handled via the parent `[kjNavMenuSubmenu]`.

### `[kjNavMenuSubmenuContent]`, `[kjNavMenuItem]`, `[kjNavMenuGroup]`, `[kjNavMenuTitle]`

No public inputs/outputs except:

- `[kjNavMenuTitle]` exposes `kjHeadingLevel: 'h2' \| 'h3' \| 'h4' \| 'h5' \| 'h6'`, default `'h3'`. The directive does **not** render the heading element itself (the consumer applies the directive on `<h3>` etc. directly); the input is a guard for dev-mode mismatch detection.

### Wrapper component — `<kj-menu>`

Re-exposes everything above, plus:

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjLandmark` | `'navigation' \| 'none'` | `'navigation'` | Whether to wrap the rendered `<ul>` in `<nav>`. Set to `'none'` for action-list usage (a settings menu inside a panel is not navigation). |

The wrapper's per-row components (`<kj-menu-link>`, `<kj-menu-button>`,
etc.) re-expose every directive input plus:

- `<kj-menu-link>`: `kjHref`, `kjRouterLink`, `kjTarget` — bound to
  the rendered `<a>`.
- `<kj-menu-button>`: `kjType: 'button' \| 'submit'`, default
  `'button'` — bound to the rendered `<button>`.

### Configuration (`KJ_NAV_MENU_CONFIG`)

```ts
export interface KjNavMenuConfig {
  variants: string[];
  sizes: string[];
  defaults: { variant: string; size: string };
  depthStep: string;       // CSS length, default '1rem'
  basePaddingInline: string; // default '0.75rem'
}

export const KJ_NAV_MENU_DEFAULTS: KjNavMenuConfig = {
  variants: ['default', 'ghost', 'subtle', 'destructive'],
  sizes: ['sm', 'md', 'lg'],
  defaults: { variant: 'default', size: 'md' },
  depthStep: '1rem',
  basePaddingInline: '0.75rem',
};

export const KJ_NAV_MENU_CONFIG = new InjectionToken<KjNavMenuConfig>(
  'kj.nav-menu.config',
  { factory: () => KJ_NAV_MENU_DEFAULTS },
);

export function provideKjNavMenu(config: Partial<KjNavMenuConfig>): Provider[];
```

## Examples to ship

`@doc-example` groups under the directive's TSDoc:

1. **Default sidebar nav** (`nav-menu.example.ts`) — a vertical nav
   menu with five items (Dashboard / Inbox / Sent / Drafts /
   Settings), one of which is `aria-current="page"`. Wrapped in
   `<nav aria-label="Primary navigation">`. Uses
   `<kj-menu kjAriaLabel="Primary navigation">` + `<kj-menu-link>`s.
2. **With sub-menus** (`nav-menu.submenu.example.ts`) — a Settings
   group expanding into Profile / Account / Notifications. Uses
   `<kj-menu-submenu kjSubmenuValue="settings">` with a trigger and
   nested `<kj-menu-link>`s. Demonstrates auto-expand-to-active.
3. **Single-mode sub-menus** (`nav-menu.single-mode.example.ts`) —
   `kjSubmenuMode="single"`; opening one section closes others.
4. **Horizontal nav** (`nav-menu.horizontal.example.ts`) — a
   horizontal top-of-page nav rail. `kjOrientation="horizontal"`,
   no sub-menus (horizontal sub-menus would imply menubar pattern
   instead).
5. **Action menu (non-navigation)** (`nav-menu.actions.example.ts`)
   — a settings panel using `kjLandmark="none"` and
   `<kj-menu-button>` rows for in-page actions. Demonstrates the
   action-list mode of this component.
6. **With group titles** (`nav-menu.groups.example.ts`) — two
   groups ("Account" / "Workspace") each with a `<kj-menu-title>`
   heading.
7. **Persisted open state** (`nav-menu.persisted.example.ts`) —
   `kjPersistKey="docs-sidebar"` showing that refresh restores the
   open-set.
8. **Disabled rows** (`nav-menu.disabled.example.ts`) — disabled
   link and disabled button side-by-side, demonstrating the
   tabindex/aria-disabled bundle.
9. **With routerLink** (`nav-menu.router.example.ts`) —
   `<a kjNavMenuLink routerLink="/billing"
       routerLinkActive="kj-active"
       [kjActive]="…"
       ariaCurrentWhenActive="page">`. Demonstrates the canonical
   Angular-router composition. Includes guidance on wiring
   `[kjActive]` from `routerLinkActive`'s state.
10. **Inside a Sidebar (collapsed mode)**
    (`nav-menu.collapsed.example.ts`) — placed inside a
    `<kj-sidebar collapsible="icon">`, showing how items shrink to
    icon-only on collapse and expand on hover.
11. **Themed** (`nav-menu.retro.example.ts`,
    `nav-menu.finance.example.ts`) — variant + size composition
    under retro and finance themes.

## Open questions / risks

1. **Naming-collision migration sequencing.** Renaming the existing
   `<kj-menu>` wrapper (which today wraps the popup-menu primitive)
   to `<kj-popup-menu>` is a coordinated change with the Dropdown
   Menu doc and any consumers. The migration sequence:
   1. Land this analysis.
   2. Update `actions/dropdown-menu.md` to recommend `<kj-popup-menu>`
      as the wrapper component name.
   3. Land the new `[kjNavMenu]` family in core under
      `packages/core/src/nav-menu/`. The existing
      `packages/core/src/menu/` family stays.
   4. Land the new `<kj-menu>` (nav-menu) wrapper in components.
      Rename the existing `<kj-menu>` (popup) wrapper to
      `<kj-popup-menu>` in the same PR. Find-and-replace across
      `apps/docs/src/**` and `packages/components/src/**.example.ts`.
   5. Update `rules/docs.md`'s mapping table: "Action menu" →
      `<kj-popup-menu>`, "Nav menu" → `<kj-menu>`.

   This is a one-shot rename with mechanical scope. **Risk**: any
   external consumer of `<kj-menu>` (none yet — pre-1.0) would see a
   breaking change. Document loudly in the changelog. Defer the
   rename if pre-1.0 consumers exist and the cost outweighs the
   naming clarity; in that case, this directive ships under
   `<kj-nav-menu>` permanently.

2. **`routerLinkActive` integration — directive or pattern?** A
   `[kjNavMenuLink]` typically derives its `kjActive` state from
   `routerLinkActive` in an Angular Router app. The current design
   has the consumer wire it manually:

   ```html
   <a kjNavMenuLink routerLink="/inbox" routerLinkActive
      #rla="routerLinkActive" [kjActive]="rla.isActive">Inbox</a>
   ```

   This is verbose. A `[kjNavMenuRouterLink]` directive that
   internally consumes `routerLinkActive` and reflects `kjActive`
   automatically would be ergonomic. **Lean: defer to v1.1.** The
   manual wiring is documented in the example; the auto-wiring is
   ergonomic sugar that depends on `@angular/router` being a peer
   dep (it already is for the router examples) but should not be
   mandatory. If we ship it, it's an optional secondary directive
   (`[kjNavMenuActive]` on the same `<a>`) so non-router apps don't
   pay for the router runtime.

3. **RTL indentation.** The CSS layer indents via
   `padding-inline-start`, which respects the document's
   `direction` (RTL flips the indentation to the right side). This
   is the correct behaviour and requires no JS support. Verify in
   visual regression tests that the indentation flips and the
   active-row indicator (left-edge accent stripe) flips to the
   right edge in RTL — the latter requires CSS `inset-inline-start`
   on the indicator. Standard responsive-CSS work; not blocking.

4. **`kjAutoExpandActive` interaction with persisted state.** When
   both `kjAutoExpandActive=true` and `kjPersistKey="…"` are set,
   the user's persisted preference (collapsed) may conflict with
   the auto-expand logic (containing the active item). **Decision**:
   the persisted state wins. The auto-expand only runs when
   nothing has been persisted (first visit / cleared storage).
   Implementation: `kjAutoExpandActive` is a one-shot effect that
   runs only when the persisted-state hydration returns no entries
   for the current menu. Document the precedence.

5. **`kjPersistKey` SSR / hydration.** `localStorage` access on
   server-side throws. Mitigation: the persistence read is gated
   behind `afterNextRender(() => …)` (browser-only), so SSR
   renders with the in-code default open-set, and post-hydration
   the persisted state may flip a section open/closed. **Risk**:
   layout shift on hydration if the persisted state differs from
   the SSR default. Mitigation: render the persisted state as a
   `[hidden]` toggle (no layout impact during the brief mismatch
   window) and use `display: none` only as a fallback. Document
   the risk; not a v1 blocker.

6. **Optional arrow-key roving navigation.** Some legacy app shells
   (notably file-tree explorers) expect arrow-key navigation
   through the menu, even when each row is a real `<a>`. Should
   we ship `kjArrowKeyNavigation: boolean` on `[kjNavMenu]` (default
   `false`) that composes `KjRovingTabindex` when true? **Lean:
   no for v1.** The optional behaviour creates two contracts the
   user must distinguish; documentation for "Tab through rows"
   becomes confusing. If a consumer needs file-tree navigation,
   that is a Tree component pattern (a separate, future component
   with proper `role="tree"` semantics). Defer indefinitely.

7. **Active-item scroll-into-view on initial render.** Long nav
   rails (think a 200-item sidebar in an admin console) may have
   the active item below the fold. Should the Menu auto-scroll
   the active item into view? **Lean: opt-in, not default.**
   `kjScrollActiveIntoView: boolean` input on `[kjNavMenu]`,
   default `false`. When `true`, the directive runs
   `element.scrollIntoView({ block: 'nearest', behavior: 'instant' })`
   on the active item once during `afterNextRender`. Defer to v1.1;
   the consumer can call this themselves with one line. Not
   blocking.

8. **`kjHeadingLevel` consistency dev-mode warning.** Multiple
   `<kj-menu-title>`s in the same Menu with different levels is
   suspicious. Default lean: warn in dev mode when more than one
   level is observed inside the same `[kjNavMenu]` instance. Useful
   guard; minor implementation cost. Ship in v1.

9. **Composition of `KjLink` on a nav row — recommended or
   discouraged?** A consumer who genuinely has an external link
   inside their nav menu (rare; e.g., a "Documentation" link
   pointing to an external docs site from a SaaS sidebar) would
   compose both `[kjNavMenuLink]` and `[kjLink]` on the same
   `<a>`. The two directives don't conflict — `KjNavMenuLink`
   owns active-state + indentation; `KjLink` owns external-link
   plumbing. But the visual treatments may collide
   (`KjLink`'s underline and `KjNavMenuLink`'s background-on-hover
   chrome). **Decision**: when composed together, the row reflects
   `data-external="true"` from `KjLink` and the CSS layer omits
   the underline (override via attribute selector). The trailing
   external-link icon stays. Document the pattern in
   `nav-menu.example.ts`.

10. **Group `role="group"` redundancy at the root.** When the
    `[kjNavMenu]` host is `<ul>`, the implicit `role="list"` is
    sufficient grouping. Adding a `role="group"` on the root would
    be redundant. The directive does **not** set `role` on the root.
    A nested `[kjNavMenuGroup]` (i.e., a `<li>` containing a sub-`<ul>`
    of items with a heading) **does** set `role="group"` on the
    sub-`<ul>` because that sub-list is conceptually a labelled
    group within the larger list. Consistent with APG's guidance.

11. **Action-list (non-navigation) usage and `<nav>` wrapper.**
    Setting `kjLandmark="none"` skips the surrounding `<nav>`. In
    that case, the menu is just a styled `<ul>` of action buttons —
    structurally a list of buttons. AT users get a list with
    `aria-label` and a series of buttons — exactly what they
    expect. No `role` claim on the root needed. The wrapper
    component handles this; the core directive is unaware.

12. **Sub-menu nesting depth.** No hard limit; the indentation CSS
    scales linearly with `--kj-nav-menu-depth`. Practical limit
    is roughly 3-4 levels before the indentation eats the row's
    horizontal space; deeper trees are a Tree component
    responsibility (future). Document the soft limit in the
    examples; do not enforce in code.

13. **Dev-mode warning for `<a>` without `href` or `routerLink`.**
    A `[kjNavMenuLink]` on an `<a>` with neither `href` nor
    `routerLink` is a non-link link — the disabled-link bundle
    handles activation correctly (capture-phase suppression) but
    the AT announces it as a link with no destination, which is
    user-hostile. Warn in dev mode. Ship in v1.

14. **`kjNavMenuButton` inside `<nav>` wrapper.** A `<nav>`
    landmark normally contains links, not buttons. Mixing buttons
    inside a `kjLandmark="navigation"` menu is unusual but valid
    (e.g., an "Open command palette" button at the bottom of a
    nav rail). Document the pattern; do not warn — the pattern is
    legitimate and AT users adapt.

15. **Print stylesheet.** A printed page rarely needs the
    interactive nav menu. The `kj-prose` print stylesheet pattern
    suggests `@media print { .kj-nav-menu { display: none; } }`
    by default. Consumer can override. Ship in v1 CSS layer.

16. **Internationalisation of "(opens in new tab)" suffix.** When
    `KjLink` is composed on a nav row, the i18n story for the
    AT suffix is Link's responsibility, not Menu's. Cross-reference
    [Link Open Question 15](./link.md). No new concern here.

17. **`sessionStorage` vs. `localStorage` default for
    `kjPersistKey`.** `'local'` survives browser restart; `'session'`
    resets on tab close. For a typical sidebar nav (admin console),
    `'local'` is the right default — users want their open sections
    to stay open across visits. For ephemeral menus (e.g., a wizard
    with collapsible sections inside a single flow),
    `'session'` is appropriate. Ship `'local'` as default; let
    consumers override.
