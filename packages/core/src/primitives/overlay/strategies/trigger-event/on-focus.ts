import type { KjOverlayContext } from '../../context';
import type { KjTriggerEventStrategy } from '../../tokens';

/** Options for {@link onFocus}. */
export interface KjOnFocusOpts {
  /**
   * Open only when the trigger matches `:focus-visible` — keyboard focus, or
   * programmatic focus after a keyboard interaction — so a pointer click,
   * which focuses the trigger too, never surfaces a tooltip that hover
   * already owns. Environments without `:focus-visible` support open on any
   * focus. Default `false`.
   */
  focusVisible?: boolean;
}

/** `true` unless the element demonstrably fails `:focus-visible`. */
const isFocusVisible = (el: Element): boolean => {
  try {
    return el.matches(':focus-visible');
  } catch {
    return true;
  }
};

/**
 * Opens the overlay when the trigger gains focus and closes it when focus
 * leaves both the trigger and the panel. Composes with `onHover` for
 * tooltips and hover popovers so keyboard users reach the same content.
 *
 * Focus that lands on the trigger while the overlay is closing is the
 * controller returning it there (Escape, Tab out, a pick) — never a request
 * to open again.
 */
export function onFocus(opts: KjOnFocusOpts = {}): KjTriggerEventStrategy {
  let ctx: KjOverlayContext | null = null;
  let toggle: (() => void) | null = null;
  let onIn: ((e: FocusEvent) => void) | null = null;
  let onOut: ((e: FocusEvent) => void) | null = null;

  const wire = () => {
    if (!ctx?.platform.isBrowser) return;
    const trigger = ctx.triggerEl();
    if (!trigger || onIn) return;
    onIn = () => {
      if (ctx?.isOpen() || ctx?.state() === 'closing') return;
      if (opts.focusVisible && !isFocusVisible(trigger)) return;
      toggle?.();
    };
    onOut = (e: FocusEvent) => {
      const related = e.relatedTarget as Node | null;
      const panel = ctx?.panelEl();
      if (panel && related && panel.contains(related)) return;
      if (ctx?.isOpen()) toggle?.();
    };
    trigger.addEventListener('focusin', onIn);
    trigger.addEventListener('focusout', onOut);
  };

  return {
    ariaHasPopup: null,
    attach(c) { ctx = c; wire(); },
    bindToggle(t) { toggle = t; wire(); },
    onOpen() {}, onClose() {},
    detach() {
      const trigger = ctx?.triggerEl();
      if (trigger && onIn) trigger.removeEventListener('focusin', onIn);
      if (trigger && onOut) trigger.removeEventListener('focusout', onOut);
      onIn = onOut = null; toggle = null; ctx = null;
    },
  };
}
