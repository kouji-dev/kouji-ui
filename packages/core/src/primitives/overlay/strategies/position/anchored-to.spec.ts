import { Injector, type Provider, runInInjectionContext, signal } from '@angular/core';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { anchoredTo, injectAnchoredPosition, pxOffset } from './anchored-to';
import type { KjOverlayContext } from '../../context';
import { KJ_OVERLAY_POSITION_STRATEGY } from '../../tokens';

function makeCtx(panel: HTMLElement, trigger: HTMLElement | null = null): KjOverlayContext {
  return {
    state: signal('closed'), isOpen: signal(false),
    triggerEl: signal(trigger), panelEl: signal(panel),
    stack: {} as never, platform: { isBrowser: true },
    requestClose: () => {},
  };
}

/** jsdom gives every element a 0×0 rect; these fixtures need real boxes. */
function sized(el: HTMLElement, rect: Partial<DOMRect>): HTMLElement {
  const full = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, ...rect };
  el.getBoundingClientRect = () => ({ ...full, toJSON: () => full }) as DOMRect;
  return el;
}

const created: HTMLElement[] = [];
function mount(tag: string, rect: Partial<DOMRect>): HTMLElement {
  const el = sized(document.createElement(tag), rect);
  document.body.appendChild(el);
  created.push(el);
  return el;
}

afterEach(() => {
  while (created.length) created.pop()!.remove();
  document.documentElement.removeAttribute('dir');
});

