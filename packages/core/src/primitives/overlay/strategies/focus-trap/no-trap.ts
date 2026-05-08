import type { KjFocusTrapStrategy } from '../../tokens';

export function noTrap(): KjFocusTrapStrategy {
  return {
    attach() {}, onOpen() {}, onClose() {}, detach() {},
    focusFirst() {}, restoreFocus() {},
  };
}
