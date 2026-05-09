import { Component, ChangeDetectionStrategy, ViewEncapsulation, input, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { KjAvatar, KjAvatarImage, KjAvatarFallback } from '@kouji-ui/core';

/**
 * Avatar component. Renders an image when `src` is provided; otherwise (or when
 * the image fails to load) shows the `content` input. `content` accepts a plain
 * string or a `TemplateRef` for richer markup (icon, sub-badge, etc.).
 *
 * @doc-example Default
 *   @doc-file avatar.default.example.ts
 * @doc-example Sizes
 *   @doc-file avatar.sizes.example.ts
 * @doc-example With image
 *   @doc-file avatar.with-image.example.ts
 * @doc-example Initials fallback
 *   @doc-file avatar.initials.example.ts
 * @doc-example Shapes
 *   @doc-file avatar.shapes.example.ts
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
    '[attr.data-size]': 'size()',
    '[attr.data-shape]': 'shape()',
    // Mirror `alt` to `title` so hovering the avatar shows a native tooltip.
    // `alt` alone only surfaces to screen readers / fallback rendering.
    '[attr.title]': 'alt()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAvatarComponent {
  readonly src = input<string | undefined>(undefined);
  readonly alt = input<string | undefined>(undefined);
  /** Content shown when there is no `src`, or as a fallback if the image fails. */
  readonly content = input<string | TemplateRef<unknown>>('');
  readonly size = input<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md');
  readonly shape = input<'circle' | 'rounded'>('circle');

  protected isTemplate(v: unknown): v is TemplateRef<unknown> {
    return v instanceof TemplateRef;
  }
}
