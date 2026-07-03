import { Component, ChangeDetectionStrategy, ViewEncapsulation, booleanAttribute, input } from '@angular/core';
import { KjBadge, KjBadgeVariant } from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjBadge` directive.
 *
 * @doc-example Default
 *   The default playground — a single badge with the default variant.
 *   @doc-file badge.default.example.ts
 * @doc-example Usage
 *   The common shapes — status pill, count badge, and an icon-prefixed tag.
 *   Use this as the copy-paste starting point.
 *   @doc-file badge.usage.example.ts
 * @doc-example Variants
 *   default / secondary / destructive / outline — pick the visual weight.
 *   @doc-file badge.variants.example.ts
 * @doc-example Sizes
 *   xs / sm / md / lg — `md` is the default. Inline-text exception applies.
 *   @doc-file badge.sizes.example.ts
 * @doc-example With icon
 *   Project an icon before the label for status pills or sender chips.
 *   @doc-file badge.with-icon.example.ts
 * @doc-example With dot
 *   Set `dot` to render a leading status indicator; tint it via
 *   `--kj-badge-dot-color` for state pills (active / pending / archived).
 *   @doc-file badge.with-dot.example.ts
 *
 * @doc-aria
 *   role          — Decorative by default; promote to `status` for live counts and pair with `aria-live="polite"`
 *   data-size     — Mirrors the resolved size for theme/scope hooks
 *
 * @doc-touch
 *   Badges are inline-text decorations, not tap targets. When wired to an
 *   interactive trigger (filter chip, removable tag), wrap with a real
 *   `<button>` and size it to ≥ 44×44 (WCAG 2.5.5).
 *
 * @doc-a11y
 *   Renders a `<span>` so the badge reads as part of the surrounding text.
 *   For live count updates (notifications, unread totals) wrap the host with
 *   `role="status"` + `aria-live="polite"` so AT announces changes without
 *   stealing focus.
 *
 * @doc-related tag,overlay-badge,avatar
 *
 * @doc-css-var
 *   --kj-badge-bg            — Background fill. Variant rules set this; override to brand-paint a one-off.
 *   --kj-badge-fg            — Foreground (text + icon) color. Resolved per variant.
 *   --kj-badge-border-color  — Border color. Outline variant sets this; default is transparent.
 *   --kj-badge-radius        — Corner radius. Inherits --kj-radius-selector.
 *   --kj-badge-padding-x     — Horizontal padding. Sizes override.
 *   --kj-badge-padding-y     — Vertical padding. Sizes override.
 *   --kj-badge-font-size     — Font size. Sizes override.
 *   --kj-badge-dot-size      — Diameter of the leading dot (when `dot` is set).
 *   --kj-badge-dot-color     — Fill of the leading dot. Defaults to currentColor.
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name badge
 * @doc-description Themed inline label for status, counts, or category tags with variant and size presets.
 * @doc-is-main
 */
@Component({
  selector: 'kj-badge',
  standalone: true,
  imports: [KjBadge],
  template: `
    <span
      kjBadge
      class="kj-badge"
      [kjBadgeVariant]="variant()"
      [kjBadgeDot]="dot()"
      [attr.data-size]="size()"
    >
      <ng-content />
    </span>
  `,
  styleUrl: './badge.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjBadgeComponent {
  readonly variant = input<KjBadgeVariant>('default');
  readonly size = input<'xs' | 'sm' | 'md' | 'lg'>('md');
  readonly dot = input(false, { transform: booleanAttribute });
}
