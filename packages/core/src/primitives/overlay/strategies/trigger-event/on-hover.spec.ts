import { signal } from '@angular/core';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { onHover } from './on-hover';
import type { KjOverlayContext } from '../../context';

describe('onHover', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('pointerenter then delay opens', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    const isOpen = signal(false);
    const ctx: KjOverlayContext = {
      state: signal('closed'), isOpen,
      triggerEl: signal(trigger), panelEl: signal(null),
      stack: {} as never, platform: { isBrowser: true },
      requestClose: () => {},
    };
    const toggle = vi.fn(() => isOpen.set(!isOpen()));
    const s = onHover({ openDelay: 200 });
    s.attach(ctx);
    s.bindToggle(toggle);

    trigger.dispatchEvent(new Event('pointerenter'));
    expect(toggle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(199);
    expect(toggle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(toggle).toHaveBeenCalledTimes(1);

    s.detach();
    trigger.remove();
  });

  it('pointerleave after open then delay closes', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    const isOpen = signal(true);
    const ctx: KjOverlayContext = {
      state: signal('open'), isOpen,
      triggerEl: signal(trigger), panelEl: signal(null),
      stack: {} as never, platform: { isBrowser: true },
      requestClose: () => {},
    };
    const toggle = vi.fn(() => isOpen.set(!isOpen()));
    const s = onHover({ closeDelay: 100 });
    s.attach(ctx);
    s.bindToggle(toggle);

    trigger.dispatchEvent(new Event('pointerleave'));
    vi.advanceTimersByTime(101);
    expect(toggle).toHaveBeenCalledTimes(1);
    s.detach();
    trigger.remove();
  });
});
