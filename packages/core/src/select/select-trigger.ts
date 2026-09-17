import {
  Directive,
  ElementRef,
  booleanAttribute,
  effect,
  inject,
  input,
} from '@angular/core';
import { KjDisabled, KjFocusRing } from '../primitives';
import { KjOverlayTrigger } from '../primitives/overlay/trigger';
import type { KjOverlayPanel } from '../primitives/overlay/panel';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
  type KjTriggerEventStrategy,
} from '../primitives/overlay/tokens';
import { onClick } from '../primitives/overlay/strategies/trigger-event/on-click';
import { KjFieldControl } from '../field/field-control';
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
 * `aria-controls`, `aria-haspopup`), opens the listbox on ArrowDown /
 * ArrowUp / Alt+ArrowDown, and forwards the `kjMultiple` input onto the
 * umbrella `KjSelect` root.
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
    // arch F-16: one owner for `kjDisabled`. The hand-rolled copy had the
    // transform but reflected nothing, so a disabled trigger announced no
    // state at all (WCAG 4.1.2) and there was a second place to forget it.
    { directive: KjDisabled, inputs: ['kjDisabled'] },
    { directive: KjOverlayTrigger, inputs: ['kjOpen'] },
    // Listed LAST on purpose. Inside a `[kjField]` the trigger adopts the
    // field's control id (a `<button>` is a labelable element, so the
    // `[kjFieldLabel]` `for=` resolves onto it), mirrors `aria-required`, and
    // reflects the field's error state as `aria-invalid`. `KjOverlayTrigger`
    // also binds `aria-describedby`; two host bindings on one attribute are
    // last-writer-wins, so `KjFieldControl` has to run second — and it merges
    // the element's static `aria-describedby`, so nothing the trigger would
    // have written is lost.
    { directive: KjFieldControl, inputs: ['kjDescribedBy'] },
  ],
  providers: [
    {
      provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
      useFactory: () => listboxClickTrigger(),
    },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'listbox' as const },
  ],
  host: {
    '(keydown)': 'onKeydown($event)',
  },
})
export class KjSelectTrigger {
  /** @internal — same instance as the one provided on KjSelect root. */
  readonly controller = inject(KjOverlayController);
  private readonly select = inject(KJ_SELECT, { optional: true });

  /** Whether the listbox supports multiple selection (absorbs `multi-select`). Defaults to `false`. */
  readonly kjMultiple = input(false, { transform: booleanAttribute });

  /**
   * Whether the trigger is disabled — bound with `kjDisabled`, owned by the
   * composed {@link KjDisabled}, which reflects `aria-disabled` /
   * `data-disabled`. Advisory: a disabled trigger refuses to open, but the
   * element itself is only removed from the tab order by the consumer's own
   * `[disabled]` on a native `<button>`.
   */
  readonly disabled = inject(KjDisabled).disabled;

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

  /**
   * @internal WAI-ARIA APG select-only combobox: ArrowDown, ArrowUp and
   * Alt+ArrowDown open the listbox from the trigger. Enter and Space reach
   * the overlay through the host `<button>`'s native click, so they are
   * not handled here (handling them too would toggle the panel twice).
   */
  onKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    if (!this.controller.isOpen()) this.controller.open();
  }

  private readonly _overlayTrigger = inject(KjOverlayTrigger, { self: true });
  attachPanel(panel: KjOverlayPanel): void {
    this._overlayTrigger.attachPanel(panel);
  }
}
