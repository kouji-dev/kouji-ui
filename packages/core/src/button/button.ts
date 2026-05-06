import { Directive, ElementRef, PLATFORM_ID, afterNextRender, computed, inject, input } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { KjFocusRing } from '../primitives';
import { KjVariant, KjSize, bindPresets } from '../presets';
import { KJ_BUTTON_CONFIG } from './config';

/**
 * Enhances a native `<button>` (or `<a>`) with kouji-ui presets and a11y
 * primitives. Variant and size are configurable via `provideKjButton(…)`.
 *
 * Owns disabled / loading / pressed semantics directly: `loading=true` sets
 * `aria-busy="true"` and forces the host into a disabled state regardless of
 * the `disabled` input. `pressed=undefined` omits `aria-pressed` entirely.
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
  private readonly platformId = inject(PLATFORM_ID);

  /** Disables the button. Reflects `aria-disabled` and `data-disabled`. */
  readonly disabled = input<boolean>(false);

  /** Marks the button as in-flight (e.g. async action). Sets `aria-busy="true"` and forces disabled. */
  readonly loading = input<boolean>(false);

  /** Toggle state. `undefined` (default) omits `aria-pressed`. */
  readonly pressed = input<boolean | undefined>(undefined);

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
      if (!isPlatformBrowser(this.platformId)) return;
      this.el.nativeElement.addEventListener(
        'click',
        (event: Event) => {
          if (this.effectiveDisabled()) {
            event.preventDefault();
            event.stopImmediatePropagation();
          }
        },
        { capture: true },
      );
    });
  }
}
