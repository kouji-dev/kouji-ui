import { InjectionToken, Signal } from '@angular/core';

/**
 * Context shared between the root `KjInputOtp` directive and each
 * `KjInputOtpCell` leaf directive.  Provided via `KJ_INPUT_OTP` on the
 * root element and injected by every cell.
 */
export interface KjInputOtpContext {
  /** The full concatenated OTP value (empty cells contribute nothing). */
  value: Signal<string>;
  /** One entry per cell: its character, or `''` while empty. Index by `kjIndex`. */
  chars: Signal<readonly string[]>;
  /** Total number of cells. */
  length: Signal<number>;
  /** Whether the widget is disabled (union of kjDisabled + form-level disable). */
  disabled: Signal<boolean>;
  /** Whether the widget is read-only. */
  readonly: Signal<boolean>;
  /** Whether cells should render as `type="password"`. */
  masked: Signal<boolean>;
  /** Character set restriction — drives inputmode, pattern, and filter logic. */
  charSet: Signal<'digits' | 'alphanumeric' | RegExp>;
  /** Index of the currently focused cell, or -1 if none. */
  focusedIndex: Signal<number>;

  /** Called by a cell to push its new single character (or '' for clear) upstream. */
  setCellValue(index: number, char: string): void;
  /** Called by a cell to request focus movement by delta (+1 / -1). */
  moveFocus(delta: number): void;
  /** Called by a cell to request focus on a specific index (clamped). */
  focusIndex(index: number): void;
  /** Called by a cell when a paste event occurs; distributes chars from `fromIndex`. */
  handlePaste(event: ClipboardEvent, fromIndex: number): void;
  /** Called by a cell when a copy event occurs; writes the full code to clipboard. */
  handleCopy(event: ClipboardEvent): void;
  /** Called by a cell when `kjIndex` binds, to register its native input element. */
  registerCell(index: number, el: HTMLInputElement): void;
  /** Called by a cell on effect cleanup (move or destroy), to release its slot. */
  unregisterCell(index: number): void;
}

/** Injection token for the `KjInputOtpContext`. */
export const KJ_INPUT_OTP = new InjectionToken<KjInputOtpContext>('KjInputOtp');
