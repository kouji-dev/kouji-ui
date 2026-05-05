import { Component } from '@angular/core';
import { KjAvatarComponent } from './avatar';

@Component({
  selector: 'kj-avatar-with-image-example',
  standalone: true,
  imports: [KjAvatarComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-avatar size="lg" src="https://i.pravatar.cc/96?img=12" alt="Jane Doe" fallback="JD" />
  `,
})
export class KjAvatarWithImageExample {}
