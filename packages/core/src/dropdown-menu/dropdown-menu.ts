import {
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
  isDevMode,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  KjOverlayRef,
  KjOverlayService,
} from '../primitives/overlay/overlay';
import { KjRovingTabindex } from '../a11y/roving-tabindex';
import {
  KJ_DROPDOWN_MENU,
  type KjDropdownMenuContext,
} from './dropdown-menu.context';

/** Items + sub-triggers selector for type-ahead / focus discovery. */
const ITEM_SELECTOR =
  '[kjDropdownMenuItem]:not([data-disabled]),[kjDropdownMenuTriggerFor]:not([data-disabled])';

/**
 * The dropdown menu panel — `role="menu"`, portal-mounted to `<body>`.
 *
 * Apply as a structural directive on a `<ng-template>`, or as an attribute on
 * a host element that lives inside a `<ng-template>` referenced by a
 * `[kjDropdownMenuTriggerFor]`. The panel observes the trigger's open signal:
 * on open it mounts to `document.body` via `KjOverlayService`, anchors itself
 * to the trigger via `KjAnchor`, and registers with the global overlay-stack
 * so Escape and outside-click are coalesced through the topmost-only listener.
 *
 * Keyboard contract on the panel:
 *
 * - `ArrowDown` / `ArrowUp` — move focus to next / previous item (wraps).
 * - `Home` / `End` — first / last item.
 * - `Escape` — close, restore focus to trigger.
 * - `Tab` / `Shift+Tab` — close (focus continues naturally), reason `'tab'`.
 * - Printable character — type-ahead jump to next item starting with it.
 *
 * Composes:
 *
 * - `KjAnchor` for connected positioning (default `bottom` / `start`).
 * - `KjRovingTabindex` (vertical orientation, wrap=true) — items use the
 *   `[kjDropdownMenuItem]` directive which composes `[kjRovingTabindexItem]`.
 *
 * @category Core/Actions
 */
@Directive({
  selector: '[kjDropdownMenu]',
  standalone: true,
  exportAs: 'kjDropdownMenu',
  hostDirectives: [
    {
      directive: KjRovingTabindex,
      inputs: ['kjRovingOrientation'],
    },
  ],
})
export class KjDropdownMenu {
  private readonly tpl = inject(TemplateRef, { optional: true }) as
    | TemplateRef<unknown>
    | null;
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly vcr = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly overlay = inject(KjOverlayService);

  /** Parent context — the trigger directive provides this via `[kjDropdownMenuTriggerFor]`. */
  private readonly ctx = inject<KjDropdownMenuContext>(KJ_DROPDOWN_MENU);

  private overlayRef: KjOverlayRef | undefined;
  private panelEl: HTMLElement | undefined;
  private overlayHandle: ReturnType<KjOverlayService['register']> | undefined;
  private cleanupKeydown: (() => void) | undefined;
  /** Wrapper element appended to <body> when the panel is teleported. */
  private portalContainer: HTMLElement | undefined;

  constructor() {
    // Mount / unmount on open transition.
    effect(() => {
      const open = this.ctx.open();
      if (!isPlatformBrowser(this.platformId)) return;
      if (open && !this.overlayRef && !this.panelEl) {
        this.mount();
      } else if (!open && (this.overlayRef || this.panelEl)) {
        this.unmount();
      }
    });

    // Keep `data-state` synced; data-side / data-align are written by the
    // positioning code in `computePosition`.
    effect(() => {
      const panel = this.panelEl;
      if (!panel) return;
      panel.setAttribute('data-state', this.ctx.open() ? 'open' : 'closed');
    });

    this.destroyRef.onDestroy(() => this.unmount());
  }

  // ── Lifecycle ──────────────────────────────────────────────────────

