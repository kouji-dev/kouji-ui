---
'@kouji-ui/core': patch
---

fix(signals): widen `nonRecords` constructor type to accept native builtins (WeakSet/WeakMap/Promise/Error/RegExp/DataView/Function) — pure type-level change, no runtime behavior change.
