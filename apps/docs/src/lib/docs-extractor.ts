import { Project, SourceFile } from 'ts-morph';
import { tsquery } from '@phenomnomnominal/tsquery';
import ts from 'typescript';
import { join, dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import {
  getJsDocExamples,
  getDocFiles,
  getDocThemes,
  getDocExamples,
} from './examples';
import {
  getJsDocDescription,
  extractInputs,
  extractOutputs,
  extractHostDirectiveInputs,
  getDecoratorArg,
  extractDecoratorProp,
  getRequired,
} from './extractor-helpers';

/** Walks up from `start` until a directory contains pnpm-workspace.yaml AND packages/core. */
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
  throw new Error(`Could not find workspace root from ${start} — expected pnpm-workspace.yaml + packages/core/tsconfig.lib.json`);
}

// ── Exported types ──────────────────────────────────────────────────────────

export interface InputDef {
  name: string;
  type: string;
  required: boolean;
  isModel: boolean;
  description: string;
  defaultValue?: string;
  /**
   * For inputs forwarded via `hostDirectives` composition, the simple name of
   * the directive class the input is defined on (e.g. `'KjVariant'`).
   * Resolved into a real `type` and `defaultValue` in a post-extraction pass
   * once every class's own inputs have been collected. Absent on own inputs.
   */
  sourceDirective?: string;
}

export interface TokenDef {
  name: string;
  description: string;
}

export interface TypeAliasDef {
  name: string;
  type: string;
  description: string;
}

export interface ExampleFile {
  lang: 'ts' | 'html' | 'css';
  filename: string;
  content: string;
  exportName?: string;  // exported class name, used for component lookup
}

export interface DocExample {
  label: string;
  themedFiles: Record<string, ExampleFile[]>;
}

/** Models are read+write signals — same descriptor shape as `InputDef`. */
export type ModelDef = InputDef;

export interface OutputDef {
  name: string;
  /** Payload type emitted by the output (the `T` in `output<T>()`). */
  type: string;
  description: string;
  /**
   * For outputs forwarded via `hostDirectives` composition, the simple name
   * of the directive class the output is defined on. Resolved into a real
   * `type` in the post-extraction pass and stripped from the public manifest.
   */
  sourceDirective?: string;
}

export interface DirectiveDef {
  className: string;
  selector: string;
  exportAs?: string;
  categoryPath: string[];
  description: string;
  /** `input()` / `input.required()` declarations (excluding models). */
  inputs: InputDef[];
  /** `output()` declarations. */
  outputs: OutputDef[];
  /** `model()` declarations — read+write signals shown separately from inputs. */
  models: ModelDef[];
  examples: string[];
  exampleFiles: ExampleFile[];        // default theme files (backward compat)
  themedExamples: Record<string, ExampleFile[]>;  // keyed by theme name
  docExamples: DocExample[];          // named example groups (new)
  required: boolean;           // from @required TSDoc tag
}

/** Source package each component / directive comes from. */
export type SourcePkg = 'core' | 'components';

export interface ComponentDoc {
  name: string;
  slug: string;
  /** Top-level taxonomy: which workspace package the entry was extracted from. */
  pkg: SourcePkg;
  /**
   * Rendered category path, package-prefixed. First segment is `Core` (for
   * `packages/core/`) or `Library` (for `packages/components/`); remaining
   * segments come from the directive's `@category` JSDoc tag. Empty when no
   * directive in this folder declared a `@category`.
   */
  categoryPath: string[];
  description: string;
  directives: DirectiveDef[];
  tokens: TokenDef[];
  typeAliases: TypeAliasDef[];
}

export interface DocsManifest {
  generatedAt: string;
  components: ComponentDoc[];
}

// ── ts-query selectors ────────────────────────────────────────────────────────

/** All exported classes decorated with @Directive OR @Component (Angular declarables). */
const DIRECTIVE_CLASS_SELECTOR =
  'ClassDeclaration:has(Decorator:has(Identifier[text="Directive"])), ClassDeclaration:has(Decorator:has(Identifier[text="Component"]))';

/** Exported InjectionToken const declarations */
const INJECTION_TOKEN_SELECTOR =
  'VariableStatement:has(ExportKeyword):has(NewExpression > Identifier[text="InjectionToken"])';

/** Exported type aliases (e.g. KjButtonVariant = 'default' | 'destructive') */
const TYPE_ALIAS_SELECTOR =
  'TypeAliasDeclaration:has(ExportKeyword)';

