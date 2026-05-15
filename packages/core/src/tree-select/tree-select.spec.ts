import { render, fireEvent } from '@testing-library/angular';
import { By } from '@angular/platform-browser';
import { toHaveNoViolations } from 'jest-axe';
import { afterEach } from 'vitest';
import {
  KjTreeSelect,
  KjTreeSelectNode,
  KjTreeSelectToggle,
} from './tree-select';
import { KjTreeSelectTrigger } from './tree-select-trigger';
import { KjTreeSelectContent } from './tree-select-content';
import { KJ_LIST_NAVIGATOR_CONFIG } from '../primitives/list';

expect.extend(toHaveNoViolations);

// Sweep portalled overlay wrappers between tests. The body-portal
// mount strategy detaches them on overlay close, but if a test ends
// while the panel is still open the wrapper survives in `document.body`
// and pollutes subsequent `document.querySelector` calls.
afterEach(() => {
  document
    .querySelectorAll('.kj-overlay-wrapper, .kj-overlay-container')
    .forEach(w => w.remove());
});

const imports = [
  KjTreeSelect,
  KjTreeSelectTrigger,
  KjTreeSelectContent,
  KjTreeSelectNode,
  KjTreeSelectToggle,
];

// The overlay uses the body-portal mount strategy, so on open the panel
// (and all of its tree-node children) move from the test `container`
// into a per-overlay wrapper inside `document.body`. Pre-open queries
// happily use the test `container`; post-open queries must scope to
// `document` (or fall back to `container` when the portal is closed).
const q = (sel: string): Element | null =>
  document.querySelector(sel) ?? null;
const qa = (sel: string): NodeListOf<Element> => document.querySelectorAll(sel);

// ── Base single-select template ──────────────────────────────────────────────

const singleTemplate = `
  <div kjTreeSelect [(kjValue)]="selected">
    <button kjTreeSelectTrigger #t="kjTreeSelectTrigger">Choose</button>
    <kj-tree-select-content [kjFor]="t">
      <div
        kjTreeSelectNode
        [kjValue]="'fruits'"
        kjLabel="Fruits"
        [kjHasChildren]="true"
        [kjNodeLevel]="1" [kjNodeSize]="2" [kjNodePos]="1"
      >
        <button kjTreeSelectToggle type="button">▶</button>
        <span>Fruits</span>
        <div
          kjTreeSelectNode
          [kjValue]="'apple'"
          kjLabel="Apple"
          [kjNodeLevel]="2" [kjNodeSize]="2" [kjNodePos]="1"
        >Apple</div>
        <div
          kjTreeSelectNode
          [kjValue]="'banana'"
          kjLabel="Banana"
          [kjNodeLevel]="2" [kjNodeSize]="2" [kjNodePos]="2"
        >Banana</div>
      </div>
      <div
        kjTreeSelectNode
        [kjValue]="'veggies'"
        kjLabel="Vegetables"
        [kjNodeLevel]="1" [kjNodeSize]="2" [kjNodePos]="2"
      >Vegetables</div>
    </kj-tree-select-content>
  </div>
`;

// ── Tests ────────────────────────────────────────────────────────────────────

