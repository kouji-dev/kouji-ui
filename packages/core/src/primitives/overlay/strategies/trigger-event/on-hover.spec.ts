import { signal } from '@angular/core';
import { describe, it, expect, vi } from 'vitest';
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
      state: signal('closed'),
      isOpen,
      triggerEl: signal(trigger),
      panelEl: signal(null),
      stack: {} as never,
      platform: { isBrowser: true },
      requestClose: () => {},
    };
    let called = 0;
    const toggle = () => {
      called++;
    };
    const s = onHover({ openDelay: 0 });
    s.attach(ctx);
    s.bindToggle(toggle);
    trigger.dispatchEvent(new Event('pointerenter'));
    await new Promise((r) => setTimeout(r, 5));
    expect(called).toBe(1);
    s.detach();
  });

  it('the open timer does not toggle a panel another strategy opened during the delay', async () => {
    const trigger = document.createElement('button');
    const isOpen = signal(false);
    const ctx: KjOverlayContext = {
      state: signal('closed'),
      isOpen,
      triggerEl: signal(trigger),
      panelEl: signal(null),
      stack: {} as never,
      platform: { isBrowser: true },
      requestClose: () => {},
    };
    const toggle = vi.fn(() => isOpen.set(!isOpen()));
    const s = onHover({ openDelay: 10 });
    s.attach(ctx);
    s.bindToggle(toggle);
    trigger.dispatchEvent(new Event('pointerenter'));
    // Keyboard focus opened it before the hover intent elapsed.
    isOpen.set(true);
    await new Promise((r) => setTimeout(r, 25));
    expect(toggle).not.toHaveBeenCalled();
    expect(isOpen()).toBe(true);
    s.detach();
  });

  it('the close timer does not toggle a panel already closed during the delay', async () => {
    const trigger = document.createElement('button');
    const isOpen = signal(true);
    const ctx: KjOverlayContext = {
      state: signal('open'),
      isOpen,
      triggerEl: signal(trigger),
      panelEl: signal(null),
      stack: {} as never,
      platform: { isBrowser: true },
      requestClose: () => {},
    };
    const toggle = vi.fn(() => isOpen.set(!isOpen()));
    const s = onHover({ openDelay: 0, closeDelay: 10 });
    s.attach(ctx);
    s.bindToggle(toggle);
    trigger.dispatchEvent(new Event('pointerleave'));
    // Escape closed it before the grace period elapsed.
    isOpen.set(false);
    await new Promise((r) => setTimeout(r, 25));
    expect(toggle).not.toHaveBeenCalled();
    expect(isOpen()).toBe(false);
    s.detach();
  });

  it('interactive: hovering the panel cancels the close scheduled when the pointer left the trigger', async () => {
    const trigger = document.createElement('button');
    const panel = document.createElement('div');
    const isOpen = signal(true);
    const ctx: KjOverlayContext = {
      state: signal('open'),
      isOpen,
      triggerEl: signal(trigger),
      panelEl: signal(panel),
      stack: {} as never,
      platform: { isBrowser: true },
      requestClose: () => {},
    };
    let toggled = 0;
    const s = onHover({ openDelay: 0, closeDelay: 10, interactive: true });
    s.attach(ctx);
    s.bindToggle(() => {
      toggled++;
    });
    trigger.dispatchEvent(new Event('pointerleave'));
    panel.dispatchEvent(new Event('pointerenter'));
    await new Promise((r) => setTimeout(r, 25));
    expect(toggled).toBe(0);
    // Leaving the panel schedules the close again.
    panel.dispatchEvent(new Event('pointerleave'));
    await new Promise((r) => setTimeout(r, 25));
    expect(toggled).toBe(1);
    s.detach();
  });

  it('non-interactive: leaving the trigger closes even if the pointer reaches the panel', async () => {
    const trigger = document.createElement('button');
    const panel = document.createElement('div');
    const ctx: KjOverlayContext = {
      state: signal('open'),
      isOpen: signal(true),
      triggerEl: signal(trigger),
      panelEl: signal(panel),
      stack: {} as never,
      platform: { isBrowser: true },
      requestClose: () => {},
    };
    let toggled = 0;
    const s = onHover({ openDelay: 0, closeDelay: 5 });
    s.attach(ctx);
    s.bindToggle(() => {
      toggled++;
    });
    trigger.dispatchEvent(new Event('pointerleave'));
    panel.dispatchEvent(new Event('pointerenter'));
    await new Promise((r) => setTimeout(r, 20));
    expect(toggled).toBe(1);
    s.detach();
  });
});
