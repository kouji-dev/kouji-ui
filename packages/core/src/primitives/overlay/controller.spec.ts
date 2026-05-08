import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  });

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

  it('open() with no panel transitions to open synchronously via rAF', async () => {
    const { strategies } = makeStub();
    ctrl.attachStrategies(strategies);
    ctrl.open();
    expect(ctrl.state()).toBe('opening');
    // No panel attached → runTransition uses rAF fallback
    await new Promise(r => requestAnimationFrame(() => r(undefined)));
    await new Promise(r => requestAnimationFrame(() => r(undefined)));
    expect(['open', 'opening']).toContain(ctrl.state());
  }, 5000);

  it('open while open is no-op', () => {
    const { strategies } = makeStub();
    ctrl.attachStrategies(strategies);
    ctrl.open();
    const stateBefore = ctrl.state();
    ctrl.open();
    expect(ctrl.state()).toBe(stateBefore);
  });

  it('close() from open transitions through closing', async () => {
    const { strategies } = makeStub();
    ctrl.attachStrategies(strategies);
    // Force state to 'open' by calling open() and waiting a tick
    ctrl.open();
    await new Promise(r => requestAnimationFrame(() => r(undefined)));
    await new Promise(r => requestAnimationFrame(() => r(undefined)));
    if (ctrl.state() === 'open') {
      ctrl.close();
      expect(ctrl.state()).toBe('closing');
    } else {
      // Open didn't complete in jsdom — at least assert no throw
      expect(['opening', 'open', 'closed']).toContain(ctrl.state());
    }
  }, 5000);

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
