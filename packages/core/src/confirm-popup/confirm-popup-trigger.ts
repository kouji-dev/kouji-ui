import { Directive } from '@angular/core';
import { KjPopoverTrigger } from '../popover/popover-trigger';

/**
 * The button that toggles the confirm popup. Composes `KjPopoverTrigger` via
 * `hostDirectives` for the trigger contract — `aria-haspopup="dialog"`
 * (per APG, `aria-haspopup` has no `"alertdialog"` value), `aria-expanded`,
 * `aria-controls`, click / Enter / Space toggling, and trigger-element
 * capture for focus restoration.
 *
 * Two ergonomic shapes — both backed by the underlying popover trigger:
 *
 * 1. **Compound** — child of a `[kjConfirmPopup]` wrapper that owns the state.
 * 2. **Trigger-for** — flat shape via `[kjConfirmPopupTriggerFor]` pointing at
 *    an `<ng-template>` containing the panel.
 *
 * Place on the natural action button (typically the destructive one) — the
 * popup anchors to *this* element, so positioning hugs the trigger.
 *
 * @category Core/Actions
 */
@Directive({
  selector: '[kjConfirmPopupTrigger], [kjConfirmPopupTriggerFor]',
  standalone: true,
  exportAs: 'kjConfirmPopupTrigger',
  hostDirectives: [
    {
      directive: KjPopoverTrigger,
      inputs: [
        'kjPopoverTriggerFor: kjConfirmPopupTriggerFor',
        'kjPopoverDisabled: kjConfirmPopupDisabled',
        'kjPopoverSide',
        'kjPopoverAlign',
        'kjPopoverOffset',
        'kjOpen',
      ],
      outputs: [
        'kjOpenChange',
      ],
    },
  ],
})
export class KjConfirmPopupTrigger {}
