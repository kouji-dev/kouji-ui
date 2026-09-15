# Lazy Loading, Tree-Shaking & Bundle Shape Review

## Verdict

The **lazy-loading architecture for the three genuinely heavy runtime deps is excellent and should not be touched**: Lexical, Monaco and ECharts are all reached exclusively through `import type` + a dynamic `import()` behind a DI-overridable loader token, and `packages/core/src/rich-text/index.ts` is explicitly curated to keep Lexical out of the eager graph. Docs routing is 100% `loadComponent`, and the `EXAMPLE_LOADERS` registry code-splits examples per component folder. What lets the grade down is **bundle *shape*** rather than lazy loading: both publishable packages are a single flat mega-barrel (69 folders in core, 72 in components) with one `fesm2022` file and **zero secondary entry points**, so every size guarantee rests entirely on whole-program tree-shaking; `provideLucideIcons()` namespace-imports the *entire* Lucide set and the docs app wires it eagerly into `app.config.ts`; two component barrels (`icon`, `input-mask`) leak `_examples` into the published public API; `marked` and `@tanstack/virtual-core` are hard `dependencies` that every consumer installs regardless of whether they touch chat or a virtualised table; and two aggregator stylesheets the docs build depends on are never published to consumers at all. **Grade: C+**

## What works

- **Lexical is genuinely lazy, end to end.** `packages/core/src/rich-text/rich-text-editor.ts:224` dynamically `import('./engine')`, and `engine.ts` is the *only* module with value-level `lexical` imports. Every optional feature loads its own package on demand — `packages/components/src/rich-text/features/list.ts:23` does `mod = await import('@lexical/list')` inside `load()`. `packages/core/src/rich-text/index.ts:1-3` documents the invariant: *"Only SSR-safe (Lexical-free at runtime) symbols are re-exported here so that importing `@kouji-ui/core` never eagerly loads Lexical."*
- **Monaco never becomes a runtime dependency.** `packages/core/src/editor/editor.types.ts:1` is `import type { editor } from 'monaco-editor'` and `editor.types.ts:8` is `export type KjMonaco = typeof import('monaco-editor')`. The only runtime reach is `packages/core/src/editor/editor.loader.ts:63`, `const mod = await import('@monaco-editor/loader')`.
- **ECharts is type-only + lazy**, with a first-class escape hatch: `packages/core/src/chart/echarts.ts` ships `provideECharts` / `KJ_ECHARTS` so a consumer can hand over a tree-shaken `echarts/core` build.
- **Optional-peer hygiene**: `packages/core/package.json` marks all 13 of `echarts`, `monaco-editor`, `@monaco-editor/loader` and the 9 Lexical packages `optional: true` under `peerDependenciesMeta` — exactly right for lazily-loaded engines.
- **Docs routing is fully lazy.** All 9 routes in `apps/docs/src/app/app.routes.ts` use `loadComponent`, including the `culori`-heavy theme generator (`app.routes.ts:63,68`), which keeps culori out of the initial chunk.
- **Docs examples are code-split per folder.** `packages/components/src/example-components.ts` is a map of `() => import('./<folder>/_examples')` loaders consumed through `apps/docs/src/app/services/example-registry.service.ts`, with a memoised per-folder promise cache.
- **No module-level side effects in the published source.** A scan for top-level `document.`/`window.`/`globalThis.` statements, `customElements.define` and module-scope registration calls in `packages/*/src` returns nothing outside constructor/lifecycle bodies. Both TS packages declare `"sideEffects": false`; `packages/themes/package.json` correctly declares `"sideEffects": ["**/*.css"]`.
- **Dynamic imports used to break cycles**, not just for size: `packages/core/src/overlay-badge/overlay-badge.ts:24`, `drawer.ref.ts:6`, `sheet.ref.ts:7`, `packages/components/src/action-sheet/action-sheet.ts:12`.

## Findings

### F-1 The entire Lucide icon set is namespace-imported and eagerly wired in the docs root config

**Severity:** high · **Confidence:** high
**Files:** `packages/components/src/icon/lucide/provide-lucide-icons.ts`, `packages/components/src/icon/lucide/icon-names.generated.ts`, `apps/docs/src/app/app.config.ts`, `packages/core/src/icon/icon.providers.ts`

**Evidence**

