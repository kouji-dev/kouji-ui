# kouji-ui Review Backlog

Generated 2026-09-15 from `reports/review/` after adversarial verification. One line per surviving work item; refuted findings are excluded (see `03-customization.md` and `04-accessibility.md`, section *Refuted during verification*).

Format: `[SEVERITY][DIMENSION][effort] title — finding ids — files`. Dimensions: `OVL` overlay, `STY` styles/theming, `CUS` customization, `A11Y` accessibility, `MFE` micro-frontends, `SSR` server rendering, `BUN` lazy-loading/bundle, `PERF` performance, `ARCH` architecture/code quality.


## Wave 1 — blockers (13 items)

The two remaining criticals, everything that blocks SSR/prerender or a working install from the published tarballs, and the WCAG-A keyboard failures on flagship components.

- [ ] `[CRIT][ARCH][M]` Re-enable tests in CI before the next publish (release.yml gates on a green CI that runs none) — ARCH F-1 — `.github/workflows/ci.yml, .github/workflows/release.yml, .husky/pre-push`
- [ ] `[CRIT][A11Y][M]` Restore keyboard operation of select and cascade-select listboxes — A11Y F-1 — `packages/core/src/select/select-content.ts, packages/core/src/cascade-select/cascade-select-panel.ts, packages/components/src/select/select.ts`
- [ ] `[HIGH][OVL][S]` Dispose KjOverlayController on host destroy (add ngOnDestroy) — OVL F-1 — `packages/core/src/primitives/overlay/controller.ts, packages/core/src/primitives/overlay/wrapper.ts`
- [ ] `[HIGH][SSR][S]` KjLink injects its external-link a11y suffix twice (server + hydration) — SSR F-3 — `packages/core/src/link/link.ts`
- [ ] `[HIGH][SSR][S]` Three unguarded global `document` dereferences inside server-reachable effects — SSR F-2 — `packages/core/src/primitives/list/navigator.ts, packages/core/src/tree-select/tree-select-content.ts, packages/core/src/chart/chart.ts`
- [ ] `[HIGH][A11Y][S]` Tooltips never open on keyboard focus and are not referenced by aria-describedby — A11Y F-3 — `packages/core/src/tooltip/tooltip-trigger.ts, packages/core/src/primitives/overlay/strategies/trigger-event/on-hover.ts`
- [ ] `[HIGH][A11Y][S]` Data-grid keyboard navigation can never be entered (no tab stop) — A11Y F-4 — `packages/core/src/table/table-cell.ts, packages/core/src/table/table-keyboard.ts`
- [ ] `[HIGH][OVL][M]` Plumb closeOnEsc / closeOnOutside from builder config into stack.register; route the real close reason — OVL F-2, OVL F-3 — `packages/core/src/primitives/overlay/builder.ts, packages/core/src/primitives/overlay/controller.ts, packages/core/src/dialog/dialog.service.ts`
- [ ] `[HIGH][OVL][M]` Focus restoration for dropdown-menu, tree-select, confirm-popup, menubar submenu — OVL F-5 — `packages/core/src/dropdown-menu/dropdown-menu-content.ts, packages/core/src/confirm-popup/confirm-popup-content.ts, packages/core/src/tree-select/tree-select-content.ts`
- [ ] `[HIGH][STY][M]` Ship overlay primitive CSS + the documented aggregator in both tarballs — STY F-1, BUN F-5, SSR F-7 — `packages/components/ng-package.json, packages/core/ng-package.json, packages/components/src/overlay/overlay.css`
- [ ] `[HIGH][A11Y][M]` Column resizing is drag-only with no keyboard path — A11Y F-5 — `packages/components/src/table/table.ts`
- [ ] `[HIGH][SSR][M]` apps/docs/src/server.ts is dead code — wire it back up or delete it — SSR F-1 — `angular.json, apps/docs/src/server.ts, vercel.json`
- [ ] `[MED][SSR][L]` Give both packages a "." export and working entry fields (unresolvable under Vite/Node/Analog) — SSR F-6, BUN F-10, ARCH F-16 — `packages/core/package.json, packages/components/package.json, tsconfig.json`


