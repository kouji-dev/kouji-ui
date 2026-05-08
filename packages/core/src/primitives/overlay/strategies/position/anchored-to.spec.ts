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
