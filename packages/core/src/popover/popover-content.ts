import { Component, ChangeDetectionStrategy, ViewEncapsulation, booleanAttribute, inject, input } from '@angular/core';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
  KJ_OVERLAY_FOCUS_TRAP_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from '../primitives/overlay/tokens';
import type { KjSide, KjAlign } from '../primitives/overlay/types';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { anchoredTo } from '../primitives/overlay/strategies/position/anchored-to';
import { tabCycle } from '../primitives/overlay/strategies/focus-trap/tab-cycle';

@Component({
  selector: 'kj-popover-content',
  standalone: true,
  hostDirectives: [{ directive: KjOverlayPanel, inputs: ['kjFor'] }],
  providers: [
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'dialog' as const },
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => bodyPortal() },
    { provide: KJ_OVERLAY_POSITION_STRATEGY, useFactory: () => anchoredTo() },
    { provide: KJ_OVERLAY_FOCUS_TRAP_STRATEGY, useFactory: () => tabCycle({ returnFocus: true }) },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-popover-content' },
  template: `<ng-content />`,
})
export class KjPopoverContent {
  readonly kjSide   = input<KjSide>('bottom');
  readonly kjAlign  = input<KjAlign>('center');
  readonly kjOffset = input<number, unknown>(8, { transform: (v) => Number(v) || 8 });
  readonly kjTrap   = input(false, { transform: booleanAttribute });

  constructor() {
    const pos = inject(KJ_OVERLAY_POSITION_STRATEGY) as ReturnType<typeof anchoredTo>;
    pos.configure({ side: this.kjSide, align: this.kjAlign, offset: this.kjOffset });
    const trap = inject(KJ_OVERLAY_FOCUS_TRAP_STRATEGY) as ReturnType<typeof tabCycle>;
    trap.configure({ enabled: () => this.kjTrap() });
  }
}
