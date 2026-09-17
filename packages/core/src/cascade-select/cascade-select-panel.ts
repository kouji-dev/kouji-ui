import {
  Directive,
  inject,
  input,
} from '@angular/core';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from '../primitives/overlay/tokens';
import type { KjAlign, KjSide } from '../primitives/overlay/types';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { anchoredTo, injectAnchoredPosition } from '../primitives/overlay/strategies/position/anchored-to';
import { KjListNavigator } from '../primitives/list';
import {
  KJ_LIST_FOCUS_MODE_DEFAULT,
  KJ_LIST_NAVIGATOR_ITEMS,
} from '../primitives/list/navigator';
import { KjListPanelFocus } from '../select/list-panel-focus';
import { KjCascadeSelect } from './cascade-select-root';

/**
 * Root panel for a Cascade Select. Composes:
 * - `KjOverlayPanel` — mount / position / aria wiring (rendered with
 *   `role="tree"` via the panel-role provider).
 * - `KjListNavigator` (vertical, roving focus) — generic Up/Down /
 *   Home/End / Enter / Space navigation across the level-0 options only.
 * - `KjListPanelFocus` — focus moves onto the level-0 option on the
 *   selected path (else the first option) when the panel opens, and back
 *   to the trigger when it closes.
 *
 * Cascade-specific ArrowRight (open the active option's sub-panel and
 * focus its first option) and Escape / Tab (close everything) remain
 * handled here because they carry cascade-specific semantics the generic
 * navigator doesn't cover.
 *
 * @doc-category Core/Data input
 * @doc
 * @doc-name cascade-select
 */
@Directive({
  selector: '[kjCascadeSelectPanel]',
  exportAs: 'kjCascadeSelectPanel',
  standalone: true,
  hostDirectives: [
    { directive: KjOverlayPanel, inputs: ['kjFor'] },
    {
      directive: KjListNavigator,
      inputs: ['kjOrientation'],
    },
    KjListPanelFocus,
  ],
  providers: [
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'tree' as const },
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => bodyPortal() },
    { provide: KJ_OVERLAY_POSITION_STRATEGY, useFactory: () => anchoredTo() },
    // Options are the focus targets (APG tree: roving tabindex).
    { provide: KJ_LIST_FOCUS_MODE_DEFAULT, useValue: 'roving' as const },
    // The root config's `items` spans every level; this navigator walks
    // only the level-0 options.
    {
      provide: KJ_LIST_NAVIGATOR_ITEMS,
      useFactory: () => inject(KjCascadeSelect).itemsAtLevel(null),
    },
  ],
  host: {
    'role': 'tree',
    'aria-orientation': 'horizontal',
    'aria-multiselectable': 'false',
    'tabindex': '-1',
    '(keydown)': 'onKeydown($event)',
    '(click)': '$event.stopPropagation()',
  },
})
export class KjCascadeSelectPanel {
  /** @internal — root directive (typed). Owns sub-panel state + option lookup. */
  private readonly root = inject(KjCascadeSelect);
  /** @internal — generic list navigator composed via `hostDirectives`. */
  private readonly nav = inject(KjListNavigator);

  /** Anchored side relative to the trigger. */
  readonly kjSide = input<KjSide>('bottom');
  /** Cross-axis alignment relative to the trigger. */
  readonly kjAlign = input<KjAlign>('start');

  constructor() {
    injectAnchoredPosition({ side: this.kjSide, align: this.kjAlign, matchTriggerWidth: 'min' });
  }

  /**
   * @internal Cascade-specific keys — ArrowRight opens the active
   * branch's sub-panel and focuses its first option; Escape / Tab
   * dismiss everything (focus returns to the trigger through
   * `KjListPanelFocus`). Up/Down / Home/End / Enter / Space all flow
   * through the composed `KjListNavigator`.
   */
  onKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowRight': {
        e.preventDefault();
        const activeId = this.nav.activeId();
        if (!activeId) return;
        const option = this.root.findOption(activeId);
        if (!option?.isBranch()) return;
        this.root.openSubPanel(option.item.id);
        option.subPanel()?._focusFirst();
        return;
      }
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        this.root.hide();
        this.root.closeAll();
        return;
      case 'Tab':
        this.root.hide();
        this.root.closeAll();
        return;
    }
  }
}
