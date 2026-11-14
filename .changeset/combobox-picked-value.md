---
'@kouji-ui/core': patch
'@kouji-ui/components': patch
---

Combobox with a picked value, and Escape behind an open popup:

- Opening a combobox (or a searchable `kj-select` after a search) puts the cursor on the picked row, not the first one, so two rows no longer read as chosen. The cursor's row is scrolled into view.
- The list is filtered only by text typed since it last closed or a value was picked. Reopening after a pick lists every option again; the field still reads the picked name. New `KjCombobox.filterQuery` exposes that text.
- Emptying the field while a value is set keeps it empty and lists every option; the picked name is written into the field only when the value changes.
- A preset value's name shows on first render even when the row has no `kjOptionLabel` (its text arrives after the first render).
- `KjOverlayStack` marks an Escape it handles (`preventDefault()`), so app-level Escape listeners can skip it instead of also closing the dialog or panel behind the popup.
