import { Project, Node } from 'ts-morph';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../../..');

interface InputDef {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: string;
}

interface ExampleFile {
  lang: 'ts' | 'html' | 'css';
  filename: string;
  content: string;
  exportName?: string;  // exported class name, used for component lookup
}

interface DocExample {
  label: string;
  themedFiles: Record<string, ExampleFile[]>;
}

interface DirectiveDef {
  className: string;
  selector: string;
  categoryPath: string[];
  description: string;
  inputs: InputDef[];
  examples: string[];
  exampleFiles: ExampleFile[];        // default theme files (backward compat)
  themedExamples: Record<string, ExampleFile[]>;  // keyed by theme name
  docExamples: DocExample[];          // named example groups
}

interface ComponentDoc {
  name: string;
  slug: string;
  categoryPath: string[];
  category: 'base' | 'inputs' | 'navigation' | 'overlays' | 'data' | 'display' | 'a11y' | 'primitives';
  description: string;
  directives: DirectiveDef[];
}

/** Extracts the first exported class name from a TypeScript file's source text. */
function extractExportName(content: string): string | undefined {
  const match = content.match(/export\s+(?:default\s+)?class\s+(\w+)/);
  return match?.[1];
}

const DOCS_THEMES_CSS_PATH = join(
  process.cwd(),
  'packages/core/src/styles/docs-themes.css'
);

/** Reads a co-located example file from disk. If the file references docs-themes.css via styleUrls, appends it as an extra tab. */
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

    // If the example references docs-themes.css, append it as a CSS file tab
    if (content.includes('docs-themes.css')) {
      try {
        const cssContent = readFileSync(DOCS_THEMES_CSS_PATH, 'utf-8');
        files.push({ lang: 'css', filename: 'docs-themes.css', content: cssContent });
      } catch { /* CSS file not yet created — skip silently */ }
    }

    return files;
  } catch {
    return [];
  }
}

/** Determine category from folder name */
function getCategory(folder: string): ComponentDoc['category'] {
  const base = ['button'];
  const inputs = ['input', 'checkbox', 'radio', 'toggle', 'select', 'form'];
  const navigation = ['tabs', 'accordion', 'menu'];
  const overlays = ['dialog', 'popover', 'tooltip', 'toast'];
  const data = ['table', 'chart'];
  const display = ['avatar', 'badge'];
  if (base.includes(folder)) return 'base';
  if (inputs.includes(folder)) return 'inputs';
  if (navigation.includes(folder)) return 'navigation';
  if (overlays.includes(folder)) return 'overlays';
  if (data.includes(folder)) return 'data';
  if (display.includes(folder)) return 'display';
  if (folder === 'a11y') return 'a11y';
  if (folder === 'primitives') return 'primitives';
  return 'inputs'; // default
}

