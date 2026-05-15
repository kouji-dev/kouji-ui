import {
  Directive,
  computed,
  contentChildren,
  forwardRef,
  inject,
  input,
  model,
  output,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { KjOverlayController } from '../primitives/overlay/controller';
import { KJ_SELECT } from '../select/select-root';
import {
  KJ_LIST_NAVIGATOR_CONFIG,
  KjListItem,
  KjSelectionModel,
  type KjCompareFn,
  type KjListNavigatorConfig,
  type KjListSelectionMode,
  type KjTreeShape,
} from '../primitives/list';
import {
  KJ_CASCADE_SELECT,
  type KjCascadeSelectContext,
} from './cascade-select.context';
import { KjCascadeSelectOption } from './cascade-select-option';

/**
 * Root cascade-select container. Implements
 * {@link KjListNavigatorConfig} (items, value, mode, compareBy, treeShape,
 * afterSelect) and provides itself under `KJ_LIST_NAVIGATOR_CONFIG` via
 * `forwardRef`. Each cascade panel + sub-panel hosts its own
 * `KjListNavigator` (vertical + activedescendant); `KjListItem` instances
 * composed on `KjCascadeSelectOption` toggle the shared `KjSelectionModel`
 * in `'leaf'` mode, so branch clicks are no-ops at the model layer and
 * only leaf activations enter `kjValue`.
 *
 * Like `KjSelect`, the root does NOT `inject(KjSelectionModel)` — doing
 * so at construction creates a runtime cycle (the model's
 * `inject(KJ_LIST_NAVIGATOR_CONFIG)` would resolve to a not-yet-built
 * `KjCascadeSelect` instance, regardless of `forwardRef`). The model is
 * constructed lazily when a child `KjListItem` first asks for it.
 *
 * @example
 * ```html
 * <div kjCascadeSelect [(kjValue)]="city" [kjTreeShape]="shape">
 *   <button kjCascadeSelectTrigger #t="kjCascadeSelectTrigger">Pick</button>
 *   <div kjCascadeSelectPanel [kjFor]="t">
 *     <div kjCascadeSelectOption [kjOptionValue]="'us'" kjOptionLabel="USA">…</div>
 *   </div>
 * </div>
 * ```
 *
 * @doc-category Core/Data input
 * @doc
 * @doc-name cascade-select
 * @doc-is-main
 * @doc-description Unstyled cascade-select root that implements KjListNavigatorConfig and owns the shared selection model.
 */
@Directive({
  selector: '[kjCascadeSelect]',
  exportAs: 'kjCascadeSelect',
  standalone: true,
  providers: [
    { provide: KJ_CASCADE_SELECT, useExisting: forwardRef(() => KjCascadeSelect) },
    { provide: KJ_SELECT, useExisting: forwardRef(() => KjCascadeSelect) },
    { provide: KJ_LIST_NAVIGATOR_CONFIG, useExisting: forwardRef(() => KjCascadeSelect) },
    KjSelectionModel,
    KjOverlayController,
  ],
})
export class KjCascadeSelect implements KjListNavigatorConfig, KjCascadeSelectContext {
  /** @internal — shared overlay controller; trigger + panel + options share this. */
  private readonly _controller = inject(KjOverlayController);

  /** Two-way bindable selected leaf value. */
  readonly kjValue = model<unknown>(undefined);

  /** Two-way bindable path of values from root to selected leaf. */
  readonly kjCascadePath = model<readonly unknown[]>([]);

  /**
   * Tree topology used by `KjSelectionModel` in `'leaf'` mode (branch
   * clicks become no-ops automatically when the shape is known). Also
   * used by `afterSelect` to derive the cascade path from the selected
   * leaf value.
   */
  readonly kjTreeShape = input<KjTreeShape<unknown> | null>(null);

  /** Sub-panel hover-open delay in ms. Default 100 (matches Dropdown Menu). */
  readonly kjSubPanelOpenDelayMs = input<number>(100);

  /** Sub-panel hover-out close delay in ms. Default 300 (prevents flicker). */
  readonly kjSubPanelCloseDelayMs = input<number>(300);

  /** Emitted when the active-descendant crosses a level boundary. */
  readonly kjLevelChange = output<{ levelIndex: number }>();

  // ── KjListNavigatorConfig implementation ──────────────────────────
  /** All `KjListItem`s under this cascade — source for the navigators. */
  readonly items = contentChildren(KjListItem, { descendants: true });

  /**
   * Every projected `KjCascadeSelectOption`. Used by {@link findOption}
   * to resolve a `KjListItem` id (typically the navigator's active id)
   * to its wrapping option directive — no `document.getElementById` /
   * `querySelector` lookups in panel keydown handlers.
   */
  private readonly _options = contentChildren(KjCascadeSelectOption, { descendants: true });

  private readonly _optionsById = computed(() => {
    const map = new Map<string, KjCascadeSelectOption>();
    for (const o of this._options()) map.set(o.item.id, o);
    return map;
  });

  /**
   * Resolve the `KjCascadeSelectOption` wrapping the given
   * `KjListItem.id`. Returns `undefined` when no projected option
   * matches.
   */
  findOption(itemId: string): KjCascadeSelectOption | undefined {
    return this._optionsById().get(itemId);
  }

  /**
   * Implements `KjListNavigatorConfig.value`. Shared with `kjValue` so
   * `KjSelectionModel` reads / writes through the same signal — one
   * source of truth.
   */
  readonly value = this.kjValue as unknown as WritableSignal<
    unknown | readonly unknown[] | null
  >;

  /**
   * Cascade is leaf-only: branch options never enter `kjValue`. The
   * `KjSelectionModel` in `'leaf'` mode no-ops on branch toggles when a
   * `treeShape` is provided.
   */
  readonly mode: Signal<KjListSelectionMode> = signal<KjListSelectionMode>('leaf');

  /** Implements `KjListNavigatorConfig.compareBy`. */
  readonly compareBy = signal<KjCompareFn<unknown>>(Object.is as KjCompareFn<unknown>);

  /** Re-exposes `kjTreeShape` under the {@link KjListNavigatorConfig} key. */
  readonly treeShape = this.kjTreeShape;

  // ── KjSelectContext-compatible surface ──────────────────────────────
  /** Open state — drives `KjSelect.open` for downstream consumers. */
  readonly open = this._controller.isOpen;

  /** Compatibility shim — KjSelect-style single setter. Closes the panel. */
  select(val: unknown): void {
    this.kjValue.set(val);
    this._controller.close('programmatic');
  }

  /** Compatibility shim — toggles the overlay. */
  toggle(): void {
    if (this._controller.isOpen()) this._controller.close('programmatic');
    else this._controller.open();
  }

  // ── KjCascadeSelectContext implementation ──────────────────────────
  private readonly _openSubPanels = signal<readonly string[]>([]);

  /** Path of values from root option to the selected leaf. */
  readonly path = computed(() => this.kjCascadePath());

  /** Open sub-panel ownerOptionIds (level → level chain). */
  readonly openSubPanels = this._openSubPanels.asReadonly();

  /** Hover-open delay (ms). */
  readonly subPanelOpenDelayMs = computed(() => this.kjSubPanelOpenDelayMs());
  /** Hover-out close delay (ms). */
  readonly subPanelCloseDelayMs = computed(() => this.kjSubPanelCloseDelayMs());

  /**
   * Implements `KjListNavigatorConfig.afterSelect`. Invoked by
   * `KjListItem` after it toggles the shared selection model. In
   * leaf mode the model always returns `closeRequested: false`, but
   * cascade-select's existing behavior closes the panel after every
   * leaf commit — so we ignore `closeRequested` and close
   * unconditionally when a real (defined) value was toggled. Branch
   * clicks bypass the model toggle (no-op in leaf mode when a
   * `treeShape` is known) and the panel stays open so the user can
   * keep traversing.
   */
  afterSelect(value: unknown, _closeRequested: boolean): void {
    if (value === undefined) return;
    const shape = this.kjTreeShape();
    if (shape && !shape.isLeaf(value)) return;
    // Derive the path from tree shape (if any) by walking parents from
    // the selected leaf up to the root. Without a shape, we can't
    // reconstruct ancestry — fall back to a single-element path.
    if (shape) {
      const reverse: unknown[] = [value];
      let cur: unknown | null = shape.getParent(value);
      while (cur !== null) {
        reverse.unshift(cur);
        cur = shape.getParent(cur);
      }
      this.kjCascadePath.set(reverse);
    } else {
      this.kjCascadePath.set([value]);
    }
    this._openSubPanels.set([]);
    this._controller.close('programmatic');
  }

  /**
   * Programmatic commit used by code paths that don't flow through
   * `KjListItem._activate` (e.g. trigger-level shortcuts).
   */
  selectLeaf(value: unknown, path: readonly unknown[]): void {
    this.kjValue.set(value);
    this.kjCascadePath.set(path);
    this._openSubPanels.set([]);
    this._controller.close('programmatic');
  }

  /**
   * Open the sub-panel for `ownerOptionId`. The full chain is rebuilt
   * from the option's ancestry — walking `parentSubPanel.parentOption`
   * up to the root — so siblings at any depth become mutually
   * exclusive. Without this, opening sibling B with sibling A still in
   * the chain leaves both panels in `_openSubPanels`, and A's pending
   * close timer (queued when the cursor crossed out of A) then fires
   * and `slice(0, idx)` strips B too. Rebuilding from ancestry makes
   * the chain authoritative: stale entries can't slice through fresh
   * ones because the fresh open already removed them.
   */
  openSubPanel(ownerOptionId: string): void {
    const target = this.findOption(ownerOptionId);
    if (!target) {
      // Fallback: option not yet registered (rare — pre-content-init).
      // Append to keep behavior monotonic; the close path is tolerant.
      this._openSubPanels.update(panels =>
        panels.includes(ownerOptionId) ? panels : [...panels, ownerOptionId],
      );
      return;
    }
    // Walk the target's ancestry once: build the new chain AND cancel
    // any pending close timer along it. The second part fixes a
    // hover-transition glitch where, after the cursor moves from
    // sibling A to sibling B, a spurious close timer queued on B
    // during the inter-option crossing would fire 300ms later and
    // dismiss B's freshly-opened sub-panel. Cancelling on open makes
    // the new chain authoritative — only an actual mouseleave on the
    // current chain can schedule a fresh close.
    const chain: string[] = [];
    let current: typeof target | null = target;
    while (current) {
      current._cancelCloseTimer();
      chain.unshift(current.item.id);
      current = current.parentSubPanel?.parentOption ?? null;
    }
    this._openSubPanels.set(chain);
  }

  closeSubPanel(ownerOptionId: string): void {
    this._openSubPanels.update(panels => {
      const idx = panels.indexOf(ownerOptionId);
      if (idx < 0) return panels;
      return panels.slice(0, idx);
    });
  }

  closeAll(): void {
    this._openSubPanels.set([]);
  }

  /** Closes the root cascade panel. */
  hide(): void {
    this._controller.close('programmatic');
  }
}
