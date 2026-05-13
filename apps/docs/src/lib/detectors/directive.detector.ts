import { tsquery } from '@phenomnomnominal/tsquery';
import ts from 'typescript';
import { dirname } from 'node:path';
import { parseDocTags } from '../doc-tags';
import { getDocFiles, getDocThemes, getDocExamples, deriveExampleSlug } from '../examples';
import type {
  DocItem,
  InputDef,
  ModelDef,
  OutputDef,
  SourcePkg,
} from '../docs-extractor.types';
import type { ParsedFile } from '../parsed-file';
import {
  extractInputs,
  extractOutputs,
  extractHostDirectiveInputs,
  getDecoratorArg,
  extractDecoratorProp,
  getJsDocDescription,
  getRequired,
  readDocCategoryTag,
} from '../extractor-helpers';
import { makeItemId } from './ids';

const DIRECTIVE_CLASS_SELECTOR =
  'ClassDeclaration:has(Decorator:has(Identifier[text="Directive"])), ClassDeclaration:has(Decorator:has(Identifier[text="Component"]))';

export function detectDirectives(file: ParsedFile, pkg: SourcePkg): DocItem[] {
  const { tsSourceFile, filePath } = file;
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
    const sourceDir = dirname(filePath);
    const description = getJsDocDescription(cls);
    const docDescription = tags.description ?? undefined;
    const ownInputs = extractInputs(cls, tsSourceFile);
    const hdInputs = extractHostDirectiveInputs(decoratorArg);
    const allInputs = [...ownInputs, ...hdInputs];
    const inputs: InputDef[] = allInputs.filter(i => !i.isModel);
    const models: ModelDef[] = allInputs.filter(i => i.isModel);
    const outputs: OutputDef[] = extractOutputs(cls, tsSourceFile);
    const required = getRequired(cls);
    const categoryPath = readDocCategoryTag(cls);
    const exampleFiles = getDocFiles(cls, tsSourceFile, sourceDir);
    const themedExamples = getDocThemes(cls, tsSourceFile, sourceDir);
    const docExamples = getDocExamples(cls, tsSourceFile, sourceDir);

    items.push({
      id: makeItemId(pkg, filePath, className),
      symbol: className,
      pageName: tags.name,
      kind: 'directive',
      pkg,
      filePath,
      description,
      docDescription,
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
            ? (() => {
                const themedFiles = Object.keys(themedExamples).length ? themedExamples : { default: exampleFiles };
                return [{ label: 'default', slug: deriveExampleSlug('default', themedFiles), themedFiles }];
              })()
            : undefined),
    });
  }

  return items;
}
