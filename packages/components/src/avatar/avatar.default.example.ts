import { Component } from '@angular/core';
import { KjAvatarComponent } from './avatar';

@Component({
  selector: 'kj-avatar-default-example',
  standalone: true,
  imports: [KjAvatarComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-bg-surface); }`],
  template: `
    <kj-avatar content="JD" />
  `,
})
export class KjAvatarDefaultExample {}
