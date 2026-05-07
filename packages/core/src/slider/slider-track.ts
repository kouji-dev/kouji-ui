import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  inject,
  output,
} from '@angular/core';
import { KJ_SLIDER } from './slider.context';

/**
 * Pointer-event owner for the slider. Captures `pointerdown` on the track,
 * resolves the target value via the root's geometry helper, picks the
 * nearest thumb (by absolute value distance), and forwards the value.
 *
 * Pointer interactions on a *thumb* are handled by `[kjSliderThumb]` —
 * the track only handles the click-on-empty-track-jump case.
 *
 * Sets `touch-action` to allow page scroll on the cross axis (e.g. vertical
 * page scroll on a horizontal slider) while blocking the on-axis drag.
 *
 * @category Library/Data input
 */
@Directive({
  selector: '[kjSliderTrack]',
  standalone: true,
  exportAs: 'kjSliderTrack',
  host: {
    '[attr.aria-orientation]': 'ctx.orientation()',
    '[attr.data-orientation]': 'ctx.orientation()',
    '[style.touch-action]': 'ctx.orientation() === "vertical" ? "pan-x" : "pan-y"',
    '(pointerdown)': 'onPointerDown($event)',
  },
})
export class KjSliderTrack {
  /** @internal */
  readonly ctx = inject(KJ_SLIDER);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Diagnostics: emitted when click-to-jump moves a thumb. */
  readonly kjTrackClick = output<{ value: number; thumbIndex: number }>();

  constructor() {
    afterNextRender(() => {
      this.ctx.setTrackElement(this.el.nativeElement);
      this.destroyRef.onDestroy(() => this.ctx.setTrackElement(null));
    });
  }

  /** @internal */
  onPointerDown(event: PointerEvent): void {
    if (this.ctx.disabled() || this.ctx.readonly()) {
      event.preventDefault();
      return;
    }
    const target = event.target as Element | null;
    // If the press landed on a thumb, let the thumb directive handle it.
    if (target && target.closest('[kjSliderThumb]')) return;

    event.preventDefault();
    const value = this.ctx.valueFromClientPosition(event.clientX, event.clientY);
    const thumbIndex = this.ctx.nearestThumbIndex(value);
    this.ctx.setThumbValue(thumbIndex, value, 'pointer');
    this.ctx.thumbs()[thumbIndex]?.focus();
    this.kjTrackClick.emit({ value, thumbIndex });
  }
}
