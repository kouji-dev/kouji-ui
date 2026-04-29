import { Directive, computed, input } from '@angular/core';

export type KjToastVariant = 'default' | 'destructive' | 'success' | 'warning';

/**
 * Marks an element as a toast notification with appropriate ARIA live region attributes.
 * @example `<div kjToast [kjToastVariant]="'destructive'">Failed to save.</div>`
 * @category Core/Overlays/Toast
 */
@Directive({
  selector: '[kjToast]',
  standalone: true,
  host: {
    '[attr.role]': 'role()',
    '[attr.aria-live]': 'ariaLive()',
    '[attr.aria-atomic]': '"true"',
    '[attr.data-variant]': 'kjToastVariant()',
  },
})
export class KjToastDirective {
  /** The visual and semantic variant. Defaults to `'default'`. */
  kjToastVariant = input<KjToastVariant>('default');

  readonly role = computed(() => this.kjToastVariant() === 'destructive' ? 'alert' : 'status');
  readonly ariaLive = computed(() => this.kjToastVariant() === 'destructive' ? 'assertive' : 'polite');
}
