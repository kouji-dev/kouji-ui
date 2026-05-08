import {
  DestroyRef,
  Directive,
  PLATFORM_ID,
  effect,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { KjOverlayController } from '../primitives/overlay/controller';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import { KjPopoverContent } from '../popover/popover-content';
import {
  KJ_CONFIRM_POPUP,
  type KjConfirmPopupContext,
} from './confirm-popup.context';

/**
 * The floating confirm popup panel. Composes `kj-popover-content` (a
 * component) so the entire transport — portal mount, anchor positioning
 * with flip / shift, outside-click and Escape close, focus restoration —
 * is reused.
 *
 * Layered on top: promotes the panel role from `dialog` to `alertdialog`
 * (per WAI-ARIA APG, `alertdialog` causes assistive tech to interrupt and
 * announce the panel — the right semantic for a destructive confirmation),
 * keeps `aria-modal="false"`, wires `aria-describedby` to the projected
 * `[kjConfirmPopupMessage]`, and moves initial focus to the configured
 * default-focus button (cancel by default, WCAG 3.3.4 *Error Prevention*).
 *
 * **Note (overlay primitives migration):** `KjPopoverContent` is now a
 * component (not a directive); use the `<kj-popover-content>` selector for
 * the actual panel and apply this directive on the same element to layer
 * the alertdialog promotion.
 *
 * ```html
 * <kj-popover-content kjConfirmPopupContent [kjFor]="t">
 *   <p kjConfirmPopupMessage>Delete this row?</p>
 *   <button kjConfirmPopupCancel>Cancel</button>
 *   <button kjConfirmPopupAction>Delete</button>
 * </kj-popover-content>
 * ```
 *
 * @category Core/Overlay
 */
@Directive({
  selector: '[kjConfirmPopupContent]',
  standalone: true,
  exportAs: 'kjConfirmPopupContent',
})
export class KjConfirmPopupContent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ctx = inject<KjConfirmPopupContext>(KJ_CONFIRM_POPUP);
  private readonly _panel = inject(KjOverlayPanel, { optional: true });
  private get controller(): KjOverlayController | null {
    return this._panel?.controller ?? null;
  }
  /** Optional reference — present when the host is `<kj-popover-content>`. */
  private readonly popoverContent = inject(KjPopoverContent, { self: true, optional: true });

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    let lastOpen = false;
    const eff = effect(() => {
      const open = this.ctx.open();
      if (open && !lastOpen) {
        lastOpen = true;
        queueMicrotask(() => this.promoteRole());
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(() => this.focusDefault());
        }
      } else if (!open && lastOpen) {
        lastOpen = false;
      }
    });
    this.destroyRef.onDestroy(() => eff.destroy());
    // Touch the optional popover-content reference so unused-variable lint
    // stays quiet in the no-op branch.
    void this.popoverContent;
  }

  private findPanel(): HTMLElement | null {
    return this.controller?.panelEl() ?? null;
  }

  private promoteRole(): void {
    const panel = this.findPanel();
    if (!panel) return;
    panel.setAttribute('role', 'alertdialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-describedby', this.ctx.messageId);
  }

  private focusDefault(): void {
    const panel = this.findPanel();
    if (!panel) return;
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
