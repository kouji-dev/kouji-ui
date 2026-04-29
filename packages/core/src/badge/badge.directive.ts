import { Directive, input } from '@angular/core';

export type KjBadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

/**
 * Marks an element as a badge via data attributes.
 * @example `<span kjBadge [kjBadgeVariant]="'destructive'">Critical</span>`
 * @category Foundation/Badge
 */
@Directive({ selector: '[kjBadge]', standalone: true, host: { '[attr.data-variant]': 'kjBadgeVariant()' } })
export class KjBadgeDirective {
  /** The visual variant of the badge. Defaults to `'default'`. */
  kjBadgeVariant = input<KjBadgeVariant>('default');
}
