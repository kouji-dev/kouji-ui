import { Component } from '@angular/core';
import { KjAvatarComponent, KjAvatarImageComponent, KjAvatarFallbackComponent } from './avatar';

@Component({
  selector: 'kj-avatar-with-image-example',
  standalone: true,
  imports: [KjAvatarComponent, KjAvatarImageComponent, KjAvatarFallbackComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-avatar size="lg">
      <kj-avatar-image src="https://i.pravatar.cc/96?img=12" alt="Jane Doe" />
      <kj-avatar-fallback>JD</kj-avatar-fallback>
    </kj-avatar>
  `,
})
export class KjAvatarWithImageExample {}
