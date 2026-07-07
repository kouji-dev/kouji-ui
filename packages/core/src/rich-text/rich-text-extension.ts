import { Directive, OnInit, inject, input } from '@angular/core';
import { KJ_RICH_TEXT } from './rich-text.context';
import type { KjRichTextExtension } from './rich-text-plugin';

/**
 * Registers one or more {@link KjRichTextExtension}s with the nearest
 * {@link KjRichTextEditor} — the signal-context pattern (like `Option`
 * registering with `Select`).
 *
 * Place it on the same element as `[kjRichTextEditor]`, or on a descendant that
 * can inject {@link KJ_RICH_TEXT} (e.g. an `<ng-container>`). Registration
 * happens in `ngOnInit`, before the editor initializes, so node-contributing
 * extensions are picked up.
 *
 * @example
 * ```html
 * <div kjRichTextEditor [kjRichTextExtension]="mentionExtension"></div>
 * ```
 * @doc-category Core/Forms
 * @doc
 * @doc-name rich-text-editor
 */
@Directive({
  selector: '[kjRichTextExtension]',
  standalone: true,
})
export class KjRichTextExtensionDirective implements OnInit {
  private readonly host = inject(KJ_RICH_TEXT);

  /** The extension (or extensions) to register with the host editor. */
  readonly kjRichTextExtension = input.required<
    KjRichTextExtension | readonly KjRichTextExtension[]
  >();

  ngOnInit(): void {
    const value = this.kjRichTextExtension();
    const extensions = Array.isArray(value) ? value : [value as KjRichTextExtension];
    for (const extension of extensions) {
      this.host.registerExtension(extension);
    }
  }
}
