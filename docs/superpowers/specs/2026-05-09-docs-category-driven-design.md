# Docs site — category-driven nav, faster extraction, lazy examples

**Date:** 2026-05-09
**Status:** Brainstormed — implementation plan at [`docs/superpowers/plans/2026-05-09-docs-category-nav-perf-examples.md`](../plans/2026-05-09-docs-category-nav-perf-examples.md) (validate before coding)

## Summary

Rework the documentation pipeline and docs app so that:

1. **`@doc-category` is the single source of truth** for both **sidebar structure** and **URL path** (no `Core` / `Library` prefix injection, no package-based sidebar grouping).
2. **Extraction is faster** through cheaper per-file work, parallel package scans, smarter caching, and a slimmer manifest where possible.
3. **Example components** load **lazily** via a **hand-maintained** loader map in `apps/docs` (no generated barrel, no CI drift test).
4. **Layout** uses a **single-column sidebar** with **tree-select-style** expand/collapse and keyboard behavior aligned with `KjTreeSelect`, plus clearer doc page chrome (breadcrumbs, flatter heading hierarchy, deferred examples).

## Goals

1. **Category-only taxonomy** — `categoryPath` = split of `@doc-category` on `/` (trimmed). Authors write the full path (e.g. `Headless/Overlay/Dialog`, `Components/Overlay/Toast`). **Package** is not used to build or prefix the path.
2. **URLs follow category** — nested route segments mirror `@doc-category` plus the page slug at the leaf (slugified segments). Category index routes list children without a separate “track” concept tied to `pkg`.
3. **Faster cold extraction** — fewer redundant AST passes per file, parallel scans, cache improvements, optional manifest short-circuit when inputs unchanged.
4. **Smaller upfront docs JS** — replace eager `example-components.ts` barrels with **lazy** `import()` per example; registry file is **manually edited** in the docs app.
5. **Single-column nav** — one scrollable sidebar tree (Getting Started + full category tree); **TreeSelect-like** expansion and selection semantics; **not** the current two-column “track then flat groups” layout.

## Non-goals

- **Dual `@category` / `@doc-category`** — only **`@doc-category`** is supported after migration (rename across packages + [`rules/tsdoc.md`](../../../rules/tsdoc.md)).
- **Generated `exampleLoaders`** or **CI tests** that assert every `*.example.ts` is registered (explicitly out of scope).
- **Live playground / sandbox** upgrades beyond lazy example mounting.
- **Theme generator** IA (covered by other specs).

---

## 1. Taxonomy and URLs

### 1.1 Tag

- **`@doc-category`** replaces **`@category`** everywhere.
- Value is a `/`-separated path. Segments are trimmed; empty segments dropped.

### 1.2 Manifest

- Each doc page carries **`categoryPath: string[]`** derived **only** from `@doc-category` on the main item (same rules as today for “which item supplies category,” but the parser reads `@doc-category`).
- **`pkg`** (`core` | `components`) remains on `DocItem` / `DocPage` for install snippets, badges, and disambiguation when needed — **not** for building paths or sidebar trees.

### 1.3 URL shape

- **Leaf doc page:** `/docs/<seg1>/<seg2>/…/<pageSlug>` where each `seg` is the slugified form of the corresponding `categoryPath` segment, and `pageSlug` is the existing page name slug.
- **Category index:** intermediate paths (e.g. `/docs/headless`, `/docs/headless/overlay`) render a **built-in index** that lists child categories and leaf pages from the manifest — **not** hand-maintained per-track landing pages.

### 1.4 Routing and disambiguation

- If two pages could collide on URL alone, resolution uses stable rules (e.g. **pkg** + symbol) documented in the implementation plan; extractor should warn on ambiguous slugs.

---

## 2. Extraction performance

Prioritized tactics (implement in dependency order as needed):

1. **Single-pass `@doc` dispatch** — one discovery pass for nodes tagged with `@doc`, then branch by AST kind instead of running six separate full-file detector queries per file.
2. **Parallel `scanPackage`** — worker threads or parallel chunks for CPU-bound parse/extract (cache hits stay cheap on the main thread).
3. **Per-package cache shards** — separate cache files per package to reduce load/save churn.
4. **Manifest short-circuit** — if aggregate content hash unchanged, skip `assemblePages` / reuse prior manifest when safe.
5. **Stricter pre-parse skips** — extend filename/path denylist (barrels,-only-example files without `@doc`, etc.).
6. **Deduplicate directive input extraction** — avoid parsing inputs twice for the same class (own-inputs registry vs directive detector).
7. **Manifest slimming** — remove fields unused by the docs UI to shrink JSON parse cost in the browser.

Out of scope for this spec: replacing TypeScript with a lighter parser, or adopting ts-morph for extraction.

