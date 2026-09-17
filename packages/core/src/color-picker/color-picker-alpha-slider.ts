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
 * Optional alpha slider. Mounts only when `KjColorPicker.kjShowAlpha`
 * is true; otherwise the wrapper hides it. Like the hue slider it
 * delegates to a native range input for AT support.
 *
 * @doc-category Core/Inputs
 * @doc
 * @doc-name color-picker
 */
@Directive({
  selector: 'input[kjColorPickerAlphaSlider]',
  standalone: true,
  hostDirectives: [KjFocusRing],
  host: {
    'type': 'range',
    'min': '0',
    'max': '100',
    'step': '1',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-valuetext]': 'ariaValueText()',
    '[attr.aria-disabled]': 'ctx.disabled() ? "true" : null',
    '[disabled]': 'ctx.disabled() || !ctx.showAlpha() || null',
    '[value]': 'Math.round(ctx.alpha() * 100)',
    '(input)': 'onInput($event)',
  },
})
export class KjColorPickerAlphaSlider {
  /**
   * Accessible name of the alpha slider, from the i18n catalog
   * (`colorPicker.alpha`) — cust F-7: no assistive string is baked into this
   * directive's host block.
   */
  protected readonly ariaLabel = inject(KjTranslateService).translation('colorPicker.alpha');

  /** @internal */
  readonly ctx = injectParent(KJ_COLOR_PICKER, { child: 'KjColorPickerAlphaSlider', parent: '[kjColorPicker]' });
  /** @internal */
  protected readonly Math = Math;
  /** @internal */
  readonly ariaValueText = computed(() =>
    `Opacity ${Math.round(this.ctx.alpha() * 100)} percent`);

  /** @internal */
  onInput(event: Event): void {
    const pct = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(pct)) this.ctx.setAlpha(pct / 100);
  }
}
