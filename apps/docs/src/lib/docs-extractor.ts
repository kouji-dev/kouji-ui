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
const _DOC_FILE_RE = /@doc-file\s+(\S+)\s*\n([\s\S]*?)(?=@doc-file|@\w|\*\/|$)/g;

// ── JSDoc extraction using ts-query ──────────────────────────────────────────

/** True when the node carries a JSDoc `@internal` tag. */
function hasInternalTag(node: ts.Node): boolean {
  return ts.getJSDocTags(node).some(t => t.tagName.text === 'internal');
}

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
      const raw = typeof c === 'string' ? c : (c ?? []).map((x: { text?: string }) => x.text ?? '').join('');
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
        (validLangs as readonly string[]).includes(fenceLang)
          ? (fenceLang as ExampleFile['lang'])
          : (validLangs as readonly string[]).includes(ext)
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

function getRequired(node: ts.Node): boolean {
  const tags = tsquery<ts.JSDocTag>(node, 'JSDocTag[tagName.text="required"]');
  return tags.length > 0;
}

// getExampleFiles removed — replaced by getDocFiles() which uses @doc-file inline blocks.
// @example-file tag is no longer used; @doc-file is the replacement.

// ── Directive decorator metadata extraction ───────────────────────────────────

function getDecoratorArg(cls: ts.ClassDeclaration): string {
  // Match @Directive(...) OR @Component(...).
  const callExpr = tsquery<ts.CallExpression>(
    cls,
    'Decorator > CallExpression:has(Identifier[text="Directive"]), Decorator > CallExpression:has(Identifier[text="Component"])'
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

    // Find the `directive: ClassName` for the object literal that owns this
    // `inputs:` array. The matching `directive:` is the last one before the
    // inputs index inside the same object.
    const before = hdContent.slice(0, inputsIdx);
    const dirMatches = [...before.matchAll(/directive\s*:\s*(\w+)/g)];
    const sourceDirective = dirMatches.length ? dirMatches[dirMatches.length - 1][1] : '';

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
        // Placeholder — resolved against `ownInputsByClass` after every file
        // has been processed. See `resolveHostDirectiveInputTypes`.
        type: 'unknown',
        required: false,
        isModel: false,
        description: sourceDirective
          ? `Forwarded from \`${sourceDirective}.${original}\` via \`hostDirectives\`.`
          : `Forwarded from \`${original}\` via \`hostDirectives\`.`,
        sourceDirective,
      });
    }
  }
  return results;
}

// ── Signal input extraction using ts-query ────────────────────────────────────

function extractInputs(
  cls: ts.ClassDeclaration,
  sourceFile: ts.SourceFile,
  morphFile: SourceFile,
): InputDef[] {
  const props = tsquery<ts.PropertyDeclaration>(cls, SIGNAL_INPUT_SELECTOR);
  const results: InputDef[] = [];

  // Resolve the matching ts-morph class once per call so inferred-type
  // lookups via the TypeChecker don't pay per-property cost.
  const className = cls.name?.text ?? '';
  const morphClass = className ? morphFile.getClass(className) : undefined;

  for (const prop of props) {
    const name = (prop.name as ts.Identifier).text;
    if (name.startsWith('_')) continue;

    if (hasInternalTag(prop)) continue;
    const description = getJsDocDescription(prop);

    const initText = prop.initializer?.getText(sourceFile) ?? '';
    const isModel = initText.startsWith('model(');
    const required =
      initText.startsWith('input.required(') ||
      tsquery(prop, 'CallExpression > PropertyAccessExpression:has(Identifier[text="required"])').length > 0;

    // Type resolution, in priority order:
    //   1. Explicit field annotation on the property — preserved verbatim
    //      (this is how authors pin a type when ng-packagr's emission would
    //      otherwise narrow the write type).
    //   2. ts-morph TypeChecker on the property — the inferred type Angular
    //      itself sees, e.g. `InputSignal<boolean>` for `input(false)` or
    //      `ModelSignal<boolean | undefined>` for `model<boolean>()`.
    //   3. Source-level regex on the call's generic argument as a last resort
    //      for hand-written `input<T>(...)` forms not covered above.
    // The signal-input wrappers (`InputSignal`, `InputSignalWithTransform`,
    // `ModelSignal`) are stripped via `unwrapSignalType` so the docs page
    // shows the user-facing read type.
    let type = prop.type?.getText(sourceFile) ?? '';
    if (!type && morphClass) {
      type = morphClass.getProperty(name)?.getType().getText() ?? '';
    }
    if (type) {
      type = unwrapSignalType(type);
    } else {
      type =
        initText.match(/(?:input(?:\.required)?|model)<([^>]+)>/)?.[1] ?? 'unknown';
    }

    // Default value: only emit when the first argument to input() / model()
    // is a literal (string, number, boolean, null, undefined). Skip every
    // expression — including identifier references like `this.preset.default`
    // — because rendering an arbitrary JS expression in the docs table is
    // noisy and the regex-on-source approach mis-parsed nested parens
    // (e.g. an inline arrow body inside a transform option).
    const defaultValue = required ? undefined : extractLiteralDefault(prop, sourceFile);

    results.push({ name, type, required, isModel, description, defaultValue });
  }

  return results;
}

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

function pkgNameForPath(filePath: string): string {
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

/**
 * Returns the default value for an `input()` / `model()` call, but only when
 * the first argument is a primitive literal. Returns `undefined` for any
 * other expression — identifiers, property accesses, function calls, etc.
 * are not informative to a docs reader and lead to garbled output when the
 * source uses nested parentheses (transforms, factories, …).
 */
function extractLiteralDefault(
  prop: ts.PropertyDeclaration,
  sourceFile: ts.SourceFile,
): string | undefined {
  const init = prop.initializer;
  if (!init || !ts.isCallExpression(init) || init.arguments.length === 0) {
    return undefined;
  }
  const arg = init.arguments[0];
  switch (arg.kind) {
    case ts.SyntaxKind.StringLiteral:
    case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
    case ts.SyntaxKind.NumericLiteral:
    case ts.SyntaxKind.TrueKeyword:
    case ts.SyntaxKind.FalseKeyword:
    case ts.SyntaxKind.NullKeyword:
      return arg.getText(sourceFile);
    case ts.SyntaxKind.Identifier:
      return (arg as ts.Identifier).text === 'undefined' ? 'undefined' : undefined;
    default:
      return undefined;
  }
}

/**
 * Strips Angular signal-input wrappers (`InputSignal<T>`,
 * `InputSignalWithTransform<T, ...>`, `ModelSignal<T>`) from the displayed
 * type, leaving only the user-facing read type. Also strips fully-qualified
 * `import("…path…").` prefixes that ts-morph's TypeChecker emits when no
 * matching name is in scope. Falls through unchanged for any annotation
 * that doesn't match a known wrapper.
 */
function unwrapSignalType(type: string): string {
  const cleaned = type.replace(/import\("[^"]+"\)\./g, '');
  const m = cleaned.match(/^\s*(?:InputSignal(?:WithTransform)?|ModelSignal)\s*<\s*([^,>]+(?:<[^>]*>)?)/);
  return m ? m[1].trim() : cleaned;
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
    const ownInputs = ownInputsByClass.get(className) ?? [];
    const hdInputs = extractHostDirectiveInputs(decoratorArg);
    const inputs = [...ownInputs, ...hdInputs];
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
      for (const input of dir.inputs) {
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
          // Strip the resolution metadata from the public manifest.
          delete input.sourceDirective;
        }
      }
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
