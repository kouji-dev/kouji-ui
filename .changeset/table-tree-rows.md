---
'@kouji-ui/core': minor
'@kouji-ui/components': minor
---

`<kj-table>` tree rows: a parent row with child rows that are real table rows with the same columns.

- `[kjGetSubRows]="(row) => row.children"` (TanStack `getSubRows`). The first data column (after the selection column) gets a chevron toggle with the child count, `aria-expanded`, Enter on the cell and ArrowRight / ArrowLeft (treegrid pattern); children are indented by `--kj-table-tree-indent` and every row carries `data-depth`. The table becomes `role="treegrid"` with `aria-level` per row.
- `kjDefaultExpanded` opens every parent on first render, after new data, and after an infinite request change; `expandAll()`, `collapseAll()`, `isAllExpanded()` and the `(expandedChange)` output (`{ row, rowId, expanded }`).
- Selection stays per row (children select on their own); `kjSelectSubRows` cascades a parent's selection to its children.
- Works with virtual mode and `[kjInfinite]`: the loader still pages top-level rows (offset / limit / total), expanded children are inserted into the virtual list without moving the scroll, `(rangeChange)` reports top-level indexes, a silent reload keeps the expansion and a request change re-applies `kjDefaultExpanded`.
- Fix: with the selection column shown (`kjShowSelectionColumn`, the default), a row click no longer changes the selection — only the checkbox does — so `(rowClick)` can navigate.
- core `KjTable`: `kjGetSubRows`, `kjSelectSubRows`, `kjDefaultExpanded` inputs; `setRowExpanded()`, `getRowExpanded()`, `expandAll()`, `collapseAll()`, `resetExpansion()`, `isAllExpanded`. `KjTableRow` gains `kjAriaRowIndex`. TanStack's expansion auto-reset is replaced by the directive's own (same behaviour outside infinite mode).
