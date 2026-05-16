// packages/core/src/primitives/list/selection.ts
import { Injectable, computed, effect, signal, type Signal, type WritableSignal } from '@angular/core';
import type { KjListItem } from './item';
import type {
  KjCompareFn,
  KjListSelectionMode,
  KjTreeShape,
} from './tokens';

/**
 * Selection state shared by a list-style consumer (KjSelect, KjCombobox,
 * KjTreeSelect, KjCascadeSelect). The consumer root calls {@link bind}
 * from its constructor to wire in its canonical signals — the model
 * reads/writes through those signals, so there is no second source of
 * truth and no cyclic DI dependency (the model does not inject the
 * root; the root injects the model).
 *
 * **Tree topology is first-class.** When the consumer supplies a
 * `treeShape` signal, the model uses it. Otherwise the model
 * **auto-derives** a shape from the registered `KjListItem` parent
 * pointers (each item injects its nearest ancestor `KjListItem` via the
 * element injector). That makes DOM-nested clusters (cascade-select,
 * sub-menus) tree-aware out of the box; flat data-driven clusters
 * (tree-select) keep using the explicit shape.
 *
 * Modes:
 * - `'single'` — replace + close. With a shape, branch toggles no-op
 *   (only leaves enter `value`).
 * - `'multi'` — flat toggle in array
 * - `'leaf'` — tree-aware multi where only leaves enter `value`
 * - `'cascade'` — tri-state tree selection
 *
 * @doc-category Core/Primitives
 */
@Injectable()
export class KjSelectionModel<T = unknown> {
  /**
   * Source signals. Replaced wholesale by {@link bind} so the
   * consumer's reactive inputs become the canonical state. `bind` MUST
   * be called from the consumer's constructor, before any descendant
   * `KjListItem._activate` fires.
   */
  private _value:    WritableSignal<T | readonly T[] | null> =
    signal<T | readonly T[] | null>(null);
  private _items:    Signal<readonly KjListItem<unknown>[] | null> = signal(null);
  private _modeSig:  Signal<KjListSelectionMode> = signal<KjListSelectionMode>('single');
  private _cmpSig:   Signal<KjCompareFn<T>>      = signal(Object.is as KjCompareFn<T>);
  private _shapeSig: Signal<KjTreeShape<T> | null> = signal(null);

  private readonly _mode = signal<KjListSelectionMode>('single');
  private _compareBy: KjCompareFn<T> = Object.is as KjCompareFn<T>;
  private readonly _consumerShape = signal<KjTreeShape<T> | null>(null);

  constructor() {
    // Effects always re-evaluate the bound signals so the model stays
    // in sync whether the consumer rebinds during construction or
    // mutates the underlying signals later. Reading inside an effect
    // (rather than at construction time) means the model is robust to
    // property-initializer ordering on consumer roots.
    effect(() => this._mode.set(this._modeSig()));
    effect(() => { this._compareBy = this._cmpSig(); });
    effect(() => this._consumerShape.set(this._shapeSig()));
  }

  /**
   * Bind consumer-owned source signals. Each is optional; unbound keys
   * keep their previous source (defaulting to constants on first
   * construct). Call once in the consumer's constructor before any
   * descendant `KjListItem` activation fires.
   */
  bind(sources: {
    readonly value?:     WritableSignal<T | readonly T[] | null>;
    readonly items?:     Signal<readonly KjListItem<unknown>[]>;
    readonly mode?:      Signal<KjListSelectionMode>;
    readonly compareBy?: Signal<KjCompareFn<T>>;
    readonly treeShape?: Signal<KjTreeShape<T> | null>;
  }): void {
    if (sources.value)     this._value    = sources.value;
    if (sources.items)     this._items    = sources.items as Signal<readonly KjListItem<unknown>[] | null>;
    if (sources.mode)      this._modeSig  = sources.mode;
    if (sources.compareBy) this._cmpSig   = sources.compareBy;
    if (sources.treeShape) this._shapeSig = sources.treeShape;
  }

  /** Current mode. */
  readonly mode = this._mode.asReadonly();

  /**
   * Effective tree topology — consumer-supplied (`bind({ treeShape })`)
   * when present, otherwise auto-derived from registered `KjListItem`
   * parent pointers. Returns `null` when neither is available.
   */
  readonly shape: Signal<KjTreeShape<T> | null> = computed(() => {
    const explicit = this._consumerShape();
    if (explicit) return explicit;
    return this._autoShape();
  });

