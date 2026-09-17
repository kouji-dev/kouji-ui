import type { KjFocusTrapStrategy } from '../../tokens';

/** No focus management: focus stays wherever it is and Tab leaves the panel freely. */
export function noTrap(): KjFocusTrapStrategy {
  return {
    attach() {}, onOpen() {}, onClose() {}, detach() {},
    focusFirst() {}, restoreFocus() {},
  };
}
