import type { KjScrollLockStrategy } from '../../tokens';

/** Leaves the page scrollable while the overlay is open. */
export function noScrollLock(): KjScrollLockStrategy {
  return { attach() {}, onOpen() {}, onClose() {}, detach() {} };
}
