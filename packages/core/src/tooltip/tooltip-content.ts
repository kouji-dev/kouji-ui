// tooltip-content.ts
import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from '../primitives/overlay/tokens';
import type { KjSide, KjAlign } from '../primitives/overlay/types';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { anchoredTo, injectAnchoredPosition, pxOffset } from '../primitives/overlay/strategies/position/anchored-to';

/**
 * The tooltip panel. Portals to the overlay container, anchors to its
 * trigger and takes `role="tooltip"`, so a `[kjTooltipTrigger]` can point its
 * `aria-describedby` at it. Pair the two through `[kjFor]`.
 *
 * Not focusable and never focus-trapped: per the WAI-ARIA APG a tooltip is a
 * description of the trigger, not a place the keyboard travels to.
 */
@Component({
  selector: 'kj-tooltip-content',
  standalone: true,
  hostDirectives: [
    { directive: KjOverlayPanel, inputs: ['kjFor'] },
  ],
  providers: [
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'tooltip' as const },
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => bodyPortal() },
    { provide: KJ_OVERLAY_POSITION_STRATEGY, useFactory: () => anchoredTo() },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-tooltip-content' },
  template: `<ng-content />`,
})
export class KjTooltipContent {
  /** Preferred side of the trigger to open on, before flipping. Defaults to `'top'`. */
  readonly kjSide   = input<KjSide>('top');

  /** Alignment along that side. Defaults to `'center'`. */
  readonly kjAlign  = input<KjAlign>('center');
  /** Gap in px between the trigger and the panel. `0` sits flush against the trigger. */
  readonly kjOffset = input<number, unknown>(8, { transform: pxOffset(8) });

  constructor() {
    injectAnchoredPosition({ side: this.kjSide, align: this.kjAlign, offset: this.kjOffset });
  }
}
