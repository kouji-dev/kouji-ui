import { Directive, booleanAttribute, effect, inject, input, untracked } from '@angular/core';
import { KjOverlayTrigger } from '../primitives/overlay/trigger';
import type { KjOverlayPanel } from '../primitives/overlay/panel';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
  type KjTriggerEventStrategy,
} from '../primitives/overlay/tokens';
import { onHover, type KjOnHoverOpts } from '../primitives/overlay/strategies/trigger-event/on-hover';
import { onFocus } from '../primitives/overlay/strategies/trigger-event/on-focus';
import { composeTriggerEvents, whenEnabled } from '../primitives/overlay/strategies/trigger-event/compose';

/** Hover + keyboard-focus trigger for tooltips, configurable after DI has built it. */
interface KjTooltipTriggerStrategy extends KjTriggerEventStrategy {
  configure(opts: Partial<KjOnHoverOpts> & { disabled?: () => boolean }): void;
}

/**
 * Hover intent for pointer users, `:focus-visible` for keyboard users; the
 * delays and the disabled gate are inputs, so they are wired after
 * construction through `configure()`.
 */
function tooltipTriggerEvents(): KjTooltipTriggerStrategy {
  const hover = onHover({ openDelay: 200, closeDelay: 0 });
  let disabled: () => boolean = () => false;
  const gated = whenEnabled(
    composeTriggerEvents(hover, onFocus({ focusVisible: true })),
    () => !disabled(),
  );
  return {
    ...gated,
    configure(opts) {
      const { disabled: d, ...hoverOpts } = opts;
      hover.configure(hoverOpts);
      if (d) disabled = d;
    },
  };
}

/**
 * Opens the sibling `<kj-tooltip-content [kjFor]>` on hover intent or on
 * keyboard focus (`:focus-visible`), closes it when the pointer leaves, focus
 * moves away, or Escape is pressed, and describes the trigger with the
 * tooltip's id (`aria-describedby`) per the WAI-ARIA tooltip pattern.
 *
 * @example
 * ```html
 * <button kjTooltipTrigger #t="kjTooltipTrigger">Save</button>
 * <kj-tooltip-content [kjFor]="t">Save the document</kj-tooltip-content>
 * ```
 * @doc-category Core/Overlay
 * @doc
 * @doc-name tooltip
 */
@Directive({
  selector: '[kjTooltipTrigger]',
  exportAs: 'kjTooltipTrigger',
  standalone: true,
  hostDirectives: [
    { directive: KjOverlayTrigger, inputs: ['kjOpen'] },
  ],
  providers: [
    KjOverlayController,
    {
      provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
      useFactory: tooltipTriggerEvents,
    },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'tooltip' as const },
  ],
})
export class KjTooltipTrigger {
  /** Hover intent before opening, in ms. Focus opens immediately. Default 200. */
  readonly kjOpenDelay  = input<number, unknown>(200, { transform: (v) => Number(v) || 200 });
  /** Grace period after the pointer leaves, in ms. Default 0. */
  readonly kjCloseDelay = input<number, unknown>(0,   { transform: (v) => Number(v) || 0 });
  /** Suppresses the tooltip: it never opens, and closes if it was open. */
  readonly kjDisabled   = input(false, { transform: booleanAttribute });

  private readonly _overlayTrigger = inject(KjOverlayTrigger, { self: true });

  constructor() {
    const strategy = inject(KJ_OVERLAY_TRIGGER_EVENT_STRATEGY) as KjTooltipTriggerStrategy;
    strategy.configure({
      openDelay: this.kjOpenDelay,
      closeDelay: this.kjCloseDelay,
      disabled: () => this.kjDisabled(),
    });
    effect(() => {
      if (this.kjDisabled() && untracked(() => this.controller.isOpen())) {
        this.controller.close('programmatic');
      }
    });
  }

  /** The controller of the composed `KjOverlayTrigger`, exposed for sibling `[kjFor]` panels. */
  get controller(): KjOverlayController {
    return this._overlayTrigger.controller;
  }
  attachPanel(panel: KjOverlayPanel): void {
    this._overlayTrigger.attachPanel(panel);
  }
}
