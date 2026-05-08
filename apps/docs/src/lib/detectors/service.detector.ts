import ts from 'typescript';
import { tsquery } from '@phenomnomnominal/tsquery';
import { SourceFile } from 'ts-morph';
import { parseDocTags } from '../doc-tags';
import { readCategoryTag } from '../extractor-helpers';
import type { DocItem, ServiceDef, SourcePkg } from '../docs-extractor.types';

const SERVICE_CLASS_SELECTOR =
  'ClassDeclaration:has(Decorator:has(Identifier[text="Injectable"]))';

export function detectServices(
  morphFile: SourceFile,
  pkg: SourcePkg,
): DocItem[] {
  const tsSourceFile = tsquery.ast(
    morphFile.getFullText(),
    morphFile.getFilePath(),
    ts.ScriptKind.TS,
  );

  const classes = tsquery<ts.ClassDeclaration>(tsSourceFile, SERVICE_CLASS_SELECTOR);
  const items: DocItem[] = [];
  let sourceOrder = 0;

  for (const cls of classes) {
    if (!cls.name) continue;
    const isExported = cls.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!isExported) continue;

    const tags = parseDocTags(cls);
    if (!tags.hasDoc || !tags.name) continue;

    const className = cls.name.text;
    const def: ServiceDef = {
      className,
      methods: [],
      properties: [],
    };

    for (const member of cls.members) {
      if (hasInternalTag(member)) continue;
      if (memberIsPrivate(member)) continue;
      if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
        def.methods.push({
          name: member.name.text,
          signature: methodSignature(member, tsSourceFile),
          description: jsDocSummary(member),
        });
      } else if (
        ts.isPropertyDeclaration(member) &&
        member.name &&
        ts.isIdentifier(member.name)
      ) {
        def.properties.push({
          name: member.name.text,
          type: member.type ? member.type.getText(tsSourceFile) : inferredType(member, tsSourceFile),
          description: jsDocSummary(member),
        });
      }
    }

    items.push({
      id: makeItemId(pkg, morphFile.getFilePath(), className),
      symbol: className,
      pageName: tags.name,
      kind: 'service',
      pkg,
      filePath: morphFile.getFilePath(),
      description: jsDocSummary(cls),
      docDescription: tags.description ?? undefined,
      isMain: tags.isMain,
      order: tags.order,
      sourceOrder: sourceOrder++,
      categoryPath: readCategoryTag(cls, pkg),
      service: def,
    });
  }

  return items;
}

function memberIsPrivate(m: ts.ClassElement): boolean {
  const mods = (m as ts.MethodDeclaration | ts.PropertyDeclaration).modifiers;
  if (!mods) return false;
  return Array.from(mods).some(
    mod => mod.kind === ts.SyntaxKind.PrivateKeyword || mod.kind === ts.SyntaxKind.ProtectedKeyword,
  );
}

function hasInternalTag(node: ts.Node): boolean {
  return ts.getJSDocTags(node).some(t => t.tagName.text === 'internal');
}

function methodSignature(m: ts.MethodDeclaration, sf: ts.SourceFile): string {
  const name = ts.isIdentifier(m.name) ? m.name.text : m.name.getText(sf);
  const params = m.parameters
    .map(p => `${p.name.getText(sf)}${p.questionToken ? '?' : ''}: ${p.type ? p.type.getText(sf) : 'unknown'}`)
    .join(', ');
  const ret = m.type ? m.type.getText(sf) : 'unknown';
  return `${name}(${params}): ${ret}`;
}

function inferredType(p: ts.PropertyDeclaration, sf: ts.SourceFile): string {
  if (!p.initializer) return 'unknown';
  return p.initializer.getText(sf);
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
