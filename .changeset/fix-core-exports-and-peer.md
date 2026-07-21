---
'@kouji-ui/components': patch
---

Surface the `@kouji-ui/core` directives and types referenced by the components' public API through the `@kouji-ui/components` entry point, and pin the `@kouji-ui/core` peer dependency to `>=0.3.0`.

Consumers importing a component from `@kouji-ui/components` whose public API references a core symbol (e.g. `KjOverlayPanel`, `KjInput`, `KjTable`, `KjBadgeVariant`, `KjTabPanel`) previously failed clean AOT template type-checking with `NG3004: Unable to import symbol …` (dev HMR skips the check, so it only surfaced on `ng build`). All such core symbols are now re-exported.

The core peer was `*`, which let an incompatible older `@kouji-ui/core` be installed next to newer `@kouji-ui/components` (causing `No matching export in @kouji-ui/core` at runtime). It is now pinned to `>=0.3.0`.
