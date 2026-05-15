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
 * @doc
 * @doc-name toast
 * @doc-is-main
 * @doc-example Default
 *   The default playground — enqueue a single toast from a button click.
 *   @doc-file toast.default.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common toast usages — variants, an action
 *   button inside the body, and dismissal via `KjToastService.dismiss(id)`.
 *   @doc-file toast.usage.example.ts
 * @doc-example Variants
 *   `default` / `success` / `warning` / `error` / `info` — themed per tone.
 *   @doc-file toast.variants.example.ts
 * @doc-example With action
 *   Project a secondary `<kj-button>` inside the template to offer an action.
 *   @doc-file toast.with-action.example.ts
 * @doc-example Dismissible
 *   `<kj-toast-close>` calls the service's `dismiss(id)` for the current toast.
 *   @doc-file toast.dismissible.example.ts
 *
 * @doc-keyboard
 *   F6           — Moves focus into the toast viewport (when the host app wires it)
 *   Enter|Space  — Activates the focused action / close button inside a toast
 *   Tab          — Cycles through the dismiss + action buttons inside a toast
 *   Escape       — Optional — apps can wire to `dismiss(id)` on the active toast
 *
 * @doc-aria
 *   role="region"     — applied to `<kj-toast-viewport>` with `aria-label="Notifications"`
 *   role="status"     — applied to each toast (non-blocking polite announce)
 *   aria-live         — "polite" for default; "assertive" for error variants
 *   aria-label        — Defaults to "Dismiss notification" on `<kj-toast-close>`
 *   data-variant      — Mirrors the toast variant for theme hooks
 *
 * @doc-touch
 *   The dismiss button defaults to a 32px hit area at `md` density — wrap
 *   icon-only close buttons with extra padding or label text to reach the
 *   WCAG 2.5.5 floor on touch-first surfaces.
 *
 * @doc-a11y
 *   Implements the toast pattern from ARIA APG. Each toast is a polite live
 *   region so AT users hear the title without losing their place. Error /
 *   warning variants escalate to `aria-live="assertive"` per theme. Focus is
 *   never stolen — the user keeps typing while toasts arrive in the viewport.
 *
 * @doc-related dialog,alert,spinner
 *
 * @doc-css-var
 *   --kj-toast-z-index  — Stack level for the viewport. Default 1000; raise above app overlays.
 *   --kj-toast-gap      — Vertical gap between stacked toasts in both collapsed and expanded states.
 *
 * @doc-category Library/Overlay
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
