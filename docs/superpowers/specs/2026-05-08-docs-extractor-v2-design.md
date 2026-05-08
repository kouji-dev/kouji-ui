# Docs extractor v2 — `@doc`-driven page model

**Date:** 2026-05-08
**Status:** Draft (awaiting user review)
**Worktree:** `worktree-docs-enhancement`

## Problem

Today's docs pipeline (`apps/docs/src/lib/docs-extractor.ts`, ~991 lines) only documents Angular declarables (`@Directive` / `@Component` classes) plus a few ambient kinds (`InjectionToken` consts, exported `type` aliases). This leaves significant kinds undocumented:

- Provider helpers (`provideIcons`, `provideIconLoader`, `provideLucideIcons`, …)
- Inject helpers (`injectKjIconResolver`, `injectKjFooBar`, …)
- Services (`@Injectable()` classes)
- Plain exported helpers and constants

The page identity model is also implicit:
- Every directive/component folder becomes one page.
- Page title comes from the directive's class name.
- Page description comes from the directive's class JSDoc.
- Item ordering is source order.
- There is no way to group items from different files into the same page, no way to designate a "main" item explicitly, and no way to override the page description independently of any item's JSDoc.

This spec replaces the implicit, kind-narrow extractor with an opt-in, kind-broad one driven by `@doc-*` JSDoc tags.

## Goals

1. **Explicit opt-in.** Only exports tagged with `@doc` appear in the docs. No more guessing from folder layout or decorator presence.
2. **Broad kind coverage.** Detect directives, services, provider functions, inject helpers, plain functions, tokens, type aliases, and named consts — all behind the same opt-in gate.
3. **Explicit page composition.** Items declare their page via `@doc-name`. Items with the same name share a page, even across files or packages.
4. **Explicit page metadata.** A page's main item, title, description, category, and item order are declared on the items themselves, not derived implicitly.
5. **Hard cutover.** No back-compat shim for un-tagged components — every existing component gets migrated in the same change.
6. **Same authoring ergonomics.** Existing example tags (`@doc-file`, `@doc-example`, `@doc-themes`) keep working unchanged.

## Non-goals

- Markdown / MDX authoring for free-form prose pages. JSDoc remains the only source of truth.
- Search-index schema rework — the search adapts to whatever the manifest emits.
- Live playground / sandbox enhancements.
- Theme-generator docs.

## Architecture

### Tag taxonomy

| Tag | Carrier | Required | Purpose |
|---|---|---|---|
| `@doc` | Any exported declaration | yes (opt-in) | Marks the export to appear in docs. Without it, the extractor ignores the export entirely. |
| `@doc-name <id>` | Every `@doc` item | yes | Page identifier (slug). Items with the same `@doc-name` group into one page. |
| `@doc-is-main` | One item per page | no, but recommended | Boolean flag (presence-only). Designates the main item — its JSDoc / category / `@doc-description` shapes the page. |
| `@doc-order <integer>` | `@doc` items | no | Sort order within the page. Lower values render first. Default = after main, then source order. |
| `@doc-description <text>` | `@doc` items | no | Explicit description. Falls back to the JSDoc summary block. The main item's description becomes the page description. |
| `@category <Path/Like/This>` | usually main | no | Sidebar taxonomy path. Read from the main item only. |
| `@doc-file`, `@doc-example`, `@doc-themes` | item-local | unchanged | Existing example tags — keep their current parser. |
| `@internal` | any | unchanged | Suppresses extraction even if `@doc` is present. |

### Detection

The extractor walks every exported declaration under `packages/core/src/` and `packages/components/src/` and keeps every node whose JSDoc carries `@doc`. **Kind is inferred from the AST node**, not declared in the tag:

| AST shape | Kind | Metadata captured |
|---|---|---|
| `class C { … }` with `@Directive` or `@Component` decorator | `directive` | selector, inputs, models, outputs, `hostDirectives` composition (existing logic kept) |
| `class C { … }` with `@Injectable` decorator | `service` | public methods + properties + their JSDoc |
| `function fn(…): EnvironmentProviders` or `Provider[]` | `provider-fn` | parameter list, parameter types, return type, JSDoc params |
| `function fn(…)` whose body calls `inject(...)` | `inject-fn` | parameter list, return type, JSDoc params |
| Any other exported `function fn(…)` | `function` | parameter list, return type, JSDoc params |
| `const X = new InjectionToken<T>(…)` | `token` | declared type `T`, factory description |
| `export type X = …` | `type-alias` | resolved type printout |
| Other `export const X = …` | `const` | declared type, literal value when extractable |

