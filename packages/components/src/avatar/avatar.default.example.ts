import { Component } from '@angular/core';
import { KjAvatarComponent, KjAvatarFallbackComponent } from './avatar';

@Component({
  selector: 'kj-avatar-default-example',
  standalone: true,
  imports: [KjAvatarComponent, KjAvatarFallbackComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-avatar>
      <kj-avatar-fallback>JD</kj-avatar-fallback>
    </kj-avatar>
  `,
})
export class KjAvatarDefaultExample {}
