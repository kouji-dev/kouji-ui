import type { KjOverlayContext } from '../../context';
import type { KjMountStrategy } from '../../tokens';

export function inPlace(): KjMountStrategy {
  let ctx: KjOverlayContext | null = null;
  return {
    portalled: false,
    attach(c) { ctx = c; },
    onOpen() {},
    onClose() {},
    detach() { ctx = null; },
    resolveContainer() {
      const panel = ctx?.panelEl();
      return panel?.parentElement ?? document.body;
    },
  };
}