```ts
// packages/components/src/icon/lucide/provide-lucide-icons.ts:8
import * as lucideIcons from 'lucide-static';
...
// :52-56
const map = lucideIcons as unknown as Record<string, string>;
for (const [pascal, svg] of Object.entries(map)) {
  if (typeof svg !== 'string') continue;
  entries[pascalToKebab(pascal)] = encodeSvgDataUrl(svg);
}
```

The TSDoc owns the tradeoff (`provide-lucide-icons.ts:68-72`): *"The transferred bundle cost is ~300 KB gzipped for the whole set… a single static namespace import is the predictable choice."* But the docs app pays it **in the initial chunk**:

```ts
// apps/docs/src/app/app.config.ts:14,30
import { provideLucideIcons } from '@kouji-ui/components';
    provideLucideIcons(),
```

`Object.entries` over a namespace object defeats any per-export tree-shaking — every one of the ~1,700 icons is retained. The infrastructure for the lazy alternative **already exists in core** and is unused:

```ts
// packages/core/src/icon/icon.providers.ts:45
export function provideIconLoader(fn: IconLoader): EnvironmentProviders {
```

```ts
// packages/core/src/icon/icon.resolver.ts:32-45  — async loader path, fills registry on demand
if (loader) { if (!pending.has(name)) { pending.add(name); Promise.resolve(loader(name))... } return null; }
```

Confirming the lazy path was the *intended* design, the icon gallery example still documents a provider that does not exist anywhere in the repo:

```ts
// packages/components/src/icon/_examples/icon.gallery.example.ts:16-18
 * via the `kjIcon` directive, which goes through the lazy loader registered by
 * `provideLucideLoader()` — only icons currently mounted in the DOM trigger a
 * dynamic per-icon `import()`.
```

Separately, `LUCIDE_ICON_NAMES_RAW` (`icon-names.generated.ts`, 31,128 bytes, ~1,700 strings) is exported from the public barrel via `icon/lucide/index.ts:2`.

**Why it matters** — The docs production budget is `maximumWarning: 800kB / maximumError: 1500kB` for `initial` (`angular.json`). A ~300 KB-gzipped eager icon payload is a large fraction of that, and it is the *first* thing a consumer copies from `app.config.ts`. It is also the single largest tree-shaking hole in `@kouji-ui/components`.

**Fix** — Ship `provideLucideLoader()` (the name the example already documents) built on `provideIconLoader`, resolving one icon at a time via `await import(\`lucide-static/icons/${name}.svg?raw\`)` or a fetch against a published sprite/JSON asset; keep `provideLucideIcons()` as an explicitly-documented eager opt-in, and add an overload `provideLucideIcons(names: readonly string[])` that registers only the listed subset. Switch `apps/docs/src/app/app.config.ts:30` to the loader variant. Move `LUCIDE_ICON_NAMES` behind its own lazy accessor (`() => import('./icon-names.generated')`) so the gallery example is the only thing paying for the 31 KB list.

**Effort:** M

---

### F-2 Example components leak into the published public API through two barrels

**Severity:** high · **Confidence:** high
**Files:** `packages/components/src/icon/index.ts`, `packages/components/src/input-mask/index.ts`, `packages/components/src/public-api.ts`

**Evidence**

```ts
// packages/components/src/icon/index.ts
export * from './lucide/index';
export {
  KjIconGalleryExample,
  KjIconUsageExample,
} from './_examples';
```

```ts
// packages/components/src/input-mask/index.ts
export { KjInputMaskComponent } from './input-mask';
export {
  KjInputMaskExample,
  KjInputMaskUsageExample,
  KjInputMaskCreditCardExample,
  KjInputMaskDateExample,
  KjInputMaskValidationExample,
  KjInputMaskCustomTokensExample,
} from './_examples';
```

Both are reached from `packages/components/src/public-api.ts:33` (`export * from './icon/index'`) and `:36` (`export * from './input-mask/index'`). These are the **only two** of the 72 component folders that do this — a grep for `_examples` across `packages/components/src/*/index.ts` returns exactly these two files, and across `packages/core/src/*/index.ts` returns zero. So this is an accident, not a policy.

What they drag in transitively:

