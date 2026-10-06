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

/** Options for {@link onHover}. Delays default to 0 and `interactive` to `false`. */
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

/** {@link onHover}'s return type — delays stay reconfigurable after DI has built it. */
export type KjOnHoverStrategy = KjTriggerEventStrategy & {
  configure(opts: Partial<KjOnHoverOpts>): void;
};

/**
 * Returns the effective hover-listening target. `pointerenter`/`pointerleave`
 * do not bubble, and elements with `display: contents` (e.g. `<kj-button>`)
 * never receive these events because they have no rendered box. Walk to the
 * first descendant with a layout box.
 *
 * Measures, so it forces a layout: call it only on a hover, never on attach —
 * a table with a hover trigger per row would otherwise lay out once per row.
 */
const effectiveHoverTarget = (el: HTMLElement): HTMLElement => {
  if (!el.ownerDocument?.defaultView) return el;
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

/** Opens on hover intent and closes when the pointer leaves the trigger (and panel). */
export function onHover(initialOpts: Partial<KjOnHoverOpts> = {}): KjOnHoverStrategy {
  let opts: Partial<KjOnHoverOpts> = { ...initialOpts };
  let ctx: KjOverlayContext | null = null;
  let toggle: (() => void) | null = null;
  let openTimer = 0,
    closeTimer = 0;
  let onEnter: (() => void) | null = null;
  let onLeave: (() => void) | null = null;
  let onFirstOver: (() => void) | null = null;
  let triggerTarget: HTMLElement | null = null;
  let boxTarget: HTMLElement | null = null;
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
        closeTimer = 0;
        // Another composed strategy (focus, Escape) may have closed it meanwhile.
        if (ctx?.isOpen()) toggle?.();
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
    onEnter = () => {
      cancelClose();
      wirePanel();
      // The first hover can reach here twice (the bubbled `pointerover` that
      // resolves the box target, then that target's own `pointerenter`).
      if (ctx?.isOpen() || openTimer) return;
      openTimer = setTimeout(
        () => {
          openTimer = 0;
          // Focus may have opened it during the hover-intent delay; toggling
          // again would close it under the pointer.
          if (!ctx?.isOpen()) toggle?.();
        },
        read(opts.openDelay, 0),
      ) as unknown as number;
    };
    onLeave = () => {
      wirePanel();
      scheduleClose();
    };
    // Nothing is measured here. The trigger listens directly (enough when it
    // has a box); a `display: contents` trigger only sees the bubbled
    // `pointerover` of a descendant, so the first one resolves — and measures,
    // once — the descendant that actually receives enter / leave.
    onFirstOver = () => {
      if (!onEnter || !onLeave || !triggerTarget) return;
      triggerTarget.removeEventListener('pointerover', onFirstOver!);
      onFirstOver = null;
      const target = effectiveHoverTarget(triggerTarget);
      if (target !== triggerTarget) {
        boxTarget = target;
        target.addEventListener('pointerenter', onEnter);
        target.addEventListener('pointerleave', onLeave);
      }
      onEnter();
    };
    triggerTarget = trigger;
    trigger.addEventListener('pointerenter', onEnter);
    trigger.addEventListener('pointerleave', onLeave);
    trigger.addEventListener('pointerover', onFirstOver);
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
      for (const el of [triggerTarget, boxTarget]) {
        if (!el) continue;
        if (onEnter) el.removeEventListener('pointerenter', onEnter);
        if (onLeave) el.removeEventListener('pointerleave', onLeave);
      }
      if (triggerTarget && onFirstOver)
        triggerTarget.removeEventListener('pointerover', onFirstOver);
      if (panelTarget) {
        panelTarget.removeEventListener('pointerenter', cancelClose);
        panelTarget.removeEventListener('pointerleave', scheduleClose);
      }
      if (openTimer) clearTimeout(openTimer);
      if (closeTimer) clearTimeout(closeTimer);
      onEnter = onLeave = onFirstOver = null;
      triggerTarget = boxTarget = null;
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
