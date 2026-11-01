---
'@kouji-ui/components': minor
'@kouji-ui/core': minor
---

`kj-select`: `kjSearchable` adds a filter field at the top of the panel (`kjSearchPlaceholder`, `[kjSelectEmpty]` slot for the no-matches text), and the new `<kj-option-group kjLabel>` groups options, foldable with `kjCollapsible` / `[(kjCollapsed)]`.

Core: `KjSelect` exposes `visibleItems` (items not hidden through `setVisible`) so the navigator skips filtered and folded options, and `kj-select-content` forwards `kjFocusMode`.
