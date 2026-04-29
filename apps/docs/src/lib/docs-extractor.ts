import { Project, Node } from 'ts-morph';
import { join } from 'node:path';

export interface InputDef {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: string;
}

export interface DirectiveDef {
  className: string;
  selector: string;
  description: string;
  inputs: InputDef[];
  examples: string[];
}

export interface ComponentDoc {
  name: string;
  slug: string;
  category: 'foundation' | 'overlay' | 'data' | 'charts' | 'a11y' | 'primitives';
  description: string;
  directives: DirectiveDef[];
}

export interface DocsManifest {
  generatedAt: string;
  components: ComponentDoc[];
}

function getCategory(folder: string): ComponentDoc['category'] {
  if (['dialog', 'tooltip', 'popover', 'menu', 'toast'].includes(folder)) return 'overlay';
  if (['table', 'form', 'tabs', 'accordion', 'select'].includes(folder)) return 'data';
  if (folder === 'chart') return 'charts';
  if (folder === 'a11y') return 'a11y';
  if (folder === 'primitives') return 'primitives';
  return 'foundation';
}

function extractSelector(decoratorArgs: string): string {
  return decoratorArgs.match(/selector:\s*['"`]([^'"`]+)['"`]/)?.[1] ?? '';
}

function extractJsDoc(node: Node): { description: string; examples: string[] } {
  const jsDocs = (node as any).getJsDocs?.() ?? [];
  let description = '';
  const examples: string[] = [];
  for (const doc of jsDocs) {
    const comment = doc.getComment() ?? '';
    if (typeof comment === 'string' && !description) {
      description = comment.trim().replace(/\s+/g, ' ');
    }
    for (const tag of doc.getTags?.() ?? []) {
      if (tag.getTagName() === 'example') {
        const text = tag.getComment() ?? '';
        const cleaned = typeof text === 'string'
          ? text.replace(/```(?:html|ts)?\n?/g, '').replace(/```/g, '').trim()
          : '';
        if (cleaned) examples.push(cleaned);
      }
    }
  }
  return { description, examples };
}

function extractInputs(cls: any): InputDef[] {
  const inputs: InputDef[] = [];
  for (const prop of cls.getProperties()) {
    const init = prop.getInitializer();
    if (!init) continue;
    const text = init.getText();
    if (!text.startsWith('input(') && !text.startsWith('input.required(') && !text.startsWith('model(')) continue;
    const { description } = extractJsDoc(prop);
    const name = prop.getName();
    if (description.startsWith('@internal') || name.startsWith('_')) continue;
    const required = text.startsWith('input.required');
    const typeNode = prop.getTypeNode();
    let type = typeNode?.getText() ?? 'unknown';
    if (type === 'unknown') {
      type = text.match(/input(?:\.required)?<([^>]+)>/)?.[1] ?? 'unknown';
    }
    const defaultValue = !required ? text.match(/input\(([^)]+)\)/)?.[1]?.trim() : undefined;
    inputs.push({ name, type, required, description, defaultValue });
  }
  return inputs;
}

let _cached: DocsManifest | null = null;

/**
 * Extracts docs manifest from @kouji-ui/core source files using ts-morph.
 * Result is cached in memory after the first call.
 */
export function extractDocsManifest(rootDir?: string): DocsManifest {
  if (_cached) return _cached;

  const root = rootDir ?? process.env['KOUJI_ROOT'] ?? process.cwd();

  const project = new Project({
    tsConfigFilePath: join(root, 'packages/core/tsconfig.lib.json'),
    skipAddingFilesFromTsConfig: false,
  });

  project.addSourceFilesAtPaths([join(root, 'packages/core/src/**/*.ts')]);

  const componentMap = new Map<string, ComponentDoc>();

  for (const sourceFile of project.getSourceFiles()) {
    const filePath = sourceFile.getFilePath();
    if (filePath.includes('.spec.') || filePath.endsWith('index.ts') || filePath.endsWith('public-api.ts')) continue;
    if (!filePath.includes('/packages/core/src/')) continue;

    const parts = filePath.split('/packages/core/src/')[1]?.split('/') ?? [];
    const folder = parts[0] ?? 'unknown';

    for (const cls of sourceFile.getClasses()) {
      if (!cls.isExported()) continue;
      const dec = cls.getDecorator('Directive');
      if (!dec) continue;
      const args = dec.getArguments()[0]?.getText() ?? '';
      const selector = extractSelector(args);
      if (!selector) continue;

      const { description, examples } = extractJsDoc(cls);
      const inputs = extractInputs(cls);
      const className = cls.getName() ?? '';

      if (!componentMap.has(folder)) {
        componentMap.set(folder, {
          name: folder.charAt(0).toUpperCase() + folder.slice(1),
          slug: folder,
          category: getCategory(folder),
          description: '',
          directives: [],
        });
      }
      const comp = componentMap.get(folder)!;
      if (!comp.description && description) comp.description = description;
      comp.directives.push({ className, selector, description, inputs, examples });
    }
  }

  const categoryOrder = ['foundation', 'overlay', 'data', 'charts', 'a11y', 'primitives'] as const;
  const components = [...componentMap.values()].sort((a, b) => {
    const ai = categoryOrder.indexOf(a.category as any);
    const bi = categoryOrder.indexOf(b.category as any);
    return ai !== bi ? ai - bi : a.name.localeCompare(b.name);
  });

  _cached = { generatedAt: new Date().toISOString(), components };
  return _cached;
}

/** Returns all component slugs — used by getPrerenderParams(). */
export function getDocsSlugs(rootDir?: string): string[] {
  return extractDocsManifest(rootDir).components.map(c => c.slug);
}