  /**
   * Auto-derived tree shape: a map of every registered item's value to
   * its parent value (and inverse children list), built from each
   * `KjListItem`'s injected `parent` reference. Only useful for
   * DOM-nested clusters (cascade-select, sub-menus); flat clusters
   * (tree-select) bind their own shape.
   */
  private readonly _autoShape: Signal<KjTreeShape<T> | null> = computed(() => {
    const items = this._items();
    if (!items || items.length === 0) return null;
    const parentOf = new Map<T, T | null>();
    const childrenOf = new Map<T, T[]>();
    const valueByItem = new Map<KjListItem<unknown>, T>();
    for (const it of items) {
      const v = it.value();
      if (v === undefined) continue;
      valueByItem.set(it, v as T);
    }
    for (const it of items) {
      const v = valueByItem.get(it);
      if (v === undefined) continue;
      const parentItem = it.parent;
      const parentV = parentItem ? valueByItem.get(parentItem) ?? null : null;
      parentOf.set(v, parentV);
      if (parentV !== null) {
        const arr = childrenOf.get(parentV) ?? [];
        arr.push(v);
        childrenOf.set(parentV, arr);
      }
    }
    const eq = this._compareBy;
    const findKey = (n: T): T | undefined => {
      for (const k of parentOf.keys()) {
        if (eq(k, n)) return k;
      }
      return undefined;
    };
    return {
      getParent: (n: T) => {
        const key = findKey(n);
        return key !== undefined ? (parentOf.get(key) ?? null) : null;
      },
      getChildren: (n: T) => {
        const key = findKey(n);
        return key !== undefined ? (childrenOf.get(key) ?? []) : [];
      },
      isLeaf: (n: T) => {
        const key = findKey(n);
        if (key === undefined) return true;
        return (childrenOf.get(key)?.length ?? 0) === 0;
      },
    };
  });

  /** Switch mode imperatively (consumers should prefer binding a signal). */
  setMode(mode: KjListSelectionMode): void {
    this._mode.set(mode);
  }

  /** Replace the current selection value (writes through the bound signal). */
  setValue(v: T | readonly T[] | null): void {
    this._value.set(v);
  }

  /** Override the equality function. Defaults to `Object.is`. */
  setCompareBy(fn: KjCompareFn<T>): void {
    this._compareBy = fn;
  }

  /**
   * Provide the tree topology imperatively. Pass `null` to clear and
   * fall back to the auto-derived shape.
   */
  setTreeShape(shape: KjTreeShape<T> | null): void {
    this._consumerShape.set(shape);
  }

  /**
   * Whether `target` is a leaf in the effective shape. Returns `true`
   * when no shape is available (flat lists — everything is a "leaf").
   */
  isLeaf(target: T): boolean {
    const s = this.shape();
    return s ? s.isLeaf(target) : true;
  }

  /**
   * Root → target value chain via the effective shape. Returns
   * `[target]` when the target has no parent in the shape, and an
   * empty array when no shape is available.
   */
  pathTo(target: T): readonly T[] {
    const s = this.shape();
    if (!s) return [];
    const reverse: T[] = [target];
    let cur: T | null = s.getParent(target);
    while (cur !== null) {
      reverse.unshift(cur);
      cur = s.getParent(cur);
    }
    return reverse;
  }

  /**
   * Activation gate. Returns `true` when committing `target` is
   * meaningful in the current mode + shape:
   * - `'single'` with a shape → only leaves activate. Branches are
   *   blocked so they can serve as pure disclosure controls (open a
   *   sub-panel) without leaking a branch value into `value`.
   * - `'single'` without a shape → any value activates.
   * - `'multi'` → any value activates.
   * - `'leaf'` → only leaves activate (mirrors `toggle`'s no-op).
   * - `'cascade'` → any value activates (tri-state toggle applies).
   */
  canActivate(target: T): boolean {
    const mode = this._mode();
    if (mode === 'multi' || mode === 'cascade') return true;
    const s = this.shape();
    if (!s) return true;
    return s.isLeaf(target);
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
   * Tri-state for `'cascade'` mode. Walks descendants via the effective
   * tree shape:
   * - `'true'` — node and all leaf descendants are selected
   * - `'mixed'` — some but not all descendants are selected
   * - `'false'` — no descendants are selected
   *
   * In any other mode (or when no tree shape is set), returns `'true'`
   * / `'false'` based on `isSelected()`.
   */
  cascadeState(target: T): 'true' | 'false' | 'mixed' {
    const shape = this.shape();
    if (this._mode() !== 'cascade' || !shape) {
      return this.isSelected(target) ? 'true' : 'false';
    }
    return this._cascadeState(target, shape);
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
   * - `'single'` — with a shape, branch targets no-op
   *   (`closeRequested: false`); leaves replace value and return
   *   `closeRequested: true`. Without a shape, replaces unconditionally.
   * - `'multi'` — flat toggle in array; `closeRequested: false`
   * - `'leaf'` — toggle only when `target` is a leaf; branches are no-ops
   * - `'cascade'` — toggle target + all leaf descendants based on current
   *   tri-state (`'true'` deselects, `'false'`/`'mixed'` selects)
   */
  toggle(target: T): { closeRequested: boolean } {
    const mode = this._mode();
    const shape = this.shape();
    if (mode === 'cascade' && shape) {
      return this._cascadeToggle(target, shape);
    }
    if (mode === 'leaf' && shape) {
      if (!shape.isLeaf(target)) return { closeRequested: false };
      return this._multiToggle(target);
    }
    if (mode === 'multi' || mode === 'leaf' || mode === 'cascade') {
      return this._multiToggle(target);
    }
    // Single mode — gate branches when a shape is available.
    if (shape && !shape.isLeaf(target)) return { closeRequested: false };
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
