---
'@kouji-ui/core': minor
'@kouji-ui/components': minor
---

review batch 2: roving tab stops that follow selection, keyboard-operable data grid, named dialogs, wired fields, focus-driven tooltips

**Roving tabindex (core).** `KjRovingTabindex` tracks its active item by
reference: the tab stop survives item removal (clamped to the nearest
neighbour, refocused only if focus was inside the group), follows the
selection through the new `setActive(item | Element)` / `kjRovingActive`
seed API, and the arrow keys skip disabled, `aria-disabled` and hidden items.
Registration is O(1) and RTL now comes from the nearest `dir` attribute (a
CSS-only `direction: rtl` is no longer honoured). New self-scoped
`KJ_ROVING_ORIENTATION_DEFAULT` token; `KjTabList` provides it instead of
filtering keys itself. Tabs, stepper, carousel, list and date-range presets
seed the tab stop from their selection. `KjTabPanel` gets `tabindex="0"` only
when active and it has no tabbable content.

**Calendar (core + components).** The roving cell is always a selectable day
(seeded from the value, then `kjStartAt`, then today, clamped into
`kjMin` / `kjMax` / the predicate; month navigation past a bound lands on
the bound). Calendars no longer steal focus on mount or from the month
buttons. Structure is grid > row > gridcell(`<td>`) > native button: day
buttons drop `role="gridcell"` and native `disabled` (now
`aria-disabled` + `data-disabled`), selection is `aria-pressed`, the root is
`role="group"`. New root `KJ_TODAY` token (`null` on the server, so no today
marker is prerendered); `KjCalendarContext` gained a required `today`
member. `kj-calendar` exposes `kjStartAt`. `Intl.DateTimeFormat` instances
are cached per locale + preset.

**Data grid (core + components).** The body has one Tab stop: new
`KJ_TABLE_KEYBOARD_NAV` context (`KjTableKeyboardNavContext`) drives
`KjTableCell`'s roving `tabindex`; keys typed into a text control inside a
cell are left alone; Enter opens an editable cell. Sortable headers render a
real `<button kjTableSort>` (new `KjTableSort` directive;
`KjTableHeader.toggleSort` / `hasSortControl`) and Shift-click / Shift+Enter
really multi-sorts. The column resize handle is a focusable
`role="separator"` with arrow / Home / End / Escape keys and
`aria-value*`. Persistence writes a projected slice set
(`KJ_TABLE_DEFAULT_PERSISTED_SLICES`, `pickTableState()`,
`KjTablePersistedSlice`; never `rowSelection` / `expanded` /
`globalFilter`), debounced 300 ms (`kjPersistDebounce`, `kjPersistedSlices`
inputs), under an optional `KJ_TABLE_STORAGE_KEY_PREFIX`
(`provideKjTableStorageKeyPrefix()`). The four tbody branches share one row
template; `KjTableVirtual` measures rows (`measureItem`, `mounted`, new
`KjTableVirtualItem` directive, `KJ_VIRTUAL_EXTRA_ATTR`) and prerenders the
first `kjInitialRows` / `kjVirtualInitialRows` rows on the server. Cell
editors share `injectKjCellEditor()` (`KjCellEditor`,
`KjCellEditorOptions`); the filter and editor contracts moved to
`filters.context.ts` / `editors.context.ts` (barrel exports kept). A
headless `[kjTableCell]` without a nav now carries `tabindex="-1"`.

**Overlay names (core + components).** `KjOverlayBuilderConfig` gained
`ariaLabel` / `ariaLabelledBy` (`KJ_OVERLAY_ARIA_LABEL` /
`KJ_OVERLAY_ARIA_LABELLED_BY` tokens, exported from the overlay barrel);
`KjDialogOpenOptions` / `KjDrawerOpenOptions` / `KjSheetOpenOptions` pass
them through and `KjDialog` / `KjDrawer` / `KjSheet` accept `kjAriaLabel` /
`kjAriaLabelledBy`. New title directives `KjDialogTitle` / `KjDrawerTitle` /
`KjSheetTitle` (+ `KJ_OVERLAY_TITLE_HOST`, `registerOverlayTitle`,
`overlayAccessibleName`) and `<kj-dialog-title>` / `<kj-drawer-title>` /
`<kj-sheet-title>` name the panel by reference; dev mode warns once when a
panel opens nameless.

**Field (core + components).** New `KjFieldControl` (`[kjFieldControl]`),
composed by `KjInput`: a control inside `kj-field` adopts the field id and
gets `aria-describedby` / `aria-invalid` / `aria-required` automatically.
Consumers that bound `[id]` or `kjAriaDescribedBy` on a `<kj-input>` inside a
`kj-field` should drop them to avoid duplicate ids.

**Tooltip / popover (core).** Tooltips open on keyboard focus
(`onFocus({ focusVisible: true })`), describe their trigger via
`aria-describedby` at all times and carry neither `aria-expanded` nor
`aria-controls`; `kjDisabled` on tooltip and popover triggers now really
blocks opening (`whenEnabled()` helper). `onHover` timers no longer toggle a
panel another strategy already opened or closed.

**Live regions / OTP / toast (core + components).** `KjLiveRegion` writes
into an owned text node (host children survive announcements).
`KjInputOtp.kjComplete` fires (`value.length === kjLength`); the root is no
longer a live region — `registerLiveRegion()` + `context.chars`; the styled
`<kj-input-otp>` renders a visually hidden one. Cleared middle OTP cells no
longer shift later digits. The toast viewport is a plain `role="region"`
landmark (each toast stays its own live region); toast ids are `kj-toast-N`
via `KjId`; `.kj-toast-viewport` z-index follows `--kj-overlay-z`.
