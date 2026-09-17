import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { KjOverlayController } from '../primitives/overlay/controller';
import { KjOverlayRef } from '../primitives/overlay/overlay-ref';
import { inPlace } from '../primitives/overlay/strategies/mount/in-place';
import { viewportCentered } from '../primitives/overlay/strategies/position/viewport-centered';
import { KjDialogRef } from './dialog.ref';
import { KjDrawerRef } from '../drawer/drawer.ref';
import { KjSheetRef } from '../sheet/sheet.ref';

const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 40));

describe('overlay refs — close reason (overlay F-11)', () => {
  let controller: KjOverlayController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [KjOverlayController] });
    controller = TestBed.inject(KjOverlayController);
    controller.attachStrategies({ mount: inPlace(), position: viewportCentered() });
  });

  afterEach(async () => {
    controller.dispose();
    await settle();
  });

  it.each([
    ['KjDialogRef', (c: KjOverlayController) => new KjDialogRef<unknown>(c)],
    ['KjDrawerRef', (c: KjOverlayController) => new KjDrawerRef<unknown>(c)],
    ['KjSheetRef', (c: KjOverlayController) => new KjSheetRef<unknown>(c)],
  ])('%s mirrors the controller\'s closeReason: null while open, the dismissal reason, "programmatic" after close()', async (_name, make) => {
    const ref = make(controller);
    expect(ref.closeReason()).toBeNull();
    controller.open();
    await settle();
    expect(ref.isOpen()).toBe(true);
    expect(ref.closeReason()).toBeNull();

    controller.close('escape');
    expect(ref.closeReason()).toBe('escape');
    await settle();

    controller.open();
    await settle();
    expect(ref.closeReason()).toBeNull();
    ref.close();
    expect(ref.closeReason()).toBe('programmatic');
    expect(ref.state()).toBe('closing');
  });
});

describe('overlay refs - shared KjOverlayRef base (arch F-20)', () => {
  let controller: KjOverlayController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [KjOverlayController] });
    controller = TestBed.inject(KjOverlayController);
    controller.attachStrategies({ mount: inPlace(), position: viewportCentered() });
  });

  afterEach(async () => {
    controller.dispose();
    await settle();
  });

  it.each([
    ['KjDialogRef', (c: KjOverlayController) => new KjDialogRef<unknown>(c)],
    ['KjDrawerRef', (c: KjOverlayController) => new KjDrawerRef<unknown>(c)],
    ['KjSheetRef', (c: KjOverlayController) => new KjSheetRef<unknown>(c)],
  ])('%s is a KjOverlayRef and names itself when `instance` is read unbound', (name, make) => {
    const ref = make(controller);
    expect(ref).toBeInstanceOf(KjOverlayRef);
    // The one thing the three files genuinely differed on before the base was
    // extracted: the error has to name the ref the caller actually holds.
    expect(() => ref.instance).toThrow(`${name}: instance not bound`);
    ref.bindInstance({ tag: name });
    expect(ref.instance).toEqual({ tag: name });
  });

  it.each([
    ['KjDialogRef', (c: KjOverlayController) => new KjDialogRef<unknown, string>(c)],
    ['KjDrawerRef', (c: KjOverlayController) => new KjDrawerRef<unknown, string>(c)],
    ['KjSheetRef', (c: KjOverlayController) => new KjSheetRef<unknown, string>(c)],
  ])('%s settles afterOpened$ once, then afterClosed$ and result with close()', async (_name, make) => {
    const ref = make(controller);
    let opened = 0;
    let openedCompleted = false;
    ref.afterOpened$.subscribe({ next: () => opened++, complete: () => (openedCompleted = true) });
    const closed: (string | undefined)[] = [];
    ref.afterClosed$.subscribe((r) => closed.push(r));

    controller.open();
    await settle();
    ref._notifyOpened();
    ref._notifyOpened();
    expect(opened).toBe(1);
    expect(openedCompleted).toBe(true);

    ref.close('done');
    await settle();
    expect(closed).toEqual(['done']);
    await expect(ref.result).resolves.toBe('done');
    // Idempotent: a later dismissal notification cannot emit a second time.
    ref._notifyClosed();
    expect(closed).toEqual(['done']);
  });

  it('completes afterOpened$ without emitting when the overlay closes before it opened', async () => {
    const ref = new KjSheetRef<unknown, string>(controller);
    let opened = 0;
    let openedCompleted = false;
    ref.afterOpened$.subscribe({ next: () => opened++, complete: () => (openedCompleted = true) });
    ref._notifyClosed();
    expect(opened).toBe(0);
    expect(openedCompleted).toBe(true);
    await expect(ref.result).resolves.toBeUndefined();
  });
});
