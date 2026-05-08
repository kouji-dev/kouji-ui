import {
  DestroyRef,
  Directive,
  PLATFORM_ID,
  TemplateRef,
  ViewContainerRef,
  computed,
  effect,
  inject,
  input,
  isDevMode,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  KjOverlayRef,
  KjOverlayService,
} from '../primitives/overlay/overlay';
import {
  KJ_POPOVER,
  type KjPopoverContext,
} from './popover.context';
import { KjPopoverController } from './popover.controller';
import { KjPopover } from './popover';

/** Focusable selector — mirrors the one used by `KjFocusTrap`. */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

/**
 * The floating popover panel.
 *
 * **Structural directive** — apply with the asterisk syntax to an element
 * (or use `<ng-template kjPopoverContent>` directly):
 *
 * ```html
 * <ng-template kjPopoverContent>
 *   <h3 kjPopoverTitle>Profile</h3>
 *   <p>…</p>
 *   <button kjPopoverClose>Close</button>
 * </ng-template>
 * ```
 *
 * The panel is portal-mounted to `document.body` via
 * {@link KjOverlayService.createFromTemplate} on first open and disposed on
 * close — escaping any ancestor `overflow: hidden` / `transform` /
 * `clip-path` clipping container.
 *
 * Hosts `role="dialog"`. Reflects `aria-modal` from `kjModal`. Auto-wires
 * `aria-labelledby` to a projected `[kjPopoverTitle]`, falling back to
 * `kjAriaLabel`. Implements an inline focus-trap when modal (mirroring
 * {@link import('../a11y/focus-trap').KjFocusTrap}).
 *
 * Closes on Escape (when `kjCloseOnEsc=true`) and outside-click (when
 * `kjCloseOnOutsideClick=true`) via the global `KjOverlayService` stack
 * coordinator. Both close paths are cancellable through
 * `(kjCloseRequested)` on the parent `[kjPopover]` / `[kjPopoverTrigger]`.
 *
 * @category Core/Overlays
 * @doc
 * @doc-name popover
 */
@Directive({
  selector: '[kjPopoverContent]',
  standalone: true,
  exportAs: 'kjPopoverContent',
})
export class KjPopoverContent {
  private readonly tpl = inject(TemplateRef, { optional: true }) as
    | TemplateRef<unknown>
    | null;
  private readonly vcr = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly overlay = inject(KjOverlayService);

  /** Parent context. Required — content directive is meaningless without it. */
  private readonly ctx = inject<KjPopoverContext>(KJ_POPOVER);
  /** Controller — same injector tree as the parent state container. */
  private readonly controller = inject(KjPopoverController);
  /** Root popover — optional, only present in compound shape. */
  private readonly popover = inject(KjPopover, { optional: true });

  /**
   * Modality flag. `true` enables an inline focus-trap and `<body>`
   * scroll-lock, sets `aria-modal="true"`, and forces `kjCloseOnEsc=true`
   * (WCAG 2.1.2).
   */
  readonly kjModal = input<boolean>(false);

  /** Fallback accessible name when no `[kjPopoverTitle]` is projected. */
  readonly kjAriaLabel = input<string>('');

  /** Stacked describedby ids written to the panel's `aria-describedby`. */
  readonly kjAriaDescribedBy = input<string | string[]>('');

  /** Esc closes. Forced `true` when `kjModal=true`. */
  readonly kjCloseOnEsc = input<boolean>(true);

  /** Outside-click closes. */
  readonly kjCloseOnOutsideClick = input<boolean>(true);

  /** Outside-focus closes. Default `false`. */
  readonly kjCloseOnOutsideFocus = input<boolean>(false);

  /** Optional class hook for the body-level overlay container. */
  readonly kjPanelClass = input<string | string[]>('');

  /** Effective Esc-close (forced true when modal). */
  readonly effectiveCloseOnEsc = computed(
    () => this.kjModal() || this.kjCloseOnEsc(),
  );

  /** Resolved aria-labelledby from the parent's titleId, or null. */
  readonly ariaLabelledBy = computed(() => this.ctx.titleId());

  private overlayRef: KjOverlayRef | undefined;
  private panelEl: HTMLElement | undefined;
  private cleanupKeydown: (() => void) | undefined;
  private cleanupPositioning: (() => void) | undefined;

