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
 *   Inline link with default chrome — anchors the variant / size / underline defaults.
 *   @doc-file link.example.ts
 * @doc-example Usage
 *   Common link shapes — inline prose, external, disabled, and a few sizes.
 *   @doc-file link.usage.example.ts
 * @doc-example Variants
 *   Primary / muted / destructive — pick the tone that matches the destination.
 *   @doc-file link.variants.example.ts
 * @doc-example Sizes
 *   `sm` / `md` / `lg` / `inherit` — `inherit` matches the surrounding text.
 *   @doc-file link.sizes.example.ts
 * @doc-example External
 *   `kjTarget="_blank"` enables external-icon auto-detect; pair with rel safe defaults.
 *   @doc-file link.external.example.ts
 * @doc-example Disabled
 *   `[kjDisabled]="true"` removes the link from the tab order and dims it.
 *   @doc-file link.disabled.example.ts
 * @doc-example In prose
 *   Links flow naturally with surrounding text without breaking baseline.
 *   @doc-file link.in-prose.example.ts
 *
 * @doc-keyboard
 *   Enter — Activates the link (native anchor semantics)
 *   Tab   — Moves focus to the next focusable element; disabled links are skipped
 *
 * @doc-aria
 *   aria-disabled — Reflected when [kjDisabled] is true; tabindex flipped to -1
 *   aria-label    — Forwarded to the inner <a>; suppresses the AT external-suffix when set
 *   data-variant  — Mirrors the resolved variant for theme CSS
 *   data-size     — Mirrors the resolved size for theme CSS
 *   data-external — Mirrors the external-link detection for the trailing icon
 *
 * @doc-touch
 *   Inline links rely on WCAG 2.5.5's inline-text-link exception. Use
 *   `kjSize="lg"` (or a `kj-button kjVariant="link"`) when the link is a
 *   standalone touch target outside running text.
 *
 * @doc-a11y
 *   Renders a real `<a kjLink>` so AT announces "link", focus visibility
 *   comes from `:focus-visible` only, and disabled links are kept out of the
 *   tab order. External targets get a trailing icon plus an AT suffix unless
 *   `[kjAriaLabel]` is set.
 *
 * @doc-related button,icon,typography
 *
 * @doc-css-var
 *   --kj-link-fg               — Link color at rest. Variants retarget this.
 *   --kj-link-hover-fg         — Link color on hover. Variants retarget this.
 *   --kj-link-visited-fg       — Color applied to `:visited` links.
 *   --kj-link-decoration       — Text-decoration. Underline mode (always/hover/none) retargets this.
 *   --kj-link-underline-offset — Distance between the text baseline and the underline.
 *   --kj-link-font-size        — Font size. Sizes (sm/md/lg/inherit) override; defaults to inherit.
 *   --kj-link-radius           — Corner radius applied to the focus ring.
 *   --kj-link-external-icon    — Mask URL for the trailing external-link glyph. Swap for a custom icon.
 *
 * @doc-category Library/Navigation
 * @doc
 * @doc-name link
 * @doc-description Themed hyperlink with variant, size, underline mode, external-link handling, and disabled semantics.
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
