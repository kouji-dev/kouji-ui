---
'@kouji-ui/core': major
'@kouji-ui/components': major
---

Upgrade to Angular 22. Peer dependency ranges for `@angular/core`, `@angular/common`, and `@angular/cdk` now require `^22.0.0` (was `^21.0.0`) — consumers must upgrade to Angular 22 to use this version.

Internal changes as part of the upgrade:
- `KjSpeedDial`, `KjPagination`, and `KjCombobox`'s two-way-bindable inputs (`kjOpen`, `kjPage`, `kjQuery`) now use `input()` + `linkedSignal()` instead of `model()`, to avoid colliding with their paired convenience outputs under Angular 22's stricter duplicate-output check. Public API is unchanged.
- `packages/core`'s build now passes `-c tsconfig.lib.prod.json` explicitly to `ng-packagr`, fixing a silent fallback to an internal `es2018` lib default that broke `Intl`/`Array.prototype.at` typings.

Known issue: a subset of overlay-based components (confirm-popup, drawer, popover, date-picker, and others using the shared overlay `attachComponent()` primitive) hit `NG0950` (required input not available) under Angular 22's stricter dynamic-component input timing. Tracked as follow-up work, not fixed in this release.
