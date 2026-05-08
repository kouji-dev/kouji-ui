import { signal } from '@angular/core';
import { describe, it, expect, vi } from 'vitest';
import { onFocusOrInput } from './on-focus-or-input';
import type { KjOverlayContext } from '../../context';

describe('onFocusOrInput', () => {
  it('opens on focusin and on input event', () => {
    const trigger = document.createElement('input');
    document.body.appendChild(trigger);
    const isOpen = signal(false);
    const ctx: KjOverlayContext = {
      state: signal('closed'), isOpen,
      triggerEl: signal(trigger), panelEl: signal(null),
      stack: {} as never, platform: { isBrowser: true },
      requestClose: () => {},
    };
    const toggle = vi.fn(() => isOpen.set(!isOpen()));
    const s = onFocusOrInput();
    s.attach(ctx);
    s.bindToggle(toggle);

    trigger.dispatchEvent(new Event('focusin'));
    expect(toggle).toHaveBeenCalledTimes(1);

    isOpen.set(false);
    trigger.dispatchEvent(new Event('input'));
    expect(toggle).toHaveBeenCalledTimes(2);

    s.detach(); trigger.remove();
  });

  it('ariaHasPopup is "listbox"', () => {
    expect(onFocusOrInput().ariaHasPopup).toBe('listbox');
  });
});
