import {
  ApplicationRef,
  ComponentRef,
  EnvironmentInjector,
  Injectable,
  Injector,
  Type,
  createComponent,
  inject,
} from '@angular/core';
import { KjOverlayController, type KjOverlayStrategies } from './controller';
import { KjOverlayWrapper } from './wrapper';
import { KjBackdrop } from './backdrop';
import { getOverlayContainer } from './container';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
  KJ_OVERLAY_BACKDROP_STRATEGY,
  KJ_OVERLAY_FOCUS_TRAP_STRATEGY,
  KJ_OVERLAY_SCROLL_LOCK_STRATEGY,
  KJ_OVERLAY_LIVE_ANNOUNCER_STRATEGY,
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from './tokens';
import type { KjPanelRole } from './types';

export interface KjOverlayBuilderConfig extends KjOverlayStrategies {
  panelRole: KjPanelRole;
  closeOnEsc?: boolean;
  closeOnOutside?: boolean;
}

export interface KjAttachOptions<D = unknown> {
  data?: D;
  providers?: Array<{ provide: unknown; useValue?: unknown }>;
}

/**
 * Per-overlay handle returned by {@link KjOverlayBuilder.create}. Owns the
 * controller, the per-overlay element injector, and the wrapper component.
 * Callers dispose the entire overlay (DOM, child views, strategy detach
 * chain) by calling {@link destroy} — Angular's component destroy cascade
 * does the work; no manual ref tracking needed.
 *
 * @category Core/Overlay
 * @doc
 * @doc-name overlay-handle
 * @doc-description Hands callers a single object that exposes the controller, the per-overlay injector, and a `destroy()` that tears down the overlay's DOM and views atomically.
 */
export class KjOverlayHandle {
  constructor(
    readonly controller: KjOverlayController,
    readonly injector: Injector,
    readonly config: KjOverlayBuilderConfig,
    private readonly wrapperRef: ComponentRef<KjOverlayWrapper>,
  ) {}

  get wrapper(): KjOverlayWrapper { return this.wrapperRef.instance; }

  destroy(): void {
    if (this.wrapperRef.hostView.destroyed) return;
    const host = this.wrapperRef.location.nativeElement as HTMLElement;
    this.wrapperRef.destroy();
    // createComponent + manual appendChild → manual removal on destroy.
    host.parentElement?.removeChild(host);
  }
}

/**
 * Service that constructs per-overlay controllers + wrapper components from
 * a strategy bundle. Wires up the per-overlay element injector, appends the
 * wrapper to the singleton overlay container, and returns a
 * {@link KjOverlayHandle} for service-launched overlays (dialog, drawer,
 * toast, etc.).
 *
 * @category Core/Overlay
 * @doc
 * @doc-name overlay-builder
 * @doc-is-main
 * @doc-description Constructs service-launched overlays by assembling a per-overlay controller, element injector, and wrapper component from a strategy config and returning a disposable handle.
 */
@Injectable({ providedIn: 'root' })
export class KjOverlayBuilder {
  private readonly appRef = inject(ApplicationRef);
  private readonly env    = inject(EnvironmentInjector);

  /**
   * Creates a per-overlay controller + wrapper component. The wrapper is
   * appended to the singleton `.kj-overlay-container` and is the host for
   * the backdrop and panel views. Strategies are attached eagerly so the
   * controller is ready for `open()` immediately after this call returns.
   */
  create(config: KjOverlayBuilderConfig): KjOverlayHandle {
    const injector = Injector.create({
      providers: [
        KjOverlayController,
        { provide: KJ_OVERLAY_MOUNT_STRATEGY,            useValue: config.mount },
        { provide: KJ_OVERLAY_POSITION_STRATEGY,         useValue: config.position },
        { provide: KJ_OVERLAY_BACKDROP_STRATEGY,         useValue: config.backdrop ?? null },
        { provide: KJ_OVERLAY_FOCUS_TRAP_STRATEGY,       useValue: config.focusTrap ?? null },
        { provide: KJ_OVERLAY_SCROLL_LOCK_STRATEGY,      useValue: config.scrollLock ?? null },
        { provide: KJ_OVERLAY_LIVE_ANNOUNCER_STRATEGY,   useValue: config.liveAnnouncer ?? null },
        { provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,    useValue: config.trigger ?? null },
        { provide: KJ_OVERLAY_PANEL_ROLE,                useValue: config.panelRole },
      ],
      parent: this.env,
    });
    const controller = injector.get(KjOverlayController);
    controller.attachStrategies(config);

    const wrapperRef = createComponent(KjOverlayWrapper, {
      environmentInjector: this.env,
      elementInjector: injector,
    });
    this.appRef.attachView(wrapperRef.hostView);
    // Sync CD so viewChild() anchors resolve before attachComponent runs.
    wrapperRef.changeDetectorRef.detectChanges();
    getOverlayContainer()?.appendChild(wrapperRef.location.nativeElement);

    return new KjOverlayHandle(controller, injector, config, wrapperRef);
  }

  /**
   * Mounts the user's component into the wrapper's panel slot, plus the
   * styled `<kj-backdrop>` into the backdrop slot when a backdrop strategy
   * is configured. Both views are owned by the wrapper component so
   * `handle.destroy()` tears them down in one cascade.
   */
  attachComponent<T>(
    handle: KjOverlayHandle,
    component: Type<T>,
    opts: KjAttachOptions = {},
  ): ComponentRef<T> {
    const wrapper = handle.wrapper;

    if (handle.config.backdrop) {
      wrapper.backdropAnchor().createComponent(KjBackdrop, { injector: handle.injector });
    }

    const childInjector = Injector.create({
      providers: opts.providers as never[] ?? [],
      parent: handle.injector,
    });
    const ref = wrapper.panelAnchor().createComponent(component, { injector: childInjector });
    // Pointer-events isolation: container is `pointer-events: none` so app
    // content stays clickable; each panel re-enables.
    (ref.location.nativeElement as HTMLElement).style.pointerEvents = 'auto';
    handle.controller.bindPanel(ref.location.nativeElement);
    return ref;
  }
}
