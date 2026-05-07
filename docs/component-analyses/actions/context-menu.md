# Context Menu

A menu surface that opens on **right-click** (desktop), **long-press**
(touch), or **Shift+F10 / `ContextMenu` key** (keyboard) at — or anchored
to — the user's pointer or the focused element. Item structure, ARIA
contract, and keyboard navigation are identical to the
[Dropdown Menu](./dropdown-menu.md); the only thing that differs is the
**trigger pattern** and the **anchor geometry** (a freely-positioned
point, not a fixed element rect).

> kouji-ui has no Context Menu in core today. This file specifies the
> v1 directive set, anchored positioning needs, and item-directive
> reuse from Dropdown Menu / Menu.

For the click-to-open sibling that anchors to a button see
[`dropdown-menu.md`](./dropdown-menu.md). For the existing low-level
items + roving navigation see `packages/core/src/menu/menu.ts`. For the
positioning primitive used to anchor at arbitrary coordinates see
[`feedback/popover.md`](../feedback/popover.md) and
`packages/core/src/popover/`.

## Source comparison

### PrimeNG — `<p-contextMenu>`

Public API surface (PrimeNG 17/18):

| Input              | Notes                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------- |
| `model`            | `MenuItem[]` — same item record as `<p-menu>` / `<p-tieredMenu>`.                         |
| `target`           | A CSS selector or `ElementRef`. The menu binds the `contextmenu` event of that target.    |
| `global`           | Boolean — when `true`, binds to `document.contextmenu` (right-click anywhere opens).      |
| `triggerEvent`     | `'rightclick' \| 'click'` — uncommon, but lets the same component double as a popover.    |
| `appendTo`         | `'body' \| ElementRef` — overlay portal target.                                            |
| `autoZIndex`       | Boolean — internal z-index manager.                                                       |
| `breakpoint`       | Width below which a mobile-style fullscreen sheet renders instead of a panel.             |
| `pressDelay`       | Long-press duration on touch (PrimeNG 18+, default 500 ms).                                |

| Output     | Notes                                                                                  |
| ---------- | -------------------------------------------------------------------------------------- |
| `onShow`   | Emitted when the panel becomes visible (after the contextmenu event).                  |
| `onHide`   | Emitted when the panel hides.                                                          |

Behaviour of note:

- `<p-contextMenu>` is a **separate component** from `<p-menu>` /
  `<p-tieredMenu>` even though item rendering, keyboard navigation, and
  the ARIA contract are identical. The duplication is justified only by
  the trigger surface (right-click on a target vs. click on a button).
- Calls `event.preventDefault()` on the host's `contextmenu` event to
  suppress the browser's native menu.
- Position is `{ x: event.pageX, y: event.pageY }` on right-click, with
  flip/shift collision handling against the viewport so the panel never
  clips off-screen.
- Long-press detection is bespoke (touchstart timer, cancelled by
  touchmove > N px or touchend before `pressDelay`).
- Keyboard alternative: PrimeNG documents Shift+F10 in their a11y
  notes but the implementation only listens on the document, not on
  the focused target — so it opens a centred fallback rather than
  anchoring to the focused element. We will improve on this.
- `model: MenuItem[]` is data-driven only, with the same kouji
  objections noted in [`speed-dial.md`](./speed-dial.md): mixes data and
  callbacks, no template slots per item.

Critique:

- API split between `<p-menu>` and `<p-contextMenu>` is a duplication
  smell. kouji should reuse `KjMenuItem` / `KjMenuItemCheckbox` /
  `KjMenuItemRadio` / `KjMenuSeparator` and only introduce a thin
  trigger directive on top.
- Flat `MenuItem[]` doesn't compose well with structural directives
  (`@if`, `@for`, custom item templates).
- Long-press timing is good but should be a primitive (a real
  consumer in a kanban / file browser also wants long-press for
  selection or drag-start, not exclusively context menus).

### Angular Material — no first-class Context Menu

Material ships **only** `MatMenu` (click-to-open). The documented
guidance for context menus is:

```html
<div [matMenuTriggerFor]="menu"
     (contextmenu)="onContextMenu($event); $event.preventDefault()">
  …
</div>
```

