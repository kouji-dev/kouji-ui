import { Directive, input } from '@angular/core';
import { KjDisabledDirective, KjFocusRingDirective } from '../primitives';

export type KjButtonVariant = 'default' | 'destructive' | 'outline' | 'ghost' | 'link';
export type KjButtonSize = 'sm' | 'md' | 'lg' | 'icon';

/**
 * Enhances a native `<button>` with variant, size, disabled state, and focus-ring behavior.
 * @example
 * ```html
 * <button kjButton [kjVariant]="'destructive'" [kjDisabled]="isLoading()">Delete</button>
 * ```
 * @doc
 *  @doc-file button.example.ts
 *    ```typescript
 *       import { Component, signal } from '@angular/core';
 *       import { KjButtonDirective } from '@kouji-ui/core';
 *
 *       @Component({
 *         standalone: true,
 *         imports: [KjButtonDirective],
 *         styles: [`
 *           .row { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; padding: 2rem; background: #0c0c0c; }
 *           [kjButton] { padding: 0.5rem 1.25rem; font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; border: none; cursor: pointer; transition: opacity 0.15s; }
 *           [data-variant="default"] { background: #b8f500; color: #0c0c0c; }
 *           [data-variant="destructive"] { background: #ef4444; color: white; }
 *           [data-variant="outline"] { background: transparent; color: #f0ede6; border: 1px solid #333; }
 *           [data-variant="ghost"] { background: transparent; color: #888; }
 *           [aria-disabled="true"] { opacity: 0.4; cursor: not-allowed; }
 *         `],
 *         template: `
 *           <div class="row">
 *             <button kjButton [kjVariant]="'default'">Default</button>
 *             <button kjButton [kjVariant]="'destructive'">Destructive</button>
 *             <button kjButton [kjVariant]="'outline'">Outline</button>
 *             <button kjButton [kjVariant]="'ghost'">Ghost</button>
 *             <button kjButton [kjDisabled]="true">Disabled</button>
 *           </div>
 *         `,
 *       })
 *       export class ButtonExampleComponent {}
 *    ```
 * @category Foundation/Button
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