A node tagged with `@doc` whose AST shape doesn't match any of the above is **skipped with a warning** (`"unsupported @doc carrier at <file>:<line> — skipping"`).

### Page assembly

After detection produces a flat `DocItem[]`, the assembler:

1. Groups items by `@doc-name`.
2. Picks the page's main item:
   - Exactly one `@doc-is-main` → use it.
   - Zero → warn (`"page '<name>' has no @doc-is-main; falling back to first item by @doc-order, then source order"`) and pick deterministically.
   - More than one → warn (`"page '<name>' has multiple @doc-is-main items: <list>; using first"`) and pick the first.
3. Pulls `pkg` and `categoryPath` from the main item only.
4. Sorts items: main pinned first; remaining items by `(@doc-order ?? Infinity, sourceOrder)`.
5. Builds the `DocPage`.

Cross-package pages are allowed (e.g. an icon adapter in `components` could share a page with a core directive). When detected, the assembler emits a soft warning (`"page '<name>' spans both core and components — using main item's package for taxonomy"`) but does not error.

### Manifest schema

```ts
export type SourcePkg = 'core' | 'components';

export type DocKind =
  | 'directive' | 'service'
  | 'provider-fn' | 'inject-fn' | 'function'
  | 'token' | 'type-alias' | 'const';

export interface DocItem {
  /** Canonical id: stable across reorderings within a file. Hash of (relative path, symbol). */
  id: string;
  symbol: string;                 // exported identifier
  kind: DocKind;
  pkg: SourcePkg;
  filePath: string;               // package-relative
  description: string;            // @doc-description || JSDoc summary
  isMain: boolean;
  order: number | null;
  directive?: DirectiveDef;       // present when kind === 'directive'
  service?: ServiceDef;
  function?: FunctionDef;         // shared by provider-fn, inject-fn, function (kind disambiguates)
  token?: TokenDef;
  typeAlias?: TypeAliasDef;
  const?: ConstDef;
  examples?: DocExample[];        // existing shape
}

export interface DocPage {
  name: string;                   // @doc-name
  pkg: SourcePkg;                 // taken from main item
  categoryPath: string[];         // from main item's @category, package-prefixed
  title: string;                  // main item's symbol
  description: string;            // main item's description
  mainItemId: string;
  items: DocItem[];               // sorted; main first
}

export interface ExtractorWarning {
  kind: 'no-main' | 'multi-main' | 'cross-package' | 'unsupported-carrier' | 'unknown-tag' | 'duplicate-id';
  message: string;
  filePath?: string;
  line?: number;
  pageName?: string;
}

export interface DocsManifest {
  generatedAt: string;
  pages: DocPage[];               // replaces ComponentDoc[]
  warnings: ExtractorWarning[];
}
```

`DirectiveDef` keeps its current shape (selector, inputs, models, outputs, hostDirectives source-directive resolution). New shapes:

```ts
export interface ServiceDef {
  className: string;
  methods: { name: string; signature: string; description: string }[];
  properties: { name: string; type: string; description: string }[];
}

export interface FunctionDef {
  name: string;
  signature: string;              // pretty-printed, e.g. provideIcons(map: Record<string, string>): EnvironmentProviders
  parameters: { name: string; type: string; description: string; optional: boolean }[];
  returnType: string;
}

export interface ConstDef {
  name: string;
  type: string;
  literalValue?: string;          // present when statically resolvable (string/number/boolean literals)
}
```

`TokenDef` and `TypeAliasDef` keep today's shape.

### Component-doc page rendering

The page component (`apps/docs/src/app/pages/component-doc/component-doc.ts`) currently consumes `ComponentDoc` and renders directives + tokens + typeAliases as fixed sections. It will be reworked to consume `DocPage`:

- Page header: `page.title` + `page.description` + breadcrumb from `categoryPath`.
- For each item in `page.items`, render a section keyed by `kind`:
  - `directive` → existing inputs / outputs / models / hostDirectives layout.
  - `service` → method + property tables.
  - `provider-fn`, `inject-fn`, `function` → signature card + parameter table + return type.
  - `token` → name + declared type + factory description.
  - `type-alias` → name + resolved type.
  - `const` → name + type + value (when present).
