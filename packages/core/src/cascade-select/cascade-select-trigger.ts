import { Directive, inject } from '@angular/core';
import { KjOverlayTrigger } from '../primitives/overlay/trigger';
import type { KjOverlayPanel } from '../primitives/overlay/panel';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from '../primitives/overlay/tokens';
import { onClick } from '../primitives/overlay/strategies/trigger-event/on-click';

/**
 * Trigger button for the Cascade Select root panel. Opens the panel on click
 * and exposes ARIA attributes (`aria-haspopup="listbox"`, `aria-expanded`,
 * `aria-controls`) via the composed `KjOverlayTrigger` host directive.
 *
 * @example
 * ```html
 * <button kjCascadeSelectTrigger #t="kjCascadeSelectTrigger">Pick a city</button>
 * <div kjCascadeSelectPanel [kjFor]="t">…</div>
 * ```
 * @category Core/Data input
 */
@Directive({
  selector: '[kjCascadeSelectTrigger]',
  exportAs: 'kjCascadeSelectTrigger',
  standalone: true,
  hostDirectives: [
    { directive: KjOverlayTrigger, inputs: ['kjOpen'] },
  ],
  providers: [
    KjOverlayController,
    { provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY, useFactory: () => onClick() },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'listbox' as const },
  ],
})
export class KjCascadeSelectTrigger {
  private readonly _overlayTrigger = inject(KjOverlayTrigger, { self: true });
  /** The controller of the composed `KjOverlayTrigger`, exposed for sibling `[kjFor]` panels. */
  get controller(): KjOverlayController {
    return this._overlayTrigger.controller;
  }
  attachPanel(panel: KjOverlayPanel): void {
    this._overlayTrigger.attachPanel(panel);
  }
}
