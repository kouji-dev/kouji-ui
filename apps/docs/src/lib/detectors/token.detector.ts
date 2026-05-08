import ts from 'typescript';
import { tsquery } from '@phenomnomnominal/tsquery';
import { SourceFile } from 'ts-morph';
import { parseDocTags } from '../doc-tags';
import { readCategoryTag } from '../extractor-helpers';
import type { DocItem, SourcePkg } from '../docs-extractor.types';

const TOKEN_SELECTOR =
  'VariableStatement:has(ExportKeyword):has(NewExpression > Identifier[text="InjectionToken"])';

export function detectTokens(
  morphFile: SourceFile,
  pkg: SourcePkg,
): DocItem[] {
  const tsSourceFile = tsquery.ast(
    morphFile.getFullText(),
    morphFile.getFilePath(),
    ts.ScriptKind.TS,
  );

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
      id: makeItemId(pkg, morphFile.getFilePath(), symbol),
      symbol,
      pageName: tags.name,
      kind: 'token',
      pkg,
      filePath: morphFile.getFilePath(),
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

function makeItemId(pkg: SourcePkg, filePath: string, symbol: string): string {
  const rel = filePath.replace(/\\/g, '/').split('/packages/')[1] ?? filePath;
  return `${pkg}:${rel}:${symbol}`;
}
