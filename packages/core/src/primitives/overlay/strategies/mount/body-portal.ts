import type { KjOverlayContext } from '../../context';
import type { KjMountStrategy } from '../../tokens';
import { createOverlayWrapper } from '../../container';

/**
 * Mount strategy for declarative overlays whose panel is rendered inline
 * in the consumer's template (popover, tooltip, dropdown-menu via
 * `[kjFor]`). On open the panel is portalled into a per-overlay wrapper
 * inside the singleton `.kj-overlay-container`; on close it's returned to
 * its original DOM location and the wrapper is removed.
 *
 * Service-launched overlays (dialog, drawer, toast) are mounted directly
 * into a `<kj-overlay-wrapper>` component by the builder — they use
 * `inPlace()` instead.
 */
export function bodyPortal(): KjMountStrategy {
  let ctx: KjOverlayContext | null = null;
  let wrapper: HTMLElement | null = null;
  let originalParent: HTMLElement | null = null;
  let originalNextSibling: Node | null = null;

  const ensureWrapper = (): HTMLElement | null => {
    if (wrapper && wrapper.isConnected) return wrapper;
    wrapper = createOverlayWrapper();
    return wrapper;
  };

  return {
    portalled: true,
    attach(c) { ctx = c; },
    onOpen() {
      if (!ctx?.platform.isBrowser) return;
      const panel = ctx.panelEl();
      const w = ensureWrapper();
      if (!panel || !w) return;
      if (panel.parentElement === w) return;
      originalParent = panel.parentElement;
      originalNextSibling = panel.nextSibling;
      w.appendChild(panel);
    },
    onClose() {
      if (!ctx?.platform.isBrowser) return;
      const panel = ctx.panelEl();
      if (panel && originalParent) {
        if (originalNextSibling && originalNextSibling.parentNode === originalParent) {
          originalParent.insertBefore(panel, originalNextSibling);
        } else {
          originalParent.appendChild(panel);
        }
      }
      originalParent = null;
      originalNextSibling = null;
      if (wrapper?.parentElement) wrapper.parentElement.removeChild(wrapper);
      wrapper = null;
    },
    detach() {
      if (wrapper?.parentElement) wrapper.parentElement.removeChild(wrapper);
      wrapper = null;
      ctx = null;
    },
    resolveContainer() {
      const w = ensureWrapper();
      if (w) return w;
      if (typeof document === 'undefined') return null as unknown as HTMLElement;
      return document.body;
    },
  };
}