…with the consumer manually calling `MatMenuTrigger.openMenu()` and
positioning via `MatMenuTrigger.menuData` / overlay `positions` on a
hidden anchor element. There is **no** built-in:

- right-click prevention,
- long-press handling,
- Shift+F10 keyboard alternative,
- arbitrary-coordinate anchoring (the trigger is always an element,
  not a `{ x, y }` point).

This is a real gap in the Material API. Any kouji decision here is
greenfield with respect to Material — we are not constrained by an
existing surface to mirror.

### shadcn/ui — `ContextMenu`

Compound components, headless (Radix UI under the hood):

```tsx
<ContextMenu>
  <ContextMenuTrigger>…right-click target…</ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem>Profile</ContextMenuItem>
    <ContextMenuCheckboxItem>Bookmarks</ContextMenuCheckboxItem>
    <ContextMenuRadioGroup value="…">
      <ContextMenuRadioItem value="…">…</ContextMenuRadioItem>
    </ContextMenuRadioGroup>
    <ContextMenuSeparator />
    <ContextMenuSub>
      <ContextMenuSubTrigger>More</ContextMenuSubTrigger>
      <ContextMenuSubContent>…</ContextMenuSubContent>
    </ContextMenuSub>
  </ContextMenuContent>
</ContextMenu>
```

Notable choices:

- The item directives (`ContextMenuItem`, `ContextMenuCheckboxItem`,
  `ContextMenuRadioItem`, `ContextMenuSeparator`,
  `ContextMenuSub*`) **are distinct components** from
  `DropdownMenu*` even though semantics are identical. Radix takes
  this stance because the trigger context is different and they want
  React TypeScript to narrow per-tree. **kouji rejects this
  duplication**: directives don't carry trigger context in their type,
  and the same `KjMenuItem` works under either trigger.
- `ContextMenuTrigger` listens for `contextmenu`, `pointerdown`
  (long-press for touch), and Shift+F10. Long-press default is
  ~700 ms.
- Positioning uses Radix's `Popper` / `FloatingUI` underneath with a
  virtual reference element placed at `{ x, y }`.
- Right-click on the trigger calls `event.preventDefault()` to suppress
  the native menu. Right-clicking outside while the panel is open
  closes the current panel and opens a new one at the new point if the
  new point is also inside a trigger; otherwise just closes.
- Focus management: opening via right-click moves focus into the panel
  (first item by default); opening via Shift+F10 anchors at the focused
  element's bounding box and moves focus to the first item; Escape
  closes and restores focus to the previously focused element.

Critique:

- Item-directive duplication across `DropdownMenu` and `ContextMenu`
  is the wrong shape for Angular's directive model. We will not copy
  it.
- Long-press at 700 ms is on the slow end of the 350–500 ms WAI-ARIA
  APG recommendation. We default to 500 ms.
- The "right-click moves between two adjacent triggers" behaviour is
  a nice touch worth replicating.

### Cross-library summary

|                              | PrimeNG                          | Material                | shadcn/ui                    | kouji direction                                          |
| ---------------------------- | -------------------------------- | ----------------------- | ---------------------------- | -------------------------------------------------------- |
| First-class component        | yes (`<p-contextMenu>`)          | **no — gap**            | yes (compound)               | **yes — directive set**                                  |
| Item directives reused from regular menu | no (separate `<p-menu>`-style record) | n/a               | no (separate components)     | **yes — reuse `KjMenuItem*`**                            |
| Right-click suppression      | auto                             | manual by consumer      | auto                         | **auto** on the trigger directive                        |
| Anchor at cursor             | `{x, y}` page coords             | manual                  | virtual ref at `{x, y}`       | **`KjPopover` virtual-ref mode** (positioning primitive) |
| Touch long-press             | yes (`pressDelay`)               | no                      | yes (~700 ms)                 | **yes (default 500 ms)**                                 |
| Keyboard Shift+F10           | partial (centred)                | no                      | yes (anchored to focus)       | **yes — anchored to focused element rect**               |
| `ContextMenu` key support    | no                               | no                      | yes                          | **yes**                                                  |
| Submenus                     | yes                              | n/a                     | yes (`Sub*`)                 | **yes — reuse `[kjMenuItemSubTrigger]` from Dropdown**   |
| Scrolls / flips on overflow  | yes                              | yes (CDK overlay)       | yes (FloatingUI)             | **yes via `KjPopover`**                                  |
| Mobile fullscreen variant    | yes (breakpoint)                 | n/a                     | no                           | **out of scope for v1** (wrapper concern)                |

