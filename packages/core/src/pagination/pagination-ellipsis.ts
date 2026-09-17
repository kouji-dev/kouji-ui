import {
  Directive,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  signal,
} from '@angular/core';
import { injectKjPaginationLabels } from './labels';
import { DOCUMENT } from '@angular/common';

/** Inline style equivalent to `KjVisuallyHidden` — used for the AT label child span. */
const KJ_VISUALLY_HIDDEN_STYLE =
  'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0';

/**
 * Gap indicator within a `KjPagination`. Apply to a `<span>`. The visible
 * `…` glyph is decorative and marked `aria-hidden="true"`; the directive
 * appends a visually-hidden child span carrying the ellipsis label
 * (`pagination.more` in the i18n catalog, default `"More pages"`) so AT users hear a meaningful readout
 * (WCAG 1.3.1 — the ellipsis carries information, so it must have a
 * text equivalent).
 *
 * The host span itself is **not** `aria-hidden`; only the glyph wrapper
 * inside it is. This way the visually-hidden label survives in the AT
 * tree.
 *
 * @example
 * ```html
 * <span kjPaginationEllipsis>…</span>
 * ```
 *
 * @doc-category Core/Navigation
 * @doc
 * @doc-name pagination
 */
@Directive({
  selector: '[kjPaginationEllipsis]',
  standalone: true,
  host: {
    '[attr.data-pagination-ellipsis]': '""',
  },
})
export class KjPaginationEllipsis {
  /**
   * Resolved label set: a `provideKjPagination(…)` override when one is set,
   * otherwise the active i18n catalog (`pagination.more`).
   * @internal
   */
  readonly labels = injectKjPaginationLabels();
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);

  /** The visually-hidden label node, once rendered. */
  private readonly labelNode = signal<HTMLElement | null>(null);

  constructor() {
    // Written from an effect rather than once at render time so switching
    // locale at runtime re-reads the catalog.
    effect(() => {
      const node = this.labelNode();
      if (node) node.textContent = this.labels.ellipsis();
    });

    afterNextRender(() => {
      const host = this.el.nativeElement;

      // Wrap any existing visible glyph children in a `aria-hidden="true"`
      // span so the glyph is hidden from AT but visible to sighted users.
      const glyphWrapper = this.document.createElement('span');
      glyphWrapper.setAttribute('aria-hidden', 'true');
      // Move existing children into the glyph wrapper.
      while (host.firstChild) {
        glyphWrapper.appendChild(host.firstChild);
      }
      host.appendChild(glyphWrapper);

      // Append the visually-hidden AT label.
      const label = this.document.createElement('span');
      label.setAttribute('style', KJ_VISUALLY_HIDDEN_STYLE);
      host.appendChild(label);
      this.labelNode.set(label);
    });
  }
}
