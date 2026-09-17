import { Component, ChangeDetectionStrategy, DestroyRef, ElementRef, computed, inject } from '@angular/core';
import { KjOverlayController } from './controller';
import { KjDismissPress } from './dismiss-press';
import { KJ_OVERLAY_BACKDROP_STRATEGY } from './tokens';

/**
 * Renders the backdrop scrim for an overlay. Reads the backdrop strategy
 * (className, closeOnClick) and the controller from the per-overlay
 * injector so neither needs to be passed in. Mounted by `KjOverlayBuilder`
 * as a sibling preceding the panel inside the per-overlay wrapper, and by
 * `KjOverlayPanel` for a portalled declarative panel whose injector provides
 * a backdrop strategy; either way it registers with the controller, which
 * keeps it right before the panel and hands it the outside press.
 *
 * Hidden while the overlay is closed, like the panel.
 */
@Component({
  selector: 'kj-backdrop',
  standalone: true,
  template: '',
  host: {
    '[class]': 'klass()',
    // A pointer-only surface with no content: nothing for assistive tech.
    'aria-hidden': 'true',
    '[attr.data-state]': 'state()',
    '[attr.hidden]': 'state() === "closed" ? "" : null',
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

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    this.controller?.bindBackdrop(host);
    inject(DestroyRef).onDestroy(() => {
      if (this.controller?.backdropEl() === host) this.controller.bindBackdrop(null);
    });
  }

  /** Whether a press on the scrim closes the overlay: the controller's policy when set, else the strategy's `closeOnClick`. */
  private get closeOnClick(): boolean {
    return this.controller?.strategies?.closeOnOutside ?? this.strategy.closeOnClick;
  }

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
    if (this.closeOnClick) this.controller?.close('backdrop');
  }
}
