import {
  ApplicationRef,
  EnvironmentInjector,
  Injectable,
  InjectionToken,
  Injector,
  Type,
  createComponent,
  inject,
  runInInjectionContext,
} from '@angular/core';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_BACKDROP_STRATEGY,
  KJ_OVERLAY_FOCUS_TRAP_STRATEGY,
  KJ_OVERLAY_LIVE_ANNOUNCER_STRATEGY,
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
  KJ_OVERLAY_POSITION_STRATEGY,
  KJ_OVERLAY_SCROLL_LOCK_STRATEGY,
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
} from '../primitives/overlay/tokens';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { edgeSheet } from '../primitives/overlay/strategies/position/edge-sheet';
import { solidBackdrop } from '../primitives/overlay/strategies/backdrop/solid';
import { tabCycle } from '../primitives/overlay/strategies/focus-trap/tab-cycle';
import { htmlOverflow } from '../primitives/overlay/strategies/scroll-lock/html-overflow';
import { silent } from '../primitives/overlay/strategies/live-announcer/silent';
import { programmatic } from '../primitives/overlay/strategies/trigger-event/programmatic';
import { KjDrawerRef } from './drawer.ref';

/** Side of the viewport the drawer slides in from. */
export type KjDrawerSide = 'left' | 'right' | 'top' | 'bottom';

/** Configuration options for {@link KjDrawer.open}. */
export interface KjDrawerOpenOptions<D = unknown> {
  /** Side of the viewport the drawer slides in from. Defaults to `'right'`. */
  side?: KjDrawerSide;
  /** Enables drag-to-dismiss when the body component implements it. */
  drag?: boolean;
  /** Data injected into the rendered component via `DRAWER_DATA` (when wired). */
  data?: D;
  /** Whether clicking the backdrop closes the drawer. Defaults to `true`. */
  closeOnOutside?: boolean;
}

/**
 * Programmatic service for opening drawers. Mirrors `KjDialog`. Builds an
 * overlay controller wired to the overlay primitives and renders a component
 * inside a body-portal positioned via `edgeSheet({side})`.
 *
 * @category Core/Overlays
 */
@Injectable({ providedIn: 'root' })
export class KjDrawerService {
  private readonly appRef = inject(ApplicationRef);
  private readonly env = inject(EnvironmentInjector);

  /**
   * Open a component as a modal drawer.
   *
   * @param component - The component class to render inside the drawer.
   * @param opts - Side, drag, data, and close-on-outside controls.
   * @returns A {@link KjDrawerRef} for closing and observing the drawer.
   */
  open<T, R = unknown, D = unknown>(
    component: Type<T>,
    opts: KjDrawerOpenOptions<D> = {},
  ): KjDrawerRef<T, R> {
    const side: KjDrawerSide = opts.side ?? 'right';

    // Per-overlay injector so the controller, strategies, and panel-role are
    // visible to the rendered component's `KjOverlayPanel` host directive.
    const overlayInjector = Injector.create({
      providers: [
        KjOverlayController,
        { provide: KJ_OVERLAY_MOUNT_STRATEGY,          useFactory: () => bodyPortal() },
        { provide: KJ_OVERLAY_POSITION_STRATEGY,       useFactory: () => edgeSheet({ side }) },
        {
          provide: KJ_OVERLAY_BACKDROP_STRATEGY,
          useFactory: () => solidBackdrop({
            inert: true,
            closeOnClick: opts.closeOnOutside ?? true,
          }),
        },
        { provide: KJ_OVERLAY_FOCUS_TRAP_STRATEGY,     useFactory: () => tabCycle({ returnFocus: true }) },
        { provide: KJ_OVERLAY_SCROLL_LOCK_STRATEGY,    useFactory: () => htmlOverflow() },
        { provide: KJ_OVERLAY_LIVE_ANNOUNCER_STRATEGY, useFactory: () => silent() },
        { provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,  useFactory: () => programmatic() },
        { provide: KJ_OVERLAY_PANEL_ROLE,              useValue: 'dialog' as const },
      ],
      parent: this.env,
    });

    const ctrl = runInInjectionContext(this.env, () => overlayInjector.get(KjOverlayController));
    const ref = new KjDrawerRef<T, R>(ctrl);

    // Inject DRAWER_DATA / KjDrawerRef alongside the overlay providers.
    const componentInjector = Injector.create({
      providers: [
        { provide: KjDrawerRef, useValue: ref },
        { provide: DRAWER_DATA, useValue: opts.data },
        { provide: DRAWER_SIDE, useValue: side },
        { provide: DRAWER_DRAG, useValue: !!opts.drag },
      ],
      parent: overlayInjector,
    });

    const cmpRef = runInInjectionContext(overlayInjector, () =>
      createComponent(component, {
        environmentInjector: this.env,
        elementInjector: componentInjector,
      }),
    );

    this.appRef.attachView(cmpRef.hostView);
    document.body.appendChild(cmpRef.location.nativeElement);

    ref.bindInstance(cmpRef.instance);
    ctrl.open();
    return ref;
  }
}

/** Token for passing data to a programmatically opened drawer component. */
export const DRAWER_DATA = new InjectionToken<unknown>('KjDrawerData');
/** Token exposing the resolved drawer side to the rendered component. */
export const DRAWER_SIDE = new InjectionToken<KjDrawerSide>('KjDrawerSide');
/** Token exposing whether drag-to-dismiss is enabled to the rendered component. */
export const DRAWER_DRAG = new InjectionToken<boolean>('KjDrawerDrag');
