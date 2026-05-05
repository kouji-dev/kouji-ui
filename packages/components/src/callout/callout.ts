import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';

/**
 * Themed callout box for tips, info, warnings, errors.
 * Presentation-only: no headless directive, no behavior.
 *
 * Variants:
 * - `info`        — accent-colored (neutral information, tips)
 * - `success`     — success-colored (positive notes)
 * - `warning`     — warning-colored (cautions)
 * - `destructive` — destructive-colored (breaking changes, errors)
 *
 * Use `<strong>` or a heading inside for the lead, then prose.
 *
 * @example
 * ```html
 * <kj-callout variant="info">
 *   <strong>Tip:</strong> Use signal inputs for component composition.
 * </kj-callout>
 *
 * <kj-callout variant="warning">
 *   This API is experimental and may change before v1.0.
 * </kj-callout>
 * ```
 */
@Component({
  selector: 'kj-callout',
  standalone: true,
  template: `
    <div class="kj-callout" role="note" [attr.data-variant]="variant()">
      <ng-content />
    </div>
  `,
  styleUrl: './callout.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCalloutComponent {
  readonly variant = input<'info' | 'success' | 'warning' | 'destructive'>('info');
}
