---
'@kouji-ui/components': minor
'@kouji-ui/core': minor
---

`kj-select`: `kjSearchable` adds a filter field at the top of the panel (`kjSearchPlaceholder`, `[kjSelectEmpty]` slot for the no-matches text), and the new `<kj-option-group kjLabel>` groups options, foldable with `kjCollapsible` / `[(kjCollapsed)]`.

Searchable panels are a `dialog` holding the search `combobox` above an inner `listbox` (trigger `aria-haspopup="dialog"`). Collapsible group headings take the keyboard: ArrowUp/Down stop on them, ArrowLeft folds an option's group onto its heading, ArrowRight unfolds, Enter/Space toggle.

Core: `KjSelect` exposes `visibleItems` (items not hidden through `setVisible`) so the navigator skips filtered and folded options; `kj-select-content` gains `kjSearchable` (dialog role, `aria-haspopup="dialog"` on the trigger) and forwards `kjFocusMode` / `kjHostActiveDescendant`; `KjListNavigator` gains `kjHostActiveDescendant` (default `true`) to stop publishing `aria-activedescendant` on its host when another element owns it.
