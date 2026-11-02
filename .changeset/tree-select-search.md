---
'@kouji-ui/components': minor
---

`kj-tree-select`: `kjSearchable` adds a filter field above the tree (`kjSearchPlaceholder`, `[kjTreeSelectEmpty]` slot for the no-matches text); a match keeps its ancestor branches, shown open. In single mode a click, Enter or Space on a branch row now folds or unfolds it (a branch was never selectable, so the row used to do nothing).

Limits: the filter field sits inside the `role="tree"` panel; the query is kept while the panel is closed.
