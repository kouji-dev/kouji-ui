# kouji-ui System Review

**Date:** 2026-09-15 · **Branch:** `feat/reviez_claude-0915` · **Scope:** `packages/core`, `packages/components`, `packages/themes`, `apps/docs` · **Method:** read-only source review across nine dimensions, followed by an adversarial verification pass over the highest-severity findings.

**144 findings across 9 dimensions.** After verification: **2 critical**, **39 high**, **71 medium**, **32 low**. Nine findings were originally filed as critical; seven of those were downgraded or refuted.

---

## Scorecard

| # | Dimension | Grade | Crit | High | One-line verdict | Report |
|---|---|---|---|---|---|---|
| 1 | Overlay system | C- | 0 | 4 | Genuinely good strategy/token architecture; the seams between the primitive and its 18 consumers leak — no disposal, dropped close flags, per-component z-index, missing focus restore. | [01-overlay.md](./01-overlay.md) |
| 2 | Styles & theming | C | 0 | 3 | Well-designed three-tier token ladder and a real `@layer` contract, enforced nowhere — and the overlay CSS ships in no tarball. | [02-styles-theming.md](./02-styles-theming.md) |
| 3 | Customization API | C | 0 | 4 | Four competing customization stories (DI presets, closed unions, CSS custom properties, i18n catalog) that do not agree; the preset system itself is the good one. | [03-customization.md](./03-customization.md) |
| 4 | Accessibility | D+ | 1 | 6 | The a11y primitives are better than the widgets built from them: select, the data grid and the tooltip are not keyboard-operable at all. | [04-accessibility.md](./04-accessibility.md) |
| 5 | Micro-frontend readiness | D | 0 | 5 | Written as if it owns the page — per-copy id counters, per-root document listeners, global `:root` tokens — but MFE is an undeclared, unsupported target. | [05-micro-frontends.md](./05-micro-frontends.md) |
| 6 | SSR / server rendering | C+ | 0 | 3 | The library is unusually disciplined (117 `afterNextRender`, 43 platform checks); the app-level story is weaker — nothing actually server-renders, and neither package resolves under Vite/Node. | [06-ssr.md](./06-ssr.md) |
| 7 | Lazy loading & bundle | C+ | 0 | 3 | Excellent lazy loading of the three heavy deps; bad bundle shape — one flat mega-barrel, one FESM, no size budget, an eagerly-wired full Lucide set. | [07-lazy-loading-bundle.md](./07-lazy-loading-bundle.md) |
| 8 | Runtime performance | C+ | 0 | 6 | Strong structural hygiene (all OnPush, all `@for` tracked, no zone coupling) with a small set of hot-path defects under the heaviest widgets. | [08-performance.md](./08-performance.md) |
| 9 | Architecture & code quality | B- | 1 | 5 | `core` is a strong headless library, `components` is a mid-era wrapper layer, and `rules/` describes a fourth thing nobody enforces — because CI has run no tests since 2026-05-07. | [09-architecture-code-quality.md](./09-architecture-code-quality.md) |

Counts are **post-verification**. Grades were not re-scored; see each report's verdict for the corrections applied.

---

## Cross-cutting themes

These matter more than any single finding: each spans three or more dimensions and has one fix that resolves the cluster.

### T1 — Nothing is enforced, so every rule drifts
**Spans:** ARCH F-1, F-15, F-5 · STY F-1, F-2, F-4, F-5 · BUN F-3 · PERF F-15 · A11Y F-1 (its spec dispatches on the panel, so the break passes CI) · OVL F-1 (no destroy-while-open spec).

CI has run zero tests since 2026-05-07, ESLint enforces none of the seven `rules/` files, no test asserts the `@layer` convention, no test asserts theme contrast, no test builds the tarballs, and no size budget exists. Every "the code drifted from the rule" finding in this review is downstream of this.

**One fix:** re-enable `pnpm test` in CI (and make `release.yml` depend on a run that includes it), then land five machine checks in the same PR — the two custom ESLint rules (`kj` input prefix, `booleanAttribute`), a "first at-rule must be `@layer`" CSS check, a per-theme WCAG contrast assertion in `themes.spec.ts`, a `dist/` packaging smoke test, and a `size-limit` budget.

### T2 — The published tarballs are unproven and partly broken
**Spans:** STY F-1 · SSR F-6, F-7 · BUN F-2, F-3, F-5, F-10 · ARCH F-16 · MFE F-14.

