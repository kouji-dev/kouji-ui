# Docs extractor v2 implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the implicit, kind-narrow docs extractor with an opt-in `@doc`-driven pipeline that detects directives, services, provider functions, inject helpers, plain functions, tokens, type aliases, and consts; groups items into pages by `@doc-name`; renders the new manifest via the existing component-doc page.

**Architecture:** The 991-line `docs-extractor.ts` is split into a thin orchestrator + per-kind detectors + a page assembler + a `@doc-*` tag parser. Each unit is independently testable. The runtime manifest contract changes shape (`pages[]` instead of `components[]`) and every existing directive in `packages/core` + `packages/components` is migrated in the same change to carry `@doc / @doc-name / @doc-is-main / @category`.

**Tech Stack:** ts-morph, `@phenomnomnominal/tsquery`, vitest, Angular 21 standalone.

**Spec:** `docs/superpowers/specs/2026-05-08-docs-extractor-v2-design.md`

---

## File Structure

```
apps/docs/src/lib/
  docs-extractor.ts                 entry point (rewritten to orchestrate)
  docs-extractor.types.ts           NEW: DocItem, DocPage, DocsManifest, kind defs, ExtractorWarning
  doc-tags.ts                       NEW: parses @doc, @doc-name, @doc-is-main, @doc-order, @doc-description
  page-assembler.ts                 NEW: DocItem[] → DocPage[]; emits warnings
  examples.ts                       NEW: extracted @doc-file / @doc-example / @doc-themes parser (moved from main file)
  detectors/
    directive.detector.ts           kind: directive (existing logic moved + trimmed)
    function.detector.ts            kinds: provider-fn, inject-fn, function (sub-classifies by AST)
    service.detector.ts             kind: service (@Injectable classes)
    token.detector.ts               kind: token (existing logic moved)
    type-alias.detector.ts          kind: type-alias (existing logic moved)
    const.detector.ts               kind: const (other exported const declarations)

apps/docs/src/lib/__tests__/
  doc-tags.spec.ts
  page-assembler.spec.ts
  detectors/directive.detector.spec.ts
  detectors/function.detector.spec.ts
  detectors/service.detector.spec.ts
  detectors/token.detector.spec.ts
  detectors/type-alias.detector.spec.ts
  detectors/const.detector.spec.ts

apps/docs/src/lib/docs-extractor.spec.ts    REWRITTEN: integration test over fixtures

apps/docs/tests/fixtures/extractor/packages/core/src/fixtures/
  internal.ts                       existing — keep (re-tagged with @doc where appropriate)
  function-kinds.ts                 NEW: provider-fn, inject-fn, function fixtures
  service-kind.ts                   NEW: service fixture
  const-kind.ts                     NEW: const fixture

apps/docs/src/app/services/docs.service.ts   types updated to new manifest shape
apps/docs/src/app/services/docs-manifest.provider.ts  TransferState shape update
apps/docs/src/app/pages/component-doc/component-doc.ts    consumes DocPage; renders kinds
apps/docs/src/app/pages/component-doc/component-doc.html  new kind-discriminated sections
apps/docs/src/app/components/docs-sidebar/docs-sidebar.ts  groups manifest.pages by categoryPath
apps/docs/src/app/app.routes.ts                routes use page.name as slug
apps/docs/src/app/app.routes.server.ts          getPrerenderParams uses new slug source

packages/core/src/**/*.ts                        every public directive gets @doc tags
packages/components/src/**/*.ts                  same
packages/core/src/icon/*.ts                      add @doc to provider/inject/types/tokens for demo of multi-kind page

apps/docs/e2e/extractor-v2.spec.ts                NEW Playwright smoke test
```

---

## Conventions used in tests

- Vitest + ts-morph + tsquery (matches existing extractor tests).
- Each detector unit test passes a tiny in-memory ts-morph `SourceFile` and asserts the returned `DocItem[]`.
- Integration tests run `extractDocsManifest(FIXTURE_ROOT)` over `apps/docs/tests/fixtures/extractor/`.
- The fixture workspace is a real ts-morph project rooted at the fixtures dir — it has its own `pnpm-workspace.yaml` and `tsconfig.lib.json`.

---

### Task 1: Scaffold types + entry-file split (no logic move yet)

**Files:**
- Create: `apps/docs/src/lib/docs-extractor.types.ts`

- [ ] **Step 1: Create the types file**

```ts
// apps/docs/src/lib/docs-extractor.types.ts

export type SourcePkg = 'core' | 'components';

export type DocKind =
  | 'directive'
  | 'service'
  | 'provider-fn'
  | 'inject-fn'
  | 'function'
  | 'token'
  | 'type-alias'
  | 'const';

export interface InputDef {
  name: string;
  type: string;
  required: boolean;
  isModel: boolean;
  description: string;
  defaultValue?: string;
  sourceDirective?: string;
}

export type ModelDef = InputDef;

export interface OutputDef {
  name: string;
  type: string;
  description: string;
  sourceDirective?: string;
}

export interface DirectiveDef {
  className: string;
  selector: string;
  exportAs?: string;
  inputs: InputDef[];
  outputs: OutputDef[];
  models: ModelDef[];
  required: boolean;
}

export interface ServiceDef {
  className: string;
  methods: { name: string; signature: string; description: string }[];
  properties: { name: string; type: string; description: string }[];
}

export interface FunctionParam {
  name: string;
  type: string;
  description: string;
  optional: boolean;
}

export interface FunctionDef {
  name: string;
  signature: string;
  parameters: FunctionParam[];
  returnType: string;
}

export interface TokenDef {
  name: string;
  type: string;
  description: string;
}

export interface TypeAliasDef {
  name: string;
  type: string;
  description: string;
}

export interface ConstDef {
  name: string;
  type: string;
  literalValue?: string;
  description: string;
}

export interface ExampleFile {
  lang: 'ts' | 'html' | 'css';
  filename: string;
  content: string;
  exportName?: string;
}

export interface DocExample {
  label: string;
  themedFiles: Record<string, ExampleFile[]>;
}

export interface DocItem {
  /** Stable id within a manifest. Built from `<pkg>:<filePath>:<symbol>`. */
  id: string;
  symbol: string;
  kind: DocKind;
  pkg: SourcePkg;
  filePath: string;
  description: string;
  isMain: boolean;
  order: number | null;
  /** Source-file occurrence index, used as deterministic tiebreaker. */
  sourceOrder: number;
  directive?: DirectiveDef;
  service?: ServiceDef;
  function?: FunctionDef;
  token?: TokenDef;
  typeAlias?: TypeAliasDef;
  const?: ConstDef;
  examples?: DocExample[];
}

export interface DocPage {
  name: string;
  pkg: SourcePkg;
  categoryPath: string[];
  title: string;
  description: string;
  mainItemId: string;
  items: DocItem[];
}

export type ExtractorWarningKind =
  | 'no-main'
  | 'multi-main'
  | 'cross-package'
  | 'unsupported-carrier'
  | 'unknown-tag'
  | 'duplicate-id';

export interface ExtractorWarning {
  kind: ExtractorWarningKind;
  message: string;
  filePath?: string;
  line?: number;
  pageName?: string;
}

export interface DocsManifest {
  generatedAt: string;
  pages: DocPage[];
  warnings: ExtractorWarning[];
}
```

- [ ] **Step 2: Verify TS still compiles via existing tests (extractor not yet rewired)**

```
pnpm --filter docs test -- docs-extractor
```
Expected: PASS — no new tests yet, existing tests still green (the new types file is unused so far).

- [ ] **Step 3: Commit**

```
git add apps/docs/src/lib/docs-extractor.types.ts
git commit -m "feat(docs/extractor): add v2 manifest types"
```

---

### Task 2: `@doc-*` tag parser (TDD)

**Files:**
- Create: `apps/docs/src/lib/__tests__/doc-tags.spec.ts`
- Create: `apps/docs/src/lib/doc-tags.ts`

- [ ] **Step 1: Write failing tests**

```ts
// apps/docs/src/lib/__tests__/doc-tags.spec.ts
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { parseDocTags } from '../doc-tags';

function makeNode(jsdoc: string, decl = 'export const X = 1;'): ts.Node {
  const sf = ts.createSourceFile(
    'test.ts',
    `${jsdoc}\n${decl}`,
    ts.ScriptTarget.Latest,
    true,
  );
  // First non-import statement
  return sf.statements[0]!;
}

describe('parseDocTags', () => {
  it('returns hasDoc=false when @doc is absent', () => {
    const node = makeNode('/** Just a description. */');
    expect(parseDocTags(node).hasDoc).toBe(false);
  });

  it('returns hasDoc=true when @doc is present', () => {
    const node = makeNode('/**\n * Summary.\n * @doc\n * @doc-name foo\n */');
    expect(parseDocTags(node).hasDoc).toBe(true);
  });

  it('parses @doc-name', () => {
    const node = makeNode('/**\n * @doc\n * @doc-name icon\n */');
    expect(parseDocTags(node).name).toBe('icon');
  });

  it('parses @doc-is-main as boolean presence', () => {
    const node = makeNode('/**\n * @doc\n * @doc-name x\n * @doc-is-main\n */');
    expect(parseDocTags(node).isMain).toBe(true);
  });

  it('parses @doc-order as integer', () => {
    const node = makeNode('/**\n * @doc\n * @doc-name x\n * @doc-order 3\n */');
    expect(parseDocTags(node).order).toBe(3);
  });

  it('returns null order when @doc-order is missing', () => {
    const node = makeNode('/**\n * @doc\n * @doc-name x\n */');
    expect(parseDocTags(node).order).toBeNull();
  });

  it('parses multi-word @doc-description preserving whitespace', () => {
    const node = makeNode(
      '/**\n * @doc\n * @doc-name x\n * @doc-description Hello world, multi word.\n */',
    );
    expect(parseDocTags(node).description).toBe('Hello world, multi word.');
  });

  it('reports an unknown tag warning for @doc-typo', () => {
    const node = makeNode('/**\n * @doc\n * @doc-name x\n * @doc-typo bar\n */');
    const result = parseDocTags(node);
    expect(result.unknownTags).toEqual(['doc-typo']);
  });

  it('returns hasDoc=false when @internal is also present (suppress)', () => {
    const node = makeNode('/**\n * @doc\n * @doc-name x\n * @internal\n */');
    expect(parseDocTags(node).hasDoc).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (module missing)**

```
pnpm --filter docs test -- doc-tags
```
Expected: FAIL — `Cannot find module '../doc-tags'`.

- [ ] **Step 3: Implement the parser**

```ts
// apps/docs/src/lib/doc-tags.ts
import ts from 'typescript';

export interface ParsedDocTags {
  hasDoc: boolean;
  name: string | null;
  isMain: boolean;
  order: number | null;
  description: string | null;
  unknownTags: string[];
}

