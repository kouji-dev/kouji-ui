import { InjectionToken, type Signal } from '@angular/core';

/**
 * Side of the viewport from which a drawer slides in.
 */
export type KjDrawerSide = 'left' | 'right' | 'top' | 'bottom';

/**
 * Reason a drawer close was requested. Propagated to consumer-supplied
 * `(kjCloseRequested)` handlers via {@link KjDrawerCloseEvent}.
 */
export type KjDrawerCloseReason =
  | 'escape'
  | 'backdrop'
  | 'close-button'
  | 'programmatic';

/**
 * Event emitted before a drawer closes. Consumers can call `preventDefault()`
 * to veto the close (e.g. "discard unsaved changes?" prompt for a dirty form).
 */
export interface KjDrawerCloseEvent {
  readonly reason: KjDrawerCloseReason;
  readonly result: unknown;
  preventDefault(): void;
  readonly defaultPrevented: boolean;
}

/**
 * Event emitted before auto-focus runs on open / close. Consumers can call
 * `preventDefault()` to manage focus themselves.
 */
export interface KjDrawerAutoFocusEvent {
  readonly element: HTMLElement;
  preventDefault(): void;
  readonly defaultPrevented: boolean;
}

/** Internal helper: build a {@link KjDrawerCloseEvent}. */
export function createDrawerCloseEvent(
  reason: KjDrawerCloseReason,
  result: unknown,
): KjDrawerCloseEvent {
  let prevented = false;
  return {
    reason,
    result,
    preventDefault: () => {
      prevented = true;
    },
    get defaultPrevented(): boolean {
      return prevented;
    },
  };
}

/** Internal helper: build a {@link KjDrawerAutoFocusEvent}. */
export function createDrawerAutoFocusEvent(element: HTMLElement): KjDrawerAutoFocusEvent {
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

/**
 * Context shared between the drawer directive family.
 *
 * Implemented by {@link import('./drawer').KjDrawerTrigger} on the declarative
 * path. Child directives (`[kjDrawerContent]`, `[kjDrawerTitle]`,
 * `[kjDrawerDescription]`, `[kjDrawerClose]`) inject {@link KJ_DRAWER} and
 * read the rest of the surface uniformly.
 */
export interface KjDrawerContext {
  readonly open: Signal<boolean>;
  readonly drawerId: string;
  readonly titleId: Signal<string | null>;
  readonly descriptionId: Signal<string | null>;
  readonly side: Signal<KjDrawerSide>;
  readonly modal: Signal<boolean>;
  readonly closeOnEscape: Signal<boolean>;
  readonly closeOnBackdrop: Signal<boolean>;

  registerTitleId(id: string): void;
  unregisterTitleId(id: string): void;
  registerDescriptionId(id: string): void;
  unregisterDescriptionId(id: string): void;

  /** Request a close with the given reason. Cancellable. */
  close(result?: unknown, reason?: KjDrawerCloseReason): void;
}

/** Injection token for the drawer context. */
export const KJ_DRAWER = new InjectionToken<KjDrawerContext>('KjDrawer');

let _drawerIdCounter = 0;
/** Allocate a stable drawer id used for `aria-controls` / labelledby wiring. */
export function nextDrawerId(): string {
  return `kj-drawer-${++_drawerIdCounter}`;
}

let _drawerTitleIdCounter = 0;
/** Allocate a stable title id used for `aria-labelledby`. */
export function nextDrawerTitleId(): string {
  return `kj-drawer-title-${++_drawerTitleIdCounter}`;
}

let _drawerDescriptionIdCounter = 0;
/** Allocate a stable description id used for `aria-describedby`. */
export function nextDrawerDescriptionId(): string {
  return `kj-drawer-description-${++_drawerDescriptionIdCounter}`;
}
