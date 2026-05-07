import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KjDropdownMenu } from './dropdown-menu';
import { KjDropdownMenuTrigger } from './dropdown-menu-trigger';
import { KjDropdownMenuItem } from './dropdown-menu-item';
import { KjDropdownMenuSeparator } from './dropdown-menu-separator';
import { KjDropdownMenuLabel } from './dropdown-menu-label';
import { KjDropdownMenuGroup } from './dropdown-menu-group';

/** Body-level overlays produced by `KjOverlayService.createFromTemplate`. */
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

function cleanupOverlays(): void {
  for (const o of findOverlays()) o.remove();
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
  KjDropdownMenuTrigger,
  KjDropdownMenu,
  KjDropdownMenuItem,
  KjDropdownMenuSeparator,
  KjDropdownMenuLabel,
  KjDropdownMenuGroup,
];

describe('KjDropdownMenu', () => {
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

  it('wires trigger ARIA: aria-haspopup="menu", aria-expanded, aria-controls', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <button [kjDropdownMenuTriggerFor]="tpl">Actions</button>
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
    const btn = fixture.nativeElement.querySelector('button')!;
    expect(btn.getAttribute('aria-haspopup')).toBe('menu');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(btn.getAttribute('aria-controls')).toMatch(/^kj-dropdown-menu-\d+$/);
  });

  it('opens on trigger click and mounts the panel with role="menu"', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <button [kjDropdownMenuTriggerFor]="tpl">Actions</button>
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

    fixture.nativeElement.querySelector('button')!.click();
    settle(fixture);

    const panel = findPanel();
    expect(panel).not.toBeNull();
    expect(panel!.getAttribute('role')).toBe('menu');
    expect(panel!.getAttribute('aria-orientation')).toBe('vertical');
    expect(panel!.getAttribute('id')).toMatch(/^kj-dropdown-menu-\d+$/);
  });

  it('aria-expanded reflects the open state', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <button [kjDropdownMenuTriggerFor]="tpl">A</button>
        <ng-template #tpl>
          <div kjDropdownMenu>
            <button kjDropdownMenuItem>Item</button>
          </div>
        </ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button')!;
    expect(btn.getAttribute('aria-expanded')).toBe('false');

    btn.click();
    settle(fixture);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
  });

  it('Escape closes via the overlay-stack coordinator and restores focus to the trigger', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <button [kjDropdownMenuTriggerFor]="tpl">Actions</button>
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
    const btn = fixture.nativeElement.querySelector<HTMLButtonElement>('button')!;
    btn.click();
    settle(fixture);
    expect(findPanel()).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    settle(fixture);
    expect(findPanel()).toBeNull();
    // Trigger gets focus back.
    expect(document.activeElement).toBe(btn);
  });

  it('outside-click closes via the overlay-stack coordinator', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <button [kjDropdownMenuTriggerFor]="tpl">A</button>
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
    fixture.nativeElement.querySelector('button')!.click();
    settle(fixture);
    expect(findPanel()).not.toBeNull();

    const evt = new PointerEvent('pointerdown', { bubbles: true });
    document.body.dispatchEvent(evt);
    settle(fixture);
    expect(findPanel()).toBeNull();
  });

  it('item click closes the menu by default', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <button [kjDropdownMenuTriggerFor]="tpl">A</button>
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
    fixture.nativeElement.querySelector('button')!.click();
    settle(fixture);
    const panel = findPanel()!;
    panel.querySelector<HTMLElement>('[kjDropdownMenuItem]')!.click();
    settle(fixture);
    expect(findPanel()).toBeNull();
  });

  it('disabled item does not emit kjSelect and does not close the menu', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <button [kjDropdownMenuTriggerFor]="tpl">A</button>
        <ng-template #tpl>
          <div kjDropdownMenu>
            <button kjDropdownMenuItem kjDisabled (kjSelect)="onSelect()">Edit</button>
          </div>
        </ng-template>
      `,
    })
    class Host {
      selected = 0;
      onSelect(): void { this.selected += 1; }
    }
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    settle(fixture);
    const item = findPanel()!.querySelector<HTMLElement>('[kjDropdownMenuItem]')!;
    expect(item.getAttribute('aria-disabled')).toBe('true');
    item.click();
    settle(fixture);
    expect(fixture.componentInstance.selected).toBe(0);
    expect(findPanel()).not.toBeNull();
  });

  it('separator gets role="separator" and is not focusable', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <button [kjDropdownMenuTriggerFor]="tpl">A</button>
        <ng-template #tpl>
          <div kjDropdownMenu>
            <button kjDropdownMenuItem>Edit</button>
            <div kjDropdownMenuSeparator></div>
            <button kjDropdownMenuItem>Delete</button>
          </div>
        </ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    settle(fixture);
    const sep = findPanel()!.querySelector('[kjDropdownMenuSeparator]')!;
    expect(sep.getAttribute('role')).toBe('separator');
    expect(sep.getAttribute('aria-orientation')).toBe('horizontal');
    expect(sep.getAttribute('tabindex')).toBe('-1');
  });

  it('group gets role="group" with aria-labelledby wired to the projected label', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <button [kjDropdownMenuTriggerFor]="tpl">A</button>
        <ng-template #tpl>
          <div kjDropdownMenu>
            <div kjDropdownMenuGroup>
              <span kjDropdownMenuLabel>Account</span>
              <button kjDropdownMenuItem>Profile</button>
            </div>
          </div>
        </ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    settle(fixture);
    const group = findPanel()!.querySelector('[kjDropdownMenuGroup]')!;
    const label = findPanel()!.querySelector('[kjDropdownMenuLabel]')!;
    expect(group.getAttribute('role')).toBe('group');
    expect(label.getAttribute('role')).toBe('presentation');
    expect(label.id).toMatch(/^kj-dropdown-menu-label-\d+$/);
    expect(group.getAttribute('aria-labelledby')).toBe(label.id);
  });

  it('ArrowDown on closed trigger opens the menu and focuses the first item', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <button [kjDropdownMenuTriggerFor]="tpl">A</button>
        <ng-template #tpl>
          <div kjDropdownMenu>
            <button kjDropdownMenuItem>One</button>
            <button kjDropdownMenuItem>Two</button>
          </div>
        </ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector<HTMLButtonElement>('button')!;
    btn.focus();
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    settle(fixture);
    expect(findPanel()).not.toBeNull();
    const items = Array.from(findPanel()!.querySelectorAll<HTMLElement>('[kjDropdownMenuItem]'));
    expect(document.activeElement).toBe(items[0]);
  });

  it('ArrowUp on closed trigger opens and focuses the last item', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <button [kjDropdownMenuTriggerFor]="tpl">A</button>
        <ng-template #tpl>
          <div kjDropdownMenu>
            <button kjDropdownMenuItem>One</button>
            <button kjDropdownMenuItem>Two</button>
          </div>
        </ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector<HTMLButtonElement>('button')!;
    btn.focus();
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    settle(fixture);
    const items = Array.from(findPanel()!.querySelectorAll<HTMLElement>('[kjDropdownMenuItem]'));
    expect(document.activeElement).toBe(items[items.length - 1]);
  });

  it('emits kjMenuOpened on open and kjMenuClosed on close', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <button
          [kjDropdownMenuTriggerFor]="tpl"
          (kjMenuOpened)="opens = opens + 1"
          (kjMenuClosed)="lastReason = $event"
        >A</button>
        <ng-template #tpl>
          <div kjDropdownMenu>
            <button kjDropdownMenuItem>Edit</button>
          </div>
        </ng-template>
      `,
    })
    class Host {
      opens = 0;
      lastReason: string | null = null;
    }
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector<HTMLButtonElement>('button')!;
    btn.click();
    settle(fixture);
    expect(fixture.componentInstance.opens).toBe(1);

    findPanel()!.querySelector<HTMLElement>('[kjDropdownMenuItem]')!.click();
    settle(fixture);
    expect(fixture.componentInstance.lastReason).toBe('item');
  });

  it('disabled trigger does not open the menu', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <button [kjDropdownMenuTriggerFor]="tpl" kjDisabled>A</button>
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
    const btn = fixture.nativeElement.querySelector<HTMLButtonElement>('button')!;
    expect(btn.getAttribute('aria-disabled')).toBe('true');
    btn.click();
    settle(fixture);
    expect(findPanel()).toBeNull();
  });
});
