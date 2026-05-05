import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';
import { KjInput } from '@kouji-ui/core';

/**
 * Styled wrapper around the headless KjInput directive.
 *
 * Element-wrapper pattern: <kj-input> is structural shell; inner <input>
 * carries native input semantics (focus, form integration, validation).
 *
 * @example
 * ```html
 * <kj-input type="email" placeholder="you@example.com" [invalid]="emailCtrl.invalid" />
 * <kj-input type="text" [disabled]="true" />
 * ```
 * @doc
 *   @doc-file input.example.ts
 * @category Library/Base
 */
@Component({
  selector: 'kj-input',
  standalone: true,
  imports: [KjInput],
  template: `
    <input
      kjInput
      class="kj-input"
      [type]="type()"
      [placeholder]="placeholder()"
      [kjInvalid]="invalid()"
      [kjDisabled]="disabled()"
    />
  `,
  styleUrl: './input.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjInputComponent {
  readonly type = input<'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url'>('text');
  readonly placeholder = input<string>('');
  readonly invalid = input(false);
  readonly disabled = input(false);
}