`apps/docs` builds against `tsconfig` source `paths`, never against `dist/`, so nothing in CI has ever exercised what a consumer installs. Consequences already in the code: no `"."` export on either package, `module`/`typings` pointing outside the package root, the overlay primitive CSS and its documented aggregator copied into no tarball, `_examples` leaking into the public API through two barrels, and a `@import` that escapes the package directory.

**One fix:** one packaging workstream — add `"."` exports and CSS `assets`/`exports` to both manifests, replace the cross-package relative `@import`, exclude `_examples` from the lib tsconfigs — gated by a CI job that builds `apps/docs` against the packed tarballs.

### T3 — Page-global singleton state with no coordination seam
**Spans:** MFE F-1, F-3, F-5, F-7, F-10, F-13 · OVL F-1, F-6, F-13 · CUS F-2 · SSR F-2, F-12 · PERF F-16 · STY F-8.

The overlay container, both scroll-lock refcounts, the live-region registry, ~41 module-scope id counters and `KjId` are all module-level or per-root-injector state that writes into one page-global slot. The same code shape is simultaneously an MFE risk (two copies fight), an SSR risk (module state retained across requests) and a perf risk (per-instance listeners and observers).

**One fix:** one "kill the module globals" pass converting the container, the announcer registry and both scroll locks into `providedIn: 'root'` services over `DOCUMENT` + `PLATFORM_ID`, seeding `KjId` from `APP_ID`, and coordinating the duplicate-copy case through a document-level attribute (the `body[data-kj-scroll-lock]` mechanism that `popover.css:60` already references but nothing sets).

### T4 — The overlay strategy bundle has no slot for close policy, modality or stacking
**Spans:** OVL F-2, F-3, F-4, F-5, F-6, F-12 · A11Y F-1, F-2, F-3, F-8, F-14 · MFE F-8 · STY F-1.

`KjOverlayStrategies` carries `mount`/`position`/`backdrop`/`focusTrap`/`scrollLock`/`liveAnnouncer`/`trigger` — and nothing else. So `closeOnEsc`/`closeOnOutside` are accepted at every public API level and dropped before reaching the stack; there is no default focus-restore, so each consumer either provides a trap or silently drops focus to `<body>`; and stacking is re-solved in per-component CSS, which then contradicts the container's documented ordering.

**One fix:** extend the strategy bundle with a close policy (`closeOnEsc`, `closeOnOutside`, `modal`) carried from `KjOverlayBuilderConfig` through `attachStrategies` into `stack.register`, make `KjOverlayPanel` default `focusTrap` to a restore-only strategy when the consumer provides none, and stamp an increasing z-index on the wrapper instead of on nine component stylesheets.

### T5 — `ViewEncapsulation.None` + global CSS is the real architecture, and the rules forbid it
**Spans:** ARCH F-9, F-10 · CUS F-3, F-4, F-12 · STY F-2, F-3, F-12 · MFE F-4, F-5.

183 uses of `ViewEncapsulation.None` against an explicit "do not use" rule; `core` ships five stylesheets against a "directives only, zero CSS" rule; ten globally-injected stylesheets skip `@layer kj.component`; `[data-tone]`/`[data-truncate]` are bare global attribute selectors in a published package. No ADR records the trade, so every one of these reads as drift rather than a decision — and every downstream fix (per-instance override hatch, MFE version scoping, layer lint) is blocked on which way it goes.

**One fix:** make the decision and write it down. Either carve a documented exception into `rules/code_style.md` (and then the layer lint, the `data-kj-*` namespacing and the version-scoping story all follow), or schedule the migration to `Emulated`. Nothing else in this cluster should be touched first.

### T6 — Documentation asserts behaviour the code does not implement
**Spans:** A11Y F-1, F-2, F-3, F-15 · OVL F-5, F-14 · ARCH F-2, F-14 · CUS F-1, F-10, F-11 · MFE F-9 · STY F-1.

`@doc-keyboard` blocks on select and cascade-select advertise the full APG contract for keys that do nothing. Five docblocks say siblings are marked `inert`; none are. `confirm-popup-content.ts:20` promises focus restoration it does not do. `afterOpened$` is published on three refs and never emits. `provideKjLocale` promises route scoping `providedIn:'root'` cannot deliver. `provideKjChat` promises a merge that does not exist. `rules/architecture.md` names a `KjOverlayService` that does not exist. This is the most dangerous class here: consumers trust `@doc-a11y` and ship inaccessible apps.

