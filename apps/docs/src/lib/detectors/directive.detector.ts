import { tsquery } from '@phenomnomnominal/tsquery';
import ts from 'typescript';
import { SourceFile } from 'ts-morph';
import { dirname } from 'node:path';
import { parseDocTags } from '../doc-tags';
import { getDocFiles, getDocThemes, getDocExamples } from '../examples';
import type {
  DocItem,
  InputDef,
  ModelDef,
  OutputDef,
  SourcePkg,
} from '../docs-extractor.types';
import {
  extractInputs,
  extractOutputs,
  extractHostDirectiveInputs,
  getDecoratorArg,
  extractDecoratorProp,
  getJsDocDescription,
  getRequired,
  readCategoryTag,
} from '../extractor-helpers';

const DIRECTIVE_CLASS_SELECTOR =
  'ClassDeclaration:has(Decorator:has(Identifier[text="Directive"])), ClassDeclaration:has(Decorator:has(Identifier[text="Component"]))';

export function detectDirectives(
  morphFile: SourceFile,
  pkg: SourcePkg,
): DocItem[] {
  const tsSourceFile = tsquery.ast(
    morphFile.getFullText(),
    morphFile.getFilePath(),
    ts.ScriptKind.TS,
  );

  const classes = tsquery<ts.ClassDeclaration>(tsSourceFile, DIRECTIVE_CLASS_SELECTOR);
  const items: DocItem[] = [];
  let sourceOrder = 0;

  for (const cls of classes) {
    const className = cls.name?.text ?? '';
    const isExported = cls.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!isExported || !className) continue;

    const tags = parseDocTags(cls);
    if (!tags.hasDoc || !tags.name) continue;

    const decoratorArg = getDecoratorArg(cls);
    const selector = extractDecoratorProp(decoratorArg, 'selector') ?? '';
    if (!selector) continue;

    const exportAs = extractDecoratorProp(decoratorArg, 'exportAs');
    const sourceDir = dirname(morphFile.getFilePath());
    const description = tags.description ?? getJsDocDescription(cls);
    const ownInputs = extractInputs(cls, tsSourceFile, morphFile);
    const hdInputs = extractHostDirectiveInputs(decoratorArg);
    const allInputs = [...ownInputs, ...hdInputs];
    const inputs: InputDef[] = allInputs.filter(i => !i.isModel);
    const models: ModelDef[] = allInputs.filter(i => i.isModel);
    const outputs: OutputDef[] = extractOutputs(cls, tsSourceFile, morphFile);
    const required = getRequired(cls);
    const categoryPath = readCategoryTag(cls, pkg);
    const exampleFiles = getDocFiles(cls, tsSourceFile, sourceDir);
    const themedExamples = getDocThemes(cls, tsSourceFile, sourceDir);
    const docExamples = getDocExamples(cls, tsSourceFile, sourceDir);

    items.push({
      id: makeItemId(pkg, morphFile.getFilePath(), className),
      symbol: className,
      pageName: tags.name,
      kind: 'directive',
      pkg,
      filePath: morphFile.getFilePath(),
      description,
      isMain: tags.isMain,
      order: tags.order,
      sourceOrder: sourceOrder++,
      categoryPath,
      directive: {
        className,
        selector,
        ...(exportAs ? { exportAs } : {}),
        inputs,
        outputs,
        models,
        required,
      },
      examples: docExamples.length
        ? docExamples
        : (Object.keys(themedExamples).length || exampleFiles.length
            ? [{ label: 'default', themedFiles: Object.keys(themedExamples).length ? themedExamples : { default: exampleFiles } }]
            : undefined),
    });
  }

  return items;
}

function makeItemId(pkg: SourcePkg, filePath: string, symbol: string): string {
  const rel = filePath.replace(/\\/g, '/').split('/packages/')[1] ?? filePath;
  return `${pkg}:${rel}:${symbol}`;
}
