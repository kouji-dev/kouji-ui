import { Directive, inject, input } from '@angular/core';
import { KJ_DATE_PICKER } from './date-picker.context';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
  KJ_OVERLAY_FOCUS_TRAP_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from '../primitives/overlay/tokens';
import type { KjSide, KjAlign } from '../primitives/overlay/types';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { anchoredTo } from '../primitives/overlay/strategies/position/anchored-to';
import { tabCycle } from '../primitives/overlay/strategies/focus-trap/tab-cycle';

/**
 * Marker directive for the calendar slot of a Date Picker. Composes the
 * overlay `KjOverlayPanel` host directive — `role="dialog"`,
 * `aria-modal="false"`, mount/position/focus-trap strategies — and lets
 * consumers project a `KjCalendar` (or the `<kj-calendar>` wrapper) inside.
 *
 * Wire the panel to its trigger via `[kjFor]`:
 *
 * ```html
 * <input kjDatePickerTrigger #t="kjDatePickerTrigger" />
 * <div kjDatePickerCalendar [kjFor]="t"></div>
 * ```
 *
 * @category Core/Data input
 */
@Directive({
  selector: '[kjDatePickerCalendar]',
  standalone: true,
  exportAs: 'kjDatePickerCalendar',
  hostDirectives: [
    { directive: KjOverlayPanel, inputs: ['kjFor'] },
  ],
  providers: [
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'dialog' as const },
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => bodyPortal() },
    { provide: KJ_OVERLAY_POSITION_STRATEGY, useFactory: () => anchoredTo() },
    {
      provide: KJ_OVERLAY_FOCUS_TRAP_STRATEGY,
      useFactory: () => tabCycle({ returnFocus: true }),
    },
  ],
  host: {
    '[attr.aria-modal]': '"false"',
    '[attr.aria-label]': '"Choose date"',
  },
})
export class KjDatePickerCalendar {
  /** @internal */
  readonly ctx = inject(KJ_DATE_PICKER);

  readonly kjSide   = input<KjSide>('bottom');
  readonly kjAlign  = input<KjAlign>('start');
  readonly kjOffset = input<number, unknown>(4, { transform: (v) => Number(v) || 4 });

  constructor() {
    const pos = inject(KJ_OVERLAY_POSITION_STRATEGY) as ReturnType<typeof anchoredTo>;
    pos.configure({ side: this.kjSide, align: this.kjAlign, offset: this.kjOffset });
  }
}
