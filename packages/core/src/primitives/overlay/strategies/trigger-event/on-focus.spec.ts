import { signal } from '@angular/core';
import { describe, it, expect, vi } from 'vitest';
import { onFocus } from './on-focus';
import type { KjOverlayContext } from '../../context';

function makeCtx(trigger: HTMLElement, isOpenSig = signal(false), panel: HTMLElement | null = null): KjOverlayContext {
  return {
    state: signal('closed'), isOpen: isOpenSig,
    triggerEl: signal(trigger), panelEl: signal(panel),
    stack: {} as never, platform: { isBrowser: true },
    requestClose: () => {},
  };
}

describe('onFocus', () => {
  it('focusin opens (when closed)', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    const isOpen = signal(false);
    const ctx = makeCtx(trigger, isOpen);
    const toggle = vi.fn(() => isOpen.set(!isOpen()));
    const s = onFocus();
    s.attach(ctx);
    s.bindToggle(toggle);
    trigger.dispatchEvent(new FocusEvent('focusin'));
    expect(toggle).toHaveBeenCalledTimes(1);
    s.detach();
    trigger.remove();
  });

  it('focusout closes (open) when relatedTarget outside panel', () => {
    const trigger = document.createElement('button');
    const panel = document.createElement('div');
    document.body.append(trigger, panel);
    const isOpen = signal(true);
    const ctx = makeCtx(trigger, isOpen, panel);
    const toggle = vi.fn(() => isOpen.set(!isOpen()));
    const s = onFocus();
    s.attach(ctx);
    s.bindToggle(toggle);
    const out = new FocusEvent('focusout', { relatedTarget: document.body });
    trigger.dispatchEvent(out);
    expect(toggle).toHaveBeenCalledTimes(1);
    s.detach(); trigger.remove(); panel.remove();
  });

  it('focusout to inside panel does NOT close', () => {
    const trigger = document.createElement('button');
    const panel = document.createElement('div');
    const inner = document.createElement('button');
    panel.appendChild(inner);
    document.body.append(trigger, panel);
    const isOpen = signal(true);
    const ctx = makeCtx(trigger, isOpen, panel);
    const toggle = vi.fn(() => isOpen.set(!isOpen()));
    const s = onFocus();
    s.attach(ctx);
    s.bindToggle(toggle);
    const out = new FocusEvent('focusout', { relatedTarget: inner });
    trigger.dispatchEvent(out);
    expect(toggle).not.toHaveBeenCalled();
    s.detach(); trigger.remove(); panel.remove();
  });
});
