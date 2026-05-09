import ts from 'typescript';
import { tsquery } from '@phenomnomnominal/tsquery';
import { parseDocTags } from '../doc-tags';
import { readDocCategoryTag } from '../extractor-helpers';
import type { DocItem, SourcePkg } from '../docs-extractor.types';
import type { ParsedFile } from '../parsed-file';
import { makeItemId } from './ids';

const SELECTOR = 'TypeAliasDeclaration:has(ExportKeyword)';

export function detectTypeAliases(file: ParsedFile, pkg: SourcePkg): DocItem[] {
  const { tsSourceFile, filePath } = file;
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
      id: makeItemId(pkg, filePath, symbol),
      symbol,
      pageName: tags.name,
      kind: 'type-alias',
      pkg,
      filePath,
      description,
      docDescription,
      isMain: tags.isMain,
      order: tags.order,
      sourceOrder: sourceOrder++,
      categoryPath: readDocCategoryTag(decl),
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
