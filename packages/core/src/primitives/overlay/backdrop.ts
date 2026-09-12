import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { KjOverlayController } from './controller';
import { KjDismissPress } from './dismiss-press';
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
    '(pointerdown)': 'onPress()',
    '(mousedown)': 'onPress()',
    '(click)': 'onClick($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjBackdrop {
  private readonly controller = inject(KjOverlayController, { optional: true });
  private readonly strategy   = inject(KJ_OVERLAY_BACKDROP_STRATEGY)!;
  readonly state = computed(() => this.controller?.state() ?? 'closed');
  readonly klass = computed(() => (this.strategy as { className?: string }).className ?? 'kj-backdrop');

  /**
   * Only a press that began on the scrim dismisses. A click retargeted
   * here because its original target left the document mid-gesture (an
   * option in an overlay stacked above, re-rendered on commit) is not the
   * user asking to dismiss this overlay — see {@link KjDismissPress}.
   */
  protected readonly press = new KjDismissPress();

  onPress(): void {
    // Nested overlays: while something is stacked above this one, that
    // overlay owns the dismiss gesture — `KjOverlayStack` routes the same
    // pointerdown to it. Judged here rather than on the click, because by
    // then the overlay above has closed and unregistered.
    if (this.controller && !this.controller.isTopmost()) return;
    this.press.arm();
  }

  onClick(e: MouseEvent): void {
    if (!this.press.owns(e)) return;
    if (this.strategy.closeOnClick) this.controller?.close('outside');
  }
}