describe('anchoredTo', () => {
  it('exposes placement signal', () => {
    const trig = signal<HTMLElement | null>(null);
    const s = anchoredTo({ trigger: trig, side: 'bottom', align: 'start' });
    expect(typeof s.placement).toBe('function');
    expect(s.placement!()).toBeNull();
  });

  it('takes the manual-math path even where CSS Anchor is supported (CSS Anchor is disabled on purpose)', () => {
    const orig = (globalThis as { CSS?: unknown }).CSS;
    (globalThis as { CSS?: unknown }).CSS = { supports: (prop: string) => prop === 'anchor-name' };
    try {
      const trigger = document.createElement('button');
      const panel = document.createElement('div');
      document.body.append(trigger, panel);
      const trig = signal<HTMLElement | null>(trigger);
      const s = anchoredTo({ trigger: trig, side: 'bottom', align: 'start' });
      s.attach(makeCtx(panel));
      s.onOpen!();
      expect(panel.style.position).toBe('fixed');
      // `position-anchor` / `position-area` give inconsistent results across
      // browser versions, so the strategy never opts into them.
      expect(panel.style.getPropertyValue('position-anchor')).toBe('');
      expect(trigger.style.getPropertyValue('anchor-name')).toBe('');
      expect(panel.style.top).not.toBe('');
      expect(panel.style.left).not.toBe('');
      s.onClose!();
      trigger.remove();
      panel.remove();
    } finally {
      (globalThis as { CSS?: unknown }).CSS = orig;
    }
  });

  it('detach clears inline styles', () => {
    const panel = document.createElement('div');
    panel.style.position = 'fixed';
    panel.style.left = '5px';
    const trig = signal<HTMLElement | null>(null);
    const s = anchoredTo({ trigger: trig, side: 'bottom', align: 'start' });
    s.attach(makeCtx(panel));
    s.onClose!();
    expect(panel.style.position).toBe('');
    expect(panel.style.left).toBe('');
  });

  // ── F-5: the resolved placement is what `data-side` / `data-align` read ──

  it('publishes the resolved placement, flip included', () => {
    // A trigger 20px from the bottom of a 768px viewport with a 300px panel:
    // `bottom` does not fit, `top` does, so the resolved side flips.
    Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    const trigger = mount('button', { left: 100, right: 200, width: 100, top: 740, bottom: 748, height: 8 });
    const panel = mount('div', { width: 200, height: 300 });
    const s = anchoredTo({ trigger: signal(trigger), side: 'bottom', align: 'start' });
    s.attach(makeCtx(panel, trigger));
    s.onOpen!();
    expect(s.placement!()).toEqual({ side: 'top', align: 'start' });
    s.onClose!();
    expect(s.placement!()).toBeNull();
  });

  // ── F-9: RTL mirroring ──────────────────────────────────────────────────

  it('mirrors align start/end under dir="rtl"', () => {
    Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    const trigger = mount('button', { left: 400, right: 500, width: 100, top: 100, bottom: 120, height: 20 });
    const panel = mount('div', { width: 200, height: 50 });
    const s = anchoredTo({ trigger: signal(trigger), side: 'bottom', align: 'start' });
    s.attach(makeCtx(panel, trigger));

    s.onOpen!();
    // LTR: the panel's left edge meets the trigger's left edge.
    expect(panel.style.left).toBe('400px');
    expect(s.placement!()).toEqual({ side: 'bottom', align: 'start' });
    s.onClose!();

    document.documentElement.setAttribute('dir', 'rtl');
    s.onOpen!();
    // RTL: `start` is the inline start — the trigger's RIGHT edge, so the
    // panel's right edge (400 + 200 = 500) meets it. Published physically.
    expect(panel.style.left).toBe('300px');
    expect(s.placement!()).toEqual({ side: 'bottom', align: 'end' });
    s.onClose!();
  });

  it('mirrors side left/right under dir="rtl", and mirrorInRtl:false keeps them physical', () => {
    Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    document.documentElement.setAttribute('dir', 'rtl');
    const trigger = mount('button', { left: 400, right: 500, width: 100, top: 100, bottom: 120, height: 20 });
    const panel = mount('div', { width: 60, height: 50 });

    const mirrored = anchoredTo({ trigger: signal(trigger), side: 'right', align: 'center', flip: false });
    mirrored.attach(makeCtx(panel, trigger));
    mirrored.onOpen!();
    expect(mirrored.placement!()).toEqual({ side: 'left', align: 'center' });
    mirrored.onClose!();

    const physical = anchoredTo({ trigger: signal(trigger), side: 'right', align: 'center', flip: false, mirrorInRtl: false });
    physical.attach(makeCtx(panel, trigger));
    physical.onOpen!();
    expect(physical.placement!()).toEqual({ side: 'right', align: 'center' });
    physical.onClose!();
  });

  it('reads direction from the anchor’s nearest [dir], not the document', () => {
    Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    const island = mount('section', {});
    island.setAttribute('dir', 'rtl');
    const trigger = sized(document.createElement('button'), { left: 400, right: 500, width: 100, top: 100, bottom: 120, height: 20 });
    island.appendChild(trigger);
    const panel = mount('div', { width: 200, height: 50 });
    const s = anchoredTo({ trigger: signal(trigger), side: 'bottom', align: 'start' });
    s.attach(makeCtx(panel, trigger));
    s.onOpen!();
    expect(s.placement!()).toEqual({ side: 'bottom', align: 'end' });
    s.onClose!();
  });

  // ── F-7 / perf F-3: passive, rAF-coalesced repositioning ────────────────

  it('registers scroll and resize passively', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const trigger = mount('button', { left: 10, right: 60, width: 50, top: 10, bottom: 30, height: 20 });
    const panel = mount('div', { width: 80, height: 40 });
    const s = anchoredTo({ trigger: signal(trigger), side: 'bottom', align: 'start' });
    s.attach(makeCtx(panel, trigger));
    s.onOpen!();
    const scroll = add.mock.calls.find(c => c[0] === 'scroll');
    const resize = add.mock.calls.find(c => c[0] === 'resize');
    expect(scroll?.[2]).toEqual({ capture: true, passive: true });
    expect(resize?.[2]).toEqual({ passive: true });
    s.onClose!();
    add.mockRestore();
  });

  it('coalesces a burst of scroll events into one reposition per frame', async () => {
    const trigger = mount('button', { left: 10, right: 60, width: 50, top: 10, bottom: 30, height: 20 });
    const panel = mount('div', { width: 80, height: 40 });
    // Count measurements rather than repositions: one `applyManual()` reads
    // the panel's rect exactly once.
    let reads = 0;
    const rect = panel.getBoundingClientRect.bind(panel);
    panel.getBoundingClientRect = () => { reads++; return rect(); };

    const s = anchoredTo({ trigger: signal(trigger), side: 'bottom', align: 'start' });
    s.attach(makeCtx(panel, trigger));
    s.onOpen!();               // one synchronous reposition
    expect(reads).toBe(1);

    for (let i = 0; i < 20; i++) window.dispatchEvent(new Event('scroll'));
    expect(reads).toBe(1);     // nothing ran synchronously

    await new Promise(r => requestAnimationFrame(() => r(null)));
    await new Promise(r => requestAnimationFrame(() => r(null)));
    expect(reads).toBe(2);     // exactly one for the whole burst
    s.onClose!();
  });

  it('skips the width write when the trigger width has not changed', () => {
    const trigger = mount('button', { left: 10, right: 60, width: 50, top: 10, bottom: 30, height: 20 });
    const panel = mount('div', { width: 80, height: 40 });
    const s = anchoredTo({ trigger: signal(trigger), side: 'bottom', align: 'start', matchTriggerWidth: 'min' });
    s.attach(makeCtx(panel, trigger));
    s.onOpen!();
    expect(panel.style.minWidth).toBe('50px');

    // A style write invalidates layout; the second pass must not make one.
    let writes = 0;
    const proxy = new Proxy(panel.style, {
      set(target, prop, value) { writes++; return Reflect.set(target, prop, value); },
    });
    Object.defineProperty(panel, 'style', { value: proxy, configurable: true });
    s.update();
    expect(writes).toBe(0);
    s.onClose!();
  });
});

