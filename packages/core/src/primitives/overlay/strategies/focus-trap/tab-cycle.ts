import type { KjOverlayContext } from '../../context';
import type { KjFocusTrapStrategy } from '../../tokens';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface KjTabCycleOpts {
  initialFocus?: 'auto' | 'first' | HTMLElement | (() => HTMLElement | null);
  returnFocus?: boolean;
  enabled?: boolean | (() => boolean);
}

export type KjTabCycleStrategy = KjFocusTrapStrategy & {
  configure(opts: Partial<KjTabCycleOpts>): void;
};

export function tabCycle(initialOpts: KjTabCycleOpts = {}): KjTabCycleStrategy {
  let opts: KjTabCycleOpts = { ...initialOpts };
  let ctx: KjOverlayContext | null = null;
  let returnTarget: HTMLElement | null = null;
  let keyListener: ((e: KeyboardEvent) => void) | null = null;
  const isEnabled = (): boolean => {
    const e = opts.enabled;
    if (e === undefined) return true;
    return typeof e === 'function' ? e() : e;
  };

  const focusables = (): HTMLElement[] => {
    const panel = ctx?.panelEl();
    if (!panel) return [];
    return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
  };

  return {
    attach(c) { ctx = c; },
    onOpen() {
      if (!isEnabled()) return;
      if (!ctx?.platform.isBrowser) return;
      const panel = ctx.panelEl();
      if (!panel) return;
      returnTarget = (document.activeElement as HTMLElement) ?? null;
      keyListener = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;
        const els = focusables();
        if (els.length === 0) return;
        const first = els[0], last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      };
      panel.addEventListener('keydown', keyListener);
    },
    onClose() {
      const panel = ctx?.panelEl();
      if (panel && keyListener) panel.removeEventListener('keydown', keyListener);
      keyListener = null;
    },
    detach() { ctx = null; returnTarget = null; },
    focusFirst() {
      if (!isEnabled()) return;
      const cfg = opts.initialFocus ?? 'first';
      let target: HTMLElement | null = null;
      if (cfg instanceof HTMLElement) target = cfg;
      else if (typeof cfg === 'function') target = cfg();
      else target = focusables()[0] ?? null;
      target?.focus();
    },
    restoreFocus() {
      if (!isEnabled()) return;
      if (opts.returnFocus !== false) returnTarget?.focus();
    },
    configure(newOpts: Partial<KjTabCycleOpts>) {
      opts = { ...opts, ...newOpts };
    },
  };
}
