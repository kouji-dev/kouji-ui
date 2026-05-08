import { Directive, input } from '@angular/core';

export type KjBadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

/**
 * Marks an element as a badge via data attributes.
 *
 * Apply `[kjBadge]` to any inline element to reflect a `data-variant` attribute
 * that theme CSS reads — choose from `default`, `secondary`, `destructive`, or
 * `outline` without adding any wrapper markup. No styling is attached.
 *
 * @example `<span kjBadge [kjBadgeVariant]="'destructive'">Critical</span>`
 * @category Core/Data display
 * @doc
 * @doc-name badge
 * @doc-description Marks an inline element as a badge with a variant data attribute that theme CSS picks up.
 * @doc-is-main
 */
@Directive({ selector: '[kjBadge]', standalone: true, host: { '[attr.data-variant]': 'kjBadgeVariant()' } })
export class KjBadge {
  /** The visual variant of the badge. Defaults to `'default'`. */
  kjBadgeVariant = input<KjBadgeVariant>('default');
}