```ts
// packages/components/src/icon/_examples/icon.gallery.example.ts:8-12
import { FormsModule } from '@angular/forms';
import { KjIconDirective } from '@kouji-ui/core';
import { KjInputComponent } from '../../input/input';
import { KjButtonComponent } from '../../button/button';
import { LUCIDE_ICON_NAMES } from '../lucide/icon-names';
```

The gallery example also carries ~60 lines of inline `styles:` and a `ViewEncapsulation.None` block.

**Why it matters** — `KjIconGalleryExample` and `KjInputMaskExample` are now part of the package's **semver-public API**; renaming or deleting a docs example is a breaking change. And the gallery example is a hard reference to `LUCIDE_ICON_NAMES`, which pins the 31 KB generated names array into the reachable graph from the top-level barrel — precisely the module F-1 wants to make lazy.

**Fix** — Delete the `_examples` re-export block from both `index.ts` files. If the docs app resolved those two example sets by importing the folder barrel rather than through `EXAMPLE_LOADERS`, point it at `@kouji-ui/components/<folder>/_examples` (the `@kouji-ui/components/*` tsconfig path already exists) or add the folders to `example-components.ts`. Add an ESLint `no-restricted-imports` rule (or a CI grep) forbidding `_examples`/`.playground` in any `src/*/index.ts`.

**Effort:** S

---

### F-3 No secondary entry points: one flat barrel, one FESM, all size guarantees rest on tree-shaking

**Severity:** high · **Confidence:** high
**Files:** `packages/core/ng-package.json`, `packages/components/ng-package.json`, `packages/core/src/public-api.ts`, `packages/components/src/public-api.ts`

**Evidence** — There are exactly two `ng-package.json` files in the repo and neither declares a sub-entry-point:

```json
// packages/core/ng-package.json
{ "dest": "../../dist/kj-core", "lib": { "entryFile": "src/public-api.ts" }, ... }
```

`packages/core/src/public-api.ts` is 103 lines of `export * from './<folder>/index'` across 69 folders, including the three heaviest corners:

```ts
// packages/core/src/public-api.ts:79-86
// -- Charts --
export * from './chart/index';
// -- Rich text editor --
export * from './rich-text/index';
// -- Editor --
export * from './editor/index';
```

`packages/components/src/public-api.ts` mirrors it with 69 `export *` lines plus a re-export of 14 concrete core classes (`:77-93`) and 36 core types (`:94-130`).

**Why it matters** — `import { KjButton } from '@kouji-ui/core'` resolves to a single `fesm2022/kouji-ui-core.mjs` containing all 69 features. It *is* correct that `"sideEffects": false` plus Angular's esbuild pipeline will shake this down in a production `ng build`. But:

1. **Nothing enforces it.** There is no size budget on either library (`angular.json` budgets apply only to the `docs` app) and no bundle-size CI check, so a single accidental value-import in a barrel silently pins a megabyte and no one finds out.
2. **Non-Angular-CLI consumers pay.** Webpack 4/5 with a non-default `usedExports` config, Rollup library builds, Jest/Vitest transforms, and SSR `node` resolution all load the whole FESM into memory.
3. **`@defer` cannot help.** A consumer who wants to defer the chart or the rich-text editor has no module boundary to defer *to* — `@defer` needs a dynamic import of a narrow module, and there is only one.
4. It removes the option of making the heavy peers install-time-optional at the *resolution* level rather than only via `peerDependenciesMeta`.

**Fix** — Add secondary entry points for the heavy and independently-useful corners of core — at minimum `@kouji-ui/core/chart`, `/rich-text`, `/editor`, `/table` — by dropping an `ng-package.json` in each folder (`{"lib":{"entryFile":"index.ts"}}`) and removing those four lines from the root `public-api.ts` (a major bump, or keep the root re-export for one deprecation cycle). Mirror in `packages/components`. Then move `echarts`/`monaco-editor`/`lexical` peers off the root package and onto the sub-entry-points' own `package.json`. Independently and immediately: add a `bundlesize`/`size-limit` CI gate asserting the gzipped cost of `import { KjButton } from '@kouji-ui/components'` in a fixture app — that is the regression test this whole aspect is missing.

**Effort:** L

---

### F-4 `marked` and `@tanstack/virtual-core` are hard dependencies every consumer installs

**Severity:** medium · **Confidence:** high
**Files:** `packages/components/package.json`, `packages/components/src/chat/markdown.ts`, `packages/components/src/chat/index.ts`, `packages/components/src/table/table-virtual.ts`, `packages/core/package.json`, `packages/core/src/table/table.ts`

