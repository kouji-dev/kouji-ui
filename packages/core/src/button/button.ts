import { Directive, ElementRef, ModelSignal, afterNextRender, computed, inject, input, model } from '@angular/core';
import { KjFocusRing } from '../primitives';
import { KjVariant, KjSize, bindPresets } from '../presets';
import { KJ_BUTTON_CONFIG } from './config';

/**
 * Enhances a native `<button>` (or `<a>`) with kouji-ui presets and a11y
 * primitives. Variant and size are configurable via `provideKjButton(…)`.
 *
 * Owns disabled / loading / pressed semantics directly: `kjLoading=true` sets
 * `aria-busy="true"` and forces the host into a disabled state regardless of
 * the `kjDisabled` input. The `kjPressed` model is unset (default) for
 * non-toggle buttons and omits `aria-pressed`; once bound (`[kjPressed]` or
 * `[(kjPressed)]`), the directive auto-flips its value on click and emits
 * `kjPressedChange`.
 *
 * Click events on disabled buttons are intercepted in the capture phase and
 * suppressed before any consumer template-bound listener fires, while keeping
 * the button focusable (kouji's WCAG 2.1 AAA a11y stance: ARIA-disabled, not
 * native `disabled` attribute).
 *
 * @example
 * ```html
 * <button kjButton [kjVariant]="'destructive'" [kjSize]="'sm'" [kjLoading]="busy()">Delete</button>
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
 * @doc-category Core/Base
 * @doc-name button
 * @doc-is-main
 * @doc-description Adds accessible disabled, loading, and pressed semantics to any native button or anchor.
 */
@Directive({
  selector: '[kjButton]',
  standalone: true,
  hostDirectives: [
    { directive: KjVariant, inputs: ['kjVariant'] },
    { directive: KjSize,    inputs: ['kjSize'] },
    KjFocusRing,
  ],
  providers: [...bindPresets(KJ_BUTTON_CONFIG)],
  host: {
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.aria-busy]':     'kjLoading() ? "true" : null',
    '[attr.aria-pressed]':  'pressedAttr()',
  },
})
export class KjButton {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Disables the button. Reflects `aria-disabled` and `data-disabled`. */
  readonly kjDisabled = input(false);

  /** Marks the button as in-flight (e.g. async action). Sets `aria-busy="true"` and forces disabled. */
  readonly kjLoading = input(false);

  /**
   * Toggle state. Unset (default) marks this as a non-toggle button and omits
   * `aria-pressed`. Once a value is provided (one-way `[kjPressed]` or two-way
   * `[(kjPressed)]`), the directive auto-toggles on click and emits the new
   * value via `kjPressedChange`.
   *
   * Both the field annotation and the explicit generic+initial-value form
   * are required: ng-packagr's declaration emission narrows
   * `ModelSignal<T | undefined>` to `ModelSignal<T>` for any inferred form
   * we tried (`model<boolean>()`, `model<boolean | undefined>(undefined)`),
   * which breaks consumer two-way bindings of `boolean | undefined` signals.
   * Pinning the field type preserves the read+write contract in the
   * published .d.ts. See `rules/code_style.md` "Prefer TypeScript inference"
   * for the documented ng-packagr exception.
   */
  readonly kjPressed: ModelSignal<boolean | undefined> = model<boolean | undefined>(undefined);

  protected readonly effectiveDisabled = computed(() => this.kjDisabled() || this.kjLoading());

  protected readonly pressedAttr = computed(() => {
    const p = this.kjPressed();
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
          const p = this.kjPressed();
          if (p !== undefined) {
            this.kjPressed.set(!p);
          }
        },
        { capture: true },
      );
    });
  }
}
