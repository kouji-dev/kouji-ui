import { Project, SourceFile } from 'ts-morph';
import { tsquery } from '@phenomnomnominal/tsquery';
import ts from 'typescript';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';

// ── Exported types ──────────────────────────────────────────────────────────

export interface InputDef {
  name: string;
  type: string;
  required: boolean;
  isModel: boolean;
  description: string;
  defaultValue?: string;
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
}

export interface DirectiveDef {
  className: string;
  selector: string;
  exportAs?: string;
  categoryPath: string[];
  description: string;
  inputs: InputDef[];
  examples: string[];
  exampleFiles: ExampleFile[];
}

export interface ComponentDoc {
  name: string;
  slug: string;
  categoryPath: string[];
  category: 'foundation' | 'overlay' | 'data' | 'charts' | 'a11y' | 'primitives';
  description: string;
  directives: DirectiveDef[];
  tokens: TokenDef[];
  typeAliases: TypeAliasDef[];
}

export interface DocsManifest {
  generatedAt: string;
  components: ComponentDoc[];
}

// ── Category mapping ─────────────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, ComponentDoc['category']> = {
  dialog: 'overlay', tooltip: 'overlay', popover: 'overlay', menu: 'overlay', toast: 'overlay',
  table: 'data', form: 'data', tabs: 'data', accordion: 'data', select: 'data',
  chart: 'charts',
  a11y: 'a11y',
  primitives: 'primitives',
};

function getCategory(folder: string): ComponentDoc['category'] {
  return CATEGORY_MAP[folder] ?? 'foundation';
}

// ── ts-query selectors ────────────────────────────────────────────────────────

/** All exported classes decorated with @Directive */
const DIRECTIVE_CLASS_SELECTOR =
  'ClassDeclaration:has(Decorator:has(Identifier[text="Directive"]))';

/** Properties initialized with input(), input.required(), or model() signals */
const SIGNAL_INPUT_SELECTOR = [
  'PropertyDeclaration:has(CallExpression > Identifier[text="input"])',
  'PropertyDeclaration:has(CallExpression > PropertyAccessExpression:has(Identifier[text="required"]))',
  'PropertyDeclaration:has(CallExpression > Identifier[text="model"])',
].join(', ');

/** Exported InjectionToken const declarations */
const INJECTION_TOKEN_SELECTOR =
  'VariableStatement:has(ExportKeyword):has(NewExpression > Identifier[text="InjectionToken"])';

/** Exported type aliases (e.g. KjButtonVariant = 'default' | 'destructive') */
const TYPE_ALIAS_SELECTOR =
  'TypeAliasDeclaration:has(ExportKeyword)';

/** @category tag — e.g. "@category Foundation/Button" */
const CATEGORY_TAG_SELECTOR = 'JSDocTag[tagName.text="category"]';

/** @example-file tag — points to a separate example file */
const EXAMPLE_FILE_SELECTOR = 'JSDocTag[tagName.text="example-file"]';

// ── JSDoc extraction using ts-query ──────────────────────────────────────────

