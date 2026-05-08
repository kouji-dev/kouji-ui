import { Component, ChangeDetectionStrategy, ViewEncapsulation, booleanAttribute, inject, input } from '@angular/core';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
  KJ_OVERLAY_FOCUS_TRAP_STRATEGY,
} from '../primitives/overlay/tokens';
import type { KjSide, KjAlign } from '../primitives/overlay/types';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { anchoredTo } from '../primitives/overlay/strategies/position/anchored-to';
import { tabCycle } from '../primitives/overlay/strategies/focus-trap/tab-cycle';
import { noTrap } from '../primitives/overlay/strategies/focus-trap/no-trap';

@Component({
  selector: 'kj-popover-content',
  standalone: true,
  hostDirectives: [{ directive: KjOverlayPanel, inputs: ['kjFor'] }],
  providers: [
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => bodyPortal() },
    {
      provide: KJ_OVERLAY_POSITION_STRATEGY,
      useFactory: () => {
        const cmp = inject(KjPopoverContent, { self: true });
        return anchoredTo({
          side: cmp.kjSide,
          align: cmp.kjAlign,
          offset: cmp.kjOffset,
        });
      },
    },
    {
      provide: KJ_OVERLAY_FOCUS_TRAP_STRATEGY,
      useFactory: () => {
        const cmp = inject(KjPopoverContent, { self: true });
        return cmp.kjTrap() ? tabCycle({ returnFocus: true }) : noTrap();
      },
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<ng-content />`,
})
export class KjPopoverContent {
  readonly kjSide   = input<KjSide>('bottom');
  readonly kjAlign  = input<KjAlign>('center');
  readonly kjOffset = input<number, unknown>(8, { transform: (v) => Number(v) || 8 });
  readonly kjTrap   = input(false, { transform: booleanAttribute });
}
