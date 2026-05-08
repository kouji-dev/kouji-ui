import type { KjOverlayContext } from '../../context';
import type { KjFocusTrapStrategy } from '../../tokens';

export function inertBased(): KjFocusTrapStrategy {
  let ctx: KjOverlayContext | null = null;
  let inerted: HTMLElement[] = [];
  let returnTarget: HTMLElement | null = null;

  return {
    attach(c) { ctx = c; },
    onOpen() {
      if (!ctx?.platform.isBrowser) return;
      const panel = ctx.panelEl();
      if (!panel?.parentElement) return;
      returnTarget = (document.activeElement as HTMLElement) ?? null;
      inerted = [];
      for (const sibling of Array.from(panel.parentElement.children)) {
        if (sibling === panel) continue;
        const el = sibling as HTMLElement;
        if (!el.hasAttribute('inert')) {
          el.setAttribute('inert', '');
          inerted.push(el);
        }
      }
    },
    onClose() {
      for (const el of inerted) el.removeAttribute('inert');
      inerted = [];
    },
    detach() { ctx = null; returnTarget = null; },
    focusFirst() {
      const panel = ctx?.panelEl();
      const focusable = panel?.querySelector<HTMLElement>('button,a,input,select,textarea,[tabindex]:not([tabindex="-1"])');
      focusable?.focus();
    },
    restoreFocus() { returnTarget?.focus(); },
  };
}
