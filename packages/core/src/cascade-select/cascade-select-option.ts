import {
  computed,
  contentChildren,
  Directive,
  forwardRef,
  inject,
  OnDestroy,
} from '@angular/core';
import { KjListItem, injectListItem } from '../primitives/list';
import { KJ_CASCADE_SELECT } from './cascade-select.context';
import { KjCascadeSelectSubPanel } from './cascade-select-sub-panel';

/**
 * Single row inside a `[kjCascadeSelectPanel]` or
 * `[kjCascadeSelectSubPanel]`. When projected `[kjCascadeSelectSubPanel]`
 * content is present the option becomes a **sub-trigger** (branch node);
 * otherwise it is a **leaf** that commits a value on activation.
 *
 * Composes `KjListItem` via `hostDirectives` — the list item owns the
 * stable `id`, the click / Enter / Space activation, `aria-selected`
 * (via the shared `KjSelectionModel` in `'leaf'` mode), and
 * `aria-disabled`. This directive contributes cascade-specific
 * semantics: `role="treeitem"`, branch `aria-haspopup` / `aria-expanded`,
 * and hover-open / hover-close timers for sub-panels.
 *
 * Branch detection is signal-driven: `KjCascadeSelectSubPanel` instances
 * declared inside this option call `_registerSubPanel()` from their
 * constructor (they inject this directive via the element injector).
 * No `contentChildren` + binding effect — straightforward DI both ways.
 *
 * Branch clicks are no-ops at the selection-model level (leaf mode
 * filters them out when a `treeShape` is provided on the root) but
 * still toggle their own sub-panel via this directive's
 * `handleClick()`.
 *
 * Role: `treeitem`.
 *
 * @example Leaf
 * ```html
 * <div kjCascadeSelectOption [kjValue]="'sf'" kjLabel="San Francisco" />
 * ```
 *
 * @example Branch
 * ```html
 * <div kjCascadeSelectOption [kjValue]="'us'" kjLabel="USA">
 *   <div kjCascadeSelectSubPanel>…</div>
 * </div>
 * ```
 * @doc-category Core/Data input
 * @doc
 * @doc-name cascade-select
 */
@Directive({
  selector: '[kjCascadeSelectOption]',
  exportAs: 'kjCascadeSelectOption',
  standalone: true,
  hostDirectives: [
    {
      directive: KjListItem,
      inputs: [
        'kjItemValue:kjValue',
        'kjItemLabel:kjLabel',
        'kjDisabled:kjDisabled',
      ],
    },
  ],
  host: {
    'role': 'treeitem',
    '[attr.aria-haspopup]': 'isBranch() ? "tree" : null',
    '[attr.aria-expanded]': 'isBranch() ? subPanelOpen().toString() : null',
    '[attr.data-label]': 'item.label()',
    '[attr.data-leaf]': 'isLeaf().toString()',
    '[attr.data-selected]': 'item.ariaSelected() === "true" ? "" : null',
    '[attr.data-active-path]': 'isOnActivePath() ? "" : null',
    '(click)': 'handleClick()',
    '(mouseenter)': 'handleMouseEnter()',
    '(mouseleave)': 'handleMouseLeave()',
  },
})
export class KjCascadeSelectOption implements OnDestroy {
  /** @internal — composed list-item primitive providing id/value/disabled/activation. */
  readonly item = injectListItem<unknown>();
  /** @internal */
  readonly ctx = inject(KJ_CASCADE_SELECT);

  /**
   * @internal Closest ancestor sub-panel (if any). `null` when this
   * option sits in the root cascade panel. Used by `KjCascadeSelect`'s
   * `openSubPanel` chain rebuild — walking parent panels up to the
   * root produces the exact open-chain that should be set, so opening
   * a sibling at any level closes its siblings automatically (instead
   * of leaving stale entries that a late-firing close timer can then
   * slice through).
   *
   * `forwardRef` defers the class lookup so the option ↔ sub-panel
   * import cycle doesn't trip on first evaluation.
   */
  readonly parentSubPanel = inject<KjCascadeSelectSubPanel | null>(
    forwardRef(() => KjCascadeSelectSubPanel),
    { optional: true },
  );

