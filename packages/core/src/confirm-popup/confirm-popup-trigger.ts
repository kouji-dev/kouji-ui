import { Directive, inject } from '@angular/core';
import { KjPopoverTrigger } from '../popover/popover-trigger';
import { KJ_CONFIRM_POPUP } from './confirm-popup.context';
import { KjOverlayTrigger } from '../primitives/overlay/trigger';
import type { KjOverlayPanel } from '../primitives/overlay/panel';
import type { KjOverlayController } from '../primitives/overlay/controller';

/**
 * The button that toggles the confirm popup. Composes `KjPopoverTrigger` via
 * `hostDirectives` for the trigger contract — `aria-haspopup`,
 * `aria-expanded`, `aria-controls`, click toggling.
 *
 * @doc-category Core/Overlay
 */
@Directive({
  selector: '[kjConfirmPopupTrigger]',
  standalone: true,
  exportAs: 'kjConfirmPopupTrigger',
  hostDirectives: [KjPopoverTrigger],
})
export class KjConfirmPopupTrigger {
  private readonly _overlayTrigger = inject(KjOverlayTrigger, { self: true });

  constructor() {
    // The trigger normally sits on a CHILD of `[kjConfirmPopup]`, so the root
    // cannot see this controller through its own injector. Hand it over, or
    // the confirm/cancel slots resolve nothing.
    inject(KJ_CONFIRM_POPUP, { optional: true })?._registerController?.(
      this._overlayTrigger.controller,
    );
  }

  /** Forwarded controller for sibling `[kjFor]` panels. */
  get controller(): KjOverlayController {
    return this._overlayTrigger.controller;
  }

  attachPanel(panel: KjOverlayPanel): void {
    this._overlayTrigger.attachPanel(panel);
  }
}
