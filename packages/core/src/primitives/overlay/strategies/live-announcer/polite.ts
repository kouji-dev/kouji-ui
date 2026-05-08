import { inject } from '@angular/core';
import { KjLiveAnnouncerService } from '../../live-announcer';
import type { KjLiveAnnouncerStrategy } from '../../tokens';

export function polite(): KjLiveAnnouncerStrategy {
  let svc: KjLiveAnnouncerService | null = null;
  return {
    attach() { svc = inject(KjLiveAnnouncerService); },
    onOpen() {}, onClose() {},
    detach() { svc = null; },
    announce(msg: string) { svc?.announce(msg, 'polite'); },
  };
}
