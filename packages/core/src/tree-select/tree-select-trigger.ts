import { Directive, booleanAttribute, inject, input } from '@angular/core';
import { KjFocusRing } from '../primitives';
import { KjOverlayTrigger } from '../primitives/overlay/trigger';
import type { KjOverlayPanel } from '../primitives/overlay/panel';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
  type KjTriggerEventStrategy,
} from '../primitives/overlay/tokens';
import { onClick } from '../primitives/overlay/strategies/trigger-event/on-click';

/**
 * Wraps `onClick()` and forces `ariaHasPopup` to `'tree'` so the trigger
 * advertises its panel role to assistive tech.
 */
function treeClickTrigger(): KjTriggerEventStrategy {
  const inner = onClick();
  return {
    ariaHasPopup: 'tree',
    attach: c => inner.attach(c),
    bindToggle: t => inner.bindToggle(t),
    onOpen: () => inner.onOpen?.(),
    onClose: () => inner.onClose?.(),
    detach: () => inner.detach(),
  };
}

/**
 * Trigger button that opens/closes the Tree Select panel. Composes the
 * overlay `KjOverlayTrigger` host directive (which wires `aria-expanded`,
 * `aria-controls`, `aria-haspopup`, and click handling) and forces
 * `role="combobox"` on the host element.
 *
 * @example
 * ```html
 * <button kjTreeSelectTrigger>Select category</button>
 * ```
 * @category Core/Inputs
 */
@Directive({
  selector: '[kjTreeSelectTrigger]',
  exportAs: 'kjTreeSelectTrigger',
  standalone: true,
  hostDirectives: [
    KjFocusRing,
    { directive: KjOverlayTrigger, inputs: ['kjOpen'] },
  ],
  providers: [
    KjOverlayController,
    {
      provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
      useFactory: () => treeClickTrigger(),
    },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'tree' as const },
  ],
  host: {
    'role': 'combobox',
    '(keydown)': 'onKeydown($event)',
  },
})
export class KjTreeSelectTrigger {
  /** @internal */
  readonly controller = inject(KjOverlayController);

  /** Disabled state. */
  readonly kjDisabled = input(false, { transform: booleanAttribute });

  /** @internal */
  onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
      case ' ':
      case 'Enter':
        event.preventDefault();
        if (!this.controller.isOpen()) this.controller.open();
        break;
      case 'Escape':
        if (this.controller.isOpen()) {
          event.preventDefault();
          this.controller.close('programmatic');
        }
        break;
    }
  }

  private readonly _overlayTrigger = inject(KjOverlayTrigger, { self: true });
  attachPanel(panel: KjOverlayPanel): void {
    this._overlayTrigger.attachPanel(panel);
  }
}
