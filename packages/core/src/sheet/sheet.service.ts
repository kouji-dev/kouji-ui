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
import { KjSheetRef } from './sheet.ref';

/**
 * Initial resting height of the bottom sheet.
 *
 * - `'auto'` — hugs its content (default).
 * - `'half'` — opens at roughly half the viewport height.
 * - `'full'` — opens near full height, leaving a top inset.
 *
 * A multi-detent snap machine (dragging between heights) is intentionally
 * deferred; this option is forward-compatible with that follow-up.
 */
export type KjSheetDetent = 'auto' | 'half' | 'full';

/** Configuration options for {@link KjSheetService.open}. */
export interface KjSheetOpenOptions<D = unknown> {
  /** Data injected into the rendered body via `SHEET_DATA`. */
  data?: D;
  /** Initial resting height. Defaults to `'auto'`. */
  detent?: KjSheetDetent;
  /** Enables grab-handle + drag-to-dismiss. Defaults to `true`. */
  dismissible?: boolean;
  /** Whether clicking the backdrop closes the sheet. Defaults to `true`. */
  closeOnOutside?: boolean;
  /** Accessible name applied when the body does not provide a heading. */
  ariaLabel?: string;
}

/**
 * Programmatic service for opening bottom sheets — a mobile-first,
 * bottom-anchored modal surface with a grab handle and drag-to-dismiss.
 *
 * Composes the same overlay primitive stack as `KjDrawer` and `KjDialog`
 * (`edgeSheet` position, `solidBackdrop`, `tabCycle` focus trap,
 * `htmlOverflow` scroll lock) through {@link KjOverlayBuilder} — the overlay
 * engine is reused, not reinvented.
 *
 * @doc-category Core/Overlay
 */
@Injectable({ providedIn: 'root' })
export class KjSheetService {
  private readonly builder = inject(KjOverlayBuilder);
  private readonly env = inject(EnvironmentInjector);

  /**
   * Open a component as a modal bottom sheet.
   *
   * @param component - The body component rendered inside the sheet.
   * @param opts - Data, detent, dismissible, and close-on-outside controls.
   * @returns A {@link KjSheetRef} for closing and observing the sheet.
   */
  open<T, R = unknown, D = unknown>(
    component: Type<T>,
    opts: KjSheetOpenOptions<D> = {},
  ): KjSheetRef<T, R> {
    const dismissible = opts.dismissible ?? true;

    const handle = this.builder.create({
      mount: inPlace(),
      position: edgeSheet({ side: 'bottom' }),
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

    const ref = new KjSheetRef<T, R>(handle.controller);
    const cmpRef = this.builder.attachComponent(handle, component, {
      providers: [
        { provide: KjSheetRef, useValue: ref },
        { provide: SHEET_DATA, useValue: opts.data },
        { provide: SHEET_DETENT, useValue: opts.detent ?? 'auto' },
        { provide: SHEET_DISMISSIBLE, useValue: dismissible },
        { provide: SHEET_ARIA_LABEL, useValue: opts.ariaLabel ?? null },
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

/** Token for passing data to a programmatically opened sheet body. */
export const SHEET_DATA = new InjectionToken<unknown>('KjSheetData');
/** Token exposing the resolved initial detent to the rendered body. */
export const SHEET_DETENT = new InjectionToken<KjSheetDetent>('KjSheetDetent');
/** Token exposing whether drag-to-dismiss is enabled to the rendered body. */
export const SHEET_DISMISSIBLE = new InjectionToken<boolean>('KjSheetDismissible');
/** Token exposing the fallback accessible name to the rendered body. */
export const SHEET_ARIA_LABEL = new InjectionToken<string | null>('KjSheetAriaLabel');