/** @category tag — e.g. "@category Foundation/Button" */
const CATEGORY_TAG_SELECTOR = 'JSDocTag[tagName.text="category"]';

// ── JSDoc extraction using ts-query ──────────────────────────────────────────

/** True when the node carries a JSDoc `@internal` tag. */
function hasInternalTag(node: ts.Node): boolean {
  return ts.getJSDocTags(node).some(t => t.tagName.text === 'internal');
}

// DOC_THEME_RE removed — using split-based parsing instead (regex lookahead fails inside code blocks)

/** Top-level package label prepended to every category path, derived from
 *  the file's source package — not from a hardcoded map. */
function pkgLabel(pkg: SourcePkg): string {
  return pkg === 'components' ? 'Library' : 'Core';
}

/**
 * Reads the `@category` JSDoc tag and returns the rendered category path.
 *
 * The package label (`Core` for `packages/core/`, `Library` for
 * `packages/components/`) is auto-prepended from the file's source package.
 * If the tag already starts with that label, the segments are normalised to
 * that casing and used as-is — so both `@category Base` and
 * `@category Core/Base` produce `['Core', 'Base']` from a core-package file.
 *
 * Returns `[]` when no tag is present; the caller decides how to handle that
 * (currently: the directive still renders, just without a categoryPath).
 */
function getCategoryPath(node: ts.Node, pkg: SourcePkg): string[] {
  const tags = tsquery<ts.JSDocTag>(node, CATEGORY_TAG_SELECTOR);
  if (!tags.length) return [];
  const comment = tags[0].comment;
  const raw = typeof comment === 'string'
    ? comment
    : (comment ?? []).map((x: { text?: string }) => x.text ?? '').join('');
  const segments = raw.trim().split('/').map(s => s.trim()).filter(Boolean);
  if (!segments.length) return [];

  const label = pkgLabel(pkg);
  if (segments[0].toLowerCase() === label.toLowerCase()) {
    segments[0] = label;
    return segments;
  }
  return [label, ...segments];
}

// getExampleFiles removed — replaced by getDocFiles() which uses @doc-file inline blocks.
// @example-file tag is no longer used; @doc-file is the replacement.

// ── InjectionToken extraction ─────────────────────────────────────────────────

function extractTokens(sourceFile: ts.SourceFile): TokenDef[] {
  const stmts = tsquery<ts.VariableStatement>(sourceFile, INJECTION_TOKEN_SELECTOR);
  const out: TokenDef[] = [];
  for (const stmt of stmts) {
    if (hasInternalTag(stmt)) continue;
    const decl = stmt.declarationList.declarations[0];
    const name = (decl?.name as ts.Identifier)?.text ?? '';
    if (!name) continue;
    out.push({ name, description: getJsDocDescription(stmt) });
  }
  return out;
}

// ── Type alias extraction ─────────────────────────────────────────────────────

function extractTypeAliases(sourceFile: ts.SourceFile): TypeAliasDef[] {
  const aliases = tsquery<ts.TypeAliasDeclaration>(sourceFile, TYPE_ALIAS_SELECTOR);
  const out: TypeAliasDef[] = [];
  for (const alias of aliases) {
    if (hasInternalTag(alias)) continue;
    const name = alias.name.text;
    const type = alias.type.getText(sourceFile);
    const description = getJsDocDescription(alias);
    out.push({ name, type, description });
  }
  return out;
}

// ── Shared per-file processing ────────────────────────────────────────────────

function _pkgNameForPath(filePath: string): string {
  const p = filePath.replace(/\\/g, '/');
  if (p.includes('/packages/core/src/')) return 'Core';
  if (p.includes('/packages/components/src/')) return 'Library';
  return 'Core';
}

function folderFromPath(filePath: string): string | null {
  const p = filePath.replace(/\\/g, '/');
  const coreMatch = p.split('/packages/core/src/')[1];
  if (coreMatch) return coreMatch.split('/')[0] ?? null;
  const componentsMatch = p.split('/packages/components/src/')[1];
  if (componentsMatch) return componentsMatch.split('/')[0] ?? null;
  return null;
}

