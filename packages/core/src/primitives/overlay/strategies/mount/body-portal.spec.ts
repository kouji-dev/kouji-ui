import { signal } from '@angular/core';
import { describe, it, expect } from 'vitest';
import { bodyPortal } from './body-portal';
import type { KjOverlayContext } from '../../context';

function makeCtx(panel: HTMLElement | null): KjOverlayContext {
  return {
    state: signal('closed'),
    isOpen: signal(false),
    triggerEl: signal(null),
    panelEl: signal(panel),
    stack: {} as never,
    platform: { isBrowser: true },
    requestClose: () => {},
  };
}

describe('bodyPortal', () => {
  it('portalled=true and resolveContainer returns a per-overlay wrapper inside the singleton container', () => {
    const s = bodyPortal();
    expect(s.portalled).toBe(true);
    const container = s.resolveContainer();
    expect(container.classList.contains('kj-overlay-wrapper')).toBe(true);
    expect(container.closest('.kj-overlay-container')).toBeTruthy();
    expect(document.body.contains(container)).toBe(true);
    // The same wrapper is reused while it is connected.
    expect(s.resolveContainer()).toBe(container);
    s.detach();
    expect(container.isConnected).toBe(false);
  });

  it('onOpen moves the panel into its wrapper; onClose restores it and removes the wrapper', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    const panel = document.createElement('div');
    parent.appendChild(panel);

    const s = bodyPortal();
    s.attach(makeCtx(panel));
    s.onOpen!();
    const wrapper = panel.parentElement!;
    expect(wrapper.classList.contains('kj-overlay-wrapper')).toBe(true);
    expect(wrapper.closest('.kj-overlay-container')).toBeTruthy();
    s.onClose!();
    expect(panel.parentElement).toBe(parent);
    expect(wrapper.isConnected).toBe(false);

    parent.remove();
  });

  it('the wrapper inherits data-theme, data-density and dir from the trigger\'s scope (mfe F-16)', () => {
    const scope = document.createElement('div');
    scope.setAttribute('data-theme', 'custom-draft');
    scope.setAttribute('data-density', 'compact');
    scope.setAttribute('dir', 'rtl');
    const trigger = document.createElement('button');
    const panel = document.createElement('div');
    scope.append(trigger, panel);
    document.body.appendChild(scope);

    const s = bodyPortal();
    const ctx = makeCtx(panel);
    (ctx.triggerEl as ReturnType<typeof signal<HTMLElement | null>>).set(trigger);
    s.attach(ctx);
    s.onOpen!();
    const wrapper = panel.parentElement!;
    expect(wrapper.getAttribute('data-theme')).toBe('custom-draft');
    expect(wrapper.getAttribute('data-density')).toBe('compact');
    expect(wrapper.getAttribute('dir')).toBe('rtl');
    s.onClose!();

    // No scoped ancestor: nothing is written.
    const bare = document.createElement('div');
    document.body.appendChild(bare);
    const plain = document.createElement('div');
    bare.appendChild(plain);
    const s2 = bodyPortal();
    s2.attach(makeCtx(plain));
    s2.onOpen!();
    const w2 = plain.parentElement!;
    expect(w2.hasAttribute('data-theme')).toBe(false);
    expect(w2.hasAttribute('dir')).toBe(false);
    s2.onClose!();

    scope.remove();
    bare.remove();
  });
});
