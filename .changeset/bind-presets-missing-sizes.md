---
'@kouji-ui/core': patch
---

`bindPresets` keeps the enclosing size/variant preset when a config has no `sizes`/`variants` list. `KjTabs` binds a variant-only config, so a `KjSize` element inside a tab panel (e.g. `kj-kbd`) read `values: undefined` and threw `Cannot read properties of undefined (reading 'includes')` in its dev-mode check.
