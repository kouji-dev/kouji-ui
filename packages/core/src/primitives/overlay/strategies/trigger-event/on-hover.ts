import type { KjOverlayContext } from '../../context';
import type { KjTriggerEventStrategy } from '../../tokens';

export interface KjOnHoverOpts { openDelay?: number; closeDelay?: number; }

export function onHover(opts: KjOnHoverOpts = {}): KjTriggerEventStrategy {
  let ctx: KjOverlayContext | null = null;
  let toggle: (() => void) | null = null;
  let openTimer = 0, closeTimer = 0;
  let onEnter: ((e: Event) => void) | null = null;
  let onLeave: ((e: Event) => void) | null = null;

  const openDelay = opts.openDelay ?? 0;
  const closeDelay = opts.closeDelay ?? 0;

  const wire = () => {
    if (!ctx?.platform.isBrowser) return;
    const trigger = ctx.triggerEl();
    if (!trigger || onEnter) return;
    onEnter = () => {
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = 0; }
      if (ctx?.isOpen()) return;
      openTimer = setTimeout(() => { toggle?.(); openTimer = 0; }, openDelay) as unknown as number;
    };
    onLeave = () => {
      if (openTimer) { clearTimeout(openTimer); openTimer = 0; }
      if (!ctx?.isOpen()) return;
      closeTimer = setTimeout(() => { toggle?.(); closeTimer = 0; }, closeDelay) as unknown as number;
    };
    trigger.addEventListener('pointerenter', onEnter);
    trigger.addEventListener('pointerleave', onLeave);
  };

  return {
    ariaHasPopup: null,
    attach(c) { ctx = c; wire(); },
    bindToggle(t) { toggle = t; wire(); },
    onOpen() {}, onClose() {},
    detach() {
      const trigger = ctx?.triggerEl();
      if (trigger && onEnter) trigger.removeEventListener('pointerenter', onEnter);
      if (trigger && onLeave) trigger.removeEventListener('pointerleave', onLeave);
      if (openTimer) clearTimeout(openTimer);
      if (closeTimer) clearTimeout(closeTimer);
      onEnter = onLeave = null; openTimer = closeTimer = 0;
      toggle = null; ctx = null;
    },
  };
}
