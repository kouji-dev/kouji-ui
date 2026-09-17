---
'@kouji-ui/core': minor
'@kouji-ui/components': minor
'@kouji-ui/themes': patch
---

**Batch 7 cross-area closures.** The last compat shims the no-alias ruling
covers, the two remaining parent-context diagnostics, and the packaging gap the
Vite / Analog install path was still missing.

**Breaking — two compat shims deleted.** `KjChatMessage.safe()` is gone; bind
`block.html` to `[innerHTML]` directly, which *is* `DomSanitizer` at
`SecurityContext.HTML` and runs once per change rather than once per check. The
`'esc'` member of `KjCloseReason` is gone along with the controller's
normalisation of it — use `'escape'`. Both were kept only so existing code
would keep compiling, which is exactly the shape the ruling forbids.

**Diagnostics (arch F-14).** `KjProgressBarFill` and `KjTagRemove` were the last
two children in core reading their parent's token through a bare `inject()`;
both now use `injectParent`, so a mis-composed child fails with
`` [KjTagRemove] must be used inside `[kjTag]`… `` instead of `NG0201: No
provider for InjectionToken KjTag`. `KjTablePagination`'s
`injectParent(KJ_TABLE, …) as KjTable<unknown>` cast is deleted — `KJ_TABLE` is
declared `InjectionToken<KjTable<unknown>>`, so the cast asserted a type the
token already carried. `<kj-textarea>`'s counter warning routes through
`kjDevWarn`, so its message string leaves production builds with the branch.
Every allowance in `packages/core/src/architecture.spec.ts` is now an empty
expectation: core is at zero on all three checks.

**Shared observers (perf F-5).** The styled `<kj-chart>` built one
`ResizeObserver` per instance — it is a standalone ECharts host, not a
composition of the core `[kjChart]`, so the earlier sweep missed it. It now
rides the root `KjResizeObserver`: a twenty-chart dashboard adds no observers at
all, and the service's own rAF coalescing replaces the component's.

**Packaging (ssr F-8).** `@kouji-ui/themes`, `@kouji-ui/core` and
`@kouji-ui/components` now export `./package.json`. A tool that resolves
`<pkg>/package.json` — routine for dependency scanning, and something Vite does
— previously got `ERR_PACKAGE_PATH_NOT_EXPORTED` from the themes package, which
ships no `ng-package.json` and so never had the entry generated for it.

**Prerender (ssr F-16).** `KjCarousel` read a slide's required `kjSlideValue`
before the first binding, emitting an `NG0950` on every prerendered page holding
a carousel. Guarded the way `KjTable` was in batch 2: the read still registers
the dependency, so the computed recomputes once the value arrives.
