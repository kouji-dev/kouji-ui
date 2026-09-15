# SSR / Server Rendering Review

Slug: `06-ssr` · Scope: `apps/docs` SSR wiring, every direct DOM/browser API in `packages/core/src` + `packages/components/src`, hydration, third-party deps, package `exports` under Vite/Analog, Node/Express assumptions.

## Verdict

**Grade: C+**

The *library* is unusually disciplined about SSR: 117 `afterNextRender` call sites, 43 `isPlatformBrowser` checks, `typeof window/document/navigator/matchMedia/ResizeObserver/MutationObserver` guards on virtually every strategy module, and every heavy third-party dep (echarts, monaco, lexical) behind `import type` + a dynamic `import()`. A full scan of 1 367 non-spec source files turned up only **three** genuinely unguarded, server-reachable `document` dereferences — and two of them are copies of code that *was* correctly guarded elsewhere, which is the tell that the guarding is done by hand with no lint rule behind it.

The *app-level SSR story* is the weak half, and it is weaker than it looks. `apps/docs/src/server.ts` — the Express host, its three `/api/*` routes, `AngularNodeAppEngine`, `reqHandler` — **is never built**: `angular.json` sets `"outputMode": "static"` and declares no `ssr.entry`, so the only server code that runs is the prerenderer. What the pipeline therefore proves is "the app prerenders", not "the app server-renders". And what it prerenders is thin: every `_examples/*` component is mounted client-side through `vcr.createComponent` in an effect fed by a dynamic import, and the whole prerendered shell ships with `visibility: hidden` behind a splash screen. Hydration has one real bug shipping today (duplicated external-link a11y suffix).

Analog is **not** a supported target and nothing in the repo moves toward it. The Analog packages present are the Vitest plugin only. Under Vite/Node resolution, `import '@kouji-ui/core'` cannot resolve at all (`exports` has no `"."`, there is no `main`, and `module` points outside the package root), and `@kouji-ui/components` declares no entry fields whatsoever. In-repo this is invisible because everything resolves through tsconfig `paths`.

## What works

- **Guarding discipline in the overlay system.** `packages/core/src/primitives/overlay/container.ts:21-28`, `stack.ts:36-47`, `strategies/scroll-lock/html-overflow.ts:7-8`, `strategies/scroll-lock/css-clip.ts`, `strategies/mount/body-portal.ts:87`, `strategies/mount/in-place.ts:16`, `strategies/trigger-event/on-hotkey.ts:19,41` all bail before touching `document`/`window`. `controller.ts:152` short-circuits the whole transition path with `if (!this.isBrowser) { done(); return; }`.
- **Third-party deps are all correctly deferred.** `echarts` is `import type` only (`packages/core/src/chart/chart.ts:16`) with `await import('echarts')` inside `afterNextRender` (`chart.ts:135`); `monaco-editor` is `typeof import('monaco-editor')` only (`editor.types.ts:8`) with `await import('@monaco-editor/loader')` at `editor.loader.ts:63`; `lexical` reaches runtime only through `await import('./engine')` (`rich-text-editor.ts:224`), and `rich-text/index.ts` documents and enforces that the barrel re-exports only Lexical-free symbols. `codemirror` is a declared docs dep with zero imports in `apps/docs/src`. `marked` is statically imported (`packages/components/src/chat/markdown.ts:1`) but is isomorphic and safe in Node.
- **Storage adapters are model SSR code.** `packages/core/src/table/table-storage.ts:43-46` wraps `typeof localStorage`/`sessionStorage` in `try/catch` and falls back to an in-memory adapter (`:61`).
- **TransferState is used where it matters.** `docs-manifest.server.ts` / `docs-manifest.browser.ts` / `roadmap-data.*.ts` with a shared `makeStateKey` (`docs-manifest.provider.ts:14`), plus a deliberate `provideAppInitializer(() => inject(RoadmapService))` in `app.config.ts:43-45` to seed roadmap data into TransferState on *every* prerendered route, not just `/roadmap`. The reasoning is written down in the file.
- **Locale/direction is genuinely deterministic across the boundary.** `KjLocale` derives everything from `LOCALE_ID` + `Intl` (`packages/core/src/locale/locale.ts:78-109`); `KjDirectionality` and `provideKjDocumentDirection` use `inject(DOCUMENT, { optional: true })` (`primitives/directionality/directionality.ts:37`, `locale/document-direction.ts:45`).
- **`buildMonthMatrix` always emits 6×7 cells** (`packages/core/src/calendar/date-utils.ts:110`), so the calendar's stale-date problem is a content flip, not a structural hydration failure.
- **`@defer (when isBrowser)` is used correctly** for the one browser-only widget in the shell (`apps/docs/src/app/app.ts:31`).

## Findings

### F-1 `apps/docs/src/server.ts` is dead code — the build never produces a server