const KNOWN_DOC_TAGS = new Set([
  'doc',
  'doc-name',
  'doc-is-main',
  'doc-order',
  'doc-description',
  'doc-file',
  'doc-example',
  'doc-themes',
  'category',
  'internal',
  'example',
  'deprecated',
  'param',
  'returns',
  'see',
]);

/**
 * Parse the kouji `@doc-*` tag family from a node's JSDoc.
 *
 * Returns `hasDoc: false` when `@doc` is absent OR when `@internal` is set
 * (treat internal-tagged exports as suppressed even if they were marked
 * `@doc`).
 */
export function parseDocTags(node: ts.Node): ParsedDocTags {
  const tags = ts.getJSDocTags(node);
  const result: ParsedDocTags = {
    hasDoc: false,
    name: null,
    isMain: false,
    order: null,
    description: null,
    unknownTags: [],
  };

  let internal = false;

  for (const tag of tags) {
    const tagName = tag.tagName.text;
    const comment = typeof tag.comment === 'string'
      ? tag.comment.trim()
      : ts.getTextOfJSDocComment(tag.comment) ?? '';

    switch (tagName) {
      case 'doc':
        result.hasDoc = true;
        break;
      case 'doc-name':
        result.name = comment.split(/\s+/)[0] || null;
        break;
      case 'doc-is-main':
        result.isMain = true;
        break;
      case 'doc-order': {
        const n = Number.parseInt(comment, 10);
        if (Number.isFinite(n)) result.order = n;
        break;
      }
      case 'doc-description':
        result.description = comment.trim() || null;
        break;
      case 'internal':
        internal = true;
        break;
      default:
        if (!KNOWN_DOC_TAGS.has(tagName)) {
          result.unknownTags.push(tagName);
        }
    }
  }

  if (internal) {
    result.hasDoc = false;
  }

  return result;
}
```

- [ ] **Step 4: Run tests — expect PASS (9 tests)**

```
pnpm --filter docs test -- doc-tags
```
Expected: PASS.

- [ ] **Step 5: Commit**

```
git add apps/docs/src/lib/doc-tags.ts apps/docs/src/lib/__tests__/doc-tags.spec.ts
git commit -m "feat(docs/extractor): add @doc-* tag parser"
```

---

### Task 3: Page assembler (TDD)

**Files:**
- Create: `apps/docs/src/lib/__tests__/page-assembler.spec.ts`
- Create: `apps/docs/src/lib/page-assembler.ts`

- [ ] **Step 1: Write failing tests**

```ts
// apps/docs/src/lib/__tests__/page-assembler.spec.ts
import { describe, expect, it } from 'vitest';
import { assemblePages } from '../page-assembler';
import type { DocItem } from '../docs-extractor.types';

function item(partial: Partial<DocItem> & { id: string; symbol: string }): DocItem {
  return {
    kind: 'directive',
    pkg: 'core',
    filePath: 'a.ts',
    description: '',
    isMain: false,
    order: null,
    sourceOrder: 0,
    ...partial,
  };
}

describe('assemblePages', () => {
  it('groups items by @doc-name and pins main item first', () => {
    const items: DocItem[] = [
      item({ id: '1', symbol: 'A', sourceOrder: 0 }),
      item({ id: '2', symbol: 'Main', isMain: true, sourceOrder: 1 }),
    ];
    const { pages } = assemblePages(items, { name: 'icon' } as any);
    // For this minimal repro we pass name via the per-item @doc-name attribute
    expect(pages.length).toBeGreaterThanOrEqual(0);
  });
});
```

(Initial test will fail; we will replace this with the full suite once the API is settled. Proceed to step 2.)

- [ ] **Step 2: Settle the API and replace the test**

The assembler takes a flat list of items keyed by their parsed `@doc-name` and returns `{ pages, warnings }`. The per-item name lives on the `DocItem` itself — we add a `pageName` field for that. Update the types file:

```ts
// apps/docs/src/lib/docs-extractor.types.ts — add to DocItem:
//   pageName: string;
```

Then replace `apps/docs/src/lib/__tests__/page-assembler.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { assemblePages } from '../page-assembler';
import type { DocItem } from '../docs-extractor.types';

function item(over: Partial<DocItem> & { id: string; symbol: string; pageName: string }): DocItem {
  return {
    kind: 'directive',
    pkg: 'core',
    filePath: 'a.ts',
    description: '',
    isMain: false,
    order: null,
    sourceOrder: 0,
    ...over,
  } as DocItem;
}

describe('assemblePages', () => {
  it('groups by pageName and pins the @doc-is-main item first', () => {
    const items = [
      item({ id: '1', symbol: 'Helper', pageName: 'icon', sourceOrder: 0 }),
      item({ id: '2', symbol: 'KjIcon', pageName: 'icon', isMain: true, sourceOrder: 1, description: 'main desc' }),
      item({ id: '3', symbol: 'Other', pageName: 'icon', sourceOrder: 2 }),
    ];
    const { pages, warnings } = assemblePages(items);
    expect(pages).toHaveLength(1);
    expect(pages[0].name).toBe('icon');
    expect(pages[0].mainItemId).toBe('2');
    expect(pages[0].items.map(i => i.id)).toEqual(['2', '1', '3']);
    expect(pages[0].title).toBe('KjIcon');
    expect(pages[0].description).toBe('main desc');
    expect(warnings).toEqual([]);
  });

  it('orders non-main items by @doc-order then sourceOrder', () => {
    const items = [
      item({ id: 'main', symbol: 'M', pageName: 'p', isMain: true, sourceOrder: 0 }),
      item({ id: 'b', symbol: 'B', pageName: 'p', order: 2, sourceOrder: 1 }),
      item({ id: 'a', symbol: 'A', pageName: 'p', order: 1, sourceOrder: 2 }),
      item({ id: 'c', symbol: 'C', pageName: 'p', sourceOrder: 3 }),
    ];
    const { pages } = assemblePages(items);
    expect(pages[0].items.map(i => i.id)).toEqual(['main', 'a', 'b', 'c']);
  });

  it('warns and falls back when no item is @doc-is-main', () => {
    const items = [
      item({ id: '1', symbol: 'A', pageName: 'p', order: 2, sourceOrder: 1 }),
      item({ id: '2', symbol: 'B', pageName: 'p', order: 1, sourceOrder: 0, description: 'b desc' }),
    ];
    const { pages, warnings } = assemblePages(items);
    expect(pages[0].mainItemId).toBe('2');
    expect(pages[0].title).toBe('B');
    expect(pages[0].description).toBe('b desc');
    expect(warnings.find(w => w.kind === 'no-main' && w.pageName === 'p')).toBeDefined();
  });

  it('warns and uses the first when multiple items are @doc-is-main', () => {
    const items = [
      item({ id: '1', symbol: 'A', pageName: 'p', isMain: true, sourceOrder: 0 }),
      item({ id: '2', symbol: 'B', pageName: 'p', isMain: true, sourceOrder: 1 }),
    ];
    const { pages, warnings } = assemblePages(items);
    expect(pages[0].mainItemId).toBe('1');
    expect(warnings.find(w => w.kind === 'multi-main' && w.pageName === 'p')).toBeDefined();
  });

  it('warns when a page spans both core and components', () => {
    const items = [
      item({ id: '1', symbol: 'A', pageName: 'p', pkg: 'core', isMain: true, sourceOrder: 0 }),
      item({ id: '2', symbol: 'B', pageName: 'p', pkg: 'components', sourceOrder: 1 }),
    ];
    const { pages, warnings } = assemblePages(items);
    expect(pages[0].pkg).toBe('core'); // taken from main
    expect(warnings.find(w => w.kind === 'cross-package' && w.pageName === 'p')).toBeDefined();
  });

  it('reports duplicate ids', () => {
    const items = [
      item({ id: 'dup', symbol: 'A', pageName: 'p', isMain: true, sourceOrder: 0 }),
      item({ id: 'dup', symbol: 'B', pageName: 'p', sourceOrder: 1 }),
    ];
    const { warnings } = assemblePages(items);
    expect(warnings.find(w => w.kind === 'duplicate-id')).toBeDefined();
  });
});
```

- [ ] **Step 3: Run tests — expect FAIL**

```
pnpm --filter docs test -- page-assembler
```
Expected: FAIL — module missing AND `pageName` field on DocItem missing (TS error).

- [ ] **Step 4: Add `pageName: string` to `DocItem` in types file**

Edit `apps/docs/src/lib/docs-extractor.types.ts` — inside `DocItem` insert after `symbol`:

```ts
  pageName: string;
```

- [ ] **Step 5: Implement the assembler**

```ts
// apps/docs/src/lib/page-assembler.ts
import type {
  DocItem,
  DocPage,
  ExtractorWarning,
  SourcePkg,
} from './docs-extractor.types';

export interface AssembledPages {
  pages: DocPage[];
  warnings: ExtractorWarning[];
}

export function assemblePages(items: DocItem[]): AssembledPages {
  const warnings: ExtractorWarning[] = [];
  const seenIds = new Set<string>();
  for (const item of items) {
    if (seenIds.has(item.id)) {
      warnings.push({
        kind: 'duplicate-id',
        message: `duplicate item id '${item.id}' (${item.symbol} in ${item.filePath})`,
        filePath: item.filePath,
      });
    } else {
      seenIds.add(item.id);
    }
  }

  const groups = new Map<string, DocItem[]>();
  for (const item of items) {
    const list = groups.get(item.pageName) ?? [];
    list.push(item);
    groups.set(item.pageName, list);
  }

  const pages: DocPage[] = [];
  for (const [name, group] of groups.entries()) {
    const mains = group.filter(i => i.isMain);
    let main: DocItem;
    if (mains.length === 1) {
      main = mains[0];
    } else if (mains.length === 0) {
      const sorted = sortItems(group);
      main = sorted[0];
      warnings.push({
        kind: 'no-main',
        message: `page '${name}' has no @doc-is-main; falling back to '${main.symbol}'`,
        pageName: name,
      });
    } else {
      const sorted = sortItems(mains);
      main = sorted[0];
      warnings.push({
        kind: 'multi-main',
        message: `page '${name}' has multiple @doc-is-main items: ${mains.map(i => i.symbol).join(', ')}; using '${main.symbol}'`,
        pageName: name,
      });
    }

    const pkg: SourcePkg = main.pkg;
    const crossPkg = group.some(i => i.pkg !== pkg);
    if (crossPkg) {
      warnings.push({
        kind: 'cross-package',
        message: `page '${name}' spans both core and components — using main item's package (${pkg}) for taxonomy`,
        pageName: name,
      });
    }

    const sortedRest = sortItems(group.filter(i => i.id !== main.id));
    const sortedItems = [main, ...sortedRest];

    pages.push({
      name,
      pkg,
      // categoryPath/title get populated by the orchestrator (it knows
      // @category) — we leave them empty here. The orchestrator's
      // responsibility is documented in docs-extractor.ts.
      categoryPath: [],
      title: main.symbol,
      description: main.description,
      mainItemId: main.id,
      items: sortedItems,
    });
  }

  pages.sort((a, b) => a.name.localeCompare(b.name));
  return { pages, warnings };
}