  private mount(): void {
    if (this.tpl) {
      // Structural form: the directive lives on `<ng-template kjDropdownMenu>`.
      // Stamp the template into a body-level overlay container.
      this.overlayRef = this.overlay.createFromTemplate(this.tpl, this.vcr);
      this.overlayRef.open();
      this.panelEl = this.overlayRef.el;
    } else {
      // Attribute form: the directive lives on a `<div kjDropdownMenu>`
      // inside the trigger's projected `<ng-template>`. The host element
      // already exists in the DOM at the trigger's position; move it to a
      // body-level container so it escapes any clipping ancestor.
      const host = this.el.nativeElement;
      const container = document.createElement('div');
      container.setAttribute('data-kj-overlay', '');
      this.portalContainer = container;
      document.body.appendChild(container);
      container.appendChild(host);
      this.panelEl = host;
    }

    this.applyPanelAttrs(this.panelEl);
    this.registerWithStack();
    this.installKeydownListener();
    this.applyPositioning();

    // Initial focus moves to first / last item (per the trigger's request).
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => this.runOpenAutoFocus());
    } else {
      this.runOpenAutoFocus();
    }
  }

  private unmount(): void {
    this.cleanupKeydown?.();
    this.cleanupKeydown = undefined;

    this.overlayHandle?.unregister();
    this.overlayHandle = undefined;

    if (this.overlayRef) {
      try {
        this.overlayRef.dispose();
      } catch {
        /* ignore */
      }
      this.overlayRef = undefined;
    }
    if (this.portalContainer) {
      try {
        this.portalContainer.remove();
      } catch {
        /* ignore */
      }
      this.portalContainer = undefined;
    }
    this.panelEl = undefined;
  }

  private applyPanelAttrs(panel: HTMLElement): void {
    panel.setAttribute('role', 'menu');
    panel.setAttribute('id', this.ctx.panelId);
    panel.setAttribute('tabindex', '-1');
    panel.setAttribute('aria-orientation', 'vertical');
    panel.setAttribute('data-state', 'open');
    panel.setAttribute('data-side', this.ctx.side());
    panel.setAttribute('data-align', this.ctx.align());

    // The trigger has an accessible name (its visible text); use it.
    const trigger = this.ctx.triggerElement();
    if (trigger?.id) {
      panel.setAttribute('aria-labelledby', trigger.id);
    }
  }

  private registerWithStack(): void {
    if (!this.panelEl) return;
    this.overlayHandle = this.overlay.register(`kj-dropdown-menu-${this.ctx.panelId}`, {
      onClose: () => {
        // Reached via outside-click (overlay's pointerdown coordinator) or as
        // a backstop for Escape (the panel keydown listener in
        // `installKeydownListener` calls `ctx.hide('escape')` first; the
        // backstop is a no-op if already closed).
        this.ctx.hide('click-outside');
      },
      // Esc is handled directly by the panel keydown listener so we know the
      // close reason precisely. Disable the overlay-stack Esc dispatch to
      // avoid double-close.
      closeOnEsc: false,
      closeOnOutside: true,
    });
    this.overlay.markContentEl(`kj-dropdown-menu-${this.ctx.panelId}`, this.panelEl);
  }

  private installKeydownListener(): void {
    if (!this.panelEl) return;
    const panel = this.panelEl;
    const onKey = (e: KeyboardEvent) => {
      if (!this.ctx.open()) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.ctx.hide('escape');
        return;
      }

      if (e.key === 'Tab') {
        // Closing on Tab — let natural focus continue.
        this.ctx.hide('tab');
        return;
      }

      // Type-ahead within the panel for printable single-character keys.
      if (
        e.key.length === 1
        && !e.ctrlKey
        && !e.metaKey
        && !e.altKey
        && panel.contains(document.activeElement)
      ) {
        const items = this.getFocusableItems();
        if (!items.length) return;
        const char = e.key.toLowerCase();
        const current = items.indexOf(document.activeElement as HTMLElement);
        const match =
          items.find((it, i) =>
            i > current
              && (it.textContent ?? '').trim().toLowerCase().startsWith(char),
          )
          ?? items.find((it) =>
            (it.textContent ?? '').trim().toLowerCase().startsWith(char),
          );
        if (match) {
          e.preventDefault();
          match.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    this.cleanupKeydown = () =>
      document.removeEventListener('keydown', onKey, true);
  }

  private applyPositioning(): void {
    // Connected positioning. Mirrors the manual engine in `KjAnchor` (no CDK)
    // applied directly to the panel element so it works whether the panel is
    // a portal-mounted overlay container or an in-place attribute host.
    if (!this.panelEl) return;
    const trigger = this.ctx.triggerElement();
    if (!trigger) return;
    const panel = this.panelEl;
    const reposition = () => this.computePosition(panel, trigger);

    panel.style.position = 'fixed';
    reposition();

    const onScrollOrResize = () => reposition();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);

    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(onScrollOrResize);
      resizeObserver.observe(trigger);
      resizeObserver.observe(panel);
    }

    const cleanup = () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
      resizeObserver?.disconnect();
    };

    // Chain to the existing keydown cleanup so unmount tears down everything.
    const prev = this.cleanupKeydown;
    this.cleanupKeydown = () => {
      prev?.();
      cleanup();
    };
  }

  private computePosition(panel: HTMLElement, trigger: HTMLElement): void {
    const triggerRect = trigger.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const side = this.ctx.side();
    const align = this.ctx.align();
    const offset = this.ctx.offset();

    // Flip if needed.
    let resolvedSide = side;
    const fits = (s: typeof side): boolean => {
      switch (s) {
        case 'top':    return triggerRect.top - offset - panelRect.height >= 0;
        case 'bottom': return triggerRect.bottom + offset + panelRect.height <= vh;
        case 'left':   return triggerRect.left - offset - panelRect.width >= 0;
        case 'right':  return triggerRect.right + offset + panelRect.width <= vw;
      }
    };
    if (!fits(side)) {
      const opposite =
        side === 'top'    ? 'bottom' :
        side === 'bottom' ? 'top'    :
        side === 'left'   ? 'right'  : 'left';
      if (fits(opposite)) resolvedSide = opposite;
    }

    let left = 0;
    let top = 0;
    const alignMain = (start: number, size: number, floatSize: number): number => {
      switch (align) {
        case 'start':  return start;
        case 'end':    return start + size - floatSize;
        case 'center': return start + (size - floatSize) / 2;
      }
    };

    switch (resolvedSide) {
      case 'top':
        top = triggerRect.top - panelRect.height - offset;
        left = alignMain(triggerRect.left, triggerRect.width, panelRect.width);
        break;
      case 'bottom':
        top = triggerRect.bottom + offset;
        left = alignMain(triggerRect.left, triggerRect.width, panelRect.width);
        break;
      case 'left':
        left = triggerRect.left - panelRect.width - offset;
        top = alignMain(triggerRect.top, triggerRect.height, panelRect.height);
        break;
      case 'right':
        left = triggerRect.right + offset;
        top = alignMain(triggerRect.top, triggerRect.height, panelRect.height);
        break;
    }

    if (resolvedSide === 'top' || resolvedSide === 'bottom') {
      left = Math.max(0, Math.min(left, vw - panelRect.width));
    } else {
      top = Math.max(0, Math.min(top, vh - panelRect.height));
    }

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.setAttribute('data-side', resolvedSide);
    panel.setAttribute('data-align', align);
  }

  private getFocusableItems(): HTMLElement[] {
    if (!this.panelEl) return [];
    return Array.from(
      this.panelEl.querySelectorAll<HTMLElement>(ITEM_SELECTOR),
    ).filter((el) => !el.hasAttribute('disabled'));
  }

  private runOpenAutoFocus(): void {
    if (!this.panelEl) return;
    const mode = this.ctx.consumePendingFocus();
    if (mode === 'none') return;
    const items = this.getFocusableItems();
    if (!items.length) {
      this.panelEl.focus();
      return;
    }
    const target = mode === 'last' ? items[items.length - 1] : items[0];
    try {
      target.focus();
    } catch {
      /* ignore */
    }
    if (isDevMode() && !this.panelEl.querySelector('[role^="menuitem"]')) {
      console.warn(
        '[KjDropdownMenu] no [kjDropdownMenuItem] children found — the panel is empty.',
      );
    }
  }
}
