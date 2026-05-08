import type { KjOverlayContext } from '../../context';
import type { KjTriggerEventStrategy } from '../../tokens';

export function onFocus(): KjTriggerEventStrategy {
  let ctx: KjOverlayContext | null = null;
  let toggle: (() => void) | null = null;
  let onIn: ((e: FocusEvent) => void) | null = null;
  let onOut: ((e: FocusEvent) => void) | null = null;

  const wire = () => {
    if (!ctx?.platform.isBrowser) return;
    const trigger = ctx.triggerEl();
    if (!trigger || onIn) return;
    onIn = () => { if (!ctx?.isOpen()) toggle?.(); };
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
