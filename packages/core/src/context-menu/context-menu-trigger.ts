import {
  DestroyRef,
  Directive,
  ElementRef,
  EmbeddedViewRef,
  PLATFORM_ID,
  TemplateRef,
  ViewContainerRef,
  booleanAttribute,
  effect,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  KJ_DROPDOWN_MENU,
  type KjDropdownMenuAlign,
  type KjDropdownMenuCloseReason,
  type KjDropdownMenuSide,
  nextDropdownMenuPanelId,
} from '../dropdown-menu/dropdown-menu.context';
import {
  KJ_CONTEXT_MENU,
  type KjContextMenuAnchorMode,
  type KjContextMenuContext,
  type KjContextMenuOpenEvent,
  type KjContextMenuOpenSource,
} from './context-menu.context';
import { KjContextMenuRegistry } from './context-menu.registry';

/**
 * Auto mode resolution for {@link KjContextMenuTrigger.kjAnchorMode}.
 * `'auto'` chooses by opener: pointer events use `'point'`, keyboard
 * events use `'rect'`.
 */
export type KjContextMenuAnchorModeInput = 'auto' | KjContextMenuAnchorMode;

/**
 * The context-menu trigger directive.
 *
 * Apply on the host element that should respond to right-click / long-press /
 * `Shift+F10` / `ContextMenu` key by opening a menu panel anchored at the
 * pointer (or, for keyboard openers, the host's bounding rect). Reuses the
 * existing `[kjDropdownMenu]` panel and `[kjDropdownMenuItem*]` items by
 * providing `KJ_DROPDOWN_MENU` to the projected `<ng-template>`.
 *
 * ```html
 * <div [kjContextMenuFor]="rowMenu" tabindex="0" class="row">…row content…</div>
 *
 * <ng-template #rowMenu>
 *   <div kjDropdownMenu>
 *     <button kjDropdownMenuItem (click)="edit()">Edit</button>
 *     <button kjDropdownMenuItem (click)="duplicate()">Duplicate</button>
 *     <hr kjDropdownMenuSeparator />
 *     <button kjDropdownMenuItem (click)="delete()">Delete</button>
 *   </div>
 * </ng-template>
 * ```
 *
 * Behaviour:
 *
 * - **Right-click** — `contextmenu` event. Calls `event.preventDefault()` to
 *   suppress the browser's native menu and anchors at
 *   `{ event.clientX, event.clientY }`.
 * - **Long-press (touch)** — `pointerdown` with `pointerType === 'touch'`
 *   starts a `kjLongPressMs` (default 500 ms) timer that opens at the press
 *   point. Cancelled by movement past `kjLongPressMoveTolerancePx`,
 *   `pointerup`, `pointercancel`, or `scroll`.
 * - **Keyboard** — `Shift+F10` and the Windows `ContextMenu` key open at the
 *   host element's `getBoundingClientRect()`.
 * - **Re-anchor** — a `contextmenu` on the same trigger while open closes and
 *   re-opens at the new point. A right-click on a different
 *   `[kjContextMenuFor]` host closes the first via the `KjContextMenuRegistry`
 *   singleton and opens the new one.
 * - **Disabled** — when `kjDisabled` is true, the directive's listeners
 *   no-op so the browser's native menu shows through.
 *
 * Focus: opening moves focus into the panel's first item (handled by
 * `[kjDropdownMenu]`). On close, focus returns to the host if it is still
 * focusable and was the opener.
 *
 * @category Core/Actions
 */
