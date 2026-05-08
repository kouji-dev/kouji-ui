import { isSignal, type Signal } from '@angular/core';
import type { KjOverlayContext } from '../../context';
import type { KjTriggerEventStrategy } from '../../tokens';

type Reactive<T> = T | Signal<T> | (() => T);
const read = <T>(v: Reactive<T> | undefined, fallback: T): T => {
  if (v === undefined) return fallback;
  if (isSignal(v)) return v();
  if (typeof v === 'function') return (v as () => T)();
  return v;
};

export interface KjOnHoverOpts {
  openDelay?: Reactive<number>;
  closeDelay?: Reactive<number>;
}

export type KjOnHoverStrategy = KjTriggerEventStrategy & {
  configure(opts: Partial<KjOnHoverOpts>): void;
};

/**
 * Returns the effective hover-listening target. `pointerenter`/`pointerleave`
 * do not bubble, and elements with `display: contents` (e.g. `<kj-button>`)
 * never receive these events because they have no rendered box. Walk to the
 * first descendant with a layout box.
 */
const effectiveHoverTarget = (el: HTMLElement): HTMLElement => {
  if (typeof window === 'undefined') return el;
  const r = el.getBoundingClientRect();
  if (r.width > 0 || r.height > 0) return el;
  let cur: HTMLElement | null = el;
  while (cur) {
    const child = cur.firstElementChild as HTMLElement | null;
    if (!child) break;
    const cr = child.getBoundingClientRect();
    if (cr.width > 0 || cr.height > 0) return child;
    cur = child;
  }
  return el;
};

export function onHover(initialOpts: Partial<KjOnHoverOpts> = {}): KjOnHoverStrategy {
  let opts: Partial<KjOnHoverOpts> = { ...initialOpts };
  let ctx: KjOverlayContext | null = null;
  let toggle: (() => void) | null = null;
  let openTimer = 0, closeTimer = 0;
  let onEnter: ((e: Event) => void) | null = null;
  let onLeave: ((e: Event) => void) | null = null;
  let listenTarget: HTMLElement | null = null;

  const wire = () => {
    if (!ctx?.platform.isBrowser) return;
    const trigger = ctx.triggerEl();
    if (!trigger || onEnter) return;
    listenTarget = effectiveHoverTarget(trigger);
    onEnter = () => {
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = 0; }
      if (ctx?.isOpen()) return;
      openTimer = setTimeout(() => { toggle?.(); openTimer = 0; }, read(opts.openDelay, 0)) as unknown as number;
    };
    onLeave = () => {
      if (openTimer) { clearTimeout(openTimer); openTimer = 0; }
      if (!ctx?.isOpen()) return;
      closeTimer = setTimeout(() => { toggle?.(); closeTimer = 0; }, read(opts.closeDelay, 0)) as unknown as number;
    };
    listenTarget.addEventListener('pointerenter', onEnter);
    listenTarget.addEventListener('pointerleave', onLeave);
  };

  return {
    ariaHasPopup: null,
    attach(c) { ctx = c; wire(); },
    bindToggle(t) { toggle = t; wire(); },
    onOpen() {}, onClose() {},
    detach() {
      if (listenTarget && onEnter) listenTarget.removeEventListener('pointerenter', onEnter);
      if (listenTarget && onLeave) listenTarget.removeEventListener('pointerleave', onLeave);
      if (openTimer) clearTimeout(openTimer);
      if (closeTimer) clearTimeout(closeTimer);
      onEnter = onLeave = null; listenTarget = null; openTimer = closeTimer = 0;
      toggle = null; ctx = null;
    },
    configure(newOpts) { opts = { ...opts, ...newOpts }; },
  };
}
