# Docs category-driven nav, perf, lazy examples — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@doc-category` as the only category tag; nested doc URLs aligned with category segments; single-column inline sidebar tree (plain Angular, no Kouji directives); faster extraction; hand-written lazy example loaders; updated doc page chrome — per [`docs/superpowers/specs/2026-05-09-docs-category-driven-design.md`](../specs/2026-05-09-docs-category-driven-design.md).

**Architecture:** Extractor reads `@doc-category`, builds `categoryPath` with **no** package prefix. Manifest drives a **unified** nav tree (`DocsService`). Routes become **`/docs/<slugified-segments…>/<pageSlug>`** with **category index** routes for prefixes. Sidebar is **inline** document-flow tree (expand/collapse pushes content inside the sidebar); **not** `KjTreeSelect` (overlay). Example registry lives in **`apps/docs`** as explicit dynamic `import()` map; package **`example-components.ts`** barrels removed.

**Tech Stack:** Angular 21 standalone, TypeScript extractor (`typescript`, `tsquery`), Vitest, Playwright e2e, Turborepo.

**Spec:** [`docs/superpowers/specs/2026-05-09-docs-category-driven-design.md`](../specs/2026-05-09-docs-category-driven-design.md)

---

## Resolved decisions (from spec §7)

| Topic | Decision |
|-------|----------|
| **Slug collision** | At extract time, compute canonical URL key = `/docs/` + slugified `categoryPath` joined by `/` + `/` + `page.name`. If two pages share the same key, emit **`ambiguous-url`** warning and **suffix** the leaf segment: `page.name` + `--` + `pkg` (`core` \| `components`) for **URL only**; manifest stores `urlSlug` or equivalent so `getPage` resolves correctly. Document in extractor warnings. |
| **`KjTreeSelect` in shell** | **No.** Sidebar uses native `<button>` / `<a>` + `role="tree"` / keyboard handlers or a **plain** `app-docs-nav-tree` component. Overlay panel is wrong for persistent nav (see chat: TreeSelect uses `bodyPortal`). |
| **TOC breakpoint** | Collapse sticky TOC to `<details>` below **1280px** viewport width (`matchMedia` or CSS container). |

---

## How to validate the plan (before / during / after)

Use this as the **definition of done** for the whole effort.

### Automated (must pass before merge)

- [ ] From repo root: `pnpm exec vitest run --project docs` (or the workspace script that runs `apps/docs` unit tests) — **PASS**.
- [ ] `pnpm turbo build --filter=docs` — **PASS** (SSR + browser bundles).
- [ ] Playwright docs e2e (adjust selectors for new URLs): `pnpm exec playwright test` scoped to `apps/docs/e2e` — **PASS** after updates.

### Manual / UX

- [ ] **Sidebar:** Single column; Getting Started link; tree expands/collapses **inline** (sidebar scroll height changes); leaf navigates to correct URL; current page shows **selected** state; **Tab** reaches all controls; **arrow keys** move between tree items where implemented (minimum: Tab + Enter/Space on expand buttons).
- [ ] **404:** Unknown path shows sensible not-found within docs shell.
- [ ] **Category index:** Visiting a prefix URL lists child categories and pages from manifest.
- [ ] **Examples:** First paint does not download every example chunk; opening/scrolling loads previews (lazy).

### Spec alignment checklist

- [ ] No remaining `@category` in `packages/**` (only `@doc-category`).
- [ ] [`rules/tsdoc.md`](../../rules/tsdoc.md) documents `@doc-category` only.
- [ ] No `@kouji-ui/*/examples` imports in `apps/docs` except paths resolved via hand-written loader map.

---

## File structure (expected touch surface)

```
rules/tsdoc.md
tsconfig.json                                    # remove @kouji-ui/*/examples paths

packages/core/src/**/*.ts                        # @category → @doc-category + path text
packages/components/src/**/*.ts                  # same
packages/core/src/example-components.ts          # DELETE
packages/components/src/example-components.ts    # DELETE

apps/docs/src/lib/
  extractor-helpers.ts                             # readDocCategoryTag; drop Core/Library injection
  doc-tags.ts or detectors/*                      # parse @doc-category
  docs-extractor.ts                               # perf passes (later tasks)

apps/docs/src/app/
  app.routes.ts
  app.routes.server.ts                            # prerender params for new URL shape
  services/docs.service.ts                        # unified tree, getPage by URL, collision handling
  services/example-registry.service.ts          # async lazy loaders
  examples/example-loaders.ts                     # CREATE — hand-written map
  components/docs-sidebar/*                       # REPLACE — single-column inline tree
  pages/category-index/*                          # CREATE — category listing route
  pages/component-doc/*                         # breadcrumbs, route match, defer examples
  components/navbar/*                           # if links assume /docs/headless hardcoded — update

apps/docs/e2e/*.spec.ts                          # URL expectations
```