---

## 3. Example loading (hand-written)

### 3.1 Remove package barrels

- Delete [`packages/core/src/example-components.ts`](../../../packages/core/src/example-components.ts) and [`packages/components/src/example-components.ts`](../../../packages/components/src/example-components.ts).
- Remove path aliases `@kouji-ui/core/examples` and `@kouji-ui/components/examples` from root [`tsconfig.json`](../../../tsconfig.json).

### 3.2 Docs-app registry

- Add a single committed file under `apps/docs`, e.g. **`apps/docs/src/app/examples/example-loaders.ts`**, exporting:

  `Record<string, () => Promise<Type<unknown>>>` — one entry per example component used in docs, each line a **literal** dynamic `import()` to the source module.

- **`ExampleRegistryService`** resolves components **asynchronously** from this map.
- Doc pages use **`@defer`** (e.g. `on viewport`) around example previews so chunks load when needed.

No codegen. No automated drift test.

---

## 4. Layout and navigation

### 4.1 Sidebar — single column, TreeSelect-like

**Replace** the current **two-column** sidebar ([`docs-sidebar`](../../../apps/docs/src/app/components/docs-sidebar/)): column A (Getting Started / Headless / Components) + column B (flat groups).

**Target:** **One column** containing:

- **Getting Started** (fixed entry to `/docs/getting-started` or equivalent).
- **Full tree** built only from manifest `categoryPath` values (all packages contribute to **one** tree shape; grouping does **not** filter by `pkg` first).

**Interaction** (aligned with `KjTreeSelect` / tree semantics):

- Parent rows **expand/collapse** with clear affordance (`aria-expanded`).
- **Leaves** navigate via `RouterLink` to the leaf URL.
- **Current page** shows as selected (`aria-current="page"` on the active leaf).
- **Keyboard:** arrows, expand/collapse, typeahead if consistent with TreeSelect — satisfies navigation expectations for tree widgets (WCAG 2.1 **2.1.1**, **4.1.2**).

Implementation may use a **dedicated nav tree component** that mirrors TreeSelect behavior; **dogfooding `KjTreeSelect` itself** is optional and only if its API fits navigation (href per leaf, router integration) without fighting “form select” semantics.

### 4.2 Doc page header

- **Breadcrumb** from `categoryPath`, each segment linking to the corresponding **category index** route.
- Remove reliance on **last segment only** for the small tag ([`component-doc.html`](../../../apps/docs/src/app/pages/component-doc/component-doc.html)).
- Optional **package badge** / install hint using `pkg` (display only).

### 4.3 Definitions section

- Flatten heading hierarchy: drop redundant outer **“Definitions”** wrapper where possible; kind groups become prominent sections; remove **main** badge if redundant.

### 4.4 Examples

- Wrap **`kj-code-preview`** in **`@defer`** for viewport-based loading.
- While loading: **`aria-busy`** and polite live region when appropriate (**4.1.3**).

### 4.5 Responsive TOC

- Keep sticky TOC where space allows; collapse to **`<details>`** or compact pattern below breakpoint (per earlier brainstorm).

---

## 5. Migration notes

- Global replace **`@category`** → **`@doc-category`** and rewrite paths so the **first segment** is whatever top-level nav bucket authors want (e.g. `Headless`, `Components`) — **written explicitly**, not injected from package.
- Update [`rules/tsdoc.md`](../../../rules/tsdoc.md) to document **`@doc-category`** only.
- Adjust **`apps/docs` routes**, prerender params, **`DocsService`** (`getPage`, search, sidebar builders), and **e2e** specs that assume `/docs/headless/:slug` vs `/docs/components/:slug` only.

---

## 6. Accessibility checklist (target WCAG 2.1 AAA alignment)

| Area | Requirement |
|------|-------------|
| Sidebar tree | `role="tree"` / `treeitem`, `aria-expanded`, visible focus, **≥44px** touch targets via padding |
| Current page | `aria-current="page"` on active leaf |
| Breadcrumb | `<nav aria-label="…">`, navigable links |
| Deferred examples | `aria-busy`, live region for load completion |
| Keyboard | Full tree navigation without mouse |

---

## 7. Open decisions for implementation plan

- Exact **slug collision** policy and extractor warnings.
- Whether **dogfood `KjTreeSelect`** in the shell or a parallel **`kj-docs-nav-tree`** primitive.
- Breakpoints for TOC **`details`** fallback.

---

## Self-review

- No `TBD` placeholders left without being listed as §7 open decisions.
- Scope is bounded: taxonomy + perf + examples + docs chrome/sidebar; theme generator excluded.
- Contradiction check: single-column sidebar **supersedes** earlier two-column sidebar design in prior chat notes.
