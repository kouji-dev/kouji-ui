import { Directive, inject, input, booleanAttribute } from '@angular/core';
import { KjOverlayTrigger } from '../primitives/overlay/trigger';
import type { KjOverlayPanel } from '../primitives/overlay/panel';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from '../primitives/overlay/tokens';
import { onHover, type KjOnHoverStrategy } from '../primitives/overlay/strategies/trigger-event/on-hover';

@Directive({
  selector: '[kjTooltipTrigger]',
  exportAs: 'kjTooltipTrigger',
  standalone: true,
  hostDirectives: [
    { directive: KjOverlayTrigger, inputs: ['kjOpen'] },
  ],
  providers: [
    KjOverlayController,
    {
      provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
      useFactory: () => onHover({ openDelay: 200, closeDelay: 0 }),
    },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'tooltip' as const },
  ],
})
export class KjTooltipTrigger {
  readonly kjOpenDelay  = input<number, unknown>(200, { transform: (v) => Number(v) || 200 });
  readonly kjCloseDelay = input<number, unknown>(0,   { transform: (v) => Number(v) || 0 });
  readonly kjDisabled   = input(false, { transform: booleanAttribute });

  constructor() {
    const strat = inject(KJ_OVERLAY_TRIGGER_EVENT_STRATEGY) as KjOnHoverStrategy;
    if ('configure' in strat) {
      strat.configure({ openDelay: this.kjOpenDelay, closeDelay: this.kjCloseDelay });
    }
  }

  private readonly _overlayTrigger = inject(KjOverlayTrigger, { self: true });
  /** The controller of the composed `KjOverlayTrigger`, exposed for sibling `[kjFor]` panels. */
  get controller(): KjOverlayController {
    return this._overlayTrigger.controller;
  }
  attachPanel(panel: KjOverlayPanel): void {
    this._overlayTrigger.attachPanel(panel);
  }
}
