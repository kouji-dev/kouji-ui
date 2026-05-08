import {
  DestroyRef,
  Directive,
  PLATFORM_ID,
  Signal,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  isDevMode,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { KjSize, KjVariant, bindPresets } from '../presets';
import { KJ_PROGRESS_BAR_CONFIG } from './config';
import {
  KJ_PROGRESS_BAR,
  KjProgressBarContext,
} from './progress-bar.context';

/**
 * Marks an element as a kouji progress bar. Owns `role="progressbar"` and the
 * full ARIA value contract: `aria-valuemin` / `aria-valuemax` always, the
 * rounded integer `aria-valuenow` when determinate, and **omits**
 * `aria-valuenow` when indeterminate (the APG-correct behaviour for
 * *"working, no measurable progress"*).
 *
 * `kjValue: number | null` is the single mode switch — `null` is the explicit
 * indeterminate sentinel. Out-of-range values clamp to `[kjMin, kjMax]`; the
 * directive computes the `0..1` fraction (`--kj-progress-fraction`) for the
 * inner `[kjProgressBarFill]` to read, and rounds the value for AT so a
 * 47.0 → 47.4 jitter doesn't churn the attribute.
 *
 * Variants and sizes are configurable via `provideKjProgressBar(…)`. The
 * indeterminate stripe animation is theme-owned; the directive only reflects
 * `data-indeterminate` and `data-reduced-motion` so themes can collapse the
 * animation under `prefers-reduced-motion: reduce`.
 *
 * The progress bar itself is **not** a live region — APG is explicit that a
 * `role="progressbar"` element should not carry `aria-live`. Milestone
 * announcements (25%, 50%, …) belong on a sibling `[kjLiveRegion]` composed
 * at the wrapper layer; the core directive does not own that wiring.
 *
 * @example
 * ```html
 * <div kjProgressBar [kjValue]="progress()" kjAriaLabel="Upload progress">
 *   <div kjProgressBarFill></div>
 * </div>
 * ```
 * @category Core/Feedback
 * @doc
 * @doc-name progress-bar
 * @doc-description Marks an element as an accessible progress bar — owns `role="progressbar"`, the full ARIA value contract, indeterminate mode (`kjValue: null`), and a `--kj-progress-fraction` CSS custom property for theme fills.
 * @doc-is-main
 */
@Directive({
  selector: '[kjProgressBar]',
  standalone: true,
  exportAs: 'kjProgressBar',
  hostDirectives: [
    { directive: KjVariant, inputs: ['kjVariant'] },
    { directive: KjSize, inputs: ['kjSize'] },
  ],
  providers: [
    ...bindPresets(KJ_PROGRESS_BAR_CONFIG),
    { provide: KJ_PROGRESS_BAR, useExisting: KjProgressBar },
  ],
  host: {
    'role': 'progressbar',
    '[attr.aria-valuemin]': 'min()',
    '[attr.aria-valuemax]': 'max()',
    '[attr.aria-valuenow]': 'valuenow()',
    '[attr.aria-valuetext]': 'kjAriaValuetext() ?? null',
    '[attr.data-indeterminate]': 'indeterminate() ? "true" : null',
    '[attr.data-reduced-motion]': 'reducedMotion() ? "reduce" : null',
    '[style.--kj-progress-fraction]': 'fraction()',
  },
})
export class KjProgressBar implements KjProgressBarContext {
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * Current progress value. `null` is the explicit indeterminate sentinel —
   * the directive omits `aria-valuenow` and reflects `data-indeterminate`.
   * Out-of-range values clamp to `[kjMin, kjMax]` (with a dev-mode warning).
   * @default null
   */
  readonly kjValue = input<number | null>(null);

  /**
   * Lower bound, bound to `aria-valuemin`. Most consumers leave this at `0`
   * and pass a percentage; for absolute units (`bytesUploaded` /
   * `bytesTotal`), pass both `kjMin` and `kjMax`.
   * @default 0
   */
  readonly kjMin = input<number>(0);

  /**
   * Upper bound, bound to `aria-valuemax`. Must be `> kjMin` (dev-mode
   * throw otherwise).
   * @default 100
   */
  readonly kjMax = input<number>(100);

  /**
   * Human-readable phrasing reflected to `aria-valuetext`. Use for cases
   * where the raw percentage is less meaningful — `"Step 3 of 5"`,
   * `"1.2 MB of 2.5 MB"`, `"3 minutes remaining"`. AT typically reads
   * `aria-valuetext` exclusively when both attributes are set.
   */
  readonly kjAriaValuetext = input<string | undefined>(undefined);

  /** True when the user prefers reduced motion. Reflects `data-reduced-motion`. */
  protected readonly reducedMotion = signal<boolean>(false);

  /** Raw value (passes through `null` for indeterminate). */
  readonly value: Signal<number | null> = computed(() => this.kjValue());

  /** True iff `kjValue()` is `null`. */
  readonly indeterminate: Signal<boolean> = computed(
    () => this.kjValue() === null,
  );

  readonly min: Signal<number> = computed(() => this.kjMin());
  readonly max: Signal<number> = computed(() => this.kjMax());

  /**
   * Clamped value in `[min, max]`, or `null` when indeterminate. Applies
   * even when the consumer passes `min >= max` (degenerate config —
   * dev-mode throws but production still flows through with clamping).
   */
  readonly clampedValue: Signal<number | null> = computed(() => {
    const v = this.kjValue();
    if (v === null) return null;
    const lo = this.kjMin();
    const hi = this.kjMax();
    if (Number.isNaN(v)) return null;
    return Math.min(Math.max(v, lo), hi);
  });

  /** `0..1` fraction for CSS, or `null` when indeterminate. */
  readonly fraction: Signal<number | null> = computed(() => {
    const v = this.clampedValue();
    if (v === null) return null;
    const lo = this.kjMin();
    const hi = this.kjMax();
    const span = hi - lo;
    if (span <= 0) return 0;
    return (v - lo) / span;
  });

  /**
   * Rounded integer for `aria-valuenow`, or `null` when indeterminate. The
   * rounding stabilises the attribute when consumers drive `kjValue` from a
   * high-frequency source (rAF-rate observables) — a 47.0 → 47.4 update no
   * longer triggers an attribute write that some AT engines could announce.
   */
  readonly valuenow: Signal<number | null> = computed(() => {
    const v = this.clampedValue();
    return v === null ? null : Math.round(v);
  });

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

      const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion.set(mql.matches);

      const onChange = (event: MediaQueryListEvent) => {
        this.reducedMotion.set(event.matches);
      };
      mql.addEventListener('change', onChange);
      destroyRef.onDestroy(() => mql.removeEventListener('change', onChange));
    });

    if (isDevMode()) {
      effect(() => {
        const lo = this.kjMin();
        const hi = this.kjMax();
        if (lo >= hi) {
          throw new Error(
            `[kj] KjProgressBar: kjMin (${lo}) must be less than kjMax (${hi}).`,
          );
        }
      });

      let outOfRangeWarned = false;
      effect(() => {
        const v = this.kjValue();
        if (v === null) return;
        const lo = this.kjMin();
        const hi = this.kjMax();
        if ((v < lo || v > hi) && !outOfRangeWarned) {
          outOfRangeWarned = true;
          console.warn(
            `[kj] KjProgressBar: kjValue ${v} is outside [${lo}, ${hi}]; clamping.`,
          );
        }
      });

      effect(() => {
        if (this.kjValue() === null && this.kjAriaValuetext() !== undefined) {
          console.warn(
            '[kj] KjProgressBar: kjAriaValuetext is set while kjValue is null (indeterminate). ' +
              'aria-valuetext describes a value; consider moving the phrasing to a sibling text element.',
          );
        }
      });
    }
  }
}
