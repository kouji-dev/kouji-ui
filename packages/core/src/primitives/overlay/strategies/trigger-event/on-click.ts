import type { KjOverlayContext } from '../../context';
import type { KjTriggerEventStrategy } from '../../tokens';

export function onClick(): KjTriggerEventStrategy {
  let ctx: KjOverlayContext | null = null;
  let toggle: (() => void) | null = null;
  let listener: ((e: Event) => void) | null = null;

  const wireListener = () => {
    if (!ctx?.platform.isBrowser) return;
    const trigger = ctx.triggerEl();
    if (!trigger || listener) return;
    listener = () => toggle?.();
    trigger.addEventListener('click', listener);
  };

  return {
    ariaHasPopup: null,
    attach(c) { ctx = c; wireListener(); },
    bindToggle(t) { toggle = t; wireListener(); },
    onOpen() {}, onClose() {},
    detach() {
      const trigger = ctx?.triggerEl();
      if (trigger && listener) trigger.removeEventListener('click', listener);
      listener = null; toggle = null; ctx = null;
    },
  };
}
