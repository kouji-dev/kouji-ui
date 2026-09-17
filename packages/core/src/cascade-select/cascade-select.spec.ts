import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KjCascadeSelect } from './cascade-select-root';
import { KjCascadeSelectTrigger } from './cascade-select-trigger';
import { KjCascadeSelectPanel } from './cascade-select-panel';
import { KjCascadeSelectSubPanel } from './cascade-select-sub-panel';
import { KjCascadeSelectOption } from './cascade-select-option';
import { KJ_LIST_NAVIGATOR_CONFIG, KjSelectionModel } from '../primitives/list';
import type { KjTreeShape } from '../primitives/list';

const allDirectives = [
  KjCascadeSelect,
  KjCascadeSelectTrigger,
  KjCascadeSelectPanel,
  KjCascadeSelectSubPanel,
  KjCascadeSelectOption,
];

/**
 * Tree shape for the SF / NYC fixture. `'sf'` and `'nyc'` are leaves;
 * `'us'` is the only branch. Cascade-select needs this shape so
 * `KjSelectionModel` in `'leaf'` mode no-ops on branches.
 */
const fixtureShape: KjTreeShape<unknown> = {
  isLeaf: (n) => n === 'sf' || n === 'nyc',
  getChildren: (n) => (n === 'us' ? ['sf', 'nyc'] : []),
  getParent: (n) => (n === 'sf' || n === 'nyc' ? 'us' : null),
};

