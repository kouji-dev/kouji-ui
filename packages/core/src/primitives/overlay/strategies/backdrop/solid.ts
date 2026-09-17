import type { KjOverlayContext } from '../../context';
import type { KjBackdropStrategy } from '../../tokens';
import { inertSiblingsOf } from '../../inert';

/** Options for {@link solidBackdrop}. */
export interface KjSolidBackdropOpts {
  /**
   * Make the page behind the overlay `inert` while it is open, so the
   * panel's `aria-modal="true"` is backed by a background that neither
   * keyboard, pointer nor assistive tech can reach. Default `true`.
   */
  inert?: boolean;
  /** Close the overlay when the scrim is clicked. Default `true`. */
  closeOnClick?: boolean;
  /** Class applied to the rendered `<kj-backdrop>`. Default `'kj-backdrop'`. */
  className?: string;
}

/** The {@link solidBackdrop} strategy, carrying the scrim's class name. */
export interface KjSolidBackdropStrategy extends KjBackdropStrategy {
  readonly className: string;
}

/**
 * Backdrop strategy for modal overlays: renders a scrim behind the panel
 * and, with `inert` (the default), freezes every body-level sibling of the
 * overlay container plus every overlay opened below this one until the
 * overlay closes. Nested modals share the mechanism through a reference
 * count, so the page thaws only when the last one closes.
 */
export function solidBackdrop(opts: KjSolidBackdropOpts = {}): KjSolidBackdropStrategy {
  const inert = opts.inert ?? true;
  let ctx: KjOverlayContext | null = null;
  let release: (() => void) | null = null;

  return {
    inertSiblings: inert,
    closeOnClick: opts.closeOnClick ?? true,
    className: opts.className ?? 'kj-backdrop',
    attach(c) {
      ctx = c;
    },
    onOpen() {
      if (!inert || !ctx?.platform.isBrowser) return;
      const panel = ctx.panelEl();
      if (!panel) return;
      release?.();
      release = inertSiblingsOf(panel);
    },
    onClose() {
      release?.();
      release = null;
    },
    detach() {
      release?.();
      release = null;
      ctx = null;
    },
  };
}
