import { signal } from '@angular/core';
import { describe, it, expect } from 'vitest';
import { pointAt } from './point-at';
import type { KjOverlayContext } from '../../context';

function makeCtx(panel: HTMLElement): KjOverlayContext {
  return {
    state: signal('closed'), isOpen: signal(false),
    triggerEl: signal(null), panelEl: signal(panel),
    stack: {} as never, platform: { isBrowser: true },
    requestClose: () => {},
  };
}

describe('pointAt', () => {
  it('literal coords place panel', () => {
    const panel = document.createElement('div');
    const s = pointAt({ x: 10, y: 20 });
    s.attach(makeCtx(panel));
    s.onOpen!();
    expect(panel.style.position).toBe('fixed');
    expect(panel.style.left).toBe('10px');
    expect(panel.style.top).toBe('20px');
    s.onClose!();
    expect(panel.style.left).toBe('');
  });

  it('signal coords reflect on update', () => {
    const panel = document.createElement('div');
    const x = signal(5); const y = signal(15);
    const s = pointAt({ x, y });
    s.attach(makeCtx(panel));
    s.onOpen!();
    expect(panel.style.left).toBe('5px');
    x.set(50); y.set(60);
    s.update();
    expect(panel.style.left).toBe('50px');
    expect(panel.style.top).toBe('60px');
  });
});
