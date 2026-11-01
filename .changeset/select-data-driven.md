---
'@kouji-ui/core': minor
'@kouji-ui/components': minor
---

`kj-select` takes its options as data: `[kjOptions]` with `kjValueKey`, `kjLabelKey`, `kjGroupKey` and `kjGroupsCollapsible` (projected `<kj-option>`s still work, and may be mixed in: data rows first). `[kjDisplayWith]` labels a value no option matches. `KjSelect` accepts rows a wrapper stamps in its own view. `<kj-toast-viewport>` exposes `kjToastExpand`, and stacks toasts in one grid cell so `width: auto` on the viewport no longer collapses them.
