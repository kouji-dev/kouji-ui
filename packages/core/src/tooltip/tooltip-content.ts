// tooltip-content.ts
import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, input } from '@angular/core';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
} from '../primitives/overlay/tokens';
import type { KjSide, KjAlign } from '../primitives/overlay/types';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { anchoredTo } from '../primitives/overlay/strategies/position/anchored-to';

@Component({
  selector: 'kj-tooltip-content',
  standalone: true,
  hostDirectives: [
    { directive: KjOverlayPanel, inputs: ['kjFor'] },
  ],
  providers: [
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => bodyPortal() },
    {
      provide: KJ_OVERLAY_POSITION_STRATEGY,
      useFactory: () => {
        const ctrl = inject(KjOverlayController);
        const cmp = inject(KjTooltipContent, { self: true });
        return anchoredTo({
          trigger: ctrl.triggerEl,
          side: cmp.kjSide,
          align: cmp.kjAlign,
          offset: cmp.kjOffset,
        });
      },
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<ng-content />`,
})
export class KjTooltipContent {
  readonly kjSide   = input<KjSide>('top');
  readonly kjAlign  = input<KjAlign>('center');
  readonly kjOffset = input<number, unknown>(8, { transform: (v) => Number(v) || 8 });
}
