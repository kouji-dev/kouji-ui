import ts from 'typescript';
import { tsquery } from '@phenomnomnominal/tsquery';
import { dirname } from 'node:path';
import { parseDocTags } from '../doc-tags';
import { readDocCategoryTag } from '../extractor-helpers';
import { getDocFiles, getDocThemes, getDocExamples, deriveExampleSlug, deriveExampleBucket } from '../examples';
import type {
  DocItem,
  DocKind,
  FunctionDef,
  FunctionParam,
  SourcePkg,
} from '../docs-extractor.types';
import type { ParsedFile } from '../parsed-file';
import { makeItemId } from './ids';

export function detectFunctions(file: ParsedFile, pkg: SourcePkg): DocItem[] {
  const { tsSourceFile, filePath } = file;
  const fns = tsquery<ts.FunctionDeclaration>(
    tsSourceFile,
    'FunctionDeclaration:has(ExportKeyword)',
  );
  const items: DocItem[] = [];
  let sourceOrder = 0;

  for (const fn of fns) {
    if (!fn.name) continue;
    const tags = parseDocTags(fn);
    if (!tags.hasDoc || !tags.name) continue;

    const symbol = fn.name.text;
    const returnType = fn.type ? fn.type.getText(tsSourceFile) : 'void';
    const kind: DocKind = classify(fn, returnType);
    const params: FunctionParam[] = fn.parameters.map(p => paramOf(p, tsSourceFile));
    const signature = `${symbol}(${params
      .map(p => `${p.name}${p.optional ? '?' : ''}: ${p.type}`)
      .join(', ')}): ${returnType}`;

    const def: FunctionDef = { name: symbol, signature, parameters: params, returnType };
    const description = jsDocSummary(fn);
    const docDescription = tags.description ?? undefined;
    const sourceDir = dirname(filePath);
    const exampleFiles = getDocFiles(fn, tsSourceFile, sourceDir);
    const themedExamples = getDocThemes(fn, tsSourceFile, sourceDir);
    const docExamples = getDocExamples(fn, tsSourceFile, sourceDir);

    items.push({
      id: makeItemId(pkg, filePath, symbol),
      symbol,
      pageName: tags.name,
      kind,
      pkg,
      filePath,
      description,
      docDescription,
      isMain: tags.isMain,
      order: tags.order,
      sourceOrder: sourceOrder++,
      categoryPath: readDocCategoryTag(fn),
      function: def,
      examples: docExamples.length
        ? docExamples
        : (Object.keys(themedExamples).length || exampleFiles.length
            ? (() => {
                const themedFiles = Object.keys(themedExamples).length ? themedExamples : { default: exampleFiles };
                const slug = deriveExampleSlug('default', themedFiles);
                return [{
                  label: 'default',
                  slug,
                  bucket: deriveExampleBucket(slug, 'default'),
                  themedFiles,
                }];
              })()
            : undefined),
    });
  }

  return items;
}

function classify(fn: ts.FunctionDeclaration, returnType: string): DocKind {
  if (/EnvironmentProviders|Provider\[\]/.test(returnType)) return 'provider-fn';
  if (fn.body && containsInjectCall(fn.body)) return 'inject-fn';
  return 'function';
}

function containsInjectCall(body: ts.Block): boolean {
  let found = false;
  body.forEachChild(function visit(n) {
    if (found) return;
    if (
      ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) &&
      n.expression.text === 'inject'
    ) {
      found = true;
      return;
    }
    n.forEachChild(visit);
  });
  return found;
}

function paramOf(p: ts.ParameterDeclaration, sf: ts.SourceFile): FunctionParam {
  return {
    name: ts.isIdentifier(p.name) ? p.name.text : p.name.getText(sf),
    type: p.type ? p.type.getText(sf) : 'unknown',
    description: '',
    optional: !!p.questionToken || !!p.initializer,
  };
}

function jsDocSummary(node: ts.Node): string {
  const block = ts.getJSDocCommentsAndTags(node)[0];
  if (!block || !ts.isJSDoc(block)) return '';
  const c = block.comment;
  if (!c) return '';
  return typeof c === 'string' ? c.trim() : (ts.getTextOfJSDocComment(c) ?? '').trim();
}