**Severity:** high · **Confidence:** high
**Files:** `angular.json:100-127`, `apps/docs/src/server.ts:1-69`, `apps/docs/src/app/app.routes.server.ts:9,18`, `apps/docs/src/app/services/roadmap.service.ts:29`, `vercel.json`

```jsonc
// angular.json:108-109 — docs → architect → build → options
"server": "apps/docs/src/main.server.ts",
"outputMode": "static",
```

There is **no `"ssr": { "entry": "apps/docs/src/server.ts" }`** anywhere in `angular.json` (grepped the whole repo: the only `server` key is the one above). With `outputMode: "static"`, `@angular/build:application` runs `main.server.ts` for **prerendering only** and emits `dist/docs/browser` + `index.csr.html`. `server.ts` is never bundled, so:

- `AngularNodeAppEngine`, `createNodeRequestHandler`, `reqHandler` (`server.ts:14,69`) never execute.
- `GET /api/roadmap`, `/api/docs/manifest`, `/api/docs/components/:slug` (`server.ts:16,24,32`) do not exist in any deployed artifact — yet `roadmap.service.ts:29` names `apps/docs/src/server.ts` as the home of its HTTP fallback, and `docs.service.ts:62` documents the same fallback.
- `fallback: PrerenderFallback.Server` on both parameterised routes (`app.routes.server.ts:9,18`) can never fire — there is no server to fall back to. A slug not returned by `getPrerenderParams()` 404s.
- `vercel.json` rewrites `/(.*)` → `/index.csr`, i.e. the production deploy is a prerendered-static + CSR-shell site. `serve-static.mjs` does the same for Render.

**Why it matters:** the repo reads as "SSR docs site" (README, `home.ts:85-86` FAQ answers "is it ssr / hydration safe?"), the `/api` endpoints are documented as the live fallback, and reviewers assume the Express path is exercised. None of it is. Any SSR regression that only manifests in true server rendering (request-scoped state, `REQUEST`/`RESPONSE_INIT` tokens, per-request DI) is untested.

**Fix:** decide and make it explicit. Either (a) add `"ssr": { "entry": "apps/docs/src/server.ts" }` and switch `outputMode` to `"server"` so the Express host and the `Server` fallbacks actually exist, or (b) keep static and delete `server.ts`, drop `PrerenderFallback.Server` for `PrerenderFallback.None`/`ClientOnly`, and rewrite the "dev / non-SSR fallback" comments in `roadmap.service.ts:29` and `docs.service.ts:62` to say "dev server only".
**Effort:** M

---

### F-2 Three unguarded global `document` dereferences inside effects that run on the server

**Severity:** high · **Confidence:** high
**Files:** `packages/core/src/primitives/list/navigator.ts:110`, `packages/core/src/tree-select/tree-select-content.ts:123`, `packages/core/src/chart/chart.ts:242`

`pnpm-lock.yaml` contains **no `domino`** entry, and `@angular/platform-server@22.0.5` ships its own DOM. Global `document` is therefore `undefined` during Angular 22 SSR/prerender — which the repo already knows: `packages/core/src/link/link.ts:200` says *"Use injected DOCUMENT — prerender VMs may have no global `document`."* Angular effects created in an injection context **do** run during server change detection; `afterNextRender` does not.

```ts
// packages/core/src/primitives/list/navigator.ts:105-111
effect(() => {
  if (this.kjFocusMode() !== 'roving') return;
  const item = this.activeItem();
  if (!item) return;
  const host = item._host();
  if (host && document.activeElement !== host) host.focus();   // ← bare global
});
```

```ts
// packages/core/src/tree-select/tree-select-content.ts:119-124
effect(() => {
  const item = this.nav.activeItem();
  if (!item) return;
  const host = item._host();
  if (host && document.activeElement !== host) host.focus();   // ← bare global
});
```

```ts
// packages/core/src/chart/chart.ts:232-258 (inside a plain effect(), not afterNextRender)
effect(() => {
  const text = this.kjChartDescription();
  ...
  if (!descDiv) {
    descDiv = document.createElement('div');                   // ← bare global
    ...
    host.appendChild(descDiv);
  }
```

The proof that this is an oversight and not a considered decision: the **same three lines** exist twice more in the codebase and are guarded there —

```ts
// packages/core/src/menubar/menubar.ts:304  AND  dropdown-menu-content.ts:253
if (host && typeof document !== 'undefined' && document.activeElement !== host) {
```

**Why it matters:** each is a `ReferenceError: document is not defined` that aborts rendering for the whole route. They do not fire in the docs build today for narrow reasons that a consumer will not reproduce: `KjListNavigator.kjFocusMode` defaults to `'activedescendant'` (`navigator.ts:64`), so `navigator.ts:110` only fires when a consumer binds `kjFocusMode="roving"` explicitly; `tree-select-content.ts:123` only fires once something calls `setActive` (`:170,:186` are keyboard handlers); `chart.ts:242` only fires when `kjChartDescription` is set, and no example in the repo sets it (grep: zero usages outside the directive). All three are one consumer line away from a hard SSR crash, and the chart one is the accessibility-description feature — i.e. the careful consumer is the one who trips it.