**One fix:** a doc-truth sweep with the rule *every behavioural claim in a `@doc-*` block needs a spec or gets deleted* — landed together with T1's test re-enablement so the specs actually run.

---

## Roadmap

Ordered within each wave by impact ÷ effort. Finding ids use the dimension prefixes from the scorecard. Full per-item checklist: [BACKLOG.md](./BACKLOG.md).

### Wave 1 — blockers

The two remaining criticals, everything that blocks SSR/prerender or a working install from the published tarballs, and the WCAG-A keyboard failures on flagship components.

| # | Item | Dim | Findings | Effort | Acceptance criterion |
|---|---|---|---|---|---|
| 1 | Re-enable tests in CI before the next publish | ARCH | F-1 | M | `pnpm test` runs in `ci.yml`; `release.yml` only publishes behind a CI run that includes it; any quarantined specs are listed with an owner. |
| 2 | Dispose `KjOverlayController` on host destroy | OVL | F-1 | S | Destroying a fixture with an open popover leaves `stack.stackSize === 0`, no `.kj-overlay-wrapper` in the DOM, and no scroll lock held. |
| 3 | Fix `KjLink`'s doubled external-link suffix | SSR | F-3 | S | An SSR + hydrate test asserts exactly one "(opens in new tab)" per external link. |
| 4 | Guard the three server-reachable `document` dereferences | SSR | F-2 | S | Prerendering a page containing a list navigator, tree-select and chart completes without throwing. |
| 5 | Tooltip opens on focus and is wired via `aria-describedby` | A11Y | F-3 | S | Tab to a tooltip trigger opens it; the trigger carries `aria-describedby` pointing at the panel id and no `aria-expanded`. |
| 6 | Give the data grid a tab stop | A11Y | F-4 | S | Tab reaches the grid, then arrow keys move the roving cell — asserted from `document.activeElement`. |
| 7 | Restore keyboard operation of select and cascade-select | A11Y | F-1 | M | After a real trigger click, arrows / Home / End / type-ahead / Enter change the active option, dispatched from `document.activeElement`; focus returns to the trigger on close. |
| 8 | Ship the overlay CSS in both tarballs | STY, BUN, SSR | STY F-1, BUN F-5, SSR F-7 | M | A packaging test asserts the expected `.css` files exist in `dist/kj-core` and `dist/kj-components`; a service-launched dialog in a consumer fixture shows a clickable backdrop. |
| 9 | Thread `closeOnEsc` / `closeOnOutside` into the stack | OVL | F-2, F-3 | M | `dialog.open(C, {closeOnEsc:false})` survives Escape; `alert:true` survives an outside pointerdown; an open toast does not swallow the dialog's Escape; the reported close reason is `'outside'` for outside clicks. |
| 10 | Focus restoration on menu-style overlays | OVL | F-5 | M | After open → arrow → Escape, `document.activeElement === trigger` for dropdown-menu, tree-select, confirm-popup and menubar's projected submenu. |
| 11 | Keyboard path for column resizing | A11Y | F-5 | M | The resize handle is focusable and arrow keys change column width, with the new width announced. |
| 12 | Decide `apps/docs/src/server.ts` | SSR | F-1 | M | Either `angular.json` declares an `ssr.entry` and the `/api` routes respond in a smoke test, or the file and the two TSDoc references to it are deleted. |
| 13 | Working entry points for both packages | SSR, BUN | SSR F-6, BUN F-10, ARCH F-16 | L | A plain Node and a plain Vite import of `@kouji-ui/core` and `@kouji-ui/components` resolves from the packed tarball; CI builds `apps/docs` against those tarballs. |

### Wave 2 — structural

Architecture, customization, styling-contract and bundle restructures. Several need a decision recorded before code changes — start with the encapsulation ADR (T5), because four other items are blocked on it.

