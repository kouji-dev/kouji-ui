import { InjectionToken, type Signal } from '@angular/core';

/**
 * Reason a close was requested. Propagated to consumer-supplied
 * `(kjCloseRequested)` handlers via {@link KjDialogCloseEvent}.
 */
export type KjDialogCloseReason =
  | 'escape'
  | 'backdrop'
  | 'close-button'
  | 'programmatic';

/**
 * Event emitted before a dialog closes. Consumers can call `preventDefault()`
 * to veto the close (e.g. "discard unsaved changes?" prompt for a dirty form).
 */
export interface KjDialogCloseEvent {
  readonly reason: KjDialogCloseReason;
  readonly result: unknown;
  preventDefault(): void;
  readonly defaultPrevented: boolean;
}

/**
 * Event emitted before auto-focus runs on open / close. Consumers can call
 * `preventDefault()` to manage focus themselves.
 */
export interface KjDialogAutoFocusEvent {
  readonly element: HTMLElement;
  preventDefault(): void;
  readonly defaultPrevented: boolean;
}

/** Internal helper: build a {@link KjDialogCloseEvent}. */
export function createDialogCloseEvent(
  reason: KjDialogCloseReason,
  result: unknown,
): KjDialogCloseEvent {
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

/** Internal helper: build a {@link KjDialogAutoFocusEvent}. */
export function createDialogAutoFocusEvent(element: HTMLElement): KjDialogAutoFocusEvent {
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
 * Context shared between the dialog directive family.
 *
 * Implemented by {@link import('./dialog').KjDialogTrigger} on the declarative
 * path, and by a synthesised object built by `KjDialogService` on the
 * programmatic path. Either way, child directives (`[kjDialog]`,
 * `[kjDialogOverlay]`, `[kjDialogTitle]`, `[kjDialogDescription]`,
 * `[kjDialogClose]`, `[kjDialogActions]`, `[kjDialogContent]`) inject
 * {@link KJ_DIALOG} and treat the rest of the surface uniformly.
 */
export interface KjDialogContext {
  readonly open: Signal<boolean>;
  readonly dialogId: string;
  readonly titleId: Signal<string | null>;
  readonly descriptionId: Signal<string | null>;
  readonly closeOnEscape: Signal<boolean>;
  readonly closeOnBackdrop: Signal<boolean>;

  registerTitleId(id: string): void;
  unregisterTitleId(id: string): void;
  registerDescriptionId(id: string): void;
  unregisterDescriptionId(id: string): void;

  /** Request a close with the given reason. Cancellable. */
  close(result?: unknown, reason?: KjDialogCloseReason): void;
}

/** Injection token for the dialog context. */
export const KJ_DIALOG = new InjectionToken<KjDialogContext>('KjDialog');

let _dialogIdCounter = 0;
/** Allocate a stable dialog id used for `aria-controls` / labelledby wiring. */
export function nextDialogId(): string {
  return `kj-dialog-${++_dialogIdCounter}`;
}

let _dialogTitleIdCounter = 0;
/** Allocate a stable title id used for `aria-labelledby`. */
export function nextDialogTitleId(): string {
  return `kj-dialog-title-${++_dialogTitleIdCounter}`;
}

let _dialogDescriptionIdCounter = 0;
/** Allocate a stable description id used for `aria-describedby`. */
export function nextDialogDescriptionId(): string {
  return `kj-dialog-description-${++_dialogDescriptionIdCounter}`;
}