**Fix:** replace the bare globals with `inject(DOCUMENT)` (already the pattern in `calendar-day.ts:56`, `link.ts:91`, `skip-link.ts:56`, `time-picker-segment.ts:42`) and add the `isPlatformBrowser` early-return used in `calendar-day.ts:84`. For `chart.ts` the description div should move into `afterNextRender` + an `afterRenderEffect`, or at minimum gate on `isPlatformBrowser`.
**Effort:** S

---

### F-3 `KjLink` injects its external-link a11y suffix twice — server once, client once

**Severity:** high · **Confidence:** high
**Files:** `packages/core/src/link/link.ts:167,201-224`

```ts
// packages/core/src/link/link.ts:166-167
/** Reference to the injected AT suffix span, if any. Cleaned up on toggle. */
private suffixSpan: HTMLSpanElement | null = null;

// packages/core/src/link/link.ts:201-219
effect(() => {
  const external = this.isExternal();
  const doc = this.document;                     // inject(DOCUMENT) — works on the server
  if (!doc.createElement) return;
  const node = this.el.nativeElement;
  const consumerOwnsName = node.hasAttribute('aria-label');
  if (external && !consumerOwnsName) {
    if (!this.suffixSpan) {                      // ← instance state, not a DOM probe
      const span = doc.createElement('span');
      span.className = KJ_LINK_EXTERNAL_SUFFIX_CLASS;
      span.setAttribute('style', KJ_LINK_VISUALLY_HIDDEN_STYLE);
      span.textContent = ` ${KJ_LINK_EXTERNAL_SUFFIX_TEXT}`;
      node.appendChild(span);
      this.suffixSpan = span;
```

This effect runs on the server (it uses the injected `DOCUMENT`, which exists there), so the `<span class="kj-link-external-suffix">…(opens in new tab)</span>` is **serialised into the prerendered HTML**. On the client a fresh `KjLink` instance is constructed during hydration with `suffixSpan === null`, the effect runs again, the `if (!this.suffixSpan)` guard passes, and a **second** span is appended. There is no `node.querySelector('.' + KJ_LINK_EXTERNAL_SUFFIX_CLASS)` check anywhere in the file.

**Why it matters:** every external link on a hydrated page announces "opens in new tab" twice to screen readers — an accessibility regression in an accessibility-first library, on the exact code path that exists to *serve* screen readers. It also leaves an orphan node that `else if (this.suffixSpan) { this.suffixSpan.remove() }` (`:220-222`) can never clean up, since the instance only tracks the one it made. This is the single SSR defect in this report that is live in production today.

**Fix:** adopt the DOM as the source of truth, not instance state:
```ts
this.suffixSpan ??= node.querySelector<HTMLSpanElement>(`.${KJ_LINK_EXTERNAL_SUFFIX_CLASS}`);
```
before the `if (!this.suffixSpan)` branch — this also makes repeated `kjExternal` toggles idempotent. Add a hydration spec that renders `<a kjLink target="_blank">`, serialises, re-hydrates, and asserts exactly one suffix node.
**Effort:** S

---

### F-4 `inject(DOCUMENT)` vs global `document` is inconsistent and unenforced

**Severity:** medium · **Confidence:** high
**Files:** repo-wide; `packages/core/src/link/link.ts:200` (the stated policy), `eslint.config.js`

Counts across `packages/*/src` excluding specs: **72** references to the global `document.`, against **6** files that inject the `DOCUMENT` token (`calendar/calendar-day.ts:56`, `link/link.ts:91`, `locale/document-direction.ts:45`, `primitives/directionality/directionality.ts:37`, `skip-link/skip-link.ts:56`, `time-picker/time-picker-segment.ts:42`). `rules/code_style.md` and `rules/architecture.md` say "SSR-safe via `afterNextRender()`" but never state a `DOCUMENT` rule; the only place the policy is written down is a comment inside one directive.

Most of the 72 are legitimately fine (inside `afterNextRender`, inside event handlers, behind `typeof document !== 'undefined'`). But nothing prevents the next one from being F-2. `eslint.config.js` has no `no-restricted-globals` entry for `document` / `window` / `navigator` / `localStorage`.

**Why it matters:** the correctness of this library's SSR story currently rests entirely on reviewer vigilance. Three misses already exist.

