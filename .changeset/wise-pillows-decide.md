---
'@kouji-ui/core': patch
---

Internal lint cleanup — replace `any` casts in select option storage with typed `HTMLElement & { __kjOptionValue?: unknown }` and convert ternary statement to if/else in overlay toggle. No public API or behavior change.
