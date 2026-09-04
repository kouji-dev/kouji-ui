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
  /**
   * Keep the panel open while the pointer rests on it. Required for panels
   * that hold controls (a hover popover with actions): the pointer travels
   * from the trigger to the panel, which would otherwise schedule a close.
   * Tooltips leave this off — their content is never interactive.
   */
  interactive?: Reactive<boolean>;
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
  let openTimer = 0,
    closeTimer = 0;
  let onEnter: ((e: Event) => void) | null = null;
  let onLeave: ((e: Event) => void) | null = null;
  let listenTarget: HTMLElement | null = null;
  let panelTarget: HTMLElement | null = null;

  const cancelClose = () => {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = 0;
    }
  };
  const scheduleClose = () => {
    if (openTimer) {
      clearTimeout(openTimer);
      openTimer = 0;
    }
    if (!ctx?.isOpen()) return;
    cancelClose();
    closeTimer = setTimeout(
      () => {
        toggle?.();
        closeTimer = 0;
      },
      read(opts.closeDelay, 0),
    ) as unknown as number;
  };

  // The panel is bound to the controller after the trigger attaches (a
  // `[kjFor]` panel registers itself later), so its listeners are wired
  // lazily — on the first hover intent, once the panel element exists.
  const wirePanel = () => {
    if (panelTarget || !read(opts.interactive, false)) return;
    const panel = ctx?.panelEl();
    if (!panel) return;
    panelTarget = panel;
    panel.addEventListener('pointerenter', cancelClose);
    panel.addEventListener('pointerleave', scheduleClose);
  };

  const wire = () => {
    if (!ctx?.platform.isBrowser) return;
    const trigger = ctx.triggerEl();
    if (!trigger || onEnter) return;
    listenTarget = effectiveHoverTarget(trigger);
    onEnter = () => {
      cancelClose();
      wirePanel();
      if (ctx?.isOpen()) return;
      openTimer = setTimeout(
        () => {
          toggle?.();
          openTimer = 0;
        },
        read(opts.openDelay, 0),
      ) as unknown as number;
    };
    onLeave = () => {
      wirePanel();
      scheduleClose();
    };
    listenTarget.addEventListener('pointerenter', onEnter);
    listenTarget.addEventListener('pointerleave', onLeave);
  };

  return {
    ariaHasPopup: null,
    attach(c) {
      ctx = c;
      wire();
    },
    bindToggle(t) {
      toggle = t;
      wire();
    },
    onOpen() {},
    onClose() {},
    detach() {
      if (listenTarget && onEnter) listenTarget.removeEventListener('pointerenter', onEnter);
      if (listenTarget && onLeave) listenTarget.removeEventListener('pointerleave', onLeave);
      if (panelTarget) {
        panelTarget.removeEventListener('pointerenter', cancelClose);
        panelTarget.removeEventListener('pointerleave', scheduleClose);
      }
      if (openTimer) clearTimeout(openTimer);
      if (closeTimer) clearTimeout(closeTimer);
      onEnter = onLeave = null;
      listenTarget = null;
      panelTarget = null;
      openTimer = closeTimer = 0;
      toggle = null;
      ctx = null;
    },
    configure(newOpts) {
      opts = { ...opts, ...newOpts };
    },
  };
}
