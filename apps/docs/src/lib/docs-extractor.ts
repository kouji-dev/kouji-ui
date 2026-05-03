import { Project, SourceFile } from 'ts-morph';
import { tsquery } from '@phenomnomnominal/tsquery';
import ts from 'typescript';
import { join, dirname, resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

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

export interface DirectiveDef {
  className: string;
  selector: string;
  exportAs?: string;
  categoryPath: string[];
  description: string;
  inputs: InputDef[];
  examples: string[];
  exampleFiles: ExampleFile[];        // default theme files (backward compat)
  themedExamples: Record<string, ExampleFile[]>;  // keyed by theme name
  docExamples: DocExample[];          // named example groups (new)
  required: boolean;           // from @required TSDoc tag
}

export interface ComponentDoc {
  name: string;
  slug: string;
  categoryPath: string[];
  category: 'base' | 'inputs' | 'navigation' | 'overlays' | 'data' | 'display' | 'a11y' | 'primitives';
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
  // Inputs
  button: 'base', input: 'inputs', checkbox: 'inputs', radio: 'inputs',
  toggle: 'inputs', select: 'inputs', form: 'inputs',
  // Navigation
  tabs: 'navigation', accordion: 'navigation', menu: 'navigation',
  // Overlays
  dialog: 'overlays', popover: 'overlays', tooltip: 'overlays', toast: 'overlays',
  // Data
  table: 'data', chart: 'data',
  // Display
  avatar: 'display', badge: 'display',
  // A11y and primitives stay the same
  a11y: 'a11y', primitives: 'primitives',
};

function getCategory(folder: string): ComponentDoc['category'] {
  return CATEGORY_MAP[folder] ?? 'inputs';
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
  // Preserve newlines so markdown (paragraphs, fenced code blocks) renders correctly.
  if (typeof comment === 'string') return comment.replace(/[ \t]+\n/g, '\n').trim();
  // NodeArray<JSDocComment>
  return comment
    .map(c => ('text' in c ? (c as ts.JSDocText).text : ''))
    .join('')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
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
/** Strip JSDoc `* ` line markers so regex can work on clean text. */
function stripJsDocLineMarkers(text: string): string {
  return text.split('\n').map(l => l.replace(/^\s*\*\s?/, '')).join('\n');
}

/** Extract the raw JSDoc block for a node (leading trivia between getFullStart and getStart). */
function getJsDocBlock(node: ts.Node, sourceFile: ts.SourceFile): string | null {
  const triviaStart = node.getFullStart();
  const triviaEnd = node.getStart(sourceFile, false);
  const trivia = sourceFile.text.substring(triviaStart, triviaEnd);
  const jsStart = trivia.lastIndexOf('/**');
  const jsEnd = trivia.lastIndexOf('*/');
  if (jsStart === -1 || jsEnd < jsStart) return null;
  return trivia.substring(jsStart, jsEnd + 2);
}

function getDocFiles(node: ts.Node, sourceFile: ts.SourceFile, sourceDir?: string): ExampleFile[] {
  const jsDocText = getJsDocBlock(node, sourceFile);
  if (!jsDocText) return [];

  const cleanText = stripJsDocLineMarkers(jsDocText);

  // If @doc-theme blocks exist, all @doc-file entries belong to themes — handled by getDocThemes
  if (cleanText.includes('@doc-theme')) return [];

  return parseDocFileEntries(cleanText, sourceDir);
}

/** Extracts the first exported class name from a TypeScript file's source text. */
function extractExportName(content: string): string | undefined {
  const match = content.match(/export\s+(?:default\s+)?class\s+(\w+)/);
  return match?.[1];
}

const DOCS_THEMES_CSS_PATH = join(
  findWorkspaceRoot(process.cwd()),
  'packages/core/src/styles/docs-themes.css'
);

/** Reads a co-located example file. If it references docs-themes.css, appends it as an extra tab. */
function readExampleFiles(dirPath: string, filename: string): ExampleFile[] {
  const fullPath = join(dirPath, filename);
  try {
    const content = readFileSync(fullPath, 'utf-8');
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'ts';
    const lang: ExampleFile['lang'] = (['ts', 'html', 'css'] as string[]).includes(ext)
      ? (ext as ExampleFile['lang'])
      : 'ts';
    const exportName = extractExportName(content);
    const files: ExampleFile[] = [{ lang, filename, content, exportName }];

    if (content.includes('docs-themes.css')) {
      try {
        const cssContent = readFileSync(DOCS_THEMES_CSS_PATH, 'utf-8');
        files.push({ lang: 'css', filename: 'docs-themes.css', content: cssContent });
      } catch { /* skip silently */ }
    }

    return files;
  } catch {
    return [];
  }
}

/** Shared helper: extracts @doc-file entries from clean (stripped) JSDoc text. */
function parseDocFileEntries(cleanText: string, sourceDir?: string): ExampleFile[] {
  const results: ExampleFile[] = [];
  const validLangs = ['ts', 'html', 'css'] as const;

  // Split on @doc-file at line start — avoids matching @doc-file inside code blocks
  const parts = cleanText.split(/(?:\n|^)(?=\s*@doc-file\s+\S)/m);

  for (const part of parts) {
    const header = part.match(/^\s*@doc-file\s+(\S+)/);
    if (!header) continue;
    const filename = header[1].trim();
    const rawBody = part.slice(header.index! + header[0].length);
    // Truncate at next @tag (e.g. @example after @doc-file) so we don't pick up
    // a fenced code block that belongs to a different tag.
    const atBoundary = rawBody.search(/\n\s*@(?!doc-file)/);
    const body = atBoundary !== -1 ? rawBody.slice(0, atBoundary) : rawBody;

    const fenceMatch = body.match(DOC_FENCED_RE);
    if (fenceMatch) {
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
    } else if (sourceDir) {
      // File-path only — read the actual file from the source directory
      const files = readExampleFiles(sourceDir, filename);
      results.push(...files);
    }
  }

  return results;
}

// DOC_THEME_RE removed — using split-based parsing instead (regex lookahead fails inside code blocks)

/**
 * Extracts @doc-theme sections from JSDoc text.
 * Each theme contains @doc-file entries (same format as getDocFiles).
 *
 * TypeScript parses @doc-theme as tag "@doc" + comment "-theme name ...",
 * so we scan the raw JSDoc text directly.
 */
function getDocThemes(node: ts.Node, sourceFile: ts.SourceFile, sourceDir?: string): Record<string, ExampleFile[]> {
  const result: Record<string, ExampleFile[]> = {};

  const jsDocText = getJsDocBlock(node, sourceFile);
  if (!jsDocText) return result;

  // Strip JSDoc `* ` markers so @doc-theme / @doc-file are on clean lines
  const cleanText = stripJsDocLineMarkers(jsDocText);

  // Split on @doc-theme boundaries at line start — avoids false matches inside code blocks
  // (e.g. @Component, @angular/core inside TypeScript examples).
  const themeParts = cleanText.split(/(?:\n|^)(?=\s*@doc-theme\s+\w)/m);

  for (const part of themeParts) {
    const headerMatch = part.match(/^\s*@doc-theme\s+(\w+)/);
    if (!headerMatch) continue;
    const themeName = headerMatch[1].trim();
    const themeBody = part.slice(headerMatch.index! + headerMatch[0].length);
    const files = parseDocFileEntries(themeBody, sourceDir);
    if (files.length) result[themeName] = files;
  }

  return result;
}

/**
 * Extracts @doc-example named example groups from JSDoc text.
 * Each group has a label and themed files. If no @doc-theme blocks are present
 * inside a group, all @doc-file entries are placed under the 'default' theme.
 */
function getDocExamples(node: ts.Node, sourceFile: ts.SourceFile, sourceDir?: string): DocExample[] {
  const results: DocExample[] = [];

  const jsDocText = getJsDocBlock(node, sourceFile);
  if (!jsDocText) return results;
  const cleanText = stripJsDocLineMarkers(jsDocText);

  // Split on @doc-example at line start
  const exampleParts = cleanText.split(/(?:\n|^)(?=\s*@doc-example\s)/m);

  for (const part of exampleParts) {
    const headerMatch = part.match(/^\s*@doc-example\s+(.+)/);
    if (!headerMatch) continue;
    const label = headerMatch[1].trim();
    const body = part.slice(headerMatch.index! + headerMatch[0].length);

    const themedFiles: Record<string, ExampleFile[]> = {};

    if (body.includes('@doc-theme')) {
      // Split on @doc-theme boundaries
      const themeParts = body.split(/(?:\n|^)(?=\s*@doc-theme\s+\w)/m);
      for (const tp of themeParts) {
        const themeHeader = tp.match(/^\s*@doc-theme\s+(\w+)/);
        if (!themeHeader) continue;
        const themeName = themeHeader[1].trim();
        const themeBody = tp.slice(themeHeader.index! + themeHeader[0].length);
        const files = parseDocFileEntries(themeBody, sourceDir);
        if (files.length) themedFiles[themeName] = files;
      }
    } else {
      // No themes — all @doc-file entries go to 'default'
      const files = parseDocFileEntries(body, sourceDir);
      if (files.length) themedFiles['default'] = files;
    }

    if (Object.keys(themedFiles).length) {
      results.push({ label, themedFiles });
    }
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

function getRequired(node: ts.Node): boolean {
  const tags = tsquery<ts.JSDocTag>(node, 'JSDocTag[tagName.text="required"]');
  return tags.length > 0;
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
 * e.g. `hostDirectives: [{ directive: KjDisabled, inputs: ['disabled: kjDisabled'] }]`
 * emits an InputDef with name='kjDisabled', type='boolean', description='(from KjDisabled)'
 */
/** Extracts bracket-enclosed content with proper depth tracking (handles nested `[]`). */
function extractBracketContent(text: string, startIdx: number): string {
  let depth = 0;
  for (let i = startIdx; i < text.length; i++) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']') { depth--; if (depth === 0) return text.slice(startIdx + 1, i); }
  }
  return '';
}

/**
 * Extracts inputs exposed via hostDirectives with their public kj-prefixed aliases.
 * Uses depth-tracking bracket extraction to handle nested arrays like `inputs: ['x']`
 * inside `hostDirectives: [{ directive: X, inputs: [...] }]`.
 */
function extractHostDirectiveInputs(decoratorArg: string): InputDef[] {
  const results: InputDef[] = [];

  // Find `hostDirectives:` then extract its array with depth tracking
  const hdKeyIdx = decoratorArg.indexOf('hostDirectives');
  if (hdKeyIdx === -1) return results;

  const bracketStart = decoratorArg.indexOf('[', hdKeyIdx);
  if (bracketStart === -1) return results;

  const hdContent = extractBracketContent(decoratorArg, bracketStart);

  // Find each `inputs: [...]` array inside the hostDirectives entries
  let searchPos = 0;
  while (searchPos < hdContent.length) {
    const inputsIdx = hdContent.indexOf('inputs:', searchPos);
    if (inputsIdx === -1) break;

    const arrStart = hdContent.indexOf('[', inputsIdx);
    if (arrStart === -1) break;

    const inputsList = extractBracketContent(hdContent, arrStart);
    searchPos = arrStart + inputsList.length + 2; // advance past this array

    // Parse each quoted entry: 'originalName: aliasName' or 'name'
    const entryRe = /['"`]([^'"`]+)['"`]/g;
    for (const entry of inputsList.matchAll(entryRe)) {
      const raw = entry[1].trim();
      const parts = raw.split(':').map(s => s.trim());
      const alias = parts[1] ?? parts[0];
      const original = parts[0];

      // Only expose inputs aliased with the kj prefix
      if (!alias || !alias.startsWith('kj')) continue;

      results.push({
        name: alias,
        type: 'boolean',
        required: false,
        isModel: false,
        description: `Forwarded from \`${original}\` via \`hostDirectives\`.`,
        defaultValue: 'false',
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

function pkgNameForPath(_filePath: string): string {
  return 'Core';
}

function folderFromPath(filePath: string): string | null {
  const coreMatch = filePath.split('/packages/core/src/')[1];
  if (coreMatch) return coreMatch.split('/')[0] ?? null;
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
    const sourceDir = dirname(morphFile.getFilePath());
    const description = getJsDocDescription(cls);
    const examples = getJsDocExamples(cls);
    const exampleFiles = getDocFiles(cls, tsSourceFile, sourceDir);
    const themedExamples = getDocThemes(cls, tsSourceFile, sourceDir);
    const docExamples = getDocExamples(cls, tsSourceFile, sourceDir);
    const ownInputs = extractInputs(cls, tsSourceFile);
    const hdInputs = extractHostDirectiveInputs(decoratorArg);
    const inputs = [...ownInputs, ...hdInputs];
    const categoryPath = getCategoryPath(cls);
    const required = getRequired(cls);

    // If themedExamples has a 'default' key, use it as exampleFiles fallback
    const resolvedExampleFiles = themedExamples['default']?.length
      ? themedExamples['default']
      : exampleFiles;

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

    // Prepend package name to directive categoryPath (skip if already present to avoid duplication)
    const fullPath = categoryPath.length
      ? (categoryPath[0] === pkgName ? categoryPath : [pkgName, ...categoryPath])
      : [];
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
      exampleFiles: resolvedExampleFiles,
      themedExamples,
      docExamples,
      required,
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

  // Fill in categoryPath for components that had no @category tag
  const categoryFallbacks: Record<string, string[]> = {
    base: ['Core', 'Base'],
    inputs: ['Core', 'Inputs'],
    navigation: ['Core', 'Navigation'],
    overlays: ['Core', 'Overlays'],
    data: ['Core', 'Data'],
    display: ['Core', 'Display'],
    a11y: ['Core', 'Accessibility'],
    primitives: ['Core', 'Primitives'],
  };

  for (const comp of componentMap.values()) {
    if (!comp.categoryPath.length) {
      comp.categoryPath = [
        ...(categoryFallbacks[comp.category] ?? ['Core', 'Inputs']),
        comp.name,
      ];
    }
  }

  // Sort by category order
  const categoryOrder: ComponentDoc['category'][] = [
    'inputs', 'navigation', 'overlays', 'data', 'display', 'a11y', 'primitives',
  ];
  const components = [...componentMap.values()].sort((a, b) => {
    const ai = categoryOrder.indexOf(a.category);
    const bi = categoryOrder.indexOf(b.category);
    return ai !== bi ? ai - bi : a.name.localeCompare(b.name);
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
