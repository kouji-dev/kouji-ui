/* CSS DELIVERY — no `styleUrl` in this file, on purpose.
 *
 * `toast.css` reaches the document exactly once, through
 * `src/overlay/overlay.css`, which every consumer registers (see that
 * file's header and the Getting Started page). It has to be a registered
 * global sheet because the panels are rendered by HEADLESS `@kouji-ui/core`
 * directives, which carry no styles and are usable with no wrapper
 * component on the page at all.
 *
 * These components used to `styleUrl` the same file as well. Under
 * `ViewEncapsulation.None` that adds nothing to the cascade — same rules,
 * same layer — it just ships the bytes a second time inside the component
 * chunk (styles F-21 / lazy F-5). `overlay-styles.spec.ts` fails if a
 * `styleUrl` comes back.
 */
import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  inject,
  input,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  KjToastViewport,
  KjToast,
  KjToastClose,
  KjTranslateService,
} from '@kouji-ui/core';
import type { KjToastVariant } from '@kouji-ui/core';

/**
 * Toast suite shell. Hosts the documentation page for the toast service +
 * viewport + close button trio. Use `KjToastService.show()` to enqueue a
 * toast, mount `<kj-toast-viewport>` near your trigger, and place
 * `<kj-toast>` / `<kj-toast-close>` inside the per-call `<ng-template>`.
 *
 * @doc
 * @doc-name toast
 * @doc-description Themed toast queue: a service-enqueued notification rendered into a named viewport landmark.
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
 *   Tab          — Reaches the dismiss + action buttons inside a toast, in DOM order
 *   Enter|Space  — Activates the focused action / close button inside a toast
 *
 *   A toast never takes focus and the library binds no global key: F6 and
 *   Escape are the host app's to wire if it wants them.
 *
 * @doc-aria
 *   role="region"     — applied to `<kj-toast-viewport>` with `aria-label="Notifications"`; the viewport itself is not a live region, so each toast is announced exactly once
 *   role="status"     — applied to each toast (implicit polite live region); `role="alert"` (assertive) for the destructive variant
 *   aria-atomic       — "true" on each toast so the whole message is read together
 *   aria-label        — Defaults to "Dismiss notification" on `<kj-toast-close>`
 *   data-variant      — Mirrors the toast variant for theme hooks
 *
 * @doc-touch
 *   The dismiss button defaults to a 32px hit area at `md` density — wrap
 *   icon-only close buttons with extra padding or label text to reach the
 *   WCAG 2.5.5 floor on touch-first surfaces.
 *
 * @doc-a11y
 *   Implements the toast pattern from ARIA APG. Each toast is its own live
 *   region (`status`, or `alert` for destructive) so AT users hear the message
 *   without losing their place, and the viewport is only a named landmark —
 *   one live-region level, one announcement per toast (WCAG 4.1.3). Focus is
 *   never stolen — the user keeps typing while toasts arrive in the viewport.
 *
 * @doc-related dialog,alert,spinner
 *
 * @doc-css-var
 *   --kj-toast-z-index  — Stack level for the `<kj-toast-viewport>` queue. Default 2000 — above the overlay stack (dialogs, palettes, popovers start at 1000), so queued toasts show on top. A toast opened through `KjOverlayBuilder` / `KjToastService.show({ component })` is stacked by the overlay stack instead (`--kj-overlay-z`), so a dialog opened after it paints above it.
 *   --kj-toast-gap      — Vertical gap between stacked toasts in both collapsed and expanded states.
 *
 * @doc-category Library/Overlay
 */
@Component({
  selector: 'kj-toast-wrapper',
  standalone: true,
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjToastWrapper {}

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
      [attr.aria-label]="regionLabel()"
    >
      @for (r of vp.renderable(); track r.id) {
        <li>
          <ng-container *ngTemplateOutlet="r.template; context: r.context" />
        </li>
      }
    </ol>
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjToastViewportComponent {
  /**
   * Accessible name of the `role="region"` landmark, from the i18n catalog
   * (`toast.region`) — cust F-7: no assistive string is baked into this
   * template.
   */
  protected readonly regionLabel = inject(KjTranslateService).translation('toast.region');
}

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
  /** Intent preset driving the toast's chrome and live-region politeness. Defaults to `'default'`. */
  readonly variant = input<KjToastVariant>('default');

  /** The queue id of this toast, forwarded to the dismiss button. Defaults to `''`. */
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
