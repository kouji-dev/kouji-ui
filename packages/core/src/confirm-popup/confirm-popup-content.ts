import {
  DestroyRef,
  Directive,
  PLATFORM_ID,
  effect,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { KjPopoverContent } from '../popover/popover-content';
import { KjPopoverController } from '../popover/popover.controller';
import {
  KJ_CONFIRM_POPUP,
  type KjConfirmPopupContext,
} from './confirm-popup.context';

/**
 * The floating confirm popup panel. Composes `KjPopoverContent` via
 * `hostDirectives` for the entire transport — portal mount, anchor
 * positioning with flip / shift, outside-click and Escape close, focus
 * restoration on close.
 *
 * Layered on top: **promotes the panel role from `dialog` to `alertdialog`**
 * (per WAI-ARIA APG, `alertdialog` causes assistive tech to interrupt and
 * announce the panel — the right semantic for a destructive confirmation),
 * keeps `aria-modal="false"` (the page is not blocked), wires
 * `aria-describedby` to the projected `[kjConfirmPopupMessage]`, and moves
 * initial focus to the configured default-focus button (cancel by default,
 * WCAG 3.3.4 *Error Prevention*).
 *
 * Apply as a structural directive on an `<ng-template>`:
 *
 * ```html
 * <ng-template kjConfirmPopupContent>
 *   <p kjConfirmPopupMessage>Delete this row?</p>
 *   <button kjConfirmPopupCancel>Cancel</button>
 *   <button kjConfirmPopupAction>Delete</button>
 * </ng-template>
 * ```
 *
 * @category Core/Actions
 * @doc
 * @doc-name confirm-popup
 */
@Directive({
  selector: '[kjConfirmPopupContent]',
  standalone: true,
  exportAs: 'kjConfirmPopupContent',
  hostDirectives: [
    {
      directive: KjPopoverContent,
      inputs: [
        'kjAriaLabel',
        'kjAriaDescribedBy',
        'kjCloseOnEsc',
        'kjCloseOnOutsideClick',
        'kjCloseOnOutsideFocus',
        'kjPanelClass',
      ],
    },
  ],
})
export class KjConfirmPopupContent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ctx = inject<KjConfirmPopupContext>(KJ_CONFIRM_POPUP);
  /** The popover controller in the same injector as the host directive. */
  private readonly popoverController = inject(KjPopoverController);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    let lastOpen = false;
    const eff = effect(() => {
      const open = this.ctx.open();
      if (open && !lastOpen) {
        lastOpen = true;
        // Promote ARIA semantics as soon as the panel is mounted — runs in a
        // microtask so it lands before the popover's auto-focus rAF and AT
        // sees `role="alertdialog"` from the first announcement.
        queueMicrotask(() => this.promoteRole());
        // Override the auto-focus that the popover content schedules. Both
        // run in `requestAnimationFrame`; ours queues after, so it wins.
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(() => this.focusDefault());
        }
      } else if (!open && lastOpen) {
        lastOpen = false;
      }
    });
    this.destroyRef.onDestroy(() => eff.destroy());
  }

  private findPanel(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    return document.getElementById(this.popoverController.popoverId);
  }

  /** Promote the panel role to `alertdialog` and wire `aria-describedby`. */
  private promoteRole(): void {
    const panel = this.findPanel();
    if (!panel) return;
    panel.setAttribute('role', 'alertdialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-describedby', this.ctx.messageId);
  }

  /** Focus the configured default focus target inside the panel. */
  private focusDefault(): void {
    const panel = this.findPanel();
    if (!panel) return;
    // Re-promote: in case the popover's effect re-ran between the microtask
    // and this rAF (e.g. titleId registration), the role may have flipped
    // back to `dialog`. Cheap to re-apply.
    panel.setAttribute('role', 'alertdialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-describedby', this.ctx.messageId);

    const which = this.ctx.defaultFocus();
    const sel =
      which === 'cancel' ? '[kjConfirmPopupCancel]' : '[kjConfirmPopupAction]';
    const target = panel.querySelector<HTMLElement>(sel);
    if (!target) return;
    try {
      target.focus();
    } catch {
      /* ignore */
    }
  }
}
