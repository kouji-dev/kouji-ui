import {
  Directive,
  computed,
  inject,
} from '@angular/core';
import { KjFocusRing } from '../primitives';
import {
  KJ_COLOR_PICKER,
} from './color-picker.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';
import { KjTranslateService } from '../i18n/translate.service';

/**
 * Hue slider. Renders as a native `<input type="range">` so screen
 * readers and keyboard users get the standard `role="slider"` model
 * for free; the visual track gradient is rendered via the wrapper
 * stylesheet.
 *
 * @doc-category Core/Inputs
 * @doc
 * @doc-name color-picker
 */
@Directive({
  selector: 'input[kjColorPickerHueSlider]',
  standalone: true,
  hostDirectives: [KjFocusRing],
  host: {
    'type': 'range',
    'min': '0',
    'max': '360',
    'step': '1',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-valuetext]': 'ariaValueText()',
    '[attr.aria-disabled]': 'ctx.disabled() ? "true" : null',
    '[disabled]': 'ctx.disabled() || null',
    '[value]': 'Math.round(ctx.hue())',
    '(input)': 'onInput($event)',
  },
})
export class KjColorPickerHueSlider {
  /**
   * Accessible name of the hue slider, from the i18n catalog
   * (`colorPicker.hue`) — cust F-7: no assistive string is baked into this
   * directive's host block.
   */
  protected readonly ariaLabel = inject(KjTranslateService).translation('colorPicker.hue');

  /** @internal */
  readonly ctx = injectParent(KJ_COLOR_PICKER, { child: 'KjColorPickerHueSlider', parent: '[kjColorPicker]' });
  /** @internal */
  protected readonly Math = Math;
  /** @internal */
  readonly ariaValueText = computed(() => `Hue ${Math.round(this.ctx.hue())} degrees`);

  /** @internal */
  onInput(event: Event): void {
    const v = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(v)) this.ctx.setHue(v);
  }
}