/** Extract the selector string from @Directive({ selector: '...' }) */
function extractSelector(decoratorArgs: string): string {
  const match = decoratorArgs.match(/selector:\s*['"`]([^'"`]+)['"`]/);
  return match?.[1] ?? '';
}

/** Extracts bracket content with depth tracking — handles nested `[]`. */
function extractBracketContent(text: string, startIdx: number): string {
  let depth = 0;
  for (let i = startIdx; i < text.length; i++) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']') { depth--; if (depth === 0) return text.slice(startIdx + 1, i); }
  }
  return '';
}

/** Extracts kj-prefixed inputs forwarded via hostDirectives. */
function extractHostDirectiveInputs(decoratorArgs: string): InputDef[] {
  const results: InputDef[] = [];
  const hdKeyIdx = decoratorArgs.indexOf('hostDirectives');
  if (hdKeyIdx === -1) return results;
  const bracketStart = decoratorArgs.indexOf('[', hdKeyIdx);
  if (bracketStart === -1) return results;
  const hdContent = extractBracketContent(decoratorArgs, bracketStart);
  let searchPos = 0;
  while (searchPos < hdContent.length) {
    const inputsIdx = hdContent.indexOf('inputs:', searchPos);
    if (inputsIdx === -1) break;
    const arrStart = hdContent.indexOf('[', inputsIdx);
    if (arrStart === -1) break;
    const inputsList = extractBracketContent(hdContent, arrStart);
    searchPos = arrStart + inputsList.length + 2;
    const entryRe = /['"`]([^'"`]+)['"`]/g;
    for (const entry of inputsList.matchAll(entryRe)) {
      const raw = entry[1].trim();
      const parts = raw.split(':').map((s: string) => s.trim());
      const alias = parts[1] ?? parts[0];
      const original = parts[0];
      if (!alias || !alias.startsWith('kj')) continue;
      results.push({ name: alias, type: 'boolean', required: false, description: `Forwarded from \`${original}\` via \`hostDirectives\`.`, defaultValue: 'false' });
    }
  }
  return results;
}

/** Extract clean text from a JSDoc comment node */
function extractJsDocText(node: Node, sourceFilePath: string): {
  description: string;
  examples: string[];
  categoryPath: string[];
  exampleFiles: ExampleFile[];
} {
  const jsDocs = (node as any).getJsDocs?.() ?? [];
  let description = '';
  const examples: string[] = [];
  let categoryPath: string[] = [];
  const exampleFiles: ExampleFile[] = [];

  for (const doc of jsDocs) {
    const comment = doc.getComment() ?? '';
    if (typeof comment === 'string') {
      description = comment.trim().replace(/\s+/g, ' ');
    }
    for (const tag of doc.getTags?.() ?? []) {
      const tagName = tag.getTagName();
      if (tagName === 'example') {
        const text = tag.getComment() ?? '';
        const cleaned = typeof text === 'string'
          ? text.replace(/```(?:html|ts)?\n?/g, '').replace(/```/g, '').replace(/^`([\s\S]*)`$/, '$1').trim()
          : '';
        if (cleaned) examples.push(cleaned);
      } else if (tagName === 'category') {
        const text = tag.getComment() ?? '';
        const raw = typeof text === 'string' ? text : '';
        categoryPath = raw.trim().split('/').map((s: string) => s.trim()).filter(Boolean);
      } else if (tagName === 'example-file') {
        const text = tag.getComment() ?? '';
        const relativePath = (typeof text === 'string' ? text : '').trim();
        if (relativePath) {
          const dir = dirname(sourceFilePath);
          const absPath = join(dir, relativePath);
          try {
            const content = readFileSync(absPath, 'utf-8');
            const ext = relativePath.split('.').pop() as string;
            const lang: 'ts' | 'html' | 'css' = (['ts', 'html', 'css'] as string[]).includes(ext)
              ? ext as 'ts' | 'html' | 'css'
              : 'ts';
            exampleFiles.push({ lang, filename: relativePath.split('/').pop() ?? relativePath, content });
          } catch {
            // file not found — skip
          }
        }
      }
    }

    // Parse @doc-file inline blocks from raw JSDoc text.
    // ts-morph's tag parser breaks on @ signs inside code (e.g. @Component, @angular/core),
    // so we parse the raw JSDoc text directly.
    // Strategy: find each "@doc-file <filename>" occurrence, then locate the next fenced
    // code block (``` ... ```) that follows it. This avoids any block-termination regex
    // that would incorrectly fire on @ signs inside embedded code.
    const rawDocText: string = doc.getText() ?? '';
    const docFileTagRe = /\*\s+@doc-file\s+(\S+)\s*\n/g;
    let dfTagMatch: RegExpExecArray | null;
    while ((dfTagMatch = docFileTagRe.exec(rawDocText)) !== null) {
      const filename = dfTagMatch[1].trim();
      const afterTag = rawDocText.substring(dfTagMatch.index + dfTagMatch[0].length);
      // Strip leading "* " JSDoc prefixes from what follows, then find first fenced block
      const stripped = afterTag
        .split('\n')
        .map((line: string) => line.replace(/^\s*\*\s?/, ''))
        .join('\n');
      const fenceMatch = stripped.match(/```(\w*)\s*\n([\s\S]*?)```/);
      if (fenceMatch) {
        const langRaw = (fenceMatch[1] ?? 'ts').trim() || 'ts';
        const lang: 'ts' | 'html' | 'css' = (['ts', 'html', 'css'] as string[]).includes(langRaw)
          ? langRaw as 'ts' | 'html' | 'css'
          : 'ts';
        // Strip common leading indentation from the embedded code block
        const innerLines = fenceMatch[2].split('\n');
        const nonEmpty = innerLines.filter((l: string) => l.trim().length > 0);
        const minIndent = nonEmpty.length
          ? Math.min(...nonEmpty.map((l: string) => (l.match(/^(\s*)/) as RegExpMatchArray)[1].length))
          : 0;
        const content = innerLines.map((l: string) => l.substring(minIndent)).join('\n').trim();
        if (content) {
          exampleFiles.push({ lang, filename, content });
        }
      } else {
        // File-path only — read the actual file from the source directory
        const dir = dirname(sourceFilePath);
        const files = readExampleFiles(dir, filename);
        exampleFiles.push(...files);
      }
    }
  }

  return { description, examples, categoryPath, exampleFiles };
}

/** Regex to find @doc-theme sections in raw JSDoc text */
const DOC_THEME_RE = /@doc-theme\s+(\w+)([\s\S]*?)(?=@doc-theme\s+\w|\s*\*\/|$)/g;

/**
 * Parses @doc-theme sections from raw JSDoc full text (via ts-morph getText()).
 * Each theme contains @doc-file entries in the same inline format as getDocFiles.
 */
function parseDocThemes(fullText: string, sourceFilePath?: string): Record<string, ExampleFile[]> {
  const result: Record<string, ExampleFile[]> = {};
  const validLangs = ['ts', 'html', 'css'] as const;

  // Find the JSDoc block that contains @doc-theme rather than the last /** block
  // (getFullText() includes the class body, so lastIndexOf finds property JSDoc, not the class JSDoc)
  const docThemeIdx = fullText.indexOf('@doc-theme');
  if (docThemeIdx === -1) return result;

  // Walk back from @doc-theme to find the opening /**
  const jsDocStart = fullText.lastIndexOf('/**', docThemeIdx);
  // Walk forward from @doc-theme to find the closing */
  const jsDocEnd = fullText.indexOf('*/', docThemeIdx);
  if (jsDocStart === -1 || jsDocEnd === -1 || jsDocEnd < jsDocStart) return result;

  const jsDocText = fullText.substring(jsDocStart, jsDocEnd + 2);

  DOC_THEME_RE.lastIndex = 0;
  for (const themeMatch of jsDocText.matchAll(DOC_THEME_RE)) {
    const themeName = themeMatch[1].trim();
    const themeBody = themeMatch[2];
    const files: ExampleFile[] = [];

    // Find each @doc-file tag in this theme's body using the same approach as extractJsDocText
    const docFileTagRe = /\*\s+@doc-file\s+(\S+)\s*\n/g;
    let dfTagMatch: RegExpExecArray | null;
    while ((dfTagMatch = docFileTagRe.exec(themeBody)) !== null) {
      const filename = dfTagMatch[1].trim();
      const afterTag = themeBody.substring(dfTagMatch.index + dfTagMatch[0].length);
      const stripped = afterTag
        .split('\n')
        .map((line: string) => line.replace(/^\s*\*\s?/, ''))
        .join('\n');
      const fenceMatch = stripped.match(/```(\w*)\s*\n([\s\S]*?)```/);
      if (fenceMatch) {
        const langRaw = (fenceMatch[1] ?? 'ts').trim() || 'ts';
        const lang: ExampleFile['lang'] = (validLangs as readonly string[]).includes(langRaw)
          ? langRaw as ExampleFile['lang']
          : 'ts';
        const innerLines = fenceMatch[2].split('\n');
        const nonEmpty = innerLines.filter((l: string) => l.trim().length > 0);
        const minIndent = nonEmpty.length
          ? Math.min(...nonEmpty.map((l: string) => (l.match(/^(\s*)/) as RegExpMatchArray)[1].length))
          : 0;
        const content = innerLines.map((l: string) => l.substring(minIndent)).join('\n').trim();
        if (content) {
          files.push({ lang, filename, content });
        }
      } else if (sourceFilePath) {
        // File-path only — read the actual file from the source directory
        const dir = dirname(sourceFilePath);
        const newFiles = readExampleFiles(dir, filename);
        files.push(...newFiles);
      }
    }

    if (files.length) {
      result[themeName] = files;
    }
  }

  return result;
}

/**
 * Parses @doc-example named example groups from raw JSDoc full text.
 * Each group has a label and themed files. If no @doc-theme inside a group,
 * all @doc-file entries are placed under the 'default' theme.
 */
function parseDocExamples(fullText: string, sourceFilePath?: string): DocExample[] {
  const results: DocExample[] = [];
  const validLangs = ['ts', 'html', 'css'] as const;

  // Locate the JSDoc block that contains @doc-example
  const docExampleIdx = fullText.indexOf('@doc-example');
  if (docExampleIdx === -1) return results;

  const jsDocStart = fullText.lastIndexOf('/**', docExampleIdx);
  const jsDocEnd = fullText.indexOf('*/', docExampleIdx);
  if (jsDocStart === -1 || jsDocEnd === -1 || jsDocEnd < jsDocStart) return results;

  const jsDocText = fullText.substring(jsDocStart, jsDocEnd + 2);

  // Strip JSDoc `* ` line markers
  const cleanText = jsDocText.split('\n').map((l: string) => l.replace(/^\s*\*\s?/, '')).join('\n');

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
        const files = parseDocFileEntriesClean(themeBody, sourceFilePath, validLangs);
        if (files.length) themedFiles[themeName] = files;
      }
    } else {
      // No themes — all @doc-file entries go to 'default'
      const files = parseDocFileEntriesClean(body, sourceFilePath, validLangs);
      if (files.length) themedFiles['default'] = files;
    }

    if (Object.keys(themedFiles).length) {
      results.push({ label, themedFiles });
    }
  }

  return results;
}

