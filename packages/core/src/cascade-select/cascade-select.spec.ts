import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { KjCascadeSelectTrigger } from './cascade-select-trigger';
import { KjCascadeSelectPanel } from './cascade-select-panel';
import { KjCascadeSelectSubPanel } from './cascade-select-sub-panel';
import { KjCascadeSelectOption } from './cascade-select-option';

const allDirectives = [
  KjCascadeSelectTrigger,
  KjCascadeSelectPanel,
  KjCascadeSelectSubPanel,
  KjCascadeSelectOption,
];

describe('KjCascadeSelect (root panel ARIA)', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  it('trigger advertises aria-haspopup="listbox" and aria-expanded="false"', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <button kjCascadeSelectTrigger #t="kjCascadeSelectTrigger" type="button">Open</button>
        <div kjCascadeSelectPanel [kjFor]="t">
          <div kjCascadeSelectOption [kjValue]="'sf'" kjLabel="SF"></div>
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
        <button kjCascadeSelectTrigger #t="kjCascadeSelectTrigger" type="button">Open</button>
        <div kjCascadeSelectPanel [kjFor]="t">
          <div kjCascadeSelectOption [kjValue]="'sf'" kjLabel="SF"></div>
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
        <button kjCascadeSelectTrigger #t="kjCascadeSelectTrigger" type="button">Open</button>
        <div kjCascadeSelectPanel [kjFor]="t">
          <div kjCascadeSelectOption [kjValue]="'sf'" kjLabel="SF"></div>
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
        <button kjCascadeSelectTrigger #t="kjCascadeSelectTrigger" type="button">Open</button>
        <div kjCascadeSelectPanel [kjFor]="t">
          <div kjCascadeSelectOption [kjValue]="'sf'" kjLabel="San Francisco"></div>
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
