import {
  Directive,
  ElementRef,
  afterNextRender,
  inject,
} from '@angular/core';
import { kjDevMode, kjDevWarn } from '../primitives/diagnostics/dev-mode';

/**
 * Applies kouji's blockquote tone — left rule, italic, indent — to a
 * `<blockquote>` element. Reflects `data-kj-tone="blockquote"`. Useful when
 * the blockquote sits *outside* a `kj-prose` container (the prose container
 * styles its own `<blockquote>` descendants automatically).
 *
 * Recommended host is `<blockquote>` to preserve native semantics; applied
 * to a non-`<blockquote>` host the directive emits a dev-mode warning but
 * does not enforce the tag.
 *
 * @example
 * ```html
 * <blockquote kjBlockquote>
 *   "kouji-ui shipped on the day they said it would."
 * </blockquote>
 * ```
 * @doc-category Core/Data display
 * @doc
 * @doc-name typography
 * @doc-description Styles a standalone blockquote outside a prose container with the kouji quotation tone.
 * @doc-is-main
 */
@Directive({
  selector: '[kjBlockquote]',
  standalone: true,
  exportAs: 'kjBlockquote',
  host: {
    '[attr.data-kj-tone]': '"blockquote"',
  },
})
export class KjBlockquote {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    if (kjDevMode()) {
      afterNextRender(() => {
        const host = this.el.nativeElement;
        if (host.tagName?.toLowerCase() !== 'blockquote') {
          kjDevWarn(
            'kjBlockquote',
            `applied to <${host.tagName?.toLowerCase()}>. ` +
              `Recommended host element is <blockquote> for native semantics ` +
              `(WCAG 1.3.1 / 4.1.2). Apply only to non-blockquote elements ` +
              `when you have a specific styling reason.`,
          );
        }
      });
    }
  }
}
