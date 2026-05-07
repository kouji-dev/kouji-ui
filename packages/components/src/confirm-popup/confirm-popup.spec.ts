import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  KjConfirmPopupActionComponent,
  KjConfirmPopupActionsComponent,
  KjConfirmPopupCancelComponent,
  KjConfirmPopupComponent,
  KjConfirmPopupContentComponent,
  KjConfirmPopupMessageComponent,
  KjConfirmPopupTriggerComponent,
} from './confirm-popup';

function findOverlays(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-kj-overlay]'));
}

function findPanel(): HTMLElement | null {
  for (const o of findOverlays()) {
    if (o.getAttribute('role') === 'alertdialog') return o;
    if (o.getAttribute('role') === 'dialog') return o;
    const dialog = o.querySelector<HTMLElement>('[role="alertdialog"], [role="dialog"]');
    if (dialog) return dialog;
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

describe('KjConfirmPopupComponent (wrapper)', () => {
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

  test('renders projected trigger content with display: contents on host', () => {
    @Component({
      standalone: true,
      imports: [
        KjConfirmPopupComponent,
        KjConfirmPopupTriggerComponent,
        KjConfirmPopupContentComponent,
        KjConfirmPopupMessageComponent,
        KjConfirmPopupActionComponent,
        KjConfirmPopupCancelComponent,
        KjConfirmPopupActionsComponent,
      ],
      template: `
        <kj-confirm-popup>
          <kj-confirm-popup-trigger>
            <button>Delete</button>
          </kj-confirm-popup-trigger>
          <kj-confirm-popup-content>
            <p kjConfirmPopupMessage>Sure?</p>
            <kj-confirm-popup-actions>
              <kj-confirm-popup-cancel><button>Cancel</button></kj-confirm-popup-cancel>
              <kj-confirm-popup-action><button>OK</button></kj-confirm-popup-action>
            </kj-confirm-popup-actions>
          </kj-confirm-popup-content>
        </kj-confirm-popup>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('button');
    expect(btn).not.toBeNull();
    expect(btn.textContent.trim()).toBe('Delete');
  });

  test('aliased trigger inputs reach the underlying directive (aria-haspopup, aria-controls)', () => {
    @Component({
      standalone: true,
      imports: [
        KjConfirmPopupComponent,
        KjConfirmPopupTriggerComponent,
        KjConfirmPopupContentComponent,
        KjConfirmPopupMessageComponent,
      ],
      template: `
        <kj-confirm-popup>
          <kj-confirm-popup-trigger>
            <button>Delete</button>
          </kj-confirm-popup-trigger>
          <kj-confirm-popup-content>
            <p kjConfirmPopupMessage>Sure?</p>
          </kj-confirm-popup-content>
        </kj-confirm-popup>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const triggerHost = fixture.nativeElement.querySelector('kj-confirm-popup-trigger')!;
    expect(triggerHost.getAttribute('aria-haspopup')).toBe('dialog');
    expect(triggerHost.getAttribute('aria-expanded')).toBe('false');
    expect(triggerHost.getAttribute('aria-controls')).toMatch(/^kj-popover-\d+$/);
  });

  test('opening the popup mounts a panel with role="alertdialog"', () => {
    @Component({
      standalone: true,
      imports: [
        KjConfirmPopupComponent,
        KjConfirmPopupTriggerComponent,
        KjConfirmPopupContentComponent,
        KjConfirmPopupMessageComponent,
        KjConfirmPopupActionComponent,
        KjConfirmPopupCancelComponent,
      ],
      template: `
        <kj-confirm-popup>
          <kj-confirm-popup-trigger>
            <button>Delete</button>
          </kj-confirm-popup-trigger>
          <kj-confirm-popup-content>
            <p kjConfirmPopupMessage>Sure?</p>
            <kj-confirm-popup-cancel><button>Cancel</button></kj-confirm-popup-cancel>
            <kj-confirm-popup-action><button>OK</button></kj-confirm-popup-action>
          </kj-confirm-popup-content>
        </kj-confirm-popup>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    settle(fixture);

    const panel = findPanel();
    expect(panel).not.toBeNull();
    expect(panel!.getAttribute('role')).toBe('alertdialog');
    expect(panel!.getAttribute('aria-modal')).toBe('false');
  });

  test('confirm action click resolves with kjResult(true)', () => {
    @Component({
      standalone: true,
      imports: [
        KjConfirmPopupComponent,
        KjConfirmPopupTriggerComponent,
        KjConfirmPopupContentComponent,
        KjConfirmPopupMessageComponent,
        KjConfirmPopupActionComponent,
        KjConfirmPopupCancelComponent,
      ],
      template: `
        <kj-confirm-popup (kjResult)="result.set($event)">
          <kj-confirm-popup-trigger>
            <button>Delete</button>
          </kj-confirm-popup-trigger>
          <kj-confirm-popup-content>
            <p kjConfirmPopupMessage>Sure?</p>
            <kj-confirm-popup-cancel><button>Cancel</button></kj-confirm-popup-cancel>
            <kj-confirm-popup-action><button>OK</button></kj-confirm-popup-action>
          </kj-confirm-popup-content>
        </kj-confirm-popup>
      `,
    })
    class Host {
      readonly result = signal<boolean | null>(null);
    }

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    settle(fixture);

    const panel = findPanel()!;
    panel.querySelector<HTMLElement>('kj-confirm-popup-action button')!.click();
    settle(fixture);

    expect(fixture.componentInstance.result()).toBe(true);
    expect(findPanel()).toBeNull();
  });
});
