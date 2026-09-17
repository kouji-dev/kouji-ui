# kouji-ui System Review

**Round 2 · 2026-09-15 · HEAD rebased on `origin/main` · supersedes commit `9aee150a`**

Nine dimensions, **184 surviving findings**: **1 critical, 10 high, 108 medium, 65 low**. Every one of the **31 findings originally filed as critical or high was re-verified adversarially — 31 of 31, none skipped**: 1 was refuted outright (micro-frontends F-5, "the `@layer kj.*` cascade is global and unversioned" — the mechanism was misattributed to layers; re-filed at low as a documentation gap), 25 were re-sized, and the rest upheld with their scope or wording corrected. The net picture: the *primitives* are good — a real strategy-per-concern overlay engine, a machine-enforced three-tier token system, genuine list/selection/navigation primitives, universal OnPush, heavy dependencies correctly lazy — and the *wiring between primitive and consumer* is where the defects cluster. The single critical finding is that `<kj-select>`, `<kj-tree-select>` and `<kj-cascade-select>` cannot be navigated by keyboard once open. The single most leveraged finding is that CI has not executed a test since 2026-05-07, so 47 of 50 releases shipped under a lint-and-build-only gate — which is why most of the rest went unnoticed.

## Status after fix run (2026-09-15)

Eight fix batches landed on `feat/reviez_claude-0915` (`a426cac1` … `1165f304`).
**178 of the 184 findings are closed**; the six below stay open, each for a
recorded reason rather than an oversight. The counts are `- [x]` vs `- [ ]` in
[BACKLOG.md](BACKLOG.md). Separately, one regression *introduced or surfaced by
the fix run itself* is open and outranks everything here —
[POST-FIX-REGRESSIONS.md](POST-FIX-REGRESSIONS.md) **R-1**, buttons rendering
unstyled in the docs app.

### Still open (6)

| Finding | Status | Why it is still open |
| --- | --- | --- |
| **cust F-5** — the "layer a class on the host" escape hatch is inert for `display:contents` components | Partial | The `kjClass` contract is built, documented and spec'd (`packages/components/src/button/host-class-contract.spec.ts`) and applied to the nine wrappers batch 4 owned. Extending it to the remaining ~60 `display:contents` wrappers is a mechanical repeat across other areas' files; that spec is the table to grow. |
| **cust F-16** — per-instance CSS override defeated by every non-default variant | Partial | Same mechanism and same file set as F-5. `kjClass` puts the consumer's class on the element the `[data-variant]` rule declares on, so an unlayered consumer rule beats `@layer kj.component` regardless of specificity — which an ancestor custom property never could. Closed wherever `kjClass` exists, open for the rest. |
| **cust F-2** — variant/size extensibility splits across two mechanisms | Partial | Badge is migrated onto `bindPresets` (`kjBadgeVariant` → `kjVariant`, clean break) and the table gained its `@doc-css-var` block. Toast is deferred deliberately: its variant is chosen by the *service* (`toast.error()`), not only by a template binding, and it drives `role="alert"` plus an assertive announcer — so putting it behind `KjVariant`'s "warn but still reflect" rule changes the accessibility tree, not just the CSS. ~17 other closed stylistic unions remain. |
| **lazy F-11** — `marked` and TanStack are hard dependencies | Partial | TanStack is done: `@tanstack/virtual-core` is an optional peer and the built FESM is asserted not to import it. `marked` is blocked three ways — `renderMarkdown` / `createMarkdownRenderer` are public API, so the static import stays reachable from `public-api.ts` whatever `chat-message.ts` does; making it lazy turns that synchronous signature async; and the reclassification rewrites `pnpm-lock.yaml`, which a frozen-lockfile run cannot do. The load-bearing half (lazy F-6, the module-scope `marked.use()`) is fixed and spec'd. |
| **overlay F-12** — two Angular apps share the container but not the id counter or the z-stack | Partial → non-goal | The id half and the container half are fixed: `KJ_ID_NAMESPACE` scopes every minted id and the overlay container is discovered in the DOM (`[data-kj-overlay-container]`) instead of held in a module variable, so it self-heals. The shared z-stack cannot be fixed without a page-global stack, which contradicts the MFE non-goal below; it is now documented as unsupported rather than left implied. |
| **lazy F-8** — no secondary entry points; optional-peer types flattened into one `.d.ts` | Deferred | The report's cheap fix — re-declare the offending types structurally — is not available here: `EChartsOption` and Lexical's editor types are not small shapes like `KjVirtualRow`, so re-declaring them means `Record<string, unknown>`, which deletes the type safety of every consumer who *did* install the peer. The real fix (per-folder entry points for `chart` / `editor` / `rich-text`) moves every symbol in those folders to a new specifier and invalidates six build gates, so it wants a batch of its own. It only bites with `skipLibCheck: false`; the caveat is documented in `packages/core/README.md` and `package-exports.spec.ts` holds a shrink-only baseline so the leak cannot grow. |

