import { InjectionToken } from '@angular/core';

/**
 * Contract handed to a cell editor when the user enters edit mode.
 *
 * The host (a table cell) wires up:
 * - `value` — the current cell value to seed the editor with;
 * - `commit(next)` — called when the editor wants to persist the new value
 *   (Enter, blur for text-like editors, or change for select/boolean);
 * - `cancel()` — called when the user aborts editing (Escape).
 *
 * Editors should not assume anything about how the host applies the commit —
 * they just call `commit(next)` with the resolved value.
 */
export interface KjEditorContract<TValue> {
  /** Initial value shown when the editor mounts. */
  value: TValue;
  /** Persist the new value. */
  commit: (next: TValue) => void;
  /** Discard the in-progress edit. */
  cancel: () => void;
  /** Column meta forwarded to the editor — e.g. select options, min/max
   *  for number editors, custom params. Editors read what they need and
   *  ignore the rest. */
  meta?: Record<string, unknown>;
}

/**
 * DI token for the {@link KjEditorContract}. The table cell that mounts an
 * editor provides this token; each editor injects it and reacts to its
 * `value` / `commit` / `cancel` hooks.
 */
export const KJ_EDITOR_CONTRACT = new InjectionToken<KjEditorContract<unknown>>(
  'kj.editor.contract',
);

export * from './text-editor';
export * from './number-editor';
export * from './date-editor';
export * from './select-editor';
export * from './boolean-editor';
