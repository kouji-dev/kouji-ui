import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  KjPopoverComponent,
  KjPopoverTriggerComponent,
  KjPopoverContentComponent,
  KjPopoverTitleComponent,
  KjPopoverCloseComponent,
  KjPopoverArrowComponent,
} from './popover';

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
  // Sanity: clear any leftover scroll-lock between tests.
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

describe('KjPopoverComponent (wrapper)', () => {
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

  test('renders projected trigger content (display: contents on host)', () => {
    @Component({
      standalone: true,
      imports: [
        KjPopoverComponent,
        KjPopoverTriggerComponent,
        KjPopoverContentComponent,
        KjPopoverTitleComponent,
      ],
      template: `
        <kj-popover>
          <kj-popover-trigger>
            <button>Open</button>
          </kj-popover-trigger>
          <kj-popover-content>
            <kj-popover-title>Profile</kj-popover-title>
          </kj-popover-content>
        </kj-popover>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('button');
    expect(btn).not.toBeNull();
    expect(btn.textContent.trim()).toBe('Open');
  });

  test('aliased trigger inputs reach the underlying directive (aria-haspopup, aria-controls)', () => {
    @Component({
      standalone: true,
      imports: [
        KjPopoverComponent,
        KjPopoverTriggerComponent,
        KjPopoverContentComponent,
        KjPopoverTitleComponent,
      ],
      template: `
        <kj-popover>
          <kj-popover-trigger>
            <button>Open</button>
          </kj-popover-trigger>
          <kj-popover-content>
            <kj-popover-title>P</kj-popover-title>
          </kj-popover-content>
        </kj-popover>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const triggerHost = fixture.nativeElement.querySelector('kj-popover-trigger')!;
    expect(triggerHost.getAttribute('aria-haspopup')).toBe('dialog');
    expect(triggerHost.getAttribute('aria-expanded')).toBe('false');
    expect(triggerHost.getAttribute('aria-controls')).toMatch(/^kj-popover-\d+$/);
  });

  test('default kjPopoverSide reaches kj-popover-content (data-side="bottom")', () => {
    @Component({
      standalone: true,
      imports: [
        KjPopoverComponent,
        KjPopoverTriggerComponent,
        KjPopoverContentComponent,
        KjPopoverTitleComponent,
      ],
      template: `
        <kj-popover [kjAvoidCollisions]="false" [kjOpen]="true">
          <kj-popover-trigger>
            <button>Open</button>
          </kj-popover-trigger>
          <kj-popover-content>
            <kj-popover-title>P</kj-popover-title>
          </kj-popover-content>
        </kj-popover>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    settle(fixture);

    const panel = findPanel();
    expect(panel).not.toBeNull();
    // KjPopover defaults: side='bottom', align='start'.
    expect(panel!.getAttribute('data-side')).toBe('bottom');
    expect(panel!.getAttribute('data-align')).toBe('start');
  });

  test('kjPopoverSide override "top" reaches the panel', () => {
    @Component({
      standalone: true,
      imports: [
        KjPopoverComponent,
        KjPopoverTriggerComponent,
        KjPopoverContentComponent,
        KjPopoverTitleComponent,
      ],
      template: `
        <kj-popover [kjPopoverSide]="'top'" [kjAvoidCollisions]="false" [kjOpen]="true">
          <kj-popover-trigger>
            <button>Open</button>
          </kj-popover-trigger>
          <kj-popover-content>
            <kj-popover-title>P</kj-popover-title>
          </kj-popover-content>
        </kj-popover>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    settle(fixture);

    const panel = findPanel();
    expect(panel).not.toBeNull();
    expect(panel!.getAttribute('data-side')).toBe('top');
  });

  test('basic open/close cycle via kjOpen model', () => {
    @Component({
      standalone: true,
      imports: [
        KjPopoverComponent,
        KjPopoverTriggerComponent,
        KjPopoverContentComponent,
        KjPopoverTitleComponent,
      ],
      template: `
        <kj-popover [kjOpen]="open()">
          <kj-popover-trigger>
            <button>Open</button>
          </kj-popover-trigger>
          <kj-popover-content>
            <kj-popover-title>Profile</kj-popover-title>
          </kj-popover-content>
        </kj-popover>
      `,
    })
    class Host {
      readonly open = signal(false);
    }

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    expect(findPanel()).toBeNull();

    fixture.componentInstance.open.set(true);
    settle(fixture);
    expect(findPanel()).not.toBeNull();

    fixture.componentInstance.open.set(false);
    settle(fixture);
    expect(findPanel()).toBeNull();
  });

  test('aria-labelledby auto-wires from projected <kj-popover-title>', () => {
    @Component({
      standalone: true,
      imports: [
        KjPopoverComponent,
        KjPopoverTriggerComponent,
        KjPopoverContentComponent,
        KjPopoverTitleComponent,
      ],
      template: `
        <kj-popover [kjOpen]="true">
          <kj-popover-trigger>
            <button>Open</button>
          </kj-popover-trigger>
          <kj-popover-content>
            <kj-popover-title>Settings</kj-popover-title>
          </kj-popover-content>
        </kj-popover>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    settle(fixture);

    const panel = findPanel()!;
    const title = panel.querySelector<HTMLElement>('kj-popover-title')!;
    expect(title).not.toBeNull();
    expect(title.id).toMatch(/^kj-popover-title-\d+$/);
    expect(panel.getAttribute('aria-labelledby')).toBe(title.id);
  });

  test('kjModal toggle composes overlay-stack scroll-lock and aria-modal', () => {
    @Component({
      standalone: true,
      imports: [
        KjPopoverComponent,
        KjPopoverTriggerComponent,
        KjPopoverContentComponent,
        KjPopoverTitleComponent,
      ],
      template: `
        <kj-popover [kjOpen]="open()">
          <kj-popover-trigger>
            <button>Open</button>
          </kj-popover-trigger>
          <kj-popover-content [kjModal]="true">
            <kj-popover-title>Confirm</kj-popover-title>
          </kj-popover-content>
        </kj-popover>
      `,
    })
    class Host {
      readonly open = signal(true);
    }

    const fixture = TestBed.createComponent(Host);
    settle(fixture);

    const panel = findPanel()!;
    expect(panel.getAttribute('aria-modal')).toBe('true');
    // Body scroll-lock is applied by KjOverlayService while a modal is open
    // (locks <html> overflow; coordinated via a reference counter so nested
    // modals share the lock).
    expect(document.documentElement.style.overflow).toBe('hidden');

    // Closing releases the lock.
    fixture.componentInstance.open.set(false);
    settle(fixture);
    expect(findPanel()).toBeNull();
    expect(document.documentElement.style.overflow).toBe('');
  });

  test('kj-popover-arrow renders inside the panel with aria-hidden', () => {
    @Component({
      standalone: true,
      imports: [
        KjPopoverComponent,
        KjPopoverTriggerComponent,
        KjPopoverContentComponent,
        KjPopoverTitleComponent,
        KjPopoverArrowComponent,
      ],
      template: `
        <kj-popover [kjPopoverSide]="'top'" [kjOpen]="true">
          <kj-popover-trigger>
            <button>Open</button>
          </kj-popover-trigger>
          <kj-popover-content>
            <kj-popover-title>P</kj-popover-title>
            <kj-popover-arrow></kj-popover-arrow>
          </kj-popover-content>
        </kj-popover>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    settle(fixture);

    const panel = findPanel()!;
    const arrow = panel.querySelector<HTMLElement>('kj-popover-arrow');
    expect(arrow).not.toBeNull();
    expect(arrow!.getAttribute('aria-hidden')).toBe('true');
    expect(arrow!.getAttribute('data-side')).toBe('top');
  });

  test('kj-popover-close inside the panel closes the popover', () => {
    @Component({
      standalone: true,
      imports: [
        KjPopoverComponent,
        KjPopoverTriggerComponent,
        KjPopoverContentComponent,
        KjPopoverTitleComponent,
        KjPopoverCloseComponent,
      ],
      template: `
        <kj-popover [kjOpen]="true">
          <kj-popover-trigger>
            <button>Open</button>
          </kj-popover-trigger>
          <kj-popover-content>
            <kj-popover-title>P</kj-popover-title>
            <kj-popover-close>
              <button>Done</button>
            </kj-popover-close>
          </kj-popover-content>
        </kj-popover>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    settle(fixture);
    const panel = findPanel()!;
    expect(panel).not.toBeNull();

    const closeBtn = panel.querySelector<HTMLElement>('kj-popover-close')!;
    closeBtn.click();
    settle(fixture);
    expect(findPanel()).toBeNull();
  });
});
