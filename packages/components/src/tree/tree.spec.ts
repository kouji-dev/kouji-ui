import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { beforeEach, describe, expect, test } from 'vitest';
import { KjTree, KjTreeEmptyTemplate, KjTreeNodeTemplate, type KjTreeItem } from './tree';

const NODES: KjTreeItem[] = [
  {
    id: 'src',
    label: 'src',
    children: [
      { id: 'app', label: 'app.ts' },
      { id: 'lib', label: 'lib', children: [{ id: 'util', label: 'util.ts' }] },
    ],
  },
  { id: 'readme', label: 'README.md' },
  { id: 'locked', label: 'locked.txt', disabled: true },
];

@Component({
  standalone: true,
  imports: [KjTree, KjTreeNodeTemplate, KjTreeEmptyTemplate],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-tree
      ariaLabel="Files"
      [nodes]="nodes()"
      [expanded]="expanded()"
      [defaultExpanded]="defaultExpanded"
      (expandedChange)="expandedEvents.push($event)"
      (selectionChange)="selections.push($event.id)"
      (activate)="activations.push($event.id)"
    >
      @if (custom) {
        <ng-template kjTreeNode let-node let-level="level"
          ><b class="custom">{{ level }}:{{ node.label }}</b></ng-template
        >
      }
      <ng-template kjTreeEmpty><p class="nothing">Nothing here</p></ng-template>
    </kj-tree>
  `,
})
class Host {
  nodes = signal<KjTreeItem[]>(NODES);
  expanded = signal<ReadonlySet<string> | undefined>(undefined);
  defaultExpanded: string[] = [];
  custom = false;
  expandedEvents: ReadonlySet<string>[] = [];
  selections: string[] = [];
  activations: string[] = [];
}

function setup(configure?: (h: Host) => void): ComponentFixture<Host> {
  const fixture = TestBed.createComponent(Host);
  configure?.(fixture.componentInstance);
  fixture.detectChanges();
  return fixture;
}

const items = (f: ComponentFixture<Host>) =>
  Array.from(f.nativeElement.querySelectorAll('[role="treeitem"]')) as HTMLElement[];
const item = (f: ComponentFixture<Host>, id: string) =>
  f.nativeElement.querySelector(`[data-kj-tree-id="${id}"]`) as HTMLElement;
function key(f: ComponentFixture<Host>, k: string): void {
  (document.activeElement ?? f.nativeElement).dispatchEvent(
    new KeyboardEvent('keydown', { key: k, bubbles: true }),
  );
  f.detectChanges();
}

describe('KjTree', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [Host] }));

  test('renders tree / treeitem roles with level, selection and expansion state', () => {
    const f = setup();
    const tree = f.nativeElement.querySelector('[role="tree"]');
    expect(tree.getAttribute('aria-label')).toBe('Files');
    expect(items(f).map((i) => i.dataset['kjTreeId'])).toEqual(['src', 'readme', 'locked']);
    expect(item(f, 'src').getAttribute('aria-expanded')).toBe('false');
    expect(item(f, 'readme').hasAttribute('aria-expanded')).toBe(false);
    expect(item(f, 'src').getAttribute('aria-level')).toBe('1');
    expect(item(f, 'src').getAttribute('aria-selected')).toBe('false');
    expect(item(f, 'locked').getAttribute('aria-disabled')).toBe('true');
  });

  test('one roving tab stop, on the first node by default', () => {
    const f = setup();
    expect(items(f).map((i) => i.tabIndex)).toEqual([0, -1, -1]);
  });

  test('defaultExpanded opens branches and nests children in a group', () => {
    const f = setup((h) => (h.defaultExpanded = ['src']));
    const group = item(f, 'src').querySelector('[role="group"]')!;
    expect(group).not.toBeNull();
    expect(item(f, 'app').getAttribute('aria-level')).toBe('2');
    expect(group.contains(item(f, 'app'))).toBe(true);
  });

  test('click on a branch toggles it, selects and activates it', () => {
    const f = setup();
    (item(f, 'src').querySelector('.kj-tree-row') as HTMLElement).click();
    f.detectChanges();
    expect(item(f, 'src').getAttribute('aria-expanded')).toBe('true');
    expect(item(f, 'src').getAttribute('aria-selected')).toBe('true');
    expect([...f.componentInstance.expandedEvents[0]]).toEqual(['src']);
    expect(f.componentInstance.selections).toEqual(['src']);
    expect(f.componentInstance.activations).toEqual(['src']);
  });

  test('arrow keys follow the WAI-ARIA tree pattern', () => {
    const f = setup();
    item(f, 'src').focus();
    key(f, 'ArrowRight'); // open
    expect(item(f, 'src').getAttribute('aria-expanded')).toBe('true');
    key(f, 'ArrowRight'); // into first child
    expect(document.activeElement).toBe(item(f, 'app'));
    key(f, 'ArrowDown');
    expect(document.activeElement).toBe(item(f, 'lib'));
    key(f, 'ArrowLeft'); // closed branch -> parent
    expect(document.activeElement).toBe(item(f, 'src'));
    key(f, 'End');
    expect(document.activeElement).toBe(item(f, 'locked'));
    key(f, 'Home');
    expect(document.activeElement).toBe(item(f, 'src'));
    key(f, 'ArrowLeft'); // open branch -> close
    expect(item(f, 'src').getAttribute('aria-expanded')).toBe('false');
    key(f, 'ArrowUp'); // already first: stays
    expect(document.activeElement).toBe(item(f, 'src'));
    expect(items(f).find((i) => i.tabIndex === 0)).toBe(item(f, 'src'));
  });

  test('Enter / Space select and activate; activation repeats, selection does not', () => {
    const f = setup();
    item(f, 'readme').focus();
    key(f, 'Enter');
    key(f, ' ');
    expect(f.componentInstance.selections).toEqual(['readme']);
    expect(f.componentInstance.activations).toEqual(['readme', 'readme']);
    expect(item(f, 'readme').getAttribute('aria-selected')).toBe('true');
  });

  test('a disabled node is focusable but never selected or activated', () => {
    const f = setup();
    item(f, 'locked').focus();
    key(f, 'Enter');
    expect(document.activeElement).toBe(item(f, 'locked'));
    expect(f.componentInstance.selections).toEqual([]);
    expect(f.componentInstance.activations).toEqual([]);
  });

  test('type-ahead moves to the next node starting with the key', () => {
    const f = setup();
    item(f, 'src').focus();
    key(f, 'r');
    expect(document.activeElement).toBe(item(f, 'readme'));
  });

  test('controlled `expanded` is not changed by the tree, only requested', () => {
    const f = setup((h) => h.expanded.set(new Set()));
    item(f, 'src').focus();
    key(f, 'ArrowRight');
    expect(item(f, 'src').getAttribute('aria-expanded')).toBe('false');
    expect([...f.componentInstance.expandedEvents[0]]).toEqual(['src']);
    f.componentInstance.expanded.set(f.componentInstance.expandedEvents[0]);
    f.detectChanges();
    expect(item(f, 'src').getAttribute('aria-expanded')).toBe('true');
  });

  test('lazy branch: children: [] is expandable and fills in place', () => {
    const lazy: KjTreeItem = { id: 'lazy', label: 'lazy', children: [] };
    const f = setup((h) => h.nodes.set([lazy]));
    item(f, 'lazy').focus();
    key(f, 'ArrowRight');
    expect(item(f, 'lazy').getAttribute('aria-expanded')).toBe('true');
    f.componentInstance.nodes.set([{ ...lazy, children: [{ id: 'kid', label: 'kid' }] }]);
    f.detectChanges();
    expect(item(f, 'kid')).not.toBeNull();
  });

  test('node template receives the node and its level', () => {
    const f = setup((h) => (h.custom = true));
    expect(item(f, 'readme').querySelector('.custom')!.textContent).toBe('1:README.md');
  });

  test('empty nodes render the empty template and no tree', () => {
    const f = setup((h) => h.nodes.set([]));
    expect(f.nativeElement.querySelector('[role="tree"]')).toBeNull();
    expect(f.nativeElement.querySelector('.nothing').textContent).toBe('Nothing here');
  });
});
