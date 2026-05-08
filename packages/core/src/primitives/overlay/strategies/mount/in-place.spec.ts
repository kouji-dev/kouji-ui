import { signal } from '@angular/core';
import { describe, it, expect } from 'vitest';
import { inPlace } from './in-place';
import type { KjOverlayContext } from '../../context';

describe('inPlace', () => {
  it('portalled=false and resolveContainer returns parent', () => {
    const parent = document.createElement('div');
    const panel = document.createElement('div');
    parent.appendChild(panel);

    const s = inPlace();
    expect(s.portalled).toBe(false);

    const ctx: KjOverlayContext = {
      state: signal('closed'), isOpen: signal(false),
      triggerEl: signal(null), panelEl: signal(panel),
      stack: {} as never, platform: { isBrowser: true },
      requestClose: () => {},
    };
    s.attach(ctx);
    expect(s.resolveContainer()).toBe(parent);
  });

  it('onOpen and onClose are no-ops', () => {
    const panel = document.createElement('div');
    const parent = document.createElement('div');
    parent.appendChild(panel);
    const s = inPlace();
    s.attach({
      state: signal('closed'), isOpen: signal(false),
      triggerEl: signal(null), panelEl: signal(panel),
      stack: {} as never, platform: { isBrowser: true },
      requestClose: () => {},
    });
    s.onOpen!();
    s.onClose!();
    expect(panel.parentElement).toBe(parent);
  });
});
