import { InjectionToken, type Signal } from '@angular/core';

/** Direction the action cluster fans out from the trigger. */
export type KjSpeedDialDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Shared state surface exposed by `[kjSpeedDial]` to its trigger, container
 * and action descendants. Injected via {@link KJ_SPEED_DIAL}.
 */
export interface KjSpeedDialContext {
  /** Whether the action cluster is currently expanded. */
  readonly expanded: Signal<boolean>;
  /** Disabled state — when true, opening is suppressed. */
  readonly disabled: Signal<boolean>;
  /** Direction the cluster fans out from the trigger. */
  readonly direction: Signal<KjSpeedDialDirection>;
  /** Auto-generated id for the action container, used by `aria-controls`. */
  readonly contentId: string;
  /** Open the cluster. */
  open(): void;
  /** Close the cluster. */
  close(): void;
  /** Toggle the cluster. */
  toggle(): void;
}

/** DI token for the shared speed-dial state. */
export const KJ_SPEED_DIAL = new InjectionToken<KjSpeedDialContext>('KJ_SPEED_DIAL');

let nextSpeedDialId = 0;

/** @internal Generates a unique id for each speed-dial instance. */
export function nextKjSpeedDialId(): string {
  nextSpeedDialId += 1;
  return `kj-speed-dial-${nextSpeedDialId}`;
}
