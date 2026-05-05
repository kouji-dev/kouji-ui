import { Component } from '@angular/core';
import { KjAvatarComponent } from './avatar';

@Component({
  selector: 'kj-avatar-default-example',
  standalone: true,
  imports: [KjAvatarComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-avatar fallback="JD" />
  `,
})
export class KjAvatarDefaultExample {}