---

## Phase A — Extractor: `@doc-category` + path semantics

### Task A1: Parse `@doc-category` and stop injecting Core/Library

**Files:**

- Modify: `apps/docs/src/lib/extractor-helpers.ts` — replace `readCategoryTag` with **`readDocCategoryTag`** (or rename in place): read tag **`doc-category`** only; split `/`, trim, filter empty; **return `[]` if missing** (detectors already warn / skip as today).
- Modify: every detector that calls `readCategoryTag` → call the new helper.
- Modify: `apps/docs/src/lib/__tests__/detectors/*.spec.ts` + fixtures — update JSDoc tags in fixtures from `@category` to **`@doc-category`** and path strings to explicit paths (e.g. `Headless/Overlay/Dialog`).

- [ ] **Step 1:** Implement `readDocCategoryTag` and remove `Core` / `Library` prefix logic from [`extractor-helpers.ts`](../../apps/docs/src/lib/extractor-helpers.ts) (`readCategoryTag` lines 270–285 today).
- [ ] **Step 2:** Grep `readCategoryTag` → switch call sites to `readDocCategoryTag`.
- [ ] **Step 3:** Run `pnpm exec vitest run apps/docs/src/lib` (or project equivalent); fix failures until **PASS**.

---

### Task A2: Ambiguous URL detection at extract time

**Files:**

- Modify: `apps/docs/src/lib/page-assembler.ts` or orchestrator after pages built — collect URL keys; duplicates → **`ExtractorWarning`** `ambiguous-url`.
- Modify: `apps/docs/src/lib/docs-extractor.types.ts` — extend warning kind union if needed.

- [ ] **Step 1:** After `assemblePages`, compute each page’s proposed URL path from `categoryPath` + `page.name` + slugify rules (shared helper `docUrlSegments(page)` in e.g. `apps/docs/src/lib/doc-url.ts`).
- [ ] **Step 2:** On duplicate key, push warning and apply **`--{pkg}`** suffix rule to the leaf slug stored for routing (field on `DocPage`, e.g. `routeSlug` or reuse `name` + separate `urlLeaf` — pick one; document in types).

---

## Phase B — Routing + URL model

### Task B1: Replace flat `/docs/headless/:slug` with nested segments

**Files:**

- Modify: [`apps/docs/src/app/app.routes.ts`](../../apps/docs/src/app/app.routes.ts)
- Modify: [`apps/docs/src/app/app.routes.server.ts`](../../apps/docs/src/app/app.routes.server.ts) if present
- Modify: [`apps/docs/src/app/pages/component-doc/component-doc.ts`](../../apps/docs/src/app/pages/component-doc/component-doc.ts) — resolve page from **param matrix** (full segment path + slug).

**Approach:**

- Use a **catch-all** child route under `docs`, e.g. `path: '**'` or a parameterized matcher that reads `UrlSegment`s and distinguishes **index** vs **leaf** by consulting manifest (leaf = last segment matches a `DocPage` route key).

- [ ] **Step 1:** Design minimal route config (document choice in PR): either `docs/**` with a resolver/guard that parses segments OR explicit multi-segment patterns generated from manifest at build time (heavier). **Recommendation:** single `docs/**` component that parses `Router.url` + `DocsService.getPageByUrl(url)` — keeps prerender list tied to manifest export.

- [ ] **Step 2:** Update `getPrerenderParams` to emit **all** doc URLs from manifest (flat list of strings).

- [ ] **Step 3:** Build + fix SSR.

---

### Task B2: Category index page

**Files:**

- Create: `apps/docs/src/app/pages/category-index/category-index.ts` (+ `.html`, `.css`)
- Wire in `app.routes.ts` for prefix paths.

- [ ] **Step 1:** Given path prefix segment list, list **child folders** and **leaf pages** from manifest (service method `listCategoryChildren(prefixSegments)`).

---

## Phase C — DocsService

### Task C1: Unified nav tree + URL helpers

**Files:**

- Modify: [`apps/docs/src/app/services/docs.service.ts`](../../apps/docs/src/app/services/docs.service.ts)

- [ ] **Step 1:** Add `getDocsNavTree(): DocsNavEntry[]` building **one** tree from **all** pages (folders from `categoryPath`, leaves with computed router URL).
- [ ] **Step 2:** Deprecate/remove `getTracks()` / `getSidebarTree()` / `getStyledComponentsTree()` once sidebar migrated.
- [ ] **Step 3:** Implement `getPageByUrl(url: string): DocPage | null` (or segment array) using same slugify rules as extractor.

---

## Phase D — Sidebar (scratch, no Kouji directives)

### Task D1: Replace `docs-sidebar` with single-column inline tree

**Files:**

