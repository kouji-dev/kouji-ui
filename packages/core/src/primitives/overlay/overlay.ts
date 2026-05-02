import { Injectable, inject, signal } from '@angular/core';
import { Overlay, OverlayConfig, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';

/**
 * Managed wrapper around a CDK `OverlayRef`.
 * Exposes `isOpen` as a readonly signal and provides `open()`, `close()`, `toggle()`,
 * `attach()`, and `dispose()` methods.
 *
 * Create instances via {@link KjOverlayService} — do not construct directly.
 *
 * @example
 * ```ts
 * export class KjDialog {
 *   private readonly overlaySvc = inject(KjOverlayService);
 *   private overlayRef?: KjOverlayRef;
 *
 *   open(): void {
 *     this.overlayRef ??= this.overlaySvc.createGlobalOverlay({ hasBackdrop: true });
 *     this.overlayRef.open();
 *   }
 * }
 * ```
 */
export class KjOverlayRef {
  private readonly _isOpen = signal(false);

  /** Whether the overlay is currently open. */
  readonly isOpen = this._isOpen.asReadonly();

  constructor(private readonly overlayRef: OverlayRef) {}

  /** Opens the overlay. Attach a portal via `attach()` if content is required. */
  open(): void {
    this._isOpen.set(true);
  }

  /** Closes and detaches the overlay content. */
  close(): void {
    this._isOpen.set(false);
    if (this.overlayRef.hasAttached()) {
      this.overlayRef.detach();
    }
  }

  /** Toggles the overlay between open and closed states. */
  toggle(): void {
    if (this._isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Attaches a template portal to the overlay and opens it.
   * @param portal - The `TemplatePortal` to render inside the overlay.
   */
  attach(portal: TemplatePortal): void {
    if (!this.overlayRef.hasAttached()) {
      this.overlayRef.attach(portal);
    }
    this.open();
  }

  /**
   * Permanently disposes the overlay and releases CDK resources.
   * Call inside `DestroyRef.onDestroy()` to prevent memory leaks.
   */
  dispose(): void {
    this.overlayRef.dispose();
  }

  /** The underlying CDK `OverlayRef` for advanced usage such as scroll strategies or backdrop events. */
  get cdkRef(): OverlayRef {
    return this.overlayRef;
  }
}

/**
 * Factory service for creating managed overlay references.
 *
 * Inject this in any directive that needs overlay positioning.
 * Two strategies are supported: global-centered (dialogs/modals) and
 * flexibly-connected (tooltips, popovers, menus, select dropdowns).
 *
 * @example
 * ```ts
 * // Dialog — centered, with backdrop
 * const ref = inject(KjOverlayService).createGlobalOverlay({ hasBackdrop: true });
 *
 * // Popover — anchored to trigger element
 * const ref = inject(KjOverlayService).createConnectedOverlay(triggerEl);
 * ```
 */
@Injectable({ providedIn: 'root' })
export class KjOverlayService {
  private readonly overlay = inject(Overlay);

  /**
   * Creates a centered global overlay suitable for dialogs and modals.
   * Defaults to `hasBackdrop: true` with the `kj-overlay-backdrop` class.
   *
   * @param config - Optional CDK `OverlayConfig` overrides.
   * @returns A {@link KjOverlayRef} wrapping the created CDK overlay.
   */
  createGlobalOverlay(config?: Partial<OverlayConfig>): KjOverlayRef {
    const positionStrategy = this.overlay
      .position()
      .global()
      .centerHorizontally()
      .centerVertically();

    const ref = this.overlay.create({
      positionStrategy,
      hasBackdrop: true,
      backdropClass: 'kj-overlay-backdrop',
      panelClass: 'kj-overlay-panel',
      ...config,
    });

    return new KjOverlayRef(ref);
  }

  /**
   * Creates a connected overlay anchored to a trigger element.
   * Suitable for tooltips, popovers, menus, and select dropdowns.
   * Automatically flips from below to above the trigger if space is limited.
   *
   * @param trigger - The `HTMLElement` to anchor the overlay to.
   * @param config - Optional CDK `OverlayConfig` overrides.
   * @returns A {@link KjOverlayRef} wrapping the created CDK overlay.
   */
  createConnectedOverlay(trigger: HTMLElement, config?: Partial<OverlayConfig>): KjOverlayRef {
    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(trigger)
      .withPositions([
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
      ]);

    const ref = this.overlay.create({
      positionStrategy,
      hasBackdrop: false,
      panelClass: 'kj-overlay-panel',
      ...config,
    });

    return new KjOverlayRef(ref);
  }
}
