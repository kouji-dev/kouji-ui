import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  inject,
  input,
} from '@angular/core';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from '../primitives/overlay/tokens';
import type { KjSide, KjAlign } from '../primitives/overlay/types';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { anchoredTo, injectAnchoredPosition, pxOffset } from '../primitives/overlay/strategies/position/anchored-to';
import { KjListNavigator } from '../primitives/list';
import { KJ_LIST_FOCUS_MODE_DEFAULT } from '../primitives/list/navigator';
import { KjListPanelFocus } from '../select/list-panel-focus';
import { KJ_TREE_SELECT } from './tree-select.context';

/**
 * Tree panel container. Composes `KjOverlayPanel` for mount/position/role
 * wiring (carries `role="tree"` from the panel role provider),
 * `KjListNavigator` in roving mode for the generic Up/Down / Home/End /
 * Enter / Space / type-ahead contract over the *visible* nodes, and
 * `KjListPanelFocus` so focus moves onto the selected — else first — node
 * when the tree opens and back to the trigger when it closes. The
 * tree-specific ArrowLeft / ArrowRight keys are handled here because they
 * carry expand/collapse + parent/first-child semantics the generic
 * navigator doesn't cover.
 *
 * Escape and outside presses are routed by the shared `KjOverlayStack`,
 * like every other overlay — this panel installs no document listeners of
 * its own.
 *
 * @doc-category Core/Inputs
 */
@Component({
  selector: 'kj-tree-select-content',
  standalone: true,
  hostDirectives: [
    { directive: KjOverlayPanel, inputs: ['kjFor'] },
    KjListNavigator,
    KjListPanelFocus,
  ],
  providers: [
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'tree' as const },
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => bodyPortal() },
    { provide: KJ_OVERLAY_POSITION_STRATEGY, useFactory: () => anchoredTo() },
    // WAI-ARIA APG tree: each treeitem is the focus target (roving tabindex).
    { provide: KJ_LIST_FOCUS_MODE_DEFAULT, useValue: 'roving' as const },
  ],
  host: {
    '[attr.aria-multiselectable]':
      'ctx?.selectionMode() === "multiple" ? "true" : null',
    '(keydown)': 'onKeydown($event)',
    '(click)': '$event.stopPropagation()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<ng-content />`,
})
export class KjTreeSelectContent {
  private readonly el = inject(ElementRef<HTMLElement>);
  /** @internal */
  readonly ctx = inject(KJ_TREE_SELECT, { optional: true });
  // The composed `KjListNavigator` owns the generic Up/Down/Home/End/
  // Enter/Space/type-ahead contract and the roving DOM focus. We read its
  // `activeItem()` below to anchor ArrowLeft / ArrowRight off the
  // currently focused tree node.
  private readonly nav = inject(KjListNavigator);

  /** Preferred side of the trigger to open on, before flipping. Defaults to `'bottom'`. */
  readonly kjSide = input<KjSide>('bottom');

  /** Alignment along that side. Defaults to `'start'`. */
  readonly kjAlign = input<KjAlign>('start');

  /** Gap in px between the trigger and the panel. Defaults to `4`. */
  readonly kjOffset = input<number, unknown>(4, { transform: pxOffset(4) });

  constructor() {
    injectAnchoredPosition({
      side: this.kjSide,
      align: this.kjAlign,
      offset: this.kjOffset,
      matchTriggerWidth: 'min',
    });
  }

  /**
   * Tree-specific ArrowLeft / ArrowRight handling. Up/Down/Home/End/
   * Enter/Space/type-ahead all flow through the composed
   * `KjListNavigator` — they aren't reimplemented here.
   *
   * - ArrowRight on a collapsed branch → expand (toggle).
   * - ArrowRight on an expanded branch → move active to first child.
   * - ArrowLeft on an expanded branch → collapse (toggle).
   * - ArrowLeft elsewhere → move active to the parent (prior item with
   *   `aria-level` less than current).
   *
   * @internal
   */
  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const active = this.nav.activeItem();
    if (!active) return;
    const node = active._host();
    const items = this._domNodes();
    const idx = items.indexOf(node);
    if (idx === -1) return;
    const hasChildren = node.getAttribute('data-has-children') === 'true';
    const expanded = node.getAttribute('data-expanded') === 'true';

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (hasChildren && !expanded) {
        const toggle = node.querySelector('[kjTreeSelectToggle]') as HTMLElement | null;
        toggle?.click();
      } else if (hasChildren && expanded) {
        const next = items[idx + 1];
        if (next) this.nav.setActive(next.id);
      }
      return;
    }

    // ArrowLeft
    event.preventDefault();
    if (hasChildren && expanded) {
      const toggle = node.querySelector('[kjTreeSelectToggle]') as HTMLElement | null;
      toggle?.click();
      return;
    }
    const currentLevel = parseInt(node.getAttribute('aria-level') ?? '1', 10);
    for (let i = idx - 1; i >= 0; i--) {
      const lvl = parseInt(items[i]?.getAttribute('aria-level') ?? '1', 10);
      if (lvl < currentLevel) {
        this.nav.setActive(items[i].id);
        break;
      }
    }
  }

  /** DOM-order list of tree nodes scoped to this panel. */
  private _domNodes(): HTMLElement[] {
    return Array.from(
      this.el.nativeElement.querySelectorAll('[kjTreeSelectNode]'),
    ) as HTMLElement[];
  }
}
