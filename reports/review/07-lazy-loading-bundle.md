# Lazy Loading, Tree-Shaking and Bundle Shape Review

> **No build was run.** `node_modules/` and `dist/` do not exist in this worktree
> (`ls -d node_modules dist` → both missing), and the brief forbids installing or
> building. **Every byte figure in this report is a source-derived estimate, not a
> measurement.** Estimates are marked *(est.)*. The structural claims (what imports
> what, what is static vs. dynamic, what a barrel re-exports) are read directly off
> the source at HEAD and are not estimates.

## Verdict

The **library** side of this repo is in better bundle shape than its dependency list
suggests. Every genuinely dangerous dependency — `echarts`, `monaco-editor` +
`@monaco-editor/loader`, `lexical` + all eight `@lexical/*` — is reached **only**
through a dynamic `import()` or a DI-injected loader; not one is statically
value-imported from anywhere reachable from either `public-api.ts`.
`packages/core/src/rich-text/index.ts` goes out of its way to keep the Lexical engine
behind a lazy boundary and documents why, and `packages/core/src/chart/echarts.ts`
offers a `provideECharts` escape hatch so consumers can swap the ~1 MB build for a
tree-shaken one. CSS is delivered per-component via `styleUrl`, not as one global
sheet. Docs routes are all `loadComponent`. That is the hard part, and it is done.

What drags the grade down is a set of avoidable leaks around the edges: the styled
`<kj-chart>` in `@kouji-ui/components` re-implements the core chart and **ignores**
`provideECharts`, so the components-layer chart always pulls full ECharts;
`provideLucideIcons()` is an all-or-nothing namespace import of ~1 700 icons with no
subset API, diverging from the accepted icons design spec; the docs
`component-doc` route statically aggregates **69** playground modules, pulling
essentially the entire component library into one route chunk — directly
contradicting the lazy example registry pattern the repo uses for examples; `marked.use()` runs at
module scope in a package that declares `sideEffects: false`; and `_examples`
components leak into the published barrels in two places. None of these make the
library unusable, so nothing here is critical.

**Grade: B** — revised from B− after verification: the two findings originally rated
high (F-1, F-2) are both real but were mis-sized. F-1 is docs-app-only and its chunk was
never measured; F-2 is an API-surface gap with a working tree-shakable escape hatch, and
its runtime/SSR limb was factually wrong. No finding in this report is now rated high.

## What works

- **ECharts is never eagerly imported.** `packages/core/src/chart/chart.ts:133-135`
  resolves it from DI first and only falls back to `await import('echarts')`.
  `packages/core/src/chart/echarts.ts:45` / `:73` expose `KJ_ECHARTS` +
  `provideECharts` so a consumer can register a tree-shaken `echarts/core` build.
  Every other `echarts` reference in `packages/` is `import type`.
- **Monaco is never bundled at all.** `packages/core/src/editor/editor.loader.ts:63`
  — `const mod = await import('@monaco-editor/loader');` — and the loader pulls
  Monaco from a CDN at runtime. `packages/core/src/editor/editor.types.ts:8` uses
  `typeof import('monaco-editor')`, a pure type reference. `provideMonacoLanguages`
  keeps per-language contributions behind per-id loaders.
- **Lexical is fully behind a lazy boundary, deliberately.**
  `packages/core/src/rich-text/index.ts:1-4` states the invariant, and
  `packages/core/src/rich-text/rich-text-editor.ts:224` honours it
  (`await import('./engine')`). `engine.ts:14-39` is the only place that statically
  value-imports `lexical` / `@lexical/rich-text` / `@lexical/selection` /
  `@lexical/html`, and it is reached only through that dynamic import. Every optional
  feature (`list`, `code`, `history`, `markdown`, `link`, `image`, `quote`, `heading`)
  loads its own `@lexical/*` package inside its `load()`
  (`packages/components/src/rich-text/features/*.ts`).
- **Optional peers are declared optional.** `packages/core/package.json` marks
  `echarts`, all `@lexical/*`, `lexical`, `monaco-editor` and `@monaco-editor/loader`
  as `peerDependenciesMeta.optional`, matching the lazy-import reality.
- **Per-component CSS, not one global sheet.** 74 `styleUrl` declarations across
  `packages/components/src`, each pointing at its own co-located `*.css`. A consumer
  who uses two components gets two stylesheets' worth of CSS, not 69.
- **Docs routing is entirely lazy.** `apps/docs/src/app/app.routes.ts` uses
  `loadComponent` for all 9 route entries; nothing is eagerly routed.
- **The example registry is correctly code-split.**
  `packages/{core,components}/src/example-components.ts` map folder →
  `() => import('./<folder>/_examples')`, consumed by
  `apps/docs/src/app/services/example-registry.service.ts` with a per-folder promise
  cache. These files are dev-only: reachable solely through the `@kouji-ui/*/examples`
  **tsconfig path aliases** (`tsconfig.json:13,16`), absent from both `public-api.ts`
  files and from every `ng-package.json`, so they are not shipped to consumers.
- **`@stackblitz/sdk` is lazy** in docs
  (`apps/docs/src/app/components/code-preview/code-preview.ts:190`).
- **`culori` never enters the packages.** It appears only under
  `apps/docs/src/app/lib/theme/`, reached only from the lazy `theme-generator` route.
- **`sideEffects: false` is almost entirely truthful.** A scan of every non-spec,
  non-example, non-playground `.ts` under both `src/` trees for top-level executable
  statements returned exactly two real hits, both in one file (see F-6). The
  module-level `new InjectionToken(...)` calls are exactly the case `sideEffects:false`
  exists to make droppable.
- **`@kouji-ui/themes` is honest** about being side-effectful:
  `packages/themes/package.json:26` declares `"sideEffects": ["**/*.css"]` and ships a
  proper `exports` map with a `./themes/*.css` wildcard.

## Findings

### F-1 Docs `component-doc` route chunk eagerly bundles all 69 playgrounds, pulling most of the styled library into one lazy chunk (docs app only)

**Severity:** medium · **Confidence:** high (mechanism) / none (size — never measured)
**Files:** `apps/docs/src/app/pages/component-doc/component-doc.ts:24`,
`apps/docs/src/app/pages/component-doc/playground-files/index.ts:2-7,16-23`,
`apps/docs/src/app/pages/component-doc/playground-files/bucket-f.ts:5,12,13`,
`apps/docs/src/app/pages/component-doc/playground-types.ts:46`,
`apps/docs/src/app/pages/component-doc/playground.ts:109`

