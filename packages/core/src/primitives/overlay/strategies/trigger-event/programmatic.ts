import type { KjTriggerEventStrategy } from '../../tokens';

/** Binds no DOM events: the overlay opens and closes only through its controller/service. */
export function programmatic(): KjTriggerEventStrategy {
  let _toggle: (() => void) | null = null;
  return {
    ariaHasPopup: null,
    attach() {},
    bindToggle(t) { _toggle = t; },
    onOpen() {}, onClose() {},
    detach() { _toggle = null; },
  };
}
