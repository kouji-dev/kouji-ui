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
    expect(pages[0].definitions.map(i => i.id)).toEqual(['2', '1', '3']);
    expect(pages[0].title).toBe('Icon');
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
    expect(pages[0].definitions.map(i => i.id)).toEqual(['main', 'a', 'b', 'c']);
  });

  it('warns and falls back when no item is @doc-is-main', () => {
    const items = [
      item({ id: '1', symbol: 'A', pageName: 'p', order: 2, sourceOrder: 1 }),
      item({ id: '2', symbol: 'B', pageName: 'p', order: 1, sourceOrder: 0, description: 'b desc' }),
    ];
    const { pages, warnings } = assemblePages(items);
    expect(pages[0].mainItemId).toBe('2');
    expect(pages[0].title).toBe('P');
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

  it('separates items into different pages when pkg differs (same @doc-name)', () => {
    const items = [
      item({ id: '1', symbol: 'KjButton', pageName: 'button', pkg: 'core', isMain: true, sourceOrder: 0 }),
      item({ id: '2', symbol: 'KjButtonComponent', pageName: 'button', pkg: 'components', isMain: true, sourceOrder: 1 }),
    ];
    const { pages, warnings } = assemblePages(items);
    expect(pages).toHaveLength(2);
    const corePage = pages.find(p => p.pkg === 'core')!;
    const compPage = pages.find(p => p.pkg === 'components')!;
    expect(corePage.definitions.map(i => i.symbol)).toEqual(['KjButton']);
    expect(compPage.definitions.map(i => i.symbol)).toEqual(['KjButtonComponent']);
    // No cross-package warning anymore — pkg is a hard separator now.
    expect(warnings.filter(w => w.kind === 'cross-package')).toEqual([]);
  });

  it('formats the page title from @doc-name (capitalize, dashes -> spaces)', () => {
    const items = [
      item({ id: '1', symbol: 'KjDatePicker', pageName: 'date-picker', isMain: true, sourceOrder: 0 }),
    ];
    const { pages } = assemblePages(items);
    expect(pages[0].title).toBe('Date picker');
  });

  it('uses @doc-description from main when present', () => {
    const items = [
      item({ id: '1', symbol: 'M', pageName: 'p', isMain: true, description: 'tsdoc', docDescription: 'main-desc' }),
      item({ id: '2', symbol: 'X', pageName: 'p' }),
    ];
    const { pages } = assemblePages(items);
    expect(pages[0].description).toBe('main-desc');
  });

  it('falls back to any items @doc-description when main has none', () => {
    const items = [
      item({ id: '1', symbol: 'M', pageName: 'p', isMain: true, description: 'main tsdoc', sourceOrder: 0 }),
      item({ id: '2', symbol: 'X', pageName: 'p', docDescription: 'from non-main', sourceOrder: 1 }),
    ];
    const { pages } = assemblePages(items);
    expect(pages[0].description).toBe('from non-main');
  });

  it('falls back to mains tsDoc summary when no @doc-description anywhere', () => {
    const items = [
      item({ id: '1', symbol: 'M', pageName: 'p', isMain: true, description: 'main tsdoc' }),
    ];
    const { pages } = assemblePages(items);
    expect(pages[0].description).toBe('main tsdoc');
  });

  it('flattens examples across all definitions in render order', () => {
    const items = [
      item({ id: '1', symbol: 'M', pageName: 'p', isMain: true, sourceOrder: 0, examples: [{ label: 'a', slug: 'a', themedFiles: {} }] }),
      item({ id: '2', symbol: 'X', pageName: 'p', sourceOrder: 1, examples: [{ label: 'b', slug: 'b', themedFiles: {} }, { label: 'c', slug: 'c', themedFiles: {} }] }),
    ];
    const { pages } = assemblePages(items);
    expect(pages[0].examples.map(e => e.example.label)).toEqual(['a', 'b', 'c']);
    expect(pages[0].examples.map(e => e.itemSymbol)).toEqual(['M', 'X', 'X']);
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