**Evidence**

```json
// packages/components/package.json
  "dependencies": {
    "@tanstack/virtual-core": "^3.14.0",
    "marked": "^18.0.11"
  },
```

```ts
// packages/components/src/chat/markdown.ts:1
import { marked, type Token, type TokensList } from 'marked';
```

```ts
// packages/components/src/chat/index.ts:19  — reachable from public-api.ts:16
export { renderMarkdown, type KjMdBlock } from './markdown';
```

```ts
// packages/components/src/table/table-virtual.ts:11-17
import {
  Virtualizer, elementScroll, observeElementOffset, observeElementRect,
  type VirtualItem,
} from '@tanstack/virtual-core';
```

`packages/core/package.json` does the same with `"dependencies": { "@tanstack/angular-table": "^8.21.4" }`, statically value-imported at `packages/core/src/table/table.ts:7` and `grid-api-impl.ts:14`.

Note the asymmetry: `echarts`, `monaco-editor` and the nine `@lexical/*` packages are all *optional peers* precisely because they are lazily loaded. `marked` (a markdown parser used by exactly one component) and the two TanStack packages get no such treatment.

**Why it matters** — Someone installing `@kouji-ui/components` for a button downloads `marked` and `@tanstack/virtual-core` on every `pnpm install`, in every CI run, in every Docker layer. These are value-level static imports, so whether they reach the *bundle* depends entirely on tree-shaking (F-3) — and `marked`'s own package does not declare `"sideEffects": false` at the versions I am aware of, which makes webpack keep the module even when `renderMarkdown` is unreferenced. *(Confidence on the `marked` sideEffects claim specifically is medium — `node_modules` is not installed in this worktree, so I could not read `marked/package.json` directly; verify before acting.)*

**Fix** — Apply the pattern that already works for Lexical: give `chat-message.ts` a `KJ_MARKDOWN` loader token defaulting to `await import('./markdown')`, and move `marked` to an optional peer. For the table, the `@tanstack/*` packages are load-bearing for a table that always renders, so the right move is F-3 — put the table on its own entry point and hang its peers there. At minimum, add `"sideEffects": false` assertions to the `allowedNonPeerDependencies` review and document the install cost.

**Effort:** M

---

### F-5 Two aggregator stylesheets the docs build depends on are never published

**Severity:** medium · **Confidence:** high
**Files:** `angular.json`, `packages/core/ng-package.json`, `packages/core/package.json`, `packages/components/ng-package.json`, `packages/components/package.json`

**Evidence** — The docs build registers four global sheets:

```json
// angular.json  (docs -> build -> options -> styles)
"styles": [
  "packages/themes/src/index.css",
  "packages/core/src/styles.css",
  "packages/components/src/overlay/overlay.css",
  "apps/docs/src/styles.css"
],
```

`packages/core/ng-package.json` ships only three CSS assets, and `styles.css` is not among them:

```json
"assets": [
  { "input": "src/typography", "glob": "prose.css", "output": "typography" },
  { "input": "src/icon",       "glob": "icon.css",   "output": "icon" },
  { "input": "src/motion",     "glob": "motion.css", "output": "motion" }
]
```

`packages/components/ng-package.json` has **no `assets` block at all**, and `packages/components/package.json` has **no `exports` map at all** — so `overlay/overlay.css` never reaches `dist/kj-components`. Yet the file's own header says it is mandatory:

```
/* packages/components/src/overlay/overlay.css:1-21
   @kouji-ui/components — overlay-family aggregator
   ... This aggregator exists so the directive-level API (e.g.
   `<kj-dropdown-menu-content>` straight from `@kouji-ui/core`)
   is styled without forcing consumers to instantiate the wrapper
   component.
   Register this file once in your build configuration ... */
```

And `packages/core/src/styles.css:8-14` says *"Register that one file alongside this one in your build."* A grep of `scripts/`, `package.json`, `turbo.json` and `.github/` for `overlay.css` or `styles.css` returns nothing, so no build step copies them.

**Why it matters** — A consumer following the components' own documentation cannot import either file: `@kouji-ui/core/styles.css` is not in core's `exports` map, and `@kouji-ui/components/overlay/overlay.css` does not exist in the published tarball. Every overlay used through the headless core API renders unstyled. This is a correctness bug that presents as a bundle/delivery bug.