## Decision (core directive?)

**Yes — one new core directive (`KjContextMenuFor`) plus reuse of all
existing Menu / Dropdown Menu directives.** Composition:

| Directive                   | New?  | Role                                                                                  |
| --------------------------- | ----- | ------------------------------------------------------------------------------------- |
| `[kjContextMenuFor]`        | new   | Host attribute on the **right-click target**. Owns trigger detection + anchor coords. |
| `[kjMenuContent]`           | reuse | Existing — the menu panel itself, with roving tabindex / typeahead / Escape.           |
| `[kjMenuItem]`              | reuse | Existing — leaf action item.                                                           |
| `[kjMenuItemCheckbox]`      | reuse | Existing (Dropdown Menu) — checkbox item.                                              |
| `[kjMenuItemRadio]` (+ group) | reuse | Existing (Dropdown Menu) — radio item.                                                |
| `[kjMenuSeparator]`         | reuse | Existing — `role="separator"` between groups.                                          |
| `[kjMenuItemSubTrigger]` / `[kjMenuSubContent]` | reuse | Existing (Dropdown Menu) — nested submenu.                          |

Why **no** new `KjContextMenu` root directive (unlike Speed Dial which
introduces `KjSpeedDial`):

1. **The panel already exists.** `[kjMenuContent]` already provides
   `role="menu"`, roving-tabindex, Escape, click-outside, typeahead.
   Re-wrapping it would add a second directive that does nothing the
   first didn't.
2. **The "open state" lives on the trigger directive, not the menu.**
   Unlike `KjMenu` (which has a single in-template trigger and content
   pair), context-menu state is intrinsically tied to the *target* of
   the right-click. `[kjContextMenuFor]` owns `open` + `anchorPoint` and
   exposes them via the same `KJ_MENU` context shape so the existing
   `[kjMenuContent]` works unchanged.
3. **Consumers already structure templates as a target + a panel
   `<ng-template>`** — that is the natural shape and a root container
   directive would add ceremony with no payoff.

The single new directive is **`[kjContextMenuFor]`**. It accepts a
`TemplateRef` (the menu content) plus optional configuration, attaches
its own `contextmenu` / `pointerdown` / `keydown` listeners on the host
element, and renders the template into a `KjPopover`-backed overlay
positioned at the anchor point.

```html
<div [kjContextMenuFor]="rowMenu" class="row">…row content…</div>

<ng-template #rowMenu>
  <div kjMenuContent>
    <button kjMenuItem (click)="edit()">Edit</button>
    <button kjMenuItem (click)="duplicate()">Duplicate</button>
    <hr kjMenuSeparator />
    <button kjMenuItem [kjDisabled]="!canDelete()" (click)="delete()">
      Delete
    </button>
  </div>
</ng-template>
```

## Base features

- **Right-click open** — `contextmenu` event on the host. Always
  `event.preventDefault()` on the trigger element. Anchor at
  `{ x: event.clientX, y: event.clientY }`.
- **Long-press open (touch)** — `pointerdown` with `pointerType ===
  'touch'` starts a `kjLongPressMs` timer (default **500 ms**, range
  350–700 documented). Cancelled by `pointermove` exceeding
  `kjLongPressMoveTolerancePx` (default 10 px), `pointerup`,
  `pointercancel`, or scroll. Anchor at the pointer's
  `{ clientX, clientY }` at press start.