  constructor() {
    // Surface kjModal to the controller for cross-directive reads.
    effect(() => {
      this.controller.setModal(this.kjModal());
    });

    // Mount / unmount on `open` transition.
    effect(() => {
      const open = this.ctx.open();
      if (!isPlatformBrowser(this.platformId)) return;
      if (open && !this.overlayRef && !this.panelEl) {
        this.mount();
      } else if (!open && (this.overlayRef || this.panelEl)) {
        this.unmount();
      }
    });

    // Keep dynamic ARIA attributes in sync — `aria-labelledby` is set by
    // `[kjPopoverTitle]` post-mount, `data-side` / `data-align` may change
    // after collision-resolution from `KjAnchor`. Re-applies whenever any
    // tracked signal changes, but only if a panel is mounted.
    effect(() => {
      const panel = this.panelEl;
      const titleId = this.ctx.titleId();
      const side = this.ctx.kjPopoverSide();
      const align = this.ctx.kjPopoverAlign();
      const modal = this.kjModal();
      const label = this.kjAriaLabel().trim();
      const described = this.kjAriaDescribedBy();
      if (!panel) return;
      if (titleId) panel.setAttribute('aria-labelledby', titleId);
      else panel.removeAttribute('aria-labelledby');
      if (label) panel.setAttribute('aria-label', label);
      else panel.removeAttribute('aria-label');
      const ids = (Array.isArray(described) ? described : [described])
        .map((s) => s.trim())
        .filter(Boolean);
      if (ids.length) panel.setAttribute('aria-describedby', ids.join(' '));
      else panel.removeAttribute('aria-describedby');
      panel.setAttribute('aria-modal', modal ? 'true' : 'false');
      panel.setAttribute('data-side', side);
      panel.setAttribute('data-align', align);
    });

    // Dev warnings.
    if (isDevMode()) {
      effect(() => {
        if (this.kjModal() && !this.kjCloseOnEsc()) {
          console.warn(
            '[KjPopoverContent] kjModal=true forces kjCloseOnEsc=true (WCAG 2.1.2 No Keyboard Trap). ' +
            'For modal popovers that should not close on Escape consider [kjAlertDialog].',
          );
        }
      });

      effect(() => {
        if (!this.ctx.open()) return;
        if (this.ctx.titleId()) return;
        if (this.kjAriaLabel().trim()) return;
        console.warn(
          '[KjPopoverContent] popover has no accessible name. Project a ' +
          '[kjPopoverTitle] or set [kjAriaLabel] for screen-reader users.',
        );
      });
    }

    this.destroyRef.onDestroy(() => this.unmount());
  }