**Fix:** add to `eslint.config.js`, scoped to `packages/*/src/**` and excluding `**/_examples/**`:
```js
'no-restricted-globals': ['error',
  { name: 'document', message: 'Use inject(DOCUMENT) or guard inside afterNextRender().' },
  { name: 'window', message: 'Guard with typeof window / isPlatformBrowser.' },
  { name: 'navigator', message: 'Guard with typeof navigator.' },
  { name: 'localStorage', message: 'Use the guarded helpers in table-storage.ts.' },
  { name: 'sessionStorage', message: '…' },
]
```
then add targeted `// eslint-disable-next-line` with a one-line justification on the ~65 sites that are already correct. Write the rule into `rules/code_style.md` next to the lifecycle section.
**Effort:** M

---

### F-5 Prerendering bakes the build date into every calendar

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/src/calendar/calendar.ts:120,131`, `packages/core/src/calendar/calendar-day.ts:66,41,46`, `packages/core/src/date-range-presets/date-range-presets.ts:112`

```ts
// packages/core/src/calendar/calendar.ts:120
readonly kjFocusedDate = model<Date>(startOfDay(new Date()));
// packages/core/src/calendar/calendar.ts:131
const seed = this.kjStartAt() ?? this.kjValue() ?? new Date();

// packages/core/src/calendar/calendar-day.ts:66
readonly isToday = computed(() => isSameDay(this.kjDate(), new Date()));
// …surfaced as host bindings at :41 and :46
'[attr.aria-current]': 'isToday() ? "date" : null',
'[attr.data-today]':   'isToday() ? "" : null',
```

Under `outputMode: "static"` the "server render" happens **at build time**, so `new Date()` is the CI build timestamp. A prerendered calendar therefore ships with the build month's grid, and `aria-current="date"` / `data-today` on the build date. On hydration Angular re-evaluates the bindings and corrects them — `buildMonthMatrix` always emits 6 rows (`date-utils.ts:110`) so the node count matches and there is no NG0500 — but the served HTML is wrong until JS runs.

**Why it matters:** crawlers and no-JS readers see a stale month; hydration produces a visible date-grid flip; `aria-current="date"` is announced on the wrong cell during the pre-hydration window. Severity is capped at medium only because nothing structurally breaks.

**Fix:** make "now" injectable. `date-range-presets.ts:112` already shows the shape (`this.kjNow() ?? new Date()`). Add a `KJ_NOW` injection token defaulting to `() => new Date()`, use it in `calendar.ts:120,131` and `calendar-day.ts:66`, and have the docs' calendar route either provide a stable value or render client-only. Independently: any component whose first paint depends on wall-clock time should be listed in a "do not prerender" note in `rules/architecture.md`.
**Effort:** M

---

### F-6 Package `exports` / entry fields make the packages unresolvable under Vite, Node, or Analog

**Severity:** medium · **Confidence:** medium (source manifests verified; the ng-packagr-generated `dist` manifest could not be inspected — no `node_modules` in this worktree and builds are out of scope)
**Files:** `packages/core/package.json:48-58`, `packages/components/package.json:48-49`, `packages/themes/package.json:26-36`, `tsconfig.json:10-17`

```jsonc
// packages/core/package.json:48-58 — note what is NOT here: "main", and "exports"["."]
"sideEffects": false,
"type": "module",
"module": "../../dist/kj-core/fesm2022/kouji-ui-core.mjs",   // ← escapes the package root
"typings": "../../dist/kj-core/types/kouji-ui-core.d.ts",     // ← escapes the package root
"exports": {
  "./icon/icon.css":        { "style": "./icon/icon.css",        "default": "./icon/icon.css" },
  "./typography/prose.css": { "style": "./typography/prose.css", "default": "./typography/prose.css" },
  "./motion/motion.css":    { "style": "./motion/motion.css",    "default": "./motion/motion.css" }
}
```

`packages/components/package.json` declares **no** `exports`, `main`, `module`, `browser` or `typings` at all — only `"sideEffects": false` at `:49`.

Concretely, what breaks under Analog (Vite dev/SSR + Nitro):
1. **Bare-specifier resolution.** Once `"exports"` is present, Node ESM ignores `main`/`module` entirely and refuses any subpath not listed. `import '@kouji-ui/core'` → `ERR_PACKAGE_PATH_NOT_EXPORTED`. Vite's dev/SSR resolver follows the same `exports` algorithm. In this monorepo the failure is masked because `tsconfig.json:11-16` maps `@kouji-ui/core` → `packages/core/src/public-api.ts`; the Angular CLI honours `paths`, Vite's runtime resolver does not.
2. **`module` points outside the package.** `../../dist/kj-core/...` resolves above the package directory — valid for nothing, and for a pnpm-symlinked workspace package it resolves relative to the real path, landing in the monorepo `dist/`. Vite would either fail or silently bind an Analog app to a stale build output.
3. **SSR externalisation.** Vite externalises bare imports for the Nitro server bundle by default. A package with no resolvable `"."` entry fails at *runtime*, not build time — the classic "works in dev, 500s in preview" Analog failure. There is no `ssr.noExternal` config anywhere in the repo to opt out (`grep analogjs` finds only the Vitest plugin: `apps/docs/vitest.config.ts:2`, `packages/*/vite.config.ts:2`).
4. **FESM + `sideEffects: false`.** ng-packagr emits a single FESM2022 bundle. Combined with `sideEffects: false`, a Vite SSR build is free to drop modules whose only purpose is a side effect — `primitives/overlay/container.ts` (module-level `_root` singleton) is the shape most at risk.

**Why it matters:** the task frames Analog as a target. Today it is not merely unsupported; the very first `import { KjButton } from '@kouji-ui/core'` in an Analog app would not resolve, and nobody in the repo would notice because CI never resolves these packages by name.

**Fix:** stop relying on ng-packagr's implicit generation and on tsconfig `paths` to mask it. Add an explicit `"."` condition block to both packages (`types` → `.d.ts`, `default` → FESM), drop the root-escaping `module`/`typings` from `packages/core/package.json:50-51`, and add a resolution smoke test: a tiny `scripts/verify-exports.mjs` that runs `import.meta.resolve('@kouji-ui/core')` and `require.resolve` against `dist/kj-core` after `pnpm build`, wired into `.github/workflows/release.yml`. Separately, stand up a throwaway Analog app in CI that imports one directive from each package and server-renders one route — that is the only thing that will keep this honest.
**Effort:** L

---

### F-7 The global stylesheets a consumer needs are neither exported nor shipped — and cannot be imported from a server bundle

**Severity:** medium · **Confidence:** high
**Files:** `angular.json:102-107`, `packages/core/src/styles.css:16-17`, `packages/components/src/overlay/overlay.css:24`, `packages/components/ng-package.json`, `packages/core/ng-package.json`

`angular.json:102-107` loads four global stylesheets by **filesystem path into `src/`**:
```jsonc
"styles": [
  "packages/themes/src/index.css",
  "packages/core/src/styles.css",
  "packages/components/src/overlay/overlay.css",
  "apps/docs/src/styles.css"
],
```
`packages/core/src/styles.css` and `packages/components/src/overlay/overlay.css` appear in **no** `exports` map, and `packages/components/ng-package.json` has no `assets` block at all (core's copies only `prose.css`, `icon.css`, `motion.css`). `overlay.css:24` additionally `@import`s `"../../../core/src/primitives/overlay/overlay.css"` — a relative path out of the package.

This overlaps with `reports/review/02-styles-theming.md` (finding at `:73-120`), which covers the shipping gap. The **SSR-specific** angle it does not cover: under Analog/Vite, an app's `app.config.server.ts` or root component would need `import '@kouji-ui/components/overlay/overlay.css'`. Vite handles CSS imports in an SSR graph only for modules it does **not** externalise; an externalised package CSS import throws in Node (`Unknown file extension ".css"`). So even after F-6 is fixed, CSS delivery needs its own answer — either ship the CSS and document it as a client-entry-only import, or move overlay chrome into component `styleUrl`s that ng-packagr inlines.

**Fix:** ship the two aggregates (`assets` entries in both `ng-package.json` files), export them under `"./styles.css"` and `"./overlay.css"`, replace the cross-package relative `@import` with the package specifier, and add a line to `rules/stack.md` stating that kouji-ui global CSS is a **browser-entry** import and must not be imported from a server entry.
**Effort:** M

---

### F-8 Incremental hydration is explicitly switched off, and nothing in the library is `@defer`-shaped

**Severity:** medium · **Confidence:** high
**Files:** `apps/docs/src/app/app.config.ts:28`, `apps/docs/src/app/app.ts:31`

```ts
// apps/docs/src/app/app.config.ts:28
provideClientHydration(withEventReplay(), withNoIncrementalHydration()),
```

`withNoIncrementalHydration()` opts the app out of Angular's incremental hydration entirely. There is exactly **one** `@defer` block in the whole repo (`app.ts:31`, `@defer (when isBrowser)` around `<kj-progress-bar />`) — zero in `packages/core/src` or `packages/components/src`.

No comment explains the opt-out. The likely driver is that `@defer` + `hydrate on …` is incompatible with the docs' own lazy example-mounting (F-9) — but that is a guess, and it should be written down either way.

**Why it matters:** incremental hydration is the single largest available win for a component-library docs site (hydrate the visible example, leave the other 12 on the page dormant), and the library is well positioned for it — every overlay panel, chart, editor, and table is a natural `@defer` + `hydrate on interaction` / `hydrate on viewport` boundary. Turning it off globally and never revisiting it forfeits that. Separately, `withEventReplay()` without incremental hydration only replays events on already-hydrated content, so the pairing is doing less than it appears to.

**Fix:** (1) document the reason for `withNoIncrementalHydration()` inline, as every other non-obvious decision in `app.config.ts` is documented. (2) Spike removing it on one route (`/docs/components/button`) with `@defer (hydrate on viewport)` around the example preview, and measure. (3) If the library is to advertise incremental-hydration support, it needs at least one `_examples/*` demonstrating `@defer (hydrate on interaction)` around an overlay trigger, plus a docs page section.
**Effort:** M

---

### F-9 The prerender proves far less about the library than it appears to

**Severity:** medium · **Confidence:** high
**Files:** `apps/docs/src/app/components/code-preview/code-preview.ts:140-165`, `apps/docs/src/app/pages/component-doc/playground.ts:109`, `apps/docs/e2e/editor.spec.ts:35-46`

```ts
// apps/docs/src/app/components/code-preview/code-preview.ts:142-165
this.registrySvc.get(exportName)          // → dynamic import() of the _examples chunk
  .then((cmp) => { … this.demoComponent.set(cmp); … });
…
// Mount/unmount the resolved component into #previewHost.
effect(() => {
  const vcr = this.previewHost();
  const comp = this.demoComponent();
  if (!vcr) return;
  vcr.clear();
  if (comp) vcr.createComponent(comp);
});
```

The example registry is a map of `() => import('./<name>/_examples')` thunks (`packages/core/src/example-components.ts:16-24`, `packages/components/src/example-components.ts:16-22`). During prerender the promise does not settle before rendering completes, so `demoComponent()` stays `null` and **no `_examples/*` component is ever server-rendered**. Every `/docs/components/*` and `/docs/headless/*` page prerenders the docs chrome + prose only.

The repo's own e2e acknowledges this obliquely:
```ts
// apps/docs/e2e/editor.spec.ts:35-46
test('editor docs page prerenders the styled component host', async ({ request }) => {
  // (Its dynamically-created live example previews do not re-hydrate in this
  // headless sandbox — see the design spec — …)
  const html = await res.text();
  expect(html).toContain('kj-editor');
```
`expect(html).toContain('kj-editor')` is satisfied by the example's **source code** rendered into the `<pre>` block, so this assertion does not establish that anything was server-rendered.

What *is* genuinely exercised: the home route, which statically imports `KjAccordion*`, `KjBadge`, `KjButton`, `KjCard`, `KjInput`, `KjProgressBar`, `KjTab` (`apps/docs/src/app/pages/home/home.ts:115-127`), plus the docs shell (`docs-sidebar`, `docs-nav-tree`, `skip-link`). That is roughly 7 of ~120 components.

**Why it matters:** F-2's three latent crashes survived because no prerendered page instantiates a chart, a tree-select, or a roving list navigator. The SSR safety net has a hole the size of the component catalogue, and `home.ts:77` markets the library as *"ssr-safe by default"*.

**Fix:** add a dedicated SSR smoke route — e.g. `/ssr-kitchen-sink` — that statically imports and renders one instance of every exported component with its accessibility-relevant inputs set (`kjChartDescription`, `kjExternal`, `kjFocusMode="roving"`, …), marked `RenderMode.Prerender`. A prerender failure on that route fails the build. Pair it with an e2e that fetches the route's HTML and asserts a marker element from each component family is present in the *served markup*, and a second that loads it in a browser and asserts zero `NG0500`/`NG0501` console messages.
**Effort:** M

---

### F-10 Every prerendered page ships its content `visibility: hidden` behind a splash screen

**Severity:** medium · **Confidence:** high
**Files:** `apps/docs/src/app/services/loading.service.ts:9`, `apps/docs/src/app/app.ts:25-28,44-46,71-83`

```ts
// apps/docs/src/app/services/loading.service.ts:9
readonly isLoading = signal(true);
```
```html
<!-- apps/docs/src/app/app.ts:25-30 -->
@if (loading.isLoading()) { <kj-loading-screen /> }
<div class="app-shell" [class.content-hidden]="loading.isLoading()">
  <router-outlet />
</div>
```
```css
/* apps/docs/src/app/app.ts:44-46 */
.content-hidden { visibility: hidden; }
```
```ts
// apps/docs/src/app/app.ts:71-83 — the only thing that clears it
ngOnInit(): void {
  if (!this.isBrowser) return;
  this.appRef.isStable.pipe(filter(s => s), first(), …).subscribe(() => this.loading.hide());
}
```

`isLoading` initialises to `true` on the server as well, so the prerendered HTML contains `<kj-loading-screen>` plus `class="app-shell content-hidden"`. It is cleared **only** in the browser branch, after `appRef.isStable`.

This is hydration-*correct* — the structure matches on both sides, which is why it produces no NG0500 — but it negates most of the value of prerendering: the served HTML's real content is invisible until the JS bundle downloads, parses, hydrates, and the app reports stable. For a docs site whose main non-JS consumers are crawlers and link previews, a `visibility: hidden` body is close to shipping a blank page.

**Why it matters:** F-1 established that prerendering is the *only* server rendering that happens. F-10 says the prerendered output is then hidden. Together they mean the SSR investment currently buys very little of what SSR is for.

**Fix:** flip the default — `signal(false)` — and have the browser-only path *raise* the splash if the app is not stable within a short budget, rather than start raised. Alternatively keep the splash but drop `.content-hidden` so the prerendered content paints underneath it, and let the splash fade out. Either way, add an e2e to `playwright.static.config.ts` that fetches a prerendered route with JS disabled and asserts the `<h1>` is visible.
**Effort:** S

---

### F-11 Node / Express version assumptions in `server.ts` are undeclared and partly contradictory

**Severity:** low · **Confidence:** high
**Files:** `apps/docs/src/server.ts:12,61-67`, `apps/docs/src/serve-static.mjs:18-22`, `package.json` (`@types/node`), `pnpm-lock.yaml:661-663`, all four `package.json` files (no `engines`)

```ts
// apps/docs/src/server.ts:12
const browserDistFolder = join(import.meta.dirname, '../browser');
// apps/docs/src/server.ts:61-67
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) throw error;
```

1. **`import.meta.dirname` requires Node ≥ 20.11 / 21.2.** No `package.json` in the repo declares an `engines` field (grepped: zero hits). On an older Node it is `undefined` and `join(undefined, …)` throws `TypeError`.
2. **Declared vs required Node.** `pnpm-lock.yaml:663` records `@angular/platform-server@22.0.5` → `engines: { node: ^22.22.3 || ^24.15.0 || >=26.0.0 }`, while the repo pins `"@types/node": "^20.17.19"`. The type surface is Node 20 while the runtime floor is Node 22.22.3.
3. **`app.listen`'s callback never receives an error.** In Express 5 (and Node's `http.Server.listen`) the callback is the `listening` event handler and is invoked with no arguments. `if (error) throw error` is permanently dead; a genuine `EADDRINUSE` surfaces as an unhandled `'error'` event instead. The same dead branch is duplicated in `apps/docs/src/serve-static.mjs:19-21`.
4. **`PORT` is passed as a string.** `process.env['PORT'] || 4000` yields `string | number`; Node coerces numeric strings, but a non-numeric `PORT` is interpreted as a **pipe path** rather than failing loudly.

**Why it matters:** low today precisely because F-1 means `server.ts` never runs in production. It becomes a deploy-blocker the moment F-1 option (a) is taken, and `serve-static.mjs` — which *does* run on Render — carries points 1, 3 and 4 already.

**Fix:** add `"engines": { "node": ">=22.22.3" }` to the root `package.json` and bump `@types/node` to `^22`. Replace the listen callbacks with `app.listen(Number(process.env['PORT'] ?? 4000), () => console.log(...))` plus a real `server.on('error', …)` handler.
**Effort:** S

---

### F-12 `crypto.randomUUID()` used bare in `KjToastService`, against the repo's own guarded helper

**Severity:** low · **Confidence:** high
**Files:** `packages/core/src/toast/toast.service.ts:156,206` vs `accordion/accordion.ts:26-28`, `tabs/tabs.ts:28-30`, `carousel/carousel.ts:36`, `file-upload/file-upload.ts:31`

```ts
// packages/core/src/toast/toast.service.ts:156
const id = opts.id ?? crypto.randomUUID();
```
```ts
// packages/core/src/accordion/accordion.ts:26-28 — the established pattern
// Try crypto.randomUUID where available (browser, jsdom 22+, node 19+).
const cryptoLike = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
```

Four other files route through a `globalThis.crypto` feature check with a counter fallback; toast reaches for the bare global twice. Node ≥ 19 does expose `globalThis.crypto`, so this is not a live crash under the declared Node floor — but it diverges from the pattern for no reason, and it is the one that would break first on a non-Node server runtime or an older embedder.

**Fix:** extract the `accordion.ts:26-33` helper into `packages/core/src/primitives/` (it is duplicated four times already) and use it in `toast.service.ts:156,206`.
**Effort:** S

---

### F-13 `KjFileUploadTrigger` mutates the DOM in its constructor and leaves a non-null-asserted field undefined on the server

**Severity:** low · **Confidence:** medium (the SSR no-op is certain; the hydration node-claiming impact was not empirically reproduced)
**Files:** `packages/core/src/file-upload/file-upload.ts:444,446-465`

```ts
private hidden!: HTMLInputElement;        // :444 — non-null assertion

