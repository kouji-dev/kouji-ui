import { EnvironmentInjector, Injectable, Type, effect, inject, runInInjectionContext } from '@angular/core';
import { KjOverlayBuilder } from '../primitives/overlay/builder';
import { inPlace } from '../primitives/overlay/strategies/mount/in-place';
import { viewportCentered } from '../primitives/overlay/strategies/position/viewport-centered';
import { solidBackdrop } from '../primitives/overlay/strategies/backdrop/solid';
import { tabCycle } from '../primitives/overlay/strategies/focus-trap/tab-cycle';
import { htmlOverflow } from '../primitives/overlay/strategies/scroll-lock/html-overflow';
import { silent } from '../primitives/overlay/strategies/live-announcer/silent';
import { assertive } from '../primitives/overlay/strategies/live-announcer/assertive';
import { programmatic } from '../primitives/overlay/strategies/trigger-event/programmatic';
import { KjDialogRef } from './dialog.ref';

/** Per-open configuration accepted by `KjDialogService.open(component, options)`. */
export interface KjDialogOpenOptions<D = unknown> {
  /** Value injected into the body component under `DIALOG_DATA`. */
  data?: D;
  /** Opens the dialog as an `alertdialog` — assertive announcement, no Escape / scrim dismissal. Default `false`. */
  alert?: boolean;
  /** Whether Escape dismisses. Default `true`, and `false` for an `alert` dialog. */
  closeOnEsc?: boolean;
  /** Whether a press on the scrim dismisses. Default `true`, and `false` for an `alert` dialog. */
  closeOnOutside?: boolean;
  /** Accessible name for a body that projects no `[kjDialogTitle]`. */
  ariaLabel?: string;
  /** Id of the element that names the dialog; wins over `ariaLabel` and any title. */
  ariaLabelledBy?: string;
}

/**
 * Opens a component as a modal dialog: portalled into the overlay container
 * behind an inert scrim, focus trapped and returned to the opener on close.
 *
 * The service is the programmatic half of the dialog family — the body
 * component composes {@link KjDialogService} (the directive of the same public name
 * lives in `dialog.ts`) and receives a {@link KjDialogRef} to close itself.
 *
 * @example
 * ```ts
 * private readonly dialog = inject(KjDialogService);
 * const ref = this.dialog.open(ConfirmBody, { data: { id }, ariaLabel: 'Confirm' });
 * const result = await ref.result;
 * ```
 * @doc-category Core/Overlays
 * @doc-name dialog
 */
@Injectable({ providedIn: 'root' })
export class KjDialogService {
  private readonly builder = inject(KjOverlayBuilder);
  private readonly env = inject(EnvironmentInjector);

  /**
   * Opens `component` as a dialog and returns its {@link KjDialogRef}.
   * @param component Body component instantiated inside the panel.
   * @param opts Per-open configuration; see {@link KjDialogOpenOptions}.
   */
  open<T, R = unknown, D = unknown>(component: Type<T>, opts: KjDialogOpenOptions<D> = {}): KjDialogRef<T, R> {
    const alert = !!opts.alert;
    const handle = this.builder.create({
      mount: inPlace(),
      position: viewportCentered(),
      backdrop: solidBackdrop({
        inert: true,
        closeOnClick: !alert && (opts.closeOnOutside ?? true),
      }),
      focusTrap: tabCycle({ returnFocus: true }),
      scrollLock: htmlOverflow(),
      liveAnnouncer: alert ? assertive() : silent(),
      trigger: programmatic(),
      panelRole: alert ? 'alertdialog' : 'dialog',
      // Unset → the builder's role default (an alertdialog answers to
      // neither; a dialog closes on Escape and lets the scrim decide).
      closeOnEsc: opts.closeOnEsc,
      closeOnOutside: opts.closeOnOutside,
      ariaLabel: opts.ariaLabel,
      ariaLabelledBy: opts.ariaLabelledBy,
    });

    const ref = new KjDialogRef<T, R>(handle.controller);
    const cmpRef = this.builder.attachComponent(handle, component, {
      providers: [{ provide: KjDialogRef, useValue: ref }],
      data: opts.data,
    });
    ref.bindInstance(cmpRef.instance);

    runInInjectionContext(this.env, () => {
      let wasOpen = false;
      const eff = effect(() => {
        const s = handle.controller.state();
        if (s === 'open' || s === 'opening') wasOpen = true;
        if (s === 'open') ref._notifyOpened();
        if (s === 'closed' && wasOpen) {
          eff.destroy();
          // A dismissal (Escape, scrim) settles afterClosed$ / result too.
          ref._notifyClosed();
          // afterClosed$ subscribers see the result before teardown.
          queueMicrotask(() => handle.destroy());
        }
      });
    });
    handle.controller.open();
    return ref;
  }

  // TODO: sugar wrappers (alert/confirm/prompt) — implement once preset
  // components (packages/core/src/dialog/presets/*.ts) are added.
}
