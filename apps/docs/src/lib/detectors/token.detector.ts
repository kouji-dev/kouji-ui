import ts from 'typescript';
import { tsquery } from '@phenomnomnominal/tsquery';
import { parseDocTags } from '../doc-tags';
import { readCategoryTag } from '../extractor-helpers';
import type { DocItem, SourcePkg } from '../docs-extractor.types';
import type { ParsedFile } from '../parsed-file';
import { makeItemId } from './ids';

const TOKEN_SELECTOR =
  'VariableStatement:has(ExportKeyword):has(NewExpression > Identifier[text="InjectionToken"])';

export function detectTokens(file: ParsedFile, pkg: SourcePkg): DocItem[] {
  const { tsSourceFile, filePath } = file;
  const stmts = tsquery<ts.VariableStatement>(tsSourceFile, TOKEN_SELECTOR);
  const items: DocItem[] = [];
  let sourceOrder = 0;

  for (const stmt of stmts) {
    const decl = stmt.declarationList.declarations[0];
    if (!decl || !ts.isIdentifier(decl.name)) continue;
    const tags = parseDocTags(stmt);
    if (!tags.hasDoc || !tags.name) continue;

    const symbol = decl.name.text;
    const newExpr = findNewInjectionToken(decl.initializer);
    const typeArg = newExpr?.typeArguments?.[0]?.getText(tsSourceFile) ?? 'unknown';
    const description = jsDocSummary(stmt);
    const docDescription = tags.description ?? undefined;

    items.push({
      id: makeItemId(pkg, filePath, symbol),
      symbol,
      pageName: tags.name,
      kind: 'token',
      pkg,
      filePath,
      description,
      docDescription,
      isMain: tags.isMain,
      order: tags.order,
      sourceOrder: sourceOrder++,
      categoryPath: readCategoryTag(stmt, pkg),
      token: { name: symbol, type: typeArg, description },
    });
  }

  return items;
}

function findNewInjectionToken(node: ts.Expression | undefined): ts.NewExpression | null {
  if (!node) return null;
  if (
    ts.isNewExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'InjectionToken'
  ) {
    return node;
  }
  return null;
}

function jsDocSummary(node: ts.Node): string {
  const block = ts.getJSDocCommentsAndTags(node)[0];
  if (!block || !ts.isJSDoc(block)) return '';
  const c = block.comment;
  if (!c) return '';
  return typeof c === 'string' ? c.trim() : (ts.getTextOfJSDocComment(c) ?? '').trim();
}