function processSourceFile(
  morphFile: SourceFile,
  componentMap: Map<string, ComponentDoc>,
  pkg: SourcePkg,
  ownInputsByClass: Map<string, InputDef[]>,
): void {
  const filePath = morphFile.getFilePath();

  const folder = folderFromPath(filePath);
  if (!folder || folder === 'unknown') return;

  // Composite key so the same folder name (e.g. 'button') in two packages
  // results in two separate entries in the manifest.
  const mapKey = `${pkg}:${folder}`;

  // Reparse source text with workspace TypeScript so tsquery's TS version matches.
  // ts-morph bundles its own TS version which conflicts with tsquery's TS dependency.
  const tsSourceFile = tsquery.ast(
    morphFile.getFullText(),
    morphFile.getFilePath(),
    ts.ScriptKind.TS,
  );

  // ── Extract directives via ts-query ──────────────────────────────────────
  const directiveClasses = tsquery<ts.ClassDeclaration>(tsSourceFile, DIRECTIVE_CLASS_SELECTOR);

  for (const cls of directiveClasses) {
    const className = cls.name?.text ?? '';

    // Always register own inputs for the class — even for @internal classes
    // and non-exported ones — because they may be referenced by another
    // class's `hostDirectives` and we need to resolve the input type later.
    if (className) {
      ownInputsByClass.set(className, extractInputs(cls, tsSourceFile, morphFile));
    }

    if (hasInternalTag(cls)) continue;
    // Only exported classes
    const isExported = cls.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!isExported) continue;

    const decoratorArg = getDecoratorArg(cls);
    const selector = extractDecoratorProp(decoratorArg, 'selector');
    if (!selector) continue;

    const exportAs = extractDecoratorProp(decoratorArg, 'exportAs');
    const sourceDir = dirname(morphFile.getFilePath());
    const description = getJsDocDescription(cls);
    const examples = getJsDocExamples(cls);
    const exampleFiles = getDocFiles(cls, tsSourceFile, sourceDir);
    const themedExamples = getDocThemes(cls, tsSourceFile, sourceDir);
    const docExamples = getDocExamples(cls, tsSourceFile, sourceDir);
    // Reuse the inputs we already collected above for the registry.
    const ownSignals = ownInputsByClass.get(className) ?? [];
    const hdInputs = extractHostDirectiveInputs(decoratorArg);
    // Split inputs from models. Models retain `isModel: true`; inputs don't.
    // hostDirectives-forwarded entries default to non-model and resolve to
    // their source's `isModel` in the post-processing pass.
    const allInputs = [...ownSignals, ...hdInputs];
    const inputs = allInputs.filter(i => !i.isModel);
    const models = allInputs.filter(i => i.isModel);
    const outputs = extractOutputs(cls, tsSourceFile, morphFile);
    const categoryPath = getCategoryPath(cls, pkg);
    const required = getRequired(cls);

    // If themedExamples has a 'default' key, use it as exampleFiles fallback
    const resolvedExampleFiles = themedExamples['default']?.length
      ? themedExamples['default']
      : exampleFiles;

    if (!componentMap.has(mapKey)) {
      componentMap.set(mapKey, {
        name: folder.charAt(0).toUpperCase() + folder.slice(1),
        slug: folder,
        pkg,
        categoryPath: [],
        description: '',
        directives: [],
        tokens: [],
        typeAliases: [],
      });
    }

    const comp = componentMap.get(mapKey)!;
    if (!comp.description && description) comp.description = description;

    // categoryPath is already package-prefixed by getCategoryPath().
    if (!comp.categoryPath.length && categoryPath.length) {
      comp.categoryPath = categoryPath;
    }

    const directiveWithPkg: DirectiveDef = {
      className,
      selector,
      ...(exportAs ? { exportAs } : {}),
      categoryPath,
      description,
      inputs,
      outputs,
      models,
      examples,
      exampleFiles: resolvedExampleFiles,
      themedExamples,
      docExamples,
      required,
    };
    comp.directives.push(directiveWithPkg);
  }

  // ── Extract InjectionTokens and type aliases ──────────────────────────────
  if (componentMap.has(mapKey)) {
    const comp = componentMap.get(mapKey)!;
    comp.tokens.push(...extractTokens(tsSourceFile));
    comp.typeAliases.push(...extractTypeAliases(tsSourceFile));
  }
}

// ── Main extraction ───────────────────────────────────────────────────────────

let _cached: DocsManifest | null = null;

/**
 * Extracts the full docs manifest from `@kouji-ui/core` source files.
 * Uses ts-morph for project/tsconfig resolution and ts-query for AST querying.
 * Result is cached in memory after the first call.
 *
 * @param rootDir - Monorepo root directory. Defaults to `process.cwd()`.
 */
