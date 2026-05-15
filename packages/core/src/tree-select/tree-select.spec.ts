import { render, fireEvent } from '@testing-library/angular';
import { By } from '@angular/platform-browser';
import { toHaveNoViolations } from 'jest-axe';
import {
  KjTreeSelect,
  KjTreeSelectNode,
  KjTreeSelectToggle,
} from './tree-select';
import { KjTreeSelectTrigger } from './tree-select-trigger';
import { KjTreeSelectContent } from './tree-select-content';
import { KJ_LIST_NAVIGATOR_CONFIG } from '../primitives/list';

expect.extend(toHaveNoViolations);

const imports = [
  KjTreeSelect,
  KjTreeSelectTrigger,
  KjTreeSelectContent,
  KjTreeSelectNode,
  KjTreeSelectToggle,
];

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
    expect(container.querySelector('kj-tree-select-content')).not.toHaveAttribute('hidden');
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
    expect(container.querySelector('kj-tree-select-content')).toHaveAttribute('hidden', '');
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
});

describe('KjTreeSelect – expand / collapse', () => {
  it('clicking the toggle button expands the branch node', async () => {
    const { container } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    fireEvent.click(container.querySelector('[kjTreeSelectTrigger]')!);
    const toggle = container.querySelector('[kjTreeSelectToggle]')!;
    fireEvent.click(toggle);
    const branchNode = container.querySelector('[kjTreeSelectNode][data-has-children="true"]')!;
    expect(branchNode).toHaveAttribute('aria-expanded', 'true');
    expect(branchNode).toHaveAttribute('data-expanded', 'true');
  });

  it('clicking toggle again collapses the branch', async () => {
    const { container } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    fireEvent.click(container.querySelector('[kjTreeSelectTrigger]')!);
    const toggle = container.querySelector('[kjTreeSelectToggle]')!;
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    const branchNode = container.querySelector('[kjTreeSelectNode][data-has-children="true"]')!;
    expect(branchNode).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggle click does not select the branch node', async () => {
    const { container, fixture } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    fireEvent.click(container.querySelector('[kjTreeSelectTrigger]')!);
    const toggle = container.querySelector('[kjTreeSelectToggle]')!;
    fireEvent.click(toggle);
    fixture.detectChanges();
    expect(container.querySelector('kj-tree-select-content')).not.toHaveAttribute('hidden');
  });
});

describe('KjTreeSelect – single selection', () => {
  it('clicking a leaf node selects it and closes the panel', async () => {
    const { container, fixture } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    fireEvent.click(container.querySelector('[kjTreeSelectTrigger]')!);
    const leafNode = container.querySelector('[kjTreeSelectNode][aria-level="2"]')!;
    fireEvent.click(leafNode);
    fixture.detectChanges();
    expect(container.querySelector('kj-tree-select-content')).toHaveAttribute('hidden', '');
    expect(leafNode).toHaveAttribute('aria-selected', 'true');
    expect(leafNode).toHaveAttribute('data-selected', '');
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
    const nodes = container.querySelectorAll('[kjTreeSelectNode][aria-level="2"]');
    fireEvent.click(nodes[0]);
    fixture.detectChanges();

    fireEvent.click(container.querySelector('[kjTreeSelectTrigger]')!);
    fixture.detectChanges();
    expect(nodes[0]).toHaveAttribute('aria-selected', 'true');
    expect(nodes[1]).toHaveAttribute('aria-selected', 'false');
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
    const nodes = container.querySelectorAll('[kjTreeSelectNode]');
    fireEvent.click(nodes[0]);
    expect(container.querySelector('kj-tree-select-content')).not.toHaveAttribute('hidden');
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
    const nodes = container.querySelectorAll('[kjTreeSelectNode]');
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
    const nodes = container.querySelectorAll('[kjTreeSelectNode]');
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
    fireEvent.click(container.querySelector('[kjTreeSelectNode]')!);
    fixture.detectChanges();
    const node = container.querySelector('[kjTreeSelectNode]')!;
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
  it('ArrowDown on the panel moves focus to the first node', async () => {
    const { container } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    fireEvent.click(container.querySelector('[kjTreeSelectTrigger]')!);
    const panel = container.querySelector('kj-tree-select-content')!;
    fireEvent.keyDown(panel, { key: 'ArrowDown' });
    const nodes = container.querySelectorAll('[kjTreeSelectNode]');
    expect(document.activeElement).toBe(nodes[0]);
  });

  it('Enter on focused node selects it', async () => {
    const { container, fixture } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    fireEvent.click(container.querySelector('[kjTreeSelectTrigger]')!);
    const leafNode = container.querySelector('[kjTreeSelectNode][aria-level="2"]')!;
    fireEvent.keyDown(leafNode, { key: 'Enter' });
    fixture.detectChanges();
    expect(leafNode).toHaveAttribute('aria-selected', 'true');
  });
});
