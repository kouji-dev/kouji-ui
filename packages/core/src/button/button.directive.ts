import { Directive, input } from '@angular/core';
import { KjDisabledDirective } from '../primitives/disabled.directive';
import { KjFocusRingDirective } from '../primitives/focus-ring.directive';

export type KjButtonVariant = 'default' | 'destructive' | 'outline' | 'ghost' | 'link';
export type KjButtonSize = 'sm' | 'md' | 'lg' | 'icon';

/**
 * Enhances a native `<button>` with variant, size, disabled state, and focus-ring behavior.
 * @example
 * ```html
 * <button kjButton [kjVariant]="'destructive'" [kjDisabled]="isLoading()">Delete</button>
 * ```
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
