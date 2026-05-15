import {
  Directive,
  ElementRef,
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
import { anchoredTo } from '../primitives/overlay/strategies/position/anchored-to';
import { KjListNavigator } from '../primitives/list';
import { KJ_CASCADE_SELECT } from './cascade-select.context';

/**
 * Root panel for a Cascade Select. Composes:
 * - `KjOverlayPanel` — mount / position / aria wiring (rendered with
 *   `role="tree"` via the panel-role provider).
 * - `KjListNavigator` (vertical + activedescendant) — generic Up/Down /
 *   Home/End / Enter / Space / type-ahead navigation across the
 *   level-0 options.
 *
 * Cascade-specific ArrowRight (open the active option's sub-panel) and
 * Escape / Tab (close everything) remain handled here because they
 * carry cascade-specific semantics the generic navigator doesn't
 * cover.
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
      inputs: ['kjOrientation', 'kjFocusMode'],
    },
  ],
  providers: [
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'tree' as const },
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => bodyPortal() },
    { provide: KJ_OVERLAY_POSITION_STRATEGY, useFactory: () => anchoredTo() },
  ],
  host: {
    'role': 'tree',
    'aria-orientation': 'horizontal',
    'aria-multiselectable': 'false',
    'tabindex': '-1',
    'kjOrientation': 'vertical',
    'kjFocusMode': 'activedescendant',
    '(keydown)': 'onKeydown($event)',
    '(click)': '$event.stopPropagation()',
  },
})
export class KjCascadeSelectPanel {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  /** @internal — root cascade-select context (sub-panel state). */
  private readonly ctx = inject(KJ_CASCADE_SELECT);
  /** @internal — generic list navigator composed via `hostDirectives`. */
  private readonly nav = inject(KjListNavigator);

  /** Anchored side relative to the trigger. */
  readonly kjSide = input<KjSide>('bottom');
  /** Cross-axis alignment relative to the trigger. */
  readonly kjAlign = input<KjAlign>('start');

  constructor() {
    const pos = inject(KJ_OVERLAY_POSITION_STRATEGY) as ReturnType<typeof anchoredTo>;
    pos.configure({ side: this.kjSide, align: this.kjAlign, matchTriggerWidth: 'min' });
  }

  /**
   * @internal Cascade-specific keys — ArrowRight opens the active
   * branch's sub-panel; Escape / Tab dismiss everything. Up/Down /
   * Home/End / Enter / Space / typeahead all flow through the composed
   * `KjListNavigator`.
   */
  onKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowRight': {
        e.preventDefault();
        const activeId = this.nav.activeId();
        if (!activeId) return;
        const optEl = this.el.nativeElement.querySelector<HTMLElement>(`#${CSS.escape(activeId)}`);
        const ownerId = optEl?.getAttribute('data-owner-option-id');
        if (ownerId) this.ctx.openSubPanel(ownerId);
        return;
      }
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        this.ctx.hide();
        this.ctx.closeAll();
        return;
      case 'Tab':
        this.ctx.hide();
        this.ctx.closeAll();
        return;
    }
  }
}
