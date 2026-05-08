import { isSignal, signal, computed, type Signal } from '@angular/core';
import type { KjOverlayContext } from '../../context';
import type { KjPositionStrategy } from '../../tokens';
import type { KjSide, KjAlign, KjPlacement } from '../../types';

export interface KjAnchoredToOpts {
  trigger?: Signal<HTMLElement | null>;
  side: Signal<KjSide> | KjSide;
  align: Signal<KjAlign> | KjAlign;
  offset?: Signal<number> | number;
  flip?: boolean;
  shift?: boolean;
  /**
   * How to size the panel relative to the trigger:
   * - `'none'` (default) — panel keeps its intrinsic width.
   * - `'min'`            — panel min-width matches trigger width (panel can grow but not shrink below).
   * - `'fixed'`          — panel width matches trigger width exactly.
   */
  matchTriggerWidth?: 'none' | 'min' | 'fixed';
}

export type KjAnchoredToStrategy = KjPositionStrategy & {
  configure(opts: Partial<KjAnchoredToOpts>): void;
};

const read = <T>(v: Signal<T> | T): T => isSignal(v) ? v() : v;

let _anchorIdCounter = 0;

const supportsCssAnchor = (): boolean => {
  // Disabled — CSS Anchor Positioning + position-area produces inconsistent
  // results across browser versions (Chrome flips/inflates inset unexpectedly
  // with span-* keywords). Manual math fallback is the canonical path.
  return false;
};

const positionAreaFor = (side: KjSide, align: KjAlign): string => {
  if (side === 'top' || side === 'bottom') {
    const cross = align === 'start' ? 'span-right'
                : align === 'end'   ? 'span-left'
                                    : 'center';
    return `${side} ${cross}`;
  }
  const cross = align === 'start' ? 'span-bottom'
              : align === 'end'   ? 'span-top'
                                  : 'center';
  return `${side} ${cross}`;
};

export function anchoredTo(initialOpts: Partial<KjAnchoredToOpts> = {}): KjAnchoredToStrategy {
  let opts: Partial<KjAnchoredToOpts> = { ...initialOpts };
  let ctx: KjOverlayContext | null = null;
  let onResize: (() => void) | null = null;
  let onScroll: (() => void) | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let useCssAnchor: boolean | null = null;
  let anchorIdent: string | null = null;
  let cssTrigger: HTMLElement | null = null;
  let isOpen = false;
  const _placement = signal<KjPlacement | null>(null);
  const placement = computed(() => _placement());

  const applyCss = () => {
    if (!ctx?.platform.isBrowser) return;
    const trigger = opts.trigger ? opts.trigger() : ctx.triggerEl();
    const panel = ctx.panelEl();
    if (!trigger || !panel) return;

    const side = read<KjSide>(opts.side ?? 'bottom');
    const align = read<KjAlign>(opts.align ?? 'center');
    const offset = read<number>(opts.offset ?? 0);

    if (!anchorIdent) anchorIdent = `--kj-anchor-${++_anchorIdCounter}`;
    trigger.style.setProperty('anchor-name', anchorIdent);
    cssTrigger = trigger;

    panel.style.setProperty('position', 'fixed');
    panel.style.setProperty('position-anchor', anchorIdent);
    panel.style.setProperty('position-area', positionAreaFor(side, align));
    panel.style.setProperty('margin', `${offset}px`);

    _placement.set({ side, align });
  };

  const clearCss = () => {
    const panel = ctx?.panelEl();
    if (panel) {
      panel.style.removeProperty('position');
      panel.style.removeProperty('position-anchor');
      panel.style.removeProperty('position-area');
      panel.style.removeProperty('margin');
    }
    if (cssTrigger && anchorIdent) {
      const current = cssTrigger.style.getPropertyValue('anchor-name');
      if (current === anchorIdent) {
        cssTrigger.style.removeProperty('anchor-name');
      }
    }
    cssTrigger = null;
    _placement.set(null);
  };

  const applyManual = () => {
    if (!ctx?.platform.isBrowser) return;
    const trigger = opts.trigger ? opts.trigger() : ctx.triggerEl();
    const panel = ctx.panelEl();
    if (!trigger || !panel) return;

    const side = read<KjSide>(opts.side ?? 'bottom');
    const align = read<KjAlign>(opts.align ?? 'center');
    const offset = read<number>(opts.offset ?? 0);
    const flip = opts.flip ?? true;
    const shift = opts.shift ?? true;
    const matchWidth = opts.matchTriggerWidth ?? 'none';
    const tRect = trigger.getBoundingClientRect();

    // Apply width matching BEFORE measuring panel — affects pRect.
    if (matchWidth === 'fixed') {
      panel.style.width = `${tRect.width}px`;
    } else if (matchWidth === 'min') {
      panel.style.minWidth = `${tRect.width}px`;
    }

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

  const clearManual = () => {
    const panel = ctx?.panelEl();
    if (!panel) return;
    panel.style.position = '';
    panel.style.left = '';
    panel.style.top = '';
    panel.style.width = '';
    panel.style.minWidth = '';
    _placement.set(null);
  };

  const apply = () => {
    if (useCssAnchor) applyCss();
    else applyManual();
  };

  return {
    placement,
    attach(c) { ctx = c; },
    onOpen() {
      isOpen = true;
      if (useCssAnchor === null) {
        useCssAnchor = ctx?.platform.isBrowser ? supportsCssAnchor() : false;
      }
      if (useCssAnchor) {
        applyCss();
        return;
      }
      applyManual();
      if (!ctx?.platform.isBrowser) return;
      onResize = () => applyManual();
      onScroll = () => applyManual();
      window.addEventListener('resize', onResize);
      window.addEventListener('scroll', onScroll, true);
      const trigger = opts.trigger ? opts.trigger() : ctx.triggerEl();
      const panel = ctx.panelEl();
      if (typeof ResizeObserver !== 'undefined' && trigger && panel) {
        resizeObserver = new ResizeObserver(() => applyManual());
        resizeObserver.observe(trigger);
        resizeObserver.observe(panel);
      }
    },
    onClose() {
      isOpen = false;
      if (useCssAnchor) {
        clearCss();
        return;
      }
      clearManual();
      if (onResize) window.removeEventListener('resize', onResize);
      if (onScroll) window.removeEventListener('scroll', onScroll, true);
      onResize = onScroll = null;
      resizeObserver?.disconnect();
      resizeObserver = null;
    },
    update() {
      if (useCssAnchor) return;
      applyManual();
    },
    detach() { ctx = null; },
    configure(newOpts: Partial<KjAnchoredToOpts>) {
      opts = { ...opts, ...newOpts };
      if (isOpen) apply();
    },
  };
}
