import { ApplicationRef, Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { KjSheet } from './sheet';
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
});