### Decisions taken during the fix run

These are the rulings that decided *how* — or whether — a finding was fixed.

| Decision | Where it bites |
| --- | --- |
| **A rename is a clean break — never an alias.** Maintainer ruling. All ~33 compatibility re-exports were deleted and every reference migrated; the rule is written into `rules/code_style.md` and enforced by `class-naming.spec.ts`. | arch F-11, cust F-18, and every rename listed in the changesets |
| **Micro-frontends are an explicit non-goal.** Two independently bootstrapped Angular apps in one document is documented as unsupported (`rules/architecture.md` § *Micro-frontends: a non-goal*). | overlay F-12 (z-stack half), mfe F-8, mfe F-15 |
| **Deleting public API is allowed; changing its *shape* is not.** Renames and outright removals shipped; input → input + output splits did not. | arch F-2 (the `model()` subset), lazy F-3, cust F-2 |
| **`model()` booleans stay bind-only.** Angular 22's `ModelOptions` has no `transform`, so `booleanAttribute` cannot apply to a two-way boolean. The convention is written down and lint-exempted rather than converting 15 published bindings. | arch F-2 |
| **No new runtime dependency, and no `pnpm install`.** The lockfile stayed frozen for the whole run. | perf F-4 (list windowing hand-rolled in core rather than reusing `@tanstack/virtual-core`), lazy F-11, the dead `express` dependency |
| **Focus is owned by the overlay, not by the consumer.** Every overlay records its opener and restores focus on close (`returnFocus: false` opts out); list panels take focus on open; the page behind a modal is really inert. | overlay F-1, F-14, a11y F-1, F-23, F-8 |
| **CSS ships once.** `ViewEncapsulation.None` is required, one `.kj-` namespace under one pinned `@layer`, and the overlay family paints only through the registered aggregator. | styles F-21 / lazy F-5, arch F-5 |
| **The i18n catalog is the default; a config field is the override.** Component label configs no longer carry English at all. | cust F-7, a11y F-18 |
| **Zoneless is the supported change-detection mode.** `zone.js` is gone from both packages' test setup and from the docs app. | perf F-23 |

### Alias sweep

`grep -rn "Kept as an alias"` and `grep -rn "@deprecated"` over `packages/core/src`
and `packages/components/src` return exactly one line each, and it is the same
line: `class-naming.spec.ts`, the guard that greps for those phrases. The last
compatibility shim — `KjDatePicker.panelId`, retained "so existing template
references compile" and read by nothing — was deleted with this status update,
along with its `KjDatePickerContext` member. No changeset promises an alias or a
deprecation period. `reports/review/**`, `CHANGELOG.md` and the dated plans under
`docs/superpowers/**` are exempt: they record what was true on a date.

## Scorecard

| # | Dimension | Grade | Crit | High | Verdict | Report |
| --- | --- | :-: | :-: | :-: | --- | --- |
| 01 | Overlay | **C−** | 0 | 2 | Engine is sound; the strategy bus is wired incompletely — `focusTrap.onOpen/onClose` are called nowhere, so no modal traps Tab or restores focus. | [01-overlay.md](01-overlay.md) |
| 02 | Styles & theming | **B-** | 0 | 1 | Genuine three-tier tokens, zero missing per-theme tokens — but four `var()` chains resolve to nothing, two of them focus rings that vanish entirely. | [02-styles-theming.md](02-styles-theming.md) |
| 03 | Customization | **C** | 0 | 0 | Four competing customization stories: a good DI preset system, a hand-rolled duplicate inside `KjAlert`, ~19 closed unions, and hard-coded strings no token reaches. | [03-customization.md](03-customization.md) |
| 04 | Accessibility | **D** | 1 | 5 | Strong primitive layer; the overlay-backed list family is keyboard-inoperable, the data grid has no tab stop, and the specs pass because they dispatch on unfocusable elements. | [04-accessibility.md](04-accessibility.md) |
| 05 | Micro-frontends | **C−** | 0 | 0 | MFE is not a declared target anywhere in the repo. Nothing architecturally hostile, but ~43 module-scope id counters and document-level coordination with no cross-instance protocol. | [05-micro-frontends.md](05-micro-frontends.md) |
| 06 | SSR / server rendering | **B−** | 0 | 0 | 116 of 119 browser-global call sites guarded; the defects are packaging (`components` has no `exports` map) and three unguarded `effect()` bodies. | [06-ssr.md](06-ssr.md) |
| 07 | Lazy loading & bundle | **B** | 0 | 0 | The hard part is done — echarts, monaco and lexical are all genuinely lazy. Avoidable leaks: no Lucide subset API, a docs route that aggregates 69 playgrounds. | [07-lazy-loading-bundle.md](07-lazy-loading-bundle.md) |
| 08 | Runtime performance | **B−** | 0 | 0 | Zoneless-ready, OnPush-universal, no impure pipes. A handful of hot paths do unconditional expensive work; virtualization exists only in the table. | [08-performance.md](08-performance.md) |
| 09 | Architecture & code quality | **B−** | 0 | 2 | One coherent, modern architecture whose rules files have fallen behind it in three load-bearing places — and CI runs none of its 2,042 tests. | [09-architecture-code-quality.md](09-architecture-code-quality.md) |

