import { inject } from '@angular/core';
import { KjLiveAnnouncerService } from '../../live-announcer';
import type { KjLiveAnnouncerStrategy } from '../../tokens';

export function polite(): KjLiveAnnouncerStrategy {
  const svc = inject(KjLiveAnnouncerService);
  return {
    attach() {},
    onOpen() {}, onClose() {},
    detach() {},
    announce(msg: string) { svc.announce(msg, 'polite'); },
  };
}