- **Keyboard open** —
  - **Shift+F10** on the trigger element opens the menu anchored at
    the trigger's bounding-box top-left (or `getBoundingClientRect()`
    centre when the user has selected something — see
    [Open questions](#open-questions--risks) #2).
  - **`ContextMenu` key** (Windows menu key, `event.key === 'ContextMenu'`)
    behaves the same as Shift+F10. macOS lacks this key; users can use
    the configured shortcut or right-click via two-finger tap.
- **Close** — Escape (handled by `[kjMenuContent]`), click-outside
  (handled by `[kjMenuContent]`), action invocation (handled by
  `[kjMenuItem]`), scroll on the document, and another `contextmenu`
  event (which immediately re-opens at the new point if the new target
  also carries `[kjContextMenuFor]`).
- **Re-anchor on consecutive right-clicks** — if the panel is open and
  the user right-clicks again on **the same** trigger, close-and-reopen
  at the new point. If they right-click on a **different** trigger,
  the first panel closes and the new one opens. If they right-click on
  a non-trigger element, the panel closes (default browser context
  menu is allowed to show — we never preventDefault outside trigger
  hosts).
- **Focus on open** — focus moves to the first focusable item in the
  panel (matches Dropdown Menu). On close, focus returns to the
  trigger element if it still exists in the DOM and was the document's
  active element before opening; otherwise no focus is stolen.
- **One open panel at a time** — `[kjContextMenuFor]` directives
  coordinate via a small singleton service (`KjContextMenuRegistry`,
  internal) so opening a second panel automatically closes the first.
  This avoids both the "two right-clicks across rows leave a stale
  panel" bug and the "Escape only closes one of them" bug.
- **Disabled trigger** — when `kjDisabled` is `true`, the directive
  does **not** preventDefault on `contextmenu`, so the browser's
  native menu shows. Rationale: a disabled context menu shouldn't
  silently swallow the user's right-click — let the browser handle it.

## Accessibility (WCAG 2.1 AAA)

### Roles

| Element                  | Role                                                                |
| ------------------------ | ------------------------------------------------------------------- |
| `[kjContextMenuFor]` host | unchanged (the host is whatever the consumer made it — div, row, canvas, etc.). The directive does not impose a role. |
| `[kjMenuContent]`        | `menu` (already provided by the existing directive)                 |
| `[kjMenuItem]`           | `menuitem` (already provided)                                       |
| `[kjMenuItemCheckbox]`   | `menuitemcheckbox` (already provided)                               |
| `[kjMenuItemRadio]`      | `menuitemradio` (already provided)                                  |
| `[kjMenuSeparator]`      | `separator` (already provided)                                      |

### ARIA wiring

On the trigger host:

- **No `aria-haspopup`** on the trigger — context menus are not
  announced as having a popup at rest (per WAI-ARIA APG). They are
  discoverable by right-click / Shift+F10 just like the OS context
  menu, which is also not pre-announced.
- **No `aria-expanded`** for the same reason.
- **No `aria-controls`** — context-menu trigger relationships are
  not exposed in the AT tree. (Contrast with Dropdown Menu, where the
  button-trigger has all three.)
- The trigger directive **does** add a small once-per-app
  `KjLiveRegion` announcement when an opener uses Shift+F10, of the
  form *"Context menu open"*, so non-sighted keyboard users
  understand that a menu has appeared. (Sighted users will see the
  panel; right-click users on screen readers typically already get
  this announcement from the AT.) See
  [Open questions](#open-questions--risks) #5.

On the panel: handled by existing `[kjMenuContent]` /
`[kjMenuItem*]` directives, which already follow the WAI-ARIA APG
[menu pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu/).

### Keyboard contract

The trigger directive's responsibility:

| Key                       | When focus is on…   | Behaviour                                                    |
| ------------------------- | ------------------- | ------------------------------------------------------------ |
| `Shift+F10`               | Trigger host        | Open at the trigger's `getBoundingClientRect()` (top-left + small offset). Move focus to first item. |
| `ContextMenu` (Win key)   | Trigger host        | Same as Shift+F10.                                            |
| Right-click               | Trigger host        | Open at `{ event.clientX, event.clientY }`. Move focus to first item. |
| Long-press                | Trigger host (touch) | Open at the press point. Move focus to first item.           |

The panel's keyboard contract (Arrow keys, Home/End, Escape, typeahead,
Tab) is unchanged from the existing `[kjMenuContent]` and is
documented in [`dropdown-menu.md`](./dropdown-menu.md). **The single
biggest design rule for this component is "the panel doesn't know how
it was opened."**

### Focus management

- On open: first focusable item receives focus, regardless of opener
  (matches Dropdown Menu).
- On close: focus returns to the trigger host if it is still focusable
  and still in the DOM. Trigger hosts that are not natively focusable
  (e.g. a `<div class="row">`) should be made focusable by the
  consumer (`tabindex="0"`) when keyboard opening is required —
  otherwise Shift+F10 / `ContextMenu` key cannot be detected because
  the host never receives focus. The directive emits a one-time
  `console.warn` in dev mode if it detects a non-focusable host that
  receives a `keydown` listener but never receives focus; this is the
  least intrusive way to surface the consumer's mistake.
- No focus trap — the panel uses `KjRovingTabindex` (already inside
  `[kjMenuContent]`) and Escape returns focus normally. Modal context
  menus are not a thing.

### Touch target (WCAG 2.5.5 AAA — 44×44 CSS px)

- The trigger host is whatever the consumer made it — its target size
  is the consumer's responsibility.
- The panel items inherit `[kjMenuItem]` sizing presets in the
  components package, which guarantee 44×44.
- Long-press cancellation tolerance (`kjLongPressMoveTolerancePx`,
  default 10 px) is **smaller** than 44 px deliberately: this is the
  movement tolerance during the press, not the target size.

### Reduced motion

Wrapper concern. The core directive only opens / closes; the panel's
animation rules in the components package guard with
`@media (prefers-reduced-motion: reduce)`.

### Right-click prevention scope

`event.preventDefault()` is called **only** inside the host element of
a `[kjContextMenuFor]` directive. The directive **does not** install a
document-wide listener. Right-clicks anywhere outside trigger hosts
show the browser's native context menu, which is the correct default —
applications that want to suppress all native menus do so themselves.

## Composition model

```
context-menu/
  context-menu-for.ts            ← KjContextMenuFor (the only new directive)
  context-menu.context.ts        ← KJ_CONTEXT_MENU token (extends KJ_MENU shape) + interface
  context-menu.registry.ts       ← KjContextMenuRegistry (internal singleton, "one open panel")
  long-press.ts                  ← internal long-press helper (consider hoisting to primitives/)
  context-menu.example.ts
  context-menu.spec.ts
  index.ts
```

### Shared state — extending `KJ_MENU`

`[kjMenuContent]` already injects `KJ_MENU` (see
`packages/core/src/menu/menu.context.ts`) for the `open` signal. We
provide the same shape from `KjContextMenuFor`:

```ts
export interface KjContextMenuContext extends KjMenuContext {
  /** Read-only viewport coordinates of the most recent open. */
  readonly anchorPoint: Signal<{ x: number; y: number } | null>;
  /** Anchor mode: 'point' for right-click / long-press, 'rect' for keyboard. */
  readonly anchorMode: Signal<'point' | 'rect'>;
  /** Trigger host bounding-box, set when anchorMode === 'rect'. */
  readonly anchorRect: Signal<DOMRect | null>;
  open(opts: { x: number; y: number } | { rect: DOMRect }): void;
  close(): void;
}

export const KJ_CONTEXT_MENU = new InjectionToken<KjContextMenuContext>('KjContextMenu');
```

`KjContextMenuFor` provides **both** `KJ_MENU` (so existing
`[kjMenuContent]` works without changes) and `KJ_CONTEXT_MENU` (so
custom panels can read `anchorPoint` for tail/arrow rendering, etc.).

### Positioning primitive — `KjPopover` virtual-ref mode

Anchored-at-arbitrary-coords positioning is the load-bearing
infrastructure. The directive does **not** roll its own — it delegates
to `KjPopover` (`packages/core/src/popover/popover.ts`).

`KjPopover` today anchors against an **element**. This component
requires **virtual-reference** mode — anchoring against a `{ x, y }`
point or a synthetic `DOMRect`. This is a **new capability on
`KjPopover`** and is required before Context Menu can ship. Concretely:

- `KjPopover` gains a `kjAnchor` input that accepts either an
  `ElementRef`/`Element` (existing) or a `{ x: number; y: number }` /
  `DOMRect` virtual reference (new).
- Internally, the virtual reference is converted into a synthetic
  rect of zero width/height at the point (for `'point'` mode), or
  used as-is (for `'rect'` mode).
- Collision handling (flip / shift to keep the panel inside the
  viewport) already lives in `KjPopover`; it works against rects,
  point or otherwise. **No new collision logic.**
- See [`feedback/popover.md`](../feedback/popover.md) for the full
  popover spec; that file owns the change. This file is the first
  documented consumer of virtual-ref mode.

If `KjPopover` virtual-ref work has not landed by the time we cut
Context Menu, **block on it** — do not re-implement positioning here.
That is the explicit cross-component dependency.

### `hostDirectives` composition

`KjContextMenuFor` composes:

- `KjDisabled` (input alias `kjDisabled`) — when `true`, the
  directive's listeners no-op so the browser's native menu shows
  through.

It does **not** compose `KjFocusRing` (it doesn't render its own
visual focus state — the trigger host's focus ring is the consumer's),
and it does **not** compose `KjVariant` / `KjSize` (the panel composes
those, not the trigger).

The reused `[kjMenuContent]` directive already host-composes
`KjRovingTabindex` (orientation `'vertical'`, wraps).

### Cross-component pointers

- **Dropdown Menu** ([`dropdown-menu.md`](./dropdown-menu.md)) — owns
  the item directives (`KjMenuItem`, `KjMenuItemCheckbox`,
  `KjMenuItemRadio`, `KjMenuItemSubTrigger`, `KjMenuSubContent`,
  `KjMenuSeparator`). Context Menu **reuses every one** unchanged.
  The two components share a panel grammar; they differ only on the
  trigger directive.
- **Menu (core)** (`packages/core/src/menu/menu.ts`) — provides the
  underlying `KjMenuContent` keyboard / typeahead / click-outside /
  Escape behaviour. Both Dropdown Menu and Context Menu use it
  unchanged. The `KJ_MENU` context shape is the integration point.
- **Popover** ([`feedback/popover.md`](../feedback/popover.md),
  `packages/core/src/popover/popover.ts`) — supplies the overlay +
  collision-aware positioning. **Requires a new virtual-reference
  anchor mode** to support Context Menu. Tracked as a hard prerequisite.
- **Speed Dial** ([`speed-dial.md`](./speed-dial.md)) — separate
  component family (FAB-anchored cluster). Cross-referenced only as a
  contrast: speed-dial pins to a viewport corner, context menu floats
  with the cursor.
- **Tooltip** (`feedback/tooltip.md`) — also uses `KjPopover`; will
  benefit from the same virtual-ref work for "tooltip at cursor"
  patterns. Out of scope here, called out so the popover refactor is
  scoped for both consumers.
- **Live Region** (`KjLiveRegion`, `packages/core/src/a11y/`) — used to
  announce keyboard-opened context menus (Shift+F10 / `ContextMenu`
  key) to screen readers that don't pick up the focus move on their
  own.

## Inputs / Outputs / Models

### `[kjContextMenuFor]`

| Member                          | Kind                | Type                                                  | Default   | Notes                                                                                                                                  |
| ------------------------------- | ------------------- | ----------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `kjContextMenuFor`              | `input.required`    | `TemplateRef<unknown>`                                | —         | The panel template. Typically wraps `<div kjMenuContent>…</div>` plus item directives.                                                  |
| `kjOpen`                        | `model`             | `boolean`                                             | `false`   | Two-way bindable. Setting to `true` opens the panel at the host's bounding-box top-left (no point available); setting `false` closes.   |
| `kjDisabled`                    | `input` (forwarded) | `boolean`                                             | `false`   | Via `KjDisabled` host directive. When `true`, all listeners no-op and the browser's native menu shows.                                  |
| `kjLongPressMs`                 | `input`             | `number`                                              | `500`     | Touch long-press duration. Set to `0` to disable touch opening entirely.                                                                |
| `kjLongPressMoveTolerancePx`    | `input`             | `number`                                              | `10`      | Pointer movement during press that cancels the long-press.                                                                              |
| `kjOpenOnContextMenuKey`        | `input`             | `boolean`                                             | `true`    | Listens for Shift+F10 and `ContextMenu` key on the host.                                                                                |
| `kjCloseOnScroll`               | `input`             | `boolean`                                             | `true`    | Closes the panel on document scroll (matches PrimeNG / shadcn defaults).                                                                |
| `kjAnchorMode`                  | `input`             | `'auto' \| 'point' \| 'rect'`                         | `'auto'`  | `'auto'`: pointer events use `'point'`, keyboard events use `'rect'`. `'point'` / `'rect'` force one mode regardless of opener.         |
| `kjOpenChange`                  | `output`            | `boolean`                                             | —         | Emitted alongside `kjOpen` model writes.                                                                                                 |
| `kjOpened`                      | `output`            | `KjContextMenuOpenEvent`                              | —         | Fires when the panel becomes visible. Payload includes `{ source: 'mouse' \| 'touch' \| 'keyboard'; x: number; y: number }`.            |
| `kjClosed`                      | `output`            | `void`                                                | —         | Fires when the panel hides.                                                                                                              |

The directive does not expose a separate `kjAnchorPoint` input —
external code should not be assigning anchor points; the directive
computes them from the originating event. Programmatic opens via the
model use the host bounding box.

### Panel directives

All inputs/outputs unchanged from
[`dropdown-menu.md`](./dropdown-menu.md) and the existing
`packages/core/src/menu/`. Specifically:

- `[kjMenuContent]` — no inputs; structural.
- `[kjMenuItem]` — `kjDisabled`, `kjCloseOnActivate` (default `true`).
- `[kjMenuItemCheckbox]` — `kjChecked` model, `kjDisabled`.
- `[kjMenuItemRadio]` (+ `[kjMenuItemRadioGroup]`) — `kjValue`,
  `kjValue` model on group.
- `[kjMenuSeparator]` — none.
- `[kjMenuItemSubTrigger]` / `[kjMenuSubContent]` — `kjOpenDelayMs`,
  `kjCloseDelayMs`.

These are all `kj`-prefixed and carry over from the Dropdown Menu spec
without modification.

## Examples to ship

`@doc-example` groups in the directive's TSDoc:

1. **Basic right-click menu** (`context-menu.example.ts`) — a row in a
   list with `[kjContextMenuFor]` projecting Edit / Duplicate / Delete.
   Demonstrates right-click open, Escape close, click-outside close,
   focus restoration to the row.
2. **Long-press on touch** (`context-menu.long-press.example.ts`) —
   same panel, on a card with `tabindex="0"`. Demonstrates 500 ms
   long-press, movement cancellation, and that mouse right-click
   still works in parallel.
3. **Keyboard-only** (`context-menu.keyboard.example.ts`) — focusable
   row with a clear "Press Shift+F10 to open" hint, demonstrating
   anchor-at-rect mode and live-region announcement.
4. **Checkbox + radio items** (`context-menu.choices.example.ts`) — a
   "View options" context menu with `kjMenuItemCheckbox` (Show
   gridlines) and a `kjMenuItemRadioGroup` (Sort by: Name / Date /
   Size). Demonstrates that the items are exactly the Dropdown Menu
   items.
5. **Submenu** (`context-menu.submenu.example.ts`) — top-level items
   plus an "Export as…" submenu via `kjMenuItemSubTrigger`. Reuses
   Dropdown Menu's nested-menu directive.
6. **Disabled trigger** (`context-menu.disabled.example.ts`) — toggle
   that flips `kjDisabled` on the trigger, demonstrating that the
   browser's native menu reappears when disabled.
7. **Themed** — retro and finance variants of the basic example,
   matching the Button / Dialog / Speed-Dial doc structure.

## Open questions / risks

1. **`KjPopover` virtual-reference mode is a prerequisite.** Cannot
   ship until popover gains a `{ x, y }` / `DOMRect` anchor input plus
   an explicit `'auto' | 'point' | 'rect'` mode. Tracked as a hard
   blocker in the popover spec. If popover slips, Context Menu
   slips — we will not roll our own positioning, ever.

2. **Shift+F10 anchor for in-text use.** When the user has a text
   selection inside an input or contenteditable, the OS context menu
   anchors at the selection's caret rect, not the input's bounding
   box. Replicating this requires walking
   `Selection.getRangeAt(0).getBoundingClientRect()` and falling back
   to the host rect when no selection. Recommendation: ship v1
   anchored at the host rect; revisit when a text-editor consumer
   surfaces a need.

3. **Coexistence with native browser menus on dev tools / image
   right-click.** Calling `event.preventDefault()` on the trigger
   removes "Inspect", "Save image as", etc. for users on those
   targets. Document the consequence and recommend that consumers
   restrict `[kjContextMenuFor]` to elements where suppressing the
   native menu is the user's expectation (e.g. table rows, custom
   canvases, file-explorer entries) — not on every `<img>` and link.

