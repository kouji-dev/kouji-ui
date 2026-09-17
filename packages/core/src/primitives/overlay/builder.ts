import {
  ApplicationRef,
  ComponentRef,
  EnvironmentInjector,
  Injectable,
  InjectionToken,
  Injector,
  PLATFORM_ID,
  Type,
  createComponent,
  inject,
} from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { KjOverlayController, type KjOverlayStrategies } from './controller';
import { KjOverlayWrapper } from './wrapper';
import { KjBackdrop } from './backdrop';
import { KJ_OVERLAY_CONTAINER } from './container';
import { inheritOverlayScope } from './scope';
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

/**
 * Accessible name for a service-launched panel, provided per overlay from
 * {@link KjOverlayBuilderConfig.ariaLabel}. Body components (`kj-dialog`,
 * `kj-drawer`, `kj-sheet`) bind it as `aria-label` when nothing labels them.
 */
export const KJ_OVERLAY_ARIA_LABEL = new InjectionToken<string | null>('KJ_OVERLAY_ARIA_LABEL');

/**
 * Id of the element that names a service-launched panel, provided per
 * overlay from {@link KjOverlayBuilderConfig.ariaLabelledBy}; bound as
 * `aria-labelledby` by the body components and preferred over a label.
 */
export const KJ_OVERLAY_ARIA_LABELLED_BY = new InjectionToken<string | null>('KJ_OVERLAY_ARIA_LABELLED_BY');

/**
 * Configuration for {@link KjOverlayBuilder.create}: the strategy bundle
 * plus the panel's role, accessible name and token scope. The close policy
 * (`closeOnEsc`, `closeOnOutside`, `passive` — see {@link KjOverlayStrategies})
 * is delivered to `KjOverlayStack` by the controller; when a flag is left
 * unset, an `alertdialog` defaults to `false` for both (it must be answered)
 * and every other role to `true`.
 */
export interface KjOverlayBuilderConfig extends KjOverlayStrategies {
  panelRole: KjPanelRole;
  /** Accessible name for the panel when its body renders no title element. */
  ariaLabel?: string;
  /** Id of the element that names the panel; wins over `ariaLabel` and any registered title. */
  ariaLabelledBy?: string;
  /**
   * Element whose token scope (`data-theme`, `data-density`, `dir`) the
   * overlay inherits. Defaults to the element that has focus when the
   * overlay is created (the button that opened it), else the app's root
   * component element — so a dialog opened from a themed subtree renders in
   * that theme rather than `<html>`'s.
   */
  scope?: Element | null;
}

/** Per-attach data and extra providers handed to the component an overlay renders. */
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
 * @doc-category Core/Overlay
 * @doc
 * @doc-name overlay-handle
 * @doc-description Disposable handle for a single open overlay with controller, injector, and destroy access.
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
 * wrapper to the overlay container ({@link KJ_OVERLAY_CONTAINER}), gives it
 * the launching context's theme / density / direction scope, and returns a
 * {@link KjOverlayHandle} for service-launched overlays (dialog, drawer,
 * toast, etc.).
 *
 * @doc-category Core/Overlay
 * @doc
 * @doc-name overlay-builder
 * @doc-is-main
 * @doc-description Builds and opens a service-launched overlay (dialog, drawer, toast) and returns a disposable handle.
 */
@Injectable({ providedIn: 'root' })
export class KjOverlayBuilder {
  private readonly appRef = inject(ApplicationRef);
  private readonly env    = inject(EnvironmentInjector);
  private readonly container = inject(KJ_OVERLAY_CONTAINER);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * Creates a per-overlay controller + wrapper component. The wrapper is
   * appended to the overlay container and is the host for the backdrop and
   * panel views. Strategies are attached eagerly so the controller is ready
   * for `open()` immediately after this call returns.
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
        { provide: KJ_OVERLAY_ARIA_LABEL,                useValue: config.ariaLabel ?? null },
        { provide: KJ_OVERLAY_ARIA_LABELLED_BY,          useValue: config.ariaLabelledBy ?? null },
      ],
      parent: this.env,
    });
    const controller = injector.get(KjOverlayController);
    const dismissible = config.panelRole !== 'alertdialog';
    controller.attachStrategies({
      ...config,
      closeOnEsc: config.closeOnEsc ?? dismissible,
      // Left unset for a dismissible role: the scrim's own `closeOnClick`
      // (what the drawer / sheet services map `closeOnOutside` onto) then
      // decides, and a scrim-less overlay defaults to `true`.
      closeOnOutside: config.closeOnOutside ?? (dismissible ? undefined : false),
    });

    const wrapperRef = createComponent(KjOverlayWrapper, {
      environmentInjector: this.env,
      elementInjector: injector,
    });
    this.appRef.attachView(wrapperRef.hostView);
    // Sync CD so viewChild() anchors resolve before attachComponent runs.
    wrapperRef.changeDetectorRef.detectChanges();
    const wrapper = wrapperRef.location.nativeElement as HTMLElement;
    inheritOverlayScope(config.scope === undefined ? this.defaultScope() : config.scope, wrapper);
    this.container()?.appendChild(wrapper);

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

  /** The focused element (the control that launched the overlay), else the app root — see {@link KjOverlayBuilderConfig.scope}. */
  private defaultScope(): Element | null {
    if (!this.isBrowser) return null;
    const active = this.document.activeElement;
    if (active && active !== this.document.body && active.isConnected) return active;
    return (this.appRef.components[0]?.location.nativeElement as Element | undefined) ?? null;
  }
}