  private mount(): void {
    if (!this.tpl) {
      if (isDevMode()) {
        console.warn(
          '[KjPopoverContent] applied without a TemplateRef — must be used as a structural directive (`*kjPopoverContent` or `<ng-template kjPopoverContent>`).',
        );
      }
      return;
    }

    this.overlayRef = this.overlay.createFromTemplate(this.tpl, this.vcr);
    this.overlayRef.open();

    // Use the body-level overlay container as the panel root: it always
    // exists, the consumer's template content is inserted inside, and we
    // can apply `role="dialog"` to it without clobbering the consumer's
    // own root element role / heading semantics.
    const panel = this.overlayRef.el;
    this.panelEl = panel;
    this.applyPanelAttrs(panel);

    const cls = this.kjPanelClass();
    if (cls) {
      const list = Array.isArray(cls) ? cls : [cls];
      list.filter(Boolean).forEach((c) => panel.classList.add(c));
    }

    this.controller.registerWithStack({
      closeOnEsc: this.effectiveCloseOnEsc(),
      closeOnOutsideClick: this.kjCloseOnOutsideClick(),
      modal: this.kjModal(),
    });
    this.controller.registerPanel(panel);
    this.installKeydownListener(panel);
    this.installPositioning(panel);

    // Auto-focus after the next animation frame so layout has settled and
    // any [autofocus] children are focusable.
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => {
        if (!this.panelEl) return;
        this.controller.runOpenAutoFocus(this.panelEl);
      });
    } else {
      this.controller.runOpenAutoFocus(panel);
    }
  }

  private applyPanelAttrs(panel: HTMLElement): void {
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('id', this.ctx.popoverId);
    panel.setAttribute('tabindex', '-1');
    panel.setAttribute('aria-modal', this.kjModal() ? 'true' : 'false');

    const titleId = this.ariaLabelledBy();
    if (titleId) {
      panel.setAttribute('aria-labelledby', titleId);
    } else {
      panel.removeAttribute('aria-labelledby');
    }
    const label = this.kjAriaLabel().trim();
    if (label) {
      panel.setAttribute('aria-label', label);
    } else {
      panel.removeAttribute('aria-label');
    }

    const described = this.kjAriaDescribedBy();
    const describedIds = (Array.isArray(described) ? described : [described])
      .map((s) => s.trim())
      .filter(Boolean);
    if (describedIds.length) {
      panel.setAttribute('aria-describedby', describedIds.join(' '));
    } else {
      panel.removeAttribute('aria-describedby');
    }

    panel.setAttribute('data-state', 'open');
    panel.setAttribute('data-side', this.ctx.kjPopoverSide());
    panel.setAttribute('data-align', this.ctx.kjPopoverAlign());
  }

  /**
   * Install a capture-phase keydown listener on `document` to:
   * - Hint the close reason as `'escape'` so the cancellable close cycle
   *   reports the right reason (`KjOverlayService` coalesces Esc and
   *   outside-click through one `onClose` callback).
   * - Implement the modal focus-trap (Tab cycling within the panel).
   */
  /**
   * Connected positioning. Mirrors the manual engine in `KjAnchor` (no CDK)
   * applied directly to the panel so it works whether the panel is
   * portal-mounted or in-place. Re-runs on resize / scroll / panel resize.
   */
  private installPositioning(panel: HTMLElement): void {
    panel.style.position = 'fixed';
    panel.style.margin = '0';

    const reposition = () => {
      const trigger = this.controller.triggerElement();
      if (!trigger) return;
      const tr = trigger.getBoundingClientRect();
      const pr = panel.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const side = this.ctx.kjPopoverSide();
      const align = this.ctx.kjPopoverAlign();
      const offset = this.controller.defaults.offset;

      // Flip if needed (only when avoidCollisions is enabled).
      let resolved: typeof side = side;
      const avoidCollisions = this.popover?.kjAvoidCollisions() ?? true;
      const fits = (s: typeof side): boolean => {
        switch (s) {
          case 'top':    return tr.top    - offset - pr.height >= 0;
          case 'bottom': return tr.bottom + offset + pr.height <= vh;
          case 'left':   return tr.left   - offset - pr.width  >= 0;
          case 'right':  return tr.right  + offset + pr.width  <= vw;
        }
      };
      if (avoidCollisions && !fits(side)) {
        const opposite =
          side === 'top'    ? 'bottom' :
          side === 'bottom' ? 'top'    :
          side === 'left'   ? 'right'  : 'left';
        if (fits(opposite)) resolved = opposite;
      }

      const alignMain = (start: number, size: number, fSize: number): number => {
        switch (align) {
          case 'start':  return start;
          case 'end':    return start + size - fSize;
          case 'center': return start + (size - fSize) / 2;
        }
      };

      let top = 0;
      let left = 0;
      switch (resolved) {
        case 'top':
          top = tr.top - pr.height - offset;
          left = alignMain(tr.left, tr.width, pr.width);
          break;
        case 'bottom':
          top = tr.bottom + offset;
          left = alignMain(tr.left, tr.width, pr.width);
          break;
        case 'left':
          left = tr.left - pr.width - offset;
          top = alignMain(tr.top, tr.height, pr.height);
          break;
        case 'right':
          left = tr.right + offset;
          top = alignMain(tr.top, tr.height, pr.height);
          break;
      }

      // Shift on cross-axis to stay in viewport.
      if (resolved === 'top' || resolved === 'bottom') {
        left = Math.max(0, Math.min(left, vw - pr.width));
      } else {
        top = Math.max(0, Math.min(top, vh - pr.height));
      }

      panel.style.top = `${top}px`;
      panel.style.left = `${left}px`;
      panel.setAttribute('data-side', resolved);
    };

    // Initial pass + one rAF later (panel may not have measured yet).
    reposition();
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(reposition);
    }

    const onScrollOrResize = () => reposition();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);

    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(onScrollOrResize);
      resizeObserver.observe(panel);
      const tr = this.controller.triggerElement();
      if (tr) {
        try { resizeObserver.observe(tr); } catch { /* ignore */ }
      }
    }

    this.cleanupPositioning = () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
      resizeObserver?.disconnect();
    };
  }

  private installKeydownListener(panel: HTMLElement): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const onKey = (e: KeyboardEvent) => {
      if (!this.ctx.open()) return;

      if (e.key === 'Escape' && this.effectiveCloseOnEsc()) {
        this.controller.hintCloseReason('escape');
        return;
      }

      if (e.key === 'Tab' && this.kjModal()) {
        const focusable = (
          Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
        ).filter((el) => !el.closest('[hidden]'));

        if (!focusable.length) {
          e.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (e.shiftKey) {
          if (active === first || !panel.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last || !panel.contains(active)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    this.cleanupKeydown = () => document.removeEventListener('keydown', onKey, true);
  }

  private unmount(): void {
    this.cleanupKeydown?.();
    this.cleanupKeydown = undefined;
    this.cleanupPositioning?.();
    this.cleanupPositioning = undefined;

    if (this.overlayRef) {
      try {
        this.overlayRef.dispose();
      } catch {
        /* ignore */
      }
      this.overlayRef = undefined;
    }
    this.controller.registerPanel(null);
    this.panelEl = undefined;
  }
}
