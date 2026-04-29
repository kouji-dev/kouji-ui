import { Project, Node } from 'ts-morph';
import { writeFileSync, mkdirSync } from 'fs';
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

interface DirectiveDef {
  className: string;
  selector: string;
  description: string;
  inputs: InputDef[];
  examples: string[];
}

interface ComponentDoc {
  name: string;
  slug: string;
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
function extractJsDocText(node: Node): { description: string; examples: string[] } {
  const jsDocs = (node as any).getJsDocs?.() ?? [];
  let description = '';
  const examples: string[] = [];

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
      }
    }
  }

  return { description, examples };
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

  for (const sourceFile of project.getSourceFiles()) {
    const filePath = sourceFile.getFilePath();

    // Skip spec files and index files
    if (filePath.includes('.spec.') || filePath.endsWith('index.ts') || filePath.endsWith('public-api.ts')) continue;
    if (!filePath.includes('/packages/core/src/')) continue;

    // Determine folder (component name)
    const parts = filePath.split('/packages/core/src/')[1]?.split('/') ?? [];
    const folder = parts[0] ?? 'unknown';

    for (const cls of sourceFile.getClasses()) {
      if (!cls.isExported()) continue;

      // Check for @Directive decorator
      const directiveDecorator = cls.getDecorator('Directive');
      if (!directiveDecorator) continue;

      const decoratorArgs = directiveDecorator.getArguments()[0]?.getText() ?? '';
      const selector = extractSelector(decoratorArgs);
      if (!selector) continue;

      const { description, examples } = extractJsDocText(cls);
      const inputs = extractInputs(cls);
      const className = cls.getName() ?? '';

      const directive: DirectiveDef = {
        className,
        selector,
        description,
        inputs,
        examples,
      };

      // Group into component
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
      // Use first directive's description as component description
      if (!comp.description && description) {
        comp.description = description;
      }
      comp.directives.push(directive);
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
