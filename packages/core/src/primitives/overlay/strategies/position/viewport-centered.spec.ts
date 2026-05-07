import { signal } from '@angular/core';
import { describe, it, expect } from 'vitest';
import { viewportCentered } from './viewport-centered';
import type { KjOverlayContext } from '../../context';

function makeCtx(panel: HTMLElement): KjOverlayContext {
  return {
    state: signal('closed'), isOpen: signal(false),
    triggerEl: signal(null), panelEl: signal(panel),
    stack: {} as never, platform: { isBrowser: true },
    requestClose: () => {},
  };
}

describe('viewportCentered', () => {
  it('onOpen applies fixed centering; onClose clears', () => {
    const panel = document.createElement('div');
    const s = viewportCentered();
    s.attach(makeCtx(panel));
    s.onOpen!();
    expect(panel.style.position).toBe('fixed');
    expect(panel.style.left).toBe('50%');
    expect(panel.style.top).toBe('50%');
    expect(panel.style.transform).toBe('translate(-50%, -50%)');
    s.onClose!();
    expect(panel.style.position).toBe('');
    expect(panel.style.left).toBe('');
    expect(panel.style.top).toBe('');
    expect(panel.style.transform).toBe('');
  });
});
