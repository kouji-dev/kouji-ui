// packages/core/src/primitives/list/selection.ts
import { Injectable, signal } from '@angular/core';
import type { KjCompareFn, KjListSelectionMode } from './tokens';

/**
 * Selection state shared by a list-style consumer (KjSelect, KjCombobox).
 * Provided once per consumer root via DI. Defaults to single mode + Object.is
 * comparison. The consumer's root directive pushes user-supplied compareBy
 * (typically a `kjCompareBy` input) through {@link setCompareBy}.
 *
 * @doc-category Core/Primitives
 */
@Injectable()
export class KjSelectionModel<T = unknown> {
  private readonly _mode  = signal<KjListSelectionMode>('single');
  private readonly _value = signal<T | readonly T[] | null>(null);
  private _compareBy: KjCompareFn<T> = Object.is as KjCompareFn<T>;

  /** Current mode (`single` | `multi`). */
  readonly mode  = this._mode.asReadonly();
  /** Current selection. Single mode: `T | null`. Multi mode: `readonly T[]`. */
  readonly value = this._value.asReadonly();

  /** Switch between single / multi modes. */
  setMode(mode: KjListSelectionMode): void {
    this._mode.set(mode);
  }

  /** Replace the current selection value. */
  setValue(v: T | readonly T[] | null): void {
    this._value.set(v);
  }

  /** Override the equality function. Defaults to `Object.is`. */
  setCompareBy(fn: KjCompareFn<T>): void {
    this._compareBy = fn;
  }

  /** Whether `target` is currently selected. */
  isSelected(target: T): boolean {
    const v = this._value();
    if (v === null) return false;
    if (this._mode() === 'multi') {
      return Array.isArray(v) && v.some(x => this._compareBy(x, target));
    }
    return this._compareBy(v as T, target);
  }

  /**
   * Toggle `target`. Single mode: replaces value, returns `closeRequested: true`.
   * Multi mode: adds/removes from the array, returns `closeRequested: false`.
   */
  toggle(target: T): { closeRequested: boolean } {
    if (this._mode() === 'multi') {
      const current = this._value();
      const arr = Array.isArray(current) ? [...current] : [];
      const idx = arr.findIndex(x => this._compareBy(x, target));
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(target);
      this._value.set(arr);
      return { closeRequested: false };
    }
    this._value.set(target);
    return { closeRequested: true };
  }

  /** Clear the selection. Single → `null`, multi → `[]`. */
  clear(): void {
    this._value.set(this._mode() === 'multi' ? [] : null);
  }
}
