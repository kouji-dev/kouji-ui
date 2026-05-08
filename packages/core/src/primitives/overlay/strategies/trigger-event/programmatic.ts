import type { KjTriggerEventStrategy } from '../../tokens';

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
