import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  input,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { KjToastViewport, KjToast, KjToastClose } from '@kouji-ui/core';
import type { KjToastVariant } from '@kouji-ui/core';

/**
 * Toast viewport. Mount once near your trigger button (or in your app shell).
 * Renders each active toast using the per-call template passed to
 * `KjToastService.show(template, options)`.
 *
 * @doc-example Default
 *   @doc-file toast.default.example.ts
 * @doc-example Variants
 *   @doc-file toast.variants.example.ts
 * @doc-example With action
 *   @doc-file toast.with-action.example.ts
 * @doc-example Dismissible
 *   @doc-file toast.dismissible.example.ts
 * @category Library/Feedback
 */
@Component({
  selector: 'kj-toast-viewport',
  standalone: true,
  imports: [KjToastViewport, NgTemplateOutlet],
  template: `
    <ol
      kjToastViewport
      class="kj-toast-viewport"
      #vp="kjToastViewport"
      aria-label="Notifications"
    >
      @for (r of vp.renderable(); track r.id) {
        <li>
          <ng-container *ngTemplateOutlet="r.template; context: r.context" />
        </li>
      }
    </ol>
  `,
  styleUrl: './toast.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjToastViewportComponent {}

/**
 * Single toast item. Bind `[variant]` from `ctx.variant` and `[id]` from `ctx.id`.
 * Place inside the `<ng-template let-ctx>` you pass to `KjToastService.show()`.
 */
@Component({
  selector: 'kj-toast',
  standalone: true,
  imports: [KjToast],
  template: `
    <div
      kjToast
      class="kj-toast"
      [kjToastVariant]="variant()"
      [kjToastId]="id()"
    ><ng-content /></div>
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjToastComponent {
  readonly variant = input<KjToastVariant>('default');
  readonly id = input<string>('');
}

/**
 * Dismiss button for a toast. Bind `[toastId]` from `ctx.id`.
 * Clicking automatically calls `KjToastService.dismiss(id)`.
 */
@Component({
  selector: 'kj-toast-close',
  standalone: true,
  imports: [KjToastClose],
  template: `<button type="button" [kjToastClose]="toastId()" class="kj-toast-close"><ng-content /></button>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjToastCloseComponent {
  /** The id of the toast to dismiss — bind from `ctx.id` in your template context. */
  readonly toastId = input.required<string>();
}
