import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  input,
} from '@angular/core';
import {
  KjAlert,
  KjAlertActions,
  KjAlertDescription,
  KjAlertDismiss,
  KjAlertIcon,
  KjAlertTitle,
  KjIconDirective,
} from '@kouji-ui/core';
import type { KjAlertMode } from '@kouji-ui/core';

/**
 * Styled wrapper around the `KjAlert` directive family. Provides the
 * persistent in-flow notification surface (severity-aware chrome, severity
 * border accent, banner mode, dismiss button). Visibility is consumer-managed
 * — bind a signal via `@if` and clear it from `(kjAlertDismissed)`.
 *
 * Re-exposes `KjAlert`'s contract directly (variant, size, mode, static, role)
 * with no new wrapper-layer inputs. Severity defaults: `error` → assertive,
 * others → polite, `kjAlertStatic` → static region.
 *
 * @example
 * ```html
 * <kj-alert kjVariant="error" (kjAlertDismissed)="show.set(false)">
 *   <kj-alert-icon />
 *   <kj-alert-title>Could not save draft</kj-alert-title>
 *   <kj-alert-description>Network request timed out — retry?</kj-alert-description>
 *   <kj-alert-actions>
 *     <kj-button (click)="retry()">Retry</kj-button>
 *   </kj-alert-actions>
 *   <kj-alert-dismiss />
 * </kj-alert>
 * ```
 * @doc-example Default
 *   The default playground — `info` severity with icon, title, and description.
 *   @doc-file alert.example.ts
 * @doc-example Usage
 *   A walkthrough of the common shapes — severity variants, dismissible flow,
 *   and an action button row. Use this as the copy-paste starting point.
 *   @doc-file alert.usage.example.ts
 * @doc-example Variants
 *   Info / success / warning / error — severity drives the stripe and icon tint.
 *   @doc-file alert.variants.example.ts
 * @doc-example Dismissible
 *   Project `<kj-alert-dismiss>` and listen to `(kjAlertDismissed)` to clear.
 *   @doc-file alert.dismissible.example.ts
 * @doc-example With actions
 *   Drop `<kj-button>`s inside `<kj-alert-actions>` for retry / view-details flows.
 *   @doc-file alert.with-actions.example.ts
 * @doc-example Static banner
 *   `kjAlertStatic` removes the live region — use for page-persistent notices.
 *   @doc-file alert.banner.example.ts
 *
 * @doc-keyboard
 *   Tab           — Moves focus through interactive children (actions, dismiss)
 *   Enter|Space   — Activates the focused dismiss button or action
 *
 * @doc-aria
 *   role            — `alert` for error severity (assertive), `status` otherwise (polite); `kjAlertStatic` switches to `region`
 *   aria-live       — `assertive` for error, `polite` for info/success/warning
 *   aria-labelledby — Wired to the title id when `<kj-alert-title>` is projected
 *   aria-describedby — Wired to the description id when `<kj-alert-description>` is projected
 *   data-variant    — Mirrors the severity for theme/scope hooks
 *
 * @doc-touch
 *   The dismiss button defaults to `size="icon"` (44×44) so it meets WCAG 2.5.5
 *   out of the box. Action buttons inherit `<kj-button>` size rules.
 *
 * @doc-a11y
 *   Severity drives the live region politeness so screen readers announce
 *   errors immediately but don't interrupt for routine info. Dismiss is a
 *   real `<button>` with `aria-label="Dismiss"`; consumers can swap the
 *   label via `kjAlertDismissLabel`. Decorative icons are `aria-hidden="true"`.
 *
 * @doc-related toast,dialog,banner
 *
 * @doc-css-var
 *   --kj-alert-bg            — Background fill. Defaults to --kj-bg-body.
 *   --kj-alert-fg            — Foreground (body text) color. Defaults to --kj-fg-default.
 *   --kj-alert-border-color  — Outer border color. Defaults to --kj-border-default.
 *   --kj-alert-accent        — Severity stripe + icon + title color. Variants set this per severity.
 *   --kj-alert-radius        — Corner radius. Inherits --kj-radius-box.
 *   --kj-alert-padding-x     — Horizontal padding. Sizes override.
 *   --kj-alert-padding-y     — Vertical padding. Sizes override.
 *   --kj-alert-gap           — Gap between icon, body, and actions.
 *   --kj-alert-font-size     — Body font size. Sizes override.
 *
 * @doc-category Library/Feedback
 * @doc
 * @doc-name alert
 * @doc-description Themed in-flow notification with severity variants, optional dismiss button, and action slots.
 * @doc-is-main
 */
