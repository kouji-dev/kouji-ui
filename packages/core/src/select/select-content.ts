import {
  ChangeDetectionStrategy,
  Component,
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
import { anchoredTo } from '../primitives/overlay/strategies/position/anchored-to';
import { KjListNavigator, injectSelectionModel } from '../primitives/list';

/**
 * Listbox panel for `KjSelect`. Composes `KjOverlayPanel` for
 * mount/position/role wiring and `KjListNavigator` for the WAI-ARIA APG
 * listbox keyboard + active-descendant contract. Reflects
 * `KjSelectionModel.mode()` as `aria-multiselectable`.
 *
 * @doc-category Core/Inputs
 */
@Component({
  selector: 'kj-select-content',
  standalone: true,
  hostDirectives: [
    { directive: KjOverlayPanel, inputs: ['kjFor'] },
    KjListNavigator,
  ],
  providers: [
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'listbox' as const },
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => bodyPortal() },
    { provide: KJ_OVERLAY_POSITION_STRATEGY, useFactory: () => anchoredTo() },
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
  readonly kjOffset = input<number, unknown>(4, {
    transform: v => Number(v) || 4,
  });

  constructor() {
    const pos = inject(KJ_OVERLAY_POSITION_STRATEGY) as ReturnType<typeof anchoredTo>;
    pos.configure({
      side: this.kjSide,
      align: this.kjAlign,
      offset: this.kjOffset,
      matchTriggerWidth: 'min',
    });
  }
}