- TOC ("On this page") is built from items in their sorted order.

### Sidebar grouping

`apps/docs/src/app/components/docs-sidebar/docs-sidebar.ts` groups by `page.categoryPath` (existing behaviour applied to the new `pages[]`). Each leaf is a single page link; pages with no `@category` land in an "Uncategorized" bucket and produce a warning.

### File structure

The current 991-line `docs-extractor.ts` is split. Each detector is small enough to read end-to-end and unit-test in isolation.

```
apps/docs/src/lib/
  docs-extractor.ts                 entry point: orchestrates scan → detect → assemble → manifest
  docs-extractor.types.ts           public types (DocItem, DocPage, DocsManifest, kind defs)
  doc-tags.ts                       @doc / @doc-name / @doc-is-main / @doc-order / @doc-description parser
  detectors/
    directive.detector.ts           kind: directive (existing logic moved + trimmed)
    service.detector.ts             kind: service
    function.detector.ts            kinds: provider-fn, inject-fn, function (single detector, sub-classifies)
    token.detector.ts               kind: token
    type-alias.detector.ts          kind: type-alias
    const.detector.ts               kind: const
  page-assembler.ts                 groups DocItem[] → DocPage[]; emits warnings
  examples.ts                       existing @doc-file / @doc-example / @doc-themes parser (extracted from main file)

apps/docs/src/lib/__tests__/
  doc-tags.spec.ts
  page-assembler.spec.ts
  detectors/*.spec.ts
  docs-extractor.spec.ts            integration test over fixture workspace

apps/docs/tests/fixtures/extractor/  add fixtures for service, provider-fn, inject-fn, function, const

apps/docs/src/app/pages/component-doc/  consume DocPage; render new kinds
apps/docs/src/app/components/docs-sidebar/  group from pages[]

packages/core/src/**/*.ts           migrate to add @doc / @doc-name / @doc-is-main / @category
packages/components/src/**/*.ts     same
```

## Migration

A hard cutover lands in the same change. Every existing directive/component will receive at minimum:

```ts
/**
 * @doc
 * @doc-name <slug>
 * @doc-is-main
 * @category <existing-or-new>
 * (existing summary)
 */
```

The slug for an existing component derives from its folder name (e.g. `divider/` → `divider`). The migration is mechanical and scriptable: for any class currently appearing in the manifest, emit the four tags with deterministic values. CI gates the change on a clean manifest with no warnings.

## Testing

### Unit
- `doc-tags.spec.ts` — parses each tag form, handles malformed input, treats `@internal` as suppression.
- `detectors/*.spec.ts` — one fixture file per kind; assert detector returns expected `DocItem` and skips non-`@doc` exports.
- `page-assembler.spec.ts` — single main, zero main, multi main, cross-package, ordering, missing description fallback.

### Integration
- `docs-extractor.spec.ts` — runs over `apps/docs/tests/fixtures/extractor` (extended with service/provider/inject fixtures); snapshots a stable subset of the manifest.

### E2E
- A Playwright smoke test loads two docs pages: one with mixed kinds (e.g. icon: directive + provider-fn + inject-fn + token + type-alias) and one directive-only. Assert the rendered sections, the TOC, and the deep-link anchors. Per the global E2E rule, this lands with the feature.

## Risks / open questions

- **Manifest size.** Doc-bearing exports balloon when services and helpers are included. The manifest is loaded eagerly today; if the new shape pushes past a comfortable bundle threshold (>300 KB gzipped), split it into per-page lazy chunks. Mitigation deferred to implementation if measured to be an issue.
- **Hard cutover blast radius.** Every existing component must be tagged before the change merges. The migration script is mechanical, but reviewers should expect a large diff. Mitigation: split the migration into its own commit on the same branch so the extractor change can be reviewed independently from the data churn.
- **Cross-package pages.** Allowing them is a new capability. We may discover edge cases (e.g. category collisions between core and components) only after authors start using it. Mitigation: surface every cross-package page as a warning so authors notice when they accidentally cross the boundary.

## Out-of-scope follow-ups

- Lint rule that fails CI when an exported `@Injectable` / `provideX` / `injectX` lacks `@doc`.
- Cross-page references (`@doc-link <pageName>` for "see also" links).
- Versioning per page (e.g. "added in 0.1.0").
- Markdown supplement files alongside source for long-form pages.
