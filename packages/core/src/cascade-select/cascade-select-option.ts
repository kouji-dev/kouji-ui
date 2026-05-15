import {
  booleanAttribute,
  computed,
  Directive,
  inject,
  input,
  OnDestroy,
  signal,
} from '@angular/core';
import { KjListItem, injectListItem } from '../primitives/list';
import { KJ_CASCADE_SELECT } from './cascade-select.context';

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
 * <div kjCascadeSelectOption [kjOptionValue]="'sf'" kjOptionLabel="San Francisco" />
 * ```
 *
 * @example Branch
 * ```html
 * <div kjCascadeSelectOption [kjOptionValue]="'us'" kjOptionLabel="USA">
 *   <div kjCascadeSelectSubPanel>…</div>
 * </div>
 * ```
 * @doc-category Core/Data input
 * @doc
 * @doc-name cascade-select
 */
@Directive({
  selector: '[kjCascadeSelectOption]',
  standalone: true,
  hostDirectives: [
    {
      directive: KjListItem,
      inputs: [
        'kjItemValue:kjOptionValue',
        'kjItemLabel:kjOptionLabel',
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
   * The value this option represents. Forwarded to the composed
   * `KjListItem.kjItemValue`.
   */
  readonly kjOptionValue = input.required<unknown>({ alias: 'kjOptionValue' });

  /**
   * Display label — used by typeahead and the trigger default rendering.
   * Forwarded to the composed `KjListItem.kjItemLabel`.
   */
  readonly kjOptionLabel = input<string>('', { alias: 'kjOptionLabel' });

  /** Whether this option is disabled. */
  readonly kjDisabled = input(false, { transform: booleanAttribute });

  /**
   * @internal Number of `KjCascadeSelectSubPanel` directives declared
   * inside this option. Incremented by each sub-panel's constructor
   * (which injects this directive via the element injector). When
   * non-zero, this option is a branch.
   */
  private readonly _subPanelCount = signal(0);

  /** @internal — called by `KjCascadeSelectSubPanel` from its constructor. */
  _registerSubPanel(): void {
    this._subPanelCount.update(n => n + 1);
  }

  /** @internal Whether this option is a branch node. */
  readonly isBranch = computed(() => this._subPanelCount() > 0);

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
    return path.includes(this.kjOptionValue());
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
    if (this.kjDisabled()) return;
    if (!this.isBranch()) return;
    clearTimeout(this._openTimer);
    clearTimeout(this._closeTimer);
    if (this.subPanelOpen()) this.ctx.closeSubPanel(this.item.id);
    else this.ctx.openSubPanel(this.item.id);
  }

  /** @internal */
  handleMouseEnter(): void {
    if (this.kjDisabled() || !this.isBranch()) return;
    clearTimeout(this._closeTimer);
    const delay = this.ctx.subPanelOpenDelayMs();
    this._openTimer = setTimeout(() => {
      this.ctx.openSubPanel(this.item.id);
    }, delay);
  }

  /** @internal */
  handleMouseLeave(): void {
    if (this.kjDisabled() || !this.isBranch()) return;
    clearTimeout(this._openTimer);
    const delay = this.ctx.subPanelCloseDelayMs();
    this._closeTimer = setTimeout(() => {
      if (!this.subPanelOpen()) return;
      this.ctx.closeSubPanel(this.item.id);
    }, delay);
  }
}