export function extractDocsManifest(rootDir?: string): DocsManifest {
  if (_cached) return _cached;

  const root = rootDir ?? process.env['KOUJI_ROOT'] ?? findWorkspaceRoot(process.cwd());

  // ts-morph handles tsconfig resolution and file loading
  const project = new Project({
    tsConfigFilePath: join(root, 'packages/core/tsconfig.lib.json'),
    skipAddingFilesFromTsConfig: false,
  });
  project.addSourceFilesAtPaths([join(root, 'packages/core/src/**/*.ts')]);

  const componentMap = new Map<string, ComponentDoc>();
  // Registry of own (declared) inputs per directive class name. Populated as
  // each source file is processed (including @internal classes), then used in
  // a post-process pass to resolve types for `hostDirectives`-forwarded
  // inputs that this class composes from another directive.
  const ownInputsByClass = new Map<string, InputDef[]>();

  // ── Pass 1: packages/core ─────────────────────────────────────────────────
  for (const morphFile of project.getSourceFiles()) {
    const filePath = morphFile.getFilePath();
    if (
      filePath.includes('.spec.') ||
      filePath.endsWith('index.ts') ||
      filePath.endsWith('public-api.ts') ||
      filePath.endsWith('test-setup.ts') ||
      !filePath.includes('/packages/core/src/')
    ) continue;

    processSourceFile(morphFile, componentMap, 'core', ownInputsByClass);
  }

  // ── Pass 2: packages/components ───────────────────────────────────────────
  // Separate ts-morph project so its tsconfig (paths, types) is honored.
  const componentsProject = new Project({
    tsConfigFilePath: join(root, 'packages/components/tsconfig.lib.json'),
    skipAddingFilesFromTsConfig: false,
  });
  componentsProject.addSourceFilesAtPaths([
    join(root, 'packages/components/src/**/*.ts'),
  ]);
  let componentsScanned = 0;
  for (const morphFile of componentsProject.getSourceFiles()) {
    const filePath = morphFile.getFilePath().replace(/\\/g, '/');
    if (
      filePath.includes('.spec.') ||
      filePath.endsWith('index.ts') ||
      filePath.endsWith('public-api.ts') ||
      filePath.endsWith('test-setup.ts') ||
      filePath.endsWith('.example.ts') ||
      !filePath.includes('/packages/components/src/')
    ) continue;

    processSourceFile(morphFile, componentMap, 'components', ownInputsByClass);
    componentsScanned++;
  }

  // ── Resolve hostDirectives input types from the registry ─────────────────
  // Composed inputs were emitted with `type: 'unknown'` and a `sourceDirective`
  // pointing at the class they're declared on. Walk every directive's inputs
  // and copy the type / defaultValue from the source class's own inputs.
  for (const comp of componentMap.values()) {
    for (const dir of comp.directives) {
      // Hold a reference to the original `inputs` array, then partition it
      // back into inputs/models based on each entry's resolved isModel flag.
      const pending = dir.inputs;
      const resolvedInputs: InputDef[] = [];
      const resolvedModels: ModelDef[] = [];

      for (const input of pending) {
        if (input.sourceDirective) {
          const sourceInputs = ownInputsByClass.get(input.sourceDirective) ?? [];
          const original = sourceInputs.find(i => i.name === input.name);
          if (original) {
            input.type = original.type;
            if (original.defaultValue !== undefined) {
              input.defaultValue = original.defaultValue;
            } else {
              delete input.defaultValue;
            }
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
  void componentsScanned;

  // Sort components by package, then by categoryPath, then by display name.
  // No category-order map: if a track wants a specific category order, it
  // belongs in the @category tag's path itself (e.g. prefix the segment
  // with `01-` etc.) — this extractor stays purely TSDoc-driven.
  const components = [...componentMap.values()].sort((a, b) => {
    if (a.pkg !== b.pkg) return a.pkg.localeCompare(b.pkg);
    const pathCmp = a.categoryPath.join('/').localeCompare(b.categoryPath.join('/'));
    return pathCmp !== 0 ? pathCmp : a.name.localeCompare(b.name);
  });

  _cached = { generatedAt: new Date().toISOString(), components };
  return _cached;
}

/**
 * Returns all component slugs — used by `getPrerenderParams()` in `app.routes.server.ts`.
 * @deprecated Use `getManifest().components.map(c => c.slug)` from `./manifest` instead.
 */
export function getDocsSlugs(): string[] {
  return extractDocsManifest().components.map(c => c.slug);
}
