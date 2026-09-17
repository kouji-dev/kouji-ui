import {
  Directive,
  computed,
  inject,
} from '@angular/core';
import { KjFocusRing } from '../primitives';
import { KjOverlayTrigger } from '../primitives/overlay/trigger';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import {
  KJ_COLOR_PICKER,
} from './color-picker.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';
import { KjColorPicker } from './color-picker-root';
import { KjTranslateService } from '../i18n/translate.service';

// ────────────────────────────────────────────────────────────────────
// Sub-directives
// ────────────────────────────────────────────────────────────────────

/**
 * Trigger button that opens the color-picker panel and renders the
 * current color as its background. Composes `KjOverlayTrigger` for the
 * shared overlay state machine; the click strategy and panel role are
 * provided by the root `KjColorPicker` so the trigger and panel share
 * the same controller instance. `aria-haspopup="dialog"`, `aria-expanded`
 * and `aria-controls` are wired by the overlay primitive.
 *
 * @doc-category Core/Inputs
 * @doc
 * @doc-name color-picker
 */
@Directive({
  selector: '[kjColorPickerTrigger]',
  standalone: true,
  hostDirectives: [
    KjFocusRing,
    { directive: KjOverlayTrigger, inputs: ['kjOpen'] },
  ],
  host: {
    'type': 'button',
    '[id]': 'ctx.triggerId()',
    '[attr.aria-haspopup]': '"dialog"',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-disabled]': 'ctx.disabled() ? "true" : null',
    '[attr.data-disabled]': 'ctx.disabled() ? "" : null',
    '[style.--kj-color-picker-current]': 'ctx.hex()',
  },
})
export class KjColorPickerTrigger {
  /** @internal */
  readonly ctx = injectParent(KJ_COLOR_PICKER, { child: 'KjColorPickerTrigger', parent: '[kjColorPicker]' });
  private readonly root = inject(KjColorPicker);
  private readonly i18n = inject(KjTranslateService);

  /**
   * Accessible name of the trigger swatch: `kjAriaLabel` when the consumer
   * supplies one, else the i18n catalog's `colorPicker.trigger`, which
   * interpolates the current value (cust F-7 — the English sentence used to be
   * a template literal no catalog could reach).
   */
  readonly ariaLabel = computed(
    () =>
      this.root.kjAriaLabel() ||
      this.i18n.translate('colorPicker.trigger', { value: this.ctx.hex() }),
  );

  private readonly _overlayTrigger = inject(KjOverlayTrigger, { self: true });
  /** The controller of the composed `KjOverlayTrigger`, exposed for sibling `[kjFor]` panels. */
  get controller() {
    return this._overlayTrigger.controller;
  }
  attachPanel(panel: KjOverlayPanel): void {
    this._overlayTrigger.attachPanel(panel);
  }
}
