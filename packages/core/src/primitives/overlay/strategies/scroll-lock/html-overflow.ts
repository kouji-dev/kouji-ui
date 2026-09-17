import { resolveOverlayDocument } from '../../container';
import type { KjOverlayContext } from '../../context';
import type { KjScrollLockStrategy } from '../../tokens';
import { acquireScrollLock } from './_lock';

/**
 * Locks page scroll by setting `overflow: hidden` on `<html>` and padding the
 * document by the width of the scrollbar it just removed, so the page does not
 * shift sideways under the overlay.
 *
 * Refcounted on the `<html>` element itself (see {@link acquireScrollLock}),
 * and browser-gated through the overlay context's `platform.isBrowser` rather
 * than a `typeof document` probe — a server that shims a DOM onto `globalThis`
 * would otherwise share one process-wide lock across concurrent requests.
 */
export function htmlOverflow(): KjScrollLockStrategy {
  // Resolved at construction while an injection context may still be active;
  // `attach()` fills it in from the overlay's own elements otherwise.
  let doc: Document | null = resolveOverlayDocument();
  let isBrowser = true;
  let release: (() => void) | null = null;

  const adoptDocument = (ctx?: KjOverlayContext): void => {
    doc ??= ctx?.panelEl?.()?.ownerDocument ?? ctx?.triggerEl?.()?.ownerDocument ?? null;
  };

  return {
    attach(ctx) {
      isBrowser = ctx?.platform?.isBrowser ?? true;
      adoptDocument(ctx);
    },
    onOpen() {
      if (!isBrowser || release) return;
      adoptDocument();
      const html = doc?.documentElement;
      if (!html) return;
      release = acquireScrollLock(doc!, (root) => {
        const view = root.ownerDocument.defaultView;
        const scrollbarWidth = view ? view.innerWidth - root.clientWidth : 0;
        const saved = {
          'overflow': root.style.overflow,
          'padding-right': root.style.paddingRight,
        };
        root.style.overflow = 'hidden';
        if (view && scrollbarWidth > 0) {
          const existing = parseFloat(view.getComputedStyle(root).paddingRight) || 0;
          root.style.paddingRight = `${existing + scrollbarWidth}px`;
        }
        return saved;
      });
    },
    onClose() { release?.(); release = null; },
    detach() { release?.(); release = null; },
  };
}
