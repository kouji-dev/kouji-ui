import { signal } from '@angular/core';
import { describe, it, expect } from 'vitest';
import { anchoredTo } from './anchored-to';
import type { KjOverlayContext } from '../../context';

function makeCtx(panel: HTMLElement): KjOverlayContext {
  return {
    state: signal('closed'), isOpen: signal(false),
    triggerEl: signal(null), panelEl: signal(panel),
    stack: {} as never, platform: { isBrowser: true },
    requestClose: () => {},
  };
}

describe('anchoredTo', () => {
  it('exposes placement signal', () => {
    const trig = signal<HTMLElement | null>(null);
    const s = anchoredTo({ trigger: trig, side: 'bottom', align: 'start' });
    expect(typeof s.placement).toBe('function');
    expect(s.placement!()).toBeNull();
  });

  it('uses CSS Anchor when supported', () => {
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
      const anchor = panel.style.getPropertyValue('position-anchor') || (panel.style as CSSStyleDeclaration & { positionAnchor?: string }).positionAnchor;
      expect(anchor).toMatch(/--kj-anchor-\d+/);
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
});
