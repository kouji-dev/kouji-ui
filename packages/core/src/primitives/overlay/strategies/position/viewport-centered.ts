import type { KjOverlayContext } from '../../context';
import type { KjPositionStrategy } from '../../tokens';

export function viewportCentered(): KjPositionStrategy {
  let ctx: KjOverlayContext | null = null;

  const apply = () => {
    const panel = ctx?.panelEl();
    if (!panel) return;
    panel.style.position = 'fixed';
    panel.style.left = '50%';
    panel.style.top = '50%';
    panel.style.transform = 'translate(-50%, -50%)';
  };
  const clear = () => {
    const panel = ctx?.panelEl();
    if (!panel) return;
    panel.style.position = '';
    panel.style.left = '';
    panel.style.top = '';
    panel.style.transform = '';
  };

  return {
    attach(c) { ctx = c; },
    onOpen() { apply(); },
    onClose() { clear(); },
    update() { apply(); },
    detach() { ctx = null; },
  };
}
