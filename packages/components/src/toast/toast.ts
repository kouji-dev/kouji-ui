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
 * Toast suite shell. Hosts the documentation page for the toast service +
 * viewport + close button trio. Use `KjToastService.show()` to enqueue a
 * toast, mount `<kj-toast-viewport>` near your trigger, and place
 * `<kj-toast>` / `<kj-toast-close>` inside the per-call `<ng-template>`.
 *
 * @doc-name Toast
 * @doc-is-main
 * @doc-example Default
 *   @doc-file toast.default.example.ts
 * @doc-example Variants
 *   @doc-file toast.variants.example.ts
 * @doc-example With action
 *   @doc-file toast.with-action.example.ts
 * @doc-example Dismissible
 *   @doc-file toast.dismissible.example.ts
 * @category Library/Overlay
 */
@Component({
  selector: 'kj-toast-wrapper',
  standalone: true,
  template: `<ng-content />`,
  styleUrl: './toast.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjToastWrapperComponent {}

/**
 * Toast viewport. Mount once near your trigger button (or in your app shell).
 * Renders each active toast using the per-call template passed to
 * `KjToastService.show(template, options)`.
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
 * Dismiss button for a toast. Bind `[toastId]` from `ctx.id`. Clicking calls
 * `KjToastService.dismiss(id)`.
 *
 * The rendered `<button>` carries a default `aria-label="Dismiss notification"`
 * so icon-only close buttons remain accessible (WCAG 4.1.2). Override via the
 * `ariaLabel` input or by projecting visible text.
 */
@Component({
  selector: 'kj-toast-close',
  standalone: true,
  imports: [KjToastClose],
  template: `<button
    type="button"
    [kjToastClose]="toastId()"
    [attr.aria-label]="ariaLabel()"
    class="kj-toast-close"
  ><ng-content /></button>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjToastCloseComponent {
  /** The id of the toast to dismiss — bind from `ctx.id` in your template context. */
  readonly toastId = input.required<string>();

  /**
   * Accessible name for the close button. Defaults to `"Dismiss notification"`
   * so icon-only close affordances satisfy WCAG 4.1.2 (Name, Role, Value)
   * without consumer ceremony. Override per-instance when the toast already
   * names its dismiss action elsewhere.
   */
  readonly ariaLabel = input<string>('Dismiss notification');
}
