---
'@kouji-ui/core': patch
---

Add a runnable `locale` docs example and surface it on the locale page.

`provideKjLocale` now carries a `@doc-example` referencing a new
`locale.basic.example.ts` (registered in the core example loader map), so the
locale provider page renders a live demo — switching locale re-runs the
`Intl`-backed number / currency / date formatters and the resolved direction.
Docs-only; no runtime API change.
