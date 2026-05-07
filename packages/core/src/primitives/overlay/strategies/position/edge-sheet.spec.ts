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
      if (side === 'left')   { expect(panel.style.left).toBe('0');   expect(panel.style.right).toBe(''); }
      if (side === 'right')  { expect(panel.style.right).toBe('0');  expect(panel.style.left).toBe(''); }
      if (side === 'top')    { expect(panel.style.top).toBe('0');    expect(panel.style.bottom).toBe(''); }
      if (side === 'bottom') { expect(panel.style.bottom).toBe('0'); expect(panel.style.top).toBe(''); }
      s.onClose!();
      expect(panel.style.position).toBe('');
    });
  }
});
