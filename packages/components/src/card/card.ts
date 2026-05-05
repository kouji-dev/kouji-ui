import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';

/**
 * Themed surface container — card, panel, feature box.
 * Presentation-only: no headless directive in core, no behavior.
 *
 * Variants:
 * - `default` — base surface (background `--kj-color-base-200`)
 * - `outline` — transparent background, neutral border
 * - `subtle`  — slightly elevated surface (background `--kj-color-base-300`), no border
 *
 * @example
 * ```html
 * <kj-card>Default card</kj-card>
 * <kj-card variant="outline">Outlined</kj-card>
 * ```
 */
@Component({
  selector: 'kj-card',
  standalone: true,
  template: `
    <div class="kj-card" [attr.data-variant]="variant()">
      <ng-content />
    </div>
  `,
  styleUrl: './card.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCardComponent {
  readonly variant = input<'default' | 'outline' | 'subtle'>('default');
}
