import { inject } from '@angular/core';
import { KjScrollLock } from '../../scroll-lock';
import type { KjScrollLockStrategy } from '../../tokens';

export function htmlOverflow(): KjScrollLockStrategy {
  let svc: KjScrollLock | null = null;
  let release: (() => void) | null = null;
  return {
    attach() {
      svc = inject(KjScrollLock);
    },
    onOpen() { release = svc!.acquire(); },
    onClose() { release?.(); release = null; },
    detach() { release?.(); release = null; svc = null; },
  };
}