**Fix** — Add `{"input": "src", "glob": "styles.css"}` to core's `ng-package.json` assets and an `"./styles.css"` entry to core's `exports`; add an `assets` block to `packages/components/ng-package.json` for `src/overlay/overlay.css` plus an `exports` map exposing `"./overlay.css"`. Then add a packaging smoke test that `pnpm pack`s each dist and asserts every documented CSS subpath resolves.

**Effort:** S

---

### F-6 `await import('echarts')` forces the full ~1 MB ECharts chunk to be emitted even for consumers using `provideECharts`

**Severity:** medium · **Confidence:** medium
**Files:** `packages/core/src/chart/chart.ts`, `packages/core/src/chart/echarts.ts`

**Evidence**

```ts
// packages/core/src/chart/chart.ts:132-136
        // provideECharts, else fall back to a dynamic import of the full module.
        const echarts: KjEChartsCore = this.echartsLoader
          ? await this.echartsLoader()
          : await import('echarts');
        const chart = echarts.init(this.el.nativeElement) as EChartsType;
```

The `provideECharts` doc explicitly sells the alternative (`echarts.ts:29-31`): *"Typically returns the consumer's own `echarts/core` namespace … trading the ~1 MB full bundle for a minimal tree-shaken one."*

**Why it matters** — The `this.echartsLoader ? … : …` branch is a *runtime* decision, so a bundler must still statically resolve `import('echarts')` and emit a chunk for the whole 1 MB build. A consumer who did everything right — registered a 90 KB `echarts/core` build via `provideECharts` — still gets the full ECharts chunk written into `dist/`, inflating deploy artifacts and (for consumers who treat unreferenced chunks as prefetch candidates) potentially transferred. It also makes `echarts` a hard *build-time* resolution requirement for anyone who renders a `[kjChart]`, despite being declared `optional: true` under `peerDependenciesMeta`.

