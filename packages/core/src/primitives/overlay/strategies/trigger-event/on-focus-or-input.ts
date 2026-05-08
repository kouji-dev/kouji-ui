import type { KjOverlayContext } from '../../context';
import type { KjTriggerEventStrategy } from '../../tokens';

export function onFocusOrInput(): KjTriggerEventStrategy {
  let ctx: KjOverlayContext | null = null;
  let toggle: (() => void) | null = null;
  let onFocusIn: ((e: Event) => void) | null = null;
  let onInput: ((e: Event) => void) | null = null;

  const wire = () => {
    if (!ctx?.platform.isBrowser) return;
    const trigger = ctx.triggerEl();
    if (!trigger || onFocusIn) return;
    onFocusIn = () => { if (!ctx?.isOpen()) toggle?.(); };
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
