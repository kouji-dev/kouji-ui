import { resolveOverlayDocument } from '../../container';
import type { KjOverlayContext } from '../../context';
import type { KjScrollLockStrategy } from '../../tokens';
import { acquireScrollLock } from './_lock';

/**
 * Locks page scroll with `overflow: clip` on `<html>` — no scrollbar removal,
 * so nothing shifts, at the cost of losing programmatic scrolling too.
 *
 * Shares {@link acquireScrollLock}'s `<html>`-hosted refcount with
 * {@link htmlOverflow}, so nesting the two cannot strand the page.
 */
export function cssClip(): KjScrollLockStrategy {
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
      if (!doc?.documentElement) return;
      release = acquireScrollLock(doc, (root) => {
        const saved = { 'overflow': root.style.overflow };
        root.style.overflow = 'clip';
        return saved;
      });
    },
    onClose() { release?.(); release = null; },
    detach() { release?.(); release = null; },
  };
}
