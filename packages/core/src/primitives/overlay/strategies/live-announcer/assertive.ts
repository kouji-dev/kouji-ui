import type { KjLiveAnnouncerStrategy } from '../../tokens';
import { announce } from './_announce';

export function assertive(): KjLiveAnnouncerStrategy {
  return {
    attach() {},
    onOpen() {}, onClose() {},
    detach() {},
    announce(msg: string) { announce(msg, 'assertive'); },
  };
}
