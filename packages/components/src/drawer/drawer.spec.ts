import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { KjDrawerTrigger } from '@kouji-ui/core';

import {
  KjDrawerComponent,
  KjDrawerHeaderComponent,
  KjDrawerTitleComponent,
  KjDrawerDescriptionComponent,
  KjDrawerBodyComponent,
  KjDrawerFooterComponent,
  KjDrawerCloseComponent,
} from './drawer';

function findContainer(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('[data-kj-drawer-container]');
}

function findPanel(): HTMLElement | null {
  const c = findContainer();
  return (
    c?.querySelector<HTMLElement>('[role="dialog"]')
    ?? c?.querySelector<HTMLElement>('[role="region"]')
    ?? null
  );
}

function cleanupOverlays(): void {
  document.body
    .querySelectorAll<HTMLElement>('[data-kj-drawer-container]')
    .forEach((el) => el.remove());
  document.documentElement.style.overflow = '';
  document.documentElement.style.paddingRight = '';
}

function flushRaf(): void {
  vi.advanceTimersByTime(20);
}

describe('KjDrawerComponent (wrapper)', () => {
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

  test('renders styled wrapper with role=dialog when modal', () => {
    @Component({
      standalone: true,
      imports: [
        KjDrawerTrigger,
        KjDrawerComponent,
        KjDrawerHeaderComponent,
        KjDrawerTitleComponent,
        KjDrawerBodyComponent,
        KjDrawerFooterComponent,
      ],
      template: `
        <button [kjDrawerTrigger]="dwr">Open</button>
        <ng-template #dwr>
          <kj-drawer #d="kjDrawerContent">
            <kj-drawer-header>
              <kj-drawer-title>Hello</kj-drawer-title>
            </kj-drawer-header>
            <kj-drawer-body>Body</kj-drawer-body>
            <kj-drawer-footer>
              <button (click)="d.close()">Close</button>
            </kj-drawer-footer>
          </kj-drawer>
        </ng-template>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();
    flushRaf();

    const panel = findPanel();
    expect(panel).toBeTruthy();
    expect(panel!.classList.contains('kj-drawer')).toBe(true);
    expect(panel!.getAttribute('role')).toBe('dialog');
    expect(panel!.getAttribute('aria-modal')).toBe('true');
    expect(panel!.getAttribute('data-kj-side')).toBe('right');

    expect(panel!.querySelector('.kj-drawer-header')).toBeTruthy();
    expect(panel!.querySelector('.kj-drawer-title')).toBeTruthy();
    expect(panel!.querySelector('.kj-drawer-body')).toBeTruthy();
    expect(panel!.querySelector('.kj-drawer-footer')).toBeTruthy();
  });

  test('aria-labelledby is wired through the wrapper title', () => {
    @Component({
      standalone: true,
      imports: [
        KjDrawerTrigger,
        KjDrawerComponent,
        KjDrawerHeaderComponent,
        KjDrawerTitleComponent,
        KjDrawerDescriptionComponent,
        KjDrawerBodyComponent,
      ],
      template: `
        <button [kjDrawerTrigger]="dwr">Open</button>
        <ng-template #dwr>
          <kj-drawer>
            <kj-drawer-header>
              <kj-drawer-title>Settings</kj-drawer-title>
            </kj-drawer-header>
            <kj-drawer-body>
              <kj-drawer-description>Tweak the knobs.</kj-drawer-description>
            </kj-drawer-body>
          </kj-drawer>
        </ng-template>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    flushRaf();

    const panel = findPanel()!;
    const title = panel.querySelector<HTMLElement>('.kj-drawer-title')!;
    const desc = panel.querySelector<HTMLElement>('.kj-drawer-description')!;
    expect(title.id).toMatch(/^kj-drawer-title-\d+$/);
    expect(desc.id).toMatch(/^kj-drawer-description-\d+$/);
    expect(panel.getAttribute('aria-labelledby')).toBe(title.id);
    expect(panel.getAttribute('aria-describedby')).toBe(desc.id);
  });

  test('kjDrawerClose component closes the drawer', () => {
    @Component({
      standalone: true,
      imports: [
        KjDrawerTrigger,
        KjDrawerComponent,
        KjDrawerTitleComponent,
        KjDrawerCloseComponent,
      ],
      template: `
        <button [kjDrawerTrigger]="dwr">Open</button>
        <ng-template #dwr>
          <kj-drawer>
            <kj-drawer-title>T</kj-drawer-title>
            <kj-drawer-close>
              <button>Dismiss</button>
            </kj-drawer-close>
          </kj-drawer>
        </ng-template>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    flushRaf();
    expect(findPanel()).toBeTruthy();

    const dismiss = Array.from(document.querySelectorAll<HTMLElement>('button'))
      .find((b) => b.textContent?.trim() === 'Dismiss')!;
    dismiss.click();
    fixture.detectChanges();
    flushRaf();
    expect(findPanel()).toBeNull();
  });

  test('non-modal wrapper exposes role=region and skips backdrop close', () => {
    @Component({
      standalone: true,
      imports: [
        KjDrawerTrigger,
        KjDrawerComponent,
        KjDrawerTitleComponent,
        KjDrawerBodyComponent,
      ],
      template: `
        <button [kjDrawerTrigger]="dwr" [kjModal]="false">Open</button>
        <ng-template #dwr>
          <kj-drawer>
            <kj-drawer-title>Non-modal</kj-drawer-title>
            <kj-drawer-body>Body</kj-drawer-body>
          </kj-drawer>
        </ng-template>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    flushRaf();

    const panel = findPanel();
    expect(panel).toBeTruthy();
    expect(panel!.getAttribute('role')).toBe('region');
    expect(panel!.getAttribute('aria-modal')).toBeNull();
    expect(document.documentElement.style.overflow).toBe('');
  });
});
