import { Directive } from '@angular/core';
import { KjPopoverTrigger } from '../popover/popover-trigger';

/**
 * The button that toggles the confirm popup. Composes `KjPopoverTrigger` via
 * `hostDirectives` for the trigger contract — `aria-haspopup`,
 * `aria-expanded`, `aria-controls`, click toggling.
 *
 * **Note (overlay primitives migration):** The previous wrapper forwarded a
 * rich set of inputs (`kjConfirmPopupTriggerFor`, side/align/offset, etc.).
 * These have been simplified — bind any popover inputs you need on the
 * underlying `[kjPopoverTrigger]` host element directly.
 *
 * @category Core/Actions
 */
@Directive({
  selector: '[kjConfirmPopupTrigger]',
  standalone: true,
  exportAs: 'kjConfirmPopupTrigger',
  hostDirectives: [KjPopoverTrigger],
})
export class KjConfirmPopupTrigger {}