> **Verification (2026-09-15).** Every quoted line re-verified at HEAD and the mechanism
> holds. **Downgraded high → medium**: the chunk was never measured, and the blast radius
> is the docs app alone. Two sourcing errors are corrected inline below.

**Evidence**

`component-doc.ts:24`:

```ts
import { PLAYGROUND_FILES } from './playground-files';
```

`playground-files/index.ts:2-7,16-23`:

```ts
import { BUCKET_A_FILES } from './bucket-a';
import { BUCKET_B_FILES } from './bucket-b';
import { BUCKET_C_FILES } from './bucket-c';
import { BUCKET_D_FILES } from './bucket-d';
import { BUCKET_E_FILES } from './bucket-e';
import { BUCKET_F_FILES } from './bucket-f';
...
export const PLAYGROUND_FILES: Record<string, PlaygroundFile> = {
  ...BUCKET_A_FILES,
  ...BUCKET_B_FILES,
  ...
};
```

The six buckets contain **69 static** `import { PLAYGROUND as … }` lines
(`grep -c "^import { PLAYGROUND"` → 12/12/11/11/11/12). `bucket-f.ts:5,12,13`:

```ts
import { PLAYGROUND as TablePlayground } from '@kouji-ui/components/table/table.playground';
import { PLAYGROUND as RichTextEditorPlayground } from '@kouji-ui/components/rich-text/rich-text-editor.playground';
import { PLAYGROUND as ChartPlayground } from './chart.playground';
```

**Why the registry cannot be tree-shaken.** `playground-types.ts:46` declares
`readonly component: Type<unknown>` — a live class reference, not a source string — and
`playground.ts:109` instantiates it (`const ref = vcr.createComponent(pf.component);`).
`PLAYGROUND_FILES` is a module-scope object literal holding all 69 of those class
references, so every one of them is retained regardless of `sideEffects: false` on both
packages. The transitive pull is confirmed by reading the chain: `table.playground.ts:3`
imports `KjTableComponent`; `table.ts:34` runtime-imports `KjTableVirtual`;
`table-virtual.ts:11-17` runtime-imports `@tanstack/virtual-core` (a value import, not
`import type`); and `packages/core/src/table/{table,grid-api,grid-api-impl}.ts`
runtime-import `@tanstack/angular-table`. `bucket-b.ts:5` puts the command palette in the
same registry. The docs shells do **not** already drag the library in
(`main-layout.ts:3` imports only `KjSkipLinkComponent`; `docs-shell` and `app.ts` import
nothing from `@kouji-ui/components`), so the playground registry is genuinely what pulls
the library into the `/docs/*/:slug` chunk. Nothing in `fd6dd34e..HEAD` touches it, and
there is no spec for `component-doc`, `playground`, or the buckets.

