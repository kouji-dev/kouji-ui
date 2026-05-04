import {
  Injectable, inject, signal,
  EmbeddedViewRef, ApplicationRef, TemplateRef, ViewContainerRef,
} from '@angular/core';

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
 * Factory service for creating managed overlay containers.
 * Creates a container appended to `document.body`.
 *
 * @example
 * ```ts
 * // Dialog — full-screen backdrop overlay
 * const ref = inject(KjOverlayService).createFromTemplate(tpl, vcr);
 * ref.open();
 *
 * // Clean up when done
 * ref.dispose();
 * ```
 */
@Injectable({ providedIn: 'root' })
export class KjOverlayService {
  private readonly appRef = inject(ApplicationRef);

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
}
