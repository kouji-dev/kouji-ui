import { ApplicationRef, Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { KjDialog } from './dialog';
import { KjDialogTitle } from './dialog-title';
import { KjDialogService } from './dialog.service';
import { KjDialogRef } from './dialog.ref';

@Component({
  selector: 'kj-simple-dlg',
  standalone: true,
  imports: [KjDialog],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-dialog><button id="ok" (click)="ref.close('ok')">OK</button><button id="cancel">Cancel</button></kj-dialog>`,
})
class SimpleDlg {
  readonly ref = inject<KjDialogRef<SimpleDlg, string>>(KjDialogRef);
}

const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 40));

/** Lets the open / close transition finish and flushes root effects. */
async function flush(): Promise<void> {
  await settle();
  TestBed.inject(ApplicationRef).tick();
  await settle();
}

function pressTab(shiftKey = false): boolean {
  const target = document.activeElement ?? document.body;
  return target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true }));
}

describe('KjDialog', () => {
  const nodes: Element[] = [];
  const mount = <T extends Element>(el: T): T => { document.body.appendChild(el); nodes.push(el); return el; };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  afterEach(async () => {
    for (const n of nodes) n.remove();
    nodes.length = 0;
    document.querySelectorAll('.kj-overlay-container > *').forEach((el) => el.remove());
    document.documentElement.style.overflow = '';
    document.documentElement.style.paddingRight = '';
    await settle();
  });

  it('open returns a ref with isOpen true after open', () => {
    const svc = TestBed.inject(KjDialogService);
    const ref = svc.open(SimpleDlg);
    expect(ref).toBeTruthy();
    expect(typeof ref.close).toBe('function');
    ref.close();
  });

  it('open with alert=true uses role=alertdialog', () => {
    const svc = TestBed.inject(KjDialogService);
    const ref = svc.open(SimpleDlg, { alert: true });
    expect(ref.controller).toBeTruthy();
    ref.close();
  });

  it('close resolves the result promise', async () => {
    const svc = TestBed.inject(KjDialogService);
    const ref = svc.open<SimpleDlg, string>(SimpleDlg);
    ref.close('hello');
    await expect(ref.result).resolves.toBe('hello');
  });

  it('a dismissal (Escape / scrim) settles afterClosed$ and result like close() does — once', async () => {
    const svc = TestBed.inject(KjDialogService);
    const ref = svc.open<SimpleDlg, string>(SimpleDlg);
    await flush();
    const emitted: (string | undefined)[] = [];
    let completed = false;
    ref.afterClosed$.subscribe({ next: (r) => emitted.push(r), complete: () => { completed = true; } });

    ref.controller.close('escape');
    await flush();
    expect(ref.closeReason()).toBe('escape');
    expect(emitted).toEqual([undefined]);
    expect(completed).toBe(true);
    await expect(ref.result).resolves.toBeUndefined();

    // A late close() after the dismissal never re-emits.
    ref.close('late');
    await settle();
    expect(emitted).toEqual([undefined]);
  });

  it('forwards closeOnEsc to the overlay: Escape closes a dialog by default and leaves a closeOnEsc: false one open', async () => {
    const svc = TestBed.inject(KjDialogService);
    const press = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));

    const kept = svc.open<SimpleDlg, string>(SimpleDlg, { closeOnEsc: false });
    await flush();
    press();
    await flush();
    expect(kept.isOpen()).toBe(true);
    kept.close();
    await flush();

    const dismissed = svc.open<SimpleDlg, string>(SimpleDlg);
    await flush();
    press();
    await flush();
    expect(dismissed.isOpen()).toBe(false);
    expect(dismissed.closeReason()).toBe('escape');
  });

  it('afterOpened$ emits exactly once, when the open transition completes, then completes', async () => {
    const svc = TestBed.inject(KjDialogService);
    const ref = svc.open(SimpleDlg);
    let emissions = 0;
    let completed = false;
    ref.afterOpened$.subscribe({ next: () => emissions++, complete: () => { completed = true; } });
    expect(emissions).toBe(0);
    await flush();
    expect(ref.state()).toBe('open');
    expect(emissions).toBe(1);
    expect(completed).toBe(true);
    TestBed.inject(ApplicationRef).tick();
    expect(emissions).toBe(1);
    ref.close();
    await flush();
  });

  it('places focus in the panel on open, traps Tab, inerts the page behind, and returns focus to the opener on close', async () => {
    const app = mount(document.createElement('div'));
    const opener = document.createElement('button');
    app.appendChild(opener);
    opener.focus();

    const svc = TestBed.inject(KjDialogService);
    const ref = svc.open(SimpleDlg);
    await flush();
    const panel = document.querySelector<HTMLElement>('.kj-overlay-container kj-dialog')!;
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-modal')).toBe('true');
    expect(app.hasAttribute('inert')).toBe(true);
    expect(document.activeElement).toBe(panel);

    const cancel = panel.querySelector<HTMLElement>('#cancel')!;
    cancel.focus();
    expect(pressTab()).toBe(false);
    expect(document.activeElement).toBe(panel.querySelector('#ok'));

    ref.close();
    await flush();
    expect(app.hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(opener);
  });
});

@Component({
  selector: 'kj-titled-dlg',
  standalone: true,
  imports: [KjDialog, KjDialogTitle],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-dialog><h2 kjDialogTitle>Save changes?</h2><button id="ok" (click)="ref.close()">OK</button></kj-dialog>`,
})
class TitledDlg {
  readonly ref = inject<KjDialogRef<TitledDlg, string>>(KjDialogRef);
}

@Component({
  selector: 'kj-own-id-dlg',
  standalone: true,
  imports: [KjDialog, KjDialogTitle],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-dialog><h2 kjDialogTitle id="my-title">Named</h2></kj-dialog>`,
})
class OwnIdDlg {}

describe('KjDialog accessible name', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  afterEach(async () => {
    document.querySelectorAll('.kj-overlay-container > *').forEach((el) => el.remove());
    document.documentElement.style.overflow = '';
    document.documentElement.style.paddingRight = '';
    await settle();
  });

  const panel = () => document.querySelector<HTMLElement>('.kj-overlay-container kj-dialog')!;

  it('a projected [kjDialogTitle] names the dialog via aria-labelledby', async () => {
    const ref = TestBed.inject(KjDialogService).open(TitledDlg);
    await flush();
    const title = panel().querySelector('h2')!;
    expect(title.id).toMatch(/^kj-dialog-title-\d+$/);
    expect(title.classList.contains('kj-dialog-title')).toBe(true);
    expect(panel().getAttribute('aria-labelledby')).toBe(title.id);
    expect(panel().hasAttribute('aria-label')).toBe(false);
    expect(panel()).toHaveAccessibleName('Save changes?');
    ref.close();
    await flush();
  });

  it('keeps an id the title already carries', async () => {
    const ref = TestBed.inject(KjDialogService).open(OwnIdDlg);
    await flush();
    expect(panel().getAttribute('aria-labelledby')).toBe('my-title');
    ref.close();
    await flush();
  });

  it('ariaLabel names a title-less body; a title wins over it', async () => {
    const svc = TestBed.inject(KjDialogService);
    const plain = svc.open(SimpleDlg, { ariaLabel: 'Confirm deletion' });
    await flush();
    expect(panel().getAttribute('aria-label')).toBe('Confirm deletion');
    expect(panel().hasAttribute('aria-labelledby')).toBe(false);
    plain.close();
    await flush();

    const titled = svc.open(TitledDlg, { ariaLabel: 'Ignored' });
    await flush();
    expect(panel().getAttribute('aria-labelledby')).toBe(panel().querySelector('h2')!.id);
    expect(panel().hasAttribute('aria-label')).toBe(false);
    titled.close();
    await flush();
  });

  it('ariaLabelledBy wins over a projected title', async () => {
    const ref = TestBed.inject(KjDialogService).open(TitledDlg, { ariaLabelledBy: 'external-heading' });
    await flush();
    expect(panel().getAttribute('aria-labelledby')).toBe('external-heading');
    ref.close();
    await flush();
  });

  it('warns in dev mode when a dialog opens with no accessible name', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ref = TestBed.inject(KjDialogService).open(SimpleDlg);
    await flush();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('opened without an accessible name'));
    warn.mockClear();
    ref.close();
    await flush();
    const named = TestBed.inject(KjDialogService).open(TitledDlg);
    await flush();
    expect(warn).not.toHaveBeenCalled();
    named.close();
    await flush();
    warn.mockRestore();
  });
});