function sortItems(list: DocItem[]): DocItem[] {
  return [...list].sort((a, b) => {
    const ao = a.order ?? Number.POSITIVE_INFINITY;
    const bo = b.order ?? Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    return a.sourceOrder - b.sourceOrder;
  });
}
```

- [ ] **Step 6: Run tests — expect PASS (6 tests)**

- [ ] **Step 7: Commit**

```
git add apps/docs/src/lib/page-assembler.ts apps/docs/src/lib/__tests__/page-assembler.spec.ts apps/docs/src/lib/docs-extractor.types.ts
git commit -m "feat(docs/extractor): add page assembler with main-pick + warnings"
```

---

### Task 4: Examples module (extract existing logic)

The existing extractor mixes example parsing (`@doc-file`, `@doc-themes`, `@doc-example`) with directive extraction. Move it to its own module without changing behavior.

**Files:**
- Create: `apps/docs/src/lib/examples.ts`

- [ ] **Step 1: Move helpers verbatim**

Copy these functions from `apps/docs/src/lib/docs-extractor.ts` into a new file `apps/docs/src/lib/examples.ts` and export them:

- `getJsDocExamples`
- `getDocFiles`
- `extractExportName`
- `readExampleFiles`
- `parseDocFileEntries`
- `getDocThemes`
- `getDocExamples`
- `stripJsDocPrefixes`
- `stripJsDocLineMarkers`
- `getJsDocBlock`

Re-export `ExampleFile` and `DocExample` types from `./docs-extractor.types`.

- [ ] **Step 2: Update `docs-extractor.ts` to import them from `./examples` instead of defining inline**

Delete the inline definitions in `apps/docs/src/lib/docs-extractor.ts` and add at the top:

```ts
import {
  getJsDocExamples,
  getDocFiles,
  getDocThemes,
  getDocExamples,
} from './examples';
```

- [ ] **Step 3: Run existing extractor tests — expect PASS unchanged**

```
pnpm --filter docs test -- docs-extractor
```

- [ ] **Step 4: Commit**

```
git add apps/docs/src/lib/examples.ts apps/docs/src/lib/docs-extractor.ts
git commit -m "refactor(docs/extractor): move example parsers to ./examples"
```

---

### Task 5: Directive detector (TDD)

**Files:**
- Create: `apps/docs/src/lib/__tests__/detectors/directive.detector.spec.ts`
- Create: `apps/docs/src/lib/detectors/directive.detector.ts`

The directive detector wraps the existing extraction logic but emits `DocItem`s instead of registering into a per-folder `ComponentDoc`.

- [ ] **Step 1: Write failing tests**

```ts
// apps/docs/src/lib/__tests__/detectors/directive.detector.spec.ts
import { Project } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import { detectDirectives } from '../../detectors/directive.detector';

function projectWith(src: string) {
  const project = new Project({ useInMemoryFileSystem: true });
  return project.createSourceFile('icon.directive.ts', src);
}

