import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { KjOverlayController } from './controller';
import { KjOverlayPanel } from './panel';
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
  private readonly _panel = inject(KjOverlayPanel, { optional: true });
  private get controller(): KjOverlayController | null {
    return this._panel?.controller ?? null;
  }
  private readonly strategy   = inject(KJ_OVERLAY_BACKDROP_STRATEGY)!;
  readonly state = computed(() => this._panel?.controller?.state() ?? 'closed');
  readonly klass = computed(() => (this.strategy as { className?: string }).className ?? 'kj-backdrop');

  onClick(_e: MouseEvent) {
    if (this.strategy.closeOnClick) this.controller?.close('outside');
  }
}
