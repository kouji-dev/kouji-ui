import {
  Directive,
  ElementRef,
  afterNextRender,
  inject,
  isDevMode,
} from '@angular/core';

/**
 * Applies kouji's blockquote tone — left rule, italic, indent — to a
 * `<blockquote>` element. Reflects `data-tone="blockquote"`. Useful when
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
 * @category Core/Data display
 * @doc
 * @doc-name typography
 * @doc-description Applies kouji's blockquote tone to a `<blockquote>` element via `data-tone="blockquote"` — useful when the element lives outside a `kj-prose` container that would otherwise style it automatically.
 * @doc-is-main
 */
@Directive({
  selector: '[kjBlockquote]',
  standalone: true,
  exportAs: 'kjBlockquote',
  host: {
    '[attr.data-tone]': '"blockquote"',
  },
})
export class KjBlockquote {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    if (isDevMode()) {
      afterNextRender(() => {
        const host = this.el.nativeElement;
        if (host.tagName?.toLowerCase() !== 'blockquote') {
          console.warn(
            `[kj] kjBlockquote applied to <${host.tagName?.toLowerCase()}>. ` +
              `Recommended host element is <blockquote> for native semantics ` +
              `(WCAG 1.3.1 / 4.1.2). Apply only to non-blockquote elements ` +
              `when you have a specific styling reason.`,
          );
        }
      });
    }
  }
}
