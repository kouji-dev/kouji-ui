import {
  Component,
  TemplateRef,
  ViewChild,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KjPopover } from './popover';
import { KjPopoverTrigger } from './popover-trigger';
import { KjPopoverContent } from './popover-content';
import { KjPopoverArrow } from './popover-arrow';
import { KjPopoverTitle } from './popover-title';
import { KjPopoverClose } from './popover-close';
import type { KjPopoverCloseEvent } from './popover.context';

/** Body-level overlays produced by `KjOverlayService.createFromTemplate`. */
function findOverlays(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-kj-overlay]'));
}

function findPanel(): HTMLElement | null {
  for (const o of findOverlays()) {
    if (o.getAttribute('role') === 'dialog') return o;
    const dialog = o.querySelector<HTMLElement>('[role="dialog"]');
    if (dialog) return dialog;
  }
  return null;
}

function cleanupOverlays(): void {
  for (const o of findOverlays()) o.remove();
}

/**
 * Step `vi` fake timers forward in `step` ms increments and run change-
 * detection between each step so signal-driven host bindings flush.
 * Mirrors the helper used in `tooltip.spec.ts`.
 */
function advance(fixture: ReturnType<typeof TestBed.createComponent>, ms: number, step = 1): void {
  let remaining = ms;
  while (remaining > 0) {
    const dt = Math.min(step, remaining);
    vi.advanceTimersByTime(dt);
    fixture.detectChanges();
    remaining -= dt;
  }
}

/** Open the popover and run all queued micro-/macrotasks for the mount + focus pipeline. */
function settle(fixture: ReturnType<typeof TestBed.createComponent>): void {
  fixture.detectChanges();
  advance(fixture, 32);
  fixture.detectChanges();
}

