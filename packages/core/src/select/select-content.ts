import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
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
import { KjListNavigator, injectSelectionModel } from '../primitives/list';
import { KJ_LIST_FOCUS_MODE_DEFAULT } from '../primitives/list/navigator';
import { KjListPanelFocus } from './list-panel-focus';

/**
 * Listbox panel for `KjSelect`. Composes `KjOverlayPanel` for
 * mount/position/role wiring, `KjListNavigator` (roving focus) for the
 * WAI-ARIA APG listbox keyboard contract, and `KjListPanelFocus` so focus
 * moves onto the selected — else first — option when the listbox opens and
 * back to the trigger when it closes. Reflects `KjSelectionModel.mode()` as
 * `aria-multiselectable`.
 *
 * @doc-category Core/Inputs
 */
@Component({
  selector: 'kj-select-content',
  standalone: true,
  hostDirectives: [
    { directive: KjOverlayPanel, inputs: ['kjFor'] },
    KjListNavigator,
    KjListPanelFocus,
  ],
  providers: [
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'listbox' as const },
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => bodyPortal() },
    { provide: KJ_OVERLAY_POSITION_STRATEGY, useFactory: () => anchoredTo() },
    // Options are the focus targets (roving tabindex): a focused option is
    // what screen readers announce, so no `aria-activedescendant` is needed
    // on a panel that never holds focus itself.
    { provide: KJ_LIST_FOCUS_MODE_DEFAULT, useValue: 'roving' as const },
  ],
  host: {
    '[attr.aria-multiselectable]':
      'selection.mode() === "multi" ? "true" : null',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<ng-content />`,
})
export class KjSelectContent {
  /** @internal — for the aria-multiselectable host binding. */
  protected readonly selection = injectSelectionModel<unknown>();

  /** Which side of the trigger to anchor on. */
  readonly kjSide = input<KjSide>('bottom');
  /** Alignment along the chosen side. */
  readonly kjAlign = input<KjAlign>('start');
  /** Pixel offset between trigger and panel. */
  readonly kjOffset = input<number, unknown>(4, { transform: pxOffset(4) });

  constructor() {
    injectAnchoredPosition({
      side: this.kjSide,
      align: this.kjAlign,
      offset: this.kjOffset,
      matchTriggerWidth: 'min',
    });
  }
}
