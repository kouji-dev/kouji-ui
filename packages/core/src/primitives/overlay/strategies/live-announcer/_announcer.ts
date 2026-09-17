import { resolveOverlayDocument } from '../../container';
import type { KjOverlayContext } from '../../context';
import type { KjLiveAnnouncerStrategy } from '../../tokens';
import { announce, type KjLivePoliteness } from './_announce';

/**
 * Shared body for {@link polite} and {@link assertive}.
 *
 * Resolves its `Document` at construction (the factories are usually built in
 * an injection context) and falls back to the overlay's own elements, so the
 * announcement never reaches for a global. Browser gating comes from the
 * overlay context rather than a `typeof document` probe: a server that shims a
 * DOM would otherwise append every request's announcement to one region.
 */
export function createAnnouncer(politeness: KjLivePoliteness): KjLiveAnnouncerStrategy {
  let doc: Document | null = resolveOverlayDocument();
  let isBrowser = true;

  const adoptDocument = (ctx?: KjOverlayContext): void => {
    doc ??= ctx?.panelEl?.()?.ownerDocument ?? ctx?.triggerEl?.()?.ownerDocument ?? null;
  };

  return {
    attach(ctx) {
      isBrowser = ctx?.platform?.isBrowser ?? true;
      adoptDocument(ctx);
    },
    onOpen() {}, onClose() {},
    detach() {},
    announce(msg: string) {
      if (!isBrowser) return;
      adoptDocument();
      announce(doc, msg, politeness);
    },
  };
}
