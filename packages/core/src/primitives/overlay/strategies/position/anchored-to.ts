import { isSignal, signal, computed, type Signal } from '@angular/core';
import type { KjOverlayContext } from '../../context';
import type { KjPositionStrategy } from '../../tokens';
import type { KjSide, KjAlign, KjPlacement } from '../../types';

export interface KjAnchoredToOpts {
  trigger: Signal<HTMLElement | null>;
  side: Signal<KjSide> | KjSide;
  align: Signal<KjAlign> | KjAlign;
  offset?: Signal<number> | number;
  flip?: boolean;
  shift?: boolean;
}

const read = <T>(v: Signal<T> | T): T => isSignal(v) ? v() : v;

export function anchoredTo(opts: KjAnchoredToOpts): KjPositionStrategy {
  let ctx: KjOverlayContext | null = null;
  let onResize: (() => void) | null = null;
  let onScroll: (() => void) | null = null;
  let resizeObserver: ResizeObserver | null = null;
  const _placement = signal<KjPlacement | null>(null);
  const placement = computed(() => _placement());

  const flip = opts.flip ?? true;
  const shift = opts.shift ?? true;

  const apply = () => {
    if (!ctx?.platform.isBrowser) return;
    const trigger = opts.trigger();
    const panel = ctx.panelEl();
    if (!trigger || !panel) return;

    const side = read(opts.side);
    const align = read(opts.align);
    const offset = read(opts.offset ?? 0);
    const tRect = trigger.getBoundingClientRect();
    const pRect = panel.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;

    let resolvedSide = side;
    if (flip) {
      if (side === 'bottom' && tRect.bottom + offset + pRect.height > vh && tRect.top - offset - pRect.height >= 0) resolvedSide = 'top';
      else if (side === 'top' && tRect.top - offset - pRect.height < 0 && tRect.bottom + offset + pRect.height <= vh) resolvedSide = 'bottom';
      else if (side === 'right' && tRect.right + offset + pRect.width > vw && tRect.left - offset - pRect.width >= 0) resolvedSide = 'left';
      else if (side === 'left' && tRect.left - offset - pRect.width < 0 && tRect.right + offset + pRect.width <= vw) resolvedSide = 'right';
    }

    let left = 0, top = 0;
    if (resolvedSide === 'bottom') { top = tRect.bottom + offset; }
    if (resolvedSide === 'top')    { top = tRect.top - offset - pRect.height; }
    if (resolvedSide === 'right')  { left = tRect.right + offset; }
    if (resolvedSide === 'left')   { left = tRect.left - offset - pRect.width; }

    if (resolvedSide === 'top' || resolvedSide === 'bottom') {
      if (align === 'start')  left = tRect.left;
      if (align === 'center') left = tRect.left + (tRect.width - pRect.width) / 2;
      if (align === 'end')    left = tRect.right - pRect.width;
    } else {
      if (align === 'start')  top = tRect.top;
      if (align === 'center') top = tRect.top + (tRect.height - pRect.height) / 2;
      if (align === 'end')    top = tRect.bottom - pRect.height;
    }

    if (shift) {
      left = Math.max(0, Math.min(left, vw - pRect.width));
      top  = Math.max(0, Math.min(top,  vh - pRect.height));
    }

    panel.style.position = 'fixed';
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    _placement.set({ side: resolvedSide, align });
  };

  const clear = () => {
    const panel = ctx?.panelEl();
    if (!panel) return;
    panel.style.position = '';
    panel.style.left = '';
    panel.style.top = '';
    _placement.set(null);
  };

  return {
    placement,
    attach(c) { ctx = c; },
    onOpen() {
      apply();
      if (!ctx?.platform.isBrowser) return;
      onResize = () => apply();
      onScroll = () => apply();
      window.addEventListener('resize', onResize);
      window.addEventListener('scroll', onScroll, true);
      const trigger = opts.trigger();
      const panel = ctx.panelEl();
      if (typeof ResizeObserver !== 'undefined' && trigger && panel) {
        resizeObserver = new ResizeObserver(() => apply());
        resizeObserver.observe(trigger);
        resizeObserver.observe(panel);
      }
    },
    onClose() {
      clear();
      if (onResize) window.removeEventListener('resize', onResize);
      if (onScroll) window.removeEventListener('scroll', onScroll, true);
      onResize = onScroll = null;
      resizeObserver?.disconnect();
      resizeObserver = null;
    },
    update() { apply(); },
    detach() { ctx = null; },
  };
}
