import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';
import { KjAvatar, KjAvatarImage, KjAvatarFallback } from '@kouji-ui/core';

/**
 * Avatar root container. Use `<kj-avatar-image>` and `<kj-avatar-fallback>` inside.
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
  imports: [KjAvatar],
  template: `
    <span
      kjAvatar
      class="kj-avatar"
      [attr.data-size]="size()"
      [attr.data-shape]="shape()"
    >
      <ng-content />
    </span>
  `,
  styleUrl: './avatar.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAvatarComponent {
  readonly size = input<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md');
  readonly shape = input<'circle' | 'rounded'>('circle');
}

/** Image element inside `<kj-avatar>`. Sets `data-loaded` once the image loads. */
@Component({
  selector: 'kj-avatar-image',
  standalone: true,
  imports: [KjAvatarImage],
  template: `<img kjAvatarImage class="kj-avatar-image" [src]="src()" [alt]="alt()" />`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAvatarImageComponent {
  readonly src = input.required<string>();
  readonly alt = input.required<string>();
}

/** Fallback shown when the image is missing or has not loaded. */
@Component({
  selector: 'kj-avatar-fallback',
  standalone: true,
  imports: [KjAvatarFallback],
  template: `<span kjAvatarFallback class="kj-avatar-fallback"><ng-content /></span>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAvatarFallbackComponent {}
