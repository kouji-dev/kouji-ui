import { signal } from '@angular/core';
import { describe, it, expect } from 'vitest';
import { bodyPortal } from './body-portal';
import type { KjOverlayContext } from '../../context';

function makeCtx(panel: HTMLElement | null): KjOverlayContext {
  return {
    state: signal('closed'),
    isOpen: signal(false),
    triggerEl: signal(null),
    panelEl: signal(panel),
    stack: {} as never,
    platform: { isBrowser: true },
    requestClose: () => {},
  };
}

describe('bodyPortal', () => {
  it('portalled=true and resolveContainer returns body', () => {
    const s = bodyPortal();
    expect(s.portalled).toBe(true);
    expect(s.resolveContainer()).toBe(document.body);
  });

  it('onOpen moves panel to body; onClose restores it', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    const panel = document.createElement('div');
    parent.appendChild(panel);

    const s = bodyPortal();
    s.attach(makeCtx(panel));
    s.onOpen!();
    expect(panel.parentElement).toBe(document.body);
    s.onClose!();
    expect(panel.parentElement).toBe(parent);

    parent.remove();
  });
});
