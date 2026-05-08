import { isSignal, type Signal } from '@angular/core';
import type { KjOverlayContext } from '../../context';
import type { KjPositionStrategy } from '../../tokens';

export interface KjPointAtOpts {
  x: Signal<number> | number;
  y: Signal<number> | number;
}

export function pointAt(opts: KjPointAtOpts): KjPositionStrategy {
  let ctx: KjOverlayContext | null = null;
  const read = (v: Signal<number> | number): number => isSignal(v) ? v() : v;
  const apply = () => {
    const panel = ctx?.panelEl();
    if (!panel) return;
    panel.style.position = 'fixed';
    panel.style.left = `${read(opts.x)}px`;
    panel.style.top = `${read(opts.y)}px`;
  };
  const clear = () => {
    const panel = ctx?.panelEl();
    if (!panel) return;
    panel.style.position = '';
    panel.style.left = '';
    panel.style.top = '';
  };
  return {
    attach(c) { ctx = c; },
    onOpen() { apply(); },
    onClose() { clear(); },
    update() { apply(); },
    detach() { ctx = null; },
  };
}
