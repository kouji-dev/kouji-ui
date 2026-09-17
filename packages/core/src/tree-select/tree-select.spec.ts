import { render, fireEvent, type RenderResult } from '@testing-library/angular';
import { By } from '@angular/platform-browser';
import { toHaveNoViolations } from 'jest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

/**
 * Dispatch `key` from the element that actually holds focus. Throws when
 * `el` is not `document.activeElement`, so a spec can never "press" a key
 * on an element the user could not have reached.
 */
function pressKey(el: Element | null, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  if (!el || document.activeElement !== el) {
    throw new Error(`pressKey(${key}): target does not hold focus (active: ${document.activeElement?.tagName})`);
  }
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  el.dispatchEvent(e);
  return e;
}

/** Flush change detection plus the `afterNextRender` queue the panel focuses from. */
async function settle(fixture: RenderResult<unknown>['fixture']): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

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

describe('KjTreeSelect – document listeners', () => {
  it('mounting a panel installs no document click listener — Escape / outside press are routed by the overlay stack', async () => {
    const add = vi.spyOn(document, 'addEventListener');
    try {
      await render(singleTemplate, {
        imports,
        componentProperties: { selected: undefined },
      });
      expect(add.mock.calls.filter(c => c[0] === 'click')).toHaveLength(0);
    } finally {
      add.mockRestore();
    }
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
    expect(nodes[0]).toHaveAttribute('aria-checked', 'true');
    expect(nodes[1]).toHaveAttribute('aria-checked', 'false');
    expect(nodes[2]).toHaveAttribute('aria-checked', 'true');
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
    expect(nodes[0]).toHaveAttribute('aria-checked', 'false');
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
  // Every spec here starts from the trigger (the only thing a user can Tab
  // to) and dispatches each key from `document.activeElement`. Up/Down/
  // Home/End/Enter/type-ahead are owned by the composed `KjListNavigator`
  // in roving mode; ArrowLeft/Right by `KjTreeSelectContent`.
  const nodes = () => Array.from(qa('[kjTreeSelectNode]')) as HTMLElement[];

  async function openWithKeyboard(fixture: RenderResult<unknown>['fixture'], trigger: HTMLElement) {
    trigger.focus();
    expect(document.activeElement).toBe(trigger);
    pressKey(trigger, 'ArrowDown');
    await settle(fixture);
  }

  it('ArrowDown from the focused trigger opens the tree and moves focus onto the first node', async () => {
    const { container, fixture } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    const trigger = container.querySelector('[kjTreeSelectTrigger]') as HTMLElement;
    await openWithKeyboard(fixture, trigger);
    expect(q('kj-tree-select-content')).not.toHaveAttribute('hidden');
    expect(document.activeElement).toBe(nodes()[0]);
    expect(nodes()[0]).toHaveAttribute('tabindex', '0');
  });

  it('ArrowDown skips the children of a collapsed branch', async () => {
    const { container, fixture } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    await openWithKeyboard(fixture, container.querySelector('[kjTreeSelectTrigger]') as HTMLElement);
    pressKey(document.activeElement, 'ArrowDown');
    await settle(fixture);
    // Fruits (collapsed) → Vegetables, not Apple.
    expect(document.activeElement).toBe(nodes()[3]);
    pressKey(document.activeElement, 'ArrowUp');
    await settle(fixture);
    expect(document.activeElement).toBe(nodes()[0]);
  });

  it('ArrowRight expands a collapsed branch, then moves into its first child; ArrowLeft walks back and collapses', async () => {
    const { container, fixture } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    await openWithKeyboard(fixture, container.querySelector('[kjTreeSelectTrigger]') as HTMLElement);
    const branch = nodes()[0];
    pressKey(branch, 'ArrowRight');
    await settle(fixture);
    expect(branch).toHaveAttribute('aria-expanded', 'true');
    expect(document.activeElement).toBe(branch);
    pressKey(branch, 'ArrowRight');
    await settle(fixture);
    expect(document.activeElement).toBe(nodes()[1]);
    pressKey(document.activeElement, 'ArrowLeft');
    await settle(fixture);
    expect(document.activeElement).toBe(branch);
    pressKey(branch, 'ArrowLeft');
    await settle(fixture);
    expect(branch).toHaveAttribute('aria-expanded', 'false');
  });

  it('Enter on the focused leaf selects it, closes the panel and returns focus to the trigger', async () => {
    const { container, fixture } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    const trigger = container.querySelector('[kjTreeSelectTrigger]') as HTMLElement;
    await openWithKeyboard(fixture, trigger);
    pressKey(document.activeElement, 'ArrowRight');
    await settle(fixture);
    pressKey(document.activeElement, 'ArrowRight');
    await settle(fixture);
    const leaf = document.activeElement as HTMLElement;
    expect(leaf).toHaveAttribute('aria-level', '2');
    const leafId = leaf.id;
    pressKey(leaf, 'Enter');
    await settle(fixture);
    await new Promise<void>(r => requestAnimationFrame(() => r()));
    expect((fixture.componentInstance as { selected: unknown }).selected).toBe('apple');
    expect(q(`#${leafId}`)).toHaveAttribute('aria-selected', 'true');
    expect(q('kj-tree-select-content')).toHaveAttribute('hidden', '');
    expect(document.activeElement).toBe(trigger);
  });

  it('Escape closes the panel and returns focus to the trigger', async () => {
    const { container, fixture } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    const trigger = container.querySelector('[kjTreeSelectTrigger]') as HTMLElement;
    await openWithKeyboard(fixture, trigger);
    pressKey(document.activeElement, 'ArrowDown');
    await settle(fixture);
    pressKey(document.activeElement, 'Escape');
    await settle(fixture);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(trigger);
  });

  it('opens onto the selected node when one is visible', async () => {
    const { container, fixture } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: 'veggies' },
    });
    await openWithKeyboard(fixture, container.querySelector('[kjTreeSelectTrigger]') as HTMLElement);
    expect(document.activeElement).toBe(nodes()[3]);
  });

  it('the panel does not publish aria-activedescendant — focus itself marks the active node', async () => {
    const { container, fixture } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    await openWithKeyboard(fixture, container.querySelector('[kjTreeSelectTrigger]') as HTMLElement);
    expect(q('kj-tree-select-content')).not.toHaveAttribute('aria-activedescendant');
  });
});


