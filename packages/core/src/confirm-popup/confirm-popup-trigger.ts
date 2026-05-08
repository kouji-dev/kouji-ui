import { Directive, inject } from '@angular/core';
import { KjPopoverTrigger } from '../popover/popover-trigger';
import { KjOverlayTrigger } from '../primitives/overlay/trigger';
import type { KjOverlayPanel } from '../primitives/overlay/panel';
import type { KjOverlayController } from '../primitives/overlay/controller';

/**
 * The button that toggles the confirm popup. Composes `KjPopoverTrigger` via
 * `hostDirectives` for the trigger contract — `aria-haspopup`,
 * `aria-expanded`, `aria-controls`, click toggling.
 *
 * @category Core/Overlay
 */
@Directive({
  selector: '[kjConfirmPopupTrigger]',
  standalone: true,
  exportAs: 'kjConfirmPopupTrigger',
  hostDirectives: [KjPopoverTrigger],
})
export class KjConfirmPopupTrigger {
  private readonly _overlayTrigger = inject(KjOverlayTrigger, { self: true });

  /** Forwarded controller for sibling `[kjFor]` panels. */
  get controller(): KjOverlayController {
    return this._overlayTrigger.controller;
  }

  attachPanel(panel: KjOverlayPanel): void {
    this._overlayTrigger.attachPanel(panel);
  }
}