**Fix** — Make the fallback opt-in rather than baked in: drop the `import('echarts')` branch from `chart.ts` and either (a) require `provideECharts`, throwing a dev-mode error with the exact snippet when `KJ_ECHARTS` is null, or (b) ship the convenience default as a separate `provideEChartsFull()` helper in its own module so the static reference lives only in code that a consumer explicitly imports. Option (b) preserves the zero-config story. *(Confidence is medium on the exact emit behaviour: it depends on the consumer bundler's treatment of an unresolvable optional dependency, and `node_modules` is absent in this worktree so I could not build to confirm.)*

**Effort:** S

---

### F-7 Zero `@defer` in the library and only one in the docs app

**Severity:** medium · **Confidence:** high
**Files:** `packages/*/src` (0 occurrences), `apps/docs/src/app/app.ts`

**Evidence** — A grep for `@defer` across `packages/core/src` and `packages/components/src` returns **0 files**. The entire docs app has exactly one:

```ts
// apps/docs/src/app/app.ts:31
    @defer (when isBrowser) {
      <kj-progress-bar />
    }
```

Meanwhile the docs shell eagerly instantiates the command palette on every route:

```ts
// apps/docs/src/app/app.ts:33 (template) + components/search/search.component.ts:2-6
    <kj-search />
import { KjCommandPaletteComponent, KjCommandItemComponent, KjCommandPaletteItemTemplate } from '@kouji-ui/components';
```

**Why it matters** — `@defer` is the Angular-native answer to exactly the problem F-3 describes, and the library does not demonstrate it once. The docs site is the reference implementation consumers copy; it should be showing `@defer (on interaction)` around the chart, the Monaco editor, the rich-text editor and the search palette, not eagerly mounting a command palette that is only reachable by keyboard shortcut.

**Fix** — In `apps/docs`: wrap `<kj-search />` in `@defer (on interaction; on idle)` with a placeholder, and wrap the chart / editor / rich-text panels inside `component-doc` in `@defer (on viewport)`. In the library: add a `@defer`-based example to each of the chart, editor and rich-text `_examples` folders so the documented usage *is* the deferred usage. Once F-3 lands, the docs' own `@defer` blocks become the proof the entry-point split works.

**Effort:** M

---

### F-8 412 example files and 68 playgrounds are compiled into every library build

**Severity:** low · **Confidence:** high
**Files:** `packages/core/tsconfig.lib.json`, `packages/components/tsconfig.lib.json`

**Evidence**

```json
// packages/core/tsconfig.lib.json  (and the components twin, verbatim)
  "include": ["src/**/*.ts"],
  "exclude": ["**/*.spec.ts"],
```

Measured in the worktree: 412 `*.example.ts` files totalling 673,396 bytes and 68 `*.playground.ts` files totalling 224,908 bytes — roughly 880 KB of source that is neither tested nor shipped, compiled on every `ng build kj-core` / `kj-components`.

**Why it matters** — ng-packagr rolls the FESM from `entryFile` only, so unreachable examples are dropped from the artifact; this is build *time*, not bundle size. But `exclude` listing only `**/*.spec.ts` is precisely why F-2 was able to happen silently: nothing structurally prevents an example from entering the published graph, so the safety property depends on 141 barrel files each remembering not to re-export `./_examples`.

**Fix** — Add `"**/_examples/**"` and `"**/*.playground.ts"` to `exclude` in both `tsconfig.lib.json` files. This turns F-2 from a silent leak into a compile error and cuts library build time. Give the docs app its own tsconfig include path for the example sources (it already resolves them through the `@kouji-ui/components/*` tsconfig path).

**Effort:** S

---

### F-9 Dead heavy dependencies in the dependency graph

**Severity:** low · **Confidence:** medium
**Files:** `package.json`, `apps/docs/package.json`

**Evidence**

```json
// apps/docs/package.json
  "dependencies": {
    "@codemirror/lang-markdown": "^6.5.0",
    ...
```
```json
// package.json (root)
    "codemirror": "^6.0.2",
```

A grep for `codemirror` across `apps/docs/src` and `packages/*/src` (all extensions) returns **zero** matches — the editor story is Monaco, not CodeMirror. Also worth noting: `apps/docs/package.json` declares `@kouji-ui/components` but **not** `@kouji-ui/core`, despite `apps/docs/src` importing from `@kouji-ui/core` directly (e.g. `app.config.ts:15`, `pages/getting-started/getting-started.ts`) — it resolves only through the root `tsconfig.json` `paths` mapping. And `@types/echarts: ^5.0.0` is a devDependency against `echarts: ^6.0.0`.

**Why it matters** — Install and CI time, plus a misleading signal about what the library actually depends on. The missing `@kouji-ui/core` entry in docs means the docs app would not build from the published packages, which is the only realistic way to catch F-5.

**Fix** — Remove `codemirror` and `@codemirror/lang-markdown`; add `@kouji-ui/core: workspace:*` to `apps/docs/package.json`; drop `@types/echarts` (echarts 6 ships its own types). Add `depcheck`/`knip` to CI. *(Confidence medium only because a dep could be referenced from a config or a script I did not enumerate — verify with `knip` before deleting.)*

**Effort:** S

---

### F-10 `packages/core/package.json` declares an `exports` map with no `"."` entry

**Severity:** low · **Confidence:** low
**Files:** `packages/core/package.json`

**Evidence**

```json
// packages/core/package.json
  "module": "../../dist/kj-core/fesm2022/kouji-ui-core.mjs",
  "typings": "../../dist/kj-core/types/kouji-ui-core.d.ts",
  "exports": {
    "./icon/icon.css":       { "style": "./icon/icon.css",       "default": "./icon/icon.css" },
    "./typography/prose.css":{ "style": "./typography/prose.css","default": "./typography/prose.css" },
    "./motion/motion.css":   { "style": "./motion/motion.css",   "default": "./motion/motion.css" }
  },
```

Under Node ESM resolution, a package with an `exports` field and no `"."` key cannot be imported as `@kouji-ui/core` at all (`ERR_PACKAGE_PATH_NOT_EXPORTED`), and `module`/`typings` are ignored.

**Why it matters** — In practice ng-packagr generates the dist `package.json` and merges the source `exports` with its own generated `"."` / `"./package.json"` entries, so this is probably fine. I am flagging it at **low confidence** because `node_modules` and `dist/` are absent from this worktree and I could not read a built artifact to confirm the merge, and because the `"module"`/`"typings"` paths pointing at `../../dist/...` from the *source* package.json suggest some hand-maintenance here that a future ng-packagr version could stop tolerating.

**Fix** — Build core once and assert on `dist/kj-core/package.json` that `exports["."]` exists with `types`/`default` conditions, then add that assertion to the release pipeline alongside the F-5 packaging smoke test.

**Effort:** S

---

## Import -> pulls-in table (worst offenders)

| Import | Pulls in | Cited at |
|---|---|---|
| `provideLucideIcons()` (docs does this in the **root** `app.config.ts`) | The full `lucide-static` namespace, ~1,700 SVG strings, ~300 KB gzipped, iterated with `Object.entries` so no per-icon shaking is possible | `provide-lucide-icons.ts:8,52-56`; `app.config.ts:30` |
| `export * from './icon/index'` in the public barrel | `_examples` -> `KjIconGalleryExample` -> `LUCIDE_ICON_NAMES` (31 KB generated array) + `KjInputComponent` + `KjButtonComponent` + `FormsModule` | `icon/index.ts:2-5`; `icon.gallery.example.ts:8-12`; `icon-names.generated.ts` |
| `export * from './input-mask/index'` in the public barrel | 6 example components + `KjFieldComponent`/`KjFieldLabelComponent`/`KjFieldHelpComponent` + `ReactiveFormsModule` | `input-mask/index.ts:2-9` |
| `npm i @kouji-ui/components` (any component, even `KjButton`) | `marked` + `@tanstack/virtual-core` as hard install-time deps; `marked` is value-imported from a barrel-reachable module | `components/package.json` deps; `chat/markdown.ts:1`; `chat/index.ts:19`; `table-virtual.ts:11-17` |
| `npm i @kouji-ui/core` | `@tanstack/angular-table` as a hard install-time dep, value-imported by the table | `core/package.json` deps; `core/src/table/table.ts:7` |
| Rendering any `[kjChart]` | The full `echarts` build emitted as a chunk **even when `provideECharts` supplies a tree-shaken `echarts/core`** | `chart.ts:132-136` |
| `import { KjButton } from '@kouji-ui/core'` | Resolves to the single `fesm2022/kouji-ui-core.mjs` containing all 69 feature folders — correct output depends entirely on the consumer's tree-shaker, with no size budget or CI gate asserting it | `core/ng-package.json`; `core/src/public-api.ts` (103 lines of `export *`) |

**Good news for contrast** — these chains are *clean* and should stay as they are: `import { KjRichTextEditorComponent }` pulls **no** Lexical (`rich-text/index.ts:1-3`, `rich-text-editor.ts:224`); `import { KjEditor }` pulls **no** Monaco (`editor.types.ts:1,8`, `editor.loader.ts:63`); `import { bulletList }` pulls `@lexical/list` only when `load()` runs (`features/list.ts:23`).

## Entry-point restructure needed

```
packages/core/
  ng-package.json                      # root entry — foundation + forms + overlay + nav + feedback
  src/chart/ng-package.json            # NEW -> @kouji-ui/core/chart      (echarts peer moves here)
  src/rich-text/ng-package.json        # NEW -> @kouji-ui/core/rich-text  (9 lexical peers move here)
  src/editor/ng-package.json           # NEW -> @kouji-ui/core/editor     (monaco peers move here)
  src/table/ng-package.json            # NEW -> @kouji-ui/core/table      (@tanstack/angular-table moves here)

packages/components/
  ng-package.json                      # root entry
  src/chart/ng-package.json            # NEW -> @kouji-ui/components/chart
  src/rich-text/ng-package.json        # NEW -> @kouji-ui/components/rich-text
  src/editor/ng-package.json           # NEW -> @kouji-ui/components/editor
  src/table/ng-package.json            # NEW -> @kouji-ui/components/table       (@tanstack/virtual-core moves here)
  src/chat/ng-package.json             # NEW -> @kouji-ui/components/chat        (marked moves here)
  src/icon/lucide/ng-package.json      # NEW -> @kouji-ui/components/icon/lucide (lucide-static moves here)
```

Each new `ng-package.json` is `{"$schema":"../../../node_modules/ng-packagr/ng-package.schema.json","lib":{"entryFile":"index.ts"}}`. Remove the corresponding `export * from './<folder>/index'` lines from each root `public-api.ts` — this is a **major** bump for both packages, so land it as one changeset with a migration table in the changelog. Keep the root re-exports for exactly one minor with `@deprecated` TSDoc if a softer landing is wanted.

## Recommended work items

1. **F-2, F-8** — Delete the `_examples` re-export blocks from `packages/components/src/icon/index.ts` and `input-mask/index.ts`; add `"**/_examples/**"` and `"**/*.playground.ts"` to `exclude` in both `tsconfig.lib.json` files so the leak becomes a compile error. *(S — do this first; it is the only finding that is pure removal.)*
2. **F-5** — Publish `packages/core/src/styles.css` (ng-package `assets` + `exports["./styles.css"]`) and `packages/components/src/overlay/overlay.css` (new `assets` block + a new `exports` map). Add a `pnpm pack` smoke test asserting every documented CSS subpath resolves. *(S — this is a live correctness bug for consumers.)*
3. **F-3 (gate half)** — Add a `size-limit` CI job with a fixture app measuring the gzipped cost of `import { KjButton } from '@kouji-ui/components'` and of `import { KjChartComponent }`. Land this *before* any restructuring so every later item has a number attached. *(S)*
4. **F-1** — Ship `provideLucideLoader()` on top of the existing `provideIconLoader`, add a `provideLucideIcons(names)` subset overload, move `LUCIDE_ICON_NAMES` behind a lazy accessor, switch `apps/docs/src/app/app.config.ts:30` to the loader, and fix the stale `provideLucideLoader()` reference in `icon.gallery.example.ts:17`. *(M — biggest single win, measurable against item 3.)*
5. **F-9** — Run `knip`; drop `codemirror`, `@codemirror/lang-markdown`, `@types/echarts`; add `@kouji-ui/core` to `apps/docs/package.json`. *(S)*
6. **F-6** — Move the `import('echarts')` fallback out of `chart.ts` into an opt-in `provideEChartsFull()` module. *(S)*
7. **F-7** — Wrap `<kj-search />` in `@defer (on interaction; on idle)`; add `@defer (on viewport)` around the chart / editor / rich-text panels in `component-doc`; add one `@defer` example per heavy component folder. *(M)*
8. **F-4, F-3** — The entry-point split. Do the four core sub-entries first (`chart`, `rich-text`, `editor`, `table`), verify against the item-3 numbers, then the components mirror, moving `marked`, `@tanstack/virtual-core`, `@tanstack/angular-table` and `lucide-static` onto their owning entry points. One changeset, major bump, migration table. *(L)*
9. **F-10** — Assert `exports["."]` on the built `dist/kj-core/package.json` in the release pipeline. *(S — folds into item 2's smoke test.)*

## Open questions

- `node_modules` is not installed in this worktree, so I could not read the `sideEffects` flag of `marked`, `lucide-static`, `echarts` or the `@tanstack/*` packages, nor build a bundle to measure anything. Every size number quoted here is either from source bytes I measured directly or from the repo's own TSDoc (`provide-lucide-icons.ts:68` claims ~300 KB gzipped; `echarts.ts:30` claims ~1 MB). **Item 3 above exists to replace these estimates with measurements — do it before acting on F-1 or F-3.**
- Was the two-barrel `_examples` leak (F-2) deliberate — e.g. does some docs page import `KjIconGalleryExample` from `@kouji-ui/components` directly rather than through `EXAMPLE_LOADERS`? I found no such import, but I did not exhaustively enumerate docs templates.
- `packages/components/src/example-components.ts` maps `./icon/_examples` at line 57 and `./input-mask/_examples` at line 60, i.e. both leaked folders are *also* in the lazy registry. That strongly suggests the barrel exports are vestigial, but confirm with whoever ran `scripts/migrate-examples.mjs`.
- Is the F-3 restructure acceptable as a major bump now, at `@kouji-ui/core@0.8.0` / `components@0.9.0`? Pre-1.0 is the cheapest this will ever be; after 1.0 it is a much harder sell.
- `apps/docs` builds against `tsconfig.json` source `paths`, never against `dist/`. Should there be a CI job that builds docs against the *packed* tarballs? That is the only way F-5-class packaging bugs get caught before a consumer hits them.
- `rules/stack.md` says "Zero external UI deps — No Angular CDK", but `@angular/cdk` is a peer dependency of both packages and a root dependency. Out of scope for this aspect, but it affects install weight and someone should reconcile the rule with reality.