describe('KjPopover (compound)', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'queueMicrotask', 'Date'],
    });
  });

  afterEach(() => {
    cleanupOverlays();
    vi.useRealTimers();
  });

  it('opens on trigger click and mounts content via overlay portal with role="dialog"', () => {
    @Component({
      standalone: true,
      imports: [KjPopover, KjPopoverTrigger, KjPopoverContent, KjPopoverTitle],
      template: `
        <div kjPopover>
          <button kjPopoverTrigger>Open</button>
          <ng-template kjPopoverContent>
            <div>
              <h3 kjPopoverTitle>Profile</h3>
              <button>Action</button>
            </div>
          </ng-template>
        </div>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    expect(findPanel()).toBeNull();

    const btn = fixture.nativeElement.querySelector('button')!;
    btn.click();
    settle(fixture);

    const panel = findPanel();
    expect(panel).not.toBeNull();
    expect(panel!.getAttribute('role')).toBe('dialog');
    expect(panel!.getAttribute('aria-modal')).toBe('false');
    expect(panel!.getAttribute('id')).toMatch(/^kj-popover-\d+$/);
    expect(panel!.getAttribute('tabindex')).toBe('-1');
    expect(panel!.getAttribute('data-state')).toBe('open');
  });

  it('wires trigger ARIA: aria-haspopup="dialog", aria-expanded, aria-controls', () => {
    @Component({
      standalone: true,
      imports: [KjPopover, KjPopoverTrigger, KjPopoverContent, KjPopoverTitle],
      template: `
        <div kjPopover>
          <button kjPopoverTrigger>Open</button>
          <ng-template kjPopoverContent>
            <h3 kjPopoverTitle>P</h3>
          </ng-template>
        </div>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('button')!;
    expect(btn.getAttribute('aria-haspopup')).toBe('dialog');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(btn.getAttribute('aria-controls')).toMatch(/^kj-popover-\d+$/);

    btn.click();
    settle(fixture);

    expect(btn.getAttribute('aria-expanded')).toBe('true');
    const panel = findPanel()!;
    expect(panel.id).toBe(btn.getAttribute('aria-controls'));
  });

  it('auto-wires aria-labelledby to the projected [kjPopoverTitle]', () => {
    @Component({
      standalone: true,
      imports: [KjPopover, KjPopoverTrigger, KjPopoverContent, KjPopoverTitle],
      template: `
        <div kjPopover>
          <button kjPopoverTrigger>Open</button>
          <ng-template kjPopoverContent>
            <h3 kjPopoverTitle>Settings</h3>
          </ng-template>
        </div>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    settle(fixture);

    const panel = findPanel()!;
    const title = panel.querySelector<HTMLElement>('[kjPopoverTitle]')!;
    expect(title.id).toMatch(/^kj-popover-title-\d+$/);
    expect(panel.getAttribute('aria-labelledby')).toBe(title.id);
  });

  it('renders an arrow with aria-hidden="true" and reflects data-side', () => {
    @Component({
      standalone: true,
      imports: [KjPopover, KjPopoverTrigger, KjPopoverContent, KjPopoverTitle, KjPopoverArrow],
      template: `
        <div kjPopover kjPopoverSide="top">
          <button kjPopoverTrigger>Open</button>
          <ng-template kjPopoverContent>
            <div>
              <h3 kjPopoverTitle>P</h3>
              <span kjPopoverArrow></span>
            </div>
          </ng-template>
        </div>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    settle(fixture);

    const panel = findPanel()!;
    const arrow = panel.querySelector<HTMLElement>('[kjPopoverArrow]')!;
    expect(arrow.getAttribute('aria-hidden')).toBe('true');
    expect(arrow.getAttribute('data-side')).toBe('top');
  });

  it('Escape closes via the overlay-stack coordinator', () => {
    @Component({
      standalone: true,
      imports: [KjPopover, KjPopoverTrigger, KjPopoverContent, KjPopoverTitle],
      template: `
        <div kjPopover>
          <button kjPopoverTrigger>Open</button>
          <ng-template kjPopoverContent>
            <h3 kjPopoverTitle>P</h3>
          </ng-template>
        </div>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    settle(fixture);
    expect(findPanel()).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    settle(fixture);
    expect(findPanel()).toBeNull();
  });

  it('outside-click closes via the overlay-stack coordinator', () => {
    @Component({
      standalone: true,
      imports: [KjPopover, KjPopoverTrigger, KjPopoverContent, KjPopoverTitle],
      template: `
        <div kjPopover>
          <button kjPopoverTrigger>Open</button>
          <ng-template kjPopoverContent>
            <h3 kjPopoverTitle>P</h3>
          </ng-template>
        </div>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    settle(fixture);
    expect(findPanel()).not.toBeNull();

    // pointerdown outside the panel — directly on document.body. The overlay
    // service's capture-phase listener inspects `target` against contentEl.
    const evt = new PointerEvent('pointerdown', { bubbles: true });
    document.body.dispatchEvent(evt);
    settle(fixture);
    expect(findPanel()).toBeNull();
  });

  it('kjPopoverClose closes the popover', () => {
    @Component({
      standalone: true,
      imports: [KjPopover, KjPopoverTrigger, KjPopoverContent, KjPopoverTitle, KjPopoverClose],
      template: `
        <div kjPopover>
          <button kjPopoverTrigger>Open</button>
          <ng-template kjPopoverContent>
            <div>
              <h3 kjPopoverTitle>P</h3>
              <button kjPopoverClose>Done</button>
            </div>
          </ng-template>
        </div>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    settle(fixture);

    const panel = findPanel()!;
    expect(panel).not.toBeNull();
    panel.querySelector<HTMLElement>('[kjPopoverClose]')!.click();
    settle(fixture);
    expect(findPanel()).toBeNull();
  });

  it('cancellable close: kjCloseRequested.preventDefault() keeps the panel open', () => {
    @Component({
      standalone: true,
      imports: [KjPopover, KjPopoverTrigger, KjPopoverContent, KjPopoverTitle, KjPopoverClose],
      template: `
        <div kjPopover (kjCloseRequested)="onCloseRequested($event)">
          <button kjPopoverTrigger>Open</button>
          <ng-template kjPopoverContent>
            <div>
              <h3 kjPopoverTitle>P</h3>
              <button kjPopoverClose>Done</button>
            </div>
          </ng-template>
        </div>
      `,
    })
    class Host {
      readonly captured = signal<KjPopoverCloseEvent | null>(null);
      readonly preventNext = signal(true);
      onCloseRequested(ev: KjPopoverCloseEvent): void {
        this.captured.set(ev);
        if (this.preventNext()) ev.preventDefault();
      }
    }

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    settle(fixture);
    expect(findPanel()).not.toBeNull();

    findPanel()!.querySelector<HTMLElement>('[kjPopoverClose]')!.click();
    settle(fixture);

    const ev = fixture.componentInstance.captured();
    expect(ev?.reason).toBe('close-button');
    expect(ev?.defaultPrevented).toBe(true);
    expect(findPanel()).not.toBeNull();

    fixture.componentInstance.preventNext.set(false);
    findPanel()!.querySelector<HTMLElement>('[kjPopoverClose]')!.click();
    settle(fixture);
    expect(findPanel()).toBeNull();
  });

  it('modal mode reflects aria-modal="true" and applies body scroll-lock', () => {
    @Component({
      standalone: true,
      imports: [KjPopover, KjPopoverTrigger, KjPopoverContent, KjPopoverTitle],
      template: `
        <div kjPopover>
          <button kjPopoverTrigger>Open</button>
          <ng-template kjPopoverContent [kjModal]="true">
            <div>
              <h3 kjPopoverTitle>Edit</h3>
              <input />
              <button>Save</button>
            </div>
          </ng-template>
        </div>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    settle(fixture);

    const panel = findPanel()!;
    expect(panel.getAttribute('aria-modal')).toBe('true');
    expect(document.documentElement.style.overflow).toBe('hidden');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    settle(fixture);
    expect(findPanel()).toBeNull();
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('composes KjFocusTrap when modal (kjFocusTrapEnabled bound to kjModal)', () => {
    @Component({
      standalone: true,
      imports: [KjPopover, KjPopoverTrigger, KjPopoverContent, KjPopoverTitle],
      template: `
        <div kjPopover>
          <button kjPopoverTrigger>Open</button>
          <ng-template kjPopoverContent [kjModal]="modal()">
            <div>
              <h3 kjPopoverTitle>Edit</h3>
              <button data-test="b">B</button>
            </div>
          </ng-template>
        </div>
      `,
    })
    class Host {
      readonly modal = signal(true);
    }

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    settle(fixture);

    const panel = findPanel()!;
    // The focus-trap directive is composed unconditionally on the host of
    // kjPopoverContent; its `kjFocusTrapEnabled` reflects `kjModal()`. We
    // can't directly inspect the directive instance from the DOM, but we
    // can verify aria-modal toggles in step with kjModal().
    expect(panel.getAttribute('aria-modal')).toBe('true');

    // Toggling kjModal off mid-life should not reflect on the *already-mounted*
    // panel attributes (the panel was stamped with the snapshot at mount), but
    // closing + reopening picks up the new value.
    fixture.componentInstance.modal.set(false);
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    settle(fixture);
    fixture.nativeElement.querySelector('button')!.click();
    settle(fixture);
    expect(findPanel()!.getAttribute('aria-modal')).toBe('false');
  });

  it('auto-focuses the first focusable element in the panel on open', () => {
    @Component({
      standalone: true,
      imports: [KjPopover, KjPopoverTrigger, KjPopoverContent, KjPopoverTitle],
      template: `
        <div kjPopover>
          <button kjPopoverTrigger>Open</button>
          <ng-template kjPopoverContent>
            <div>
              <h3 kjPopoverTitle>P</h3>
              <input data-test="first" />
              <button data-test="second">B</button>
            </div>
          </ng-template>
        </div>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    settle(fixture);

    const focused = document.activeElement as HTMLElement | null;
    expect(focused).not.toBeNull();
    expect(focused!.getAttribute('data-test')).toBe('first');

    fixture.nativeElement.remove();
  });

  it('restores focus to the trigger on close', () => {
    @Component({
      standalone: true,
      imports: [KjPopover, KjPopoverTrigger, KjPopoverContent, KjPopoverTitle, KjPopoverClose],
      template: `
        <div kjPopover>
          <button kjPopoverTrigger>Open</button>
          <ng-template kjPopoverContent>
            <div>
              <h3 kjPopoverTitle>P</h3>
              <button kjPopoverClose data-test="close">Close</button>
            </div>
          </ng-template>
        </div>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    trigger.click();
    settle(fixture);

    findPanel()!.querySelector<HTMLElement>('[data-test="close"]')!.click();
    settle(fixture);

    expect(document.activeElement).toBe(trigger);
    fixture.nativeElement.remove();
  });

  it('cancellable open auto-focus: preventDefault keeps focus on trigger', () => {
    @Component({
      standalone: true,
      imports: [KjPopover, KjPopoverTrigger, KjPopoverContent, KjPopoverTitle],
      template: `
        <div kjPopover (kjOpenAutoFocus)="$event.preventDefault()">
          <button kjPopoverTrigger>Open</button>
          <ng-template kjPopoverContent>
            <div>
              <h3 kjPopoverTitle>P</h3>
              <input data-test="first" />
            </div>
          </ng-template>
        </div>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    trigger.focus();
    trigger.click();
    settle(fixture);

    expect(findPanel()).not.toBeNull();
    expect(document.activeElement).toBe(trigger);
    fixture.nativeElement.remove();
  });

  it('kjOpen model is two-way bindable', () => {
    @Component({
      standalone: true,
      imports: [KjPopover, KjPopoverTrigger, KjPopoverContent, KjPopoverTitle],
      template: `
        <div kjPopover [(kjOpen)]="open">
          <button kjPopoverTrigger>Open</button>
          <ng-template kjPopoverContent>
            <h3 kjPopoverTitle>P</h3>
          </ng-template>
        </div>
      `,
    })
    class Host {
      open = signal(false);
    }

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    fixture.componentInstance.open.set(true);
    settle(fixture);
    expect(findPanel()).not.toBeNull();

    fixture.componentInstance.open.set(false);
    settle(fixture);
    expect(findPanel()).toBeNull();
  });

  it('manual trigger event suppresses click handling', () => {
    @Component({
      standalone: true,
      imports: [KjPopover, KjPopoverTrigger, KjPopoverContent, KjPopoverTitle],
      template: `
        <div kjPopover kjTriggerEvent="manual">
          <button kjPopoverTrigger>Open</button>
          <ng-template kjPopoverContent>
            <h3 kjPopoverTitle>P</h3>
          </ng-template>
        </div>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    settle(fixture);
    expect(findPanel()).toBeNull();
  });
});

describe('KjPopoverTrigger (trigger-for shape)', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'queueMicrotask', 'Date'],
    });
  });

  afterEach(() => {
    cleanupOverlays();
    vi.useRealTimers();
  });

  it('opens via [kjPopoverTriggerFor] with no outer [kjPopover] wrapper', () => {
    @Component({
      standalone: true,
      imports: [KjPopoverTrigger, KjPopoverContent, KjPopoverTitle],
      template: `
        <button [kjPopoverTriggerFor]="tpl">Open</button>
        <ng-template #tpl>
          <ng-template kjPopoverContent>
            <h3 kjPopoverTitle>Profile</h3>
          </ng-template>
        </ng-template>
      `,
    })
    class Host {
      @ViewChild('tpl', { static: true }) tpl!: TemplateRef<unknown>;
    }

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('button')!;
    expect(btn.getAttribute('aria-haspopup')).toBe('dialog');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(btn.getAttribute('aria-controls')).toMatch(/^kj-popover-\d+$/);

    btn.click();
    settle(fixture);

    const panel = findPanel();
    expect(panel).not.toBeNull();
    expect(panel!.getAttribute('role')).toBe('dialog');
    expect(panel!.getAttribute('id')).toBe(btn.getAttribute('aria-controls'));
  });
});
