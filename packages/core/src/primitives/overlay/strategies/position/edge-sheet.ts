import type { KjOverlayContext } from '../../context';
import type { KjPositionStrategy } from '../../tokens';

export type KjSheetSide = 'left' | 'right' | 'top' | 'bottom';

export function edgeSheet(opts: { side: KjSheetSide }): KjPositionStrategy {
  let ctx: KjOverlayContext | null = null;
  const side = opts.side;

  const apply = () => {
    const panel = ctx?.panelEl();
    if (!panel) return;
    panel.style.position = 'fixed';
    panel.style.left = side === 'right' ? '' : '0';
    panel.style.right = side === 'left' ? '' : '0';
    panel.style.top = side === 'bottom' ? '' : '0';
    panel.style.bottom = side === 'top' ? '' : '0';
  };
  const clear = () => {
    const panel = ctx?.panelEl();
    if (!panel) return;
    panel.style.position = '';
    panel.style.left = '';
    panel.style.right = '';
    panel.style.top = '';
    panel.style.bottom = '';
  };

  return {
    attach(c) { ctx = c; },
    onOpen() { apply(); },
    onClose() { clear(); },
    update() { apply(); },
    detach() { ctx = null; },
  };
}
