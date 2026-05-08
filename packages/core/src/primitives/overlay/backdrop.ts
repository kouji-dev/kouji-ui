import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { KjOverlayController } from './controller';
import { KJ_OVERLAY_BACKDROP_STRATEGY } from './tokens';

/**
 * Renders the backdrop scrim for an overlay. Reads the backdrop strategy
 * (className, closeOnClick) and the controller from the per-overlay
 * injector so neither needs to be passed in. Mounted by `KjOverlayBuilder`
 * as a sibling preceding the panel inside the per-overlay wrapper.
 */
@Component({
  selector: 'kj-backdrop',
  standalone: true,
  template: '',
  host: {
    '[class]': 'klass()',
    '[attr.data-state]': 'state()',
    '(click)': 'onClick($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjBackdrop {
  private readonly controller = inject(KjOverlayController, { optional: true });
  private readonly strategy   = inject(KJ_OVERLAY_BACKDROP_STRATEGY)!;
  readonly state = computed(() => this.controller?.state() ?? 'closed');
  readonly klass = computed(() => (this.strategy as { className?: string }).className ?? 'kj-backdrop');

  onClick(_e: MouseEvent): void {
    if (this.strategy.closeOnClick) this.controller?.close('outside');
  }
}
