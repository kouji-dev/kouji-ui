import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  contentChildren,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {
  KJ_SIZE_PRESET,
  KJ_VARIANT_PRESET,
  KjDivider,
  type KjDividerAlign,
  type KjDividerOrientation,
} from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjDivider` directive.
 *
 * Auto-elects the host element: renders `<hr kjDivider/>` when no content is
 * projected (rule-only case — preserves the native `<hr>` semantic and its
 * implicit `role="separator"` when structural), and `<div kjDivider>` when
 * content is projected (the with-content case — `<hr>` is a void element and
 * cannot host children, so we fall back to `<div>` for label projection).
 *
 * The wrapper itself is layout-invisible (`display: contents`) so a vertical
 * divider inside a flex strip does not introduce an extra block-level box that
 * would break the row-flex.
 *
 * **Composition note.** Per the analysis, the directive is composed by
 * applying `kjDivider` to the inner rendered host (`<hr>` or `<div>`) rather
 * than via the wrapper's own `hostDirectives`. The directive must run on the
 * visible rule element so the data attributes (`data-orientation`,
 * `data-with-content`, `data-variant`, `data-size`) and ARIA semantics land
 * where theme CSS expects them, not on the `display: contents` outer
 * `<kj-divider>` custom element.
 *
 * @example
 * ```html
 * <kj-divider />
 * <kj-divider [kjStructural]="true" kjOrientation="vertical" />
 * <kj-divider [kjStructural]="true">OR</kj-divider>
 * ```
 * @doc-example Default
 *   @doc-file divider.example.ts
 * @doc-example Vertical
 *   @doc-file divider.vertical.example.ts
 * @doc-example With content
 *   @doc-file divider.with-content.example.ts
 * @doc-example Variants
 *   @doc-file divider.variants.example.ts
 * @doc-example Sizes
 *   @doc-file divider.sizes.example.ts
 * @doc-example Structural
 *   @doc-file divider.structural.example.ts
 * @category Library/Layout/Divider
 * @doc
 * @doc-name divider
 * @doc-description Pre-styled separator line in horizontal or vertical orientation — auto-elects `<hr>` for the rule-only case (semantic separator) or `<div>` when content is projected, with solid/dashed/dotted variants and optional centered label support.
 * @doc-is-main
 */
@Component({
  selector: 'kj-divider',
  standalone: true,
  imports: [KjDivider],
  template: `
    @if (probed() && !hasContent()) {
      <hr
        kjDivider
        class="kj-divider"
        [kjOrientation]="kjOrientation()"
        [kjStructural]="kjStructural()"
        [kjVariant]="kjVariant()"
        [kjSize]="kjSize()"
      />
    } @else {
      <div
        kjDivider
        class="kj-divider"
        [kjOrientation]="kjOrientation()"
        [kjStructural]="kjStructural()"
        [kjAlign]="kjAlign()"
        [kjVariant]="kjVariant()"
        [kjSize]="kjSize()"
      >
        <span #contentProbe class="kj-divider__content"><ng-content /></span>
      </div>
    }
  `,
  styleUrl: './divider.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: KJ_VARIANT_PRESET,
      useValue: { values: ['solid', 'dashed', 'dotted'], default: 'solid' },
    },
    {
      provide: KJ_SIZE_PRESET,
      useValue: { values: ['sm', 'md', 'lg'], default: 'md' },
    },
  ],
})
export class KjDividerComponent {
  /** Visual orientation of the rule. Reflects to `data-orientation` on the rule host. */
  readonly kjOrientation = input<KjDividerOrientation>('horizontal');

  /**
   * Whether the divider carries semantic weight (separates two regions not
   * already demarcated by surrounding heading or landmark structure).
   * Defaults to `false` (decorative; `aria-hidden="true"`).
   */
  readonly kjStructural = input<boolean>(false);

  /** Alignment of the projected content within a with-content divider. */
  readonly kjAlign = input<KjDividerAlign>('center');

  /** Line style preset. Validated against `KJ_VARIANT_PRESET` (`solid` / `dashed` / `dotted`). */
  readonly kjVariant = input<'solid' | 'dashed' | 'dotted'>('solid');

  /** Size preset. Validated against `KJ_SIZE_PRESET` (`sm` / `md` / `lg`). */
  readonly kjSize = input<'sm' | 'md' | 'lg'>('md');

  /**
   * Reference to the inner `<span class="kj-divider__content">` that wraps the
   * `<ng-content>` slot when the with-content branch is rendered. Sampled
   * after first render to discover whether the consumer actually projected
   * anything.
   */
  private readonly contentProbe = viewChild<ElementRef<HTMLElement>>('contentProbe');

  /**
   * Host election lifecycle:
   *   1. Initial render — the wrapper renders the `<div>` with-content branch
   *      so the `<ng-content>` slot is live and any projected nodes (text or
   *      elements) physically land in the DOM.
   *   2. `afterNextRender` — the wrapper inspects the `<span>` content probe.
   *      If it is empty (no consumer-projected content), `probed` flips true
   *      with `hasContent=false`, swapping the host to `<hr>` for the
   *      rule-only case (preserves the native `<hr>` semantic and its
   *      implicit `role="separator"` when structural).
   *   3. Otherwise the wrapper stays on the `<div>` branch.
   *
   * The conditional-content edge case (consumers toggling content at runtime)
   * is documented in the analysis as an open question — `hasContent` only
   * settles once. Consumers wanting runtime-toggleable labels should wrap them
   * in a stable element child (e.g. `<span>`); `projectedChildren` keeps the
   * host on `<div>` whenever an element child is present.
   */
  protected readonly probed = signal(false);
  protected readonly hasContent = signal(true);

  /**
   * Tracks any projected element children so the host stays on `<div>` if a
   * runtime toggle adds or removes a labelled child after first probe.
   */
  private readonly projectedChildren = contentChildren('*', { descendants: false });

  constructor() {
    afterNextRender(() => {
      if (this.probed()) return;
      const probe = this.contentProbe()?.nativeElement;
      const initialText = probe ? (probe.textContent ?? '').trim() : '';
      const hasElementChildren = !!probe && this.hasMeaningfulElementChildren(probe);
      const present =
        initialText.length > 0 || hasElementChildren || this.projectedChildren().length > 0;
      this.hasContent.set(present);
      this.probed.set(true);
    });
  }

  private hasMeaningfulElementChildren(probe: HTMLElement): boolean {
    const nodes = probe.childNodes;
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
}
