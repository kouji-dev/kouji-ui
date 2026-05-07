import { fireEvent, render } from '@testing-library/angular';
import { Component, signal, ViewChild, TemplateRef, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';

import {
  KjDialogTrigger, KjDialog, KjDialogOverlay,
  KjDialogTitle, KjDialogClose, KjDialogDescription,
  KjDialogContent, KjDialogActions,
} from './dialog';
import {
  KjDialogService,
  DIALOG_DATA,
} from './dialog.service';
import type { KjDialogCloseEvent } from './dialog.context';

expect.extend(toHaveNoViolations);

const imports = [
  KjDialogTrigger, KjDialog, KjDialogOverlay,
  KjDialogTitle, KjDialogClose, KjDialogDescription,
  KjDialogContent, KjDialogActions,
];

function findContainer(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('[data-kj-dialog-container]');
}

function findPanel(): HTMLElement | null {
  const c = findContainer();
  return c?.querySelector<HTMLElement>('[role="dialog"]') ?? null;
}

function cleanupOverlays(): void {
  document.body
    .querySelectorAll<HTMLElement>('[data-kj-dialog-container]')
    .forEach((el) => el.remove());
  // Reset any scroll-lock side-effects in case a test was interrupted.
  document.documentElement.style.overflow = '';
  document.documentElement.style.paddingRight = '';
}

function flushRaf(): void {
  // jsdom + vi fake timers — flush pending rAF / setTimeout(0) callbacks.
  vi.advanceTimersByTime(20);
}

describe('KjDialogTrigger (declarative path)', () => {
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

  it('renders trigger button', async () => {
    const { getByRole } = await render(
      `<button [kjDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjDialogOverlay><div kjDialog><h2 kjDialogTitle>T</h2></div></div>
       </ng-template>`,
      { imports },
    );
    expect(getByRole('button', { name: 'Open' })).toBeInTheDocument();
  });

  it('trigger has aria-haspopup="dialog" and aria-expanded="false" initially', async () => {
    const { getByRole } = await render(
      `<button [kjDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjDialogOverlay><div kjDialog><h2 kjDialogTitle>T</h2></div></div>
       </ng-template>`,
      { imports },
    );
    const btn = getByRole('button', { name: 'Open' });
    expect(btn).toHaveAttribute('aria-haspopup', 'dialog');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens dialog and mounts content in document.body on click', async () => {
    const { getByRole } = await render(
      `<button [kjDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjDialogOverlay>
           <div kjDialog><h2 kjDialogTitle>My Dialog</h2></div>
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
  });

  it('auto-wires aria-labelledby to the projected [kjDialogTitle]', async () => {
    const { getByRole } = await render(
      `<button [kjDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjDialogOverlay>
           <div kjDialog><h2 kjDialogTitle>Settings</h2></div>
         </div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    const panel = findPanel()!;
    const title = panel.querySelector<HTMLElement>('[kjDialogTitle]')!;
    expect(title.id).toMatch(/^kj-dialog-title-\d+$/);
    expect(panel.getAttribute('aria-labelledby')).toBe(title.id);
  });

  it('auto-wires aria-describedby to the projected [kjDialogDescription]', async () => {
    const { getByRole } = await render(
      `<button [kjDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjDialogOverlay>
           <div kjDialog>
             <h2 kjDialogTitle>T</h2>
             <p kjDialogDescription>Long-form description.</p>
           </div>
         </div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    const panel = findPanel()!;
    const desc = panel.querySelector<HTMLElement>('[kjDialogDescription]')!;
    expect(desc.id).toMatch(/^kj-dialog-description-\d+$/);
    expect(panel.getAttribute('aria-describedby')).toBe(desc.id);
  });

  it('Escape closes via the overlay-stack coordinator', async () => {
    const { getByRole } = await render(
      `<button [kjDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjDialogOverlay><div kjDialog><h2 kjDialogTitle>T</h2></div></div>
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

  it('Escape does not close when kjDialogCloseOnEscape="false"', async () => {
    const { getByRole } = await render(
      `<button [kjDialogTrigger]="dlg" [kjDialogCloseOnEscape]="false">Open</button>
       <ng-template #dlg>
         <div kjDialogOverlay><div kjDialog><h2 kjDialogTitle>T</h2></div></div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    flushRaf();
    expect(findPanel()).not.toBeNull();
  });

  it('outside-click closes via the overlay-stack coordinator', async () => {
    const { getByRole } = await render(
      `<button [kjDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjDialogOverlay>
           <div kjDialog><h2 kjDialogTitle>T</h2></div>
         </div>
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
      `<button [kjDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjDialogOverlay><div kjDialog><h2 kjDialogTitle>T</h2></div></div>
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

  it('does not lock <body> scroll when kjDialogScrollLock="false"', async () => {
    const { getByRole } = await render(
      `<button [kjDialogTrigger]="dlg" [kjDialogScrollLock]="false">Open</button>
       <ng-template #dlg>
         <div kjDialogOverlay><div kjDialog><h2 kjDialogTitle>T</h2></div></div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('restores focus to the trigger on close', async () => {
    const { getByRole } = await render(
      `<button [kjDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjDialogOverlay>
           <div kjDialog>
             <h2 kjDialogTitle>T</h2>
             <button kjDialogClose>Done</button>
           </div>
         </div>
       </ng-template>`,
      { imports },
    );
    const trigger = getByRole('button', { name: 'Open' });
    trigger.focus();
    fireEvent.click(trigger);
    flushRaf();
    expect(findPanel()).not.toBeNull();
    findPanel()!.querySelector<HTMLElement>('[kjDialogClose]')!.click();
    flushRaf();
    expect(findPanel()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('cancellable close: kjCloseRequested.preventDefault() keeps the dialog open', async () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <button [kjDialogTrigger]="dlg" (kjCloseRequested)="onCloseRequested($event)">Open</button>
        <ng-template #dlg>
          <div kjDialogOverlay>
            <div kjDialog>
              <h2 kjDialogTitle>T</h2>
              <button kjDialogClose>Done</button>
            </div>
          </div>
        </ng-template>
      `,
    })
    class Host {
      readonly captured = signal<KjDialogCloseEvent | null>(null);
      readonly preventNext = signal(true);
      onCloseRequested(ev: KjDialogCloseEvent): void {
        this.captured.set(ev);
        if (this.preventNext()) ev.preventDefault();
      }
    }

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector('button')!;
    trigger.click();
    flushRaf();
    fixture.detectChanges();
    expect(findPanel()).not.toBeNull();

    findPanel()!.querySelector<HTMLElement>('[kjDialogClose]')!.click();
    flushRaf();
    fixture.detectChanges();
    const ev = fixture.componentInstance.captured();
    expect(ev?.reason).toBe('close-button');
    expect(ev?.defaultPrevented).toBe(true);
    expect(findPanel()).not.toBeNull();

    fixture.componentInstance.preventNext.set(false);
    findPanel()!.querySelector<HTMLElement>('[kjDialogClose]')!.click();
    flushRaf();
    fixture.detectChanges();
    expect(findPanel()).toBeNull();
  });

  it('focus trap: Tab cycles within the panel', async () => {
    const { getByRole } = await render(
      `<button [kjDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjDialogOverlay>
           <div kjDialog>
             <h2 kjDialogTitle>T</h2>
             <button id="first">First</button>
             <button id="middle">Middle</button>
             <button id="last">Last</button>
           </div>
         </div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    flushRaf();
    const panel = findPanel()!;
    const first = panel.querySelector<HTMLElement>('#first')!;
    const last = panel.querySelector<HTMLElement>('#last')!;

    last.focus();
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(panel, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(panel, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('emits kjDialogClosed with the result payload', async () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <button [kjDialogTrigger]="dlg" (kjDialogClosed)="result.set($event)">Open</button>
        <ng-template #dlg>
          <div kjDialogOverlay>
            <div kjDialog #d="kjDialog">
              <h2 kjDialogTitle>T</h2>
              <button id="confirm" (click)="d.close('confirmed')">Confirm</button>
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

  it('passes axe audit on trigger', async () => {
    vi.useRealTimers();
    const { container } = await render(
      `<button [kjDialogTrigger]="dlg">Open dialog</button>
       <ng-template #dlg>
         <div kjDialogOverlay><div kjDialog><h2 kjDialogTitle>Settings</h2></div></div>
       </ng-template>`,
      { imports },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('KjDialogService (programmatic path)', () => {
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

  it('opens a component and emits result via afterClosed', () => {
    @Component({
      standalone: true,
      imports: [KjDialog, KjDialogTitle, KjDialogClose],
      template: `
        <div kjDialog #d="kjDialog">
          <h2 kjDialogTitle>Confirm</h2>
          <button id="ok" (click)="d.close('ok')">OK</button>
        </div>
      `,
    })
    class MyDialog {}

    @Component({ standalone: true, template: '' })
    class Host {
      readonly svc = inject(KjDialogService);
    }

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const result = signal<unknown>(undefined);
    const ref = fixture.componentInstance.svc.open(MyDialog);
    ref.afterClosed((r) => result.set(r));
    flushRaf();

    const panel = findPanel()!;
    expect(panel).toBeTruthy();
    expect(panel.getAttribute('aria-labelledby')).toMatch(/^kj-dialog-title-\d+$/);

    panel.querySelector<HTMLElement>('#ok')!.click();
    flushRaf();
    expect(result()).toBe('ok');
    expect(findPanel()).toBeNull();
  });

  it('injects DIALOG_DATA into the component', () => {
    @Component({
      standalone: true,
      imports: [KjDialog, KjDialogTitle],
      template: `<div kjDialog><h2 kjDialogTitle>{{ data.label }}</h2></div>`,
    })
    class MyDialog {
      readonly data = inject<{ label: string }>(DIALOG_DATA);
    }

    @Component({ standalone: true, template: '' })
    class Host {
      readonly svc = inject(KjDialogService);
    }

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.componentInstance.svc.open(MyDialog, { data: { label: 'Greetings' } });
    flushRaf();
    expect(findPanel()!.textContent).toContain('Greetings');
  });

  it('opens a TemplateRef with DIALOG_DATA injection', () => {
    @Component({
      standalone: true,
      imports: [KjDialog, KjDialogTitle],
      template: `
        <ng-template #tpl>
          <div kjDialog><h2 kjDialogTitle>From template</h2></div>
        </ng-template>
      `,
    })
    class Host {
      readonly svc = inject(KjDialogService);
      @ViewChild('tpl', { read: TemplateRef, static: true })
      tpl!: TemplateRef<unknown>;
    }

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.componentInstance.svc.open(fixture.componentInstance.tpl);
    flushRaf();
    expect(findPanel()!.textContent).toContain('From template');
  });

  it('disableClose suppresses Escape and outside-click', () => {
    @Component({
      standalone: true,
      imports: [KjDialog, KjDialogTitle],
      template: `<div kjDialog><h2 kjDialogTitle>Saving…</h2></div>`,
    })
    class MyDialog {}

    @Component({ standalone: true, template: '' })
    class Host {
      readonly svc = inject(KjDialogService);
    }

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const ref = fixture.componentInstance.svc.open(MyDialog, { disableClose: true });
    flushRaf();
    expect(findPanel()).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    flushRaf();
    expect(findPanel()).not.toBeNull();
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    flushRaf();
    expect(findPanel()).not.toBeNull();
    // Programmatic close still works even when disableClose=true.
    ref.close();
    flushRaf();
  });

  it('mutable disableClose signal toggles close suppression after open', () => {
    @Component({
      standalone: true,
      imports: [KjDialog, KjDialogTitle],
      template: `<div kjDialog><h2 kjDialogTitle>T</h2></div>`,
    })
    class MyDialog {}

    @Component({ standalone: true, template: '' })
    class Host {
      readonly svc = inject(KjDialogService);
    }

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const ref = fixture.componentInstance.svc.open(MyDialog);
    flushRaf();
    ref.disableClose.set(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    flushRaf();
    expect(findPanel()).not.toBeNull();

    ref.disableClose.set(false);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    flushRaf();
    expect(findPanel()).toBeNull();
  });

  it('locks <body> scroll by default and respects scrollLock=false', () => {
    @Component({
      standalone: true,
      imports: [KjDialog, KjDialogTitle],
      template: `<div kjDialog><h2 kjDialogTitle>T</h2></div>`,
    })
    class MyDialog {}

    @Component({ standalone: true, template: '' })
    class Host {
      readonly svc = inject(KjDialogService);
    }

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const ref = fixture.componentInstance.svc.open(MyDialog);
    flushRaf();
    expect(document.documentElement.style.overflow).toBe('hidden');
    ref.close();
    flushRaf();
    expect(document.documentElement.style.overflow).toBe('');

    fixture.componentInstance.svc.open(MyDialog, { scrollLock: false });
    flushRaf();
    expect(document.documentElement.style.overflow).toBe('');
  });
});
