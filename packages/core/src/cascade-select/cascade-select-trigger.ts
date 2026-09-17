import { Directive, booleanAttribute, inject, input } from '@angular/core';
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
 * Wraps `onClick()` and forces `ariaHasPopup` to `'tree'` — the role of
 * the cascade panel — so the trigger advertises its popup to assistive tech.
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
 * Trigger button for the Cascade Select root panel. Opens the panel on
 * click and on ArrowDown / ArrowUp / Alt+ArrowDown (Enter and Space arrive
 * as the host `<button>`'s native click), and exposes ARIA attributes
 * (`aria-haspopup="tree"`, `aria-expanded`, `aria-controls`) via the
 * composed `KjOverlayTrigger` host directive.
 *
 * @example
 * ```html
 * <button kjCascadeSelectTrigger #t="kjCascadeSelectTrigger">Pick a city</button>
 * <div kjCascadeSelectPanel [kjFor]="t">…</div>
 * ```
 * @doc-category Core/Data input
 */
@Directive({
  selector: '[kjCascadeSelectTrigger]',
  exportAs: 'kjCascadeSelectTrigger',
  standalone: true,
  hostDirectives: [
    { directive: KjOverlayTrigger, inputs: ['kjOpen'] },
  ],
  providers: [
    { provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY, useFactory: () => treeClickTrigger() },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'tree' as const },
  ],
  host: {
    '(keydown)': 'onKeydown($event)',
  },
})
export class KjCascadeSelectTrigger {
  private readonly _overlayTrigger = inject(KjOverlayTrigger, { self: true });
  /** The controller of the composed `KjOverlayTrigger`, exposed for sibling `[kjFor]` panels. */
  get controller(): KjOverlayController {
    return this._overlayTrigger.controller;
  }

  /** Disabled state (advisory; the host button's own `disabled` removes it from the tab order). */
  readonly kjDisabled = input(false, { transform: booleanAttribute });

  /** @internal APG combobox: ArrowDown / ArrowUp / Alt+ArrowDown open the popup. */
  onKeydown(event: KeyboardEvent): void {
    if (this.kjDisabled()) return;
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    if (!this.controller.isOpen()) this.controller.open();
  }
  attachPanel(panel: KjOverlayPanel): void {
    this._overlayTrigger.attachPanel(panel);
  }
}
