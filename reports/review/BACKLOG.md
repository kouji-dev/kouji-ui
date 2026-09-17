# kouji-ui System Review — Backlog

Round 2 · 2026-09-15 · HEAD rebased on `origin/main`. Flat, issue-ready checklist of all **184 surviving findings** from [README.md](README.md). Refuted findings are excluded (micro-frontends F-5's original "`@layer` cascade is global and unversioned" framing; its accurate low-severity re-file is included). Findings fixed by `main` are excluded — they live only in the README's *Fixed since the last review* table.

Format: `- [ ] [SEV][dim][effort] title — finding ids — files`

Dimensions: `overlay` 01 · `styles` 02 · `cust` 03 · `a11y` 04 · `mfe` 05 · `ssr` 06 · `lazy` 07 · `perf` 08 · `arch` 09.

---

## Wave 1 — blockers (12)

All critical and high findings, plus the one medium that must land first because the other fixes cannot be verified without it.

- [x] [CRIT][a11y][L] Select, tree-select and cascade-select cannot be navigated by keyboard once open: the list navigator listens on a panel that never receives focus — a11y F-1 — `packages/core/src/select/select-content.ts:30-38`, `packages/components/src/select/select.ts:80-86`, `packages/core/src/primitives/list/navigator.ts:41-44` (+6)
- [x] [HIGH][arch][S] CI runs no tests; 47 of 50 releases shipped under a lint-and-build-only gate — arch F-1 — `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `.husky/pre-push`
- [x] [HIGH][styles][S] Two focus rings resolve to nothing — `outline` goes invalid-at-computed-value-time — styles F-1 — `packages/components/src/sheet/sheet.css:71-75`, `packages/components/src/action-sheet/action-sheet.css:45-49`, `packages/components/src/overlay/overlay.css:44-45`
- [x] [HIGH][arch][S] `afterOpened$` is public API on three overlay refs and never emits — arch F-17 — `packages/core/src/dialog/dialog.ref.ts:10,12`, `packages/core/src/drawer/drawer.ref.ts:20,23`, `packages/core/src/sheet/sheet.ref.ts:21,24`
- [x] [HIGH][a11y][S] `tabCycle` trap leaks: hidden elements count, an empty panel lets Tab escape, outside focus is never recaptured — a11y F-20 — `packages/core/src/primitives/overlay/strategies/focus-trap/tab-cycle.ts:4,30,44`
- [x] [HIGH][overlay][M] Overlay controller never invokes `focusTrap.onOpen` / `onClose` — Tab escapes every modal and focus is never returned — overlay F-1 — `packages/core/src/primitives/overlay/controller.ts`, `.../strategies/focus-trap/tab-cycle.ts`, `.../strategies/focus-trap/inert-based.ts` (+1)
- [x] [HIGH][overlay][M] No focus restoration for dropdown-menu, tree-select, confirm-popup (and menubar's projected submenu) — overlay F-14 — `packages/core/src/dropdown-menu/dropdown-menu-content.ts`, `packages/core/src/confirm-popup/confirm-popup-content.ts`, `packages/core/src/tree-select/tree-select-content.ts` (+1)
- [x] [HIGH][a11y][M] The data grid implements no roving tabindex, so its body has no tab stop — a11y F-3 — `packages/components/src/table/table.ts:332,391,455` (+5)
- [x] [HIGH][a11y][M] Tooltips never open on keyboard focus and are never linked with `aria-describedby` — a11y F-4 — `packages/core/src/tooltip/tooltip-trigger.ts:19-25,31`, `packages/core/src/primitives/overlay/strategies/trigger-event/on-hover.ts:116-117` (+4)
- [x] [HIGH][a11y][M] `KjRovingTabindex` loses the tab stop on removal and cannot be seeded to the selected item — a11y F-19 — `packages/core/src/a11y/roving-tabindex.ts:94,102-104,117-121`, consumers `tabs.ts` (+4)
- [x] [HIGH][a11y][M] Column resizing is drag-only, with no keyboard path — a11y F-21 — `packages/components/src/table/table.ts:277-285`
- [x] [MED][a11y][M] Keyboard specs dispatch events on elements a user can never focus, so they pass while the feature is broken — a11y F-14 — `packages/core/src/select/select.spec.ts:126-136`, `packages/core/src/tree-select/tree-select.spec.ts:403-413`, `.../focus-trap/tab-cycle.spec.ts:123-128` — **land before the other Wave 1 items**

---

## Wave 2 — structural (107)

All remaining medium-severity findings.

### Overlay (15)

- [x] [MED][overlay][S] `data-side` is never written, so every popover / tooltip arrow is unpositioned — overlay F-5 — `packages/core/src/primitives/overlay/panel.ts`, `.../strategies/position/anchored-to.ts`, `packages/components/src/popover/popover.css` (+1)
- [x] [MED][overlay][S] The panel is measured while `[hidden]` is still applied on first open — overlay F-8 — `packages/core/src/primitives/overlay/controller.ts`, `packages/core/src/primitives/overlay/panel.ts`
- [x] [MED][overlay][S] `anchoredTo` has no RTL awareness — overlay F-9 — `packages/core/src/primitives/overlay/strategies/position/anchored-to.ts`
- [x] [MED][overlay][S] Two z-index escapes from the stack: a hard-coded sub-panel level and wrapper-clamped toasts — overlay F-10 — `packages/components/src/cascade-select/cascade-select.css`, `packages/components/src/toast/toast.css`, `packages/core/src/primitives/overlay/stack.ts`
- [x] [MED][overlay][S] Transition duration is measured from the pre-transition state, and only the first duration in a list — overlay F-16 — `packages/core/src/primitives/overlay/controller.ts:165-184`, `packages/core/src/primitives/overlay/panel.ts:44`
- [x] [MED][overlay][S] `kjMount` on `<kj-dropdown-menu-content>` is read in the constructor and is therefore always `'portal'` — overlay F-17 — `packages/core/src/dropdown-menu/dropdown-menu-content.ts:226-240`, `packages/core/src/dropdown-menu/dropdown-menu-trigger.ts:83-85`
- [x] [MED][overlay][S] Consumers hand-write ARIA onto the panel, fighting the panel's own host bindings — overlay F-19 — `packages/core/src/confirm-popup/confirm-popup-content.ts:96-98,104-106`, `packages/core/src/menubar/menubar-item.ts:177`
- [x] [MED][overlay][M] `closeOnEsc` / `closeOnOutside` are declared on the builder and service APIs but never reach `KjOverlayStack` — overlay F-2 — `packages/core/src/primitives/overlay/controller.ts`, `.../builder.ts`, `.../wrapper.ts` (+4)
- [x] [MED][overlay][M] Declarative overlays never dispose their controller on host destroy, leaving an orphan stack entry — overlay F-3 — `packages/core/src/primitives/overlay/controller.ts`, `.../wrapper.ts`, `packages/core/src/menubar/menubar-item.ts` (+3)
- [x] [MED][overlay][M] Overlay-based toasts register as ordinary dismissible stack entries; the builder's close flags are never forwarded — overlay F-4 — `packages/core/src/toast/toast.service.ts`, `packages/core/src/primitives/overlay/controller.ts`, `.../stack.ts` (+2)
- [x] [MED][overlay][M] Unthrottled, non-passive scroll repositioning with a forced synchronous layout per event — overlay F-7 — `packages/core/src/primitives/overlay/strategies/position/anchored-to.ts`
- [x] [MED][overlay][M] Re-opening during the close transition leaks the overlay's stack entry and its document listeners — overlay F-15 — `packages/core/src/primitives/overlay/controller.ts:91-96,123-164,186-200`
- [x] [MED][overlay][M] Declarative overlays cannot render a backdrop, so `solidBackdrop` on them is inert configuration — overlay F-18 — `packages/core/src/primitives/overlay/builder.ts:137`, `packages/core/src/command-palette/command-palette-dialog.ts:54-57`
- [x] [MED][overlay][M] `tabCycle`'s focusable query is incomplete and unfiltered, and there are no focus sentinels — overlay F-20 — `packages/core/src/primitives/overlay/strategies/focus-trap/tab-cycle.ts:4,49`
- [x] [MED][overlay][L] The styled `<kj-command-palette>` bypasses the overlay primitive and is not an accessible modal — overlay F-6 — `packages/components/src/command-palette/command-palette.ts`

### Styles & theming (15)

- [x] [MED][styles][S] `retro`: focus ring at 2.27:1 and destructive-button text at 3.18:1 — styles F-3 — `packages/themes/src/themes/retro.css:25,44,58,72`
- [x] [MED][styles][S] No theme declares `color-scheme` — dark themes get light native UI — styles F-4 — `packages/themes/src/themes/*.css` (15 files), `packages/themes/src/base.css`
- [x] [MED][styles][S] `--kj-bg-overlay` is a dead token; every scrim and hover tint is hardcoded — styles F-6 — `packages/components/src/dialog/dialog.css:5`, `drawer/drawer.css:55`, `command-palette/command-palette.css:16` (+3)
- [x] [MED][styles][S] `base.css`'s `@layer` statement omits three layers that `prose.css` actually uses — styles F-8 — `packages/themes/src/base.css:7`, `packages/core/src/typography/prose.css:31,257,291`, `packages/themes/src/density.spec.ts:32-38`
- [x] [MED][styles][S] `.kj-card[data-shadow="lift"]` is a no-op in all 15 themes — styles F-9 — `packages/components/src/card/card.css:14,21,40-46`, `packages/themes/src/base.css:9-25`
- [x] [MED][styles][S] `--kj-space-2xs` doesn't exist — `.kj-menubar` renders with no padding and no gap — styles F-10 — `packages/components/src/menubar/menubar.css:7-8,13,19`
- [x] [MED][styles][M] `orrery-light`: `fg-subtle` and the class-C intent tokens miss AA on `bg-body` / `bg-surface` / `bg-field` — styles F-2 — `packages/themes/src/themes/orrery-light.css:30,56-78`, `packages/components/src/link/link.css:12`, `packages/core/src/typography/prose.css:104`
- [x] [MED][styles][M] With no `[data-theme]` the library renders unstyled — no `:root` fallback, no `prefers-color-scheme` default — styles F-5 — `packages/themes/src/base.css:29-184`, every `packages/themes/src/themes/*.css`
- [x] [MED][styles][M] Ten globally-injected stylesheets sit outside `@layer` and outrank everything — styles F-7 — `packages/components/src/table/table.css`, `table/table-filters/filters.css`, `calendar/calendar.css` (+7)
- [x] [MED][styles][M] `prose.css` reads a token namespace no theme defines — typography permanently on hardcoded fallbacks — styles F-12 — `packages/core/src/typography/prose.css:17-28,31-39,268-273`
- [x] [MED][styles][M] Unprefixed global attribute selectors (`[data-tone]`, `[data-truncate]`) ship in the published CSS — styles F-13 — `packages/core/src/typography/prose.css:258,264,268,277,292,302-308`, `packages/themes/src/density.css:120,125,130-131`
- [x] [MED][styles][M] `core/src/styles.css` is documented as the entry point but is neither shipped nor shippable; `@kouji-ui/components` has no `exports` map — styles F-14 — `packages/core/src/styles.css:1-21`, `packages/core/ng-package.json:7-27`, `packages/core/package.json:55-70` (+2)
- [x] [MED][styles][M] `--kj-border-default` fails WCAG 1.4.11 (3:1) in 13 of 15 themes — the sole boundary of every idle input and unchecked checkbox — styles F-20 — 13 of 15 in `packages/themes/src/themes/`, `packages/components/src/input/input.css:11`, `packages/components/src/checkbox/checkbox.css:24`
- [x] [MED][styles][M] ~28 KB of overlay CSS is shipped twice — styles F-21 — `packages/components/src/overlay/overlay.css:37-45`, `angular.json` (docs styles array), the nine wrapper `styleUrl` sites
- [x] [MED][styles][L] Density scales spacing and type but not control heights — 3 of 69 stylesheets participate — styles F-11 — `packages/themes/src/density.css:98-110`, 66 of 69 stylesheets under `packages/components/src`

### Customization (13)

- [x] [MED][cust][S] `KjSpinnerConfig.animations` is never read, and the closed `kjAnimation` type blocks the extension its TSDoc recommends — cust F-3 — `packages/core/src/spinner/config.ts`, `packages/core/src/spinner/spinner.ts`, `packages/components/src/spinner/spinner.ts` (+1)
- [x] [MED][cust][S] `provideKj*` takes `Partial<Config>` one level deep, and two providers disagree on merge depth — cust F-4 — `packages/core/src/pagination/config.ts`, `packages/core/src/breadcrumb/config.ts`, `packages/core/src/button/config.ts` (+1)
- [x] [MED][cust][S] `KjAlert` hand-rolls the preset system, and its config TSDoc claims it uses `bindPresets` when it does not — cust F-6 — `packages/core/src/alert/config.ts`, `packages/core/src/alert/alert.ts`
- [x] [MED][cust][S] `--kj-overlay-z-base` on `:root` overrides the DI token, so a host page can silently retarget every remote's overlay stack — cust F-9 — `packages/core/src/primitives/overlay/stack.ts`
- [x] [MED][cust][S] Documentation examples on `_examples` barrels leak into the published package API (and drag the 1,600-name Lucide list) — cust F-10 — `packages/components/src/icon/index.ts`, `packages/components/src/input-mask/index.ts`, `packages/components/src/icon/_examples/index.ts`
- [x] [MED][cust][S] The preset system's own extension points are marked `@internal` but exported — cust F-11 — `packages/core/src/presets/bind-presets.ts`, `packages/core/src/presets/variant.ts`, `packages/core/src/presets/size.ts` (+3)
- [x] [MED][cust][S] `bindPresets` lives in core for 11 directives but in components for tabs; `KjIconDirective` breaks the naming rule — cust F-18 — `packages/components/src/tabs/tabs.ts:15,120`, `packages/core/src/icon/icon.directive.ts:75`
- [x] [MED][cust][S] `provideKj*` config functions are not re-exported from `@kouji-ui/components` — cust F-19 — `packages/components/src/public-api.ts`
- [ ] [MED][cust][M] The documented "layer a single class on the host" escape hatch is inert for ~90 of ~130 styled components — cust F-5 — `rules/code_style.md`, `packages/components/src/button/button.ts`, `packages/components/src/button/button.css` (+1)
- [x] [MED][cust][M] `provideIcons()` is silently dead below the root injector while `provideLucideIcons()` writes to a page-global registry — cust F-8 — `packages/core/src/icon/icon.tokens.ts`, `packages/core/src/icon/icon.providers.ts`, `packages/components/src/icon/lucide/provide-lucide-icons.ts`
- [ ] [MED][cust][M] Per-instance CSS override is silently defeated by every non-default variant on the `display:contents` components — cust F-16 — `packages/components/src/button/button.css:10-31,80-94`, `packages/components/src/button/button.ts:135-136`, `packages/components/src/button/button.css.spec.ts:47-50`
- [ ] [MED][cust][L] Variant/size extensibility splits across two undocumented mechanisms; ~19 closed unions extensible only via CSS custom properties — cust F-2 — `packages/core/src/badge/badge.ts`, `packages/components/src/card/card.ts`, `packages/components/src/checkbox/checkbox.ts` (+6)
- [x] [MED][cust][L] The i18n catalog is not the source of truth it claims; component labels are a second competing surface and many are not overridable — cust F-7 — `packages/core/src/i18n/catalogs/en.ts`, `packages/core/src/pagination/config.ts`, `packages/core/src/breadcrumb/config.ts` (+3)

### Accessibility (11)

- [x] [MED][a11y][S] `KjInputOtp` completion is dead code (`!val.includes('')` is always false) with a latent `KjLiveRegion` DOM-wipe behind it — a11y F-2 — `packages/core/src/input-otp/input-otp.ts:52-56,259,262` (+4)
- [x] [MED][a11y][S] Roving focus-follow steals focus on mount (menubar, and any inline roving list) — a11y F-5 — `packages/core/src/menubar/menubar.ts:299-306,311-320`, `packages/core/src/primitives/list/navigator.ts:98-107`
- [x] [MED][a11y][S] The date-picker popup traps Tab while declaring `aria-modal="false"` — a11y F-11 — `packages/core/src/date-picker/date-picker-calendar.ts:39-51`, `.../focus-trap/tab-cycle.ts:173-181`
- [x] [MED][a11y][S] `KjRovingTabindex` moves focus onto disabled items — a11y F-12 — `packages/core/src/a11y/roving-tabindex.ts:148-183`; consumers `tabs.ts:250`, `stepper.ts:376` (+2)
- [x] [MED][a11y][S] An open accordion panel is clipped at 1000px — a11y F-22 — `packages/components/src/accordion/accordion.css:46,60`
- [x] [MED][a11y][M] A calendar with no selected value gives the grid no tab stop when today is out of range — a11y F-6 — `packages/core/src/calendar/calendar.ts:131-132,135-138,166-167` (+4)
- [x] [MED][a11y][M] Service-launched dialogs, drawers and sheets have no accessible name, and the documented way to give one does not exist — a11y F-7 — `packages/components/src/dialog/dialog.ts:22-38`, `packages/core/src/dialog/dialog.ts:15-26`, `packages/core/src/primitives/overlay/builder.ts:129-150` (+1)
- [x] [MED][a11y][M] `solidBackdrop({ inert: true })` never applies `inert`, yet the panel asserts `aria-modal="true"` — a11y F-8 — `packages/core/src/primitives/overlay/strategies/backdrop/solid.ts:13-23`, `packages/core/src/primitives/overlay/panel.ts:43,78` (+1)
- [x] [MED][a11y][M] `kj-field` does not put `aria-invalid`, `aria-required` or `aria-describedby` on the control, although `@doc-aria` says it does — a11y F-9 — `packages/components/src/field/field.ts:55-57,65-70`, `packages/core/src/field/field.ts:39-50` (+2)
- [x] [MED][a11y][M] Calendar day buttons declare `role="gridcell"` inside a `<td>` that is already a gridcell, under a `role="application"` root — a11y F-10 — `packages/core/src/calendar/calendar-day.ts:36-38`, `packages/components/src/calendar/calendar.ts:128-134`, `packages/core/src/calendar/calendar.ts:69-75`
- [x] [MED][a11y][M] Sortable table headers are focusable `<th>` elements with no control role or name — a11y F-13 — `packages/core/src/table/table-header.ts:21-29`

### Micro-frontends (9)

- [x] [MED][mfe][S] Thirteen stylesheets ship with no `@layer`, so they beat every layered rule on the page — mfe F-6 — `packages/components/src/table/table.css:1`, `calendar/calendar.css:1`, `command-palette/command-palette.css:1` (+7)
- [x] [MED][mfe][S] Unscoped `document` hotkey listeners: two MFEs both answer one `⌘K` — mfe F-8 — `packages/core/src/primitives/overlay/strategies/trigger-event/on-hotkey.ts:40-47`, `packages/components/src/command-palette/command-palette.ts:289-300`
- [x] [MED][mfe][S] Command palette focuses by global `document.querySelector` on an unscoped class — mfe F-9 — `packages/components/src/command-palette/command-palette.ts:303-309`
- [x] [MED][mfe][M] No app-scoped namespace for generated ids — collides when two Angular roots share a document — mfe F-1 — `packages/core/src/primitives/overlay/id.ts:10-16`, `packages/core/src/primitives/overlay/panel.ts:65`, `packages/core/src/primitives/overlay/trigger.ts:47` (+10)
- [x] [MED][mfe][M] Scroll-lock refcount is module-scoped, so duplicated bundles can strand `<html>` overflow — mfe F-2 — `.../scroll-lock/html-overflow.ts:3-5,13-19`, `.../scroll-lock/css-clip.ts:3-4` (+3)
- [x] [MED][mfe][M] 100 module-scope `InjectionToken`s: two copies mean every `provideKj*` silently misses — mfe F-7 — `packages/core/src/icon/icon.tokens.ts:12,26,57,71`, `packages/core/src/toast/toast.strategy.ts:70`, `packages/core/src/primitives/overlay/stack.ts:37` (+5)
- [x] [MED][mfe][M] `lucide-static` is a required, statically-imported peer — ~300 KB duplicated per copy — mfe F-12 — `packages/components/src/icon/lucide/provide-lucide-icons.ts:8,47-59`, `packages/components/package.json:35`
- [x] [MED][mfe][M] Monaco's global AMD loader is memoised per copy — mfe F-13 — `packages/core/src/editor/editor.loader.ts:24-37,59-69`
- [x] [MED][mfe][M] Service-launched overlays escape their app's theme, density and direction scope — mfe F-16 — `packages/core/src/primitives/overlay/builder.ts:111-118`, contrast `.../strategies/mount/body-portal.ts:13-21,57-61`

### SSR (10)

- [x] [MED][ssr][S] `KjLink` injects its screen-reader suffix from an `effect()`, so SSR + hydration emits it twice — ssr F-1 — `packages/core/src/link/link.ts:22-23,201-224`, `packages/core/src/link/link.spec.ts:147-171` (+3)
- [x] [MED][ssr][S] Docs site prerenders every page behind a splash that only browser JS removes — ssr F-2 — `apps/docs/src/app/services/loading.service.ts:9`, `apps/docs/src/app/app.ts:28,44-46` (+5)
- [x] [MED][ssr][S] `KjChart` calls global `document.createElement` inside an `effect()` — ssr F-3 — `packages/core/src/chart/chart.ts`
- [x] [MED][ssr][S] Two of the four copies of the roving focus-follow effect touch `document` unguarded — ssr F-4 — `packages/core/src/primitives/list/navigator.ts`, `packages/core/src/tree-select/tree-select-content.ts`
- [x] [MED][ssr][S] `@kouji-ui/components` publishes its stylesheets under a path its own exports map blocks — ssr F-6 — `packages/components/package.json`, `packages/components/ng-package.json`, `packages/core/package.json` (+1)
- [x] [MED][ssr][S] `packages/core/src/styles.css` — the documented aggregate entry point — is never published — ssr F-7 — `packages/core/src/styles.css`, `packages/core/ng-package.json`, `packages/core/package.json` (+1)
- [x] [MED][ssr][M] `apps/docs/src/server.ts` is dead code — nothing server-renders at runtime, and `/api/*` is served nowhere — ssr F-5 — `angular.json`, `apps/docs/src/server.ts`, `apps/docs/src/serve-static.mjs` (+1)
- [x] [MED][ssr][M] There is no Vite / Analog installation path documented or tested — ssr F-8 — `apps/docs/src/app/pages/getting-started/getting-started.ts`, `packages/themes/package.json`, `package.json`
- [x] [MED][ssr][M] `inject(DOCUMENT)` vs the global `document` is inconsistent and unenforced — ssr F-15 — `eslint.config.js`, `packages/core/src/link/link.ts:204`, `rules/code_style.md`
- [x] [MED][ssr][M] The prerender proves far less about the library than it appears to — ssr F-16 — `apps/docs/src/app/components/code-preview/code-preview.ts:138-165`, `packages/core/src/example-components.ts`, `packages/components/src/example-components.ts` (+1)

### Lazy loading & bundle (8)

- [x] [MED][lazy][S] `@kouji-ui/components` ships CSS assets with no `exports` entry — the documented stylesheet is not resolvable as a package specifier — lazy F-4 — `packages/components/package.json` (no `exports` key), `packages/components/ng-package.json:10-16`, `packages/core/package.json:52-69` (+1)
- [x] [MED][lazy][S] `marked.use()` runs at module scope in a package declaring `sideEffects: false`, mutating the shared global `marked` singleton — lazy F-6 — `packages/components/src/chat/markdown.ts:1,35,47`, `packages/components/src/chat/index.ts:19`, `packages/components/package.json:49`
- [x] [MED][lazy][S] `_examples` components leak into the published barrels in two places — lazy F-7 — `packages/components/src/icon/index.ts:2-5`, `packages/components/src/input-mask/index.ts:2-9`
- [x] [MED][lazy][M] Docs component-doc route chunk eagerly bundles all 69 playgrounds — lazy F-1 — `apps/docs/src/app/pages/component-doc/component-doc.ts:24`, `.../playground-files/index.ts:2-7,16-23`, `.../playground-files/bucket-f.ts:5,12,13` (+2)
- [x] [MED][lazy][M] `provideLucideIcons()` has no subset overload, so the convenient Lucide API is not tree-shakable — lazy F-2 — `packages/components/src/icon/lucide/provide-lucide-icons.ts:8,52-53,98-105`, `packages/components/src/icon/lucide/index.ts`, `packages/core/src/icon/index.ts:15-19` (+2)
- [x] [MED][lazy][M] The styled `<kj-chart>` ignores `provideECharts` and always pulls the full ECharts build — lazy F-3 — `packages/components/src/chart/chart.ts:144-145`, `packages/core/src/chart/chart.ts:131-135`, `packages/core/src/chart/echarts.ts:45,73`
- [x] [MED][lazy][M] `overlay.css` re-ships nine stylesheets that are already inlined into their components — lazy F-5 — `packages/components/src/overlay/overlay.css:37-45`, and the nine `styleUrl` sites it duplicates
- [ ] [MED][lazy][M] `marked` and the TanStack packages are hard dependencies every consumer installs — lazy F-11 — `packages/components/package.json` (dependencies), `packages/components/src/chat/markdown.ts:1`, `packages/components/src/table/table-virtual.ts:11-17` (+2)

### Performance (14)

- [x] [MED][perf][S] `KjChart` re-applies the full ECharts option on every application change-detection cycle — perf F-1 — `packages/core/src/chart/chart.ts:208-210,285,289,191,215-228`, `packages/core/src/chart/chart-tokens.ts:9,18`
- [x] [MED][perf][S] `KjFocusRing` installs two document-level capture listeners per instance — perf F-5 — `packages/core/src/primitives/interaction/focus-ring.ts:36-58`
- [x] [MED][perf][S] Auto-derived tree shape does a full linear key scan on every topology query — perf F-7 — `packages/core/src/primitives/list/selection.ts:104-146,240-259`
- [x] [MED][perf][S] Table persists full state to storage on every state change, including per-row selection — perf F-8 — `packages/components/src/table/table.ts:865-873`, `packages/core/src/table/table.ts:18-32`
- [x] [MED][perf][S] Chat re-sanitises every markdown block on every change-detection pass — perf F-10 — `packages/components/src/chat/chat-message.ts:91,155,160-169`
- [x] [MED][perf][S] Cascade sub-panel leaks its window listeners when destroyed while open, and repositions unthrottled — perf F-12 — `packages/core/src/cascade-select/cascade-select-sub-panel.ts:104-131`
- [x] [MED][perf][S] `<kj-table>` calls per-cell methods from the template on every render — perf F-13 — `packages/components/src/table/table.ts:344-352,396-404,452-460` (+1)
- [x] [MED][perf][S] Zoneless is implicit and no test exercises it — perf F-23 — `apps/docs/src/app/app.config.ts`, `package.json:94`, every `*.spec.ts`
- [x] [MED][perf][M] Rich-text does four full-document tree walks per update, two of them avoidable — perf F-2 — `packages/core/src/rich-text/engine.ts:237-246,257-260,262-289`, `packages/core/src/rich-text/rich-text-editor.ts:113,257-264,374-385`, `packages/components/src/rich-text/rich-text-editor.ts:137-139`
- [x] [MED][perf][M] Selection membership is O(selected) per item, so a multi-select toggle is O(n·m) — perf F-6 — `packages/core/src/primitives/list/selection.ts:222-229,296-304`, `packages/core/src/primitives/list/item.ts:180-186`
- [x] [MED][perf][M] Table virtualization uses a fixed row estimate with no measurement, and expansion rows are not accounted for — perf F-9 — `packages/components/src/table/table-virtual.ts:96-108,120-140`, `packages/components/src/table/table.ts:356-437`
- [x] [MED][perf][M] Streaming re-lexes the entire message on every token — perf F-11 — `packages/components/src/chat/chat-message.ts:155`, `packages/components/src/chat/markdown.ts:69-100`, `packages/core/src/chat/chat-stream.ts`
- [x] [MED][perf][M] `<kj-tree-select>` renders the entire tree and calls `isRowHidden()` per row per render — perf F-14 — `packages/components/src/tree-select/tree-select.ts:245-258,298-315`, `packages/core/src/tree-select/tree-select-root.ts:207-212`
- [x] [MED][perf][L] No virtualization for list-style components (combobox / command palette) — perf F-4 — `packages/core/src/primitives/list/filterable-list.ts:50-56,107-124`, `packages/core/src/primitives/list/item.ts:35-46`, `packages/core/src/combobox/combobox-root.ts:77,126` (+2)

### Architecture & code quality (12)

- [x] [MED][arch][S] `@angular/cdk` is a required peer dependency of both published packages and nothing imports it — arch F-3 — `packages/core/package.json`, `packages/components/package.json`, `rules/stack.md`
- [x] [MED][arch][S] `kjOffset` transform swallows `0` at six overlay anchor points — arch F-4 — `packages/core/src/{popover/popover-content,tooltip/tooltip-content,select/select-content,combobox/combobox-listbox,tree-select/tree-select-content,date-picker/date-picker-calendar}.ts`
- [x] [MED][arch][S] `ViewEncapsulation.None` is banned by the rules and used 188 times — undocumented deliberate decision, not drift — arch F-5 — `rules/code_style.md:72-77`, 81 files in `packages/components/src`, 11 in `packages/core/src` (+1)
- [x] [MED][arch][S] `KjTabList` swallows its own composed primitive's events instead of configuring it — arch F-18 — `packages/core/src/tabs/tabs.ts:~178-228` (comment at `:220`), `packages/core/src/a11y/roving-tabindex.ts`
- [x] [MED][arch][M] ~95 boolean inputs omit `booleanAttribute`, so the bare-attribute form the library teaches silently no-ops — arch F-2 — `packages/core/src/tag/tag.ts:41,59,82,95,114,125-131,134-137,140-145,175,200`, `packages/components/src/tag/tag.ts:43`, `packages/core/src/a11y/disabled.ts:24,31` (+2)
- [x] [MED][arch][M] `@kouji-ui/core` is not headless: 592 lines of themed CSS and 16 `@Component`s, and its own aggregator never ships — arch F-6 — `rules/architecture.md:4`, `packages/core/src/styles.css`, `packages/core/src/typography/prose.css` (+2)
- [x] [MED][arch][M] 102 unprefixed public bindings in `@kouji-ui/components`, 7 classes mixing both conventions — arch F-7 — 25 files under `packages/components/src`, `rules/code_style.md:14-15`
- [x] [MED][arch][M] Components package test shape: 15 features with zero specs, 3 of the 69 spec files are pure `it.todo` — arch F-8 — `packages/components/src/**`
- [x] [MED][arch][M] Only one of seven rules files is machine-enforced; no stylelint over 93 stylesheets — arch F-9 — `eslint.config.js`, `packages/themes/package.json`, `rules/*`
- [x] [MED][arch][M] Five bespoke `ControlValueAccessor`s bypass `KjFormControl` — arch F-19 — `packages/core/src/primitives/forms/form-control.ts`, `packages/core/src/rich-text/rich-text-editor.ts`, `packages/components/src/{color-picker/color-picker,input/input,input-otp/input-otp,textarea/textarea}.ts`
- [x] [MED][arch][M] Concrete duplication beyond `KjDisabled`: overlay refs and table cell editors — arch F-20 — `packages/core/src/{drawer,sheet,dialog}/*.ref.ts`, `packages/components/src/table/table-editors/{text,number,date,select,boolean}-editor.ts`
- [x] [MED][arch][M] `kj-menubar` is published while functionally incomplete, and the styled wrapper has no spec — arch F-21 — `packages/components/src/menubar/menubar.ts:126`, `packages/components/src/menubar/` (no `*.spec.ts`), `packages/components/src/menubar/menubar.usage.example.ts:9`

---

## Wave 3 — polish (65)

All remaining low-severity findings.

### Overlay (6)

- [x] [LOW][overlay][S] `KjCloseReason` is public API that carries no information — overlay F-11 — `packages/core/src/primitives/overlay/controller.ts`, `packages/core/src/primitives/overlay/stack.ts`
- [x] [LOW][overlay][S] Dead scroll-lock CSS referencing a removed service — overlay F-13 — `packages/components/src/popover/popover.css`
- [x] [LOW][overlay][S] A click on the trigger during the close animation is swallowed — overlay F-22 — `packages/core/src/primitives/overlay/controller.ts:106-109`
- [x] [LOW][overlay][S] Three more pieces of dead overlay CSS — overlay F-23 — `packages/components/src/dialog/dialog.css:2-10`, `packages/components/src/drawer/drawer.css:51-61`, `packages/core/src/primitives/overlay/strategies/backdrop/blurred.ts:4`
- [ ] [LOW][overlay][M] Multiple Angular apps on one page share the container but not the id counter or the z-stack — overlay F-12 — `packages/core/src/primitives/overlay/container.ts`, `.../id.ts`, `.../stack.ts`
- [x] [LOW][overlay][M] Speed-dial bypasses the overlay system entirely — overlay F-21 — `packages/core/src/speed-dial/speed-dial.ts:65`, `packages/core/src/speed-dial/speed-dial-trigger.ts:36,49`

### Styles & theming (7)

- [x] [LOW][styles][S] Docs ship a hardcoded theme in the static HTML — guaranteed flash; two themes unreachable — styles F-15 — `apps/docs/src/index.html:2`, `apps/docs/src/app/services/theme.service.ts:7-16,49-67`
- [x] [LOW][styles][S] `--kj-color-icon-*` are frozen to the root theme, so `[kjIconColor]` ignores nested themes — styles F-16 — `packages/themes/src/base.css:29,166-177`, `packages/core/src/icon/icon.directive.ts:107`
- [x] [LOW][styles][S] `core/src/styles/docs-themes.css` is a rival token namespace living inside the library source — styles F-17 — `packages/core/src/styles/docs-themes.css:6-33`, 20+ `packages/core/src/*/_examples/*.ts`
- [x] [LOW][styles][S] `reports/a11y/_summary.json` cannot substantiate the theme contrast claims — styles F-19 — `reports/a11y/_summary.json`, `reports/a11y/<theme>/*.json`
- [x] [LOW][styles][S] `color-picker` hard-codes achromatic chrome that breaks in dark themes — styles F-22 — `packages/components/src/color-picker/color-picker.css:73-74,122-123,131-132`
- [x] [LOW][styles][M] Roughly fifteen invented token names in component CSS that resolve to nothing — styles F-18 — `packages/components/src/action-sheet/action-sheet.css:33,42,77`, `direction-toggle/`, `date-range-presets/` (+4)
- [x] [LOW][styles][M] The theme generator emits two dead tokens and omits six required ones — styles F-23 — `apps/docs/src/app/lib/theme/serialize-theme.ts:44-45,47-104`, `packages/themes/src/themes.spec.ts:15-20`

### Customization (8)

- [x] [LOW][cust][S] `provideKjLocale`'s docstring promises route-level scoping that the root-scoped `KjLocale` cannot honour — cust F-1 — `packages/core/src/locale/locale.ts`, `packages/core/src/locale/locale.config.ts`, `packages/core/src/i18n/translate.service.ts` (+2)
- [x] [LOW][cust][S] Documentation-truth defects in `provide*` / config TSDoc — cust F-13 — `packages/components/src/button/button.ts`, `packages/core/src/tag/config.ts`, `packages/core/src/badge/badge.ts` (+1)
- [x] [LOW][cust][S] Wrapper components re-declare host-directive inputs "for the docs extractor", publishing contradicting `.d.ts` defaults — cust F-14 — `packages/components/src/alert/alert.ts`, `packages/components/src/spinner/spinner.ts`, `packages/components/src/tabs/tabs.ts`
- [x] [LOW][cust][S] Service-launched overlays bypass the mount strategy when choosing their root container — cust F-17 — `packages/core/src/primitives/overlay/builder.ts:118`, `packages/core/src/primitives/overlay/container.ts`, `packages/core/src/primitives/overlay/tokens.ts:17`
- [x] [LOW][cust][S] Motion has no configuration surface at all — cust F-20 — `packages/core/src/motion/motion.ts`, `packages/core/src/motion/index.ts`
- [x] [LOW][cust][S] `@angular/cdk` is a peer dependency of both packages despite the no-CDK policy — cust F-21 — `packages/core/package.json:32`, `packages/components/package.json:28`, `rules/stack.md`
- [x] [LOW][cust][M] Input naming is inconsistent across (and within) components: `variant` vs `kjVariant` — cust F-12 — `packages/components/src/input/input.ts`, `packages/components/src/badge/badge.ts`, `packages/components/src/card/card.ts` (+4)
- [x] [LOW][cust][M] No per-subtree direction: `KjDirectionality` reads only `<html dir>` / `<body dir>` — cust F-15 — `packages/core/src/primitives/directionality/directionality.ts`, `packages/core/src/locale/document-direction.ts`

### Accessibility (5)

- [x] [LOW][a11y][S] Roving menus still publish `aria-activedescendant`, and a code comment claims a mechanism Angular does not provide — a11y F-15 — `packages/core/src/primitives/list/navigator.ts:41-44`, `packages/core/src/dropdown-menu/dropdown-menu-content.ts:144-153`, `packages/core/src/menubar/menubar.ts:44-47`
- [x] [LOW][a11y][S] Tab panels are never focusable — a11y F-16 — `packages/core/src/tabs/tabs.ts:332-338`
- [x] [LOW][a11y][S] The toast viewport is a `role="region"` live region wrapping `role="status"` live regions — a11y F-18 — `packages/core/src/toast/toast.ts:174-181,77-79`
- [x] [LOW][a11y][S] `KjFocusTrap` — the documented public primitive — is dead code that sets no initial focus and restores none — a11y F-23 — `packages/core/src/a11y/focus-trap.ts:26-45`, `packages/core/src/a11y/index.ts:3`
- [x] [LOW][a11y][M] AAA gaps: a sub-7:1 text token, sub-44px default controls, and 24 animated stylesheets with no `prefers-reduced-motion` block — a11y F-17 — `packages/themes/src/themes/light.css:30,59`, `mint.css:29,56`, `nord.css:25,50` (+4)

### Micro-frontends (8)

- [x] [LOW][mfe][S] `KjOverlayStack` does not coordinate across multiple Angular root injectors — mfe F-3 — `packages/core/src/primitives/overlay/stack.ts:81-107,183-188,202-207` (+1)
- [x] [LOW][mfe][S] No supported story for two *different versions* of the library in one document (unversioned class names, not layers) — mfe F-5 — `packages/themes/src/base.css:29`, `packages/themes/src/density.css:41`, the 62 `@layer kj.component` stylesheets
- [x] [LOW][mfe][S] `body[data-kj-scroll-lock]` is styled but never written, and its comment names a class that does not exist — mfe F-10 — `packages/components/src/popover/popover.css:57-61`
- [x] [LOW][mfe][S] Live-region singletons are per-copy, and are not discovered from the DOM — mfe F-11 — `packages/core/src/primitives/overlay/strategies/live-announcer/_announce.ts:15-28`
- [x] [LOW][mfe][S] `@angular/cdk` is a required peer of both packages and is never imported — mfe F-14 — `packages/core/package.json:32`, `packages/components/package.json:28`
- [x] [LOW][mfe][S] `<html dir>` and table storage keys have no per-app ownership — mfe F-15 — `packages/core/src/locale/document-direction.ts:41-57`, `packages/core/src/table/table-storage.ts:49-62,69-71`, `packages/components/src/table/table.ts:855-872`
- [x] [LOW][mfe][M] Built-in overlay components pin `bodyPortal()`, so a shadow-DOM MFE cannot host them in its own subtree — mfe F-4 — `packages/core/src/primitives/overlay/container.ts:24-33`, `packages/core/src/primitives/overlay/tokens.ts`, `.../strategies/mount/in-container.ts` (+4)
- [x] [LOW][mfe][M] Document listeners and observers scale per instance — mfe F-17 — `packages/core/src/primitives/interaction/focus-ring.ts:45-46`, `packages/core/src/chart/chart.ts:190-191`, `packages/components/src/editor/editor.ts:134-135`

### SSR (8)

- [x] [LOW][ssr][S] `PrerenderFallback.Server` is declared under `outputMode: "static"` — ssr F-11 — `apps/docs/src/app/app.routes.server.ts`, `angular.json`, `vercel.json`
- [x] [LOW][ssr][S] `KjFileUploadTrigger` mutates the DOM in its constructor and leaves a non-null-asserted field undefined on the server — ssr F-17 — `packages/core/src/file-upload/file-upload.ts:444,446-466`
- [x] [LOW][ssr][S] `crypto.randomUUID()` used bare in `KjToastService`, against the repo's own guarded helper — ssr F-18 — `packages/core/src/toast/toast.service.ts:156,206`, contrast `packages/core/src/accordion/accordion.ts:26-31` (+3)
- [x] [LOW][ssr][M] ~20 module-level id counters (and `crypto.randomUUID`) bypass `KjId`, so server and client ids diverge — ssr F-9 — `packages/core/src/primitives/overlay/id.ts` and ~20 feature files
- [x] [LOW][ssr][M] Calendar seeds "today" and the focused month from the *server's* clock — ssr F-10 — `packages/core/src/calendar/calendar.ts`, `packages/core/src/calendar/calendar-day.ts`
- [x] [LOW][ssr][M] Incremental hydration is explicitly disabled and the library ships zero `@defer` blocks — ssr F-12 — `apps/docs/src/app/app.config.ts`, `packages/core/src`, `packages/components/src`
- [x] [LOW][ssr][M] Virtualized tables render zero rows into the prerendered HTML — ssr F-13 — `packages/components/src/table/table-virtual.ts`
- [x] [LOW][ssr][M] SSR safety rests on `typeof document === 'undefined'`, not on `isPlatformBrowser` — ssr F-14 — `packages/core/src/primitives/overlay/container.ts`, `.../strategies/scroll-lock/html-overflow.ts`, `.../strategies/live-announcer/_announce.ts`

### Lazy loading & bundle (4)

- [x] [LOW][lazy][S] No size budget or bundle-size gate anywhere except the docs app's own build — lazy F-9 — `angular.json:124-135`, `.github/workflows/ci.yml`, `.github/workflows/release.yml`
- [x] [LOW][lazy][S] Declared-but-unused heavy dependencies, and a script pointing at a package that does not exist — lazy F-10 — `package.json:12,47`, `apps/docs/package.json:12`
- [x] [LOW][lazy][S] Examples and playgrounds are compiled into every library build — lazy F-12 — `packages/core/tsconfig.lib.json:11-12`, `packages/components/tsconfig.lib.json:15-16`
- [ ] [LOW][lazy][L] No secondary entry points: one flat barrel per package, with optional-peer type imports flattened into a single `.d.ts` — lazy F-8 — `packages/core/ng-package.json`, `packages/components/ng-package.json`, `packages/core/src/public-api.ts` (+3)

### Performance (11)

- [x] [LOW][perf][S] Anchored-overlay repositioning is not rAF-coalesced — perf F-3 — `.../strategies/position/anchored-to.ts:136,145,177-179,202-237`, `packages/core/src/cascade-select/cascade-select-sub-panel.ts:121-125`
- [x] [LOW][perf][S] Five directives duplicate the root `KjReducedMotion` matchMedia subscription per instance — perf F-15 — `packages/core/src/spinner/spinner.ts:118-126`, `packages/core/src/progress-bar/progress-bar.ts:169-180`, `packages/core/src/chart/chart.ts:141-151` (+2)
- [x] [LOW][perf][S] `KjTag` installs a subtree MutationObserver per tag — perf F-16 — `packages/core/src/tag/tag.ts:153-170`
- [x] [LOW][perf][S] Textarea auto-resize forces two synchronous reflows per keystroke, twice — perf F-17 — `packages/core/src/textarea/textarea.ts:180-195,199-204,210-234`
- [x] [LOW][perf][S] `KjRovingTabindex` re-sorts with `compareDocumentPosition` and reads computed style on every arrow key — perf F-18 — `packages/core/src/a11y/roving-tabindex.ts:84-93,96-104,118-133`
- [x] [LOW][perf][S] Wrapper `<kj-chart>` resizes on every ResizeObserver entry, unlike the core directive — perf F-19 — `packages/components/src/chart/chart.ts:152-153` vs `packages/core/src/chart/chart.ts:170-183`
- [x] [LOW][perf][S] `<kj-chat-thread>` allocates a fresh inputs object per render for custom renderers — perf F-20 — `packages/components/src/chat/chat-thread.ts:84-90,130-137`
- [x] [LOW][perf][S] A new `Intl.DateTimeFormat` is constructed per formatted date — perf F-21 — `packages/core/src/calendar/date-utils.ts:122,134,144-145,149-156,158-165,214`
- [x] [LOW][perf][S] Per-instance document listeners on `kj-tree-select-content` — perf F-24 — `packages/core/src/tree-select/tree-select-content.ts:70-77`
- [x] [LOW][perf][S] Carousel observes only the initial slide set, and the viewport settle timer outlives destroy — perf F-25 — `packages/core/src/carousel/carousel.ts:455-471,492,510-511,464-468`
- [x] [LOW][perf][M] Zero style containment anywhere in the component stylesheets — perf F-22 — `packages/components/src/**/*.css` (0 occurrences of `contain:`)

### Architecture & code quality (8)

- [x] [LOW][arch][S] Scattered pre-signal holdovers: 34 lifecycle hooks, 6 `@Output()`, 4 `@ViewChild`, 3 `@HostListener` — arch F-13 — `packages/core/src/file-upload/file-upload.ts`, `packages/components/src/input/input.ts`, `packages/core/src/drawer/drawer.ts` (+3); `rules/code_style.md:20-29`
- [x] [LOW][arch][S] `KJ_COMPONENTS_VERSION` reports `0.0.1` for a package at `0.9.3` — arch F-15 — `packages/components/src/public-api.ts`, `packages/components/package.json`
- [x] [LOW][arch][S] Shared filter contract lives inside one sibling's file instead of a `*.context.ts` — arch F-22 — `packages/components/src/table/table-filters/text-filter.ts`, imported by `date-filter.ts:11`, `number-filter.ts:13` (+2)
- [x] [LOW][arch][M] TSDoc input/output coverage: 7% missing in core, 29% missing in components — arch F-10 — `rules/tsdoc.md:4,68-69`, `packages/components/src/**`
- [x] [LOW][arch][M] 34 classes carry an Angular type suffix with no collision; `icon.directive.ts` breaks the file rule too — arch F-11 — `CLAUDE.md` "Class Naming Rule", `rules/code_style.md:8-11`, `packages/core/src/icon/` (+1)
- [x] [LOW][arch][M] Misuse diagnostics are inconsistent and mostly untree-shakeable; missing-parent errors come from Angular, not the library — arch F-14 — `packages/core/src/form/form.ts:162`, 25 `isDevMode()` sites, 34 `*.context.ts`
- [x] [LOW][arch][M] `KjDisabled` is composed by 26 directives and hand-rolled by 15 — arch F-16 — `packages/core/src/primitives/interaction/disabled.ts` and its 15 hand-rolled consumers
- [x] [LOW][arch][L] "One directive per file" is violated by ~30 files, several holding 7–9 directives in 400–900 lines — arch F-12 — `rules/architecture.md:25-26`, `packages/core/src/carousel/carousel.ts`, `packages/core/src/color-picker/color-picker.ts` (+3)

---

## Not scheduled

**Refuted — do not file.** micro-frontends F-5 (original) "The `@layer kj.*` cascade is global and unversioned — the second copy silently restyles the first." Mechanism misattributed to layers; rename sub-claim is false CSS; count was 80 vs an actual 62. The accurate residue is scheduled above as `[LOW][mfe][S] mfe F-5`.

**Fixed by `main` — do not file.** prev overlay F-4a / prev MFE F-8 (z-index stacking, `2948c5b5`); prev styles F-1 / prev SSR F-7 / prev lazy F-5 (overlay CSS publication, `fb1d1956`, core half); prev a11y F-14 (backdrop dismiss on the up-event, `e6aa28a5`, backdrop path). Their named residuals are scheduled above.

**Carried over from the 2026-09-06 review.** Four of the seven were re-checked in batch 7:

- a11y prior F-17 (no status announcements for filtering / sorting / pagination) — **reproduced, fixed for sort and filter.** `<kj-table>` renders a visually-hidden `role="status"` region from first render. Pagination is deliberately excluded: `<kj-table-pagination>` already owns an `aria-live` "Showing X–Y of Z" summary, and a second region would announce every page change twice. Residual: the default announcement strings are English (same i18n inversion as batch 4's pagination / breadcrumb work).
- a11y prior F-18 (`KjTypeAhead` same-letter cycle) — **reproduced, fixed.** `a` `a` `a` buffered as `"aaa"` and matched nothing; a repeated character now cycles the items starting with it.
- a11y prior F-21 (`KjListNavigator` hijacks Home/End/PageUp/PageDown in text fields) — **reproduced, fixed.** The caret wins whenever the field holds text; the list keeps the keys only from an empty field (APG combobox).
- a11y prior F-20 (toast auto-dismiss fixed at 4s) — **did NOT reproduce.** `KJ_TOAST_STRATEGY.duration` is app-configurable, every `show()` / `success()` / `error()` takes a per-toast `duration` (`0` = persistent), and the viewport pauses each in-flight timer on hover and on focus-within with ref-counted reasons. `git log -S 'pauseOnHover'` lands on `9acdb072`, before this review; covered at `toast.spec.ts:198-246` and `:287-330`, including the WCAG 2.2.1 case.

Still not re-checked: F-11 (focus indicator removed with no accessible replacement), F-12 (RTL outside slider / avatar-group), F-13 (hard-coded English UI/ARIA strings). Verify before filing.
