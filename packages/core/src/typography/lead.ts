import {
  Directive,
  ElementRef,
  afterNextRender,
  inject,
  isDevMode,
} from '@angular/core';

/**
 * Marks a paragraph as the lead-in paragraph for a section — slightly larger
 * size with a softer tone. Reflects `data-tone="lead"` so theme CSS keys off
 * it; the directive owns no styling itself.
 *
 * Lead semantics are paragraph-bound; applied to a non-`<p>` host the
 * directive emits a dev-mode warning but does not enforce the tag.
 *
 * @example
 * ```html
 * <p kjLead>Atlas helps engineering teams plan quarterly roadmaps.</p>
 * ```
 * @doc-category Core/Data display
 * @doc
 * @doc-name typography
 */
@Directive({
  selector: '[kjLead]',
  standalone: true,
  exportAs: 'kjLead',
  host: {
    '[attr.data-tone]': '"lead"',
  },
})
export class KjLead {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    if (isDevMode()) {
      afterNextRender(() => {
        const host = this.el.nativeElement;
        if (host.tagName?.toLowerCase() !== 'p') {
          console.warn(
            `[kj] kjLead applied to <${host.tagName?.toLowerCase()}>. ` +
              `Lead semantics are paragraph-bound; recommended host is <p>.`,
          );
        }
      });
    }
  }
}
