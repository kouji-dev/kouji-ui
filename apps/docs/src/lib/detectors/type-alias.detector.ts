import ts from 'typescript';
import { tsquery } from '@phenomnomnominal/tsquery';
import { SourceFile } from 'ts-morph';
import { parseDocTags } from '../doc-tags';
import { readCategoryTag } from '../extractor-helpers';
import type { DocItem, SourcePkg } from '../docs-extractor.types';

const SELECTOR = 'TypeAliasDeclaration:has(ExportKeyword)';

export function detectTypeAliases(
  morphFile: SourceFile,
  pkg: SourcePkg,
): DocItem[] {
  const tsSourceFile = tsquery.ast(
    morphFile.getFullText(),
    morphFile.getFilePath(),
    ts.ScriptKind.TS,
  );
  const decls = tsquery<ts.TypeAliasDeclaration>(tsSourceFile, SELECTOR);
  const items: DocItem[] = [];
  let sourceOrder = 0;

  for (const decl of decls) {
    const tags = parseDocTags(decl);
    if (!tags.hasDoc || !tags.name) continue;

    const symbol = decl.name.text;
    const type = decl.type.getText(tsSourceFile);
    const description = jsDocSummary(decl);
    const docDescription = tags.description ?? undefined;

    items.push({
      id: makeItemId(pkg, morphFile.getFilePath(), symbol),
      symbol,
      pageName: tags.name,
      kind: 'type-alias',
      pkg,
      filePath: morphFile.getFilePath(),
      description,
      docDescription,
      isMain: tags.isMain,
      order: tags.order,
      sourceOrder: sourceOrder++,
      categoryPath: readCategoryTag(decl, pkg),
      typeAlias: { name: symbol, type, description },
    });
  }
  return items;
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
