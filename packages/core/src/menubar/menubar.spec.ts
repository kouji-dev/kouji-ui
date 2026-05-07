import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KjMenubar } from './menubar';
import { KjMenubarItem } from './menubar-item';
import { KjDropdownMenu } from '../dropdown-menu/dropdown-menu';
import { KjDropdownMenuItem } from '../dropdown-menu/dropdown-menu-item';

/** Body-level overlays produced by `KjOverlayService.createFromTemplate`. */
function findOverlays(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-kj-overlay]'));
}

function findPanels(): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const o of findOverlays()) {
    if (o.getAttribute('role') === 'menu') out.push(o);
    const m = o.querySelector<HTMLElement>('[role="menu"]');
    if (m) out.push(m);
  }
  return out;
}

function findOpenPanel(): HTMLElement | null {
  return findPanels()[0] ?? null;
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
  KjMenubar,
  KjMenubarItem,
  KjDropdownMenu,
  KjDropdownMenuItem,
];

describe('KjMenubar', () => {
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

  it('sets role="menubar" and aria-orientation="horizontal" on the host', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <nav kjMenubar kjAriaLabel="Application">
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m">File</button>
        </nav>
        <ng-template #m><div kjDropdownMenu><button kjDropdownMenuItem>Item</button></div></ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const bar = fixture.nativeElement.querySelector('nav')!;
    expect(bar.getAttribute('role')).toBe('menubar');
    expect(bar.getAttribute('aria-orientation')).toBe('horizontal');
    expect(bar.getAttribute('aria-label')).toBe('Application');
  });

  it('sets role="menuitem" and aria-haspopup="menu" on each bar item', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <nav kjMenubar>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m1">File</button>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m2">Edit</button>
        </nav>
        <ng-template #m1><div kjDropdownMenu><button kjDropdownMenuItem>A</button></div></ng-template>
        <ng-template #m2><div kjDropdownMenu><button kjDropdownMenuItem>B</button></div></ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('button[kjMenubarItem]');
    expect(items.length).toBe(2);
    for (const el of Array.from(items as NodeListOf<HTMLElement>)) {
      expect(el.getAttribute('role')).toBe('menuitem');
      expect(el.getAttribute('aria-haspopup')).toBe('menu');
      expect(el.getAttribute('aria-expanded')).toBe('false');
    }
  });

  it('only one bar item has tabindex="0" (roving tabindex)', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <nav kjMenubar>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m1">File</button>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m2">Edit</button>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m3">View</button>
        </nav>
        <ng-template #m1><div kjDropdownMenu><button kjDropdownMenuItem>A</button></div></ng-template>
        <ng-template #m2><div kjDropdownMenu><button kjDropdownMenuItem>B</button></div></ng-template>
        <ng-template #m3><div kjDropdownMenu><button kjDropdownMenuItem>C</button></div></ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    settle(fixture);
    const items = Array.from(fixture.nativeElement.querySelectorAll<HTMLElement>('button[kjMenubarItem]'));
    const zeros = items.filter((el) => el.getAttribute('tabindex') === '0');
    const negs = items.filter((el) => el.getAttribute('tabindex') === '-1');
    expect(zeros.length).toBe(1);
    expect(negs.length).toBe(2);
  });

  it('clicking a bar item opens its popup with role="menu"', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <nav kjMenubar>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m">File</button>
        </nav>
        <ng-template #m>
          <div kjDropdownMenu>
            <button kjDropdownMenuItem>New</button>
          </div>
        </ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    settle(fixture);
    expect(findOpenPanel()).toBeNull();
    const btn = fixture.nativeElement.querySelector<HTMLButtonElement>('button[kjMenubarItem]')!;
    btn.click();
    settle(fixture);
    const panel = findOpenPanel();
    expect(panel).not.toBeNull();
    expect(panel!.getAttribute('role')).toBe('menu');
    expect(btn.getAttribute('aria-expanded')).toBe('true');
  });

  it('opening a second bar item closes the first (single-open invariant)', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <nav kjMenubar>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m1">File</button>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m2">Edit</button>
        </nav>
        <ng-template #m1><div kjDropdownMenu><button kjDropdownMenuItem>New</button></div></ng-template>
        <ng-template #m2><div kjDropdownMenu><button kjDropdownMenuItem>Undo</button></div></ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    settle(fixture);
    const items = Array.from(
      fixture.nativeElement.querySelectorAll<HTMLButtonElement>('button[kjMenubarItem]'),
    );
    items[0].click();
    settle(fixture);
    expect(findPanels().length).toBe(1);
    items[1].click();
    settle(fixture);
    // Only the second is open.
    expect(findPanels().length).toBe(1);
    expect(items[0].getAttribute('aria-expanded')).toBe('false');
    expect(items[1].getAttribute('aria-expanded')).toBe('true');
  });

  it('disabled bar item exposes aria-disabled and does not open a popup on click', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <nav kjMenubar>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m" kjDisabled>Help</button>
        </nav>
        <ng-template #m><div kjDropdownMenu><button kjDropdownMenuItem>Docs</button></div></ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    settle(fixture);
    const btn = fixture.nativeElement.querySelector<HTMLButtonElement>('button[kjMenubarItem]')!;
    expect(btn.getAttribute('aria-disabled')).toBe('true');
    expect(btn.getAttribute('aria-haspopup')).toBe('menu');
    btn.click();
    settle(fixture);
    expect(findOpenPanel()).toBeNull();
  });

  it('ArrowRight on a focused bar item moves focus to the next bar item', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <nav kjMenubar>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m1">File</button>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m2">Edit</button>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m3">View</button>
        </nav>
        <ng-template #m1><div kjDropdownMenu><button kjDropdownMenuItem>A</button></div></ng-template>
        <ng-template #m2><div kjDropdownMenu><button kjDropdownMenuItem>B</button></div></ng-template>
        <ng-template #m3><div kjDropdownMenu><button kjDropdownMenuItem>C</button></div></ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    settle(fixture);
    const items = Array.from(
      fixture.nativeElement.querySelectorAll<HTMLButtonElement>('button[kjMenubarItem]'),
    );
    items[0].focus();
    items[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    settle(fixture);
    expect(document.activeElement).toBe(items[1]);
  });

  it('ArrowLeft on a focused bar item moves focus to the previous bar item', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <nav kjMenubar>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m1">File</button>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m2">Edit</button>
        </nav>
        <ng-template #m1><div kjDropdownMenu><button kjDropdownMenuItem>A</button></div></ng-template>
        <ng-template #m2><div kjDropdownMenu><button kjDropdownMenuItem>B</button></div></ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    settle(fixture);
    const items = Array.from(
      fixture.nativeElement.querySelectorAll<HTMLButtonElement>('button[kjMenubarItem]'),
    );
    items[1].focus();
    items[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    settle(fixture);
    expect(document.activeElement).toBe(items[0]);
  });

  it('ArrowRight skips a disabled bar item', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <nav kjMenubar>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m1">File</button>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m2" kjDisabled>Edit</button>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m3">View</button>
        </nav>
        <ng-template #m1><div kjDropdownMenu><button kjDropdownMenuItem>A</button></div></ng-template>
        <ng-template #m2><div kjDropdownMenu><button kjDropdownMenuItem>B</button></div></ng-template>
        <ng-template #m3><div kjDropdownMenu><button kjDropdownMenuItem>C</button></div></ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    settle(fixture);
    const items = Array.from(
      fixture.nativeElement.querySelectorAll<HTMLButtonElement>('button[kjMenubarItem]'),
    );
    items[0].focus();
    items[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    settle(fixture);
    expect(document.activeElement).toBe(items[2]);
  });

  it('ArrowRight at the last bar item does not wrap by default', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <nav kjMenubar>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m1">File</button>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m2">Edit</button>
        </nav>
        <ng-template #m1><div kjDropdownMenu><button kjDropdownMenuItem>A</button></div></ng-template>
        <ng-template #m2><div kjDropdownMenu><button kjDropdownMenuItem>B</button></div></ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    settle(fixture);
    const items = Array.from(
      fixture.nativeElement.querySelectorAll<HTMLButtonElement>('button[kjMenubarItem]'),
    );
    items[1].focus();
    items[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    settle(fixture);
    expect(document.activeElement).toBe(items[1]);
  });

  it('ArrowRight at the last bar item wraps when kjLoop is set', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <nav kjMenubar kjLoop>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m1">File</button>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m2">Edit</button>
        </nav>
        <ng-template #m1><div kjDropdownMenu><button kjDropdownMenuItem>A</button></div></ng-template>
        <ng-template #m2><div kjDropdownMenu><button kjDropdownMenuItem>B</button></div></ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    settle(fixture);
    const items = Array.from(
      fixture.nativeElement.querySelectorAll<HTMLButtonElement>('button[kjMenubarItem]'),
    );
    items[1].focus();
    items[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    settle(fixture);
    expect(document.activeElement).toBe(items[0]);
  });

  it('Home / End jump to first / last bar item', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <nav kjMenubar>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m1">File</button>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m2">Edit</button>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m3">View</button>
        </nav>
        <ng-template #m1><div kjDropdownMenu><button kjDropdownMenuItem>A</button></div></ng-template>
        <ng-template #m2><div kjDropdownMenu><button kjDropdownMenuItem>B</button></div></ng-template>
        <ng-template #m3><div kjDropdownMenu><button kjDropdownMenuItem>C</button></div></ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    settle(fixture);
    const items = Array.from(
      fixture.nativeElement.querySelectorAll<HTMLButtonElement>('button[kjMenubarItem]'),
    );
    items[1].focus();
    items[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    settle(fixture);
    expect(document.activeElement).toBe(items[2]);
    items[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    settle(fixture);
    expect(document.activeElement).toBe(items[0]);
  });

  it('emits kjOpenChange with the bar item id on open and null on close', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <nav kjMenubar (kjOpenChange)="last = $event">
          <button id="file-btn" kjMenubarItem [kjDropdownMenuTriggerFor]="m">File</button>
        </nav>
        <ng-template #m><div kjDropdownMenu><button kjDropdownMenuItem>New</button></div></ng-template>
      `,
    })
    class Host {
      last: string | null | undefined = undefined;
    }
    const fixture = TestBed.createComponent(Host);
    settle(fixture);
    const btn = fixture.nativeElement.querySelector<HTMLButtonElement>('button[kjMenubarItem]')!;
    btn.click();
    settle(fixture);
    expect(fixture.componentInstance.last).toBe('file-btn');
    btn.click();
    settle(fixture);
    expect(fixture.componentInstance.last).toBeNull();
  });

  it('Escape closes the open popup and exits auto-disclose mode', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <nav kjMenubar>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m">File</button>
        </nav>
        <ng-template #m><div kjDropdownMenu><button kjDropdownMenuItem>New</button></div></ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    settle(fixture);
    const btn = fixture.nativeElement.querySelector<HTMLButtonElement>('button[kjMenubarItem]')!;
    btn.click();
    settle(fixture);
    expect(findOpenPanel()).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    settle(fixture);
    expect(findOpenPanel()).toBeNull();
  });
});
