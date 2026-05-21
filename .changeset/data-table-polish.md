---
"@kouji-ui/core": minor
"@kouji-ui/components": minor
---

Data-table polish: server-mode pagination, virtualization fix, inline-edit overlay, xs pagination tier.

- `KjTable` (core): dedupe identity-only slice patches; expose
  `setRowCount` / `manualPagination` so resource-backed tables report the
  full remote total instead of just the visible page.
- `KjSelect` / `KjSelectTrigger` (core): trigger registers its element
  with the parent at construction time. `KjSelect.focus()` delegates to
  the registered trigger — no view-query timing dance for consumers.
- `KjTableComponent`: virtualization reads pre-pagination rows (10k rows
  scroll correctly); inline editors mount as `position: absolute` overlays
  with a hidden ghost preserving column width; column meta (`selectOptions`)
  forwarded to dynamically-mounted editors via the cell-editor outlet.
- `KjTablePaginationComponent`: three-column footer (page size · summary ·
  nav), `space-between` nav cluster, full `xs | sm | md | lg` size tier
  forwarded to the boundary buttons.
- `KjPagination`: `xs` registered in `KJ_PAGINATION_DEFAULTS.sizes` + CSS.
- `KjSelectComponent` / `KjInputComponent` / `KjNumberInputComponent`:
  public `focus()` methods, no DOM querying.
- Renamed `KjCellEditorOutlet` output `cancel` → `editCancel` to avoid
  the DOM-event collision flagged by angular-eslint.
- `kjTableVirtual` directive selector + exportAs lowercased for the `kj`
  prefix rule.
