import { Project } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import { detectTypeAliases } from '../../detectors/type-alias.detector';

function projectWith(src: string) {
  const project = new Project({ useInMemoryFileSystem: true });
  return project.createSourceFile('a.ts', src);
}

describe('detectTypeAliases', () => {
  it('emits a DocItem for an @doc-tagged type', () => {
    const sf = projectWith(`
      /**
       * @doc
       * @doc-name icon
       */
      export type KjIconColor = 'inherit' | 'primary' | 'danger';
    `);
    const items = detectTypeAliases(sf, 'core');
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('type-alias');
    expect(items[0].typeAlias?.type).toContain("'inherit'");
  });

  it('skips non-@doc types', () => {
    const sf = projectWith(`export type X = 'a' | 'b';`);
    expect(detectTypeAliases(sf, 'core')).toEqual([]);
  });
});
