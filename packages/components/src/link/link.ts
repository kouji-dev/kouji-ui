import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';
import { KjLink } from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjLink` directive.
 *
 * Renders `<a kjLink>` underneath (mirrors `KjDividerComponent`'s "directive on
 * inner host" pattern: the visible link element must be the native `<a>` so the
 * directive's data attributes, ARIA semantics, and external/disabled plumbing
 * land on the actual hyperlink rather than the `display: contents` outer
 * `<kj-link>` custom element). Variant and size are user-configurable strings;
 * configure the allowed values and defaults via `provideKjLink(…)` at the
 * application or component scope.
 *
 * @example
 * ```html
 * <kj-link kjHref="/about">About</kj-link>
 * <kj-link kjHref="https://example.com" kjTarget="_blank">External</kj-link>
 * <kj-link kjHref="/billing" [kjDisabled]="!ready()">Manage billing</kj-link>
 * ```
 *
 * @doc-example Default
 *   @doc-file link.example.ts
 * @doc-example Variants
 *   @doc-file link.variants.example.ts
 * @doc-example Sizes
 *   @doc-file link.sizes.example.ts
 * @doc-example External
 *   @doc-file link.external.example.ts
 * @doc-example Disabled
 *   @doc-file link.disabled.example.ts
 * @doc-example In prose
 *   @doc-file link.in-prose.example.ts
 * @category Library/Navigation
 * @doc
 * @doc-name link
 * @doc-is-main
 */
@Component({
  selector: 'kj-link',
  standalone: true,
  imports: [KjLink],
  template: `
    <a
      kjLink
      class="kj-link"
      [attr.href]="kjHref() ?? null"
      [attr.target]="kjTarget() ?? null"
      [attr.aria-label]="kjAriaLabel() ?? null"
      [kjVariant]="kjVariant()"
      [kjSize]="kjSize()"
      [kjUnderline]="kjUnderline()"
      [kjExternal]="kjExternal()"
      [kjDisabled]="kjDisabled()"
    >
      <ng-content />
    </a>
  `,
  styleUrl: './link.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjLinkComponent {
  /** Bound to the inner `<a [href]>`. */
  readonly kjHref = input<string | undefined>(undefined);

  /** Bound to the inner `<a [target]>`. Setting `_blank` triggers external auto-detect in `KjLink`. */
  readonly kjTarget = input<'_self' | '_blank' | '_parent' | '_top' | string | undefined>(undefined);

  /** Bound to `[attr.aria-label]` on the inner `<a>`. When set, suppresses the AT suffix injection. */
  readonly kjAriaLabel = input<string | undefined>(undefined);

  /** Forwarded to the directive's `KjVariant` host directive. */
  readonly kjVariant = input<string>('primary');

  /** Forwarded to the directive's `KjSize` host directive. */
  readonly kjSize = input<string>('inherit');

  /** Forwarded to the directive's underline-mode reflection. */
  readonly kjUnderline = input<'always' | 'hover' | 'none'>('hover');

  /** Forwarded to the directive's external-link tri-state. */
  readonly kjExternal = input(false);

  /** Forwarded to the directive's disabled bundle (composed `KjDisabled` + plumbing). */
  readonly kjDisabled = input(false);
}
