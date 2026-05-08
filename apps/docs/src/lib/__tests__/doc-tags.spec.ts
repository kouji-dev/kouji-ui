// apps/docs/src/lib/__tests__/doc-tags.spec.ts
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { parseDocTags } from '../doc-tags';

function makeNode(jsdoc: string, decl = 'export const X = 1;'): ts.Node {
  const sf = ts.createSourceFile(
    'test.ts',
    `${jsdoc}\n${decl}`,
    ts.ScriptTarget.Latest,
    true,
  );
  // First non-import statement
  return sf.statements[0]!;
}

describe('parseDocTags', () => {
  it('returns hasDoc=false when @doc is absent', () => {
    const node = makeNode('/** Just a description. */');
    expect(parseDocTags(node).hasDoc).toBe(false);
  });

  it('returns hasDoc=true when @doc is present', () => {
    const node = makeNode('/**\n * Summary.\n * @doc\n * @doc-name foo\n */');
    expect(parseDocTags(node).hasDoc).toBe(true);
  });

  it('parses @doc-name', () => {
    const node = makeNode('/**\n * @doc\n * @doc-name icon\n */');
    expect(parseDocTags(node).name).toBe('icon');
  });

  it('parses @doc-is-main as boolean presence', () => {
    const node = makeNode('/**\n * @doc\n * @doc-name x\n * @doc-is-main\n */');
    expect(parseDocTags(node).isMain).toBe(true);
  });

  it('parses @doc-order as integer', () => {
    const node = makeNode('/**\n * @doc\n * @doc-name x\n * @doc-order 3\n */');
    expect(parseDocTags(node).order).toBe(3);
  });

  it('returns null order when @doc-order is missing', () => {
    const node = makeNode('/**\n * @doc\n * @doc-name x\n */');
    expect(parseDocTags(node).order).toBeNull();
  });

  it('parses multi-word @doc-description preserving whitespace', () => {
    const node = makeNode(
      '/**\n * @doc\n * @doc-name x\n * @doc-description Hello world, multi word.\n */',
    );
    expect(parseDocTags(node).description).toBe('Hello world, multi word.');
  });

  it('reports an unknown tag warning for @doc-typo', () => {
    const node = makeNode('/**\n * @doc\n * @doc-name x\n * @doc-typo bar\n */');
    const result = parseDocTags(node);
    expect(result.unknownTags).toEqual(['doc-typo']);
  });

  it('returns hasDoc=false when @internal is also present (suppress)', () => {
    const node = makeNode('/**\n * @doc\n * @doc-name x\n * @internal\n */');
    expect(parseDocTags(node).hasDoc).toBe(false);
  });
});