describe('KjTreeSelectTrigger — composed KjDisabled (arch F-2 / F-16)', () => {
  const disabledTemplate = `
    <div kjTreeSelect>
      <button kjTreeSelectTrigger kjDisabled #t="kjTreeSelectTrigger">Choose</button>
      <kj-tree-select-content [kjFor]="t">
        <div kjTreeSelectNode [kjValue]="'a'" kjLabel="A" [kjNodeLevel]="1" [kjNodeSize]="1" [kjNodePos]="1">A</div>
      </kj-tree-select-content>
    </div>
  `;

  it('honours the bare kjDisabled attribute and reflects it', async () => {
    const { container, fixture } = await render(disabledTemplate, { imports });
    await settle(fixture);
    const trigger = container.querySelector('[kjTreeSelectTrigger]') as HTMLElement;
    // Before arch F-2 the bare attribute bound '' (falsy) and the flag stayed
    // false; before arch F-16 nothing reflected the state (WCAG 4.1.2).
    expect(trigger).toHaveAttribute('aria-disabled', 'true');
    expect(trigger).toHaveAttribute('data-disabled', '');

    trigger.focus();
    pressKey(trigger, 'ArrowDown');
    await settle(fixture);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('reflects nothing when the trigger is enabled', async () => {
    const { container, fixture } = await render(singleTemplate, {
      imports,
      componentProperties: { selected: undefined },
    });
    await settle(fixture);
    const trigger = container.querySelector('[kjTreeSelectTrigger]') as HTMLElement;
    expect(trigger).not.toHaveAttribute('aria-disabled');
    expect(trigger).not.toHaveAttribute('data-disabled');
  });
});
