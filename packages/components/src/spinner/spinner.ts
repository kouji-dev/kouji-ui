import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  inject,
  input,
} from '@angular/core';
import { KjSpinner, type KjSpinnerAnimation, KjVisuallyHidden } from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjSpinner` directive.
 *
 * Composes `KjSpinner` via `hostDirectives` so the wrapper's host element is
 * *the* spinner — `role="status"`, `aria-live="polite"`, `aria-atomic="true"`,
 * the `aria-label` default ("Loading"), `data-animation`, and
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
 *   @doc-file spinner.example.ts
 * @doc-example Sizes
 *   @doc-file spinner.sizes.example.ts
 * @doc-example Variants
 *   @doc-file spinner.variants.example.ts
 * @doc-example Animations
 *   @doc-file spinner.animations.example.ts
 * @doc-example Inside a button
 *   @doc-file spinner.in-button.example.ts
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
    {
      directive: KjSpinner,
      // KjSpinner's own surface — kjVariant + kjSize live on its nested
      // KjVariant / KjSize and are not surfaced through this outer
      // composition; they are re-exposed as wrapper inputs below and wired
      // straight to the host's data-variant / data-size attributes.
      inputs: ['kjAnimation', 'kjAriaLabel'],
    },
  ],
  template: `
    <span class="kj-spinner__glyph" aria-hidden="true"></span>
    @if (shouldRenderHiddenLabel()) {
      <span kjVisuallyHidden>{{ kjAriaLabel() }}</span>
    }
  `,
  styleUrl: './spinner.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-spinner',
    '[attr.data-variant]': 'kjVariant()',
    '[attr.data-size]': 'kjSize()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjSpinnerComponent {
  /**
   * Color preset reflected to `data-variant` on the host. Defaults to
   * `'neutral'`, which resolves to `currentColor` in shipped themes — so a
   * spinner inside a coloured surface inherits its parent's text colour.
   */
  readonly kjVariant = input<string>('neutral');

  /**
   * Size preset reflected to `data-size` on the host. Defaults to `'md'`.
   * Sizes ship as `xs | sm | md | lg`; an `xl` is intentionally absent — a
   * spinner that big almost always wants a determinate Progress Bar instead.
   */
  readonly kjSize = input<string>('md');

  /**
   * Animation shape preset forwarded to `KjSpinner.kjAnimation` via the
   * composed host directive. Reflects on the host as `data-animation`.
   * Themes own the keyframes per value.
   */
  readonly kjAnimation = input<KjSpinnerAnimation>('spin');

  /**
   * Accessible name forwarded to `KjSpinner.kjAriaLabel` via the composed
   * host directive. Default `'Loading'`. Used both as the host's
   * `aria-label` and as the visually-hidden text rendered inside the
   * wrapper when no consumer-authored `aria-labelledby` is on the element.
   */
  readonly kjAriaLabel = input<string>('Loading');

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