function getJsDocDescription(node: ts.Node): string {
  const tags = tsquery<ts.JSDoc>(node, 'JSDoc');
  if (!tags.length) return '';
  const comment = tags[0].comment;
  if (!comment) return '';
  if (typeof comment === 'string') return comment.trim().replace(/\s+/g, ' ');
  // NodeArray<JSDocComment>
  return comment
    .map(c => ('text' in c ? (c as ts.JSDocText).text : ''))
    .join('')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Regex: matches ```lang\nfilename\ncontent\n``` inside a JSDoc @example block */
const FENCED_BLOCK_RE = /```(\w+)\s*\n([^\n]+)\n([\s\S]*?)```/g;

/**
 * Parse @example tags. Two formats supported:
 *
 * Sugar syntax (preferred) — fenced blocks where first line is the filename:
 * ```ts
 * button.component.ts
 * import { Component } from ...
 * ```
 *
 * Legacy — raw text snippet (kept for backward compat, returned in examples[]).
 */
function parseExampleTag(raw: string): { text: string; files: ExampleFile[] } {
  const files: ExampleFile[] = [];
  let hasFenced = false;

  for (const match of raw.matchAll(FENCED_BLOCK_RE)) {
    hasFenced = true;
    const lang = match[1] as 'ts' | 'html' | 'css';
    const filename = match[2].trim();
    const content = match[3].trim();
    const validLang: ExampleFile['lang'] = (['ts', 'html', 'css'] as string[]).includes(lang)
      ? (lang as ExampleFile['lang'])
      : 'ts';
    files.push({ lang: validLang, filename, content });
  }

  // If no fenced blocks found, return as plain text
  if (!hasFenced) {
    const text = raw.replace(/```(?:\w+)?\n?/g, '').replace(/```/g, '').trim();
    return { text, files: [] };
  }

  return { text: '', files };
}

function getJsDocExamples(node: ts.Node): { examples: string[]; exampleFiles: ExampleFile[] } {
  const exampleTags = tsquery<ts.JSDocTag>(node, 'JSDocTag[tagName.text="example"]');
  const examples: string[] = [];
  const exampleFiles: ExampleFile[] = [];

  for (const tag of exampleTags) {
    const c = tag.comment;
    const raw = typeof c === 'string' ? c : (c ?? []).map((x: any) => x.text ?? '').join('');
    const { text, files } = parseExampleTag(raw);
    if (text) examples.push(text);
    exampleFiles.push(...files);
  }

  return { examples, exampleFiles };
}

function getCategoryPath(node: ts.Node): string[] {
  const tags = tsquery<ts.JSDocTag>(node, CATEGORY_TAG_SELECTOR);
  if (!tags.length) return [];
  const comment = tags[0].comment;
  const raw = typeof comment === 'string'
    ? comment
    : (comment ?? []).map((x: any) => x.text ?? '').join('');
  return raw.trim().split('/').map(s => s.trim()).filter(Boolean);
}

function getExampleFiles(node: ts.Node, sourceFilePath: string): ExampleFile[] {
  const tags = tsquery<ts.JSDocTag>(node, EXAMPLE_FILE_SELECTOR);
  const results: ExampleFile[] = [];

  for (const tag of tags) {
    const c = tag.comment;
    const raw = typeof c === 'string' ? c : (c ?? []).map((x: any) => x.text ?? '').join('');
    const relativePath = raw.trim();
    if (!relativePath) continue;

    const dir = dirname(sourceFilePath);
    const absPath = join(dir, relativePath);
    try {
      const content = readFileSync(absPath, 'utf-8');
      const ext = relativePath.split('.').pop() as 'ts' | 'html' | 'css';
      const lang = (['ts', 'html', 'css'] as string[]).includes(ext) ? ext as 'ts' | 'html' | 'css' : 'ts';
      results.push({ lang, filename: relativePath.split('/').pop() ?? relativePath, content });
    } catch {
      // file not found — skip
    }
  }

  return results;
}

// ── Directive decorator metadata extraction ───────────────────────────────────

function getDecoratorArg(cls: ts.ClassDeclaration): string {
  const callExpr = tsquery<ts.CallExpression>(
    cls,
    'Decorator > CallExpression:has(Identifier[text="Directive"])'
  );
  return callExpr[0]?.arguments[0]?.getText() ?? '';
}

function extractDecoratorProp(decoratorArg: string, prop: string): string | undefined {
  return decoratorArg.match(new RegExp(`${prop}:\\s*['"\`]([^'"\`]+)['"\`]`))?.[1];
}

// ── Signal input extraction using ts-query ────────────────────────────────────

function extractInputs(cls: ts.ClassDeclaration, sourceFile: ts.SourceFile): InputDef[] {
  const props = tsquery<ts.PropertyDeclaration>(cls, SIGNAL_INPUT_SELECTOR);
  const results: InputDef[] = [];

  for (const prop of props) {
    const name = (prop.name as ts.Identifier).text;
    if (name.startsWith('_')) continue;

    const description = getJsDocDescription(prop);
    if (description.startsWith('@internal')) continue;

    const initText = prop.initializer?.getText(sourceFile) ?? '';
    const isModel = initText.startsWith('model(');
    const required =
      initText.startsWith('input.required(') ||
      tsquery(prop, 'CallExpression > PropertyAccessExpression:has(Identifier[text="required"])').length > 0;

    // Type: prefer explicit type annotation, fall back to generic argument
    let type = prop.type?.getText(sourceFile) ?? '';
    if (!type) {
      type =
        initText.match(/(?:input(?:\.required)?|model)<([^>]+)>/)?.[1] ?? 'unknown';
    }

    // Default value from input(defaultValue)
    const defaultMatch = !required ? initText.match(/(?:input|model)\(([^)]+)\)/) : null;
    const defaultValue = defaultMatch?.[1]?.trim();

    results.push({ name, type, required, isModel, description, defaultValue });
  }

  return results;
}

