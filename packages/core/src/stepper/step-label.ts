import {
  Directive,
  ElementRef,
  computed,
  effect,
  inject,
} from '@angular/core';
import {
  KJ_ROVING_TABINDEX,
  KjRovingTabindexItem,
} from '../a11y/roving-tabindex';
import {
  KJ_STEP,
} from './stepper.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * Marks an element as the *header* of its parent {@link KjStep}. Wires the
 * accessible id, `aria-controls`, `aria-disabled`, and the click handler.
 * Also acts as a roving-tabindex item, joining the parent stepper's
 * single-tab-stop header strip: the tab stop sits on the active step's
 * header and arrow keys skip disabled / unreachable headers.
 *
 * Apply to `<button>` (the recommended host) or any focusable element.
 *
 * @example
 * ```html
 * <button kjStepLabel>Profile</button>
 * ```
 * @doc-category Core/Navigation
 * @doc
 * @doc-name stepper
 */
@Directive({
  selector: '[kjStepLabel]',
  standalone: true,
  hostDirectives: [KjRovingTabindexItem],
  host: {
    '[attr.id]': 'step.labelId()',
    '[attr.aria-controls]': 'step.contentId()',
    '[attr.aria-disabled]': 'isAriaDisabled()',
    '[attr.disabled]': 'isNativeDisabled()',
    '[attr.data-active]': 'step.active() ? "true" : null',
    '(click)': 'onClick()',
    '(keydown.enter)': 'onActivationKey($event)',
    '(keydown.space)': 'onActivationKey($event)',
  },
})
export class KjStepLabel {
  /** Parent step context. */
  readonly step = injectParent(KJ_STEP, { child: 'KjStepLabel', parent: '[kjStep]' });
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly roving = inject(KJ_ROVING_TABINDEX, { optional: true });

  /** True when host element is a native `<button>`. */
  private readonly isButton = computed(
    () => this.host.nativeElement.tagName === 'BUTTON',
  );

  constructor() {
    effect(() => {
      if (this.step.active()) this.roving?.setActive(this.host.nativeElement);
    });
  }

  /** Resolves the `aria-disabled` attribute string ('true' or null). */
  readonly isAriaDisabled = computed(() => {
    const blocked = this.step.disabled() || !this.step.reachable();
    return blocked ? 'true' : null;
  });

  /** Resolves the native `disabled` attribute, only when host is a button. */
  readonly isNativeDisabled = computed(() => {
    if (!this.isButton()) return null;
    const blocked = this.step.disabled() || !this.step.reachable();
    return blocked ? '' : null;
  });

  /** @internal */
  onClick(): void {
    if (this.step.disabled() || !this.step.reachable()) return;
    this.step.activate();
  }

  /** @internal */
  onActivationKey(event: Event): void {
    // Native <button> handles Enter/Space natively — only intercept when host is not a button.
    if (this.isButton()) return;
    event.preventDefault();
    if (this.step.disabled() || !this.step.reachable()) return;
    this.step.activate();
  }
}
