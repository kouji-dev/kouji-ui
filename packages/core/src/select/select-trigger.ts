import {
  Directive,
  ElementRef,
  booleanAttribute,
  effect,
  inject,
  input,
} from '@angular/core';
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
 * `aria-controls`, `aria-haspopup`) and forwards the `kjMultiple` input
 * onto the umbrella `KjSelect` root.
 *
 * The shared `KjOverlayController` is provided by the `KjSelect` root
 * directive, not here — so option clicks can call `controller.close()`
 * directly through the same instance the trigger is wired to.
 *
 * @doc-category Core/Inputs
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
    {
      provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
      useFactory: () => listboxClickTrigger(),
    },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'listbox' as const },
  ],
})
export class KjSelectTrigger {
  /** @internal — same instance as the one provided on KjSelect root. */
  readonly controller = inject(KjOverlayController);
  private readonly select = inject(KJ_SELECT, { optional: true });

  /** Whether the listbox supports multiple selection (absorbs `multi-select`). */
  readonly kjMultiple = input(false, { transform: booleanAttribute });
  /** Disabled state (advisory; downstream styling). */
  readonly kjDisabled = input(false, { transform: booleanAttribute });

  private readonly hostEl = inject(ElementRef<HTMLElement>);

  constructor() {
    // Forward kjMultiple onto the parent KjSelect (when present) so options
    // and content can read a single source of truth.
    effect(() => {
      this.select?._multiple.set(this.kjMultiple());
    });
    // Register the trigger's host element with the parent KjSelect so
    // consumers (cell editors, dialogs, custom integrations) can call
    // `KjSelect.focus()` without a view-query round-trip.
    this.select?._triggerEl.set(this.hostEl);
  }

  private readonly _overlayTrigger = inject(KjOverlayTrigger, { self: true });
  attachPanel(panel: KjOverlayPanel): void {
    this._overlayTrigger.attachPanel(panel);
  }
}