@Component({
  selector: 'kj-alert',
  standalone: true,
  hostDirectives: [
    {
      directive: KjAlert,
      inputs: [
        'kjVariant',
        'kjSize',
        'kjAlertMode',
        'kjAlertStatic',
        'kjAlertRole',
      ],
      outputs: ['kjAlertDismissed'],
    },
  ],
  template: `
    <ng-content select="[kjAlertIcon],kj-alert-icon" />
    <div class="kj-alert__body">
      <ng-content select="[kjAlertTitle],kj-alert-title" />
      <ng-content select="[kjAlertDescription],kj-alert-description" />
      <ng-content />
    </div>
    <ng-content select="[kjAlertActions],kj-alert-actions" />
    <ng-content select="[kjAlertDismiss],kj-alert-dismiss" />
  `,
  styleUrl: './alert.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-alert' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAlertComponent {
  // Inputs are forwarded via `hostDirectives.inputs` above. Re-declared here
  // only to surface them in the docs extractor (which inspects the wrapper
  // class). The actual signal lives on the composed directive.
  readonly kjVariant = input<string>('info');
  readonly kjSize = input<string>('md');
  readonly kjAlertMode = input<KjAlertMode | undefined>(undefined);
  readonly kjAlertStatic = input(false, { transform: booleanAttribute });
  readonly kjAlertRole = input<string | undefined>(undefined);
}

/**
 * Decorative icon slot inside `<kj-alert>`. Wraps `KjAlertIcon` so it picks
 * up `aria-hidden="true"` and `data-variant` from the parent alert context.
 *
 * @doc-category Library/Feedback
 * @doc
 * @doc-name alert
 */
@Component({
  selector: 'kj-alert-icon',
  standalone: true,
  hostDirectives: [KjAlertIcon],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-alert__icon' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAlertIconComponent {}

/**
 * Title for the alert. Apply to a heading element (or rely on the wrapper —
 * the wrapper defaults to a `<strong>`-styled element via CSS, but consumers
 * SHOULD use `<h3 kjAlertTitle>` when the alert lives in a content region).
 *
 * @doc-category Library/Feedback
 * @doc
 * @doc-name alert
 */
@Component({
  selector: 'kj-alert-title',
  standalone: true,
  hostDirectives: [KjAlertTitle],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-alert__title' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAlertTitleComponent {}

/**
 * Description body for the alert. Wires `aria-describedby` via `KjAlertDescription`.
 *
 * @doc-category Library/Feedback
 * @doc
 * @doc-name alert
 */
@Component({
  selector: 'kj-alert-description',
  standalone: true,
  hostDirectives: [KjAlertDescription],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-alert__description' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAlertDescriptionComponent {}

/**
 * Container for action buttons (Retry, View details, …). Sets `role="group"`
 * with an overridable `aria-label`. Compose `<kj-button>` instances inside.
 *
 * @doc-category Library/Feedback
 * @doc
 * @doc-name alert
 */
@Component({
  selector: 'kj-alert-actions',
  standalone: true,
  hostDirectives: [{ directive: KjAlertActions, inputs: ['kjAlertActionsLabel'] }],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-alert__actions' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAlertActionsComponent {
  readonly kjAlertActionsLabel = input<string>('Alert actions');
}

/**
 * Dismiss button. Renders a real `<button kjAlertDismiss>` so the directive
 * picks up the full `KjButton` chrome (focus ring, ARIA-disabled). Default
 * content is `×`; override via projected content. Place inside `<kj-alert>`.
 *
 * @doc-category Library/Feedback
 * @doc
 * @doc-name alert
 */
@Component({
  selector: 'kj-alert-dismiss',
  standalone: true,
  imports: [KjAlertDismiss, KjIconDirective],
  template: `<button
    type="button"
    kjAlertDismiss
    class="kj-alert__dismiss"
    [kjAlertDismissLabel]="kjAlertDismissLabel()"
    [kjAlertDismissVariant]="kjAlertDismissVariant()"
    [kjAlertDismissSize]="kjAlertDismissSize()"
  ><ng-content><i kjIcon="x"></i></ng-content></button>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAlertDismissComponent {
  readonly kjAlertDismissLabel = input<string>('Dismiss');
  readonly kjAlertDismissVariant = input<string>('ghost');
  readonly kjAlertDismissSize = input<string>('icon');
}
