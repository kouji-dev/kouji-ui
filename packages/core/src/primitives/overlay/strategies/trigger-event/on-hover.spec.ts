import { signal } from '@angular/core';
import { describe, it, expect } from 'vitest';
import { onHover } from './on-hover';
import type { KjOverlayContext } from '../../context';

describe('onHover', () => {
  it('ariaHasPopup is null and strategy has lifecycle methods', () => {
    const s = onHover();
    expect(s.ariaHasPopup).toBeNull();
    expect(typeof s.attach).toBe('function');
    expect(typeof s.bindToggle).toBe('function');
    expect(typeof s.detach).toBe('function');
  });

  it('pointerenter with openDelay=0 triggers toggle synchronously after microtask', async () => {
    const trigger = document.createElement('button');
    const isOpen = signal(false);
    const ctx: KjOverlayContext = {
      state: signal('closed'), isOpen,
      triggerEl: signal(trigger), panelEl: signal(null),
      stack: {} as never, platform: { isBrowser: true },
      requestClose: () => {},
    };
    let called = 0;
    const toggle = () => { called++; };
    const s = onHover({ openDelay: 0 });
    s.attach(ctx);
    s.bindToggle(toggle);
    trigger.dispatchEvent(new Event('pointerenter'));
    await new Promise(r => setTimeout(r, 5));
    expect(called).toBe(1);
    s.detach();
  });
});
