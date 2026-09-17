import { Directive, inject, input } from '@angular/core';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from '../primitives/overlay/tokens';
import type { KjSide, KjAlign } from '../primitives/overlay/types';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { anchoredTo, injectAnchoredPosition, pxOffset } from '../primitives/overlay/strategies/position/anchored-to';
import { KjCombobox } from './combobox-root';

/**
 * The popup listbox that contains [kjComboboxOption] children. Composes the
 * overlay primitive `KjOverlayPanel` for mount + position + role wiring; the
 * panel is portalled into `<body>` and anchored beneath the input via the
 * `anchoredTo()` strategy. `role="listbox"` and the `[hidden]` attribute are
 * driven by `KjOverlayPanel`.
 *
 * @doc-category Core/Inputs
 */
@Directive({
  selector: '[kjComboboxListbox]',
  standalone: true,
  hostDirectives: [{ directive: KjOverlayPanel, inputs: ['kjFor'] }],
  providers: [
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'listbox' as const },
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => bodyPortal() },
    { provide: KJ_OVERLAY_POSITION_STRATEGY, useFactory: () => anchoredTo() },
  ],
  host: {
    '(mousedown)': '$event.preventDefault()',
  },
})
export class KjComboboxListbox {
  /** @internal */
  readonly ctx = inject(KjCombobox);

  /** Preferred side of the input the listbox opens on. Default `'bottom'`. */
  readonly kjSide = input<KjSide>('bottom');
  /** Alignment along that side. Default `'start'`. */
  readonly kjAlign = input<KjAlign>('start');
  /** Gap in px between the input and the listbox. Default `4`. */
  readonly kjOffset = input<number, unknown>(4, { transform: pxOffset(4) });

  constructor() {
    injectAnchoredPosition({
      side: this.kjSide,
      align: this.kjAlign,
      offset: this.kjOffset,
      matchTriggerWidth: 'min',
    });
  }
}
