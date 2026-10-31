---
'@kouji-ui/components': minor
---

Add `KjTree` and `KjStat`.

- `<kj-tree>`: hierarchical list on the WAI-ARIA tree pattern. `nodes`
  (`KjTreeItem { id, label, children?, disabled? }`, read in place), expansion
  uncontrolled (`defaultExpanded`) or controlled (`expanded` +
  `(expandedChange)`), single selection (`selected`, `(selectionChange)`,
  `(activate)`), full keyboard incl. type-ahead, `ng-template kjTreeNode` row
  template and `ng-template kjTreeEmpty`. A node with `children: []` is a lazy
  branch.
- `<kj-stat>`: label, value, change with `direction` (`up` / `down` / `none`,
  drawn as ▲ / ▼ so it reads without colour), `tone`, `size`, `loading`
  (skeleton + `aria-busy`), `emptyText`, `changeLabel` for screen readers.
