import type { KjOverlayContext } from '../../context';
import type { KjMountStrategy } from '../../tokens';

/** Leaves the panel where it is declared — no portal. The default for inline overlays. */
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
      return (panel?.ownerDocument ?? ctx?.triggerEl()?.ownerDocument)
        ?.body as HTMLElement;
    },
  };
}
