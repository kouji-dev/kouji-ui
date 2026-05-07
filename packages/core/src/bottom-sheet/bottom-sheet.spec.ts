import { fireEvent, render } from '@testing-library/angular';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  KjBottomSheetTrigger,
  KjBottomSheetContent,
  KjBottomSheetOverlay,
  KjBottomSheetTitle,
  KjBottomSheetDescription,
  KjBottomSheetClose,
  KjBottomSheetHandle,
} from './bottom-sheet';

const imports = [
  KjBottomSheetTrigger,
  KjBottomSheetContent,
  KjBottomSheetOverlay,
  KjBottomSheetTitle,
  KjBottomSheetDescription,
  KjBottomSheetClose,
  KjBottomSheetHandle,
];

function findContainer(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('[data-kj-bottom-sheet-container]');
}

function findPanel(): HTMLElement | null {
  const c = findContainer();
  return c?.querySelector<HTMLElement>('[role="dialog"]') ?? null;
}

function cleanupOverlays(): void {
  document.body
    .querySelectorAll<HTMLElement>('[data-kj-bottom-sheet-container]')
    .forEach((el) => el.remove());
  document.documentElement.style.overflow = '';
  document.documentElement.style.paddingRight = '';
}

function flushRaf(): void {
  vi.advanceTimersByTime(20);
}

