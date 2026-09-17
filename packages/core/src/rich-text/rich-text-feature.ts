import { Directive, effect, input } from '@angular/core';
import { KJ_RICH_TEXT } from './rich-text.context';
import type { KjRichTextFeature } from './feature';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * Registers one or more {@link KjRichTextFeature}s with the nearest
 * {@link KjRichTextEditor} — the signal-context pattern (like `Option`
 * registering with `Select`).
 *
 * Place it on the same element as `[kjRichTextEditor]`, or on a descendant that
 * can inject {@link KJ_RICH_TEXT} (e.g. an `<ng-container>`). Registration runs
 * in an effect during the first change detection pass — before the editor's
 * `afterNextRender` initialization — so node-contributing features are picked
 * up. It registers exactly once, the first time the input holds a feature.
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
  selector: '[kjRichTextFeature]',
  standalone: true,
})
export class KjRichTextFeatureDirective {
  private readonly host = injectParent(KJ_RICH_TEXT, { child: 'KjRichTextFeatureDirective', parent: '[kjRichTextEditor]' });

  /** The feature (or features) to register with the host editor. */
  readonly kjRichTextFeature = input<KjRichTextFeature | readonly KjRichTextFeature[]>();

  constructor() {
    // Register-once, like the `ngOnInit` this replaces: `registerFeature`
    // appends, so re-running on a later input change would double-register.
    let registered = false;
    effect(() => {
      const value = this.kjRichTextFeature();
      if (registered || !value) return;
      registered = true;
      const features = Array.isArray(value) ? value : [value as KjRichTextFeature];
      for (const feature of features) {
        this.host.registerFeature(feature);
      }
    });
  }
}
