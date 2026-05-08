import type { KjTriggerEventStrategy } from '../../tokens';

export function programmatic(): KjTriggerEventStrategy {
  let toggle: (() => void) | null = null;
  return {
    ariaHasPopup: null,
    attach() {},
    bindToggle(t) { toggle = t; },
    onOpen() {}, onClose() {},
    detach() { toggle = null; },
  };
}
