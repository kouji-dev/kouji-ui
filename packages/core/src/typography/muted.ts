import { Directive } from '@angular/core';

/**
 * Reduces a phrasing element's colour intensity to the muted token so the
 * text reads as secondary information against the primary text. Reflects
 * `data-tone="muted"`; the kouji theme layer owns the actual colour mix and
 * is verified against the AAA contrast bar (≥ 7:1) on `base-100`,
 * `base-200`, and `base-300` page backgrounds.
 *
 * Works on any phrasing element (`<span>`, `<small>`, `<p>`, `<em>`).
 *
 * @example
 * ```html
 * <p>Primary text. <small kjMuted>Secondary info.</small></p>
 * <p kjMuted>Standalone muted paragraph.</p>
 * ```
 * @category Core/Data display
 * @doc
 * @doc-name typography
 */
@Directive({
  selector: '[kjMuted]',
  standalone: true,
  exportAs: 'kjMuted',
  host: {
    '[attr.data-tone]': '"muted"',
  },
})
export class KjMuted {}