// ── InjectionToken extraction ─────────────────────────────────────────────────

function extractTokens(sourceFile: ts.SourceFile): TokenDef[] {
  const stmts = tsquery<ts.VariableStatement>(sourceFile, INJECTION_TOKEN_SELECTOR);
  return stmts.map(stmt => {
    const decl = stmt.declarationList.declarations[0];
    const name = (decl?.name as ts.Identifier)?.text ?? '';
    const description = getJsDocDescription(stmt);
    return { name, description };
  }).filter(t => t.name);
}

// ── Type alias extraction ─────────────────────────────────────────────────────

function extractTypeAliases(sourceFile: ts.SourceFile): TypeAliasDef[] {
  const aliases = tsquery<ts.TypeAliasDeclaration>(sourceFile, TYPE_ALIAS_SELECTOR);
  return aliases.map(alias => {
    const name = alias.name.text;
    const type = alias.type.getText(sourceFile);
    const description = getJsDocDescription(alias);
    return { name, type, description };
  });
}

// ── Shared per-file processing ────────────────────────────────────────────────

function pkgNameForPath(filePath: string): string {
  if (filePath.includes('/packages/ui/src/')) return 'UI';
  return 'Core';
}

function folderFromPath(filePath: string): string | null {
  const coreMatch = filePath.split('/packages/core/src/')[1];
  if (coreMatch) return coreMatch.split('/')[0] ?? null;
  const uiMatch = filePath.split('/packages/ui/src/')[1];
  if (uiMatch) return uiMatch.split('/')[0] ?? null;
  return null;
}

function processSourceFile(
  morphFile: SourceFile,
  componentMap: Map<string, ComponentDoc>,
): void {
  const filePath = morphFile.getFilePath();

  const folder = folderFromPath(filePath);
  if (!folder || folder === 'unknown') return;

  const pkgName = pkgNameForPath(filePath);

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
    // Only exported classes
    const isExported = cls.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!isExported) continue;

    const decoratorArg = getDecoratorArg(cls);
    const selector = extractDecoratorProp(decoratorArg, 'selector');
    if (!selector) continue;

    const exportAs = extractDecoratorProp(decoratorArg, 'exportAs');
    const className = cls.name?.text ?? '';
    const description = getJsDocDescription(cls);
    const { examples, exampleFiles: inlineFiles } = getJsDocExamples(cls);
    const fileTagFiles = getExampleFiles(cls, filePath);
    const exampleFiles = [...inlineFiles, ...fileTagFiles];
    const inputs = extractInputs(cls, tsSourceFile);
    const categoryPath = getCategoryPath(cls);

    if (!componentMap.has(folder)) {
      componentMap.set(folder, {
        name: folder.charAt(0).toUpperCase() + folder.slice(1),
        slug: folder,
        categoryPath: [],
        category: getCategory(folder),
        description: '',
        directives: [],
        tokens: [],
        typeAliases: [],
      });
    }

    const comp = componentMap.get(folder)!;
    if (!comp.description && description) comp.description = description;

    // Prepend package name to directive categoryPath, then propagate to component
    const fullPath = categoryPath.length ? [pkgName, ...categoryPath] : [];
    if (!comp.categoryPath.length && fullPath.length) {
      comp.categoryPath = fullPath;
    }

    const directiveWithPkg: DirectiveDef = {
      className,
      selector,
      ...(exportAs ? { exportAs } : {}),
      categoryPath: fullPath,
      description,
      inputs,
      examples,
      exampleFiles,
    };
    comp.directives.push(directiveWithPkg);
  }

  // ── Extract InjectionTokens and type aliases ──────────────────────────────
  if (componentMap.has(folder)) {
    const comp = componentMap.get(folder)!;
    comp.tokens.push(...extractTokens(tsSourceFile));
    comp.typeAliases.push(...extractTypeAliases(tsSourceFile));
  }
}

