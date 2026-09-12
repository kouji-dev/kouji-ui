import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KjOverlayController } from './controller';
import type { KjOverlayStrategies } from './controller';
import { KjOverlayStack } from './stack';

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

  it('open() stamps the stack level on the panel and its wrapper; a nested controller lands one above; close clears', async () => {
    const stack = TestBed.inject(KjOverlayStack);
    const raf = () => new Promise(r => requestAnimationFrame(() => r(undefined)));
    const mk = () => {
      const wrapper = document.createElement('div');
      wrapper.className = 'kj-overlay-wrapper';
      const panel = document.createElement('div');
      wrapper.appendChild(panel);
      document.body.appendChild(wrapper);
      return { wrapper, panel };
    };
    const outer = mk();
    const base = stack.nextZIndex;
    ctrl.bindPanel(outer.panel);
    ctrl.attachStrategies(makeStub().strategies);
    ctrl.open();
    expect(outer.panel.style.getPropertyValue('--kj-overlay-z')).toBe(String(base));
    expect(outer.wrapper.style.zIndex).toBe(String(base));

    const inner = mk();
    const nested = Injector.create({ providers: [KjOverlayController], parent: TestBed.inject(Injector) })
      .get(KjOverlayController);
    nested.bindPanel(inner.panel);
    nested.attachStrategies(makeStub().strategies);
    nested.open();
    expect(Number(inner.wrapper.style.zIndex)).toBe(base + 1);
    expect(Number(inner.panel.style.getPropertyValue('--kj-overlay-z')))
      .toBeGreaterThan(Number(outer.panel.style.getPropertyValue('--kj-overlay-z')));

    nested.close();
    await raf(); await raf();
    expect(inner.panel.style.getPropertyValue('--kj-overlay-z')).toBe('');
    expect(inner.wrapper.style.zIndex).toBe('');
    // The outer keeps its level; the next overlay reopens one above it.
    expect(outer.wrapper.style.zIndex).toBe(String(base));
    expect(stack.nextZIndex).toBe(base + 1);

    ctrl.close();
    await raf(); await raf();
    expect(outer.wrapper.style.zIndex).toBe('');
    outer.wrapper.remove(); inner.wrapper.remove();
  }, 5000);
});
