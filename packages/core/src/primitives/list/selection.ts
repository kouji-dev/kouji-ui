// packages/core/src/primitives/list/selection.ts
import { Injectable, effect, type WritableSignal, inject, signal } from '@angular/core';
import {
  KJ_LIST_NAVIGATOR_CONFIG,
  type KjCompareFn,
  type KjListSelectionMode,
  type KjTreeShape,
} from './tokens';

/**
 * Selection state shared by a list-style consumer (KjSelect, KjCombobox,
 * KjTreeSelect). Reads / writes the canonical value via the consumer's
 * `KJ_LIST_NAVIGATOR_CONFIG.value` writable signal — one source of
 * truth, no bridging effects. When the consumer also exposes `mode`
 * and / or `compareBy` on the same config, the model follows them
 * reactively (no `setMode` / `setCompareBy` plumbing needed).
 *
 * Modes:
 * - `'single'` — replace + close
 * - `'multi'` — flat toggle in array
 * - `'leaf'` — tree-aware multi where only leaves enter `value`
 * - `'cascade'` — tri-state tree selection
 *
 * Tree modes require a topology provided via {@link setTreeShape}.
 *
 * @doc-category Core/Primitives
 */
@Injectable()
export class KjSelectionModel<T = unknown> {
  /**
   * The writable signal the consumer root exposes as `value` on its
   * `KjListNavigatorConfig`. Required — Angular throws if
   * `KJ_LIST_NAVIGATOR_CONFIG` is missing, and the `as` cast throws an
   * NPE on first use if the consumer forgot to expose `value`.
   */
  private readonly _value = inject(KJ_LIST_NAVIGATOR_CONFIG)
    .value as WritableSignal<T | readonly T[] | null>;

  private readonly _mode  = signal<KjListSelectionMode>('single');
  private _compareBy: KjCompareFn<T> = Object.is as KjCompareFn<T>;
  private _treeShape: KjTreeShape<T> | null = null;

  constructor() {
    const cfg = inject(KJ_LIST_NAVIGATOR_CONFIG);
    if (cfg.mode)      effect(() => this._mode.set(cfg.mode!()));
    if (cfg.compareBy) effect(() => { this._compareBy = cfg.compareBy!() as KjCompareFn<T>; });
    if (cfg.treeShape) effect(() => { this._treeShape = cfg.treeShape!() as KjTreeShape<T> | null; });
  }

  /** Current mode. */
  readonly mode = this._mode.asReadonly();

  /** Switch mode. Tree modes require a `setTreeShape()` call too. */
  setMode(mode: KjListSelectionMode): void {
    this._mode.set(mode);
  }

  /** Replace the current selection value (writes through the provider). */
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
