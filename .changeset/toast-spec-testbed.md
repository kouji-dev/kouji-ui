---
'@kouji-ui/core': patch
---

Test-only fix: rewrite `KjToastService` test suite to use `TestBed.inject()` so `inject(KJ_TOAST_STRATEGY)` resolves through Angular DI (was crashing with `new KjToastService()` outside an injection context). No runtime change.
