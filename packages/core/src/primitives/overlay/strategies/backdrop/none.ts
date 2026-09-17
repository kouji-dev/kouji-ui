import type { KjBackdropStrategy } from '../../tokens';

/** No scrim: the page behind stays visible, interactive and clickable. */
export function noBackdrop(): KjBackdropStrategy {
  return {
    inertSiblings: false,
    closeOnClick: false,
    attach() {}, onOpen() {}, onClose() {}, detach() {},
  };
}
