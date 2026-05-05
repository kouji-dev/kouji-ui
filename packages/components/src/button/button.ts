import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';
import { KjButton, KjButtonVariant, KjButtonSize } from '@kouji-ui/core';

/**
 * Styled wrapper around the headless KjButton directive.
 *
 * Element-wrapper pattern: the host `<kj-button>` is a structural shell with
 * `display: contents` (no layout box). The component template renders a real
 * inner `<button>` with the `kjButton` directive applied. Signal inputs on
 * the component (`variant`, `size`, `disabled`) flow through normal template
 * binding to the directive's `kjVariant` / `kjSize` / `kjDisabled` inputs.
 *
 * `ViewEncapsulation.None` makes the component's CSS (button.css) global so
 * theme overrides like `[data-theme="X"] .kj-button { ... }` and the
 * `@layer kj.component` cascade rules from the design spec actually apply.
 *
 * @example
 * ```html
 * <kj-button variant="destructive" size="lg" [disabled]="loading()">
 *   Delete
 * </kj-button>
 * ```
 * @doc
 *   @doc-file button.example.ts
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
      [kjVariant]="variant()"
      [kjSize]="size()"
      [kjDisabled]="disabled()"
    >
      <ng-content />
    </button>
  `,
  styleUrl: './button.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjButtonComponent {
  readonly variant = input<KjButtonVariant>('default');
  readonly size = input<KjButtonSize>('md');
  readonly disabled = input(false);
  readonly type = input<'button' | 'submit' | 'reset'>('button');
}
