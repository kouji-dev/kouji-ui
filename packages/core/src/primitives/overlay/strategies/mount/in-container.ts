import type { KjOverlayContext } from '../../context';
import type { KjMountStrategy } from '../../tokens';

/** Where `inContainer()` moves the panel: an element, or a getter resolved at open time. */
export type KjContainerTarget = HTMLElement | (() => HTMLElement);

/** Portals the panel into a consumer-chosen container and restores its original slot on close. */
export function inContainer(target: KjContainerTarget): KjMountStrategy {
  let ctx: KjOverlayContext | null = null;
  let originalParent: HTMLElement | null = null;
  let originalNextSibling: Node | null = null;

  const resolve = (): HTMLElement => typeof target === 'function' ? target() : target;

  return {
    portalled: true,
    attach(c) { ctx = c; },
    onOpen() {
      if (!ctx?.platform.isBrowser) return;
      const panel = ctx.panelEl();
      if (!panel) return;
      originalParent = panel.parentElement;
      originalNextSibling = panel.nextSibling;
      resolve().appendChild(panel);
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
    resolveContainer() { return resolve(); },
  };
}
