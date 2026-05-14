import ts from 'typescript';
import { tsquery } from '@phenomnomnominal/tsquery';
import { join, resolve, dirname } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import type { ExampleFile, DocExample, ExampleBucket } from './docs-extractor.types';

// ── Workspace root helper ─────────────────────────────────────────────────────

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

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Regex to find @doc-file entries in raw JSDoc text.
 * TypeScript parses @doc-file as tag "@doc" with comment "-file ...", so tsquery
 * tag-name matching fails. We scan the raw JSDoc text directly instead.
 *
 * Captures: [1]=filename [2]=lang [3]=raw content (with JSDoc * prefixes)
 */
export const _DOC_FILE_RE = /@doc-file\s+(\S+)\s*\n([\s\S]*?)(?=@doc-file|@\w|\*\/|$)/g;

/** Regex for a fenced code block: ```lang\ncontent\n``` */
const DOC_FENCED_RE = /```(\w+)\s*([\s\S]*?)```/;

const DOCS_THEMES_CSS_PATH = join(
  findWorkspaceRoot(process.cwd()),
  'packages/core/src/styles/docs-themes.css'
);

// ── JSDoc example helpers ─────────────────────────────────────────────────────

/**
 * Extracts plain @example tags — pure JSDoc snippets for IDE hover support.
 * These are NOT used as doc site previews; they remain standard TSDoc.
 */