// ── Main extraction ───────────────────────────────────────────────────────────

let _cached: DocsManifest | null = null;

/**
 * Extracts the full docs manifest from `@kouji-ui/core` and `@kouji-ui/ui` source files.
 * Uses ts-morph for project/tsconfig resolution and ts-query for AST querying.
 * Result is cached in memory after the first call.
 *
 * @param rootDir - Monorepo root directory. Defaults to `process.cwd()`.
 */
export function extractDocsManifest(rootDir?: string): DocsManifest {
  if (_cached) return _cached;

  const root = rootDir ?? process.env['KOUJI_ROOT'] ?? process.cwd();

  // ts-morph handles tsconfig resolution and file loading
  const project = new Project({
    tsConfigFilePath: join(root, 'packages/core/tsconfig.lib.json'),
    skipAddingFilesFromTsConfig: false,
  });
  project.addSourceFilesAtPaths([join(root, 'packages/core/src/**/*.ts')]);

  const componentMap = new Map<string, ComponentDoc>();

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

    processSourceFile(morphFile, componentMap);
  }

  // ── Pass 2: packages/ui ───────────────────────────────────────────────────
  project.addSourceFilesAtPaths([join(root, 'packages/ui/src/**/*.ts')]);

  for (const morphFile of project.getSourceFiles()) {
    const filePath = morphFile.getFilePath();
    if (
      !filePath.includes('/packages/ui/src/') ||
      filePath.includes('.spec.') ||
      filePath.endsWith('index.ts') ||
      filePath.endsWith('public-api.ts')
    ) continue;

    processSourceFile(morphFile, componentMap);
  }

  // Fill in categoryPath for components that had no @category tag
  const categoryFallbacks: Record<string, string[]> = {
    foundation: ['Core', 'Foundation'],
    overlay: ['Core', 'Overlay'],
    data: ['Core', 'Data'],
    charts: ['Core', 'Charts'],
    a11y: ['Core', 'Accessibility'],
    primitives: ['Core', 'Primitives'],
  };

  for (const comp of componentMap.values()) {
    if (!comp.categoryPath.length) {
      comp.categoryPath = [
        ...(categoryFallbacks[comp.category] ?? ['Core', 'Foundation']),
        comp.name,
      ];
    }
  }

  // Sort by category order
  const categoryOrder: ComponentDoc['category'][] = [
    'foundation', 'overlay', 'data', 'charts', 'a11y', 'primitives',
  ];
  const components = [...componentMap.values()].sort((a, b) => {
    const ai = categoryOrder.indexOf(a.category);
    const bi = categoryOrder.indexOf(b.category);
    return ai !== bi ? ai - bi : a.name.localeCompare(b.name);
  });

  _cached = { generatedAt: new Date().toISOString(), components };
  return _cached;
}

/** Returns all component slugs — used by getPrerenderParams(). */
export function getDocsSlugs(rootDir?: string): string[] {
  return extractDocsManifest(rootDir).components.map(c => c.slug);
}
