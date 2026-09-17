import type { KjOverlayContext } from '../../context';
import type { KjFocusTrapStrategy } from '../../tokens';
import { createFocusTrap, type KjFocusTrapHandle, type KjInitialFocus } from '../../../../a11y/focus-trap';

/** Options for {@link tabCycle}. */
export interface KjTabCycleOpts {
  /**
   * Where focus lands when the overlay finishes opening. `'auto'` (default)
   * picks the first `[kjAutofocus]` / `[autofocus]` element in the panel and
   * falls back to the panel itself; `'first'` picks the first tabbable
   * element. Never fights focus that is already inside the panel.
   */
  initialFocus?: KjInitialFocus;
  /** Return focus to the opener when the overlay closes. Default `true`. */
  returnFocus?: boolean;
  /**
   * Whether the trap is armed: gates Tab cycling and initial focus. Focus
   * restoration on close runs regardless, so a non-modal panel that took
   * focus still hands it back. Default `true`.
   */
  enabled?: boolean | (() => boolean);
}

/** The {@link tabCycle} strategy, reconfigurable after construction. */
export type KjTabCycleStrategy = KjFocusTrapStrategy & {
  configure(opts: Partial<KjTabCycleOpts>): void;
};

/**
 * Focus-trap strategy for modal overlays: Tab and Shift+Tab cycle inside
 * the panel, focus that escapes is pulled back, an empty panel keeps focus
 * on itself, and the opener regains focus on close. Composes the shared
 * `createFocusTrap` engine from `@kouji-ui/core` a11y; the trap yields to
 * any overlay stacked above it.
 */
export function tabCycle(initialOpts: KjTabCycleOpts = {}): KjTabCycleStrategy {
  let opts: KjTabCycleOpts = { ...initialOpts };
  let ctx: KjOverlayContext | null = null;
  // One engine per strategy: `attach` may run more than once (the builder
  // and then the panel directive both attach), and a second engine would
  // leave the first one's document listeners behind.
  const trap: KjFocusTrapHandle = createFocusTrap({
    container: () => ctx?.panelEl() ?? null,
    isActive: () => ctx?.isTopmost?.() ?? true,
    returnFocus: () => opts.returnFocus !== false,
  });
  const isEnabled = (): boolean => {
    const e = opts.enabled;
    if (e === undefined) return true;
    return typeof e === 'function' ? e() : e;
  };

  return {
    get returnFocus() {
      return opts.returnFocus !== false;
    },
    attach(c) {
      ctx = c;
    },
    onOpen() {
      if (!isEnabled() || !ctx?.platform.isBrowser) return;
      trap.activate();
    },
    onClose() {
      trap.deactivate();
    },
    detach() {
      trap.deactivate();
      ctx = null;
    },
    focusFirst() {
      if (!isEnabled() || !ctx?.platform.isBrowser) return;
      trap.focusInitial(opts.initialFocus ?? 'auto');
    },
    restoreFocus() {
      if (!ctx?.platform.isBrowser) return;
      trap.restoreFocus();
    },
    configure(newOpts: Partial<KjTabCycleOpts>) {
      opts = { ...opts, ...newOpts };
    },
  };
}
