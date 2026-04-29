import { Directive, DestroyRef, ElementRef, inject, input, effect, afterNextRender } from '@angular/core';
import { FocusTrapFactory, FocusTrap } from '@angular/cdk/a11y';

/**
 * Traps keyboard focus within the host element using Angular CDK FocusTrap.
 * Designed for modal dialogs, drawers, and other overlay patterns.
 *
 * @example
 * ```html
 * <div role="dialog" kjFocusTrap [kjFocusTrapEnabled]="isOpen()">
 *   <button>Action</button>
 * </div>
 * ```
 * @category Accessibility/FocusTrap
 */
@Directive({
  selector: '[kjFocusTrap]',
  standalone: true,
})
export class KjFocusTrapDirective {
  private readonly el = inject(ElementRef);
  private readonly focusTrapFactory = inject(FocusTrapFactory);
  private readonly destroyRef = inject(DestroyRef);

  /** Whether the focus trap is active. Set to true when the overlay is open. */
  kjFocusTrapEnabled = input<boolean>(false);

  private trap?: FocusTrap;
  private trapReady = false;

  constructor() {
    // effect() runs in the injection context of the constructor — safe here.
    effect(() => {
      const enabled = this.kjFocusTrapEnabled();
      if (!this.trapReady) return;
      if (enabled) {
        this.trap!.enabled = true;
        this.trap?.focusFirstTabbableElementWhenReady();
      } else {
        this.trap!.enabled = false;
      }
    });

    afterNextRender(() => {
      this.trap = this.focusTrapFactory.create(this.el.nativeElement, false);
      this.trapReady = true;
      // Apply initial state after trap is created.
      if (this.kjFocusTrapEnabled()) {
        this.trap.enabled = true;
        this.trap.focusFirstTabbableElementWhenReady();
      } else {
        this.trap.enabled = false;
      }
      this.destroyRef.onDestroy(() => this.trap?.destroy());
    });
  }
}
