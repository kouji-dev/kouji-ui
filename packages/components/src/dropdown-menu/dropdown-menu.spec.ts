import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  KjDropdownMenuComponent,
  KjDropdownMenuGroupComponent,
  KjDropdownMenuItemComponent,
  KjDropdownMenuLabelComponent,
  KjDropdownMenuSeparatorComponent,
  KjDropdownMenuTriggerComponent,
} from './dropdown-menu';

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

const wrappers = [
  KjDropdownMenuTriggerComponent,
  KjDropdownMenuComponent,
  KjDropdownMenuItemComponent,
  KjDropdownMenuSeparatorComponent,
  KjDropdownMenuLabelComponent,
  KjDropdownMenuGroupComponent,
];

describe('KjDropdownMenuComponent (wrapper)', () => {
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

  test('aliased trigger inputs reach the underlying directive (aria-haspopup, aria-controls)', () => {
    @Component({
      standalone: true,
      imports: wrappers,
      template: `
        <kj-dropdown-menu-trigger [kjDropdownMenuTriggerFor]="tpl">
          <button>Actions</button>
        </kj-dropdown-menu-trigger>
        <ng-template #tpl>
          <kj-dropdown-menu>
            <kj-dropdown-menu-item>Edit</kj-dropdown-menu-item>
          </kj-dropdown-menu>
        </ng-template>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('button')!;
    // Wrappers use display: contents — the directive's host bindings land on
    // the wrapper element (kj-dropdown-menu-trigger), not the inner button.
    const trigger = fixture.nativeElement.querySelector('kj-dropdown-menu-trigger')!;
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toMatch(/^kj-dropdown-menu-\d+$/);
    expect(btn).not.toBeNull();
  });

  test('opens on trigger element click and mounts a panel with role="menu"', () => {
    @Component({
      standalone: true,
      imports: wrappers,
      template: `
        <kj-dropdown-menu-trigger [kjDropdownMenuTriggerFor]="tpl">
          <button>Actions</button>
        </kj-dropdown-menu-trigger>
        <ng-template #tpl>
          <kj-dropdown-menu>
            <kj-dropdown-menu-item>One</kj-dropdown-menu-item>
            <kj-dropdown-menu-item>Two</kj-dropdown-menu-item>
          </kj-dropdown-menu>
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
    expect(panel!.classList.contains('kj-dropdown-menu')).toBe(true);
  });

  test('items receive role="menuitem" with the kj-dropdown-menu-item class', () => {
    @Component({
      standalone: true,
      imports: wrappers,
      template: `
        <kj-dropdown-menu-trigger [kjDropdownMenuTriggerFor]="tpl">
          <button>A</button>
        </kj-dropdown-menu-trigger>
        <ng-template #tpl>
          <kj-dropdown-menu>
            <kj-dropdown-menu-item>Edit</kj-dropdown-menu-item>
            <kj-dropdown-menu-item>Delete</kj-dropdown-menu-item>
          </kj-dropdown-menu>
        </ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    settle(fixture);
    const panel = findPanel()!;
    const items = panel.querySelectorAll<HTMLElement>('button.kj-dropdown-menu-item');
    expect(items.length).toBe(2);
    expect(items[0].getAttribute('role')).toBe('menuitem');
  });

  test('separator wrapper sets role="separator" with the kj-dropdown-menu-separator class', () => {
    @Component({
      standalone: true,
      imports: wrappers,
      template: `
        <kj-dropdown-menu-trigger [kjDropdownMenuTriggerFor]="tpl">
          <button>A</button>
        </kj-dropdown-menu-trigger>
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
    fixture.nativeElement.querySelector('button')!.click();
    settle(fixture);
    const sep = findPanel()!.querySelector('.kj-dropdown-menu-separator')!;
    expect(sep.getAttribute('role')).toBe('separator');
  });

  test('group wrapper wires aria-labelledby to the projected label', () => {
    @Component({
      standalone: true,
      imports: wrappers,
      template: `
        <kj-dropdown-menu-trigger [kjDropdownMenuTriggerFor]="tpl">
          <button>A</button>
        </kj-dropdown-menu-trigger>
        <ng-template #tpl>
          <kj-dropdown-menu>
            <kj-dropdown-menu-group>
              <kj-dropdown-menu-label>Account</kj-dropdown-menu-label>
              <kj-dropdown-menu-item>Profile</kj-dropdown-menu-item>
            </kj-dropdown-menu-group>
          </kj-dropdown-menu>
        </ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    settle(fixture);
    const group = findPanel()!.querySelector('.kj-dropdown-menu-group')!;
    const label = findPanel()!.querySelector('.kj-dropdown-menu-label')!;
    expect(group.getAttribute('role')).toBe('group');
    expect(label.getAttribute('role')).toBe('presentation');
    expect(group.getAttribute('aria-labelledby')).toBe(label.id);
  });

  test('clicking an item closes the menu (via kjCloseOnSelect default true)', () => {
    @Component({
      standalone: true,
      imports: wrappers,
      template: `
        <kj-dropdown-menu-trigger [kjDropdownMenuTriggerFor]="tpl">
          <button>A</button>
        </kj-dropdown-menu-trigger>
        <ng-template #tpl>
          <kj-dropdown-menu>
            <kj-dropdown-menu-item>Edit</kj-dropdown-menu-item>
          </kj-dropdown-menu>
        </ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    settle(fixture);
    const item = findPanel()!.querySelector<HTMLElement>('button.kj-dropdown-menu-item')!;
    item.click();
    settle(fixture);
    expect(findPanel()).toBeNull();
  });

  test('disabled item via wrapper input does not activate', () => {
    @Component({
      standalone: true,
      imports: wrappers,
      template: `
        <kj-dropdown-menu-trigger [kjDropdownMenuTriggerFor]="tpl">
          <button>A</button>
        </kj-dropdown-menu-trigger>
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
    fixture.nativeElement.querySelector('button')!.click();
    settle(fixture);
    const item = findPanel()!.querySelector<HTMLElement>('button.kj-dropdown-menu-item')!;
    expect(item.getAttribute('aria-disabled')).toBe('true');
    item.click();
    settle(fixture);
    // Menu stays open because activation was suppressed.
    expect(findPanel()).not.toBeNull();
  });
});
