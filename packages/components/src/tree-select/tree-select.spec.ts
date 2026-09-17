import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render } from '@testing-library/angular';
import { afterEach, describe, expect, it } from 'vitest';
import type { KjTreeNode } from '@kouji-ui/core';

import { KjTreeSelectComponent } from './tree-select';

const nodes: readonly KjTreeNode[] = [
  {
    value: 'fruits',
    label: 'Fruits',
    children: [
      { value: 'apple', label: 'Apple' },
      { value: 'banana', label: 'Banana' },
    ],
  },
  { value: 'veggies', label: 'Vegetables' },
];

/** A wide, deep tree: 100 branches x 50 leaves = 5 100 nodes. */
function bigTree(branches = 100, leaves = 50): readonly KjTreeNode[] {
  return Array.from({ length: branches }, (_, b) => ({
    value: `b${b}`,
    label: `Branch ${b}`,
    children: Array.from({ length: leaves }, (_, l) => ({
      value: `b${b}-l${l}`,
      label: `Leaf ${b}.${l}`,
    })),
  }));
}

const rows = () => Array.from(document.querySelectorAll<HTMLElement>('kj-tree-select-node'));
const labels = () => rows().map(r => r.textContent?.trim());

// The panel is portalled to `document.body` on open; sweep it between tests.
afterEach(() => {
  document
    .querySelectorAll('.kj-overlay-wrapper, .kj-overlay-container')
    .forEach(w => w.remove());
});

describe('KjTreeSelectComponent – visible rows (perf F-14)', () => {
  it('renders only the rows whose ancestors are expanded', async () => {
    const { container } = await render(`<kj-tree-select [kjNodes]="nodes" />`, {
      imports: [KjTreeSelectComponent],
      componentProperties: { nodes },
    });
    fireEvent.click(container.querySelector('.kj-tree-select-trigger')!);

    // Fruits is collapsed, so Apple / Banana are not in the DOM at all —
    // they are not merely `[hidden]`.
    expect(labels()).toEqual(['Fruits', 'Vegetables']);
    expect(rows().some(r => r.hasAttribute('hidden'))).toBe(false);
    rows().forEach(r => expect(r.classList.contains('kj-tree-select-row')).toBe(true));
    // An inline `display` on the host would cancel the stylesheet's
    // `[hidden] { display: none }` — the transparent wrapper must come from CSS.
    rows().forEach(r => expect(r.style.display).toBe(''));
  });

  it('expanding a branch mounts its children and collapsing removes them again', async () => {
    const { container, fixture } = await render(`<kj-tree-select [kjNodes]="nodes" />`, {
      imports: [KjTreeSelectComponent],
      componentProperties: { nodes },
    });
    fireEvent.click(container.querySelector('.kj-tree-select-trigger')!);

    const toggle = () =>
      document.querySelector<HTMLElement>('.kj-tree-select-toggle')!;

    fireEvent.click(toggle());
    fixture.detectChanges();
    expect(labels()).toEqual(['Fruits', 'Apple', 'Banana', 'Vegetables']);

    fireEvent.click(toggle());
    fixture.detectChanges();
    expect(labels()).toEqual(['Fruits', 'Vegetables']);
  });

  it('keeps aria-level / posinset / setsize describing sibling position on the rendered rows', async () => {
    const { container, fixture } = await render(`<kj-tree-select [kjNodes]="nodes" />`, {
      imports: [KjTreeSelectComponent],
      componentProperties: { nodes },
    });
    fireEvent.click(container.querySelector('.kj-tree-select-trigger')!);
    fireEvent.click(document.querySelector<HTMLElement>('.kj-tree-select-toggle')!);
    fixture.detectChanges();

    const treeitems = Array.from(
      document.querySelectorAll<HTMLElement>('[role="treeitem"]'),
    ).map(el => ({
      label: el.textContent?.trim(),
      level: el.getAttribute('aria-level'),
      pos: el.getAttribute('aria-posinset'),
      size: el.getAttribute('aria-setsize'),
    }));

    expect(treeitems).toEqual([
      { label: 'Fruits', level: '1', pos: '1', size: '2' },
      { label: 'Apple', level: '2', pos: '1', size: '2' },
      { label: 'Banana', level: '2', pos: '2', size: '2' },
      { label: 'Vegetables', level: '1', pos: '2', size: '2' },
    ]);
  });

  it('mounts one row per visible node, not one per node, for a 5 100-node tree', async () => {
    const big = bigTree();
    const total = big.length + big.reduce((n, b) => n + (b.children?.length ?? 0), 0);
    expect(total).toBe(5100);

    const { container, fixture } = await render(
      `<kj-tree-select [kjNodes]="nodes" [kjExpandedKeys]="expanded" />`,
      {
        imports: [KjTreeSelectComponent],
        componentProperties: { nodes: big, expanded: ['b0'] as readonly unknown[] },
      },
    );
    fireEvent.click(container.querySelector('.kj-tree-select-trigger')!);
    fixture.detectChanges();

    // 100 branches + the 50 leaves of the single expanded branch.
    expect(rows()).toHaveLength(150);
  });

  it('the stylesheet hides the row host on [hidden] and keeps it transparent otherwise', () => {
    const css = readFileSync(resolve(import.meta.dirname, 'tree-select.css'), 'utf8');
    expect(css).toMatch(/\.kj-tree-select-row\s*\{\s*display:\s*contents;/);
    expect(css).toMatch(/\.kj-tree-select-row\[hidden\][^{]*\{\s*display:\s*none;/);
  });
});

describe('KjTreeSelectComponent – keyboard reaches the rendered rows', () => {
  /**
   * The rows are painted by this wrapper's own template, which a content
   * query on the headless root cannot see, so the wrapper registers them.
   * Without that registration every node rendered `tabindex="-1"`: no roving
   * tab stop, no arrow keys, no type-ahead (WCAG 2.1.1 / 2.4.3).
   */
  async function openTree() {
    const r = await render(`<kj-tree-select [kjNodes]="nodes" />`, {
      imports: [KjTreeSelectComponent],
      componentProperties: { nodes },
    });
    fireEvent.click(r.container.querySelector('.kj-tree-select-trigger')!);
    r.fixture.detectChanges();
    return r;
  }

  const treeitems = (): HTMLElement[] =>
    [...document.querySelectorAll<HTMLElement>('[role="treeitem"]')];

  const press = (key: string): void => {
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );
  };

  it('gives the tree exactly one roving tab stop', async () => {
    await openTree();
    expect(treeitems().map(n => n.getAttribute('tabindex'))).toEqual(['0', '-1']);
  });

  it('ArrowDown from the focused node moves focus to the next visible node', async () => {
    const { fixture } = await openTree();
    const first = treeitems()[0];
    first.focus();
    expect(document.activeElement).toBe(first);

    press('ArrowDown');
    fixture.detectChanges();
    expect(document.activeElement).toBe(treeitems()[1]);
    expect(treeitems().map(n => n.getAttribute('tabindex'))).toEqual(['-1', '0']);
  });

  it('ArrowRight expands the focused branch and ArrowDown then reaches its child', async () => {
    const { fixture } = await openTree();
    treeitems()[0].focus();

    press('ArrowRight');
    fixture.detectChanges();
    expect(treeitems().map(n => n.textContent!.trim()))
      .toEqual(['Fruits', 'Apple', 'Banana', 'Vegetables']);

    press('ArrowDown');
    fixture.detectChanges();
    expect(document.activeElement!.textContent!.trim()).toBe('Apple');
  });
});
