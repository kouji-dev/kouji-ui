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

  it('does not move focus on initial render — the seeded tab stop is reachable, not focused', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <input id="before" />
        <nav kjMenubar>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m1">File</button>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m2">Edit</button>
        </nav>
        <ng-template #m1><div kjDropdownMenu><button kjDropdownMenuItem>A</button></div></ng-template>
        <ng-template #m2><div kjDropdownMenu><button kjDropdownMenuItem>B</button></div></ng-template>
      `,
    })
    class Host {}
    (document.activeElement as HTMLElement | null)?.blur?.();
    const fixture = TestBed.createComponent(Host);
    settle(fixture);
    const items = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('button[kjMenubarItem]'));
    // Seeded: File is the bar's single Tab stop …
    expect(items[0].getAttribute('tabindex')).toBe('0');
    // … but nothing was focused on the user's behalf (WCAG 2.4.3 / 3.2.1).
    expect(document.activeElement).toBe(document.body);
  });

  it('a pointer click on another bar item re-syncs the active item for the next arrow key', () => {
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
    const items = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('button[kjMenubarItem]'));
    // A click focuses the button before its `click` fires.
    items[1].focus();
    settle(fixture);
    expect(items[1].getAttribute('tabindex')).toBe('0');
    expect(items[0].getAttribute('tabindex')).toBe('-1');
    items[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    settle(fixture);
    expect(document.activeElement).toBe(items[2]);
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
    const items = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('button[kjMenubarItem]'));
    const zeros = items.filter((el) => el.getAttribute('tabindex') === '0');
    const negs = items.filter((el) => el.getAttribute('tabindex') === '-1');
    expect(zeros.length).toBe(1);
    expect(negs.length).toBe(2);

    // a11y F-15 — the bar roves DOM focus, so role="menubar" must NOT also
    // publish aria-activedescendant: the two are alternative ways of saying
    // where focus is, never both at once (SC 4.1.2). Asserted *after* a real
    // navigation, because an active id only exists once something activates —
    // a bar still stuck in activedescendant mode would publish it here.
    const bar = (fixture.nativeElement as HTMLElement).querySelector('nav[kjMenubar]') as HTMLElement;
    items[0].focus();
    settle(fixture);
    (document.activeElement as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    settle(fixture);
    expect(document.activeElement).toBe(items[1]);
    expect(bar.getAttribute('role')).toBe('menubar');
    expect(bar.hasAttribute('aria-activedescendant')).toBe(false);
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
    const btn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[kjMenubarItem]')!;
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
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button[kjMenubarItem]'),
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
    const btn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[kjMenubarItem]')!;
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
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button[kjMenubarItem]'),
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
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button[kjMenubarItem]'),
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
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button[kjMenubarItem]'),
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
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button[kjMenubarItem]'),
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
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button[kjMenubarItem]'),
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
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button[kjMenubarItem]'),
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
    const btn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[kjMenubarItem]')!;
    btn.click();
    settle(fixture);
    expect(fixture.componentInstance.last).toBe('file-btn');
    btn.click();
    settle(fixture);
    expect(fixture.componentInstance.last).toBeNull();
  });

  it('Escape from inside the submenu closes it and returns focus to the bar item', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <nav kjMenubar>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m">File</button>
        </nav>
        <ng-template #m><div kjDropdownMenu><button kjDropdownMenuItem id="new">New</button></div></ng-template>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    settle(fixture);
    const btn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[kjMenubarItem]')!;
    btn.focus();
    btn.click();
    settle(fixture);
    expect(findOpenPanel()).not.toBeNull();

    const item = document.getElementById('new') as HTMLButtonElement;
    item.focus();
    expect(document.activeElement).toBe(item);
    item.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    settle(fixture);
    expect(findOpenPanel()).toBeNull();
    expect(document.activeElement).toBe(btn);
    fixture.nativeElement.remove();
  });

  it('activating a submenu item closes the submenu and returns focus to the bar item', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <nav kjMenubar>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m">File</button>
        </nav>
        <ng-template #m>
          <div kjDropdownMenu>
            <button kjDropdownMenuItem id="new" (kjSelect)="picked = true">New</button>
          </div>
        </ng-template>
      `,
    })
    class Host { picked = false; }
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    settle(fixture);
    const btn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[kjMenubarItem]')!;
    btn.focus();
    btn.click();
    settle(fixture);
    expect(findOpenPanel()).not.toBeNull();

    const item = document.getElementById('new') as HTMLButtonElement;
    item.focus();
    item.click();
    settle(fixture);
    expect(fixture.componentInstance.picked).toBe(true);
    expect(findOpenPanel()).toBeNull();
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(btn);
    fixture.nativeElement.remove();
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
    const btn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[kjMenubarItem]')!;
    btn.click();
    settle(fixture);
    expect(findOpenPanel()).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    settle(fixture);
    expect(findOpenPanel()).toBeNull();
  });

  describe('submenu disclosure keys', () => {
    @Component({
      standalone: true,
      imports: allDirectives,
      template: `
        <nav kjMenubar>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m1" id="file">File</button>
          <button kjMenubarItem [kjDropdownMenuTriggerFor]="m2" id="edit">Edit</button>
          <button kjMenubarItem [kjDisabled]="true" [kjDropdownMenuTriggerFor]="m1" id="help">Help</button>
        </nav>
        <ng-template #m1><div kjDropdownMenu><button kjDropdownMenuItem>A</button></div></ng-template>
        <ng-template #m2><div kjDropdownMenu><button kjDropdownMenuItem>B</button></div></ng-template>
      `,
    })
    class DiscloseHost {}

    function mountBar() {
      const fixture = TestBed.createComponent(DiscloseHost);
      settle(fixture);
      const items = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button[kjMenubarItem]'),
      );
      return { fixture, items };
    }

    // The composed navigator's orientation is 'vertical' and it wraps, so a
    // bubble-phase ArrowDown would move the bar's roving focus to another
    // item — and the bar would then disclose *that* item's submenu. The key
    // is owned by a capture listener on the bar for exactly this reason.
    it('ArrowDown on the last item opens its own submenu and does not move focus', () => {
      const { fixture, items } = mountBar();
      items[1].focus();
      settle(fixture);

      items[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      settle(fixture);

      expect(document.activeElement === items[0]).toBe(false);
      expect(items[0].getAttribute('aria-expanded')).toBe('false');
      expect(items[1].getAttribute('aria-expanded')).toBe('true');
    });

    it('ArrowUp discloses the focused item rather than walking the bar', () => {
      const { fixture, items } = mountBar();
      items[0].focus();
      settle(fixture);

      items[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      settle(fixture);

      expect(items[0].getAttribute('aria-expanded')).toBe('true');
      expect(items[1].getAttribute('aria-expanded')).toBe('false');
    });

    it('a disabled item discloses nothing', () => {
      const { fixture, items } = mountBar();
      items[2].focus();
      settle(fixture);

      items[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      settle(fixture);

      expect(findOpenPanel()).toBeNull();
    });
  });

  // arch F-2 — `kjLoop` on the bar and `kjDisabled` on an item both carry
  // `transform: booleanAttribute`, so the bare-attribute form is not a silent
  // no-op. `kjLoop` is the sharpest case: without the transform a bare
  // `kjLoop` left `_move()` clamping at the ends.
  describe('bare boolean attributes (arch F-2)', () => {
    it('bare kjLoop wraps ArrowRight past the last item', () => {
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
        fixture.nativeElement.querySelectorAll('button[kjMenubarItem]'),
      ) as HTMLElement[];
      items[1].focus();
      settle(fixture);
      (document.activeElement as HTMLElement).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
      settle(fixture);
      expect(document.activeElement).toBe(items[0]);
    });

    it('without kjLoop ArrowRight clamps at the last item', () => {
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
        fixture.nativeElement.querySelectorAll('button[kjMenubarItem]'),
      ) as HTMLElement[];
      items[1].focus();
      settle(fixture);
      (document.activeElement as HTMLElement).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
      settle(fixture);
      expect(document.activeElement).toBe(items[1]);
    });

    it('bare kjDisabled on an item reflects aria-disabled and blocks disclosure', () => {
      @Component({
        standalone: true,
        imports: allDirectives,
        template: `
          <nav kjMenubar>
            <button kjMenubarItem kjDisabled [kjDropdownMenuTriggerFor]="m1">File</button>
          </nav>
          <ng-template #m1><div kjDropdownMenu><button kjDropdownMenuItem>A</button></div></ng-template>
        `,
      })
      class Host {}
      const fixture = TestBed.createComponent(Host);
      settle(fixture);
      const item = fixture.nativeElement.querySelector('button[kjMenubarItem]') as HTMLElement;
      expect(item.getAttribute('aria-disabled')).toBe('true');
      item.focus();
      settle(fixture);
      item.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      settle(fixture);
      expect(findOpenPanel()).toBeNull();
    });
  });
});
