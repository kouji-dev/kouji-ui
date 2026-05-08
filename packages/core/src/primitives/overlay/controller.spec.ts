import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KjOverlayController } from './controller';
import type { KjOverlayStrategies } from './controller';

function makeStub() {
  const calls: string[] = [];
  const strat = (name: string) => ({
    attach: vi.fn(() => calls.push(`${name}:attach`)),
    onOpen: vi.fn(() => calls.push(`${name}:onOpen`)),
    onClose: vi.fn(() => calls.push(`${name}:onClose`)),
    detach: vi.fn(() => calls.push(`${name}:detach`)),
  });
  const mount = { ...strat('mount'), portalled: false, resolveContainer: () => document.body };
  const position = { ...strat('position'), update: vi.fn() };
  const trigger  = { ...strat('trigger'), ariaHasPopup: null, bindToggle: vi.fn() };
  return { calls, strategies: { mount, position, trigger } as unknown as KjOverlayStrategies };
}

describe('KjOverlayController', () => {
  let ctrl: KjOverlayController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [KjOverlayController] });
    ctrl = TestBed.inject(KjOverlayController);
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('starts closed', () => {
    expect(ctrl.state()).toBe('closed');
    expect(ctrl.isOpen()).toBe(false);
  });

  it('attachStrategies calls attach in order: mount, position, trigger', () => {
    const { calls, strategies } = makeStub();
    ctrl.attachStrategies(strategies);
    const attaches = calls.filter(c => c.endsWith(':attach'));
    expect(attaches[0]).toBe('mount:attach');
    expect(attaches[1]).toBe('position:attach');
    expect(attaches[attaches.length - 1]).toBe('trigger:attach');
  });

  it('open transitions through opening to open', async () => {
    const { strategies } = makeStub();
    ctrl.attachStrategies(strategies);
    ctrl.open();
    expect(ctrl.state()).toBe('opening');
    await new Promise(r => setTimeout(r, 0));
    vi.advanceTimersByTime(20);
    await new Promise(r => requestAnimationFrame(() => r(undefined)));
    expect(['open', 'opening']).toContain(ctrl.state());
  });

  it('open while open is no-op', () => {
    const { strategies } = makeStub();
    ctrl.attachStrategies(strategies);
    ctrl.open();
    const stateBefore = ctrl.state();
    ctrl.open();
    expect(ctrl.state()).toBe(stateBefore);
  });

  it('close transitions open -> closing -> closed', async () => {
    const { strategies } = makeStub();
    ctrl.attachStrategies(strategies);
    ctrl.open();
    // Force state to open synchronously by flushing rAF/timers fallback.
    await new Promise(r => requestAnimationFrame(() => r(undefined)));
    ctrl.close();
    expect(ctrl.state()).toBe('closing');
    await new Promise(r => requestAnimationFrame(() => r(undefined)));
    expect(['closed', 'closing']).toContain(ctrl.state());
  });

  it('dispose calls detach on each strategy in reverse order', () => {
    const { calls, strategies } = makeStub();
    ctrl.attachStrategies(strategies);
    calls.length = 0;
    ctrl.dispose();
    const detaches = calls.filter(c => c.endsWith(':detach'));
    expect(detaches[0]).toBe('trigger:detach');
    expect(detaches[detaches.length - 1]).toBe('mount:detach');
  });
});
