import { Project, Node } from 'ts-morph';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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
}

interface DirectiveDef {
  className: string;
  selector: string;
  categoryPath: string[];
  description: string;
  inputs: InputDef[];
  examples: string[];
  exampleFiles: ExampleFile[];
}

interface ComponentDoc {
  name: string;
  slug: string;
  categoryPath: string[];
  category: 'foundation' | 'overlay' | 'data' | 'charts' | 'a11y' | 'primitives';
  description: string;
  directives: DirectiveDef[];
}

/** Determine category from folder name */
function getCategory(folder: string): ComponentDoc['category'] {
  const overlays = ['dialog', 'tooltip', 'popover', 'menu', 'toast'];
  const data = ['table', 'form', 'tabs', 'accordion', 'select'];
  const charts = ['chart'];
  const a11y = ['a11y'];
  const primitives = ['primitives'];
  if (overlays.includes(folder)) return 'overlay';
  if (data.includes(folder)) return 'data';
  if (charts.includes(folder)) return 'charts';
  if (a11y.includes(folder)) return 'a11y';
  if (primitives.includes(folder)) return 'primitives';
  return 'foundation';
}

/** Extract the selector string from @Directive({ selector: '...' }) */
function extractSelector(decoratorArgs: string): string {
  const match = decoratorArgs.match(/selector:\s*['"`]([^'"`]+)['"`]/);
  return match?.[1] ?? '';
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
          ? text.replace(/```(?:html|ts)?\n?/g, '').replace(/```/g, '').trim()
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
      }
    }
  }

  return { description, examples, categoryPath, exampleFiles };
}

/** Extract signal input definitions from a class */
function extractInputs(cls: any): InputDef[] {
  const inputs: InputDef[] = [];

  for (const prop of cls.getProperties()) {
    const initializer = prop.getInitializer();
    if (!initializer) continue;

    const text = initializer.getText();
    const isInput = text.startsWith('input(') || text.startsWith('input.required(') || text.startsWith('model(');
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
  foundation: ['Core', 'Foundation'],
  overlay: ['Core', 'Overlay'],
  data: ['Core', 'Data'],
  charts: ['Core', 'Charts'],
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
        const inputs = extractInputs(cls);
        const className = cls.getName() ?? '';

        // Prepend package name to categoryPath
        const fullPath = categoryPath.length ? [pkgName, ...categoryPath] : [];

        const directive: DirectiveDef = {
          className,
          selector,
          categoryPath: fullPath,
          description,
          inputs,
          examples,
          exampleFiles,
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

  // Sort components: foundation first, then overlays, data, charts, a11y
  const categoryOrder: ComponentDoc['category'][] = ['foundation', 'overlay', 'data', 'charts', 'a11y', 'primitives'];
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
