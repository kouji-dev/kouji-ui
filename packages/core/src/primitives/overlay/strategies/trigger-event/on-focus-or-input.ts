import type { KjOverlayContext } from '../../context';
import type { KjTriggerEventStrategy } from '../../tokens';

/**
 * Opens the overlay when the trigger (an input) gains focus or receives
 * input; a combobox's listbox. Focus that lands on the input while the
 * overlay is closing is the controller returning it there after a pick or
 * Escape, not a request to open again; typing during the close transition
 * is, and re-opens.
 */
export function onFocusOrInput(): KjTriggerEventStrategy {
  let ctx: KjOverlayContext | null = null;
  let toggle: (() => void) | null = null;
  let onFocusIn: ((e: Event) => void) | null = null;
  let onInput: ((e: Event) => void) | null = null;

  const wire = () => {
    if (!ctx?.platform.isBrowser) return;
    const trigger = ctx.triggerEl();
    if (!trigger || onFocusIn) return;
    onFocusIn = () => { if (!ctx?.isOpen() && ctx?.state() !== 'closing') toggle?.(); };
    onInput = () => { if (!ctx?.isOpen()) toggle?.(); };
    trigger.addEventListener('focusin', onFocusIn);
    trigger.addEventListener('input', onInput);
  };

  return {
    ariaHasPopup: 'listbox',
    attach(c) { ctx = c; wire(); },
    bindToggle(t) { toggle = t; wire(); },
    onOpen() {}, onClose() {},
    detach() {
      const trigger = ctx?.triggerEl();
      if (trigger) {
        if (onFocusIn) trigger.removeEventListener('focusin', onFocusIn);
        if (onInput) trigger.removeEventListener('input', onInput);
      }
      onFocusIn = onInput = null; toggle = null; ctx = null;
    },
  };
}