  // `kjValue`, `kjLabel`, `kjDisabled` are exposed via the composed
  // `KjListItem` host directive above. Don't redeclare them on this
  // class — duplicate public-name inputs route to the local declaration
  // and leave `KjListItem.kjItemValue` unset. Read values back through
  // `this.item.value()` / `this.item.label()`.

  /**
   * @internal Sub-panels projected as content of this option. Any
   * `[kjCascadeSelectSubPanel]` declared inside the option's content
   * makes it a branch — Angular keeps this signal in sync.
   */
  private readonly _subPanels = contentChildren(
    forwardRef(() => KjCascadeSelectSubPanel),
    { descendants: true },
  );

  /** @internal Whether this option is a branch node. */
  readonly isBranch = computed(() => this._subPanels().length > 0);

  /** @internal Inverse of `isBranch` for the `data-leaf` attribute. */
  readonly isLeaf = computed(() => !this.isBranch());

  private _openTimer: ReturnType<typeof setTimeout> | undefined;
  private _closeTimer: ReturnType<typeof setTimeout> | undefined;

  /** @internal True when this option's sub-panel is open. */
  readonly subPanelOpen = computed(() =>
    this.isBranch()
      ? this.ctx.openSubPanels().includes(this.item.id)
      : false,
  );

  /** @internal True when the selected value is in this option's sub-tree. */
  readonly isOnActivePath = computed(() => {
    const path = this.ctx.path();
    const v = this.item.value();
    return v !== undefined && path.includes(v);
  });

  ngOnDestroy(): void {
    clearTimeout(this._openTimer);
    clearTimeout(this._closeTimer);
  }

  /**
   * @internal Click handler — branch-only sub-panel toggle. Leaf clicks
   * are handled by the composed `KjListItem` (which calls
   * `KjSelectionModel.toggle` and then `KjCascadeSelect.afterSelect`).
   * In leaf-mode `KjSelectionModel` no-ops on branches when a tree
   * shape is provided, so we don't need to gate that here.
   */
  handleClick(): void {
    if (this.item.disabled()) return;
    if (!this.isBranch()) return;
    clearTimeout(this._openTimer);
    clearTimeout(this._closeTimer);
    if (this.subPanelOpen()) this.ctx.closeSubPanel(this.item.id);
    else this.ctx.openSubPanel(this.item.id);
  }

  /** @internal */
  handleMouseEnter(): void {
    if (this.item.disabled() || !this.isBranch()) return;
    clearTimeout(this._closeTimer);
    const delay = this.ctx.subPanelOpenDelayMs();
    this._openTimer = setTimeout(() => {
      this.ctx.openSubPanel(this.item.id);
    }, delay);
  }

  /** @internal */
  handleMouseLeave(): void {
    if (this.item.disabled() || !this.isBranch()) return;
    clearTimeout(this._openTimer);
    this._scheduleClose();
  }

  /**
   * @internal Called by `KjCascadeSelectSubPanel` when the cursor enters
   * the sub-panel. The option's `mouseleave` fires the moment the cursor
   * crosses out of the option's bounding box — including the case where
   * the cursor moves *into* the adjacent sub-panel. Without this bridge,
   * the close timer kept ticking and dismissed an actively-hovered
   * sub-panel after `subPanelCloseDelayMs`.
   */
  _cancelCloseTimer(): void {
    clearTimeout(this._closeTimer);
    this._closeTimer = undefined;
  }

  /**
   * @internal Called by `KjCascadeSelectSubPanel` when the cursor leaves
   * the sub-panel (to anywhere except back into the parent option).
   * Restarts the same close timer the option's own `mouseleave` would.
   */
  _scheduleClose(): void {
    const delay = this.ctx.subPanelCloseDelayMs();
    this._closeTimer = setTimeout(() => {
      if (!this.subPanelOpen()) return;
      this.ctx.closeSubPanel(this.item.id);
    }, delay);
  }
}
