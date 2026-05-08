import { signal } from '@angular/core';
import { describe, it, expect } from 'vitest';
import { edgeSheet } from './edge-sheet';
import type { KjOverlayContext } from '../../context';

function makeCtx(panel: HTMLElement): KjOverlayContext {
  return {
    state: signal('closed'), isOpen: signal(false),
    triggerEl: signal(null), panelEl: signal(panel),
    stack: {} as never, platform: { isBrowser: true },
    requestClose: () => {},
  };
}

describe('edgeSheet', () => {
  for (const side of ['left', 'right', 'top', 'bottom'] as const) {
    it(`side=${side} pins to that edge and stretches the others`, () => {
      const panel = document.createElement('div');
      const s = edgeSheet({ side });
      s.attach(makeCtx(panel));
      s.onOpen!();
      expect(panel.style.position).toBe('fixed');
      const zero = (v: string) => v === '0' || v === '0px';
      if (side === 'left')   { expect(zero(panel.style.left)).toBe(true);   expect(panel.style.right).toBe(''); }
      if (side === 'right')  { expect(zero(panel.style.right)).toBe(true);  expect(panel.style.left).toBe(''); }
      if (side === 'top')    { expect(zero(panel.style.top)).toBe(true);    expect(panel.style.bottom).toBe(''); }
      if (side === 'bottom') { expect(zero(panel.style.bottom)).toBe(true); expect(panel.style.top).toBe(''); }
      s.onClose!();
      expect(panel.style.position).toBe('');
    });
  }
});