@Directive({
  selector: '[kjContextMenuFor]',
  standalone: true,
  exportAs: 'kjContextMenuTrigger',
  providers: [
    { provide: KJ_DROPDOWN_MENU, useExisting: KjContextMenuTrigger },
    { provide: KJ_CONTEXT_MENU, useExisting: KjContextMenuTrigger },
  ],
  host: {
    '[attr.aria-disabled]': 'kjDisabled() ? "true" : null',
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '(contextmenu)': 'onContextMenu($event)',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'onPointerCancel($event)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class KjContextMenuTrigger implements KjContextMenuContext {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly vcr = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly registry = inject(KjContextMenuRegistry);

  /** The `<ng-template>` containing the `[kjDropdownMenu]` panel. */
  readonly kjContextMenuFor = input.required<TemplateRef<unknown>>();

  /** Suppresses opening entirely; the browser's native menu is allowed through. */
  readonly kjDisabled = input(false, { transform: booleanAttribute });

  /** Two-way bindable open state. Setting `true` opens at the host's rect. */
  readonly kjOpen = model<boolean>(false);

  /** Touch long-press duration in milliseconds. Set to `0` to disable touch opening. */
  readonly kjLongPressMs = input(500, { transform: numberAttribute });

  /** Pointer movement tolerance during a long-press before the timer cancels. */
  readonly kjLongPressMoveTolerancePx = input(10, { transform: numberAttribute });

  /** Whether `Shift+F10` and the `ContextMenu` key open the panel. */
  readonly kjOpenOnContextMenuKey = input(true, { transform: booleanAttribute });

  /** Whether document scroll should close the panel. */
  readonly kjCloseOnScroll = input(true, { transform: booleanAttribute });

  /** Anchor mode strategy. `'auto'` picks `'point'` for pointer / `'rect'` for keyboard. */
  readonly kjAnchorMode = input<KjContextMenuAnchorModeInput>('auto');

  /** Preferred panel side relative to the anchor. Defaults to `'bottom'`. */
  readonly kjSide = input<KjDropdownMenuSide>('bottom');

  /** Cross-axis alignment of the panel. Defaults to `'start'`. */
  readonly kjAlign = input<KjDropdownMenuAlign>('start');

  /** Pixel gap between the anchor and the panel. */
  readonly kjOffset = input(2, { transform: numberAttribute });

  /** Whether item activation closes the menu by default. */
  readonly kjCloseOnSelect = input(true, { transform: booleanAttribute });

  /** Convenience event paired with the `kjOpen` model. */
  readonly kjOpenChange = output<boolean>();

  /** Emitted when the panel becomes visible. */
  readonly kjOpened = output<KjContextMenuOpenEvent>();

  /** Emitted when the panel hides. */
  readonly kjClosed = output<KjDropdownMenuCloseReason>();

  // ── KjContextMenuContext / KjDropdownMenuContext ──────────────────

  private readonly _open = signal(false);
  /** Reactive open state. */
  readonly open = this._open.asReadonly();

  /** Stable id used as `aria-controls` and panel `id`. */
  readonly panelId = nextDropdownMenuPanelId();

  /** Mirrors of the menu inputs (InputSignals satisfy `Signal<T>`). */
  readonly side = this.kjSide;
  readonly align = this.kjAlign;
  readonly offset = this.kjOffset;
  readonly closeOnSelect = this.kjCloseOnSelect;

  private readonly _anchorPoint = signal<{ x: number; y: number } | null>(null);
  readonly anchorPoint = this._anchorPoint.asReadonly();
  private readonly _anchorMode = signal<KjContextMenuAnchorMode>('point');
  readonly anchorMode = this._anchorMode.asReadonly();
  private readonly _anchorRect = signal<DOMRect | null>(null);
  readonly anchorRect = this._anchorRect.asReadonly();

  /**
   * The element `[kjDropdownMenu]` positions against. We synthesise a
   * zero-size element inside `<body>` at the anchor point (or set its rect
   * to the host rect) so the existing connected-positioning math works
   * unchanged against it.
   */
  private readonly _anchorEl = signal<HTMLElement | null>(null);
  readonly triggerElement = this._anchorEl.asReadonly();

  private virtualAnchor: HTMLElement | null = null;

  /** Auto-focus handoff: the panel directive consumes this on mount. */
  private _pendingFocus: 'first' | 'last' | 'none' = 'first';
  /** @internal */
  consumePendingFocus(): 'first' | 'last' | 'none' {
    const f = this._pendingFocus;
    this._pendingFocus = 'first';
    return f;
  }

  // ── Internal state ────────────────────────────────────────────────

  /** Embedded view of the projected `<ng-template>` while the menu is open. */
  private templateView: EmbeddedViewRef<unknown> | null = null;

  /** Long-press machinery. */
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private longPressStart: { x: number; y: number; pointerId: number } | null = null;

  /** Identifies this trigger inside the registry. */
  private readonly registryId = {} as object;

  /** The opener that should receive focus on close, if it still applies. */
  private restoreFocusTarget: HTMLElement | null = null;

  /** Tracks scroll listener installation. */
  private cleanupScroll: (() => void) | null = null;

  constructor() {
    // Stamp / unstamp the panel template based on the open state. The
    // projected template hosts `[kjDropdownMenu]`, which mounts the panel
    // overlay against the virtual anchor we provide via `triggerElement`.
    effect(() => {
      const isOpen = this._open();
      const tpl = this.kjContextMenuFor();
      if (isOpen && tpl && !this.templateView) {
        this.templateView = tpl.createEmbeddedView(null as never, this.vcr.injector);
        this.vcr.insert(this.templateView);
        this.templateView.detectChanges();
      } else if (!isOpen && this.templateView) {
        try {
          this.templateView.destroy();
        } catch {
          /* ignore */
        }
        this.templateView = null;
      }
    });

    this.destroyRef.onDestroy(() => {
      this.clearLongPress();
      this.uninstallScrollListener();
      this.removeVirtualAnchor();
      if (this.templateView) {
        try {
          this.templateView.destroy();
        } catch {
          /* ignore */
        }
        this.templateView = null;
      }
      this.registry.close(this.registryId);
    });
  }

  // ── Mutations ─────────────────────────────────────────────────────

  show(invoker: HTMLElement | null, focus: 'first' | 'last' | 'none' = 'first'): void {
    // Programmatic legacy entry — defers to anchored open at the host rect.
    this.openAt({ rect: this.el.nativeElement.getBoundingClientRect() }, 'programmatic', focus);
  }

  /** Closes the panel via the registry-aware path. */
  hide(reason: KjDropdownMenuCloseReason): void {
    if (!this._open()) return;
    this._open.set(false);
    this.kjOpen.set(false);
    this.kjOpenChange.emit(false);
    this.kjClosed.emit(reason);
    this.registry.close(this.registryId);
    this.uninstallScrollListener();

    // Focus restoration: only if the panel currently owns focus and we
    // have a stored opener.
    const target = this.restoreFocusTarget;
    this.restoreFocusTarget = null;
    if (target && reason !== 'click-outside' && reason !== 'tab') {
      // Avoid stealing focus from a sibling panel that may already have opened
      // in response to the same right-click. Only restore when no element is
      // focused (body) or the panel held focus.
      const active = typeof document !== 'undefined' ? document.activeElement : null;
      const insideOldPanel = !active || active === document.body;
      if (insideOldPanel) {
        try {
          target.focus();
        } catch {
          /* element may be detached */
        }
      }
    }

    // Defer virtual-anchor cleanup until after the panel-side effect tears
    // down its overlay (which still reads our trigger element on close).
    queueMicrotask(() => this.removeVirtualAnchor());
  }

  toggle(invoker: HTMLElement | null): void {
    if (this._open()) {
      this.hide('programmatic');
    } else {
      this.show(invoker, 'first');
    }
  }

  // ── Anchor-aware opener ───────────────────────────────────────────

  private resolvedAnchorMode(source: KjContextMenuOpenSource): KjContextMenuAnchorMode {
    const m = this.kjAnchorMode();
    if (m === 'point' || m === 'rect') return m;
    return source === 'keyboard' || source === 'programmatic' ? 'rect' : 'point';
  }

  private openAt(
    anchor: { x: number; y: number } | { rect: DOMRect },
    source: KjContextMenuOpenSource,
    focus: 'first' | 'last' | 'none' = 'first',
  ): void {
    if (this.kjDisabled()) return;
    if (!isPlatformBrowser(this.platformId)) return;

    // If we're already open, close-and-reopen so position updates and the
    // panel re-mounts cleanly at the new anchor.
    if (this._open()) {
      // Don't pass through registry close; we are about to take over.
      this._open.set(false);
      // Drain the effect so the template view tears down before we re-stamp.
      this.templateView?.destroy();
      this.templateView = null;
    }

    const mode = this.resolvedAnchorMode(source);
    const rect = 'rect' in anchor ? anchor.rect : pointToRect(anchor.x, anchor.y);
    const point =
      'rect' in anchor
        ? { x: anchor.rect.left, y: anchor.rect.top }
        : { x: anchor.x, y: anchor.y };

    this._anchorMode.set(mode);
    this._anchorPoint.set(point);
    this._anchorRect.set(rect);
    this.ensureVirtualAnchor(rect);
    this._anchorEl.set(this.virtualAnchor);

    this._pendingFocus = focus;
    this.restoreFocusTarget = source === 'keyboard' ? this.el.nativeElement : this.el.nativeElement;

    this.registry.open(this.registryId, () => this.hide('programmatic'));

    this._open.set(true);
    this.kjOpen.set(true);
    this.kjOpenChange.emit(true);
    this.kjOpened.emit({ source: source === 'programmatic' ? 'keyboard' : source, x: point.x, y: point.y });

    if (this.kjCloseOnScroll()) {
      this.installScrollListener();
    }
  }

  // ── DOM listeners ────────────────────────────────────────────────

  protected onContextMenu(event: MouseEvent): void {
    if (this.kjDisabled()) return;
    event.preventDefault();
    event.stopPropagation();
    this.openAt({ x: event.clientX, y: event.clientY }, 'mouse', 'first');
  }

  protected onPointerDown(event: PointerEvent): void {
    if (this.kjDisabled()) return;
    if (event.pointerType !== 'touch') return;
    if (this.kjLongPressMs() <= 0) return;

    this.longPressStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    const ms = this.kjLongPressMs();
    this.longPressTimer = setTimeout(() => {
      const start = this.longPressStart;
      this.longPressStart = null;
      this.longPressTimer = null;
      if (!start) return;
      this.openAt({ x: start.x, y: start.y }, 'touch', 'first');
    }, ms);
  }

  protected onPointerMove(event: PointerEvent): void {
    const start = this.longPressStart;
    if (!start || event.pointerId !== start.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.hypot(dx, dy) > this.kjLongPressMoveTolerancePx()) {
      this.clearLongPress();
    }
  }

  protected onPointerUp(_event: PointerEvent): void {
    this.clearLongPress();
  }

  protected onPointerCancel(_event: PointerEvent): void {
    this.clearLongPress();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.kjDisabled()) return;
    if (!this.kjOpenOnContextMenuKey()) return;

    const isShiftF10 = event.key === 'F10' && event.shiftKey;
    const isContextKey = event.key === 'ContextMenu';
    if (!isShiftF10 && !isContextKey) return;

    event.preventDefault();
    event.stopPropagation();
    const rect = this.el.nativeElement.getBoundingClientRect();
    this.openAt({ rect }, 'keyboard', 'first');
  }

  // ── Internals ────────────────────────────────────────────────────

  private clearLongPress(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    this.longPressStart = null;
  }

  private ensureVirtualAnchor(rect: DOMRect): void {
    if (typeof document === 'undefined') return;
    if (!this.virtualAnchor) {
      const node = document.createElement('div');
      node.setAttribute('data-kj-context-menu-anchor', '');
      node.style.position = 'fixed';
      node.style.pointerEvents = 'none';
      node.style.margin = '0';
      node.style.padding = '0';
      node.style.border = '0';
      node.style.opacity = '0';
      this.virtualAnchor = node;
      document.body.appendChild(node);
    }
    const node = this.virtualAnchor;
    node.style.left = `${rect.left}px`;
    node.style.top = `${rect.top}px`;
    node.style.width = `${rect.width}px`;
    node.style.height = `${rect.height}px`;
  }

  private removeVirtualAnchor(): void {
    if (this.virtualAnchor && this.virtualAnchor.parentNode) {
      try {
        this.virtualAnchor.parentNode.removeChild(this.virtualAnchor);
      } catch {
        /* ignore */
      }
    }
    this.virtualAnchor = null;
    this._anchorEl.set(null);
  }

  private installScrollListener(): void {
    if (this.cleanupScroll || typeof window === 'undefined') return;
    const onScroll = () => {
      if (this._open()) this.hide('programmatic');
    };
    window.addEventListener('scroll', onScroll, true);
    this.cleanupScroll = () => window.removeEventListener('scroll', onScroll, true);
  }

  private uninstallScrollListener(): void {
    if (this.cleanupScroll) {
      this.cleanupScroll();
      this.cleanupScroll = null;
    }
  }
}

/** Build a zero-area DOMRect-like object at the given viewport point. */
function pointToRect(x: number, y: number): DOMRect {
  // Use the runtime DOMRect constructor when available; fall back to a plain
  // structurally-compatible object for non-browser test environments.
  if (typeof DOMRect !== 'undefined') {
    try {
      return new DOMRect(x, y, 0, 0);
    } catch {
      /* fall through */
    }
  }
  return {
    x,
    y,
    width: 0,
    height: 0,
    left: x,
    top: y,
    right: x,
    bottom: y,
    toJSON() {
      return { x, y, width: 0, height: 0, left: x, top: y, right: x, bottom: y };
    },
  } as DOMRect;
}
