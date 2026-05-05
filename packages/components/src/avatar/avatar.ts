import { Component, ChangeDetectionStrategy, ViewEncapsulation, input, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { KjAvatar, KjAvatarImage, KjAvatarFallback } from '@kouji-ui/core';

/**
 * Avatar component. Accepts `src`, `alt`, and a `fallback` input (string OR TemplateRef).
 * Renders the image and fallback internally.
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
 * @category Library/Data display
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
      @if (isTemplate(fallback())) {
        <ng-container *ngTemplateOutlet="$any(fallback())"></ng-container>
      } @else {
        {{ fallback() }}
      }
    </span>
  `,
  styleUrl: './avatar.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-avatar',
    '[attr.data-size]': 'size()',
    '[attr.data-shape]': 'shape()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAvatarComponent {
  readonly src = input<string | undefined>(undefined);
  readonly alt = input<string | undefined>(undefined);
  readonly fallback = input<string | TemplateRef<unknown>>('');
  readonly size = input<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md');
  readonly shape = input<'circle' | 'rounded'>('circle');

  protected isTemplate(v: unknown): v is TemplateRef<unknown> {
    return v instanceof TemplateRef;
  }
}
