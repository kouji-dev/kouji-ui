---
'@kouji-ui/core': patch
'@kouji-ui/components': patch
---

Fix: large tables render in linear time again, hover triggers stop forcing a layout on attach, and three 0.10.0 regressions are gone.

- **Table first render was O(n²)** (≈9 s for 500 rows). Every `kjTableCell` read the grid's roving Tab stop, which re-collected the `cells` content query and re-sorted all cells in DOM order once per cell. `KjTableKeyboardNav` now resolves the Tab stop once per render (`afterRenderEffect`); a focused cell still becomes the Tab stop immediately. `kj-table` also reads its cell templates and row-expansion template once per refresh into a `@let` snapshot instead of from every cell / row.
- **NG0950 after `kjData` changed** (filter or tab switch, once a cell had been focused): the same mid-render Tab-stop resolution read `kjCell` on cells not bound yet. Fixed by the change above.
- **Hover popover / tooltip triggers measured on attach** (`getBoundingClientRect` per trigger — one forced layout per table row). The `display: contents` target is now resolved on the first `pointerover`, once.
- **Dropdowns inside an inline-mounted (`inPlace`) modal were inert**: the modal inerted the whole overlay container, so select / combobox / date-picker panels it opened could not be used. The container is never inerted now; only the overlays already open behind the modal are.
- **NG0600 from `kj-input-otp` (and any `kjFocusRing` host)** when a focused element was disabled or removed during rendering: the raw `focus` / `blur` listeners wrote a signal inside the template's reactive context. They now run untracked.
