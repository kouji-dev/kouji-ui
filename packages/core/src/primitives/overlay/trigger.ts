import { Directive, ElementRef, inject, model, computed, effect, untracked } from '@angular/core';
import { KjOverlayController } from './controller';
import { KJ_OVERLAY_TRIGGER_EVENT_STRATEGY } from './tokens';
import type { KjOverlayPanel } from './panel';

/**
 * Marks an element as the overlay trigger — owns `aria-haspopup`,
 * `aria-expanded`, `aria-controls`, the trigger-event strategy, and the
 * two-way `kjOpen` model that mirrors the controller's open state.
 *
 * @category Core/Overlay
 * @doc
 * @doc-name overlay-trigger
 * @doc-is-main
 * @doc-description Marks an element as the trigger that opens and closes an overlay panel.
 */
@Directive({
  selector: '[kjOverlayTrigger]',
  exportAs: 'kjOverlayTrigger',
  // NOTE: do NOT provide KjOverlayController here. Consumer trigger directives
  // (e.g. KjSelectTrigger, KjTreeSelectTrigger) provide it on their host
  // element so the SAME instance is visible to both KjOverlayTrigger and any
  // sibling KjOverlayPanel via [kjFor]. For "controller-on-root" patterns
  // (e.g. KjColorPicker), the root directive provides it and ALL descendants
  // share one instance.
  host: {
    '[attr.aria-haspopup]':  'ariaHasPopup() ?? null',
    '[attr.aria-expanded]':  'isOpen()',
    '[attr.aria-controls]':  'panelId() ?? null',
    '[attr.data-state]':     'state()',
  },
})
export class KjOverlayTrigger {
  private readonly host       = inject(ElementRef<HTMLElement>);
  /**
   * The overlay controller for this trigger's scope. Exposed publicly so
   * sibling `KjOverlayPanel` directives wired via `[kjFor]` can read it
   * from their element injector (which would otherwise not see this
   * directive's providers).
   */
  readonly controller = inject(KjOverlayController);
  private readonly triggerStrategy = inject(KJ_OVERLAY_TRIGGER_EVENT_STRATEGY);

  readonly kjOpen = model<boolean>(false);
  readonly state   = this.controller.state;
  readonly isOpen  = this.controller.isOpen;
  readonly panelId = computed(() => this.controller.panelEl()?.id ?? null);
  readonly ariaHasPopup = computed(() => this.triggerStrategy.ariaHasPopup);

  attachPanel(panel: KjOverlayPanel): void {
    this.controller.bindPanel(panel.host.nativeElement);
  }

  constructor() {
    this.controller.bindTrigger(this.host.nativeElement);
    // The trigger strategy lives on the trigger element. Attach + bind here so
    // its DOM listeners wire up regardless of whether a panel ever attaches
    // (e.g. tooltip with no [kjFor]).
    this.triggerStrategy.attach(this.controller.context);
    this.triggerStrategy.bindToggle(() => this.controller.toggle());
    // Sync model → controller (user toggled kjOpen via two-way binding)
    effect(() => {
      const wantOpen = this.kjOpen();
      const isOpen = untracked(() => this.controller.isOpen());
      if (wantOpen && !isOpen) this.controller.open();
      if (!wantOpen && isOpen) this.controller.close('programmatic');
    });
    // Sync controller → model (controller state changed via trigger event / outside-click / esc)
    effect(() => {
      const isOpen = this.controller.isOpen();
      const wantOpen = untracked(() => this.kjOpen());
      if (isOpen !== wantOpen) this.kjOpen.set(isOpen);
    });
  }
}