4. **Multiple stacked overlays.** If a context menu opens while a
   modal Dialog is open, the menu must render *above* the dialog's
   z-index. `KjPopover` already handles this via its overlay portal,
   but we should add a regression test. (Same risk applies to
   `Dialog` over `Tooltip`; not Context-Menu specific.)

5. **Live-region announcement on Shift+F10 open.** Some screen
   readers (NVDA + Firefox) already announce "menu" when focus moves
   into an element with `role="menu"`. JAWS sometimes does, sometimes
   doesn't. To avoid double announcements, gate the
   `KjLiveRegion` "Context menu open" message behind a
   `kjAnnounceKeyboardOpen` input (default `true`); document that
   AT-only users may want to disable it if their reader already
   announces. Better: detect the AT (we cannot, reliably) — so we
   ship the input and let consumers opt out.

6. **`kjOpen` two-way binding semantics with no anchor info.** When a
   consumer programmatically sets `[(kjOpen)]="true"`, we have no
   pointer event. The directive opens at the host's bounding-box
   top-left in `'rect'` mode. Documenting this is sufficient — the
   alternative (forbidding programmatic opens) hurts consumers who
   want to open the menu from a "More" button next to the row.

7. **Long-press conflict with native iOS callout / link preview.**
   On iOS Safari, long-press on links and images triggers the
   system's link preview / share sheet. The directive's
   `pointerdown` listener cannot suppress this on iOS (Safari
   ignores `preventDefault` on touch-callout). Mitigation: document
   that consumers should set CSS `-webkit-touch-callout: none` and
   `user-select: none` on `[kjContextMenuFor]` hosts that should
   support long-press. Out of scope for the directive itself.

