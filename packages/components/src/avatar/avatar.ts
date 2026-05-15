import { Component, ChangeDetectionStrategy, ViewEncapsulation, computed, inject, input, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { KjAvatar, KjAvatarImage, KjAvatarFallback, KJ_AVATAR_GROUP, type KjAvatarShape } from '@kouji-ui/core';

type KjAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Avatar component. Renders an image when `src` is provided; otherwise (or when
 * the image fails to load) shows the `content` input. `content` accepts a plain
 * string or a `TemplateRef` for richer markup (icon, sub-badge, etc.).
 *
 * @doc-example Default
 *   The default playground — initials avatar at the default size.
 *   @doc-file avatar.default.example.ts
 * @doc-example Usage
 *   The common shapes — image, initials fallback, sized, and a rounded square.
 *   Use this as the copy-paste starting point.
 *   @doc-file avatar.usage.example.ts
 * @doc-example Sizes
 *   xs / sm / md / lg / xl — `md` is the default.
 *   @doc-file avatar.sizes.example.ts
 * @doc-example With image
 *   Bind `src` and `alt` — the alt also surfaces as a native hover tooltip.
 *   @doc-file avatar.with-image.example.ts
 * @doc-example Initials fallback
 *   Project text into `content` for a graceful fallback when `src` is missing.
 *   @doc-file avatar.initials.example.ts
 * @doc-example Shapes
 *   `circle` (default) or `rounded` — pick the silhouette that matches the surface.
 *   @doc-file avatar.shapes.example.ts
 *
 * @doc-aria
 *   alt           — Forwarded to the inner `<img>`; falls back to empty string when omitted
 *   title         — Mirrors `alt` so hovering surfaces a native tooltip
 *   data-size     — Mirrors the resolved size for theme/scope hooks
 *   data-shape    — Mirrors the resolved shape for theme/scope hooks
 *
 * @doc-a11y
 *   When `src` is set the inner `<img>` carries the user-supplied `alt`; an
 *   empty alt (the default) marks it decorative so AT skips it — pair with a
 *   visible name elsewhere. The fallback element is a `<span>` so it reads as
 *   plain text rather than an image.
 *
 * @doc-related avatar-group,badge,icon
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name avatar
 */
@Component({
  selector: 'kj-avatar',
  standalone: true,
  hostDirectives: [KjAvatar],
  imports: [KjAvatarImage, KjAvatarFallback, NgTemplateOutlet],
  template: `
    @if (src(); as srcVal) {
      <img kjAvatarImage class="kj-avatar-image" [src]="srcVal" [alt]="alt() ?? ''" />
    }
    <span kjAvatarFallback class="kj-avatar-fallback">
      @if (isTemplate(content())) {
        <ng-container *ngTemplateOutlet="$any(content())"></ng-container>
      } @else {
        {{ content() }}
      }
    </span>
  `,
  styleUrl: './avatar.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-avatar',
    '[attr.data-size]': 'resolvedSize()',
    '[attr.data-shape]': 'resolvedShape()',
    // Mirror `alt` to `title` so hovering the avatar shows a native tooltip.
    // `alt` alone only surfaces to screen readers / fallback rendering.
    '[attr.title]': 'alt()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAvatarComponent {
  /**
   * Optional `KjAvatarGroup` context. Avatars rendered inside a
   * `<kj-avatar-group>` inherit `kjSize` / `kjShape` from the group when
   * their own inputs are unset — matching the `@doc-example Sizes` claim
   * that group size "cascades onto every projected `<kj-avatar>`".
   */
  private readonly group = inject(KJ_AVATAR_GROUP, { optional: true });

  readonly src = input<string | undefined>(undefined);
  readonly alt = input<string | undefined>(undefined);
  /** Content shown when there is no `src`, or as a fallback if the image fails. */
  readonly content = input<string | TemplateRef<unknown>>('');
  /**
   * Explicit avatar size. Leave unset to inherit from a parent
   * `<kj-avatar-group kjSize="...">`; falls back to `'md'` when neither
   * is set.
   */
  readonly size = input<KjAvatarSize | undefined>(undefined);
  /**
   * Explicit avatar shape. Leave unset to inherit from a parent
   * `<kj-avatar-group kjShape="...">`; falls back to `'circle'` when neither
   * is set.
   */
  readonly shape = input<KjAvatarShape | undefined>(undefined);

  /** Effective size — explicit input wins, then group context, then `'md'`. */
  protected readonly resolvedSize = computed<KjAvatarSize>(() => {
    const own = this.size();
    if (own) return own;
    const fromGroup = this.group?.size() as KjAvatarSize | undefined;
    return fromGroup ?? 'md';
  });

  /** Effective shape — explicit input wins, then group context, then `'circle'`. */
  protected readonly resolvedShape = computed<KjAvatarShape>(() => {
    const own = this.shape();
    if (own) return own;
    return this.group?.shape() ?? 'circle';
  });

  protected isTemplate(v: unknown): v is TemplateRef<unknown> {
    return v instanceof TemplateRef;
  }
}
