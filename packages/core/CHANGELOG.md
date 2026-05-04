# @kouji-ui/core

## 0.0.4

### Patch Changes

- 202d9de: CI fix: husky pre-push hook now skips in CI environments (`$CI` or `$GITHUB_ACTIONS` set). Prevents the Changesets action's automated push from being blocked by the changeset-status gate. No runtime effect on the published package.
- dc0fe0f: Test-only fix: rewrite `KjToastService` test suite to use `TestBed.inject()` so `inject(KJ_TOAST_STRATEGY)` resolves through Angular DI (was crashing with `new KjToastService()` outside an injection context). No runtime change.
- d6b40e1: Internal lint cleanup — replace `any` casts in select option storage with typed `HTMLElement & { __kjOptionValue?: unknown }` and convert ternary statement to if/else in overlay toggle. No public API or behavior change.

## 0.0.3

### Patch Changes

- c177d1e: Rewrite README with real install/usage docs, primitive index, and design principles. Replaces the Angular CLI scaffold placeholder.

## 0.0.2

### Patch Changes

- 1813d21: Initial publish — headless Angular 21 UI primitives over CDK with WCAG 2.1 AAA semantics and zero CSS.
