import { Project, SourceFile } from 'ts-morph';
import { join, resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import ts from 'typescript';
import { tsquery } from '@phenomnomnominal/tsquery';

import type {
  DocItem,
  DocsManifest,
  ExtractorWarning,
  InputDef,
  SourcePkg,
} from './docs-extractor.types';
import { detectDirectives } from './detectors/directive.detector';
import { detectFunctions } from './detectors/function.detector';
import { detectServices } from './detectors/service.detector';
import { detectTokens } from './detectors/token.detector';
import { detectTypeAliases } from './detectors/type-alias.detector';
import { detectConsts } from './detectors/const.detector';
import { assemblePages } from './page-assembler';
import { extractInputs } from './extractor-helpers';

// Re-export types for back-compat consumers.
export type {
  SourcePkg,
  DocKind,
  InputDef,
  ModelDef,
  OutputDef,
  DirectiveDef,
  ServiceDef,
  FunctionParam,
  FunctionDef,
  TokenDef,
  TypeAliasDef,
  ConstDef,
  ExampleFile,
  DocExample,
  DocItem,
  DocPage,
  ExtractorWarningKind,
  ExtractorWarning,
  DocsManifest,
} from './docs-extractor.types';

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
  throw new Error(`Could not find workspace root from ${start}`);
}

let _cached: DocsManifest | null = null;

export function extractDocsManifest(rootDir?: string): DocsManifest {
  if (_cached && !rootDir) return _cached;

  const root = rootDir ?? process.env['KOUJI_ROOT'] ?? findWorkspaceRoot(process.cwd());

  const items: DocItem[] = [];
  const ownInputsByClass = new Map<string, InputDef[]>();

  scanPackage(root, 'core', join(root, 'packages/core/tsconfig.lib.json'),
              join(root, 'packages/core/src'), items, ownInputsByClass);

  const componentsLibJson = join(root, 'packages/components/tsconfig.lib.json');
  if (existsSync(componentsLibJson)) {
    scanPackage(root, 'components', componentsLibJson,
                join(root, 'packages/components/src'), items, ownInputsByClass);
  }

  resolveHostDirectiveInputs(items, ownInputsByClass);

  const { pages, warnings } = assemblePages(items);

  // Decorate pages with categoryPath from the main item.
  for (const page of pages) {
    const main = page.definitions.find(i => i.id === page.mainItemId);
    if (main) page.categoryPath = main.categoryPath;
  }

  const manifest: DocsManifest = { generatedAt: new Date().toISOString(), pages, warnings };
  if (!rootDir) _cached = manifest;
  return manifest;
}

function scanPackage(
  root: string,
  pkg: SourcePkg,
  tsConfigPath: string,
  srcRoot: string,
  out: DocItem[],
  ownInputsByClass: Map<string, InputDef[]>,
) {
  const project = new Project({ tsConfigFilePath: tsConfigPath, skipAddingFilesFromTsConfig: false });
  project.addSourceFilesAtPaths([join(srcRoot, '**/*.ts')]);

  for (const sf of project.getSourceFiles()) {
    const filePath = sf.getFilePath().replace(/\\/g, '/');
    if (
      filePath.includes('.spec.') ||
      filePath.endsWith('index.ts') ||
      filePath.endsWith('public-api.ts') ||
      filePath.endsWith('test-setup.ts') ||
      filePath.endsWith('.example.ts')
    ) continue;
    if (!filePath.includes(`/packages/${pkg}/src/`)) continue;

    populateOwnInputs(sf, ownInputsByClass);

    out.push(
      ...detectDirectives(sf, pkg),
      ...detectFunctions(sf, pkg),
      ...detectServices(sf, pkg),
      ...detectTokens(sf, pkg),
      ...detectTypeAliases(sf, pkg),
      ...detectConsts(sf, pkg),
    );
  }
}

function populateOwnInputs(sf: SourceFile, registry: Map<string, InputDef[]>): void {
  const tsSourceFile = tsquery.ast(sf.getFullText(), sf.getFilePath(), ts.ScriptKind.TS);
  const classes = tsquery<ts.ClassDeclaration>(
    tsSourceFile,
    'ClassDeclaration:has(Decorator:has(Identifier[text="Directive"])), ClassDeclaration:has(Decorator:has(Identifier[text="Component"]))',
  );
  for (const cls of classes) {
    const className = cls.name?.text;
    if (!className) continue;
    registry.set(className, extractInputs(cls, tsSourceFile, sf));
  }
}

function resolveHostDirectiveInputs(
  items: DocItem[],
  ownInputsByClass: Map<string, InputDef[]>,
): void {
  for (const item of items) {
    if (!item.directive) continue;
    const dir = item.directive;
    const resolvedInputs: InputDef[] = [];
    const resolvedModels: InputDef[] = [];
    for (const input of dir.inputs) {
      if (input.sourceDirective) {
        const sourceInputs = ownInputsByClass.get(input.sourceDirective) ?? [];
        const original = sourceInputs.find(i => i.name === input.name);
        if (original) {
          input.type = original.type;
          if (original.defaultValue !== undefined) input.defaultValue = original.defaultValue;
          else delete input.defaultValue;
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

export function getDocsSlugs(): string[] {
  return extractDocsManifest().pages.map(p => p.name);
}
