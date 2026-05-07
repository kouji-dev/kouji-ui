import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KjBottomSheetTrigger } from '@kouji-ui/core';

import {
  KjBottomSheetComponent,
  KjBottomSheetOverlayComponent,
  KjBottomSheetHandleComponent,
  KjBottomSheetHeaderComponent,
  KjBottomSheetTitleComponent,
  KjBottomSheetBodyComponent,
  KjBottomSheetFooterComponent,
  KjBottomSheetCloseComponent,
} from './bottom-sheet';

const imports = [
  KjBottomSheetTrigger,
  KjBottomSheetComponent,
  KjBottomSheetOverlayComponent,
  KjBottomSheetHandleComponent,
  KjBottomSheetHeaderComponent,
  KjBottomSheetTitleComponent,
  KjBottomSheetBodyComponent,
  KjBottomSheetFooterComponent,
  KjBottomSheetCloseComponent,
];

function findContainer(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('[data-kj-bottom-sheet-container]');
}

function findPanel(): HTMLElement | null {
  return findContainer()?.querySelector<HTMLElement>('[role="dialog"]') ?? null;
}

function cleanupOverlays(): void {
  document.body
    .querySelectorAll<HTMLElement>('[data-kj-bottom-sheet-container]')
    .forEach((el) => el.remove());
  document.documentElement.style.overflow = '';
}

function flushRaf(): void {
  vi.advanceTimersByTime(20);
}

describe('KjBottomSheetComponent (wrapper)', () => {
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

  it('opens via the trigger and renders the styled panel', () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <button [kjBottomSheetTrigger]="sheet">Open</button>
        <ng-template #sheet>
          <kj-bottom-sheet-overlay>
            <kj-bottom-sheet>
              <kj-bottom-sheet-header>
                <kj-bottom-sheet-title>Hi</kj-bottom-sheet-title>
              </kj-bottom-sheet-header>
              <kj-bottom-sheet-body>Body</kj-bottom-sheet-body>
            </kj-bottom-sheet>
          </kj-bottom-sheet-overlay>
        </ng-template>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    flushRaf();
    fixture.detectChanges();

    const panel = findPanel();
    expect(panel).not.toBeNull();
    expect(panel!.classList.contains('kj-bottom-sheet')).toBe(true);
    expect(panel!.getAttribute('data-kj-placement')).toBe('bottom');
  });

  it('auto-wires aria-labelledby from <kj-bottom-sheet-title>', () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <button [kjBottomSheetTrigger]="sheet">Open</button>
        <ng-template #sheet>
          <kj-bottom-sheet-overlay>
            <kj-bottom-sheet>
              <kj-bottom-sheet-header>
                <kj-bottom-sheet-title>Settings</kj-bottom-sheet-title>
              </kj-bottom-sheet-header>
            </kj-bottom-sheet>
          </kj-bottom-sheet-overlay>
        </ng-template>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    flushRaf();
    fixture.detectChanges();

    const panel = findPanel()!;
    const title = panel.querySelector<HTMLElement>('kj-bottom-sheet-title')!;
    expect(panel.getAttribute('aria-labelledby')).toBe(title.id);
  });

  it('handle wrapper exposes role="slider" with snap points', () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <button [kjBottomSheetTrigger]="sheet" [kjSnapPoints]="['148px', 0.5, 1]">
          Open
        </button>
        <ng-template #sheet>
          <kj-bottom-sheet-overlay>
            <kj-bottom-sheet>
              <kj-bottom-sheet-handle></kj-bottom-sheet-handle>
              <kj-bottom-sheet-header>
                <kj-bottom-sheet-title>T</kj-bottom-sheet-title>
              </kj-bottom-sheet-header>
            </kj-bottom-sheet>
          </kj-bottom-sheet-overlay>
        </ng-template>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    flushRaf();
    fixture.detectChanges();

    const handle = findPanel()!.querySelector<HTMLElement>('kj-bottom-sheet-handle')!;
    expect(handle.getAttribute('role')).toBe('slider');
    expect(handle.getAttribute('aria-valuemax')).toBe('2');
  });

  it('close wrapper dismisses the sheet on click', () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <button [kjBottomSheetTrigger]="sheet">Open</button>
        <ng-template #sheet>
          <kj-bottom-sheet-overlay>
            <kj-bottom-sheet>
              <kj-bottom-sheet-header>
                <kj-bottom-sheet-title>T</kj-bottom-sheet-title>
              </kj-bottom-sheet-header>
              <kj-bottom-sheet-footer>
                <kj-bottom-sheet-close>
                  <button>Close</button>
                </kj-bottom-sheet-close>
              </kj-bottom-sheet-footer>
            </kj-bottom-sheet>
          </kj-bottom-sheet-overlay>
        </ng-template>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    flushRaf();
    fixture.detectChanges();
    expect(findPanel()).not.toBeNull();

    const closeWrapper = findPanel()!.querySelector<HTMLElement>('kj-bottom-sheet-close')!;
    closeWrapper.click();
    flushRaf();
    fixture.detectChanges();
    expect(findPanel()).toBeNull();
  });

  it('emits closed result through kjBottomSheetClosed', () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <button [kjBottomSheetTrigger]="sheet" (kjBottomSheetClosed)="result.set($event)">
          Open
        </button>
        <ng-template #sheet>
          <kj-bottom-sheet-overlay>
            <kj-bottom-sheet #s="kjBottomSheet">
              <kj-bottom-sheet-header>
                <kj-bottom-sheet-title>T</kj-bottom-sheet-title>
              </kj-bottom-sheet-header>
              <kj-bottom-sheet-footer>
                <button id="ok" (click)="s.close('ok')">OK</button>
              </kj-bottom-sheet-footer>
            </kj-bottom-sheet>
          </kj-bottom-sheet-overlay>
        </ng-template>
      `,
    })
    class Host {
      readonly result = signal<unknown>(null);
    }

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    flushRaf();
    fixture.detectChanges();

    findPanel()!.querySelector<HTMLElement>('#ok')!.click();
    flushRaf();
    fixture.detectChanges();
    expect(fixture.componentInstance.result()).toBe('ok');
  });
});
