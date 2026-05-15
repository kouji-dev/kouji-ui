// packages/core/src/primitives/list/selection.ts
import { Injectable, signal, type Signal, type WritableSignal } from '@angular/core';
import type { KjCompareFn, KjListSelectionMode, KjTreeShape } from './tokens';

/**
 * Selection state shared by a list-style consumer (KjSelect, KjCombobox,
 * KjTreeSelect). Provided once per consumer root via DI. Defaults to
 * single mode + `Object.is` comparison.
 *
 * Supports four modes — see {@link KjListSelectionMode}:
 * - `'single'` — replace + close
 * - `'multi'` — flat toggle in array
 * - `'leaf'` — tree-aware multi where only leaves enter `value`
 * - `'cascade'` — tri-state tree selection
 *
 * Tree modes require a topology provided via {@link setTreeShape}. Without
 * one, `'leaf'` and `'cascade'` fall back to flat `'multi'` behavior.
 *
 * **Binding the value** — consumers hand the model a writable signal
 * (typically a `model()` input) via {@link bindValue}. The model stops
 * owning storage and reads/writes through the consumer's signal directly,
 * which removes the need for bridging effects between the consumer's
 * `kjValue` and the model's value.
 *
 * @doc-category Core/Primitives
 */
@Injectable()
export class KjSelectionModel<T = unknown> {
  /**
   * Internal storage. Replaced wholesale by {@link bindValue} so the
   * consumer's writable signal (typically a `model()` input) becomes the
   * single source of truth. `bindValue` MUST be called from the
   * consumer's constructor, before any read of `value` / `isSelected` /
   * etc — otherwise downstream `computed`s would have already subscribed
   * to the previous (default) signal.
   */
  private _value: WritableSignal<T | readonly T[] | null> = signal(null);
  private readonly _mode  = signal<KjListSelectionMode>('single');
  private _compareBy: KjCompareFn<T> = Object.is as KjCompareFn<T>;
  private _treeShape: KjTreeShape<T> | null = null;

  /** Current mode. */
  readonly mode  = this._mode.asReadonly();
  /**
   * Current selection. `single` → `T | null`; multi-style → `readonly T[]`.
   * Reactive — returns the readonly view of the currently bound storage,
   * so subscribers track the bound signal after {@link bindValue} runs.
   */
  get value(): Signal<T | readonly T[] | null> {
    return this._value.asReadonly();
  }

  /**
   * Bind a consumer-owned writable signal as the storage for `value`.
   * After binding, `toggle()` / `setValue()` write through the consumer's
   * signal, and reads return its current value. Eliminates the bridging
   * effects a consumer would otherwise need to mirror its `model()` input
   * into the model.
   *
   * Must run in the consumer's constructor before any downstream
   * `computed` / `effect` reads `value`/`isSelected`.
   */
  bindValue(source: WritableSignal<T | readonly T[] | null>): void {
    this._value = source;
  }

  /** Switch mode. Tree modes require a `setTreeShape()` call too. */
  setMode(mode: KjListSelectionMode): void {
    this._mode.set(mode);
  }

  /** Replace the current selection value (writes through bound storage). */
  setValue(v: T | readonly T[] | null): void {
    this._value.set(v);
  }

  /** Override the equality function. Defaults to `Object.is`. */
  setCompareBy(fn: KjCompareFn<T>): void {
    this._compareBy = fn;
  }

  /**
   * Provide the tree topology for `'leaf'` and `'cascade'` modes.
   * Pass `null` to clear.
   */
  setTreeShape(shape: KjTreeShape<T> | null): void {
    this._treeShape = shape;
  }

  /** Whether `target` is currently in the selection (membership check). */
  isSelected(target: T): boolean {
    const v = this._value();
    if (v === null) return false;
    const mode = this._mode();
    if (mode === 'multi' || mode === 'leaf' || mode === 'cascade') {
      return Array.isArray(v) && v.some(x => this._compareBy(x, target));
    }
    return this._compareBy(v as T, target);
  }

  /**
   * Tri-state for `'cascade'` mode. Walks descendants via the configured
   * tree shape:
   * - `'true'` — node and all leaf descendants are selected
   * - `'mixed'` — some but not all descendants are selected
   * - `'false'` — no descendants are selected
   *
   * In any other mode (or when no tree shape is set), returns `'true'`
   * / `'false'` based on `isSelected()`.
   */
  cascadeState(target: T): 'true' | 'false' | 'mixed' {
    if (this._mode() !== 'cascade' || !this._treeShape) {
      return this.isSelected(target) ? 'true' : 'false';
    }
    return this._cascadeState(target, this._treeShape);
  }

  private _cascadeState(node: T, shape: KjTreeShape<T>): 'true' | 'false' | 'mixed' {
    if (shape.isLeaf(node)) {
      return this.isSelected(node) ? 'true' : 'false';
    }
    const children = shape.getChildren(node);
    if (children.length === 0) {
      return this.isSelected(node) ? 'true' : 'false';
    }
    let allTrue = true;
    let anyTrueOrMixed = false;
    for (const c of children) {
      const s = this._cascadeState(c, shape);
      if (s !== 'true') allTrue = false;
      if (s !== 'false') anyTrueOrMixed = true;
    }
    if (allTrue) return 'true';
    if (anyTrueOrMixed) return 'mixed';
    return 'false';
  }

  /**
   * Toggle `target` per the current mode:
   * - `'single'` — replaces value; `closeRequested: true`
   * - `'multi'` — flat toggle; `closeRequested: false`
   * - `'leaf'` — toggle only when `target` is a leaf; branches are no-ops
   * - `'cascade'` — toggle target + all leaf descendants based on current
   *   tri-state (`'true'` deselects, `'false'`/`'mixed'` selects)
   */
  toggle(target: T): { closeRequested: boolean } {
    const mode = this._mode();
    if (mode === 'cascade' && this._treeShape) {
      return this._cascadeToggle(target, this._treeShape);
    }
    if (mode === 'leaf' && this._treeShape) {
      if (!this._treeShape.isLeaf(target)) return { closeRequested: false };
      return this._multiToggle(target);
    }
    if (mode === 'multi' || mode === 'leaf' || mode === 'cascade') {
      return this._multiToggle(target);
    }
    this._value.set(target);
    return { closeRequested: true };
  }

  private _multiToggle(target: T): { closeRequested: boolean } {
    const current = this._value();
    const arr = Array.isArray(current) ? [...current] : [];
    const idx = arr.findIndex(x => this._compareBy(x, target));
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(target);
    this._value.set(arr);
    return { closeRequested: false };
  }

  private _cascadeToggle(target: T, shape: KjTreeShape<T>): { closeRequested: boolean } {
    const currentState = this._cascadeState(target, shape);
    const shouldSelect = currentState !== 'true';

    const collectLeaves = (node: T): T[] => {
      if (shape.isLeaf(node)) return [node];
      const out: T[] = [];
      for (const c of shape.getChildren(node)) out.push(...collectLeaves(c));
      return out;
    };

    const leaves = collectLeaves(target);
    const current = this._value();
    const arr = Array.isArray(current) ? [...current] : [];

    for (const leaf of leaves) {
      const idx = arr.findIndex(x => this._compareBy(x, leaf));
      if (shouldSelect && idx < 0) arr.push(leaf);
      else if (!shouldSelect && idx >= 0) arr.splice(idx, 1);
    }

    this._value.set(arr);
    return { closeRequested: false };
  }

  /** Clear the selection. `single` → `null`; multi-style → `[]`. */
  clear(): void {
    const mode = this._mode();
    this._value.set(mode === 'single' ? null : []);
  }
}
