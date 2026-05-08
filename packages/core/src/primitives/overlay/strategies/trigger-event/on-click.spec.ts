import { signal } from '@angular/core';
import { describe, it, expect, vi } from 'vitest';
import { onClick } from './on-click';
import type { KjOverlayContext } from '../../context';

describe('onClick', () => {
  it('clicking the trigger after bindToggle invokes the toggle', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);

    const ctx: KjOverlayContext = {
      state: signal('closed'), isOpen: signal(false),
      triggerEl: signal(trigger), panelEl: signal(null),
      stack: {} as never, platform: { isBrowser: true },
      requestClose: () => {},
    };
    const toggle = vi.fn();
    const s = onClick();
    s.attach(ctx);
    s.bindToggle(toggle);
    trigger.click();
    expect(toggle).toHaveBeenCalledTimes(1);
    s.detach();
    trigger.click();
    expect(toggle).toHaveBeenCalledTimes(1);
    trigger.remove();
  });

  it('ariaHasPopup is null', () => {
    expect(onClick().ariaHasPopup).toBeNull();
  });
});