describe('KjCascadeSelect (root panel ARIA)', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  it('trigger advertises aria-haspopup="tree" (the panel role) and aria-expanded="false"', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <div kjCascadeSelect>
          <button kjCascadeSelectTrigger #t="kjCascadeSelectTrigger" type="button">Open</button>
          <div kjCascadeSelectPanel [kjFor]="t">
            <div kjCascadeSelectOption [kjValue]="'sf'" kjLabel="SF"></div>
          </div>
        </div>
      `,
    })
    class Host {
      city = signal<string | undefined>(undefined);
    }
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(btn.getAttribute('aria-haspopup')).toBe('tree');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('root panel exposes role="tree" with horizontal orientation', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <div kjCascadeSelect>
          <button kjCascadeSelectTrigger #t="kjCascadeSelectTrigger" type="button">Open</button>
          <div kjCascadeSelectPanel [kjFor]="t">
            <div kjCascadeSelectOption [kjValue]="'sf'" kjLabel="SF"></div>
          </div>
        </div>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const panel = fixture.nativeElement.querySelector('[kjCascadeSelectPanel]')!;
    expect(panel.getAttribute('role')).toBe('tree');
    expect(panel.getAttribute('aria-orientation')).toBe('horizontal');
    expect(panel.getAttribute('aria-multiselectable')).toBe('false');
  });

  it('root panel is hidden until the trigger is clicked', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <div kjCascadeSelect>
          <button kjCascadeSelectTrigger #t="kjCascadeSelectTrigger" type="button">Open</button>
          <div kjCascadeSelectPanel [kjFor]="t">
            <div kjCascadeSelectOption [kjValue]="'sf'" kjLabel="SF"></div>
          </div>
        </div>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const panel = fixture.nativeElement.querySelector('[kjCascadeSelectPanel]')!;
    expect(panel.hasAttribute('hidden')).toBe(true);
  });

  it('option still exposes role="treeitem" with aria-selected', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <div kjCascadeSelect>
          <button kjCascadeSelectTrigger #t="kjCascadeSelectTrigger" type="button">Open</button>
          <div kjCascadeSelectPanel [kjFor]="t">
            <div kjCascadeSelectOption [kjValue]="'sf'" kjLabel="San Francisco"></div>
          </div>
        </div>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const opt = fixture.nativeElement.querySelector('[kjCascadeSelectOption]')!;
    expect(opt.getAttribute('role')).toBe('treeitem');
    expect(opt.getAttribute('aria-selected')).toBe('false');
    expect(opt.getAttribute('data-label')).toBe('San Francisco');
  });
});

describe('KjCascadeSelect – KjListNavigatorConfig integration', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  it('provides KJ_LIST_NAVIGATOR_CONFIG that reads/writes the kjValue model', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <div kjCascadeSelect [(kjValue)]="city" [kjTreeShape]="shape">
          <button kjCascadeSelectTrigger #t="kjCascadeSelectTrigger" type="button">Open</button>
          <div kjCascadeSelectPanel [kjFor]="t">
            <div kjCascadeSelectOption [kjValue]="'sf'" kjLabel="SF"></div>
          </div>
        </div>
      `,
    })
    class Host {
      city: unknown = undefined;
      shape = fixtureShape;
    }
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const rootDe = fixture.debugElement.query(By.directive(KjCascadeSelect));
    const cfg = rootDe.injector.get(KJ_LIST_NAVIGATOR_CONFIG);
    expect(cfg.value).toBeDefined();
    cfg.value!.set('sf');
    fixture.detectChanges();
    expect(fixture.componentInstance.city).toBe('sf');
  });

  it('selection model in single mode no-ops on branches and commits leaves', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <div kjCascadeSelect [(kjValue)]="city" [kjTreeShape]="shape">
          <button kjCascadeSelectTrigger #t="kjCascadeSelectTrigger" type="button">Open</button>
          <div kjCascadeSelectPanel [kjFor]="t">
            <div kjCascadeSelectOption [kjValue]="'us'" kjLabel="USA">
              <div kjCascadeSelectSubPanel>
                <div kjCascadeSelectOption [kjValue]="'sf'" kjLabel="SF"></div>
              </div>
            </div>
          </div>
        </div>
      `,
    })
    class Host {
      city: unknown = undefined;
      shape = fixtureShape;
    }
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const rootDe = fixture.debugElement.query(By.directive(KjCascadeSelect));
    const model = rootDe.injector.get(KjSelectionModel);

    // Branch toggle: blocked by the single-mode shape gate ('us' is not a leaf).
    model.toggle('us');
    expect(fixture.componentInstance.city).toBe(undefined);

    // Leaf toggle: replaces kjValue with the leaf value (single-select).
    model.toggle('sf');
    expect(fixture.componentInstance.city).toBe('sf');
  });
});

describe('KjCascadeSelect – afterSelect derives path from tree shape', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  it('walks the tree shape from leaf to root when populating kjCascadePath', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <div
          kjCascadeSelect
          [(kjValue)]="city"
          [(kjCascadePath)]="path"
          [kjTreeShape]="shape"
        >
          <button kjCascadeSelectTrigger #t="kjCascadeSelectTrigger" type="button">Open</button>
          <div kjCascadeSelectPanel [kjFor]="t">
            <div kjCascadeSelectOption [kjValue]="'sf'" kjLabel="SF"></div>
          </div>
        </div>
      `,
    })
    class Host {
      city: unknown = undefined;
      path: readonly unknown[] = [];
      shape = fixtureShape;
    }
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const rootDe = fixture.debugElement.query(By.directive(KjCascadeSelect));
    const root = rootDe.injector.get(KjCascadeSelect);

    // Simulate the consumer hook fired by KjListItem._activate after the
    // selection model toggles a leaf value.
    root.afterSelect('sf', false);
    fixture.detectChanges();
    expect(fixture.componentInstance.path).toEqual(['us', 'sf']);
  });
});

// ── Keyboard ──────────────────────────────────────────────────────────────

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

