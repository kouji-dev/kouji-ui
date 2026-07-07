import { Directive, OnInit, inject, input } from '@angular/core';
import { KJ_RICH_TEXT } from './rich-text.context';
import type { KjRichTextFeature } from './feature';

/**
 * Registers one or more {@link KjRichTextFeature}s with the nearest
 * {@link KjRichTextEditor} — the signal-context pattern (like `Option`
 * registering with `Select`).
 *
 * Place it on the same element as `[kjRichTextEditor]`, or on a descendant that
 * can inject {@link KJ_RICH_TEXT} (e.g. an `<ng-container>`). Registration
 * happens in `ngOnInit`, before the editor initializes, so node-contributing
 * features are picked up.
 *
 * @example
 * ```html
 * <div kjRichTextEditor [kjFeatures]="[mentionFeature]"></div>
 * <!-- or as a child directive -->
 * <div kjRichTextEditor [kjRichTextFeature]="mentionFeature"></div>
 * ```
 * @doc-category Core/Forms
 * @doc
 * @doc-name rich-text-editor
 */
@Directive({
  selector: '[kjRichTextFeature], [kjRichTextExtension]',
  standalone: true,
})
export class KjRichTextExtensionDirective implements OnInit {
  private readonly host = inject(KJ_RICH_TEXT);

  /** The feature (or features) to register with the host editor. */
  readonly kjRichTextFeature = input<KjRichTextFeature | readonly KjRichTextFeature[]>();
  /** @deprecated Renamed to {@link kjRichTextFeature}. */
  readonly kjRichTextExtension = input<KjRichTextFeature | readonly KjRichTextFeature[]>();

  ngOnInit(): void {
    const value = this.kjRichTextFeature() ?? this.kjRichTextExtension();
    if (!value) return;
    const features = Array.isArray(value) ? value : [value as KjRichTextFeature];
    for (const feature of features) {
      this.host.registerFeature(feature);
    }
  }
}