/**
 * overlay F-7, second half. A panel is portalled to the overlay container, so
 * no ancestor clips it; when the trigger scrolls out of an `overflow: hidden`
 * container the panel used to keep painting at the trigger's last viewport
 * position — a live, clickable menu pointing at nothing.
 */
describe('anchoredTo — clipping ancestors', () => {
  /**
   * jsdom has no layout, so `getComputedStyle().overflowY` only reports what
   * an inline style sets. That is enough: the walk reads exactly that
   * property, and the per-frame path reads rects, which the fixtures stub.
   */
  function scrollBox(rect: Partial<DOMRect>): HTMLElement {
    const box = mount('div', rect);
    box.style.overflow = 'hidden';
    return box;
  }

  function openAnchored(
    trigger: HTMLElement,
    panel: HTMLElement,
    opts: { hideWhenDetached?: boolean } = {},
  ) {
    const s = anchoredTo({ trigger: signal(trigger), side: 'bottom', align: 'start', ...opts });
    s.attach(makeCtx(panel, trigger));
    s.onOpen!();
    return s;
  }

  it('hides the panel once the trigger scrolls out of its clipping ancestor', () => {
    const box = scrollBox({ top: 100, bottom: 300, left: 0, right: 200, width: 200, height: 200 });
    const trigger = sized(document.createElement('button'), {
      top: 150, bottom: 170, left: 10, right: 60, width: 50, height: 20,
    });
    box.appendChild(trigger);
    const panel = mount('div', { width: 80, height: 40 });

    const s = openAnchored(trigger, panel);
    expect(panel.style.visibility).toBe('');
    expect(panel.style.top).toBe('170px');

    // The container scrolled: the trigger is now above the box's top edge.
    sized(trigger, { top: 20, bottom: 40, left: 10, right: 60, width: 50, height: 20 });
    s.update();
    expect(panel.style.visibility).toBe('hidden');
    expect(panel.style.pointerEvents).toBe('none');
    // Still at its last good position — it is hidden, not moved.
    expect(panel.style.top).toBe('170px');

    s.onClose!();
  });

  it('restores the panel when the trigger scrolls back into view', () => {
    const box = scrollBox({ top: 100, bottom: 300, left: 0, right: 200, width: 200, height: 200 });
    const trigger = sized(document.createElement('button'), {
      top: 20, bottom: 40, left: 10, right: 60, width: 50, height: 20,
    });
    box.appendChild(trigger);
    const panel = mount('div', { width: 80, height: 40 });

    const s = openAnchored(trigger, panel);
    expect(panel.style.visibility).toBe('hidden');

    sized(trigger, { top: 150, bottom: 170, left: 10, right: 60, width: 50, height: 20 });
    s.update();
    expect(panel.style.visibility).toBe('');
    expect(panel.style.pointerEvents).toBe('');
    expect(panel.style.top).toBe('170px');

    s.onClose!();
  });

  it('leaves a trigger with no clipping ancestor alone', () => {
    const plain = mount('div', { top: 100, bottom: 300, left: 0, right: 200, width: 200, height: 200 });
    const trigger = sized(document.createElement('button'), {
      top: -500, bottom: -480, left: 10, right: 60, width: 50, height: 20,
    });
    plain.appendChild(trigger);
    const panel = mount('div', { width: 80, height: 40 });

    const s = openAnchored(trigger, panel);
    expect(panel.style.visibility).toBe('');
    s.onClose!();
  });

  it('hideWhenDetached: false keeps the panel pinned', () => {
    const box = scrollBox({ top: 100, bottom: 300, left: 0, right: 200, width: 200, height: 200 });
    const trigger = sized(document.createElement('button'), {
      top: 20, bottom: 40, left: 10, right: 60, width: 50, height: 20,
    });
    box.appendChild(trigger);
    const panel = mount('div', { width: 80, height: 40 });

    const s = openAnchored(trigger, panel, { hideWhenDetached: false });
    expect(panel.style.visibility).toBe('');
    expect(panel.style.top).toBe('40px');
    s.onClose!();
  });

  it('close clears the detached posture so a reused panel is not stuck hidden', () => {
    const box = scrollBox({ top: 100, bottom: 300, left: 0, right: 200, width: 200, height: 200 });
    const trigger = sized(document.createElement('button'), {
      top: 20, bottom: 40, left: 10, right: 60, width: 50, height: 20,
    });
    box.appendChild(trigger);
    const panel = mount('div', { width: 80, height: 40 });

    const s = openAnchored(trigger, panel);
    expect(panel.style.visibility).toBe('hidden');
    s.onClose!();
    expect(panel.style.visibility).toBe('');
    expect(panel.style.pointerEvents).toBe('');
  });

  it('resolves the clipping ancestors once per open, not once per frame', () => {
    const box = scrollBox({ top: 100, bottom: 300, left: 0, right: 200, width: 200, height: 200 });
    const trigger = sized(document.createElement('button'), {
      top: 150, bottom: 170, left: 10, right: 60, width: 50, height: 20,
    });
    box.appendChild(trigger);
    const panel = mount('div', { width: 80, height: 40 });

    const real = window.getComputedStyle.bind(window);
    const spy = vi.fn(real);
    window.getComputedStyle = spy as unknown as typeof window.getComputedStyle;
    try {
      const s = openAnchored(trigger, panel);
      const afterOpen = spy.mock.calls.length;
      expect(afterOpen).toBeGreaterThan(0);
      for (let i = 0; i < 20; i++) s.update();
      // `getComputedStyle` is the expensive read; the per-frame path must not
      // make one.
      expect(spy.mock.calls.length).toBe(afterOpen);
      s.onClose!();
    } finally {
      window.getComputedStyle = real;
    }
  });
});

