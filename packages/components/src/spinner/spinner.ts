import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  inject,
} from '@angular/core';
import { KjSpinner, KjVariant, KjSize, KjVisuallyHidden } from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjSpinner` directive.
 *
 * Composes `KjSpinner` via `hostDirectives` so the wrapper's host element is
 * *the* spinner — `role="status"`, `aria-live="polite"`, `aria-atomic="true"`,
 * the `aria-label` default (the i18n catalog's `spinner.loading`), `data-animation`, and
 * `data-reduced-motion` all land on `<kj-spinner>` itself. `kjVariant` and
 * `kjSize` are wrapper-level inputs that the host mirrors to `data-variant` /
 * `data-size` (the directive's own nested `KjVariant` / `KjSize` host
 * directives are not transitively exposed through outer composition, so the
 * wrapper takes over the data-attribute reflection at this layer).
 *
 * The template renders an `aria-hidden` glyph element (the visual shape that
 * theme CSS keyframes drive per `data-animation`) and, when no
 * `aria-labelledby` was authored on the host, a `kjVisuallyHidden` label so
 * AT always finds an accessible name.
 *
 * **Indeterminate-only.** The spinner answers "something is happening" — it
 * has no value model. For "x of y" use Progress Bar; for missing-content
 * placeholders use Skeleton.
 *
 * @example
 * ```html
 * <kj-spinner />
 * <kj-spinner kjVariant="primary" kjSize="lg" kjAnimation="dots" kjAriaLabel="Sending" />
 * ```
 * @doc-example Default
 *   The default playground — `spin` animation, `md` size, neutral variant,
 *   default `aria-label="Loading"`.
 *   @doc-file spinner.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common spinner usages — size, variant,
 *   animation glyph, and inline placement next to copy.
 *   @doc-file spinner.usage.example.ts
 * @doc-example Sizes
 *   `xs` / `sm` / `md` / `lg` presets. There is intentionally no `xl` — that
 *   size almost always wants a determinate Progress Bar instead.
 *   @doc-file spinner.sizes.example.ts
 * @doc-example Variants
 *   `neutral` (inherits `currentColor`), `primary`, `success`, `warning`,
 *   `error`, `info`.
 *   @doc-file spinner.variants.example.ts
 * @doc-example Animations
 *   Animation shape preset — `spin`, `dots`, `bars`, etc. Themes own the
 *   keyframes per value.
 *   @doc-file spinner.animations.example.ts
 * @doc-example Inside a button
 *   Embed the spinner inline next to a label to communicate in-flight work.
 *   @doc-file spinner.in-button.example.ts
 *
 * @doc-keyboard
 *   — — Non-interactive. The spinner is purely a status indicator.
 *
 * @doc-aria
 *   role="status"     — set on the host so AT announces it as a live status region
 *   aria-live         — "polite" so the label is read without interrupting the user
 *   aria-atomic       — "true" so the full label is announced on change
 *   aria-label        — Defaults to "Loading"; override per context (e.g. "Sending")
 *   data-animation    — Mirrors the resolved animation for theme hooks
 *   data-variant      — Mirrors the resolved variant for theme hooks
 *   data-size         — Mirrors the resolved size for theme hooks
 *
 * @doc-touch
 *   — — Non-interactive; no touch target required.
 *
 * @doc-a11y
 *   Indeterminate-only — answers "something is happening", with no value model.
 *   Honours `prefers-reduced-motion` via `data-reduced-motion` on the host, so
 *   themes can swap a calmer animation. When the consumer authors
 *   `aria-labelledby` on the host the wrapper skips the visually-hidden label
 *   to avoid double-naming.
 *
 * @doc-related progress-bar,skeleton,toast
 *
 * @doc-css-var
 *   --kj-spinner-size      — Glyph diameter. Sizes (xs/sm/md/lg) override.
 *   --kj-spinner-color     — Foreground color of the glyph. Variants set this; neutral inherits currentColor.
 *   --kj-spinner-track     — Track/background color for the spin arc.
 *   --kj-spinner-duration  — Base animation duration. Other animations scale off this.
 *
 * @doc-category Library/Feedback
 * @doc
 * @doc-name spinner
 * @doc-description Themed indeterminate loading spinner with variant, size, and animation glyph options.
 * @doc-is-main
 */
@Component({
  selector: 'kj-spinner',
  standalone: true,
  imports: [KjVisuallyHidden],
  hostDirectives: [
    { directive: KjSpinner, inputs: ['kjAnimation', 'kjAriaLabel'] },
    // Host-directive input forwarding is not transitive: KjSpinner composes
    // KjVariant / KjSize itself, but the wrapper must compose them directly
    // to expose kjVariant / kjSize as its own inputs. Angular applies each
    // directive once per host, so these bind the same preset instances that
    // KjSpinner already composes — unset falls back to the
    // `provideKjSpinner(…)` default.
    { directive: KjVariant, inputs: ['kjVariant'] },
    { directive: KjSize, inputs: ['kjSize'] },
  ],
  template: `
    <span class="kj-spinner__glyph" aria-hidden="true"></span>
    @if (shouldRenderHiddenLabel()) {
      <span kjVisuallyHidden>{{ spinner.resolvedAriaLabel() }}</span>
    }
  `,
  styleUrl: './spinner.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-spinner' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjSpinnerComponent {
  // No shadow inputs. Every public input is forwarded through
  // `hostDirectives.inputs` and owned by the composed directive:
  //
  // - `kjVariant` / `kjSize` — `KjVariant` / `KjSize`. Unset, they resolve
  //   through the `provideKjSpinner(…)` preset chain (`'neutral'` / `'md'` as
  //   shipped), which is exactly what a re-declared input with a literal
  //   default used to clobber in the published `.d.ts` and the generated docs.
  // - `kjAnimation` — `KjSpinner`; reflected as `data-animation`, validated in
  //   dev mode against `KJ_SPINNER_CONFIG.animations`.
  // - `kjAriaLabel` — `KjSpinner`; unset it resolves through
  //   `provideKjSpinner({ defaults: { ariaLabel } })` and then the i18n
  //   catalog (`spinner.loading`).

  /**
   * The composed directive. The template reads its `resolvedAriaLabel()` so
   * the visually-hidden label and the host `aria-label` are the *same*
   * string — the wrapper used to render its own hard-coded `'Loading'` while
   * the host announced the configured/translated one.
   */
  protected readonly spinner = inject(KjSpinner, { self: true });

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Snapshotted at construction: did the consumer author `aria-labelledby`
   * directly on `<kj-spinner>`? If so the accessible name is the referenced
   * element and we must not project a hidden duplicate. Read in the
   * constructor — by the time the template renders the directive may have
   * stamped its own attributes on the host.
   */
  private readonly hasAuthoredLabelledBy: boolean;

  /**
   * `true` when the consumer did **not** author `aria-labelledby` on the
   * wrapper — i.e. the spinner's accessible name is its `aria-label`. The
   * wrapper renders a `kjVisuallyHidden` copy of the label as inner text so
   * AT that prefers content over `aria-label` (or that announces a
   * `role="status"` region's body on insertion) still has a name to read.
   * A consumer-authored `aria-labelledby` opts out of that hidden copy to
   * avoid double-naming the host.
   */
  protected readonly shouldRenderHiddenLabel = computed(
    () => !this.hasAuthoredLabelledBy,
  );

  constructor() {
    this.hasAuthoredLabelledBy =
      this.el.nativeElement.hasAttribute('aria-labelledby');
  }
}