- Modify: [`apps/docs/src/app/components/docs-sidebar/docs-sidebar.ts`](../../apps/docs/src/app/components/docs-sidebar/docs-sidebar.ts)
- Modify: [`docs-sidebar.html`](../../apps/docs/src/app/components/docs-sidebar/docs-sidebar.html)
- Modify: [`docs-sidebar.css`](../../apps/docs/src/app/components/docs-sidebar/docs-sidebar.css)
- Optional create: `apps/docs/src/app/components/docs-sidebar/docs-nav-tree.ts` — recursive presentational component (**no** `kj-*` selectors from `@kouji-ui/*`).

**Requirements:**

- `role="tree"` on root `<ul>`; folders `aria-expanded`; leaves `aria-current="page"` when active.
- Minimum hit target **44px** via padding on interactive rows.
- Mobile overlay behavior: keep [`SidebarToggleService`](../../apps/docs/src/app/services/sidebar-toggle.service.ts) + host `class.open` pattern from current CSS.

- [ ] **Step 1:** Update [`docs-sidebar.spec.ts`](../../apps/docs/src/app/components/docs-sidebar/docs-sidebar.spec.ts) — replace Col A/B tests with tree + Getting Started + mock manifest provider returning sample pages.

---

## Phase E — Doc page layout polish

### Task E1: Breadcrumbs + heading flattening + defer examples

**Files:**

- Modify: [`component-doc.html`](../../apps/docs/src/app/pages/component-doc/component-doc.html) / `.ts` / `.css`
- Modify: [`code-preview`](../../apps/docs/src/app/components/code-preview/) if needed for async example mounting

- [ ] **Step 1:** Breadcrumb `nav` with links to category index routes per prefix.
- [ ] **Step 2:** Remove redundant outer “Definitions” wrapper per spec §4.3; drop **main** badge if approved visually.
- [ ] **Step 3:** `@defer` + `aria-busy` / live region for example blocks.

---

## Phase F — Example loaders (hand-written)

### Task F1: Remove barrels + add `example-loaders.ts`

**Files:**

- Delete: `packages/core/src/example-components.ts`, `packages/components/src/example-components.ts`
- Modify: [`tsconfig.json`](../../tsconfig.json) — remove examples path aliases
- Create: `apps/docs/src/app/examples/example-loaders.ts` — start with **subset** of examples used in docs; expand manually as needed
- Modify: [`example-registry.service.ts`](../../apps/docs/src/app/services/example-registry.service.ts) — `async get(name)` returning `Promise<Type | null>`
- Modify: consumers of registry (e.g. code preview / dynamic component service) to **await**

- [ ] **Step 1:** Grep `ExampleRegistryService` / `get(` usages; update to async.
- [ ] **Step 2:** Build until **no** remaining imports of deleted barrels.

---

## Phase G — Extraction performance (incremental)

Implement in order; each step should keep tests green.

1. Single-pass `@doc` dispatch in `docs-extractor.ts` (fewer tsquery runs per file).
2. Deduplicate `extractInputs` where directive detector + registry both need own inputs.
3. Parallel `scanPackage` (workers or `p-limit` chunking).
4. Per-package cache file shards under `.cache/` (or existing cache dir).
5. Manifest short-circuit when aggregate SHA unchanged.
6. Slim manifest JSON (delete unused fields after grep in `apps/docs`).

---

## Phase H — Authoring migration

### Task H1: Mechanical tag + path update across packages

**Files:**

- All doc-tagged exports in `packages/core/src`, `packages/components/src`
- [`rules/tsdoc.md`](../../rules/tsdoc.md)

- [ ] **Step 1:** Script or codemod: `@category` → `@doc-category`; adjust segment text so **first segment** is editorial (`Headless`, `Components`, …) — **no** automatic rename without review; run `pnpm exec eslint` / `pnpm turbo lint --filter=...` as applicable.
- [ ] **Step 2:** Human spot-check high-traffic components (button, dialog, overlay cluster).

---

## Suggested commit boundaries

1. `feat(docs-extractor): @doc-category passthrough + warnings`
2. `feat(docs): nested doc URLs + category index + DocsService tree`
3. `feat(docs): inline sidebar tree + a11y`
4. `feat(docs): lazy example loaders + remove package example barrels`
5. `perf(docs-extractor): single-pass dispatch + cache shards` (can split further)
6. `docs(rules): tsdoc @doc-category`
7. `chore(packages): migrate @doc-category paths`

---

## Plan validation (you are here)

Before implementation:

1. Read this plan + the **design spec** end-to-end.
2. Confirm **resolved decisions** (collision suffix, no TreeSelect overlay, TOC breakpoint) — adjust if product wants different collision UX.
3. Confirm **route strategy** for Task B1 (catch-all + manifest lookup vs generated routes).
4. Only then run Phase A tasks.

After implementation, run the **Automated** and **Manual** validation sections at the top.
