import { Directive, inject } from '@angular/core';
import { KJ_DATE_PICKER } from './date-picker.context';

/**
 * Marker directive for the calendar slot of a Date Picker. Consumers project
 * a `KjCalendar` (or the `<kj-calendar>` wrapper) inside an element carrying
 * this directive; the host component reads the picker's `(kjValueChange)`
 * event from the projected calendar to commit the selection.
 *
 * The directive itself contributes only the popover-panel id — the visible
 * Calendar wiring lives in the wrapper component (`<kj-date-picker-calendar>`)
 * to keep the headless surface consumer-driven.
 *
 * @category Core/Data input
 * @doc
 * @doc-name date-picker
 */
@Directive({
  selector: '[kjDatePickerCalendar]',
  standalone: true,
  exportAs: 'kjDatePickerCalendar',
  host: {
    '[attr.id]': 'ctx.panelId',
    '[attr.role]': '"dialog"',
    '[attr.aria-modal]': '"false"',
    '[attr.aria-label]': '"Choose date"',
  },
})
export class KjDatePickerCalendar {
  /** @internal */
  readonly ctx = inject(KJ_DATE_PICKER);
}
