---
'@kouji-ui/core': patch
'@kouji-ui/components': patch
'@kouji-ui/themes': patch
---

Workspace resolution metadata: `@kouji-ui/core`'s `package.json` now declares `module`, `typings`, `exports`, and `type: "module"` so other workspace packages (`@kouji-ui/components`, future packages) can resolve `@kouji-ui/core` via Node module resolution after `ng build kj-core` runs. Workspace-only paths point at `../../dist/kj-core/...`; a `publishConfig` override rewrites them to in-package paths (`./fesm2022/...`, `./types/...`) for the published npm artifact, so consumers see the same shape as before.

No public API change. Pure infrastructure for the upcoming `@kouji-ui/components` package (Wave 0 of the themes & components architecture).