describe('KjTreeSelect – panel visibility', () => {
  it('panel is hidden by default', async () => {
    const { container } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    expect(container.querySelector('kj-tree-select-content')).toHaveAttribute('hidden', '');
  });

  it('clicking the trigger opens the panel', async () => {
    const { container } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    fireEvent.click(container.querySelector('[kjTreeSelectTrigger]')!);
    // Panel is portalled to body on open — query via `document`.
    expect(q('kj-tree-select-content')).not.toHaveAttribute('hidden');
  });

  it('aria-expanded on trigger reflects open state', async () => {
    const { container } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    const trigger = container.querySelector('[kjTreeSelectTrigger]')!;
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('Escape closes the panel', async () => {
    const { container } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    fireEvent.click(container.querySelector('[kjTreeSelectTrigger]')!);
    fireEvent.keyDown(document, { key: 'Escape' });
    // `KjOverlayController.close` schedules its DOM teardown inside a
    // requestAnimationFrame (so consumers can animate close transitions
    // without panicking the state machine). Wait one RAF before we
    // assert on the final `hidden` attribute. Once closed, the panel
    // is detached/hidden regardless of which parent currently holds
    // it — query against `document` so the assertion stays
    // intent-preserving.
    await new Promise<void>(r => requestAnimationFrame(() => r()));
    expect(q('kj-tree-select-content')).toHaveAttribute('hidden', '');
  });
});

describe('KjTreeSelect – trigger ARIA', () => {
  it('trigger has role="combobox" and aria-haspopup="tree"', async () => {
    const { container } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    const trigger = container.querySelector('[kjTreeSelectTrigger]')!;
    expect(trigger).toHaveAttribute('role', 'combobox');
    expect(trigger).toHaveAttribute('aria-haspopup', 'tree');
  });
});

describe('KjTreeSelect – panel ARIA', () => {
  it('panel has role="tree"', async () => {
    const { container } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    expect(container.querySelector('kj-tree-select-content')).toHaveAttribute('role', 'tree');
  });

  it('nodes carry role="treeitem"', async () => {
    const { container } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    const nodes = container.querySelectorAll('[kjTreeSelectNode]');
    nodes.forEach(n => expect(n).toHaveAttribute('role', 'treeitem'));
  });

  it('branch node has aria-expanded="false" when collapsed', async () => {
    const { container } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    const branchNode = container.querySelector('[kjTreeSelectNode][data-has-children="true"]')!;
    expect(branchNode).toHaveAttribute('aria-expanded', 'false');
  });

  it('node host element has an id minted by the composed KjListItem', async () => {
    const { container } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    const node = container.querySelector('[kjTreeSelectNode]')!;
    // KjListItem auto-mints `kj-list-item-N` ids unless an `id` is
    // already set on the host element.
    expect(node.id).toMatch(/^kj-list-item-\d+$/);
  });
});

describe('KjTreeSelect – expand / collapse', () => {
  it('clicking the toggle button expands the branch node', async () => {
    const { container } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    fireEvent.click(container.querySelector('[kjTreeSelectTrigger]')!);
    const toggle = q('[kjTreeSelectToggle]')!;
    fireEvent.click(toggle);
    const branchNode = q('[kjTreeSelectNode][data-has-children="true"]')!;
    expect(branchNode).toHaveAttribute('aria-expanded', 'true');
    expect(branchNode).toHaveAttribute('data-expanded', 'true');
  });

  it('clicking toggle again collapses the branch', async () => {
    const { container } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    fireEvent.click(container.querySelector('[kjTreeSelectTrigger]')!);
    const toggle = q('[kjTreeSelectToggle]')!;
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    const branchNode = q('[kjTreeSelectNode][data-has-children="true"]')!;
    expect(branchNode).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggle click does not select the branch node', async () => {
    const { container, fixture } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    fireEvent.click(container.querySelector('[kjTreeSelectTrigger]')!);
    const toggle = q('[kjTreeSelectToggle]')!;
    fireEvent.click(toggle);
    fixture.detectChanges();
    expect(q('kj-tree-select-content')).not.toHaveAttribute('hidden');
  });
});

describe('KjTreeSelect – single selection', () => {
  it('clicking a leaf node selects it and closes the panel', async () => {
    const { container, fixture } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    fireEvent.click(container.querySelector('[kjTreeSelectTrigger]')!);
    const leafNode = q('[kjTreeSelectNode][aria-level="2"]')!;
    // Capture the node's id before activation so we can find it again
    // post-close (panel may be portalled back to its original slot, or
    // remain in the body wrapper — `document.querySelector` covers
    // both placements).
    const leafId = leafNode.id;
    fireEvent.click(leafNode);
    fixture.detectChanges();
    // `KjOverlayController.close` schedules its DOM teardown inside a
    // requestAnimationFrame — wait one RAF before asserting on
    // `hidden`.
    await new Promise<void>(r => requestAnimationFrame(() => r()));
    expect(q('kj-tree-select-content')).toHaveAttribute('hidden', '');
    const refoundLeaf = q(`#${leafId}`)!;
    expect(refoundLeaf).toHaveAttribute('aria-selected', 'true');
    expect(refoundLeaf).toHaveAttribute('data-selected', '');
  });

  it('aria-selected="false" on unselected nodes', async () => {
    const { container } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    const nodes = container.querySelectorAll('[kjTreeSelectNode]');
    nodes.forEach(n => expect(n).toHaveAttribute('aria-selected', 'false'));
  });

  it('clicking a different node updates the selection', async () => {
    const { container, fixture } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    fireEvent.click(container.querySelector('[kjTreeSelectTrigger]')!);
    const initial = qa('[kjTreeSelectNode][aria-level="2"]');
    const firstId = initial[0].id;
    const secondId = initial[1].id;
    fireEvent.click(initial[0]);
    fixture.detectChanges();

    fireEvent.click(container.querySelector('[kjTreeSelectTrigger]')!);
    fixture.detectChanges();
    expect(q(`#${firstId}`)).toHaveAttribute('aria-selected', 'true');
    expect(q(`#${secondId}`)).toHaveAttribute('aria-selected', 'false');
  });
});

describe('KjTreeSelect – multi selection', () => {
  const multiTemplate = `
    <div kjTreeSelect [(kjValue)]="selected" kjSelectionMode="multiple">
      <button kjTreeSelectTrigger #t="kjTreeSelectTrigger">Choose</button>
      <kj-tree-select-content [kjFor]="t">
        <div kjTreeSelectNode [kjValue]="'a'" kjLabel="A" [kjNodeLevel]="1" [kjNodeSize]="3" [kjNodePos]="1">A</div>
        <div kjTreeSelectNode [kjValue]="'b'" kjLabel="B" [kjNodeLevel]="1" [kjNodeSize]="3" [kjNodePos]="2">B</div>
        <div kjTreeSelectNode [kjValue]="'c'" kjLabel="C" [kjNodeLevel]="1" [kjNodeSize]="3" [kjNodePos]="3">C</div>
      </kj-tree-select-content>
    </div>
  `;

  it('panel stays open after selecting a node', async () => {
    const { container } = await render(multiTemplate, {
      imports,
      componentProperties: { selected: [] },
    });
    fireEvent.click(container.querySelector('[kjTreeSelectTrigger]')!);
    const nodes = qa('[kjTreeSelectNode]');
    fireEvent.click(nodes[0]);
    expect(q('kj-tree-select-content')).not.toHaveAttribute('hidden');
  });

  it('panel has aria-multiselectable="true"', async () => {
    const { container } = await render(multiTemplate, {
      imports,
      componentProperties: { selected: [] },
    });
    expect(container.querySelector('kj-tree-select-content')).toHaveAttribute(
      'aria-multiselectable', 'true',
    );
  });

  it('selecting multiple nodes accumulates the selection', async () => {
    const { container, fixture } = await render(multiTemplate, {
      imports,
      componentProperties: { selected: [] },
    });
    fireEvent.click(container.querySelector('[kjTreeSelectTrigger]')!);
    const nodes = qa('[kjTreeSelectNode]');
    fireEvent.click(nodes[0]);
    fireEvent.click(nodes[2]);
    fixture.detectChanges();
    expect(nodes[0]).toHaveAttribute('aria-selected', 'true');
    expect(nodes[1]).toHaveAttribute('aria-selected', 'false');
    expect(nodes[2]).toHaveAttribute('aria-selected', 'true');
  });

  it('clicking a selected node deselects it', async () => {
    const { container, fixture } = await render(multiTemplate, {
      imports,
      componentProperties: { selected: [] },
    });
    fireEvent.click(container.querySelector('[kjTreeSelectTrigger]')!);
    const nodes = qa('[kjTreeSelectNode]');
    fireEvent.click(nodes[0]);
    fireEvent.click(nodes[0]);
    fixture.detectChanges();
    expect(nodes[0]).toHaveAttribute('aria-selected', 'false');
  });

  it('single mode panel does not have aria-multiselectable', async () => {
    const { container } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    const panel = container.querySelector('kj-tree-select-content')!;
    expect(panel).not.toHaveAttribute('aria-multiselectable');
  });
});

describe('KjTreeSelect – disabled node', () => {
  const disabledTemplate = `
    <div kjTreeSelect [(kjValue)]="selected">
      <button kjTreeSelectTrigger #t="kjTreeSelectTrigger">Choose</button>
      <kj-tree-select-content [kjFor]="t">
        <div kjTreeSelectNode [kjValue]="'x'" kjLabel="X" kjDisabled [kjNodeLevel]="1" [kjNodeSize]="1" [kjNodePos]="1">X</div>
      </kj-tree-select-content>
    </div>
  `;

  it('disabled node has aria-disabled="true"', async () => {
    const { container } = await render(disabledTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    const node = container.querySelector('[kjTreeSelectNode]')!;
    expect(node).toHaveAttribute('aria-disabled', 'true');
  });

  it('disabled node does not change the selection when clicked', async () => {
    const { container, fixture } = await render(disabledTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    fireEvent.click(container.querySelector('[kjTreeSelectTrigger]')!);
    const node = q('[kjTreeSelectNode]')!;
    fireEvent.click(node);
    fixture.detectChanges();
    expect(node).toHaveAttribute('aria-selected', 'false');
  });
});

describe('KjTreeSelect – KjListNavigatorConfig integration', () => {
  it('provides KJ_LIST_NAVIGATOR_CONFIG that reads/writes the kjValue model', async () => {
    const { fixture } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    const rootDe = fixture.debugElement.query(By.directive(KjTreeSelect));
    const cfg = rootDe.injector.get(KJ_LIST_NAVIGATOR_CONFIG);
    expect(cfg.value).toBeDefined();
    cfg.value!.set('apple');
    fixture.detectChanges();
    expect((fixture.componentInstance as { selected: unknown }).selected).toBe('apple');
  });
});

describe('KjTreeSelect – keyboard navigation', () => {
  // Pre-Task-4: keyboard nav is owned by KjTreeSelectContent's custom
  // handler (the `kjFocusMode="roving"` integration with
  // `KjListNavigator` lands in Task 4). The node now no longer carries
  // `tabindex="0"` by default — KjListItem owns tabindex and in
  // activedescendant mode keeps it at `-1`. The content handler still
  // calls `.focus()` on each node directly, so these assertions remain
  // meaningful: the DOM `activeElement` mirrors the navigated node.
  it('ArrowDown on the panel moves focus to the first node', async () => {
    const { container } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    fireEvent.click(container.querySelector('[kjTreeSelectTrigger]')!);
    const panel = q('kj-tree-select-content')!;
    fireEvent.keyDown(panel, { key: 'ArrowDown' });
    const nodes = qa('[kjTreeSelectNode]');
    expect(document.activeElement).toBe(nodes[0]);
  });

  it('Enter on focused node selects it', async () => {
    const { container, fixture } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    fireEvent.click(container.querySelector('[kjTreeSelectTrigger]')!);
    const leafNode = q('[kjTreeSelectNode][aria-level="2"]')!;
    const leafId = leafNode.id;
    fireEvent.keyDown(leafNode, { key: 'Enter' });
    fixture.detectChanges();
    // Enter routes through the content keydown handler, which calls
    // `node.click()` — `KjListItem`'s `(click)` runs `_activate` →
    // `KjSelectionModel.toggle` → root `afterSelect` closes the panel
    // (single mode). Look up by id via `document` so we don't depend
    // on whether the panel has been re-parented yet.
    const refoundLeaf = q(`#${leafId}`)!;
    expect(refoundLeaf).toHaveAttribute('aria-selected', 'true');
  });
});
