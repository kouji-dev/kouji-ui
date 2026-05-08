import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  inject,
  input,
} from '@angular/core';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
} from '../primitives/overlay/tokens';
import type { KjSide, KjAlign } from '../primitives/overlay/types';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { inPlace } from '../primitives/overlay/strategies/mount/in-place';
import { anchoredTo } from '../primitives/overlay/strategies/position/anchored-to';
import { pointAt } from '../primitives/overlay/strategies/position/point-at';
import { inPlaceSibling } from '../primitives/overlay/strategies/position/in-place-sibling';
import { KjRovingTabindex } from '../a11y/roving-tabindex';
import { KjDropdownMenuTrigger } from './dropdown-menu-trigger';

/**
 * The dropdown-menu content panel. Composes `KjOverlayPanel` and dispatches
 * mount + position strategies based on `kjMount`:
 *
 * - `'portal'` (default) — `bodyPortal()` + `anchoredTo(trigger, side, align)`
 * - `'point'`            — `bodyPortal()` + `pointAt({x, y})` (right-click / context-menu)
 * - `'inline'`           — `inPlace()`    + `inPlaceSibling()`
 *
 * Sets `role="menu"` via the panel role token (provided by the trigger).
 *
 * @category Core/Actions
 */
@Component({
  selector: 'kj-dropdown-menu-content',
  standalone: true,
  hostDirectives: [
    { directive: KjOverlayPanel, inputs: ['kjFor'] },
    { directive: KjRovingTabindex, inputs: ['kjRovingOrientation'] },
  ],
  providers: [
    {
      provide: KJ_OVERLAY_MOUNT_STRATEGY,
      useFactory: () => {
        const cmp = inject(KjDropdownMenuContent, { self: true });
        return cmp.kjMount() === 'inline' ? inPlace() : bodyPortal();
      },
    },
    {
      provide: KJ_OVERLAY_POSITION_STRATEGY,
      useFactory: () => {
        const ctrl = inject(KjOverlayController);
        const cmp = inject(KjDropdownMenuContent, { self: true });
        const trigDir = inject(KjDropdownMenuTrigger, { optional: true });
        if (cmp.kjMount() === 'inline') return inPlaceSibling();
        if (cmp.kjMount() === 'point' && trigDir) {
          return pointAt({ x: trigDir.kjPointX, y: trigDir.kjPointY });
        }
        return anchoredTo({
          trigger: ctrl.triggerEl,
          side: cmp.kjSide,
          align: cmp.kjAlign,
        });
      },
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<ng-content />`,
})
export class KjDropdownMenuContent {
  readonly kjSide  = input<KjSide>('bottom');
  readonly kjAlign = input<KjAlign>('start');
  readonly kjMount = input<'portal' | 'point' | 'inline'>('portal');
}