8. **Hoisting `LongPress` to a primitive.** Long-press is also useful
   for selection / drag-start in tables, kanban, file explorers. We
   keep the implementation inside Context Menu for v1 and lift to
   `packages/core/src/primitives/interaction/long-press.ts` once a
   second consumer lands.

9. **`KjContextMenuRegistry` singleton scope.** Provided in `'root'`
   so all triggers across the app coordinate. Risk: micro-frontend or
   multi-Angular-app pages might have two registries and lose the
   "one open at a time" guarantee. Acceptable for v1; document.

10. **Event re-entry on `contextmenu` while open.** A user
    right-clicks row A (panel opens), then right-clicks row B before
    closing A. The registry closes A and opens B. We must verify in
    a spec that focus restoration to A's host does **not** fire after
    B has stolen focus into its panel — race-condition risk. The fix
    is "only restore focus on close if `document.activeElement` is
    inside the panel we're closing".

11. **Drag selection on the trigger host.** A user click-drags inside
    the trigger to select text, then releases — that is a `mouseup`,
    not `contextmenu`, so our listener does not fire and no panel
    opens. Correct. But a `pointerdown` long-press on touch in the
    middle of a text-selection drag *is* ambiguous; the
    `kjLongPressMoveTolerancePx` (10 px) cancels the timer if the
    user drags during the press, which is the right behaviour.
    Documented under the long-press input.

12. **Submenus via `KjPopover` reuse.** Dropdown Menu's submenu uses
    element-anchored `KjPopover`. Inside a Context Menu, the parent
    item's element rect is a real anchor (not virtual), so submenus
    work unchanged with the existing element-anchor mode. No extra
    virtual-ref work needed for nested menus — the virtual-ref
    requirement is only for the **top-level** open from a pointer or
    selection point.
