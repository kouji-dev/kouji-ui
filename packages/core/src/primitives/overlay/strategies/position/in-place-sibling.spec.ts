import { signal } from '@angular/core';
import { describe, it, expect } from 'vitest';
import { inPlaceSibling } from './in-place-sibling';
import type { KjOverlayContext } from '../../context';

describe('inPlaceSibling', () => {
  it('all methods are no-ops; panel styles unchanged', () => {
    const panel = document.createElement('div');
    panel.style.color = 'red';
    const ctx: KjOverlayContext = {
      state: signal('closed'), isOpen: signal(false),
      triggerEl: signal(null), panelEl: signal(panel),
      stack: {} as never, platform: { isBrowser: true },
      requestClose: () => {},
    };
    const s = inPlaceSibling();
    s.attach(ctx);
    s.onOpen!();
    s.update();
    s.onClose!();
    s.detach();
    expect(panel.style.position).toBe('');
    expect(panel.style.color).toBe('red');
  });
});