/** Shared helper: parse @doc-file entries from already-clean (stripped) JSDoc text. */
function parseDocFileEntriesClean(
  cleanText: string,
  sourceFilePath?: string,
  validLangs: readonly string[] = ['ts', 'html', 'css'],
): ExampleFile[] {
  const results: ExampleFile[] = [];

  const parts = cleanText.split(/(?:\n|^)(?=\s*@doc-file\s+\S)/m);
  for (const part of parts) {
    const header = part.match(/^\s*@doc-file\s+(\S+)/);
    if (!header) continue;
    const filename = header[1].trim();
    const rawBody = part.slice(header.index! + header[0].length);
    // Truncate at the next @ tag boundary so we don't accidentally pick up a fenced
    // code block that belongs to @example, @doc-example, etc.
    const atBoundary = rawBody.search(/\n\s*@(?!doc-file)/);
    const body = atBoundary !== -1 ? rawBody.slice(0, atBoundary) : rawBody;

    const fenceMatch = body.match(/```(\w*)\s*\n([\s\S]*?)```/);
    if (fenceMatch) {
      const langRaw = (fenceMatch[1] ?? 'ts').trim() || 'ts';
      const lang: ExampleFile['lang'] = (validLangs as readonly string[]).includes(langRaw)
        ? langRaw as ExampleFile['lang']
        : 'ts';
      const innerLines = fenceMatch[2].split('\n');
      const nonEmpty = innerLines.filter((l: string) => l.trim().length > 0);
      const minIndent = nonEmpty.length
        ? Math.min(...nonEmpty.map((l: string) => (l.match(/^(\s*)/) as RegExpMatchArray)[1].length))
        : 0;
      const content = innerLines.map((l: string) => l.substring(minIndent)).join('\n').trim();
      if (content) results.push({ lang, filename, content });
    } else if (sourceFilePath) {
      const dir = dirname(sourceFilePath);
      const newFiles = readExampleFiles(dir, filename);
      results.push(...newFiles);
    }
  }

  return results;
}

