import { InjectionToken, Signal, InputSignal } from '@angular/core';

/** Preferred side for the popover relative to its trigger. */
export type KjPopoverSide = 'top' | 'bottom' | 'left' | 'right';
/** Alignment of the popover along the cross-axis. */
export type KjPopoverAlign = 'start' | 'center' | 'end';

/** Context shared between popover directives. */
export interface KjPopoverContext {
  readonly open: Signal<boolean>;
  readonly popoverId: string;
  kjPopoverSide: Signal<KjPopoverSide> | InputSignal<KjPopoverSide>;
  kjPopoverAlign: Signal<KjPopoverAlign> | InputSignal<KjPopoverAlign>;
  toggle: () => void;
  hide: () => void;
}

export const KJ_POPOVER = new InjectionToken<KjPopoverContext>('KjPopover');
