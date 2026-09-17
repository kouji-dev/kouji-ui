import type { Signal } from '@angular/core';
import type { KjOverlayState, KjCloseReason } from './types';
import type { KjOverlayStack } from './stack';

/** Runtime context every strategy receives via `attach(ctx)`. */
export interface KjOverlayContext {
  readonly state: Signal<KjOverlayState>;
  readonly isOpen: Signal<boolean>;
  readonly triggerEl: Signal<HTMLElement | null>;
  readonly panelEl: Signal<HTMLElement | null>;
  readonly stack: KjOverlayStack;
  /**
   * Whether this overlay is the top of the stack. A focus trap reads it
   * so an overlay opened above it (a select inside a dialog) owns Tab and
   * focus while it is open. Absent on hand-built contexts — treated as
   * always topmost.
   */
  readonly isTopmost?: Signal<boolean>;
  readonly platform: { isBrowser: boolean };
  requestClose(reason: KjCloseReason): void;
}
