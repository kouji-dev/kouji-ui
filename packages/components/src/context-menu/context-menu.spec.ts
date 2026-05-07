import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { KjContextMenuTrigger } from '@kouji-ui/core';
import {
  KjDropdownMenuComponent,
  KjDropdownMenuItemComponent,
  KjDropdownMenuSeparatorComponent,
} from '../dropdown-menu/dropdown-menu';
import { KjContextMenuTriggerComponent } from './context-menu';

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
  for (const a of document.querySelectorAll<HTMLElement>('[data-kj-context-menu-anchor]')) a.remove();
  document.documentElement.style.overflow = '';
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

describe('KjContextMenu (wrappers)', () => {
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

  test('attribute form opens a panel that uses Dropdown Menu wrappers', () => {
    @Component({
      standalone: true,
      imports: [
        KjContextMenuTrigger,
        KjDropdownMenuComponent,
        KjDropdownMenuItemComponent,
        KjDropdownMenuSeparatorComponent,
      ],
      template: `
        <div [kjContextMenuFor]="tpl" tabindex="0" class="row">row</div>
        <ng-template #tpl>
          <kj-dropdown-menu>
            <kj-dropdown-menu-item>One</kj-dropdown-menu-item>
            <kj-dropdown-menu-separator />
            <kj-dropdown-menu-item>Two</kj-dropdown-menu-item>
          </kj-dropdown-menu>
        </ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector('.row') as HTMLElement;
    row.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true, cancelable: true, clientX: 10, clientY: 20,
    }));
    settle(fixture);
    const panel = findPanel();
    expect(panel).not.toBeNull();
    expect(panel!.classList.contains('kj-dropdown-menu')).toBe(true);
    const items = panel!.querySelectorAll<HTMLElement>('button.kj-dropdown-menu-item');
    expect(items.length).toBe(2);
    expect(items[0].getAttribute('role')).toBe('menuitem');
    const sep = panel!.querySelector('.kj-dropdown-menu-separator');
    expect(sep!.getAttribute('role')).toBe('separator');
  });

  test('<kj-context-menu-trigger> element host wraps the directive', () => {
    @Component({
      standalone: true,
      imports: [
        KjContextMenuTriggerComponent,
        KjDropdownMenuComponent,
        KjDropdownMenuItemComponent,
      ],
      template: `
        <kj-context-menu-trigger [kjContextMenuFor]="tpl">
          <div tabindex="0" class="row">row</div>
        </kj-context-menu-trigger>
        <ng-template #tpl>
          <kj-dropdown-menu>
            <kj-dropdown-menu-item>X</kj-dropdown-menu-item>
          </kj-dropdown-menu>
        </ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    // Right-click anywhere inside the trigger host bubbles up.
    const trigger = fixture.nativeElement.querySelector('kj-context-menu-trigger') as HTMLElement;
    trigger.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true, cancelable: true, clientX: 1, clientY: 1,
    }));
    settle(fixture);
    expect(findPanel()).not.toBeNull();
  });

  test('disabled item via wrapper input does not activate', () => {
    @Component({
      standalone: true,
      imports: [
        KjContextMenuTrigger,
        KjDropdownMenuComponent,
        KjDropdownMenuItemComponent,
      ],
      template: `
        <div [kjContextMenuFor]="tpl" class="row">row</div>
        <ng-template #tpl>
          <kj-dropdown-menu>
            <kj-dropdown-menu-item kjDisabled>Edit</kj-dropdown-menu-item>
          </kj-dropdown-menu>
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
    const item = findPanel()!.querySelector<HTMLElement>('button.kj-dropdown-menu-item')!;
    expect(item.getAttribute('aria-disabled')).toBe('true');
    item.click();
    settle(fixture);
    expect(findPanel()).not.toBeNull();
  });
});
