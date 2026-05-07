import { Directive, inject } from '@angular/core';

import { KJ_PROGRESS_BAR } from './progress-bar.context';

/**
 * Inner fill / indicator child for `[kjProgressBar]`. Reads
 * `KJ_PROGRESS_BAR.fraction` and re-emits `--kj-progress-fraction` plus
 * `data-indeterminate` on its own host so themes can target the inner
 * element directly without traversing the parent.
 *
 * The directive sets nothing visual — themes own the actual `transform` /
 * `width` and the indeterminate stripe animation. Re-exposing the CSS
 * variable (and the `data-indeterminate` branch attribute) at the named
 * fill element saves consumers a CSS selector hop and gives themes a
 * stable hook for the inner node.
 *
 * @example
 * ```html
 * <div kjProgressBar [kjValue]="progress()">
 *   <div kjProgressBarFill></div>
 * </div>
 * ```
 * @category Core/Feedback
 */
@Directive({
  selector: '[kjProgressBarFill]',
  standalone: true,
  host: {
    '[style.--kj-progress-fraction]': 'ctx.fraction()',
    '[attr.data-indeterminate]': 'ctx.indeterminate() ? "true" : null',
  },
})
export class KjProgressBarFill {
  protected readonly ctx = inject(KJ_PROGRESS_BAR);
}
