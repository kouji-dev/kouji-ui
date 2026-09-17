import { signal } from '@angular/core';
import { describe, it, expect } from 'vitest';
import { composeTriggerEvents, switchableTriggerEvent, whenEnabled } from './compose';
import { onClick } from './on-click';
import type { KjOverlayContext } from '../../context';
import type { KjTriggerEventStrategy } from '../../tokens';

const ctxFor = (trigger: HTMLElement, open = false): KjOverlayContext => ({
  state: signal(open ? 'open' : 'closed'),
  isOpen: signal(open),
  triggerEl: signal(trigger),
  panelEl: signal(null),
  stack: {} as never,
  platform: { isBrowser: true },
  requestClose: () => {},
});

describe('composeTriggerEvents', () => {
  it('fans attach / bindToggle / detach out to every part and takes the first ariaHasPopup', () => {
    const calls: string[] = [];
    const part = (name: string, aria: 'menu' | null): KjTriggerEventStrategy => ({
      ariaHasPopup: aria,
      attach: () => calls.push(`${name}:attach`),
      bindToggle: () => calls.push(`${name}:bind`),
      detach: () => calls.push(`${name}:detach`),
    });
    const s = composeTriggerEvents(part('a', null), part('b', 'menu'));
    expect(s.ariaHasPopup).toBe('menu');
    s.attach(ctxFor(document.createElement('button')));
    s.bindToggle(() => {});
    s.detach();
    expect(calls).toEqual(['a:attach', 'b:attach', 'a:bind', 'b:bind', 'a:detach', 'b:detach']);
  });
});

describe('switchableTriggerEvent', () => {
  it('wires the strategy chosen after attach and swaps it on use()', () => {
    const trigger = document.createElement('button');
    let toggled = 0;
    const s = switchableTriggerEvent();
    s.attach(ctxFor(trigger));
    s.bindToggle(() => {
      toggled++;
    });
    trigger.click();
    expect(toggled).toBe(0); // nothing chosen yet
    s.use(onClick());
    trigger.click();
    expect(toggled).toBe(1);
    s.use(onClick({ openOnly: true }));
    trigger.click();
    expect(toggled).toBe(2); // previous strategy detached: one toggle, not two
    s.detach();
    trigger.click();
    expect(toggled).toBe(2);
  });

  it('onClick({ openOnly }) never toggles an open overlay', () => {
    const trigger = document.createElement('button');
    let toggled = 0;
    const s = onClick({ openOnly: true });
    s.attach(ctxFor(trigger, true));
    s.bindToggle(() => {
      toggled++;
    });
    trigger.click();
    expect(toggled).toBe(0);
    s.detach();
  });
});

describe('whenEnabled', () => {
  it('never opens while disabled, still closes, and opens again once enabled', () => {
    const trigger = document.createElement('button');
    const isOpen = signal(false);
    let enabled = false;
    const ctx = { ...ctxFor(trigger), isOpen };
    const s = whenEnabled(onClick(), () => enabled);
    s.attach(ctx);
    s.bindToggle(() => isOpen.set(!isOpen()));
    trigger.click();
    expect(isOpen()).toBe(false);
    // Opened by another path (programmatic); the gate must still let it close.
    isOpen.set(true);
    trigger.click();
    expect(isOpen()).toBe(false);
    enabled = true;
    trigger.click();
    expect(isOpen()).toBe(true);
    s.detach();
  });

  it('forwards ariaHasPopup and the lifecycle to the wrapped strategy', () => {
    const calls: string[] = [];
    const inner: KjTriggerEventStrategy = {
      ariaHasPopup: 'dialog',
      attach: () => calls.push('attach'),
      bindToggle: () => calls.push('bind'),
      onOpen: () => calls.push('open'),
      onClose: () => calls.push('close'),
      detach: () => calls.push('detach'),
    };
    const s = whenEnabled(inner, () => true);
    expect(s.ariaHasPopup).toBe('dialog');
    s.attach(ctxFor(document.createElement('button')));
    s.bindToggle(() => {});
    s.onOpen?.();
    s.onClose?.();
    s.detach();
    expect(calls).toEqual(['attach', 'bind', 'open', 'close', 'detach']);
  });
});
