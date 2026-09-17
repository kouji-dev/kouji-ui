import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KjInputModality } from './input-modality';

/** Counts the capture-phase document listeners this service is responsible for. */
function listenerCounter() {
  const added = vi.spyOn(document, 'addEventListener');
  const removed = vi.spyOn(document, 'removeEventListener');
  const count = (spy: typeof added) =>
    spy.mock.calls.filter(
      ([type, , opts]) => (type === 'keydown' || type === 'pointerdown') && opts === true,
    ).length;
  return {
    get added() {
      return count(added);
    },
    get removed() {
      return count(removed);
    },
  };
}

describe('KjInputModality', () => {
  let listeners: ReturnType<typeof listenerCounter>;

  beforeEach(() => {
    listeners = listenerCounter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts on "keyboard" so the first Tab of a page shows its ring', () => {
    expect(TestBed.inject(KjInputModality).modality()).toBe('keyboard');
  });

  it('installs nothing until something retains it', () => {
    TestBed.inject(KjInputModality);
    expect(listeners.added).toBe(0);
  });

  it('installs ONE listener pair however many consumers retain it', () => {
    const svc = TestBed.inject(KjInputModality);
    const releases = [svc.retain(), svc.retain(), svc.retain()];
    // Two listeners — keydown + pointerdown — not two per consumer.
    expect(listeners.added).toBe(2);
    for (const release of releases) release();
  });

  it('removes the pair only when the last consumer releases', () => {
    const svc = TestBed.inject(KjInputModality);
    const a = svc.retain();
    const b = svc.retain();
    a();
    expect(listeners.removed).toBe(0);
    b();
    expect(listeners.removed).toBe(2);
  });

  it('re-installs after a full release and a fresh retain', () => {
    const svc = TestBed.inject(KjInputModality);
    svc.retain()();
    expect(listeners.added).toBe(2);
    const again = svc.retain();
    expect(listeners.added).toBe(4);
    again();
  });

  it('a disposer called twice does not double-decrement the refcount', () => {
    const svc = TestBed.inject(KjInputModality);
    const a = svc.retain();
    const b = svc.retain();
    a();
    a();
    expect(listeners.removed, 'the second call must not tear down b’s listeners').toBe(0);
    b();
    expect(listeners.removed).toBe(2);
  });

  it('tracks the last interaction across every consumer', () => {
    const svc = TestBed.inject(KjInputModality);
    const release = svc.retain();
    document.dispatchEvent(new PointerEvent('pointerdown'));
    expect(svc.modality()).toBe('pointer');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(svc.modality()).toBe('keyboard');
    release();
    // Released: the page no longer feeds the signal.
    document.dispatchEvent(new PointerEvent('pointerdown'));
    expect(svc.modality()).toBe('keyboard');
  });
});
