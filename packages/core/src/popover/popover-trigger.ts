import { Directive, booleanAttribute, input } from '@angular/core';
import { KjOverlayTrigger } from '../primitives/overlay/trigger';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
  type KjTriggerEventStrategy,
} from '../primitives/overlay/tokens';
import { onClick } from '../primitives/overlay/strategies/trigger-event/on-click';
import { onHover } from '../primitives/overlay/strategies/trigger-event/on-hover';

export type KjPopoverTriggerKind = 'click' | 'hover';

function popoverTriggerEvent(kind: KjPopoverTriggerKind): KjTriggerEventStrategy {
  return kind === 'hover' ? onHover({ openDelay: 100, closeDelay: 100 }) : onClick();
}

@Directive({
  selector: '[kjPopoverTrigger]',
  exportAs: 'kjPopoverTrigger',
  standalone: true,
  hostDirectives: [{ directive: KjOverlayTrigger, inputs: ['kjOpen'] }],
  providers: [
    KjOverlayController,
    // For an MVP we resolve at construction; reactive switch is a follow-up.
    {
      provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
      useFactory: () => onClick(),
    },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'dialog' as const },
  ],
})
export class KjPopoverTrigger {
  readonly kjTrigger = input<KjPopoverTriggerKind>('click');
  readonly kjDisabled = input(false, { transform: booleanAttribute });
}
