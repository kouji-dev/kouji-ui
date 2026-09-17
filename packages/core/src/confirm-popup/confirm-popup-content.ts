import {
  Directive,
  PLATFORM_ID,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { KjOverlayController } from '../primitives/overlay/controller';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import { KJ_OVERLAY_PANEL_ROLE } from '../primitives/overlay/tokens';
import { KjPopoverContent } from '../popover/popover-content';
import {
  KJ_CONFIRM_POPUP,
} from './confirm-popup.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * The floating confirm popup panel. Composes `kj-popover-content` (a
 * component) so the entire transport — portal mount, anchor positioning
 * with flip / shift, outside-click and Escape close, focus restoration —
 * is reused.
 *
 * Layered on top: promotes the panel role from `dialog` to `alertdialog`
 * (per WAI-ARIA APG, `alertdialog` causes assistive tech to interrupt and
 * announce the panel — the right semantic for a destructive confirmation)
 * by providing `KJ_OVERLAY_PANEL_ROLE` on the same element, so
 * `KjOverlayPanel` renders it from the first paint; states `aria-modal="false"`
 * explicitly (an alert dialog that leaves the page reachable — the same
 * declarative override the date-picker calendar uses); wires
 * `aria-describedby` to the projected `[kjConfirmPopupMessage]` as a host
 * binding; and moves initial focus to the configured default-focus button
 * (cancel by default, WCAG 3.3.4 *Error Prevention*) once the overlay is
 * open.
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
 * @doc-category Core/Overlay
 */
@Directive({
  selector: '[kjConfirmPopupContent]',
  standalone: true,
  exportAs: 'kjConfirmPopupContent',
  // Resolved by the composed `KjOverlayPanel` on this very element, after
  // `<kj-popover-content>`'s own `'dialog'` provider — the panel's `role`
  // host binding is the single writer of the attribute.
  providers: [{ provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'alertdialog' as const }],
  host: {
    '[attr.aria-modal]': '"false"',
    '[attr.aria-describedby]': 'ctx.messageId',
  },
})
export class KjConfirmPopupContent {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly ctx = injectParent(KJ_CONFIRM_POPUP, { child: 'KjConfirmPopupContent', parent: '[kjConfirmPopup]' });
  /**
   * The panel this directive is layered on (`<kj-popover-content>` composes
   * `KjOverlayPanel` as a host directive, so it lives on this very element).
   * `self: true` keeps the lookup from walking up to an enclosing overlay —
   * e.g. a `<kj-dialog>` — whose panel would be focused instead.
   */
  private readonly _panel = inject(KjOverlayPanel, { self: true, optional: true });
  private get controller(): KjOverlayController | null {
    return this._panel?.controller ?? null;
  }
  /** Optional reference — present when the host is `<kj-popover-content>`. */
  private readonly popoverContent = inject(KjPopoverContent, { self: true, optional: true });

  constructor() {
    if (!this.isBrowser) return;
    // Initial focus once the overlay has finished opening — a browser
    // ignores `focus()` on a panel that is still hidden.
    effect(() => {
      if (this.controller?.state() !== 'open') return;
      untracked(() => this.focusDefault());
    });
    // Touch the optional popover-content reference so unused-variable lint
    // stays quiet in the no-op branch.
    void this.popoverContent;
  }

  private focusDefault(): void {
    const panel = this.controller?.panelEl();
    if (!panel) return;
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
