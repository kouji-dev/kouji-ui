import { Directive, Signal, effect, inject, input } from '@angular/core';
import { KjDisabled } from '../primitives/interaction/disabled';
import { KjOverlayTrigger } from '../primitives/overlay/trigger';
import type { KjOverlayPanel } from '../primitives/overlay/panel';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from '../primitives/overlay/tokens';
import { onClick } from '../primitives/overlay/strategies/trigger-event/on-click';
import { onFocus } from '../primitives/overlay/strategies/trigger-event/on-focus';
import { onHover } from '../primitives/overlay/strategies/trigger-event/on-hover';
import {
  composeTriggerEvents,
  switchableTriggerEvent,
  whenEnabled,
  type KjSwitchableTriggerStrategy,
} from '../primitives/overlay/strategies/trigger-event/compose';

/** How the popover opens: `'click'` toggles, `'hover'` opens on hover intent / focus / tap. */
export type KjPopoverTriggerKind = 'click' | 'hover';

/**
 * Opens the sibling `<kj-popover-content [kjFor]>` panel. `kjTrigger="click"`
 * (default) toggles on click; `kjTrigger="hover"` opens on hover intent and
 * keeps the panel open while the pointer rests on it — and, because a hover
 * popover may hold controls, it also opens on keyboard focus and on click
 * (touch), so every input modality reaches the panel.
 *
 * @example
 * ```html
 * <button kjPopoverTrigger kjTrigger="hover" #t="kjPopoverTrigger">+3</button>
 * <kj-popover-content [kjFor]="t">…</kj-popover-content>
 * ```
 * @doc-category Core/Overlay
 * @doc
 * @doc-name popover
 */
@Directive({
  selector: '[kjPopoverTrigger]',
  exportAs: 'kjPopoverTrigger',
  standalone: true,
  hostDirectives: [
    { directive: KjOverlayTrigger, inputs: ['kjOpen'] },
    { directive: KjDisabled, inputs: ['kjDisabled'] },
  ],
  providers: [
    KjOverlayController,
    // The kind is an input, unknown when this factory runs — the shell is
    // filled from the effect below once inputs are set.
    {
      provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
      useFactory: () => switchableTriggerEvent({ ariaHasPopup: 'dialog' }),
    },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'dialog' as const },
  ],
})
export class KjPopoverTrigger {
  /** How the panel opens: `click` toggles; `hover` opens on hover intent, focus, or tap. */
  readonly kjTrigger = input<KjPopoverTriggerKind>('click');
  /**
   * While true the trigger never opens the panel (an open panel can still
   * close). Default `false`. Owned by the composed `KjDisabled` host
   * directive, which also reflects `aria-disabled` / `data-disabled` — the
   * hand-rolled input this replaced reflected neither, so a disabled trigger
   * was announced as operable (WCAG 4.1.2). Read-only mirror; bind
   * `[kjDisabled]` on the host.
   */
  readonly kjDisabled: Signal<boolean> = inject(KjDisabled).disabled;
  /** Hover intent before opening, in ms (`hover` kind only). Default 150. */
  readonly kjOpenDelay = input<number, unknown>(150, { transform: (v) => Number(v) || 0 });
  /** Grace period after the pointer leaves the trigger or the panel, in ms (`hover` kind only). Default 150. */
  readonly kjCloseDelay = input<number, unknown>(150, { transform: (v) => Number(v) || 0 });

  private readonly _overlayTrigger = inject(KjOverlayTrigger, { self: true });
  /** The controller of the composed `KjOverlayTrigger`, exposed for sibling `[kjFor]` panels. */
  get controller(): KjOverlayController {
    return this._overlayTrigger.controller;
  }
  attachPanel(panel: KjOverlayPanel): void {
    this._overlayTrigger.attachPanel(panel);
  }

  constructor() {
    const strategy = inject(KJ_OVERLAY_TRIGGER_EVENT_STRATEGY) as KjSwitchableTriggerStrategy;
    // `enabled` is read at event time (outside the effect), so a kjDisabled
    // change never rebuilds the strategy.
    const enabled = () => !this.kjDisabled();
    effect(() => {
      strategy.use(
        whenEnabled(
          this.kjTrigger() === 'hover'
            ? composeTriggerEvents(
                onHover({
                  openDelay: this.kjOpenDelay,
                  closeDelay: this.kjCloseDelay,
                  interactive: true,
                }),
                onFocus(),
                onClick({ openOnly: true }),
              )
            : onClick(),
          enabled,
        ),
      );
    });
  }
}
