import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
} from '@angular/core';
import {
  KjConfirmPopup,
  KjConfirmPopupAction,
  KjConfirmPopupCancel,
  KjConfirmPopupContent,
  KjConfirmPopupMessage,
  KjConfirmPopupTrigger,
  KjPopoverContent,
  type KjOverlayTriggerLike,
} from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjConfirmPopup` state-container
 * directive. Composes the core directive via `hostDirectives` and forwards
 * every confirm-popup input under its `kj`-prefixed name. The host renders
 * with `display: contents` so it never interferes with the consumer's layout.
 *
 * Pair with `<kj-confirm-popup-trigger>` for the activator (typically the
 * destructive button) and `<kj-confirm-popup-content>` (placed inside an
 * `<ng-template>`) for the floating panel.
 *
 * @doc
 * @doc-name confirm-popup
 * @doc-is-main
 * @doc-example Default
 *   The simplest anchored confirmation — a trigger button with a yes/no panel.
 *   @doc-file confirm-popup.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common confirm-popup usages — destructive and
 *   benign variants with `(kjResult)` handling.
 *   @doc-file confirm-popup.usage.example.ts
 * @doc-example Destructive
 *   `[kjDestructive]="true"` tints the action button and announces an `alertdialog`.
 *   @doc-file confirm-popup.destructive.example.ts
 * @doc-example With message
 *   A descriptive paragraph projected as the panel's accessible description.
 *   @doc-file confirm-popup.with-message.example.ts
 * @doc-example Placement
 *   Anchor side and offset overrides for tight layouts.
 *   @doc-file confirm-popup.placement.example.ts
 *
 * @doc-keyboard
 *   Enter|Space — Opens the popup from the trigger
 *   Escape      — Closes the popup, resolves `false`, restores focus to the trigger
 *   Tab         — Cycles between the cancel and action buttons (focus trap)
 *   Shift+Tab   — Cycles backward
 *
 * @doc-aria
 *   role           — "alertdialog" when destructive, "dialog" otherwise
 *   aria-modal     — "true" while open
 *   aria-labelledby — Wire to the heading id when you project one
 *   aria-describedby — Auto-wired to the `<kj-confirm-popup-message>` id
 *   data-state     — Reflects "open" / "closed" for animation hooks
 *
 * @doc-css-var
 *   --kj-confirm-popup-bg            — Panel background fill. Defaults to --kj-bg-elevated.
 *   --kj-confirm-popup-fg            — Foreground text color. Defaults to --kj-fg-default.
 *   --kj-confirm-popup-border-color  — Border color around the panel. Defaults to --kj-border-default.
 *   --kj-confirm-popup-radius        — Corner radius of the panel. Inherits --kj-radius-box.
 *   --kj-confirm-popup-padding-x     — Horizontal inset of panel content.
 *   --kj-confirm-popup-padding-y     — Vertical inset of panel content.
 *   --kj-confirm-popup-shadow        — Box shadow under the floating panel. Defaults to --kj-shadow-md.
 *
 * @doc-touch
 *   The trigger inherits its host button's touch target. The action and cancel
 *   buttons should use `kj-button` `size="md"` or larger (≥ 44px) per WCAG 2.5.5.
 *
 * @doc-a11y
 *   Built on the WAI-ARIA `alertdialog` pattern. Cancel receives initial focus
 *   by default (WCAG 3.3.4 *Error Prevention*) — flip via `[kjDefaultFocus]`.
 *   Focus is trapped inside the panel while open and restored to the trigger
 *   on dismiss. Outside-clicks and Escape both resolve the popup with `false`,
 *   so consumers can treat any dismissal as cancellation.
 *
 * @doc-related dialog,popover,tooltip
 *
 * @doc-category Library/Overlay
 */
@Component({
  selector: 'kj-confirm-popup',
  standalone: true,
  // Only forward inputs that KjConfirmPopup declares DIRECTLY (not those
  // inherited through its own nested hostDirectives [KjPopover]). Angular
  // cannot chain nested hostDirectives input forwarding.
  hostDirectives: [
    {
      directive: KjConfirmPopup,
      inputs: [
        'kjDestructive',
        'kjDefaultFocus',
      ],
      outputs: [
        'kjConfirmed',
        'kjCancelled',
        'kjResult',
      ],
    },
  ],
  template: `<ng-content />`,
  styleUrl: './confirm-popup.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-confirm-popup',
    style: 'display: contents;',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjConfirmPopupComponent {}

/**
 * Styled wrapper around `KjConfirmPopupTrigger`.
 *
 * Place inside a `<kj-confirm-popup>` for the compound shape, or use it
 * standalone with `[kjConfirmPopupTriggerFor]` pointing at an `<ng-template>`
 * containing the popup content for the flat trigger-for shape.
 *
 * The host renders with `display: contents` so the projected `<button>` (or
 * `<kj-button>`) is the actual interactive trigger and inherits the
 * directive's ARIA wiring (`aria-haspopup="dialog"`, `aria-expanded`,
 * `aria-controls`).
 *
 * @doc-category Library/Overlay
 */
@Component({
  selector: 'kj-confirm-popup-trigger',
  standalone: true,
  hostDirectives: [KjConfirmPopupTrigger],
  template: `<ng-content />`,
  styleUrl: './confirm-popup.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-confirm-popup-trigger',
    style: 'display: contents;',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjConfirmPopupTriggerComponent {}

/**
 * Styled wrapper around the structural `KjConfirmPopupContent` directive.
 *
 * Place inside an `<ng-template>` (compound shape) or referenced via
 * `[kjConfirmPopupTriggerFor]` (flat shape). The wrapper renders an inner
 * `<ng-template kjPopoverContent kjConfirmPopupContent>` and forwards the
 * projected content into the portal-mounted overlay panel —
 * `role="alertdialog"` and the family's keyboard / outside-click coordination
 * come from the underlying directives.
 *
 * @doc-category Library/Overlay
 */
@Component({
  selector: 'kj-confirm-popup-content',
  standalone: true,
  imports: [KjPopoverContent, KjConfirmPopupContent],
  template: `
    <kj-popover-content [kjFor]="kjFor()" kjConfirmPopupContent [class]="resolvedPanelClass()">
      <ng-content />
    </kj-popover-content>
  `,
  styleUrl: './confirm-popup.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-confirm-popup-content-host',
    style: 'display: contents;',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjConfirmPopupContentComponent {
  /** Anchor — the `[kjConfirmPopupTrigger]` template reference. */
  readonly kjFor = input.required<KjOverlayTriggerLike>();
  /** Optional class hook for the body-level overlay container. */
  readonly kjPanelClass = input<string | string[]>('');

  /**
   * Always include the `kj-confirm-popup-content` class on the panel so the
   * styled wrapper CSS lands on the floating box. Consumer-provided classes
   * are concatenated.
   */
  readonly resolvedPanelClass = computed<string>(() => {
    const out: string[] = ['kj-confirm-popup-content'];
    const c = this.kjPanelClass();
    if (Array.isArray(c)) {
      for (const v of c) if (v) out.push(v);
    } else if (c) {
      out.push(c);
    }
    return out.join(' ');
  });
}

/**
 * Marks the message body inside `<kj-confirm-popup-content>`. Generates an
 * auto-id and registers it with the popup so `aria-describedby` on the panel
 * is wired automatically. Required for accessibility (WAI-ARIA `alertdialog`
 * pattern requires a description).
 *
 * @doc-category Library/Overlay
 */
@Component({
  selector: 'kj-confirm-popup-message',
  standalone: true,
  hostDirectives: [KjConfirmPopupMessage],
  template: `<ng-content />`,
  styleUrl: './confirm-popup.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-confirm-popup-message' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjConfirmPopupMessageComponent {}

/**
 * Confirm action button slot. Click resolves the popup with `true`, emits
 * `(kjConfirmed)` on the parent `<kj-confirm-popup>`. The styled wrapper
 * adds the `kj-confirm-popup-action` class — pair with `<kj-button>` for
 * the destructive variant when the popup is destructive.
 *
 * @doc-category Library/Overlay
 */
@Component({
  selector: 'kj-confirm-popup-action',
  standalone: true,
  hostDirectives: [KjConfirmPopupAction],
  template: `<ng-content />`,
  styleUrl: './confirm-popup.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-confirm-popup-action',
    style: 'display: contents;',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjConfirmPopupActionComponent {}

/**
 * Cancel action button slot. Click resolves the popup with `false`, emits
 * `(kjCancelled)` on the parent `<kj-confirm-popup>`. Receives initial focus
 * by default — WCAG 3.3.4 *Error Prevention*.
 *
 * @doc-category Library/Overlay
 */
@Component({
  selector: 'kj-confirm-popup-cancel',
  standalone: true,
  hostDirectives: [KjConfirmPopupCancel],
  template: `<ng-content />`,
  styleUrl: './confirm-popup.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-confirm-popup-cancel',
    style: 'display: contents;',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjConfirmPopupCancelComponent {}

/**
 * Convenience container for the action button row. Pure styling hook — the
 * semantic comes from the `<kj-confirm-popup-action>` and
 * `<kj-confirm-popup-cancel>` slots inside.
 *
 * @doc-category Library/Overlay
 */
@Component({
  selector: 'kj-confirm-popup-actions',
  standalone: true,
  template: `<ng-content />`,
  styleUrl: './confirm-popup.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-confirm-popup-actions' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjConfirmPopupActionsComponent {}
