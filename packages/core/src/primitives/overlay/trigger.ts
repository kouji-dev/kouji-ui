import { Directive, ElementRef, inject, model, computed, effect } from '@angular/core';
import { KjOverlayController } from './controller';
import { KJ_OVERLAY_TRIGGER_EVENT_STRATEGY } from './tokens';
import type { KjOverlayPanel } from './panel';

@Directive({
  selector: '[kjOverlayTrigger]',
  exportAs: 'kjOverlayTrigger',
  host: {
    '[attr.aria-haspopup]':  'ariaHasPopup() ?? null',
    '[attr.aria-expanded]':  'isOpen()',
    '[attr.aria-controls]':  'panelId() ?? null',
    '[attr.data-state]':     'state()',
  },
})
export class KjOverlayTrigger {
  private readonly host       = inject(ElementRef<HTMLElement>);
  private readonly controller = inject(KjOverlayController);
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
    this.triggerStrategy.bindToggle(() => this.controller.toggle());
    effect(() => {
      const wantOpen = this.kjOpen();
      if (wantOpen && !this.controller.isOpen()) this.controller.open();
      if (!wantOpen && this.controller.isOpen()) this.controller.close('programmatic');
    });
    effect(() => { this.kjOpen.set(this.controller.isOpen()); });
  }
}
