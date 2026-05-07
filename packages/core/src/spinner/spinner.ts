import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { KjSize, KjVariant, bindPresets } from '../presets';
import { KJ_SPINNER_CONFIG, KjSpinnerAnimation } from './config';

/**
 * Marks an element as a kouji indeterminate spinner. Owns the small
 * accessibility contract (`role="status"`, default `aria-label="Loading"`,
 * `prefers-reduced-motion` reflection) and reflects `data-animation`,
 * `data-variant`, and `data-size` for the theme to render the visual glyph.
 *
 * The host element is consumer-supplied — usually a `<span kjSpinner>`. The
 * directive itself emits no markup; the surrounding wrapper / template is
 * responsible for the visually-hidden label fallback when no consumer label
 * is provided. The directive does set `aria-label` to the default when
 * neither `aria-label` nor `aria-labelledby` is already on the host.
 *
 * **Indeterminate-only.** A determinate "x of y" indicator is a Progress
 * Bar — different role, different ARIA contract; do not bend Spinner to fit.
 *
 * @example
 * ```html
 * <span kjSpinner></span>
 * <span kjSpinner kjAnimation="dots" kjAriaLabel="Sending"></span>
 * ```
 * @category Core/Feedback
 */
@Directive({
  selector: '[kjSpinner]',
  standalone: true,
  exportAs: 'kjSpinner',
  hostDirectives: [
    { directive: KjVariant, inputs: ['kjVariant'] },
    { directive: KjSize, inputs: ['kjSize'] },
  ],
  providers: [...bindPresets(KJ_SPINNER_CONFIG)],
  host: {
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': 'true',
    '[attr.data-animation]': 'kjAnimation()',
    '[attr.data-reduced-motion]': 'reducedMotion() ? "true" : null',
    '[attr.aria-label]': 'ariaLabelAttr()',
  },
})
export class KjSpinner {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly config = inject(KJ_SPINNER_CONFIG);

  /**
   * Animation shape preset. Reflects `data-animation`. Default `'spin'`.
   * Themes own the keyframes for each value.
   */
  readonly kjAnimation = input<KjSpinnerAnimation>(
    (this.config.defaults.animation as KjSpinnerAnimation) ?? 'spin',
  );

  /**
   * Accessible name announced by AT. Bound to `aria-label` when the host has
   * no `aria-label` attribute and no `aria-labelledby` attribute already set
   * (so a consumer-authored `aria-labelledby` wins, and a consumer-authored
   * `aria-label` is not double-bound).
   */
  readonly kjAriaLabel = input<string>(this.config.defaults.ariaLabel ?? 'Loading');

  /** True when the host had a consumer-authored `aria-labelledby` at mount. */
  protected readonly hasAriaLabelledBy: boolean;

  /**
   * Captured value of the consumer-authored `aria-label` HTML attribute at
   * mount, or `null` if none was set. We re-emit it through the host
   * binding so Angular doesn't strip the original (a host `[attr.aria-label]`
   * binding always wins over the static attribute, so leaving the binding
   * unconditional but echoing the captured value preserves the consumer
   * intent).
   */
  protected readonly nativeAriaLabel: string | null;

  /**
   * Reflects the user's `prefers-reduced-motion` preference. The directive
   * does not animate anything itself — it mirrors the boolean as
   * `data-reduced-motion="true"` and themes own the alternate keyframe.
   */
  protected readonly reducedMotion = signal<boolean>(false);

  protected readonly ariaLabelAttr = computed(() => {
    if (this.hasAriaLabelledBy) return null;
    if (this.nativeAriaLabel !== null) return this.nativeAriaLabel;
    return this.kjAriaLabel();
  });

  constructor() {
    const destroyRef = inject(DestroyRef);

    // Read consumer-authored aria attributes synchronously in the
    // constructor — by the time `afterNextRender` runs, Angular's host
    // binding for `[attr.aria-label]` has already overwritten the original
    // attribute with the computed default, which would make the detection
    // see kouji's own value and ignore the consumer's.
    const host = this.el.nativeElement;
    this.hasAriaLabelledBy = host.hasAttribute('aria-labelledby');
    this.nativeAriaLabel = host.getAttribute('aria-label');

    afterNextRender(() => {
      // SSR-safe: matchMedia is only present in a real browser. The
      // server-rendered HTML carries no `data-reduced-motion`; the post-
      // hydrate read sets it on the client when the preference is active.
      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.reducedMotion.set(mql.matches);
        const onChange = (e: MediaQueryListEvent) => this.reducedMotion.set(e.matches);
        mql.addEventListener('change', onChange);
        destroyRef.onDestroy(() => mql.removeEventListener('change', onChange));
      }
    });
  }
}
