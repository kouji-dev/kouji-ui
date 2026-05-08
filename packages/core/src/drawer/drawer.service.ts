import {
  EnvironmentInjector,
  Injectable,
  InjectionToken,
  Type,
  effect,
  inject,
  runInInjectionContext,
} from '@angular/core';
import { KjOverlayBuilder } from '../primitives/overlay/builder';
import { inPlace } from '../primitives/overlay/strategies/mount/in-place';
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
 * overlay handle wired to the overlay primitives and renders a component
 * inside the singleton overlay container, positioned via `edgeSheet({side})`.
 *
 * @category Core/Overlay
 */
@Injectable({ providedIn: 'root' })
export class KjDrawerService {
  private readonly builder = inject(KjOverlayBuilder);
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

    const handle = this.builder.create({
      mount: inPlace(),
      position: edgeSheet({ side }),
      backdrop: solidBackdrop({
        inert: true,
        closeOnClick: opts.closeOnOutside ?? true,
      }),
      focusTrap: tabCycle({ returnFocus: true }),
      scrollLock: htmlOverflow(),
      liveAnnouncer: silent(),
      trigger: programmatic(),
      panelRole: 'dialog',
    });

    const ref = new KjDrawerRef<T, R>(handle.controller);
    const cmpRef = this.builder.attachComponent(handle, component, {
      providers: [
        { provide: KjDrawerRef, useValue: ref },
        { provide: DRAWER_DATA, useValue: opts.data },
        { provide: DRAWER_SIDE, useValue: side },
        { provide: DRAWER_DRAG, useValue: !!opts.drag },
      ],
    });
    ref.bindInstance(cmpRef.instance);

    runInInjectionContext(this.env, () => {
      let wasOpen = false;
      const eff = effect(() => {
        const s = handle.controller.state();
        if (s === 'open' || s === 'opening') wasOpen = true;
        if (s === 'closed' && wasOpen) {
          eff.destroy();
          queueMicrotask(() => handle.destroy());
        }
      });
    });
    handle.controller.open();
    return ref;
  }
}

/** Token for passing data to a programmatically opened drawer component. */
export const DRAWER_DATA = new InjectionToken<unknown>('KjDrawerData');
/** Token exposing the resolved drawer side to the rendered component. */
export const DRAWER_SIDE = new InjectionToken<KjDrawerSide>('KjDrawerSide');
/** Token exposing whether drag-to-dismiss is enabled to the rendered component. */
export const DRAWER_DRAG = new InjectionToken<boolean>('KjDrawerDrag');
