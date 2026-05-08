import {
  Directive,
  booleanAttribute,
  effect,
  inject,
  input,
} from '@angular/core';
import { KjFocusRing } from '../primitives';
import { KjOverlayTrigger } from '../primitives/overlay/trigger';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
  type KjTriggerEventStrategy,
} from '../primitives/overlay/tokens';
import { onClick } from '../primitives/overlay/strategies/trigger-event/on-click';
import { KJ_SELECT } from './select-root';

/**
 * Wraps `onClick()` and forces `ariaHasPopup` to `'listbox'` so the trigger
 * advertises its panel role to assistive tech.
 */
function listboxClickTrigger(): KjTriggerEventStrategy {
  const inner = onClick();
  return {
    ariaHasPopup: 'listbox',
    attach: c => inner.attach(c),
    bindToggle: t => inner.bindToggle(t),
    onOpen: () => inner.onOpen?.(),
    onClose: () => inner.onClose?.(),
    detach: () => inner.detach(),
  };
}

/**
 * Trigger directive for `KjSelectContent`. Composes the overlay
 * `KjOverlayTrigger` host directive (which wires `aria-expanded`,
 * `aria-controls`, `aria-haspopup`) and exposes the `kjMultiple` variant
 * input that absorbs the former `multi-select` consumer. Mirrors the
 * controller's open state back into the parent `KjSelect` so options can
 * react to it.
 *
 * @category Core/Inputs
 */
@Directive({
  selector: '[kjSelectTrigger]',
  exportAs: 'kjSelectTrigger',
  standalone: true,
  hostDirectives: [
    KjFocusRing,
    { directive: KjOverlayTrigger, inputs: ['kjOpen'] },
  ],
  providers: [
    KjOverlayController,
    {
      provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
      useFactory: () => listboxClickTrigger(),
    },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'listbox' as const },
  ],
})
export class KjSelectTrigger {
  /** @internal */
  readonly controller = inject(KjOverlayController);
  private readonly select = inject(KJ_SELECT, { optional: true });

  /** Whether the listbox supports multiple selection (absorbs `multi-select`). */
  readonly kjMultiple = input(false, { transform: booleanAttribute });
  /** Disabled state (advisory; downstream styling). */
  readonly kjDisabled = input(false, { transform: booleanAttribute });

  constructor() {
    // Forward kjMultiple onto the parent KjSelect (when present) so options
    // and content can read a single source of truth.
    effect(() => {
      this.select?._multiple.set(this.kjMultiple());
    });
    // Mirror controller open state into the parent select so KjOption /
    // KjSelectContent can react without each owning a controller.
    effect(() => {
      this.select?._open.set(this.controller.isOpen());
    });
    // React to single-mode close requests originating from option clicks.
    effect(() => {
      const req = this.select?._closeRequest();
      if (req && this.controller.isOpen()) {
        this.controller.close('programmatic');
      }
    });
  }
}