describe('detectDirectives', () => {
  it('skips non-@doc-tagged classes', () => {
    const sf = projectWith(`
      import { Directive } from '@angular/core';
      /** Plain. */
      @Directive({ selector: '[x]', standalone: true })
      export class XDir {}
    `);
    expect(detectDirectives(sf, 'core')).toEqual([]);
  });

  it('emits a DocItem for an @doc-tagged directive', () => {
    const sf = projectWith(`
      import { Directive } from '@angular/core';
      /**
       * The icon directive.
       * @doc
       * @doc-name icon
       * @doc-is-main
       * @category Core/Layout/Icon
       */
      @Directive({ selector: '[kjIcon]', standalone: true })
      export class KjIconDirective {}
    `);
    const items = detectDirectives(sf, 'core');
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('directive');
    expect(items[0].symbol).toBe('KjIconDirective');
    expect(items[0].pageName).toBe('icon');
    expect(items[0].isMain).toBe(true);
    expect(items[0].directive?.selector).toBe('[kjIcon]');
  });

  it('respects @internal even if @doc is present', () => {
    const sf = projectWith(`
      import { Directive } from '@angular/core';
      /**
       * @doc
       * @doc-name x
       * @internal
       */
      @Directive({ selector: '[y]', standalone: true })
      export class YDir {}
    `);
    expect(detectDirectives(sf, 'core')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```
pnpm --filter docs test -- directive.detector
```

- [ ] **Step 3: Implement the detector**

Create `apps/docs/src/lib/detectors/directive.detector.ts`. The implementation re-uses the existing helpers from `docs-extractor.ts`:

```ts
// apps/docs/src/lib/detectors/directive.detector.ts
import { tsquery } from '@phenomnomnominal/tsquery';
import ts from 'typescript';
import { SourceFile } from 'ts-morph';
import { dirname } from 'node:path';
import { parseDocTags } from '../doc-tags';
import { getDocFiles, getDocThemes, getDocExamples } from '../examples';
import type {
  DocItem,
  InputDef,
  ModelDef,
  OutputDef,
  SourcePkg,
} from '../docs-extractor.types';
// Existing helpers stay in docs-extractor.ts for now and are re-exported
// via the helpers module created in Task 6:
import {
  extractInputs,
  extractOutputs,
  extractHostDirectiveInputs,
  getDecoratorArg,
  extractDecoratorProp,
  getJsDocDescription,
  getRequired,
} from '../extractor-helpers';

const DIRECTIVE_CLASS_SELECTOR =
  'ClassDeclaration:has(Decorator:has(Identifier[text="Directive"])), ClassDeclaration:has(Decorator:has(Identifier[text="Component"]))';

export function detectDirectives(
  morphFile: SourceFile,
  pkg: SourcePkg,
): DocItem[] {
  const tsSourceFile = tsquery.ast(
    morphFile.getFullText(),
    morphFile.getFilePath(),
    ts.ScriptKind.TS,
  );

  const classes = tsquery<ts.ClassDeclaration>(tsSourceFile, DIRECTIVE_CLASS_SELECTOR);
  const items: DocItem[] = [];
  let sourceOrder = 0;

  for (const cls of classes) {
    const className = cls.name?.text ?? '';
    const isExported = cls.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!isExported || !className) continue;

    const tags = parseDocTags(cls);
    if (!tags.hasDoc || !tags.name) continue;

    const decoratorArg = getDecoratorArg(cls);
    const selector = extractDecoratorProp(decoratorArg, 'selector') ?? '';
    if (!selector) continue;

    const exportAs = extractDecoratorProp(decoratorArg, 'exportAs');
    const sourceDir = dirname(morphFile.getFilePath());
    const description = tags.description ?? getJsDocDescription(cls);
    const ownInputs = extractInputs(cls, tsSourceFile, morphFile);
    const hdInputs = extractHostDirectiveInputs(decoratorArg);
    const allInputs = [...ownInputs, ...hdInputs];
    const inputs: InputDef[] = allInputs.filter(i => !i.isModel);
    const models: ModelDef[] = allInputs.filter(i => i.isModel);
    const outputs: OutputDef[] = extractOutputs(cls, tsSourceFile, morphFile);
    const required = getRequired(cls);
    const exampleFiles = getDocFiles(cls, tsSourceFile, sourceDir);
    const themedExamples = getDocThemes(cls, tsSourceFile, sourceDir);
    const docExamples = getDocExamples(cls, tsSourceFile, sourceDir);
    const id = makeItemId(pkg, morphFile.getFilePath(), className);

    items.push({
      id,
      symbol: className,
      pageName: tags.name,
      kind: 'directive',
      pkg,
      filePath: morphFile.getFilePath(),
      description,
      isMain: tags.isMain,
      order: tags.order,
      sourceOrder: sourceOrder++,
      directive: {
        className,
        selector,
        ...(exportAs ? { exportAs } : {}),
        inputs,
        outputs,
        models,
        required,
      },
      examples: docExamples.length
        ? docExamples
        : (Object.keys(themedExamples).length || exampleFiles.length
            ? [{ label: 'default', themedFiles: Object.keys(themedExamples).length ? themedExamples : { default: exampleFiles } }]
            : undefined),
    });
  }

  return items;
}

function makeItemId(pkg: SourcePkg, filePath: string, symbol: string): string {
  // Stable across renames within the same file.
  const rel = filePath.replace(/\\/g, '/').split('/packages/')[1] ?? filePath;
  return `${pkg}:${rel}:${symbol}`;
}
```

- [ ] **Step 4: Extract shared helpers into `extractor-helpers.ts`**

Move these from `apps/docs/src/lib/docs-extractor.ts` to a new file `apps/docs/src/lib/extractor-helpers.ts` and `export` them:

- `getJsDocDescription`
- `extractInputs`
- `extractOutputs`
- `extractHostDirectiveInputs`
- `getDecoratorArg`
- `extractDecoratorProp`
- `extractBracketContent`
- `getRequired`
- `extractLiteralDefault`
- `unwrapSignalType`

Update `apps/docs/src/lib/docs-extractor.ts` to import them from `./extractor-helpers` instead of defining inline.

- [ ] **Step 5: Run tests — expect PASS (3 detector tests + existing extractor tests still green)**

```
pnpm --filter docs test -- directive.detector
pnpm --filter docs test -- docs-extractor
```

- [ ] **Step 6: Commit**

```
git add apps/docs/src/lib/detectors/directive.detector.ts apps/docs/src/lib/__tests__/detectors/directive.detector.spec.ts apps/docs/src/lib/extractor-helpers.ts apps/docs/src/lib/docs-extractor.ts
git commit -m "feat(docs/extractor): add directive detector + helpers split"
```

---

### Task 6: Function detector — provider-fn / inject-fn / function (TDD)

**Files:**
- Create: `apps/docs/src/lib/__tests__/detectors/function.detector.spec.ts`
- Create: `apps/docs/src/lib/detectors/function.detector.ts`

A single detector handles all three function kinds. Sub-classification rules:

- Return type matches `EnvironmentProviders` or `Provider[]` → `provider-fn`.
- Body contains a `inject(` call → `inject-fn`.
- Otherwise → `function`.

- [ ] **Step 1: Write failing tests**

```ts
// apps/docs/src/lib/__tests__/detectors/function.detector.spec.ts
import { Project } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import { detectFunctions } from '../../detectors/function.detector';

function projectWith(src: string) {
  const project = new Project({ useInMemoryFileSystem: true });
  return project.createSourceFile('a.ts', src);
}

describe('detectFunctions', () => {
  it('classifies a provider function via return type', () => {
    const sf = projectWith(`
      import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
      /**
       * Register icons.
       * @doc
       * @doc-name icon
       * @doc-order 2
       */
      export function provideIcons(map: Record<string, string>): EnvironmentProviders {
        return makeEnvironmentProviders([]);
      }
    `);
    const items = detectFunctions(sf, 'core');
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('provider-fn');
    expect(items[0].symbol).toBe('provideIcons');
    expect(items[0].order).toBe(2);
    expect(items[0].function?.parameters[0].name).toBe('map');
  });

  it('classifies an inject helper via inject() body call', () => {
    const sf = projectWith(`
      import { inject } from '@angular/core';
      /**
       * @doc
       * @doc-name icon
       */
      export function injectKjIconResolver(): (name: string) => string | null {
        const x = inject(String);
        return () => null;
      }
    `);
    const items = detectFunctions(sf, 'core');
    expect(items[0].kind).toBe('inject-fn');
    expect(items[0].symbol).toBe('injectKjIconResolver');
  });

  it('classifies a plain function', () => {
    const sf = projectWith(`
      /**
       * @doc
       * @doc-name icon
       */
      export function getIconMode(name: string): 'svg' | 'font' {
        return name.startsWith('@font.') ? 'font' : 'svg';
      }
    `);
    const items = detectFunctions(sf, 'core');
    expect(items[0].kind).toBe('function');
  });

  it('skips non-@doc functions', () => {
    const sf = projectWith(`
      export function helper() { return 1; }
    `);
    expect(detectFunctions(sf, 'core')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
// apps/docs/src/lib/detectors/function.detector.ts
import ts from 'typescript';
import { tsquery } from '@phenomnomnominal/tsquery';
import { SourceFile } from 'ts-morph';
import { parseDocTags } from '../doc-tags';
import type {
  DocItem,
  DocKind,
  FunctionDef,
  FunctionParam,
  SourcePkg,
} from '../docs-extractor.types';

export function detectFunctions(
  morphFile: SourceFile,
  pkg: SourcePkg,
): DocItem[] {
  const tsSourceFile = tsquery.ast(
    morphFile.getFullText(),
    morphFile.getFilePath(),
    ts.ScriptKind.TS,
  );

  const fns = tsquery<ts.FunctionDeclaration>(
    tsSourceFile,
    'FunctionDeclaration:has(ExportKeyword)',
  );
  const items: DocItem[] = [];
  let sourceOrder = 0;

  for (const fn of fns) {
    if (!fn.name) continue;
    const tags = parseDocTags(fn);
    if (!tags.hasDoc || !tags.name) continue;

    const symbol = fn.name.text;
    const returnType = fn.type ? fn.type.getText(tsSourceFile) : 'void';
    const kind: DocKind = classify(fn, returnType);
    const params: FunctionParam[] = fn.parameters.map(p => paramOf(p, tsSourceFile));
    const signature = `${symbol}(${params
      .map(p => `${p.name}${p.optional ? '?' : ''}: ${p.type}`)
      .join(', ')}): ${returnType}`;

    const def: FunctionDef = { name: symbol, signature, parameters: params, returnType };
    const description = tags.description ?? jsDocSummary(fn);

    items.push({
      id: makeItemId(pkg, morphFile.getFilePath(), symbol),
      symbol,
      pageName: tags.name,
      kind,
      pkg,
      filePath: morphFile.getFilePath(),
      description,
      isMain: tags.isMain,
      order: tags.order,
      sourceOrder: sourceOrder++,
      function: def,
    });
  }

  return items;
}

function classify(fn: ts.FunctionDeclaration, returnType: string): DocKind {
  if (/EnvironmentProviders|Provider\[\]/.test(returnType)) return 'provider-fn';
  if (fn.body && containsInjectCall(fn.body)) return 'inject-fn';
  return 'function';
}

function containsInjectCall(body: ts.Block): boolean {
  let found = false;
  body.forEachChild(function visit(n) {
    if (found) return;
    if (
      ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) &&
      n.expression.text === 'inject'
    ) {
      found = true;
      return;
    }
    n.forEachChild(visit);
  });
  return found;
}

function paramOf(p: ts.ParameterDeclaration, sf: ts.SourceFile): FunctionParam {
  return {
    name: ts.isIdentifier(p.name) ? p.name.text : p.name.getText(sf),
    type: p.type ? p.type.getText(sf) : 'unknown',
    description: '',
    optional: !!p.questionToken || !!p.initializer,
  };
}

function jsDocSummary(node: ts.Node): string {
  const block = ts.getJSDocCommentsAndTags(node)[0];
  if (!block || !ts.isJSDoc(block)) return '';
  const c = block.comment;
  if (!c) return '';
  return typeof c === 'string' ? c.trim() : (ts.getTextOfJSDocComment(c) ?? '').trim();
}

function makeItemId(pkg: SourcePkg, filePath: string, symbol: string): string {
  const rel = filePath.replace(/\\/g, '/').split('/packages/')[1] ?? filePath;
  return `${pkg}:${rel}:${symbol}`;
}
```

- [ ] **Step 4: Run — expect PASS (4 tests)**

- [ ] **Step 5: Commit**

```
git add apps/docs/src/lib/detectors/function.detector.ts apps/docs/src/lib/__tests__/detectors/function.detector.spec.ts
git commit -m "feat(docs/extractor): add function detector (provider-fn/inject-fn/function)"
```

---

### Task 7: Service detector (TDD)

**Files:**
- Create: `apps/docs/src/lib/__tests__/detectors/service.detector.spec.ts`
- Create: `apps/docs/src/lib/detectors/service.detector.ts`

- [ ] **Step 1: Write failing tests**

```ts
// apps/docs/src/lib/__tests__/detectors/service.detector.spec.ts
import { Project } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import { detectServices } from '../../detectors/service.detector';

function projectWith(src: string) {
  const project = new Project({ useInMemoryFileSystem: true });
  return project.createSourceFile('svc.ts', src);
}

describe('detectServices', () => {
  it('emits a DocItem for an @doc-tagged @Injectable class', () => {
    const sf = projectWith(`
      import { Injectable } from '@angular/core';
      /**
       * Manages icons at runtime.
       * @doc
       * @doc-name icon-registry
       * @doc-is-main
       */
      @Injectable({ providedIn: 'root' })
      export class IconRegistry {
        /** Public count of registered icons. */
        public count = 0;
        /** Register an icon by name. */
        register(name: string, value: string): void {}
        /** @internal */
        _private = 1;
      }
    `);
    const items = detectServices(sf, 'core');
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('service');
    expect(items[0].symbol).toBe('IconRegistry');
    const props = items[0].service!.properties.map(p => p.name);
    const methods = items[0].service!.methods.map(m => m.name);
    expect(props).toContain('count');
    expect(props).not.toContain('_private');
    expect(methods).toContain('register');
  });

  it('skips non-@doc services', () => {
    const sf = projectWith(`
      import { Injectable } from '@angular/core';
      @Injectable() export class S {}
    `);
    expect(detectServices(sf, 'core')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
// apps/docs/src/lib/detectors/service.detector.ts
import ts from 'typescript';
import { tsquery } from '@phenomnomnominal/tsquery';
import { SourceFile } from 'ts-morph';
import { parseDocTags } from '../doc-tags';
import type { DocItem, ServiceDef, SourcePkg } from '../docs-extractor.types';

const SERVICE_CLASS_SELECTOR =
  'ClassDeclaration:has(Decorator:has(Identifier[text="Injectable"]))';

export function detectServices(
  morphFile: SourceFile,
  pkg: SourcePkg,
): DocItem[] {
  const tsSourceFile = tsquery.ast(
    morphFile.getFullText(),
    morphFile.getFilePath(),
    ts.ScriptKind.TS,
  );

  const classes = tsquery<ts.ClassDeclaration>(tsSourceFile, SERVICE_CLASS_SELECTOR);
  const items: DocItem[] = [];
  let sourceOrder = 0;

  for (const cls of classes) {
    if (!cls.name) continue;
    const isExported = cls.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!isExported) continue;

    const tags = parseDocTags(cls);
    if (!tags.hasDoc || !tags.name) continue;

    const className = cls.name.text;
    const def: ServiceDef = {
      className,
      methods: [],
      properties: [],
    };

    for (const member of cls.members) {
      if (hasInternalTag(member)) continue;
      if (memberIsPrivate(member)) continue;
      if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
        def.methods.push({
          name: member.name.text,
          signature: methodSignature(member, tsSourceFile),
          description: jsDocSummary(member),
        });
      } else if (
        ts.isPropertyDeclaration(member) &&
        member.name &&
        ts.isIdentifier(member.name)
      ) {
        def.properties.push({
          name: member.name.text,
          type: member.type ? member.type.getText(tsSourceFile) : inferredType(member, tsSourceFile),
          description: jsDocSummary(member),
        });
      }
    }

    items.push({
      id: makeItemId(pkg, morphFile.getFilePath(), className),
      symbol: className,
      pageName: tags.name,
      kind: 'service',
      pkg,
      filePath: morphFile.getFilePath(),
      description: tags.description ?? jsDocSummary(cls),
      isMain: tags.isMain,
      order: tags.order,
      sourceOrder: sourceOrder++,
      service: def,
    });
  }

  return items;
}

function memberIsPrivate(m: ts.ClassElement): boolean {
  return !!m.modifiers?.some(
    mod => mod.kind === ts.SyntaxKind.PrivateKeyword || mod.kind === ts.SyntaxKind.ProtectedKeyword,
  );
}

function hasInternalTag(node: ts.Node): boolean {
  return ts.getJSDocTags(node).some(t => t.tagName.text === 'internal');
}

function methodSignature(m: ts.MethodDeclaration, sf: ts.SourceFile): string {
  const name = ts.isIdentifier(m.name) ? m.name.text : m.name.getText(sf);
  const params = m.parameters
    .map(p => `${p.name.getText(sf)}${p.questionToken ? '?' : ''}: ${p.type ? p.type.getText(sf) : 'unknown'}`)
    .join(', ');
  const ret = m.type ? m.type.getText(sf) : 'unknown';
  return `${name}(${params}): ${ret}`;
}

function inferredType(p: ts.PropertyDeclaration, sf: ts.SourceFile): string {
  if (!p.initializer) return 'unknown';
  return p.initializer.getText(sf);
}

function jsDocSummary(node: ts.Node): string {
  const block = ts.getJSDocCommentsAndTags(node)[0];
  if (!block || !ts.isJSDoc(block)) return '';
  const c = block.comment;
  if (!c) return '';
  return typeof c === 'string' ? c.trim() : (ts.getTextOfJSDocComment(c) ?? '').trim();
}

function makeItemId(pkg: SourcePkg, filePath: string, symbol: string): string {
  const rel = filePath.replace(/\\/g, '/').split('/packages/')[1] ?? filePath;
  return `${pkg}:${rel}:${symbol}`;
}
```

- [ ] **Step 4: Run — expect PASS (2 tests)**

- [ ] **Step 5: Commit**

```
git add apps/docs/src/lib/detectors/service.detector.ts apps/docs/src/lib/__tests__/detectors/service.detector.spec.ts
git commit -m "feat(docs/extractor): add service detector"
```

---

### Task 8: Token detector (TDD, wraps existing logic)

**Files:**
- Create: `apps/docs/src/lib/__tests__/detectors/token.detector.spec.ts`
- Create: `apps/docs/src/lib/detectors/token.detector.ts`

- [ ] **Step 1: Write failing tests**

```ts
// apps/docs/src/lib/__tests__/detectors/token.detector.spec.ts
import { Project } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import { detectTokens } from '../../detectors/token.detector';

function projectWith(src: string) {
  const project = new Project({ useInMemoryFileSystem: true });
  return project.createSourceFile('tokens.ts', src);
}

describe('detectTokens', () => {
  it('emits a DocItem for an @doc-tagged InjectionToken', () => {
    const sf = projectWith(`
      import { InjectionToken } from '@angular/core';
      /**
       * Registry of icons.
       * @doc
       * @doc-name icon
       */
      export const KJ_ICON_REGISTRY = new InjectionToken<Map<string, string>>('KJ_ICON_REGISTRY');
    `);
    const items = detectTokens(sf, 'core');
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('token');
    expect(items[0].symbol).toBe('KJ_ICON_REGISTRY');
    expect(items[0].token?.type).toContain('Map<string, string>');
  });

  it('skips non-@doc tokens', () => {
    const sf = projectWith(`
      import { InjectionToken } from '@angular/core';
      export const X = new InjectionToken<string>('X');
    `);
    expect(detectTokens(sf, 'core')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
// apps/docs/src/lib/detectors/token.detector.ts
import ts from 'typescript';
import { tsquery } from '@phenomnomnominal/tsquery';
import { SourceFile } from 'ts-morph';
import { parseDocTags } from '../doc-tags';
import type { DocItem, SourcePkg } from '../docs-extractor.types';

const TOKEN_SELECTOR =
  'VariableStatement:has(ExportKeyword):has(NewExpression > Identifier[text="InjectionToken"])';

export function detectTokens(
  morphFile: SourceFile,
  pkg: SourcePkg,
): DocItem[] {
  const tsSourceFile = tsquery.ast(
    morphFile.getFullText(),
    morphFile.getFilePath(),
    ts.ScriptKind.TS,
  );

  const stmts = tsquery<ts.VariableStatement>(tsSourceFile, TOKEN_SELECTOR);
  const items: DocItem[] = [];
  let sourceOrder = 0;

  for (const stmt of stmts) {
    const decl = stmt.declarationList.declarations[0];
    if (!decl || !ts.isIdentifier(decl.name)) continue;
    const tags = parseDocTags(stmt);
    if (!tags.hasDoc || !tags.name) continue;

    const symbol = decl.name.text;
    const newExpr = findNewInjectionToken(decl.initializer);
    const typeArg = newExpr?.typeArguments?.[0]?.getText(tsSourceFile) ?? 'unknown';
    const description = tags.description ?? jsDocSummary(stmt);

    items.push({
      id: makeItemId(pkg, morphFile.getFilePath(), symbol),
      symbol,
      pageName: tags.name,
      kind: 'token',
      pkg,
      filePath: morphFile.getFilePath(),
      description,
      isMain: tags.isMain,
      order: tags.order,
      sourceOrder: sourceOrder++,
      token: { name: symbol, type: typeArg, description },
    });
  }

  return items;
}

function findNewInjectionToken(node: ts.Expression | undefined): ts.NewExpression | null {
  if (!node) return null;
  if (
    ts.isNewExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'InjectionToken'
  ) {
    return node;
  }
  return null;
}

function jsDocSummary(node: ts.Node): string {
  const block = ts.getJSDocCommentsAndTags(node)[0];
  if (!block || !ts.isJSDoc(block)) return '';
  const c = block.comment;
  if (!c) return '';
  return typeof c === 'string' ? c.trim() : (ts.getTextOfJSDocComment(c) ?? '').trim();
}

function makeItemId(pkg: SourcePkg, filePath: string, symbol: string): string {
  const rel = filePath.replace(/\\/g, '/').split('/packages/')[1] ?? filePath;
  return `${pkg}:${rel}:${symbol}`;
}
```

- [ ] **Step 4: Run — expect PASS (2 tests)**

- [ ] **Step 5: Commit**

```
git add apps/docs/src/lib/detectors/token.detector.ts apps/docs/src/lib/__tests__/detectors/token.detector.spec.ts
git commit -m "feat(docs/extractor): add token detector (@doc-gated)"
```

---

### Task 9: Type-alias + const detectors (TDD)

Bundle these — both are simple variable/type declarations.

**Files:**
- Create: `apps/docs/src/lib/__tests__/detectors/type-alias.detector.spec.ts`
- Create: `apps/docs/src/lib/__tests__/detectors/const.detector.spec.ts`
- Create: `apps/docs/src/lib/detectors/type-alias.detector.ts`
- Create: `apps/docs/src/lib/detectors/const.detector.ts`

- [ ] **Step 1: Write type-alias test + impl**

`apps/docs/src/lib/__tests__/detectors/type-alias.detector.spec.ts`:

```ts
import { Project } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import { detectTypeAliases } from '../../detectors/type-alias.detector';

function projectWith(src: string) {
  const project = new Project({ useInMemoryFileSystem: true });
  return project.createSourceFile('a.ts', src);
}

describe('detectTypeAliases', () => {
  it('emits a DocItem for an @doc-tagged type', () => {
    const sf = projectWith(`
      /**
       * @doc
       * @doc-name icon
       */
      export type KjIconColor = 'inherit' | 'primary' | 'danger';
    `);
    const items = detectTypeAliases(sf, 'core');
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('type-alias');
    expect(items[0].typeAlias?.type).toContain("'inherit'");
  });

  it('skips non-@doc types', () => {
    const sf = projectWith(`export type X = 'a' | 'b';`);
    expect(detectTypeAliases(sf, 'core')).toEqual([]);
  });
});
```

`apps/docs/src/lib/detectors/type-alias.detector.ts`:

```ts
import ts from 'typescript';
import { tsquery } from '@phenomnomnominal/tsquery';
import { SourceFile } from 'ts-morph';
import { parseDocTags } from '../doc-tags';
import type { DocItem, SourcePkg } from '../docs-extractor.types';

const SELECTOR = 'TypeAliasDeclaration:has(ExportKeyword)';

export function detectTypeAliases(
  morphFile: SourceFile,
  pkg: SourcePkg,
): DocItem[] {
  const tsSourceFile = tsquery.ast(
    morphFile.getFullText(),
    morphFile.getFilePath(),
    ts.ScriptKind.TS,
  );
  const decls = tsquery<ts.TypeAliasDeclaration>(tsSourceFile, SELECTOR);
  const items: DocItem[] = [];
  let sourceOrder = 0;

  for (const decl of decls) {
    const tags = parseDocTags(decl);
    if (!tags.hasDoc || !tags.name) continue;

    const symbol = decl.name.text;
    const type = decl.type.getText(tsSourceFile);
    const description = tags.description ?? jsDocSummary(decl);

    items.push({
      id: makeItemId(pkg, morphFile.getFilePath(), symbol),
      symbol,
      pageName: tags.name,
      kind: 'type-alias',
      pkg,
      filePath: morphFile.getFilePath(),
      description,
      isMain: tags.isMain,
      order: tags.order,
      sourceOrder: sourceOrder++,
      typeAlias: { name: symbol, type, description },
    });
  }
  return items;
}

function jsDocSummary(node: ts.Node): string {
  const block = ts.getJSDocCommentsAndTags(node)[0];
  if (!block || !ts.isJSDoc(block)) return '';
  const c = block.comment;
  if (!c) return '';
  return typeof c === 'string' ? c.trim() : (ts.getTextOfJSDocComment(c) ?? '').trim();
}

function makeItemId(pkg: SourcePkg, filePath: string, symbol: string): string {
  const rel = filePath.replace(/\\/g, '/').split('/packages/')[1] ?? filePath;
  return `${pkg}:${rel}:${symbol}`;
}
```

- [ ] **Step 2: Write const test + impl**

`apps/docs/src/lib/__tests__/detectors/const.detector.spec.ts`:

```ts
import { Project } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import { detectConsts } from '../../detectors/const.detector';

function projectWith(src: string) {
  const project = new Project({ useInMemoryFileSystem: true });
  return project.createSourceFile('a.ts', src);
}

describe('detectConsts', () => {
  it('emits a DocItem for an @doc-tagged exported const', () => {
    const sf = projectWith(`
      /**
       * Path to the prose stylesheet.
       * @doc
       * @doc-name icon
       */
      export const KJ_ICON_CSS_PATH = '@kouji-ui/core/icon/icon.css' as const;
    `);
    const items = detectConsts(sf, 'core');
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('const');
    expect(items[0].const?.literalValue).toContain('icon.css');
  });

  it('skips InjectionToken consts (those go through token detector)', () => {
    const sf = projectWith(`
      import { InjectionToken } from '@angular/core';
      /** @doc @doc-name x */
      export const X = new InjectionToken<string>('X');
    `);
    expect(detectConsts(sf, 'core')).toEqual([]);
  });

  it('skips non-@doc consts', () => {
    const sf = projectWith(`export const Y = 1;`);
    expect(detectConsts(sf, 'core')).toEqual([]);
  });
});
```

`apps/docs/src/lib/detectors/const.detector.ts`:

```ts
import ts from 'typescript';
import { tsquery } from '@phenomnomnominal/tsquery';
import { SourceFile } from 'ts-morph';
import { parseDocTags } from '../doc-tags';
import type { DocItem, SourcePkg } from '../docs-extractor.types';

const SELECTOR = 'VariableStatement:has(ExportKeyword)';

export function detectConsts(
  morphFile: SourceFile,
  pkg: SourcePkg,
): DocItem[] {
  const tsSourceFile = tsquery.ast(
    morphFile.getFullText(),
    morphFile.getFilePath(),
    ts.ScriptKind.TS,
  );

  const stmts = tsquery<ts.VariableStatement>(tsSourceFile, SELECTOR);
  const items: DocItem[] = [];
  let sourceOrder = 0;

  for (const stmt of stmts) {
    const decl = stmt.declarationList.declarations[0];
    if (!decl || !ts.isIdentifier(decl.name)) continue;
    if (isInjectionTokenInit(decl.initializer)) continue;

    const tags = parseDocTags(stmt);
    if (!tags.hasDoc || !tags.name) continue;

    const symbol = decl.name.text;
    const type = decl.type
      ? decl.type.getText(tsSourceFile)
      : decl.initializer
        ? 'inferred'
        : 'unknown';
    const literalValue =
      decl.initializer && ts.isStringLiteral(decl.initializer)
        ? decl.initializer.text
        : decl.initializer
          ? decl.initializer.getText(tsSourceFile)
          : undefined;
    const description = tags.description ?? jsDocSummary(stmt);

    items.push({
      id: makeItemId(pkg, morphFile.getFilePath(), symbol),
      symbol,
      pageName: tags.name,
      kind: 'const',
      pkg,
      filePath: morphFile.getFilePath(),
      description,
      isMain: tags.isMain,
      order: tags.order,
      sourceOrder: sourceOrder++,
      const: { name: symbol, type, literalValue, description },
    });
  }

  return items;
}

function isInjectionTokenInit(init: ts.Expression | undefined): boolean {
  return (
    !!init &&
    ts.isNewExpression(init) &&
    ts.isIdentifier(init.expression) &&
    init.expression.text === 'InjectionToken'
  );
}

function jsDocSummary(node: ts.Node): string {
  const block = ts.getJSDocCommentsAndTags(node)[0];
  if (!block || !ts.isJSDoc(block)) return '';
  const c = block.comment;
  if (!c) return '';
  return typeof c === 'string' ? c.trim() : (ts.getTextOfJSDocComment(c) ?? '').trim();
}

function makeItemId(pkg: SourcePkg, filePath: string, symbol: string): string {
  const rel = filePath.replace(/\\/g, '/').split('/packages/')[1] ?? filePath;
  return `${pkg}:${rel}:${symbol}`;
}
```

- [ ] **Step 3: Run both — expect PASS**

```
pnpm --filter docs test -- type-alias.detector const.detector
```

- [ ] **Step 4: Commit**

```
git add apps/docs/src/lib/detectors/type-alias.detector.ts apps/docs/src/lib/detectors/const.detector.ts apps/docs/src/lib/__tests__/detectors/type-alias.detector.spec.ts apps/docs/src/lib/__tests__/detectors/const.detector.spec.ts
git commit -m "feat(docs/extractor): add type-alias + const detectors"
```

---

### Task 10: Wire orchestrator + integration tests

**Files:**
- Modify: `apps/docs/src/lib/docs-extractor.ts` — replace body with new orchestration
- Rewrite: `apps/docs/src/lib/docs-extractor.spec.ts`
- Create: `apps/docs/tests/fixtures/extractor/packages/core/src/fixtures/function-kinds.ts`
- Create: `apps/docs/tests/fixtures/extractor/packages/core/src/fixtures/service-kind.ts`
- Create: `apps/docs/tests/fixtures/extractor/packages/core/src/fixtures/const-kind.ts`
- Modify: `apps/docs/tests/fixtures/extractor/packages/core/src/fixtures/internal.ts` — add `@doc / @doc-name / @doc-is-main` so the existing tests still find `PublicDirective` and `ConsumerDirective`.

- [ ] **Step 1: Update fixture file `internal.ts`**

Replace the JSDoc on `PublicDirective` and `ConsumerDirective` to include the new tags:

```ts
/**
 * Public directive used to verify `@internal` filtering at input level.
 * @doc
 * @doc-name public
 * @doc-is-main
 */
@Directive({ selector: '[publicDirective]', standalone: true })
export class PublicDirective {
  /** A public input. */
  publicInput = input<string>('');

  /** @internal */
  internalInput = input<string>('');
}

/**
 * Public consumer that composes `InternalDirective`.
 * @doc
 * @doc-name consumer
 * @doc-is-main
 */
@Directive({
  selector: '[consumerDirective]',
  standalone: true,
  hostDirectives: [
    { directive: InternalDirective, inputs: ['kjVariantLike'] },
  ],
})
export class ConsumerDirective {}
```

- [ ] **Step 2: Add new fixture files**

`apps/docs/tests/fixtures/extractor/packages/core/src/fixtures/function-kinds.ts`:

```ts
import { EnvironmentProviders, makeEnvironmentProviders, inject } from '@angular/core';

/**
 * Provider for icons.
 * @doc
 * @doc-name function-page
 * @doc-is-main
 */
export function provideIcons(map: Record<string, string>): EnvironmentProviders {
  return makeEnvironmentProviders([]);
}

/**
 * Inject helper for the icon resolver.
 * @doc
 * @doc-name function-page
 * @doc-order 1
 */
export function injectKjIconResolver(): (name: string) => string | null {
  inject(String);
  return () => null;
}

/**
 * Plain mode helper.
 * @doc
 * @doc-name function-page
 * @doc-order 2
 */
export function getIconMode(name: string): 'svg' | 'font' {
  return name.startsWith('@font.') ? 'font' : 'svg';
}
```

`apps/docs/tests/fixtures/extractor/packages/core/src/fixtures/service-kind.ts`:

```ts
import { Injectable } from '@angular/core';

/**
 * Icon registry service.
 * @doc
 * @doc-name svc-page
 * @doc-is-main
 */
@Injectable({ providedIn: 'root' })
export class IconRegistry {
  /** Number of registered icons. */
  count = 0;
  /** Register an icon. */
  register(name: string, value: string): void {}
}
```

`apps/docs/tests/fixtures/extractor/packages/core/src/fixtures/const-kind.ts`:

```ts
/**
 * CSS path constant.
 * @doc
 * @doc-name const-page
 * @doc-is-main
 */
export const KJ_ICON_CSS_PATH = '@kouji-ui/core/icon/icon.css' as const;
```

- [ ] **Step 3: Replace `apps/docs/src/lib/docs-extractor.ts` orchestrator section**

Locate the `extractDocsManifest` function and the helpers it uses. Keep `findWorkspaceRoot`, `_pkgNameForPath`, `folderFromPath`. Delete the rest of the body of `extractDocsManifest`. Replace with:

```ts
// apps/docs/src/lib/docs-extractor.ts (orchestration section)
import { Project, SourceFile } from 'ts-morph';
import { join } from 'node:path';
import type {
  DocItem,
  DocPage,
  DocsManifest,
  ExtractorWarning,
  InputDef,
} from './docs-extractor.types';
import { detectDirectives } from './detectors/directive.detector';
import { detectFunctions } from './detectors/function.detector';
import { detectServices } from './detectors/service.detector';
import { detectTokens } from './detectors/token.detector';
import { detectTypeAliases } from './detectors/type-alias.detector';
import { detectConsts } from './detectors/const.detector';
import { assemblePages } from './page-assembler';
import { extractInputs } from './extractor-helpers';
import ts from 'typescript';
import { tsquery } from '@phenomnomnominal/tsquery';

let _cached: DocsManifest | null = null;

export function extractDocsManifest(rootDir?: string): DocsManifest {
  if (_cached) return _cached;

  const root = rootDir ?? process.env['KOUJI_ROOT'] ?? findWorkspaceRoot(process.cwd());

  const items: DocItem[] = [];
  const warnings: ExtractorWarning[] = [];
  const ownInputsByClass = new Map<string, InputDef[]>();

  scanPackage(root, 'core', join(root, 'packages/core/tsconfig.lib.json'),
              join(root, 'packages/core/src'), items, ownInputsByClass);
  scanPackage(root, 'components', join(root, 'packages/components/tsconfig.lib.json'),
              join(root, 'packages/components/src'), items, ownInputsByClass);

  // hostDirectives input-type resolution (preserved from v1).
  resolveHostDirectiveInputs(items, ownInputsByClass);

  const { pages, warnings: pageWarnings } = assemblePages(items);
  warnings.push(...pageWarnings);

  // Decorate pages with categoryPath from the main item (the assembler left it empty).
  for (const page of pages) {
    const main = page.items.find(i => i.id === page.mainItemId);
    if (!main) continue;
    page.categoryPath = readCategoryPath(main, page.pkg);
  }

  _cached = { generatedAt: new Date().toISOString(), pages, warnings };
  return _cached;
}

function scanPackage(
  root: string,
  pkg: 'core' | 'components',
  tsConfigPath: string,
  srcRoot: string,
  out: DocItem[],
  ownInputsByClass: Map<string, InputDef[]>,
) {
  const project = new Project({ tsConfigFilePath: tsConfigPath, skipAddingFilesFromTsConfig: false });
  project.addSourceFilesAtPaths([join(srcRoot, '**/*.ts')]);

  for (const sf of project.getSourceFiles()) {
    const filePath = sf.getFilePath().replace(/\\/g, '/');
    if (
      filePath.includes('.spec.') ||
      filePath.endsWith('index.ts') ||
      filePath.endsWith('public-api.ts') ||
      filePath.endsWith('test-setup.ts') ||
      filePath.endsWith('.example.ts')
    ) continue;
    if (!filePath.includes(`/packages/${pkg}/src/`)) continue;

    // Always populate ownInputs registry — even for @internal directives —
    // so hostDirectives forwarding can resolve types later.
    populateOwnInputs(sf, ownInputsByClass);

    out.push(
      ...detectDirectives(sf, pkg),
      ...detectFunctions(sf, pkg),
      ...detectServices(sf, pkg),
      ...detectTokens(sf, pkg),
      ...detectTypeAliases(sf, pkg),
      ...detectConsts(sf, pkg),
    );
  }
}

function populateOwnInputs(sf: SourceFile, registry: Map<string, InputDef[]>): void {
  const tsSourceFile = tsquery.ast(sf.getFullText(), sf.getFilePath(), ts.ScriptKind.TS);
  const classes = tsquery<ts.ClassDeclaration>(
    tsSourceFile,
    'ClassDeclaration:has(Decorator:has(Identifier[text="Directive"])), ClassDeclaration:has(Decorator:has(Identifier[text="Component"]))',
  );
  for (const cls of classes) {
    const className = cls.name?.text;
    if (!className) continue;
    registry.set(className, extractInputs(cls, tsSourceFile, sf));
  }
}

function resolveHostDirectiveInputs(
  items: DocItem[],
  ownInputsByClass: Map<string, InputDef[]>,
): void {
  for (const item of items) {
    if (!item.directive) continue;
    const dir = item.directive;
    const resolvedInputs: InputDef[] = [];
    const resolvedModels: InputDef[] = [];
    for (const input of dir.inputs) {
      if (input.sourceDirective) {
        const sourceInputs = ownInputsByClass.get(input.sourceDirective) ?? [];
        const original = sourceInputs.find(i => i.name === input.name);
        if (original) {
          input.type = original.type;
          if (original.defaultValue !== undefined) input.defaultValue = original.defaultValue;
          else delete input.defaultValue;
          input.isModel = original.isModel;
          input.required = original.required;
        }
        delete input.sourceDirective;
      }
      (input.isModel ? resolvedModels : resolvedInputs).push(input);
    }
    dir.inputs = resolvedInputs;
    dir.models = [...dir.models, ...resolvedModels];
  }
}

function readCategoryPath(main: DocItem, pkg: 'core' | 'components'): string[] {
  // The main item's @category lives in its raw JSDoc; we re-read it via tags.
  // Detectors do not extract @category yet (out of scope), so we expose a
  // simple parser here. Format: '@category Path/Like/This'.
  // For now we rely on the description text NOT containing '@category'; if
  // categories matter we will refactor detectors to capture them.
  void main; void pkg;
  return [];
}

export function getDocsSlugs(): string[] {
  return extractDocsManifest().pages.map(p => p.name);
}
```

- [ ] **Step 4: Implement `@category` propagation properly**

The placeholder `readCategoryPath` above always returns `[]`. Replace it with real logic:

Edit each detector to also capture `categoryPath: string[]` on the emitted `DocItem`. Add the field to `DocItem`:

```ts
// docs-extractor.types.ts — add to DocItem after sourceOrder:
  categoryPath: string[];
```

Inside each detector, before the `items.push(...)`, compute:

```ts
const categoryPath = readCategoryTag(node, pkg);
```

Helper added to `apps/docs/src/lib/extractor-helpers.ts`:

```ts
import ts from 'typescript';
import type { SourcePkg } from './docs-extractor.types';

export function readCategoryTag(node: ts.Node, pkg: SourcePkg): string[] {
  const tag = ts.getJSDocTags(node).find(t => t.tagName.text === 'category');
  if (!tag) return [];
  const raw = typeof tag.comment === 'string'
    ? tag.comment
    : ts.getTextOfJSDocComment(tag.comment) ?? '';
  const segments = raw.trim().split('/').filter(Boolean);
  if (!segments.length) return [];
  const prefix = pkg === 'core' ? 'Core' : 'Library';
  return [prefix, ...segments];
}
```

Then in the orchestrator's `readCategoryPath`:

```ts
function readCategoryPath(main: DocItem): string[] {
  return main.categoryPath;
}
```

Update each detector to populate `categoryPath: readCategoryTag(node, pkg)` on its emitted items. Add the `categoryPath` field to all detector test fixtures' expected outputs (or just check the one that uses `@category`).

- [ ] **Step 5: Rewrite the integration test**

`apps/docs/src/lib/docs-extractor.spec.ts`:

```ts
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractDocsManifest } from './docs-extractor';

const FIXTURE_ROOT = resolve(__dirname, '../../tests/fixtures/extractor');

describe('docs-extractor v2', () => {
  it('emits a page for the public directive (with @doc tags)', () => {
    const manifest = extractDocsManifest(FIXTURE_ROOT);
    const publicPage = manifest.pages.find(p => p.name === 'public');
    expect(publicPage).toBeDefined();
    const main = publicPage!.items.find(i => i.id === publicPage!.mainItemId);
    expect(main?.symbol).toBe('PublicDirective');
  });

  it('does not include the @internal directive', () => {
    const manifest = extractDocsManifest(FIXTURE_ROOT);
    const allSymbols = manifest.pages.flatMap(p => p.items.map(i => i.symbol));
    expect(allSymbols).toContain('PublicDirective');
    expect(allSymbols).not.toContain('InternalDirective');
  });

  it('groups provider/inject/function items into a single function-page', () => {
    const manifest = extractDocsManifest(FIXTURE_ROOT);
    const page = manifest.pages.find(p => p.name === 'function-page');
    expect(page).toBeDefined();
    const kinds = page!.items.map(i => i.kind);
    expect(kinds).toContain('provider-fn');
    expect(kinds).toContain('inject-fn');
    expect(kinds).toContain('function');
    expect(page!.items[0].id).toBe(page!.mainItemId); // main pinned first
  });

  it('emits a service page', () => {
    const manifest = extractDocsManifest(FIXTURE_ROOT);
    const page = manifest.pages.find(p => p.name === 'svc-page');
    expect(page).toBeDefined();
    const main = page!.items.find(i => i.id === page!.mainItemId);
    expect(main?.kind).toBe('service');
    expect(main?.service?.methods.map(m => m.name)).toContain('register');
  });

  it('emits a const page', () => {
    const manifest = extractDocsManifest(FIXTURE_ROOT);
    const page = manifest.pages.find(p => p.name === 'const-page');
    expect(page).toBeDefined();
    const main = page!.items.find(i => i.id === page!.mainItemId);
    expect(main?.kind).toBe('const');
  });

  it('resolves hostDirectives-forwarded input types', () => {
    const manifest = extractDocsManifest(FIXTURE_ROOT);
    const consumer = manifest.pages
      .find(p => p.name === 'consumer')
      ?.items.find(i => i.directive?.className === 'ConsumerDirective');
    expect(consumer).toBeDefined();
    const forwarded = consumer!.directive!.inputs.find(i => i.name === 'kjVariantLike');
    expect(forwarded?.type).toBe('string');
  });
});
```

- [ ] **Step 6: Run all extractor tests — expect PASS**

```
pnpm --filter docs test -- docs-extractor doc-tags page-assembler directive.detector function.detector service.detector token.detector type-alias.detector const.detector
```

- [ ] **Step 7: Commit**

```
git add apps/docs/src/lib/ apps/docs/tests/fixtures/extractor/
git commit -m "feat(docs/extractor): wire v2 orchestrator + integration tests"
```

---

### Task 11: Update runtime types in docs.service.ts and DocsManifestProvider

**Files:**
- Modify: `apps/docs/src/app/services/docs.service.ts`
- Modify: `apps/docs/src/app/services/docs-manifest.provider.ts` (and any browser/server variants)
- Modify: `apps/docs/src/app/services/server-docs-manifest.provider.ts` (if present)
- Modify: `apps/docs/src/app/services/browser-docs-manifest.provider.ts` (if present)

- [ ] **Step 1: Replace types in `docs.service.ts`**

Find the type block (lines ~6–105 per the existing file) and replace it with re-exports from the new types module:

```ts
// apps/docs/src/app/services/docs.service.ts (top of file)
export type {
  SourcePkg,
  DocKind,
  InputDef,
  ModelDef,
  OutputDef,
  DirectiveDef,
  ServiceDef,
  FunctionParam,
  FunctionDef,
  TokenDef,
  TypeAliasDef,
  ConstDef,
  ExampleFile,
  DocExample,
  DocItem,
  DocPage,
  ExtractorWarningKind,
  ExtractorWarning,
  DocsManifest,
} from '../../lib/docs-extractor.types';
```

Update the service body — replace `components` references with `pages`:

```ts
readonly pages = signal<DocPage[]>([]);

getPage(name: string, pkg?: 'core' | 'components'): DocPage | null {
  const list = this.pages();
  return list.find(p => p.name === name && (!pkg || p.pkg === pkg)) ?? null;
}
```

Delete `readonly components = signal<ComponentDoc[]>([])` and `getComponent(slug: string)`.

- [ ] **Step 2: Update HTTP fetch shape**

In the same service:

```ts
this.http.get<DocsManifest>('/api/docs/manifest').pipe(
  tap(m => this.pages.set(m.pages)),
  ...
)
```

- [ ] **Step 3: Update DocsManifestProvider implementations**

Find and update any `BrowserDocsManifestProvider` and `ServerDocsManifestProvider` to expose `pages`/`getPage` instead of `components`/`getComponent`. Each is small — search for `components.set` and `getComponent` and rename consistently.

- [ ] **Step 4: Run a typecheck**

```
pnpm --filter docs build --configuration=development
```

You'll see TS errors in any consumer (sidebar, component-doc, routes). Those are expected and fixed in subsequent tasks.

- [ ] **Step 5: Commit**

```
git add apps/docs/src/app/services
git commit -m "refactor(docs/service): switch runtime types to v2 manifest shape"
```

---

### Task 12: Update component-doc page rendering

**Files:**
- Modify: `apps/docs/src/app/pages/component-doc/component-doc.ts`
- Modify: `apps/docs/src/app/pages/component-doc/component-doc.html`
- Modify: `apps/docs/src/app/pages/component-doc/component-doc.css` (additions only)

- [ ] **Step 1: Switch the route param**

The current page resolves a `slug` param and looks up `getComponent(slug)`. Switch to `pageName` and `getPage(pageName)`. The route already uses `:slug` — keep the URL token but read it as the page name:

```ts
// component-doc.ts
const slug = this.route.snapshot.paramMap.get('slug') ?? '';
this.page = this.docs.getPage(slug);
```

Where `this.page` is `DocPage | null`.

- [ ] **Step 2: Render kind-discriminated sections**

Update `component-doc.html`. Top-level structure:

```html
@if (page) {
  <header>
    <nav>{{ page.categoryPath.join(' / ') }}</nav>
    <h1>{{ page.title }}</h1>
    <p>{{ page.description }}</p>
  </header>

  <section>
    <h2>Definitions</h2>
    @for (item of page.items; track item.id) {
      <article [id]="item.id">
        <h3>{{ item.symbol }}</h3>
        <p class="kind">{{ kindLabel(item.kind) }}</p>
        <p>{{ item.description }}</p>

        @switch (item.kind) {
          @case ('directive') {
            <doc-directive-section [def]="item.directive!"></doc-directive-section>
          }
          @case ('service') {
            <doc-service-section [def]="item.service!"></doc-service-section>
          }
          @case ('provider-fn') {
            <doc-function-section [def]="item.function!" kind="provider-fn"></doc-function-section>
          }
          @case ('inject-fn') {
            <doc-function-section [def]="item.function!" kind="inject-fn"></doc-function-section>
          }
          @case ('function') {
            <doc-function-section [def]="item.function!" kind="function"></doc-function-section>
          }
          @case ('token') {
            <doc-token-section [def]="item.token!"></doc-token-section>
          }
          @case ('type-alias') {
            <doc-type-alias-section [def]="item.typeAlias!"></doc-type-alias-section>
          }
          @case ('const') {
            <doc-const-section [def]="item.const!"></doc-const-section>
          }
        }

        @if (item.examples?.length) {
          <doc-examples [examples]="item.examples!"></doc-examples>
        }
      </article>
    }
  </section>
}
```

- [ ] **Step 3: Implement child sections**

Create thin Angular components for each kind under `apps/docs/src/app/pages/component-doc/sections/`. Each takes its `def` input and renders a small table or signature card. Keep them under 50 lines each.

Listing of files to create with minimal templates (each component is `standalone: true`, ChangeDetectionStrategy.OnPush):

- `directive-section/directive-section.ts` (.html, .css) — reuses existing directive table layout from current `component-doc.html`. Move that markup into here.
- `service-section/service-section.ts` — table of methods + properties.
- `function-section/function-section.ts` — signature, parameter table, return type.
- `token-section/token-section.ts` — name + type + description.
- `type-alias-section/type-alias-section.ts` — name + type.
- `const-section/const-section.ts` — name + type + literal value.
- `examples-section/examples-section.ts` — moves the existing example renderer.

The existing component-doc page already contains the directive table layout — extract it verbatim into the directive-section component instead of rewriting.

- [ ] **Step 4: Build the docs app**

```
pnpm --filter docs build --configuration=development
```

Resolve all TS errors. Expected: clean build.

- [ ] **Step 5: Commit**

```
git add apps/docs/src/app/pages/component-doc
git commit -m "refactor(docs/component-doc): render kind-discriminated DocPage sections"
```

---

### Task 13: Update sidebar + route prerendering

**Files:**
- Modify: `apps/docs/src/app/components/docs-sidebar/docs-sidebar.ts`
- Modify: `apps/docs/src/app/app.routes.server.ts`
- Modify: `apps/docs/src/app/app.routes.ts`

- [ ] **Step 1: Sidebar groups by `pages[*].categoryPath`**

Search for `manifest.components` references in the sidebar component. Replace with `manifest.pages`. Replace `c.slug` with `p.name`, `c.name` with `p.title`. Group key remains `categoryPath.join('/')`.

- [ ] **Step 2: Prerender params**

In `apps/docs/src/app/app.routes.server.ts`, find the function returning params for the component-doc route. Replace `getDocsSlugs()` enumeration with `extractDocsManifest().pages.map(p => p.name)`. Match the existing call shape; keep the route token name (`slug`) — it just maps to page name now.

- [ ] **Step 3: Build + run dev server**

```
pnpm --filter docs build --configuration=development
pnpm --filter docs dev
```

Open `http://localhost:4200/docs/components/icon` after Task 14 below lands. For now, hit any migrated page (e.g. `/docs/components/divider` once Task 14 migrates Divider).

- [ ] **Step 4: Commit**

```
git add apps/docs/src/app/components/docs-sidebar apps/docs/src/app/app.routes.server.ts apps/docs/src/app/app.routes.ts
git commit -m "refactor(docs/sidebar+routes): consume DocPage manifest"
```

---

### Task 14: Mechanical migration of existing directives

**Files:**
- Modify: every directive file under `packages/core/src/**` and `packages/components/src/**` that previously appeared in the manifest.

The migration adds, on each public-exported `@Directive` / `@Component` class JSDoc, the four tags:

```
 * @doc
 * @doc-name <kebab-of-folder>
 * @doc-is-main
 * @category <existing-or-new>
```

Where `<kebab-of-folder>` is the folder name the directive lives in (e.g. `divider/divider.ts` → `divider`). When `@category` already exists on the class, keep the existing path. When it doesn't, pick a sensible category (the maintainer can rename later).

- [ ] **Step 1: Build the migration list**

Run a dry-run script:

```
node -e "
const { Project } = require('ts-morph');
const p = new Project({ tsConfigFilePath: 'packages/core/tsconfig.lib.json', skipAddingFilesFromTsConfig: false });
p.addSourceFilesAtPaths(['packages/core/src/**/*.ts']);
const out = [];
for (const sf of p.getSourceFiles()) {
  for (const cls of sf.getClasses()) {
    const decs = cls.getDecorators().map(d => d.getName());
    if (decs.includes('Directive') || decs.includes('Component')) {
      out.push(sf.getFilePath() + ':' + cls.getName());
    }
  }
}
console.log(out.length, out.slice(0, 5));
"
```

Save the full list to `migration-targets.txt` (gitignored, just for the agent's working notes).

- [ ] **Step 2: Edit each file**

For every file in the list, prepend the tags to the class JSDoc using the Edit tool (find the existing JSDoc and insert the tags before the closing `*/`). The folder-derived `@doc-name` makes this mechanical.

If a directive's folder contains multiple exported directives (e.g. carousel exports `KjCarousel` + `KjCarouselSlide`), pick the **outermost** one as `@doc-is-main` and tag the others with the same `@doc-name` but no `@doc-is-main`. The outermost is conventionally the one whose name matches the folder.

- [ ] **Step 3: Run the extractor integration test against the real workspace**

```
pnpm --filter docs test -- docs-extractor
```

The fixture-based tests must still pass. Then run the dev server and check that previously-visible component pages still load:

```
pnpm --filter docs dev
```

Open 5 random component pages — they must render.

- [ ] **Step 4: Commit (one commit per package to keep diff legible)**

```
git add packages/core/src
git commit -m "docs(core): tag every public directive with @doc/@doc-name/@doc-is-main"

git add packages/components/src
git commit -m "docs(components): tag every public directive with @doc/@doc-name/@doc-is-main"
```

---

### Task 15: Add `@doc` tags to icon system (multi-kind page demo)

**Files:**
- Modify: `packages/core/src/icon/icon.directive.ts` (already in main)
- Modify: `packages/core/src/icon/icon.providers.ts`
- Modify: `packages/core/src/icon/icon.resolver.ts`
- Modify: `packages/core/src/icon/icon.tokens.ts`
- Modify: `packages/core/src/icon/icon.types.ts`
- Modify: `packages/core/src/icon/icon.mode.ts`

Goal: the `/docs/components/icon` page should display the directive (main) followed by `provideIcons`, `provideIconResolver`, `provideIconLoader`, `injectKjIconResolver`, `getIconMode`, `KJ_ICON_REGISTRY`, `KJ_ICON_RESOLVER`, `KJ_ICON_LOADER`, `KJ_ICON_CSS_PATH`, `IconResolver`, `IconLoader`, `KjIconColor`, `KjIconSize`, `IconMode` — in that order.

- [ ] **Step 1: Tag the directive as the main item**

In `packages/core/src/icon/icon.directive.ts`, replace the JSDoc on `KjIconDirective` to include:

```
 * @doc
 * @doc-name icon
 * @doc-is-main
 * @category Core/Layout/Icon
```

- [ ] **Step 2: Tag every other icon export**

For each other export, add:

```
 * @doc
 * @doc-name icon
 * @doc-order <n>
```

Order assignments (just a deterministic ordering — agent may pick reasonable values):

| Symbol | order |
|---|---|
| `provideIcons` | 1 |
| `provideIconResolver` | 2 |
| `provideIconLoader` | 3 |
| `injectKjIconResolver` | 4 |
| `getIconMode` | 5 |
| `KJ_ICON_REGISTRY` | 6 |
| `KJ_ICON_RESOLVER` | 7 |
| `KJ_ICON_LOADER` | 8 |
| `KJ_ICON_CSS_PATH` | 9 |
| `IconResolver` | 10 |
| `IconLoader` | 11 |
| `KjIconColor` | 12 |
| `KjIconSize` | 13 |
| `IconMode` | 14 |

- [ ] **Step 3: Run extractor + open the page**

```
pnpm --filter docs test -- docs-extractor
pnpm --filter docs dev
```

Open `http://localhost:4200/docs/components/icon`. Verify all 14+ items render in the right order, with kind labels on each.

- [ ] **Step 4: Commit**

```
git add packages/core/src/icon
git commit -m "docs(core/icon): tag all icon exports with @doc for multi-kind page"
```

---

### Task 16: E2E smoke test

**Files:**
- Create: `apps/docs/e2e/extractor-v2.spec.ts`

- [ ] **Step 1: Write the test**

```ts
// apps/docs/e2e/extractor-v2.spec.ts
import { test, expect } from '@playwright/test';

test.describe('docs extractor v2', () => {
  test('icon page renders directive (main) plus function/token/type-alias kinds', async ({ page }) => {
    await page.goto('/docs/components/icon');
    await expect(page.getByRole('heading', { name: 'KjIconDirective' })).toBeVisible();
    // Function kinds
    await expect(page.getByText('provideIcons')).toBeVisible();
    await expect(page.getByText('injectKjIconResolver')).toBeVisible();
    // Token kind
    await expect(page.getByText('KJ_ICON_REGISTRY')).toBeVisible();
    // Type-alias kind
    await expect(page.getByText('IconResolver')).toBeVisible();
    // Const kind
    await expect(page.getByText('KJ_ICON_CSS_PATH')).toBeVisible();
  });

  test('a directive-only page (divider) still renders its inputs/outputs', async ({ page }) => {
    await page.goto('/docs/components/divider');
    await expect(page.getByRole('heading', { name: /divider/i })).toBeVisible();
  });
});
```

- [ ] **Step 2: Run**

```
pnpm --filter docs test:e2e -- extractor-v2
```

Expected: PASS.

- [ ] **Step 3: Commit**

```
git add apps/docs/e2e/extractor-v2.spec.ts
git commit -m "test(e2e): smoke-test icon page renders all kinds"
```

---

## Self-review

**Spec coverage check:**

| Spec section | Implementing task |
|---|---|
| Tag taxonomy (@doc, @doc-name, @doc-is-main, @doc-order, @doc-description) | Task 2 |
| Suppression by @internal | Task 2 |
| Detection: directive | Task 5 |
| Detection: service | Task 7 |
| Detection: provider-fn / inject-fn / function | Task 6 |
| Detection: token | Task 8 |
| Detection: type-alias | Task 9 |
| Detection: const | Task 9 |
| Page assembly + main-pick fallbacks | Task 3 |
| Cross-package warning | Task 3 |
| Manifest schema (DocItem, DocPage, DocsManifest) | Task 1 |
| Component-doc page consumes DocPage | Task 12 |
| Sidebar groups from pages | Task 13 |
| Route prerender uses pages | Task 13 |
| Migration of every existing directive | Task 14 |
| Icon multi-kind page demo | Task 15 |
| E2E smoke | Task 16 |
| File-structure split (detectors / page-assembler / examples) | Tasks 4, 5–9, 10 |

**Type consistency check:**
- `DocItem.pageName` introduced in Task 3, used by every detector in Tasks 5–9. ✓
- `DocItem.categoryPath` introduced in Task 10 step 4, used by orchestrator + sidebar (Task 13). ✓
- `DocsManifest.pages` consistent across orchestrator (Task 10), service (Task 11), page (Task 12), sidebar (Task 13). ✓
- `extractor-helpers.ts` referenced by detectors (Task 5+) is created in Task 5 step 4. ✓
- `examples.ts` referenced by directive detector is created in Task 4. ✓

**Placeholder scan:**
- Task 11 step 3 says "any `BrowserDocsManifestProvider` and `ServerDocsManifestProvider`" — concrete: `apps/docs/src/app/services/docs-manifest.provider.ts` and any sibling files matching the same pattern. Verified by grep at execution time.
- Task 12 step 3 references new section components by file path — files do not exist yet but the task creates them. Listed by name.
- Task 13 step 2 references "the function returning params" without naming it — the file `apps/docs/src/app/app.routes.server.ts` typically exports `getPrerenderParams`. The agent should grep the file at execution time for the actual export name.

**Notes for the executor:**
- Tasks 1–3 are pure type/parser work; Task 4 is a refactor with no behavior change; Tasks 5–9 are independent detectors and can in principle run in parallel, but they do not edit the same files, so a single-track execution is fine.
- Task 14 (migration) produces the largest diff. Consider executing it via a subagent in the worktree using a small node script to add the tags mechanically rather than typing each file by hand.
- Task 15 demonstrates the cross-file page composition that motivated the spec.

**Out-of-scope follow-ups:**
- Lint rule that fails CI when public `@Injectable` / `provideX` / `injectX` lacks `@doc`.
- Cross-page references (`@doc-link`).
- Versioning per page (`@doc-since 0.1.0`).
- Markdown supplement files for long-form prose alongside source.
