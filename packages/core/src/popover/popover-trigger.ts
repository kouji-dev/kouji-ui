import { Directive, booleanAttribute, inject, input } from '@angular/core';
import { KjOverlayTrigger } from '../primitives/overlay/trigger';
import type { KjOverlayPanel } from '../primitives/overlay/panel';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from '../primitives/overlay/tokens';
import { onClick } from '../primitives/overlay/strategies/trigger-event/on-click';

export type KjPopoverTriggerKind = 'click' | 'hover';

@Directive({
  selector: '[kjPopoverTrigger]',
  exportAs: 'kjPopoverTrigger',
  standalone: true,
  hostDirectives: [{ directive: KjOverlayTrigger, inputs: ['kjOpen'] }],
  providers: [
    KjOverlayController,
    // For an MVP we resolve at construction; reactive switch is a follow-up.
    {
      provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
      useFactory: () => onClick(),
    },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'dialog' as const },
  ],
})
export class KjPopoverTrigger {
  readonly kjTrigger = input<KjPopoverTriggerKind>('click');
  readonly kjDisabled = input(false, { transform: booleanAttribute });

  private readonly _overlayTrigger = inject(KjOverlayTrigger, { self: true });
  /** The controller of the composed `KjOverlayTrigger`, exposed for sibling `[kjFor]` panels. */
  get controller(): KjOverlayController {
    return this._overlayTrigger.controller;
  }
  attachPanel(panel: KjOverlayPanel): void {
    this._overlayTrigger.attachPanel(panel);
  }
}
