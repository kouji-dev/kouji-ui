import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  input,
} from '@angular/core';
import { KjProgressBar, KjProgressBarFill } from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjProgressBar` directive. Composes the
 * core directive on an inner element and renders the inner
 * `[kjProgressBarFill]` automatically so consumers don't have to remember
 * the two-element shape — the component handles both halves.
 *
 * `kjValue: number | null` is the single mode switch — pass a number for
 * determinate mode (the fill scales to the fraction with a CSS transition),
 * or `null` for indeterminate mode (the fill animates as a CSS-only stripe).
 * The directive omits `aria-valuenow` in indeterminate mode per APG. The
 * indeterminate stripe collapses to a static state under
 * `prefers-reduced-motion: reduce`.
 *
 * Variants and sizes are configurable at the directive level via
 * `provideKjProgressBar(…)`. Defaults: `kjVariant="primary"`, `kjSize="md"`.
 *
 * @example
 * ```html
 * <kj-progress-bar [kjValue]="progress()" kjAriaLabel="Upload progress" />
 * ```
 *
 * @doc-example Default
 *   A determinate bar at 50% with an accessible label — the bare-minimum recipe.
 *   @doc-file progress-bar.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common usages — determinate upload,
 *   indeterminate spinner replacement, and success completion. Use this as
 *   the copy-paste starting point.
 *   @doc-file progress-bar.usage.example.ts
 * @doc-example Indeterminate
 *   `[kjValue]="null"` runs the CSS-only stripe animation.
 *   @doc-file progress-bar.indeterminate.example.ts
 * @doc-example Variants
 *   `primary` / `success` / `warning` / `error` — pick the semantic color.
 *   @doc-file progress-bar.variants.example.ts
 * @doc-example Sizes
 *   `xs` / `sm` / `md` / `lg` — drives the bar thickness via CSS tokens.
 *   @doc-file progress-bar.sizes.example.ts
 * @doc-example With value text
 *   Pair `kjAriaValuetext` with a visible label for richer SR phrasing.
 *   @doc-file progress-bar.with-label.example.ts
 *
 * @doc-aria
 *   role="progressbar"   — On the bar host (provided by the directive)
 *   aria-valuenow        — Reflects the clamped numeric value; omitted in indeterminate mode
 *   aria-valuemin        — Reflects `kjMin`
 *   aria-valuemax        — Reflects `kjMax`
 *   aria-valuetext       — Reflects `kjAriaValuetext` when set
 *   aria-label           — Wired from `kjAriaLabel` (or use `kjAriaLabelledby`)
 *   data-variant         — Mirrors the variant for theme hooks
 *   data-size            — Mirrors the size for theme hooks
 *   data-indeterminate   — Set when `kjValue` is null
 *
 * @doc-touch
 *   The bar is non-interactive — no touch target rules apply. Pair with a
 *   labelled cancel button (44×44) when the operation is cancellable.
 *
 * @doc-a11y
 *   Always set `kjAriaLabel` or `kjAriaLabelledby` — a bare percentage
 *   ("50 percent") with no context is useless to AT users. In indeterminate
 *   mode the directive omits `aria-valuenow` per APG. The stripe animation
 *   collapses under `prefers-reduced-motion: reduce`.
 *
 * @doc-related skeleton,spinner,toast
 *
 * @doc-css-var
 *   --kj-progress-bar-track                  — Track (unfilled portion) background. Inherits --kj-bg-field.
 *   --kj-progress-bar-fill                   — Fill color. Variants flip this per data-variant.
 *   --kj-progress-bar-radius                 — Track and fill corner radius.
 *   --kj-progress-bar-height                 — Bar thickness. Sizes (xs/sm/md/lg) override.
 *   --kj-progress-bar-transition             — Transition timing for determinate fill changes.
 *   --kj-progress-bar-indeterminate-duration — One-cycle duration of the indeterminate stripe.
 *
 * @doc-category Library/Feedback
 * @doc
 * @doc-name progress-bar
 * @doc-description Themed determinate or indeterminate progress bar with variant and size tokens.
 * @doc-is-main
 */
@Component({
  selector: 'kj-progress-bar',
  standalone: true,
  imports: [KjProgressBar, KjProgressBarFill],
  template: `
    <div
      kjProgressBar
      class="kj-progress-bar"
      [kjValue]="kjValue()"
      [kjMin]="kjMin()"
      [kjMax]="kjMax()"
      [kjAriaValuetext]="kjAriaValuetext()"
      [kjVariant]="kjVariant()"
      [kjSize]="kjSize()"
      [attr.aria-label]="kjAriaLabel() ?? null"
      [attr.aria-labelledby]="kjAriaLabelledby() ?? null"
    >
      <div kjProgressBarFill class="kj-progress-bar__fill"></div>
    </div>
  `,
  styleUrl: './progress-bar.css',
  encapsulation: ViewEncapsulation.None,
  host: { 'style': 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjProgressBarComponent {
  /**
   * Current progress value. `null` = indeterminate (the directive omits
   * `aria-valuenow` and runs the indeterminate stripe). Out-of-range values
   * clamp to `[kjMin, kjMax]` with a dev-mode warning.
   * @default null
   */
  readonly kjValue = input<number>(0);

  /** Lower bound, bound to `aria-valuemin`. @default 0 */
  readonly kjMin = input<number>(0);

  /** Upper bound, bound to `aria-valuemax`. Must be `> kjMin`. @default 100 */
  readonly kjMax = input<number>(100);

  /**
   * Human-readable phrasing reflected to `aria-valuetext`. Use when the raw
   * percentage is less meaningful — `"Step 3 of 5"`, `"1.2 MB of 2.5 MB"`.
   */
  readonly kjAriaValuetext = input<string>('');

  /**
   * Variant — one of the configured presets (`primary` | `success` |
   * `warning` | `error` by default). @default 'primary'
   */
  readonly kjVariant = input<string>('primary');

  /**
   * Size — one of the configured presets (`xs` | `sm` | `md` | `lg` by
   * default). Drives the bar height. @default 'md'
   */
  readonly kjSize = input<string>('md');

  /**
   * Accessible label for the bar. At least one of `kjAriaLabel` or
   * `kjAriaLabelledby` must be set — a progress bar without a name announces
   * as just *"50 percent"*, which is useless to screen-reader users.
   */
  readonly kjAriaLabel = input<string>('');

  /** ID reference for the bar's accessible name. See `kjAriaLabel`. */
  readonly kjAriaLabelledby = input<string>('');
}
