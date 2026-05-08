import type { KjBackdropStrategy } from '../../tokens';

export function noBackdrop(): KjBackdropStrategy {
  return {
    inertSiblings: false,
    closeOnClick: false,
    attach() {}, onOpen() {}, onClose() {}, detach() {},
  };
}