constructor() {
  if (typeof document !== 'undefined') {  // :451
    this.hidden = document.createElement('input');
    …
    this.el.nativeElement.appendChild(this.hidden);   // :463
    this.ctx.registerPickerInput(this.hidden);
  }
```

On the server the guard correctly skips everything, which leaves `this.hidden` genuinely `undefined` behind a `!` assertion — any method reaching it before the client constructor re-runs is a `TypeError` the type system has been told to ignore. More subtly, this is the only place in the two packages that appends a child element to the host **from a constructor** rather than from `afterNextRender` (compare `pagination.ts:218-230`, `pagination-ellipsis.ts:47-67`, `file-upload.ts:399-408`, which all do exactly the same job inside `afterNextRender`). During hydration the constructor runs before Angular claims the host's child nodes, so an extra element is inserted mid-claim.

**Fix:** move the block into `afterNextRender`, matching its three sibling call sites in the same package, and type the field `HTMLInputElement | null` with real null checks at its use sites.
**Effort:** S

---

## Recommended work items

Ordered by (risk × how cheaply it is closed).

1. **Fix the duplicated external-link suffix.** F-3. The only defect in this report that is live in production, and it is an a11y regression. Probe the DOM instead of instance state; add a hydration spec. *S*
2. **Guard the three unguarded `document` dereferences.** F-2. `navigator.ts:110`, `tree-select-content.ts:123`, `chart.ts:242` → `inject(DOCUMENT)` + `isPlatformBrowser`, matching `menubar.ts:304`. *S*
3. **Land the `no-restricted-globals` ESLint rule** so F-2 cannot recur, and write the `inject(DOCUMENT)` policy into `rules/code_style.md`. F-4. *M*
4. **Decide what `apps/docs` actually is.** F-1. Either wire `ssr.entry` and move to `outputMode: "server"`, or delete `server.ts`, fix `PrerenderFallback.Server`, and correct the comments that promise `/api` endpoints. Everything below depends on this answer. *M*
5. **Add the SSR kitchen-sink prerender route + console-error e2e.** F-9. This is the control that would have caught items 1 and 2 automatically, and it is the prerequisite for trusting any future SSR claim. *M*
6. **Stop hiding prerendered content.** F-10. Flip `LoadingService.isLoading` to `false` by default; add a JS-disabled e2e. *S*
7. **Make "now" injectable in the calendar family.** F-5. `KJ_NOW` token; `calendar.ts:120,131`, `calendar-day.ts:66`. *M*
8. **Fix the package entry points and add a resolution smoke test.** F-6. Explicit `"."` exports on core and components, drop the root-escaping `module`/`typings`, `verify-exports.mjs` in the release workflow. Without this no Analog conversation can start. *L*
9. **Ship and export the global stylesheets, and document them as browser-entry-only.** F-7 (coordinate with `reports/review/02-styles-theming.md`). *M*
10. **Document or revisit `withNoIncrementalHydration()`.** F-8. At minimum an inline justification; ideally a one-route spike with `@defer (hydrate on viewport)`. *M*
11. **Declare `engines` and fix the listen callbacks.** F-11. Blocks deploy the moment item 4 goes the server route; `serve-static.mjs` is affected today. *S*
12. **Deduplicate the `crypto.randomUUID` helper and use it in toast** (F-12); **move `KjFileUploadTrigger`'s DOM work into `afterNextRender`** (F-13). *S*

## Open questions

1. **Was `outputMode: "static"` deliberate, or did `server.ts` get orphaned during a migration?** The file is well-written and its `/api` routes are referenced by name from two services' TSDoc — it reads like code that used to run. The answer determines whether item 4 is "wire it back up" or "delete it".
2. **Why `withNoIncrementalHydration()`?** No comment, in a config file where every other non-obvious provider is explained. If it was added to work around a concrete bug, that bug should be captured before anyone tries to remove the flag.
3. **Is Analog a real target or an aspiration?** The only `@analogjs/*` usage in the repo is the Vitest plugin. F-6's fix is L-sized and only worth it if a real Analog consumer is expected. If it is, the repo needs an Analog app in CI; if it is not, the packages should still get `"."` exports (plain Node/Vite consumers hit the same wall) but the Nitro/SSR-externalisation work can be dropped.
4. **Does the ng-packagr-generated `dist/kj-core/package.json` merge the three custom CSS `exports` with a generated `"."` entry, or replace them?** This determines whether F-6 is "published packages are broken today" or "published packages work by accident and the source manifest is merely misleading". It needs one `pnpm build:core` + `cat dist/kj-core/package.json`, which was out of scope for this read-only pass.
5. **Is there a reason `KjListNavigator.kjFocusMode` defaults to `'activedescendant'` while `KjDropdownMenuContent` and `KjMenubar` both reimplement the roving seed + focus-follow locally** (`dropdown-menu-content.ts:228-256`, `menubar.ts:286-307`, each with the comment "host-directive inputs cannot be defaulted from this component")? Three copies of the same ten lines, one of which (the original, `navigator.ts:105-111`) is the unguarded one. Consolidating them would close F-2 permanently rather than patching a third copy.
