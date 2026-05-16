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
 * {@link KjListNavigatorConfig} (items, value, mode, compareBy,
 * treeShape, afterSelect) and provides itself under
 * `KJ_LIST_NAVIGATOR_CONFIG` via `forwardRef`. Each cascade panel +
 * sub-panel hosts its own `KjListNavigator` (vertical +
 * activedescendant). All tree-walking logic — branch gating, path
 * derivation, isLeaf — lives in the shared `KjSelectionModel`, which
 * auto-derives the tree shape from each `KjListItem.parent` DI pointer.
 * The root just owns cascade-specific UX: the sub-panel open-chain and
 * the overlay close-on-commit behavior.
 *
 * Like `KjSelect`, the root does NOT inject `KjSelectionModel` at
 * construction — doing so creates a runtime cycle (the model's
 * `inject(KJ_LIST_NAVIGATOR_CONFIG)` would resolve to a still-
 * constructing root). Lazy access via the element `Injector` resolves
 * the model after construction finishes.
 *
 * @example
 * ```html
 * <div kjCascadeSelect [(kjValue)]="city">
 *   <button kjCascadeSelectTrigger #t="kjCascadeSelectTrigger">Pick</button>
 *   <div kjCascadeSelectPanel [kjFor]="t">
 *     <div kjCascadeSelectOption [kjValue]="'us'" kjLabel="USA">…</div>
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
   * Optional consumer-supplied tree topology. When omitted, the
   * selection model auto-derives one from each `KjListItem.parent`
   * pointer (which Angular resolves via the element injector — the
   * outer cascade option of a sub-panel's contents). Supply this only
   * when the consumer's data model isn't a faithful match for the
   * projected DOM (rare).
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
   * Cascade is single-leaf select: exactly one leaf value lives in
   * `kjValue`. The selection model's `'single'` + tree-shape branch
   * gate blocks non-leaf commits automatically — branches only toggle
   * their own sub-panel via `KjCascadeSelectOption.handleClick`.
   */
  readonly mode: Signal<KjListSelectionMode> = signal<KjListSelectionMode>('single');

  /** Implements `KjListNavigatorConfig.compareBy`. */
  readonly compareBy = signal<KjCompareFn<unknown>>(Object.is as KjCompareFn<unknown>);

  /** Re-exposes `kjTreeShape` under the {@link KjListNavigatorConfig} key. */
  readonly treeShape = this.kjTreeShape;

  /**
   * Selection model is injected directly. The model uses a {@link
   * KjSelectionModel.bind} call to receive this root's canonical
   * signals — that pattern keeps the DI graph acyclic (the model does
   * not inject `KJ_LIST_NAVIGATOR_CONFIG` back, so providing both on
   * the same element no longer collides).
   */
  private readonly _selection = inject(KjSelectionModel);

  constructor() {
    this._selection.bind({
      value:     this.value,
      items:     this.items,
      mode:      this.mode,
      compareBy: this.compareBy,
      treeShape: this.treeShape,
    });
  }

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
   * Implements `KjListNavigatorConfig.afterSelect`. The selection model
   * already gated branches before reaching here (see
   * `KjSelectionModel.canActivate`), so any defined `value` is a leaf
   * commit: derive the path from the model, surface it on
   * `kjCascadePath`, close every sub-panel, and dismiss the overlay.
   */
  afterSelect(value: unknown, _closeRequested: boolean): void {
    if (value === undefined) return;
    this.kjCascadePath.set(this._selection.pathTo(value));
    this._openSubPanels.set([]);
    this._controller.close('programmatic');
  }

  /**
   * Open the sub-panel chain ending at `ownerOptionId`. Walking the
   * target's ancestry on every open is the trick that keeps sibling
   * sub-panels mutually exclusive: any stale entries from a prior
   * branch get replaced atomically with the fresh chain, so a
   * mouseleave-queued close timer on a sibling can no longer slice
   * through the new chain after it fires. The walk also cancels any
   * pending close timers along the new chain so a brief inter-option
   * cursor crossing doesn't dismiss a freshly-opened panel.
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