| # | Item | Dim | Findings | Effort | Acceptance criterion |
|---|---|---|---|---|---|
| 1 | Land the ESLint rules and the four machine checks from T1 | ARCH | F-15, F-3, F-4 | M | `kj`-prefix and `booleanAttribute` rules fail the build on a seeded violation; the layer, contrast, packaging and size checks each fail on a seeded violation. |
| 2 | Record the encapsulation ADR | ARCH, CUS, MFE | ARCH F-10, F-9, CUS F-12, MFE F-4 | S (decision) | `rules/code_style.md` either documents the `ViewEncapsulation.None` exception with its consequences, or names the migration target and owner. |
| 3 | `color-scheme` + a default theme without `data-theme` | STY | F-7 | S | Every theme declares `color-scheme`; a page with no `data-theme` renders a complete light theme, and `prefers-color-scheme: dark` picks the dark aliases. |
| 4 | Fix `afterOpened$`, `booleanAttribute`, `KjTabList` | ARCH | F-2, F-4, F-6 | S | `afterOpened$` emits (or is removed) with a spec; `<kj-button kjLoading>` works as a bare attribute; `KjTabList` forwards `kjRovingOrientation` with `keydownFilter` deleted. |
| 5 | Wrap the 10 unlayered sheets; extend the `@layer` statement | STY, CUS | STY F-2, F-3, CUS F-4 | S | Every `ViewEncapsulation.None` stylesheet opens with `@layer kj.component`; `base.css:7` names `kj.prose, kj.tone, kj.truncate` after `kj.component`; the lint from item 1 passes. |
| 6 | Hot-path perf fixes under the heaviest widgets | PERF | F-1, F-3, F-7, F-8 | S each | Sanitization is memoised per message; row-click persistence is debounced off the click path; the filter effect writes only changed items. |
| 7 | Kill the module globals; seed ids from `APP_ID` | MFE, OVL, CUS | MFE F-1, F-3, F-5, F-7, F-10, OVL F-13, CUS F-2 | M | Two TestBed roots mint no repeated id; nested overlays share one scroll-lock refcount; a service-launched overlay inherits its app's `data-theme` and `dir`. |
| 8 | Strip per-component z-index; stamp it on the wrapper | OVL, MFE | OVL F-4, MFE F-8 | M | A select opened inside an open drawer paints above it, asserted by a nested-overlay spec. |
| 9 | Contrast fixes + the enforcing assertion | STY | F-4, F-5 | M | `--kj-border-default` clears 3:1 on `bg-body` and `bg-field` in all 15 themes; `orrery-light`'s six class-C intents clear 4.5:1 on `#dedede`; `themes.spec.ts` fails if a new theme misses either bar. |
| 10 | `anchoredTo` pass: RTL, clipping ancestors, rAF-coalesced scroll | OVL, PERF, A11Y | OVL F-7, PERF F-2, A11Y F-12 | L | Anchored panels flip correctly under `dir="rtl"`, respect a scrollable clipping ancestor, and a scroll event triggers at most one layout per frame. |
| 11 | One variant/preset story across every variant-bearing component | CUS | F-5, F-8, F-11, F-13 | L | Every variant-bearing component has `config.ts` + `provideKj<X>` + `bindPresets` in `core`; a CSS-selector ⇄ `*_DEFAULTS` parity test exists. |
| 12 | Close the i18n fork | CUS, A11Y | CUS F-6, A11Y F-13 | M | Config-token labels default to catalog lookups; changing locale changes pagination, breadcrumb, color-picker and command-palette strings; a lint rule bans literals in `[attr.aria-label]`. |
| 13 | Unify the token vocabulary | STY | F-6 | L | No `var(--kj-*)` in `packages/` resolves to an undeclared token; a build check enforces it. |
| 14 | Secondary entry points + size budget | BUN | F-3, F-1, F-4, F-8 | L | Each feature is importable from its own entry point; a `size-limit` budget fails on regression; `provideLucideIcons()` cannot eagerly pull 1,700 icons. |
| 15 | Virtualization and selection-model scaling | PERF | F-4, F-5, F-6 | L | A 10,000-row table and a 5,000-option list scroll at 60fps in a recorded trace; the virtualizer measures real row heights. |
| 16 | Close the components test hole | ARCH | F-5 | L | Dialog, sheet, toast, tooltip, popover, dropdown-menu, tree-select and menubar each have a real wrapper spec; the three `it.todo` stubs are implemented. |

### Wave 3 — polish

Everything remaining — low-severity defects, doc-truth fixes, and local mediums that are safe to batch. Two batches are worth calling out because they are cheap and high-trust:

