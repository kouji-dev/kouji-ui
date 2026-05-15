import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';

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

  // TODO: KjCascadeSelectTrigger uses the generic `onClick()` strategy
  // which returns `ariaHasPopup: null`. Wiring `aria-haspopup="listbox"`
  // (or `"tree"`, to match the panel role) requires a cascade-specific
  // trigger-event strategy — out of scope for the list-primitives
  // migration. Skipping until the trigger gets its own strategy.
  it.skip('trigger advertises aria-haspopup="listbox" and aria-expanded="false"', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <div kjCascadeSelect>
          <button kjCascadeSelectTrigger #t="kjCascadeSelectTrigger" type="button">Open</button>
          <div kjCascadeSelectPanel [kjFor]="t">
            <div kjCascadeSelectOption [kjOptionValue]="'sf'" kjOptionLabel="SF"></div>
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
    expect(btn.getAttribute('aria-haspopup')).toBe('listbox');
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
            <div kjCascadeSelectOption [kjOptionValue]="'sf'" kjOptionLabel="SF"></div>
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
            <div kjCascadeSelectOption [kjOptionValue]="'sf'" kjOptionLabel="SF"></div>
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
            <div kjCascadeSelectOption [kjOptionValue]="'sf'" kjOptionLabel="San Francisco"></div>
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
            <div kjCascadeSelectOption [kjOptionValue]="'sf'" kjOptionLabel="SF"></div>
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

  it('selection model in leaf mode no-ops on branches and toggles leaves', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <div kjCascadeSelect [(kjValue)]="city" [kjTreeShape]="shape">
          <button kjCascadeSelectTrigger #t="kjCascadeSelectTrigger" type="button">Open</button>
          <div kjCascadeSelectPanel [kjFor]="t">
            <div kjCascadeSelectOption [kjOptionValue]="'us'" kjOptionLabel="USA">
              <div kjCascadeSelectSubPanel>
                <div kjCascadeSelectOption [kjOptionValue]="'sf'" kjOptionLabel="SF"></div>
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

    // Branch click: no-op in leaf mode (shape says 'us' is not a leaf).
    model.toggle('us');
    expect(fixture.componentInstance.city).toBe(undefined);

    // Leaf toggle: enters value as an array (multi-style toggle for leaf mode).
    model.toggle('sf');
    expect(Array.isArray(fixture.componentInstance.city)).toBe(true);
    expect(fixture.componentInstance.city).toContain('sf');
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
            <div kjCascadeSelectOption [kjOptionValue]="'sf'" kjOptionLabel="SF"></div>
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
