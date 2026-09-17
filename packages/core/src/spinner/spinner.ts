import {
  Directive,
  ElementRef,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { KjTranslateService } from '../i18n/translate.service';
import { KjReducedMotion } from '../motion/reduced-motion';
import { KjSize, KjVariant, bindPresets } from '../presets';
import { KJ_SPINNER_CONFIG, KjSpinnerAnimation } from './config';
import { kjDevMode, kjDevWarn } from '../primitives/diagnostics/dev-mode';

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
 * @doc-category Core/Feedback
 * @doc
 * @doc-name spinner
 * @doc-description Marks an element as an indeterminate loading indicator with the right accessibility role and label.
 * @doc-is-main
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
  private readonly i18n = inject(KjTranslateService);

  /**
   * Animation shape preset. Reflects `data-animation`. Defaults to
   * `KJ_SPINNER_CONFIG.defaults.animation` (`'spin'` as shipped).
   *
   * Open like `kjVariant` / `kjSize`: an unknown value is reflected verbatim
   * — themes own the keyframes — and warned about once in dev mode against
   * `KJ_SPINNER_CONFIG.animations`. Register a custom shape with
   * `provideKjSpinner({ animations: [...], defaults: { animation: … } })`.
   */
  readonly kjAnimation = input<KjSpinnerAnimation>(
    this.config.defaults.animation ?? 'spin',
  );

  /**
   * Accessible name announced by AT. Bound to `aria-label` when the host has
   * no `aria-label` attribute and no `aria-labelledby` attribute already set
   * (so a consumer-authored `aria-labelledby` wins, and a consumer-authored
   * `aria-label` is not double-bound).
   *
   * Unset, it resolves through `KJ_SPINNER_CONFIG.defaults.ariaLabel` and then
   * the i18n catalog (`spinner.loading`), so translating it is
   * `provideKjTranslations(…)` — not a per-component config call.
   */
  readonly kjAriaLabel = input<string | undefined>(undefined);

  /**
   * The accessible name actually used: explicit input > `provideKjSpinner`
   * override > i18n catalog. Locale-reactive, and the single source the host
   * `aria-label` and any wrapper-rendered hidden label must both read.
   */
  readonly resolvedAriaLabel = computed(
    () => this.kjAriaLabel() ?? this.config.defaults.ariaLabel ?? this.i18n.translate('spinner.loading'),
  );

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
   *
   * Read from the root `KjReducedMotion` service: the OS setting is
   * application-wide, so one `matchMedia` subscription serves every spinner
   * on the page instead of one per instance (perf F-15).
   */
  protected readonly reducedMotion = inject(KjReducedMotion).prefersReducedMotion;

  protected readonly ariaLabelAttr = computed(() => {
    if (this.hasAriaLabelledBy) return null;
    if (this.nativeAriaLabel !== null) return this.nativeAriaLabel;
    return this.resolvedAriaLabel();
  });

  constructor() {
    if (kjDevMode()) {
      // `animations` was a config field nothing read. It is the spinner's
      // equivalent of `variants` / `sizes`, so it gets the same dev-mode
      // validation KjVariant / KjSize apply — otherwise the TSDoc tells
      // consumers to extend a list that has no effect at all.
      effect(() => {
        const value = this.kjAnimation();
        if (!this.config.animations.includes(value)) {
          kjDevWarn(
            'kj-spinner',
            `unknown animation "${value}". Allowed values: ` +
              `${this.config.animations.join(', ')}. Register it with ` +
              `provideKjSpinner({ animations: [...KJ_SPINNER_DEFAULTS.animations, '${value}'] }).`,
          );
        }
      });
    }

    // Read consumer-authored aria attributes synchronously in the
    // constructor — by the time `afterNextRender` runs, Angular's host
    // binding for `[attr.aria-label]` has already overwritten the original
    // attribute with the computed default, which would make the detection
    // see kouji's own value and ignore the consumer's.
    const host = this.el.nativeElement;
    this.hasAriaLabelledBy = host.hasAttribute('aria-labelledby');
    this.nativeAriaLabel = host.getAttribute('aria-label');
  }
}
