import { fireEvent, render } from '@testing-library/angular';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  KjAlertDialogTrigger,
  KjAlertDialog,
  KjAlertDialogOverlay,
  KjAlertDialogTitle,
  KjAlertDialogDescription,
  KjAlertDialogAction,
  KjAlertDialogCancel,
} from './alert-dialog';

const imports = [
  KjAlertDialogTrigger,
  KjAlertDialog,
  KjAlertDialogOverlay,
  KjAlertDialogTitle,
  KjAlertDialogDescription,
  KjAlertDialogAction,
  KjAlertDialogCancel,
];

function findContainer(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('[data-kj-alert-dialog-container]');
}

function findPanel(): HTMLElement | null {
  const c = findContainer();
  return c?.querySelector<HTMLElement>('[role="alertdialog"]') ?? null;
}

function cleanupOverlays(): void {
  document.body
    .querySelectorAll<HTMLElement>('[data-kj-alert-dialog-container]')
    .forEach((el) => el.remove());
  document.documentElement.style.overflow = '';
  document.documentElement.style.paddingRight = '';
}

function flushRaf(): void {
  vi.advanceTimersByTime(20);
}

describe('KjAlertDialogTrigger', () => {
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

  it('renders trigger with aria-haspopup="dialog"', async () => {
    const { getByRole } = await render(
      `<button [kjAlertDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjAlertDialogOverlay>
           <div kjAlertDialog>
             <h2 kjAlertDialogTitle>T</h2>
             <p kjAlertDialogDescription>D</p>
             <button kjAlertDialogCancel>Cancel</button>
             <button kjAlertDialogAction>OK</button>
           </div>
         </div>
       </ng-template>`,
      { imports },
    );
    const btn = getByRole('button', { name: 'Open' });
    expect(btn.getAttribute('aria-haspopup')).toBe('dialog');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens panel with role="alertdialog" and aria-modal', async () => {
    const { getByRole } = await render(
      `<button [kjAlertDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjAlertDialogOverlay>
           <div kjAlertDialog>
             <h2 kjAlertDialogTitle>T</h2>
             <p kjAlertDialogDescription>D</p>
             <button kjAlertDialogCancel>Cancel</button>
             <button kjAlertDialogAction>OK</button>
           </div>
         </div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    const panel = findPanel();
    expect(panel).toBeTruthy();
    expect(panel!.getAttribute('aria-modal')).toBe('true');
    expect(panel!.getAttribute('role')).toBe('alertdialog');
  });

  it('wires aria-labelledby and aria-describedby to projected title and description', async () => {
    const { getByRole } = await render(
      `<button [kjAlertDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjAlertDialogOverlay>
           <div kjAlertDialog>
             <h2 kjAlertDialogTitle>Delete?</h2>
             <p kjAlertDialogDescription>Cannot undo.</p>
             <button kjAlertDialogCancel>Cancel</button>
             <button kjAlertDialogAction>Delete</button>
           </div>
         </div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    const panel = findPanel()!;
    const title = panel.querySelector<HTMLElement>('[kjAlertDialogTitle]')!;
    const desc = panel.querySelector<HTMLElement>('[kjAlertDialogDescription]')!;
    expect(panel.getAttribute('aria-labelledby')).toBe(title.id);
    expect(panel.getAttribute('aria-describedby')).toBe(desc.id);
  });

  it('default focus lands on the cancel button', async () => {
    const { getByRole } = await render(
      `<button [kjAlertDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjAlertDialogOverlay>
           <div kjAlertDialog>
             <h2 kjAlertDialogTitle>T</h2>
             <p kjAlertDialogDescription>D</p>
             <button kjAlertDialogCancel>Cancel</button>
             <button kjAlertDialogAction>OK</button>
           </div>
         </div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    const panel = findPanel()!;
    const cancel = panel.querySelector<HTMLElement>('[kjAlertDialogCancel]')!;
    expect(document.activeElement).toBe(cancel);
  });

  it('default focus respects kjAlertDialogDefaultFocus="confirm"', async () => {
    const { getByRole } = await render(
      `<button [kjAlertDialogTrigger]="dlg" kjAlertDialogDefaultFocus="confirm">Open</button>
       <ng-template #dlg>
         <div kjAlertDialogOverlay>
           <div kjAlertDialog>
             <h2 kjAlertDialogTitle>T</h2>
             <p kjAlertDialogDescription>D</p>
             <button kjAlertDialogCancel>Cancel</button>
             <button kjAlertDialogAction>OK</button>
           </div>
         </div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    const panel = findPanel()!;
    const action = panel.querySelector<HTMLElement>('[kjAlertDialogAction]')!;
    expect(document.activeElement).toBe(action);
  });

  it('action button click resolves true and closes', async () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <button [kjAlertDialogTrigger]="dlg" (kjAlertDialogClosed)="result.set($event)">Open</button>
        <ng-template #dlg>
          <div kjAlertDialogOverlay>
            <div kjAlertDialog>
              <h2 kjAlertDialogTitle>T</h2>
              <p kjAlertDialogDescription>D</p>
              <button kjAlertDialogCancel>Cancel</button>
              <button kjAlertDialogAction>Delete</button>
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
    findPanel()!.querySelector<HTMLElement>('[kjAlertDialogAction]')!.click();
    flushRaf();
    fixture.detectChanges();
    expect(fixture.componentInstance.result()).toBe(true);
    expect(findPanel()).toBeNull();
  });

  it('cancel button click resolves false and closes', async () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <button [kjAlertDialogTrigger]="dlg" (kjAlertDialogClosed)="result.set($event)">Open</button>
        <ng-template #dlg>
          <div kjAlertDialogOverlay>
            <div kjAlertDialog>
              <h2 kjAlertDialogTitle>T</h2>
              <p kjAlertDialogDescription>D</p>
              <button kjAlertDialogCancel>Cancel</button>
              <button kjAlertDialogAction>Delete</button>
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
    findPanel()!.querySelector<HTMLElement>('[kjAlertDialogCancel]')!.click();
    flushRaf();
    fixture.detectChanges();
    expect(fixture.componentInstance.result()).toBe(false);
    expect(findPanel()).toBeNull();
  });

  it('Escape closes by default', async () => {
    const { getByRole } = await render(
      `<button [kjAlertDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjAlertDialogOverlay>
           <div kjAlertDialog>
             <h2 kjAlertDialogTitle>T</h2>
             <p kjAlertDialogDescription>D</p>
             <button kjAlertDialogCancel>Cancel</button>
             <button kjAlertDialogAction>OK</button>
           </div>
         </div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    expect(findPanel()).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    flushRaf();
    expect(findPanel()).toBeNull();
  });

  it('outside-click does NOT close by default', async () => {
    const { getByRole } = await render(
      `<button [kjAlertDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjAlertDialogOverlay>
           <div kjAlertDialog>
             <h2 kjAlertDialogTitle>T</h2>
             <p kjAlertDialogDescription>D</p>
             <button kjAlertDialogCancel>Cancel</button>
             <button kjAlertDialogAction>OK</button>
           </div>
         </div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    expect(findPanel()).not.toBeNull();
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    flushRaf();
    expect(findPanel()).not.toBeNull();
  });

  it('outside-click CAN close when kjAlertDialogDismissOnBackdrop="true"', async () => {
    const { getByRole } = await render(
      `<button [kjAlertDialogTrigger]="dlg" [kjAlertDialogDismissOnBackdrop]="true">Open</button>
       <ng-template #dlg>
         <div kjAlertDialogOverlay>
           <div kjAlertDialog>
             <h2 kjAlertDialogTitle>T</h2>
             <p kjAlertDialogDescription>D</p>
             <button kjAlertDialogCancel>Cancel</button>
             <button kjAlertDialogAction>OK</button>
           </div>
         </div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    flushRaf();
    expect(findPanel()).toBeNull();
  });

  it('exposes destructive flag through data-destructive on the panel', async () => {
    const { getByRole } = await render(
      `<button [kjAlertDialogTrigger]="dlg" [kjAlertDialogDestructive]="true">Open</button>
       <ng-template #dlg>
         <div kjAlertDialogOverlay>
           <div kjAlertDialog>
             <h2 kjAlertDialogTitle>T</h2>
             <p kjAlertDialogDescription>D</p>
             <button kjAlertDialogCancel>Cancel</button>
             <button kjAlertDialogAction>OK</button>
           </div>
         </div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    const panel = findPanel()!;
    expect(panel.hasAttribute('data-destructive')).toBe(true);
    const action = panel.querySelector<HTMLElement>('[kjAlertDialogAction]')!;
    expect(action.hasAttribute('data-destructive')).toBe(true);
  });

  it('focus trap: Tab cycles within the panel', async () => {
    const { getByRole } = await render(
      `<button [kjAlertDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjAlertDialogOverlay>
           <div kjAlertDialog>
             <h2 kjAlertDialogTitle>T</h2>
             <p kjAlertDialogDescription>D</p>
             <button kjAlertDialogCancel>Cancel</button>
             <button kjAlertDialogAction>OK</button>
           </div>
         </div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    const panel = findPanel()!;
    const cancel = panel.querySelector<HTMLElement>('[kjAlertDialogCancel]')!;
    const action = panel.querySelector<HTMLElement>('[kjAlertDialogAction]')!;

    action.focus();
    fireEvent.keyDown(panel, { key: 'Tab' });
    expect(document.activeElement).toBe(cancel);

    fireEvent.keyDown(panel, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(action);
  });

  it('restores focus to the trigger on close', async () => {
    const { getByRole } = await render(
      `<button [kjAlertDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjAlertDialogOverlay>
           <div kjAlertDialog>
             <h2 kjAlertDialogTitle>T</h2>
             <p kjAlertDialogDescription>D</p>
             <button kjAlertDialogCancel>Cancel</button>
             <button kjAlertDialogAction>OK</button>
           </div>
         </div>
       </ng-template>`,
      { imports },
    );
    const trigger = getByRole('button', { name: 'Open' });
    trigger.focus();
    fireEvent.click(trigger);
    flushRaf();
    findPanel()!.querySelector<HTMLElement>('[kjAlertDialogCancel]')!.click();
    flushRaf();
    expect(findPanel()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
