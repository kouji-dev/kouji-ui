import { signal } from '@angular/core';
import { describe, it, expect } from 'vitest';
import { inContainer } from './in-container';
import type { KjOverlayContext } from '../../context';

function makeCtx(panel: HTMLElement): KjOverlayContext {
  return {
    state: signal('closed'), isOpen: signal(false),
    triggerEl: signal(null), panelEl: signal(panel),
    stack: {} as never, platform: { isBrowser: true },
    requestClose: () => {},
  };
}

describe('inContainer', () => {
  it('accepts HTMLElement target — onOpen moves panel; onClose restores', () => {
    const target = document.createElement('div');
    const parent = document.createElement('div');
    const panel = document.createElement('div');
    parent.appendChild(panel);

    const s = inContainer(target);
    s.attach(makeCtx(panel));
    s.onOpen!();
    expect(panel.parentElement).toBe(target);
    s.onClose!();
    expect(panel.parentElement).toBe(parent);
  });

  it('accepts function target (lazy)', () => {
    const target = document.createElement('div');
    const parent = document.createElement('div');
    const panel = document.createElement('div');
    parent.appendChild(panel);

    const s = inContainer(() => target);
    s.attach(makeCtx(panel));
    s.onOpen!();
    expect(panel.parentElement).toBe(target);
    s.onClose!();
    expect(panel.parentElement).toBe(parent);
  });
});
