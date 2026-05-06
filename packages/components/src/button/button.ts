import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';
import { KjButton } from '@kouji-ui/core';

/**
 * Styled wrapper around the headless KjButton directive.
 *
 * Variant and size are user-configurable strings. Configure the allowed values
 * and defaults via `provideKjButton(…)` at the application or component scope.
 *
 * @example
 * ```html
 * <kj-button variant="destructive" size="lg" [loading]="busy()">
 *   Delete
 * </kj-button>
 * ```
 * @doc-example Default
 *   @doc-file button.example.ts
 * @doc-example Variants
 *   @doc-file button.variants.example.ts
 * @doc-example Sizes
 *   @doc-file button.sizes.example.ts
 * @doc-example Disabled
 *   @doc-file button.disabled.example.ts
 * @doc-example Loading
 *   @doc-file button.loading.example.ts
 * @doc-example Pressed (toggle)
 *   @doc-file button.pressed.example.ts
 * @doc-example Icon-only
 *   @doc-file button.icon.example.ts
 * @doc-example Anchor as button
 *   @doc-file button.anchor.example.ts
 * @doc-example Configured presets
 *   @doc-file button.configured.example.ts
 * @category Library/Actions
 */
@Component({
  selector: 'kj-button',
  standalone: true,
  imports: [KjButton],
  template: `
    <button
      [type]="type()"
      kjButton
      class="kj-button"
      [variant]="variant()"
      [size]="size()"
      [disabled]="disabled()"
      [loading]="loading()"
      [pressed]="pressed()"
      [attr.aria-label]="ariaLabel()"
    >
      @if (loading()) {
        <span class="kj-button__spinner" aria-hidden="true"></span>
      }
      <ng-content />
    </button>
  `,
  styleUrl: './button.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjButtonComponent {
  readonly variant = input<string>('default');
  readonly size = input<string>('md');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly pressed = input<boolean | undefined>(undefined);
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly ariaLabel = input<string | undefined>(undefined);
}
