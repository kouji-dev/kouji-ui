import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { KjOverlayController } from './controller';
import { KJ_OVERLAY_BACKDROP_STRATEGY } from './tokens';

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
  private readonly controller = inject(KjOverlayController);
  private readonly strategy   = inject(KJ_OVERLAY_BACKDROP_STRATEGY)!;
  readonly state = this.controller.state;
  readonly klass = computed(() => (this.strategy as { className?: string }).className ?? 'kj-backdrop');

  onClick(_e: MouseEvent) {
    if (this.strategy.closeOnClick) this.controller.close('outside');
  }
}
