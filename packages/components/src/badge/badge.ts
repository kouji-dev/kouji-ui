import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';
import { KjBadge, KjBadgeVariant } from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjBadge` directive.
 *
 * @doc-example Default
 *   @doc-file badge.default.example.ts
 * @doc-example Variants
 *   @doc-file badge.variants.example.ts
 * @doc-example Sizes
 *   @doc-file badge.sizes.example.ts
 * @doc-example With icon
 *   @doc-file badge.with-icon.example.ts
 * @category Library/Data display
 * @doc
 * @doc-name badge
 * @doc-description Themed inline label for status, counts, or category tags with variant and size presets.
 * @doc-is-main
 */
@Component({
  selector: 'kj-badge',
  standalone: true,
  imports: [KjBadge],
  template: `
    <span
      kjBadge
      class="kj-badge"
      [kjBadgeVariant]="variant()"
      [attr.data-size]="size()"
    >
      <ng-content />
    </span>
  `,
  styleUrl: './badge.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjBadgeComponent {
  readonly variant = input<KjBadgeVariant>('default');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
}
