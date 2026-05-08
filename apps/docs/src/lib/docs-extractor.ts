import { join, resolve, dirname, sep } from 'node:path';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import ts from 'typescript';
import { tsquery } from '@phenomnomnominal/tsquery';

import type {
  DocItem,
  DocsManifest,
  InputDef,
  SourcePkg,
} from './docs-extractor.types';
import type { ParsedFile } from './parsed-file';
import { detectDirectives } from './detectors/directive.detector';
import { detectFunctions } from './detectors/function.detector';
import { detectServices } from './detectors/service.detector';
import { detectTokens } from './detectors/token.detector';
import { detectTypeAliases } from './detectors/type-alias.detector';
import { detectConsts } from './detectors/const.detector';
import { assemblePages } from './page-assembler';
import { extractInputs } from './extractor-helpers';
import { FileCache, defaultCachePath, sha256, type CachedFile } from './file-cache';

// Re-export types for back-compat consumers.
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
} from './docs-extractor.types';

/** Markers that gate a file's parse + extract: present → parse, absent → skip. */
const DOC_TAG_MARKER = '@doc';
const DECORATOR_MARKERS = ['@Directive', '@Component', '@Injectable'];

const DIRECTIVE_CLASS_SELECTOR =
  'ClassDeclaration:has(Decorator:has(Identifier[text="Directive"])), ClassDeclaration:has(Decorator:has(Identifier[text="Component"]))';

function findWorkspaceRoot(start: string): string {
  let dir = resolve(start);
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml')) && existsSync(join(dir, 'packages', 'core', 'tsconfig.lib.json'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`Could not find workspace root from ${start}`);
}

let _cached: DocsManifest | null = null;

export function extractDocsManifest(rootDir?: string): DocsManifest {
  if (_cached && !rootDir) return _cached;

  const root = rootDir ?? process.env['KOUJI_ROOT'] ?? findWorkspaceRoot(process.cwd());
  const cache = new FileCache(defaultCachePath(root));

  const items: DocItem[] = [];
  const ownInputsByClass = new Map<string, InputDef[]>();
  const activeKeys = new Set<string>();

  scanPackage(root, 'core', join(root, 'packages/core/src'), items, ownInputsByClass, cache, activeKeys);
  if (existsSync(join(root, 'packages/components/src'))) {
    scanPackage(root, 'components', join(root, 'packages/components/src'), items, ownInputsByClass, cache, activeKeys);
  }

  resolveHostDirectiveInputs(items, ownInputsByClass);

  const { pages, warnings } = assemblePages(items);

  // Decorate pages with categoryPath from the main item.
  for (const page of pages) {
    const main = page.definitions.find(i => i.id === page.mainItemId);
    if (main) page.categoryPath = main.categoryPath;
  }

  cache.prune(activeKeys);
  cache.save();

  const manifest: DocsManifest = { generatedAt: new Date().toISOString(), pages, warnings };
  if (!rootDir) _cached = manifest;
  return manifest;
}

/**
 * Walk a package's src tree, parse each candidate file once via
 * `ts.createSourceFile`, and run the detectors on the same parsed AST.
 *
 * Two pre-filters cut the candidate set drastically:
 *   1. File-extension/path skip (specs, examples, barrels, node_modules).
 *   2. Raw-text marker check (`@doc` for detectors, `@Directive`/`@Component`
 *      for the hostDirectives ownInputs registry). Files with neither are
 *      skipped without parsing.
 *
 * SHA-keyed disk cache (`FileCache`) replays cached items + ownInputs for
 * unchanged files so subsequent runs only pay parse cost for what changed.
 */
function scanPackage(
  root: string,
  pkg: SourcePkg,
  srcRoot: string,
  out: DocItem[],
  ownInputsByClass: Map<string, InputDef[]>,
  cache: FileCache,
  activeKeys: Set<string>,
): void {
  const files = listSourceFiles(srcRoot);

  for (const filePath of files) {
    const text = readFileSync(filePath, 'utf-8');
    const hasDoc = text.includes(DOC_TAG_MARKER);
    const hasDecorator = DECORATOR_MARKERS.some(d => text.includes(d));
    if (!hasDoc && !hasDecorator) continue;

    const sha = sha256(text);
    const key = cacheKey(pkg, root, filePath);
    activeKeys.add(key);

    const cached = cache.get(key, sha);
    if (cached) {
      out.push(...cached.items);
      for (const [className, inputs] of cached.ownInputs) {
        ownInputsByClass.set(className, inputs);
      }
      continue;
    }

    const tsSourceFile = ts.createSourceFile(
      filePath,
      text,
      ts.ScriptTarget.Latest,
      /* setParentNodes */ true,
      ts.ScriptKind.TS,
    );
    const parsed: ParsedFile = { tsSourceFile, filePath };

    const fileItems: DocItem[] = [];
    const fileOwnInputs: Array<[string, InputDef[]]> = [];

    if (hasDecorator) {
      const classes = tsquery<ts.ClassDeclaration>(tsSourceFile, DIRECTIVE_CLASS_SELECTOR);
      for (const cls of classes) {
        const className = cls.name?.text;
        if (!className) continue;
        const inputs = extractInputs(cls, tsSourceFile);
        ownInputsByClass.set(className, inputs);
        fileOwnInputs.push([className, inputs]);
      }
    }

    if (hasDoc) {
      fileItems.push(
        ...detectDirectives(parsed, pkg),
        ...detectFunctions(parsed, pkg),
        ...detectServices(parsed, pkg),
        ...detectTokens(parsed, pkg),
        ...detectTypeAliases(parsed, pkg),
        ...detectConsts(parsed, pkg),
      );
    }

    out.push(...fileItems);

    const entry: CachedFile = { sha, items: fileItems, ownInputs: fileOwnInputs };
    cache.set(key, entry);
  }
}

/**
 * Recursive directory walk. Skips hidden dirs (.git etc.), node_modules, and
 * non-source-or-test files we never want to parse.
 */
function listSourceFiles(srcRoot: string): string[] {
  const out: string[] = [];
  walk(srcRoot, out);
  return out;
}

function walk(dir: string, out: string[]): void {
  let names: string[];
  try {
    // Use the string-mode overload (no withFileTypes) for stable types across
    // @types/node versions, then stat each entry explicitly. Marginally more
    // syscalls but avoids the Dirent<Buffer | string> generic surprise.
    names = readdirSync(dir, 'utf-8');
  } catch {
    return;
  }
  for (const name of names) {
    if (name.startsWith('.') || name === 'node_modules') continue;
    const full = join(dir, name);
    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (!stat.isFile()) continue;
    if (!name.endsWith('.ts')) continue;
    if (
      name === 'index.ts' ||
      name === 'public-api.ts' ||
      name === 'test-setup.ts' ||
      name.endsWith('.spec.ts') ||
      name.endsWith('.example.ts') ||
      name.endsWith('.d.ts')
    ) continue;
    out.push(full);
  }
}

function cacheKey(pkg: SourcePkg, root: string, filePath: string): string {
  const rel = filePath.startsWith(root)
    ? filePath.slice(root.length).split(sep).join('/').replace(/^\/+/, '')
    : filePath.replace(/\\/g, '/');
  return `${pkg}:${rel}`;
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

export function getDocsSlugs(): string[] {
  return extractDocsManifest().pages.map(p => p.name);
}
