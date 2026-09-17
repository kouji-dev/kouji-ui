import {
  Directive,
} from '@angular/core';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import {
  KJ_OVERLAY_PANEL_ROLE,
} from '../primitives/overlay/tokens';
import {
  KJ_COLOR_PICKER,
} from './color-picker.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * Popup panel container. Composes `KjOverlayPanel` for state-driven
 * mount/position and the standard `role="dialog"` / `[hidden]` wiring;
 * the mount and position strategies are provided by the root
 * `KjColorPicker`.
 *
 * @doc-category Core/Inputs
 * @doc
 * @doc-name color-picker
 */
@Directive({
  selector: '[kjColorPickerPanel]',
  standalone: true,
  hostDirectives: [
    { directive: KjOverlayPanel, inputs: ['kjFor'] },
  ],
  providers: [
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'dialog' as const },
  ],
  host: {
    '[attr.aria-labelledby]': 'ctx.triggerId()',
  },
})
export class KjColorPickerPanel {
  /** @internal */
  readonly ctx = injectParent(KJ_COLOR_PICKER, { child: 'KjColorPickerPanel', parent: '[kjColorPicker]' });
}
