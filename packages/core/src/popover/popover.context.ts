import { InjectionToken, type Signal } from '@angular/core';

/** Side on which the popover panel is placed relative to its trigger. */
export type KjPopoverSide = 'top' | 'right' | 'bottom' | 'left';

/** Cross-axis alignment of the popover relative to its trigger. */
export type KjPopoverAlign = 'start' | 'center' | 'end';

/**
 * How the popover is opened.
 * - `'click'`   — the default; click / Enter / Space toggle the popover.
 * - `'manual'`  — programmatic only; built-in trigger listeners are disabled.
 * - `'hover'`   — open on hover. Discouraged for popovers with interactive content.
 */
export type KjPopoverTriggerEvent = 'click' | 'hover' | 'manual';

/**
 * Application-wide popover defaults. Provide via {@link KJ_POPOVER_DEFAULTS} to
 * override the built-in values for every popover in the app.
 */
export interface KjPopoverDefaults {
  /** Preferred side. Default `'bottom'`. */
  side?: KjPopoverSide;
  /** Cross-axis alignment. Default `'start'`. */
  align?: KjPopoverAlign;
  /** Pixel gap between trigger and panel. Default `8`. */
  offset?: number;
  /** Pixel padding from the viewport edge for collision detection. Default `8`. */
  collisionPadding?: number;
  /** Modality (focus-trap + scroll-lock) flag. Default `false`. */
  modal?: boolean;
  /** Whether Escape closes the popover. Default `true`. */
  closeOnEsc?: boolean;
  /** Whether outside-click closes the popover. Default `true`. */
  closeOnOutsideClick?: boolean;
  /** Whether outside-focus closes the popover. Default `false`. */
  closeOnOutsideFocus?: boolean;
  /** How the popover is opened. Default `'click'`. */
  triggerEvent?: KjPopoverTriggerEvent;
}

/** Built-in defaults — used as the fallback when no `KJ_POPOVER_DEFAULTS` is provided. */
export const KJ_POPOVER_BUILTIN_DEFAULTS: Required<KjPopoverDefaults> = {
  side: 'bottom',
  align: 'start',
  offset: 8,
  collisionPadding: 8,
  modal: false,
  closeOnEsc: true,
  closeOnOutsideClick: true,
  closeOnOutsideFocus: false,
  triggerEvent: 'click',
};

/**
 * Injection token for app-wide popover defaults.
 *
 * @example
 * ```ts
 * providers: [
 *   { provide: KJ_POPOVER_DEFAULTS, useValue: { side: 'top' } satisfies KjPopoverDefaults },
 * ];
 * ```
 */
export const KJ_POPOVER_DEFAULTS = new InjectionToken<KjPopoverDefaults>('KjPopoverDefaults');

/**
 * Reason a close was requested. Propagated to consumer-supplied
 * `(kjCloseRequested)` handlers via {@link KjPopoverCloseEvent}.
 */
export type KjPopoverCloseReason =
  | 'escape'
  | 'outside-click'
  | 'outside-focus'
  | 'close-button'
  | 'programmatic'
  | 'trigger-detached';

/**
 * Event emitted before a popover closes. Consumers can call `preventDefault()`
 * to veto the close (e.g. "discard changes?" prompt for a form-in-popover).
 */
export interface KjPopoverCloseEvent {
  readonly reason: KjPopoverCloseReason;
  preventDefault(): void;
  readonly defaultPrevented: boolean;
}

/**
 * Event emitted before auto-focus runs on open / close. Consumers can call
 * `preventDefault()` to manage focus themselves.
 */
export interface KjAutoFocusEvent {
  readonly element: HTMLElement;
  preventDefault(): void;
  readonly defaultPrevented: boolean;
}

/** Internal helper: build a {@link KjPopoverCloseEvent}. */
export function createCloseEvent(reason: KjPopoverCloseReason): KjPopoverCloseEvent {
  let prevented = false;
  return {
    reason,
    preventDefault: () => {
      prevented = true;
    },
    get defaultPrevented(): boolean {
      return prevented;
    },
  };
}

/** Internal helper: build a {@link KjAutoFocusEvent}. */
export function createAutoFocusEvent(element: HTMLElement): KjAutoFocusEvent {
  let prevented = false;
  return {
    element,
    preventDefault: () => {
      prevented = true;
    },
    get defaultPrevented(): boolean {
      return prevented;
    },
  };
}

/** Context shared between popover directives in the family. */
export interface KjPopoverContext {
  readonly open: Signal<boolean>;
  readonly popoverId: string;
  readonly titleId: Signal<string | null>;
  readonly modal: Signal<boolean>;
  readonly kjPopoverSide: Signal<KjPopoverSide>;
  readonly kjPopoverAlign: Signal<KjPopoverAlign>;
  readonly kjTriggerEvent: Signal<KjPopoverTriggerEvent>;
  readonly triggerElement: Signal<HTMLElement | null>;

  show(): void;
  hide(reason: KjPopoverCloseReason): void;
  toggle(): void;

  registerTitleId(id: string): void;
  unregisterTitleId(id: string): void;

  captureTriggerFocus(el: HTMLElement): void;
  restoreTriggerFocus(): void;
}

export const KJ_POPOVER = new InjectionToken<KjPopoverContext>('KjPopover');

let _popoverIdCounter = 0;
/** Allocate a stable popover id used for `aria-controls` wiring. */
export function nextPopoverId(): string {
  return `kj-popover-${++_popoverIdCounter}`;
}

let _popoverTitleIdCounter = 0;
/** Allocate a stable title id used for `aria-labelledby` wiring. */
export function nextPopoverTitleId(): string {
  return `kj-popover-title-${++_popoverTitleIdCounter}`;
}
