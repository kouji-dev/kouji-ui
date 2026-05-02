import { Directive, computed, inject, input } from '@angular/core';
import { KjToastService } from './toast.service';

export type { KjToastVariant } from './toast.service';

/**
 * Marks an element as a toast notification item with ARIA role and variant data attribute.
 * Use inside a `[kjToastViewport]` template with `@for`.
 *
 * @doc
 *  @doc-example Basic
 *    @doc-theme default
 *      @doc-file toast.example.ts
 *    @doc-theme retro
 *      @doc-file toast.retro.example.ts
 *    @doc-theme finance
 *      @doc-file toast.finance.example.ts
 *
 * @example
 * ```html
 * <div kjToastViewport #vp="kjToastViewport">
 *   @for (t of vp.toasts(); track t.id) {
 *     <div kjToast [kjToastVariant]="t.variant">
 *       <span>{{ t.message }}</span>
 *       <button [kjToastClose]="t.id" aria-label="Dismiss">×</button>
 *     </div>
 *   }
 * </div>
 * ```
 * @category Core/Overlays/Toast
 */
@Directive({
  selector: '[kjToast]',
  standalone: true,
  host: {
    '[attr.role]': 'role()',
    '[attr.aria-atomic]': '"true"',
    '[attr.data-variant]': 'kjToastVariant()',
  },
})
export class KjToast {
  /** The visual and semantic variant. Defaults to `'default'`. */
  kjToastVariant = input<'default' | 'success' | 'destructive' | 'warning'>('default');

  readonly role = computed(() =>
    this.kjToastVariant() === 'destructive' ? 'alert' : 'status'
  );
}

/**
 * Container directive for the toast region. Exposes the active `toasts` signal
 * from `KjToastService` so the template can iterate and render them.
 *
 * @example
 * ```html
 * <ol kjToastViewport #vp="kjToastViewport" aria-label="Notifications">
 *   @for (t of vp.toasts(); track t.id) {
 *     <li kjToast [kjToastVariant]="t.variant">{{ t.message }}</li>
 *   }
 * </ol>
 * ```
 * @category Core/Overlays/Toast
 */
@Directive({
  selector: '[kjToastViewport]',
  standalone: true,
  exportAs: 'kjToastViewport',
  host: {
    'role': 'region',
    '[attr.aria-live]': '"polite"',
    '[attr.aria-atomic]': '"false"',
    '[attr.aria-relevant]': '"additions removals"',
  },
})
export class KjToastViewport {
  private readonly svc = inject(KjToastService);
  /** The live list of active toasts from `KjToastService`. */
  readonly toasts = this.svc.toasts;
}

/**
 * Dismiss button for a toast. Call with the toast `id` to remove it from the queue.
 *
 * @example
 * ```html
 * <button [kjToastClose]="toast.id" aria-label="Dismiss">×</button>
 * ```
 * @category Core/Overlays/Toast
 */
@Directive({
  selector: '[kjToastClose]',
  standalone: true,
  host: {
    '(click)': 'dismiss()',
  },
})
export class KjToastClose {
  private readonly svc = inject(KjToastService);
  /** The `id` of the toast to dismiss on click. */
  kjToastClose = input.required<string>();

  dismiss(): void {
    this.svc.dismiss(this.kjToastClose());
  }
}
