import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  computed,
  inject,
  input,
} from '@angular/core';
import {
  KjBadge,
  KjBadgeVariant,
  KjOverlayBadge,
  KjOverlayBadgeContent,
  KJ_OVERLAY_BADGE,
  KjVisuallyHidden,
} from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjOverlayBadge` family. Renders a
 * positioned badge over a projected anchor (a button, an avatar, a tab label).
 *
 * The wrapper hosts both the `KjOverlayBadge` anchor directive and the
 * internal `<span kjOverlayBadgeContent>` slot. Visual chrome (variant, size,
 * dot styling) is reused from the inline `<kj-badge>` primitive — the slot
 * composes `KjBadge` via `hostDirectives`, so one CSS rule set drives both
 * surfaces.
 *
 * Numeric values truncate at `kjMaxValue` (default `99` ⇒ `99+`). When
 * `kjDot` is true, `kjValue` / `kjMaxValue` are ignored and a fixed-size
 * dot is rendered. When `kjValue` is `null` and `kjDot` is false, the badge
 * collapses (the description id is dropped from the anchor's
 * `aria-describedby` too).
 *
 * Accessibility: the anchor directive merges its description id into the
 * host's existing `aria-describedby` rather than overwriting it. Without a
 * description, the badge content is `aria-hidden` — a stray "4" with no
 * context is worse than silence.
 *
 * @example
 * ```html
 * <kj-overlay-badge kjValue="4" kjVariant="destructive" kjDescription="4 unread">
 *   <button class="icon-button" aria-label="Notifications">
 *     <svg>…</svg>
 *   </button>
 * </kj-overlay-badge>
 * ```
 *
 * @doc-example Default
 *   Notification bell with an unread count and an accessible description.
 *   @doc-file overlay-badge.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common usages — counts, presence dots, and
 *   truncated values. Use this as the copy-paste starting point.
 *   @doc-file overlay-badge.usage.example.ts
 * @doc-example Dot mode
 *   `[kjDot]="true"` collapses to a fixed-size pip — for status indicators.
 *   @doc-file overlay-badge.dot.example.ts
 * @doc-example Positions
 *   `kjPosition="top-end"` / `bottom-start` — each corner is a valid pin point.
 *   @doc-file overlay-badge.positions.example.ts
 * @doc-example On avatar
 *   Anchor over `<kj-avatar>` for the canonical online / unread pattern.
 *   @doc-file overlay-badge.on-avatar.example.ts
 * @doc-example With description
 *   `kjDescription` is wired into the anchor's `aria-describedby` chain.
 *   @doc-file overlay-badge.described.example.ts
 *
 * @doc-aria
 *   aria-describedby   — Merged on the anchor; points to the visually-hidden description
 *   aria-hidden        — Set on the badge content when no description is provided
 *   data-variant       — Mirrors the resolved variant for theme/scope hooks
 *   data-size          — Mirrors the resolved size for theme/scope hooks
 *   data-position      — Mirrors the corner pin point for theme hooks
 *   data-hidden        — Mirrors the collapsed state on the anchor host
 *
 * @doc-touch
 *   The badge is non-interactive — touch-target rules apply to the *anchor*.
 *   Pair with `<kj-button kjSize="icon">` (44×44) for icon-only triggers.
 *
 * @doc-a11y
 *   The badge is purely decorative without a `kjDescription`. When a count
 *   carries meaning ("4 unread notifications"), set `kjDescription` so the
 *   anchor's accessible description is enriched instead of leaving a stray
 *   "4" floating in the AT tree. `kjDecorative="true"` opts out entirely.
 *
 * @doc-related badge,avatar,button
 *
 * @doc-css-var
 *   --kj-badge-bg            — Badge background fill. Variants override per data-variant.
 *   --kj-badge-fg            — Badge foreground (label) color.
 *   --kj-badge-border-color  — Border color. Outline variant sets this.
 *   --kj-badge-radius        — Corner radius. Inherits --kj-radius-selector.
 *   --kj-badge-padding-x     — Horizontal padding. Sizes override.
 *   --kj-badge-padding-y     — Vertical padding.
 *   --kj-badge-font-size     — Font size. Sizes override.
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name overlay-badge
 * @doc-description Themed positioned badge for notification counts or status dots over avatars, icons, and tabs.
 * @doc-is-main
 */
@Component({
  selector: 'kj-overlay-badge',
  standalone: true,
  hostDirectives: [
    {
      directive: KjOverlayBadge,
      inputs: [
        'kjPosition: kjPosition',
        'kjDot: kjDot',
        'kjDecorative: kjDecorative',
        'kjDescription: kjDescription',
      ],
    },
  ],
  imports: [KjOverlayBadgeContent, KjVisuallyHidden],
  template: `
    <ng-content />
    @if (!resolvedHidden()) {
      <span
        kjOverlayBadgeContent
        class="kj-overlay-badge"
        [kjBadgeVariant]="kjVariant()"
        [attr.data-size]="kjSize()"
      >
        @if (!ctx.dot()) {
          {{ displayValue() }}
        }
      </span>
    }
    @if (ctx.description() && !ctx.decorative()) {
      <span kjVisuallyHidden [id]="ctx.descriptionId()">{{ ctx.description() }}</span>
    }
  `,
  styleUrl: './overlay-badge.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-overlay-badge-anchor',
    '[attr.data-hidden]': 'resolvedHidden() ? "" : null',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjOverlayBadgeComponent {
  /** Read the anchor directive's context so the template can mirror its state. */
  protected readonly ctx = inject(KJ_OVERLAY_BADGE);

  /**
   * The numeric or textual badge content. Numbers truncate via
   * {@link kjMaxValue}; strings render as-is. `null` collapses the badge
   * unless {@link kjDot} is set.
   */
  readonly kjValue = input<number | string | null>(null);

  /**
   * Truncation cap for numeric values. When `value > kjMaxValue`, the badge
   * displays `${kjMaxValue}+`. `null` disables truncation. Ignored when
   * {@link kjDot} is true.
   */
  readonly kjMaxValue = input<number | null>(99);

  /**
   * Hides the badge without unmounting the anchor. Useful for value-driven
   * visibility (`[kjHidden]="!unread()"`). Drops the description id from
   * the anchor's `aria-describedby` while hidden.
   */
  readonly kjHidden = input<boolean>(false);

  /** Visual variant of the badge — forwarded to the inner `kjBadge` host. */
  readonly kjVariant = input<KjBadgeVariant>('default');

  /** Size token — forwarded to the inner content node as `data-size`. */
  readonly kjSize = input<'sm' | 'md' | 'lg'>('md');

  /**
   * The truncated string that actually paints. `null` value collapses to
   * empty string; numeric overflow becomes `${max}+`.
   */
  readonly displayValue = computed(() => {
    if (this.ctx.dot()) return '';
    const v = this.kjValue();
    if (v === null || v === undefined || v === '') return '';
    const max = this.kjMaxValue();
    if (typeof v === 'number' && max !== null && v > max) return `${max}+`;
    return String(v);
  });

  /**
   * Resolved hidden state — the consumer's `kjHidden` *or* an empty-value
   * non-dot badge (nothing to show). When hidden, the slot is not rendered
   * and the description id is omitted from the anchor's describedby merge.
   */
  readonly resolvedHidden = computed(() => {
    if (this.kjHidden()) return true;
    if (this.ctx.dot()) return false;
    const v = this.kjValue();
    return v === null || v === undefined || v === '';
  });
}

/**
 * Standalone styled wrapper around `KjOverlayBadgeContent` for the rare case
 * where a consumer projects the slot manually under a sibling
 * `[kjOverlayBadge]` host directive (the no-wrapper / power-user shape).
 *
 * For the common case, prefer `<kj-overlay-badge>` which renders this slot
 * automatically.
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name overlay-badge
 */
@Component({
  selector: 'kj-overlay-badge-content',
  standalone: true,
  hostDirectives: [
    KjOverlayBadgeContent,
    { directive: KjBadge, inputs: ['kjBadgeVariant: kjVariant'] },
  ],
  template: `<ng-content />`,
  styleUrl: './overlay-badge.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-overlay-badge',
    '[attr.data-size]': 'kjSize()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjOverlayBadgeContentComponent {
  /** Size token mirrored to `data-size` for CSS hooks. */
  readonly kjSize = input<'sm' | 'md' | 'lg'>('md');
}
