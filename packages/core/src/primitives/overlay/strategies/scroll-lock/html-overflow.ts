import { inject } from '@angular/core';
import { KjScrollLock } from '../../scroll-lock';
import type { KjScrollLockStrategy } from '../../tokens';

export function htmlOverflow(): KjScrollLockStrategy {
  // Capture the service at factory time (must be in an injection context).
  // attach()/onOpen()/onClose() may run outside injection context.
  const svc = inject(KjScrollLock);
  let release: (() => void) | null = null;
  return {
    attach() {},
    onOpen() { release = svc.acquire(); },
    onClose() { release?.(); release = null; },
    detach() { release?.(); release = null; },
  };
}
