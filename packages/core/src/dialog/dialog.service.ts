import { EnvironmentInjector, Injectable, Type, effect, inject, runInInjectionContext } from '@angular/core';
import { KjOverlayBuilder } from '../primitives/overlay/builder';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { viewportCentered } from '../primitives/overlay/strategies/position/viewport-centered';
import { solidBackdrop } from '../primitives/overlay/strategies/backdrop/solid';
import { tabCycle } from '../primitives/overlay/strategies/focus-trap/tab-cycle';
import { htmlOverflow } from '../primitives/overlay/strategies/scroll-lock/html-overflow';
import { silent } from '../primitives/overlay/strategies/live-announcer/silent';
import { assertive } from '../primitives/overlay/strategies/live-announcer/assertive';
import { programmatic } from '../primitives/overlay/strategies/trigger-event/programmatic';
import { KjDialogRef } from './dialog.ref';

export interface KjDialogOpenOptions<D = unknown> {
  data?: D;
  alert?: boolean;
  closeOnEsc?: boolean;
  closeOnOutside?: boolean;
}

@Injectable({ providedIn: 'root' })
export class KjDialog {
  private readonly builder = inject(KjOverlayBuilder);
  private readonly env = inject(EnvironmentInjector);

  open<T, R = unknown, D = unknown>(component: Type<T>, opts: KjDialogOpenOptions<D> = {}): KjDialogRef<T, R> {
    const alert = !!opts.alert;
    // Strategy factories call inject() internally (e.g. htmlOverflow → KjScrollLock).
    // Wrap in runInInjectionContext so this works from a service method call site.
    const ctrl = runInInjectionContext(this.env, () => this.builder.create({
      mount: bodyPortal(),
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
    }));

    const ref = new KjDialogRef<T, R>(ctrl);
    const cmpRef = this.builder.attachComponent(ctrl, component, {
      providers: [{ provide: KjDialogRef, useValue: ref }],
      data: opts.data,
    });
    ref.bindInstance(cmpRef.instance);
    runInInjectionContext(this.env, () => {
      let wasOpen = false;
      const eff = effect(() => {
        const s = ctrl.state();
        if (s === 'open' || s === 'opening') wasOpen = true;
        if (s === 'closed' && wasOpen) {
          eff.destroy();
          // Run cleanup on next microtask so afterClosed$ subscribers see the
          // result before the component view is torn down.
          queueMicrotask(() => {
            cmpRef.destroy();
            ctrl.dispose();
          });
        }
      });
    });
    ctrl.open();
    return ref;
  }

  // TODO: sugar wrappers (alert/confirm/prompt) — implement once preset
  // components (packages/core/src/dialog/presets/*.ts) are added.
}