## Wave 2 — structural (51 items)

Architecture, customization, styling-contract and bundle restructures. Most of these need a decision recorded before the code changes.

- [ ] `[HIGH][STY][S]` No theme declares color-scheme, and there is no theme at all without data-theme — STY F-7 — `packages/themes/src/base.css, packages/themes/src/themes/dark.css`
- [ ] `[HIGH][ARCH][S]` afterOpened$ is published API on three overlay refs and never emits — ARCH F-2 — `packages/core/src/dialog/dialog.ref.ts, packages/core/src/drawer/drawer.ref.ts, packages/core/src/sheet/sheet.ref.ts`
- [ ] `[HIGH][ARCH][S]` 26 boolean inputs in components lack booleanAttribute — bare-attribute usage silently does nothing — ARCH F-4 — `packages/components/src/button/button.ts, packages/components/src/card/card.ts, packages/components/src/checkbox/checkbox.ts`
- [ ] `[HIGH][ARCH][S]` KjTabList fights its own composed primitive with an event-swallowing hack — ARCH F-6 — `packages/core/src/tabs/tabs.ts, packages/core/src/a11y/roving-tabindex.ts`
- [ ] `[HIGH][BUN][S]` Example components leak into the published public API through two barrels — BUN F-2, ARCH F-16 — `packages/components/src/icon/index.ts, packages/components/src/input-mask/index.ts`
- [ ] `[HIGH][CUS][S]` 10 unlayered component stylesheets + the @layer order statement lives in a package components does not depend on — CUS F-4, STY F-2, STY F-3 — `packages/components/src/calendar/calendar.css, packages/core/src/icon/icon.css, packages/themes/src/base.css`
- [ ] `[HIGH][A11Y][S]` tabCycle focus trap leaks: hidden elements count, out-of-panel focus never recaptured — A11Y F-8, OVL F-8 — `packages/core/src/primitives/overlay/strategies/focus-trap/tab-cycle.ts`
- [ ] `[HIGH][PERF][S]` Chat message runs DomSanitizer.sanitize on every change-detection cycle — PERF F-1 — `packages/components/src/chat/chat-message.ts, packages/components/src/chat/chat-thread.ts`
- [ ] `[HIGH][PERF][S]` Table persistence writes localStorage synchronously on every row click — PERF F-3 — `packages/components/src/table/table.ts, packages/core/src/table/table-storage.ts`
- [ ] `[HIGH][MFE][M]` One 'kill the module globals' pass: container, live-region registry, both scroll-lock refcounts — MFE F-3, MFE F-7, MFE F-10, OVL F-13, CUS F-2 — `packages/core/src/primitives/overlay/container.ts, packages/core/src/primitives/overlay/strategies/scroll-lock/html-overflow.ts, packages/core/src/primitives/overlay/strategies/live-announcer/_announce.ts`
- [ ] `[MED][MFE][M]` Seed id minting from APP_ID; route the ~41 module counters through KjId — MFE F-1 — `packages/core/src/primitives/overlay/id.ts, packages/core/src/field/field.ts, packages/core/src/primitives/list/item.ts`
- [ ] `[HIGH][MFE][M]` @kouji-ui/themes writes :root tokens globally — last-loaded copy re-themes every app — MFE F-5 — `packages/themes/src/base.css, packages/themes/src/density.css`
- [ ] `[HIGH][MFE][M]` 99 module-scope InjectionTokens — a shell's provide* never reaches a remote on a different copy — MFE F-6 — `packages/core/src/icon/icon.tokens.ts, packages/core/src/locale/locale.config.ts, packages/core/src/chart/echarts.ts`
- [ ] `[HIGH][CUS][M]` Per-instance CSS override is silently defeated by every non-default variant — CUS F-3 — `packages/components/src/button/button.css, packages/components/src/button/button.ts`
- [ ] `[HIGH][CUS][M]` The i18n catalog and the config-token label fields duplicate the same strings; the catalog loses — CUS F-6, A11Y F-13 — `packages/core/src/i18n/catalogs/en.ts, packages/core/src/pagination/config.ts, packages/core/src/breadcrumb/config.ts`
- [ ] `[HIGH][A11Y][M]` KjRovingTabindex loses the tab stop on item removal and cannot be seeded to the selected item — A11Y F-6 — `packages/core/src/a11y/roving-tabindex.ts, packages/core/src/tabs/tabs.ts`
- [ ] `[HIGH][A11Y][M]` Calendar uses role=application, inverts the grid structure, natively disables day cells — A11Y F-7 — `packages/core/src/calendar/calendar.ts, packages/core/src/calendar/calendar-day.ts, packages/core/src/calendar/calendar-grid.ts`
- [ ] `[HIGH][OVL][M]` Strip per-component z-index; let the overlay container's sibling order decide stacking — OVL F-4, MFE F-8 — `packages/core/src/primitives/overlay/overlay.css, packages/components/src/select/select.css, packages/components/src/drawer/drawer.css`
- [ ] `[HIGH][PERF][M]` Every open anchored overlay forces two synchronous layouts per scroll event — PERF F-2, OVL F-7 — `packages/core/src/primitives/overlay/strategies/position/anchored-to.ts`
- [ ] `[HIGH][PERF][M]` Selection model does linear key scans and per-item subtree recursion — PERF F-4 — `packages/core/src/primitives/list/selection.ts, packages/core/src/primitives/list/item.ts`
- [ ] `[HIGH][PERF][M]` Table virtualization never measures a row — fixed estimate only — PERF F-5 — `packages/components/src/table/table-virtual.ts, packages/components/src/table/table.ts`
- [ ] `[HIGH][BUN][M]` The entire Lucide icon set is namespace-imported and eagerly wired in the docs root config — BUN F-1 — `packages/components/src/icon/lucide/provide-lucide-icons.ts, apps/docs/src/app/app.config.ts`
- [ ] `[HIGH][ARCH][M]` 101 public inputs in @kouji-ui/components have no kj prefix — ARCH F-3 — `packages/components/src/badge/badge.ts, packages/components/src/card/card.ts, packages/components/src/input/input.ts`
- [ ] `[MED][ARCH][M]` ESLint enforces none of the seven rules files — root cause of every drift finding — ARCH F-15 — `eslint.config.js`
- [ ] `[MED][SSR][M]` inject(DOCUMENT) vs global `document` is inconsistent and unenforced by lint — SSR F-4 — `eslint.config.js, rules/code_style.md`
- [ ] `[MED][STY][M]` --kj-border-default fails WCAG 1.4.11 (3:1) in 13 of 15 themes — STY F-4 — `packages/themes/src/themes/*.css, packages/components/src/input/input.css, packages/components/src/checkbox/checkbox.css`
- [ ] `[MED][STY][M]` orrery-light: fg-subtle + six class-C intents below AA on its own #dedede body — STY F-5 — `packages/themes/src/themes/orrery-light.css, apps/docs/src/app/services/theme.service.ts`
- [ ] `[MED][OVL][M]` Overlay toasts swallow the first Escape / outside click meant for the dialog beneath — OVL F-3 — `packages/core/src/toast/toast.service.ts, packages/core/src/primitives/overlay/stack.ts`
- [ ] `[MED][OVL][M]` Re-opening during the close transition leaks the stack entry and its document listeners — OVL F-6, OVL F-18 — `packages/core/src/primitives/overlay/controller.ts, packages/core/src/primitives/overlay/stack.ts`
- [ ] `[MED][MFE][S]` No z-index stratification seam — 20 hard-coded literals and one global token — MFE F-8 — `packages/core/src/primitives/overlay/overlay.css, packages/components/src/dialog/dialog.css`
- [ ] `[MED][MFE][S]` Stale required @angular/cdk peer dep; hard ^22.0.0 Angular pin with no mixed-major story — MFE F-12, CUS F-14, ARCH F-8 — `packages/core/package.json, packages/components/package.json, rules/stack.md`
- [ ] `[MED][BUN][S]` Hardcoded `await import('echarts')` fallback forces the full ~1 MB chunk — BUN F-6 — `packages/core/src/chart/chart.ts, packages/core/src/chart/echarts.ts`
- [ ] `[LOW][BUN][S]` 412 example files and 68 playgrounds compiled into every library build — BUN F-8 — `packages/core/tsconfig.lib.json, packages/components/tsconfig.lib.json`
- [ ] `[MED][CUS][S]` No provideKj* function or config token is re-exported from @kouji-ui/components — CUS F-9 — `packages/components/src/public-api.ts, packages/components/src/button/index.ts`
- [ ] `[MED][A11Y][S]` KjFocusTrap primitive sets no initial focus and restores none (and has zero consumers) — A11Y F-9 — `packages/core/src/a11y/focus-trap.ts`
- [ ] `[MED][A11Y][S]` Focus indicator removed with no accessible replacement — A11Y F-11 — `packages/components/src/command-palette/command-palette.css, packages/components/src/time-picker/time-picker.css`
- [ ] `[MED][A11Y][M]` prefers-reduced-motion is ignored by most component CSS — A11Y F-10 — `packages/components/src/toast/toast.css, packages/components/src/button/button.css`
- [ ] `[MED][A11Y][M]` RTL is honoured only by slider and avatar-group — A11Y F-12, OVL F-7 — `packages/core/src/primitives/list/navigator.ts, packages/core/src/primitives/directionality/directionality.ts`
- [ ] `[MED][PERF][S]` Filterable-list effect writes three signals per item on every keystroke — PERF F-7 — `packages/core/src/primitives/list/filterable-list.ts, packages/core/src/primitives/list/item.ts`
- [ ] `[MED][PERF][S]` Table re-scans cell templates and allocates a fresh outlet context per cell, per cycle — PERF F-8 — `packages/components/src/table/table.ts`
- [ ] `[MED][PERF][S]` Zoneless is implicit and never exercised by the tests — PERF F-15 — `packages/core/src/test-setup.ts, packages/components/src/test-setup.ts, apps/docs/src/test-setup.ts`
- [ ] `[MED][ARCH][S]` Manifest / public-API drift: stale version constant, wildcard import path, phantom peers — ARCH F-16, ARCH F-8 — `packages/components/src/public-api.ts, tsconfig.json, packages/core/package.json`
- [ ] `[MED][ARCH][S]` ViewEncapsulation.None used 183 times against an explicit 'do not use' rule — write the ADR — ARCH F-10, ARCH F-9, CUS F-12, MFE F-4 — `rules/code_style.md, packages/components/src/button/button.ts, packages/core/src/styles.css`
- [ ] `[HIGH][MFE][L]` Decide the encapsulation strategy (version-scope the global selectors, or move to Emulated) — MFE F-4, ARCH F-10, CUS F-12 — `packages/components/src/button/button.ts, packages/themes/src/density.css, rules/code_style.md`
- [ ] `[HIGH][STY][L]` A second, undefined token vocabulary leaves seven component families un-themed — STY F-6 — `packages/core/src/typography/prose.css, packages/components/src/sheet/sheet.css, packages/components/src/editor/editor.css`
- [ ] `[MED][STY][L]` Density scales two components; 36 stylesheets hard-code 99 font sizes it cannot reach — STY F-10 — `packages/themes/src/density.css, packages/components/src/table/table.css`
- [ ] `[HIGH][CUS][L]` Four competing variant/size mechanisms; ~10 components closed to extension — CUS F-5, CUS F-8, CUS F-11, CUS F-13 — `packages/core/src/badge/badge.ts, packages/components/src/input/input.ts, packages/core/src/button/config.ts`
- [ ] `[HIGH][BUN][L]` No secondary entry points: one flat barrel, one FESM, no size budget or CI gate — BUN F-3, BUN F-4 — `packages/core/ng-package.json, packages/components/ng-package.json, angular.json`
- [ ] `[MED][BUN][M]` marked and @tanstack/virtual-core are hard dependencies every consumer installs — BUN F-4, MFE F-14 — `packages/components/package.json, packages/components/src/chat/markdown.ts, packages/core/package.json`
- [ ] `[HIGH][PERF][L]` Virtualization exists only in the table; option lists, chat, trees render everything — PERF F-6 — `packages/core/src/primitives/list/item.ts, packages/components/src/chat/chat-thread.ts`
- [ ] `[HIGH][ARCH][L]` 19 component features have zero real tests, including every overlay wrapper — ARCH F-5 — `packages/components/src/popover/popover.spec.ts, packages/components/src/dialog, packages/components/src/toast`