describe('KjBottomSheetTrigger (declarative path)', () => {
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

  it('renders trigger button with aria-haspopup="dialog"', async () => {
    const { getByRole } = await render(
      `<button [kjBottomSheetTrigger]="sheet">Open</button>
       <ng-template #sheet>
         <div kjBottomSheetOverlay>
           <div kjBottomSheetContent><h2 kjBottomSheetTitle>T</h2></div>
         </div>
       </ng-template>`,
      { imports },
    );
    const btn = getByRole('button', { name: 'Open' });
    expect(btn).toHaveAttribute('aria-haspopup', 'dialog');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens the sheet and mounts content in document.body on click', async () => {
    const { getByRole } = await render(
      `<button [kjBottomSheetTrigger]="sheet">Open</button>
       <ng-template #sheet>
         <div kjBottomSheetOverlay>
           <div kjBottomSheetContent><h2 kjBottomSheetTitle>My sheet</h2></div>
         </div>
       </ng-template>`,
      { imports },
    );
    const trigger = getByRole('button', { name: 'Open' });
    fireEvent.click(trigger);
    flushRaf();
    expect(findContainer()).toBeTruthy();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const panel = findPanel();
    expect(panel).toBeTruthy();
    expect(panel!.getAttribute('aria-modal')).toBe('true');
    expect(panel!.getAttribute('data-kj-placement')).toBe('bottom');
  });

  it('auto-wires aria-labelledby and aria-describedby', async () => {
    const { getByRole } = await render(
      `<button [kjBottomSheetTrigger]="sheet">Open</button>
       <ng-template #sheet>
         <div kjBottomSheetOverlay>
           <div kjBottomSheetContent>
             <h2 kjBottomSheetTitle>Title</h2>
             <p kjBottomSheetDescription>Desc</p>
           </div>
         </div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    const panel = findPanel()!;
    const title = panel.querySelector<HTMLElement>('[kjBottomSheetTitle]')!;
    const desc = panel.querySelector<HTMLElement>('[kjBottomSheetDescription]')!;
    expect(panel.getAttribute('aria-labelledby')).toBe(title.id);
    expect(panel.getAttribute('aria-describedby')).toBe(desc.id);
  });

  it('Escape closes via the overlay-stack coordinator', async () => {
    const { getByRole } = await render(
      `<button [kjBottomSheetTrigger]="sheet">Open</button>
       <ng-template #sheet>
         <div kjBottomSheetOverlay>
           <div kjBottomSheetContent><h2 kjBottomSheetTitle>T</h2></div>
         </div>
       </ng-template>`,
      { imports },
    );
    const trigger = getByRole('button', { name: 'Open' });
    fireEvent.click(trigger);
    flushRaf();
    expect(findPanel()).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    flushRaf();
    expect(findPanel()).toBeNull();
  });

  it('locks <body> scroll while open and releases on close', async () => {
    const { getByRole } = await render(
      `<button [kjBottomSheetTrigger]="sheet">Open</button>
       <ng-template #sheet>
         <div kjBottomSheetOverlay>
           <div kjBottomSheetContent><h2 kjBottomSheetTitle>T</h2></div>
         </div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    expect(document.documentElement.style.overflow).toBe('hidden');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    flushRaf();
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('restores focus to the trigger on close', async () => {
    const { getByRole } = await render(
      `<button [kjBottomSheetTrigger]="sheet">Open</button>
       <ng-template #sheet>
         <div kjBottomSheetOverlay>
           <div kjBottomSheetContent>
             <h2 kjBottomSheetTitle>T</h2>
             <button kjBottomSheetClose>Done</button>
           </div>
         </div>
       </ng-template>`,
      { imports },
    );
    const trigger = getByRole('button', { name: 'Open' });
    trigger.focus();
    fireEvent.click(trigger);
    flushRaf();
    findPanel()!.querySelector<HTMLElement>('[kjBottomSheetClose]')!.click();
    flushRaf();
    expect(findPanel()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('emits kjBottomSheetClosed with the result payload', async () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <button [kjBottomSheetTrigger]="sheet" (kjBottomSheetClosed)="result.set($event)">Open</button>
        <ng-template #sheet>
          <div kjBottomSheetOverlay>
            <div kjBottomSheetContent #s="kjBottomSheet">
              <h2 kjBottomSheetTitle>T</h2>
              <button id="confirm" (click)="s.close('confirmed')">Confirm</button>
            </div>
          </div>
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
    findPanel()!.querySelector<HTMLElement>('#confirm')!.click();
    flushRaf();
    fixture.detectChanges();
    expect(fixture.componentInstance.result()).toBe('confirmed');
  });

  it('reflects data-kj-snap-index when snap points are configured', async () => {
    const { getByRole } = await render(
      `<button
         [kjBottomSheetTrigger]="sheet"
         [kjSnapPoints]="['148px', 0.5, 1]">
         Open
       </button>
       <ng-template #sheet>
         <div kjBottomSheetOverlay>
           <div kjBottomSheetContent>
             <h2 kjBottomSheetTitle>T</h2>
             <div kjBottomSheetHandle></div>
           </div>
         </div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    const panel = findPanel()!;
    // Defaults to fullest snap index: snapPoints.length - 1 = 2.
    expect(panel.getAttribute('data-kj-snap-index')).toBe('2');
    expect(panel.getAttribute('data-kj-snap-count')).toBe('3');
  });

  it('handle exposes role="slider" with aria-valuenow/min/max when snap points are set', async () => {
    const { getByRole } = await render(
      `<button
         [kjBottomSheetTrigger]="sheet"
         [kjSnapPoints]="['148px', 0.5, 1]"
         [kjSnapLabels]="['Peek', 'Half', 'Full']">
         Open
       </button>
       <ng-template #sheet>
         <div kjBottomSheetOverlay>
           <div kjBottomSheetContent>
             <h2 kjBottomSheetTitle>T</h2>
             <div kjBottomSheetHandle id="handle"></div>
           </div>
         </div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    const handle = findPanel()!.querySelector<HTMLElement>('#handle')!;
    expect(handle.getAttribute('role')).toBe('slider');
    expect(handle.getAttribute('aria-orientation')).toBe('vertical');
    expect(handle.getAttribute('aria-valuemin')).toBe('0');
    expect(handle.getAttribute('aria-valuemax')).toBe('2');
    expect(handle.getAttribute('aria-valuenow')).toBe('2');
    expect(handle.getAttribute('aria-valuetext')).toBe('Full');
    expect(handle.getAttribute('tabindex')).toBe('0');
  });

  it('ArrowDown on the handle steps through snaps and dismisses at index 0', async () => {
    const { getByRole } = await render(
      `<button
         [kjBottomSheetTrigger]="sheet"
         [kjSnapPoints]="['148px', 0.5, 1]">
         Open
       </button>
       <ng-template #sheet>
         <div kjBottomSheetOverlay>
           <div kjBottomSheetContent>
             <h2 kjBottomSheetTitle>T</h2>
             <div kjBottomSheetHandle id="handle"></div>
           </div>
         </div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    const handle = findPanel()!.querySelector<HTMLElement>('#handle')!;
    expect(handle.getAttribute('aria-valuenow')).toBe('2');

    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    flushRaf();
    expect(handle.getAttribute('aria-valuenow')).toBe('1');
    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    flushRaf();
    expect(handle.getAttribute('aria-valuenow')).toBe('0');
    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    flushRaf();
    // At index 0, ArrowDown dismisses the sheet.
    expect(findPanel()).toBeNull();
  });

  it('ArrowUp clamps at the largest snap and Home/End jump to bounds', async () => {
    const { getByRole } = await render(
      `<button
         [kjBottomSheetTrigger]="sheet"
         [kjSnapPoints]="['148px', 0.5, 1]">
         Open
       </button>
       <ng-template #sheet>
         <div kjBottomSheetOverlay>
           <div kjBottomSheetContent>
             <h2 kjBottomSheetTitle>T</h2>
             <div kjBottomSheetHandle id="handle"></div>
           </div>
         </div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    const handle = findPanel()!.querySelector<HTMLElement>('#handle')!;

    fireEvent.keyDown(handle, { key: 'Home' });
    flushRaf();
    expect(handle.getAttribute('aria-valuenow')).toBe('0');
    fireEvent.keyDown(handle, { key: 'End' });
    flushRaf();
    expect(handle.getAttribute('aria-valuenow')).toBe('2');
    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    flushRaf();
    // Clamped at the largest snap.
    expect(handle.getAttribute('aria-valuenow')).toBe('2');
  });

  it('handle degrades to role="button" when snap points are empty', async () => {
    const { getByRole } = await render(
      `<button [kjBottomSheetTrigger]="sheet">Open</button>
       <ng-template #sheet>
         <div kjBottomSheetOverlay>
           <div kjBottomSheetContent>
             <h2 kjBottomSheetTitle>T</h2>
             <div kjBottomSheetHandle id="handle"></div>
           </div>
         </div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    const handle = findPanel()!.querySelector<HTMLElement>('#handle')!;
    expect(handle.getAttribute('role')).toBe('button');
    expect(handle.getAttribute('aria-orientation')).toBeNull();
    expect(handle.getAttribute('aria-valuenow')).toBeNull();
  });

  it('disabled handle removes itself from the tab order', async () => {
    const { getByRole } = await render(
      `<button
         [kjBottomSheetTrigger]="sheet"
         [kjSnapPoints]="['148px', 1]">
         Open
       </button>
       <ng-template #sheet>
         <div kjBottomSheetOverlay>
           <div kjBottomSheetContent>
             <h2 kjBottomSheetTitle>T</h2>
             <div kjBottomSheetHandle [kjDisabled]="true" id="handle"></div>
           </div>
         </div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    const handle = findPanel()!.querySelector<HTMLElement>('#handle')!;
    expect(handle.getAttribute('tabindex')).toBe('-1');
    expect(handle.getAttribute('aria-disabled')).toBe('true');
  });

  it('cancellable close: kjCloseRequested.preventDefault() keeps the sheet open', async () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <button [kjBottomSheetTrigger]="sheet" (kjCloseRequested)="onCloseRequested($event)">
          Open
        </button>
        <ng-template #sheet>
          <div kjBottomSheetOverlay>
            <div kjBottomSheetContent>
              <h2 kjBottomSheetTitle>T</h2>
              <button kjBottomSheetClose>Done</button>
            </div>
          </div>
        </ng-template>
      `,
    })
    class Host {
      readonly veto = signal(true);
      onCloseRequested(ev: { preventDefault(): void }): void {
        if (this.veto()) ev.preventDefault();
      }
    }

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    flushRaf();
    fixture.detectChanges();
    expect(findPanel()).not.toBeNull();

    findPanel()!.querySelector<HTMLElement>('[kjBottomSheetClose]')!.click();
    flushRaf();
    fixture.detectChanges();
    expect(findPanel()).not.toBeNull();

    fixture.componentInstance.veto.set(false);
    findPanel()!.querySelector<HTMLElement>('[kjBottomSheetClose]')!.click();
    flushRaf();
    fixture.detectChanges();
    expect(findPanel()).toBeNull();
  });
});
