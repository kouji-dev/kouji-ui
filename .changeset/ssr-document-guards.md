---
'@kouji-ui/core': patch
---

Prerender/SSR: avoid `document` ReferenceError in time-picker segment and calendar day (browser guard + `inject(DOCUMENT)` for `activeElement`).