## Wave 3 — polish (65 items)

Everything remaining: low-severity defects, doc-truth fixes, and mediums that are local and safe to batch.

- [ ] `[MED][OVL][S]` inertBased focus trap inerts the wrong siblings — no-op for portalled overlays; fix or delete — OVL F-9 — `packages/core/src/primitives/overlay/strategies/focus-trap/inert-based.ts`
- [ ] `[MED][OVL][S]` Transition duration measured pre-transition, and only the first duration in a list is read — OVL F-10 — `packages/core/src/primitives/overlay/controller.ts, packages/core/src/primitives/overlay/panel.ts`
- [ ] `[MED][OVL][S]` kjMount on <kj-dropdown-menu-content> is read in the constructor and is always 'portal' — OVL F-11 — `packages/core/src/dropdown-menu/dropdown-menu-content.ts, packages/core/src/dropdown-menu/dropdown-menu-trigger.ts`
- [ ] `[MED][OVL][M]` Declarative overlays cannot render a backdrop, so solidBackdrop on them is inert config — OVL F-12 — `packages/core/src/primitives/overlay/builder.ts, packages/core/src/command-palette/command-palette-dialog.ts`
- [ ] `[MED][OVL][S]` Consumers hand-write ARIA onto the panel, fighting the panel's own host bindings — OVL F-14 — `packages/core/src/confirm-popup/confirm-popup-content.ts, packages/core/src/menubar/menubar-item.ts`
- [ ] `[LOW][OVL][M]` Speed-dial bypasses the overlay system entirely — no outside-click dismissal — OVL F-15 — `packages/core/src/speed-dial/speed-dial.ts, packages/core/src/speed-dial/speed-dial-trigger.ts`
- [ ] `[LOW][OVL][M]` Scroll lock is desktop-only: overflow:hidden does not lock iOS Safari; cssClip compensates nothing — OVL F-16 — `packages/core/src/primitives/overlay/strategies/scroll-lock/html-overflow.ts, packages/core/src/primitives/overlay/strategies/scroll-lock/css-clip.ts`
- [ ] `[LOW][OVL][S]` aria-expanded is stamped on every trigger, including tooltip triggers — OVL F-17, A11Y F-3 — `packages/core/src/primitives/overlay/trigger.ts, packages/core/src/tooltip/tooltip-trigger.ts`
- [ ] `[MED][STY][S]` --kj-color-icon-* resolves at :root, so nested [data-theme] subtrees get wrong icon colours — STY F-8 — `packages/themes/src/base.css, packages/core/src/icon/icon.directive.ts`
- [ ] `[MED][STY][M]` SSR + FOUC: theme hard-coded in index.html, real theme applied only after hydration — STY F-9 — `apps/docs/src/index.html, apps/docs/src/app/services/theme.service.ts, apps/docs/src/server.ts`
- [ ] `[MED][STY][S]` docs-themes.css writes contract token names into :root from a later layer — STY F-11 — `packages/core/src/styles/docs-themes.css, packages/themes/src/themes.spec.ts`
- [ ] `[MED][STY][S]` [data-tone] / [data-truncate] are bare global attribute selectors in a published package — STY F-12 — `packages/core/src/typography/prose.css`
- [ ] `[MED][STY][M]` ~28 KB of overlay CSS is shipped twice (global bundle + styleUrl injection) — STY F-13 — `packages/components/src/overlay/overlay.css, packages/components/src/dialog/dialog.ts, angular.json`
- [ ] `[LOW][STY][S]` color-picker hard-codes achromatic chrome that breaks in dark themes — STY F-14 — `packages/components/src/color-picker/color-picker.css`
- [ ] `[LOW][STY][M]` The theme generator emits two dead tokens and omits six the contract requires — STY F-15 — `apps/docs/src/app/lib/theme/serialize-theme.ts, packages/themes/src/themes.spec.ts`
- [ ] `[LOW][CUS][S]` provideKjLocale TSDoc promises route-level sub-tree scoping it cannot deliver — CUS F-1 — `packages/core/src/locale/locale.config.ts, packages/core/src/i18n/translate.config.ts`
- [ ] `[LOW][CUS][S]` Service-launched overlays bypass KJ_OVERLAY_MOUNT_STRATEGY when choosing the root container — CUS F-2 — `packages/core/src/primitives/overlay/builder.ts, packages/core/src/primitives/overlay/container.ts`
- [ ] `[MED][CUS][M]` provideKj* naming, token descriptions and the kj input prefix are all inconsistent — CUS F-7 — `packages/components/src/tabs/tabs.ts, packages/core/src/icon/icon.providers.ts`
- [ ] `[MED][CUS][S]` bindPresets lives in core for 10 components and in components for tabs; core KjTabs is not preset-aware — CUS F-8 — `packages/components/src/tabs/tabs.ts, packages/core/src/tabs/tabs.ts`
- [ ] `[MED][CUS][S]` provideKjChat's doc promises a merge over built-in defaults that does not exist — CUS F-10 — `packages/core/src/chat/chat-registry.ts, packages/components/src/chat/chat-thread.ts`
- [ ] `[MED][CUS][S]` provideKj* merge semantics differ across the 11 config tokens; pagination's doc contradicts its code — CUS F-11 — `packages/core/src/breadcrumb/config.ts, packages/core/src/pagination/config.ts`
- [ ] `[LOW][CUS][S]` Motion has no configuration surface at all, unlike every other preset axis — CUS F-13 — `packages/core/src/motion/motion.ts, packages/core/src/motion/index.ts`
- [ ] `[LOW][A11Y][S]` Five TSDoc blocks claim modal content is marked inert; nothing ever sets the attribute — A11Y F-2 — `packages/components/src/dialog/dialog.ts, packages/components/src/drawer/drawer.ts, packages/components/src/sheet/sheet.ts`
- [ ] `[MED][A11Y][S]` Overlays dismiss on pointerdown rather than the up-event — A11Y F-14 — `packages/core/src/primitives/overlay/stack.ts`
- [ ] `[MED][A11Y][M]` Default control size is below the AAA touch target and the docs claim otherwise — A11Y F-15 — `packages/components/src/button/button.css, packages/components/src/button/button.ts`
- [ ] `[MED][A11Y][S]` An open accordion panel is clipped at max-height 1000px — A11Y F-16 — `packages/components/src/accordion/accordion.css`
- [ ] `[MED][A11Y][M]` No status announcements for filtering, sorting or pagination — A11Y F-17 — `packages/core/src/primitives/list/filterable-list.ts, packages/core/src/table/table.ts, packages/components/src/pagination/pagination.ts`
- [ ] `[LOW][A11Y][S]` KjTypeAhead does not implement the APG same-letter cycle — A11Y F-18 — `packages/core/src/primitives/list/type-ahead.ts`
- [ ] `[LOW][A11Y][S]` Tab panels have no tab stop; sortable headers have no interactive role — A11Y F-19 — `packages/core/src/tabs/tabs.ts, packages/core/src/table/table-header.ts`
- [ ] `[LOW][A11Y][S]` Toast auto-dismiss is 4s with no adjustable or disableable timing — A11Y F-20 — `packages/core/src/toast/toast.strategy.ts, packages/core/src/toast/toast.service.ts`
- [ ] `[LOW][A11Y][S]` KjListNavigator hijacks Home/End/PageUp/PageDown inside text fields — A11Y F-21 — `packages/core/src/primitives/list/navigator.ts`
- [ ] `[LOW][A11Y][S]` field-error combines role="alert" with aria-live="polite" — A11Y F-22 — `packages/core/src/field/field-error.ts`
- [ ] `[LOW][MFE][M]` Escape and hotkey routing is per-root-injector, so two apps close/open independently — MFE F-2 — `packages/core/src/primitives/overlay/stack.ts, packages/core/src/primitives/overlay/strategies/trigger-event/on-hotkey.ts`
- [ ] `[MED][MFE][M]` provideKjDocumentDirection claims to be 'the single writer of <html dir>' — MFE F-9 — `packages/core/src/locale/document-direction.ts, packages/core/src/primitives/directionality/directionality.ts`
- [ ] `[MED][MFE][S]` Command palette focuses by global document.querySelector — MFE F-11 — `packages/components/src/command-palette/command-palette.ts`
- [ ] `[MED][MFE][S]` Table state persists to localStorage with an empty default key prefix — MFE F-13 — `packages/core/src/table/table-storage.ts, packages/components/src/table/table.ts`
- [ ] `[LOW][MFE][M]` Duplicated payload: non-peer bundled deps and a module-cached 300 KB icon map — MFE F-14, BUN F-4 — `packages/components/src/icon/lucide/provide-lucide-icons.ts, packages/core/package.json`
- [ ] `[LOW][MFE][M]` Document listeners and observers scale per-instance (zone-agnostic otherwise) — MFE F-15, PERF F-16 — `packages/core/src/primitives/interaction/focus-ring.ts, packages/core/src/a11y/focus-trap.ts`
- [ ] `[MED][SSR][M]` Prerendering bakes the build date into every calendar — SSR F-5 — `packages/core/src/calendar/calendar.ts, packages/core/src/date-range-presets/date-range-presets.ts`
- [ ] `[MED][SSR][M]` Incremental hydration explicitly disabled with no stated reason — SSR F-8 — `apps/docs/src/app/app.config.ts, apps/docs/src/app/app.ts`
- [ ] `[MED][SSR][M]` The prerender proves far less about the library than it appears to (~7 of ~120 components) — SSR F-9 — `apps/docs/src/app/components/code-preview/code-preview.ts, packages/core/src/example-components.ts`
- [ ] `[MED][SSR][S]` Every prerendered page ships its content visibility:hidden behind a splash screen — SSR F-10 — `apps/docs/src/app/services/loading.service.ts, apps/docs/src/app/app.ts`
- [ ] `[LOW][SSR][S]` Node/Express version assumptions in server.ts are undeclared and partly contradictory — SSR F-11 — `apps/docs/src/server.ts, package.json`
- [ ] `[LOW][SSR][S]` crypto.randomUUID() used bare in KjToastService, against the repo's own guarded helper — SSR F-12 — `packages/core/src/toast/toast.service.ts, packages/core/src/accordion/accordion.ts`
- [ ] `[LOW][SSR][S]` KjFileUploadTrigger mutates the DOM in its constructor; non-null-asserted field undefined on the server — SSR F-13 — `packages/core/src/file-upload/file-upload.ts`
- [ ] `[MED][BUN][M]` Zero @defer in the library and only one in the docs app — BUN F-7 — `packages/core/src, apps/docs/src/app/app.ts`
- [ ] `[LOW][BUN][S]` Dead heavy dependencies and a missing workspace dependency in the docs app — BUN F-9 — `package.json, apps/docs/package.json`
- [ ] `[MED][PERF][S]` KjTableRow.isSelectable allocates the full selection key array per row — PERF F-9 — `packages/core/src/table/table-row.ts`
- [ ] `[MED][PERF][S]` cascade-select sub-panel leaks window listeners and repositions unthrottled — PERF F-10 — `packages/core/src/cascade-select/cascade-select-sub-panel.ts`
- [ ] `[MED][PERF][S]` Auto-resize textarea forces a style recalc plus two layouts per keystroke — PERF F-11 — `packages/core/src/textarea/textarea.ts, packages/components/src/chat/prompt-input.ts`
- [ ] `[MED][PERF][S]` A new Intl.DateTimeFormat is constructed per calendar day cell — PERF F-12 — `packages/core/src/calendar/calendar-day.ts, packages/core/src/calendar/date-utils.ts`
- [ ] `[MED][PERF][M]` Layout-property transitions and zero style containment — PERF F-13 — `packages/components/src/accordion/accordion.css, packages/components/src/table/table.css`
- [ ] `[MED][PERF][S]` One MutationObserver per kj-tag, with subtree and characterData — PERF F-14 — `packages/core/src/tag/tag.ts`
- [ ] `[LOW][PERF][S]` Per-instance document listeners on kj-tree-select-content — PERF F-16 — `packages/core/src/tree-select/tree-select-content.ts`
- [ ] `[LOW][PERF][S]` Chat thread allocates a renderer input object per cycle, re-registers a render hook per token — PERF F-17 — `packages/components/src/chat/chat-thread.ts`
- [ ] `[LOW][PERF][S]` Carousel observes only the initial slide set and leaves a timer running past destroy — PERF F-18 — `packages/core/src/carousel/carousel.ts`
- [ ] `[LOW][PERF][M]` Shipped example components are not OnPush — PERF F-19 — `packages/components/src/example-components.ts, packages/core/src/example-components.ts`
- [ ] `[MED][ARCH][M]` Two naming eras coexist; the CLAUDE.md suffix rule is followed in core, inverted in components — ARCH F-7 — `packages/components/src/card/card.ts, packages/core/src/icon/icon.directive.ts`
- [ ] `[MED][ARCH][M]` core is not headless: 17 hard-coded class names, 2 inline styles, 5 stylesheets, 12 element components — ARCH F-9 — `packages/core/src/overlay-badge/overlay-badge.ts, packages/core/src/styles.css`
- [ ] `[MED][ARCH][M]` Five bespoke ControlValueAccessors bypass KjFormControl — ARCH F-11 — `packages/core/src/primitives/forms/form-control.ts, packages/components/src/input/input.ts`
- [ ] `[MED][ARCH][L]` Concrete duplication: two identical overlay refs, five copy-pasted cell editors, two nav primitives — ARCH F-12, A11Y F-6 — `packages/core/src/drawer/drawer.ref.ts, packages/components/src/table/table-editors/text-editor.ts, packages/core/src/a11y/roving-tabindex.ts`
- [ ] `[MED][ARCH][M]` Dev-mode diagnostics exist in only 12 of ~74 core features, with four message prefixes — ARCH F-13 — `packages/core/src/progress-bar/progress-bar.ts, packages/core/src/alert/alert.ts`
- [ ] `[MED][ARCH][M]` TSDoc: 30% of component inputs undocumented; themed-example system used by 2 symbols — ARCH F-14 — `rules/tsdoc.md, packages/components/src/button/button.ts, packages/core/src/radio/radio.context.ts`
- [ ] `[LOW][ARCH][M]` kj-menubar is published but functionally incomplete per its own TODO, with zero wrapper tests — ARCH F-17 — `packages/components/src/menubar/menubar.ts, packages/core/src/stepper/stepper.ts`
- [ ] `[LOW][ARCH][S]` Shared table-filter DI contract lives inside one sibling's file instead of a *.context.ts — ARCH F-18 — `packages/components/src/table/table-filters/text-filter.ts`


---

**Totals:** 129 items — Wave 1 13, Wave 2 51, Wave 3 65.