- **Doc-truth sweep (T6)** — A11Y F-2, OVL F-14, CUS F-1, F-10, F-11, MFE F-9, ARCH F-14, plus `rules/architecture.md`'s phantom `KjOverlayService`. All S. Acceptance: no `@doc-*` block makes a behavioural claim without a passing spec.
- **Overlay dead code** — the `[data-kj-drawer-container]` scrim, `.kj-dialog-overlay`, `.kj-backdrop--blur`, `inertBased()`, `kjFocusTrap`, and the disabled CSS-anchor branch. All S. Acceptance: each is either wired with a spec or deleted.

The remaining 60-odd items are enumerated in [BACKLOG.md](./BACKLOG.md).

---

## Verification notes

**18 findings were adversarially verified** — every finding originally filed as **critical** (9), plus the remaining five overlay findings and four styles findings that were filed as **high**. Each was re-checked against the source by a reviewer actively trying to refute it.

| Outcome | Count | Findings |
|---|---|---|
| **Refuted** | 2 | CUS F-2 (overlay container / scroll lock "have no DI seam" — the scroll lock *is* token-driven at `tokens.ts:51`, `<html dir>` has an opt-in seam, and DI cannot coordinate two module copies anyway); A11Y F-2 (`aria-modal` without `inert` — the overlays are genuinely modal via backdrop + `tabCycle` + topmost-only Escape + scroll lock, which is the APG pattern; and the proposed `inertBased()` fix would inert only the backdrop). Both are preserved in a **Refuted during verification** section in their report, with a residual low-severity finding re-filed. |
| **Severity corrected** | 11 | OVL F-1 crit→high, F-3 high→med, F-6 high→med · STY F-1 crit→high, F-2 high→med, F-3 high→low, F-4 high→med, F-5 high→med · CUS F-1 crit→low · MFE F-1 crit→med, F-2 crit→low. |
| **Upheld, evidence corrected** | 3 | OVL F-2 (widened to drawer + sheet), OVL F-4 (split into the stacking defect and three dead-CSS items), OVL F-5 (date-picker/select/combobox/cascade/tooltip removed; confirm-popup added). |
| **Upheld as filed** | 2 | A11Y F-1 (critical) and ARCH F-1 (critical — and *widened*: `release.yml` gates on a green CI, so ~20 npm releases including `core@1.0.0` shipped untested). |

**Both remaining criticals were verified.** **34 high findings were NOT verified** and remain unconfirmed:

- **02-styles:** F-6, F-7
- **03-customization:** F-3, F-4, F-5, F-6
- **04-accessibility:** F-3, F-4, F-5, F-6, F-7, F-8
- **05-micro-frontends:** F-3, F-4, F-5, F-6, F-7
- **06-ssr:** F-1, F-2, F-3 *(whole dimension unverified)*
- **07-lazy-loading-bundle:** F-1, F-2, F-3 *(whole dimension unverified)*
- **08-performance:** F-1, F-2, F-3, F-4, F-5, F-6 *(whole dimension unverified)*
- **09-architecture:** F-2, F-3, F-4, F-5, F-6

No medium or low finding was verified. Given that 11 of 18 verified findings were over-severed and 2 were outright refuted, **treat unverified severities as upper bounds**, and verify a Wave-1 item before spending more than a day on it.

Three further caveats the reviewers flagged about their own evidence: `node_modules` was not installed in this worktree, so every bundle-size number in 07 is a source measurement or a repo TSDoc claim rather than a build measurement; no runtime profiling was performed for 08, so its ranking is reasoned from code; and `reports/a11y/` carries only one theme in its `_summary.json` with Lighthouse performance figures (0 on bauhaus, 41 on mint) that may reflect a cold dev server.

---

## How to use these reports

Start here, not in an individual report: the **cross-cutting themes** are where the leverage is, and several of them are one fix that closes a dozen findings across five dimensions. Each numbered report is self-contained — verdict, "what works", findings with file:line evidence, a fix and an effort estimate per finding, recommended work items, and open questions the reviewer could not resolve from the source. The **open questions are the most important part to answer first**: several fixes (the encapsulation ADR, whether MFE is a supported target, whether Analog is a real target, whether the calendar's `role="application"` is deliberate) change shape entirely depending on a decision only the team can make, and answering them will re-rate findings in both directions. Work the backlog from [BACKLOG.md](./BACKLOG.md), and when a finding turns out to be wrong, correct it in its report rather than deleting it — that is the convention the verification pass established.
