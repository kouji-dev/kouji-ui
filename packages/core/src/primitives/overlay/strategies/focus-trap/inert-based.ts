import type { KjOverlayContext } from '../../context';
import type { KjFocusTrapStrategy } from '../../tokens';
import { createFocusTrap, type KjFocusTrapHandle, type KjInitialFocus } from '../../../../a11y/focus-trap';
import { inertSiblingsOf } from '../../inert';

/** Options for {@link inertBased}. */
export interface KjInertBasedOpts {
  /** Where focus lands on open — see `KjInitialFocus`. Default `'auto'`. */
  initialFocus?: KjInitialFocus;
  /** Return focus to the opener when the overlay closes. Default `true`. */
  returnFocus?: boolean;
}

/**
 * Focus-trap strategy that makes the page behind the panel `inert` while
 * the overlay is open — the same mechanism `solidBackdrop({ inert: true })`
 * uses — and keeps Tab inside the panel as a belt-and-braces guard for
 * content the `inert` attribute cannot reach (an inline-mounted panel
 * whose app root must stay live). Initial focus and focus return follow
 * the shared `createFocusTrap` engine.
 */
export function inertBased(opts: KjInertBasedOpts = {}): KjFocusTrapStrategy {
  let ctx: KjOverlayContext | null = null;
  let release: (() => void) | null = null;
  // One engine per strategy — `attach` may run more than once.
  const trap: KjFocusTrapHandle = createFocusTrap({
    container: () => ctx?.panelEl() ?? null,
    isActive: () => ctx?.isTopmost?.() ?? true,
    returnFocus: opts.returnFocus ?? true,
  });

  return {
    get returnFocus() {
      return opts.returnFocus !== false;
    },
    attach(c) {
      ctx = c;
    },
    onOpen() {
      if (!ctx?.platform.isBrowser) return;
      const panel = ctx.panelEl();
      if (!panel) return;
      trap.activate();
      release?.();
      release = inertSiblingsOf(panel);
    },
    onClose() {
      release?.();
      release = null;
      trap.deactivate();
    },
    detach() {
      release?.();
      release = null;
      trap.deactivate();
      ctx = null;
    },
    focusFirst() {
      if (!ctx?.platform.isBrowser) return;
      trap.focusInitial(opts.initialFocus ?? 'auto');
    },
    restoreFocus() {
      if (!ctx?.platform.isBrowser) return;
      trap.restoreFocus();
    },
  };
}
