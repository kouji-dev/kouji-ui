import ts from 'typescript';
import { tsquery } from '@phenomnomnominal/tsquery';
import { parseDocTags } from '../doc-tags';
import { readCategoryTag } from '../extractor-helpers';
import type { DocItem, SourcePkg } from '../docs-extractor.types';
import type { ParsedFile } from '../parsed-file';
import { makeItemId } from './ids';

const SELECTOR = 'VariableStatement:has(ExportKeyword)';

export function detectConsts(file: ParsedFile, pkg: SourcePkg): DocItem[] {
  const { tsSourceFile, filePath } = file;
  const stmts = tsquery<ts.VariableStatement>(tsSourceFile, SELECTOR);
  const items: DocItem[] = [];
  let sourceOrder = 0;

  for (const stmt of stmts) {
    const decl = stmt.declarationList.declarations[0];
    if (!decl || !ts.isIdentifier(decl.name)) continue;
    if (isInjectionTokenInit(decl.initializer)) continue;

    const tags = parseDocTags(stmt);
    if (!tags.hasDoc || !tags.name) continue;

    const symbol = decl.name.text;
    const type = decl.type
      ? decl.type.getText(tsSourceFile)
      : decl.initializer
        ? 'inferred'
        : 'unknown';
    const literalValue =
      decl.initializer && ts.isStringLiteral(decl.initializer)
        ? decl.initializer.text
        : decl.initializer
          ? decl.initializer.getText(tsSourceFile)
          : undefined;
    const description = jsDocSummary(stmt);
    const docDescription = tags.description ?? undefined;

    items.push({
      id: makeItemId(pkg, filePath, symbol),
      symbol,
      pageName: tags.name,
      kind: 'const',
      pkg,
      filePath,
      description,
      docDescription,
      isMain: tags.isMain,
      order: tags.order,
      sourceOrder: sourceOrder++,
      categoryPath: readCategoryTag(stmt, pkg),
      const: { name: symbol, type, literalValue, description },
    });
  }

  return items;
}

function isInjectionTokenInit(init: ts.Expression | undefined): boolean {
  return (
    !!init &&
    ts.isNewExpression(init) &&
    ts.isIdentifier(init.expression) &&
    init.expression.text === 'InjectionToken'
  );
}

function jsDocSummary(node: ts.Node): string {
  const block = ts.getJSDocCommentsAndTags(node)[0];
  if (!block || !ts.isJSDoc(block)) return '';
  const c = block.comment;
  if (!c) return '';
  return typeof c === 'string' ? c.trim() : (ts.getTextOfJSDocComment(c) ?? '').trim();
}
