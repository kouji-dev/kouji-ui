import { Directive, input } from '@angular/core';
import { KjDisabledDirective, KjFocusRingDirective } from '../primitives';

export type KjButtonVariant = 'default' | 'destructive' | 'outline' | 'ghost' | 'link';
export type KjButtonSize = 'sm' | 'md' | 'lg' | 'icon';

/**
 * Enhances a native `<button>` with variant, size, disabled state, and focus-ring behavior.
 * Composes `KjDisabledDirective` and `KjFocusRingDirective` via `hostDirectives`.
 *
 * @example
 * ```html
 * <button kjButton [kjVariant]="'destructive'" [kjDisabled]="isLoading()">Delete</button>
 * ```
 * @doc
 *  @doc-example Variants
 *    @doc-theme default
 *      @doc-file button.example.ts
 *    @doc-theme retro
 *      @doc-file button.retro.example.ts
 *    @doc-theme finance
 *      @doc-file button.finance.example.ts
 *  @doc-example Sizes
 *    @doc-file button.sizes.example.ts
 * @category Core/Base/Button
 */
@Directive({
  selector: '[kjButton]',
  standalone: true,
  hostDirectives: [
    { directive: KjDisabledDirective, inputs: ['kjDisabled'] },
    KjFocusRingDirective,
  ],
  host: {
    '[attr.data-variant]': 'kjVariant()',
    '[attr.data-size]': 'kjSize()',
  },
})
export class KjButtonDirective {
  /** The visual variant of the button. Defaults to `'default'`. */
  kjVariant = input<KjButtonVariant>('default');
  /** The size of the button. Defaults to `'md'`. */
  kjSize = input<KjButtonSize>('md');
}