export function getJsDocExamples(node: ts.Node): string[] {
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

/** Strip JSDoc line prefixes (` * `) and normalise indentation. */
export function stripJsDocPrefixes(raw: string): string {
  const lines = raw.split('\n').map(l => l.replace(/^\s*\*\s?/, ''));
  const minIndent = lines
    .filter(l => l.trim())
    .reduce((min, l) => Math.min(min, l.match(/^(\s*)/)?.[1].length ?? 0), Infinity);
  return lines.map(l => l.slice(Math.min(minIndent, l.length))).join('\n').trim();
}

/** Strip JSDoc `* ` line markers so regex can work on clean text. */
export function stripJsDocLineMarkers(text: string): string {
  return text.split('\n').map(l => l.replace(/^\s*\*\s?/, '')).join('\n');
}

/** Extract the raw JSDoc block for a node (leading trivia between getFullStart and getStart). */
export function getJsDocBlock(node: ts.Node, sourceFile: ts.SourceFile): string | null {
  const triviaStart = node.getFullStart();
  const triviaEnd = node.getStart(sourceFile, false);
  const trivia = sourceFile.text.substring(triviaStart, triviaEnd);
  const jsStart = trivia.lastIndexOf('/**');
  const jsEnd = trivia.lastIndexOf('*/');
  if (jsStart === -1 || jsEnd < jsStart) return null;
  return trivia.substring(jsStart, jsEnd + 2);
}

/** Extracts the first exported class name from a TypeScript file's source text. */
export function extractExportName(content: string): string | undefined {
  const match = content.match(/export\s+(?:default\s+)?class\s+(\w+)/);
  return match?.[1];
}

/** Reads a co-located example file. If it references docs-themes.css, appends it as an extra tab. */
export function readExampleFiles(dirPath: string, filename: string): ExampleFile[] {
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
export function parseDocFileEntries(cleanText: string, sourceDir?: string): ExampleFile[] {
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
export function getDocFiles(node: ts.Node, sourceFile: ts.SourceFile, sourceDir?: string): ExampleFile[] {
  const jsDocText = getJsDocBlock(node, sourceFile);
  if (!jsDocText) return [];

  const cleanText = stripJsDocLineMarkers(jsDocText);

  // If @doc-theme blocks exist, all @doc-file entries belong to themes — handled by getDocThemes
  if (cleanText.includes('@doc-theme')) return [];

  return parseDocFileEntries(cleanText, sourceDir);
}

/**
 * Extracts @doc-theme sections from JSDoc text.
 * Each theme contains @doc-file entries (same format as getDocFiles).
 *
 * TypeScript parses @doc-theme as tag "@doc" + comment "-theme name ...",
 * so we scan the raw JSDoc text directly.
 */
export function getDocThemes(node: ts.Node, sourceFile: ts.SourceFile, sourceDir?: string): Record<string, ExampleFile[]> {
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
export function getDocExamples(node: ts.Node, sourceFile: ts.SourceFile, sourceDir?: string): DocExample[] {
  const results: DocExample[] = [];

  const jsDocText = getJsDocBlock(node, sourceFile);
  if (!jsDocText) return results;
  const cleanText = stripJsDocLineMarkers(jsDocText);

  // Split on @doc-example at line start
  const exampleParts = cleanText.split(/(?:\n|^)(?=\s*@doc-example\s)/m);

  for (const part of exampleParts) {
    const headerMatch = part.match(/^\s*@doc-example[^\S\n]+([^\n]+)/);
    if (!headerMatch) continue;
    const label = headerMatch[1].trim();
    const body = part.slice(headerMatch.index! + headerMatch[0].length);

    // Capture any prose between the label line and the first @doc-file /
    // @doc-theme as the example description. Falls back to '' when absent.
    const firstTagIdx = body.search(/\n\s*@(?:doc-file|doc-theme)\b/);
    const descBlock = firstTagIdx === -1 ? body : body.slice(0, firstTagIdx);
    const description = descBlock
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .join(' ')
      .trim();

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
      const slug = deriveExampleSlug(label, themedFiles);
      results.push({
        label,
        ...(description ? { description } : {}),
        slug,
        bucket: deriveExampleBucket(slug, label),
        themedFiles,
      });
    }
  }

  return results;
}

/**
 * The state axis — example slugs like `<comp>.<state>.example.ts` where
 * `<state>` is in this set get bucketed into the States section.
 */
const STATE_KEYS = new Set([
  'disabled', 'loading', 'pressed', 'checked', 'indeterminate',
  'busy', 'readonly', 'invalid', 'active', 'hover', 'focus',
]);

/**
 * Buckets an example based on its slug. The slug is `<comp>` or
 * `<comp>.<variant>` (or deeper). The first segment after the component
 * name determines the bucket; unknown segments fall through to recipe.
 */
export function deriveExampleBucket(slug: string, label: string): ExampleBucket {
  const segments = slug.split('.');
  if (segments.length <= 1) return 'playground';
  const axis = segments[1];
  if (axis === 'variants') return 'variants';
  if (axis === 'sizes') return 'sizes';
  if (STATE_KEYS.has(axis)) return 'states';
  // Heuristic: a label of literally "Default" / "Playground" wins regardless
  // of slug (handles components whose canonical example uses a deeper slug).
  const labelLc = label.toLowerCase();
  if (labelLc === 'default' || labelLc === 'playground') return 'playground';
  return 'recipe';
}

/**
 * Derives the example's URL-fragment slug. Strategy: scan `themedFiles` for the
 * first `*.example.ts` filename and strip `.example.ts` (e.g.
 * `button.size.example.ts` → `button.size`). Falls back to a slugified label
 * if no `.example.ts` file is referenced (only inline `@doc-file foo.ts`
 * entries that don't follow the convention).
 */
export function deriveExampleSlug(label: string, themedFiles: Record<string, ExampleFile[]>): string {
  for (const files of Object.values(themedFiles)) {
    for (const f of files) {
      if (f.filename.endsWith('.example.ts')) {
        // Normalise: drop directory portion AND any leading `./` so a
        // `@doc-file ./examples/foo.example.ts` and a bare
        // `@doc-file foo.example.ts` produce the same slug.
        const base = f.filename.split(/[\\/]/).pop() ?? f.filename;
        return base.slice(0, -'.example.ts'.length);
      }
    }
  }
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
