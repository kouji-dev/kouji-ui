import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KjContextMenuTrigger } from './context-menu-trigger';
import { KjContextMenuRegistry } from './context-menu.registry';
import {
  KjDropdownMenu,
  KjDropdownMenuItem,
  KjDropdownMenuSeparator,
} from '../dropdown-menu/index';

/** Body-level overlays produced by the dropdown-menu panel directive. */
function findOverlays(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-kj-overlay]'));
}

function findPanel(): HTMLElement | null {
  for (const o of findOverlays()) {
    if (o.getAttribute('role') === 'menu') return o;
    const menu = o.querySelector<HTMLElement>('[role="menu"]');
    if (menu) return menu;
  }
  return null;
}

function findVirtualAnchors(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-kj-context-menu-anchor]'),
  );
}

function cleanupOverlays(): void {
  for (const o of findOverlays()) o.remove();
  for (const a of findVirtualAnchors()) a.remove();
}

function advance(fixture: ReturnType<typeof TestBed.createComponent>, ms: number, step = 1): void {
  let remaining = ms;
  while (remaining > 0) {
    const dt = Math.min(step, remaining);
    vi.advanceTimersByTime(dt);
    fixture.detectChanges();
    remaining -= dt;
  }
}

function settle(fixture: ReturnType<typeof TestBed.createComponent>): void {
  fixture.detectChanges();
  advance(fixture, 32);
  fixture.detectChanges();
}

const allDirectives = [
  KjContextMenuTrigger,
  KjDropdownMenu,
  KjDropdownMenuItem,
  KjDropdownMenuSeparator,
];

