import type { KjScrollLockStrategy } from '../../tokens';

export function noScrollLock(): KjScrollLockStrategy {
  return { attach() {}, onOpen() {}, onClose() {}, detach() {} };
}