/** Flush change detection plus the `afterNextRender` queue the panels focus from. */
async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('KjCascadeSelect – keyboard', () => {
  @Component({
    standalone: true,
    imports: allDirectives,
    template: `
      <div kjCascadeSelect [(kjValue)]="city" [(kjCascadePath)]="path">
        <button kjCascadeSelectTrigger #t="kjCascadeSelectTrigger" type="button">Open</button>
        <div kjCascadeSelectPanel [kjFor]="t">
          <div kjCascadeSelectOption [kjValue]="'us'" kjLabel="USA">
            <div kjCascadeSelectSubPanel>
              <div kjCascadeSelectOption [kjValue]="'sf'" kjLabel="SF"></div>
              <div kjCascadeSelectOption [kjValue]="'nyc'" kjLabel="NYC"></div>
            </div>
          </div>
          <div kjCascadeSelectOption [kjValue]="'fr'" kjLabel="France">
            <div kjCascadeSelectSubPanel>
              <div kjCascadeSelectOption [kjValue]="'paris'" kjLabel="Paris"></div>
            </div>
          </div>
          <div kjCascadeSelectOption [kjValue]="'ch'" kjLabel="Switzerland"></div>
        </div>
      </div>
    `,
  })
  class Host {
    city: unknown = undefined;
    path: readonly unknown[] = [];
  }

  const option = (label: string) =>
    document.querySelector<HTMLElement>(`[kjCascadeSelectOption][data-label="${label}"]`)!;
  const subPanelOf = (label: string) =>
    option(label).querySelector<HTMLElement>('[kjCascadeSelectSubPanel]')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    document
      .querySelectorAll('.kj-overlay-wrapper, .kj-overlay-container')
      .forEach(w => w.remove());
  });

  async function openWithKeyboard(fixture: ComponentFixture<Host>): Promise<HTMLElement> {
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector('button') as HTMLElement;
    trigger.focus();
    expect(document.activeElement).toBe(trigger);
    pressKey(trigger, 'ArrowDown');
    await settle(fixture);
    return trigger;
  }

  it('ArrowDown from the focused trigger opens the panel and moves focus onto the first option', async () => {
    const fixture = TestBed.createComponent(Host);
    const trigger = await openWithKeyboard(fixture);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(option('USA'));
  });

  it('ArrowDown / ArrowUp stay within the level — sub-panel options are never reached from the root', async () => {
    const fixture = TestBed.createComponent(Host);
    await openWithKeyboard(fixture);
    pressKey(document.activeElement, 'ArrowDown');
    await settle(fixture);
    expect(document.activeElement).toBe(option('France'));
    pressKey(document.activeElement, 'ArrowDown');
    await settle(fixture);
    expect(document.activeElement).toBe(option('Switzerland'));
    pressKey(document.activeElement, 'ArrowUp');
    await settle(fixture);
    expect(document.activeElement).toBe(option('France'));
  });

  it('ArrowRight on a branch opens its sub-panel and focuses the first child; ArrowLeft returns to the branch', async () => {
    const fixture = TestBed.createComponent(Host);
    await openWithKeyboard(fixture);
    pressKey(option('USA'), 'ArrowRight');
    await settle(fixture);
    expect(option('USA').getAttribute('aria-expanded')).toBe('true');
    expect(subPanelOf('USA').hasAttribute('hidden')).toBe(false);
    expect(document.activeElement).toBe(option('SF'));

    // Arrow keys inside the sub-panel move within it and do not leak to the root panel.
    pressKey(option('SF'), 'ArrowDown');
    await settle(fixture);
    expect(document.activeElement).toBe(option('NYC'));

    pressKey(option('NYC'), 'ArrowLeft');
    await settle(fixture);
    expect(option('USA').getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(option('USA'));
    // The root level resumed from the branch, not from wherever it was before.
    pressKey(option('USA'), 'ArrowDown');
    await settle(fixture);
    expect(document.activeElement).toBe(option('France'));
  });

  it('Enter on a focused leaf commits the value with its path, closes the panel and returns focus to the trigger', async () => {
    const fixture = TestBed.createComponent(Host);
    const trigger = await openWithKeyboard(fixture);
    pressKey(option('USA'), 'Enter');
    await settle(fixture);
    expect(document.activeElement).toBe(option('SF'));
    pressKey(option('SF'), 'ArrowDown');
    await settle(fixture);
    pressKey(option('NYC'), 'Enter');
    await settle(fixture);
    expect(fixture.componentInstance.city).toBe('nyc');
    expect(fixture.componentInstance.path).toEqual(['us', 'nyc']);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('Escape closes every panel and returns focus to the trigger', async () => {
    const fixture = TestBed.createComponent(Host);
    const trigger = await openWithKeyboard(fixture);
    pressKey(option('USA'), 'ArrowRight');
    await settle(fixture);
    pressKey(option('SF'), 'Escape');
    await settle(fixture);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
    expect(option('USA').getAttribute('aria-expanded')).toBe('false');
  });

  it('re-opens onto the level-0 branch that leads to the selected leaf', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.city = 'paris';
    const trigger = await openWithKeyboard(fixture);
    expect(document.activeElement).toBe(option('France'));
    pressKey(option('France'), 'Escape');
    await settle(fixture);
    expect(document.activeElement).toBe(trigger);
  });

  it('the root panel does not publish aria-activedescendant — the focused option is the active one', async () => {
    const fixture = TestBed.createComponent(Host);
    await openWithKeyboard(fixture);
    const panel = fixture.nativeElement.ownerDocument.querySelector('[kjCascadeSelectPanel]') as HTMLElement;
    expect(panel.hasAttribute('aria-activedescendant')).toBe(false);
    expect(option('USA').getAttribute('tabindex')).toBe('0');
    expect(option('France').getAttribute('tabindex')).toBe('-1');
  });
});

