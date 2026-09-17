import {
  Directive,
  ElementRef,
  computed,
  inject,
} from '@angular/core';
import { KjFocusRing } from '../primitives';
import {
  KJ_COLOR_PICKER,
} from './color-picker.context';
import {
  kjClamp,
} from './color-picker.utils';
import { injectParent } from '../primitives/diagnostics/inject-parent';
import { KjTranslateService } from '../i18n/translate.service';

/**
 * Two-axis saturation/value rectangle. Pointer drag updates both axes;
 * arrow keys step ±1% (Shift = ±10%). Single `role="slider"` per the
 * APG color-picker pattern; full state announced via `aria-valuetext`.
 *
 * @doc-category Core/Inputs
 * @doc
 * @doc-name color-picker
 */
@Directive({
  selector: '[kjColorPickerArea]',
  standalone: true,
  hostDirectives: [KjFocusRing],
  host: {
    'role': 'slider',
    'tabindex': '0',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-orientation]': '"horizontal"',
    '[attr.aria-valuemin]': '0',
    '[attr.aria-valuemax]': '100',
    '[attr.aria-valuenow]': 'ariaValueNow()',
    '[attr.aria-valuetext]': 'ariaValueText()',
    '[attr.aria-disabled]': 'ctx.disabled() ? "true" : null',
    '[style.--kj-color-picker-hue]': 'ctx.hue()',
    '[style.--kj-color-picker-x]': 'ctx.saturation()',
    '[style.--kj-color-picker-y]': 'ctx.value()',
    '(pointerdown)': 'onPointerDown($event)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class KjColorPickerArea {
  /**
   * Accessible name of the saturation/value area, from the i18n catalog
   * (`colorPicker.area`) — cust F-7: no assistive string is baked into this
   * directive's host block.
   */
  protected readonly ariaLabel = inject(KjTranslateService).translation('colorPicker.area');

  /** @internal */
  readonly ctx = injectParent(KJ_COLOR_PICKER, { child: 'KjColorPickerArea', parent: '[kjColorPicker]' });
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /** @internal */
  readonly ariaValueNow = computed(() => Math.round(this.ctx.saturation() * 100));
  /** @internal */
  readonly ariaValueText = computed(() => {
    const s = Math.round(this.ctx.saturation() * 100);
    const v = Math.round(this.ctx.value() * 100);
    const h = Math.round(this.ctx.hue());
    return `Saturation ${s} percent, value ${v} percent, hue ${h} degrees`;
  });

  /** @internal */
  onPointerDown(event: PointerEvent): void {
    if (this.ctx.disabled()) return;
    const target = this.el.nativeElement;
    target.setPointerCapture?.(event.pointerId);
    this.update(event);
    const move = (e: PointerEvent) => this.update(e);
    const up = (e: PointerEvent) => {
      target.releasePointerCapture?.(e.pointerId);
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      target.removeEventListener('pointercancel', up);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', up);
  }

  private update(event: PointerEvent): void {
    const rect = this.el.nativeElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = kjClamp((event.clientX - rect.left) / rect.width, 0, 1);
    // Visual y=0 is value=1 (top of rectangle = brightest).
    const y = 1 - kjClamp((event.clientY - rect.top) / rect.height, 0, 1);
    this.ctx.setSaturationValue(x, y);
  }

  /** @internal */
  onKeydown(event: Event): void {
    if (this.ctx.disabled()) return;
    const ke = event as KeyboardEvent;
    const step = ke.shiftKey ? 0.1 : 0.01;
    let s = this.ctx.saturation();
    let v = this.ctx.value();
    let handled = true;
    switch (ke.key) {
      case 'ArrowRight': s = kjClamp(s + step, 0, 1); break;
      case 'ArrowLeft':  s = kjClamp(s - step, 0, 1); break;
      case 'ArrowUp':    v = kjClamp(v + step, 0, 1); break;
      case 'ArrowDown':  v = kjClamp(v - step, 0, 1); break;
      case 'Home':       s = 0; break;
      case 'End':        s = 1; break;
      case 'PageUp':     v = 1; break;
      case 'PageDown':   v = 0; break;
      default: handled = false;
    }
    if (handled) {
      event.preventDefault();
      this.ctx.setSaturationValue(s, v);
    }
  }
}
