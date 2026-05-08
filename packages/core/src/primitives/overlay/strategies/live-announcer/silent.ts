import type { KjLiveAnnouncerStrategy } from '../../tokens';

export function silent(): KjLiveAnnouncerStrategy {
  return { attach() {}, onOpen() {}, onClose() {}, detach() {}, announce() {} };
}
