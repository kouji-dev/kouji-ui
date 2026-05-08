import {
  Directive,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { KjSize, KjVariant } from '../presets';

/**
 * Orientation of the divider rule.
 */
export type KjDividerOrientation = 'horizontal' | 'vertical';

/**
 * Alignment of the projected content within a with-content divider.
 */
export type KjDividerAlign = 'start' | 'center' | 'end';

/**
 * Marks an element as a kouji divider / separator. Owns the small a11y opinion
 * (decorative-by-default vs. structural) and reflects data attributes that
 * theme CSS reads to render the rule (rule-only vs. with-content layout,
 * orientation, alignment, variant, size).
 *
 * The host element is consumer-supplied — `<hr kjDivider>` for the rule-only
 * case (recommended; native semantic, implicit `role="separator"`) or
 * `<div kjDivider>Title</div>` for the with-content case (label projected in
 * the middle of the rule).
 *
 * **Decorative by default.** Most dividers in real templates are visual
 * punctuation between regions already demarcated by surrounding headings or
 * landmarks, so AT should not announce them. Set `kjStructural=true` when the
 * divider is the only thing demarcating two regions (e.g. an "OR" sign-in
 * divider with no surrounding heading).
 *
 * @example
 * ```html
 * <hr kjDivider />
 * <hr kjDivider [kjStructural]="true" kjOrientation="vertical" />
 * <div kjDivider [kjStructural]="true">OR</div>
 * ```
 * @category Core/Layout/Divider
 * @doc
 * @doc-name divider
 * @doc-description Unstyled divider for separating content with horizontal, vertical, and label-in-rule layouts.
 * @doc-is-main
 */
@Directive({
  selector: '[kjDivider]',
  standalone: true,
  hostDirectives: [
    { directive: KjVariant, inputs: ['kjVariant'] },
    { directive: KjSize, inputs: ['kjSize'] },
  ],
  host: {
    '[attr.data-orientation]': 'kjOrientation()',
    '[attr.data-align]': 'kjAlign()',
    '[attr.data-with-content]': 'withContent() ? "true" : "false"',
    '[attr.role]': 'roleAttr()',
    '[attr.aria-orientation]': 'ariaOrientationAttr()',
    '[attr.aria-hidden]': 'ariaHiddenAttr()',
  },
})
export class KjDivider {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Visual orientation of the rule. Reflects to `data-orientation`. When
   * `kjStructural=true` and orientation is `vertical`, also reflects
   * `aria-orientation="vertical"`. The horizontal case omits `aria-orientation`
   * (the spec default; setting it explicitly is redundant noise).
   */
  readonly kjOrientation = input<KjDividerOrientation>('horizontal');

  /**
   * Whether the divider carries semantic weight (separates two regions that
   * are not already demarcated by surrounding heading or landmark structure).
   *
   * - `false` (default): host gets `aria-hidden="true"`; AT skips the divider.
   * - `true`: host gets `role="separator"` (suppressed if host is `<hr>`,
   *   which has implicit role); when `kjOrientation='vertical'`, also gets
   *   `aria-orientation="vertical"`.
   */
  readonly kjStructural = input<boolean>(false);

  /**
   * Alignment of the projected content within a with-content divider.
   * Affects the with-content layout only; ignored when no content is present.
   * Reflects to `data-align`.
   */
  readonly kjAlign = input<KjDividerAlign>('center');

  /** Auto-detected from host child nodes (any text or element child). */
  protected readonly withContent = signal<boolean>(false);

  /** True when the host element is an `<hr>` (case-insensitive). */
  protected readonly isHr = signal<boolean>(false);

  protected readonly roleAttr = computed(() =>
    this.kjStructural() && !this.isHr() ? 'separator' : null,
  );

  protected readonly ariaOrientationAttr = computed(() =>
    this.kjStructural() && this.kjOrientation() === 'vertical' ? 'vertical' : null,
  );

  protected readonly ariaHiddenAttr = computed(() =>
    this.kjStructural() ? null : 'true',
  );

  constructor() {
    afterNextRender(() => {
      const host = this.el.nativeElement;
      this.isHr.set(host.tagName?.toLowerCase() === 'hr');
      // Detect with-content from any non-empty child nodes (text or elements).
      // Treat whitespace-only text nodes as no content so a multi-line template
      // with a self-closing-style divider doesn't accidentally light up.
      this.withContent.set(hasMeaningfulChildNodes(host));
    });
  }
}

function hasMeaningfulChildNodes(host: HTMLElement): boolean {
  const nodes = host.childNodes;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.nodeType === Node.ELEMENT_NODE) return true;
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue ?? '';
      if (text.trim().length > 0) return true;
    }
  }
  return false;
}