describe('KjContextMenuTrigger', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'queueMicrotask',
        'Date',
      ],
    });
  });

  afterEach(() => {
    cleanupOverlays();
    vi.useRealTimers();
  });

  it('opens on contextmenu event and prevents the browser default menu', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <div [kjContextMenuFor]="tpl" class="row">row</div>
        <ng-template #tpl>
          <div kjDropdownMenu>
            <button kjDropdownMenuItem>Edit</button>
            <button kjDropdownMenuItem>Delete</button>
          </div>
        </ng-template>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    expect(findPanel()).toBeNull();

    const row = fixture.nativeElement.querySelector('.row')! as HTMLElement;
    const evt = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 100,
      clientY: 80,
    });
    const dispatched = row.dispatchEvent(evt);
    settle(fixture);

    // preventDefault was called → dispatchEvent returns false.
    expect(dispatched).toBe(false);
    const panel = findPanel();
    expect(panel).not.toBeNull();
    expect(panel!.getAttribute('role')).toBe('menu');
  });

  it('disabled trigger does not open the menu and does not preventDefault', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <div [kjContextMenuFor]="tpl" kjDisabled class="row">row</div>
        <ng-template #tpl>
          <div kjDropdownMenu>
            <button kjDropdownMenuItem>X</button>
          </div>
        </ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector('.row') as HTMLElement;
    expect(row.getAttribute('aria-disabled')).toBe('true');
    const evt = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 5,
      clientY: 5,
    });
    const dispatched = row.dispatchEvent(evt);
    settle(fixture);
    expect(dispatched).toBe(true); // default not prevented
    expect(findPanel()).toBeNull();
  });

  it('Shift+F10 opens the menu anchored to the host rect', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <div [kjContextMenuFor]="tpl" tabindex="0" class="row">row</div>
        <ng-template #tpl>
          <div kjDropdownMenu>
            <button kjDropdownMenuItem>Edit</button>
          </div>
        </ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector('.row') as HTMLElement;
    row.focus();
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'F10', shiftKey: true, bubbles: true }));
    settle(fixture);
    expect(findPanel()).not.toBeNull();
  });

  it('ContextMenu key opens the menu anchored to the host rect', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <div [kjContextMenuFor]="tpl" tabindex="0" class="row">row</div>
        <ng-template #tpl>
          <div kjDropdownMenu>
            <button kjDropdownMenuItem>Edit</button>
          </div>
        </ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector('.row') as HTMLElement;
    row.focus();
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'ContextMenu', bubbles: true }));
    settle(fixture);
    expect(findPanel()).not.toBeNull();
  });

  it('emits kjOpened with source=mouse and the pointer coordinates', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <div
          [kjContextMenuFor]="tpl"
          (kjOpened)="last = $event"
          class="row"
        >row</div>
        <ng-template #tpl>
          <div kjDropdownMenu>
            <button kjDropdownMenuItem>Edit</button>
          </div>
        </ng-template>
      `,
    })
    class Host {
      last: { source: string; x: number; y: number } | null = null;
    }
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector('.row') as HTMLElement;
    row.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 42,
      clientY: 24,
    }));
    settle(fixture);
    expect(fixture.componentInstance.last).toEqual({ source: 'mouse', x: 42, y: 24 });
  });

  it('Escape closes the menu', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <div [kjContextMenuFor]="tpl" class="row">row</div>
        <ng-template #tpl>
          <div kjDropdownMenu>
            <button kjDropdownMenuItem>Edit</button>
          </div>
        </ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector('.row') as HTMLElement;
    row.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true, cancelable: true, clientX: 1, clientY: 1,
    }));
    settle(fixture);
    expect(findPanel()).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    settle(fixture);
    expect(findPanel()).toBeNull();
  });

  it('item click closes the menu by default', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <div [kjContextMenuFor]="tpl" class="row">row</div>
        <ng-template #tpl>
          <div kjDropdownMenu>
            <button kjDropdownMenuItem>Edit</button>
          </div>
        </ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector('.row') as HTMLElement;
    row.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true, cancelable: true, clientX: 1, clientY: 1,
    }));
    settle(fixture);
    findPanel()!.querySelector<HTMLElement>('[kjDropdownMenuItem]')!.click();
    settle(fixture);
    expect(findPanel()).toBeNull();
  });

  it('opening a second trigger closes the first via the registry', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <div [kjContextMenuFor]="tpl1" class="r1">r1</div>
        <div [kjContextMenuFor]="tpl2" class="r2">r2</div>
        <ng-template #tpl1>
          <div kjDropdownMenu>
            <button kjDropdownMenuItem>One</button>
          </div>
        </ng-template>
        <ng-template #tpl2>
          <div kjDropdownMenu>
            <button kjDropdownMenuItem>Two</button>
          </div>
        </ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const r1 = fixture.nativeElement.querySelector('.r1') as HTMLElement;
    const r2 = fixture.nativeElement.querySelector('.r2') as HTMLElement;
    r1.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true, cancelable: true, clientX: 1, clientY: 1,
    }));
    settle(fixture);
    expect(findOverlays().filter((o) => o.querySelector('[role="menu"]') || o.getAttribute('role') === 'menu').length).toBe(1);

    r2.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true, cancelable: true, clientX: 100, clientY: 100,
    }));
    settle(fixture);
    // Still exactly one open panel after the registry forced-close.
    const openPanels = findOverlays().filter((o) =>
      o.querySelector('[role="menu"]') || o.getAttribute('role') === 'menu',
    );
    expect(openPanels.length).toBe(1);
  });

  it('long-press opens the menu after kjLongPressMs (touch)', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <div [kjContextMenuFor]="tpl" [kjLongPressMs]="300" class="row">row</div>
        <ng-template #tpl>
          <div kjDropdownMenu>
            <button kjDropdownMenuItem>Edit</button>
          </div>
        </ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector('.row') as HTMLElement;
    const start = new PointerEvent('pointerdown', {
      pointerType: 'touch',
      pointerId: 1,
      clientX: 50,
      clientY: 50,
      bubbles: true,
    });
    row.dispatchEvent(start);
    settle(fixture);
    expect(findPanel()).toBeNull();
    advance(fixture, 350);
    expect(findPanel()).not.toBeNull();
  });

  it('long-press cancels when the pointer moves past the tolerance', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <div
          [kjContextMenuFor]="tpl"
          [kjLongPressMs]="300"
          [kjLongPressMoveTolerancePx]="5"
          class="row"
        >row</div>
        <ng-template #tpl>
          <div kjDropdownMenu>
            <button kjDropdownMenuItem>X</button>
          </div>
        </ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector('.row') as HTMLElement;
    row.dispatchEvent(new PointerEvent('pointerdown', {
      pointerType: 'touch', pointerId: 1, clientX: 50, clientY: 50, bubbles: true,
    }));
    row.dispatchEvent(new PointerEvent('pointermove', {
      pointerType: 'touch', pointerId: 1, clientX: 70, clientY: 70, bubbles: true,
    }));
    advance(fixture, 350);
    expect(findPanel()).toBeNull();
  });

  it('registry singleton tracks the open trigger', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <div [kjContextMenuFor]="tpl" class="row">row</div>
        <ng-template #tpl>
          <div kjDropdownMenu>
            <button kjDropdownMenuItem>X</button>
          </div>
        </ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const reg = TestBed.inject(KjContextMenuRegistry);
    fixture.nativeElement.querySelector('.row').dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 1, clientY: 1 }),
    );
    settle(fixture);
    // The registry holds *something* open.
    expect((reg as unknown as { current: unknown }).current).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    settle(fixture);
    expect((reg as unknown as { current: unknown }).current).toBeNull();
  });
});
