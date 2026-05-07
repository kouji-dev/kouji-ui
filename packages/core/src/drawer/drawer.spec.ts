import { fireEvent, render } from '@testing-library/angular';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  KjDrawerTrigger,
  KjDrawerContent,
  KjDrawerTitle,
  KjDrawerDescription,
  KjDrawerClose,
} from './drawer';

const imports = [
  KjDrawerTrigger,
  KjDrawerContent,
  KjDrawerTitle,
  KjDrawerDescription,
  KjDrawerClose,
];

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

describe('KjDrawerTrigger (declarative path)', () => {
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
      `<button [kjDrawerTrigger]="dwr">Open</button>
       <ng-template #dwr>
         <div kjDrawerContent><h2 kjDrawerTitle>T</h2></div>
       </ng-template>`,
      { imports },
    );
    const btn = getByRole('button', { name: 'Open' });
    expect(btn).toHaveAttribute('aria-haspopup', 'dialog');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens drawer and mounts content in document.body on click', async () => {
    const { getByRole } = await render(
      `<button [kjDrawerTrigger]="dwr">Open</button>
       <ng-template #dwr>
         <div kjDrawerContent><h2 kjDrawerTitle>My Drawer</h2></div>
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
    expect(panel!.getAttribute('role')).toBe('dialog');
    expect(panel!.getAttribute('aria-modal')).toBe('true');
  });

  it('reflects kjSide on the panel as data-kj-side', async () => {
    const { getByRole } = await render(
      `<button [kjDrawerTrigger]="dwr" kjSide="left">Open</button>
       <ng-template #dwr>
         <div kjDrawerContent><h2 kjDrawerTitle>T</h2></div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    const panel = findPanel()!;
    expect(panel.getAttribute('data-kj-side')).toBe('left');
  });

  it('defaults kjSide to "right"', async () => {
    const { getByRole } = await render(
      `<button [kjDrawerTrigger]="dwr">Open</button>
       <ng-template #dwr>
         <div kjDrawerContent><h2 kjDrawerTitle>T</h2></div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    const panel = findPanel()!;
    expect(panel.getAttribute('data-kj-side')).toBe('right');
  });

  it('auto-wires aria-labelledby to the projected [kjDrawerTitle]', async () => {
    const { getByRole } = await render(
      `<button [kjDrawerTrigger]="dwr">Open</button>
       <ng-template #dwr>
         <div kjDrawerContent><h2 kjDrawerTitle>Settings</h2></div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    const panel = findPanel()!;
    const title = panel.querySelector<HTMLElement>('[kjDrawerTitle]')!;
    expect(title.id).toMatch(/^kj-drawer-title-\d+$/);
    expect(panel.getAttribute('aria-labelledby')).toBe(title.id);
  });

  it('auto-wires aria-describedby to the projected [kjDrawerDescription]', async () => {
    const { getByRole } = await render(
      `<button [kjDrawerTrigger]="dwr">Open</button>
       <ng-template #dwr>
         <div kjDrawerContent>
           <h2 kjDrawerTitle>T</h2>
           <p kjDrawerDescription>Long-form description.</p>
         </div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    const panel = findPanel()!;
    const desc = panel.querySelector<HTMLElement>('[kjDrawerDescription]')!;
    expect(desc.id).toMatch(/^kj-drawer-description-\d+$/);
    expect(panel.getAttribute('aria-describedby')).toBe(desc.id);
  });

  it('Escape closes when modal', async () => {
    const { getByRole } = await render(
      `<button [kjDrawerTrigger]="dwr">Open</button>
       <ng-template #dwr>
         <div kjDrawerContent><h2 kjDrawerTitle>T</h2></div>
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
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('Escape does not close when kjCloseOnEscape is false', async () => {
    const { getByRole } = await render(
      `<button [kjDrawerTrigger]="dwr" [kjCloseOnEscape]="false">Open</button>
       <ng-template #dwr>
         <div kjDrawerContent><h2 kjDrawerTitle>T</h2></div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    flushRaf();
    expect(findPanel()).not.toBeNull();
  });

  it('outside-click closes when modal', async () => {
    const { getByRole } = await render(
      `<button [kjDrawerTrigger]="dwr">Open</button>
       <ng-template #dwr>
         <div kjDrawerContent><h2 kjDrawerTitle>T</h2></div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    expect(findPanel()).not.toBeNull();
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    flushRaf();
    expect(findPanel()).toBeNull();
  });

  it('locks <body> scroll while open and releases on close', async () => {
    const { getByRole } = await render(
      `<button [kjDrawerTrigger]="dwr">Open</button>
       <ng-template #dwr>
         <div kjDrawerContent><h2 kjDrawerTitle>T</h2></div>
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

  it('does not lock <body> scroll when kjScrollLock is false', async () => {
    const { getByRole } = await render(
      `<button [kjDrawerTrigger]="dwr" [kjScrollLock]="false">Open</button>
       <ng-template #dwr>
         <div kjDrawerContent><h2 kjDrawerTitle>T</h2></div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('non-modal drawer uses role="region" and skips backdrop close paths', async () => {
    const { getByRole } = await render(
      `<button [kjDrawerTrigger]="dwr" [kjModal]="false">Open</button>
       <ng-template #dwr>
         <div kjDrawerContent><h2 kjDrawerTitle>T</h2></div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    const panel = findPanel()!;
    expect(panel.getAttribute('role')).toBe('region');
    expect(panel.getAttribute('aria-modal')).toBeNull();
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    flushRaf();
    expect(findPanel()).not.toBeNull();
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('[kjDrawerClose] closes the drawer', async () => {
    const { getByRole } = await render(
      `<button [kjDrawerTrigger]="dwr">Open</button>
       <ng-template #dwr>
         <div kjDrawerContent>
           <h2 kjDrawerTitle>T</h2>
           <button kjDrawerClose>Close</button>
         </div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    expect(findPanel()).not.toBeNull();
    const closeBtn = Array.from(document.body.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.trim() === 'Close')!;
    fireEvent.click(closeBtn);
    flushRaf();
    expect(findPanel()).toBeNull();
  });

  it('cancellable close cycle vetoes via preventDefault', async () => {
    const onClose = vi.fn((ev: { preventDefault: () => void }) => {
      ev.preventDefault();
    });
    const { getByRole } = await render(
      `<button [kjDrawerTrigger]="dwr" (kjCloseRequested)="onClose($event)">Open</button>
       <ng-template #dwr>
         <div kjDrawerContent><h2 kjDrawerTitle>T</h2></div>
       </ng-template>`,
      { imports, componentProperties: { onClose } as Record<string, unknown> },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    flushRaf();
    expect(onClose).toHaveBeenCalled();
    expect(findPanel()).not.toBeNull();
  });

  it('emits (kjDrawerClosed) with the result payload', async () => {
    const onClosed = vi.fn();
    const { getByRole } = await render(
      `<button [kjDrawerTrigger]="dwr" (kjDrawerClosed)="onClosed($event)">Open</button>
       <ng-template #dwr>
         <div kjDrawerContent #d="kjDrawerContent">
           <h2 kjDrawerTitle>T</h2>
           <button (click)="d.close('ok')">OK</button>
         </div>
       </ng-template>`,
      { imports, componentProperties: { onClosed } as Record<string, unknown> },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    const okBtn = Array.from(document.body.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.trim() === 'OK')!;
    fireEvent.click(okBtn);
    flushRaf();
    expect(onClosed).toHaveBeenCalledWith('ok');
  });
});
