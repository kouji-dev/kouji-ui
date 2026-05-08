// command-palette-dialog.ts
import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
} from '@angular/core';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
  KJ_OVERLAY_BACKDROP_STRATEGY,
  KJ_OVERLAY_FOCUS_TRAP_STRATEGY,
  KJ_OVERLAY_SCROLL_LOCK_STRATEGY,
  KJ_OVERLAY_LIVE_ANNOUNCER_STRATEGY,
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from '../primitives/overlay/tokens';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { viewportCentered } from '../primitives/overlay/strategies/position/viewport-centered';
import { solidBackdrop } from '../primitives/overlay/strategies/backdrop/solid';
import { tabCycle } from '../primitives/overlay/strategies/focus-trap/tab-cycle';
import { htmlOverflow } from '../primitives/overlay/strategies/scroll-lock/html-overflow';
import { silent } from '../primitives/overlay/strategies/live-announcer/silent';
import { programmatic } from '../primitives/overlay/strategies/trigger-event/programmatic';

/**
 * Modal panel for the command palette (Cmd-K pattern). Composes
 * `KjOverlayPanel` and provides the modal-list strategy bundle: portalled
 * mount, viewport-centered position, solid (inert + close-on-click) backdrop,
 * tab-cycle focus trap with first-focus + return, html-overflow scroll lock,
 * and a silent live announcer.
 *
 * Pair with `[kjCommandPaletteTrigger]` (which supplies an `onHotkey`
 * trigger-event strategy) for the standard mod+k flow, or use programmatic
 * open/close via the bound `KjOverlayController`.
 *
 * The host element gets `aria-label="Command palette"` and `role="dialog"`.
 *
 * @category Core/Actions
 * @doc
 * @doc-name command-palette
 */
@Component({
  selector: 'kj-command-palette-dialog',
  standalone: true,
  hostDirectives: [
    { directive: KjOverlayPanel, inputs: ['kjFor'] },
  ],
  providers: [
    KjOverlayController,
    { provide: KJ_OVERLAY_MOUNT_STRATEGY,    useFactory: () => bodyPortal() },
    { provide: KJ_OVERLAY_POSITION_STRATEGY, useFactory: () => viewportCentered() },
    {
      provide: KJ_OVERLAY_BACKDROP_STRATEGY,
      useFactory: () => solidBackdrop({ inert: true, closeOnClick: true }),
    },
    {
      provide: KJ_OVERLAY_FOCUS_TRAP_STRATEGY,
      useFactory: () => tabCycle({ initialFocus: 'first', returnFocus: true }),
    },
    { provide: KJ_OVERLAY_SCROLL_LOCK_STRATEGY,    useFactory: () => htmlOverflow() },
    { provide: KJ_OVERLAY_LIVE_ANNOUNCER_STRATEGY, useFactory: () => silent() },
    { provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,  useFactory: () => programmatic() },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'dialog' as const },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[attr.aria-label]': '"Command palette"',
  },
  template: `<ng-content />`,
})
export class KjCommandPaletteDialog {}
