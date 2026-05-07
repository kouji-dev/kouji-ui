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
  it('accepts HTMLElement target', () => {
    const target = document.createElement('div');
    const parent = document.createElement('div');
    const panel = document.createElement('div');
    parent.appendChild(panel);
    document.body.append(target, parent);

    const s = inContainer(target);
    s.attach(makeCtx(panel));
    s.onOpen!();
    expect(panel.parentElement).toBe(target);
    s.onClose!();
    expect(panel.parentElement).toBe(parent);

    target.remove(); parent.remove();
  });

  it('accepts function target (lazy)', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const parent = document.createElement('div');
    const panel = document.createElement('div');
    parent.appendChild(panel);
    document.body.appendChild(parent);

    const s = inContainer(() => target);
    s.attach(makeCtx(panel));
    s.onOpen!();
    expect(panel.parentElement).toBe(target);
    s.onClose!();

    target.remove(); parent.remove();
  });
});