/** Extract signal input definitions from a class */
function extractInputs(cls: any): InputDef[] {
  const inputs: InputDef[] = [];

  for (const prop of cls.getProperties()) {
    const initializer = prop.getInitializer();
    if (!initializer) continue;

    const text = initializer.getText();
    // Match input(), input<T>(), input.required(), input.required<T>(), model(), model<T>()
    const isInput = /^input(?:<[^>]+>)?\(/.test(text) || /^input\.required(?:<[^>]+>)?\(/.test(text) || /^model(?:<[^>]+>)?\(/.test(text);
    if (!isInput) continue;

    const { description } = extractJsDocText(prop);
    const name = prop.getName();

    // Skip internal properties
    if (description.startsWith('@internal') || name.startsWith('_')) continue;

    const required = text.startsWith('input.required');
    const typeNode = prop.getTypeNode();
    let type = typeNode?.getText() ?? 'unknown';

    // Try to get type from generic argument if no explicit type node
    if (type === 'unknown') {
      const genericMatch = text.match(/input(?:\.required)?<([^>]+)>/);
      if (genericMatch) type = genericMatch[1];
    }

    // Extract default value from input(defaultValue)
    const defaultMatch = text.match(/input\(([^)]+)\)/);
    const defaultValue = !required && defaultMatch ? defaultMatch[1].trim() : undefined;

    inputs.push({ name, type, required, description, defaultValue });
  }

  return inputs;
}

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

async function main() {
  const project = new Project({
    tsConfigFilePath: join(root, 'packages/core/tsconfig.lib.json'),
    skipAddingFilesFromTsConfig: false,
  });

  // Add all directive files
  project.addSourceFilesAtPaths([
    join(root, 'packages/core/src/**/*.directive.ts'),
    join(root, 'packages/core/src/**/*.ts'),
  ]);

  const componentMap = new Map<string, ComponentDoc>();

  function processSourceFiles(pkgPath: string) {
    for (const sourceFile of project.getSourceFiles()) {
      const filePath = sourceFile.getFilePath();

      // Skip spec files and index files
      if (filePath.includes('.spec.') || filePath.endsWith('index.ts') || filePath.endsWith('public-api.ts')) continue;
      if (!filePath.includes(pkgPath)) continue;

      // Determine folder (component name)
      const folder = folderFromPath(filePath);
      if (!folder || folder === 'unknown') continue;

      const pkgName = pkgNameForPath(filePath);

      for (const cls of sourceFile.getClasses()) {
        if (!cls.isExported()) continue;

        // Check for @Directive decorator
        const directiveDecorator = cls.getDecorator('Directive');
        if (!directiveDecorator) continue;

        const decoratorArgs = directiveDecorator.getArguments()[0]?.getText() ?? '';
        const selector = extractSelector(decoratorArgs);
        if (!selector) continue;

        const { description, examples, categoryPath, exampleFiles } = extractJsDocText(cls, filePath);
        const themedExamples = parseDocThemes(cls.getFullText(), filePath);
        const docExamples = parseDocExamples(cls.getFullText(), filePath);
        const ownInputs = extractInputs(cls);
        const hdInputs = extractHostDirectiveInputs(decoratorArgs);
        const inputs = [...ownInputs, ...hdInputs];
        const className = cls.getName() ?? '';

        // If themedExamples has a 'default' key, use it as exampleFiles fallback
        const resolvedExampleFiles = themedExamples['default']?.length
          ? themedExamples['default']
          : exampleFiles;

        // Prepend package name to categoryPath
        const fullPath = categoryPath.length
          ? (categoryPath[0] === pkgName ? categoryPath : [pkgName, ...categoryPath])
          : [];

        const directive: DirectiveDef = {
          className,
          selector,
          categoryPath: fullPath,
          description,
          inputs,
          examples,
          exampleFiles: resolvedExampleFiles,
          themedExamples,
          docExamples,
        };

        // Group into component
        if (!componentMap.has(folder)) {
          componentMap.set(folder, {
            name: folder.charAt(0).toUpperCase() + folder.slice(1),
            slug: folder,
            categoryPath: [],
            category: getCategory(folder),
            description: '',
            directives: [],
          });
        }

        const comp = componentMap.get(folder)!;
        // Use first directive's description as component description
        if (!comp.description && description) {
          comp.description = description;
        }
        if (!comp.categoryPath.length && fullPath.length) {
          comp.categoryPath = fullPath;
        }
        comp.directives.push(directive);
      }
    }
  }

  // Pass 1: packages/core
  processSourceFiles('/packages/core/src/');

  // Pass 2: packages/ui
  project.addSourceFilesAtPaths([join(root, 'packages/ui/src/**/*.ts')]);
  processSourceFiles('/packages/ui/src/');

  // Fill in categoryPath for components that had no @category tag
  for (const comp of componentMap.values()) {
    if (!comp.categoryPath.length) {
      comp.categoryPath = [
        ...(categoryFallbacks[comp.category] ?? ['Core', 'Foundation']),
        comp.name,
      ];
    }
  }

  // Sort components: inputs first, then navigation, overlays, data, display, a11y, primitives
  const categoryOrder: ComponentDoc['category'][] = ['base', 'inputs', 'navigation', 'overlays', 'data', 'display', 'a11y', 'primitives'];
  const components = [...componentMap.values()].sort((a, b) => {
    const ai = categoryOrder.indexOf(a.category);
    const bi = categoryOrder.indexOf(b.category);
    return ai !== bi ? ai - bi : a.name.localeCompare(b.name);
  });

  const manifest = { generatedAt: new Date().toISOString(), components };

  // Write to assets
  const outDir = join(root, 'apps/docs/src/assets');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'docs-manifest.json');
  writeFileSync(outPath, JSON.stringify(manifest, null, 2));

  console.log(`✔ docs-manifest.json — ${components.length} components extracted`);
  components.forEach(c =>
    console.log(`  ${c.category.padEnd(12)} ${c.name.padEnd(16)} (${c.directives.length} directive${c.directives.length !== 1 ? 's' : ''})`)
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
