// tooltip-trigger.ts
import { Directive, input, inject } from '@angular/core';
import { booleanAttribute } from '@angular/core';
import { KjOverlayTrigger } from '../primitives/overlay/trigger';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
  type KjTriggerEventStrategy,
} from '../primitives/overlay/tokens';
import type { KjOverlayContext } from '../primitives/overlay/context';
import { onHover } from '../primitives/overlay/strategies/trigger-event/on-hover';
import { onFocus } from '../primitives/overlay/strategies/trigger-event/on-focus';

/** Composite trigger-event: opens on hover (with delay) AND on focus. */
function hoverOrFocus(opts: { openDelay?: number; closeDelay?: number } = {}): KjTriggerEventStrategy {
  const a = onHover(opts);
  const b = onFocus();
  return {
    ariaHasPopup: null,
    attach(ctx: KjOverlayContext) { a.attach(ctx); b.attach(ctx); },
    bindToggle(t) { a.bindToggle(t); b.bindToggle(t); },
    onOpen()  { a.onOpen?.();  b.onOpen?.();  },
    onClose() { a.onClose?.(); b.onClose?.(); },
    detach()  { a.detach();    b.detach();    },
  };
}

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
      useFactory: () => hoverOrFocus({ openDelay: 200 }),
    },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'tooltip' as const },
  ],
})
export class KjTooltipTrigger {
  readonly kjOpenDelay  = input<number, unknown>(200, { transform: (v) => Number(v) || 200 });
  readonly kjCloseDelay = input<number, unknown>(0,   { transform: (v) => Number(v) || 0 });
  readonly kjDisabled   = input(false, { transform: booleanAttribute });
  // Inputs preserved for API parity but currently advisory — open/close delays
  // are captured at provider construction time. A follow-up can wire them to
  // the strategy reactively.
}