describe('pxOffset', () => {
  it('lets 0 through where `Number(v) || fallback` swallowed it', () => {
    const t = pxOffset(8);
    expect(t(0)).toBe(0);
    expect(t('0')).toBe(0);
    expect(t(12)).toBe(12);
    expect(t(-4)).toBe(-4);
  });

  it('falls back for a non-numeric, empty or absent value', () => {
    const t = pxOffset(8);
    expect(t(undefined)).toBe(8);
    expect(t(null)).toBe(8);
    expect(t('')).toBe(8);
    expect(t('nope')).toBe(8);
    expect(t(NaN)).toBe(8);
  });
});

describe('injectAnchoredPosition (arch F-4)', () => {
  /**
   * Eight panels repeated `inject(KJ_OVERLAY_POSITION_STRATEGY) as
   * ReturnType<typeof anchoredTo>` followed by `.configure(…)`. The cast was
   * unchecked: provide a non-anchored strategy into the slot and the mistake
   * surfaced later, inside the strategy, naming neither the panel nor the
   * provider. This is the one narrowing that replaced all eight.
   */
  function inInjector<T>(providers: Provider[], fn: () => T): T {
    return runInInjectionContext(Injector.create({ providers }), fn);
  }

  it('configures the provided anchoredTo strategy and hands it back', () => {
    const strategy = anchoredTo();
    const configure = vi.spyOn(strategy, 'configure');
    const side = signal<'top' | 'bottom'>('top');
    const returned = inInjector(
      [{ provide: KJ_OVERLAY_POSITION_STRATEGY, useValue: strategy }],
      () => injectAnchoredPosition({ side, align: 'center', offset: 0 }),
    );
    expect(returned).toBe(strategy);
    expect(configure).toHaveBeenCalledWith({ side, align: 'center', offset: 0 });
  });

  it('throws a message naming the fix when the slot holds a non-anchored strategy', () => {
    // `inPlaceSibling()`-shaped: a real position strategy, but not one that
    // takes side/align/offset.
    const notAnchored = { attach() {}, update() {}, onOpen() {}, onClose() {}, detach() {} };
    expect(() =>
      inInjector(
        [{ provide: KJ_OVERLAY_POSITION_STRATEGY, useValue: notAnchored }],
        () => injectAnchoredPosition({ side: 'bottom', align: 'center' }),
      ),
    ).toThrow(/anchoredTo\(\) strategy/);
  });
});
