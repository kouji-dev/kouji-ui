import type { KjLiveAnnouncerStrategy } from '../../tokens';
import { announce } from './_announce';

export function polite(): KjLiveAnnouncerStrategy {
  return {
    attach() {},
    onOpen() {}, onClose() {},
    detach() {},
    announce(msg: string) { announce(msg, 'polite'); },
  };
}
