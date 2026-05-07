import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { KjAlertDialogTrigger } from '@kouji-ui/core';

import {
  KjAlertDialogActionComponent,
  KjAlertDialogCancelComponent,
  KjAlertDialogComponent,
  KjAlertDialogDescriptionComponent,
  KjAlertDialogFooterComponent,
  KjAlertDialogOverlayComponent,
  KjAlertDialogTitleComponent,
} from './alert-dialog';

function findContainer(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('[data-kj-alert-dialog-container]');
}

function findPanel(): HTMLElement | null {
  return findContainer()?.querySelector<HTMLElement>('[role="alertdialog"]') ?? null;
}

function cleanupOverlays(): void {
  document.body
    .querySelectorAll<HTMLElement>('[data-kj-alert-dialog-container]')
    .forEach((el) => el.remove());
  document.documentElement.style.overflow = '';
}

function flushRaf(): void {
  vi.advanceTimersByTime(20);
}

describe('KjAlertDialogComponent (wrapper)', () => {
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

  test('renders styled alert dialog and confirms', () => {
    @Component({
      standalone: true,
      imports: [
        KjAlertDialogTrigger,
        KjAlertDialogComponent, KjAlertDialogOverlayComponent,
        KjAlertDialogTitleComponent, KjAlertDialogDescriptionComponent,
        KjAlertDialogFooterComponent,
        KjAlertDialogActionComponent, KjAlertDialogCancelComponent,
      ],
      template: `
        <button [kjAlertDialogTrigger]="dlg" (kjAlertDialogClosed)="result.set($event)">
          Open
        </button>
        <ng-template #dlg>
          <kj-alert-dialog-overlay>
            <kj-alert-dialog>
              <kj-alert-dialog-title>Confirm?</kj-alert-dialog-title>
              <kj-alert-dialog-description>Body text.</kj-alert-dialog-description>
              <kj-alert-dialog-footer>
                <kj-alert-dialog-cancel>
                  <button>Cancel</button>
                </kj-alert-dialog-cancel>
                <kj-alert-dialog-action>
                  <button>OK</button>
                </kj-alert-dialog-action>
              </kj-alert-dialog-footer>
            </kj-alert-dialog>
          </kj-alert-dialog-overlay>
        </ng-template>
      `,
    })
    class Host {
      readonly result = signal<unknown>(undefined);
    }

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector('button')!;
    trigger.click();
    flushRaf();
    fixture.detectChanges();

    const panel = findPanel();
    expect(panel).toBeTruthy();
    expect(panel!.getAttribute('role')).toBe('alertdialog');
    expect(panel!.classList.contains('kj-alert-dialog')).toBe(true);

    const action = panel!.querySelector<HTMLElement>('[data-kj-alert-dialog-action]')!;
    action.click();
    flushRaf();
    fixture.detectChanges();
    expect(fixture.componentInstance.result()).toBe(true);
    expect(findPanel()).toBeNull();
  });

  test('cancel resolves false', () => {
    @Component({
      standalone: true,
      imports: [
        KjAlertDialogTrigger,
        KjAlertDialogComponent, KjAlertDialogOverlayComponent,
        KjAlertDialogTitleComponent, KjAlertDialogDescriptionComponent,
        KjAlertDialogFooterComponent,
        KjAlertDialogActionComponent, KjAlertDialogCancelComponent,
      ],
      template: `
        <button [kjAlertDialogTrigger]="dlg" (kjAlertDialogClosed)="result.set($event)">
          Open
        </button>
        <ng-template #dlg>
          <kj-alert-dialog-overlay>
            <kj-alert-dialog>
              <kj-alert-dialog-title>T</kj-alert-dialog-title>
              <kj-alert-dialog-description>D</kj-alert-dialog-description>
              <kj-alert-dialog-footer>
                <kj-alert-dialog-cancel><button>Cancel</button></kj-alert-dialog-cancel>
                <kj-alert-dialog-action><button>OK</button></kj-alert-dialog-action>
              </kj-alert-dialog-footer>
            </kj-alert-dialog>
          </kj-alert-dialog-overlay>
        </ng-template>
      `,
    })
    class Host {
      readonly result = signal<unknown>(undefined);
    }

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    flushRaf();
    fixture.detectChanges();
    findPanel()!.querySelector<HTMLElement>('[data-kj-alert-dialog-cancel]')!.click();
    flushRaf();
    fixture.detectChanges();
    expect(fixture.componentInstance.result()).toBe(false);
  });
});
