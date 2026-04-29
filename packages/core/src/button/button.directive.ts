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
 *  @doc-theme default
 *    @doc-file button.example.ts
 *      ```typescript
 *        import { Component, signal } from '@angular/core';
 *        import { KjButtonDirective } from '@kouji-ui/core';
 *
 *        @Component({
 *          standalone: true,
 *          imports: [KjButtonDirective],
 *          styles: [`
 *            .row { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; padding: 2rem; background: #0c0c0c; }
 *            [kjButton] { padding: 0.5rem 1.25rem; font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; border: none; cursor: pointer; transition: opacity 0.15s; }
 *            [data-variant="default"] { background: #b8f500; color: #0c0c0c; }
 *            [data-variant="destructive"] { background: #ef4444; color: white; }
 *            [data-variant="outline"] { background: transparent; color: #f0ede6; border: 1px solid #333; }
 *            [data-variant="ghost"] { background: transparent; color: #888; }
 *            [aria-disabled="true"] { opacity: 0.4; cursor: not-allowed; }
 *          `],
 *          template: `
 *            <div class="row">
 *              <button kjButton [kjVariant]="'default'">Default</button>
 *              <button kjButton [kjVariant]="'destructive'">Destructive</button>
 *              <button kjButton [kjVariant]="'outline'">Outline</button>
 *              <button kjButton [kjVariant]="'ghost'">Ghost</button>
 *              <button kjButton [kjDisabled]="true">Disabled</button>
 *            </div>
 *          `,
 *        })
 *        export class ButtonExampleComponent {}
 *      ```
 *    @doc-theme retro
 *      @doc-file button.retro.ts
 *        ```typescript
 *          import { Component } from '@angular/core';
 *          import { KjButtonDirective } from '@kouji-ui/core';
 *
 *          @Component({
 *            standalone: true,
 *            imports: [KjButtonDirective],
 *            styles: [`
 *              :host { display: block; padding: 2rem; background: #fef9c3; font-family: 'Courier New', monospace; }
 *              .row { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; }
 *              button[kjButton] { padding: 0.5rem 1.125rem; font-family: 'Courier New', monospace; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; border: 2px solid #000; border-radius: 0; cursor: pointer; box-shadow: 3px 3px 0 #000; transition: transform 0.08s, box-shadow 0.08s; }
 *              button[kjButton]:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 #000; }
 *              button[kjButton]:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 #000; }
 *              [data-variant="default"] { background: #16a34a; color: #fff; }
 *              [data-variant="destructive"] { background: #dc2626; color: #fff; }
 *              [data-variant="outline"] { background: #fff; color: #1d4ed8; border-color: #1d4ed8; box-shadow: 3px 3px 0 #1d4ed8; }
 *              [data-variant="ghost"] { background: transparent; color: #000; box-shadow: none; border-color: #000; }
 *              [aria-disabled="true"] { opacity: 0.4; cursor: not-allowed; transform: none !important; }
 *            `],
 *            template: `
 *              <div class="row">
 *                <button kjButton [kjVariant]="'default'">Confirm</button>
 *                <button kjButton [kjVariant]="'destructive'">Delete</button>
 *                <button kjButton [kjVariant]="'outline'">Learn More</button>
 *                <button kjButton [kjVariant]="'ghost'">Cancel</button>
 *                <button kjButton [kjDisabled]="true">Disabled</button>
 *              </div>
 *            `,
 *          })
 *          export class ButtonRetroComponent {}
 *        ```
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
