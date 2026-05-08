import {
  booleanAttribute,
  computed,
  contentChildren,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
} from '@angular/core';
import { KJ_CASCADE_SELECT, nextCascadeId } from './cascade-select.context';
import { KjCascadeSelectSubPanel } from './cascade-select-sub-panel';

/**
 * Single row inside a `[kjCascadeSelectPanel]` or
 * `[kjCascadeSelectSubPanel]`. When projected `[kjCascadeSelectSubPanel]`
 * content is present the option becomes a **sub-trigger** (branch node);
 * otherwise it is a **leaf** that commits a value on activation.
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
 *   <div kjCascadeSelectSubPanel [kjOwnerOptionId]="el.id">…</div>
 * </div>
 * ```
 * @category Core/Data input
 */
@Directive({
  selector: '[kjCascadeSelectOption]',
  standalone: true,
  host: {
    'role': 'treeitem',
    'tabindex': '-1',
    '[id]': '_id',
    '[attr.aria-selected]': 'selected().toString()',
    '[attr.aria-disabled]': 'kjDisabled() ? "true" : null',
    '[attr.aria-haspopup]': 'isBranch() ? "tree" : null',
    '[attr.aria-expanded]': 'isBranch() ? subPanelOpen().toString() : null',
    '[attr.data-disabled]': 'kjDisabled() ? "" : null',
    '[attr.data-label]': 'kjLabel()',
    '[attr.data-leaf]': 'isLeaf().toString()',
    '[attr.data-selected]': 'selected() ? "" : null',
    '[attr.data-active]': 'isActive() ? "" : null',
    '[attr.data-active-path]': 'isOnActivePath() ? "" : null',
    '[attr.data-owner-option-id]': 'isBranch() ? _id : null',
    '(click)': 'handleClick()',
    '(mouseenter)': 'handleMouseEnter()',
    '(mouseleave)': 'handleMouseLeave()',
  },
})
export class KjCascadeSelectOption implements OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  /** @internal */
  readonly ctx = inject(KJ_CASCADE_SELECT);

  /** The value this option represents. */
  readonly kjValue = input.required<unknown>();

  /** Display label — used by typeahead and the trigger default rendering. */
  readonly kjLabel = input<string>('');

  /** Whether this option is disabled. */
  readonly kjDisabled = input(false, { transform: booleanAttribute });

  /** @internal Stable option id (auto-minted). */
  _id = nextCascadeId('kj-cascade-opt');

  /** @internal Level index (set by parent panel or sub-panel). */
  private _levelIndex = 0;

  /**
   * @internal Sub-panel directives declared as content children. Detected
   * via `contentChildren` (which follows the declaration tree, so it works
   * for both `<div kjCascadeSelectOption>` and `<kj-cascade-option>` wrapper
   * forms). When non-empty, this option is a branch node.
   */
  private readonly subPanels = contentChildren(KjCascadeSelectSubPanel, { descendants: false });

  /** @internal Whether this option is a branch node. */
  readonly isBranch = computed(() => this.subPanels().length > 0);

  /** @internal Computed inverse of isBranch for the data-leaf attribute. */
  readonly isLeaf = computed(() => !this.isBranch());

  private _openTimer: ReturnType<typeof setTimeout> | undefined;
  private _closeTimer: ReturnType<typeof setTimeout> | undefined;

  /** @internal True when this option's sub-panel is open. */
  readonly subPanelOpen = computed(() =>
    this.isBranch()
      ? this.ctx.openSubPanels().includes(this._id)
      : false,
  );

  /** @internal True when this option is the selected leaf. */
  readonly selected = computed(
    () => this.ctx.value() === this.kjValue(),
  );

  /** @internal True when this option is the active-descendant at its level. */
  readonly isActive = computed(
    () => this.ctx.getActiveId(this._levelIndex) === this._id,
  );

  /** @internal True when the selected value is in this option's sub-tree. */
  readonly isOnActivePath = computed(() => {
    const path = this.ctx.path();
    return path.includes(this.kjValue());
  });

  constructor() {
    // Bind each declared sub-panel to this option's auto-generated id so
    // the sub-panel's `open` computed can match against the open list
    // without the consumer having to wire `kjOwnerOptionId` manually.
    effect(() => {
      const panels = this.subPanels();
      panels.forEach(p => p.setParentOptionId(this._id));
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this._openTimer);
    clearTimeout(this._closeTimer);
  }

  /** Set the level index for active-descendant and path tracking. */
  setLevelIndex(idx: number): void {
    this._levelIndex = idx;
  }

  /** @internal */
  handleClick(): void {
    if (this.kjDisabled()) return;
    clearTimeout(this._openTimer);
    clearTimeout(this._closeTimer);

    if (this.isBranch()) {
      if (this.subPanelOpen()) {
        this.ctx.closeSubPanel(this._id);
      } else {
        this.ctx.openSubPanel(this._id);
      }
    } else {
      // Build the path: prefix from context path up to our level, then our value.
      const path = [...this.ctx.path().slice(0, this._levelIndex), this.kjValue()];
      this.ctx.selectLeaf(this.kjValue(), path);
    }
  }

  /** @internal */
  handleMouseEnter(): void {
    if (this.kjDisabled() || !this.isBranch()) return;
    clearTimeout(this._closeTimer);
    const delay = this.ctx.subPanelOpenDelayMs();
    this._openTimer = setTimeout(() => {
      this.ctx.openSubPanel(this._id);
    }, delay);
  }

  /** @internal */
  handleMouseLeave(): void {
    if (this.kjDisabled() || !this.isBranch()) return;
    clearTimeout(this._openTimer);
    const delay = this.ctx.subPanelCloseDelayMs();
    this._closeTimer = setTimeout(() => {
      if (!this.subPanelOpen()) return;
      this.ctx.closeSubPanel(this._id);
    }, delay);
  }
}
