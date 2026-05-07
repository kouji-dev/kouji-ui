import type { KjOverlayContext } from '../../context';
import type { KjMountStrategy } from '../../tokens';

export function bodyPortal(): KjMountStrategy {
  let ctx: KjOverlayContext | null = null;
  let originalParent: HTMLElement | null = null;
  let originalNextSibling: Node | null = null;

  return {
    portalled: true,
    attach(c) { ctx = c; },
    onOpen() {
      if (!ctx?.platform.isBrowser) return;
      const panel = ctx.panelEl();
      if (!panel) return;
      originalParent = panel.parentElement;
      originalNextSibling = panel.nextSibling;
      document.body.appendChild(panel);
    },
    onClose() {
      if (!ctx?.platform.isBrowser) return;
      const panel = ctx.panelEl();
      if (!panel || !originalParent) return;
      if (originalNextSibling && originalNextSibling.parentNode === originalParent) {
        originalParent.insertBefore(panel, originalNextSibling);
      } else {
        originalParent.appendChild(panel);
      }
      originalParent = null;
      originalNextSibling = null;
    },
    detach() { ctx = null; },
    resolveContainer() { return document.body; },
  };
}
