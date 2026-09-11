import { ApplicationRef, Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KjPopoverContent } from '../popover/popover-content';
import { KjDialog as KjDialogService } from '../dialog/dialog.service';
import { KjDialogRef } from '../dialog/dialog.ref';

import { KjConfirmPopup } from './confirm-popup';
import { KjConfirmPopupTrigger } from './confirm-popup-trigger';
import { KjConfirmPopupContent } from './confirm-popup-content';
import { KjConfirmPopupMessage } from './confirm-popup-message';
import { KjConfirmPopupAction } from './confirm-popup-action';
import { KjConfirmPopupCancel } from './confirm-popup-cancel';

/** Every mounted overlay: each wrapper under the singleton `.kj-overlay-container`. */
function findOverlays(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.kj-overlay-container > *'));
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

describe('KjConfirmPopup', () => {
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

  it('opens on trigger click and promotes the panel role to alertdialog with aria-modal="false"', () => {
    @Component({
      standalone: true,
      imports: [
        KjConfirmPopup, KjConfirmPopupTrigger, KjConfirmPopupContent, KjPopoverContent,
        KjConfirmPopupMessage, KjConfirmPopupAction, KjConfirmPopupCancel,
      ],
      template: `
        <div kjConfirmPopup>
          <button kjConfirmPopupTrigger #t="kjConfirmPopupTrigger">Delete</button>
          <kj-popover-content [kjFor]="t" kjConfirmPopupContent>
            <p kjConfirmPopupMessage>Are you sure?</p>
            <button kjConfirmPopupCancel>Cancel</button>
            <button kjConfirmPopupAction>OK</button>
          </kj-popover-content>
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
    expect(panel!.getAttribute('role')).toBe('alertdialog');
    expect(panel!.getAttribute('aria-modal')).toBe('false');
  });

  it('wires aria-describedby to the projected [kjConfirmPopupMessage]', () => {
    @Component({
      standalone: true,
      imports: [
        KjConfirmPopup, KjConfirmPopupTrigger, KjConfirmPopupContent, KjPopoverContent,
        KjConfirmPopupMessage, KjConfirmPopupAction, KjConfirmPopupCancel,
      ],
      template: `
        <div kjConfirmPopup>
          <button kjConfirmPopupTrigger #t="kjConfirmPopupTrigger">Delete</button>
          <kj-popover-content [kjFor]="t" kjConfirmPopupContent>
            <p kjConfirmPopupMessage>Confirm action</p>
            <button kjConfirmPopupCancel>Cancel</button>
            <button kjConfirmPopupAction>OK</button>
          </kj-popover-content>
        </div>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    settle(fixture);

    const panel = findPanel()!;
    const message = panel.querySelector<HTMLElement>('[kjConfirmPopupMessage]')!;
    expect(message.id).toMatch(/^kj-confirm-popup-message-\d+$/);
    expect(panel.getAttribute('aria-describedby')).toBe(message.id);
  });

  it('emits kjConfirmed and kjResult(true) when the action button is clicked', () => {
    @Component({
      standalone: true,
      imports: [
        KjConfirmPopup, KjConfirmPopupTrigger, KjConfirmPopupContent, KjPopoverContent,
        KjConfirmPopupMessage, KjConfirmPopupAction, KjConfirmPopupCancel,
      ],
      template: `
        <div kjConfirmPopup
             (kjConfirmed)="confirmed.set(true)"
             (kjCancelled)="cancelled.set(true)"
             (kjResult)="result.set($event)">
          <button kjConfirmPopupTrigger #t="kjConfirmPopupTrigger">Delete</button>
          <kj-popover-content [kjFor]="t" kjConfirmPopupContent>
            <p kjConfirmPopupMessage>Sure?</p>
            <button kjConfirmPopupCancel>Cancel</button>
            <button kjConfirmPopupAction>OK</button>
          </kj-popover-content>
        </div>
      `,
    })
    class Host {
      readonly confirmed = signal(false);
      readonly cancelled = signal(false);
      readonly result = signal<boolean | null>(null);
    }

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    settle(fixture);

    const panel = findPanel()!;
    panel.querySelector<HTMLElement>('[kjConfirmPopupAction]')!.click();
    settle(fixture);

    expect(fixture.componentInstance.confirmed()).toBe(true);
    expect(fixture.componentInstance.cancelled()).toBe(false);
    expect(fixture.componentInstance.result()).toBe(true);
    expect(findPanel()).toBeNull();
  });

  it('emits kjCancelled and kjResult(false) when the cancel button is clicked', () => {
    @Component({
      standalone: true,
      imports: [
        KjConfirmPopup, KjConfirmPopupTrigger, KjConfirmPopupContent, KjPopoverContent,
        KjConfirmPopupMessage, KjConfirmPopupAction, KjConfirmPopupCancel,
      ],
      template: `
        <div kjConfirmPopup
             (kjConfirmed)="confirmed.set(true)"
             (kjCancelled)="cancelled.set(true)"
             (kjResult)="result.set($event)">
          <button kjConfirmPopupTrigger #t="kjConfirmPopupTrigger">Delete</button>
          <kj-popover-content [kjFor]="t" kjConfirmPopupContent>
            <p kjConfirmPopupMessage>Sure?</p>
            <button kjConfirmPopupCancel>Cancel</button>
            <button kjConfirmPopupAction>OK</button>
          </kj-popover-content>
        </div>
      `,
    })
    class Host {
      readonly confirmed = signal(false);
      readonly cancelled = signal(false);
      readonly result = signal<boolean | null>(null);
    }

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    settle(fixture);

    const panel = findPanel()!;
    panel.querySelector<HTMLElement>('[kjConfirmPopupCancel]')!.click();
    settle(fixture);

    expect(fixture.componentInstance.confirmed()).toBe(false);
    expect(fixture.componentInstance.cancelled()).toBe(true);
    expect(fixture.componentInstance.result()).toBe(false);
    expect(findPanel()).toBeNull();
  });

  it('Escape closes the popup and emits kjResult(false)', () => {
    @Component({
      standalone: true,
      imports: [
        KjConfirmPopup, KjConfirmPopupTrigger, KjConfirmPopupContent, KjPopoverContent,
        KjConfirmPopupMessage, KjConfirmPopupAction, KjConfirmPopupCancel,
      ],
      template: `
        <div kjConfirmPopup (kjResult)="result.set($event)">
          <button kjConfirmPopupTrigger #t="kjConfirmPopupTrigger">Delete</button>
          <kj-popover-content [kjFor]="t" kjConfirmPopupContent>
            <p kjConfirmPopupMessage>Sure?</p>
            <button kjConfirmPopupCancel>Cancel</button>
            <button kjConfirmPopupAction>OK</button>
          </kj-popover-content>
        </div>
      `,
    })
    class Host {
      readonly result = signal<boolean | null>(null);
    }

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    settle(fixture);
    expect(findPanel()).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    settle(fixture);

    expect(findPanel()).toBeNull();
    expect(fixture.componentInstance.result()).toBe(false);
  });

  it('reflects [kjDestructive] on the action via data-destructive', () => {
    @Component({
      standalone: true,
      imports: [
        KjConfirmPopup, KjConfirmPopupTrigger, KjConfirmPopupContent, KjPopoverContent,
        KjConfirmPopupMessage, KjConfirmPopupAction, KjConfirmPopupCancel,
      ],
      template: `
        <div kjConfirmPopup [kjDestructive]="true">
          <button kjConfirmPopupTrigger #t="kjConfirmPopupTrigger">Delete</button>
          <kj-popover-content [kjFor]="t" kjConfirmPopupContent>
            <p kjConfirmPopupMessage>Sure?</p>
            <button kjConfirmPopupCancel>Cancel</button>
            <button kjConfirmPopupAction>OK</button>
          </kj-popover-content>
        </div>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    settle(fixture);

    const panel = findPanel()!;
    const action = panel.querySelector<HTMLElement>('[kjConfirmPopupAction]')!;
    expect(action.getAttribute('data-destructive')).toBe('');
  });

  it('focuses the cancel button on open by default', () => {
    @Component({
      standalone: true,
      imports: [
        KjConfirmPopup, KjConfirmPopupTrigger, KjConfirmPopupContent, KjPopoverContent,
        KjConfirmPopupMessage, KjConfirmPopupAction, KjConfirmPopupCancel,
      ],
      template: `
        <div kjConfirmPopup>
          <button kjConfirmPopupTrigger #t="kjConfirmPopupTrigger">Delete</button>
          <kj-popover-content [kjFor]="t" kjConfirmPopupContent>
            <p kjConfirmPopupMessage>Sure?</p>
            <button kjConfirmPopupCancel data-test="cancel">Cancel</button>
            <button kjConfirmPopupAction data-test="action">OK</button>
          </kj-popover-content>
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
    expect(focused!.getAttribute('data-test')).toBe('cancel');
    fixture.nativeElement.remove();
  });

  it('focuses the action button on open when kjDefaultFocus="confirm"', () => {
    @Component({
      standalone: true,
      imports: [
        KjConfirmPopup, KjConfirmPopupTrigger, KjConfirmPopupContent, KjPopoverContent,
        KjConfirmPopupMessage, KjConfirmPopupAction, KjConfirmPopupCancel,
      ],
      template: `
        <div kjConfirmPopup [kjDefaultFocus]="'confirm'">
          <button kjConfirmPopupTrigger #t="kjConfirmPopupTrigger">Delete</button>
          <kj-popover-content [kjFor]="t" kjConfirmPopupContent>
            <p kjConfirmPopupMessage>Sure?</p>
            <button kjConfirmPopupCancel data-test="cancel">Cancel</button>
            <button kjConfirmPopupAction data-test="action">OK</button>
          </kj-popover-content>
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
    expect(focused!.getAttribute('data-test')).toBe('action');
    fixture.nativeElement.remove();
  });
});

describe('KjConfirmPopup nested inside a dialog', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'queueMicrotask', 'Date'],
    });
  });

  afterEach(() => {
    cleanupOverlays();
    document.documentElement.style.overflow = '';
    vi.useRealTimers();
  });

  /** Tick every attached view (the dialog lives outside any fixture) and let the overlay transitions settle. */
  function settleApp(appRef: ApplicationRef): void {
    appRef.tick();
    let remaining = 32;
    while (remaining > 0) {
      vi.advanceTimersByTime(1);
      appRef.tick();
      remaining -= 1;
    }
    appRef.tick();
  }

  @Component({
    standalone: true,
    imports: [
      KjConfirmPopup, KjConfirmPopupTrigger, KjConfirmPopupContent, KjPopoverContent,
      KjConfirmPopupMessage, KjConfirmPopupAction, KjConfirmPopupCancel,
    ],
    template: `
      <div kjConfirmPopup (kjConfirmed)="confirmed.set(true)" (kjCancelled)="cancelled.set(true)">
        <button kjConfirmPopupTrigger #t="kjConfirmPopupTrigger" data-test="trigger">Uninstall</button>
        <kj-popover-content [kjFor]="t" kjConfirmPopupContent data-test="popup">
          <p kjConfirmPopupMessage>Remove this extension?</p>
          <button kjConfirmPopupCancel data-test="keep">Keep</button>
          <button kjConfirmPopupAction data-test="uninstall">Uninstall</button>
        </kj-popover-content>
      </div>
    `,
  })
  class DialogBody {
    readonly ref = inject<KjDialogRef<DialogBody>>(KjDialogRef);
    readonly confirmed = signal(false);
    readonly cancelled = signal(false);
  }

  function openDialogWithPopup() {
    const appRef = TestBed.inject(ApplicationRef);
    const ref = TestBed.inject(KjDialogService).open(DialogBody);
    settleApp(appRef);
    expect(ref.isOpen()).toBe(true);

    const trigger = document.querySelector<HTMLElement>('.kj-overlay-container [data-test="trigger"]')!;
    trigger.click();
    settleApp(appRef);
    const popup = document.querySelector<HTMLElement>('kj-popover-content[data-test="popup"]')!;
    expect(popup.getAttribute('data-state')).toBe('open');
    expect(popup.getAttribute('role')).toBe('alertdialog');
    return { appRef, ref, popup };
  }

  it('the action button closes the POPUP, not the enclosing dialog', () => {
    // Regression: the root resolved its "self" controller without `self: true`,
    // so inside a service-launched dialog it walked up to the DIALOG's
    // controller — Uninstall closed the whole dialog and left the popup open.
    const { appRef, ref, popup } = openDialogWithPopup();

    popup.querySelector<HTMLElement>('[data-test="uninstall"]')!.click();
    settleApp(appRef);

    expect(ref.instance.confirmed()).toBe(true);
    expect(popup.getAttribute('data-state')).toBe('closed');
    expect(ref.isOpen()).toBe(true);
    ref.close();
  });

  it('the cancel button closes the POPUP, not the enclosing dialog', () => {
    const { appRef, ref, popup } = openDialogWithPopup();

    popup.querySelector<HTMLElement>('[data-test="keep"]')!.click();
    settleApp(appRef);

    expect(ref.instance.cancelled()).toBe(true);
    expect(popup.getAttribute('data-state')).toBe('closed');
    expect(ref.isOpen()).toBe(true);
    ref.close();
  });
});