describe('KjCascadeSelectSubPanel – window listeners', () => {
  @Component({
    standalone: true,
    imports: allDirectives,
    template: `
      <div kjCascadeSelect>
        <button kjCascadeSelectTrigger #t="kjCascadeSelectTrigger" type="button">Open</button>
        <div kjCascadeSelectPanel [kjFor]="t">
          <div kjCascadeSelectOption [kjValue]="'us'" kjLabel="USA">
            <div kjCascadeSelectSubPanel>
              <div kjCascadeSelectOption [kjValue]="'sf'" kjLabel="SF"></div>
            </div>
          </div>
        </div>
      </div>
    `,
  })
  class Host {}

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document
      .querySelectorAll('.kj-overlay-wrapper, .kj-overlay-container')
      .forEach(w => w.remove());
  });

  function listenerCount(spyAdd: ReturnType<typeof vi.spyOn>, spyRemove: ReturnType<typeof vi.spyOn>, type: string): number {
    const added = spyAdd.mock.calls.filter((c: readonly unknown[]) => c[0] === type).length;
    const removed = spyRemove.mock.calls.filter((c: readonly unknown[]) => c[0] === type).length;
    return added - removed;
  }

  it('attaches scroll/resize listeners only while open and removes them when destroyed while open', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    expect(listenerCount(add, remove, 'scroll')).toBe(0);
    expect(listenerCount(add, remove, 'resize')).toBe(0);

    const root = fixture.debugElement.query(By.directive(KjCascadeSelect)).injector.get(KjCascadeSelect);
    const branch = fixture.debugElement.query(By.directive(KjCascadeSelectOption)).injector.get(KjCascadeSelectOption);
    root.openSubPanel(branch.item.id);
    fixture.detectChanges();
    expect(listenerCount(add, remove, 'scroll')).toBe(1);
    expect(listenerCount(add, remove, 'resize')).toBe(1);
    // Passive, so the scroll never waits on the reposition.
    const scrollOpts = add.mock.calls.find(c => c[0] === 'scroll')![2] as AddEventListenerOptions;
    expect(scrollOpts.passive).toBe(true);
    expect(scrollOpts.capture).toBe(true);

    // Tear the whole cascade down (route change, host destroyed) while the
    // sub-panel is still open — the `else` branch of an open/close toggle
    // never runs on this path.
    fixture.destroy();
    expect(listenerCount(add, remove, 'scroll')).toBe(0);
    expect(listenerCount(add, remove, 'resize')).toBe(0);
  });

  it('coalesces a burst of scroll events into a single repositioning frame', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const root = fixture.debugElement.query(By.directive(KjCascadeSelect)).injector.get(KjCascadeSelect);
    const branch = fixture.debugElement.query(By.directive(KjCascadeSelectOption)).injector.get(KjCascadeSelectOption);
    const branchEl = branch.item._host();
    const rect = vi.spyOn(branchEl, 'getBoundingClientRect');
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    root.openSubPanel(branch.item.id);
    fixture.detectChanges();
    const readsAfterOpen = rect.mock.calls.length;
    const framesAfterOpen = raf.mock.calls.length;
    for (let i = 0; i < 5; i++) window.dispatchEvent(new Event('scroll'));
    // One frame requested for the burst, no synchronous layout reads.
    expect(raf.mock.calls.length).toBe(framesAfterOpen + 1);
    expect(rect.mock.calls.length).toBe(readsAfterOpen);
  });
});
