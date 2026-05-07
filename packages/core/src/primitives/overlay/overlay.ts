import {
  Injectable, inject, signal, computed,
  EmbeddedViewRef, ApplicationRef, TemplateRef, ViewContainerRef,
  PLATFORM_ID, type Signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Managed wrapper around a DOM overlay container.
 * Provides `isOpen` as a signal and lifecycle methods.
 *
 * Create instances via {@link KjOverlayService} — do not construct directly.
 *
 * @example
 * ```ts
 * const ref = inject(KjOverlayService).createFromTemplate(tpl, vcr);
 * ref.open();
 * ```
 */
export class KjOverlayRef {
  private readonly _isOpen = signal(false);

  /** Whether the overlay is currently open. */
  readonly isOpen = this._isOpen.asReadonly();

  constructor(
    private readonly container: HTMLElement,
    private readonly viewRef: EmbeddedViewRef<unknown>,
    private readonly appRef: ApplicationRef,
  ) {}

  /** Shows the overlay container. */
  open(): void {
    this._isOpen.set(true);
    this.container.removeAttribute('hidden');
  }

  /** Hides the overlay container. */
  close(): void {
    this._isOpen.set(false);
    this.container.setAttribute('hidden', '');
  }

  /** Toggles the overlay between open and closed states. */
  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Permanently removes the overlay from the DOM and destroys the view.
   * Call inside `DestroyRef.onDestroy()` to prevent memory leaks.
   */
  dispose(): void {
    this.appRef.detachView(this.viewRef);
    this.viewRef.destroy();
    this.container.remove();
  }

  /** The underlying container `HTMLElement` for advanced usage. */
  get el(): HTMLElement {
    return this.container;
  }
}

/**
 * Options for {@link KjOverlayService.register}.
 */
export interface KjOverlayRegistration {
  /** Called when the overlay should close (Esc / outside-click). */
  onClose: () => void;
  /** Whether outside pointerdown closes this overlay. Default `true`. */
  closeOnOutside?: boolean;
  /** Whether Escape closes this overlay. Default `true`. */
  closeOnEsc?: boolean;
}

/**
 * Handle returned from {@link KjOverlayService.register}.
 */
export interface KjOverlayHandle {
  /** Removes the registration from the stack. */
  unregister: () => void;
  /** Reactive flag — `true` when this overlay is the topmost in the stack. */
  isTopmost: Signal<boolean>;
}

interface StackEntry {
  id: string;
  opts: KjOverlayRegistration;
  contentEl: HTMLElement | null;
}

/**
 * Factory service for creating managed overlay containers, plus a global
 * coordinator for nested-overlay behaviour: stack ordering, body scroll-lock
 * counter, and outside-click / Escape routing.
 *
 * The service installs **single** capture-phase document listeners for
 * `keydown` and `pointerdown`. Each registered overlay is consulted only when
 * it is the topmost in the stack — this prevents the nested-overlay double-
 * close problem each consumer used to solve on its own.
 *
 * SSR-safe: every DOM access is guarded by `isPlatformBrowser`. On the
 * server, all coordinator methods are no-ops that still return well-typed
 * handles / unlock functions.
 *
 * @example
 * ```ts
 * // Dialog — full-screen backdrop overlay
 * const ref = inject(KjOverlayService).createFromTemplate(tpl, vcr);
 * ref.open();
 *
 * // Coordinate with the global overlay stack
 * const handle = svc.register('my-dialog', { onClose: () => ref.close() });
 * svc.markContentEl('my-dialog', ref.el);
 * const unlock = svc.lockBodyScroll();
 *
 * // Clean up when done
 * unlock();
 * handle.unregister();
 * ref.dispose();
 * ```
 */
@Injectable({ providedIn: 'root' })
export class KjOverlayService {
  private readonly appRef = inject(ApplicationRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // Stack of open overlays. Topmost is the last entry.
  private readonly _stack = signal<StackEntry[]>([]);

  // Scroll-lock reference count. Lock applies on transition 0 → 1, releases
  // on 1 → 0. Multiple overlays share one body-level style mutation.
  private _lockCount = 0;
  private _savedPaddingRight: string | null = null;
  private _savedOverflow: string | null = null;

  // Single document-level listeners. Installed on first registration,
  // removed when the stack is fully drained.
  private _listenersInstalled = false;
  private readonly _onKeydown = (e: KeyboardEvent) => this.handleKeydown(e);
  private readonly _onPointerDown = (e: PointerEvent) => this.handlePointerDown(e);

  /**
   * Creates an overlay from an Angular template ref.
   * The container is appended to `document.body` and starts hidden.
   *
   * @param tpl - The `TemplateRef` to render inside the overlay.
   * @param vcr - The `ViewContainerRef` used to create the embedded view.
   * @returns A {@link KjOverlayRef} managing the created overlay.
   */
  createFromTemplate(tpl: TemplateRef<unknown>, vcr: ViewContainerRef): KjOverlayRef {
    // Use TemplateRef.createEmbeddedView directly so the view is not pre-attached
    // to the VCR's container — ApplicationRef can own the view lifecycle.
    const viewRef = tpl.createEmbeddedView(null as never, vcr.injector);
    this.appRef.attachView(viewRef);

    const container = document.createElement('div');
    container.setAttribute('data-kj-overlay', '');
    viewRef.rootNodes.forEach(node => container.appendChild(node));
    document.body.appendChild(container);

    return new KjOverlayRef(container, viewRef, this.appRef);
  }

  /**
   * Pushes an overlay onto the global overlay stack.
   *
   * Only the topmost registered overlay receives Escape and outside-click
   * events — nested overlays do not double-close.
   *
   * @param id - Stable identifier for this registration.
   * @param opts - Behaviour flags and the close callback.
   * @returns Handle exposing `unregister()` and `isTopmost` signal.
   */
  register(id: string, opts: KjOverlayRegistration): KjOverlayHandle {
    if (!this.isBrowser) {
      // SSR no-op: still return a stable handle so consumer code is uniform.
      return {
        unregister: () => {},
        isTopmost: computed(() => false),
      };
    }

    const entry: StackEntry = {
      id,
      opts: {
        closeOnOutside: opts.closeOnOutside ?? true,
        closeOnEsc: opts.closeOnEsc ?? true,
        onClose: opts.onClose,
      },
      contentEl: null,
    };

    this._stack.update(s => [...s, entry]);
    this.ensureListeners();

    const isTopmost = computed(() => {
      const s = this._stack();
      return s.length > 0 && s[s.length - 1].id === id;
    });

    return {
      unregister: () => {
        this._stack.update(s => s.filter(e => e !== entry));
        this.maybeRemoveListeners();
      },
      isTopmost,
    };
  }

  /**
   * Associates a content element with a registered overlay so the global
   * pointerdown coordinator can decide whether a click is inside or outside.
   *
   * Call after the portaled content has rendered.
   *
   * @param id - The id passed to {@link register}.
   * @param el - The DOM element that defines the overlay's "inside".
   */
  markContentEl(id: string, el: HTMLElement | null): void {
    if (!this.isBrowser) return;
    const entry = this._stack().find(e => e.id === id);
    if (entry) entry.contentEl = el;
  }

  /**
   * Acquires a body-scroll lock. On the first lock, sets `overflow: hidden`
   * on the document element and compensates for the scrollbar width with a
   * matching `padding-right` to avoid layout shift. Subsequent calls
   * increment a reference counter — only when the count returns to zero is
   * the lock released and styles restored.
   *
   * SSR-safe: on the server returns a no-op unlock function.
   *
   * @returns A function that releases this lock. Idempotent — calling twice
   *  releases only once.
   */
  lockBodyScroll(): () => void {
    if (!this.isBrowser) return () => {};

    this._lockCount++;
    if (this._lockCount === 1) {
      const html = document.documentElement;
      const scrollbarWidth = window.innerWidth - html.clientWidth;
      this._savedOverflow = html.style.overflow;
      this._savedPaddingRight = html.style.paddingRight;
      html.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        // Compensate for removed scrollbar to prevent layout shift.
        const existing = parseFloat(getComputedStyle(html).paddingRight) || 0;
        html.style.paddingRight = `${existing + scrollbarWidth}px`;
      }
    }

    let released = false;
    return () => {
      if (released) return;
      released = true;
      this._lockCount--;
      if (this._lockCount === 0) {
        const html = document.documentElement;
        html.style.overflow = this._savedOverflow ?? '';
        html.style.paddingRight = this._savedPaddingRight ?? '';
        this._savedOverflow = null;
        this._savedPaddingRight = null;
      }
    };
  }

  /** Current overlay stack depth. Exposed for diagnostics / tests. */
  get stackSize(): number {
    return this._stack().length;
  }

  /** Current scroll-lock reference count. Exposed for diagnostics / tests. */
  get lockCount(): number {
    return this._lockCount;
  }

  private ensureListeners(): void {
    if (this._listenersInstalled || !this.isBrowser) return;
    document.addEventListener('keydown', this._onKeydown, true);
    document.addEventListener('pointerdown', this._onPointerDown, true);
    this._listenersInstalled = true;
  }

  private maybeRemoveListeners(): void {
    if (!this._listenersInstalled || this._stack().length > 0) return;
    document.removeEventListener('keydown', this._onKeydown, true);
    document.removeEventListener('pointerdown', this._onPointerDown, true);
    this._listenersInstalled = false;
  }

  private topmost(): StackEntry | undefined {
    const s = this._stack();
    return s.length ? s[s.length - 1] : undefined;
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (e.key !== 'Escape') return;
    const top = this.topmost();
    if (!top || !top.opts.closeOnEsc) return;
    top.opts.onClose();
  }

  private handlePointerDown(e: PointerEvent): void {
    const top = this.topmost();
    if (!top || !top.opts.closeOnOutside) return;
    const target = e.target as Node | null;
    // No content registered yet → cannot tell inside from outside; play it
    // safe and don't close. Consumers must call markContentEl after render.
    if (!top.contentEl) return;
    if (target && top.contentEl.contains(target)) return;
    top.opts.onClose();
  }
}
