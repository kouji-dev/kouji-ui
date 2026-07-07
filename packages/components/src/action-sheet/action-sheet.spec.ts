import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  KjActionSheetService,
  KjActionSheetRef,
  type KjActionSheetOptions,
} from './action-sheet.service';

/**
 * Opens an action sheet and flushes change detection so the sheet panel and
 * action list render synchronously. The service creates the component outside
 * a TestBed fixture, so an explicit `ApplicationRef.tick()` stands in for the
 * zone-driven CD a real app performs after `open()`.
 */
function openActionSheet<V>(opts: KjActionSheetOptions<V>): KjActionSheetRef<V> {
  const svc = TestBed.inject(KjActionSheetService);
  const ref = svc.open<V>(opts);
  TestBed.inject(ApplicationRef).tick();
  return ref;
}

function findPanel(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('kj-sheet');
}

function items(): HTMLElement[] {
  return Array.from(document.body.querySelectorAll<HTMLElement>('.kj-action-sheet__item'));
}

function cleanupOverlays(): void {
  document.body.querySelectorAll('kj-action-sheet').forEach((el) => el.remove());
  document.body.querySelectorAll('kj-sheet').forEach((el) => el.remove());
  document.documentElement.style.overflow = '';
  document.documentElement.style.paddingRight = '';
}

describe('KjActionSheetService', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    cleanupOverlays();
  });

  it('opens a bottom-sheet panel with role="dialog"', () => {
    openActionSheet({
      title: 'Photo',
      actions: [
        { label: 'Edit', value: 'edit' },
        { label: 'Delete', value: 'delete', role: 'destructive' },
      ],
    });
    const panel = findPanel();
    expect(panel).toBeTruthy();
    expect(panel!.getAttribute('role')).toBe('dialog');
  });

  it('renders one menuitem per action inside a role="menu" list', () => {
    openActionSheet({
      actions: [
        { label: 'Edit', value: 'edit' },
        { label: 'Share', value: 'share' },
        { label: 'Delete', value: 'delete', role: 'destructive' },
      ],
    });
    expect(document.body.querySelector('[role="menu"]')).toBeTruthy();
    const rows = items();
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.getAttribute('role') === 'menuitem')).toBe(true);
    expect(rows[2].classList.contains('is-destructive')).toBe(true);
  });

  it('selecting an action resolves its value', async () => {
    const ref = openActionSheet<string>({
      actions: [
        { label: 'Edit', value: 'edit' },
        { label: 'Delete', value: 'delete', role: 'destructive' },
      ],
    });
    items()[1].click();
    await expect(ref.result).resolves.toBe('delete');
  });

  it('cancel row resolves undefined', async () => {
    const ref = openActionSheet<string>({
      actions: [{ label: 'Edit', value: 'edit' }],
    });
    const cancel = document.body.querySelector<HTMLElement>('.kj-action-sheet__cancel');
    expect(cancel).toBeTruthy();
    cancel!.click();
    await expect(ref.result).resolves.toBeUndefined();
  });

  it('omits the cancel row when cancelLabel is null', () => {
    openActionSheet({ cancelLabel: null, actions: [{ label: 'Edit', value: 'edit' }] });
    expect(document.body.querySelector('.kj-action-sheet__cancel')).toBeNull();
  });
});
