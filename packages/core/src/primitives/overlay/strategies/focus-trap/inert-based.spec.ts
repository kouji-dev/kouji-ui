import { signal } from '@angular/core';
import { describe, it, expect } from 'vitest';
import { inertBased } from './inert-based';
import type { KjOverlayContext } from '../../context';

describe('inertBased', () => {
  it('onOpen sets inert on siblings; onClose removes it', () => {
    const parent = document.createElement('div');
    const sib = document.createElement('div');
    const panel = document.createElement('div');
    parent.append(sib, panel);
    document.body.appendChild(parent);

    const ctx: KjOverlayContext = {
      state: signal('closed'), isOpen: signal(false),
      triggerEl: signal(null), panelEl: signal(panel),
      stack: {} as never, platform: { isBrowser: true },
      requestClose: () => {},
    };
    const s = inertBased();
    s.attach(ctx);
    s.onOpen!();
    expect(sib.hasAttribute('inert')).toBe(true);
    s.onClose!();
    expect(sib.hasAttribute('inert')).toBe(false);
    parent.remove();
  });
});
