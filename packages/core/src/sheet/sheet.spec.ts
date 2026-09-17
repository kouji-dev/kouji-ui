import { ApplicationRef, Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KjSheet } from './sheet';
import { KjSheetTitle } from './sheet-title';
import { KjSheetService, SHEET_DATA, type KjSheetOpenOptions } from './sheet.service';
import { KjSheetRef } from './sheet.ref';

@Component({
  selector: 'kj-simple-sheet',
  standalone: true,
  imports: [KjSheet],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-sheet><button id="ok" (click)="ref.close('ok')">OK</button></kj-sheet>`,
})
class SimpleSheet {
  readonly ref = inject<KjSheetRef<SimpleSheet, string>>(KjSheetRef);
}

@Component({
  selector: 'kj-data-sheet',
  standalone: true,
  imports: [KjSheet],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-sheet>{{ data }}</kj-sheet>`,
})
class DataSheet {
  readonly data = inject<string>(SHEET_DATA);
}

/**
 * Opens a sheet and flushes change detection so the panel's host bindings and
 * template render synchronously. The service creates the component outside a
 * TestBed fixture, so an explicit `ApplicationRef.tick()` stands in for the
 * zone-driven CD that a real app performs after `open()`.
 */
function openSheet<T, R = unknown, D = unknown>(
  component: Parameters<KjSheetService['open']>[0],
  opts?: KjSheetOpenOptions<D>,
): KjSheetRef<T, R> {
  const svc = TestBed.inject(KjSheetService);
  const ref = svc.open<T, R, D>(component as never, opts);
  TestBed.inject(ApplicationRef).tick();
  return ref;
}

function findPanel(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('kj-sheet');
}

function cleanupOverlays(): void {
  document.body.querySelectorAll('kj-sheet').forEach((el) => el.remove());
  document.documentElement.style.overflow = '';
  document.documentElement.style.paddingRight = '';
}

describe('KjSheetService', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    cleanupOverlays();
  });

  it('open returns a ref with a controller', () => {
    const ref = openSheet(SimpleSheet);
    expect(ref).toBeTruthy();
    expect(typeof ref.close).toBe('function');
    expect(ref.controller).toBeTruthy();
  });

  it('rendered panel uses role="dialog"', () => {
    openSheet(SimpleSheet);
    const panel = findPanel();
    expect(panel).toBeTruthy();
    expect(panel!.getAttribute('role')).toBe('dialog');
  });

  it('defaults detent to "auto"', () => {
    openSheet(SimpleSheet);
    expect(findPanel()!.getAttribute('data-kj-detent')).toBe('auto');
  });

  it('reflects the requested detent on the host', () => {
    openSheet(SimpleSheet, { detent: 'half' });
    expect(findPanel()!.getAttribute('data-kj-detent')).toBe('half');
  });

  it('renders a grab handle when dismissible (default)', () => {
    openSheet(SimpleSheet);
    expect(findPanel()!.querySelector('.kj-sheet__handle')).toBeTruthy();
  });

  it('omits the grab handle when dismissible: false', () => {
    openSheet(SimpleSheet, { dismissible: false });
    expect(findPanel()!.querySelector('.kj-sheet__handle')).toBeNull();
  });

  it('applies ariaLabel to the host', () => {
    openSheet(SimpleSheet, { ariaLabel: 'Options' });
    expect(findPanel()!.getAttribute('aria-label')).toBe('Options');
  });

  it('close resolves the result promise', async () => {
    const ref = openSheet<SimpleSheet, string>(SimpleSheet);
    ref.close('hello');
    await expect(ref.result).resolves.toBe('hello');
  });

  it('a dismissal (Escape / scrim) settles afterClosed$ and result like close() does', async () => {
    const ref = openSheet<SimpleSheet, string>(SimpleSheet);
    await new Promise((r) => setTimeout(r, 40));
    TestBed.inject(ApplicationRef).tick();
    const emitted: (string | undefined)[] = [];
    ref.afterClosed$.subscribe((r) => emitted.push(r));
    ref.controller.close('escape');
    await new Promise((r) => setTimeout(r, 40));
    TestBed.inject(ApplicationRef).tick();
    expect(ref.closeReason()).toBe('escape');
    expect(emitted).toEqual([undefined]);
    await expect(ref.result).resolves.toBeUndefined();
  });

  it('passes data through SHEET_DATA', () => {
    openSheet(DataSheet, { data: 'greetings' });
    expect(findPanel()!.textContent).toContain('greetings');
  });

  it('Escape on the panel closes the sheet', async () => {
    const ref = openSheet<SimpleSheet, unknown>(SimpleSheet);
    const panel = findPanel();
    expect(panel).toBeTruthy();
    panel!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await ref.result;
    expect(ref.state()).not.toBe('open');
  });

  it('Escape reaches the panel through a host binding, not only the overlay stack', async () => {
    // arch F-13: `@HostListener('keydown.escape')` became a `host: {}` entry.
    // The stack's document-capture listener would close the sheet either way,
    // so this asserts the binding itself still runs.
    const spy = vi.spyOn(KjSheet.prototype, 'onEscape');
    try {
      const ref = openSheet<SimpleSheet, unknown>(SimpleSheet);
      findPanel()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await ref.result;
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('afterOpened$ emits exactly once, when the open transition completes, then completes', async () => {
    const ref = openSheet(SimpleSheet);
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

  it('returns focus to the opener on close', async () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const ref = openSheet(SimpleSheet);
    await flush();
    const panel = findPanel()!;
    expect(document.activeElement).toBe(panel);
    panel.querySelector<HTMLElement>('#ok')!.focus();
    ref.close();
    await flush();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});

const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 40));

/** Lets the open / close transition finish and flushes root effects. */
async function flush(): Promise<void> {
  await settle();
  TestBed.inject(ApplicationRef).tick();
  await settle();
}

@Component({
  selector: 'kj-titled-sheet',
  standalone: true,
  imports: [KjSheet, KjSheetTitle],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-sheet><h2 kjSheetTitle>Share</h2><button id="ok" (click)="ref.close()">OK</button></kj-sheet>`,
})
class TitledSheet {
  readonly ref = inject<KjSheetRef<TitledSheet, string>>(KjSheetRef);
}

describe('KjSheet accessible name', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    cleanupOverlays();
  });

  it('a projected [kjSheetTitle] names the sheet via aria-labelledby, even with an ariaLabel fallback', async () => {
    const ref = openSheet<TitledSheet>(TitledSheet, { ariaLabel: 'Fallback' });
    await flush();
    const panel = findPanel()!;
    const title = panel.querySelector('h2')!;
    expect(title.id).toMatch(/^kj-sheet-title-\d+$/);
    expect(title.classList.contains('kj-sheet__title')).toBe(true);
    expect(panel.getAttribute('aria-labelledby')).toBe(title.id);
    expect(panel.hasAttribute('aria-label')).toBe(false);
    expect(panel).toHaveAccessibleName('Share');
    ref.close();
    await flush();
  });

  it('ariaLabelledBy wins over a projected title', async () => {
    const ref = openSheet<TitledSheet>(TitledSheet, { ariaLabelledBy: 'page-heading' });
    expect(findPanel()!.getAttribute('aria-labelledby')).toBe('page-heading');
    ref.close();
    await flush();
  });
});
