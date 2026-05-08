import { Directive, computed, inject } from '@angular/core';
import { KJ_SLIDER } from './slider.context';
import { fractionForValue } from './slider.geometry';

/**
 * Highlighted span representing the *selected* portion of the track —
 * `0..thumb` for a single-thumb slider, or `low..high` for a range slider.
 *
 * Pure visual: writes two CSS custom properties (`--kj-slider-start` and
 * `--kj-slider-end`, both `0..1` fractions) which the wrapper layer maps
 * to `inset-inline-start` / `inline-size` (or block equivalents for
 * vertical). `aria-hidden="true"` — decoration only.
 *
 * @category Library/Data input
 * @doc
 * @doc-name slider
 */
@Directive({
  selector: '[kjSliderRange]',
  standalone: true,
  exportAs: 'kjSliderRange',
  host: {
    'aria-hidden': 'true',
    '[attr.data-orientation]': 'ctx.orientation()',
    '[style.--kj-slider-start]': 'fractions().start',
    '[style.--kj-slider-end]': 'fractions().end',
  },
})
export class KjSliderRange {
  /** @internal */
  readonly ctx = inject(KJ_SLIDER);

  /** @internal — `start` ≤ `end` regardless of inversion (CSS handles flipping). */
  readonly fractions = computed(() => {
    const thumbs = this.ctx.thumbs();
    const args = { min: this.ctx.min(), max: this.ctx.max(), inverted: this.ctx.inverted() };
    if (thumbs.length === 0) return { start: 0, end: 0 };
    if (thumbs.length === 1) {
      const f = fractionForValue(thumbs[0].value(), args);
      // From the start of the track (post-invert) to the thumb.
      const start = this.ctx.inverted() ? f : 0;
      const end = this.ctx.inverted() ? 1 : f;
      return { start, end };
    }
    const lo = fractionForValue(thumbs[0].value(), args);
    const hi = fractionForValue(thumbs[1].value(), args);
    return { start: Math.min(lo, hi), end: Math.max(lo, hi) };
  });
}
