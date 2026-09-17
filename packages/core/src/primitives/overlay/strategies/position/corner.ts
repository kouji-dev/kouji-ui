import type { KjOverlayContext } from '../../context';
import type { KjPositionStrategy } from '../../tokens';

/** Viewport corner an overlay is pinned to. */
export type KjCornerPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/** Pins the panel to a viewport corner with an optional px offset. Used by the toast viewport. */
export function corner(opts: { position: KjCornerPosition; offset?: { x?: number; y?: number } }): KjPositionStrategy {
  let ctx: KjOverlayContext | null = null;
  const ox = opts.offset?.x ?? 0;
  const oy = opts.offset?.y ?? 0;
  const apply = () => {
    const panel = ctx?.panelEl();
    if (!panel) return;
    panel.style.position = 'fixed';
    panel.style.left = panel.style.right = panel.style.top = panel.style.bottom = '';
    if (opts.position === 'top-left')     { panel.style.top = `${oy}px`;    panel.style.left  = `${ox}px`; }
    if (opts.position === 'top-right')    { panel.style.top = `${oy}px`;    panel.style.right = `${ox}px`; }
    if (opts.position === 'bottom-left')  { panel.style.bottom = `${oy}px`; panel.style.left  = `${ox}px`; }
    if (opts.position === 'bottom-right') { panel.style.bottom = `${oy}px`; panel.style.right = `${ox}px`; }
  };
  const clear = () => {
    const panel = ctx?.panelEl();
    if (!panel) return;
    panel.style.position = '';
    panel.style.left = panel.style.right = panel.style.top = panel.style.bottom = '';
  };
  return {
    attach(c) { ctx = c; },
    onOpen() { apply(); },
    onClose() { clear(); },
    update() { apply(); },
    detach() { ctx = null; },
  };
}