**Correction — where the design note actually lives.** An earlier draft of this finding
attributed the "only pulls component X's examples" promise to a *sibling*
`example-components.ts` next to `component-doc.ts`. No such file exists there
(`ls apps/docs/src/app/pages/component-doc/` → `playground-files/`, `component-doc.*`,
`playground-types.ts`, `playground.*`). The note is in
`packages/components/src/example-components.ts:5-11` and
`packages/core/src/example-components.ts` ("opening the docs page for component X only
pulls component X's examples, not the entire library"), with the fuller version in
`apps/docs/src/app/services/example-registry.service.ts:20-26` ("opening one component's
page only downloads the examples for that component, not the whole library"). The
contrast is real; the file pointer was wrong.

**Correction — the size figure is withdrawn.** No build was run (see the banner at the
top of this report). The "~225 KB" previously quoted here is the byte sum of the 68
`*.playground.ts` **authoring sources** — mostly template strings and knob signals — not
the compiled transitive payload that actually dominates the chunk, and it is
pre-minification and pre-gzip. **The chunk has not been measured.** Treat the size of
this regression as unknown until someone runs `pnpm --filter docs build` and reads the
stats for the `component-doc` chunk.

**Scope limits.** These bound the impact and were missing from the first draft:

- **No library consumer is affected.** `grep -n playground packages/components/package.json`
  → no match: playground files are absent from the published `exports` map and reach the
  docs app only through the `tsconfig.json:17` `@kouji-ui/components/*` **source** path
  alias.
- **The initial bundle is untouched.** Both `/docs/headless/:slug` and
  `/docs/components/:slug` are `loadComponent` routes (`app.routes.ts:52,57`), so the
  `angular.json:124-135` budgets (800 kB warn / 1500 kB error on `initial`) do not see
  this chunk — and equally do not guard it.
- **It amortises.** `angular.json:109` sets `"outputMode": "static"` and `:136`
  `"outputHashing": "all"`, so the oversized chunk is CDN-cached and fetched once per
  session. Docs users browse many component pages in a row, so the per-page cost is far
  below what "opening the Badge page downloads the table, the rich-text editor and the
  command palette" implies — that is a first-visit cost, not a per-page cost.
- No correctness, accessibility, API or security impact.

**Fix.** Mirror the pattern the repo already uses for examples. Convert
`PLAYGROUND_FILES` from static class references into
`PLAYGROUND_LOADERS: Record<string, () => Promise<PlaygroundFile>>` of dynamic imports,
resolved the way `ExampleRegistryService` resolves `EXAMPLE_LOADERS` (per-key memoised
promise cache), so each playground becomes its own chunk.
`scripts/migrate-examples.mjs` already emits precisely this shape. A `@defer` around the
playground stage is a useful partial measure but does **not** break the static module
graph on its own — the registry has to stop holding class references first.

**Effort:** M

---

### F-2 `provideLucideIcons()` has no subset overload, so the convenient Lucide API is not tree-shakable — diverging from the icons design spec

**Severity:** medium · **Confidence:** high (API gap) / unverified (bundle figures)
**Files:** `packages/components/src/icon/lucide/provide-lucide-icons.ts:8,52-53,98-105`,
`packages/components/src/icon/lucide/index.ts`,
`packages/core/src/icon/index.ts:15-19`,
`docs/superpowers/specs/2026-05-07-icons-design.md:244-250`,
`packages/components/src/icon/_examples/icon.gallery.example.ts:12,17`

> **Verification (2026-09-15).** The API-surface claim survives and every quoted line
> matches HEAD. **Downgraded high → medium**, and the *performance* limb of the original
> finding is **withdrawn as factually wrong** (see below). This is a documented
> API-ergonomics gap with a working escape hatch, not a measured bundle regression.

**Evidence**

`provide-lucide-icons.ts:8` and `:52-53`:

```ts
import * as lucideIcons from 'lucide-static';
...
  const map = lucideIcons as unknown as Record<string, string>;
  for (const [pascal, svg] of Object.entries(map)) {
```

`provide-lucide-icons.ts:98-105` — the only exported entry point, taking **no
arguments**:

```ts
export function provideLucideIcons(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideEnvironmentInitializer(() => {
      const registry = inject(KJ_ICON_REGISTRY);
      registry.update((m) => ({ ...m, ...buildLucideRegistry() }));
    }),
  ]);
}
```

`Object.entries` over a namespace import is a tree-shaking escape *by construction*: no
bundler can prove which of the 1 708 exports are reachable. `icon/lucide/index.ts`
exports only `provideLucideIcons` and `LUCIDE_ICON_NAMES`, so there is no
Lucide-flavoured subset path at all. A consumer who wants two icons registers every one.

**The strongest evidence — it diverges from the accepted design.**
`docs/superpowers/specs/2026-05-07-icons-design.md:244-250` specifies a different
signature, built on tree-shaken named imports:

```ts
import { Settings, Trash2, AlertTriangle /* ... tree-shaken */ } from 'lucide-static';
import { provideIcons } from '@kouji-ui/core/icon';

export function provideLucideIcons(
  set: Record<string, string>,
): EnvironmentProviders {
```

The shipped zero-arg version is an **undocumented divergence from the accepted spec**.
Compounding it, `icon.gallery.example.ts:17` still documents a `provideLucideLoader()`
that exists nowhere in the tree — so the public docs describe lazy per-icon loading that
never shipped.

The tree-shakable primitives *do* exist — `provideIcons` / `provideIconLoader`,
`packages/core/src/icon/index.ts:15-19`, and the icon TSDoc carries `@doc-is-main`
(`rules/tsdoc.md:54`) — but they are a *different* API from the convenient one. That gap
is the defect.

**Withdrawn — the runtime/SSR limb.** The original finding claimed
`buildLucideRegistry()` runs "once per bootstrap, i.e. once per route during prerender".
That is wrong. `provide-lucide-icons.ts:47-50` memoises at module scope:

```ts
let _registryEntries: Record<string, string> | null = null;
function buildLucideRegistry(): Record<string, string> {
  if (_registryEntries) return _registryEntries;
```

and `angular.json:109` sets `"outputMode": "static"`, so prerender runs every route in a
single Node process. The ~1 708 × 8 regex chain executes **once per process**, not once
per route. Delete this concern.

**Requalified — `icon-names.generated.ts`.** It is a 31 KB kebab-name **string array**
consumed by the gallery (`icon.gallery.example.ts:12` imports `LUCIDE_ICON_NAMES`), not
icon payload. It is cited here only to establish the 1 708 count
(`wc -l` → 1708; 31 128 bytes), and is a separate, minor cost — not bundle-weight
evidence for the namespace import.

**Reframed — the docs app is not the defect.** `apps/docs` ships an icon *gallery* that
renders and filters all 1 708 names, so `provideLucideIcons()` at its root is what that
app actually needs. Framing a showcase site loading its showcase data as the bug inverts
it. The defect is what a **library consumer** following `@doc-is-main` inherits.

**Unverified — the budget interaction.** No `dist/` or bundle stats exist in this
worktree and `node_modules` is not installed, so no build was run. The "~300 KB gzipped"
figure is the source file's own prose at `:68-72`, not an observation, and Angular
budgets are evaluated in **raw** bytes. Either run a production build of `apps/docs` and
quote the real initial-chunk figure against the `angular.json:124-135` 800 kB warn /
1500 kB error budget, or state the cost structurally — do not assert a budget
interaction that has not been measured. This report does the latter.

Note also that the tradeoff is deliberate and documented at `:61-72`: *"Vite/esbuild
can't reliably code-split per-icon dynamic imports against `lucide-static`'s package
layout, so a single static namespace import is the predictable choice."*

**Fix.** Add the spec's overload — `provideLucideIcons(set?: Record<string, string>)` —
keeping the zero-arg call as the documented convenience for galleries and prototyping,
and export the `encodeSvgDataUrl` helper so a subset registration is a one-liner:

```ts
import { Settings, Trash2 } from 'lucide-static';
provideLucideIcons({ settings: Settings, 'trash-2': Trash2 });
```

Then either ship `provideLucideLoader()` or fix
`icon.gallery.example.ts:17` so the docs stop describing an API that does not exist.

**Effort:** M

---

### F-3 The styled `<kj-chart>` ignores `provideECharts` and always pulls the full ECharts build

**Severity:** medium · **Confidence:** high
**Files:** `packages/components/src/chart/chart.ts:144-145`,
`packages/core/src/chart/chart.ts:131-135`, `packages/core/src/chart/echarts.ts:45,73`

**Evidence**

Core does it right (`packages/core/src/chart/chart.ts:131-135`):

```ts
        // Resolve ECharts from DI: a consumer-provided (tree-shaken) build via
        // provideECharts, else fall back to a dynamic import of the full module.
        const echarts: KjEChartsCore = this.echartsLoader
          ? await this.echartsLoader()
          : await import('echarts');
```

The components-layer chart does not (`packages/components/src/chart/chart.ts:144-145`):

```ts
  private async init(): Promise<void> {
    const echarts = await import('echarts');
```

`grep -n "KJ_ECHARTS\|echartsLoader\|provideECharts" packages/components/src/chart/chart.ts packages/components/src/chart/index.ts`
returns **nothing**. The components chart is a standalone re-implementation, not a
wrapper over `KjChart`.

**Why it matters.** `provideECharts` is documented as the way to trade the "~1 MB full
bundle for a minimal tree-shaken one" (`packages/core/src/chart/echarts.ts:29-30`). A
consumer who registers it and then uses the *styled* `<kj-chart>` — the obvious choice,
since they installed `@kouji-ui/components` — silently gets both: their tree-shaken
`echarts/core` build **and** a lazy chunk containing the full `echarts` module. The
provider appears to work (no error, chart renders) while doing nothing. That is a real
defect a consumer will hit, and it violates the architecture rule that components are
"styled wrappers over core directives" (`rules/architecture.md`).

**Fix.** Make `packages/components/src/chart/chart.ts` compose `KjChart` via
`hostDirectives` (or at minimum inject `KJ_ECHARTS` and use the same
`loader ?? import('echarts')` resolution). Add a spec asserting that a provided
`KJ_ECHARTS` loader is the one invoked.

**Effort:** M

---

### F-4 `@kouji-ui/components` ships CSS assets with no `exports` entry, while `@kouji-ui/core` has one — the documented components stylesheet is not resolvable as a package specifier

**Severity:** medium · **Confidence:** medium
**Files:** `packages/components/package.json` (no `exports` key at all),
`packages/components/ng-package.json:10-16`, `packages/core/package.json:52-69`,
`apps/docs/src/app/pages/getting-started/getting-started.ts:26-32`

**Evidence**

PR #71 (`fb1d1956`) added, to **core** only:

```json
  "exports": {
    "./overlay/overlay.css": {
      "style": "./overlay/overlay.css",
      "default": "./overlay/overlay.css"
    },
```

and, to **components**, only an asset glob (`ng-package.json:10-16`):

```json
  "assets": [
    {
      "input": "src",
      "glob": "**/*.css",
      "output": "src"
    }
  ]
```

`grep -n "exports" packages/components/package.json` → no match.

**Why it matters.** `ng-packagr` writes an `exports` map into the published
`package.json`. Once an `exports` map exists it is an encapsulation boundary: any
subpath not listed is unreachable via a package specifier. Core's four CSS assets are
listed and therefore reachable as `@kouji-ui/core/overlay/overlay.css`; components' 69
copied stylesheets are not listed at all. The documented registration
(`getting-started.ts:29-30`) happens to dodge this because it uses raw filesystem paths:

```
  "node_modules/@kouji-ui/core/overlay/overlay.css",
  "node_modules/@kouji-ui/components/src/overlay/overlay.css",
```

which `angular.json`'s `styles` array resolves off disk, bypassing `exports`. But the
moment a consumer writes `@import '@kouji-ui/components/src/overlay/overlay.css'` in
their own CSS, or uses a bundler/loader that resolves through the package specifier
(Vite, Rollup, `exports`-aware webpack 5), it fails — and the asymmetry with core makes
the failure surprising. The manual core entries are themselves the evidence that
ng-packagr does not auto-export assets; otherwise they would be redundant. *(Confidence
is medium only because I could not run `ng-packagr` to inspect a generated
`dist/kj-components/package.json`.)*

Secondary: the glob copies **all 69** stylesheets into the tarball at `dist/src/**`,
while the same CSS is *also* inlined into each component's compiled `styles` array in
the FESM. Every component stylesheet ships twice in the published package.

**Fix.** Add to `packages/components/package.json` an `exports` block mirroring core's
shape, at minimum `"./src/overlay/overlay.css"` plus any per-family sheet intended to be
registered; better, publish them at a clean path (`"./overlay.css"`, from an
`ng-package.json` asset with `"output": "."`) so `src/` stops leaking into the public
specifier. Narrow the asset glob to the sheets actually meant to be registered globally
instead of `**/*.css`. Add a build-time assertion (a small node script in `release.yml`)
that every path named in Getting Started resolves through the published `exports` map.

**Effort:** S

---

### F-5 `overlay.css` re-ships nine stylesheets that are already inlined into their components

**Severity:** medium · **Confidence:** high
**Files:** `packages/components/src/overlay/overlay.css:37-45`, and the nine `styleUrl`
sites it duplicates

**Evidence**

`packages/components/src/overlay/overlay.css:37-45`:

```css
@import "../popover/popover.css";
@import "../tooltip/tooltip.css";
@import "../dropdown-menu/dropdown-menu.css";
@import "../dialog/dialog.css";
@import "../drawer/drawer.css";
@import "../toast/toast.css";
@import "../confirm-popup/confirm-popup.css";
@import "../sheet/sheet.css";
@import "../action-sheet/action-sheet.css";
```

All nine are simultaneously component styles — verified per file, e.g.
`packages/components/src/popover/popover.ts` carries `styleUrl: './popover.css'`, and
the same holds for tooltip, dropdown-menu, dialog, drawer, toast (2 components),
confirm-popup (7 components), sheet and action-sheet.

**Why it matters.** The fix in PR #71 was correct in intent — a panel composed from the
*headless* directives had no styles, because Angular only injects a component's
`styleUrl` when that component is instantiated. But the chosen remedy makes every
consumer who follows Getting Started pay for the CSS twice: once as a global stylesheet
in the document, once again as a style string inside the component's JS chunk, for every
overlay family they actually use. `popover.css` alone is 3 544 source bytes *(est.;
post-minification will differ)*; the nine total ~25–30 KB *(est.)*. The CSS header at
`:24-25` calls registration "idempotent", which is true for correctness and false for
weight.

**Fix.** Split each overlay family's stylesheet into a *surface* part (the
`.kj-popover-content` chrome the headless composition needs) and a *wrapper* part
(anything only the `<kj-popover>` component renders). Have `overlay.css` `@import` only
the surface parts, and have each component's `styleUrl` point at only the wrapper part.
Neither half then ships twice. Add a spec next to the existing
`packages/components/src/overlay/overlay-styles.spec.ts` asserting no selector appears in
both halves.

**Effort:** M

---

### F-6 `marked.use()` runs at module scope, in a package that declares `sideEffects: false`, mutating the shared global `marked` singleton

**Severity:** medium · **Confidence:** high
**Files:** `packages/components/src/chat/markdown.ts:1,35,47`,
`packages/components/src/chat/index.ts:19`, `packages/components/package.json:49`

**Evidence**

`packages/components/src/chat/markdown.ts:1`, then `:35` and `:47` — the **only two**
top-level executable statements in the entire shipped source of either package (a scan
of every non-spec, non-example, non-playground `.ts` under both `src/` trees for
top-level non-declaration statements returned exactly these two, plus the two
`test-setup.ts` files, which are not reachable from `public-api.ts`):

```ts
import { marked, type Token, type TokensList } from 'marked';
...
marked.use({
  gfm: true,
  breaks: true,
  pedantic: false,
  renderer: {
    html(token) {
      return escapeHtml(typeof token === 'string' ? token : token.raw);
    },
  },
  tokenizer: {},
});

marked.use({
  renderer: {
    text(token) { ... },
  },
});
```

`packages/components/package.json:49`: `"sideEffects": false`. `chat/index.ts:19`
re-exports `renderMarkdown` into `public-api.ts:16`.

**Why it matters.** `marked`'s default export is a process-wide singleton.
`marked.use()` mutates it for *everyone* in the module graph. A consumer who also
depends on `marked` (pnpm dedupes to one instance on a compatible range) silently
inherits kouji's `gfm: true`, `breaks: true` and — more consequentially — the
HTML-escaping `renderer.html` / `renderer.text` overrides, changing the output of their
own `marked.parse()` calls without importing kouji's chat module at all. That is a
genuine cross-package side effect in a package that tells bundlers it has none.

Note that the escaping here is also the module's **sanitizer** (`:31-33`: *"marked
dropped its sanitizer in v5 and passes source HTML through verbatim"*), so it is
load-bearing for safety, not just formatting — another reason to bind it to an instance
rather than leave it as a global mutation whose application depends on module-retention
decisions.

**Fix.** Replace the two module-scope `marked.use()` calls with a private instance:
`const md = new Marked({ gfm: true, breaks: true, pedantic: false, renderer: {…} })`,
created lazily inside `renderMarkdown` (or at module scope as a pure `new`, which
`sideEffects:false` then correctly licenses to be dropped), and call `md.lexer` /
`md.parser` instead of the globals. Add a spec asserting the global
`marked.parse('<b>x</b>')` is unchanged after importing `renderMarkdown`.

**Effort:** S

---

### F-7 `_examples` components leak into the published barrels in two places

**Severity:** medium · **Confidence:** high
**Files:** `packages/components/src/icon/index.ts:2-5`,
`packages/components/src/input-mask/index.ts:2-9`

**Evidence**

`packages/components/src/icon/index.ts`:

```ts
export * from './lucide/index';
export {
  KjIconGalleryExample,
  KjIconUsageExample,
} from './_examples';
```

`packages/components/src/input-mask/index.ts`:

```ts
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

Both barrels are re-exported from `packages/components/src/public-api.ts` (lines 33 and
36). These are the only two — the same grep across every `index.ts` under both `src/`
trees found no others, so the convention is otherwise clean.

**Why it matters.** `ng-packagr` rolls up whatever is reachable from `entryFile`, so
these eight demo components and their transitive imports land in the published FESM
**and** in the flattened `.d.ts`, becoming de-facto public API that semver now covers.
`icon.gallery.example.ts:12` pulls `LUCIDE_ICON_NAMES` (a 31 KB, 1 708-entry array) and
`:10-11` pulls `KjInputComponent` and `KjButtonComponent` into the graph. Tree-shaking
will drop them for a consumer who never references them, so this is tarball and
API-surface weight rather than a shipped-bytes defect — but it also means a rename
inside `_examples/` is a breaking change to a published package.

**Fix.** Delete both `export … from './_examples'` blocks. The docs app already reaches
every example through `EXAMPLE_LOADERS` in `example-components.ts`; confirm these eight
are registered there and adjust `apps/docs` if either was relying on the barrel. Add an
ESLint `no-restricted-imports` rule (or a lint step over the barrels) forbidding
`_examples` and `*.playground` specifiers inside any `index.ts` under `packages/*/src`.

**Effort:** S

---

### F-8 No secondary entry points: one flat barrel per package, with optional-peer type imports flattened into a single `.d.ts`

**Severity:** low · **Confidence:** medium
**Files:** `packages/core/ng-package.json`, `packages/components/ng-package.json`,
`packages/core/src/public-api.ts` (103 lines, ~60 `export *`),
`packages/components/src/public-api.ts` (130 lines, ~69 `export *`)

**Evidence**

Both `ng-package.json` files declare a single `lib.entryFile` and there is no
`ng-package.json` anywhere below `src/` (`find packages -name ng-package.json` → the two
top-level files only). Every symbol in both packages resolves through
`@kouji-ui/core` / `@kouji-ui/components` and nothing else.

**Why it matters.** Runtime tree-shaking is fine — a flat FESM plus an accurate
`sideEffects: false` tree-shakes well under esbuild — so this is not a shipped-bytes
problem. The costs are at the type layer: the rolled-up `kouji-ui-core.d.ts` will
contain `import … from 'echarts'`, `from 'monaco-editor'` and `from 'lexical'` for the
type-only references at `packages/core/src/chart/chart.ts:16`,
`packages/core/src/editor/editor.types.ts:1` and `packages/core/src/rich-text/*.ts`.
Those packages are *optional* peers, so a consumer who installs none of them has a
`.d.ts` referencing modules that do not exist. Angular CLI's generated `tsconfig.json`
defaults to `skipLibCheck: true` (as this repo's own `tsconfig.json:24` does), which
suppresses it — so it bites only consumers who turned `skipLibCheck` off. Secondary
entry points (`@kouji-ui/core/chart`, `/editor`, `/rich-text`, `/table`) would also give a
cleaner story for the optional-peer split and let the four heavy areas carry their own
peer declarations.

**Fix.** Lowest-cost version: add a CI check that type-checks a fixture consumer with
`skipLibCheck: false` and none of the optional peers installed; if it fails, hoist the
offending type references behind local structural interfaces. Fuller version: add
secondary entry points for `chart`, `editor`, `rich-text` and `table` via per-folder
`ng-package.json` files, and move each area's optional peers onto that entry point.

**Effort:** L

---

### F-9 No size budget or bundle-size gate anywhere except the docs app's own build

**Severity:** low · **Confidence:** high
**Files:** `angular.json:124-135`, `.github/workflows/ci.yml`,
`.github/workflows/release.yml`

**Evidence**

The only budgets in the repo (`angular.json:124-135`, under the `docs` project's
`production` configuration):

```json
              "budgets": [
                { "type": "initial",           "maximumWarning":  "800kB", "maximumError": "1500kB" },
                { "type": "anyComponentStyle", "maximumWarning":   "10kB", "maximumError":   "20kB" }
              ],
```

`grep -rn "budget\|size-limit\|bundlesize\|stats.json" .github/ turbo.json apps/docs/package.json`
→ no match.

**Why it matters.** Nothing measures `dist/kj-core` or `dist/kj-components`, so a
regression like F-2 or F-3 — a namespace import, a static import replacing a dynamic one
— lands silently. The one budget that exists guards the docs *initial* chunk with a
1 500 kB error ceiling that F-2's icon set eats a large fraction of *(est.)*; there is no
`bundle`-type budget per lazy chunk, so F-1's route chunk is unguarded entirely.

**Fix.** Add `size-limit` (or `bundlesize`) entries to both package `package.json`s
gating the FESM gzipped size, wired into `ci.yml`. Add a per-chunk
`{ "type": "bundle", "name": "…" }` budget, or at minimum an `"anyScript"` budget, to
`angular.json`'s docs production config. Add a CI assertion that neither FESM contains
the literal strings `from "echarts"`, `from "lexical"` or `from "monaco-editor"` outside
a dynamic-import position — that single grep would have caught F-3.

**Effort:** S

---

### F-10 Declared-but-unused heavy dependencies, and a script pointing at a package that does not exist

**Severity:** low · **Confidence:** high
**Files:** `package.json:12,47`, `apps/docs/package.json:12`

**Evidence**

`package.json:47` declares `"codemirror": "^6.0.2"` and `apps/docs/package.json:12`
declares `"@codemirror/lang-markdown": "^6.5.0"`, but a repo-wide grep for `codemirror`
across all `.ts`/`.json` outside `node_modules`, `.git` and `pnpm-lock.yaml` returns
**only those two manifest lines** — no source file imports CodeMirror, statically or
dynamically. (The code editor is Monaco; the markdown renderer is `marked`.)

`package.json:12`:

```json
    "a11y": "pnpm --filter @kouji-ui/a11y start",
```

`ls apps` → `docs/` only; no `@kouji-ui/a11y` package exists in the workspace.

**Why it matters.** Not a shipped-bytes issue — an unimported dependency cannot reach a
bundle — but `codemirror` v6 is a large install and a meaningful chunk of CI
cold-install time and lockfile surface, and a declared dependency invites someone to
import it, at which point it *is* a bundle problem. The dead script is a paper cut.

**Fix.** Drop `codemirror` from the root manifest and `@codemirror/lang-markdown` from
`apps/docs/package.json`; drop the `a11y` script, or restore the package it refers to.

**Effort:** S

## "Import X → pulls in Y" — worst offenders

| Import | Pulls in | Path | Status |
|---|---|---|---|
| `provideLucideIcons()` from `@kouji-ui/components` | **entire `lucide-static` set, 1 708 icons, ~300 KB gz** *(est., per the source's own doc comment)* | `public-api.ts:33` → `icon/index.ts:1` → `lucide/index.ts:1` → `provide-lucide-icons.ts:8` `import * as lucideIcons` + `Object.entries` at `:53` (namespace escape — untree-shakable by construction) | **F-2** |
| `apps/docs` root `appConfig` | same, into the **initial** chunk | `app.config.ts:30` | **F-2** |
| any `/docs/**/:slug` route | 69 playgrounds → effectively all of `@kouji-ui/components` + `@kouji-ui/core` + `@tanstack/angular-table` + `@tanstack/virtual-core` + `KjChart` | `component-doc.ts:24` → `playground-files/index.ts:2-7` → 6 buckets → 69 static `PLAYGROUND` imports (`bucket-f.ts:5,12,13`) | **F-1** |
| `<kj-chart>` from `@kouji-ui/components` | **full `echarts`** (~1 MB unminified, per `echarts.ts:29`) even when `provideECharts` is registered | `components/src/chart/chart.ts:145` `await import('echarts')` — no `KJ_ECHARTS` lookup | **F-3** |
| Getting Started's `styles` array | 9 overlay stylesheets **a second time**, on top of the copies inlined in each component | `components/src/overlay/overlay.css:37-45` `@import` of files that are also `styleUrl` targets | **F-5** |
| `import '@kouji-ui/components'` (any symbol) | `marked`'s global singleton reconfigured at import time | `public-api.ts:16` → `chat/index.ts:19` → `chat/markdown.ts:35,47` | **F-6** |
| `@kouji-ui/components` public `.d.ts` / FESM | 8 `_examples` demo components + `LUCIDE_ICON_NAMES` (31 KB array) as published API | `public-api.ts:33,36` → `icon/index.ts:2-5`, `input-mask/index.ts:2-9` | **F-7** |

**Correctly lazy (no action needed), stated for the record:**

| Import | Heavy dep | Boundary |
|---|---|---|
| `KjChart` from `@kouji-ui/core` | `echarts` | `KJ_ECHARTS` loader, else `await import('echarts')` — `core/src/chart/chart.ts:133-135` |
| `KjEditor` from `@kouji-ui/core` | `monaco-editor`, `@monaco-editor/loader` | `await import('@monaco-editor/loader')` → CDN — `core/src/editor/editor.loader.ts:63` |
| `KjRichTextEditor` from `@kouji-ui/core` | `lexical` + 8 `@lexical/*` | `await import('./engine')` — `core/src/rich-text/rich-text-editor.ts:224`; per-feature `load()` for the rest |

## Entry-point restructure needed

The single flat entry point is defensible *at runtime* (F-8 is low). The restructure
that actually matters is at the **published-asset and provider** level, not the JS
entry-point level:

1. **`packages/components/package.json`** gains an `exports` map. Today it has none,
   which makes every one of its 69 copied stylesheets unreachable by package specifier
   while core's four are reachable (F-4). Publish the globally-registerable sheets at a
   flat path (`@kouji-ui/components/overlay.css`), not `…/src/overlay/overlay.css`.
2. **Narrow the components asset glob** from `**/*.css` to only the sheets meant for
   global registration, so per-component CSS stops shipping twice in the tarball (F-4).
3. **Split the overlay stylesheets surface/wrapper** so the global sheet and the
   component `styleUrl`s are disjoint (F-5).
4. **Give `provideLucideIcons` a subset signature** so the icon set stops being an
   all-or-nothing entry point (F-2).
5. **Make the components chart a wrapper, not a fork**, so `provideECharts` is the one
   ECharts entry point for both layers (F-3).
6. *Optional, only if F-8's `skipLibCheck: false` check fails:* secondary entry points
   for `chart`, `editor`, `rich-text` and `table`, each carrying its own optional peers.

## Recommended work items

Ordered by (impact ÷ effort):

1. **F-6** — bind `marked` to a private instance instead of mutating the global; add the
   "global `marked` untouched" spec. One file; removes the only real `sideEffects: false`
   violation in the repo. *(S)*
2. **F-7** — delete the two `export … from './_examples'` blocks in `icon/index.ts` and
   `input-mask/index.ts`; add the lint rule that keeps them out. *(S)*
3. **F-4** — add an `exports` map to `packages/components/package.json` covering the
   stylesheets Getting Started tells people to register, narrow the `**/*.css` asset
   glob, and add the resolve-check to release CI. *(S)*
4. **F-9** — add `size-limit` on both FESMs plus the "no static heavy import in the FESM"
   grep to `ci.yml`. This is the guard that keeps F-2 and F-3 from recurring. *(S)*
5. **F-10** — remove `codemirror`, `@codemirror/lang-markdown` and the dead `a11y`
   script. *(S)*
6. **F-3** — make `packages/components/src/chart/chart.ts` honour `KJ_ECHARTS` (ideally
   by composing `KjChart` via `hostDirectives`), with a spec asserting a provided loader
   is used. *(M)*
7. **F-2** — add the `provideLucideIcons(names?)` subset overload, move
   `buildLucideRegistry()` off the boot path, and switch `apps/docs/src/app/app.config.ts:30`
   to the subset form. *(M)*
8. **F-1** — convert `playground-files/bucket-*.ts` into a generated `PLAYGROUND_LOADERS`
   map (reuse `scripts/migrate-examples.mjs`), resolve it asynchronously in
   `component-doc.ts`, and wrap both the playground and example panels in
   `@defer (on viewport)`. *(M)*
9. **F-5** — split the nine overlay stylesheets into surface/wrapper halves so neither
   half ships twice. *(M)*
10. **F-8** — add the `skipLibCheck: false` fixture type-check first; pursue secondary
    entry points only if that or the optional-peer story demands it. *(L)*

## Open questions

1. **Does `ng-packagr` auto-export copied assets?** F-4's severity depends on it. The
   manual core entries strongly suggest it does not, but I could not build to inspect a
   generated `dist/kj-components/package.json`. One `pnpm build:core && cat dist/kj-core/package.json`
   settles it.
2. **`packages/core/package.json:56-57`** sets `"module": "../../dist/kj-core/fesm2022/kouji-ui-core.mjs"`
   and `"typings": "../../dist/kj-core/types/kouji-ui-core.d.ts"` — paths that escape the
   package directory. Presumably there so the workspace resolves before a build, on the
   assumption `ng-packagr` overwrites both in the dist manifest. Worth confirming against
   a real `dist/kj-core/package.json`; if it does not overwrite them, the published
   package's `module` field points outside the tarball.
3. **`@tanstack/angular-table` is a hard `dependency` of `@kouji-ui/core`**
   (`ng-package.json` `allowedNonPeerDependencies`), value-imported at
   `packages/core/src/table/table.ts:7`, `grid-api.ts:17`, `grid-api-impl.ts:14`. Same for
   `@tanstack/virtual-core` and `marked` in components. Tree-shaking should drop them for
   a consumer who never touches the table or chat — but only if those packages are
   themselves side-effect-free. Their `sideEffects` flags need checking against installed
   `node_modules`; if any is absent, that dependency is retained in every consumer bundle.
4. **Does the docs production build currently pass its own `initial` budget?** F-2's icon
   set plus the framework may already be near the 800 kB warning line. A single
   `pnpm build:docs` prints the real number and turns this report's largest estimate into
   a measurement.
5. **Is the Monaco CDN default (`editor.loader.ts:63-70`) intentional for consumers?** It
   keeps Monaco out of the bundle entirely, which is excellent for bundle shape, but it
   makes the editor depend on a third-party CDN at runtime. Out of scope for this aspect,
   but it belongs with whoever reviews supply chain / offline support.

---

## Changed since the 2026-09-06 review

Previous review: `reports/review/07-lazy-loading-bundle.md` at commit `9aee150a`, auditing
`fd6dd34e`. `main` has since advanced 8 commits (`fd6dd34e..HEAD`). Every "Fixed" claim
below was verified against the code at HEAD, not taken from either report.

### Fixed

- **prev F-5 — "Two aggregator stylesheets the docs build depends on are never published"
  — *fixed for `core`, still open for `components`.*** Verified at HEAD:
  - `packages/core/ng-package.json:19-23` now ships the overlay sheet as an asset
    (`{"input": "src/primitives/overlay", "glob": "overlay.css", "output": "overlay"}`) —
    absent at `fd6dd34e`.
  - `packages/core/package.json:52-55` now lists `"./overlay/overlay.css"` in `exports`
    alongside the three pre-existing CSS entries.
  - `packages/components/ng-package.json:11-16` gained an `assets` block
    (`{"input": "src", "glob": "**/*.css", "output": "src"}`), so the components sheets now
    reach the tarball.
  - `apps/docs/src/app/pages/getting-started/getting-started.ts:26-32` no longer asks
    consumers to register `@kouji-ui/core/styles.css`; the documented list is now
    themes → `@kouji-ui/core/overlay/overlay.css` → `@kouji-ui/components/src/overlay/overlay.css`.

  Both changes landed in `fb1d1956` ("fix(list,overlay): scope list items to their own
  container; publish the overlay surface CSS", PR #71), together with
  `packages/components/src/overlay/overlay-styles.spec.ts` (208 lines), which walks
  `document.styleSheets` and asserts `ng-package.json` actually ships the sheet.

  **What is *not* fixed:** `packages/components/package.json` still has no `exports` key at
  all (`grep -n exports` → no match), so the components sheets are shipped but not
  addressable as a package specifier. That residue is **F-4** in this report. The fix also
  introduced a new cost — nine stylesheets now ship twice — which is **F-5**.

### Still open

| prev | current | note |
| --- | --- | --- |
| prev F-1 — entire Lucide set namespace-imported, wired at docs root | **F-2** | Unchanged at HEAD (`provide-lucide-icons.ts:8,52-53,98-105`; `app.config.ts:30`). This pass **downgrades it high → medium** and reframes it as an API-surface gap against `docs/superpowers/specs/2026-05-07-icons-design.md:244-250`; prev's own suggested `provideLucideIcons(names)` overload remains the right fix. Prev's "`provideLucideLoader()` is documented but does not exist" observation is confirmed and retained (`icon.gallery.example.ts:17`). |
| prev F-2 — example components leak into published barrels | **F-7** | Unchanged: `icon/index.ts:2-5` and `input-mask/index.ts:2-9` still re-export from `./_examples`, both reached from `public-api.ts`. Prev rated it high; this pass rates it medium (tarball + semver surface, not shipped bytes). |
| prev F-3 — no secondary entry points | **F-8** | Structurally unchanged (`find packages -name ng-package.json` → the two top-level files only). **Severity disagreement worth flagging:** prev rated it high, this pass low. Prev's sub-point 1 ("nothing enforces the tree-shaking assumption") was promoted into its own finding here — see *New since then*, F-9. |
| prev F-5 — components half | **F-4** | See *Fixed* above. |
| prev F-9 — dead heavy dependencies (`codemirror`) | **F-10** | Unchanged: `package.json:47` + `apps/docs/package.json:12` still declare CodeMirror with zero source references. This pass adds the dead `a11y` script (`package.json:12`). |

### Not reproduced

- **prev F-4 — "`marked` and `@tanstack/virtual-core` are hard dependencies every consumer
  installs" — condition unchanged; this pass demoted it to an Open Question instead of a
  finding.** Verified at HEAD: `packages/components/package.json` still declares both as
  plain `dependencies`, and both are still static value imports (`chat/markdown.ts:1`,
  `table/table-virtual.ts:11-17`); `packages/core/package.json` does the same with
  `@tanstack/angular-table`. **The previous review was right and this pass under-filed it.**
  Re-filed below as **F-11**.
- **prev F-8 — "412 example files and 68 playgrounds are compiled into every library build"
  — condition unchanged; simply missed by this pass.** Verified at HEAD: both
  `packages/core/tsconfig.lib.json:11-12` and `packages/components/tsconfig.lib.json:15-16`
  still read `"include": ["src/**/*.ts"], "exclude": ["**/*.spec.ts"]`. **The previous
  review was right.** Re-filed below as **F-12**.
- **prev F-7 — "Zero `@defer` in the library and only one in the docs app" — condition
  unchanged, deliberately not re-filed standalone.** Re-counted at HEAD: 0 `@defer` blocks
  in `packages/`, exactly 1 in `apps/docs` (`app.ts:31`, wrapping `<kj-progress-bar />`).
  This pass folds it into F-1's fix rather than treating "no `@defer`" as a defect in its
  own right — a library has no obligation to use `@defer` internally, and the docs app's
  eager `<kj-search />` is the same class of problem as F-1. A scoping choice, not a
  disagreement on the facts.
- **prev F-6 — "`await import('echarts')` forces the full ~1 MB chunk even for
  `provideECharts` consumers" — condition unchanged, not re-filed, and this report's *What
  works* section arguably contradicts it.** Verified at HEAD: `core/src/chart/chart.ts:133-135`
  still branches `this.echartsLoader ? await this.echartsLoader() : await import('echarts')`.
  This report lists that same code under *What works* ("ECharts is never eagerly imported"),
  which is true about the **initial** bundle but sidesteps prev's narrower claim about the
  **emitted** chunk. Prev rated its own confidence medium precisely because it could not
  build; neither could this pass (no `node_modules`, no `dist/`). **Honest status: neither
  review has tested this, and it stays untested.** Resolve it by building a fixture consumer
  that registers `provideECharts` and checking whether an `echarts` chunk is emitted.
- **prev F-10 — "`packages/core/package.json` declares an `exports` map with no `"."`
  entry" — condition unchanged, not re-filed.** Verified at HEAD: `exports` now carries four
  CSS subpaths and still no `"."`. Prev filed it at **low confidence** on the reasoning that
  ng-packagr merges its own generated `"."` into the published manifest, which is almost
  certainly what happens. Not re-filed because the adjacent, larger packaging problem
  (components has no `exports` at all) is F-4, and both are settled by the same
  build-and-assert check F-4 recommends.

### New since then

- **F-1** — docs `component-doc` route chunk eagerly bundles all 69 playgrounds. No prev
  counterpart: prev F-8 counted the playground files as *build-time* weight only and did not
  notice that `apps/docs` statically aggregates them into a single route chunk.
- **F-3** — the styled `<kj-chart>` ignores `provideECharts`
  (`components/src/chart/chart.ts:144-145`). Adjacent to prev F-6 but a distinct defect: prev
  was about core's fallback emitting a chunk; this is the components wrapper never consulting
  `KJ_ECHARTS` at all.
- **F-5** — `overlay.css` re-ships nine stylesheets already inlined into their components.
  **This is a regression introduced by the fix for prev F-5** (`fb1d1956`), so it could not
  have existed at `fd6dd34e`.
- **F-6** — `marked.use()` runs at module scope in a package declaring `sideEffects: false`.
- **F-9** — no size budget or bundle-size gate outside the docs app. Promoted from prev F-3's
  sub-point 1 into a standalone finding.

### Re-filed from the previous review

Both were correct at `fd6dd34e`, are still correct at HEAD, and were missed or under-filed by
this pass. Ids continue this report's sequence.

#### F-11 `marked` and the TanStack packages are hard dependencies every consumer installs *(carried over from prev F-4)*

**Severity:** medium · **Confidence:** high
**Files:** `packages/components/package.json` (`dependencies`), `packages/components/src/chat/markdown.ts:1`,
`packages/components/src/table/table-virtual.ts:11-17`, `packages/core/package.json`,
`packages/core/src/table/table.ts`

`packages/components/package.json` declares `"@tanstack/virtual-core": "^3.14.0"` and
`"marked": "^18.0.11"` as plain runtime dependencies; both are static **value** imports
reachable from `public-api.ts` (`chat/index.ts` re-exports `renderMarkdown`). `packages/core`
does the same with `@tanstack/angular-table`. Note the asymmetry: `echarts`, `monaco-editor`
and every `@lexical/*` are *optional peers* precisely because they are lazily loaded; these
three get no such treatment, so someone installing `@kouji-ui/components` for a button
downloads a markdown parser on every install, every CI run and every Docker layer. Whether
they reach the *bundle* depends entirely on tree-shaking, which nothing in this repo verifies
(F-9).

**Fix.** Apply the pattern that already works for Lexical: give `chat-message.ts` a
`KJ_MARKDOWN` loader token defaulting to `await import('./markdown')` and move `marked` to an
optional peer. For the table, the TanStack packages are load-bearing for a table that always
renders — the right move is F-8's entry-point split, hanging those peers off the table entry
point. **Effort:** M

#### F-12 Examples and playgrounds are compiled into every library build *(carried over from prev F-8)*

**Severity:** low · **Confidence:** high
**Files:** `packages/core/tsconfig.lib.json:11-12`, `packages/components/tsconfig.lib.json:15-16`

Both files read, verbatim:

```json
  "include": ["src/**/*.ts"],
  "exclude": ["**/*.spec.ts"],
```

412 `*.example.ts` files (~673 KB) and 68 `*.playground.ts` files (224 908 bytes) are
therefore type-checked and compiled on every `ng build kj-core` / `kj-components`. ng-packagr
rolls the FESM from `entryFile` only, so unreachable examples are dropped from the artifact —
this is build *time*, not bundle size. **But it is the structural reason F-7 can happen
silently:** nothing prevents an example from entering the published graph, so the safety
property rests on every barrel file remembering not to re-export `./_examples`.

**Fix.** Add `"**/_examples/**"` and `"**/*.playground.ts"` to `exclude` in both
`tsconfig.lib.json` files. That turns F-7 from a silent leak into a compile error and cuts
library build time. `apps/docs` already resolves the example and playground sources through
the root `tsconfig.json` `@kouji-ui/*/*` path aliases, so it is unaffected. **Effort:** S
