import { Project, SourceFile } from 'ts-morph';
import { tsquery } from '@phenomnomnominal/tsquery';
import ts from 'typescript';
import { join, dirname } from 'node:path';
// node:fs no longer needed — @doc-file content is inline in TSDoc, not read from disk

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

/**
 * Regex to find @doc-file entries in raw JSDoc text.
 * TypeScript parses @doc-file as tag "@doc" with comment "-file ...", so tsquery
 * tag-name matching fails. We scan the raw JSDoc text directly instead.
 *
 * Captures: [1]=filename [2]=lang [3]=raw content (with JSDoc * prefixes)
 */
const DOC_FILE_RE = /@doc-file\s+(\S+)\s*\n([\s\S]*?)(?=@doc-file|@\w|\*\/|$)/g;

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

/**
 * Extracts plain @example tags — pure JSDoc snippets for IDE hover support.
 * These are NOT used as doc site previews; they remain standard TSDoc.
 */
function getJsDocExamples(node: ts.Node): string[] {
  const tags = tsquery<ts.JSDocTag>(node, 'JSDocTag[tagName.text="example"]');
  return tags
    .map(tag => {
      const c = tag.comment;
      const raw = typeof c === 'string' ? c : (c ?? []).map((x: any) => x.text ?? '').join('');
      // Strip fenced code blocks (```lang...```) and single backtick wrapping (`...`)
      return raw
        .replace(/```(?:\w+)?\n?/g, '').replace(/```/g, '')
        .replace(/^`([\s\S]*)`$/, '$1')  // strip single-backtick wrapping
        .trim();
    })
    .filter(Boolean);
}

/** Regex for a fenced code block: ```lang\ncontent\n``` */
const DOC_FENCED_RE = /```(\w+)\s*([\s\S]*?)```/;

/** Strip JSDoc line prefixes (` * `) and normalise indentation. */
function stripJsDocPrefixes(raw: string): string {
  const lines = raw.split('\n').map(l => l.replace(/^\s*\*\s?/, ''));
  const minIndent = lines
    .filter(l => l.trim())
    .reduce((min, l) => Math.min(min, l.match(/^(\s*)/)?.[1].length ?? 0), Infinity);
  return lines.map(l => l.slice(Math.min(minIndent, l.length))).join('\n').trim();
}

/**
 * Extracts @doc-file entries from a node's leading JSDoc comment in the raw source text.
 *
 * WHY raw text scanning:
 * - TypeScript parses @doc-file as tag "@doc" + comment "-file ..." (hyphen ≠ identifier)
 * - tsquery tag-name matching fails for hyphenated names
 * - JSDoc comment nodes are leading trivia, not children of ClassDeclaration in the AST
 *
 * Strategy: read the source file text, find the last /** block before the node,
 * then regex-scan it for @doc-file entries.
 */
function getDocFiles(node: ts.Node, sourceFile: ts.SourceFile): ExampleFile[] {
  const results: ExampleFile[] = [];
  const validLangs = ['ts', 'html', 'css'] as const;

  // The JSDoc comment is in the leading trivia: between getFullStart() and getStart().
  // getFullStart() = start of leading trivia (whitespace + JSDoc)
  // getStart(sf)   = first non-trivia character (decorator or 'export' keyword)
  const triviaStart = node.getFullStart();
  const triviaEnd = node.getStart(sourceFile, /*includeJsDocComment*/ false);
  const leadingTrivia = sourceFile.text.substring(triviaStart, triviaEnd);

  // Find the last /** ... */ block in the leading trivia
  const jsDocStart = leadingTrivia.lastIndexOf('/**');
  const jsDocEnd = leadingTrivia.lastIndexOf('*/');
  if (jsDocStart === -1 || jsDocEnd < jsDocStart) return results;

  const jsDocText = leadingTrivia.substring(jsDocStart, jsDocEnd + 2);

  // Scan for @doc-file entries
  const re = /@doc-file\s+(\S+)\s*\n([\s\S]*?)(?=\s*@doc-file|\s*\*\/|$)/g;
  for (const match of jsDocText.matchAll(re)) {
    const filename = match[1].trim();
    if (!filename) continue;

    const body = match[2];
    const fenceMatch = body.match(DOC_FENCED_RE);
    if (!fenceMatch) continue;

    const fenceLang = fenceMatch[1].toLowerCase();
    const content = stripJsDocPrefixes(fenceMatch[2]);
    if (!content) continue;

    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const lang: ExampleFile['lang'] =
      (validLangs as readonly string[]).includes(fenceLang as any)
        ? (fenceLang as ExampleFile['lang'])
        : (validLangs as readonly string[]).includes(ext as any)
          ? (ext as ExampleFile['lang'])
          : 'ts';

    results.push({ lang, filename, content });
  }

  return results;
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

// getExampleFiles removed — replaced by getDocFiles() which uses @doc-file inline blocks.
// @example-file tag is no longer used; @doc-file is the replacement.

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

/**
 * Extracts inputs exposed via hostDirectives with their public aliases.
 * e.g. `hostDirectives: [{ directive: KjDisabledDirective, inputs: ['disabled: kjDisabled'] }]`
 * emits an InputDef with name='kjDisabled', type='boolean', description='(from KjDisabledDirective)'
 */
function extractHostDirectiveInputs(decoratorArg: string): InputDef[] {
  const results: InputDef[] = [];
  // Find hostDirectives array content
  const hdMatch = decoratorArg.match(/hostDirectives\s*:\s*\[([\s\S]*?)\]/);
  if (!hdMatch) return results;

  const hdContent = hdMatch[1];
  // Find all inputs: ['...'] arrays inside hostDirectives entries
  const inputsRe = /inputs\s*:\s*\[([^\]]*)\]/g;
  for (const inputsMatch of hdContent.matchAll(inputsRe)) {
    const inputsList = inputsMatch[1];
    // Each entry: 'originalName: aliasName' or just 'name'
    const entryRe = /['"`]([^'"`]+)['"`]/g;
    for (const entry of inputsList.matchAll(entryRe)) {
      const raw = entry[1].trim();
      const parts = raw.split(':').map(s => s.trim());
      const alias = parts[1] ?? parts[0]; // public alias (what users write in templates)
      const original = parts[0];

      // Only expose inputs aliased with the kj prefix — CDK inputs without kj alias are internals
      if (!alias || !alias.startsWith('kj')) continue;

      results.push({
        name: alias,
        type: 'unknown',  // full type resolution requires compilation; shown as 'unknown' in docs
        required: false,
        isModel: false,
        description: `Forwarded from host directive (original: \`${original}\`).`,
        defaultValue: undefined,
      });
    }
  }
  return results;
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
    const examples = getJsDocExamples(cls);
    const exampleFiles = getDocFiles(cls, tsSourceFile);
    const ownInputs = extractInputs(cls, tsSourceFile);
    const hdInputs = extractHostDirectiveInputs(decoratorArg);
    const inputs = [...ownInputs, ...hdInputs];
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
