import { signal } from '@angular/core';
import { describe, it, expect, vi } from 'vitest';
import { onContextMenu } from './on-context-menu';
import type { KjOverlayContext } from '../../context';

function makeCtx(trigger: HTMLElement): KjOverlayContext {
  return {
    state: signal('closed'), isOpen: signal(false),
    triggerEl: signal(trigger), panelEl: signal(null),
    stack: {} as never, platform: { isBrowser: true },
    requestClose: () => {},
  };
}

describe('onContextMenu', () => {
  it('contextmenu event triggers toggle and prevents default', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    const toggle = vi.fn();
    const s = onContextMenu();
    s.attach(makeCtx(trigger));
    s.bindToggle(toggle);
    const e = new MouseEvent('contextmenu', { cancelable: true, bubbles: true });
    trigger.dispatchEvent(e);
    expect(toggle).toHaveBeenCalledTimes(1);
    expect(e.defaultPrevented).toBe(true);
    s.detach(); trigger.remove();
  });

  it('Shift+F10 keydown triggers', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    const toggle = vi.fn();
    const s = onContextMenu();
    s.attach(makeCtx(trigger));
    s.bindToggle(toggle);
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'F10', shiftKey: true, cancelable: true }));
    expect(toggle).toHaveBeenCalledTimes(1);
    s.detach(); trigger.remove();
  });

  it('ariaHasPopup is "menu"', () => {
    expect(onContextMenu().ariaHasPopup).toBe('menu');
  });
});
