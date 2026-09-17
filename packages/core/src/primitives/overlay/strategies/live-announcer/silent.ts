import type { KjLiveAnnouncerStrategy } from '../../tokens';

/** No live-region announcements — for overlays whose content already announces itself. */
export function silent(): KjLiveAnnouncerStrategy {
  return { attach() {}, onOpen() {}, onClose() {}, detach() {}, announce() {} };
}
