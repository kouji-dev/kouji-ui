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
      const parent = panel?.parentElement;
      if (parent) return parent;
      if (typeof document === 'undefined') return null as unknown as HTMLElement;
      return document.body;
    },
  };
}
