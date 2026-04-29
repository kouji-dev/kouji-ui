import { Directive } from '@angular/core';

/**
 * Visually hides an element while keeping it accessible to screen readers.
 * Uses the standard visually-hidden CSS technique via inline styles.
 *
 * @example
 * ```html
 * <button>
 *   <kj-icon name="close" />
 *   <span kjVisuallyHidden>Close dialog</span>
 * </button>
 * ```
 */
@Directive({
  selector: '[kjVisuallyHidden]',
  standalone: true,
  host: {
    style: [
      'position:absolute',
      'width:1px',
      'height:1px',
      'padding:0',
      'margin:-1px',
      'overflow:hidden',
      'clip:rect(0,0,0,0)',
      'white-space:nowrap',
      'border-width:0',
    ].join(';'),
  },
})
export class KjVisuallyHiddenDirective {}
