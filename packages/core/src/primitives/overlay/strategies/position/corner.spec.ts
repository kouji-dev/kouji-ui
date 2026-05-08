import { signal } from '@angular/core';
import { describe, it, expect } from 'vitest';
import { corner } from './corner';
import type { KjOverlayContext } from '../../context';

function makeCtx(panel: HTMLElement): KjOverlayContext {
  return {
    state: signal('closed'), isOpen: signal(false),
    triggerEl: signal(null), panelEl: signal(panel),
    stack: {} as never, platform: { isBrowser: true },
    requestClose: () => {},
  };
}

describe('corner', () => {
  it('top-right with offset', () => {
    const panel = document.createElement('div');
    const s = corner({ position: 'top-right', offset: { x: 8, y: 12 } });
    s.attach(makeCtx(panel));
    s.onOpen!();
    expect(panel.style.position).toBe('fixed');
    expect(panel.style.top).toBe('12px');
    expect(panel.style.right).toBe('8px');
    s.onClose!();
    expect(panel.style.position).toBe('');
  });

  it('bottom-left default offset 0', () => {
    const panel = document.createElement('div');
    const s = corner({ position: 'bottom-left' });
    s.attach(makeCtx(panel));
    s.onOpen!();
    expect(panel.style.bottom).toBe('0px');
    expect(panel.style.left).toBe('0px');
  });
});
