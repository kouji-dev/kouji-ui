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
  readonly platform: { isBrowser: boolean };
  requestClose(reason: KjCloseReason): void;
}
