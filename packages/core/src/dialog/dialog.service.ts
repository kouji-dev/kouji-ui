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
        if (s === 'closed' && wasOpen) {
          eff.destroy();
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
