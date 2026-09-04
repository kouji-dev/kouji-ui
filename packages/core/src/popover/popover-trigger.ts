import { Directive, booleanAttribute, effect, inject, input } from '@angular/core';
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
  type KjSwitchableTriggerStrategy,
} from '../primitives/overlay/strategies/trigger-event/compose';

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
  hostDirectives: [{ directive: KjOverlayTrigger, inputs: ['kjOpen'] }],
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
  readonly kjDisabled = input(false, { transform: booleanAttribute });
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
    effect(() => {
      strategy.use(
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
      );
    });
  }
}
