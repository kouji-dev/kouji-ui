import { ApplicationRef, ComponentRef, EnvironmentInjector, Injectable, Injector, Type, createComponent, inject } from '@angular/core';
import { KjOverlayController, type KjOverlayStrategies } from './controller';
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

@Injectable({ providedIn: 'root' })
export class KjOverlayBuilder {
  private readonly appRef = inject(ApplicationRef);
  private readonly env    = inject(EnvironmentInjector);

  create(config: KjOverlayBuilderConfig): KjOverlayController {
    const injector = Injector.create({
      providers: [
        KjOverlayController,
        // Expose the same strategies via DI so the body component (which
        // composes KjOverlayPanel via hostDirectives) can inject them
        // through its element injector.
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
    const ctrl = injector.get(KjOverlayController);
    ctrl.attachStrategies(config);
    // Stash the per-overlay injector so attachComponent can extend from it
    // (children of the body component see the strategy tokens too).
    (ctrl as unknown as { __injector: Injector }).__injector = injector;
    return ctrl;
  }

  attachComponent<T>(
    controller: KjOverlayController,
    component: Type<T>,
    opts: KjAttachOptions = {},
  ): ComponentRef<T> {
    const strategies = (controller as unknown as { strategies: KjOverlayStrategies }).strategies;
    const container = strategies.mount.resolveContainer();
    const backdrop = strategies.backdrop;

    // Render a backdrop element as a sibling preceding the panel when the
    // controller is configured with a backdrop strategy. The strategy itself
    // is just a config bag — physical DOM rendering is the builder's job.
    let backdropEl: HTMLElement | null = null;
    if (backdrop && typeof document !== 'undefined') {
      backdropEl = document.createElement('div');
      backdropEl.setAttribute('data-kj-overlay-backdrop', '');
      backdropEl.className = 'kj-overlay-backdrop';
      const cfg = backdrop as unknown as { closeOnClick?: boolean };
      if (cfg.closeOnClick !== false) {
        backdropEl.addEventListener('click', () => controller.close('outside'));
      }
      container.appendChild(backdropEl);
    }

    const parentInjector =
      (controller as unknown as { __injector?: Injector }).__injector ?? this.env;
    const injector = Injector.create({
      providers: opts.providers as never[] ?? [],
      parent: parentInjector,
    });
    const ref = createComponent(component, {
      environmentInjector: this.env,
      elementInjector: injector,
      hostElement: container,
    });
    this.appRef.attachView(ref.hostView);
    controller.bindPanel(ref.location.nativeElement);

    // Track the backdrop element on the controller so teardown can remove it.
    (controller as unknown as { __backdropEl: HTMLElement | null }).__backdropEl = backdropEl;
    return ref;
  }
}
