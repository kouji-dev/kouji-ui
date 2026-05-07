import { describe, expect, it } from 'vitest';
import { assemblePages } from '../page-assembler';
import type { DocItem } from '../docs-extractor.types';

function item(over: Partial<DocItem> & { id: string; symbol: string; pageName: string }): DocItem {
  return {
    kind: 'directive',
    pkg: 'core',
    filePath: 'a.ts',
    description: '',
    isMain: false,
    order: null,
    sourceOrder: 0,
    ...over,
  } as DocItem;
}

describe('assemblePages', () => {
  it('groups by pageName and pins the @doc-is-main item first', () => {
    const items = [
      item({ id: '1', symbol: 'Helper', pageName: 'icon', sourceOrder: 0 }),
      item({ id: '2', symbol: 'KjIcon', pageName: 'icon', isMain: true, sourceOrder: 1, description: 'main desc' }),
      item({ id: '3', symbol: 'Other', pageName: 'icon', sourceOrder: 2 }),
    ];
    const { pages, warnings } = assemblePages(items);
    expect(pages).toHaveLength(1);
    expect(pages[0].name).toBe('icon');
    expect(pages[0].mainItemId).toBe('2');
    expect(pages[0].items.map(i => i.id)).toEqual(['2', '1', '3']);
    expect(pages[0].title).toBe('KjIcon');
    expect(pages[0].description).toBe('main desc');
    expect(warnings).toEqual([]);
  });

  it('orders non-main items by @doc-order then sourceOrder', () => {
    const items = [
      item({ id: 'main', symbol: 'M', pageName: 'p', isMain: true, sourceOrder: 0 }),
      item({ id: 'b', symbol: 'B', pageName: 'p', order: 2, sourceOrder: 1 }),
      item({ id: 'a', symbol: 'A', pageName: 'p', order: 1, sourceOrder: 2 }),
      item({ id: 'c', symbol: 'C', pageName: 'p', sourceOrder: 3 }),
    ];
    const { pages } = assemblePages(items);
    expect(pages[0].items.map(i => i.id)).toEqual(['main', 'a', 'b', 'c']);
  });

  it('warns and falls back when no item is @doc-is-main', () => {
    const items = [
      item({ id: '1', symbol: 'A', pageName: 'p', order: 2, sourceOrder: 1 }),
      item({ id: '2', symbol: 'B', pageName: 'p', order: 1, sourceOrder: 0, description: 'b desc' }),
    ];
    const { pages, warnings } = assemblePages(items);
    expect(pages[0].mainItemId).toBe('2');
    expect(pages[0].title).toBe('B');
    expect(pages[0].description).toBe('b desc');
    expect(warnings.find(w => w.kind === 'no-main' && w.pageName === 'p')).toBeDefined();
  });

  it('warns and uses the first when multiple items are @doc-is-main', () => {
    const items = [
      item({ id: '1', symbol: 'A', pageName: 'p', isMain: true, sourceOrder: 0 }),
      item({ id: '2', symbol: 'B', pageName: 'p', isMain: true, sourceOrder: 1 }),
    ];
    const { pages, warnings } = assemblePages(items);
    expect(pages[0].mainItemId).toBe('1');
    expect(warnings.find(w => w.kind === 'multi-main' && w.pageName === 'p')).toBeDefined();
  });

  it('warns when a page spans both core and components', () => {
    const items = [
      item({ id: '1', symbol: 'A', pageName: 'p', pkg: 'core', isMain: true, sourceOrder: 0 }),
      item({ id: '2', symbol: 'B', pageName: 'p', pkg: 'components', sourceOrder: 1 }),
    ];
    const { pages, warnings } = assemblePages(items);
    expect(pages[0].pkg).toBe('core'); // taken from main
    expect(warnings.find(w => w.kind === 'cross-package' && w.pageName === 'p')).toBeDefined();
  });

  it('reports duplicate ids', () => {
    const items = [
      item({ id: 'dup', symbol: 'A', pageName: 'p', isMain: true, sourceOrder: 0 }),
      item({ id: 'dup', symbol: 'B', pageName: 'p', sourceOrder: 1 }),
    ];
    const { warnings } = assemblePages(items);
    expect(warnings.find(w => w.kind === 'duplicate-id')).toBeDefined();
  });
});
