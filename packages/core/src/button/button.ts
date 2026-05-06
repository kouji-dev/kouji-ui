import { Directive, ElementRef, ModelSignal, afterNextRender, computed, inject, input, model } from '@angular/core';
import { KjFocusRing } from '../primitives';
import { KjVariant, KjSize, bindPresets } from '../presets';
import { KJ_BUTTON_CONFIG } from './config';

/**
 * Enhances a native `<button>` (or `<a>`) with kouji-ui presets and a11y
 * primitives. Variant and size are configurable via `provideKjButton(…)`.
 *
 * Owns disabled / loading / pressed semantics directly: `loading=true` sets
 * `aria-busy="true"` and forces the host into a disabled state regardless of
 * the `disabled` input. The `pressed` model is unset (default) for non-toggle
 * buttons and omits `aria-pressed`; once bound (`[pressed]` or `[(pressed)]`),
 * the directive auto-flips its value on click and emits `pressedChange`.
 *
 * Click events on disabled buttons are intercepted in the capture phase and
 * suppressed before any consumer template-bound listener fires, while keeping
 * the button focusable (kouji's WCAG 2.1 AAA a11y stance: ARIA-disabled, not
 * native `disabled` attribute).
 *
 * @example
 * ```html
 * <button kjButton [variant]="'destructive'" [size]="'sm'" [loading]="busy()">Delete</button>
 * ```
 * @doc
 *  @doc-example Variants
 *    @doc-theme default
 *      @doc-file button.example.ts
 *    @doc-theme retro
 *      @doc-file button.retro.example.ts
 *    @doc-theme finance
 *      @doc-file button.finance.example.ts
 *  @doc-example Sizes
 *    @doc-file button.sizes.example.ts
 * @category Core/Base
 */
@Directive({
  selector: '[kjButton]',
  standalone: true,
  hostDirectives: [
    { directive: KjVariant, inputs: ['kjVariant: variant'] },
    { directive: KjSize,    inputs: ['kjSize: size'] },
    KjFocusRing,
  ],
  providers: [...bindPresets(KJ_BUTTON_CONFIG)],
  host: {
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.aria-busy]':     'loading() ? "true" : null',
    '[attr.aria-pressed]':  'pressedAttr()',
  },
})
export class KjButton {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Disables the button. Reflects `aria-disabled` and `data-disabled`. */
  readonly disabled = input<boolean>(false);

  /** Marks the button as in-flight (e.g. async action). Sets `aria-busy="true"` and forces disabled. */
  readonly loading = input<boolean>(false);

  /**
   * Toggle state. Unset (default) marks this as a non-toggle button and omits
   * `aria-pressed`. Once a value is provided (one-way `[pressed]` or two-way
   * `[(pressed)]`), the directive auto-toggles on click and emits the new
   * value via `pressedChange`.
   *
   * The explicit `ModelSignal<boolean | undefined>` field type pins the
   * emitted `.d.ts` shape — without it, ng-packagr collapses the model type
   * to `ModelSignal<boolean>` and breaks consumer two-way bindings.
   */
  readonly pressed: ModelSignal<boolean | undefined> = model<boolean | undefined>(undefined);

  protected readonly effectiveDisabled = computed(() => this.disabled() || this.loading());

  protected readonly pressedAttr = computed(() => {
    const p = this.pressed();
    return p === undefined ? null : (p ? 'true' : 'false');
  });

  constructor() {
    // Capture-phase native listener: fires BEFORE Angular's template-bound
    // bubble-phase (click) listeners on the same element, so
    // stopImmediatePropagation() actually prevents consumer handlers.
    afterNextRender(() => {
      this.el.nativeElement.addEventListener(
        'click',
        (event: Event) => {
          if (this.effectiveDisabled()) {
            event.preventDefault();
            event.stopImmediatePropagation();
            return;
          }
          const p = this.pressed();
          if (p !== undefined) {
            this.pressed.set(!p);
          }
        },
        { capture: true },
      );
    });
  }
}
