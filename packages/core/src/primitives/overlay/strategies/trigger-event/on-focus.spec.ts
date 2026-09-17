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
  it('focus that lands on the trigger while the overlay is closing (the restore) does not re-open', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    const isOpen = signal(false);
    const ctx = makeCtx(trigger, isOpen);
    (ctx.state as ReturnType<typeof signal<'closed' | 'opening' | 'open' | 'closing'>>).set('closing');
    const toggle = vi.fn();
    const s = onFocus();
    s.attach(ctx);
    s.bindToggle(toggle);
    trigger.dispatchEvent(new FocusEvent('focusin'));
    expect(toggle).not.toHaveBeenCalled();
    s.detach();
    trigger.remove();
  });

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

  it('focusin is a no-op when already open (composes with hover without toggling closed)', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    const ctx = makeCtx(trigger, signal(true));
    const toggle = vi.fn();
    const s = onFocus();
    s.attach(ctx);
    s.bindToggle(toggle);
    trigger.dispatchEvent(new FocusEvent('focusin'));
    expect(toggle).not.toHaveBeenCalled();
    s.detach();
    trigger.remove();
  });

  it('focusVisible: opens on real (keyboard-style) focus', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    const isOpen = signal(false);
    const ctx = makeCtx(trigger, isOpen);
    const toggle = vi.fn(() => isOpen.set(!isOpen()));
    const s = onFocus({ focusVisible: true });
    s.attach(ctx);
    s.bindToggle(toggle);
    // jsdom decides `:focus-visible` from the last keyboard event on the
    // document (as a browser does), so reach the trigger like a keyboard user.
    // The Tab keydown is dispatched from <html> rather than from the currently
    // focused element on purpose: when the keydown's target is also the focus
    // event's `relatedTarget`, jsdom falls back to its own "last focus-visible
    // element" memo, which this pool shares across spec files (`isolate: false`)
    // and an earlier file can leave pointing anywhere. From <html> the target is
    // neither the old nor the new focus owner, so the Tab branch is taken
    // unambiguously.
    document.documentElement.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
    );
    trigger.focus();
    expect(document.activeElement).toBe(trigger);
    expect(toggle).toHaveBeenCalledTimes(1);
    s.detach();
    trigger.remove();
  });

  it('focusVisible: skips focus the trigger reports as not :focus-visible', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    const isOpen = signal(false);
    const ctx = makeCtx(trigger, isOpen);
    const toggle = vi.fn(() => isOpen.set(!isOpen()));
    const s = onFocus({ focusVisible: true });
    s.attach(ctx);
    s.bindToggle(toggle);
    const matches = vi.spyOn(trigger, 'matches').mockImplementation((sel: string) => sel !== ':focus-visible');
    trigger.dispatchEvent(new FocusEvent('focusin'));
    expect(toggle).not.toHaveBeenCalled();
    matches.mockRestore();
    s.detach();
    trigger.remove();
  });

  it('focusVisible: opens on any focus where :focus-visible is unsupported', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    const isOpen = signal(false);
    const ctx = makeCtx(trigger, isOpen);
    const toggle = vi.fn(() => isOpen.set(!isOpen()));
    const s = onFocus({ focusVisible: true });
    s.attach(ctx);
    s.bindToggle(toggle);
    const matches = vi.spyOn(trigger, 'matches').mockImplementation(() => { throw new Error('unsupported'); });
    trigger.dispatchEvent(new FocusEvent('focusin'));
    expect(toggle).toHaveBeenCalledTimes(1);
    matches.mockRestore();
    s.detach();
    trigger.remove();
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