Severity spread (crit/high/medium/low): overlay 0/2/15/6 · styles 0/1/15/7 · customization 0/0/13/8 · a11y 1/5/12/5 · mfe 0/0/9/8 · ssr 0/0/10/8 · lazy 0/0/8/4 · perf 0/0/14/11 · arch 0/2/12/8.

## Fixed since the last review

`main` advanced 8 commits over `fd6dd34e..HEAD` — four bug fixes and four `chore: version packages` releases. Every claim below was re-checked against the code at HEAD, not taken from either report.

| What was fixed | Commit | Evidence at HEAD | Residual |
| --- | --- | --- | --- |
| Nested overlays no longer render beneath their opener; the z-index stratification seam now exists *(prev overlay F-4a, prev MFE F-8)* | `2948c5b5` (#69) | `applyOverlayZIndex` stamps `--kj-overlay-z` on panel + wrapper (`stack.ts:59-68`); `nextZIndex` is `max(z)+1` (`:175-181`); `KJ_OVERLAY_Z_BASE` DI token + `--kj-overlay-z-base` runtime seam; all 17 panel stylesheets migrated; `overlay-stacking.spec.ts` + `stack.spec.ts:113-115` | One literal survives: `cascade-select.css:64` → overlay **F-10** |
| Overlay CSS is published and installable *(prev styles F-1, prev SSR F-7, prev lazy F-5)* | `fb1d1956` (#71) | `core/ng-package.json` ships `overlay.css` as an asset; `core/package.json` exports `./overlay/overlay.css`; `components/ng-package.json` gained an `assets` block; the cross-package relative `@import` is gone; `overlay-styles.spec.ts` (208 lines) guards it | `components/package.json` still has **no `exports` map** → styles **F-14**, SSR **F-6**, lazy **F-4**; `core/src/styles.css` still unshipped → SSR **F-7**; the aggregator now ships nine sheets twice → lazy **F-5** |
| A backdrop dismisses only a press that *began* on it — WCAG 2.5.2 satisfied for backdrop-bearing overlays *(prev a11y F-14)* | `e6aa28a5` (#73) | New `dismiss-press.ts`; `KjBackdrop` arms on `pointerdown` and dismisses on `click` via `KjDismissPress.owns()`; `detail === 0` keyboard clicks pass through; 10 tests | `KjOverlayStack.handlePointerDown` still closes on the **down** event for backdrop-less overlays (select, popover, tooltip, dropdown-menu, date-picker) |
| A confirm-popup inside a dialog no longer closes the dialog | `415123ad` (#67) | Verified in the range; not a previously filed finding | — |
| List items are scoped to their own container (cross-composite content-query bleed) | `fb1d1956` (#71) | `ownListItems()` (`primitives/list/scope.ts:35-43`) + `scope.spec.ts` | — |
| Component spec coverage partially improved *(prev arch F-5)* | `fb1d1956` (#71) | `overlay-styles.spec.ts` (208), `scope.spec.ts` (99), `dismiss-press.spec.ts` (154), `backdrop-press.spec.ts` (243) | Zero-spec component features 19 → **15** → arch **F-8**; and per arch **F-1**, CI runs none of them |

Not fixed by anything in the range: **all 14** customization findings and **all 19** performance findings from the previous pass reproduce verbatim at HEAD.

## Cross-cutting themes

**1. Focus management is declared everywhere and wired nowhere.**
`overlay F-1, F-14, F-20` · `a11y F-1, F-8, F-11, F-19, F-20, F-23`
`KjOverlayController.beginOpen()` drives `mount` / `position` / `backdrop` / `scrollLock` and stops — `focusTrap.onOpen()` and `onClose()` are called at no site in the repo, and `tabCycle()` puts *all* of its behaviour there. Downstream: every modal advertises `aria-modal="true"` with no containment and no restoration; `KjFocusTrap` and `inertBased()` have zero consumers; and because the panel is never focused, `KjListNavigator` on select / tree-select / cascade-select never receives a key.
**One fix:** call every configured strategy's `onOpen` / `onClose` from the controller, and move initial focus into the panel on open. Ship it with a controller spec asserting both hooks fire for every strategy — that single change makes the trap, the restoration and the list navigation reachable at once.

**2. The packages ship files nobody can address.**
`styles F-14, F-21` · `ssr F-6, F-7, F-8` · `lazy F-4, F-5, F-8` · `arch F-6`
`fb1d1956` made `@kouji-ui/components` *ship* its stylesheet tree, but it still declares no `exports` key at all, so any resolver honouring `exports` rejects the deep path the docs tell consumers to register. `core/src/styles.css` is documented as the aggregate entry point and is in neither the assets list nor the exports map. Neither package declares an `exports["."]`, and `core/package.json:50-51` points `module` / `typings` outside the package root.
**One fix:** build all three packages, inspect the real tarballs, then write the `exports` maps by hand and add a `pnpm pack`-and-assert spec beside `overlay-styles.spec.ts`. That one exercise settles every open question in this cluster, including whether ng-packagr generates the `"."` entry.

**3. Global CSS that outranks everything, and a layer order shipped in the wrong package.**
`styles F-7, F-8` · `mfe F-6` · `arch F-5` · `customization F-5, F-16`
Thirteen stylesheets (ten with real rules) ship with no `@layer` at all, so under `ViewEncapsulation.None` they beat every layered rule on the page regardless of specificity. `base.css:7`'s layer statement omits three layers `prose.css` actually uses — and it lives in `@kouji-ui/themes`, which `@kouji-ui/components` does not depend on, so the ordering only holds by load accident.
**One fix:** wrap the thirteen sheets in `@layer kj.component`, publish a standalone `@kouji-ui/themes/layers.css` carrying the complete `@layer` statement, and add a stylelint rule that fails any `.css` file under `packages/*/src` with no layer.

**4. Document-level state lives in module scope.**
`mfe F-1, F-2, F-4, F-10, F-11` · `overlay F-12, F-13` · `ssr F-9, F-14`
~43 module-level id counters coexist with the per-root `KjId`; the two scroll-lock strategies each keep their own module refcount; the live-region registry and the overlay container are module singletons found by variable, not by DOM. All of it is guarded with `typeof document === 'undefined'` rather than `isPlatformBrowser`, so a host that shims a DOM onto `globalThis` turns every one of them into process-global state shared across concurrent SSR requests — and in one prerender process the counters climb, so a late page emits `kj-field-137` while the hydrating client mints `kj-field-1`.
**One fix:** route every id through the DI-scoped `KjId`, discover the container and the live regions from the DOM instead of a module variable, and replace every `typeof document` guard with `isPlatformBrowser(inject(PLATFORM_ID))`.

**5. The docs describe a library that does not exist.**
`overlay F-2, F-19` · `styles F-12` · `customization F-1, F-3, F-6, F-13, F-14` · `a11y F-7, F-9` · `arch F-5, F-6, F-7, F-9`
`closeOnEsc` / `closeOnOutside` are accepted at three public API levels and reach the stack at none. `KjSpinnerConfig.animations` is documented as extensible and is never read. `kj-field`'s `@doc-aria` says it sets `aria-invalid` / `aria-required` / `aria-describedby`; it sets none. The documented `<kj-dialog-title>` does not exist in the repo. The rules say core ships zero CSS (it ships 592 lines), that `ViewEncapsulation.None` is banned (188 uses) and that every public binding carries a `kj` prefix (102 unprefixed). None of the seven rules files is machine-checked — ESLint validates only the selector prefix, and there is no stylelint over 93 stylesheets.
**One fix:** arch **F-9** is the lever. Encode the three load-bearing rules as lint rules (prefix, encapsulation, layer) and rewrite whichever rule the code has out-voted; a claim nothing checks is a claim that drifts.

**6. A test suite that cannot fail.**
`arch F-1, F-8` · `a11y F-14` · `lazy F-9` · `perf F-23`
CI has executed no test since 2026-05-07; `deploy-docs.yml` rides the same `workflow_run` gate, and `.husky/pre-push`'s "the workflow already enforces" rationale is now false. Underneath that, the keyboard specs for select, tree-select and `tabCycle` dispatch `KeyboardEvent`s directly onto panels a user can never focus, so they pass while the feature is broken; 15 component features have no spec at all; nothing asserts bundle size; and zoneless is implicit and never exercised.
**One fix:** restore `pnpm test` + `pnpm typecheck` + a size budget as required checks in `ci.yml` **and** adopt a spec rule that keyboard events are dispatched from `document.activeElement` — the gate is worthless if the tests behind it test the wrong element.

## Roadmap

### Wave 1 — blockers

Correctness and accessibility defects that ship today. Ordered by impact / effort.

| # | Item | Dim | Findings | Eff | Acceptance |
| :-: | --- | --- | --- | :-: | --- |
| 1 | Run the test suite in CI and gate releases on it | arch | F-1 | S | `ci.yml` runs `pnpm test` + `pnpm typecheck` + e2e on every PR; `release.yml` and `deploy-docs.yml` require a green run. |
| 2 | Two focus rings resolve to nothing — `outline` goes invalid-at-computed-value-time | styles | F-1 | S | Sheet and action-sheet show a visible focus ring; a CSS spec asserts each `var()` chain ends in a literal. |
| 3 | `afterOpened$` is public API on three overlay refs and never emits | arch | F-17 | S | Opening a dialog, a drawer and a sheet each emits once; three specs assert it. |
| 4 | An open accordion panel is clipped at 1000px | a11y | F-22 | S | A panel taller than 1000px is fully reachable; a spec covers the tall-content case. |
| 5 | Keyboard specs dispatch from `document.activeElement`, not from the panel | a11y | F-14 | M | The select / tree-select / `tabCycle` specs fail against HEAD and pass after items 6–12. **Land this first.** |
| 6 | Wire `focusTrap.onOpen` / `onClose` into `KjOverlayController` | overlay, a11y | overlay F-1, F-20; a11y F-20, F-23 | M | A controller spec asserts every configured strategy gets both hooks; a dialog spec asserts Tab is contained and focus returns to the trigger. |
| 7 | Restore focus on close for dropdown-menu, tree-select, confirm-popup, menubar | overlay | F-14 | M | Closing each by Escape and by selection returns focus to its trigger; one spec per consumer. |
| 8 | Give the data grid a tab stop (roving tabindex) | a11y | F-3 | M | Tab reaches the grid body and arrow keys move between cells in the default configuration. |
| 9 | `KjRovingTabindex`: seed to the selected item, clamp on removal, skip disabled | a11y, perf | a11y F-19, F-12; perf F-18 | M | Removing the active item keeps exactly one tab stop; arrow keys skip disabled items; a seeded list opens on its selection. |
| 10 | Tooltips: open on keyboard focus and link via `aria-describedby` | a11y | F-4 | M | Tabbing to a tooltip trigger shows and announces the tip; Escape dismisses it. |
| 11 | Keyboard path for column resizing | a11y | F-21 | M | The resize handle is focusable with a control role, `aria-valuenow`, and arrow-key resizing. |
| 12 | Select / tree-select / cascade-select keyboard navigation | a11y | F-1 | L | **The only critical finding.** Arrow / Home / End / type-ahead / Enter all work on an open panel, verified by specs that dispatch from `document.activeElement`. Last only on effort — settle the APG pattern (listbox vs combobox 1.2) before starting. |

### Wave 2 — structural

Medium-severity clusters. Each row folds several findings that share one fix.

| # | Item | Dim | Findings | Eff | Acceptance |
| :-: | --- | --- | --- | :-: | --- |
| 1 | `kjOffset` transform swallows `0` at six overlay anchor points | arch | F-4 | S | `[kjOffset]="0"` produces a zero offset, not the default; one spec per anchor. |
| 2 | Chart hot paths: per-render re-apply, wrapper ignores `provideECharts`, per-entry resize | perf, lazy | perf F-1, F-19; lazy F-3 | S | `setOption` runs only on an option or theme change; `<kj-chart>` honours `provideECharts`; resize is coalesced. |
| 3 | Stop `_examples` reaching the published API and the library build | lazy, cust | lazy F-7, F-12; cust F-10 | S | `tsconfig.lib.json` excludes `_examples` / `*.playground.ts`; re-exporting an example is a compile error. |
| 4 | `marked.use()` at module scope; hard deps that should be optional peers | lazy | F-6, F-11 | S | `sideEffects: false` is truthful; `marked` is reachable only through a loader token. |
| 5 | Ban the global `document` in library code | ssr | F-3, F-4, F-15 | S | `no-restricted-globals` fails on `document` / `window`; the three unguarded `effect()` bodies use `inject(DOCUMENT)`. |
| 6 | Size budget and bundle gate | lazy | F-9 | S | CI fails when the docs initial bundle or a package FESM crosses its budget. |
| 7 | Write the `exports` maps and assert a real tarball | styles, ssr, lazy, arch | styles F-14; ssr F-6, F-7; lazy F-4; arch F-6 | M | `pnpm pack` output is inspected in a spec; every documented specifier resolves under Node's `exports` resolution. |
| 8 | Layer the thirteen unlayered stylesheets; publish the layer order standalone | styles, mfe | styles F-7, F-8; mfe F-6 | M | Every `.css` under `packages/*/src` opens with `@layer kj.*`; stylelint enforces it; `layers.css` ships from `@kouji-ui/themes`. |
| 9 | Deliver the close policy to the stack; pick one owner for outside-press | overlay | F-2, F-4 | M | `alert: true` survives Escape and a scrim click; backdrop-less overlays dismiss on the **up** event. |
| 10 | Make the overlay controller destroy-safe | overlay, perf | overlay F-3, F-15; perf F-12 | M | Destroying a fixture with an open overlay leaves `stackSize === 0`, the page scrollable, and no listeners attached. |
| 11 | Anchored positioning pass: rAF-coalesce, measure after visible, RTL, `data-side` | overlay, perf | overlay F-5, F-7, F-8, F-9; perf F-3 | M | Arrows are positioned; first open measures a visible panel; `align` mirrors under `dir="rtl"`; scroll repositioning is coalesced and passive. |
| 12 | Route every id through `KjId`; discover document singletons from the DOM | mfe, ssr, overlay | mfe F-1, F-2, F-11; ssr F-9, F-14; overlay F-12, F-13 | M | Two Angular roots on one page mint disjoint ids; prerendered ids match hydrated ids; `isPlatformBrowser` replaces every `typeof document` guard. |
| 13 | Accessible names and ARIA wiring for overlays and fields | a11y | F-7, F-8, F-9 | M | Service-launched dialogs / drawers / sheets carry a name; `kj-field` sets `aria-invalid` / `aria-required` / `aria-describedby`; `inert` is actually applied under `aria-modal="true"`. |
| 14 | Calendar: seeded tab stop, gridcell nesting, drop `role="application"` | a11y | F-6, F-10 | M | A calendar with a future `kjMin` has a reachable day; day buttons are not nested gridcells. |
| 15 | Theme contrast: orrery-light intents, retro focus ring, `--kj-border-default` | styles | F-2, F-3, F-20 | M | Every intent token meets AA against its own body; focus rings and control borders meet 3:1; the themes spec asserts the ratios. |
| 16 | `color-scheme` and a themeless default | styles | F-4, F-5 | M | Dark themes get dark native UI; a page with no `[data-theme]` renders a usable default. |
| 17 | `booleanAttribute` on ~95 boolean inputs | arch | F-2 | M | The bare-attribute form works everywhere the docs use it; a lint rule fails a boolean input without the transform. |
| 18 | Machine-enforce the rules, and rewrite the ones the code out-voted | arch, cust | arch F-5, F-7, F-9; cust F-12 | M | ESLint checks binding prefix and encapsulation; stylelint covers 93 stylesheets; `rules/` matches the code. |
| 19 | Icons: a subset API and a registry that works below root | cust, lazy, mfe | cust F-8; lazy F-2; mfe F-12 | M | `provideLucideIcons(names)` exists and tree-shakes; `provideIcons()` works on a route injector. |
| 20 | Table and list hot paths: persistence, virtual measurement, per-cell methods, selection | perf | F-6, F-7, F-8, F-9, F-13, F-14 | M | Row selection does not write storage; virtual rows are measured; selection membership is O(1). |
| 21 | Rich-text and chat re-render costs | perf | F-2, F-10, F-11 | M | One serialisation per committed update; markdown is sanitised once per content change; streaming lexes incrementally. |
| 22 | Specs for the 15 untested component features and the 3 `it.todo` files | arch | F-8 | M | Every published component feature has at least one behavioural spec. |
| 23 | Docs site SSR: drop the splash gate and the dead Express app | ssr | F-2, F-5 | M | Prerendered pages paint without JS; exactly one server entry exists, or none. |
| 24 | Unify the customization surface: presets, config merge, doc truth | cust | F-2, F-4, F-5, F-6, F-11, F-16, F-18, F-19 | L | One preset mechanism; `provideKj*` deep-merges consistently and is re-exported from `@kouji-ui/components`; every config TSDoc matches behaviour. |
| 25 | Scope the hotkeys and fold `<kj-command-palette>` onto the overlay primitive | overlay, mfe | overlay F-6; mfe F-8, F-9 | L | Two palettes on one page do not both answer one `⌘K`; the palette is an accessible modal with no global `querySelector`. |
| 26 | i18n: one source of truth for every user-visible string | cust | F-7 | L | No component ships a hard-coded English label the catalog cannot override. |
| 27 | Virtualization for list-style components | perf | F-4 | L | Combobox and command palette render a window, not the full option set, at 5,000 items. |

### Wave 3 — polish

Low-severity items, grouped by dimension. See [BACKLOG.md](BACKLOG.md) for the flat list.

| # | Item | Dim | Findings | Eff | Acceptance |
| :-: | --- | --- | --- | :-: | --- |
| 1 | `KJ_COMPONENTS_VERSION` reports `0.0.1` for a package at `0.9.3` | arch | F-15 | S | The constant is generated from `package.json`. |
| 2 | Delete the dead overlay CSS and the invented token names | overlay, styles, mfe | overlay F-13, F-23; styles F-6, F-9, F-10, F-18; mfe F-10 | S | No stylesheet references a token or attribute nothing writes. |
| 3 | `KjCloseReason` carries real information | overlay | F-11 | S | A consumer can tell an Escape close from a scrim close from a programmatic one. |
| 4 | Docs-site theming debt | styles | F-15, F-17, F-19, F-22, F-23 | S | No theme flash; all 15 themes reachable; `docs-themes.css` out of the library source; the a11y artefacts substantiate the contrast claims. |
| 5 | Overlay ergonomics carried forward from the previous pass | overlay | F-16, F-17, F-18, F-19, F-21, F-22 | M | Transition duration is read post-state; `kjMount` is reactive; declarative overlays can render a backdrop; speed-dial uses the primitive. |
| 6 | Remaining a11y polish | a11y | F-2, F-11, F-13, F-15, F-16, F-17, F-18, F-23 | M | OTP completion fires; sortable headers have a control role; no nested live regions; AAA gaps closed or documented. |
| 7 | TSDoc coverage and diagnostics consistency | arch | F-10, F-14 | M | Input/output TSDoc coverage ≥ 95% in both packages; misuse diagnostics are uniform and tree-shakeable. |
| 8 | `kj-menubar` completeness and the shared filter contract | arch | F-18, F-21 | M | `KjTabList` configures its primitive instead of swallowing its events; the menubar TODO is closed; `KJ_FILTER_CONTEXT` lives in a `*.context.ts`. |
| 9 | Remaining SSR items | ssr | F-10, F-11, F-12, F-13, F-16, F-17, F-18 | M | Calendar does not bake the build date; the prerender exercises real components; no bare `crypto.randomUUID()`. |
| 10 | Remaining MFE items (gated on the topology decision) | mfe, cust, arch | mfe F-3, F-4, F-5, F-14, F-15, F-17; cust F-1, F-9, F-15, F-17, F-20, F-21; arch F-3 | M | Either a documented MFE contract with per-app seams, or a documented non-goal — and `@angular/cdk` off both peer lists either way. |
| 11 | Remaining perf items | perf | F-5, F-15, F-16, F-17, F-20, F-21, F-22, F-23, F-24, F-25 | M | No per-instance document listener or observer where a root service would do; a zoneless test exercises the library. |
| 12 | Naming, file layout and duplication cleanup | arch, cust | arch F-11, F-12, F-13, F-16, F-19, F-20, F-22; cust F-18 | L | One directive per file; `KjDisabled` composed everywhere; overlay refs and cell editors deduplicated. |
| 13 | Density and prose token namespaces | styles | F-11, F-12, F-13 | L | Density scales control heights; `prose.css` reads tokens themes actually define; no unprefixed global attribute selectors ship. |
| 14 | Entry-point restructure and dead dependencies | lazy | F-1, F-8, F-10 | L | Secondary entry points let a consumer import a button without the table's peers; no declared dependency is unreferenced. |

## Verification notes

**Verified.** All **31** findings originally filed as critical or high — across all nine dimensions — were re-verified adversarially against the code at HEAD. **None was skipped.** Outcome: **1 refuted**, **25 re-sized**, the remainder upheld with scope or wording corrected. Each correction is folded into its finding under a "Verification correction" block naming the withdrawn claim. Every "Fixed since" claim above was independently re-checked at HEAD rather than taken from either report.

**Refuted.** Exactly one: micro-frontends F-5, *"the `@layer kj.*` cascade is global and unversioned — the second copy silently restyles the first."* The colliding identifier is the class name, not the layer name; the rename sub-claim is false CSS; the stylesheet count was 80 against an actual 62; and the implied fix (versioned layer names) would make the winner *less* predictable. Re-filed at **low** as a documentation gap, with the original text preserved under "Refuted during verification" in that report. Its original form appears in no roadmap wave.

**Re-sized.** Notable directions, all recorded in place: overlay F-1 critical → high; overlay F-2 / F-3 / F-4 high → medium; a11y F-2 critical → medium (the critical consequence is unreachable at HEAD); a11y F-5 / F-6 high → medium; MFE F-1 / F-2 high → medium and F-3 / F-4 high → low; SSR F-1 high → medium (it reproduces nowhere in this repository); customization F-1 high → **low** (scope cut from four root singletons to one docstring sentence — the *previous* review had it right the first time); perf F-3 high → low (both passes overstated it). One moved the other way: a11y F-17's reduced-motion count was corrected **upward** — 24 animated stylesheets carry no `prefers-reduced-motion` block, not 3.

**Unverified — read these severities as the author's own.** **No medium or low finding was verified.** That is 173 of 184 findings, including every item in Waves 2 and 3 except those re-sized down from high. Their severity, confidence and effort are the filing reviewer's estimate, not a checked result.

**Methodological caveats the reviewers flagged about their own evidence:**

- **No `node_modules`, no `dist/`, no build was run.** Every byte figure in `07-lazy-loading-bundle.md` is a source-derived estimate and is labelled as such; the structural claims are read off the source at HEAD. Whether ng-packagr generates the `exports["."]` entry, what `npm pack` actually produces, and whether `provideECharts` prevents an `echarts` chunk being emitted are **untested by either pass** and settled only by a real build.
- **No runtime profiling.** `08-performance.md` ranks by reasoned expected impact — complexity, call frequency, forced layout — not by observed milliseconds. It says so in its own verdict.
- **The a11y artefacts cannot substantiate the theme contrast claims** (`styles F-19`): `reports/a11y/_summary.json` does not cover the theme set it is cited for, and `orrery` / `orrery-light` are absent from every artefact. Every contrast ratio in `02-styles-theming.md` was recomputed by hand from the theme CSS.
- **Seven accessibility findings carried over from the 2026-09-06 review were out of this pass's scope and were not re-checked** — prior F-11 (focus indicator removed with no replacement), F-12 (RTL outside slider / avatar-group), F-13 (hard-coded English ARIA strings), F-17 (no status announcements for filter / sort / paginate), F-18 (`KjTypeAhead` same-letter cycle), F-20 (fixed 4s toast dismissal), F-21 (`KjListNavigator` hijacks Home / End in text fields). Their files are unchanged in `fd6dd34e..HEAD`; **assume all seven still open.** They are not in the counts above.
- **Thirty-eight previous findings were missed by this pass — not fixed, not wrong.** All were re-verified at HEAD and restored with their prior ids noted: overlay F-14…F-23, styles F-20…F-23, customization F-16…F-21, a11y F-19…F-23, MFE F-16…F-17, SSR F-15…F-18, lazy F-11…F-12, perf F-21…F-25, arch F-17…F-22. They are counted and scheduled like any other finding.

**Open questions.** Each report ends with 4–7 open questions that a decision, not an investigation, would settle. Three of them gate whole clusters and should be answered before Wave 2 starts: **is MFE a supported target?** (sizes most of dimension 05 plus customization F-1 / F-8 / F-9), **is `ViewEncapsulation.None` + global `@layer kj.component` the permanent architecture?** (decides whether arch F-5 is a rule rewrite or a repo-wide migration), and **what scale does the library support?** (perf F-4 / F-6 / F-9 / F-14 are severe at 5,000 items and invisible at 50).

## How to use these reports

- **Start here, then read the dimension you own.** Each report is self-contained: Verdict → What works → Findings → Carried forward → Changed since the 2026-09-06 review → Recommended work items → Open questions.
- **[BACKLOG.md](BACKLOG.md)** is the flat, issue-ready checklist: one line per surviving finding, `[SEV][DIM][effort] title — ids — files`, grouped by wave. Copy rows straight into issues.
- **Severity is impact, effort is cost, confidence is how sure the reviewer is.** Only critical and high carry a verification stamp; treat medium and low as unreviewed estimates and re-check before committing a sprint to one.
- **Trust the report files over this index** where they disagree — the reports hold the corrected severities and the line-level evidence.
- **Before fixing anything, read its "Verification correction" block** if it has one. It names claims that were withdrawn, and fixing a withdrawn claim is wasted work.
- **A finding listed in "Fixed since the last review" is done.** It is deliberately absent from every roadmap wave; only its named residual is scheduled.
